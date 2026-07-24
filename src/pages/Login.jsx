import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import { supabase } from '../services/supabase';

export default function Login({ onLogin, setView, setUserRole }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Estados dos Campos
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  
  // Estados para Localidade (IBGE)
  const [listaUfs, setListaUfs] = useState([]);
  const [listaCidades, setListaCidades] = useState([]);
  const [uf, setUf] = useState('CE'); // Padrão Ceará
  const [cidade, setCidade] = useState('');
  const [carregandoCidades, setCarregandoCidades] = useState(false);

  // 1. CARREGAR ESTADOS (UFs) AO INICIAR
  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?ordenar=nome')
      .then((res) => res.json())
      .then((data) => {
        const ufsOrdenadas = data.map(item => item.sigla).sort();
        setListaUfs(ufsOrdenadas);
      })
      .catch((err) => console.error('Erro ao buscar UFs:', err));
  }, []);

  // 2. CARREGAR CIDADES TODA VEZ QUE A UF MUDAR
  useEffect(() => {
    if (!uf) return;
    
    setCarregandoCidades(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?ordenar=nome`)
      .then((res) => res.json())
      .then((data) => {
        const cidadesNomes = data.map(item => item.nome);
        setListaCidades(cidadesNomes);
        setCidade(cidadesNomes[0] || ''); // Seleciona a primeira cidade por padrão
      })
      .catch((err) => console.error('Erro ao buscar cidades:', err))
      .finally(() => setCarregandoCidades(false));
  }, [uf]);

  // Função para aplicar a máscara de WhatsApp dinamicamente
  const handleWhatsappChange = (e) => {
    let valor = e.target.value.replace(/\D/g, '');
    
    if (valor.length <= 11) {
      valor = valor.replace(/^(\d{2})(\d)/g, '($1) $2');
      valor = valor.replace(/(\d{5})(\d)/, '$1-$2');
    } else {
      valor = valor.substring(0, 11);
      valor = valor.replace(/^(\d{2})(\d)/g, '($1) $2');
      valor = valor.replace(/(\d{5})(\d)/, '$1-$2');
    }
    
    setWhatsapp(valor);
  };

  // 3. FLUXO DE SUBMIT (LOGIN OU CADASTRO)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);

    try {
      if (isSignUp) {
        // --- FLUXO DE CADASTRO DE CLIENTE ---
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData?.user) {
          const { error: dbError } = await supabase
            .from('clientes')
            .insert([
              {
                nome,
                whatsapp,
                email,
                cidade,              
                uf: uf.toUpperCase(),  
                notas: 'Cadastrado via Loja Online.',
                auth_user_id: authData.user.id
              }
            ]);

          if (dbError) throw dbError;

          alert('Conta criada com sucesso! Você já está logado.');
          if (typeof setUserRole === 'function') setUserRole('cliente');
          if (typeof onLogin === 'function') onLogin('loja');
        }

      } else {
        // --- FLUXO DE LOGIN PADRÃO NO SUPABASE ---
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData?.user) {
          // Busca o perfil corporativo correspondente na tabela 'perfis'
          const { data: perfil, error: perfilError } = await supabase
            .from('perfis')
            .select('role')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (perfilError) {
            console.error('Erro ao verificar perfil corporativo:', perfilError.message);
          }

          if (perfil) {
            const userRole = perfil.role;
            if (typeof setUserRole === 'function') setUserRole(userRole);
            
            // Se o nível for admin ou vendedor, entra na área de gestão (sistema)
            if (userRole === 'admin' || userRole === 'vendedor') {
              if (typeof onLogin === 'function') onLogin('sistema');
              return;
            }
          }

          // Se não houver perfil ou não for admin/vendedor, assume que é cliente e vai para a loja
          if (typeof setUserRole === 'function') setUserRole('cliente');
          if (typeof onLogin === 'function') onLogin('loja');
        }
      }
    } catch (error) {
      console.error('Erro na autenticação:', error.message);
      alert(`Falha na operação: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-6 md:my-12 bg-white border border-lua-rose-dark/10 p-5 md:p-8 rounded-2xl shadow-xs transition-all">
      <div className="text-center mb-6 md:mb-8">
        <span className="text-3xl md:text-4xl text-lua-gold block mb-2">🌙</span>
        <h2 className="font-serif text-xl md:text-2xl font-bold text-slate-800">
          {isSignUp ? 'Criar sua Conta' : 'Bem-vindo à Lua de Pijama'}
        </h2>
        <p className="text-[11px] md:text-xs text-slate-400 mt-1">
          {isSignUp 
            ? 'Preencha seus dados para acompanhar seus pedidos' 
            : 'Acesse sua conta para comprar ou gerenciar a loja'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campos adicionais exclusivos do Cadastro de Clientes */}
        {isSignUp && (
          <>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">Nome Completo</label>
              <input type="text" placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 text-sm focus:outline-none focus:border-lua-rose-dark transition-colors" required />
            </div>
            
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">WhatsApp</label>
              <input type="text" placeholder="(85) 99999-0000" value={whatsapp} onChange={handleWhatsappChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 text-sm focus:outline-none focus:border-lua-rose-dark transition-colors" required />
            </div>

            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">UF</label>
                <select value={uf} onChange={(e) => setUf(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 md:px-3 py-2.5 text-sm focus:outline-none focus:border-lua-rose-dark transition-colors" required>
                  {listaUfs.length === 0 ? <option value="CE">CE</option> : listaUfs.map((sigla) => <option key={sigla} value={sigla}>{sigla}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">Cidade</label>
                <select value={cidade} onChange={(e) => setCidade(e.target.value)} disabled={carregandoCidades} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 text-sm focus:outline-none focus:border-lua-rose-dark transition-colors disabled:opacity-50" required>
                  {carregandoCidades ? <option>Carregando...</option> : listaCidades.map((nomeCidade) => <option key={nomeCidade} value={nomeCidade}>{nomeCidade}</option>)}
                </select>
              </div>
            </div>
          </>
        )}

        {/* Campos Padrão */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">E-mail</label>
          <input type="email" placeholder="seuemail@provedor.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 text-sm focus:outline-none focus:border-lua-rose-dark transition-colors" required />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">Senha</label>
          <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 text-sm focus:outline-none focus:border-lua-rose-dark transition-colors" required />
        </div>

        <Button variant="primary" type="submit" className="w-full mt-4 py-3" disabled={carregando}>
          {carregando ? 'Processando...' : isSignUp ? 'Concluir Cadastro' : 'Entrar no Sistema'}
        </Button>
      </form>

      <div className="mt-5 md:mt-6 text-center border-t border-slate-100 pt-4">
        <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-xs md:text-sm text-lua-rose-dark hover:underline font-medium p-1">
          {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se aqui'}
        </button>
      </div>
    </div>
  );
}