# 🗄️ Сводка схемы базы данных

## ✅ Основные таблицы (7 штук)

| Таблица           | Описание                                   | Кол-во колонок |
| ----------------- | ------------------------------------------ | -------------- |
| `profiles`        | Профили пользователей, подписка, настройки | 15             |
| `wallets`         | Кошельки и биржи, зашифрованные API-ключи  | 17             |
| `trades`          | Сделки пользователей                       | 30             |
| `tags`            | Пользовательские теги                      | 8              |
| `trade_tags`      | Связь сделок и тегов (M:N)                 | 2              |
| `daily_analytics` | Дневная аналитика (PRO)                    | 12             |
| `tax_reports`     | Налоговые отчёты                           | 16             |

---

## 🔑 Ключевые отношения

```
auth.users (Supabase Auth)
    ↓ 1:1
profiles (расширение профиля)
    ↓ 1:N
wallets (кошельки/биржи)
    ↓ 1:N
trades (сделки)
    ↓ N:N (через trade_tags)
tags (теги)
```

---

## 📊 Статистика

### ENUM типы (6 штук)

- `subscription_tier` - free/pro/enterprise
- `blockchain_network` - 8 сетей
- `trade_status` - open/closed/cancelled
- `tag_category` - 4 категории
- `tax_method` - FIFO/LIFO/HIFO
- `wallet_processing_status` - 4 статуса

### Индексы (20+ штук)

- Основные PK и FK
- Составные индексы для частых запросов
- Уникальные индексы для предотвращения дубликатов

### RLS политики (18 штук)

- SELECT/INSERT/UPDATE/DELETE для каждой таблицы
- Защита данных пользователей
- Service role bypass

### Триггеры (4 штуки)

- `on_auth_user_created` - создание профиля
- `set_profiles_updated_at` - обновление timestamp
- `on_trade_tag_change` - подсчёт usage_count
- `on_trade_change_calculate_analytics` - авто-расчёт аналитики

---

## 🔒 Безопасность

### RLS (Row Level Security)

✅ Включено для всех таблиц  
✅ Пользователи видят только свои данные  
✅ Service role может всё  
✅ Проверка на уровне базы данных

### Шифрование

✅ API-ключи бирж шифруются AES-256-GCM  
✅ IV и tag хранятся отдельно  
✅ Зашифрованные данные в `wallets.encrypted_credentials`

### Ограничения

✅ CHECK ограничения на числах (amount > 0, price > 0)  
✅ CHECK на win_rate (0-100)  
✅ CHECK на leverage (>= 1)  
✅ UNIQUE на username, user_id + address

---

## 📈 Производительность

### Индексы для частых запросов

```sql
-- Сделки по пользователю и времени (основной запрос дашборда)
idx_trades_user_timestamp (user_id, timestamp DESC)

-- Сделки по статусу
idx_trades_user_status (user_id, status)

-- Дневная аналитика
idx_daily_analytics_user_date (user_id, date)

-- Поиск тегов
idx_tags_user_name (user_id, name)
```

### Материализованные данные

✅ `daily_analytics` - предвычисленная дневная статистика  
✅ `tags.usage_count` - авто-подсчёт использования

---

## 🚀 Что было удалено

### Таблицы (9 штук)

- `exchange_connections` - дублировал wallets
- `alerts` - не используется
- `analytics_cache` - не используется
- `encryption_keys` - не используется
- `feature_flags` - не используется
- `import_sources` - дублировал wallets
- `payment_attempts` - логи в приложении
- `payment_logs` - логи в приложении
- `risk_limits` - не используется
- `subscription_limits` - не используется
- `trading_journal` - можно добавить позже
- `user_goals` - не используется

### Причина

- Не используется в коде
- Дублирует существующую функциональность
- Упрощение поддержки

---

## 📝 Совместимость с кодом

### ✅ Совместимо

- `src/lib/supabase.ts` - подключение
- `src/hooks/useWallets.ts` - wallets таблица
- `src/hooks/useTradesOptimized.ts` - trades таблица
- `src/components/dashboard/WalletConnect.tsx` - wallets + шифрование
- `src/pages/Dashboard.tsx` - daily_analytics
- `src/lib/taxCalculator.ts` - tax_reports

### ⚠️ Нужно проверить

- Миграция старых данных (если есть)
- Соответствие ENUM значений в коде
- RLS политики не блокируют доступ

---

## 🔄 Миграция данных

### Если есть старые данные

```sql
-- 1. Миграция exchange_connections → wallets
INSERT INTO wallets (user_id, address, chain, cex_provider, encrypted_credentials, credentials_iv, credentials_tag, processing_status)
SELECT
    user_id,
    'cex:' || exchange,  -- адрес для CEX
    'ethereum',          -- по умолчанию
    exchange,            -- cex_provider
    api_key_encrypted || '|' || api_secret_encrypted,  -- объединить
    NULL,                -- iv
    NULL,                -- tag
    'completed'
FROM exchange_connections
WHERE is_active = true;

-- 2. Миграция import_sources → wallets
INSERT INTO wallets (user_id, address, chain, cex_provider, processing_status)
SELECT
    user_id,
    source_type || ':imported',
    'ethereum',
    source_type,
    'pending'
FROM import_sources
WHERE is_active = true;

-- 3. Удалить старые таблицы после миграции
DROP TABLE IF EXISTS exchange_connections CASCADE;
DROP TABLE IF EXISTS import_sources CASCADE;
```

---

## 📞 Контакты

**Вопросы по схеме:**

- Проверить существующие таблицы: `\dt`
- Проверить индексы: `\di`
- Проверить RLS: `SELECT * FROM pg_policies;`

**Проблемы:**

- Логирование ошибок → `error_logs` (если нужно)
- Мониторинг производительности → pg_stat_statements

---

**Версия схемы:** 2.0  
**Дата создания:** 2025-01-02  
**Статус:** ✅ Готово к применению
