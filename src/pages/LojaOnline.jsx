import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

// -------------------------------------------------------------------------
// COMPONENTE INTERNO: CARTÃO DE PRODUTO PREMIUM
// -------------------------------------------------------------------------
function ProdutoVitrine({ produto, onAdicionarProduto }) {
  const variacoes = typeof produto.variacoes === 'string' 
    ? JSON.parse(produto.variacoes) 
    : (produto.variacoes || []);

  const coresDisponiveis = [...new Set(variacoes.map(v => v.cor))];
  
  const [corSelecionada, setCorSelecionada] = useState('');
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState('');
  const [precoAtual, setPrecoAtual] = useState(produto.preco_varejo || 0);
  
  const [fotoIndex, setFotoIndex] = useState(0);

  const tamanhosDaCor = corSelecionada 
    ? variacoes.filter(v => v.cor === corSelecionada) 
    : [];

  const totalEstoque = variacoes.reduce((acc, v) => acc + (v.quantidade || 0), 0);
  const estaEsgotado = totalEstoque <= 0;

  useEffect(() => {
    if (coresDisponiveis.length === 1 && !corSelecionada) {
      setCorSelecionada(coresDisponiveis[0]);
    }
  }, [coresDisponiveis, corSelecionada]);

  useEffect(() => {
    if (corSelecionada && tamanhoSelecionado) {
      const varExata = variacoes.find(v => v.cor === corSelecionada && v.tamanho === tamanhoSelecionado);
      if (varExata && varExata.preco_adicional) {
        setPrecoAtual(Number(produto.preco_varejo) + Number(varExata.preco_adicional));
      } else {
        setPrecoAtual(produto.preco_varejo);
      }
    } else {
      setPrecoAtual(produto.preco_varejo);
    }
  }, [corSelecionada, tamanhoSelecionado, produto.preco_varejo, variacoes]);

  const handleSelecionarCor = (cor) => {
    setCorSelecionada(cor);
    setTamanhoSelecionado(''); 
  };

  const handleComprar = () => {
    if (!corSelecionada || !tamanhoSelecionado) return;

    const variacaoExata = variacoes.find(v => v.cor === corSelecionada && v.tamanho === tamanhoSelecionado);

    if (!variacaoExata || variacaoExata.quantidade <= 0) {
      alert('Esta combinação de cor e tamanho está esgotada!');
      return;
    }

    const produtoParaSacola = {
      ...produto,
      id_base: produto.id, 
      id: `${produto.id}_${corSelecionada}_${tamanhoSelecionado}`, 
      nome: `${produto.nome} | ${corSelecionada} - ${tamanhoSelecionado}`,
      preco_varejo: precoAtual, 
      quantidade_estoque: variacaoExata.quantidade 
    };

    onAdicionarProduto(produtoParaSacola);
  };

  const formatarMoeda = (valor) => {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getTodasFotos = () => {
    if (!produto.foto_url) return [];
    if (Array.isArray(produto.foto_url)) return produto.foto_url;
    try {
      const parsed = JSON.parse(produto.foto_url);
      if (Array.isArray(parsed)) return parsed;
    } catch(e) {}
    return [produto.foto_url]; 
  };

  const galeriaFotos = getTodasFotos();
  const temMaisDeUmaFoto = galeriaFotos.length > 1;

  const proximaFoto = (e) => {
    e.stopPropagation(); 
    setFotoIndex((prev) => (prev === galeriaFotos.length - 1 ? 0 : prev + 1));
  };

  const fotoAnterior = (e) => {
    e.stopPropagation();
    setFotoIndex((prev) => (prev === 0 ? galeriaFotos.length - 1 : prev - 1));
  };

  return (
    <div className="flex flex-col relative group bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-500 overflow-hidden border border-slate-100">
      
      <div className="relative aspect-[3/4] bg-white overflow-hidden group/galeria border-b border-slate-50">
        {galeriaFotos.length > 0 ? (
          <>
            {galeriaFotos.map((foto, idx) => (
              <img 
                key={idx}
                src={foto} 
                alt={`${produto.nome} - ângulo ${idx + 1}`} 
                className={`absolute inset-0 w-full h-full object-contain object-center p-4 transition-all duration-700 ease-in-out group-hover:scale-105 
                  ${fotoIndex === idx ? 'opacity-100 z-10' : 'opacity-0 z-0 scale-100'} 
                  ${estaEsgotado ? 'grayscale opacity-60' : ''}
                `}
              />
            ))}

            {temMaisDeUmaFoto && (
              <>
                <button 
                  onClick={fotoAnterior}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-slate-900/10 backdrop-blur-md text-slate-800 shadow-sm opacity-0 group-hover/galeria:opacity-100 transition-opacity hover:bg-slate-900/20 z-20"
                >
                  ❮
                </button>
                <button 
                  onClick={proximaFoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-slate-900/10 backdrop-blur-md text-slate-800 shadow-sm opacity-0 group-hover/galeria:opacity-100 transition-opacity hover:bg-slate-900/20 z-20"
                >
                  ❯
                </button>
                
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20">
                  {galeriaFotos.map((_, idx) => (
                    <span 
                      key={idx} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${fotoIndex === idx ? 'w-4 bg-slate-800 shadow-sm' : 'w-1.5 bg-slate-300'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-lua-cream/30 z-10 relative">
            <span className="text-4xl mb-2">✨</span>
            <span className="text-xs uppercase tracking-widest font-semibold">Sem Imagem</span>
          </div>
        )}

        <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
          {estaEsgotado ? (
            <span className="bg-slate-900/90 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
              Esgotado
            </span>
          ) : (
            produto.tag && (
              <span className="bg-white/90 backdrop-blur-md text-slate-900 text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm border border-slate-200">
                {produto.tag}
              </span>
            )
          )}
        </div>
      </div>

      <div className="p-5 md:p-6 flex flex-col flex-grow bg-white z-30 relative">
        <div className="mb-4">
          <h3 className="font-serif font-medium text-slate-900 text-lg md:text-xl leading-snug mb-1.5 line-clamp-2">{produto.nome}</h3>
          {produto.categoria && (
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-2">{produto.categoria}</span>
          )}
          <span className="text-slate-600 font-light text-lg transition-all duration-300">{formatarMoeda(precoAtual)}</span>
        </div>

        {!estaEsgotado ? (
          <div className="space-y-5 mb-6 flex-grow">
            
            {coresDisponiveis.length > 0 && (
              <div>
                <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400 block mb-2.5">Cor</span>
                <div className="flex flex-wrap gap-2">
                  {coresDisponiveis.map(cor => (
                    <button
                      key={cor}
                      onClick={() => handleSelecionarCor(cor)}
                      className={`text-[11px] font-medium px-4 py-1.5 rounded-full transition-all duration-300 ${
                        corSelecionada === cor 
                          ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-900 ring-offset-2' 
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {cor}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={`transition-all duration-500 ${corSelecionada ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
              <div className="flex items-end gap-2 mb-2.5">
                 <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Tamanho</span>
                 {tamanhosDaCor.some(v => v.preco_adicional > 0) && (
                    <span className="text-[9px] text-lua-rose-dark italic ml-auto">*Valores podem variar</span>
                 )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {tamanhosDaCor.map((varItem, i) => {
                  const semEstoque = varItem.quantidade <= 0;
                  const selecionado = tamanhoSelecionado === varItem.tamanho;
                  
                  return (
                    <button
                      key={i}
                      disabled={semEstoque}
                      onClick={() => setTamanhoSelecionado(varItem.tamanho)}
                      title={varItem.preco_adicional > 0 ? `+ R$ ${varItem.preco_adicional.toFixed(2)}` : ''}
                      className={`text-xs font-medium w-10 h-10 rounded-full border transition-all duration-300 flex items-center justify-center relative
                        ${semEstoque ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through' : 
                          selecionado ? 'bg-lua-rose-dark text-white border-lua-rose-dark shadow-md scale-105' : 
                          'bg-white text-slate-600 border-slate-200 hover:border-slate-800 hover:text-slate-900'}
                      `}
                    >
                      {varItem.tamanho}
                      {!semEstoque && varItem.preco_adicional > 0 && !selecionado && (
                         <span className="absolute top-0 right-0 w-2 h-2 bg-lua-gold rounded-full border border-white"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center pb-6 text-sm text-slate-400 font-light italic">
            Novas peças em produção.
          </div>
        )}

        <button 
          disabled={estaEsgotado || !corSelecionada || !tamanhoSelecionado}
          onClick={handleComprar}
          className="w-full mt-auto py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
            bg-slate-900 hover:bg-lua-rose-dark text-white shadow-md hover:shadow-lg disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none border border-transparent disabled:border-slate-200"
        >
          {estaEsgotado ? 'Esgotado' : (!corSelecionada || !tamanhoSelecionado) ? 'Selecione as opções' : 'Adicionar à Sacola'}
        </button>
      </div>
    </div>
  );
}


// -------------------------------------------------------------------------
// COMPONENTE PRINCIPAL: LOJA ONLINE (VITRINE)
// -------------------------------------------------------------------------
export default function LojaOnline({ onAdicionarProduto }) {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  // 🌟 ESTADOS DOS FILTROS INTELIGENTES 🌟
  const [categoriasAtivas, setCategoriasAtivas] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('Todas');
  
  const [termoBusca, setTermoBusca] = useState('');
  const [corFiltro, setCorFiltro] = useState('');
  const [tamanhoFiltro, setTamanhoFiltro] = useState('');
  
  // Extrai todas as cores e tamanhos reais que existem no estoque
  const [opcoesCores, setOpcoesCores] = useState([]);
  const [opcoesTamanhos, setOpcoesTamanhos] = useState([]);

  async function fetchProdutos() {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('produtos') 
        .select('id, nome, preco_varejo, foto_url, tag, variacoes, categoria')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      
      const prods = data || [];
      setProdutos(prods);

      // Mapeia categorias existentes
      const catExistentes = [...new Set(prods.map(p => p.categoria).filter(Boolean))];
      setCategoriasAtivas(catExistentes.sort());

      // Mapeia Cores e Tamanhos que POSSUEM ESTOQUE para montar os filtros
      const coresSet = new Set();
      const tamanhosSet = new Set();
      
      prods.forEach(p => {
        let vars = [];
        try { vars = typeof p.variacoes === 'string' ? JSON.parse(p.variacoes) : (p.variacoes || []); } catch(e){}
        
        vars.forEach(v => {
          if (v.quantidade > 0) {
            if (v.cor) coresSet.add(v.cor);
            if (v.tamanho) tamanhosSet.add(v.tamanho);
          }
        });
      });

      setOpcoesCores([...coresSet].sort());
      setOpcoesTamanhos(['PP', 'P', 'M', 'G', 'GG'].filter(t => tamanhosSet.has(t))); // Mantém a ordem lógica dos tamanhos

    } catch (error) {
      console.error('Erro ao carregar vitrine:', error.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    fetchProdutos();
  }, []);

  const limparFiltrosBusca = () => {
    setTermoBusca('');
    setCorFiltro('');
    setTamanhoFiltro('');
  };

  // 🌟 LÓGICA DO FILTRO INTELIGENTE CRUZADO 🌟
  const produtosFiltrados = produtos.filter(p => {
    // 1. Filtro de Categoria
    if (categoriaSelecionada !== 'Todas' && p.categoria !== categoriaSelecionada) return false;

    // 2. Filtro de Texto (Nome ou Tag)
    if (termoBusca) {
      const termo = termoBusca.toLowerCase().trim();
      const nomeMatch = p.nome.toLowerCase().includes(termo);
      const tagMatch = p.tag && p.tag.toLowerCase().includes(termo);
      if (!nomeMatch && !tagMatch) return false;
    }

    // Processa variações do produto para os próximos filtros
    let vars = [];
    try { vars = typeof p.variacoes === 'string' ? JSON.parse(p.variacoes) : (p.variacoes || []); } catch(e){}

    // 3. Filtro de Cor e Tamanho exato
    if (corFiltro || tamanhoFiltro) {
      let temEstoqueRequerido = false;

      // Se filtrou os DOIS (Cor e Tamanho), precisa ter a combinação exata em estoque
      if (corFiltro && tamanhoFiltro) {
        temEstoqueRequerido = vars.some(v => v.cor === corFiltro && v.tamanho === tamanhoFiltro && v.quantidade > 0);
      } 
      // Se filtrou SÓ COR
      else if (corFiltro && !tamanhoFiltro) {
        temEstoqueRequerido = vars.some(v => v.cor === corFiltro && v.quantidade > 0);
      } 
      // Se filtrou SÓ TAMANHO
      else if (!corFiltro && tamanhoFiltro) {
        temEstoqueRequerido = vars.some(v => v.tamanho === tamanhoFiltro && v.quantidade > 0);
      }

      if (!temEstoqueRequerido) return false;
    }

    return true;
  });

  return (
    <div className="text-left animate-fade-in pb-16">
      
      {/* 🌟 BANNER 🌟 */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-center py-16 md:py-24 px-6 mb-8 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-lua-rose-dark rounded-full mix-blend-screen filter blur-[100px] opacity-60"></div>
          <div className="absolute top-20 -right-20 w-80 h-80 bg-lua-gold rounded-full mix-blend-screen filter blur-[100px] opacity-40"></div>
        </div>
        
        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[60px]">
          <h2 className="font-serif text-4xl md:text-6xl lg:text-7xl text-white font-medium tracking-tight">
            Lua <i className="text-lua-rose-light font-light italic">de Pijama</i>
          </h2>
        </div>
      </div>

      {/* 🌟 FILTROS DE CATEGORIA (BOTÕES) 🌟 */}
      {!carregando && categoriasAtivas.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-6 px-2">
           <button
             onClick={() => setCategoriaSelecionada('Todas')}
             className={`px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-300 shadow-sm ${
               categoriaSelecionada === 'Todas' 
               ? 'bg-slate-900 text-white' 
               : 'bg-white text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-400'
             }`}
           >
             Tudo
           </button>
           
           {categoriasAtivas.map(cat => (
             <button
               key={cat}
               onClick={() => setCategoriaSelecionada(cat)}
               className={`px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-300 shadow-sm ${
                 categoriaSelecionada === cat 
                 ? 'bg-lua-rose-dark text-white' 
                 : 'bg-white text-slate-500 hover:text-lua-rose-dark border border-slate-200 hover:border-lua-rose-light'
               }`}
             >
               {cat}
             </button>
           ))}
        </div>
      )}

      {/* 🌟 BARRA DE BUSCA INTELIGENTE E FILTROS COMPLEMENTARES 🌟 */}
      {!carregando && produtos.length > 0 && (
        <div className="max-w-4xl mx-auto mb-10 md:mb-14 px-4 relative z-20">
          <div className="bg-white p-2.5 md:p-3 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row gap-3">
            
            {/* Campo de Texto */}
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input 
                type="text" 
                placeholder="Buscar modelo, tecido..." 
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lua-rose-dark/20 focus:bg-white transition-all text-slate-700"
              />
            </div>

            {/* Seletor de Cor */}
            <select 
              value={corFiltro} 
              onChange={(e) => setCorFiltro(e.target.value)}
              className="md:w-40 bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-lua-rose-dark/20 cursor-pointer"
            >
              <option value="">Qualquer Cor</option>
              {opcoesCores.map(cor => <option key={cor} value={cor}>{cor}</option>)}
            </select>

            {/* Seletor de Tamanho */}
            <select 
              value={tamanhoFiltro} 
              onChange={(e) => setTamanhoFiltro(e.target.value)}
              className="md:w-40 bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-lua-rose-dark/20 cursor-pointer"
            >
              <option value="">Qualquer Tam.</option>
              {opcoesTamanhos.map(tam => <option key={tam} value={tam}>Tamanho {tam}</option>)}
            </select>

            {/* Botão Limpar Filtros (aparece só se tiver algo filtrado) */}
            {(termoBusca || corFiltro || tamanhoFiltro) && (
              <button 
                onClick={limparFiltrosBusca}
                className="bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
              >
                Limpar
              </button>
            )}
          </div>
          
          {/* Contador discreto de resultados */}
          <div className="text-right mt-2 text-[10px] uppercase tracking-widest text-slate-400 font-bold px-2">
             Exibindo {produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'modelo' : 'modelos'} disponíveis
          </div>
        </div>
      )}

      {/* GRID DE PRODUTOS */}
      {carregando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-10">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white rounded-3xl p-4 space-y-4 animate-pulse shadow-sm border border-slate-100">
              <div className="bg-slate-100 aspect-[3/4] w-full rounded-2xl" />
              <div className="pt-4 space-y-3 px-2">
                <div className="h-6 bg-slate-100 rounded-md w-3/4" />
                <div className="h-5 bg-slate-100 rounded-md w-1/3" />
                <div className="h-14 bg-slate-100 rounded-xl w-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : produtosFiltrados.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm mx-4 md:mx-0">
          <span className="text-5xl block mb-6">✨</span>
          <h3 className="text-2xl font-serif font-medium text-slate-900 mb-3">Nenhuma peça encontrada</h3>
          <p className="text-slate-500 font-light max-w-sm mx-auto">
            Não temos pijamas com esta exata combinação disponíveis no estoque neste momento.
          </p>
          {(categoriaSelecionada !== 'Todas' || termoBusca || corFiltro || tamanhoFiltro) && (
             <button 
               onClick={() => { setCategoriaSelecionada('Todas'); limparFiltrosBusca(); }} 
               className="mt-6 text-white bg-slate-900 px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest shadow-md hover:bg-lua-rose-dark transition-colors"
             >
               Ver toda a coleção
             </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-10">
          {produtosFiltrados.map((prod) => (
            <ProdutoVitrine 
              key={prod.id} 
              produto={prod} 
              onAdicionarProduto={onAdicionarProduto}
            />
          ))}
        </div>
      )}
    </div>
  );
}