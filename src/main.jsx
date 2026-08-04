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
import GestaoDespesas from './pages/GestaoDespesas'
import GestaoPagamentos from './pages/GestaoPagamentos';
import Login from './pages/Login'
import Sacola from './pages/Sacola'
import MeusPedidos from './pages/MeusPedidos'
import { supabase } from './services/supabase'

function RootRouter() {
  const [view, setView] = useState('loja'); 
  const [role, setRole] = useState('cliente'); 
  const [carrinho, setCarrinho] = useState([]); 
  
  // NOVO ESTADO: Guarda se o usuário está logado de fato
  const [isLoggedIn, setIsLoggedIn] = useState(false); 

  // ESCUTA ATIVA: Sincroniza o papel (role) e o login
  useEffect(() => {
    async function verificarSessao() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setIsLoggedIn(true); // Marca como logado
        const { data: perfil } = await supabase
          .from('perfis')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (perfil?.role) {
          setRole(perfil.role);
        }
      } else {
        setIsLoggedIn(false); // Não tem sessão ativa
      }
    }
    
    verificarSessao();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsLoggedIn(false);
        setRole('cliente');
        setView('loja');
      } else {
        setIsLoggedIn(true);
        verificarSessao();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ADICIONAR ITEM À SACOLA (COM TRAVA DE ESTOQUE)
  const handleAdicionarAoCarrinho = (produto) => {
    // 1. Bloqueia logo de cara se o produto estiver com estoque zerado ou negativo
    if (!produto.quantidade_estoque || produto.quantidade_estoque <= 0) {
      alert(`Poxa! O produto "${produto.nome}" esgotou! 😔`);
      return;
    }

    // 2. Verifica se a quantidade que já está no carrinho atingiu o limite do estoque
    const itemExistente = carrinho.find((item) => item.id === produto.id);
    if (itemExistente && itemExistente.quantidade >= produto.quantidade_estoque) {
      alert(`Desculpe, você já adicionou todas as unidades de "${produto.nome}" que temos no momento!`);
      return;
    }

    // 3. Se passou pelas travas, pode adicionar ou somar na sacola
    setCarrinho((itensAnteriores) => {
      const itemJaNaLista = itensAnteriores.find((item) => item.id === produto.id);
      
      if (itemJaNaLista) {
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
          quantidade_estoque: produto.quantidade_estoque, // Guardamos o estoque máximo aqui também
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
      isLoggedIn={isLoggedIn} // <- PASSANDO A INFORMAÇÃO PARA O LAYOUT
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

      {view === 'sacola' && (
        <Sacola 
          carrinho={carrinho}
          setCarrinho={setCarrinho}
          handleRemoverDaSacola={handleRemoverDaSacola}
          valorTotalSacola={valorTotalSacola}
          setView={setView}
        />
      )}
      
      {view === 'pedidos' && <MeusPedidos setView={setView} />}

      {view === 'sistema' && <PainelSistema userRole={role} />}
      {view === 'vendas' && <VendasFisicas userRole={role} />}
      {view === 'estoque' && <Estoque userRole={role} />}
      {view === 'clientes' && <Clientes userRole={role} />}
      {view === 'equipe' && <GestaoEquipe userRole={role} />}
      {view === 'despesas' && <GestaoDespesas userRole={role} />}
      {view === 'pagamentos' && <GestaoPagamentos />}
      
    </MainLayout>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootRouter />
  </React.StrictMode>,
)