import React, { useState, useEffect, useCallback } from 'react';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import { supabase } from '../services/supabase';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, 
  PieChart, Pie, Cell, CartesianGrid, ComposedChart, Line, Legend 
} from 'recharts';

export default function PainelSistema({ userRole }) {
  // Estado para controlar a visão principal (Dashboard vs Pedidos)
  const [visaoPrincipal, setVisaoPrincipal] = useState('dashboard');

  const [produtos, setProdutos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [custosOperacionais, setCustosOperacionais] = useState(0);
  const [receitaTotal, setReceitaTotal] = useState(0);
  const [dadosFluxoCaixa, setDadosFluxoCaixa] = useState([]);
  
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  const [termoBusca, setTermoBusca] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('mensal');

  const [mes, setMes] = useState('08');
  const [ano, setAno] = useState('2026');

  const CORES_GRAFICO = ['#8b5a62', '#a87b82', '#c59ca3', '#e2bec4', '#f1d6db', '#cbd5e1'];

  const buscarDados = useCallback(async () => {
    try {
      setCarregando(true);
      
      const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
      
      let dataInicio = abaAtiva === 'mensal' ? `${ano}-${mes}-01T00:00:00Z` : `${ano}-01-01T00:00:00Z`;
      let dataFim = abaAtiva === 'mensal' ? `${ano}-${mes}-${ultimoDia}T23:59:59Z` : `${ano}-12-31T23:59:59Z`;

      // A. Busca Produtos
      const { data: prodData, error: prodError } = await supabase
        .from('produtos')
        .select('*')
        .order('id', { ascending: true });

      if (prodError) throw prodError;
      setProdutos(prodData || []);

      // B. Busca Despesas
      const dataInicioDesp = dataInicio.split('T')[0];
      const dataFimDesp = dataFim.split('T')[0];
      
      const { data: despData, error: despError } = await supabase
        .from('despesas')
        .select('valor, data_vencimento')
        .gte('data_vencimento', dataInicioDesp)
        .lte('data_vencimento', dataFimDesp);

      if (despError) throw despError;

      // C. Busca Receitas (Trazendo Itens, Cliente e Status de Entrega)
      const { data: vendData, error: vendError } = await supabase
        .from('vendas')
        .select('id, total, criado_em, status_pagamento, cliente_nome, cliente_telefone, status_entrega, itens') 
        .gte('criado_em', dataInicio)
        .lte('criado_em', dataFim)
        .order('criado_em', { ascending: false });

      if (vendError) console.warn('Erro ao buscar vendas:', vendError);
      setVendas(vendData || []);

      // D. Fluxo de Caixa (Anual)
      const mesesAbrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      let fluxoAnual = mesesAbrev.map(m => ({ mes: m, receitas: 0, despesas: 0, saldo: 0 }));

      const { data: despAno } = await supabase.from('despesas').select('valor, data_vencimento').gte('data_vencimento', `${ano}-01-01`).lte('data_vencimento', `${ano}-12-31`);
      
      const { data: vendAno, error: vendAnoError } = await supabase
        .from('vendas')
        .select('total, criado_em')
        .eq('status_pagamento', 'pago')
        .gte('criado_em', `${ano}-01-01T00:00:00Z`)
        .lte('criado_em', `${ano}-12-31T23:59:59Z`);
        
      if (vendAnoError) console.warn('Erro ao buscar vendas anuais:', vendAnoError);

      (despAno || []).forEach(d => {
        const mesIndex = parseInt(d.data_vencimento.split('-')[1]) - 1;
        fluxoAnual[mesIndex].despesas += parseFloat(d.valor || 0);
      });

      (vendAno || []).forEach(v => {
        const mesIndex = new Date(v.criado_em).getMonth();
        fluxoAnual[mesIndex].receitas += parseFloat(v.total || 0);
      });

      fluxoAnual = fluxoAnual.map(f => ({
        ...f,
        saldo: f.receitas - f.despesas
      }));

      setDadosFluxoCaixa(fluxoAnual);

      // E. Totais
      const custoReal = despData?.reduce((acc, curr) => acc + parseFloat(curr.valor), 0) || 0;
      const receitasPagas = vendData?.filter(v => v.status_pagamento === 'pago') || [];
      const receitaReal = receitasPagas.reduce((acc, curr) => acc + parseFloat(curr.total), 0) || 0; 
      
      setCustosOperacionais(custoReal);
      setReceitaTotal(receitaReal);

    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error.message);
    } finally {
      setCarregando(false);
    }
  }, [abaAtiva, mes, ano]);

  useEffect(() => {
    buscarDados();
  }, [buscarDados]);

  const handleInputChange = (id, campo, valor) => {
    setProdutos(prev => prev.map(prod => {
      if (prod.id === id) return { ...prod, [campo]: valor };
      return prod;
    }));
  };

  const handleSalvarAlteracoes = async () => {
    try {
      setSalvando(true);
      const promises = produtos.map(prod => 
        supabase.from('produtos').update({ 
          preco_varejo: prod.preco_varejo, preco_atacado: prod.preco_atacado, quantidade_estoque: prod.quantidade_estoque 
        }).eq('id', prod.id)
      );
      await Promise.all(promises);
      alert('Sincronização concluída com sucesso!');
      buscarDados();
    } catch (error) {
      console.error('Erro ao salvar alterações:', error.message);
      alert('Falha ao sincronizar dados com o servidor.');
    } finally {
      setSalvando(false);
    }
  };

  // Função para alternar o status de entrega do pedido
  const handleAlternarEntrega = async (pedidoId, statusAtual) => {
    const novoStatus = statusAtual === 'entregue' ? 'pendente' : 'entregue';
    
    // Atualiza localmente para resposta rápida na interface
    setVendas(prevVendas => prevVendas.map(v => 
      v.id === pedidoId ? { ...v, status_entrega: novoStatus } : v
    ));

    try {
      const { error } = await supabase
        .from('vendas')
        .update({ status_entrega: novoStatus })
        .eq('id', pedidoId);
        
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar entrega:', error);
      alert('Erro ao atualizar o status de entrega.');
      // Se falhar, reverte localmente chamando a busca
      buscarDados();
    }
  };

  const valorTotalEstoqueVarejo = produtos.reduce((acc, curr) => acc + (parseFloat(curr.preco_varejo || 0) * parseInt(curr.quantidade_estoque || 0)), 0);
  const produtosFiltrados = produtos.filter(prod => prod.nome.toLowerCase().includes(termoBusca.toLowerCase()));

  const dadosAlocacao = [...produtos]
    .map(p => ({ name: p.nome, value: parseFloat(p.preco_varejo) * parseInt(p.quantidade_estoque) }))
    .filter(p => p.value > 0).sort((a, b) => b.value - a.value);
  
  const topAlocacao = dadosAlocacao.slice(0, 5);
  const outrosAlocacao = dadosAlocacao.slice(5).reduce((acc, curr) => acc + curr.value, 0);
  if (outrosAlocacao > 0) topAlocacao.push({ name: 'Outros Modelos', value: outrosAlocacao });

  const CustomTooltipRosca = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-lg text-sm">
          <p className="font-bold text-slate-800 mb-1">{payload[0].name}</p>
          <p className="text-slate-600 font-mono">R$ {payload[0].value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipCaixa = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-lg text-sm min-w-[150px]">
          <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label} / {ano}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between gap-4 mb-1 text-xs">
              <span style={{ color: entry.color }} className="font-semibold">{entry.name}:</span>
              <span className="font-mono text-slate-700">R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-16 animate-fade-in text-left">
      
      {/* NAVEGAÇÃO PRINCIPAL (DASHBOARD VS PEDIDOS) */}
      <div className="flex bg-slate-200/50 p-1.5 rounded-xl md:w-max mx-auto shadow-inner border border-slate-200/60">
        <button
          onClick={() => setVisaoPrincipal('dashboard')}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
            visaoPrincipal === 'dashboard' 
            ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' 
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          📈 Dashboard Financeiro
        </button>
        <button
          onClick={() => setVisaoPrincipal('pedidos')}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
            visaoPrincipal === 'pedidos' 
            ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' 
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          📦 Gestão de Pedidos
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VISÃO 1: DASHBOARD FINANCEIRO E ESTOQUE */}
      {/* ------------------------------------------------------------- */}
      {visaoPrincipal === 'dashboard' && (
        <div className="space-y-6 md:space-y-8 animate-fade-in">
          {/* CONTROLES DE DATA */}
          <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 bg-white border border-slate-200/70 p-3 md:p-4 rounded-2xl shadow-sm">
            <div className="flex bg-slate-100/80 p-1 rounded-xl w-full xl:w-auto border border-slate-200/50">
              <button
                onClick={() => setAbaAtiva('mensal')}
                className={`flex-1 text-xs md:text-sm font-semibold px-4 py-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${abaAtiva === 'mensal' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                📊 Visão Mensal
              </button>
              <button
                onClick={() => setAbaAtiva('anual')}
                className={`flex-1 text-xs md:text-sm font-semibold px-4 py-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${abaAtiva === 'anual' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                📅 Projeção Anual
              </button>
            </div>

            <div className="flex items-center gap-2 md:gap-3 w-full xl:w-auto justify-between xl:justify-end">
              {abaAtiva === 'mensal' && (
                <select 
                  value={mes} onChange={(e) => setMes(e.target.value)}
                  className="flex-1 xl:flex-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs md:text-sm font-semibold text-slate-700 focus:outline-none focus:border-lua-rose-dark cursor-pointer"
                >
                  <option value="01">Janeiro</option><option value="02">Fevereiro</option><option value="03">Março</option>
                  <option value="04">Abril</option><option value="05">Maio</option><option value="06">Junho</option>
                  <option value="07">Julho</option><option value="08">Agosto</option><option value="09">Setembro</option>
                  <option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
                </select>
              )}
              {/* ANO DINÂMICO (DASHBOARD) */}
              <select 
                value={ano} onChange={(e) => setAno(e.target.value)}
                className="flex-1 xl:flex-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm font-semibold text-slate-700 focus:outline-none focus:border-lua-rose-dark cursor-pointer"
              >
                {Array.from({ length: 10 }, (_, i) => 2024 + i).map(anoGerado => (
                  <option key={anoGerado} value={anoGerado}>
                    {anoGerado}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* INDICADORES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard label="Receita Bruta (Paga)" value={`R$ ${receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} statusText={abaAtiva === 'mensal' ? 'Faturamento no mês' : 'Faturamento no ano'} statusType="gold" />
            <StatCard label="Despesas Operacionais" value={`R$ ${custosOperacionais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} statusText={abaAtiva === 'mensal' ? 'Saídas no mês' : 'Saídas no ano'} statusType="alert" />
            <StatCard label="Resultado Líquido" value={`R$ ${(receitaTotal - custosOperacionais).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} statusText="Receitas - Despesas" statusType={(receitaTotal - custosOperacionais) >= 0 ? "neutral" : "alert"} />
            <StatCard label="Capital Estocado" value={`R$ ${valorTotalEstoqueVarejo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} statusText="Patrimônio em prateleira" statusType="gold" />
          </div>

          {/* GRÁFICOS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200/70 rounded-2xl p-5 md:p-7 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-serif text-base md:text-lg font-bold text-slate-800">Demonstrativo de Resultado</h3>
                  <p className="text-xs md:text-sm text-slate-500">Histórico de Receitas vs Despesas projetado para {ano}.</p>
                </div>
              </div>
              <div className="h-64 w-full mt-4">
                {carregando ? (
                  <div className="h-full flex items-center justify-center"><span className="text-slate-400 text-sm">Carregando fluxo...</span></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dadosFluxoCaixa} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(val) => `R$ ${val/1000}k`} />
                      <RechartsTooltip content={<CustomTooltipCaixa />} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#64748b' }}/>
                      <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="despesas" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Line type="monotone" dataKey="saldo" name="Saldo Líquido" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200/70 rounded-2xl p-5 md:p-7 shadow-sm">
              <div className="mb-4">
                <h3 className="font-serif text-base md:text-lg font-bold text-slate-800">Alocação de Ativos</h3>
                <p className="text-xs md:text-sm text-slate-500">Concentração de capital.</p>
              </div>
              <div className="h-56 w-full flex items-center justify-center relative">
                {carregando ? (
                  <span className="text-slate-400 text-sm">Carregando...</span>
                ) : topAlocacao.length === 0 ? (
                  <span className="text-slate-400 text-sm">Estoque vazio.</span>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={topAlocacao} innerRadius={65} outerRadius={90} paddingAngle={4} dataKey="value">
                        {topAlocacao.map((entry, index) => <Cell key={`cell-${index}`} fill={CORES_GRAFICO[index % CORES_GRAFICO.length]} />)}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltipRosca />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {!carregando && topAlocacao.length > 0 && (
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Estoque</span>
                    <span className="text-base font-mono font-bold text-slate-800">
                      R$ {valorTotalEstoqueVarejo > 1000 ? `${(valorTotalEstoqueVarejo/1000).toFixed(1)}k` : valorTotalEstoqueVarejo.toFixed(0)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TABELA DE ESTOQUE */}
          <div className="bg-white border border-slate-200/70 rounded-2xl shadow-sm overflow-hidden mt-6">
            <div className="p-5 md:p-7 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="text-left flex-1">
                  <h2 className="text-lg md:text-xl font-bold text-slate-800">Tabela Operacional de Ajuste</h2>
                  <p className="text-xs md:text-sm text-slate-500 mt-1">Modificação ágil de preços e volumes.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <input 
                    type="text" placeholder="🔍 Buscar produto..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)}
                    className="w-full sm:w-64 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-lua-rose-dark outline-none"
                  />
                  <Button variant="gold" onClick={handleSalvarAlteracoes} disabled={salvando || carregando} className="w-full sm:w-auto whitespace-nowrap py-2.5 px-6">
                    {salvando ? 'Salvando...' : 'Sincronizar'}
                  </Button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="px-5 py-4">Produto</th>
                    <th className="px-5 py-4">Varejo (R$)</th>
                    <th className="px-5 py-4">Atacado (R$)</th>
                    <th className="px-5 py-4 text-center">Volume</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {carregando ? (
                    <tr><td colSpan="5" className="p-12 text-center text-sm text-slate-400">Buscando portfólio...</td></tr>
                  ) : produtosFiltrados.length === 0 ? (
                    <tr><td colSpan="5" className="p-12 text-center text-sm text-slate-400">Nenhum produto.</td></tr>
                  ) : (
                    produtosFiltrados.map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4 font-serif font-bold text-slate-800 truncate max-w-[200px]">{prod.nome}</td>
                        <td className="px-5 py-4"><input type="number" step="0.01" value={prod.preco_varejo} onChange={(e) => handleInputChange(prod.id, 'preco_varejo', parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1.5 bg-slate-50 border border-transparent hover:border-slate-200 focus:bg-white rounded-lg font-mono outline-none"/></td>
                        <td className="px-5 py-4"><input type="number" step="0.01" value={prod.preco_atacado} onChange={(e) => handleInputChange(prod.id, 'preco_atacado', parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1.5 bg-slate-50 border border-transparent hover:border-slate-200 focus:bg-white rounded-lg font-mono outline-none"/></td>
                        <td className="px-5 py-4 flex justify-center"><input type="number" value={prod.quantidade_estoque} onChange={(e) => handleInputChange(prod.id, 'quantidade_estoque', parseInt(e.target.value) || 0)} className="w-16 text-center py-1.5 bg-slate-50 border border-transparent hover:border-slate-200 focus:bg-white rounded-lg font-mono outline-none"/></td>
                        <td className="px-5 py-4">
                          {prod.quantidade_estoque <= 0 ? <span className="bg-rose-50 text-rose-700 px-2 py-1 rounded text-xs font-bold">Esgotado</span> : prod.quantidade_estoque <= 4 ? <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-bold">Crítico</span> : <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-bold">Saudável</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VISÃO 2: GESTÃO DE PEDIDOS */}
      {/* ------------------------------------------------------------- */}
      {visaoPrincipal === 'pedidos' && (
        <div className="bg-white border border-slate-200/70 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
          <div className="p-5 md:p-7 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="text-left">
              <h2 className="text-lg md:text-xl font-bold text-slate-800">Controle Logístico e Pedidos</h2>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                Acompanhe o pagamento e atualize o status de entrega dos clientes.
              </p>
            </div>
            <div className="flex gap-2">
               <select 
                  value={mes} onChange={(e) => setMes(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="01">Janeiro</option><option value="02">Fevereiro</option><option value="03">Março</option>
                  <option value="04">Abril</option><option value="05">Maio</option><option value="06">Junho</option>
                  <option value="07">Julho</option><option value="08">Agosto</option><option value="09">Setembro</option>
                  <option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
                </select>
                {/* ANO DINÂMICO (PEDIDOS) */}
                <select 
                  value={ano} onChange={(e) => setAno(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  {Array.from({ length: 10 }, (_, i) => 2024 + i).map(anoGerado => (
                    <option key={anoGerado} value={anoGerado}>
                      {anoGerado}
                    </option>
                  ))}
                </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 min-w-[900px]">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-slate-500 text-[11px] md:text-xs uppercase tracking-wider font-semibold">
                  <th className="px-5 py-4 w-24">Pedido</th>
                  <th className="px-5 py-4 w-48">Cliente</th>
                  <th className="px-5 py-4 min-w-[200px]">Itens Comprados</th>
                  <th className="px-5 py-4">Valor / Data</th>
                  <th className="px-5 py-4 text-center">Pagamento</th>
                  <th className="px-5 py-4 text-center">Ação de Entrega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carregando ? (
                  <tr><td colSpan="6" className="p-12 text-center text-sm text-slate-400">Carregando operações...</td></tr>
                ) : vendas.length === 0 ? (
                  <tr><td colSpan="6" className="p-12 text-center text-sm text-slate-400">Nenhum pedido no período.</td></tr>
                ) : (
                  vendas.map((venda) => (
                    <tr key={venda.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* ID */}
                      <td className="px-5 py-4 font-mono text-slate-800 text-sm font-semibold">
                        #{venda.id}
                      </td>
                      
                      {/* CLIENTE */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800 truncate w-40" title={venda.cliente_nome}>{venda.cliente_nome || 'Não informado'}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{venda.cliente_telefone || '-'}</div>
                      </td>

                      {/* ITENS COMPRADOS (Resumo) */}
                      <td className="px-5 py-4">
                        <div className="text-xs text-slate-600 space-y-1">
                          {Array.isArray(venda.itens) && venda.itens.length > 0 ? (
                            venda.itens.map((item, idx) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-500">{item.quantidade}x</span>
                                <span className="truncate w-40 inline-block" title={item.nome}>{item.nome}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">Detalhes indisponíveis</span>
                          )}
                        </div>
                      </td>

                      {/* VALOR E DATA */}
                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-slate-800 text-sm">
                          R$ {parseFloat(venda.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {new Date(venda.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* PAGAMENTO */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        {venda.status_pagamento?.toLowerCase() === 'pago' ? (
                          <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-md border border-emerald-200 inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Pago
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-md border border-amber-200 inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pendente
                          </span>
                        )}
                      </td>

                      {/* AÇÃO DE ENTREGA (BOTÃO) */}
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => handleAlternarEntrega(venda.id, venda.status_entrega)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            venda.status_entrega === 'entregue'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-slate-50 hover:text-slate-500 hover:border-slate-300'
                            : 'bg-white text-slate-500 border-slate-300 shadow-sm hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                          }`}
                          title={venda.status_entrega === 'entregue' ? "Clique para reverter para pendente" : "Marcar como entregue"}
                        >
                          {venda.status_entrega === 'entregue' ? '✅ Entregue' : 'Marcar Entrega'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}