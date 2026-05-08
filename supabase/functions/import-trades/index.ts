import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { exchange, apiKey, apiSecret, userId } = await req.json();

    if (!exchange || !apiKey || !apiSecret || !userId) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Заглушка — в реальности вызов API биржи
    const mockTrades = [
      {
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.5,
        price: 65000,
        value_usd: 32500,
        fee: 10,
        timestamp: new Date().toISOString(),
      },
      {
        symbol: 'ETH/USDT',
        side: 'sell',
        amount: 10,
        price: 3200,
        value_usd: 32000,
        fee: 8,
        timestamp: new Date().toISOString(),
      },
      {
        symbol: 'SOL/USDT',
        side: 'buy',
        amount: 200,
        price: 140,
        value_usd: 28000,
        fee: 5,
        timestamp: new Date().toISOString(),
      },
    ];

    let imported = 0;
    for (const trade of mockTrades) {
      const { error } = await supabase.from('trades').insert({
        user_id: userId,
        symbol: trade.symbol,
        side: trade.side,
        amount: trade.amount,
        price: trade.price,
        value_usd: trade.value_usd,
        fee: trade.fee,
        status: 'closed',
        exchange: exchange,
        import_source: exchange,
        timestamp: trade.timestamp,
      });
      if (!error) imported++;
    }

    return new Response(JSON.stringify({ success: true, imported }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
