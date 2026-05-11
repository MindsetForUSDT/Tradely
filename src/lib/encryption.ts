// lib/encryption.ts — КЛИЕНТСКОЕ ШИФРОВАНИЕ API-КЛЮЧЕЙ
export async function encryptApiCredentials(
  apiKey: string,
  apiSecret: string
): Promise<{
  encrypted_data: string;
  iv: string;
  tag: string;
}> {
  const encoder = new TextEncoder();
  const data = JSON.stringify({ apiKey, apiSecret, timestamp: Date.now() });

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(data));

  const exportedKey = await crypto.subtle.exportKey('raw', key);

  return {
    encrypted_data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
    tag: btoa(String.fromCharCode(...new Uint8Array(exportedKey))),
  };
}
