import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

serve(async (req) => {
  try {
    // 1. Pegar o ID do pedido diretamente da URL que nós mesmos montamos
    const url = new URL(req.url);
    const pedidoId = url.searchParams.get('pedidoId');

    if (!pedidoId) {
      // Se bateram na URL sem o ID do pedido, não foi o nosso sistema.
      // Retornamos 200 só para a InfinitePay parar de tentar enviar lixo.
      return new Response("Nenhum pedido atrelado", { status: 200 })
    }

    // 2. Lemos o que a InfinitePay enviou (opcional, mas bom para os logs do Supabase)
    const payload = await req.json()
    console.log(`WEBHOOK RECEBIDO PARA O PEDIDO ${pedidoId}:`, JSON.stringify(payload))

    // 3. Conectar ao Supabase contornando as regras de segurança
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Atualizar a tabela vendas para 'pago'
    const { error } = await supabaseAdmin
      .from('vendas')
      .update({ status_pagamento: 'pago' })
      .eq('id', pedidoId)

    if (error) {
      console.error("Erro ao atualizar o banco de dados:", error);
      // Retornamos 400 Bad Request. 
      // Como a doc diz: "Se você responder com erro 400, a gente tenta enviar novamente!"
      return new Response("Erro interno ao atualizar banco", { status: 400 })
    }
    
    console.log(`SUCESSO! Pedido ${pedidoId} atualizado para PAGO!`);

    // 5. Tudo certo! Retornamos 200 OK em menos de 1 segundo
    return new Response(JSON.stringify({ received: true }), { status: 200 })

  } catch (error) {
    console.error("Erro fatal no Webhook:", error)
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 400 })
  }
})