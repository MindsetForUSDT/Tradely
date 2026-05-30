import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'tradeumdiary-default-key-change-me!';
const ALGORITHM = 'aes-256-gcm';

// Деривация ключа фиксированной длины
function getKey(): Buffer {
  return scryptSync(ENCRYPTION_KEY, 'tradeumdiary-salt', 32);
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

export function encrypt(text: string): EncryptedData {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
  };
}

export function decrypt(data: EncryptedData): string {
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(data.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(data.tag, 'hex'));

  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
