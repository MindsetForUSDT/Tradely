// supabase/functions/import-exchange-trades/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { createHash, createCipheriv, randomBytes } from 'node:crypto';
const ENCRYPTION_KEY = Deno.env.get('API_KEY_ENCRYPTION_KEY');
if (!ENCRYPTION_KEY) {
  throw new Error('FATAL: API_KEY_ENCRYPTION_KEY not set in environment');
}

if (!/^[0-9a-f]{64}$/i.test(ENCRYPTION_KEY)) {
  throw new Error('FATAL: API_KEY_ENCRYPTION_KEY must be 64 hex characters');
}
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Шифрование API-ключей перед сохранением
function encryptApiCredentials(apiKey: string, apiSecret: string) {
  const ENCRYPTION_KEY = Deno.env.get('API_KEY_ENCRYPTION_KEY')!;
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify({ apiKey, apiSecret })),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    encrypted_data: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
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

    const { exchange, apiKey, apiSecret } = await req.json();
    if (!exchange || !apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Шифруем и сохраняем ключи
    const { encrypted_data, iv, tag } = encryptApiCredentials(apiKey, apiSecret);

    const { error: insertError } = await supabase.from('exchange_connections').upsert({
      user_id: user.id,
      exchange,
      encrypted_credentials: encrypted_data,
      iv,
      tag,
      updated_at: new Date().toISOString(),
    });

    if (insertError) throw insertError;

    // Запускаем фоновый импорт
    const { error: invokeError } = await supabase.functions.invoke('import-trades', {
      body: { userId: user.id, exchange },
    });

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
    console.error('Import exchange error:', e.message); // Логируем только сообщение, не ключи
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
