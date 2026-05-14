# Zero-Knowledge Архитектура для TradeumDiary

## 📋 Обзор

Этот документ описывает план внедрения Zero-Knowledge (ZK) архитектуры для TradeumDiary. В ZK-архитектуре сервер никогда не видит открытые данные пользователя - всё шифруется на клиенте с ключами, которые только у пользователя.

---

## 🎯 Цели

1. **Полная конфиденциальность**: Сервер не может прочитать данные пользователей
2. **Контроль ключей**: Пользователи полностью контролируют свои ключи шифрования
3. **Миграция**: Плавный переход от текущей архитектуры к ZK
4. **Совместимость**: Поддержка существующих данных и пользователей

---

## 🏗️ Текущая архитектура vs Zero-Knowledge

### Текущая архитектура (Server-Side Encryption)

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Клиент    │─────▶│  Сервер (API) │─────▶│   БД (Enc)  │
│             │      │              │      │             │
│ Открытые    │      │ Шифрование   │      │ AES-256-GCM │
│ данные      │      │ на сервере   │      │ на сервере  │
└─────────────┘      └──────────────┘      └─────────────┘
                              │
                              ▼
                        ┌──────────────┐
                        │  Ключи шифр. │
                        │  на сервере  │
                        └──────────────┘
```

**Проблемы:**

- Сервер имеет доступ к ключам шифрования
- Возможна утечка ключей с сервера
- Требует доверия к оператору сервера

### Zero-Knowledge архитектура

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Клиент    │─────▶│  Сервер (API) │─────▶│   БД (Enc)  │
│             │      │              │      │             │
│ Шифрование  │      │  Прозрачный  │      │  AES-256-GCM│
│ на клиенте  │      │  туннель     │      │ на клиенте  │
└─────────────┘      └──────────────┘      └─────────────┘
      │
      ▼
┌─────────────┐
│  Ключи шифр.│
│  у пользователя │
└─────────────┘
```

**Преимущества:**

- Сервер не имеет доступа к ключам
- Даже при компрометации сервера данные защищены
- Полная конфиденциальность

---

## 🔐 Ключевые компоненты ZK архитектуры

### 1. Ключи пользователя

```
Master Key (MK)
    ├── Encryption Key (EK) - для данных
    ├── Authentication Key (AK) - для HMAC
    └── Recovery Key (RK) - для восстановления
```

**Генерация ключей:**

- Используется password + salt + PBKDF2/Argon2
- Salt хранится на сервере (не секретно)
- Password никогда не отправляется на сервер

### 2. Password Derivation

```typescript
// Клиентская генерация ключей из пароля
async function deriveKeys(
  password: string,
  salt: Uint8Array
): Promise<{
  encryptionKey: CryptoKey;
  authKey: CryptoKey;
}> {
  const masterKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Encryption key (256 бит для AES-GCM)
  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    masterKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  // Authentication key (для HMAC)
  const authKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    masterKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

  return { encryptionKey, authKey };
}
```

### 3. Шифрование данных

```typescript
// Шифрование данных на клиенте
async function encryptData(
  data: string,
  key: CryptoKey
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(data)
  );

  return { encrypted, iv };
}
```

### 4. Recovery Mechanism

**Варианты восстановления доступа:**

#### Вариант A: Recovery Phrase (рекомендуется)

```
12-24 слова (BIP39) → Seed → Master Key
```

**Преимущества:**

- Пользователь запоминает слова
- Не зависит от пароля
- Стандартный подход (как в криптокошельках)

#### Вариант B: Backup Key

```
Генерация случайного backup ключа → PDF/печатная копия
```

**Преимущества:**

- Проще для пользователя
- Меньше ошибок при вводе

#### Вариант C: Social Recovery

```
N доверенных контактов → M из N подтверждений → восстановление
```

**Преимущества:**

- Децентрализованное восстановление
- Нет единой точки отказа

---

## 📊 План миграции

### Этап 1: Подготовка (2-3 недели)

#### 1.1 Создание ZK библиотеки

```bash
src/lib/
├── zk-crypto.ts          # ZK криптографические операции
├── key-management.ts     # Управление ключами
├── password-derivation.ts # Вывод ключей из пароля
├── recovery.ts           # Механизмы восстановления
└── data-encryption.ts    # Шифрование/расшифровка данных
```

#### 1.2 Обновление БД

```sql
-- Добавление полей для ZK архитектуры
ALTER TABLE public.profiles ADD COLUMN zk_salt BYTEA;
ALTER TABLE public.profiles ADD COLUMN zk_public_key BYTEA;
ALTER TABLE public.profiles ADD COLUMN zk_recovery_public_key BYTEA;
ALTER TABLE public.profiles ADD COLUMN zk_encrypted_master_key BYTEA;
ALTER TABLE public.profiles ADD COLUMN zk_key_version INTEGER DEFAULT 1;
```

#### 1.3 Создание API endpoints

```typescript
// Новые endpoints для ZK
POST / api / zk / register; // Регистрация с ZK
POST / api / zk / login; // Логин с проверкой ZK
POST / api / zk / recovery; // Инициация восстановления
POST / api / zk / verify; // Верификация ключа
```

### Этап 2: Механизм восстановления (2 недели)

#### 2.1 Recovery Phrase генерация

```typescript
// Генерация recovery phrase для новых пользователей
async function generateRecoveryPhrase(): Promise<string> {
  const entropy = crypto.getRandomValues(new Uint8Array(16));
  return entropyToMnemonic(entropy); // BIP39
}
```

#### 2.2 UI для отображения recovery phrase

- Показывается один раз при регистрации
- Требуется подтверждение копирования
- Возможность просмотра в настройках (с аутентификацией)

### Этап 3: Постепенная миграция (4-6 недель)

#### 3.1 Hybrid режим

- Новые пользователи → ZK по умолчанию
- Существующие пользователи → опциональная миграция
- Поддержка обоих форматов данных

```typescript
// Определение типа шифрования данных
function getDataEncryptionType(data: EncryptedData): 'legacy' | 'zk' {
  if (data.zk_signature) return 'zk';
  return 'legacy';
}
```

#### 3.2 Миграционный wizard

1. Вход в аккаунт
2. Генерация ZK ключей
3. Шифрование существующих данных
4. Загрузка зашифрованных данных
5. Подтверждение успешной миграции

### Этап 4: Финализация (2 недели)

#### 4.1 Удаление серверных ключей

- Отключение старых API шифрования
- Удаление API_KEY_ENCRYPTION_KEY из окружения
- Деактивация Edge Functions шифрования

#### 4.2 Документация

- Руководство для пользователей
- FAQ по восстановлению доступа
- Security best practices

---

## 🔧 Техническая реализация

### Структура ZK библиотеки

```typescript
// src/lib/zk-crypto.ts

/**
 * Zero-Knowledge Crypto Operations
 */
export class ZKCrypto {
  /**
   * Генерация пары ключей для пользователя
   */
  static async generateKeyPair(): Promise<{
    privateKey: CryptoKey;
    publicKey: ArrayBuffer;
  }> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true,
      ['sign', 'verify']
    );

    const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);

    // Private key не экспортируется, хранится только в памяти
    return {
      privateKey: keyPair.privateKey,
      publicKey,
    };
  }

  /**
   * Шифрование данных для конкретного пользователя
   */
  static async encryptForUser(
    data: string,
    recipientPublicKey: ArrayBuffer
  ): Promise<EncryptedData> {
    // Импортируем public key
    const key = await crypto.subtle.importKey(
      'spki',
      recipientPublicKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );

    // Генерируем ephemeral key для шифрования
    const ephemeralKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits', 'deriveKey']
    );

    // Выводим shared secret
    const sharedBits = await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: key,
      },
      ephemeralKeyPair.privateKey,
      256
    );

    // Шифруем данные
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        salt: new Uint8Array(32),
        info: new TextEncoder().encode('data-encryption'),
        hash: 'SHA-256',
      },
      sharedBits,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      new TextEncoder().encode(data)
    );

    return {
      ephemeralPublicKey: await crypto.subtle.exportKey('spki', ephemeralKeyPair.publicKey),
      iv,
      ciphertext: encrypted,
      version: 1,
    };
  }

  /**
   * Расшифровка данных
   */
  static async decryptForUser(
    encryptedData: EncryptedData,
    privateKey: CryptoKey
  ): Promise<string> {
    // Импортируем ephemeral public key
    const ephemeralKey = await crypto.subtle.importKey(
      'spki',
      encryptedData.ephemeralPublicKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );

    // Выводим shared secret
    const sharedBits = await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: ephemeralKey,
      },
      privateKey,
      256
    );

    // Выводим ключ шифрования
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        salt: new Uint8Array(32),
        info: new TextEncoder().encode('data-encryption'),
        hash: 'SHA-256',
      },
      sharedBits,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Расшифровываем
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: encryptedData.iv },
      derivedKey,
      encryptedData.ciphertext
    );

    return new TextDecoder().decode(decrypted);
  }
}
```

---

## 🚨 Риски и смягчение

### 1. Потеря ключей пользователем

**Риск:** Пользователь теряет доступ к данным навсегда  
**Смягчение:**

- Recovery phrase при регистрации
- Backup key опция
- Social recovery (в будущем)

### 2. Сложность для пользователей

**Риск:** Пользователи не понимают систему  
**Смягчение:**

- Простой UI/UX
- Подробная документация
- Поддержка через чат

### 3. Производительность

**Риск:** Шифрование на клиенте замедляет работу  
**Смягчение:**

- Web Workers для тяжелых операций
- Кэширование ключей в памяти
- Ленивое шифрование больших данных

---

## 📅 Timeline

| Этап                     | Длительность | Статус     |
| ------------------------ | ------------ | ---------- |
| Подготовка ZK библиотеки | 2-3 недели   | 📝 Planned |
| Механизм восстановления  | 2 недели     | 📝 Planned |
| Постепенная миграция     | 4-6 недель   | 📝 Planned |
| Финализация              | 2 недели     | 📝 Planned |

**Общая оценка:** 10-13 недель

---

## 📚 Дополнительные ресурсы

- [Web Crypto API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [BIP39 Mnemonic Code Words](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [Zero-Knowledge Proof Introduction](https://en.wikipedia.org/wiki/Zero-knowledge_proof)
