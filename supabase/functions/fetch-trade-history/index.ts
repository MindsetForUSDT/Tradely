import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PendingWallet {
  id: string;
  user_id: string;
  address: string;
  chain: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Получаем кошельки в очереди
    const { data: wallets, error: walletError } = await supabase
      .from('wallets')
      .select('id, user_id, address, chain')
      .eq('processing_status', 'pending')
      .limit(5);

    if (walletError || !wallets?.length) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let imported = 0;

    for (const wallet of wallets as PendingWallet[]) {
      // Помечаем "в обработке"
      await supabase
        .from('wallets')
        .update({ processing_status: 'processing' })
        .eq('id', wallet.id);

      try {
        // Эмулируем импорт (в реальности — вызов Etherscan/Solana API)
        const mockTrades = [
          {
            symbol: 'ETH/USDT',
            side: 'buy',
            amount: 1.5,
            price: 3200,
            value_usd: 4800,
            timestamp: new Date().toISOString(),
          },
          {
            symbol: 'ETH/USDT',
            side: 'sell',
            amount: 1.5,
            price: 3400,
            value_usd: 5100,
            timestamp: new Date().toISOString(),
          },
        ];

        for (const trade of mockTrades) {
          // Проверка на дубликат
          const { data: existing } = await supabase
            .from('trades')
            .select('id')
            .eq('user_id', wallet.user_id)
            .eq('symbol', trade.symbol)
            .eq('side', trade.side)
            .eq('amount', trade.amount)
            .eq('price', trade.price)
            .limit(1);

          if (existing?.length) continue; // Пропускаем дубликат

          const { error: insertError } = await supabase.from('trades').insert({
            user_id: wallet.user_id,
            wallet_id: wallet.id,
            symbol: trade.symbol,
            side: trade.side,
            amount: trade.amount,
            price: trade.price,
            value_usd: trade.value_usd,
            fee: 0,
            status: 'closed',
            exchange: 'blockchain',
            timestamp: trade.timestamp,
          });

          if (!insertError) imported++;
        }

        await supabase
          .from('wallets')
          .update({
            processing_status: 'completed',
            last_synced_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', wallet.id);
      } catch (e: any) {
        await supabase
          .from('wallets')
          .update({
            processing_status: 'failed',
            error_message: e.message,
          })
          .eq('id', wallet.id);
      }
    }

    return new Response(JSON.stringify({ success: true, processed: wallets.length, imported }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
