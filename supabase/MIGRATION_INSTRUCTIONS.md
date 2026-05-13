# 🚀 Инструкция по миграции базы данных

## ⚠️ ВАЖНО: Перед миграцией

1. **Сделайте бэкап базы данных** в Supabase Dashboard → Settings → Database → Backups
2. **Протестируйте миграцию** на staging/development окружении сначала
3. **Сообщите пользователям** о плановых работах (если production)

---

## 📋 Что исправлено

### 1. Созданы ENUM типы

- `subscription_tier` - free/pro/enterprise
- `blockchain_network` - ethereum/solana/polygon и т.д.
- `trade_status` - open/closed/cancelled
- `tag_category` - custom/strategy/emotion/system
- `tax_method` - FIFO/LIFO/HIFO
- `wallet_processing_status` - pending/processing/completed/failed

### 2. Удалены лишние таблицы

- ❌ `exchange_connections` - дублирует wallets
- ❌ `alerts` - не используется
- ❌ `analytics_cache` - не используется
- ❌ `encryption_keys` - не используется
- ❌ `feature_flags` - не используется
- ❌ `import_sources` - дублирует wallets
- ❌ `risk_limits` - не используется
- ❌ `subscription_limits` - не используется
- ❌ `user_goals` - не используется

### 3. Добавлены индексы

- `idx_trades_user_timestamp` - для быстрой загрузки сделок
- `idx_trades_user_status` - для фильтрации по статусу
- `idx_daily_analytics_user_date` - для PRO аналитики
- И другие критичные индексы

### 4. Добавлены RLS политики

Все таблицы защищены Row Level Security:

- Пользователи видят только свои данные
- Service role может делать всё
- Предотвращены утечки данных между пользователями

### 5. Добавлены триггеры

- Автоматическое создание профиля при регистрации
- Обновление `updated_at`
- Подсчёт использования тегов
- Автоматический расчёт дневной аналитики

---

## 🔧 Применение миграции

### Вариант A: Через Supabase Dashboard (рекомендуется)

1. Зайдите в [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите проект: `zfgeofskmgycojbzrznk`
3. Перейдите в **SQL Editor**
4. Скопируйте содержимое `supabase-corrected-schema.sql`
5. Вставьте в редактор и нажмите **Run**
6. Проверьте логи на ошибки

### Вариант B: Через Supabase CLI

```bash
# 1. Установите Supabase CLI (если не установлен)
npm install -g supabase

# 2. Login в Supabase
supabase login

# 3. Примените миграцию
supabase db push

# Или выполните SQL напрямую:
supabase db execute --file supabase/supabase-corrected-schema.sql
```

### Вариант C: Через psql

```bash
# Подключение к базе данных
psql "postgresql://postgres:[YOUR-PASSWORD]@db.zfgeofskmgycojbzrznk.supabase.co:5432/postgres"

# Выполнение SQL файла
\i supabase/supabase-corrected-schema.sql

# Проверка результата
\dt
```

---

## ✅ Проверка после миграции

### 1. Проверьте ENUM типы

```sql
SELECT typname FROM pg_type WHERE typcategory = 'E';
```

**Ожидаемый результат:**

```
subscription_tier
blockchain_network
trade_status
tag_category
tax_method
wallet_processing_status
```

### 2. Проверьте таблицы

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

**Ожидаемый результат (только эти таблицы):**

```
profiles
wallets
trades
tags
trade_tags
daily_analytics
tax_reports
```

### 3. Проверьте индексы

```sql
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
```

### 4. Проверьте RLS политики

```sql
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public';
```

### 5. Проверьте триггеры

```sql
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

### 6. Тестовые запросы

```sql
-- Проверка профиля текущего пользователя
SELECT * FROM profiles WHERE id = auth.uid();

-- Проверка RLS (должны видеть только свои данные)
SELECT COUNT(*) FROM wallets;
SELECT COUNT(*) FROM trades;

-- Проверка триггера создания профиля
-- (создайте нового пользователя и проверьте profiles)
```

---

## 🐛 Устранение проблем

### Проблема 1: "type already exists"

**Решение:** ENUM типы уже созданы. Используйте `DO $$ ... EXCEPTION WHEN duplicate_object THEN null; END $$;` блок (уже в скрипте).

### Проблема 2: "relation already exists"

**Решение:** Таблицы уже существуют. Скрипт использует `CREATE TABLE IF NOT EXISTS`.

### Проблема 3: "policy already exists"

**Решение:** Скрипт удаляет старые политики перед созданием новых (`DROP POLICY IF EXISTS`).

### Проблема 4: Ошибка foreign key

**Решение:** Убедитесь, что `auth.users` существует и есть доступ к нему.

### Проблема 5: RLS блокирует доступ

**Решение:** Проверьте, что политика "Users can view own profile" создана и active.

---

## 🔄 Откат миграции

Если что-то пошло не так:

```sql
-- 1. Удалить триггеры
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS on_trade_tag_change ON public.trade_tags;
DROP TRIGGER IF EXISTS on_trade_change_calculate_analytics ON public.trades;

-- 2. Удалить функции
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.update_tag_usage_count() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_daily_analytics() CASCADE;
DROP FUNCTION IF EXISTS public.generate_mock_trades() CASCADE;

-- 3. Удалить RLS политики
DROP POLICY IF EXISTS ON public.profiles;
DROP POLICY IF EXISTS ON public.wallets;
DROP POLICY IF EXISTS ON public.trades;
-- и т.д.

-- 4. Отключить RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets DISABLE ROW LEVEL SECURITY;
-- и т.д.

-- 5. Восстановить из бэкапа (через Dashboard)
```

---

## 📊 Мониторинг после миграции

### 1. Проверьте производительность запросов

```sql
-- Медленные запросы
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### 2. Проверьте использование индексов

```sql
-- Индексы не используемые
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

### 3. Проверьте ошибки в логах

```sql
-- Ошибки в error_logs (если таблица есть)
SELECT * FROM error_logs
ORDER BY timestamp DESC
LIMIT 20;
```

---

## 📞 Поддержка

Если возникнут проблемы:

1. Проверьте логи Supabase → Database → Logs
2. Проверьте логи Edge Functions → Functions → Logs
3. Создайте issue с деталями ошибки

---

## ✨ После успешной миграции

1. Обновите код если нужно (проверьте импорты)
2. Протестируйте основные сценарии:
   - Регистрация пользователя
   - Добавление кошелька
   - Добавление сделки
   - Просмотр дашборда
3. Задеплойте изменения на production

---

**Удачи с миграцией!** 🚀
