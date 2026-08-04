import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export default function Sacola({ 
  carrinho, 
  setCarrinho, 
  handleRemoverDaSacola, 
  valorTotalSacola, 
  setView 
}) {
  const [gerandoPagamento, setGerandoPagamento] = useState(false);
  
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [carregandoDados, setCarregandoDados] = useState(true);

  // BUSCA OS DADOS NA TABELA "CLIENTES"
  useEffect(() => {
    async function carregarDadosDoUsuario() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Busca o cliente usando o auth_user_id
          const { data: cliente } = await supabase
            .from('clientes')
            .select('nome, whatsapp')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();

          if (cliente) {
            const nomePadrao = cliente.nome || session.user.user_metadata?.full_name || '';
            setClienteNome(nomePadrao);
            
            if (cliente.whatsapp) {
              setClienteTelefone(cliente.whatsapp);
            }
          } else {
            // Se não tem cadastro de cliente ainda, tenta pegar o nome do Google/Email
            setClienteNome(session.user.user_metadata?.full_name || '');
          }
        }
      } catch (error) {
        console.error("Erro ao puxar dados do cliente:", error);
      } finally {
        setCarregandoDados(false);
      }
    }

    carregarDadosDoUsuario();
  }, []);

  const handleFinalizarCompra = async () => {
    if (carrinho.length === 0) return;

    if (!clienteNome.trim() || !clienteTelefone.trim()) {
      alert("Por favor, preencha seu nome e telefone para podermos identificar seu pedido!");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert("Para finalizar a compra, você precisa entrar na sua conta!");
      setView('login');
      return; 
    }

    setGerandoPagamento(true);

    try {
      // 1. ATUALIZAR OU CRIAR O CADASTRO NA TABELA CLIENTES
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (clienteExistente) {
        // Se já existe, atualiza caso ele tenha digitado um whatsapp novo
        await supabase
          .from('clientes')
          .update({ 
            nome: clienteNome,
            whatsapp: clienteTelefone 
          })
          .eq('id', clienteExistente.id);
      } else {
        // Se é a primeira vez, insere o cliente no banco
        await supabase
          .from('clientes')
          .insert([{
            auth_user_id: session.user.id,
            nome: clienteNome,
            whatsapp: clienteTelefone
          }]);
      }

      // 2. CRIAR A VENDA
      const { data: novaVenda, error: erroVenda } = await supabase
        .from('vendas')
        .insert([{
          status_pagamento: 'pendente',
          total: valorTotalSacola,
          tipo_venda: 'online',
          vendedor_id: session.user.id,
          itens: carrinho,
          cliente_nome: clienteNome,       
          cliente_telefone: clienteTelefone 
        }])
        .select('id')
        .single();

      if (erroVenda) throw erroVenda;

      // 3. DAR BAIXA NO ESTOQUE
      const promessasEstoque = carrinho.map(async (item) => {
        const { data: produtoNoBanco, error: erroBusca } = await supabase
          .from('produtos')
          .select('quantidade_estoque')
          .eq('id', item.id)
          .single();

        if (erroBusca) throw erroBusca;

        const novoEstoque = Math.max(0, (produtoNoBanco.quantidade_estoque || 0) - item.quantidade);

        const { error: erroUpdate } = await supabase
          .from('produtos')
          .update({ quantidade_estoque: novoEstoque })
          .eq('id', item.id);

        if (erroUpdate) throw erroUpdate;
      });

      await Promise.all(promessasEstoque);

      // 4. CHAMAR A INFINITEPAY
      const { data, error } = await supabase.functions.invoke('criar-pagamento-infinitepay', {
        body: { 
          pedidoId: novaVenda.id,
          itens: carrinho 
        }
      });

      if (error) throw error;
      
      if (data && data.checkoutUrl) {
         window.location.href = data.checkoutUrl;
      } else {
         throw new Error("URL de checkout não retornou.");
      }
      
    } catch (error) {
      console.error("Erro no checkout:", error);
      alert(`Erro ao processar o pedido: ${error.message || JSON.stringify(error)}`);
      setGerandoPagamento(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white border border-lua-rose-dark/10 p-4 md:p-8 rounded-2xl shadow-xs text-left my-4 md:my-6 animate-fade-in">
      <div className="border-b border-slate-100 pb-4 mb-5 md:mb-6 flex justify-between items-center">
        <div>
          <h2 className="font-serif text-xl md:text-2xl font-bold text-slate-800">Sua Sacola</h2>
          <p className="text-[11px] md:text-xs text-slate-400 mt-0.5">Revise suas peças e finalize o pagamento.</p>
        </div>
        <button onClick={() => setView('loja')} className="md:hidden text-lg text-slate-400">✕</button>
      </div>

      {carrinho.length === 0 ? (
        <div className="text-center py-10 md:py-12 border border-dashed border-slate-200 rounded-xl">
          <span className="text-4xl block mb-2">🛍️</span>
          <p className="text-xs md:text-sm text-slate-400">Sua sacola está vazia no momento.</p>
          <button onClick={() => setView('loja')} className="text-xs md:text-sm text-lua-rose-dark font-semibold mt-3 hover:underline">
            Voltar para a Vitrine
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* LISTA DE ITENS */}
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
                  </div>
                </div>
                
                <div className="text-right shrink-0 flex flex-col items-end gap-2">
                  <span className="font-mono font-semibold text-slate-800 text-sm md:text-base">
                    R$ {(item.preco_varejo * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <button onClick={() => handleRemoverDaSacola(item.id)} className="text-xs text-rose-400 hover:text-rose-600 transition-colors">
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DADOS DO CLIENTE */}
          <div className="bg-slate-50 p-4 md:p-5 rounded-xl border border-slate-100 relative">
            
            {carregandoDados && (
               <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-[1px] flex items-center justify-center rounded-xl z-10">
                 <span className="text-xs font-semibold text-slate-400 animate-pulse">Buscando seus dados...</span>
               </div>
            )}

            <h3 className="font-semibold text-slate-700 text-sm md:text-base mb-3">Seus Dados de Contato</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Ex: Maria da Silva"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-lua-rose-dark focus:ring-1 focus:ring-lua-rose-dark transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">WhatsApp / Telefone</label>
                <input
                  type="tel"
                  value={clienteTelefone}
                  onChange={(e) => setClienteTelefone(e.target.value)}
                  placeholder="(85) 90000-0000"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-lua-rose-dark focus:ring-1 focus:ring-lua-rose-dark transition-all"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-3 text-center md:text-left">
               Se precisar, você pode alterar estes dados apenas para esta entrega.
            </p>
          </div>

          {/* TOTAL DO PEDIDO */}
          <div className="bg-lua-cream/40 p-4 rounded-xl border border-lua-rose-dark/10 flex justify-between items-baseline">
            <span className="text-[11px] md:text-xs uppercase font-bold text-slate-500">Total do Pedido:</span>
            <span className="text-xl md:text-2xl font-bold text-slate-800 font-mono">
              R$ {valorTotalSacola.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex flex-col-reverse md:flex-row gap-3 mt-4 border-t border-slate-100 pt-6">
            <button 
              onClick={() => setView('loja')} 
              className="w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs md:text-sm font-bold py-3 md:px-6 rounded-xl transition-colors"
            >
              Continuar Comprando
            </button>
            <button 
              onClick={handleFinalizarCompra} 
              disabled={gerandoPagamento || carregandoDados}
              className="w-full flex-1 bg-lua-rose-dark hover:bg-lua-rose text-white text-xs md:text-sm font-bold py-3 rounded-xl shadow-xs transition-colors disabled:opacity-60"
            >
              {gerandoPagamento ? 'Gerando Link Seguro...' : 'Ir para Pagamento 🔒'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}