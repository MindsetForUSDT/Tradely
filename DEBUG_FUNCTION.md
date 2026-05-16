# Диагностика проблемы "Failed to fetch"

## ✅ Быстрая проверка

### 1. Откройте тестовую страницу

1. Откройте файл: `test-function.html` в браузере
2. Нажмите **"Выполнить тест"** для каждой проверки

**Ожидаемые результаты:**

- Проверка 1: ✅ 401 Unauthorized (функция работает, но нет тела запроса)
- Проверка 2: ✅ 400 или 500 с ошибкой валидации (функция работает с некорректными ключами)
- Проверка 3: ✅ CORS заголовки присутствуют

**Если видите 404:** Функция НЕ развёрнута → разверните её!

---

### 2. Проверьте консоль браузера

1. Откройте DevTools (F12)
2. Перейдите во вкладку **Console**
3. Попробуйте добавить кошелёк в приложении
4. Посмотрите логи:
   ```
   [WalletConnect] Calling Edge Function: ...
   [WalletConnect] Payload: ...
   [WalletConnect] Response status: ...
   [WalletConnect] Verify error: ...
   ```

**Что показывает ошибка?**

- `Failed to fetch` → функция недоступна (404 или CORS)
- `401 Unauthorized` → проблема с ключом
- `404 Not Found` → функция не развёрнута

---

### 3. Проверьте развёртывание функции

1. Откройте: https://app.supabase.com/project/TradeumD/functions
2. Найдите функцию `test-exchange-connection` в списке
3. **Если её нет** → создайте и разверните!
4. **Если есть** → нажмите на неё и посмотрите **Logs**

---

## 🔧 Если функция НЕ развёрнута

### Быстрое развёртывание:

1. Откройте: https://app.supabase.com/project/TradeumD/functions/new
2. Slug: `test-exchange-connection`
3. Скопируйте содержимое: `supabase/functions/test-exchange-connection/index.ts`
4. Вставьте в редактор
5. Нажмите **Deploy**

**Время развёртывания:** ~15-30 секунд

---

## 🔧 Если функция развёрнута, но не работает

### Проверка через Postman/curl:

```bash
curl -X POST https://zfgeofskmgycojbzrznk.supabase.co/functions/v1/test-exchange-connection \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmZ2VvZnNrbWd5Y29qYnpyem5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDAyOTEsImV4cCI6MjA5MjI3NjI5MX0.D8TJb9Wn-b_RpxG7I4MluTuBxoP68YheoqMu_Dlu8xo" \
  -d '{
    "exchange": "binance",
    "api_key": "test",
    "api_secret": "test"
  }'
```

**Ожидаемый ответ:**

```json
{
  "success": false,
  "message": "Ошибка подключения",
  "error": "..."
}
```

Если получаете `404` или `Failed to fetch` → функция не работает.

---

## 🐛 Распространённые проблемы

### Проблема: "Module not found"

**Решение:** Используйте **один файл** `index.ts` (всё в одном), не используйте относительные импорты

### Проблема: CORS ошибка в браузере

**Решение:** Убедитесь что в функции есть заголовок:

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### Проблема: "401 Unauthorized"

**Решение:** Проверьте что используете `VITE_SUPABASE_ANON_KEY` из `.env`

### Проблема: "404 Not Found"

**Решение:** Функция не развёрнута → разверните через Dashboard

---

## 📞 Если ничего не помогает

1. Откройте **Supabase Dashboard** → **Edge Functions** → **test-exchange-connection**
2. Перейдите на вкладку **Logs**
3. Посмотрите последние ошибки
4. Скопируйте текст ошибки и отправьте разработчику

---

## ✅ После успешной развёртки

1. Перезагрузите приложение (`F5` или `Ctrl+R`)
2. Откройте консоль (F12)
3. Попробуйте добавить кошелёк Binance
4. Должны увидеть:
   ```
   [WalletConnect] Calling Edge Function: ...
   [WalletConnect] Response status: 200
   [WalletConnect] Success: {...}
   ✅ "Подключение успешно! Найдено активов: X"
   ```
