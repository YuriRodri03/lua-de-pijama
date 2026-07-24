import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'

import MainLayout from './layouts/MainLayout'
import LojaOnline from './pages/LojaOnline'
import PainelSistema from './pages/PainelSistema'
import VendasFisicas from './pages/VendasFisicas'
import Estoque from './pages/Estoque'
import Clientes from './pages/Clientes'
import GestaoEquipe from './pages/GestaoEquipe'
import Login from './pages/Login'
import { supabase } from './services/supabase'

function RootRouter() {
  const [view, setView] = useState('loja'); 
  const [role, setRole] = useState('cliente'); 
  const [carrinho, setCarrinho] = useState([]); // Estado para a sacola do cliente online

  // ESCUTA ATIVA: Sincroniza o papel (role)
  useEffect(() => {
    async function verificarSessao() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: perfil } = await supabase
          .from('perfis')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (perfil?.role) {
          setRole(perfil.role);
        }
      }
    }
    
    verificarSessao();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setRole('cliente');
        setView('loja');
      } else {
        verificarSessao();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ADICIONAR ITEM À SACOLA
  const handleAdicionarAoCarrinho = (produto) => {
    setCarrinho((itensAnteriores) => {
      const itemExistente = itensAnteriores.find((item) => item.id === produto.id);
      
      if (itemExistente) {
        return itensAnteriores.map((item) =>
          item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      }
      
      return [
        ...itensAnteriores,
        {
          id: produto.id,
          nome: produto.nome,
          preco_varejo: parseFloat(produto.preco_varejo),
          foto_url: produto.foto_url,
          quantidade: 1,
        },
      ];
    });
    alert(`${produto.nome} foi adicionado à sua sacola!`);
  };

  // REMOVER ITEM DA SACOLA (NOVO)
  const handleRemoverDaSacola = (produtoId) => {
    setCarrinho((itensAnteriores) => itensAnteriores.filter(item => item.id !== produtoId));
  };

  // Contagem e Valor Total
  const totalItensSacola = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  const valorTotalSacola = carrinho.reduce((acc, item) => acc + item.preco_varejo * item.quantidade, 0);

  return (
    <MainLayout 
      currentView={view} 
      setView={setView} 
      userRole={role} 
      setUserRole={setRole}
      carrinhoContagem={totalItensSacola}
    >
      {view === 'login' && (
        <Login 
          onLogin={(proximaVisao) => setView(proximaVisao)} 
          setView={setView} 
          setUserRole={setRole} 
        />
      )}
      
      {view === 'loja' && (
        <LojaOnline 
          userRole={role} 
          onAdicionarProduto={handleAdicionarAoCarrinho} 
        />
      )}

      {/* SACOLA OTIMIZADA PARA MOBILE */}
      {view === 'sacola' && (
        <div className="max-w-3xl mx-auto bg-white border border-lua-rose-dark/10 p-4 md:p-8 rounded-2xl shadow-xs text-left my-4 md:my-6 animate-fade-in">
          <div className="border-b border-slate-100 pb-4 mb-5 md:mb-6 flex justify-between items-center">
            <div>
              <h2 className="font-serif text-xl md:text-2xl font-bold text-slate-800">Sua Sacola</h2>
              <p className="text-[11px] md:text-xs text-slate-400 mt-0.5">Revise suas peças exclusivas.</p>
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
                        
                        {/* Botão de remover visível apenas no mobile embaixo do nome */}
                        <button onClick={() => handleRemoverDaSacola(item.id)} className="sm:hidden text-[10px] text-rose-500 font-medium mt-1">
                          Remover
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <span className="font-mono font-semibold text-slate-800 text-sm md:text-base">
                        R$ {(item.preco_varejo * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      {/* Botão de remover no desktop */}
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
                  onClick={() => alert('Integração do checkout em andamento...')} 
                  className="w-full flex-1 bg-lua-rose-dark hover:bg-lua-rose text-white text-xs md:text-sm font-bold py-3 rounded-xl shadow-xs transition-colors"
                >
                  Prosseguir para o Pagamento
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {view === 'sistema' && <PainelSistema userRole={role} />}
      {view === 'vendas' && <VendasFisicas userRole={role} />}
      {view === 'estoque' && <Estoque userRole={role} />}
      {view === 'clientes' && <Clientes userRole={role} />}
      {view === 'equipe' && <GestaoEquipe userRole={role} />}
    </MainLayout>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootRouter />
  </React.StrictMode>,
)