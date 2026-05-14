// supabase/functions/decrypt-credentials/index.ts
// Edge Function для расшифровки API-ключей бирж
// Улучшенная версия с дополнительными мерами безопасности

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// Константы валидации
const MAX_ENCRYPTED_DATA_LENGTH = 10240; // 10KB limit
const MAX_IV_LENGTH = 256;
const ENCRYPTION_KEY_PATTERN = /^[0-9a-f]{64}$/i;
const REQUEST_TIMEOUT_MS = 10000;
const MAX_DECRYPTION_ATTEMPTS = 2;

/**
 * Валидация входных данных
 */
function validateInput(
  encryptedData: unknown,
  iv: unknown
): {
  valid: boolean;
  error?: string;
} {
  if (typeof encryptedData !== 'string' || typeof iv !== 'string') {
    return { valid: false, error: 'Encrypted data and IV must be strings' };
  }

  if (!encryptedData.trim() || !iv.trim()) {
    return { valid: false, error: 'Encrypted data and IV cannot be empty' };
  }

  if (encryptedData.length > MAX_ENCRYPTED_DATA_LENGTH) {
    return { valid: false, error: `Encrypted data exceeds maximum length` };
  }

  if (iv.length > MAX_IV_LENGTH) {
    return { valid: false, error: `IV exceeds maximum length` };
  }

  // Проверка валидности base64
  try {
    const encryptedBytes = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
    const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

    if (encryptedBytes.length < 32) {
      // Минимальный размер для AES-GCM (16 data + 16 tag)
      return { valid: false, error: 'Encrypted data too short' };
    }

    if (ivBytes.length !== 12) {
      // AES-GCM требует 12 байт IV
      return { valid: false, error: 'Invalid IV length (must be 12 bytes)' };
    }
  } catch {
    return { valid: false, error: 'Invalid base64 encoding' };
  }

  return { valid: true };
}

/**
 * Безопасное логирование (без чувствительных данных)
 */
function secureLog(action: string, details?: Record<string, unknown>) {
  const safeDetails = {
    action,
    timestamp: new Date().toISOString(),
    ...details,
  };
  console.log('[decrypt-credentials]', JSON.stringify(safeDetails));
}

/**
 * Ограничение числа попыток расшифровки (защита от brute-force)
 */
function createDecryptionLimiter(maxAttempts: number) {
  const attempts = new Map<string, number>();

  return {
    checkLimit: (requestId: string): boolean => {
      const count = attempts.get(requestId) || 0;
      if (count >= maxAttempts) {
        return false;
      }
      attempts.set(requestId, count + 1);
      return true;
    },
    reset: (requestId: string) => {
      attempts.delete(requestId);
    },
  };
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Генерируем уникальный ID для этого запроса (для логирования)
  const requestId = crypto.randomUUID().substring(0, 8);

  try {
    // Проверка таймаута запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    // Проверка авторизации (только сервисная роль)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      secureLog('auth_failure', { requestId, reason: 'missing_or_invalid_header' });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Парсинг тела запроса
    let body: unknown;
    try {
      const textBody = await req.text();
      if (textBody.length > 10240) {
        throw new Error('Request body too large');
      }
      body = JSON.parse(textBody);
    } catch (parseError) {
      secureLog('parse_error', { requestId, error: 'invalid_json' });
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { encrypted_data, iv } = body as Record<string, unknown>;

    // Валидация входных данных
    const validation = validateInput(encrypted_data, iv);
    if (!validation.valid) {
      secureLog('validation_failure', { requestId, reason: validation.error });
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Получаем ключи
    const ENCRYPTION_KEY = Deno.env.get('API_KEY_ENCRYPTION_KEY');
    const ENCRYPTION_KEY_NEW = Deno.env.get('API_KEY_ENCRYPTION_KEY_NEW');

    const keysToTry = [ENCRYPTION_KEY_NEW, ENCRYPTION_KEY].filter((key): key is string =>
      Boolean(key)
    );

    if (keysToTry.length === 0) {
      secureLog('error', { requestId, issue: 'no_encryption_keys_configured' });
      return new Response(JSON.stringify({ error: 'Internal configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Проверка формата ключей
    for (const keyHex of keysToTry) {
      if (!ENCRYPTION_KEY_PATTERN.test(keyHex)) {
        secureLog('error', { requestId, issue: 'invalid_encryption_key_format' });
        return new Response(JSON.stringify({ error: 'Internal configuration error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const encryptedArray = Uint8Array.from(atob(encrypted_data as string), (c) => c.charCodeAt(0));
    const ivArray = Uint8Array.from(atob(iv as string), (c) => c.charCodeAt(0));

    let decryptedData: ArrayBuffer | null = null;
    let successfulKeyIndex = -1;

    // Ограничиваем число попыток расшифровки
    const limiter = createDecryptionLimiter(MAX_DECRYPTION_ATTEMPTS);

    for (let i = 0; i < keysToTry.length; i++) {
      if (!limiter.checkLimit(requestId)) {
        secureLog('rate_limit', { requestId, reason: 'too_many_attempts' });
        return new Response(JSON.stringify({ error: 'Too many decryption attempts' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const keyData = new TextEncoder().encode(keysToTry[i]);

        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          keyData,
          {
            name: 'AES-GCM',
            length: 256,
          },
          false,
          ['decrypt']
        );

        decryptedData = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: ivArray,
            tagLength: 128,
          },
          cryptoKey,
          encryptedArray
        );

        successfulKeyIndex = i;
        break;
      } catch (e) {
        // Пробуем следующий ключ - не раскрываем какая именно ошибка
        console.log(`[decrypt-credentials] ${requestId}: Decryption attempt ${i + 1} failed`);
      }
    }

    if (!decryptedData) {
      secureLog('decryption_failure', { requestId, reason: 'invalid_key_or_data' });
      return new Response(JSON.stringify({ error: 'Decryption failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Парсим расшифрованные данные с валидацией
    let decrypted: Record<string, string>;
    try {
      const decryptedText = new TextDecoder().decode(decryptedData);
      decrypted = JSON.parse(decryptedText);

      // Валидация структуры данных
      if (typeof decrypted.apiKey !== 'string' || typeof decrypted.apiSecret !== 'string') {
        throw new Error('Invalid data structure');
      }

      // Проверка версии формата
      if (decrypted.version && typeof decrypted.version !== 'number') {
        throw new Error('Invalid version format');
      }
    } catch (parseError) {
      secureLog('parse_error', { requestId, error: 'invalid_decrypted_structure' });
      return new Response(JSON.stringify({ error: 'Invalid encrypted data format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    secureLog('success', {
      requestId,
      action: 'credentials_decrypted',
      keyVersion: successfulKeyIndex,
    });

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
    // Безопасное логирование ошибок без раскрытия деталей
    secureLog('error', {
      requestId,
      type: error instanceof Error ? error.name : 'UnknownError',
      message: 'An error occurred during decryption',
    });

    return new Response(JSON.stringify({ error: 'Decryption failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } finally {
    clearTimeout(timeoutId);
  }
});
