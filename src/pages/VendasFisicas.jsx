import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import { supabase } from '../services/supabase';

export default function VendasFisicas({ userRole }) {
  // Dados do Banco
  const [produtosEstoque, setProdutosEstoque] = useState([]);
  const [listaClientes, setListaClientes] = useState([]);

  // Identificação do Vendedor Ativo (Exibe o Nome)
  const [vendedorNome, setVendedorNome] = useState('Bypass Admin');

  // Estados da Venda / Carrinho
  const [carrinho, setCarrinho] = useState([]);
  const [tamanho, setTamanho] = useState('M');
  const [quantidade, setQuantidade] = useState(1);
  
  // Autocomplete de Produtos
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [mostrarSugestoesProd, setMostrarSugestoesProd] = useState(false);

  // Pagamento e Condições
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [parcelas, setParcelas] = useState(1);
  const [desconto, setDesconto] = useState(0);

  // Identificação do Cliente (Autocomplete)
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState({ nome: 'Cliente Balcão (PDV)', cpf: '' });
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  // Histórico
  const [vendasRealizadas, setVendasRealizadas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [processandoVenda, setProcessandoVenda] = useState(false);

  // 1. CARREGAR PRODUTOS, CLIENTES E IDENTIFICAR OPERADOR DO CAIXA (PELO NOME)
  async function inicializarPDV() {
    try {
      setCarregando(true);
      
      // Captura o usuário autenticado de fato no Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Tenta buscar o nome salvo nos metadados ou extrai o início do e-mail
        const nomeIdentificado = user.user_metadata?.nome 
          || user.user_metadata?.full_name 
          || (user.email ? user.email.split('@')[0] : 'Operador');
        
        setVendedorNome(nomeIdentificado);
      } else {
        setVendedorNome('Bypass Admin');
      }

      // Puxa produtos direto do estoque real (apenas colunas existentes)
      const { data: prods, error: prodError } = await supabase
        .from('produtos')
        .select('id, nome, preco_varejo, quantidade_estoque')
        .gt('quantidade_estoque', 0)
        .order('nome', { ascending: true });

      if (prodError) throw prodError;
      setProdutosEstoque(prods || []);

      // Puxa clientes para o autocomplete
      const { data: clis } = await supabase
        .from('clientes')
        .select('nome, cpf');
      setListaClientes(clis || []);

      // Histórico de vendas do dia
      const hojeInicio = new Date();
      hojeInicio.setHours(0,0,0,0);
      const { data: vnds } = await supabase
        .from('vendas')
        .select('*')
        .eq('tipo_venda', 'pdv')
        .gte('criado_em', hojeInicio.toISOString())
        .order('criado_em', { ascending: false });
      setVendasRealizadas(vnds || []);

    } catch (error) {
      console.error('Erro ao inicializar PDV:', error.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    inicializarPDV();
  }, []);

  // 2. ADICIONAR ITEM AO CARRINHO (Conectado com o estoque)
  const handleAdicionarItem = (e) => {
    e.preventDefault();
    if (!produtoSelecionado) {
      alert('Selecione um pijama válido da lista antes de inserir!');
      return;
    }

    if (parseInt(quantidade) > produtoSelecionado.quantidade_estoque) {
      alert(`Quantidade indisponível no estoque! Limite atual: ${produtoSelecionado.quantidade_estoque} peças.`);
      return;
    }

    const item = {
      idTemp: Date.now(),
      produtoId: produtoSelecionado.id,
      nome: produtoSelecionado.nome,
      tamanho,
      quantidade: parseInt(quantidade),
      precoUnitario: parseFloat(produtoSelecionado.preco_varejo),
      totalItem: parseFloat(produtoSelecionado.preco_varejo) * parseInt(quantidade)
    };

    setCarrinho([...carrinho, item]);
    
    // Reseta autocomplete de produto
    setProdutoSelecionado(null);
    setBuscaProduto('');
    setQuantidade(1);
  };

  const handleRemoverItem = (idTemp) => {
    setCarrinho(carrinho.filter(i => i.idTemp !== idTemp));
  };

  // 3. CÁLCULOS FINANCEIROS SÍNCRONOS
  const subtotalVenda = carrinho.reduce((acc, item) => acc + item.totalItem, 0);
  const totalACobrar = Math.max(0, subtotalVenda - parseFloat(desconto || 0));

  // 4. FILTRAR CLIENTES (AUTOCOMPLETE)
  const clientesFiltrados = listaClientes.filter(c => 
    c.nome.toLowerCase().includes(buscaCliente.toLowerCase()) || 
    (c.cpf && c.cpf.includes(buscaCliente))
  );

  const selecionarCliente = (cli) => {
    setClienteSelecionado({ nome: cli.nome, cpf: cli.cpf || '' });
    setBuscaCliente(`${cli.nome} ${cli.cpf ? `(${cli.cpf})` : ''}`);
    setMostrarSugestoes(false);
  };

  // 5. FILTRAR PRODUTOS (AUTOCOMPLETE)
  const produtosFiltrados = produtosEstoque.filter(p =>
    p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
  );

  const selecionarProduto = (prod) => {
    setProdutoSelecionado(prod);
    setBuscaProduto(prod.nome); // Mostra apenas o nome limpo no input
    setMostrarSugestoesProd(false);
  };

  // 6. FINALIZAR VENDA INTEGRADA
  const handleFinalizarVenda = async () => {
    if (carrinho.length === 0 || processandoVenda) return;

    try {
      setProcessandoVenda(true);

      // Passo A: Abater dinamicamente do estoque real
      for (const item of carrinho) {
        const { data: prodAtual } = await supabase
          .from('produtos')
          .select('quantidade_estoque')
          .eq('id', item.produtoId)
          .single();

        const novoEstoque = (prodAtual?.quantidade_estoque || 0) - item.quantidade;

        const { error: updateError } = await supabase
          .from('produtos')
          .update({ quantidade_estoque: novoEstoque })
          .eq('id', item.produtoId);

        if (updateError) throw updateError;
      }

      // Passo B: Persistir cabeçalho na tabela 'vendas' com o nome do vendedor correto
      const { error: insertError } = await supabase
        .from('vendas')
        .insert([{
          vendedor_id: vendedorNome,
          cliente_nome: clienteSelecionado.nome,
          cliente_cpf: clienteSelecionado.cpf || null,
          total: totalACobrar,
          tipo_venda: 'pdv',
          desconto: parseFloat(desconto || 0),
          parcelas: formaPagamento === 'credito' ? parseInt(parcelas) : 1,
          itens: carrinho
        }]);

      if (insertError) throw insertError;

      alert('Venda corporativa finalizada e integrada ao estoque com sucesso!');
      
      // Reseta PDV
      setCarrinho([]);
      setDesconto(0);
      setParcelas(1);
      setBuscaCliente('');
      setClienteSelecionado({ nome: 'Cliente Balcão (PDV)', cpf: '' });
      setProdutoSelecionado(null);
      setBuscaProduto('');
      
      inicializarPDV(); 
    } catch (error) {
      console.error('Falha na transação:', error.message);
      alert(`Erro na operação de caixa: ${error.message}`);
    } finally {
      setProcessandoVenda(false);
    }
  };

  const totalVendidoHoje = vendasRealizadas.reduce((acc, v) => acc + parseFloat(v.total), 0);

  return (
    <div className="space-y-8 text-left">
      
      {/* CARD DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {userRole === 'admin' && (
          <StatCard 
            label="Faturamento de Caixa (Hoje)" 
            value={`R$ ${totalVendidoHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
            statusText={`${vendasRealizadas.length} ordens salvas no banco`} 
            statusType="gold" 
          />
        )}
        <StatCard 
          label="Subtotal Atual" 
          value={`R$ ${subtotalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          statusText={`Líquido a receber: R$ ${totalACobrar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          statusType="neutral" 
        />
        <StatCard 
          label="Operador do Caixa" 
          value={vendedorNome} 
          statusText={`Sessão Operacional Ativa`} 
          statusType="alert" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ENTRADA DE ITENS E CLIENTE */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AUTOCOMPLETE DE CLIENTES */}
          <div className="bg-white border border-lua-rose-dark/10 p-6 rounded-2xl shadow-xs relative">
            <h3 className="font-serif text-lg font-bold text-slate-800 mb-4">Identificar Cliente</h3>
            <div className="relative">
              <input 
                type="text"
                placeholder="Digite o Nome ou CPF para autocompletar..."
                value={buscaCliente}
                onChange={(e) => {
                  setBuscaCliente(e.target.value);
                  setMostrarSugestoes(true);
                }}
                onFocus={() => setMostrarSugestoes(true)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark"
              />
              {mostrarSugestoes && buscaCliente && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
                  {clientesFiltrados.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400">Nenhum cliente cadastrado com esse padrão.</div>
                  ) : (
                    clientesFiltrados.map((c, idx) => (
                      <div 
                        key={idx}
                        onClick={() => selecionarCliente(c)}
                        className="p-3 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer flex justify-between font-medium"
                      >
                        <span>👤 {c.nome}</span>
                        <span className="text-xs text-slate-400 font-mono">{c.cpf || 'Sem CPF'}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* REGISTRAR PRODUTO */}
          <div className="bg-white border border-lua-rose-dark/10 p-6 rounded-2xl shadow-xs">
            <h3 className="font-serif text-lg font-bold text-slate-800 mb-4">Registrar Pijama</h3>
            <form onSubmit={handleAdicionarItem} className="space-y-4">
              
              {/* Seção do Input de Busca + Dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                <div className="sm:col-span-12 relative">
                  <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Buscar Pijama no Estoque</label>
                  <input 
                    type="text"
                    placeholder="Busque pelo nome do pijama..."
                    value={buscaProduto}
                    onChange={(e) => {
                      setBuscaProduto(e.target.value);
                      setMostrarSugestoesProd(true);
                      if (produtoSelecionado) setProdutoSelecionado(null); 
                    }}
                    onFocus={() => setMostrarSugestoesProd(true)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark h-9.5"
                    required
                  />
                  
                  {/* Menu de sugestões de produtos flutuante (Com z-index alto para flutuar de verdade) */}
                  {mostrarSugestoesProd && buscaProduto && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
                      {produtosFiltrados.length === 0 ? (
                        <div className="p-3 text-xs text-slate-400">Nenhum modelo em estoque com esse nome.</div>
                      ) : (
                        produtosFiltrados.map((p) => (
                          <div 
                            key={p.id}
                            onClick={() => selecionarProduto(p)}
                            className="p-3 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer flex justify-between font-medium"
                          >
                            <span>👕 {p.nome}</span>
                            <span className="text-xs font-mono font-semibold text-lua-rose-dark">
                              R$ {parseFloat(p.preco_varejo).toFixed(2)} ({p.quantidade_estoque} un)
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-painel de Detalhes + Campos adicionais (Tamanho, Qtd, Inserir) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-2">
                
                {/* Painel Informativo Dinâmico (Agora inline, empurra os componentes de forma fluida) */}
                <div className="sm:col-span-5 h-9.5 flex items-center">
                  {produtoSelecionado ? (
                    <div className="w-full flex items-center justify-around text-xs bg-lua-cream/40 border border-lua-rose-dark/10 text-lua-rose-dark px-3 py-2 rounded-xl font-medium animate-fade-in shadow-xs">
                      <span>💵 Preço: <strong>R$ {parseFloat(produtoSelecionado.preco_varejo).toFixed(2)}</strong></span>
                      <span className="text-slate-200">|</span>
                      <span>📦 Estoque: <strong>{produtoSelecionado.quantidade_estoque} un</strong></span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Pesquise e selecione um modelo acima.</span>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <select value={tamanho} onChange={(e) => setTamanho(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark h-9.5">
                    <option value="P">P</option>
                    <option value="M">M</option>
                    <option value="G">G</option>
                    <option value="GG">GG</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <input type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark h-9.5" required />
                </div>

                <div className="sm:col-span-3">
                  <Button variant="primary" type="submit" className="w-full h-9.5">+ Inserir Item</Button>
                </div>
              </div>

            </form>
          </div>

          {/* TABELA DE ITENS DA VENDA */}
          <div className="bg-white border border-lua-rose-dark/10 p-6 rounded-2xl shadow-xs">
            <h3 className="font-serif text-lg font-bold text-slate-800 mb-4">Sacola Operacional</h3>
            {carrinho.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Aguardando inserção de pijamas...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead>
                    <tr className="bg-lua-cream border-b border-lua-rose-dark/10 text-slate-500 text-xs uppercase">
                      <th className="p-3">Item</th>
                      <th className="p-3">Tam</th>
                      <th className="p-3">Qtd</th>
                      <th className="p-3">Valor</th>
                      <th className="p-3 text-right">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {carrinho.map(item => (
                      <tr key={item.idTemp}>
                        <td className="p-3 font-medium text-slate-800">{item.nome}</td>
                        <td className="p-3 text-xs font-bold text-lua-rose-dark">{item.tamanho}</td>
                        <td className="p-3">{item.quantidade}x</td>
                        <td className="p-3 font-semibold text-slate-800">R$ {item.totalItem.toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleRemoverItem(item.idTemp)} className="text-xs text-rose-500 hover:underline font-bold cursor-pointer">❌</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* PROCESSO DE FECHAMENTO */}
        <div className="bg-white border border-lua-rose-dark/10 p-6 rounded-2xl shadow-xs flex flex-col justify-between h-fit space-y-6">
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Condições Comerciais</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-2">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ id: 'pix', label: '⚡ Pix' }, { id: 'credito', label: '💳 Crédito' }, { id: 'debito', label: '💳 Débito' }, { id: 'dinheiro', label: '💵 Dinheiro' }].map((pago) => (
                    <button 
                      key={pago.id} 
                      type="button" 
                      onClick={() => {
                        setFormaPagamento(pago.id);
                        if(pago.id !== 'credito') setParcelas(1);
                      }} 
                      className={`text-xs font-semibold py-2.5 px-2 rounded-xl border transition-all text-center cursor-pointer ${formaPagamento === pago.id ? 'border-lua-rose-dark bg-lua-cream text-lua-rose-dark font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {pago.label}
                    </button>
                  ))}
                </div>
              </div>

              {formaPagamento === 'credito' && (
                <div className="animate-fade-in">
                  <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Parcelas do Cartão</label>
                  <select
                    value={parcelas}
                    onChange={(e) => setParcelas(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={i+1}>{i+1}x de R$ {(totalACobrar / (i+1)).toFixed(2)} sem juros</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Aplicar Desconto (R$)</label>
                <input 
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Ex: 15"
                  value={desconto || ''}
                  onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark font-mono"
                />
              </div>

              <div className="bg-lua-cream/50 p-4 rounded-xl border border-lua-rose-dark/10 mt-6 space-y-1">
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>Subtotal:</span>
                  <span>R$ {subtotalVenda.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-rose-500 font-medium">
                  <span>Desconto:</span>
                  <span>- R$ {parseFloat(desconto || 0).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200/60 my-2 pt-2 flex justify-between items-baseline">
                  <span className="text-xs uppercase font-bold text-slate-500">Líquido:</span>
                  <span className="text-2xl font-bold text-slate-800 font-mono">R$ {totalACobrar.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <Button variant="gold" onClick={handleFinalizarVenda} disabled={carrinho.length === 0 || processandoVenda} className="w-full py-3 text-sm font-bold shadow-md">
            {processandoVenda ? 'Processando...' : 'Concluir Registro'}
          </Button>
        </div>
      </div>

      {/* HISTÓRICO ATUALIZADO */}
      {!carregando && vendasRealizadas.length > 0 && (
        <div className="bg-white border border-lua-rose-dark/10 p-6 rounded-2xl shadow-xs">
          <h3 className="font-serif text-lg font-bold text-slate-800 mb-4">Últimas Vendas Sincronizadas (Hoje)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="bg-lua-cream border-b border-lua-rose-dark/10 text-slate-500 text-xs uppercase">
                  <th className="p-3">ID</th>
                  <th className="p-3">Cliente / CPF</th>
                  <th className="p-3">Condição</th>
                  <th className="p-3">Vendedor</th>
                  <th className="p-3">Desc.</th>
                  <th className="p-3 text-right">Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendasRealizadas.map(venda => (
                  <tr key={venda.id} className="hover:bg-slate-50/20">
                    <td className="p-3 font-bold text-slate-800">#VD-{venda.id}</td>
                    <td className="p-3">
                      <div className="font-medium text-slate-700">{venda.cliente_nome}</div>
                      <div className="text-xs text-slate-400 font-mono">{venda.cliente_cpf || 'Sem CPF'}</div>
                    </td>
                    <td className="p-3 text-xs uppercase font-semibold text-lua-rose-dark">
                      {venda.forma_pagamento} {venda.parcelas > 1 ? `(${venda.parcelas}x)` : ''}
                    </td>
                    <td className="p-3 text-xs font-semibold text-slate-600">
                      👤 {venda.vendedor_id || 'Não Informado'}
                    </td>
                    <td className="p-3 text-xs font-mono text-rose-500">R$ {parseFloat(venda.desconto || 0).toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-slate-800 font-mono">R$ {parseFloat(venda.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}