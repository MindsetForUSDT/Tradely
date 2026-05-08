import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount, currency } = await req.json();

    const shopId = Deno.env.get('YOOKASSA_SHOP_ID') ?? '';
    const secretKey = Deno.env.get('YOOKASSA_SECRET_KEY') ?? '';

    const auth = btoa(`${shopId}:${secretKey}`);

    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
        'Idempotence-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        amount: { value: amount, currency },
        confirmation: {
          type: 'redirect',
          return_url: 'https://tradeumdiary-vzbp.onrender.com/dashboard',
        },
        description: 'PRO-подписка TradeumDiary на 1 месяц',
        capture: true,
      }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
