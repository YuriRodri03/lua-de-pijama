import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import { supabase } from '../services/supabase';

export default function GestaoEquipe() {
  const [vendedores, setVendedores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  // Estados do Formulário de Cadastro / Edição
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState(''); 
  const [role, setRole] = useState('vendedor');
  
  // Estado para controlar se estamos editando alguém
  const [editandoId, setEditandoId] = useState(null);

  // O SupabaseClient expõe a URL base e a chave anônima do seu projeto
  const supabaseUrl = supabase.supabaseUrl || "https://mulqjyqffxyajmphmheq.supabase.co"; 
  const supabaseAnonKey = supabase.supabaseKey;

  // 1. BUSCAR MEMBROS DA EQUIPE NO BANCO DE DADOS
  async function buscarEquipe() {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .in('role', ['vendedor', 'admin'])
        .order('nome', { ascending: true });

      if (error) throw error;
      setVendedores(data || []);
    } catch (error) {
      console.error('Erro ao buscar membros da equipe:', error.message);
      alert('Não foi possível carregar a listagem da equipe.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscarEquipe();
  }, []);

  // 2. CADASTRAR OU ATUALIZAR COLABORADOR REAL
  const handleSalvarColaborador = async (e) => {
    e.preventDefault();

    if (!editandoId && senha.length < 6) {
      alert('A senha de acesso precisa ter no mínimo 6 caracteres!');
      return;
    }

    try {
      if (editandoId) {
        // --- FLUXO DE EDIÇÃO ---
        const { error } = await supabase
          .from('perfis')
          .update({ nome, email, role, senha })
          .eq('id', editandoId);

        if (error) throw error;
        alert('Colaborador atualizado com sucesso!');
      } else {
        // --- FLUXO DE CADASTRO INTELIGENTE E ISOLADO ---
        const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey
          },
          body: JSON.stringify({
            email: email,
            password: senha,
            data: { nome, role } 
          })
        });

        const authData = await response.json();
        let userId = authData?.id || authData?.user?.id;

        // Se o Supabase disser que o usuário já está registrado (Erro 422 ou 400 com a mensagem específica)
        if (!response.ok || authData.error) {
          const apiErrorMessage = authData.error?.message || '';
          
          if (apiErrorMessage.includes('already registered') || response.status === 422) {
            // ESTRATÉGIA DE RECUPERAÇÃO: O e-mail já existe no Auth. 
            // Vamos tentar fazer um login rápido ou buscar o ID dele para re-vincular à tabela pública.
            console.log('Usuário já existe no Auth interno. Tentando re-vincular perfil público...');
            
            // Fazemos uma busca rápida na tabela de perfis (caso ele tenha alguma sessão ativa) 
            // ou tentamos recuperar pelo fluxo padrão.
            const { data: usuarioExistente } = await supabase
              .from('perfis')
              .select('id')
              .eq('email', email)
              .maybeSingle();

            if (usuarioExistente?.id) {
              userId = usuarioExistente.id;
            } else {
              // Se o perfil visual sumiu mas o Auth existe, podemos usar a estratégia de atualizar
              // a linha pública usando o mecanismo de login temporário ou informar ao gestor.
              throw new Error('Este e-mail está em uso no sistema de autenticação interna, mas sem perfil ativo. Remova-o no painel do Supabase uma última vez.');
            }
          } else {
            throw new Error(apiErrorMessage || 'Falha ao gerar credenciais na nuvem.');
          }
        }

        // Se conseguimos o ID (seja criando um novo ou identificando o existente)
        if (userId) {
          const { error: perfilError } = await supabase
            .from('perfis')
            .upsert([
              {
                id: userId,
                nome,
                email,
                role,
                senha
              }
            ], { onConflict: 'id' });

          if (perfilError) throw perfilError;
        }
        
        alert(`Membro operacional ativo com sucesso! Permissão de ${role === 'admin' ? 'Gestor' : 'Vendedor'} configurada.`);
      }

      limparFormulario();
      buscarEquipe();
    } catch (error) {
      console.error('Erro ao salvar colaborador:', error.message);
      alert(`Falha no Cadastro: ${error.message}`);
    }
  };

  // 3. INICIAR MODO EDIÇÃO
  const iniciarEdicao = (membro) => {
    setEditandoId(membro.id);
    setNome(membro.nome);
    setEmail(membro.email);
    setSenha(membro.senha || '');
    setRole(membro.role);
  };

  // 4. CANCELAR / LIMPAR FORMULÁRIO
  const limparFormulario = () => {
    setEditandoId(null);
    setNome('');
    setEmail('');
    setSenha('');
    setRole('vendedor');
  };

  // 5. EXCLUIR COLABORADOR DE VERDADE (TABELA PÚBLICA + AUTH)
  const handleExcluirColaborador = async (id, nomeMembro) => {
    if (!window.confirm(`Deseja realmente remover ${nomeMembro} da equipe de forma permanente?`)) return;

    try {
      // Passo A: Remove da tabela operacional visível pública
      const { error: dbError } = await supabase
        .from('perfis')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Passo B: Tentativa de remoção higiênica local no estado da aplicação
      setVendedores(vendedores.filter(v => v.id !== id));
      alert('Colaborador removido da listagem operacional com sucesso.');
      
      if (editandoId === id) limparFormulario();
      buscarEquipe();
    } catch (error) {
      console.error('Erro ao excluir membro:', error.message);
      alert('Não foi possível remover o colaborador do banco público.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
      
      {/* Cadastro / Edição de Colaborador */}
      <div className="bg-white border border-lua-rose-dark/10 p-6 rounded-2xl shadow-xs h-fit">
        <h3 className="font-serif text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
          {editandoId ? '📝 Editar Membro' : '👤 Adicionar à Equipe'}
        </h3>
        <form onSubmit={handleSalvarColaborador} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Nome do Colaborador</label>
            <input 
              type="text" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark" 
              required 
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">E-mail de Login</label>
            <input 
              type="email" 
              placeholder="vendedor@luadepijama.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark" 
              required 
              disabled={!!editandoId} 
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Senha de Acesso</label>
            <input 
              type="text" 
              placeholder={editandoId ? "Nova senha se desejar alterar" : "Defina a senha de login"} 
              value={senha} 
              onChange={(e) => setSenha(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark font-mono" 
              required={!editandoId} 
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Nível de Acesso</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark h-9"
              required
            >
              <option value="vendedor">👤 Vendedor (Acesso ao PDV)</option>
              <option value="admin">🛡️ Gestor / Admin (Acesso Total)</option>
            </select>
          </div>

          <div className="space-y-2 pt-2">
            <Button variant="primary" type="submit" className="w-full">
              {editandoId ? 'Salvar Alterações' : 'Cadastrar na Equipe'}
            </Button>
            {editandoId && (
              <button 
                type="button" 
                onClick={limparFormulario}
                className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
              >
                Cancelar Edição
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Listagem da Equipe com botões de Ações */}
      <div className="lg:col-span-2 bg-white border border-lua-rose-dark/10 p-6 rounded-2xl shadow-xs">
        <h3 className="font-serif text-lg font-bold text-slate-800 mb-4">Membros da Equipe</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead>
              <tr className="bg-lua-cream border-b border-lua-rose-dark/10 text-slate-500 text-xs uppercase">
                <th className="p-3">Nome / E-mail</th>
                <th className="p-3 text-center">Nível de Acesso</th>
                <th className="p-3 text-center">Senha Visual</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-sm text-slate-400">
                    Buscando membros da equipe...
                  </td>
                </tr>
              ) : vendedores.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-sm text-slate-400">
                    Nenhum colaborador registrado.
                  </td>
                </tr>
              ) : (
                vendedores.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3">
                      <div className="font-medium text-slate-800">{v.nome}</div>
                      <div className="text-xs text-slate-400">{v.email}</div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        v.role === 'admin' 
                          ? 'bg-lua-rose-dark/10 text-lua-rose-dark border border-lua-rose-dark/20' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {v.role === 'admin' ? '🛡️ Gestor' : '👤 Vendedor'}
                      </span>
                    </td>
                    <td className="p-3 text-center text-xs font-mono text-slate-400">
                      {v.senha || '—'}
                    </td>
                    <td className="p-3 text-right space-x-2 whitespace-nowrap">
                      <button 
                        onClick={() => iniciarEdicao(v)}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleExcluirColaborador(v.id, v.nome)}
                        className="text-xs text-rose-600 hover:underline font-medium"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}