import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import { supabase } from '../services/supabase';

export default function Estoque() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  // Estados para o formulário de cadastro de novo produto
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('');
  const [tamanho, setTamanho] = useState('M');
  const [precoVarejo, setPrecoVarejo] = useState('');
  const [precoAtacado, setPrecoAtacado] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [tag, setTag] = useState('Novidade');
  const [qtd, setQtd] = useState('');

  // -------------------------------------------------------------------
  // NOVOS ESTADOS PARA EDIÇÃO EM LINHA
  // -------------------------------------------------------------------
  const [editandoId, setEditandoId] = useState(null);
  const [editValores, setEditValores] = useState({
    varejo: '',
    atacado: '',
    qtd: ''
  });

  // 1. BUSCAR PRODUTOS DO SUPABASE AO CARREGAR A TELA
  async function buscarEstoque() {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setItens(data || []);
    } catch (error) {
      console.error('Erro ao buscar dados do estoque:', error.message);
      alert('Não foi possível carregar o estoque.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscarEstoque();
  }, []);

  // 2. FUNÇÃO PARA SALVAR NO BANCO DE DADOS (INSERT)
  const handleCadastrar = async (e) => {
    e.preventDefault();
    
    const novoProduto = {
      nome,
      cor,
      tamanho,
      preco_varejo: parseFloat(precoVarejo) || 0,
      preco_atacado: parseFloat(precoAtacado) || 0,
      foto_url: fotoUrl || null,
      tag,
      quantidade_estoque: parseInt(qtd) || 0
    };

    try {
      const { data, error } = await supabase
        .from('produtos')
        .insert([novoProduto])
        .select();

      if (error) throw error;

      if (data) {
        setItens([data[0], ...itens]);
        
        // Limpa o formulário
        setNome('');
        setCor('');
        setPrecoVarejo('');
        setPrecoAtacado('');
        setFotoUrl('');
        setTag('Novidade');
        setQtd('');
        alert('Produto registrado no estoque com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao cadastrar produto:', error.message);
      alert('Erro ao salvar o produto no banco de dados.');
    }
  };

  // 3. FUNÇÃO PARA DELETAR NO BANCO DE DADOS (DELETE)
  const handleDeletar = async (id) => {
    if (confirm("Tem certeza que deseja remover este produto do estoque?")) {
      try {
        const { error } = await supabase
          .from('produtos')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setItens(itens.filter(item => item.id !== id));
      } catch (error) {
        console.error('Erro ao deletar produto:', error.message);
        alert('Não foi possível remover o produto do banco de dados.');
      }
    }
  };

  // -------------------------------------------------------------------
  // 4. FUNÇÕES PARA EDITAR (UPDATE)
  // -------------------------------------------------------------------
  const iniciarEdicao = (item) => {
    setEditandoId(item.id);
    setEditValores({
      varejo: item.preco_varejo,
      atacado: item.preco_atacado,
      qtd: item.quantidade_estoque
    });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
  };

  const salvarEdicao = async (id) => {
    const novosValores = {
      preco_varejo: parseFloat(editValores.varejo) || 0,
      preco_atacado: parseFloat(editValores.atacado) || 0,
      quantidade_estoque: parseInt(editValores.qtd) || 0
    };

    try {
      const { error } = await supabase
        .from('produtos')
        .update(novosValores)
        .eq('id', id);

      if (error) throw error;

      // Atualiza o estado local para não precisar recarregar do banco
      setItens(itens.map(item => 
        item.id === id ? { ...item, ...novosValores } : item
      ));
      
      setEditandoId(null);
    } catch (error) {
      console.error('Erro ao atualizar produto:', error.message);
      alert('Erro ao salvar as alterações.');
    }
  };

  // Métricas financeiras ajustadas para o preço de varejo como valor base patrimonial
  const totalPecas = itens.reduce((acc, curr) => acc + (curr.quantidade_estoque || 0), 0);
  const custoPatrimonial = itens.reduce((acc, curr) => acc + ((curr.preco_varejo || 0) * (curr.quantidade_estoque || 0)), 0);

  return (
    <div className="space-y-6 md:space-y-8 pb-16">
      
      {/* Resumo do Estoque */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        <StatCard 
          label="Total de Peças" 
          value={carregando ? "..." : `${totalPecas} unidades`}
          statusText="Disponíveis no estoque"
          statusType="neutral"
        />
        <StatCard 
          label="Valor de Venda" 
          value={carregando ? "..." : `R$ ${custoPatrimonial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          statusText="Patrimônio ativo (Varejo)"
          statusType="gold"
        />
        <StatCard 
          label="Variantes Cadastradas" 
          value={carregando ? "..." : `${itens.length} SKU's`}
          statusText="Divisões por cor e tamanho"
          statusType="alert"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* FORMULÁRIO DE CADASTRO */}
        <div className="bg-white border border-lua-rose-dark/10 p-4 md:p-6 rounded-2xl shadow-xs h-fit">
          <h3 className="font-serif text-lg md:text-xl font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
            Registrar Novo Produto
          </h3>
          
          <form onSubmit={handleCadastrar} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Nome do Pijama</label>
              <input type="text" placeholder="ex: Pijama Americano Satin" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark" required />
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Cor</label>
                <input type="text" placeholder="ex: Rosé" value={cor} onChange={(e) => setCor(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark" required />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Tamanho</label>
                <select value={tamanho} onChange={(e) => setTamanho(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark">
                  <option value="P">P</option>
                  <option value="M">M</option>
                  <option value="G">G</option>
                  <option value="GG">GG</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Preço Varejo (R$)</label>
                <input type="number" step="0.01" placeholder="0.00" value={precoVarejo} onChange={(e) => setPrecoVarejo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark" required />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Preço Atacado (R$)</label>
                <input type="number" step="0.01" placeholder="0.00" value={precoAtacado} onChange={(e) => setPrecoAtacado(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Tag Vitrine</label>
                <input type="text" placeholder="ex: Novo, Mais Vendido" value={tag} onChange={(e) => setTag(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Qtd Inicial</label>
                <input type="number" placeholder="0" value={qtd} onChange={(e) => setQtd(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark" required />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">URL da Imagem</label>
              <input type="url" placeholder="https://link.com/foto.jpg" value={fotoUrl} onChange={(e) => setFotoUrl(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark" />
            </div>

            <Button variant="primary" type="submit" className="w-full mt-2 py-3">
              Salvar no Estoque
            </Button>
          </form>
        </div>

        {/* LISTAGEM E CONTROLE DO ESTOQUE */}
        <div className="lg:col-span-2 bg-white border border-lua-rose-dark/10 p-4 md:p-6 rounded-2xl shadow-xs">
          <h3 className="font-serif text-lg md:text-xl font-bold text-slate-800 mb-4">Produtos Registrados</h3>
          
          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0 pb-2">
            <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
              <thead>
                <tr className="bg-lua-cream border-b border-lua-rose-dark/10 text-slate-500 text-xs uppercase whitespace-nowrap">
                  <th className="p-3">Descrição / Modelo</th>
                  <th className="p-3">Cor</th>
                  <th className="p-3 text-center">Tam</th>
                  <th className="p-3">Varejo</th>
                  <th className="p-3">Atacado</th>
                  <th className="p-3 text-center">Qtd</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carregando ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-sm text-slate-400">
                      Buscando estoque no Supabase...
                    </td>
                  </tr>
                ) : itens.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-sm text-slate-400">
                      Nenhum produto cadastrado no estoque ainda.
                    </td>
                  </tr>
                ) : (
                  itens.map((item) => {
                    const isEditing = editandoId === item.id;
                    
                    return (
                      <tr key={item.id} className={`${isEditing ? 'bg-lua-rose-light/20' : 'hover:bg-slate-50/50'} transition-colors`}>
                        <td className="p-3 flex items-center gap-3">
                          {item.foto_url && (
                            <img src={item.foto_url} alt={item.nome} className="w-8 h-8 md:w-10 md:h-10 rounded-lg object-cover border border-slate-100 shrink-0" />
                          )}
                          <div>
                            <span className="font-serif font-semibold text-slate-800 block text-xs md:text-sm line-clamp-2 min-w-[120px]">{item.nome}</span>
                            {item.tag && <span className="text-[9px] md:text-[10px] bg-lua-rose-light/50 text-lua-rose-dark px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block">{item.tag}</span>}
                          </div>
                        </td>
                        <td className="p-3 text-xs md:text-sm text-slate-500 whitespace-nowrap">{item.cor}</td>
                        <td className="p-3 text-center text-xs md:text-sm font-bold text-lua-rose-dark">{item.tamanho}</td>
                        
                        {/* COLUNAS EDITÁVEIS */}
                        <td className="p-3 whitespace-nowrap">
                          {isEditing ? (
                            <input 
                              type="number" step="0.01"
                              value={editValores.varejo}
                              onChange={(e) => setEditValores({...editValores, varejo: e.target.value})}
                              className="w-20 bg-white border border-lua-rose-dark/30 rounded px-2 py-1 text-sm focus:outline-none"
                            />
                          ) : (
                            <span className="font-medium text-slate-800 text-xs md:text-sm">R$ {Number(item.preco_varejo).toFixed(2)}</span>
                          )}
                        </td>
                        
                        <td className="p-3 whitespace-nowrap">
                          {isEditing ? (
                            <input 
                              type="number" step="0.01"
                              value={editValores.atacado}
                              onChange={(e) => setEditValores({...editValores, atacado: e.target.value})}
                              className="w-20 bg-white border border-lua-rose-dark/30 rounded px-2 py-1 text-sm focus:outline-none"
                            />
                          ) : (
                            <span className="font-medium text-slate-500 text-xs md:text-sm">R$ {Number(item.preco_atacado).toFixed(2)}</span>
                          )}
                        </td>
                        
                        <td className="p-3 text-center">
                          {isEditing ? (
                            <input 
                              type="number"
                              value={editValores.qtd}
                              onChange={(e) => setEditValores({...editValores, qtd: e.target.value})}
                              className="w-16 mx-auto bg-white border border-lua-rose-dark/30 rounded px-2 py-1 text-sm focus:outline-none text-center"
                            />
                          ) : (
                            <span className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                              item.quantidade_estoque <= 3 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-50 text-slate-700 border border-slate-200'
                            }`}>
                              {item.quantidade_estoque}
                            </span>
                          )}
                        </td>
                        
                        {/* AÇÕES (EDITAR / SALVAR) */}
                        <td className="p-3 text-right whitespace-nowrap flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button onClick={() => salvarEdicao(item.id)} className="text-[11px] md:text-xs text-green-700 hover:text-green-800 font-medium cursor-pointer bg-green-50 hover:bg-green-100 px-2 py-1.5 md:px-3 md:py-2 rounded-lg transition-colors border border-green-200">
                                Salvar
                              </button>
                              <button onClick={cancelarEdicao} className="text-[11px] md:text-xs text-slate-600 hover:text-slate-800 font-medium cursor-pointer bg-slate-100 hover:bg-slate-200 px-2 py-1.5 md:px-3 md:py-2 rounded-lg transition-colors border border-slate-200">
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => iniciarEdicao(item)} className="text-[11px] md:text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer bg-blue-50 hover:bg-blue-100 px-2 py-1.5 md:px-3 md:py-2 rounded-lg transition-colors border border-blue-100">
                                Editar
                              </button>
                              <button onClick={() => handleDeletar(item.id)} className="text-[11px] md:text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer bg-rose-50 hover:bg-rose-100 px-2 py-1.5 md:px-3 md:py-2 rounded-lg transition-colors border border-rose-100">
                                Excluir
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}