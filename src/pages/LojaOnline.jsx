import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

// -------------------------------------------------------------------------
// COMPONENTE INTERNO: CARTÃO DE PRODUTO PREMIUM
// -------------------------------------------------------------------------
function ProdutoVitrine({ produto, userRole, onAdicionarProduto, enviandoId, onUploadFoto }) {
  const variacoes = typeof produto.variacoes === 'string' 
    ? JSON.parse(produto.variacoes) 
    : (produto.variacoes || []);

  const coresDisponiveis = [...new Set(variacoes.map(v => v.cor))];
  
  const [corSelecionada, setCorSelecionada] = useState('');
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState('');

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
      quantidade_estoque: variacaoExata.quantidade 
    };

    onAdicionarProduto(produtoParaSacola);
  };

  const formatarMoeda = (valor) => {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="flex flex-col relative group bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-500 overflow-hidden border border-slate-100">
      
      {/* IMAGEM ESTILO FASHION (ALONGADA) */}
      <div className="relative aspect-[3/4] bg-slate-50 overflow-hidden">
        {produto.foto_url ? (
          <img 
            src={`${produto.foto_url}?t=${Date.now()}`} 
            alt={produto.nome} 
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${estaEsgotado ? 'grayscale opacity-60' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-lua-cream/30">
            <span className="text-4xl mb-2">✨</span>
            <span className="text-xs uppercase tracking-widest font-semibold">Sem Imagem</span>
          </div>
        )}

        {/* Tags Flutuantes Premium */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {estaEsgotado ? (
            <span className="bg-slate-900/90 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
              Esgotado
            </span>
          ) : (
            produto.tag && (
              <span className="bg-white/90 backdrop-blur-md text-slate-900 text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm">
                {produto.tag}
              </span>
            )
          )}
        </div>
      </div>

      {/* DETALHES DO PRODUTO */}
      <div className="p-6 flex flex-col flex-grow bg-white z-10">
        <div className="mb-4">
          <h3 className="font-serif font-medium text-slate-900 text-xl leading-tight mb-2 line-clamp-2">{produto.nome}</h3>
          <span className="text-slate-600 font-light text-lg">{formatarMoeda(produto.preco_varejo)}</span>
        </div>

        <div className="w-8 h-[1px] bg-slate-200 mb-5"></div>

        {!estaEsgotado ? (
          <div className="space-y-5 mb-6 flex-grow">
            
            {/* Seletor de Cor Minimalista */}
            {coresDisponiveis.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 block mb-2.5">Cor</span>
                <div className="flex flex-wrap gap-2">
                  {coresDisponiveis.map(cor => (
                    <button
                      key={cor}
                      onClick={() => handleSelecionarCor(cor)}
                      className={`text-[11px] font-medium px-4 py-1.5 rounded-full transition-all duration-300 ${
                        corSelecionada === cor 
                          ? 'bg-slate-900 text-white shadow-md' 
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {cor}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Seletor de Tamanho (Alta Costura) */}
            <div className={`transition-all duration-500 ${corSelecionada ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
              <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 block mb-2.5">Tamanho</span>
              <div className="flex flex-wrap gap-2">
                {tamanhosDaCor.map((varItem, i) => {
                  const semEstoque = varItem.quantidade <= 0;
                  const selecionado = tamanhoSelecionado === varItem.tamanho;
                  
                  return (
                    <button
                      key={i}
                      disabled={semEstoque}
                      onClick={() => setTamanhoSelecionado(varItem.tamanho)}
                      className={`text-xs font-medium w-10 h-10 rounded-full border transition-all duration-300 flex items-center justify-center
                        ${semEstoque ? 'bg-slate-50/50 text-slate-300 border-slate-100 cursor-not-allowed line-through' : 
                          selecionado ? 'bg-lua-rose-dark text-white border-lua-rose-dark shadow-md scale-105' : 
                          'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900'}
                      `}
                    >
                      {varItem.tamanho}
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

        {/* BOTÃO DE COMPRAR PREMIUM */}
        <button 
          disabled={estaEsgotado || !corSelecionada || !tamanhoSelecionado}
          onClick={handleComprar}
          className="w-full mt-auto py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
            bg-slate-900 hover:bg-lua-rose-dark text-white shadow-md hover:shadow-lg disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none border border-transparent disabled:border-slate-200"
        >
          {estaEsgotado ? 'Esgotado' : (!corSelecionada || !tamanhoSelecionado) ? 'Selecione as opções' : 'Adicionar à Sacola'}
        </button>

        {/* CONTROLE GERENCIAL DE UPLOAD */}
        {(userRole === 'admin' || userRole === 'vendedor') && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <label className="block w-full text-center bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 text-[10px] font-bold uppercase tracking-widest py-2.5 rounded-xl cursor-pointer transition-colors">
              {enviandoId === produto.id ? '⏳ Processando...' : '📷 Alterar Imagem'}
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => onUploadFoto(e, produto.id)}
                className="hidden" 
                disabled={enviandoId !== null}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}


// -------------------------------------------------------------------------
// COMPONENTE PRINCIPAL: LOJA ONLINE (VITRINE)
// -------------------------------------------------------------------------
export default function LojaOnline({ userRole, onAdicionarProduto }) {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviandoId, setEnviandoId] = useState(null);

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

  const handleUploadFoto = async (e, produtoId) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setEnviandoId(produtoId);
      const extensao = file.name.split('.').pop();
      const nomeArquivo = `${produtoId}-${Date.now()}.${extensao}`;

      const { error: uploadError } = await supabase.storage
        .from('produtos')
        .upload(nomeArquivo, file, { cacheControl: '0', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('produtos')
        .getPublicUrl(nomeArquivo);

      const { error: updateError } = await supabase
        .from('produtos')
        .update({ foto_url: publicUrl })
        .eq('id', produtoId);

      if (updateError) throw updateError;

      setProdutos((prevProdutos) =>
        prevProdutos.map((p) => p.id === produtoId ? { ...p, foto_url: publicUrl } : p)
      );

      alert('Foto da vitrine atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao processar upload:', error.message);
      alert(`Falha no upload: ${error.message}`);
    } finally {
      setEnviandoId(null);
    }
  };

  return (
    <div className="text-left animate-fade-in pb-16">
      
      {/* 🌟 HEADER PREMIUM / BANNER MINIMALISTA 🌟 */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-center py-16 md:py-24 px-6 mb-12 md:mb-20 shadow-2xl">
        
        {/* Efeitos de Luz no Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-lua-rose-dark rounded-full mix-blend-screen filter blur-[100px] opacity-60"></div>
          <div className="absolute top-20 -right-20 w-80 h-80 bg-lua-gold rounded-full mix-blend-screen filter blur-[100px] opacity-40"></div>
        </div>
        
        {/* Conteúdo do Banner (Nome da Marca Apenas) */}
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
              userRole={userRole} 
              onAdicionarProduto={onAdicionarProduto}
              enviandoId={enviandoId}
              onUploadFoto={handleUploadFoto}
            />
          ))}
        </div>
      )}
    </div>
  );
}