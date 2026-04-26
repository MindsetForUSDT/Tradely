// ============================================================
// TradeumDiary — Edge Function для импорта истории сделок
//
// Вызывается Cron-задачей каждые 5 минут.
// Берёт кошельки со статусом 'pending', вызывает API блокчейна,
// декодирует свапы и записывает в таблицу trades.
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// ============================================================
// КОНФИГУРАЦИЯ И КОНСТАНТЫ
// ============================================================

// CORS заголовки
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Маппинг chain → API endpoint для получения транзакций
const CHAIN_APIS: Record<string, string> = {
  ethereum: 'https://api.etherscan.io/api',
  solana: 'https://api.solana.fm/v1',
  polygon: 'https://api.polygonscan.com/api',
  bsc: 'https://api.bscscan.com/api',
  arbitrum: 'https://api.arbiscan.io/api',
  optimism: 'https://api-optimistic.etherscan.io/api',
};

// Известные адреса DEX-роутеров для декодинга свапов
const DEX_ROUTERS: Record<string, string[]> = {
  ethereum: [
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2
    '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3
    '0x1111111254EEB25477B68fb85Ed929f73A960582', // 1inch
  ],
  polygon: [
    '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap
    '0x1111111254EEB25477B68fb85Ed929f73A960582', // 1inch
  ],
  bsc: [
    '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap
    '0x1111111254EEB25477B68fb85Ed929f73A960582', // 1inch
  ],
};

// ============================================================
// ТИПЫ ДАННЫХ
// ============================================================

interface WalletRecord {
  id: string;
  user_id: string;
  address: string;
  chain: string;
  label: string | null;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  last_synced_at: string | null;
}

interface DecodedSwap {
  transaction_hash: string;
  timestamp: string;
  token_in: string;
  token_out: string;
  amount_in: number;
  amount_out: number;
  value_usd: number;
  is_buy: boolean;
}

// ============================================================
// ХЕЛПЕР-ФУНКЦИИ
// ============================================================

/**
 * Декодирование токена из логов транзакции
 * В реальном проекте здесь парсинг ABI и логов событий Swap
 */
function decodeSwapFromLogs(
  tx: any,
  walletAddress: string,
  chain: string
): DecodedSwap | null {
  try {
    // Упрощённая логика декодинга.
    // В production здесь:
    // 1. Анализ transaction.input data (метод swapExactTokensForTokens и т.д.)
    // 2. Парсинг event-логов (Swap, Transfer)
    // 3. Определение token_in, token_out, сумм

    const knownRouters = DEX_ROUTERS[chain] || [];

    // Проверяем, что транзакция взаимодействует с DEX-роутером
    const isSwap = knownRouters.some(
      (router) => tx.to?.toLowerCase() === router.toLowerCase()
    );

    if (!isSwap) return null;

    // Имитация декодинга (в реальности — сложный парсинг)
    return {
      transaction_hash: tx.hash || tx.txHash || '',
      timestamp: new Date(tx.timeStamp * 1000 || Date.now()).toISOString(),
      token_in: 'ETH',   // В реальности из логов
      token_out: 'USDC', // В реальности из логов
      amount_in: parseFloat(tx.value || '0') / 1e18,
      amount_out: parseFloat(tx.value || '0') / 1e18 * 1800, // Пример
      value_usd: parseFloat(tx.value || '0') / 1e18 * 2000,  // Пример
      is_buy: tx.from?.toLowerCase() === walletAddress.toLowerCase(),
    };
  } catch (error) {
    console.error('❌ Ошибка декодинга свапа:', error);
    return null;
  }
}

/**
 * Получение транзакций из Etherscan-совместимого API
 */
async function fetchEtherscanTransactions(
  address: string,
  chain: string,
  apiKey: string
): Promise<any[]> {
  const baseUrl = CHAIN_APIS[chain];
  if (!baseUrl) throw new Error(`Нет API для chain: ${chain}`);

  const url = new URL(baseUrl);
  url.searchParams.set('module', 'account');
  url.searchParams.set('action', 'txlist');
  url.searchParams.set('address', address);
  url.searchParams.set('startblock', '0');
  url.searchParams.set('endblock', '99999999');
  url.searchParams.set('page', '1');
  url.searchParams.set('offset', '100');
  url.searchParams.set('sort', 'desc');
  url.searchParams.set('apikey', apiKey);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();

  if (data.status !== '1' && data.message !== 'No transactions found') {
    throw new Error(`API Error: ${data.message || 'Unknown error'}`);
  }

  return data.result || [];
}

/**
 * Получение транзакций из SolanaFM API
 */
async function fetchSolanaTransactions(
  address: string,
  apiKey: string
): Promise<any[]> {
  const url = `https://api.solana.fm/v1/addresses/${address}/transactions?limit=100`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`SolanaFM HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.results || data.transactions || [];
}

/**
 * Расчёт хеша для дедупликации
 */
function hashTrade(trade: Omit<DecodedSwap, 'transaction_hash'> & { transaction_hash: string }): string {
  // Возвращаем transaction_hash как есть — уникальность гарантируется constraint'ом в БД
  return trade.transaction_hash;
}

// ============================================================
// ОСНОВНОЙ ОБРАБОТЧИК
// ============================================================

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Только POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Проверяем секретный токен Cron
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');

    if (!cronSecret) {
      console.error('❌ CRON_SECRET не настроен');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Инициализируем Supabase с Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // API ключи для блокчейн-эксплореров
    const etherscanApiKey = Deno.env.get('ETHERSCAN_API_KEY') || '';
    const solanaFmApiKey = Deno.env.get('SOLANA_FM_API_KEY') || '';

    console.log('🚀 Запуск обработки очереди кошельков...');

    // Получаем кошельки со статусом 'pending'
    const { data: pendingWallets, error: fetchError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('processing_status', 'pending')
      .order('added_at', { ascending: true })
      .limit(10); // Обрабатываем до 10 кошельков за раз

    if (fetchError) {
      console.error('❌ Ошибка получения очереди:', fetchError.message);
      return new Response(JSON.stringify({ error: 'Failed to fetch queue' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!pendingWallets || pendingWallets.length === 0) {
      console.log('✅ Очередь пуста, нечего обрабатывать');
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📋 Найдено ${pendingWallets.length} кошельков в очереди`);

    let totalProcessed = 0;
    let totalTrades = 0;
    let totalErrors = 0;

    // Обрабатываем каждый кошелёк
    for (const wallet of pendingWallets as WalletRecord[]) {
      console.log(`⏳ Обработка кошелька ${wallet.address} (${wallet.chain})...`);

      // Обновляем статус на 'processing'
      await supabaseAdmin
        .from('wallets')
        .update({ processing_status: 'processing' })
        .eq('id', wallet.id);

      try {
        // Получаем транзакции в зависимости от сети
        let transactions: any[];

        if (wallet.chain === 'solana') {
          transactions = await fetchSolanaTransactions(wallet.address, solanaFmApiKey);
        } else {
          // Все EVM-совместимые сети
          transactions = await fetchEtherscanTransactions(wallet.address, wallet.chain, etherscanApiKey);
        }

        console.log(`📊 Получено ${transactions.length} транзакций`);

        // Декодируем свапы
        const swaps: DecodedSwap[] = [];

        for (const tx of transactions) {
          const swap = decodeSwapFromLogs(tx, wallet.address, wallet.chain);
          if (swap) {
            swaps.push(swap);
          }
        }

        console.log(`🔄 Декодировано ${swaps.length} свапов`);

        // Записываем сделки в БД
        if (swaps.length > 0) {
          const tradesToInsert = swaps.map((swap) => ({
            wallet_id: wallet.id,
            user_id: wallet.user_id,
            transaction_hash: swap.transaction_hash,
            timestamp: swap.timestamp,
            token_in: swap.token_in,
            token_out: swap.token_out,
            amount_in: swap.amount_in,
            amount_out: swap.amount_out,
            value_usd: swap.value_usd,
            is_buy: swap.is_buy,
          }));

          // Используем upsert для обработки дубликатов
          const { error: insertError, count } = await supabaseAdmin
            .from('trades')
            .upsert(tradesToInsert, {
              onConflict: 'user_id, transaction_hash',
              ignoreDuplicates: true,
            });

          if (insertError) {
            console.error(`❌ Ошибка записи сделок:`, insertError.message);
            throw insertError;
          }

          totalTrades += count || tradesToInsert.length;
        }

        // Обновляем статус на 'completed'
        await supabaseAdmin
          .from('wallets')
          .update({
            processing_status: 'completed',
            last_synced_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', wallet.id);

        totalProcessed++;
        console.log(`✅ Кошелёк ${wallet.address} обработан`);
      } catch (error) {
        totalErrors++;
        console.error(`❌ Ошибка обработки кошелька ${wallet.address}:`, error);

        // Обновляем статус на 'failed'
        await supabaseAdmin
          .from('wallets')
          .update({
            processing_status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', wallet.id);
      }

      // Небольшая задержка между запросами к API (rate limiting)
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`🎉 Обработка завершена. Успешно: ${totalProcessed}, ошибок: ${totalErrors}, сделок: ${totalTrades}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        errors: totalErrors,
        trades: totalTrades,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});