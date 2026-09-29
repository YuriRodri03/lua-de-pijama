import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import { supabase } from '../services/supabase';

export default function VendasFisicas({ userRole }) {
  // Dados do Banco
  const [produtosEstoque, setProdutosEstoque] = useState([]);
  const [listaClientes, setListaClientes] = useState([]);
  const [equipe, setEquipe] = useState([]); 

  // Identificação do Vendedor Ativo 
  const [vendedorId, setVendedorId] = useState('');

  // Estados da Venda / Carrinho
  const [carrinho, setCarrinho] = useState([]);
  const [quantidade, setQuantidade] = useState(1);
  
  // Autocomplete e Variações de Produtos
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  
  // 🌟 NOVOS ESTADOS SEPARADOS PARA COR E TAMANHO 🌟
  const [corSelecionada, setCorSelecionada] = useState(''); 
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState(''); 
  
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

  const formatarCodigoRef = (id) => {
    if (!id) return '';
    if (Number.isInteger(Number(id))) return `REF-${String(id).padStart(5, '0')}`;
    const numeros = String(id).replace(/\D/g, '');
    if (numeros.length >= 5) return `REF-${numeros.substring(0, 5)}`;
    return `REF-${String(id).substring(0, 5).toUpperCase()}`;
  };

  // 1. CARREGAR DADOS INICIAIS
  async function inicializarPDV() {
    try {
      setCarregando(true);
      
      const { data: { user } } = await supabase.auth.getUser();

      const { data: equipeData } = await supabase
        .from('perfis')
        .select('id, nome')
        .in('role', ['vendedor', 'admin'])
        .order('nome');
      
      setEquipe(equipeData || []);

      if (user && equipeData) {
        const usuarioAtual = equipeData.find(e => e.id === user.id);
        if (usuarioAtual) setVendedorId(usuarioAtual.id);
      }

      const { data: prods, error: prodError } = await supabase
        .from('produtos')
        .select('id, nome, preco_varejo, variacoes, foto_url')
        .order('nome', { ascending: true });

      if (prodError) throw prodError;
      
      const prodsComEstoque = (prods || []).filter(p => {
         const vars = typeof p.variacoes === 'string' ? JSON.parse(p.variacoes) : (p.variacoes || []);
         return vars.some(v => v.quantidade > 0);
      });
      setProdutosEstoque(prodsComEstoque);

      const { data: clis } = await supabase.from('clientes').select('nome, cpf');
      setListaClientes(clis || []);

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

  // 🌟 LÓGICA DAS VARIAÇÕES (EXTRAINDO CORES E TAMANHOS) 🌟
  const variacoesDoProduto = produtoSelecionado 
    ? (typeof produtoSelecionado.variacoes === 'string' ? JSON.parse(produtoSelecionado.variacoes) : (produtoSelecionado.variacoes || []))
    : [];

  const coresDisponiveis = [...new Set(variacoesDoProduto.map(v => v.cor))];
  const tamanhosDaCor = corSelecionada ? variacoesDoProduto.filter(v => v.cor === corSelecionada) : [];

  // Auto-seleciona a cor se o produto só tiver uma
  useEffect(() => {
    if (coresDisponiveis.length === 1 && !corSelecionada) {
      setCorSelecionada(coresDisponiveis[0]);
    }
  }, [coresDisponiveis, corSelecionada]);

  // 2. ADICIONAR ITEM AO CARRINHO
  const handleAdicionarItem = (e) => {
    e.preventDefault();
    if (!produtoSelecionado) {
      alert('Selecione um pijama válido da lista antes de inserir!');
      return;
    }

    if (!corSelecionada || !tamanhoSelecionado) {
      alert('Selecione uma cor e um tamanho!');
      return;
    }

    const varEscolhida = variacoesDoProduto.find(v => v.cor === corSelecionada && v.tamanho === tamanhoSelecionado);
    const qtdDesejada = parseInt(quantidade);

    if (qtdDesejada > varEscolhida.quantidade) {
      alert(`Quantidade indisponível! Limite atual para ${varEscolhida.cor} - ${varEscolhida.tamanho} é: ${varEscolhida.quantidade} peças.`);
      return;
    }

    const precoUnitarioCalculado = Number(produtoSelecionado.preco_varejo) + Number(varEscolhida.preco_adicional || 0);

    const item = {
      idTemp: Date.now(),
      produtoId: produtoSelecionado.id,
      nome: `${produtoSelecionado.nome} | ${varEscolhida.cor} - ${varEscolhida.tamanho}`,
      cor: varEscolhida.cor,
      tamanho: varEscolhida.tamanho,
      quantidade: qtdDesejada,
      precoUnitario: precoUnitarioCalculado,
      totalItem: precoUnitarioCalculado * qtdDesejada,
      codigoRef: formatarCodigoRef(produtoSelecionado.id)
    };

    setCarrinho([...carrinho, item]);
    
    setProdutoSelecionado(null);
    setBuscaProduto('');
    setCorSelecionada('');
    setTamanhoSelecionado('');
    setQuantidade(1);
  };

  const handleRemoverItem = (idTemp) => {
    setCarrinho(carrinho.filter(i => i.idTemp !== idTemp));
  };

  // 3. CÁLCULOS FINANCEIROS
  const subtotalVenda = carrinho.reduce((acc, item) => acc + item.totalItem, 0);
  const totalACobrar = Math.max(0, subtotalVenda - parseFloat(desconto || 0));

  // 4. FILTRAR CLIENTES
  const clientesFiltrados = listaClientes.filter(c => 
    c.nome.toLowerCase().includes(buscaCliente.toLowerCase()) || 
    (c.cpf && c.cpf.includes(buscaCliente))
  );

  const selecionarCliente = (cli) => {
    setClienteSelecionado({ nome: cli.nome, cpf: cli.cpf || '' });
    setBuscaCliente(`${cli.nome} ${cli.cpf ? `(${cli.cpf})` : ''}`);
    setMostrarSugestoes(false);
  };

  // 5. FILTRAR PRODUTOS 
  const produtosFiltrados = produtosEstoque.filter(p => {
    const termoBuscaTratado = buscaProduto.toLowerCase().trim();
    const nomeProduto = p.nome.toLowerCase();
    const codigoProduto = formatarCodigoRef(p.id).toLowerCase();
    const numerosDoCodigo = codigoProduto.replace(/\D/g, ''); 
    const numerosDaBusca = termoBuscaTratado.replace(/\D/g, '');

    return (
      nomeProduto.includes(termoBuscaTratado) || 
      codigoProduto.includes(termoBuscaTratado) ||
      (numerosDaBusca.length > 0 && numerosDoCodigo.includes(numerosDaBusca))
    );
  });

  const selecionarProduto = (prod) => {
    setProdutoSelecionado(prod);
    setBuscaProduto(prod.nome); 
    setCorSelecionada('');
    setTamanhoSelecionado(''); 
    setMostrarSugestoesProd(false);
  };

  // 6. FINALIZAR VENDA INTEGRADA
  const handleFinalizarVenda = async () => {
    if (carrinho.length === 0 || processandoVenda) return;
    if (!vendedorId) {
      alert("Por favor, selecione o Vendedor Responsável por esta venda.");
      return;
    }

    try {
      setProcessandoVenda(true);

      const promessasEstoque = carrinho.map(async (item) => {
        const { data: prodDb } = await supabase
          .from('produtos')
          .select('variacoes')
          .eq('id', item.produtoId)
          .single();

        if (!prodDb?.variacoes) return;

        let vars = typeof prodDb.variacoes === 'string' ? JSON.parse(prodDb.variacoes) : prodDb.variacoes;

        const novasVars = vars.map(v => {
          if (v.cor === item.cor && v.tamanho === item.tamanho) {
             return { ...v, quantidade: Math.max(0, v.quantidade - item.quantidade) };
          }
          return v;
        });

        await supabase.from('produtos').update({ variacoes: novasVars }).eq('id', item.produtoId);
      });

      await Promise.all(promessasEstoque);

      const { error: insertError } = await supabase
        .from('vendas')
        .insert([{
          vendedor_id: vendedorId, 
          cliente_nome: clienteSelecionado.nome,
          cliente_cpf: clienteSelecionado.cpf || null,
          total: totalACobrar,
          tipo_venda: 'pdv',
          forma_pagamento: formaPagamento,
          status_pagamento: 'pago',
          status_entrega: 'entregue', 
          desconto: parseFloat(desconto || 0),
          parcelas: formaPagamento === 'credito' ? parseInt(parcelas) : 1,
          itens: carrinho
        }]);

      if (insertError) throw insertError;

      alert('Venda corporativa finalizada e integrada ao estoque com sucesso!');
      
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

  const getNomeVendedor = (id) => {
    const v = equipe.find(e => e.id === id);
    return v ? v.nome : 'Desconhecido';
  };

  return (
    <div className="space-y-6 md:space-y-8 text-left pb-16 animate-fade-in">
      
      {/* CARD DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {userRole === 'admin' && (
          <StatCard 
            label="Faturamento de Caixa (Hoje)" 
            value={`R$ ${totalVendidoHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
            statusText={`${vendasRealizadas.length} ordens salvas`} 
            statusType="gold" 
          />
        )}
        <StatCard 
          label="Subtotal Atual" 
          value={`R$ ${subtotalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          statusText={`Líquido a receber: R$ ${totalACobrar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          statusType="neutral" 
        />
        
        {/* 🌟 SELEÇÃO DO VENDEDOR RESPONSÁVEL COM TRAVA DE SEGURANÇA 🌟 */}
        <div className={`bg-white border p-4 md:p-5 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden ${userRole !== 'admin' ? 'border-slate-200' : 'border-lua-rose-dark/20'}`}>
          <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${userRole !== 'admin' ? 'bg-slate-300' : 'bg-lua-rose-dark'}`}></div>
          <div className="flex flex-col h-full pl-2">
            <div className="flex items-center justify-between mb-1.5">
               <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">Vendedor Responsável</span>
               {userRole !== 'admin' && <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">Restrito</span>}
            </div>
            <select
              value={vendedorId}
              onChange={(e) => setVendedorId(e.target.value)}
              disabled={userRole !== 'admin'} // TRAVA DE SEGURANÇA AQUI
              className={`w-full bg-slate-50 border rounded-lg px-2 py-1.5 text-sm font-bold focus:outline-none focus:border-lua-rose-dark ${
                userRole !== 'admin' ? 'border-slate-100 text-slate-500 cursor-not-allowed' : 'border-slate-200 text-slate-700'
              }`}
            >
              <option value="" disabled>Selecione quem está vendendo...</option>
              {equipe.map(v => (
                <option key={v.id} value={v.id}>👤 {v.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          
          <div className="bg-white border border-lua-rose-dark/10 p-4 md:p-6 rounded-2xl shadow-xs relative">
            <h3 className="font-serif text-base md:text-lg font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2"><span>👤</span> Identificar Cliente</h3>
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 md:py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark shadow-sm"
              />
              {mostrarSugestoes && buscaCliente && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
                  {clientesFiltrados.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400">Nenhum cliente com esse padrão. Deixe em branco se for venda rápida.</div>
                  ) : (
                    clientesFiltrados.map((c, idx) => (
                      <div 
                        key={idx}
                        onClick={() => selecionarCliente(c)}
                        className="p-3 text-xs md:text-sm text-slate-700 hover:bg-slate-50 cursor-pointer flex justify-between font-medium"
                      >
                        <span>{c.nome}</span>
                        <span className="text-[10px] md:text-xs text-slate-400 font-mono">{c.cpf || 'Sem CPF'}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 ml-1">Cliente Selecionado Atual: <b>{clienteSelecionado.nome}</b></p>
          </div>

          <div className="bg-white border border-lua-rose-dark/10 p-4 md:p-6 rounded-2xl shadow-xs">
            <h3 className="font-serif text-base md:text-lg font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2"><span>🛍️</span> Lançar Pijama</h3>
            <form onSubmit={handleAdicionarItem} className="space-y-4">
              
              <div className="relative">
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1.5">1. Buscar Modelo</label>
                <input 
                  type="text"
                  placeholder="Digite o nome ou código (ex: 150) do pijama..."
                  value={buscaProduto}
                  onChange={(e) => {
                    setBuscaProduto(e.target.value);
                    setMostrarSugestoesProd(true);
                    if (produtoSelecionado) setProdutoSelecionado(null); 
                  }}
                  onFocus={() => setMostrarSugestoesProd(true)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark shadow-sm font-medium placeholder:font-normal"
                  required
                />
                
                {mostrarSugestoesProd && buscaProduto && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
                    {produtosFiltrados.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400">Nenhum modelo em estoque com essa referência.</div>
                    ) : (
                      produtosFiltrados.map((p) => (
                        <div 
                          key={p.id}
                          onClick={() => selecionarProduto(p)}
                          className="p-3 text-xs md:text-sm text-slate-700 hover:bg-slate-50 cursor-pointer flex justify-between items-center font-medium"
                        >
                          <span className="truncate pr-2 flex items-center">
                             <span className="text-[9px] font-mono font-bold text-slate-500 mr-2 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 tracking-widest">{formatarCodigoRef(p.id)}</span>
                             {p.nome}
                          </span>
                          <span className="text-[10px] md:text-xs font-mono font-semibold text-lua-rose-dark shrink-0 bg-lua-rose-light/20 px-2 py-0.5 rounded">
                            R$ {parseFloat(p.preco_varejo).toFixed(2)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {produtoSelecionado && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                     <span className="text-sm font-bold text-slate-800 flex items-center">
                        <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-600 mr-2 border border-slate-300">{formatarCodigoRef(produtoSelecionado.id)}</span>
                        {produtoSelecionado.nome}
                     </span>
                     <span className="text-xs font-mono font-bold text-lua-rose-dark">Base: R$ {parseFloat(produtoSelecionado.preco_varejo).toFixed(2)}</span>
                  </div>
                  
                  {/* 🌟 CASCATA SEPARADA DE COR E TAMANHO 🌟 */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    
                    {/* Seletor de Cor */}
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">2. Cor</label>
                      <select 
                        value={corSelecionada} 
                        onChange={(e) => {
                          setCorSelecionada(e.target.value);
                          setTamanhoSelecionado(''); // Reseta o tamanho ao trocar de cor
                        }} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark shadow-sm"
                        required
                      >
                        <option value="" disabled>Selecione a cor...</option>
                        {coresDisponiveis.map((cor, idx) => (
                          <option key={idx} value={cor}>{cor}</option>
                        ))}
                      </select>
                    </div>

                    {/* Seletor de Tamanho */}
                    <div className="md:col-span-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">3. Tamanho</label>
                      <select 
                        value={tamanhoSelecionado} 
                        onChange={(e) => setTamanhoSelecionado(e.target.value)} 
                        disabled={!corSelecionada}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
                        required
                      >
                        <option value="" disabled>Tamanho...</option>
                        {tamanhosDaCor.map((v, idx) => (
                          <option key={idx} value={v.tamanho} disabled={v.quantidade <= 0}>
                            {v.tamanho} {v.quantidade <= 0 ? '(Esgotado)' : `(${v.quantidade} un)`} {v.preco_adicional > 0 ? ` [+R$ ${v.preco_adicional}]` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Input de Quantidade */}
                    <div className="md:col-span-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">4. Qtd.</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={quantidade} 
                        onChange={(e) => setQuantidade(e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark text-center shadow-sm font-mono" 
                        required 
                      />
                    </div>
                  </div>

                  <Button variant="primary" type="submit" className="w-full py-2.5 mt-2 shadow-sm text-sm">
                    Adicionar à Sacola
                  </Button>
                </div>
              )}
            </form>
          </div>

          <div className="bg-white border border-lua-rose-dark/10 p-4 md:p-6 rounded-2xl shadow-xs">
            <h3 className="font-serif text-base md:text-lg font-bold text-slate-800 mb-3 md:mb-4">Sacola Operacional</h3>
            {carrinho.length === 0 ? (
              <p className="text-[11px] md:text-xs text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-xl">Aguardando inserção de pijamas...</p>
            ) : (
              <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                <table className="w-full text-left text-sm text-slate-600 min-w-[450px]">
                  <thead>
                    <tr className="bg-lua-cream border-b border-lua-rose-dark/10 text-slate-500 text-[10px] md:text-xs uppercase whitespace-nowrap">
                      <th className="p-3">Item e Variação</th>
                      <th className="p-3 text-center">Qtd</th>
                      <th className="p-3 text-right">Valor Un.</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {carrinho.map(item => (
                      <tr key={item.idTemp}>
                        <td className="p-3 font-medium text-slate-800 text-xs md:text-sm max-w-[200px] truncate">
                          <span className="text-[9px] text-slate-400 font-mono tracking-widest mr-1.5">{item.codigoRef}</span>
                          {item.nome}
                        </td>
                        <td className="p-3 text-xs md:text-sm text-center">{item.quantidade}x</td>
                        <td className="p-3 font-mono text-slate-500 text-xs text-right">R$ {item.precoUnitario.toFixed(2)}</td>
                        <td className="p-3 font-mono font-bold text-slate-800 text-xs md:text-sm text-right">R$ {item.totalItem.toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleRemoverItem(item.idTemp)} className="text-[10px] md:text-xs text-rose-500 hover:text-rose-700 font-bold cursor-pointer bg-rose-50 hover:bg-rose-100 px-2 py-1.5 rounded-lg transition-colors border border-rose-100">
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-lua-rose-dark/10 p-4 md:p-6 rounded-2xl shadow-xs flex flex-col justify-between h-fit space-y-5 md:space-y-6">
          <div>
            <h3 className="font-serif text-base md:text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Condições Comerciais</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-2">Forma de Pagamento</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
                  {[{ id: 'pix', label: '⚡ Pix' }, { id: 'credito', label: '💳 Crédito' }, { id: 'debito', label: '💳 Débito' }, { id: 'dinheiro', label: '💵 Dinheiro' }].map((pago) => (
                    <button 
                      key={pago.id} 
                      type="button" 
                      onClick={() => {
                        setFormaPagamento(pago.id);
                        if(pago.id !== 'credito') setParcelas(1);
                      }} 
                      className={`text-[11px] md:text-xs font-semibold py-2.5 px-2 rounded-xl border transition-all text-center cursor-pointer ${formaPagamento === pago.id ? 'border-lua-rose-dark bg-lua-cream text-lua-rose-dark font-bold shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {pago.label}
                    </button>
                  ))}
                </div>
              </div>

              {formaPagamento === 'credito' && (
                <div className="animate-fade-in">
                  <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Parcelas</label>
                  <select
                    value={parcelas}
                    onChange={(e) => setParcelas(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={i+1}>{i+1}x de R$ {(totalACobrar / (i+1)).toFixed(2)}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Aplicar Desconto Fixo (R$)</label>
                <input 
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Ex: 15"
                  value={desconto || ''}
                  onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-lua-rose-dark font-mono"
                />
              </div>

              <div className="bg-lua-cream/50 p-4 rounded-xl border border-lua-rose-dark/10 mt-6 space-y-2">
                <div className="flex justify-between text-[11px] md:text-xs text-slate-500 font-medium">
                  <span>Subtotal:</span>
                  <span className="font-mono">R$ {subtotalVenda.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] md:text-xs text-rose-500 font-medium">
                  <span>Desconto Aplicado:</span>
                  <span className="font-mono">- R$ {parseFloat(desconto || 0).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200/60 my-2 pt-3 flex justify-between items-baseline">
                  <span className="text-[11px] md:text-xs uppercase font-bold text-slate-500">Líquido a Cobrar:</span>
                  <span className="text-xl md:text-2xl font-bold text-slate-800 font-mono">R$ {totalACobrar.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <Button variant="gold" onClick={handleFinalizarVenda} disabled={carrinho.length === 0 || processandoVenda || !vendedorId} className="w-full py-3 md:py-4 text-sm font-bold shadow-md uppercase tracking-wider">
            {processandoVenda ? 'Processando Baixa...' : 'Finalizar Venda 💰'}
          </Button>
        </div>
      </div>

      {!carregando && vendasRealizadas.length > 0 && (
        <div className="bg-white border border-lua-rose-dark/10 p-4 md:p-6 rounded-2xl shadow-xs">
          <h3 className="font-serif text-base md:text-lg font-bold text-slate-800 mb-3 md:mb-4">Últimas Vendas (Caixa de Hoje)</h3>
          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0 pb-2">
            <table className="w-full text-left text-sm text-slate-600 min-w-[600px]">
              <thead>
                <tr className="bg-lua-cream border-b border-lua-rose-dark/10 text-slate-500 text-[10px] md:text-xs uppercase whitespace-nowrap">
                  <th className="p-3">Pedido / Hora</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Pagamento</th>
                  <th className="p-3 text-center">Vendedor</th>
                  <th className="p-3 text-right">Valor Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendasRealizadas.map(venda => (
                  <tr key={venda.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3">
                      <div className="text-xs md:text-sm font-bold text-slate-800 font-mono">#VD-{venda.id.substring(0,5)}</div>
                      {venda.criado_em && (
                        <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                          {new Date(venda.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' })}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-700 text-xs md:text-sm truncate max-w-[150px]">{venda.cliente_nome}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{venda.cliente_cpf || 'Sem CPF'}</div>
                    </td>
                    <td className="p-3 text-[10px] md:text-xs uppercase font-semibold text-lua-rose-dark whitespace-nowrap">
                      {venda.forma_pagamento} {venda.parcelas > 1 ? `(${venda.parcelas}x)` : ''}
                    </td>
                    <td className="p-3 text-[10px] md:text-xs font-semibold text-slate-600 whitespace-nowrap text-center">
                      <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                         {getNomeVendedor(venda.vendedor_id)}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-800 font-mono text-xs md:text-sm whitespace-nowrap">
                      R$ {parseFloat(venda.total).toFixed(2)}
                      {parseFloat(venda.desconto) > 0 && (
                        <div className="text-[9px] md:text-[10px] font-normal text-rose-500">
                          (Desc. R$ {parseFloat(venda.desconto).toFixed(2)})
                        </div>
                      )}
                    </td>
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