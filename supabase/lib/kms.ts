// supabase/lib/kms.ts
// KMS (Key Management Service) абстракция
// Поддержка различных провайдеров: AWS KMS, GCP KMS, Azure Key Vault, HashiCorp Vault

export interface KeyMetadata {
  id: string;
  name: string;
  algorithm: 'AES-256-GCM' | 'RSA-2048' | 'RSA-4096' | 'ECDSA-P256';
  purpose: 'ENCRYPTION' | 'SIGNING' | 'KEY_WRAP';
  created: Date;
  version: number;
  state: 'ENABLED' | 'DISABLED' | 'DESTROYED';
  labels?: Record<string, string>;
}

export interface EncryptionResult {
  ciphertext: string;
  nonce: string;
  associatedData?: string;
  keyId: string;
  keyVersion: number;
}

export interface DecryptionResult {
  plaintext: ArrayBuffer;
}

export interface SignResult {
  signature: string;
  algorithm: string;
}

/**
 * Базовый класс для KMS провайдера
 */
export abstract class KMSProvider {
  abstract getPublicKey(keyId: string): Promise<string>;
  abstract encrypt(data: Uint8Array, keyId: string, aad?: Uint8Array): Promise<EncryptionResult>;
  abstract decrypt(ciphertext: EncryptionResult): Promise<DecryptionResult>;
  abstract sign(data: Uint8Array, keyId: string): Promise<SignResult>;
  abstract verify(data: Uint8Array, signature: string, keyId: string): Promise<boolean>;
  abstract generateKey(params: GenerateKeyParams): Promise<KeyMetadata>;
  abstract rotateKey(keyId: string): Promise<KeyMetadata>;
  abstract disableKey(keyId: string): Promise<void>;
  abstract enableKey(keyId: string): Promise<void>;
  abstract destroyKey(keyId: string): Promise<void>;
  abstract listKeys(): Promise<KeyMetadata[]>;
}

/**
 * Параметры для генерации ключа
 */
export interface GenerateKeyParams {
  name: string;
  algorithm: 'AES-256-GCM' | 'RSA-2048' | 'RSA-4096' | 'ECDSA-P256';
  purpose: 'ENCRYPTION' | 'SIGNING' | 'KEY_WRAP';
  protectionLevel: 'SOFTWARE' | 'HSM';
  labels?: Record<string, string>;
}

/**
 * In-memory KMS для разработки и тестирования
 * ⚠️ НЕ ИСПОЛЬЗОВАТЬ В PRODUCTION!
 */
export class InMemoryKMS extends KMSProvider {
  private keys: Map<
    string,
    {
      key: CryptoKey;
      metadata: KeyMetadata;
    }
  > = new Map();

  async getPublicKey(keyId: string): Promise<string> {
    const keyData = this.keys.get(keyId);
    if (!keyData) {
      throw new Error(`Key ${keyId} not found`);
    }

    const exported = await crypto.subtle.exportKey('spki', keyData.key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  async encrypt(data: Uint8Array, keyId: string, aad?: Uint8Array): Promise<EncryptionResult> {
    const keyData = this.keys.get(keyId);
    if (!keyData) {
      throw new Error(`Key ${keyId} not found`);
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, keyData.key, data);

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
      nonce: btoa(String.fromCharCode(...iv)),
      keyId,
      keyVersion: keyData.metadata.version,
    };
  }

  async decrypt(ciphertext: EncryptionResult): Promise<DecryptionResult> {
    const keyData = this.keys.get(ciphertext.keyId);
    if (!keyData) {
      throw new Error(`Key ${ciphertext.keyId} not found`);
    }

    const iv = Uint8Array.from(atob(ciphertext.nonce), (c) => c.charCodeAt(0));
    const data = Uint8Array.from(atob(ciphertext.ciphertext), (c) => c.charCodeAt(0));

    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, keyData.key, data);

    return { plaintext };
  }

  async sign(data: Uint8Array, keyId: string): Promise<SignResult> {
    const keyData = this.keys.get(keyId);
    if (!keyData) {
      throw new Error(`Key ${keyId} not found`);
    }

    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyData.key, data);
    return {
      signature: btoa(String.fromCharCode(...new Uint8Array(signature))),
      algorithm: 'RSASSA-PKCS1-v1_5',
    };
  }

  async verify(data: Uint8Array, signature: string, keyId: string): Promise<boolean> {
    const keyData = this.keys.get(keyId);
    if (!keyData) {
      throw new Error(`Key ${keyId} not found`);
    }

    const sig = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
    return crypto.subtle.verify('RSASSA-PKCS1-v1_5', keyData.key, sig, data);
  }

  async generateKey(params: GenerateKeyParams): Promise<KeyMetadata> {
    const keyId = `key_${crypto.randomUUID()}`;
    const version = 1;

    let algorithm: KeyAlgorithm;
    let usages: KeyUsage[];

    switch (params.algorithm) {
      case 'AES-256-GCM':
        algorithm = { name: 'AES-GCM', length: 256 };
        usages = ['encrypt', 'decrypt'];
        break;
      case 'RSA-2048':
        algorithm = {
          name: 'RSASSA-PKCS1-v1_5',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        };
        usages = ['sign', 'verify'];
        break;
      case 'ECDSA-P256':
        algorithm = { name: 'ECDSA', namedCurve: 'P-256' };
        usages = ['sign', 'verify'];
        break;
      default:
        throw new Error(`Unsupported algorithm: ${params.algorithm}`);
    }

    const keyPair = await crypto.subtle.generateKey(algorithm, true, usages);

    const metadata: KeyMetadata = {
      id: keyId,
      name: params.name,
      algorithm: params.algorithm,
      purpose: params.purpose,
      created: new Date(),
      version,
      state: 'ENABLED',
      labels: params.labels,
    };

    this.keys.set(keyId, {
      key: keyPair.privateKey || keyPair,
      metadata,
    });

    return metadata;
  }

  async rotateKey(keyId: string): Promise<KeyMetadata> {
    const keyData = this.keys.get(keyId);
    if (!keyData) {
      throw new Error(`Key ${keyId} not found`);
    }

    // Создаем новую версию ключа
    const newVersion = keyData.metadata.version + 1;
    const newKeyPair = await crypto.subtle.generateKey(
      keyData.metadata.algorithm === 'AES-256-GCM'
        ? { name: 'AES-GCM', length: 256 }
        : {
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
          },
      true,
      ['encrypt', 'decrypt']
    );

    const newMetadata: KeyMetadata = {
      ...keyData.metadata,
      version: newVersion,
      created: new Date(),
    };

    this.keys.set(`${keyId}_v${newVersion}`, {
      key: newKeyPair.privateKey || newKeyPair,
      metadata: newMetadata,
    });

    return newMetadata;
  }

  async disableKey(keyId: string): Promise<void> {
    const keyData = this.keys.get(keyId);
    if (!keyData) {
      throw new Error(`Key ${keyId} not found`);
    }
    keyData.metadata.state = 'DISABLED';
  }

  async enableKey(keyId: string): Promise<void> {
    const keyData = this.keys.get(keyId);
    if (!keyData) {
      throw new Error(`Key ${keyId} not found`);
    }
    keyData.metadata.state = 'ENABLED';
  }

  async destroyKey(keyId: string): Promise<void> {
    this.keys.delete(keyId);
  }

  async listKeys(): Promise<KeyMetadata[]> {
    return Array.from(this.keys.values()).map((k) => k.metadata);
  }
}

/**
 * KMS Manager - единая точка для работы с ключами
 */
export class KMSManager {
  private provider: KMSProvider;
  private cache: Map<string, KeyMetadata> = new Map();

  constructor(provider: KMSProvider) {
    this.provider = provider;
  }

  /**
   * Получение или создание ключа для шифрования API-ключей бирж
   */
  async getOrCreateEncryptionKey(): Promise<KeyMetadata> {
    const keyName = 'api-credentials-encryption';

    // Проверяем кэш
    const cached = Array.from(this.cache.values()).find((k) => k.name === keyName);
    if (cached && cached.state === 'ENABLED') {
      return cached;
    }

    // Ищем существующий ключ
    const keys = await this.provider.listKeys();
    const existing = keys.find((k) => k.name === keyName && k.state === 'ENABLED');

    if (existing) {
      this.cache.set(existing.id, existing);
      return existing;
    }

    // Создаем новый ключ
    const newKey = await this.provider.generateKey({
      name: keyName,
      algorithm: 'AES-256-GCM',
      purpose: 'ENCRYPTION',
      protectionLevel: 'SOFTWARE',
      labels: {
        environment: Deno.env.get('ENVIRONMENT') || 'production',
        service: 'api-credentials',
      },
    });

    this.cache.set(newKey.id, newKey);
    return newKey;
  }

  /**
   * Ротация ключа шифрования
   */
  async rotateEncryptionKey(): Promise<KeyMetadata> {
    const currentKey = await this.getOrCreateEncryptionKey();
    const newKey = await this.provider.rotateKey(currentKey.id);

    this.cache.set(newKey.id, newKey);

    console.log('[KMS] Key rotated:', {
      oldKeyId: currentKey.id,
      newKeyId: newKey.id,
      newVersion: newKey.version,
    });

    return newKey;
  }

  /**
   * Шифрование данных с автоматическим выбором ключа
   */
  async encrypt(
    data: string,
    keyPurpose: 'api-credentials' | 'user-data' = 'api-credentials'
  ): Promise<EncryptionResult> {
    let keyId: string;

    if (keyPurpose === 'api-credentials') {
      const key = await this.getOrCreateEncryptionKey();
      keyId = key.id;
    } else {
      throw new Error('User data encryption not implemented yet');
    }

    const encoder = new TextEncoder();
    return await this.provider.encrypt(encoder.encode(data), keyId);
  }

  /**
   * Расшифровка данных
   */
  async decrypt(encrypted: EncryptionResult): Promise<string> {
    const result = await this.provider.decrypt(encrypted);
    const decoder = new TextDecoder();
    return decoder.decode(result.plaintext);
  }

  /**
   * Создание экземпляра для разработки
   */
  static createDevelopment(): KMSManager {
    return new KMSManager(new InMemoryKMS());
  }

  /**
   * Создание экземпляра для production с конкретным провайдером
   */
  static createProduction(provider: 'aws' | 'gcp' | 'azure' | 'vault'): KMSManager {
    switch (provider) {
      case 'aws':
        return new KMSManager(new AWSSKMSProvider());
      case 'gcp':
        return new KMSManager(new GCPKMSProvider());
      case 'azure':
        return new KMSManager(new AzureKeyVaultProvider());
      case 'vault':
        return new KMSManager(new VaultProvider());
      default:
        throw new Error(`Unsupported KMS provider: ${provider}`);
    }
  }
}

/**
 * Заглушки для production KMS провайдеров
 * Реализуется при выборе конкретного провайдера
 */

class AWSSKMSProvider extends KMSProvider {
  async getPublicKey(keyId: string): Promise<string> {
    throw new Error('AWS KMS integration not implemented');
  }
  async encrypt(data: Uint8Array, keyId: string, aad?: Uint8Array): Promise<EncryptionResult> {
    throw new Error('AWS KMS integration not implemented');
  }
  async decrypt(ciphertext: EncryptionResult): Promise<DecryptionResult> {
    throw new Error('AWS KMS integration not implemented');
  }
  async sign(data: Uint8Array, keyId: string): Promise<SignResult> {
    throw new Error('AWS KMS integration not implemented');
  }
  async verify(data: Uint8Array, signature: string, keyId: string): Promise<boolean> {
    throw new Error('AWS KMS integration not implemented');
  }
  async generateKey(params: GenerateKeyParams): Promise<KeyMetadata> {
    throw new Error('AWS KMS integration not implemented');
  }
  async rotateKey(keyId: string): Promise<KeyMetadata> {
    throw new Error('AWS KMS integration not implemented');
  }
  async disableKey(keyId: string): Promise<void> {
    throw new Error('AWS KMS integration not implemented');
  }
  async enableKey(keyId: string): Promise<void> {
    throw new Error('AWS KMS integration not implemented');
  }
  async destroyKey(keyId: string): Promise<void> {
    throw new Error('AWS KMS integration not implemented');
  }
  async listKeys(): Promise<KeyMetadata[]> {
    throw new Error('AWS KMS integration not implemented');
  }
}

class GCPKMSProvider extends KMSProvider {
  async getPublicKey(keyId: string): Promise<string> {
    throw new Error('GCP KMS integration not implemented');
  }
  async encrypt(data: Uint8Array, keyId: string, aad?: Uint8Array): Promise<EncryptionResult> {
    throw new Error('GCP KMS integration not implemented');
  }
  async decrypt(ciphertext: EncryptionResult): Promise<DecryptionResult> {
    throw new Error('GCP KMS integration not implemented');
  }
  async sign(data: Uint8Array, keyId: string): Promise<SignResult> {
    throw new Error('GCP KMS integration not implemented');
  }
  async verify(data: Uint8Array, signature: string, keyId: string): Promise<boolean> {
    throw new Error('GCP KMS integration not implemented');
  }
  async generateKey(params: GenerateKeyParams): Promise<KeyMetadata> {
    throw new Error('GCP KMS integration not implemented');
  }
  async rotateKey(keyId: string): Promise<KeyMetadata> {
    throw new Error('GCP KMS integration not implemented');
  }
  async disableKey(keyId: string): Promise<void> {
    throw new Error('GCP KMS integration not implemented');
  }
  async enableKey(keyId: string): Promise<void> {
    throw new Error('GCP KMS integration not implemented');
  }
  async destroyKey(keyId: string): Promise<void> {
    throw new Error('GCP KMS integration not implemented');
  }
  async listKeys(): Promise<KeyMetadata[]> {
    throw new Error('GCP KMS integration not implemented');
  }
}

class AzureKeyVaultProvider extends KMSProvider {
  async getPublicKey(keyId: string): Promise<string> {
    throw new Error('Azure Key Vault integration not implemented');
  }
  async encrypt(data: Uint8Array, keyId: string, aad?: Uint8Array): Promise<EncryptionResult> {
    throw new Error('Azure Key Vault integration not implemented');
  }
  async decrypt(ciphertext: EncryptionResult): Promise<DecryptionResult> {
    throw new Error('Azure Key Vault integration not implemented');
  }
  async sign(data: Uint8Array, keyId: string): Promise<SignResult> {
    throw new Error('Azure Key Vault integration not implemented');
  }
  async verify(data: Uint8Array, signature: string, keyId: string): Promise<boolean> {
    throw new Error('Azure Key Vault integration not implemented');
  }
  async generateKey(params: GenerateKeyParams): Promise<KeyMetadata> {
    throw new Error('Azure Key Vault integration not implemented');
  }
  async rotateKey(keyId: string): Promise<KeyMetadata> {
    throw new Error('Azure Key Vault integration not implemented');
  }
  async disableKey(keyId: string): Promise<void> {
    throw new Error('Azure Key Vault integration not implemented');
  }
  async enableKey(keyId: string): Promise<void> {
    throw new Error('Azure Key Vault integration not implemented');
  }
  async destroyKey(keyId: string): Promise<void> {
    throw new Error('Azure Key Vault integration not implemented');
  }
  async listKeys(): Promise<KeyMetadata[]> {
    throw new Error('Azure Key Vault integration not implemented');
  }
}

class VaultProvider extends KMSProvider {
  async getPublicKey(keyId: string): Promise<string> {
    throw new Error('HashiCorp Vault integration not implemented');
  }
  async encrypt(data: Uint8Array, keyId: string, aad?: Uint8Array): Promise<EncryptionResult> {
    throw new Error('HashiCorp Vault integration not implemented');
  }
  async decrypt(ciphertext: EncryptionResult): Promise<DecryptionResult> {
    throw new Error('HashiCorp Vault integration not implemented');
  }
  async sign(data: Uint8Array, keyId: string): Promise<SignResult> {
    throw new Error('HashiCorp Vault integration not implemented');
  }
  async verify(data: Uint8Array, signature: string, keyId: string): Promise<boolean> {
    throw new Error('HashiCorp Vault integration not implemented');
  }
  async generateKey(params: GenerateKeyParams): Promise<KeyMetadata> {
    throw new Error('HashiCorp Vault integration not implemented');
  }
  async rotateKey(keyId: string): Promise<KeyMetadata> {
    throw new Error('HashiCorp Vault integration not implemented');
  }
  async disableKey(keyId: string): Promise<void> {
    throw new Error('HashiCorp Vault integration not implemented');
  }
  async enableKey(keyId: string): Promise<void> {
    throw new Error('HashiCorp Vault integration not implemented');
  }
  async destroyKey(keyId: string): Promise<void> {
    throw new Error('HashiCorp Vault integration not implemented');
  }
  async listKeys(): Promise<KeyMetadata[]> {
    throw new Error('HashiCorp Vault integration not implemented');
  }
}
