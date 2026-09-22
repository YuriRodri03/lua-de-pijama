import React, { useState, useEffect } from 'react';
import Button from '../components/Button';

export default function MainLayout({ children, currentView, setView, userRole, setUserRole, carrinhoContagem, isLoggedIn }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Define quem entra no painel interno (admin ou vendedor)
  const [isInternalUser, setIsInternalUser] = useState(userRole === 'admin' || userRole === 'vendedor');

  useEffect(() => {
    setIsInternalUser(userRole === 'admin' || userRole === 'vendedor');
    
    // Segurança extra: Se um vendedor estiver numa tela de admin, força ele pra tela de vendas
    if (userRole === 'vendedor') {
      const telasBloqueadas = ['estoque', 'equipe', 'despesas', 'sistema', 'pagamentos'];
      if (telasBloqueadas.includes(currentView)) {
        setView('vendas');
      }
    }
  }, [userRole, currentView, setView]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [currentView]);

  const handleLogout = async () => {
    const { supabase } = await import('../services/supabase');
    await supabase.auth.signOut();
    if (typeof setUserRole === 'function') setUserRole('cliente');
    setView('loja');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans antialiased selection:bg-lua-rose-light">
      
      {/* SE FOR USUÁRIO INTERNO (ADMIN/VENDEDOR) */}
      {isInternalUser ? (
        <div className="flex flex-1 relative min-h-screen">
          
          {/* BARRA SUPERIOR MOBILE */}
          <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 z-40 flex items-center justify-between px-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(userRole === 'admin' ? 'sistema' : 'vendas')}>
              <span className="text-2xl text-lua-gold">🌙</span>
              <span className="font-serif text-lg font-semibold tracking-wide text-white">Lua</span>
            </div>
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 text-slate-300 hover:text-white bg-slate-800/50 rounded-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>

          {/* OVERLAY MOBILE */}
          {isMobileSidebarOpen && (
            <div 
              className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          {/* SIDEBAR LATERAL */}
          <aside className={`bg-slate-900 text-slate-300 flex flex-col justify-between fixed h-screen z-50 border-r border-slate-800 transition-all duration-300 ease-in-out 
            ${isSidebarOpen ? 'md:w-64' : 'md:w-20'} 
            w-64 md:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="p-4 flex flex-col h-full overflow-y-auto no-scrollbar">
              
              <div className={`flex items-center pb-6 border-b border-slate-800 ${isSidebarOpen ? 'justify-between' : 'md:justify-center justify-between'}`}>
                
                <div className={`flex items-center gap-3 cursor-pointer ${!isSidebarOpen && 'md:hidden'}`} onClick={() => setView(userRole === 'admin' ? 'sistema' : 'vendas')}>
                  <span className="text-2xl text-lua-gold">🌙</span>
                  <div className="animate-fade-in">
                    <span className="font-serif text-lg font-semibold tracking-wide text-white block leading-none">
                      Lua <i className="text-lua-gold font-light italic">de Pijama</i>
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-slate-400 block mt-1">Workspace</span>
                  </div>
                </div>
                
                {/* Botão de Toggle (Desktop) */}
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="hidden md:block p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-700/30"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>

                {/* Botão de Fechar (Mobile) */}
                <button 
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="md:hidden p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className={`mt-4 px-3 py-2 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center justify-between animate-fade-in ${!isSidebarOpen && 'md:hidden'}`}>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Acesso</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-lua-rose-dark/20 text-lua-rose-light border border-lua-rose-dark/30">
                  {userRole === 'admin' ? '🛡️ Gestor' : '👤 Vendedor'}
                </span>
              </div>

              <nav className="mt-8 space-y-1.5 flex-1">
                <p className={`text-[10px] font-bold tracking-widest uppercase text-slate-500 px-3 mb-2 animate-fade-in ${!isSidebarOpen && 'md:hidden'}`}>Operação</p>
                
                <button onClick={() => setView('vendas')} className={`w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${currentView === 'vendas' ? 'bg-lua-rose-dark text-white font-semibold' : 'hover:bg-slate-800 hover:text-white'} ${isSidebarOpen ? 'px-3 py-2.5 gap-3' : 'md:p-3 md:justify-center px-3 py-2.5 gap-3'}`}>
                  <span className="text-base">🛒</span> 
                  <span className={`animate-fade-in ${!isSidebarOpen && 'md:hidden'}`}>Vendas Físicas (PDV)</span>
                </button>
                
                <button onClick={() => setView('clientes')} className={`w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${currentView === 'clientes' ? 'bg-lua-rose-dark text-white font-semibold' : 'hover:bg-slate-800 hover:text-white'} ${isSidebarOpen ? 'px-3 py-2.5 gap-3' : 'md:p-3 md:justify-center px-3 py-2.5 gap-3'}`}>
                  <span className="text-base">👥</span> 
                  <span className={`animate-fade-in ${!isSidebarOpen && 'md:hidden'}`}>Clientes</span>
                </button>

                {/* ESSA CONDICIONAL ESCONDE O MENU GERENCIAL DOS VENDEDORES */}
                {userRole === 'admin' && (
                  <>
                    <p className={`text-[10px] font-bold tracking-widest uppercase text-slate-500 px-3 pt-4 mb-2 animate-fade-in ${!isSidebarOpen && 'md:hidden'}`}>Gerenciamento</p>
                    
                    <button onClick={() => setView('estoque')} className={`w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${currentView === 'estoque' ? 'bg-lua-rose-dark text-white font-semibold' : 'hover:bg-slate-800 hover:text-white'} ${isSidebarOpen ? 'px-3 py-2.5 gap-3' : 'md:p-3 md:justify-center px-3 py-2.5 gap-3'}`}>
                      <span className="text-base">📦</span> 
                      <span className={`animate-fade-in ${!isSidebarOpen && 'md:hidden'}`}>Gerenciar Estoque</span>
                    </button>
                    
                    <button onClick={() => setView('equipe')} className={`w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${currentView === 'equipe' ? 'bg-lua-rose-dark text-white font-semibold' : 'hover:bg-slate-800 hover:text-white'} ${isSidebarOpen ? 'px-3 py-2.5 gap-3' : 'md:p-3 md:justify-center px-3 py-2.5 gap-3'}`}>
                      <span className="text-base">👔</span> 
                      <span className={`animate-fade-in ${!isSidebarOpen && 'md:hidden'}`}>Gestão de Equipe</span>
                    </button>

                    <button onClick={() => setView('despesas')} className={`w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${currentView === 'despesas' ? 'bg-lua-rose-dark text-white font-semibold' : 'hover:bg-slate-800 hover:text-white'} ${isSidebarOpen ? 'px-3 py-2.5 gap-3' : 'md:p-3 md:justify-center px-3 py-2.5 gap-3'}`}>
                      <span className="text-base">💸</span> 
                      <span className={`animate-fade-in ${!isSidebarOpen && 'md:hidden'}`}>Gestão de Despesas</span>
                    </button>
                    
                    <button onClick={() => setView('sistema')} className={`w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${currentView === 'sistema' ? 'bg-lua-rose-dark text-white font-semibold' : 'hover:bg-slate-800 hover:text-white'} ${isSidebarOpen ? 'px-3 py-2.5 gap-3' : 'md:p-3 md:justify-center px-3 py-2.5 gap-3'}`}>
                      <span className="text-base">📊</span> 
                      <span className={`animate-fade-in ${!isSidebarOpen && 'md:hidden'}`}>Painel Geral (ERP)</span>
                    </button>

                    <button onClick={() => setView('pagamentos')} className={`w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${currentView === 'pagamentos' ? 'bg-lua-rose-dark text-white font-semibold' : 'hover:bg-slate-800 hover:text-white'} ${isSidebarOpen ? 'px-3 py-2.5 gap-3' : 'md:p-3 md:justify-center px-3 py-2.5 gap-3'}`}>
                      <span className="text-base">💳</span> 
                      <span className={`animate-fade-in ${!isSidebarOpen && 'md:hidden'}`}>InfinitePay</span>
                    </button>
                  </>
                )}
              </nav>
            </div>

            <div className={`p-4 border-t border-slate-800 bg-slate-950/40 flex ${isSidebarOpen ? 'flex-row items-center justify-between' : 'md:flex-col md:items-center md:gap-4 flex-row items-center justify-between'}`}>
              <button onClick={() => setView('loja')} className="text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                🌐 <span className={`animate-fade-in ${!isSidebarOpen && 'md:hidden'}`}>Ver Vitrine</span>
              </button>
              <button onClick={handleLogout} className={`text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors bg-rose-950/30 hover:bg-rose-950/60 rounded-lg border border-rose-900/30 ${isSidebarOpen ? 'px-3 py-1.5' : 'md:p-2 md:text-center px-3 py-1.5'}`}>
                {isSidebarOpen ? 'Sair' : <span className="md:hidden">Sair</span>}
                <span className={`${isSidebarOpen ? 'hidden' : 'hidden md:inline'}`}>🚪</span>
              </button>
            </div>
          </aside>

          {/* ÁREA DE CONTEÚDO PRINCIPAL INTERNO */}
          <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out pt-16 md:pt-0 ${isSidebarOpen ? 'md:pl-64' : 'md:pl-20'}`}>
            <main className="flex-grow p-4 md:p-8 max-w-[1600px] w-full mx-auto">
              {children}
            </main>
            <footer className="py-4 px-4 md:px-8 border-t border-slate-200 text-left text-[11px] text-slate-400">
              © 2026 Lua de Pijama Dashboard.
            </footer>
          </div>
        </div>
      ) : (
        
        /* 🌟 SE FOR CLIENTE OU VISITANTE (LAYOUT PREMIUM) 🌟 */
        <>
          <header className="bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 transition-all shadow-sm">
            <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
              
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setView('loja')}>
                <span className="text-2xl transition-transform group-hover:scale-110 duration-500">🌙</span>
                <div className="font-serif text-xl md:text-2xl text-slate-900 font-medium tracking-tight">
                  Lua <i className="text-lua-rose-dark font-light italic">de Pijama</i>
                </div>
              </div>

              <nav className="hidden md:flex items-center gap-6 font-medium text-sm">
                <button 
                  onClick={() => setView('loja')} 
                  className={`transition-colors duration-300 hover:text-lua-rose-dark ${currentView === 'loja' ? 'text-slate-900 font-semibold border-b-2 border-lua-rose-dark pb-1' : 'text-slate-500'}`}
                >
                  Coleção
                </button>
                
                {isLoggedIn && (
                  <button 
                    onClick={() => setView('pedidos')} 
                    className={`transition-colors duration-300 hover:text-lua-rose-dark ${currentView === 'pedidos' ? 'text-slate-900 font-semibold border-b-2 border-lua-rose-dark pb-1' : 'text-slate-500'}`}
                  >
                    Meus Pedidos
                  </button>
                )}
              </nav>

              <div className="flex items-center gap-3 md:gap-5">
                
                {isLoggedIn && (
                  <button 
                    onClick={() => setView('pedidos')}
                    className={`md:hidden text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors hover:text-lua-rose-dark ${currentView === 'pedidos' ? 'text-lua-rose-dark' : 'text-slate-500'}`}
                  >
                    Pedidos
                  </button>
                )}

                <button 
                  onClick={() => {
                    if (isLoggedIn) {
                      handleLogout();
                    } else {
                      setView('login');
                    }
                  }}
                  className={`text-[10px] md:text-xs font-bold uppercase tracking-widest transition-colors hover:text-lua-rose-dark ${currentView === 'login' ? 'text-lua-rose-dark' : 'text-slate-500'}`}
                >
                  {isLoggedIn ? (
                     <span className="text-rose-500 hover:text-rose-600">Sair</span>
                  ) : (
                     <><span className="hidden md:inline">Minha </span>Conta</>
                  )}
                </button>

                <button 
                  onClick={() => setView('sacola')} 
                  className="bg-slate-900 hover:bg-lua-rose-dark text-white transition-all duration-300 px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold tracking-wide flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <span className="md:hidden">🛒</span>
                  <span className="hidden md:inline">Sacola</span> 
                  {carrinhoContagem > 0 && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-md text-[10px] ml-1 font-mono">
                      {carrinhoContagem}
                    </span>
                  )}
                </button>

              </div>
            </div>
          </header>

          <main className="flex-grow w-full mx-auto px-4 md:px-6 py-6 md:py-8 bg-[#fafafa]">
            {children}
          </main>

          <footer className="bg-white border-t border-slate-100 py-10 mt-auto">
            <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 grayscale opacity-50">
                <span className="text-xl">🌙</span>
                <div className="font-serif text-lg text-slate-900 font-medium tracking-tight">
                  Lua <i className="font-light italic">de Pijama</i>
                </div>
              </div>
              <p className="text-[10px] md:text-xs text-slate-400 font-medium uppercase tracking-widest">
                © 2026. Todos os direitos reservados.
              </p>
            </div>
          </footer>
        </>
      )}

    </div>
  );
}