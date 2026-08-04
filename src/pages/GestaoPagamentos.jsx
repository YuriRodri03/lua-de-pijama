import React, { useState, useEffect, useCallback } from 'react';
import Button from '../components/Button';
import { supabase } from '../services/supabase';

export default function GestaoPagamentos() {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Estados do Formulário (Removemos a api_key que não é mais necessária)
  const [config, setConfig] = useState({
    infinitepay_merchant_id: '', // Vamos usar essa coluna do banco para salvar sua InfiniteTag!
    modo_teste: true,
    taxa_pix: 0,
    taxa_debito: 0,
    taxa_credito: 0
  });

  // 1. BUSCAR CONFIGURAÇÕES ATUAIS
  const buscarConfiguracoes = useCallback(async () => {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('config_pagamentos')
        .select('*')
        .eq('id', 1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; 
      
      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    buscarConfiguracoes();
  }, [buscarConfiguracoes]);

  // 2. ATUALIZAR ESTADO LOCAL
  const handleChange = (campo, valor) => {
    setConfig(prev => ({ ...prev, [campo]: valor }));
  };

  // 3. SALVAR NO BANCO DE DADOS
  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      setSalvando(true);
      
      const { error } = await supabase
        .from('config_pagamentos')
        .upsert({
          id: 1, 
          infinitepay_merchant_id: config.infinitepay_merchant_id, // Aqui ficará salva a InfiniteTag
          modo_teste: config.modo_teste,
          taxa_pix: parseFloat(config.taxa_pix) || 0,
          taxa_debito: parseFloat(config.taxa_debito) || 0,
          taxa_credito: parseFloat(config.taxa_credito) || 0,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error.message);
      alert('Falha ao salvar as configurações.');
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return <div className="p-8 text-center text-slate-500 font-medium">Carregando painel de integração...</div>;
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-16 animate-fade-in text-left max-w-4xl mx-auto">
      
      {/* CABEÇALHO */}
      <div className="bg-white border border-slate-200/70 p-6 md:p-8 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span className="text-3xl">♾️</span> Integração InfinitePay
          </h2>
          <p className="text-sm text-slate-500 mt-1">Configure sua InfiniteTag e as taxas para cálculo de lucros.</p>
        </div>
      </div>

      <form onSubmit={handleSalvar} className="space-y-6 md:space-y-8">
        
        {/* CREDENCIAIS */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-6 md:p-8 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-3">Identificação da Loja</h3>
          
          <div className="max-w-md">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Sua InfiniteTag (Sem o $)</label>
            <input 
              type="text"
              placeholder="Ex: yuri-rodrigues07"
              value={config.infinitepay_merchant_id || ''}
              onChange={(e) => handleChange('infinitepay_merchant_id', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-lua-rose-dark/20 focus:border-lua-rose-dark transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-2">Esta é a tag que identifica sua conta para gerar os links de pagamento.</p>
          </div>
        </div>

        {/* TABELA DE TAXAS */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-6 md:p-8 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-3">Tabela de Taxas (%)</h3>
          <p className="text-xs text-slate-500 mb-6">Ajuste os percentuais cobrados pela adquirente para que o ERP calcule o lucro real das vendas.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Taxa Pix */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5 mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Pix
              </label>
              <div className="relative">
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.taxa_pix}
                  onChange={(e) => handleChange('taxa_pix', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
            </div>

            {/* Taxa Débito */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label className="text-xs font-bold uppercase tracking-wider text-sky-600 flex items-center gap-1.5 mb-2">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span> Débito
              </label>
              <div className="relative">
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.taxa_debito}
                  onChange={(e) => handleChange('taxa_debito', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
            </div>

            {/* Taxa Crédito */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5 mb-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Crédito (À vista)
              </label>
              <div className="relative">
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.taxa_credito}
                  onChange={(e) => handleChange('taxa_credito', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="flex justify-end pt-4">
          <Button 
            variant="primary" 
            type="submit" 
            disabled={salvando}
            className="px-8 py-3 font-semibold shadow-md cursor-pointer bg-lua-rose-dark text-white rounded-xl"
          >
            {salvando ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </form>
    </div>
  );
}