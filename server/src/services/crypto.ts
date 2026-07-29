import { createCipheriv, createDecipheriv, createSecretKey, randomBytes, scryptSync } from 'crypto';
import { requiredSecret } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';

// Деривация ключа фиксированной длины
function getKey() {
  return createSecretKey(
    new Uint8Array(scryptSync(requiredSecret('ENCRYPTION_KEY'), 'tradeumdiary-salt', 32))
  );
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

export function encrypt(text: string): EncryptedData {
  const iv = new Uint8Array(randomBytes(16));
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encrypted,
    iv: Buffer.from(iv).toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
  };
}

export function decrypt(data: EncryptedData): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    new Uint8Array(Buffer.from(data.iv, 'hex'))
  );
  decipher.setAuthTag(new Uint8Array(Buffer.from(data.tag, 'hex')));

  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
