# 📋 Инструкция по миграции базы данных

## ⚠️ **КРИТИЧНО: Перед началом**

1. **Сделайте бэкап базы данных** в Supabase Dashboard
2. **Проверьте, что у вас есть доступ** к Supabase проект
3. **Сохраните все SQL-скрипты** локально

---

## 🔧 **Шаг 1: Сравнить текущую схему с новой**

```bash
# Выведите текущую схему
supabase db dump -f current-schema.sql

# Сравните с corrected-schema.sql
diff current-schema.sql supabase/supabase-corrected-schema.sql
```

---

## 📝 **Шаг 2: Применить исправления**

### Вариант A: Через Supabase Dashboard (Рекомендуется)

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **SQL Editor**
4. Скопируйте содержимое `supabase/supabase-corrected-schema.sql`
5. Выполните скрипт

### Вариант B: Через CLI

```bash
# Установите Supabase CLI если не установлен
npm install -g supabase

# Login
supabase login

# Link проект
supabase link --project-ref <your-project-ref>

# Применить миграцию
supabase db push
```

---

## ✅ **Шаг 3: Проверить применение**

```sql
-- Проверить что таблицы существуют
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Проверить что индексы созданы
SELECT indexname FROM pg_indexes WHERE schemaname = 'public';

-- Проверить RLS политики
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public';
```

---

## 🚨 **Важные примечания**

### 1. **Конфликтующие политики RLS**

Если получите ошибку "policy already exists", выполните:

```sql
-- Удалить старые политики перед созданием новых
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can update own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can delete own wallets" ON public.wallets;

DROP POLICY IF EXISTS "Users can view own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can insert own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can update own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can delete own trades" ON public.trades;
```

### 2. **Дублирующиеся типы ENUM**

Если получите ошибку "type already exists":

```sql
-- Проверить существующие типы
SELECT typname FROM pg_type WHERE typtype = 'e';

-- Если типы существуют, использовать их без создания
```

### 3. **Триггеры и функции**

Если триггеры уже существуют:

```sql
-- Удалить старые триггеры
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS on_trade_change_calculate_analytics ON public.trades;

-- Удалить старые функции
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.calculate_daily_analytics();
```

---

## 🧪 **Шаг 4: Тестирование**

### Тест 1: Регистрация пользователя

```sql
-- Создайте тестового пользователя
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES ('test-uuid', 'test@example.com', 'hashed_password', NOW());

-- Проверить создание профиля
SELECT * FROM profiles WHERE id = 'test-uuid';
```

### Тест 2: Добавление кошелька

```sql
-- Добавить тестовый кошелек
INSERT INTO wallets (user_id, address, chain, label)
VALUES ('test-uuid', '0x1234567890123456789012345678901234567890', 'ethereum', 'Test Wallet');

-- Проверить
SELECT * FROM wallets WHERE user_id = 'test-uuid';
```

### Тест 3: Добавление сделки

```sql
-- Добавить тестовую сделку
INSERT INTO trades (user_id, wallet_id, symbol, side, amount, price, value_usd, timestamp)
VALUES (
  'test-uuid',
  (SELECT id FROM wallets WHERE user_id = 'test-uuid' LIMIT 1),
  'ETH/USDT',
  'buy',
  1.5,
  3200,
  4800,
  NOW()
);

-- Проверить
SELECT * FROM trades WHERE user_id = 'test-uuid';
```

### Тест 4: RLS политики

```sql
-- Попытаться получить чужие данные (должно быть запрещено)
SET LOCAL ROLE anon;
SELECT * FROM trades WHERE user_id != 'test-uuid';
-- Должно вернуть 0 строк

-- Сбросить роль
RESET ROLE;
```

---

## 📊 **Шаг 5: Мониторинг после миграции**

### Проверить ошибки в приложении

```bash
# В браузере откройте DevTools Console
# Ищите ошибки:
# - "relation does not exist"
# - "permission denied"
# - "column does not exist"
```

### Проверить производительность

```sql
-- Медленные запросы
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 🔄 **Откат изменений**

Если что-то пошло не так:

```sql
-- 1. Отключить RLS (временно)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades DISABLE ROW LEVEL SECURITY;

-- 2. Удалить новые таблицы (ОСТОРОЖНО!)
-- DROP TABLE IF EXISTS public.daily_analytics CASCADE;
-- DROP TABLE IF EXISTS public.tax_reports CASCADE;

-- 3. Восстановить из бэкапа
-- supabase db pull -f backup.sql
```

---

## 📞 **Поддержка**

Если возникли проблемы:

1. **Проверьте логи Supabase** в Dashboard → Logs
2. **Проверьте SQL syntax** на [SQL Fiddle](http://sqlfiddle.com/)
3. **Обратитесь в поддержку** с логами ошибок

---

## ✨ **Дополнительные оптимизации**

После успешной миграции выполните:

```sql
-- Обновить статистику для оптимизатора запросов
ANALYZE public.profiles;
ANALYZE public.wallets;
ANALYZE public.trades;
ANALYZE public.daily_analytics;

-- Проанализировать индексы
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## 📝 **Чек-лист завершения**

- [ ] Сделан бэкап БД
- [ ] Применена схема `supabase-corrected-schema.sql`
- [ ] Все таблицы созданы
- [ ] Все индексы созданы
- [ ] Все RLS политики применены
- [ ] Все триггеры работают
- [ ] Регистрация пользователей работает
- [ ] Добавление кошельков работает
- [ ] Добавление сделок работает
- [ ] RLS политики блокируют доступ к чужим данным
- [ ] Нет ошибок в консоли браузера
- [ ] Нет медленных запросов в pg_stat_statements

---

**Дата миграции:** ******\_\_\_******
**Выполнил:** ******\_\_\_******
**Статус:** ✅ / ❌
