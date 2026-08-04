import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Tratamento de CORS (obrigatório para chamadas do navegador)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pedidoId, itens } = await req.json()

    // CORRIGIDO: Voltando para 'price', pois a InfinitePay exige exatamente isso!
    const itemsList = itens.map((item: any) => ({
        id: item.id.toString(),
        description: item.nome,
        price: Math.round(item.preco_varejo * 100), // R$ 10,00 vira 1000
        quantity: item.quantidade
    }));

    // Captura a URL base do seu projeto Supabase automaticamente
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

    // Mantemos o metadata e reference_id que estão corretos para identificar o pedido
    const payload = {
      handle: "yuri-rodrigues07",
      reference_id: pedidoId.toString(), 
      metadata: {
        pedido_id: pedidoId.toString() 
      },
      items: itemsList,
      // INCLUÍDO: URL do Webhook com o parâmetro do pedido
      webhook_url: `${supabaseUrl}/functions/v1/webhook-infinitepay?pedidoId=${pedidoId}`
    }

    // Chamar a API da InfinitePay
    const ipResponse = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await ipResponse.json()

    if (!ipResponse.ok) {
       console.error("ERRO DA INFINITEPAY:", data);
       throw new Error(JSON.stringify(data));
    }

    // Retornar a URL de pagamento para o site
    return new Response(
      JSON.stringify({ checkoutUrl: data.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})