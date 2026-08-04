import React, { useState, useEffect, useCallback } from 'react';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import { supabase } from '../services/supabase';

export default function GestaoDespesas() {
  const [despesas, setDespesas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Estados do Formulário
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('Embalagens');
  const [dataVencimento, setDataVencimento] = useState('');
  const [status, setStatus] = useState('pendente');

  // Estados do Filtro de Período (Padrão: Agosto 2026)
  const [mesFiltro, setMesFiltro] = useState('08');
  const [anoFiltro, setAnoFiltro] = useState('2026');

  // 1. BUSCAR DESPESAS NO BANCO COM FILTRO DE VENCIMENTO
  const buscarDespesas = useCallback(async () => {
    try {
      setCarregando(true);
      
      // Descobre o último dia do mês selecionado para o filtro exato
      const ultimoDia = new Date(parseInt(anoFiltro), parseInt(mesFiltro), 0).getDate();
      const dataInicio = `${anoFiltro}-${mesFiltro}-01`;
      const dataFim = `${anoFiltro}-${mesFiltro}-${ultimoDia}`;

      const { data, error } = await supabase
        .from('despesas')
        .select('*')
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim)
        .order('data_vencimento', { ascending: true }); // Ordena pelas mais próximas a vencer no mês

      if (error) throw error;
      setDespesas(data || []);
    } catch (error) {
      console.error('Erro ao buscar despesas:', error.message);
    } finally {
      setCarregando(false);
    }
  }, [mesFiltro, anoFiltro]);

  useEffect(() => {
    buscarDespesas();
  }, [buscarDespesas]);

  // 2. SALVAR NOVA DESPESA
  const handleSalvarDespesa = async (e) => {
    e.preventDefault();
    if (!descricao || !valor || !dataVencimento) return;

    try {
      const { error } = await supabase
        .from('despesas')
        .insert([{
          descricao,
          valor: parseFloat(valor),
          categoria,
          data_vencimento: dataVencimento,
          status
        }]);

      if (error) throw error;

      alert('Despesa registrada com sucesso!');
      
      // Limpar formulário
      setDescricao('');
      setValor('');
      setDataVencimento('');
      setStatus('pendente');
      
      buscarDespesas();
    } catch (error) {
      console.error('Erro ao salvar despesa:', error.message);
      alert('Falha ao registrar a despesa.');
    }
  };

  // 3. MARCAR COMO PAGO / PENDENTE (TOGGLE RÁPIDO)
  const alternarStatus = async (id, statusAtual) => {
    const novoStatus = statusAtual === 'pago' ? 'pendente' : 'pago';
    try {
      const { error } = await supabase
        .from('despesas')
        .update({ status: novoStatus })
        .eq('id', id);

      if (error) throw error;
      buscarDespesas(); 
    } catch (error) {
      console.error('Erro ao atualizar status:', error.message);
    }
  };

  // 4. EXCLUIR DESPESA
  const handleExcluir = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      const { error } = await supabase.from('despesas').delete().eq('id', id);
      if (error) throw error;
      buscarDespesas();
    } catch (error) {
      console.error('Erro ao excluir:', error.message);
    }
  };

  // 5. CÁLCULOS DOS CARDS (Baseados no mês filtrado)
  const totalPendente = despesas
    .filter(d => d.status === 'pendente')
    .reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
    
  const totalPago = despesas
    .filter(d => d.status === 'pago')
    .reduce((acc, curr) => acc + parseFloat(curr.valor), 0);

  return (
    <div className="space-y-6 md:space-y-8 text-left pb-16 animate-fade-in">
      
      {/* BARRA DE FILTRO MENSAL */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white border border-slate-100 p-3 rounded-2xl shadow-xs">
        <div className="text-slate-800 font-serif font-bold text-sm md:text-base px-2">
          📅 Balanço Financeiro do Mês
        </div>
        <div className="flex gap-2">
          <select 
            value={mesFiltro} 
            onChange={(e) => setMesFiltro(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:border-lua-rose-dark cursor-pointer"
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
          <select 
            value={anoFiltro} 
            onChange={(e) => setAnoFiltro(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:border-lua-rose-dark cursor-pointer"
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>
      </div>

      {/* CARDS INDICADORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
        <StatCard 
          label="Contas a Pagar (Pendentes)" 
          value={`R$ ${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          statusText={`${despesas.filter(d => d.status === 'pendente').length} boletos em aberto`} 
          statusType="alert" 
        />
        <StatCard 
          label="Despesas Pagas" 
          value={`R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          statusText="Volume de saída liquidada" 
          statusType="neutral" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        
        {/* FORMULÁRIO DE CADASTRO */}
        <div className="bg-white border border-lua-rose-dark/10 p-4 md:p-6 rounded-2xl shadow-xs h-fit">
          <h3 className="font-serif text-base md:text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
            💸 Registrar Saída
          </h3>
          <form onSubmit={handleSalvarDespesa} className="space-y-4">
            
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Descrição</label>
              <input 
                type="text"
                placeholder="Ex: Conta de Luz, Etiquetas..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Valor (R$)</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Vencimento</label>
                <input 
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Categoria</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark"
                >
                  <option value="Embalagens">📦 Embalagens</option>
                  <option value="Insumos">✂️ Insumos/Tecidos</option>
                  <option value="Marketing">📱 Marketing/Anúncios</option>
                  <option value="Operacional">🏢 Operacional (Luz, Internet)</option>
                  <option value="Logística">🚚 Logística/Fretes</option>
                  <option value="Impostos">📄 Impostos</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Status Inicial</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark font-bold"
                >
                  <option value="pendente">⏳ A Pagar</option>
                  <option value="pago">✅ Já Pago</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <Button variant="primary" type="submit" className="w-full py-2.5 shadow-md">
                Adicionar Despesa
              </Button>
            </div>
          </form>
        </div>

        {/* LISTAGEM DE DESPESAS */}
        <div className="lg:col-span-2 bg-white border border-lua-rose-dark/10 p-4 md:p-6 rounded-2xl shadow-xs">
          <h3 className="font-serif text-base md:text-lg font-bold text-slate-800 mb-3 md:mb-4">Fluxo de Contas do Período</h3>
          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
            <table className="w-full text-left text-sm text-slate-600 min-w-[600px]">
              <thead>
                <tr className="bg-lua-cream border-b border-lua-rose-dark/10 text-slate-500 text-[10px] md:text-xs uppercase whitespace-nowrap">
                  <th className="p-3 rounded-l-lg">Descrição / Categoria</th>
                  <th className="p-3">Vencimento</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3 text-center">Situação</th>
                  <th className="p-3 text-right rounded-r-lg">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carregando ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-xs text-slate-400">
                      Buscando registros financeiros...
                    </td>
                  </tr>
                ) : despesas.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      Nenhuma despesa localizada para {mesFiltro}/{anoFiltro}.
                    </td>
                  </tr>
                ) : (
                  despesas.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-800 text-xs md:text-sm truncate max-w-[200px]">{d.descricao}</div>
                        <div className="text-[10px] md:text-xs text-slate-400">{d.categoria}</div>
                      </td>
                      <td className="p-3 text-xs font-medium text-slate-600 whitespace-nowrap">
                        {new Date(d.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        R$ {parseFloat(d.valor).toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => alternarStatus(d.id, d.status)}
                          className={`text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider transition-colors cursor-pointer border ${
                            d.status === 'pago' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {d.status === 'pago' ? '✅ Pago' : '⏳ Pendente'}
                        </button>
                      </td>
                      <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <button 
                          onClick={() => handleExcluir(d.id)}
                          className="text-xs text-rose-500 hover:text-rose-700 font-bold transition-colors cursor-pointer"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}