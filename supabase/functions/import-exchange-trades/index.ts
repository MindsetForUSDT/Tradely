// supabase/functions/import-exchange-trades/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Расшифровка через вызов decrypt-credentials функции
async function decryptApiCredentials(encryptedData: string, iv: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  const response = await fetch(`${supabaseUrl}/functions/v1/decrypt-credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Верификация JWT
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { exchange, encrypted_credentials, iv } = await req.json();
    if (!exchange || !encrypted_credentials || !iv) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Расшифровываем ключи
    const { apiKey, apiSecret } = await decryptApiCredentials(encrypted_credentials, iv);

    // Здесь будет логика импорта сделок с биржи
    // Пример для Binance:
    // const trades = await fetchBinanceTrades(apiKey, apiSecret);

    console.log(`[import-exchange-trades] Importing trades for ${exchange} user ${user.id}`);

    // Запускаем фоновый импорт
    const { error: invokeError } = await supabase.functions.invoke('fetch-trade-history', {
      body: { userId: user.id, exchange, apiKey, apiSecret },
    });

    if (invokeError) {
      console.error('[import-exchange-trades] Background import error:', invokeError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Exchange connected and import started',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (e: any) {
    console.error('Import exchange error:', e.message);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
