// supabase/functions/encrypt-credentials/index.ts
// Edge Function для шифрования API-ключей бирж на сервере

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
    // Проверка API ключа
    const adminApiKey = Deno.env.get('ADMIN_API_KEY');
    const authHeader = req.headers.get('Authorization');

    if (
      !authHeader ||
      !authHeader.startsWith('Bearer ') ||
      authHeader.replace('Bearer ', '') !== adminApiKey
    ) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { apiKey, apiSecret } = await req.json();

    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'API key and secret are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Шифрование с новым ключом (приоритет) или старым
    const ENCRYPTION_KEY = Deno.env.get('API_KEY_ENCRYPTION_KEY');
    const ENCRYPTION_KEY_NEW = Deno.env.get('API_KEY_ENCRYPTION_KEY_NEW');

    if (!ENCRYPTION_KEY && !ENCRYPTION_KEY_NEW) {
      throw new Error('Encryption key not configured');
    }

    // Используем новый ключ если есть, иначе старый
    const keyToUse = ENCRYPTION_KEY_NEW || ENCRYPTION_KEY!;

    // Проверка формата ключа
    if (!/^[0-9a-f]{64}$/i.test(keyToUse)) {
      throw new Error('Invalid encryption key format (must be 64 hex characters)');
    }

    // Данные для шифрования
    const data = JSON.stringify({
      apiKey,
      apiSecret,
      timestamp: Date.now(),
    });

    // Шифрование через Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyToUse);

    // Импортируем ключ
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, [
      'encrypt',
    ]);

    // Генерируем IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Шифруем
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encoder.encode(data)
    );

    // Преобразуем в base64 для хранения
    const encryptedData = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    const ivBase64 = btoa(String.fromCharCode(...iv));

    return new Response(
      JSON.stringify({
        encrypted_data: encryptedData,
        iv: ivBase64,
        // Tag извлекается из зашифрованных данных (последние 16 байт AES-GCM)
        tag: '', // Для AES-GCM tag автоматически добавляется к encrypted data
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[encrypt-credentials] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
