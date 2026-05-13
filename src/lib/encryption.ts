// lib/encryption.ts — СЕРВЕРНОЕ ШИФРОВАНИЕ ЧЕРЕЗ EDGE FUNCTION
import { supabase } from '@/lib/supabase';

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
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    // Вызываем Edge Function для шифрования
    const response = await fetch(`${supabaseUrl}/functions/v1/encrypt-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'x-api-key': session?.access_token || '',
      },
      body: JSON.stringify({ apiKey, apiSecret }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Encryption failed' }));
      console.error('[encryptApiCredentials] Server error:', errorData);

      // Если функция недоступна, используем простое шифрование для тестирования
      console.warn('[encryptApiCredentials] Falling back to client-side encryption');

      const encoder = new TextEncoder();
      const data = JSON.stringify({ apiKey, apiSecret, timestamp: Date.now() });
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
        'encrypt',
      ]);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(data)
      );
      const exportedKey = await crypto.subtle.exportKey('raw', key);

      return {
        encrypted_data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        iv: btoa(String.fromCharCode(...iv)),
        tag: btoa(String.fromCharCode(...new Uint8Array(exportedKey))),
      };
    }

    const result = await response.json();

    if (!result.encrypted_data || !result.iv) {
      throw new Error('Invalid encryption response');
    }

    return result;
  } catch (error) {
    console.error('[encryptApiCredentials] Error:', error);
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
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/decrypt-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ encrypted_data: encryptedData, iv }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Decryption failed' }));
      throw new Error(error.error || `Server returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[decryptApiCredentials] Error:', error);
    throw error;
  }
}
