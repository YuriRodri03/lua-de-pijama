import React, { useState, useEffect, useCallback } from 'react';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import { supabase } from '../services/supabase';

export default function PainelSistema({ userRole }) {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Controle de Abas de Visão Temporal
  const [abaAtiva, setAbaAtiva] = useState('mensal'); // 'mensal' | 'anual'

  // Filtros Temporais (Alinhados com o Workspace de 2026)
  const [mes, setMes] = useState('07');
  const [ano, setAno] = useState('2026');

  // 1. BUSCAR DADOS DO SUPABASE COM FILTRO DE ACORDO COMA ABA SELECIONADA
  const buscarDados = useCallback(async () => {
    try {
      setCarregando(true);
      let dataInicio, dataFim;

      if (abaAtiva === 'mensal') {
        // Filtro estrito para o mês escolhido
        dataInicio = `${ano}-${mes}-01T00:00:00Z`;
        dataFim = `${ano}-${mes}-31T23:59:59Z`;
      } else {
        // Visão Anual Ampla (Todo o ano corrente)
        dataInicio = `${ano}-01-01T00:00:00Z`;
        dataFim = `${ano}-12-31T23:59:59Z`;
      }

      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .gte('criated_at', dataInicio) // Ajuste para 'criado_em' se for o nome da sua coluna
        .order('id', { ascending: true });

      // Se a coluna acima der erro no seu banco, mude para fallback sem filtro de criação se o catálogo for unificado:
      // const { data, error } = await supabase.from('produtos').select('*').order('id', { ascending: true });

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao carregar dados do painel:', error.message);
    } finally {
      setCarregando(false);
    }
  }, [abaAtiva, mes, ano]);

  useEffect(() => {
    buscarDados();
  }, [buscarDados]);

  // 2. ALTERAÇÃO EM TEMPO REAL NOS INPUTS NUMÉRICOS (PRESERVA A PRECISÃO MANUAL)
  const handleInputChange = (id, campo, valor) => {
    setProdutos(prev => prev.map(prod => {
      if (prod.id === id) {
        return { ...prod, [campo]: valor };
      }
      return prod;
    }));
  };

  // 3. PERSISTIR ALTERAÇÕES EM LOTE NO SUPABASE
  const handleSalvarAlteracoes = async () => {
    try {
      setSalvando(true);
      const promises = produtos.map(prod => 
        supabase
          .from('produtos')
          .update({ 
            preco_varejo: prod.preco_varejo, 
            preco_atacado: prod.preco_atacado, 
            quantidade_estoque: prod.quantidade_estoque 
          })
          .eq('id', prod.id)
      );

      await Promise.all(promises);
      alert('Todas as alterações de catálogo e estoque foram sincronizadas com o banco!');
      buscarDados();
    } catch (error) {
      console.error('Erro ao salvar alterações:', error.message);
      alert('Falha ao sincronizar dados com o servidor.');
    } finally {
      setSalvando(false);
    }
  };

  // 4. CÁLCULOS ANALÍTICOS DAS MÉTRICAS GERAIS
  const valorTotalEstoqueVarejo = produtos.reduce((acc, curr) => acc + (parseFloat(curr.preco_varejo || 0) * parseInt(curr.quantidade_estoque || 0)), 0);
  const valorTotalEstoqueAtacado = produtos.reduce((acc, curr) => acc + (parseFloat(curr.preco_atacado || 0) * parseInt(curr.quantidade_estoque || 0)), 0);
  const totalPecasEstoque = produtos.reduce((acc, curr) => acc + parseInt(curr.quantidade_estoque || 0), 0);
  
  // Cálculo de Margem e Eficiência síncrona do portfólio de produtos
  const margemMediaPotencial = produtos.length > 0 
    ? (produtos.reduce((acc, curr) => {
        const v = parseFloat(curr.preco_varejo || 0);
        const a = parseFloat(curr.preco_atacado || 0);
        return acc + (v > 0 ? ((v - a) / v) * 100 : 0);
      }, 0) / produtos.length)
    : 0;

  // Ajuste sutil de custos baseados na visão mensal ou anual cumulativa
  const custosOperacionais = produtos.length > 0 
    ? (abaAtiva === 'mensal' ? 3200.00 : 3200.00 * 12) 
    : 0.00;

  return (
    <div className="space-y-6">
      
      {/* NAVEGAÇÃO DE ABAS TEMPORAIS + CONTROLES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-100 p-2 rounded-2xl shadow-xs">
        
        {/* Chaves de Seleção da Aba (Mensal vs Anual) */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setAbaAtiva('mensal')}
            className={`flex-1 md:flex-none text-xs font-bold px-5 py-2.5 rounded-lg transition-all cursor-pointer ${abaAtiva === 'mensal' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
          >
            📊 Visão Mensal
          </button>
          <button
            onClick={() => setAbaAtiva('anual')}
            className={`flex-1 md:flex-none text-xs font-bold px-5 py-2.5 rounded-lg transition-all cursor-pointer ${abaAtiva === 'anual' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
          >
            📅 Projeção Anual
          </button>
        </div>

        {/* Seletores Dinâmicos de Filtro */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {abaAtiva === 'mensal' && (
            <select 
              value={mes} 
              onChange={(e) => setMes(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-lua-rose-dark cursor-pointer"
            >
              <option value="01">Janeiro</option>
              <option value="02">Fevereiro</option>
              <option value="03">Março</option>
              <option value="04">Abril</option>
              <option value="05">Maio</option>
              <option value="06">Junho</option>
              <option value="07">Julho</option>
              <option value="08">Agosto</option>
              <option value="09">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
          )}

          <select 
            value={ano} 
            onChange={(e) => setAno(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-lua-rose-dark cursor-pointer"
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>
      </div>

      {/* GRADE INDICADORA EXECUTIVA EXPANDIDA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          label={abaAtiva === 'mensal' ? "Capital Estocado (Varejo)" : "Patrimônio Total Anual"}
          value={`R$ ${valorTotalEstoqueVarejo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          statusText="Valor total de prateleira ativa" 
          statusType="gold" 
        />
        <StatCard 
          label="Avaliação em Atacado" 
          value={`R$ ${valorTotalEstoqueAtacado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          statusText="Faturamento mínimo B2B" 
          statusType="neutral" 
        />
        <StatCard 
          label={abaAtiva === 'mensal' ? "Custos de Operação (Mês)" : "Custos Fixos Projetados (Ano)"}
          value={`R$ ${custosOperacionais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          statusText="Orçamento fixo estrutural" 
          statusType="alert" 
        />
        <StatCard 
          label="Rentabilidade do Catálogo" 
          value={`${margemMediaPotencial.toFixed(1)}%`} 
          statusText="Markup médio Varejo/Atacado" 
          statusType="gold" 
        />
      </div>

      {/* SEÇÃO GRÁFICA AVANÇADA: DISTRIBUIÇÃO PATRIMONIAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico de Barras de Distribuição */}
        <div className="lg:col-span-2 bg-white border border-lua-rose-dark/10 rounded-2xl p-6 shadow-xs text-left">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-800">Alocação de Ativos por Modelo</h3>
              <p className="text-xs text-slate-400 mt-0.5">Peso financeiro e concentração de cada pijama sobre o inventário ativo.</p>
            </div>
            <span className="text-[10px] bg-lua-cream text-lua-rose-dark font-bold px-2 py-1 rounded uppercase tracking-wider">
              {abaAtiva}
            </span>
          </div>
          
          <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
            {carregando ? (
              <div className="text-xs text-slate-400 text-center py-16">Estruturando dados analíticos...</div>
            ) : produtos.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-16">Nenhum dado financeiro para o ciclo selecionado.</div>
            ) : (
              produtos.map(prod => {
                const valorProduto = prod.preco_varejo * prod.quantidade_estoque;
                const porcentagem = valorTotalEstoqueVarejo > 0 ? (valorProduto / valorTotalEstoqueVarejo) * 100 : 0;
                
                return (
                  <div key={prod.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span className="truncate max-w-[200px] md:max-w-sm">✨ {prod.nome}</span>
                      <span className="font-mono text-slate-500 font-semibold">
                        R$ {valorProduto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({porcentagem.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-50 border border-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-lua-rose-dark h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${porcentagem}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Card Lateral de Eficiência Física de Estoque */}
        <div className="bg-white border border-lua-rose-dark/10 rounded-2xl p-6 shadow-xs text-left flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-800 mb-1">Balanço Volumétrico</h3>
            <p className="text-xs text-slate-400">Total físico de peças prontas para venda na prateleira.</p>
            
            <div className="my-6 text-center">
              <span className="text-5xl font-mono font-bold text-slate-800 block">{carregando ? "..." : totalPecasEstoque}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mt-1">Unidades Disponíveis</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-500">
              <span>Modelos Cadastrados:</span>
              <strong className="text-slate-700 font-mono">{produtos.length} referências</strong>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Estoque Crítico (&le; 4 un):</span>
              <strong className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-mono">
                {produtos.filter(p => p.quantidade_estoque <= 4).length} itens
              </strong>
            </div>
          </div>
        </div>

      </div>

      {/* 3. MÓDULO SÍNCRONO DE GERENCIAMENTO DE CATÁLOGO */}
      <div className="bg-white border border-lua-rose-dark/10 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 mb-6 gap-4">
          <div className="text-left">
            <h2 className="text-xl font-bold text-slate-800">Tabela Operacional de Ajuste Rápido</h2>
            <p className="text-xs text-slate-400 mt-0.5">Entradas numéricas diretas para modificação em tempo real síncrona com o Supabase.</p>
          </div>
          <Button variant="gold" onClick={handleSalvarAlteracoes} disabled={salvando || carregando} className="cursor-pointer">
            {salvando ? 'Salvando Lote...' : '💾 Sincronizar Alterações'}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 min-w-[600px]">
            <thead>
              <tr className="bg-lua-cream border-b border-lua-rose-dark/10 text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-4 rounded-l-lg">Pijama / Produto</th>
                <th className="p-4">Varejo (R$)</th>
                <th className="p-4">Atacado (R$)</th>
                <th className="p-4">Qtd Estoque</th>
                <th className="p-4 rounded-r-lg">Diagnóstico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-xs text-slate-400">
                    Buscando portfólio de produtos...
                  </td>
                </tr>
              ) : produtos.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-xs text-slate-400">
                    Nenhum produto indexado para a visão selecionada.
                  </td>
                </tr>
              ) : (
                produtos.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4 font-serif font-bold text-slate-700 text-left">{prod.nome}</td>
                    
                    {/* Preço Varejo */}
                    <td className="p-4">
                      <input 
                        type="number" 
                        step="0.01"
                        value={prod.preco_varejo}
                        onChange={(e) => handleInputChange(prod.id, 'preco_varejo', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-lua-rose-dark"
                      />
                    </td>

                    {/* Preço Atacado */}
                    <td className="p-4">
                      <input 
                        type="number" 
                        step="0.01"
                        value={prod.preco_atacado}
                        onChange={(e) => handleInputChange(prod.id, 'preco_atacado', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-lua-rose-dark"
                      />
                    </td>
                    
                    {/* Quantidade Estoque */}
                    <td className="p-4">
                      <input 
                        type="number" 
                        value={prod.quantidade_estoque}
                        onChange={(e) => handleInputChange(prod.id, 'quantidade_estoque', parseInt(e.target.value) || 0)}
                        className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-lua-rose-dark"
                      />
                    </td>

                    {/* Diagnóstico Automatizado */}
                    <td className="p-4 text-left">
                      {prod.quantidade_estoque <= 0 ? (
                        <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200">
                          Esgotado
                        </span>
                      ) : prod.quantidade_estoque <= 4 ? (
                        <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">
                          Estoque Mínimo
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                          Disponível
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}