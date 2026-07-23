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

  // Métricas financeiras ajustadas para o preço de varejo como valor base patrimonial
  const totalPecas = itens.reduce((acc, curr) => acc + (curr.quantidade_estoque || 0), 0);
  const custoPatrimonial = itens.reduce((acc, curr) => acc + ((curr.preco_varejo || 0) * (curr.quantidade_estoque || 0)), 0);

  return (
    <div className="space-y-8">
      
      {/* Resumo do Estoque */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard 
          label="Total de Peças em Estoque" 
          value={carregando ? "..." : `${totalPecas} unidades`}
          statusText="Disponíveis para venda física/online"
          statusType="neutral"
        />
        <StatCard 
          label="Valor de Venda do Estoque" 
          value={carregando ? "..." : `R$ ${custoPatrimonial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          statusText="Patrimônio ativo estimado (Varejo)"
          statusType="gold"
        />
        <StatCard 
          label="Variantes Cadastradas" 
          value={carregando ? "..." : `${itens.length} SKU's`}
          statusText="Divisões por cor e tamanho"
          statusType="alert"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORMULÁRIO DE CADASTRO */}
        <div className="bg-white border border-lua-rose-dark/10 p-6 rounded-2xl shadow-xs h-fit">
          <h3 className="font-serif text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
            Registrar Novo Produto
          </h3>
          
          <form onSubmit={handleCadastrar} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Nome do Pijama</label>
              <input type="text" placeholder="ex: Pijama Americano Satin" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Cor</label>
                <input type="text" placeholder="ex: Rosé Queimado" value={cor} onChange={(e) => setCor(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark" required />
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Preço Varejo (R$)</label>
                <input type="number" step="0.01" placeholder="0.00" value={precoVarejo} onChange={(e) => setPrecoVarejo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark" required />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Preço Atacado (R$)</label>
                <input type="number" step="0.01" placeholder="0.00" value={precoAtacado} onChange={(e) => setPrecoAtacado(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">URL da Imagem do Produto</label>
              <input type="url" placeholder="https://link-da-imagem.com/foto.jpg" value={fotoUrl} onChange={(e) => setFotoUrl(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark" />
            </div>

            <Button variant="primary" type="submit" className="w-full mt-2">
              Salvar no Estoque
            </Button>
          </form>
        </div>

        {/* LISTAGEM E CONTROLE DO ESTOQUE */}
        <div className="lg:col-span-2 bg-white border border-lua-rose-dark/10 p-6 rounded-2xl shadow-xs">
          <h3 className="font-serif text-lg font-bold text-slate-800 mb-4">Produtos Registrados</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="bg-lua-cream border-b border-lua-rose-dark/10 text-slate-500 text-xs uppercase">
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
                  itens.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 flex items-center gap-3">
                        {item.foto_url && (
                          <img src={item.foto_url} alt={item.nome} className="w-8 h-8 rounded-lg object-cover border border-slate-100" />
                        )}
                        <div>
                          <span className="font-serif font-semibold text-slate-800 block">{item.nome}</span>
                          {item.tag && <span className="text-[10px] bg-lua-rose-light/50 text-lua-rose-dark px-1.5 py-0.2 rounded font-medium">{item.tag}</span>}
                        </div>
                      </td>
                      <td className="p-3 text-xs text-slate-500">{item.cor}</td>
                      <td className="p-3 text-center text-xs font-bold text-lua-rose-dark">{item.tamanho}</td>
                      <td className="p-3 font-medium text-slate-800">R$ {Number(item.preco_varejo).toFixed(2)}</td>
                      <td className="p-3 font-medium text-slate-505">R$ {Number(item.preco_atacado).toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                          item.quantidade_estoque <= 3 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-50 text-slate-700'
                        }`}>
                          {item.quantidade_estoque}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => handleDeletar(item.id)} className="text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer">
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

    </div>
  );
}