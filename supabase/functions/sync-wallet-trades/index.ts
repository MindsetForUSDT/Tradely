// supabase/functions/sync-wallet-trades/index.ts
// Edge Function для синхронизации сделок с биржами
// Интеграция с ExchangeAdapter, аудитом безопасности и детекцией аномалий

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { ExchangeFactory, ExchangeConfig } from '../lib/exchange-adapter.ts';
import { getSecurityAuditor } from '../lib/security-audit.ts';
import { AnomalyDetector } from '../lib/anomaly-detector.ts';
import { RateLimiter, RateLimitPresets } from '../lib/rate-limiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

interface SyncRequest {
  walletId: string;
  userId?: string;
  forceFullSync?: boolean;
  startDate?: string; // ISO 8601
}

/**
 * Расшифровка API ключей
 */
async function decryptCredentials(
  encryptedData: string,
  iv: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ apiKey: string; apiSecret: string }> {
  const response = await fetch(`${supabaseUrl}/functions/v1/decrypt-credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ encrypted_data: encryptedData, iv }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Decryption failed' }));
    throw new Error(error.error || 'Failed to decrypt credentials');
  }

  return await response.json();
}

serve(async (req: Request) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const clientIp = req.headers.get('X-Forwarded-For')?.split(',')[0] || 'unknown';

    const supabase = createClient(supabaseUrl, supabaseKey);
    const auditor = getSecurityAuditor(supabaseUrl, supabaseKey);
    const anomalyDetector = new AnomalyDetector({}, supabaseUrl, supabaseKey);
    const rateLimiter = new RateLimiter(RateLimitPresets.write, supabaseUrl, supabaseKey);

    // Проверка авторизации
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.split(' ')[1];
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      await auditor.logAuthFailure(req, 'invalid_token', 1, undefined);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(user.id, requestId);
    if (!rateLimitResult.allowed) {
      await auditor.logRateLimitExceeded(
        req,
        user.id,
        rateLimitResult.remaining,
        rateLimitResult.reset
      );
      return new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            ...rateLimiter.getRateLimitHeaders(rateLimitResult),
          },
        }
      );
    }

    // Парсинг запроса
    let body: SyncRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { walletId, forceFullSync = false, startDate } = body;

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
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      await auditor.logEvent('DATA_ACCESS', req, { walletId, error: 'not_found' }, user.id);
      return new Response(JSON.stringify({ error: 'Wallet not found or access denied' }), {
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

    // Обновляем статус
    await supabase
      .from('wallets')
      .update({
        processing_status: 'processing',
        error_message: null,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', walletId);

    await auditor.logEvent(
      'ENCRYPTION_OPERATION',
      req,
      {
        action: 'start_trade_sync',
        walletId,
        exchange: wallet.cex_provider,
      },
      user.id
    );

    // Расшифровка ключей
    let apiKey: string, apiSecret: string;
    try {
      const credentials = await decryptCredentials(
        wallet.encrypted_credentials!,
        wallet.credentials_iv!,
        supabaseUrl,
        supabaseKey
      );
      apiKey = credentials.apiKey;
      apiSecret = credentials.apiSecret;
    } catch (error: any) {
      await auditor.logDecryptionOperation(req, user.id, false, error.message);
      await supabase
        .from('wallets')
        .update({
          processing_status: 'failed',
          error_message: 'Failed to decrypt credentials: ' + error.message,
        })
        .eq('id', walletId);

      return new Response(JSON.stringify({ error: 'Failed to decrypt credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await auditor.logDecryptionOperation(req, user.id, true);

    // Создаём экземпляр биржи
    let exchange;
    try {
      const exchangeConfig: ExchangeConfig = {
        exchangeId: wallet.cex_provider!,
        apiKey,
        secret: apiSecret,
      };

      exchange = ExchangeFactory.create(exchangeConfig);
    } catch (error: any) {
      await supabase
        .from('wallets')
        .update({
          processing_status: 'failed',
          error_message: 'Unsupported exchange: ' + error.message,
        })
        .eq('id', walletId);

      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Проверка подключения
    const connectionTest = await exchange.testConnection();
    if (!connectionTest.success) {
      await auditor.logEvent(
        'ERROR',
        req,
        {
          action: 'connection_test_failed',
          walletId,
          error: connectionTest.error,
        },
        user.id
      );

      await supabase
        .from('wallets')
        .update({
          processing_status: 'failed',
          error_message: 'Connection failed: ' + connectionTest.error,
        })
        .eq('id', walletId);

      return new Response(
        JSON.stringify({
          error: connectionTest.error,
          message: connectionTest.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Получаем историю сделок
    let trades;
    try {
      const since = startDate
        ? new Date(startDate).getTime()
        : wallet.last_synced_at
          ? new Date(wallet.last_synced_at).getTime()
          : Date.now() - 30 * 24 * 60 * 60 * 1000; // Последние 30 дней по умолчанию

      trades = await exchange.fetchTrades(since, 1000);
    } catch (error: any) {
      await auditor.logEvent(
        'ERROR',
        req,
        {
          action: 'fetch_trades_failed',
          walletId,
          error: error.message,
        },
        user.id
      );

      await supabase
        .from('wallets')
        .update({
          processing_status: 'failed',
          error_message: 'Failed to fetch trades: ' + error.message,
        })
        .eq('id', walletId);

      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Импорт сделок в БД с дедупликацией
    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    for (const trade of trades) {
      const tradeData = {
        user_id: user.id,
        wallet_id: walletId,
        symbol: trade.symbol,
        side: trade.side,
        amount: trade.amount,
        price: trade.price,
        value_usd: trade.cost,
        fee: trade.fee,
        fee_currency: trade.feeCurrency,
        status: 'closed',
        exchange: wallet.cex_provider,
        timestamp: trade.timestamp,
        import_source: 'api',
        transaction_hash: trade.id, // trade_id как transaction_hash
      };

      const { data: existing, error: checkError } = await supabase
        .from('trades')
        .select('id')
        .eq('user_id', user.id)
        .eq('transaction_hash', trade.id)
        .maybeSingle();

      if (checkError) {
        errors++;
        console.error(`Error checking trade ${trade.id}:`, checkError);
        continue;
      }

      if (existing) {
        duplicates++;
        continue;
      }

      const { error: insertError } = await supabase.from('trades').insert(tradeData);

      if (insertError) {
        errors++;
        console.error(`Failed to insert trade ${trade.id}:`, insertError);
      } else {
        imported++;
      }
    }

    // Обновляем статус кошелька
    await supabase
      .from('wallets')
      .update({
        processing_status: imported > 0 ? 'completed' : 'completed',
        last_synced_at: new Date().toISOString(),
        error_message:
          errors > 0 ? `${imported} imported, ${duplicates} duplicates, ${errors} errors` : null,
      })
      .eq('id', walletId);

    const responseTime = Date.now() - startTime;

    // Логирование успеха
    await auditor.logEvent(
      'ENCRYPTION_OPERATION',
      req,
      {
        action: 'trade_sync_complete',
        walletId,
        imported,
        duplicates,
        errors,
        responseTime,
      },
      user.id
    );

    // Проверка на аномалии
    const anomalies = await anomalyDetector.checkAllAnomalies(
      user.id,
      clientIp,
      0,
      0,
      1,
      new Date()
    );

    if (anomalies.length > 0) {
      await auditor.logEvent(
        'SUSPICIOUS_ACTIVITY',
        req,
        {
          walletId,
          anomalies: anomalies.map((a) => a.type),
        },
        user.id
      );
    }

    // Логирование запроса
    await fetch(`${supabaseUrl}/rest/v1/api_requests`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id,
        endpoint: 'sync-wallet-trades',
        method: req.method,
        status_code: 200,
        response_time_ms: responseTime,
        ip_address: clientIp,
        metadata: { walletId, imported, anomalies: anomalies.length },
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        walletId,
        imported,
        duplicates,
        errors,
        totalProcessed: trades.length,
        message:
          imported > 0
            ? `Imported ${imported} new trades (${duplicates} duplicates skipped)`
            : 'No new trades found',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          ...rateLimiter.getRateLimitHeaders(rateLimitResult),
        },
      }
    );
  } catch (error: any) {
    console.error('[sync-wallet-trades] Error:', error);

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
          error_message: error.message,
        })
        .eq('id', walletId);
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
