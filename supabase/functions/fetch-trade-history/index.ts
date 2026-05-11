// supabase/functions/fetch-trade-history/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FetchRequest {
  walletId: string; // ID кошелька для обработки
  priority?: 'high' | 'low'; // Приоритет обработки
  forceFullSync?: boolean; // Игнорировать last_processed_block
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({
          error: 'Server configuration error: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Парсим входящий запрос
    let body: FetchRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { walletId, priority = 'low', forceFullSync = false } = body;

    if (!walletId) {
      return new Response(JSON.stringify({ error: 'walletId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Получаем данные кошелька
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: 'Wallet not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Проверяем, не обрабатывается ли уже
    if (wallet.processing_status === 'processing') {
      return new Response(
        JSON.stringify({
          error: 'Wallet is already being processed',
          walletId,
          status: 'processing',
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Обновляем статус на processing
    const { error: updateError } = await supabase
      .from('wallets')
      .update({
        processing_status: 'processing',
        error_message: null,
      })
      .eq('id', walletId);

    if (updateError) {
      throw new Error(`Failed to update wallet status: ${updateError.message}`);
    }

    // Определяем диапазон блоков
    const fromBlock = forceFullSync ? 0 : Math.max(0, (wallet.last_processed_block || 0) - 100); // 100 блоков оверлапа для безопасности

    // Здесь должен быть реальный вызов к блокчейну
    // В текущей версии — структурированные моки с разными данными
    const trades = generateMockTradesForWallet(wallet);

    let imported = 0;
    let errors = 0;

    // Вставляем сделки с дедупликацией
    for (const trade of trades) {
      const { error: insertError } = await supabase.from('trades').upsert(
        {
          user_id: wallet.user_id,
          wallet_id: wallet.id,
          symbol: trade.symbol,
          side: trade.side,
          amount: trade.amount,
          price: trade.price,
          value_usd: trade.value_usd,
          fee: trade.fee,
          fee_token: trade.fee_token,
          status: 'closed',
          exchange: 'blockchain',
          chain: wallet.chain,
          tx_hash: trade.tx_hash,
          block_number: trade.block_number,
          timestamp: trade.timestamp,
        },
        {
          onConflict: 'tx_hash',
          ignoreDuplicates: true,
        }
      );

      if (insertError) {
        errors++;
        console.error(`Failed to insert trade ${trade.tx_hash}:`, insertError.message);
      } else {
        imported++;
      }
    }

    // Обновляем статус кошелька
    const { error: finalUpdateError } = await supabase
      .from('wallets')
      .update({
        processing_status: 'completed',
        last_synced_at: new Date().toISOString(),
        last_processed_block:
          trades.length > 0
            ? Math.max(...trades.map((t) => t.block_number))
            : wallet.last_processed_block,
        error_message: errors > 0 ? `Imported ${imported} trades, ${errors} errors` : null,
      })
      .eq('id', walletId);

    if (finalUpdateError) {
      console.error('Failed to update final wallet status:', finalUpdateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        walletId,
        imported,
        errors,
        totalProcessed: trades.length,
        chain: wallet.chain,
        lastBlock: wallet.last_processed_block,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (e: any) {
    console.error('fetch-trade-history error:', e.message);

    // В случае ошибки сбрасываем статус кошелька
    try {
      const { walletId } = await req.json().catch(() => ({ walletId: null }));
      if (walletId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        await supabase
          .from('wallets')
          .update({
            processing_status: 'failed',
            error_message: e.message,
          })
          .eq('id', walletId);
      }
    } catch {
      // Игнорируем ошибки при обработке ошибки
    }

    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Генератор тестовых данных (заглушка до интеграции с реальным блокчейном)
 */
function generateMockTradesForWallet(wallet: any) {
  const baseBlock = wallet.last_processed_block || 19000000;
  const now = new Date();

  // Разные моки для разных сетей
  const tokenPairs =
    wallet.chain === 'ethereum'
      ? [
          {
            symbol: 'ETH/USDC',
            basePrice: 3200,
            pair: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
          },
          {
            symbol: 'WBTC/USDC',
            basePrice: 65000,
            pair: '0x99ac8ca7087fa4a2a1fb6357269965a2014abc35',
          },
          { symbol: 'UNI/USDC', basePrice: 12, pair: '0xd3d2e2692501a5c9ca623199d38826e513033a17' },
        ]
      : wallet.chain === 'bsc'
        ? [
            {
              symbol: 'BNB/USDT',
              basePrice: 580,
              pair: '0x16b9a82891338f9ba80e2d6970fdda79d1eb0dae',
            },
            {
              symbol: 'CAKE/USDT',
              basePrice: 3,
              pair: '0x0ed7e52944161450477ee417de9cd3a859b14fd0',
            },
          ]
        : [
            {
              symbol: 'SOL/USDC',
              basePrice: 140,
              pair: '0x8b6e6e7b5b2c4e9a9e9c9d9e9f9a9b9c9d9e9f9a',
            },
          ];

  return tokenPairs.flatMap((pair, pairIndex) => {
    const trades = [];
    const blocks = [
      baseBlock + pairIndex * 100 + 1,
      baseBlock + pairIndex * 100 + 2,
      baseBlock + pairIndex * 100 + 3,
    ];

    for (let i = 0; i < 3; i++) {
      const isBuy = Math.random() > 0.5;
      const priceVariation = pair.basePrice * (1 + (Math.random() - 0.5) * 0.1);
      const amount = +(Math.random() * 2).toFixed(4);
      const feeEth = +(0.001 + Math.random() * 0.01).toFixed(6);

      trades.push({
        symbol: pair.symbol,
        side: isBuy ? 'buy' : 'sell',
        amount,
        price: +priceVariation.toFixed(2),
        value_usd: +(amount * priceVariation).toFixed(2),
        fee: feeEth,
        fee_token: wallet.chain === 'ethereum' ? 'ETH' : wallet.chain === 'bsc' ? 'BNB' : 'SOL',
        tx_hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        block_number: blocks[i] + Math.floor(Math.random() * 50),
        timestamp: new Date(now.getTime() - (3 - i) * 3600000).toISOString(),
      });
    }

    return trades;
  });
}
