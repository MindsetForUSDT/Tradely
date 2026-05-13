// supabase/functions/decrypt-credentials/index.ts
// Edge Function для расшифровки API-ключей бирж

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Проверка авторизации (только сервисная роль)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { encrypted_data, iv } = await req.json();

    if (!encrypted_data || !iv) {
      return new Response(JSON.stringify({ error: 'Encrypted data and IV are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Получаем ключи
    const ENCRYPTION_KEY = Deno.env.get('API_KEY_ENCRYPTION_KEY');
    const ENCRYPTION_KEY_NEW = Deno.env.get('API_KEY_ENCRYPTION_KEY_NEW');

    // Пытаемся расшифровать новым ключом, если не получится - старым
    const keysToTry = [ENCRYPTION_KEY_NEW, ENCRYPTION_KEY].filter(Boolean);

    if (keysToTry.length === 0) {
      throw new Error('No encryption keys configured');
    }

    const encoder = new TextEncoder();
    const ivArray = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
    const encryptedArray = Uint8Array.from(atob(encrypted_data), (c) => c.charCodeAt(0));

    let decryptedData = null;

    for (const keyHex of keysToTry) {
      try {
        const keyData = encoder.encode(keyHex!);

        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'AES-GCM' },
          false,
          ['decrypt']
        );

        decryptedData = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: ivArray },
          cryptoKey,
          encryptedArray
        );

        // Если расшифровка успешна, прерываем цикл
        break;
      } catch (e) {
        // Пробуем следующий ключ
        console.log(`[decrypt-credentials] Failed with key version, trying next...`);
      }
    }

    if (!decryptedData) {
      throw new Error('Failed to decrypt with any available key');
    }

    const decrypted = JSON.parse(new TextDecoder().decode(decryptedData));

    return new Response(
      JSON.stringify({
        apiKey: decrypted.apiKey,
        apiSecret: decrypted.apiSecret,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[decrypt-credentials] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
