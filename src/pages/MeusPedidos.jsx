import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export default function MeusPedidos({ setView }) {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pixAberto, setPixAberto] = useState(null); // Controla qual pedido está mostrando o Pix

  useEffect(() => {
    buscarPedidos();
  }, []);

  const buscarPedidos = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setView('login');
        return;
      }

      // Busca as vendas onde o ID do cliente bate com o usuário logado
      // E ordena do mais recente para o mais antigo
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .eq('cliente_nome', session.user.id) 
        .order('id', { ascending: false });

      if (error) throw error;
      setPedidos(data || []);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
    } finally {
      setCarregando(false);
    }
  };

  if (carregando) {
    return <div className="text-center p-10 mt-10 text-slate-500">Carregando seus pedidos...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white border border-lua-rose-dark/10 p-4 md:p-8 rounded-2xl shadow-xs text-left my-4 md:my-6 animate-fade-in">
      <div className="border-b border-slate-100 pb-4 mb-5 md:mb-6 flex justify-between items-center">
        <div>
          <h2 className="font-serif text-xl md:text-2xl font-bold text-slate-800">Meus Pedidos</h2>
          <p className="text-[11px] md:text-xs text-slate-400 mt-0.5">Acompanhe suas compras.</p>
        </div>
        <button onClick={() => setView('loja')} className="text-sm font-semibold text-slate-400 hover:text-lua-rose-dark">
          Voltar para Loja
        </button>
      </div>

      {pedidos.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
          <p className="text-slate-400 text-sm">Você ainda não tem nenhum pedido.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map((pedido) => (
            <div key={pedido.id} className="border border-slate-200 rounded-xl p-4 md:p-5 flex flex-col gap-4">
              
              {/* Cabeçalho do Pedido */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Pedido #{pedido.id}</span>
                  <div className="text-lg font-mono font-bold text-slate-800 mt-1">
                    R$ {Number(pedido.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                
                {/* Badge de Status */}
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  pedido.status_pagamento === 'pago' ? 'bg-emerald-100 text-emerald-700' :
                  pedido.status_pagamento === 'cancelado' ? 'bg-rose-100 text-rose-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {pedido.status_pagamento.toUpperCase()}
                </span>
              </div>

              {/* Área do Pix (só aparece se estiver pendente) */}
              {pedido.status_pagamento === 'pendente' && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  {pixAberto === pedido.id ? (
                    <div className="space-y-4 text-center animate-fade-in">
                      
                      <p className="text-sm font-semibold text-slate-700">Escaneie o QR Code ou copie o código:</p>
                      
                      {/* GERAÇÃO DO QR CODE NA TELA */}
                      {pedido.pix_copia_cola && (
                        <div className="flex justify-center my-2">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pedido.pix_copia_cola)}`}
                            alt="QR Code do Pix"
                            className="w-40 h-40 p-2 bg-white rounded-xl border border-slate-200 shadow-sm"
                          />
                        </div>
                      )}
                      
                      <div className="bg-white p-2 rounded border border-slate-200 flex items-center justify-between gap-2 text-left">
                        <span className="text-xs font-mono text-slate-500 truncate">
                          {pedido.pix_copia_cola || 'Pix não encontrado'}
                        </span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(pedido.pix_copia_cola);
                            alert('Código Pix copiado!');
                          }}
                          className="text-[10px] bg-slate-800 text-white px-3 py-2 rounded font-bold hover:bg-slate-700 transition-colors"
                        >
                          Copiar
                        </button>
                      </div>
                      <button onClick={() => setPixAberto(null)} className="text-xs text-slate-400 underline hover:text-slate-600">
                        Ocultar Pix
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setPixAberto(pedido.id)}
                      className="w-full bg-lua-rose-dark hover:bg-lua-rose text-white text-sm font-bold py-2.5 rounded-lg transition-colors"
                    >
                      Pagar Agora ⚡
                    </button>
                  )}
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}