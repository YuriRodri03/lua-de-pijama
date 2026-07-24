import React, { useState, useEffect, useCallback } from 'react';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import { supabase } from "../services/supabase";

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Controle de Telas Laterais (Modais / Gavetas)
  const [cadastroAberto, setCadastroAberto] = useState(false); 
  const [modoEdicao, setModoEdicao] = useState(false);
  const [clienteSendoEditadoId, setClienteSendoEditadoId] = useState(null);

  const [clienteSelecionado, setClienteSelecionado] = useState(null); 
  const [historicoVendas, setHistoricoVendas] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  // Estados do formulário de cadastro/edição
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [notas, setNotas] = useState('');

  // Estados para Localidade (IBGE)
  const [listaUfs, setListaUfs] = useState([]);
  const [listaCidades, setListaCidades] = useState([]);
  const [uf, setUf] = useState('CE'); 
  const [cidade, setCidade] = useState('');
  const [carregandoCidades, setCarregandoCidades] = useState(false);

  // 1. CARREGAR ESTADOS DO IBGE AO INICIAR
  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?ordenar=nome')
      .then((res) => res.json())
      .then((data) => {
        const ufsOrdenadas = data.map(item => item.sigla).sort();
        setListaUfs(ufsOrdenadas);
      })
      .catch((err) => console.error('Erro ao buscar UFs:', err));
  }, []);

  // 2. CARREGAR CIDADES DO IBGE SEMPRE QUE A UF MUDAR
  useEffect(() => {
    if (!uf) return;
    setCarregandoCidades(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?ordenar=nome`)
      .then((res) => res.json())
      .then((data) => {
        const cidadesNomes = data.map(item => item.nome);
        setListaCidades(cidadesNomes);
        setCidade(cidadesNomes[0] || ''); 
      })
      .catch((err) => console.error('Erro ao buscar cidades:', err))
      .finally(() => setCarregandoCidades(false));
  }, [uf]);

  // 3. CARREGAR A BASE DE CLIENTES DO BANCO
  async function buscarClientes() {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error.message);
      alert('Não foi possível carregar a lista de clientes.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscarClientes();
  }, []);

  // 4. BUSCAR HISTÓRICO DE VENDAS DO CLIENTE SELECIONADO
  const buscarHistoricoVendas = useCallback(async (cliente) => {
    if (!cliente) return;
    try {
      setCarregandoHistorico(true);
      let query;

      if (cliente.cpf) {
        query = supabase
          .from('vendas')
          .select('*')
          .eq('cliente_cpf', cliente.cpf);
      } else {
        query = supabase
          .from('vendas')
          .select('*')
          .ilike('cliente_nome', cliente.nome);
      }

      const { data, error } = await query.order('criado_em', { ascending: false });
      if (error) throw error;

      const vendasFormatadas = (data || []).map(venda => {
        let resumoItens = "Compra de Pijamas";
        if (Array.isArray(venda.itens) && venda.itens.length > 0) {
          resumoItens = venda.itens.map(item => `${item.quantidade || 1}x ${item.nome || 'Produto'}`).join(', ');
        }

        return {
          id: venda.id,
          criado_em: venda.criado_em,
          itens_resumo: resumoItens,
          metodo_pagamento: venda.tipo_venda === 'pdv' ? 'Venda Física (PDV)' : 'Loja Online',
          valor_total: parseFloat(venda.total),
          vendedor: venda.vendedor_id || 'Não identificado'
        };
      });

      setHistoricoVendas(vendasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar histórico do cliente:', error.message);
      setHistoricoVendas([]);
    } finally {
      setCarregandoHistorico(false);
    }
  }, []);

  useEffect(() => {
    if (clienteSelecionado) {
      buscarHistoricoVendas(clienteSelecionado);
    }
  }, [clienteSelecionado, buscarHistoricoVendas]);

  // Máscara de CPF
  const handleCpfChange = (e) => {
    let valor = e.target.value.replace(/\D/g, '');
    if (valor.length <= 11) {
      valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
      valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
      valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      valor = valor.substring(0, 11);
    }
    setCpf(valor);
  };

  // Máscara de WhatsApp
  const handleWhatsappChange = (e) => {
    let valor = e.target.value.replace(/\D/g, '');
    if (valor.length <= 11) {
      valor = valor.replace(/^(\d{2})(\d)/g, '($1) $2');
      valor = valor.replace(/(\d{5})(\d)/, '$1-$2');
    }
    setWhatsapp(valor);
  };

  // 5. CADASTRAR OU ATUALIZAR CLIENTE
  const handleSalvarCliente = async (e) => {
    e.preventDefault();

    const dadosCliente = {
      nome,
      whatsapp,
      cpf: cpf || null,
      email: email || null,
      cidade,
      uf: uf.toUpperCase(),
      notas: notas || null,
    };

    try {
      if (modoEdicao) {
        const { data, error } = await supabase
          .from('clientes')
          .update(dadosCliente)
          .eq('id', clienteSendoEditadoId)
          .select();

        if (error) throw error;

        if (data) {
          setClientes(clientes.map(c => c.id === clienteSendoEditadoId ? data[0] : c).sort((a, b) => a.nome.localeCompare(b.nome)));
          alert('Cadastro atualizado com sucesso!');
        }
      } else {
        const { data, error } = await supabase
          .from('clientes')
          .insert([dadosCliente])
          .select();

        if (error) throw error;

        if (data) {
          setClientes([data[0], ...clientes].sort((a, b) => a.nome.localeCompare(b.nome)));
          alert('Cliente cadastrada com sucesso!');
        }
      }

      fecharEFecharGaveta();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error.message);
      alert(`Erro ao salvar dados: ${error.message}`);
    }
  };

  // 6. EXCLUIR CLIENTE
  const handleExcluirCliente = async (id) => {
    const confirmar = window.confirm("Atenção! Você tem certeza que deseja excluir permanentemente o cadastro desta cliente?");
    if (!confirmar) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setClientes(clientes.filter(c => c.id !== id));
      setClienteSelecionado(null);
      alert("Cadastro excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir cliente:", error.message);
      alert(`Erro ao excluir: ${error.message}`);
    }
  };

  // 7. EXCLUIR UMA VENDA
  const handleExcluirVenda = async (vendaId) => {
    const confirmar = window.confirm(
      "Deseja realmente estornar/excluir este registro de venda? Os produtos vendidos serão devolvidos ao estoque automaticamente."
    );
    if (!confirmar) return;

    try {
      const { data: venda, error: buscaError } = await supabase
        .from('vendas')
        .select('itens')
        .eq('id', vendaId)
        .single();

      if (buscaError) throw buscaError;

      if (venda && Array.isArray(venda.itens) && venda.itens.length > 0) {
        for (const item of venda.itens) {
          const { data: prodAtual } = await supabase
            .from('produtos')
            .select('quantidade_estoque')
            .eq('id', item.produtoId)
            .single();

          if (prodAtual) {
            const novoEstoque = (prodAtual.quantidade_estoque || 0) + item.quantidade;

            const { error: updateError } = await supabase
              .from('produtos')
              .update({ quantidade_estoque: novoEstoque })
              .eq('id', item.produtoId);

            if (updateError) {
              console.error(`Erro ao devolver produto ${item.produtoId} ao estoque:`, updateError.message);
            }
          }
        }
      }

      const { error: deleteError } = await supabase
        .from('vendas')
        .delete()
        .eq('id', vendaId);

      if (deleteError) throw deleteError;

      setHistoricoVendas(historicoVendas.filter(v => v.id !== vendaId));
      alert("Estorno realizado! Venda excluída e produtos devolvidos ao estoque com sucesso.");
    } catch (error) {
      console.error("Erro ao estornar venda:", error.message);
      alert(`Falha ao estornar venda: ${error.message}`);
    }
  };

  const iniciarEdicaoCliente = (cliente) => {
    setModoEdicao(true);
    setClienteSendoEditadoId(cliente.id);
    setNome(cliente.nome);
    setWhatsapp(cliente.whatsapp);
    setCpf(cliente.cpf || '');
    setEmail(cliente.email || '');
    setUf(cliente.uf || 'CE');
    setCidade(cliente.cidade || '');
    setNotas(cliente.notas || '');
    setCadastroAberto(true);
  };

  const fecharEFecharGaveta = () => {
    setNome('');
    setWhatsapp('');
    setCpf('');
    setEmail('');
    setNotas('');
    setModoEdicao(false);
    setClienteSendoEditadoId(null);
    setCadastroAberto(false);
  };

  const clientesFiltrados = clientes.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase()) || 
    c.whatsapp.includes(busca) ||
    (c.cpf && c.cpf.includes(busca))
  );

  return (
    <div className="space-y-6 md:space-y-8 text-left relative min-h-screen pb-16">
      
      {/* Indicadores do Topo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        <StatCard 
          label="Total de Clientes" 
          value={carregando ? "..." : `${clientes.length} contatos`}
          statusText="Base unificada"
          statusType="neutral"
        />
        <StatCard 
          label="Fidelidade" 
          value="Ceará"
          statusText="Maior concentração"
          statusType="gold"
        />
        <StatCard 
          label="Com Preferências" 
          value={carregando ? "..." : `${clientes.filter(c => c.notas).length} ativas`}
          statusText="Hiper-personalização"
          statusType="alert"
        />
      </div>

      {/* SEÇÃO PRINCIPAL DA CARTEIRA */}
      <div className="bg-white border border-lua-rose-dark/10 p-4 md:p-6 rounded-2xl shadow-xs space-y-5 md:space-y-6">
        
        {/* Topo: Busca + Botão de Cadastro */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4 md:pb-5">
          <div>
            <h3 className="font-serif text-xl md:text-2xl font-bold text-slate-800">Carteira de Clientes</h3>
            <p className="text-xs text-slate-400 mt-0.5">Gerencie o relacionamento e histórico de compras.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <input 
              type="text"
              placeholder="🔍 Buscar nome, WhatsApp ou CPF..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 w-full sm:w-64 focus:outline-none focus:border-lua-rose-dark"
            />
            
            <Button 
              variant="primary" 
              onClick={() => { setModoEdicao(false); setCadastroAberto(true); }}
              className="whitespace-nowrap font-bold cursor-pointer text-sm py-2.5"
            >
              ➕ <span className="hidden sm:inline">Cadastrar Novo</span> Cliente
            </Button>
          </div>
        </div>

        {/* Diretório de Fichas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
          {carregando ? (
            <div className="col-span-1 md:col-span-2 text-xs text-slate-400 text-center py-16">Buscando carteira no Supabase...</div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="col-span-1 md:col-span-2 text-xs text-slate-400 text-center py-16">Nenhum registro localizado no diretório.</div>
          ) : (
            clientesFiltrados.map(cliente => (
              <div key={cliente.id} className="border border-slate-100 bg-slate-50/20 rounded-xl p-4 md:p-5 hover:border-lua-rose-dark/20 hover:bg-lua-cream/10 transition-all flex flex-col justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="font-serif font-bold text-slate-800 text-base md:text-lg">{cliente.nome}</h4>
                    {cliente.cpf && <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded-md">{cliente.cpf}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    📍 {cliente.cidade ? `${cliente.cidade} - ${cliente.uf}` : 'Localidade não informada'}
                  </p>
                  <p className="text-[11px] md:text-xs text-slate-400 mt-0.5 truncate">
                    ✉️ {cliente.email || 'Sem e-mail cadastrado'}
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                  <button 
                    onClick={() => setClienteSelecionado(cliente)}
                    className="flex-1 min-w-[100px] bg-lua-rose-light/20 hover:bg-lua-rose-light/40 text-lua-rose-dark text-xs font-bold py-2 px-2 rounded-lg border border-lua-rose-dark/5 transition-all cursor-pointer text-center"
                  >
                    📂 Histórico
                  </button>
                  <a 
                    href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 min-w-[90px] bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-2 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors text-center cursor-pointer"
                  >
                    💬 Whats
                  </a>
                  <button 
                    onClick={() => iniciarEdicaoCliente(cliente)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer text-center"
                    title="Editar ficha"
                  >
                    ✏️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ==================== TELA LATERAL DE CADASTRO / EDIÇÃO ==================== */}
      {cadastroAberto && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={fecharEFecharGaveta}
          />

          <div 
            className="relative w-full sm:max-w-md bg-white h-full shadow-2xl flex flex-col justify-between p-5 md:p-8 z-10 border-l border-lua-rose-dark/10 overflow-y-auto"
            style={{ animation: 'slideLeft 0.3s ease-out forward' }}
          >
            <div>
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-lua-rose-dark bg-lua-cream px-2 py-1 rounded">
                    {modoEdicao ? 'Atualização' : 'Registro'}
                  </span>
                  <h3 className="font-serif text-lg md:text-xl font-bold text-slate-800 mt-2">
                    {modoEdicao ? 'Editar Ficha da Cliente' : 'Nova Ficha de Cliente'}
                  </h3>
                </div>
                <button 
                  onClick={fecharEFecharGaveta} 
                  className="text-slate-400 hover:text-slate-600 p-1 md:p-2 text-lg md:text-xl cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSalvarCliente} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    placeholder="Nome da cliente"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">WhatsApp</label>
                    <input 
                      type="text" 
                      placeholder="(85) 99999-0000"
                      value={whatsapp}
                      onChange={handleWhatsappChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">CPF (Opcional)</label>
                    <input 
                      type="text" 
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={handleCpfChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">UF</label>
                    <select 
                      value={uf} 
                      onChange={(e) => setUf(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:border-lua-rose-dark"
                    >
                      {listaUfs.map((sigla) => (
                        <option key={sigla} value={sigla}>{sigla}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Cidade</label>
                    <select 
                      value={cidade} 
                      onChange={(e) => setCidade(e.target.value)} 
                      disabled={carregandoCidades}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-lua-rose-dark disabled:opacity-50"
                    >
                      {carregandoCidades ? (
                        <option>Carregando...</option>
                      ) : (
                        listaCidades.map((nomeCidade) => (
                          <option key={nomeCidade} value={nomeCidade}>{nomeCidade}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">E-mail (Opcional)</label>
                  <input 
                    type="email" 
                    placeholder="cliente@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Preferências de Gosto</label>
                  <textarea 
                    rows="3"
                    placeholder="ex: Prefere pijamas de botões, tamanho G..."
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark resize-none"
                  />
                </div>

                <Button variant="primary" type="submit" className="w-full mt-4 py-3">
                  {modoEdicao ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </Button>
              </form>
            </div>

            <Button variant="secondary" onClick={fecharEFecharGaveta} className="w-full mt-4">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* ==================== MODAL DETALHADO: FICHA E HISTÓRICO ==================== */}
      {clienteSelecionado && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 z-50">
          <div className="bg-white border border-lua-rose-dark/15 rounded-2xl md:rounded-3xl max-w-2xl w-full p-4 md:p-8 shadow-xl max-h-[90vh] md:max-h-[85vh] overflow-y-auto space-y-5 md:space-y-6 animate-fade-in">
            
            <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-100 pb-4 gap-4">
              <div className="flex justify-between items-start w-full sm:w-auto">
                <div>
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-lua-rose-dark bg-lua-cream px-2 py-1 rounded">Ficha da Cliente</span>
                  <h3 className="font-serif text-lg md:text-2xl font-bold text-slate-800 mt-2">{clienteSelecionado.nome}</h3>
                </div>
                <button 
                  onClick={() => setClienteSelecionado(null)} 
                  className="sm:hidden text-slate-400 hover:text-slate-600 transition-colors p-1 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => { setClienteSelecionado(null); iniciarEdicaoCliente(clienteSelecionado); }}
                  className="flex-1 sm:flex-none bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] md:text-xs font-bold px-3 py-2 md:py-1.5 rounded-lg border border-amber-200 transition-colors cursor-pointer text-center"
                >
                  ✏️ Editar
                </button>
                <button 
                  onClick={() => handleExcluirCliente(clienteSelecionado.id)}
                  className="flex-1 sm:flex-none bg-red-50 hover:bg-red-100 text-red-600 text-[11px] md:text-xs font-bold px-3 py-2 md:py-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer text-center"
                >
                  🗑️ Excluir
                </button>
                <button 
                  onClick={() => setClienteSelecionado(null)} 
                  className="hidden sm:block text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer text-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Informações Gerais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm bg-slate-50 p-4 rounded-xl md:rounded-2xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">WhatsApp</span>
                <span className="font-medium text-slate-700">{clienteSelecionado.whatsapp}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CPF</span>
                <span className="font-mono text-slate-700">{clienteSelecionado.cpf || 'Não cadastrado'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cidade / UF</span>
                <span className="font-medium text-slate-700">{clienteSelecionado.cidade ? `${clienteSelecionado.cidade} - ${clienteSelecionado.uf}` : 'Não informado'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">E-mail</span>
                <span className="font-medium text-slate-700 truncate block">{clienteSelecionado.email || 'Não informado'}</span>
              </div>
            </div>

            {/* Preferências */}
            <div>
              <h4 className="text-[11px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Observações & Preferências</h4>
              <div className="bg-lua-cream/40 border border-lua-rose-dark/10 p-3 md:p-4 rounded-xl text-slate-600 text-xs md:text-sm">
                {clienteSelecionado.notas || "Nenhuma anotação registrada para esta cliente."}
              </div>
            </div>

            {/* HISTÓRICO DE COMPRAS */}
            <div>
              <h4 className="text-[11px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Histórico de Compras (PDV)</h4>
              {carregandoHistorico ? (
                <p className="text-xs text-slate-400 text-center py-6">Carregando histórico...</p>
              ) : historicoVendas.length === 0 ? (
                <div className="text-center py-6 md:py-8 border border-dashed border-slate-200 rounded-xl md:rounded-2xl">
                  <span className="text-2xl block mb-1">🛍️</span>
                  <p className="text-xs text-slate-400">Esta cliente ainda não realizou compras.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historicoVendas.map((venda) => (
                    <div key={venda.id} className="border border-slate-100 rounded-xl p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white hover:bg-slate-50/50 transition-colors">
                      
                      <div className="flex-1 w-full sm:pr-4">
                        <span className="text-[10px] font-mono text-slate-400 block">
                          {new Date(venda.criado_em).toLocaleDateString('pt-BR')}
                        </span>
                        <p className="text-[11px] md:text-xs font-semibold text-slate-700 mt-0.5 line-clamp-2">
                          {venda.itens_resumo || "Compra de Pijamas / Produtos"}
                        </p>
                        <div className="flex flex-wrap gap-1.5 items-center mt-1.5">
                          <span className="text-[9px] md:text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                            Via {venda.metodo_pagamento || "Dinheiro/Pix"}
                          </span>
                          <span className="text-[9px] md:text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                            👤 Vendedor: <strong className="text-slate-600 font-normal">{venda.vendedor}</strong>
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto border-t sm:border-0 border-slate-100 pt-2 sm:pt-0 gap-3">
                        <span className="font-mono font-bold text-slate-800 text-xs md:text-sm">
                          R$ {venda.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <button
                          onClick={() => handleExcluirVenda(venda.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-500 p-1.5 md:p-2 rounded-lg border border-red-200/50 hover:text-red-700 transition-all cursor-pointer"
                          title="Excluir/Estornar Venda"
                        >
                          🗑️
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 sm:hidden">
              <Button variant="secondary" onClick={() => setClienteSelecionado(null)} className="w-full cursor-pointer py-3">
                Fechar Ficha
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}