// supabase/functions/test-exchange-connection/index.ts
// Edge Function для тестирования подключения к бирже

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ============================================
// Вспомогательные функции для HMAC подписи
// ============================================

async function createHMACSHA256Signature(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================
// Binance API тестирование
// ============================================

interface BinanceBalance {
  [key: string]: number;
}

async function testBinanceConnection(
  apiKey: string,
  apiSecret: string
): Promise<{ success: boolean; message: string; balances?: BinanceBalance; error?: string }> {
  try {
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const signature = await createHMACSHA256Signature(query, apiSecret);

    const response = await fetch(
      `https://api.binance.com/api/v3/account?${query}&signature=${signature}`,
      {
        headers: {
          'X-MBX-APIKEY': apiKey,
        },
      }
    );

    if (response.status === 401) {
      return {
        success: false,
        message: 'Ошибка авторизации',
        error: 'Неверный API ключ или секрет',
      };
    }

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        message: 'Ошибка подключения',
        error: error,
      };
    }

    const data = await response.json();

    // Получаем баланс
    const balances: BinanceBalance = {};
    if (data.balances) {
      data.balances.forEach((b: any) => {
        const free = parseFloat(b.free) || 0;
        const locked = parseFloat(b.locked) || 0;
        if (free > 0 || locked > 0) {
          balances[b.asset] = free + locked;
        }
      });
    }

    return {
      success: true,
      message: 'Подключение успешно',
      balances,
    };
  } catch (error: any) {
    console.error('[Binance] Error:', error);
    return {
      success: false,
      message: 'Ошибка подключения',
      error: error.message,
    };
  }
}

// ============================================
// Bybit API тестирование
// ============================================

interface BybitBalance {
  [key: string]: number;
}

async function testBybitConnection(
  apiKey: string,
  apiSecret: string
): Promise<{ success: boolean; message: string; balances?: BybitBalance; error?: string }> {
  try {
    const timestamp = Date.now().toString();
    const recvWindow = '5000';

    const params = `api_key=${apiKey}&recv_window=${recvWindow}&sign_timestamp=${timestamp}`;
    const signature = await createHMACSHA256Signature(params, apiSecret);

    console.log('[Bybit] Testing connection with timestamp:', timestamp);

    const response = await fetch(
      'https://api.bybit.com/v5/account/wallet-balance?accountType=UNIFIED',
      {
        method: 'GET',
        headers: {
          'X-BAPI-API-KEY': apiKey,
          'X-BAPI-SIGN': signature,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow,
        },
      }
    );

    console.log('[Bybit] Response status:', response.status);

    const responseText = await response.text();
    console.log('[Bybit] Response body:', responseText);

    try {
      const data = JSON.parse(responseText);

      if (data.retCode && data.retCode !== 0) {
        console.log('[Bybit] API error code:', data.retCode, 'message:', data.retMsg);

        if (data.retCode === 10001 || data.retCode === 10020 || data.retCode === 10021) {
          return {
            success: false,
            message: 'Ошибка авторизации',
            error:
              'Неверный API ключ или секрет. Проверьте что ключи созданы на Bybit, а не на Binance.',
          };
        }

        return {
          success: false,
          message: 'Ошибка API Bybit',
          error: `${data.retMsg || responseText}`,
        };
      }

      // Получаем баланс
      const balances: BybitBalance = {};
      if (data.result && data.result.list) {
        data.result.list.forEach((account: any) => {
          if (account.coin) {
            account.coin.forEach((coin: any) => {
              const walletBalance = parseFloat(coin.walletBalance || '0');
              if (walletBalance > 0) {
                balances[coin.coin] = walletBalance;
              }
            });
          }
        });
      }

      return {
        success: true,
        message: 'Подключение успешно',
        balances,
      };
    } catch (parseError) {
      console.log('[Bybit] JSON parse error:', parseError);
      return {
        success: false,
        message: 'Ошибка парсинга ответа',
        error: responseText,
      };
    }
  } catch (error: any) {
    console.error('[Bybit] Error:', error);
    return {
      success: false,
      message: 'Ошибка подключения',
      error: error.message,
    };
  }
}

// ============================================
// Фабрика тестирования
// ============================================

interface ExchangeConfig {
  exchangeId: string;
  apiKey: string;
  secret: string;
}

async function testConnection(config: ExchangeConfig): Promise<{
  success: boolean;
  message: string;
  balances?: any;
  error?: string;
}> {
  switch (config.exchangeId) {
    case 'binance':
      return testBinanceConnection(config.apiKey, config.secret);
    case 'bybit':
      return testBybitConnection(config.apiKey, config.secret);
    default:
      return {
        success: false,
        message: 'Биржа не поддерживается',
        error: `Exchange "${config.exchangeId}" пока не поддерживается. Поддерживаются: binance, bybit`,
      };
  }
}

// ============================================
// CORS заголовки
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// Основной обработчик
// ============================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Проверка авторизации
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Парсинг запроса
    let body: { exchange: string; api_key: string; api_secret: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { exchange, api_key, api_secret } = body;

    if (!exchange || !api_key || !api_secret) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: exchange, api_key, api_secret',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Тестирование подключения к бирже
    const exchangeConfig: ExchangeConfig = {
      exchangeId: exchange,
      apiKey: api_key,
      secret: api_secret,
    };

    const result = await testConnection(exchangeConfig);

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.message,
        balances: result.balances,
        error: result.error,
      }),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[test-exchange-connection] Error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
