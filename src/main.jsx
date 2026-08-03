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
import Sacola from './pages/Sacola'
import MeusPedidos from './pages/MeusPedidos' // <-- 1. IMPORT NOVO AQUI
import { supabase } from './services/supabase'

function RootRouter() {
  const [view, setView] = useState('loja'); 
  const [role, setRole] = useState('cliente'); 
  const [carrinho, setCarrinho] = useState([]); 

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

  // REMOVER ITEM DA SACOLA
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

      {/* OLHA COMO FICOU LIMPO! */}
      {view === 'sacola' && (
        <Sacola 
          carrinho={carrinho}
          setCarrinho={setCarrinho}
          handleRemoverDaSacola={handleRemoverDaSacola}
          valorTotalSacola={valorTotalSacola}
          setView={setView}
        />
      )}
      
      {/* 2. ROTA DOS MEUS PEDIDOS ADICIONADA AQUI */}
      {view === 'pedidos' && <MeusPedidos setView={setView} />}

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