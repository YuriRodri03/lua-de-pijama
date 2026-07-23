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
  const [carrinho, setCarrinho] = useState([]); // NOVO: Estado para a sacola do cliente online

  // ESCUTA ATIVA: Sincroniza o papel (role) sem forçar redirecionamento de view inesperado
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

  // NOVO: Função para o cliente adicionar itens à sacola pela vitrine
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

  // NOVO: Contagem total de itens na sacola para atualizar o Header
  const totalItensSacola = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  // NOVO: Cálculo do valor total da sacola do cliente
  const valorTotalSacola = carrinho.reduce((acc, item) => acc + item.preco_varejo * item.quantidade, 0);

  return (
    <MainLayout 
      currentView={view} 
      setView={setView} 
      userRole={role} 
      setUserRole={setRole}
      carrinhoContagem={totalItensSacola}
    >
      {/* 1. RENDERIZAÇÃO DA PÁGINA DE LOGIN CORRETAMENTE CACHADA */}
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

      {view === 'sacola' && (
        <div className="max-w-3xl mx-auto bg-white border border-lua-rose-dark/10 p-6 md:p-8 rounded-2xl shadow-xs text-left my-6 animate-fade-in">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="font-serif text-2xl font-bold text-slate-800">Sua Sacola</h2>
            <p className="text-xs text-slate-400 mt-0.5">Revise suas peças exclusivas antes de fechar o pedido.</p>
          </div>

          {carrinho.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl block mb-2">🛍️</span>
              <p className="text-sm text-slate-400">Sua sacola está vazia no momento.</p>
              <button onClick={() => setView('loja')} className="text-xs text-lua-rose-dark font-semibold mt-2 hover:underline">
                Voltar para a Vitrine
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="divide-y divide-slate-100">
                {carrinho.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-4 gap-4">
                    <div className="flex items-center gap-4">
                      {item.foto_url ? (
                        <img src={item.foto_url} alt={item.nome} className="w-16 h-16 object-cover rounded-xl bg-lua-cream" />
                      ) : (
                        <div className="w-16 h-16 bg-lua-cream rounded-xl flex items-center justify-center text-xl select-none">✨</div>
                      )}
                      <div>
                        <h4 className="font-medium text-slate-800 text-sm md:text-base">{item.nome}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Qtd: {item.quantidade}x</p>
                      </div>
                    </div>
                    <span className="font-mono font-semibold text-slate-800">
                      R$ {(item.preco_varejo * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-lua-cream/40 p-4 rounded-xl border border-lua-rose-dark/10 flex justify-between items-baseline mt-6">
                <span className="text-xs uppercase font-bold text-slate-500">Valor Total do Pedido:</span>
                <span className="text-2xl font-bold text-slate-800 font-mono">
                  R$ {valorTotalSacola.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <button 
                onClick={() => alert('Integração do checkout em andamento...')} 
                className="w-full bg-lua-rose-dark hover:bg-lua-rose text-white text-sm font-bold py-3 rounded-xl shadow-xs transition-colors mt-2"
              >
                Prosseguir para o Pagamento
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* 2. DEMAIS ABAS COMPLEMENTARES FORA DO ESCOPO DA SACOLA */}
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