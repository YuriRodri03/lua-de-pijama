import React, { useState } from 'react';
import { supabase } from '../services/supabase';

export default function Sacola({ 
  carrinho, 
  setCarrinho, 
  handleRemoverDaSacola, 
  valorTotalSacola, 
  setView 
}) {
  const [gerandoPix, setGerandoPix] = useState(false);
  const [dadosPix, setDadosPix] = useState(null);

  const handleCheckoutPix = async () => {
    if (carrinho.length === 0) return;

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert("Para finalizar a compra, você precisa entrar na sua conta ou se cadastrar rapidinho!");
      setView('login');
      return; 
    }

    setGerandoPix(true);

    try {
      // Usando o nome correto da função agora!
      const { data, error } = await supabase.functions.invoke('bright-processor', {
        body: { 
          clienteId: session.user.id, 
          carrinho: carrinho,
          totalAPagar: valorTotalSacola
        }
      });

      if (error) throw error;
      
      setDadosPix(data);
      setCarrinho([]); 
      
    } catch (error) {
      console.error("Erro no checkout:", error);
      alert("Erro ao processar o pedido. Olhe o console (F12) para ver o erro exato.");
    } finally {
      setGerandoPix(false);
    }
  };

  // 1. Função para cancelar o pedido e limpar o banco
  const handleCancelarPedido = async () => {
    if (!dadosPix?.pedidoId) return;

    const confirmar = window.confirm("Tem certeza que deseja cancelar a compra?");
    if (!confirmar) return;

    try {
      // Deleta a venda com base no ID
      const { error } = await supabase
        .from('vendas')
        .delete()
        .eq('id', dadosPix.pedidoId);

      if (error) throw error;

      alert("Pedido cancelado.");
      setDadosPix(null);
      setView('loja');
    } catch (error) {
      console.error("Erro ao cancelar:", error);
      alert("Não foi possível cancelar o pedido agora.");
    }
  };

  // 2. Função temporária para testar o pagamento bem-sucedido
  const handleSimularPagamento = async () => {
    if (!dadosPix?.pedidoId) return;

    try {
      // Atualiza o status no banco para 'pago'
      const { error } = await supabase
        .from('vendas')
        .update({ status_pagamento: 'pago' })
        .eq('id', dadosPix.pedidoId);

      if (error) throw error;

      alert("🎉 Pagamento confirmado com sucesso!");
      setDadosPix(null);
      setView('loja');
    } catch (error) {
      console.error("Erro ao aprovar:", error);
      alert("Erro ao confirmar o pagamento.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white border border-lua-rose-dark/10 p-4 md:p-8 rounded-2xl shadow-xs text-left my-4 md:my-6 animate-fade-in">
      <div className="border-b border-slate-100 pb-4 mb-5 md:mb-6 flex justify-between items-center">
        <div>
          <h2 className="font-serif text-xl md:text-2xl font-bold text-slate-800">Sua Sacola</h2>
          <p className="text-[11px] md:text-xs text-slate-400 mt-0.5">Revise suas peças exclusivas.</p>
        </div>
        <button onClick={() => { setView('loja'); setDadosPix(null); }} className="md:hidden text-lg text-slate-400">✕</button>
      </div>

      {dadosPix ? (
        <div className="text-center p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-5 animate-fade-in">
          <div>
            <h3 className="font-serif text-xl font-bold text-lua-rose-dark">Pedido #{dadosPix.pedidoId} Criado!</h3>
            <p className="text-sm text-slate-500 mt-1">Escaneie o QR Code ou copie o código Pix abaixo para pagar.</p>
          </div>
          
          <img src={dadosPix.qrCodeImageBase64} alt="QR Code Pix" className="w-48 h-48 mx-auto rounded-xl border border-slate-200 shadow-sm bg-white p-2" />
          
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-left">
            <span className="text-xs font-mono text-slate-500 truncate">{dadosPix.pixCopiaECola}</span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(dadosPix.pixCopiaECola);
                alert('Código Pix copiado!');
              }}
              className="text-xs bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg font-bold shrink-0 transition-colors"
            >
              Copiar
            </button>
          </div>
          
          <div className="flex flex-col gap-3 mt-6">
  {/* Botão de sucesso (Temporário para testes) */}
  <button 
    onClick={handleSimularPagamento} 
    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs md:text-sm font-bold py-3 rounded-xl transition-colors"
  >
    Simular Pagamento Aprovado ✅
  </button>

  <div className="flex justify-between items-center mt-2">
    {/* Botão de Cancelar (Apaga do banco) */}
    <button 
      onClick={handleCancelarPedido} 
      className="text-xs font-semibold text-rose-400 hover:text-rose-600 transition-colors"
    >
      Cancelar Pedido
    </button>
    
    {/* Botão de Fechar sem cancelar (Mantém pendente no banco caso ele pague depois) */}
    <button 
      onClick={() => { setView('loja'); setDadosPix(null); }} 
      className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
    >
      Fechar e pagar depois
    </button>
  </div>
</div>
        </div>
      ) : carrinho.length === 0 ? (
        <div className="text-center py-10 md:py-12 border border-dashed border-slate-200 rounded-xl">
          <span className="text-4xl block mb-2">🛍️</span>
          <p className="text-xs md:text-sm text-slate-400">Sua sacola está vazia no momento.</p>
          <button onClick={() => setView('loja')} className="text-xs md:text-sm text-lua-rose-dark font-semibold mt-3 hover:underline">
            Voltar para a Vitrine
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="divide-y divide-slate-100">
            {carrinho.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-4 gap-3 md:gap-4">
                <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                  {item.foto_url ? (
                    <img src={item.foto_url} alt={item.nome} className="w-14 h-14 md:w-16 md:h-16 object-cover rounded-xl bg-lua-cream shrink-0" />
                  ) : (
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-lua-cream rounded-xl flex items-center justify-center text-xl select-none shrink-0">✨</div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-medium text-slate-800 text-xs md:text-sm truncate">{item.nome}</h4>
                    <p className="text-[11px] md:text-xs text-slate-400 mt-0.5">Qtd: {item.quantidade}x</p>
                    
                    <button onClick={() => handleRemoverDaSacola(item.id)} className="sm:hidden text-[10px] text-rose-500 font-medium mt-1">
                      Remover
                    </button>
                  </div>
                </div>
                
                <div className="text-right shrink-0 flex flex-col items-end gap-2">
                  <span className="font-mono font-semibold text-slate-800 text-sm md:text-base">
                    R$ {(item.preco_varejo * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <button onClick={() => handleRemoverDaSacola(item.id)} className="hidden sm:block text-xs text-rose-400 hover:text-rose-600 transition-colors">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-lua-cream/40 p-4 rounded-xl border border-lua-rose-dark/10 flex justify-between items-baseline mt-6">
            <span className="text-[11px] md:text-xs uppercase font-bold text-slate-500">Total do Pedido:</span>
            <span className="text-xl md:text-2xl font-bold text-slate-800 font-mono">
              R$ {valorTotalSacola.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex flex-col-reverse md:flex-row gap-3">
            <button 
              onClick={() => setView('loja')} 
              className="w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs md:text-sm font-bold py-3 md:px-6 rounded-xl transition-colors"
            >
              Continuar Comprando
            </button>
            <button 
              onClick={handleCheckoutPix} 
              disabled={gerandoPix}
              className="w-full flex-1 bg-lua-rose-dark hover:bg-lua-rose text-white text-xs md:text-sm font-bold py-3 rounded-xl shadow-xs transition-colors disabled:opacity-60"
            >
              {gerandoPix ? 'Gerando Pix...' : 'Finalizar e Gerar Pix ⚡'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}