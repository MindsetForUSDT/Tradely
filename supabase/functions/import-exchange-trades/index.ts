import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { exchange, apiKey, apiSecret, userId } = await req.json();

    if (!exchange || !apiKey || !apiSecret || !userId) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Заглушка — в реальности вызов API биржи
    const trades = [
      {
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        price: 65000,
        timestamp: new Date().toISOString(),
      },
      {
        symbol: 'ETH/USDT',
        side: 'sell',
        amount: 1.5,
        price: 3200,
        timestamp: new Date().toISOString(),
      },
    ];

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    for (const trade of trades) {
      await supabase.from('trades').insert({
        user_id: userId,
        symbol: trade.symbol,
        side: trade.side,
        amount: trade.amount,
        price: trade.price,
        value_usd: trade.amount * trade.price,
        exchange: exchange,
        timestamp: trade.timestamp,
      });
    }

    return new Response(JSON.stringify({ success: true, imported: trades.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
