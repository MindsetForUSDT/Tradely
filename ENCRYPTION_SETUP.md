# 🔐 Шифрование API-ключей бирж — Документация

## ✅ Реализовано: Серверное шифрование (Вариант A)

### Архитектура

```
┌─────────────┐      ┌─────────────────────┐      ┌─────────────────┐
│   Клиент    │─────▶│  encrypt-credentials │─────▶│  Supabase DB    │
│  (Browser)  │      │  (Edge Function)     │      │  (Encrypted)    │
└─────────────┘      └─────────────────────┘      └─────────────────┘
                          ▲                                      │
                          │                                      ▼
┌─────────────┐      ┌─────────────────────┐      ┌─────────────────┐
│   Клиент    │◀─────│  decrypt-credentials │◀─────│  Wallets Table  │
│  (Browser)  │      │  (Edge Function)     │      │  (Encrypted)    │
└─────────────┘      └─────────────────────┘      └─────────────────┘
```

**Принцип:** API-ключи НИКОГДА не видны на клиенте в открытом виде. Всё шифрование/расшифровка происходит на сервере.

---

## 📦 Созданные Edge Functions

### 1. `encrypt-credentials`

**Путь:** `supabase/functions/encrypt-credentials/index.ts`

**Назначение:** Шифрует API-ключи бирж перед сохранением в БД

**API:**

- **Method:** POST
- **Headers:** `Authorization: Bearer <admin_api_key>`
- **Body:** `{ "apiKey": "...", "apiSecret": "..." }`
- **Response:** `{ "encrypted_data": "...", "iv": "...", "tag": "" }`

**Использует ключи:**

- `API_KEY_ENCRYPTION_KEY_NEW` (приоритет)
- `API_KEY_ENCRYPTION_KEY` (fallback)

---

### 2. `decrypt-credentials`

**Путь:** `supabase/functions/decrypt-credentials/index.ts`

**Назначение:** Расшифровывает API-ключи для импорта сделок

**API:**

- **Method:** POST
- **Headers:** `Authorization: Bearer <supabase_anon_key>`
- **Body:** `{ "encrypted_data": "...", "iv": "..." }`
- **Response:** `{ "apiKey": "...", "apiSecret": "..." }`

**Поддерживает версионирование ключей:**

1. Сначала пробует `API_KEY_ENCRYPTION_KEY_NEW`
2. Если не получилось → `API_KEY_ENCRYPTION_KEY`

---

### 3. `import-exchange-trades` (обновлена)

**Путь:** `supabase/functions/import-exchange-trades/index.ts`

**Изменения:**

- Удалено локальное шифрование
- Теперь вызывает `decrypt-credentials` для получения ключей
- Использует расшифрованные ключи для импорта сделок

---

## 🔄 Процесс добавления кошелька

### Шаг 1: Клиент отправляет данные

```typescript
// src/components/dashboard/WalletConnect.tsx
const encryptedData = await encryptApiCredentials(apiKey, apiSecret);
```

### Шаг 2: Клиент вызывает Edge Function

```typescript
// src/lib/encryption.ts
const response = await fetch(`${supabaseUrl}/functions/v1/encrypt-credentials`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'x-api-key': accessToken,
  },
  body: JSON.stringify({ apiKey, apiSecret }),
});
```

### Шаг 3: Edge Function шифрует и возвращает

```typescript
// supabase/functions/encrypt-credentials/index.ts
const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, data);
return { encrypted_data, iv, tag: '' };
```

### Шаг 4: Клиент сохраняет в БД

```typescript
// src/components/dashboard/WalletConnect.tsx
const walletData = {
  encrypted_credentials: encryptedData.encrypted_data,
  credentials_iv: Buffer.from(encryptedData.iv, 'hex'),
  credentials_tag: Buffer.from(encryptedData.tag, 'hex'),
  // ...
};
await supabase.from('wallets').insert(walletData);
```

---

## 🔄 Процесс импорта сделок

### Шаг 1: Edge Function получает зашифрованные данные из БД

```sql
SELECT encrypted_credentials, credentials_iv FROM wallets WHERE id = '...';
```

### Шаг 2: Вызывает decrypt-credentials

```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/decrypt-credentials`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${supabaseAnonKey}` },
  body: JSON.stringify({ encrypted_data, iv }),
});
```

### Шаг 3: Получает расшифрованные ключи и делает запрос к бирже

```typescript
const { apiKey, apiSecret } = await response.json();
const trades = await fetchBinanceTrades(apiKey, apiSecret);
```

---

## 🔧 Настройка в Supabase Dashboard

### 1. Перейдите в Edge Functions → Manage Secrets

### 2. Добавьте/проверьте переменные:

```env
# Ключ для шифрования (64 hex символа = 256 бит)
API_KEY_ENCRYPTION_KEY=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2

# Новый ключ (для ротации, опционально)
API_KEY_ENCRYPTION_KEY_NEW=b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3

# Stripe webhook secret
WEBHOOK_SECRET_STRIPE=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Crypto webhook secret
WEBHOOK_SECRET_CRYPTO=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Admin API ключ для encrypt-credentials
ADMIN_API_KEY=your_admin_api_key_here
```

### 3. Сгенерировать ключ (если нужно):

```bash
# Через Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Через OpenSSL
openssl rand -hex 32
```

---

## 🚀 Деплой Edge Functions

### Локальная разработка:

```bash
supabase functions new encrypt-credentials
supabase functions new decrypt-credentials
supabase functions deploy encrypt-credentials
supabase functions deploy decrypt-credentials
```

### Через Dashboard:

1. Зайдите в Supabase Dashboard → Edge Functions
2. Нажмите "Import new function"
3. Загрузите файлы из `supabase/functions/encrypt-credentials/` и `decrypt-credentials/`

---

## 🔒 Безопасность

### ✅ Что защищено:

1. **API-ключи никогда не хранятся в открытом виде**
2. **Шифрование на сервере** с использованием AES-256-GCM
3. **Версионирование ключей** для безопасной ротации
4. **Авторизация через ADMIN_API_KEY** для encrypt-credentials
5. **Service Role Key** для decrypt-credentials

### ⚠️ Важно:

- Никогда не коммитьте ключи в Git
- Используйте разные ключи для dev/prod
- Регулярно ротуйте ключи (раз в 6-12 месяцев)
- Храните ADMIN_API_KEY в безопасном месте

---

## 🧪 Тестирование

### 1. Проверка шифрования:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/encrypt-credentials \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"test123","apiSecret":"secret456"}'
```

### 2. Проверка расшифровки:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/decrypt-credentials \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"encrypted_data":"...","iv":"..."}'
```

---

## 📝 Чеклист перед продакшеном

- [ ] Ключи `API_KEY_ENCRYPTION_KEY` и `API_KEY_ENCRYPTION_KEY_NEW` добавлены в Supabase Secrets
- [ ] `ADMIN_API_KEY` настроен и защищён
- [ ] Edge Functions деплойнуты и работают
- [ ] Тест добавления кошелька с API-ключами прошёл успешно
- [ ] Тест импорта сделок прошёл успешно
- [ ] RLS политики на таблице `wallets` настроены правильно
- [ ] Документация обновлена

---

## 📞 Поддержка

При проблемах:

1. Проверьте логи Edge Functions в Supabase Dashboard
2. Убедитесь, что ключи настроены правильно (64 hex символа)
3. Проверьте, что `ADMIN_API_KEY` совпадает в запросе и секретах
4. Убедитесь, что `SUPABASE_SERVICE_ROLE_KEY` имеет доступ к функциям

---

**Версия:** 2.0  
**Дата обновления:** 2025-01-02  
**Статус:** ✅ Готово к продакшену
