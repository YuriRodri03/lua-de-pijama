import React, { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard';
import { supabase } from '../services/supabase';

// ADICIONADO: 'onAdicionarProduto' recebido via props do RootRouter
export default function LojaOnline({ userRole, onAdicionarProduto }) {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviandoId, setEnviandoId] = useState(null);

  // 1. BUSCAR PRODUTOS DIRETAMENTE DO ESTOQUE NO SUPABASE
  async function fetchProdutos() {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('produtos') 
        .select('id, nome, preco_varejo, foto_url, tag, quantidade_estoque')
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

  // 2. REALIZAR UPLOAD DA FOTO PRO STORAGE E ATUALIZAR O BANCO
  const handleUploadFoto = async (e, produtoId) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setEnviandoId(produtoId);

      const extensao = file.name.split('.').pop();
      const nomeArquivo = `${produtoId}-${Date.now()}.${extensao}`;

      // ATUALIZADO: Nome do bucket alterado para 'produtos'
      const { error: uploadError } = await supabase.storage
        .from('produtos')
        .upload(nomeArquivo, file, { cacheControl: '0', upsert: true });

      if (uploadError) throw uploadError;

      // ATUALIZADO: Nome do bucket alterado para 'produtos'
      const { data: { publicUrl } } = supabase.storage
        .from('produtos')
        .getPublicUrl(nomeArquivo);

      const { error: updateError } = await supabase
        .from('produtos')
        .update({ foto_url: publicUrl })
        .eq('id', produtoId);

      if (updateError) throw updateError;

      setProdutos((prevProdutos) =>
        prevProdutos.map((p) =>
          p.id === produtoId ? { ...p, foto_url: publicUrl } : p
        )
      );

      alert('Foto do pijama atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao processar upload:', error.message);
      alert(`Falha no upload: ${error.message}`);
    } finally {
      setEnviandoId(null);
    }
  };

  const formatarMoeda = (valor) => {
    if (!valor) return 'R$ 0,00';
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="text-left">
      {/* Título de boas-vindas da vitrine */}
      <div className="text-center max-w-xl mx-auto mb-8 md:mb-12 px-4 md:px-0">
        <h2 className="font-serif text-2xl md:text-4xl text-slate-800 font-bold mb-2 md:mb-3">
          Durma com elegância
        </h2>
        <p className="text-[11px] md:text-sm text-slate-500">
          Peças exclusivas desenvolvidas em tecidos nobres para a melhor noite de sono.
        </p>
      </div>

      {/* Estado de Carregamento Skeleton */}
      {carregando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 animate-pulse">
              <div className="bg-slate-100 h-64 md:h-72 w-full rounded-xl" />
              <div className="h-4 bg-slate-100 rounded-sm w-3/4" />
              <div className="h-4 bg-slate-100 rounded-sm w-1/2" />
            </div>
          ))}
        </div>
      ) : produtos.length === 0 ? (
        <div className="text-center py-10 md:py-12 bg-white rounded-2xl border border-slate-100 mx-2 md:mx-0">
          <p className="text-xs md:text-sm text-slate-400">Nenhum produto disponível na vitrine no momento.</p>
        </div>
      ) : (
        /* Grid de produtos vindos do Banco */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {produtos.map((prod) => (
            <div key={prod.id} className="flex flex-col space-y-2 relative group">
              
              {/* MODIFICADO: Bloqueio de clique visual na loja se não houver estoque */}
              <ProductCard 
                nome={prod.nome}
                preco={formatarMoeda(prod.preco_varejo)} 
                imagem={prod.foto_url ? `${prod.foto_url}?t=${Date.now()}` : null} 
                tag={prod.quantidade_estoque <= 0 ? "Esgotado" : prod.tag}
                onComprar={() => {
                  if (prod.quantidade_estoque <= 0) {
                    alert('Poxa, este produto está esgotado no momento!');
                  } else {
                    onAdicionarProduto(prod);
                  }
                }} 
              />

              {/* CONTROLE GERENCIAL DE UPLOAD */}
              {(userRole === 'admin' || userRole === 'vendedor') && (
                <div className="px-1 mt-1">
                  <label className="block w-full text-center bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 text-xs font-semibold py-2.5 md:py-2 rounded-xl cursor-pointer transition-colors shadow-sm">
                    {enviandoId === prod.id ? '⏳ Carregando...' : '📷 Alterar Imagem'}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleUploadFoto(e, prod.id)}
                      className="hidden" 
                      disabled={enviandoId !== null}
                    />
                  </label>
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}