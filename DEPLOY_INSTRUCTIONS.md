# Инструкция по развёртыванию Edge Function

## Проблема "Failed to fetch"

Ошибка возникает потому, что Edge Function `test-exchange-connection` не развёрнута в Supabase.

---

## ✅ Решение: Развёртывание через Supabase Dashboard

### Шаг 1: Откройте Supabase Dashboard

🔗 **https://app.supabase.com**

1. Войдите в аккаунт
2. Выберите проект **TradeumD**

### Шаг 2: Перейдите в Edge Functions

В левом меню:

1. Прокрутите вниз
2. Нажмите **Edge Functions**

### Шаг 3: Создайте новую функцию

1. Нажмите синюю кнопку **"New function"**
2. В поле **Function slug** введите: `test-exchange-connection`
3. Нажмите **"Import from file"** или откройте редактор
4. Откройте файл в вашем проекте: `supabase/functions/test-exchange-connection/index.ts`
5. **Скопируйте ВСЁ содержимое файла** (Ctrl+A → Ctrl+C)
6. **Вставьте в редактор Supabase** (Ctrl+V)

### Шаг 4: Нажмите "Deploy"

Подождите 10-20 секунд пока функция развёртывается

---

## ✅ Проверка развёртывания

После развёртывания функция будет доступна по URL:

```
https://[YOUR-PROJECT-REF].supabase.co/functions/v1/test-exchange-connection
```

Тест через браузер (должен вернуть 401 Unauthorized - это нормально):

```
https://YOUR-PROJECT-REF.supabase.co/functions/v1/test-exchange-connection
```

---

## 🚀 После развёртывания

1. **Перезагрузите фронтенд** (если запущен локально)
2. **Попробуйте добавить кошелёк биржи**
3. **Нажмите "Проверить подключение"**

Ожидаемый результат:

- ✅ "Подключение успешно! Найдено активов: X"
- Или конкретная ошибка от API биржи (неверный ключ и т.д.)

---

## 📋 Файл для развёртывания

Вам понадобится **только один файл**:

- `supabase/functions/test-exchange-connection/index.ts`

**Весь код находится в одном файле** (Binance, Bybit, HMAC подпись)

---

## ⚠️ Если функция не работает

### Проверка через curl

```bash
curl -X POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/test-exchange-connection \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR-ANON-KEY" \
  -d '{
    "exchange": "binance",
    "api_key": "YOUR_API_KEY",
    "api_secret": "YOUR_API_SECRET"
  }'
```

### Возможные проблемы:

1. **Функция не найдена (404)**
   - Функция не развёрнута или неправильный slug

2. **Ошибка CORS**
   - Проверьте заголовки CORS в функции

3. **Ошибка 500**
   - Проверьте логи функции в Supabase Dashboard (Logs tab)

4. **"Invalid token" (401)**
   - Используйте VITE_SUPABASE_ANON_KEY из .env

---

## 🔒 Безопасность

ВНИМАНИЕ: Эта функция принимает API ключи в открытом виде. В production рекомендуется:

1. Шифровать ключи на клиенте перед отправкой
2. Расшифровывать их внутри функции
3. Никогда не сохранять в БД в открытом виде

Для этого проекта используется шифрование на клиенте (`encryptApiCredentials`) при сохранении кошелька.

---

## 📚 Дополнительные функции

Для полноценной работы также развёрните:

- `sync-wallet-trades` - для синхронизации сделок
- `encrypt-credentials` - для шифрования ключей
- `decrypt-credentials` - для расшифровки ключей

Все файлы находятся в `supabase/functions/`
