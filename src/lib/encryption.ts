// lib/encryption.ts — СЕРВЕРНОЕ ШИФРОВАНИЕ ЧЕРЕЗ EDGE FUNCTION
// Улучшенная версия с дополнительными мерами безопасности
import { supabase } from '@/lib/supabase';

// Константы валидации
const MAX_API_KEY_LENGTH = 256;
const MAX_API_SECRET_LENGTH = 512;
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Валидация входных данных перед шифрованием
 */
function validateCredentials(
  apiKey: unknown,
  apiSecret: unknown
): {
  valid: boolean;
  error?: string;
} {
  if (typeof apiKey !== 'string' || typeof apiSecret !== 'string') {
    return { valid: false, error: 'API key and secret must be strings' };
  }

  if (!apiKey.trim() || !apiSecret.trim()) {
    return { valid: false, error: 'API key and secret cannot be empty' };
  }

  if (apiKey.length > MAX_API_KEY_LENGTH) {
    return { valid: false, error: `API key exceeds maximum length of ${MAX_API_KEY_LENGTH}` };
  }

  if (apiSecret.length > MAX_API_SECRET_LENGTH) {
    return { valid: false, error: `API secret exceeds maximum length of ${MAX_API_SECRET_LENGTH}` };
  }

  // Проверка на потенциально вредоносные символы
  const suspiciousPatterns = [
    /[\0\r\n]/, // Null bytes, carriage returns, newlines
    /<script/i, // XSS attempts
    /javascript:/i, // XSS protocol
  ];

  const combinedInput = apiKey + apiSecret;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(combinedInput)) {
      return { valid: false, error: 'Invalid characters detected' };
    }
  }

  return { valid: true };
}

/**
 * Безопасное логирование (без чувствительных данных)
 */
function secureLog(action: string, details?: Record<string, unknown>) {
  // Явно исключаем чувствительные поля из логов
  const sensitiveFields = [
    'apiKey',
    'apiSecret',
    'userId',
    'email',
    'iv',
    'tag',
    'encrypted_data',
    'passphrase',
    'secret',
    'password',
    'token',
    'authorization',
  ];

  const safeDetails = {
    action,
    timestamp: new Date().toISOString(),
    ...Object.fromEntries(
      Object.entries(details || {}).filter(([key]) => !sensitiveFields.includes(key))
    ),
  };
  console.log('[encryption]', JSON.stringify(safeDetails));
}

/**
 * Шифрует API-ключи биржи через серверную Edge Function
 * Данные никогда не хранятся в открытом виде на клиенте
 */
export async function encryptApiCredentials(
  apiKey: string,
  apiSecret: string
): Promise<{
  encrypted_data: string;
  iv: string;
  tag: string;
}> {
  // Валидация входных данных
  const validation = validateCredentials(apiKey, apiSecret);
  if (!validation.valid) {
    secureLog('validation_failure', { reason: validation.error });
    throw new Error(validation.error);
  }

  // Санитизация ввода
  const sanitizedApiKey = apiKey.trim();
  const sanitizedApiSecret = apiSecret.trim();

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    if (!supabaseUrl) {
      secureLog('error', { issue: 'supabase_url_not_configured' });
      throw new Error('Supabase URL not configured');
    }

    // Пробуем вызвать Edge Function с увеличенным таймаутом
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд на Edge Function

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/encrypt-credentials`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ apiKey: sanitizedApiKey, apiSecret: sanitizedApiSecret }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Edge Function unavailable');
      }

      const result = await response.json();

      if (
        typeof result !== 'object' ||
        result === null ||
        typeof (result as Record<string, unknown>).encrypted_data !== 'string' ||
        typeof (result as Record<string, unknown>).iv !== 'string'
      ) {
        throw new Error('Invalid response format');
      }

      secureLog('success', { action: 'credentials_encrypted_via_server' });
      return result as {
        encrypted_data: string;
        iv: string;
        tag: string;
      };
    } catch (edgeError) {
      clearTimeout(timeoutId);
      secureLog('edge_function_failed', {
        reason: edgeError instanceof Error ? edgeError.message : 'unknown',
      });

      // НЕТ Fallback на клиентское шифрование - данные будут бесполезны после перезагрузки
      // Вместо этого выбрасываем ошибку с рекомендацией повторить попытку
      throw new Error(
        'Сервис шифрования временно недоступен. Пожалуйста, подождите несколько секунд и попробуйте снова. ' +
          'Если ошибка повторяется, обратитесь в поддержку.'
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      secureLog('timeout', { action: 'encrypt_api_credentials' });
      throw new Error('Encryption request timed out');
    }

    secureLog('error', {
      type: error instanceof Error ? error.name : 'UnknownError',
      message: 'Failed to encrypt credentials',
    });
    throw error;
  }
}

/**
 * Расшифровывает API-ключи через серверную Edge Function
 */
export async function decryptApiCredentials(
  encryptedData: string,
  iv: string
): Promise<{ apiKey: string; apiSecret: string }> {
  // Валидация входных данных
  if (typeof encryptedData !== 'string' || typeof iv !== 'string') {
    secureLog('validation_failure', { reason: 'invalid_input_type' });
    throw new Error('Encrypted data and IV must be strings');
  }

  if (!encryptedData.trim() || !iv.trim()) {
    secureLog('validation_failure', { reason: 'empty_input' });
    throw new Error('Encrypted data and IV cannot be empty');
  }

  // Проверка формата base64
  try {
    const encryptedBytes = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
    const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

    if (encryptedBytes.length < 32) {
      secureLog('validation_failure', { reason: 'encrypted_data_too_short' });
      throw new Error('Encrypted data too short');
    }

    if (ivBytes.length !== 12) {
      secureLog('validation_failure', { reason: 'invalid_iv_length' });
      throw new Error('Invalid IV length');
    }
  } catch {
    secureLog('validation_failure', { reason: 'invalid_base64_encoding' });
    throw new Error('Invalid encryption data format');
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    if (!supabaseUrl) {
      secureLog('error', { issue: 'supabase_url_not_configured' });
      throw new Error('Supabase URL not configured');
    }

    // Контроль таймаута запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(`${supabaseUrl}/functions/v1/decrypt-credentials`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ encrypted_data: encryptedData.trim(), iv: iv.trim() }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Decryption failed' }));
      secureLog('decryption_failed', { status: response.status });
      throw new Error(error.error || `Server returned ${response.status}`);
    }

    // Валидация ответа
    let result: unknown;
    try {
      result = await response.json();
    } catch {
      secureLog('parse_error', { error: 'invalid_json_response' });
      throw new Error('Invalid server response');
    }

    if (
      typeof result !== 'object' ||
      result === null ||
      typeof (result as Record<string, unknown>).apiKey !== 'string' ||
      typeof (result as Record<string, unknown>).apiSecret !== 'string'
    ) {
      secureLog('validation_failure', { reason: 'invalid_response_structure' });
      throw new Error('Invalid decryption response format');
    }

    secureLog('success', { action: 'credentials_decrypted' });

    return result as { apiKey: string; apiSecret: string };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      secureLog('timeout', { action: 'decrypt_api_credentials' });
      throw new Error('Decryption request timed out');
    }

    secureLog('error', {
      type: error instanceof Error ? error.name : 'UnknownError',
      message: 'Failed to decrypt credentials',
    });
    throw error;
  }
}
