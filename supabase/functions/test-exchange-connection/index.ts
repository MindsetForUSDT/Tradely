// supabase/functions/test-exchange-connection/index.ts
// Edge Function для тестирования подключения к бирже

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { ExchangeFactory, ExchangeConfig } from '../lib/exchange-adapter.ts';
import { getSecurityAuditor } from '../lib/security-audit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auditor = getSecurityAuditor(supabaseUrl, supabaseKey);

    // Проверка авторизации
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(supabaseUrl, supabaseKey);
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

    // Парсинг запроса
    let body: { exchange: string; encrypted_credentials: string; iv: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { exchange, encrypted_credentials, iv } = body;

    if (!exchange || !encrypted_credentials || !iv) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Расшифровка ключей
    let apiKey: string, apiSecret: string;
    try {
      const credentials = await decryptCredentials(
        encrypted_credentials,
        iv,
        supabaseUrl,
        supabaseKey
      );
      apiKey = credentials.apiKey;
      apiSecret = credentials.apiSecret;
    } catch (error: any) {
      await auditor.logDecryptionOperation(req, user.id, false, error.message);
      return new Response(JSON.stringify({ error: 'Failed to decrypt credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await auditor.logDecryptionOperation(req, user.id, true);

    // Создание экземпляра биржи
    let exchangeInstance;
    try {
      const exchangeConfig: ExchangeConfig = {
        exchangeId: exchange,
        apiKey,
        secret: apiSecret,
      };

      exchangeInstance = ExchangeFactory.create(exchangeConfig);
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Тестирование подключения
    const result = await exchangeInstance.testConnection();

    // Логирование результата
    await auditor.logEvent(
      result.success ? 'AUTH_SUCCESS' : 'AUTH_FAILURE',
      req,
      {
        action: 'test_exchange_connection',
        exchange,
        success: result.success,
        error: result.error,
      },
      user.id
    );

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

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
