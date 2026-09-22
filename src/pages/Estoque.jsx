import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import { supabase } from '../services/supabase';

export default function Estoque() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  // -------------------------------------------------------------------
  // ESTADOS DO FORMULÁRIO (PRODUTO BASE)
  // -------------------------------------------------------------------
  const [nome, setNome] = useState('');
  const [precoVarejo, setPrecoVarejo] = useState('');
  const [precoAtacado, setPrecoAtacado] = useState('');
  const [fotoArquivo, setFotoArquivo] = useState(null);
  const [tag, setTag] = useState('Novidade');

  // -------------------------------------------------------------------
  // ESTADOS DO GERENCIADOR DE VARIAÇÕES (COR, TAMANHO, QTD)
  // -------------------------------------------------------------------
  const [variacoesInput, setVariacoesInput] = useState([]);
  const [novaCor, setNovaCor] = useState('');
  const [novoTamanho, setNovoTamanho] = useState('M');
  const [novaQtd, setNovaQtd] = useState('');

  // 1. BUSCAR PRODUTOS DO BANCO DE DADOS
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

  // GERENCIAR LISTA DE VARIAÇÕES (Localmente, antes de enviar pro banco)
  const adicionarVariacao = () => {
    if (!novaCor.trim() || !novoTamanho || !novaQtd) {
      alert("Preencha Cor, Tamanho e Quantidade para adicionar a variação.");
      return;
    }

    setVariacoesInput([
      ...variacoesInput,
      { 
        id_local: Date.now().toString(), // ID temporário pro React listar certinho
        cor: novaCor.trim(), 
        tamanho: novoTamanho, 
        quantidade: parseInt(novaQtd, 10) || 0 
      }
    ]);

    // Limpa os campos de variação para facilitar a próxima adição
    setNovaCor('');
    setNovaQtd('');
  };

  const removerVariacao = (idLocalToRemove) => {
    setVariacoesInput(variacoesInput.filter(v => v.id_local !== idLocalToRemove));
  };

  // 2. SALVAR TUDO NO BANCO DE DADOS (Produto Base + Array de Variações JSONB)
  const handleCadastrar = async (e) => {
    e.preventDefault();

    if (variacoesInput.length === 0) {
      alert("Adicione pelo menos uma variação (cor/tamanho) para este produto.");
      return;
    }

    setSalvando(true);
    let urlImagemFinal = null;

    try {
      // Faz o upload da foto se existir
      if (fotoArquivo) {
        const extensao = fotoArquivo.name.split('.').pop();
        const nomeArquivo = `${Date.now()}.${extensao}`;
        const caminhoArquivo = `produtos/${nomeArquivo}`;

        const { error: uploadError } = await supabase.storage
          .from('produtos')
          .upload(caminhoArquivo, fotoArquivo);

        if (uploadError) throw uploadError;

        const { data: linkData } = supabase.storage
          .from('produtos')
          .getPublicUrl(caminhoArquivo);

        urlImagemFinal = linkData.publicUrl;
      }

      // Prepara o array de variações limpando o ID temporário
      const variacoesLimpasParaOBanco = variacoesInput.map(({ cor, tamanho, quantidade }) => ({
        cor, tamanho, quantidade
      }));

      // Monta o objeto final do produto
      const novoProduto = {
        nome,
        preco_varejo: parseFloat(precoVarejo) || 0,
        preco_atacado: parseFloat(precoAtacado) || 0,
        foto_url: urlImagemFinal,
        tag,
        variacoes: variacoesLimpasParaOBanco // Salvando tudo na coluna JSONB
      };

      // Envia pro Supabase
      const { data, error } = await supabase
        .from('produtos')
        .insert([novoProduto])
        .select();

      if (error) throw error;

      if (data) {
        // Atualiza a tela instantaneamente
        setItens([data[0], ...itens]);
        
        // Reseta o formulário
        setNome('');
        setPrecoVarejo('');
        setPrecoAtacado('');
        setTag('Novidade');
        setVariacoesInput([]);
        setFotoArquivo(null);
        document.getElementById('input-foto').value = '';
        
        alert('Produto com variações registrado sucesso!');
      }
    } catch (error) {
      console.error('Erro ao cadastrar produto:', error.message);
      alert('Erro ao salvar o produto no banco de dados.');
    } finally {
      setSalvando(false);
    }
  };

  // 3. DELETAR PRODUTO E SUAS VARIAÇÕES (Também apaga a foto do Storage)
  const handleDeletar = async (id) => {
    if (confirm("Tem certeza que deseja remover este produto e TODAS as suas variações?")) {
      try {
        const produto = itens.find(item => item.id === id);

        if (produto && produto.foto_url) {
          const urlSemFiltro = produto.foto_url.split('?')[0]; 
          const caminhoDoArquivo = urlSemFiltro.split('/public/produtos/')[1];
          if (caminhoDoArquivo) {
            await supabase.storage.from('produtos').remove([caminhoDoArquivo]);
          }
        }

        const { error } = await supabase.from('produtos').delete().eq('id', id);
        if (error) throw error;
        
        setItens(itens.filter(item => item.id !== id));
      } catch (error) {
        alert('Não foi possível remover o produto do estoque.');
      }
    }
  };

  // 4. CÁLCULO DE MÉTRICAS (Lendo dentro do JSONB)
  const calcularTotalEstoqueProduto = (variacoes) => {
    if (!variacoes) return 0;
    // Garante que é um array para evitar erros
    const arr = typeof variacoes === 'string' ? JSON.parse(variacoes) : variacoes;
    if (!Array.isArray(arr)) return 0;
    
    return arr.reduce((acc, v) => acc + (v.quantidade || 0), 0);
  };

  const totalPecas = itens.reduce((acc, curr) => acc + calcularTotalEstoqueProduto(curr.variacoes), 0);
  const custoPatrimonial = itens.reduce((acc, curr) => acc + ((curr.preco_varejo || 0) * calcularTotalEstoqueProduto(curr.variacoes)), 0);

  return (
    <div className="space-y-6 md:space-y-8 pb-16 animate-fade-in">
      
      {/* ----------------- CARDS DE RESUMO ----------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        <StatCard 
          label="Total de Peças" 
          value={carregando ? "..." : `${totalPecas} unidades`}
          statusText="Em todas as variações"
          statusType="neutral"
        />
        <StatCard 
          label="Valor de Venda" 
          value={carregando ? "..." : `R$ ${custoPatrimonial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          statusText="Patrimônio ativo (Varejo)"
          statusType="gold"
        />
        <StatCard 
          label="Produtos Únicos" 
          value={carregando ? "..." : `${itens.length} Modelos`}
          statusText="Agrupando variações"
          statusType="alert"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* ----------------- FORMULÁRIO DE CADASTRO ----------------- */}
        <div className="bg-white border border-lua-rose-dark/10 p-4 md:p-6 rounded-2xl shadow-xs h-fit">
          <h3 className="font-serif text-lg md:text-xl font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
            Registrar Novo Produto
          </h3>
          
          <form onSubmit={handleCadastrar} className="space-y-4">
            
            {/* DADOS GERAIS DO PRODUTO BASE */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span>📦</span> Dados Base
              </h4>
              
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Nome do Modelo</label>
                <input type="text" placeholder="ex: Pijama Americano Satin" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark transition-colors" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Preço Varejo (R$)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={precoVarejo} onChange={(e) => setPrecoVarejo(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark transition-colors" required />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Preço Atacado (R$)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={precoAtacado} onChange={(e) => setPrecoAtacado(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark transition-colors" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Tag Vitrine</label>
                  <input type="text" placeholder="ex: Novo" value={tag} onChange={(e) => setTag(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Foto Principal</label>
                  <input id="input-foto" type="file" accept="image/*" onChange={(e) => setFotoArquivo(e.target.files[0])} className="w-full text-xs mt-1" />
                </div>
              </div>
            </div>

            {/* GERENCIADOR DE VARIAÇÕES (COR E TAMANHO) */}
            <div className="p-4 border border-lua-rose-dark/30 bg-lua-rose-light/10 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-lua-rose-dark uppercase tracking-wider mb-2 flex items-center gap-2">
                <span>✨</span> Variações e Estoque
              </h4>
              
              {/* Inputs para nova variação */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Cor</label>
                  <input type="text" placeholder="ex: Rosé" value={novaCor} onChange={(e) => setNovaCor(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-lua-rose-dark" />
                </div>
                <div className="w-20">
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Tam</label>
                  <select value={novoTamanho} onChange={(e) => setNovoTamanho(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-lua-rose-dark">
                    <option value="P">P</option>
                    <option value="M">M</option>
                    <option value="G">G</option>
                    <option value="GG">GG</option>
                  </select>
                </div>
                <div className="w-20">
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Qtd</label>
                  <input type="number" placeholder="0" value={novaQtd} onChange={(e) => setNovaQtd(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-lua-rose-dark" />
                </div>
                <button type="button" onClick={adicionarVariacao} className="bg-lua-rose-dark text-white h-[38px] px-4 rounded-lg text-lg font-bold hover:bg-lua-rose transition-colors shadow-sm">+</button>
              </div>

              {/* Lista das variações adicionadas */}
              {variacoesInput.length > 0 && (
                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                  {variacoesInput.map((v) => (
                    <div key={v.id_local} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-200 text-sm shadow-xs">
                      <span className="font-medium text-slate-700">
                        {v.cor} <span className="text-slate-400 mx-1">•</span> Tam {v.tamanho}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-xs font-bold text-slate-600">{v.quantidade} un</span>
                        <button type="button" onClick={() => removerVariacao(v.id_local)} className="text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 w-6 h-6 rounded-md flex items-center justify-center transition-colors">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button variant="primary" type="submit" disabled={salvando} className="w-full mt-4 py-3 disabled:opacity-70 text-sm">
              {salvando ? '⏳ Salvando produto e variações...' : 'Cadastrar Produto Completo'}
            </Button>
          </form>
        </div>

        {/* ----------------- LISTAGEM DO ESTOQUE ----------------- */}
        <div className="lg:col-span-2 bg-white border border-lua-rose-dark/10 p-4 md:p-6 rounded-2xl shadow-xs">
          <h3 className="font-serif text-lg md:text-xl font-bold text-slate-800 mb-4">Catálogo e Variações</h3>
          
          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0 pb-2">
            <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
              <thead>
                <tr className="bg-lua-cream border-b border-lua-rose-dark/10 text-slate-500 text-xs uppercase whitespace-nowrap">
                  <th className="p-3 rounded-tl-lg">Produto Base</th>
                  <th className="p-3">Preços (Varejo / Atacado)</th>
                  <th className="p-3">Variações e Estoque</th>
                  <th className="p-3 text-right rounded-tr-lg">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carregando ? (
                  <tr><td colSpan="4" className="p-8 text-center text-sm text-slate-400">Buscando catálogo no banco de dados...</td></tr>
                ) : itens.length === 0 ? (
                  <tr><td colSpan="4" className="p-8 text-center text-sm text-slate-400">Nenhum produto cadastrado no momento.</td></tr>
                ) : (
                  itens.map((item) => {
                    // Proteção para ler o JSONB corretamente
                    let variacoesDoItem = [];
                    try {
                       variacoesDoItem = typeof item.variacoes === 'string' ? JSON.parse(item.variacoes) : (item.variacoes || []);
                    } catch(e) { console.error(e) }

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors align-top group">
                        
                        {/* COLUNA: FOTO E NOME */}
                        <td className="p-3 flex gap-3">
                          {item.foto_url ? (
                            <img src={item.foto_url} alt={item.nome} className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 text-xl">📦</div>
                          )}
                          <div className="flex flex-col justify-center">
                            <span className="font-serif font-semibold text-slate-800 block text-sm leading-tight max-w-[180px]">{item.nome}</span>
                            <span className="text-xs text-slate-500 font-medium mt-1">Estoque Total: <b className="text-slate-700">{calcularTotalEstoqueProduto(variacoesDoItem)}</b></span>
                          </div>
                        </td>
                        
                        {/* COLUNA: PREÇOS */}
                        <td className="p-3 text-xs whitespace-nowrap align-middle">
                           <div className="font-bold text-slate-800 text-sm">R$ {Number(item.preco_varejo).toFixed(2)}</div>
                           <div className="text-slate-400 font-medium mt-0.5">R$ {Number(item.preco_atacado).toFixed(2)}</div>
                        </td>
                        
                        {/* COLUNA: CHIPS DE VARIAÇÕES */}
                        <td className="p-3 align-middle">
                           <div className="flex flex-wrap gap-1.5">
                             {variacoesDoItem.length === 0 ? <span className="text-[10px] text-rose-400 italic bg-rose-50 px-2 py-1 rounded">Sem variações cadastradas</span> : null}
                             
                             {variacoesDoItem.map((v, i) => (
                               <span key={i} className={`text-[10px] px-2 py-1 rounded-md border flex items-center gap-1.5 shadow-xs ${
                                 v.quantidade <= 2 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-700'
                               }`}>
                                 <span className="font-medium">{v.cor}</span> 
                                 <span className="font-bold border-l border-slate-300/50 pl-1">{v.tamanho}</span>
                                 <span className={`ml-0.5 px-1.5 rounded-sm ${v.quantidade <= 2 ? 'bg-rose-200 text-rose-900' : 'bg-slate-100'}`}>{v.quantidade}</span>
                               </span>
                             ))}
                           </div>
                        </td>
                        
                        {/* COLUNA: AÇÕES */}
                        <td className="p-3 text-right whitespace-nowrap align-middle">
                          <button onClick={() => handleDeletar(item.id)} className="text-[11px] md:text-xs text-rose-500 hover:text-white font-medium cursor-pointer bg-rose-50 hover:bg-rose-500 px-3 py-2 rounded-lg transition-all border border-rose-100 hover:border-rose-500">
                            Excluir
                          </button>
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