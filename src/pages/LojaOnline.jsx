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
  
  // ESTADO DA GALERIA
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
  }, [coresDisponiveis]);

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
      
      {/* 🌟 IMAGEM E GALERIA (AJUSTADA PARA OBJECT-CONTAIN) 🌟 */}
      {/* Mudei o fundo para bg-white para misturar melhor com fotos que já tem fundo branco */}
      <div className="relative aspect-[3/4] bg-white overflow-hidden group/galeria border-b border-slate-50">
        {galeriaFotos.length > 0 ? (
          <>
            {galeriaFotos.map((foto, idx) => (
              <img 
                key={idx}
                src={foto} 
                alt={`${produto.nome} - ângulo ${idx + 1}`} 
                // ✨ A MÁGICA ESTÁ AQUI: object-contain garante que a foto toda caiba. O p-4 dá um respiro nas bordas.
                className={`absolute inset-0 w-full h-full object-contain object-center p-4 transition-all duration-700 ease-in-out group-hover:scale-105 
                  ${fotoIndex === idx ? 'opacity-100 z-10' : 'opacity-0 z-0 scale-100'} 
                  ${estaEsgotado ? 'grayscale opacity-60' : ''}
                `}
              />
            ))}

            {/* Setas de Navegação */}
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
                
                {/* Indicadores de bolinha na parte inferior */}
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

        {/* Tags Flutuantes Premium */}
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

      {/* DETALHES DO PRODUTO */}
      <div className="p-5 md:p-6 flex flex-col flex-grow bg-white z-30 relative">
        <div className="mb-4">
          <h3 className="font-serif font-medium text-slate-900 text-lg md:text-xl leading-snug mb-1.5 line-clamp-2">{produto.nome}</h3>
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

  async function fetchProdutos() {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('produtos') 
        .select('id, nome, preco_varejo, foto_url, tag, variacoes')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao carregar vitrine:', error.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    fetchProdutos();
  }, []);

  return (
    <div className="text-left animate-fade-in pb-16">
      
      {/* 🌟 HEADER PREMIUM / BANNER MINIMALISTA 🌟 */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-center py-16 md:py-24 px-6 mb-12 md:mb-20 shadow-2xl">
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
      ) : produtos.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm mx-4 md:mx-0">
          <span className="text-5xl block mb-6">✨</span>
          <h3 className="text-2xl font-serif font-medium text-slate-900 mb-3">Vitrine em preparação</h3>
          <p className="text-slate-500 font-light">Nossos estilistas estão organizando as novas peças. Volte em breve!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-10">
          {produtos.map((prod) => (
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