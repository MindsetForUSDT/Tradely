// lib/encryption.ts — ЛОКАЛЬНОЕ ШИФРОВАНИЕ
// Упрощенная версия для локальной БД

const MAX_API_KEY_LENGTH = 256;
const MAX_API_SECRET_LENGTH = 512;
const REQUEST_TIMEOUT_MS = 15000;

function validateCredentials(
  apiKey: unknown,
  apiSecret: unknown
): { valid: boolean; error?: string } {
  if (typeof apiKey !== 'string' || typeof apiSecret !== 'string') {
    return { valid: false, error: 'API key and secret must be strings' };
  }
  if (!apiKey.trim() || !apiSecret.trim()) {
    return { valid: false, error: 'API key and secret cannot be empty' };
  }
  if (apiKey.length > MAX_API_KEY_LENGTH) {
    return { valid: false, error: `API key exceeds maximum length` };
  }
  if (apiSecret.length > MAX_API_SECRET_LENGTH) {
    return { valid: false, error: `API secret exceeds maximum length` };
  }
  return { valid: true };
}

function secureLog(_action: string, _details?: Record<string, unknown>) {
  // Silent logging for security
}

export async function encryptApiCredentials(
  apiKey: string,
  apiSecret: string
): Promise<{ encrypted_data: string; iv: string; tag: string }> {
  const validation = validateCredentials(apiKey, apiSecret);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const sanitizedApiKey = apiKey.trim();
  const sanitizedApiSecret = apiSecret.trim();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch('http://localhost:3001/api/wallets/encrypt', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: sanitizedApiKey, apiSecret: sanitizedApiSecret }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Encryption service unavailable');
    }

    const result = await response.json();
    secureLog('success', { action: 'credentials_encrypted' });
    return result;
  } catch (error) {
    secureLog('error', { type: error instanceof Error ? error.name : 'UnknownError' });
    throw new Error('Failed to encrypt credentials');
  }
}

export async function decryptApiCredentials(
  encryptedData: string,
  iv: string
): Promise<{ apiKey: string; apiSecret: string }> {
  if (typeof encryptedData !== 'string' || typeof iv !== 'string') {
    throw new Error('Invalid input type');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch('http://localhost:3001/api/wallets/decrypt', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encrypted_data: encryptedData.trim(), iv: iv.trim() }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Decryption failed');
    }

    const result = await response.json();
    secureLog('success', { action: 'credentials_decrypted' });
    return result;
  } catch (error) {
    secureLog('error', { type: error instanceof Error ? error.name : 'UnknownError' });
    throw new Error('Failed to decrypt credentials');
  }
}
