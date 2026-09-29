import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import { supabase } from '../services/supabase';

export default function Estoque() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  const [abaAtual, setAbaAtual] = useState('catalogo'); 
  
  // -------------------------------------------------------------------
  // ESTADOS DO FORMULÁRIO (PRODUTO BASE)
  // -------------------------------------------------------------------
  const [nome, setNome] = useState('');
  const [precoVarejo, setPrecoVarejo] = useState('');
  const [precoAtacado, setPrecoAtacado] = useState('');
  const [categoria, setCategoria] = useState(''); 
  const [fotosArquivos, setFotosArquivos] = useState([]); 
  const [fotosExistentes, setFotosExistentes] = useState([]); 
  const [tag, setTag] = useState('Novidade');

  // -------------------------------------------------------------------
  // ESTADOS DE CATEGORIAS
  // -------------------------------------------------------------------
  const [categorias, setCategorias] = useState([]);
  const [modalCatAberto, setModalCatAberto] = useState(false);
  const [catNomeInput, setCatNomeInput] = useState('');
  const [catEditandoId, setCatEditandoId] = useState(null);
  const [salvandoCat, setSalvandoCat] = useState(false);

  // -------------------------------------------------------------------
  // ESTADOS DA GRADE DE VARIAÇÕES
  // -------------------------------------------------------------------
  const [variacoesInput, setVariacoesInput] = useState([]);
  const [novaCor, setNovaCor] = useState('');
  
  const [grade, setGrade] = useState({
    PP: { qtd: '', acrescimo: '' },
    P:  { qtd: '', acrescimo: '' },
    M:  { qtd: '', acrescimo: '' },
    G:  { qtd: '', acrescimo: '' },
    GG: { qtd: '', acrescimo: '' }
  });

  // 1. BUSCAR DADOS
  async function buscarCategorias() {
    try {
      const { data, error } = await supabase.from('categorias_produto').select('*').order('nome');
      if (error) throw error;
      setCategorias(data || []);
      if (data && data.length > 0 && !categoria) setCategoria(data[0].nome);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error.message);
    }
  }

  async function buscarEstoque() {
    try {
      setCarregando(true);
      const { data, error } = await supabase.from('produtos').select('*').order('criado_em', { ascending: false });
      if (error) throw error;
      setItens(data || []);
    } catch (error) {
      console.error('Erro ao buscar dados do estoque:', error.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscarCategorias();
    buscarEstoque();
  }, []);

  // 🌟 GESTÃO DE CATEGORIAS 🌟
  const handleSalvarCategoria = async (e) => {
    e.preventDefault();
    if (!catNomeInput.trim()) return;

    setSalvandoCat(true);
    try {
      if (catEditandoId) {
        const { error } = await supabase.from('categorias_produto').update({ nome: catNomeInput }).eq('id', catEditandoId);
        if (error) throw error;
        if (categoria === categorias.find(c => c.id === catEditandoId)?.nome) setCategoria(catNomeInput);
      } else {
        const { error } = await supabase.from('categorias_produto').insert([{ nome: catNomeInput }]);
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

  const handleExcluirCategoria = async (id) => {
    if (!window.confirm('Excluir esta categoria? Isso não afetará os produtos já cadastrados.')) return;
    try {
      await supabase.from('categorias_produto').delete().eq('id', id);
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

  // 🌟 GESTÃO DA GRADE DE VARIAÇÕES (SOMA INTELIGENTE) 🌟
  const handleGradeChange = (tamanho, campo, valor) => {
    setGrade(prev => ({ ...prev, [tamanho]: { ...prev[tamanho], [campo]: valor } }));
  };

  const adicionarGradeDaCor = () => {
    if (!novaCor.trim()) {
      alert("Por favor, digite o nome da cor para adicionar a grade.");
      return;
    }

    let adicionouAlgo = false;
    let variacoesAtualizadas = [...variacoesInput];

    Object.entries(grade).forEach(([tamanho, dados]) => {
      const qtd = parseInt(dados.qtd, 10);
      if (qtd > 0) {
        const indexExistente = variacoesAtualizadas.findIndex(
          v => v.cor.toLowerCase() === novaCor.trim().toLowerCase() && v.tamanho === tamanho
        );

        if (indexExistente >= 0) {
          variacoesAtualizadas[indexExistente].quantidade += qtd;
          if (dados.acrescimo !== '') {
            variacoesAtualizadas[indexExistente].preco_adicional = parseFloat(dados.acrescimo) || 0;
          }
        } else {
          variacoesAtualizadas.push({
            id_local: Date.now().toString() + Math.random().toString(),
            cor: novaCor.trim(),
            tamanho: tamanho,
            quantidade: qtd,
            preco_adicional: parseFloat(dados.acrescimo) || 0
          });
        }
        adicionouAlgo = true;
      }
    });

    if (!adicionouAlgo) {
      alert("Preencha a quantidade de pelo menos um tamanho para adicionar/repor esta cor.");
      return;
    }

    setVariacoesInput(variacoesAtualizadas);
    setNovaCor('');
    setGrade({
      PP: { qtd: '', acrescimo: '' },
      P:  { qtd: '', acrescimo: '' },
      M:  { qtd: '', acrescimo: '' },
      G:  { qtd: '', acrescimo: '' },
      GG: { qtd: '', acrescimo: '' }
    });
  };

  const removerVariacao = (idLocalToRemove) => {
    setVariacoesInput(variacoesInput.filter(v => v.id_local !== idLocalToRemove));
  };

  // 🌟 FORMULÁRIO DE PRODUTO 🌟
  const iniciarEdicao = (produto) => {
    setEditandoId(produto.id);
    setNome(produto.nome);
    setPrecoVarejo(produto.preco_varejo || '');
    setPrecoAtacado(produto.preco_atacado || '');
    setCategoria(produto.categoria || '');
    setTag(produto.tag || '');
    
    try {
      const varsArray = typeof produto.variacoes === 'string' ? JSON.parse(produto.variacoes) : (produto.variacoes || []);
      const varsComId = varsArray.map(v => ({ ...v, id_local: Math.random().toString() }));
      setVariacoesInput(varsComId);
    } catch (e) {
      setVariacoesInput([]);
    }

    if (produto.foto_url) {
      try {
        const fotosParsed = JSON.parse(produto.foto_url);
        setFotosExistentes(Array.isArray(fotosParsed) ? fotosParsed : [produto.foto_url]);
      } catch (e) {
        setFotosExistentes([produto.foto_url]);
      }
    } else {
      setFotosExistentes([]);
    }
    
    setFotosArquivos([]);
    if(document.getElementById('input-foto')) document.getElementById('input-foto').value = '';
    
    setAbaAtual('cadastro');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNome('');
    setPrecoVarejo('');
    setPrecoAtacado('');
    setTag('Novidade');
    setVariacoesInput([]);
    setFotosExistentes([]);
    setFotosArquivos([]);
    if (categorias.length > 0) setCategoria(categorias[0].nome);
    if(document.getElementById('input-foto')) document.getElementById('input-foto').value = '';
    setAbaAtual('catalogo');
  };

  const removerFotoExistente = (index) => {
    const novasFotos = [...fotosExistentes];
    novasFotos.splice(index, 1);
    setFotosExistentes(novasFotos);
  };

  const tornarCapa = (index) => {
    if (index === 0) return; 
    const novasFotos = [...fotosExistentes];
    const [fotoMovida] = novasFotos.splice(index, 1);
    novasFotos.unshift(fotoMovida);
    setFotosExistentes(novasFotos);
  };

  const handleCadastrar = async (e) => {
    e.preventDefault();

    if (variacoesInput.length === 0) {
      alert("Adicione pelo menos uma variação (cor/tamanho) para este produto.");
      return;
    }

    setSalvando(true);
    let urlsImagensFinais = [];

    try {
      if (fotosArquivos && fotosArquivos.length > 0) {
        for (let i = 0; i < fotosArquivos.length; i++) {
          const file = fotosArquivos[i];
          const extensao = file.name.split('.').pop();
          const caminhoArquivo = `produtos/${Date.now()}_${i}.${extensao}`;
          const { error: uploadError } = await supabase.storage.from('produtos').upload(caminhoArquivo, file);
          if (uploadError) throw uploadError;
          const { data: linkData } = supabase.storage.from('produtos').getPublicUrl(caminhoArquivo);
          urlsImagensFinais.push(linkData.publicUrl);
        }
      }

      const todasAsFotos = [...fotosExistentes, ...urlsImagensFinais];
      let valorFinalFotoUrl = todasAsFotos.length === 1 ? todasAsFotos[0] : (todasAsFotos.length > 1 ? JSON.stringify(todasAsFotos) : null);

      const variacoesLimpasParaOBanco = variacoesInput.map(({ cor, tamanho, quantidade, preco_adicional }) => ({
        cor, tamanho, quantidade, preco_adicional
      }));

      const dadosProduto = {
        nome,
        preco_varejo: parseFloat(precoVarejo) || 0,
        preco_atacado: parseFloat(precoAtacado) || 0,
        categoria,
        tag,
        variacoes: variacoesLimpasParaOBanco,
        foto_url: valorFinalFotoUrl
      };

      if (editandoId) {
          const { error } = await supabase.from('produtos').update(dadosProduto).eq('id', editandoId);
          if (error) throw error;
          alert('Produto atualizado com sucesso!');
      } else {
          const { data, error } = await supabase.from('produtos').insert([dadosProduto]).select();
          if (error) throw error;
          if (data) alert('Produto registrado com sucesso!');
      }

      buscarEstoque();
      cancelarEdicao();

    } catch (error) {
      console.error('Erro ao salvar produto:', error.message);
      alert('Erro ao salvar o produto no banco de dados.');
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletar = async (id) => {
    if (confirm("Tem certeza que deseja remover este produto e TODAS as suas variações?")) {
      try {
        await supabase.from('produtos').delete().eq('id', id);
        setItens(itens.filter(item => item.id !== id));
      } catch (error) {
        alert('Não foi possível remover o produto do estoque.');
      }
    }
  };

  const calcularTotalEstoqueProduto = (variacoes) => {
    if (!variacoes) return 0;
    const arr = typeof variacoes === 'string' ? JSON.parse(variacoes) : variacoes;
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((acc, v) => acc + (v.quantidade || 0), 0);
  };

  const getPrimeiraFoto = (fotoString) => {
    if (!fotoString) return null;
    try {
      const parsed = JSON.parse(fotoString);
      if (Array.isArray(parsed)) return parsed[0];
    } catch(e) {}
    return fotoString; 
  };
  
  // Função para formatar o ID como um código numérico (ex: REF-00150)
  const formatarCodigoRef = (id) => {
    if (!id) return '';
    // Se o ID for numérico puro (ex: 12)
    if (Number.isInteger(Number(id))) {
      return `REF-${String(id).padStart(5, '0')}`;
    }
    // Se o ID for UUID (texto longo), pega só os números dele
    const numeros = String(id).replace(/\D/g, '');
    if (numeros.length >= 5) {
      return `REF-${numeros.substring(0, 5)}`;
    }
    // Fallback: pega os 5 primeiros caracteres e deixa maiúsculo
    return `REF-${String(id).substring(0, 5).toUpperCase()}`;
  };

  const totalPecas = itens.reduce((acc, curr) => acc + calcularTotalEstoqueProduto(curr.variacoes), 0);
  const custoPatrimonial = itens.reduce((acc, curr) => acc + ((curr.preco_varejo || 0) * calcularTotalEstoqueProduto(curr.variacoes)), 0);

  return (
    <div className="pb-16 animate-fade-in relative">
      
      {/* 🌟 MODAL GERENCIADOR DE CATEGORIAS DE PRODUTO 🌟 */}
      {modalCatAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="font-serif font-bold text-lg text-slate-800">Categorias de Produtos</h3>
              <button onClick={fecharModalCategoria} className="text-slate-400 hover:text-slate-700 transition-colors text-xl">✕</button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto bg-slate-50/50">
              <form onSubmit={handleSalvarCategoria} className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={catNomeInput} 
                  onChange={(e) => setCatNomeInput(e.target.value)} 
                  placeholder="Nome (Ex: Pijamas Curtos)"
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-lua-rose-dark shadow-sm"
                  required
                />
                <button type="submit" disabled={salvandoCat} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-lua-rose-dark transition-colors shadow-sm disabled:opacity-70">
                  {salvandoCat ? '...' : (catEditandoId ? 'Atualizar' : 'Adicionar')}
                </button>
                {catEditandoId && (
                   <button type="button" onClick={() => {setCatEditandoId(null); setCatNomeInput('');}} className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2">Cancelar</button>
                )}
              </form>

              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Categorias Atuais</h4>
                {categorias.map(cat => (
                  <div key={cat.id} className={`flex justify-between items-center bg-white p-3 rounded-xl border transition-colors shadow-xs ${catEditandoId === cat.id ? 'border-lua-rose-dark ring-1 ring-lua-rose-dark/20' : 'border-slate-100 hover:border-slate-200'}`}>
                    <span className="text-sm font-medium text-slate-700">{cat.nome}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => {setCatEditandoId(cat.id); setCatNomeInput(cat.nome);}} className="text-[10px] uppercase font-bold text-blue-500 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded transition-colors">Editar</button>
                      <button onClick={() => handleExcluirCategoria(cat.id)} className="text-[10px] uppercase font-bold text-rose-500 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded transition-colors">Excluir</button>
                    </div>
                  </div>
                ))}
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


      {/* ----------------- NAVEGAÇÃO DE ABAS ----------------- */}
      <div className="flex gap-6 border-b border-slate-200 mb-6 md:mb-8">
        <button
          onClick={() => { setAbaAtual('catalogo'); cancelarEdicao(); }}
          className={`pb-3 text-sm md:text-base font-bold transition-all duration-300 relative ${
            abaAtual === 'catalogo' ? 'text-lua-rose-dark' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          Catálogo e Estoque
          {abaAtual === 'catalogo' && (
             <span className="absolute bottom-0 left-0 w-full h-0.5 bg-lua-rose-dark rounded-t-full"></span>
          )}
        </button>
        <button
          onClick={() => setAbaAtual('cadastro')}
          className={`pb-3 text-sm md:text-base font-bold transition-all duration-300 relative ${
            abaAtual === 'cadastro' ? 'text-lua-rose-dark' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          {editandoId ? 'Editar Produto' : 'Cadastrar Novo Produto'}
          {abaAtual === 'cadastro' && (
             <span className="absolute bottom-0 left-0 w-full h-0.5 bg-lua-rose-dark rounded-t-full"></span>
          )}
        </button>
      </div>

      {/* ================================================================= */}
      {/* ABA: CATÁLOGO */}
      {/* ================================================================= */}
      {abaAtual === 'catalogo' && (
        <div className="space-y-6 md:space-y-8 animate-fade-in">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            <StatCard label="Total de Peças" value={carregando ? "..." : `${totalPecas} unidades`} statusText="Em todas as variações" statusType="neutral"/>
            <StatCard label="Valor de Venda" value={carregando ? "..." : `R$ ${custoPatrimonial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} statusText="Patrimônio ativo (Varejo)" statusType="gold"/>
            <StatCard label="Produtos Únicos" value={carregando ? "..." : `${itens.length} Modelos`} statusText="Agrupando variações" statusType="alert"/>
          </div>

          <div className="bg-white border border-lua-rose-dark/10 p-4 md:p-6 rounded-2xl shadow-xs">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-lg md:text-xl font-bold text-slate-800">Catálogo Cadastrado</h3>
              <Button variant="primary" onClick={() => setAbaAtual('cadastro')} className="text-xs py-2 px-4 shadow-sm">
                + Novo Produto
              </Button>
            </div>
            
            <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0 pb-2">
              <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
                <thead>
                  <tr className="bg-lua-cream border-b border-lua-rose-dark/10 text-slate-500 text-xs uppercase whitespace-nowrap">
                    <th className="p-3 rounded-tl-lg">Produto Base</th>
                    <th className="p-3">Preços (Varejo / Atacado)</th>
                    <th className="p-3">Variações e Estoque</th>
                    <th className="p-3 text-right rounded-tr-lg">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {carregando ? (
                    <tr><td colSpan="4" className="p-8 text-center text-sm text-slate-400">Buscando catálogo no banco de dados...</td></tr>
                  ) : itens.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-12 text-center">
                        <span className="text-4xl block mb-3">📦</span>
                        <p className="text-sm text-slate-500 font-medium mb-3">Nenhum produto cadastrado no momento.</p>
                        <Button variant="outline" onClick={() => setAbaAtual('cadastro')}>Cadastrar o primeiro</Button>
                      </td>
                    </tr>
                  ) : (
                    itens.map((item) => {
                      let variacoesDoItem = [];
                      try {
                         variacoesDoItem = typeof item.variacoes === 'string' ? JSON.parse(item.variacoes) : (item.variacoes || []);
                      } catch(e) {}

                      const fotoCapa = getPrimeiraFoto(item.foto_url);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors align-top group">
                          <td className="p-4 flex gap-3">
                            {fotoCapa ? (
                              <img src={fotoCapa} alt={item.nome} className="w-14 h-14 rounded-lg object-cover border border-slate-200 shadow-sm shrink-0" />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 text-2xl">📸</div>
                            )}
                            <div className="flex flex-col justify-center">
                              {/* 🌟 CÓDIGO DO PRODUTO AQUI 🌟 */}
                              <span className="text-[10px] font-mono font-bold text-slate-400 mb-0.5 tracking-widest uppercase">
                                {formatarCodigoRef(item.id)}
                              </span>
                              <span className="font-serif font-semibold text-slate-800 block text-sm leading-tight max-w-[200px] mb-1">{item.nome}</span>
                              <span className="text-[10px] text-slate-400 mb-1">{item.categoria || 'Sem categoria'}</span>
                              <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full w-fit">Estoque: <b className="text-slate-700">{calcularTotalEstoqueProduto(variacoesDoItem)}</b> un</span>
                            </div>
                          </td>
                          
                          <td className="p-4 text-xs whitespace-nowrap align-middle">
                             <div className="font-bold text-slate-800 text-sm">R$ {Number(item.preco_varejo).toFixed(2)}</div>
                             <div className="text-slate-400 font-medium mt-0.5">R$ {Number(item.preco_atacado).toFixed(2)}</div>
                          </td>
                          
                          <td className="p-4 align-middle">
                             <div className="flex flex-wrap gap-1.5 max-w-[350px]">
                               {variacoesDoItem.length === 0 ? <span className="text-[10px] text-rose-400 italic bg-rose-50 px-2 py-1 rounded">Sem variações</span> : null}
                               
                               {variacoesDoItem.map((v, i) => (
                                 <span key={i} className={`text-[10px] px-2 py-1.5 rounded-md border flex items-center gap-1.5 shadow-xs ${
                                   v.quantidade <= 2 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-700'
                                 }`}>
                                   <span className="font-medium">{v.cor}</span> 
                                   <span className="font-bold border-l border-slate-300/50 pl-1">{v.tamanho}</span>
                                   <span className={`ml-0.5 px-1.5 py-0.5 rounded ${v.quantidade <= 2 ? 'bg-rose-200 text-rose-900' : 'bg-slate-100'}`}>{v.quantidade}</span>
                                 </span>
                               ))}
                             </div>
                          </td>
                          
                          <td className="p-4 text-right whitespace-nowrap align-middle">
                             <div className="flex justify-end gap-2">
                                <button onClick={() => iniciarEdicao(item)} className="text-xs text-blue-600 hover:text-white font-medium bg-blue-50 hover:bg-blue-600 px-3 py-2 rounded-lg transition-all border border-blue-100 hover:border-blue-600 shadow-sm">
                                  Editar
                                </button>
                                <button onClick={() => handleDeletar(item.id)} className="text-xs text-rose-500 hover:text-white font-medium bg-rose-50 hover:bg-rose-500 px-3 py-2 rounded-lg transition-all border border-rose-100 hover:border-rose-500 shadow-sm">
                                  Excluir
                                </button>
                             </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ABA: CADASTRO / EDIÇÃO */}
      {/* ================================================================= */}
      {abaAtual === 'cadastro' && (
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="bg-white border border-lua-rose-dark/10 p-6 md:p-8 rounded-2xl shadow-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
               <h3 className="font-serif text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
                 {editandoId ? (
                   <>
                     Editando Produto 
                     {/* 🌟 CÓDIGO NO CABEÇALHO DA EDIÇÃO 🌟 */}
                     <span className="bg-slate-100 text-slate-500 font-mono text-sm px-3 py-1 rounded-lg border border-slate-200">
                       {formatarCodigoRef(editandoId)}
                     </span>
                   </>
                 ) : 'Registrar Novo Produto'}
               </h3>
               {editandoId && (
                   <button onClick={cancelarEdicao} className="text-xs text-rose-500 hover:text-rose-700 font-bold uppercase tracking-wider bg-rose-50 px-3 py-1.5 rounded-lg">
                       Cancelar Edição
                   </button>
               )}
            </div>
            
            <form onSubmit={handleCadastrar} className="space-y-6">
              
              <div className="p-5 bg-slate-50/50 border border-slate-200 rounded-xl space-y-5">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span>1.</span> Informações Básicas
                </h4>
                
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Nome do Modelo</label>
                  <input type="text" placeholder="ex: Pijama Americano Satin" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark focus:ring-1 focus:ring-lua-rose-dark transition-all shadow-sm" required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Preço Varejo Base (R$)</label>
                    <input type="number" step="0.01" placeholder="0.00" value={precoVarejo} onChange={(e) => setPrecoVarejo(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark focus:ring-1 focus:ring-lua-rose-dark shadow-sm" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Preço Atacado (R$)</label>
                    <input type="number" step="0.01" placeholder="0.00" value={precoAtacado} onChange={(e) => setPrecoAtacado(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark focus:ring-1 focus:ring-lua-rose-dark shadow-sm" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-end mb-1.5">
                       <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Categoria</label>
                       <button type="button" onClick={() => setModalCatAberto(true)} className="text-[9px] font-bold text-lua-rose-dark hover:underline tracking-wider uppercase">⚙️ Gerenciar</button>
                    </div>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark focus:ring-1 focus:ring-lua-rose-dark shadow-sm"
                      required
                    >
                      {categorias.length === 0 && <option value="">Carregando...</option>}
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Tag Vitrine (Opcional)</label>
                    <input type="text" placeholder="ex: Mais Vendido" value={tag} onChange={(e) => setTag(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark focus:ring-1 focus:ring-lua-rose-dark shadow-sm" />
                  </div>
                </div>

                {fotosExistentes.length > 0 && (
                  <div className="pt-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Imagens Salvas (A primeira é a capa)</label>
                    <div className="flex flex-wrap gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-inner">
                      {fotosExistentes.map((url, idx) => (
                        <div key={idx} className={`relative w-24 h-24 rounded-lg overflow-hidden group transition-all ${idx === 0 ? 'ring-2 ring-lua-rose-dark shadow-md' : 'border border-slate-200'}`}>
                          <img src={url} alt={`Foto ${idx+1}`} className="w-full h-full object-cover" />
                          {idx === 0 && <div className="absolute top-0 left-0 bg-lua-rose-dark text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-br-lg shadow-sm z-10">Capa</div>}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 z-20">
                             {idx !== 0 && (
                               <button type="button" onClick={() => tornarCapa(idx)} className="text-[9px] uppercase tracking-wider bg-white text-slate-800 px-2 py-1 rounded font-bold hover:bg-lua-rose-light w-16">Capa</button>
                             )}
                             <button type="button" onClick={() => removerFotoExistente(idx)} className="text-[9px] uppercase tracking-wider bg-rose-500 text-white px-2 py-1 rounded font-bold hover:bg-rose-600 w-16">Excluir</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    {fotosExistentes.length > 0 ? 'Adicionar Novas Fotos' : 'Fotos do Produto'}
                  </label>
                  <input id="input-foto" type="file" accept="image/*" multiple onChange={(e) => setFotosArquivos(Array.from(e.target.files))} className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-all cursor-pointer" />
                  {fotosArquivos.length > 0 && <p className="text-[10px] text-green-600 mt-2 font-semibold">+{fotosArquivos.length} foto(s) pronta(s) para upload.</p>}
                </div>
              </div>

              <div className="p-5 border border-lua-rose-dark/30 bg-lua-rose-light/10 rounded-xl space-y-5">
                <div className="border-b border-lua-rose-dark/20 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
                   <h4 className="text-sm font-bold text-lua-rose-dark flex items-center gap-2">
                     <span>2.</span> Grade de Variações e Estoque
                   </h4>
                   <p className="text-[10px] text-slate-500 font-medium">
                     * Para repor estoque, digite a <b>mesma cor</b> e a nova quantidade. Elas serão somadas.
                   </p>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Cor da Peça</label>
                    <input type="text" placeholder="ex: Rosé, Azul Marinho..." value={novaCor} onChange={(e) => setNovaCor(e.target.value)} className="w-full md:w-1/2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-lua-rose-dark focus:ring-1 focus:ring-lua-rose-dark" />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-2">Quantidades por Tamanho</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {['PP', 'P', 'M', 'G', 'GG'].map(tam => (
                         <div key={tam} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col items-center shadow-xs">
                            <span className="font-bold text-slate-800 text-sm mb-2">{tam}</span>
                            <div className="w-full space-y-2">
                               <div>
                                 <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-0.5">Reposição (Qtd)</span>
                                 <input type="number" placeholder="0" value={grade[tam].qtd} onChange={(e) => handleGradeChange(tam, 'qtd', e.target.value)} className="w-full bg-white border border-slate-200 rounded-md text-center text-sm py-1.5 focus:border-lua-rose-dark focus:outline-none" />
                               </div>
                               <div>
                                 <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-0.5">Acréscimo R$</span>
                                 <input type="number" step="0.01" placeholder="+ 0.00" value={grade[tam].acrescimo} onChange={(e) => handleGradeChange(tam, 'acrescimo', e.target.value)} className="w-full bg-white border border-slate-200 rounded-md text-center text-xs py-1.5 text-green-700 focus:border-green-500 focus:outline-none placeholder:text-slate-300" />
                               </div>
                            </div>
                         </div>
                      ))}
                    </div>
                  </div>

                  <button type="button" onClick={adicionarGradeDaCor} className="w-full bg-slate-800 text-white py-3 rounded-xl text-xs uppercase tracking-widest font-bold hover:bg-slate-900 transition-all shadow-md">
                    Adicionar Grade / Somar Estoque ↓
                  </button>
                </div>

                {variacoesInput.length > 0 && (
                  <div className="mt-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-100 pb-2">Estoque Final (Pronto para Salvar):</h5>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                      {variacoesInput.map((v) => (
                        <div key={v.id_local} className="flex justify-between items-center bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-100 text-sm">
                          <span className="font-medium text-slate-700 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                            <span>Cor: <b>{v.cor}</b> <span className="text-slate-300 mx-2 hidden sm:inline">|</span> Tamanho: <b>{v.tamanho}</b></span>
                            {v.preco_adicional > 0 && <span className="text-[10px] text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded uppercase tracking-wider">(+{v.preco_adicional} R$)</span>}
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="bg-white border border-slate-200 px-3 py-1 rounded text-xs font-bold text-slate-700 shadow-sm">{v.quantidade} unds.</span>
                            <button type="button" onClick={() => removerVariacao(v.id_local)} className="text-rose-400 hover:text-white bg-rose-50 hover:bg-rose-500 w-7 h-7 rounded-md flex items-center justify-center transition-all border border-rose-100 hover:border-rose-500 shadow-sm">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                {editandoId && (
                  <button type="button" onClick={cancelarEdicao} className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-colors">
                    Cancelar
                  </button>
                )}
                <button type="submit" disabled={salvando} className={`${editandoId ? 'w-2/3' : 'w-full'} bg-lua-rose-dark text-white py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-lua-rose transition-all shadow-md disabled:opacity-70`}>
                  {salvando ? '⏳ Salvando Alterações...' : (editandoId ? 'Concluir Edição' : 'Cadastrar Produto Definitivo')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}