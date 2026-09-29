import React, { useState, useEffect, useCallback } from 'react';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import { supabase } from '../services/supabase';

export default function GestaoDespesas() {
  const [despesas, setDespesas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Estados do Formulário de Despesa
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [status, setStatus] = useState('pendente');

  // Estados do Filtro de Período (Padrão: Agosto 2026)
  const [mesFiltro, setMesFiltro] = useState('08');
  const [anoFiltro, setAnoFiltro] = useState('2026');

  // 🌟 NOVOS ESTADOS PARA GESTÃO DE CATEGORIAS 🌟
  const [categorias, setCategorias] = useState([]);
  const [modalCatAberto, setModalCatAberto] = useState(false);
  const [catNomeInput, setCatNomeInput] = useState('');
  const [catEditandoId, setCatEditandoId] = useState(null);
  const [salvandoCat, setSalvandoCat] = useState(false);

  // 1. BUSCAR CATEGORIAS DO BANCO
  const buscarCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_despesa')
        .select('*')
        .order('nome');
      if (error) throw error;
      setCategorias(data || []);
      
      // Auto-seleciona a primeira categoria se o campo estiver vazio
      if (data && data.length > 0 && !categoria) {
        setCategoria(data[0].nome);
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error.message);
    }
  };

  // 2. BUSCAR DESPESAS NO BANCO COM FILTRO DE VENCIMENTO
  const buscarDespesas = useCallback(async () => {
    try {
      setCarregando(true);
      const ultimoDia = new Date(parseInt(anoFiltro), parseInt(mesFiltro), 0).getDate();
      const dataInicio = `${anoFiltro}-${mesFiltro}-01`;
      const dataFim = `${anoFiltro}-${mesFiltro}-${ultimoDia}`;

      const { data, error } = await supabase
        .from('despesas')
        .select('*')
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;
      setDespesas(data || []);
    } catch (error) {
      console.error('Erro ao buscar despesas:', error.message);
    } finally {
      setCarregando(false);
    }
  }, [mesFiltro, anoFiltro]);

  // Efeito Inicial
  useEffect(() => {
    buscarCategorias();
    buscarDespesas();
  }, [buscarDespesas]);

  // 3. SALVAR NOVA DESPESA
  const handleSalvarDespesa = async (e) => {
    e.preventDefault();
    if (!descricao || !valor || !dataVencimento || !categoria) {
      alert("Preencha todos os campos, incluindo a categoria.");
      return;
    }

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

  // 4. MARCAR COMO PAGO / PENDENTE
  const alternarStatus = async (id, statusAtual) => {
    const novoStatus = statusAtual === 'pago' ? 'pendente' : 'pago';
    try {
      const { error } = await supabase.from('despesas').update({ status: novoStatus }).eq('id', id);
      if (error) throw error;
      buscarDespesas(); 
    } catch (error) {
      console.error('Erro ao atualizar status:', error.message);
    }
  };

  // 5. EXCLUIR DESPESA
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

  // 🌟 FUNÇÕES DO GERENCIADOR DE CATEGORIAS 🌟
  const handleSalvarCategoria = async (e) => {
    e.preventDefault();
    if (!catNomeInput.trim()) return;

    setSalvandoCat(true);
    try {
      if (catEditandoId) {
        const { error } = await supabase.from('categorias_despesa').update({ nome: catNomeInput }).eq('id', catEditandoId);
        if (error) throw error;
        
        if (categoria === categorias.find(c => c.id === catEditandoId)?.nome) {
           setCategoria(catNomeInput);
        }
      } else {
        const { error } = await supabase.from('categorias_despesa').insert([{ nome: catNomeInput }]);
        if (error) throw error;
      }

      setCatNomeInput('');
      setCatEditandoId(null);
      buscarCategorias();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error.message);
      alert('Erro ao salvar. Verifique se o nome já não existe.');
    } finally {
      setSalvandoCat(false);
    }
  };

  const handleEditarCategoria = (cat) => {
    setCatEditandoId(cat.id);
    setCatNomeInput(cat.nome);
  };

  const handleExcluirCategoria = async (id) => {
    if (!window.confirm('Excluir esta categoria? Isso não afetará as despesas já cadastradas com esse nome.')) return;
    try {
      const { error } = await supabase.from('categorias_despesa').delete().eq('id', id);
      if (error) throw error;
      buscarCategorias();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error.message);
    }
  };

  const fecharModalCategoria = () => {
    setModalCatAberto(false);
    setCatEditandoId(null);
    setCatNomeInput('');
  };

  // Cálculos
  const totalPendente = despesas.filter(d => d.status === 'pendente').reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
  const totalPago = despesas.filter(d => d.status === 'pago').reduce((acc, curr) => acc + parseFloat(curr.valor), 0);

  return (
    <div className="space-y-6 md:space-y-8 text-left pb-16 animate-fade-in relative">
      
      {/* 🌟 MODAL GERENCIADOR DE CATEGORIAS 🌟 */}
      {modalCatAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="font-serif font-bold text-lg text-slate-800">Gerenciar Categorias</h3>
              <button onClick={fecharModalCategoria} className="text-slate-400 hover:text-slate-700 transition-colors text-xl">✕</button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto bg-slate-50/50">
              {/* Formulário do Modal Ajustado para Mobile */}
              <form onSubmit={handleSalvarCategoria} className="flex flex-col sm:flex-row gap-2 mb-6">
                <input 
                  type="text" 
                  value={catNomeInput} 
                  onChange={(e) => setCatNomeInput(e.target.value)} 
                  placeholder="Nome (Ex: 🍔 Alimentação)"
                  className="flex-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-lua-rose-dark shadow-sm"
                  required
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={salvandoCat} className="flex-1 sm:flex-none bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-lua-rose-dark transition-colors shadow-sm disabled:opacity-70 whitespace-nowrap">
                    {salvandoCat ? '...' : (catEditandoId ? 'Atualizar' : 'Adicionar')}
                  </button>
                  {catEditandoId && (
                     <button type="button" onClick={() => {setCatEditandoId(null); setCatNomeInput('');}} className="bg-slate-200 text-slate-600 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors">
                       ✕
                     </button>
                  )}
                </div>
              </form>

              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Categorias Atuais</h4>
                {categorias.map(cat => (
                  // Item da lista ajustado para não vazar
                  <div key={cat.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border transition-colors shadow-xs ${catEditandoId === cat.id ? 'border-lua-rose-dark ring-1 ring-lua-rose-dark/20' : 'border-slate-100 hover:border-slate-200'}`}>
                    <span className="text-sm font-medium text-slate-700 truncate w-full sm:w-auto">{cat.nome}</span>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button onClick={() => handleEditarCategoria(cat)} className="text-[10px] uppercase font-bold text-blue-500 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded transition-colors whitespace-nowrap">Editar</button>
                      <button onClick={() => handleExcluirCategoria(cat.id)} className="text-[10px] uppercase font-bold text-rose-500 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded transition-colors whitespace-nowrap">Excluir</button>
                    </div>
                  </div>
                ))}
                {categorias.length === 0 && <p className="text-xs text-center text-slate-400 py-4">Nenhuma categoria criada.</p>}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white">
               <button onClick={fecharModalCategoria} className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors text-sm">
                 Fechar Painel
               </button>
            </div>
          </div>
        </div>
      )}


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
              <label className="text-xs font-semibold uppercase text-slate-500 block mb-1.5">Descrição</label>
              <input 
                type="text"
                placeholder="Ex: Conta de Luz, Etiquetas..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark"
                required
              />
            </div>

            {/* Grid ajustado para não quebrar no mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1.5">Valor (R$)</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1.5">Vencimento</label>
                <input 
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1.5">Categoria</label>
                <div className="flex gap-2">
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark"
                    required
                  >
                    {categorias.length === 0 && <option value="">Carregando...</option>}
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    onClick={() => setModalCatAberto(true)} 
                    title="Gerenciar Categorias"
                    className="bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-600 px-3 rounded-xl transition-all flex items-center justify-center shadow-sm shrink-0"
                  >
                    ⚙️
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1.5">Status Inicial</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark font-bold"
                >
                  <option value="pendente">⏳ A Pagar</option>
                  <option value="pago">✅ Já Pago</option>
                </select>
              </div>
            </div>

            <div className="pt-3">
              <Button variant="primary" type="submit" className="w-full py-3 shadow-md">
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