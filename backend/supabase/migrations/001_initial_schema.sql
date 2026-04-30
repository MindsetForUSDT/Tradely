-- ============================================================
-- TradeumDiary — Полная миграция схемы БД
-- Версия: 2.0.0-production
-- Дата: 2026-04-30
-- Юрисдикция: РФ (152-ФЗ, хранение на территории РФ)
-- ============================================================

BEGIN;

-- ============================================================
-- РАСШИРЕНИЯ
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM ТИПЫ
-- ============================================================

-- Настроение трейдера для журнала
DO $$ BEGIN
    CREATE TYPE mood_enum AS ENUM (
        'confident', 'neutral', 'fearful', 'greedy',
        'tilted', 'anxious', 'excited', 'disciplined'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Статус сделки
DO $$ BEGIN
    CREATE TYPE trade_status_enum AS ENUM ('open', 'closed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Категория тега
DO $$ BEGIN
    CREATE TYPE tag_category_enum AS ENUM (
        'strategy', 'emotion', 'timeframe', 'setup', 'mistake', 'custom'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Тип цели
DO $$ BEGIN
    CREATE TYPE goal_type_enum AS ENUM (
        'pnl', 'win_rate', 'trades_count', 'profit_factor', 'drawdown_limit'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Тип алерта
DO $$ BEGIN
    CREATE TYPE alert_type_enum AS ENUM (
        'pnl_target', 'drawdown', 'win_rate', 'volume_spike',
        'inactivity', 'goal_achieved', 'custom'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Метод расчёта налогов
DO $$ BEGIN
    CREATE TYPE tax_method_enum AS ENUM ('FIFO', 'LIFO', 'Specific_ID', 'Average_Cost');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Статус подключения биржи
DO $$ BEGIN
    CREATE TYPE sync_status_enum AS ENUM ('connected', 'error', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Тип feature flag
DO $$ BEGIN
    CREATE TYPE flag_type_enum AS ENUM ('boolean', 'percentage', 'user_segment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Блокчейн-сети
DO $$ BEGIN
    CREATE TYPE chain_enum AS ENUM (
        'ethereum', 'tron', 'solana', 'polygon',
        'bsc', 'arbitrum', 'optimism', 'avalanche', 'base'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Уровень подписки
DO $$ BEGIN
    CREATE TYPE subscription_tier_enum AS ENUM ('free', 'pro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- ТАБЛИЦЫ
-- ============================================================

-- ----------------------------------------------------------
-- 1. Профили пользователей
-- Хранит основные данные, подписку и лимиты
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    avatar_url TEXT,
    email_verified_at TIMESTAMPTZ,
    timezone TEXT DEFAULT 'Europe/Moscow',                  -- Часовой пояс пользователя (МСК по умолчанию)
    referrer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    last_login_at TIMESTAMPTZ,                              -- Последний вход
    last_login_ip TEXT,                                     -- IP последнего входа
    subscription_tier subscription_tier_enum DEFAULT 'free', -- Уровень подписки
    subscription_expires_at TIMESTAMPTZ,                    -- Дата истечения подписки
    trial_started_at TIMESTAMPTZ DEFAULT NOW(),             -- Начало триал-периода
    preferences JSONB DEFAULT '{
        "theme": "dark",
        "language": "ru",
        "notifications": {"email": true, "telegram": false, "discord": false}
    }'::jsonb,
    free_usage JSONB DEFAULT '{
        "trades_this_month": 0,
        "trade_limit": 500,
        "wallet_limit": 3,
        "tag_limit": 10,
        "reset_date": null
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Профили пользователей с информацией о подписке и лимитах';
COMMENT ON COLUMN public.profiles.timezone IS 'Часовой пояс в формате IANA (Europe/Moscow)';
COMMENT ON COLUMN public.profiles.free_usage IS 'JSON с текущим использованием и лимитами Free-тарифа';

-- ----------------------------------------------------------
-- 2. Кошельки
-- Адреса блокчейн-кошельков для импорта сделок
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    address TEXT NOT NULL,                                   -- Адрес кошелька
    chain chain_enum NOT NULL DEFAULT 'ethereum',            -- Блокчейн-сеть
    label TEXT,                                              -- Пользовательское название
    is_verified BOOLEAN DEFAULT false,                       -- Подтверждён через explorer API
    sync_enabled BOOLEAN DEFAULT true,                       -- Автосинхронизация включена
    processing_status TEXT DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    last_synced_at TIMESTAMPTZ,                              -- Последняя успешная синхронизация
    error_message TEXT,                                       -- Текст ошибки при сбое
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_wallet UNIQUE (user_id, address, chain)
);

COMMENT ON TABLE public.wallets IS 'Кошельки пользователей для автоматического импорта сделок';
COMMENT ON COLUMN public.wallets.is_verified IS 'Подтверждено существование через blockchain explorer';
COMMENT ON COLUMN public.wallets.sync_enabled IS 'Флаг автосинхронизации истории сделок';

-- ----------------------------------------------------------
-- 3. Сделки
-- Все торговые операции (импорт + ручной ввод)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    transaction_hash TEXT,                                   -- Хеш транзакции в блокчейне
    symbol TEXT NOT NULL,                                   -- Торговая пара (BTC/USDT)
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),     -- Направление
    amount NUMERIC(30,18) NOT NULL CHECK (amount > 0),      -- Количество базового актива
    price NUMERIC(30,18) NOT NULL CHECK (price > 0),        -- Цена исполнения
    entry_price NUMERIC(30,18),                              -- Цена входа (для частичных закрытий)
    exit_price NUMERIC(30,18),                               -- Цена выхода
    value_usd NUMERIC(20,2) NOT NULL DEFAULT 0
        CHECK (value_usd >= 0),                              -- Объём в USD
    fee NUMERIC(20,4) DEFAULT 0,                             -- Комиссия
    fee_currency TEXT DEFAULT 'USDT',                        -- Валюта комиссии
    status trade_status_enum DEFAULT 'closed',               -- Статус сделки
    leverage NUMERIC(5,2) DEFAULT 1 CHECK (leverage >= 1),  -- Кредитное плечо
    pnl_realized NUMERIC(20,2),                              -- Реализованный P&L (денежный)
    pnl_percent NUMERIC(8,4),                                -- P&L в процентах
    notes TEXT,                                              -- Заметки трейдера
    exchange TEXT,                                           -- Биржа (binance, bybit, ...)
    timestamp TIMESTAMPTZ NOT NULL,                          -- Время сделки
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_transaction UNIQUE (user_id, transaction_hash)
);

COMMENT ON TABLE public.trades IS 'Все торговые сделки пользователей';
COMMENT ON COLUMN public.trades.pnl_realized IS 'Реализованный P&L в USD (положительный = прибыль)';
COMMENT ON COLUMN public.trades.leverage IS 'Кредитное плечо (1 = спот)';

-- ----------------------------------------------------------
-- 4. Теги
-- Пользовательские и системные категории для сделок
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                                      -- Название тега
    color TEXT DEFAULT '#00FFA3',                            -- Цвет в HEX
    category tag_category_enum DEFAULT 'custom',             -- Категория
    is_system BOOLEAN DEFAULT false,                         -- Системный тег (нельзя удалить)
    usage_count INT DEFAULT 0,                               -- Счётчик использований
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tag UNIQUE (user_id, name)
);

COMMENT ON TABLE public.tags IS 'Теги для категоризации сделок';
COMMENT ON COLUMN public.tags.is_system IS 'Системные теги нельзя удалить пользователю';

-- ----------------------------------------------------------
-- 5. Связка сделок и тегов (Many-to-Many)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trade_tags (
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (trade_id, tag_id)
);

COMMENT ON TABLE public.trade_tags IS 'Связка Many-to-Many между сделками и тегами';

-- ----------------------------------------------------------
-- 6. Дневная аналитика
-- Агрегированные метрики за день, заполняется cron-задачей
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,                                      -- Дата
    total_volume_usd NUMERIC(20,2) DEFAULT 0,                -- Общий объём в USD
    total_trades INT DEFAULT 0,                               -- Количество сделок
    realized_pnl_usd NUMERIC(20,2) DEFAULT 0,                -- Реализованный P&L
    unrealized_pnl_usd NUMERIC(20,2) DEFAULT 0,              -- Нереализованный P&L
    win_rate NUMERIC(5,2) DEFAULT 0
        CHECK (win_rate BETWEEN 0 AND 100),                  -- Win rate %
    best_trade_usd NUMERIC(20,2) DEFAULT 0,                  -- Лучшая сделка дня
    worst_trade_usd NUMERIC(20,2) DEFAULT 0,                 -- Худшая сделка дня
    avg_hold_time_minutes INT DEFAULT 0,                     -- Среднее время удержания
    profit_factor NUMERIC(8,4) DEFAULT 0,                    -- Profit Factor
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_daily UNIQUE (user_id, date)
);

COMMENT ON TABLE public.daily_analytics IS 'Агрегированная дневная аналитика (PRO-фича)';
COMMENT ON COLUMN public.daily_analytics.profit_factor IS 'Отношение суммы прибыльных сделок к сумме убыточных';

-- ----------------------------------------------------------
-- 7. Цели пользователя
-- Трекер достижения торговых целей
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,                                     -- Название цели
    target_type goal_type_enum NOT NULL,                     -- Тип метрики
    target_value NUMERIC(20,2) NOT NULL,                     -- Целевое значение
    current_value NUMERIC(20,2) DEFAULT 0,                   -- Текущий прогресс
    start_date DATE NOT NULL,                                -- Дата начала
    end_date DATE,                                           -- Дедлайн
    is_achieved BOOLEAN DEFAULT false,                       -- Достигнута
    achieved_at TIMESTAMPTZ,                                 -- Дата достижения
    notified BOOLEAN DEFAULT false,                          -- Уведомление отправлено
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_goals IS 'Торговые цели пользователей с отслеживанием прогресса';

-- ----------------------------------------------------------
-- 8. Алерты
-- Настраиваемые уведомления о событиях
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                                      -- Название алерта
    alert_type alert_type_enum NOT NULL,                     -- Тип алерта
    condition_config JSONB NOT NULL DEFAULT '{}',            -- Конфигурация условия
    channels JSONB DEFAULT '["email"]',                      -- Каналы уведомлений
    webhook_url TEXT,                                        -- URL для webhook
    is_active BOOLEAN DEFAULT true,                          -- Алерт активен
    last_triggered_at TIMESTAMPTZ,                           -- Последний вызов
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.alerts IS 'Настраиваемые алерты с поддержкой email/telegram/discord/webhook';

-- ----------------------------------------------------------
-- 9. Торговый журнал
-- Ежедневные записи с настроением и анализом
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trading_journal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
    entry_date DATE NOT NULL,                                -- Дата записи
    mood mood_enum,                                         -- Настроение
    energy_level SMALLINT CHECK (energy_level BETWEEN 1 AND 10),
    sleep_hours NUMERIC(3,1) CHECK (sleep_hours BETWEEN 0 AND 24),
    notes TEXT,                                              -- Свободные заметки
    pre_trade_plan TEXT,                                    -- План перед торгами
    post_trade_review TEXT,                                 -- Разбор после торгов
    mistakes TEXT[],                                         -- Список ошибок
    lessons TEXT[],                                          -- Выученные уроки
    screen_time_minutes INT,                                 -- Экранное время
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.trading_journal IS 'Ежедневный торговый журнал с эмоциональной аналитикой';

-- ----------------------------------------------------------
-- 10. Налоговые отчёты
-- Автоматически генерируемые отчёты для ФНС
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tax_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tax_year SMALLINT NOT NULL,                              -- Налоговый год
    jurisdiction TEXT DEFAULT 'RU',                          -- Юрисдикция (RU = РФ)
    calculation_method tax_method_enum DEFAULT 'FIFO',       -- Метод расчёта
    total_trades INT DEFAULT 0,                               -- Всего сделок
    total_proceeds NUMERIC(20,2) DEFAULT 0,                  -- Общая выручка
    total_cost_basis NUMERIC(20,2) DEFAULT 0,                -- Общие затраты
    total_gains NUMERIC(20,2) DEFAULT 0,                     -- Прибыльные сделки
    total_losses NUMERIC(20,2) DEFAULT 0,                    -- Убыточные сделки
    net_result NUMERIC(20,2) DEFAULT 0,                      -- Чистый результат
    taxable_amount NUMERIC(20,2) DEFAULT 0,                  -- Налогооблагаемая база
    tax_rate NUMERIC(5,2) DEFAULT 13.00,                     -- Ставка НДФЛ (13% для РФ)
    estimated_tax NUMERIC(20,2) DEFAULT 0,                   -- Расчётный налог
    report_data JSONB,                                       -- Детальные данные отчёта
    generated_at TIMESTAMPTZ DEFAULT NOW()                   -- Дата генерации
);

COMMENT ON TABLE public.tax_reports IS 'Налоговые отчёты по сделкам (ФНС РФ, 152-ФЗ)';
COMMENT ON COLUMN public.tax_reports.tax_rate IS 'Ставка НДФЛ: 13% до 5 млн, 15% свыше';

-- ----------------------------------------------------------
-- 11. Подключения бирж
-- API-ключи для импорта сделок с централизованных бирж
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exchange_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    exchange TEXT NOT NULL,                                  -- Название биржи
    api_key_encrypted TEXT,                                  -- Зашифрованный API ключ
    api_secret_encrypted TEXT,                               -- Зашифрованный секрет
    api_passphrase_encrypted TEXT,                           -- Парольная фраза (если есть)
    read_only BOOLEAN DEFAULT true,                          -- Только чтение (без торговли)
    is_active BOOLEAN DEFAULT true,                          -- Подключение активно
    last_synced_at TIMESTAMPTZ,                              -- Последняя синхронизация
    sync_status sync_status_enum DEFAULT 'connected',        -- Статус
    error_message TEXT,                                       -- Ошибка при сбое
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.exchange_connections IS 'API-подключения к CEX биржам';
COMMENT ON COLUMN public.exchange_connections.read_only IS 'Рекомендуется read-only для безопасности';

-- ----------------------------------------------------------
-- 12. Feature Flags
-- Управление функциональностью без деплоя
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flag_key TEXT UNIQUE NOT NULL,                           -- Уникальный ключ флага
    description TEXT,                                         -- Описание
    flag_type flag_type_enum DEFAULT 'boolean',              -- Тип флага
    rules JSONB NOT NULL DEFAULT '{}',                       -- Правила активации
    is_active BOOLEAN DEFAULT true,                          -- Флаг активен
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.feature_flags IS 'Feature flags для управления функциональностью';

-- ----------------------------------------------------------
-- 13. Лимиты подписок
-- Конфигурация лимитов Free/Pro тарифов
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier subscription_tier_enum NOT NULL,                    -- Уровень подписки
    feature_key TEXT NOT NULL,                               -- Ключ фичи
    limit_value INT NOT NULL,                                -- Лимит (-1 = unlimited)
    description TEXT,                                         -- Описание
    UNIQUE (tier, feature_key)
);

COMMENT ON TABLE public.subscription_limits IS 'Лимиты функциональности по уровням подписки';
COMMENT ON COLUMN public.subscription_limits.limit_value IS '-1 означает безлимитный доступ';

-- ============================================================
-- ИНДЕКСЫ (для производительности)
-- ============================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON public.profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_referrer ON public.profiles(referrer_id) WHERE referrer_id IS NOT NULL;

-- Wallets
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_chain ON public.wallets(chain);
CREATE INDEX IF NOT EXISTS idx_wallets_status ON public.wallets(processing_status);

-- Trades
CREATE INDEX IF NOT EXISTS idx_trades_user_date ON public.trades(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_value ON public.trades(user_id, value_usd);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_tx ON public.trades(transaction_hash) WHERE transaction_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_exchange ON public.trades(exchange);

-- Tags
CREATE INDEX IF NOT EXISTS idx_tags_user ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_category ON public.tags(category);

-- Trade Tags
CREATE INDEX IF NOT EXISTS idx_trade_tags_trade ON public.trade_tags(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_tags_tag ON public.trade_tags(tag_id);

-- Daily Analytics
CREATE INDEX IF NOT EXISTS idx_daily_analytics_user ON public.daily_analytics(user_id, date DESC);

-- User Goals
CREATE INDEX IF NOT EXISTS idx_goals_user ON public.user_goals(user_id, is_achieved);

-- Alerts
CREATE INDEX IF NOT EXISTS idx_alerts_user ON public.alerts(user_id, is_active);

-- Trading Journal
CREATE INDEX IF NOT EXISTS idx_journal_user_date ON public.trading_journal(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_mood ON public.trading_journal(mood);

-- Tax Reports
CREATE INDEX IF NOT EXISTS idx_tax_reports_user_year ON public.tax_reports(user_id, tax_year);

-- Exchange Connections
CREATE INDEX IF NOT EXISTS idx_exchange_connections_user ON public.exchange_connections(user_id, exchange);

-- Feature Flags
CREATE INDEX IF NOT EXISTS idx_feature_flags_active ON public.feature_flags(flag_key, is_active);

-- ============================================================
-- SEED ДАННЫЕ
-- ============================================================

-- Лимиты Free-тарифа
INSERT INTO public.subscription_limits (tier, feature_key, limit_value, description) VALUES
    ('free', 'max_wallets', 3, 'Максимальное количество кошельков'),
    ('free', 'max_trades_per_month', 500, 'Лимит сделок в месяц'),
    ('free', 'max_tags', 10, 'Максимум пользовательских тегов'),
    ('free', 'export_csv', 1, 'Доступен CSV экспорт'),
    ('free', 'export_pdf', 1, 'Доступен PDF экспорт'),
    ('free', 'ai_recommendations', 0, 'AI-рекомендации недоступны'),
    ('free', 'backtesting', 0, 'Backtesting недоступен'),
    ('free', 'kelly_sizing', 0, 'Kelly Criterion недоступен'),
    ('free', 'tax_reports', 0, 'Налоговые отчёты недоступны'),
    ('free', 'sharpe_ratio', 0, 'Sharpe Ratio недоступен'),
    ('free', 'api_access', 0, 'API доступ недоступен'),
    ('free', 'webhooks', 0, 'Webhooks недоступны'),
    ('free', 'priority_support', 0, 'Приоритетная поддержка недоступна')
ON CONFLICT (tier, feature_key) DO NOTHING;

-- Лимиты Pro-тарифа (-1 = unlimited)
INSERT INTO public.subscription_limits (tier, feature_key, limit_value, description) VALUES
    ('pro', 'max_wallets', -1, 'Безлимитное количество кошельков'),
    ('pro', 'max_trades_per_month', -1, 'Безлимитное количество сделок'),
    ('pro', 'max_tags', -1, 'Безлимитное количество тегов'),
    ('pro', 'export_csv', 1, 'Доступен CSV экспорт'),
    ('pro', 'export_pdf', 1, 'Доступен PDF экспорт'),
    ('pro', 'ai_recommendations', 1, 'AI-рекомендации доступны'),
    ('pro', 'backtesting', 1, 'Backtesting доступен'),
    ('pro', 'kelly_sizing', 1, 'Kelly Criterion доступен'),
    ('pro', 'tax_reports', 1, 'Налоговые отчёты доступны'),
    ('pro', 'sharpe_ratio', 1, 'Sharpe Ratio доступен'),
    ('pro', 'api_access', 1, 'API доступ разрешён'),
    ('pro', 'webhooks', 1, 'Webhooks доступны'),
    ('pro', 'priority_support', 1, 'Приоритетная поддержка доступна')
ON CONFLICT (tier, feature_key) DO NOTHING;

-- Системные теги (is_system = true)
INSERT INTO public.tags (user_id, name, color, category, is_system)
SELECT
    id,
    'Победная',
    '#00FFA3',
    'custom'::tag_category_enum,
    true
FROM public.profiles
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO public.tags (user_id, name, color, category, is_system)
SELECT
    id,
    'Убыточная',
    '#FF3B5C',
    'custom'::tag_category_enum,
    true
FROM public.profiles
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO public.tags (user_id, name, color, category, is_system)
SELECT
    id,
    'FOMO',
    '#FFA500',
    'emotion'::tag_category_enum,
    true
FROM public.profiles
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO public.tags (user_id, name, color, category, is_system)
SELECT
    id,
    'По плану',
    '#4A90D9',
    'strategy'::tag_category_enum,
    true
FROM public.profiles
ON CONFLICT (user_id, name) DO NOTHING;

-- ============================================================
-- ТРИГГЕРЫ
-- ============================================================

-- Автосоздание профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    ref_id UUID;
    reset_date DATE;
BEGIN
    IF NEW.raw_user_meta_data->>'referrer_id' IS NOT NULL THEN
        ref_id := (NEW.raw_user_meta_data->>'referrer_id')::UUID;
    END IF;

    reset_date := (DATE_TRUNC('month', NOW()) + INTERVAL '1 month')::date;

    INSERT INTO public.profiles (id, username, avatar_url, timezone, referrer_id, subscription_tier, subscription_expires_at, trial_started_at, free_usage)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'trader_' || SUBSTRING(NEW.id::text, 1, 8)),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'timezone', 'Europe/Moscow'),
        ref_id,
        'free',
        NOW() + INTERVAL '7 days',
        NOW(),
        jsonb_build_object('trades_this_month', 0, 'trade_limit', 500, 'wallet_limit', 3, 'tag_limit', 10, 'reset_date', reset_date)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Обновление updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Инкремент usage_count при добавлении тега к сделке
CREATE OR REPLACE FUNCTION public.increment_tag_usage()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
    UPDATE public.tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_trade_tag_insert ON public.trade_tags;
CREATE TRIGGER on_trade_tag_insert AFTER INSERT ON public.trade_tags FOR EACH ROW EXECUTE FUNCTION public.increment_tag_usage();

-- Обновление free_usage при новой сделке
CREATE OR REPLACE FUNCTION public.update_free_usage()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
    UPDATE public.profiles
    SET free_usage = jsonb_set(free_usage, '{trades_this_month}', to_jsonb(COALESCE((free_usage->>'trades_this_month')::int, 0) + 1))
    WHERE id = NEW.user_id AND subscription_tier = 'free';
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_trade_insert ON public.trades;
CREATE TRIGGER on_trade_insert AFTER INSERT ON public.trades FOR EACH ROW EXECUTE FUNCTION public.update_free_usage();

-- ============================================================
-- ПОЛЕЗНЫЕ ФУНКЦИИ
-- ============================================================

-- Проверка лимита Free-тарифа
CREATE OR REPLACE FUNCTION public.check_free_limit(p_user_id UUID, p_feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_tier subscription_tier_enum;
    v_limit INT;
    v_used INT;
BEGIN
    SELECT subscription_tier INTO v_tier FROM public.profiles WHERE id = p_user_id;
    IF v_tier = 'pro' THEN RETURN true; END IF;

    SELECT limit_value INTO v_limit FROM public.subscription_limits WHERE tier = 'free' AND feature_key = p_feature_key;
    IF v_limit = -1 THEN RETURN true; END IF;

    IF p_feature_key = 'max_wallets' THEN
        SELECT COUNT(*) INTO v_used FROM public.wallets WHERE user_id = p_user_id;
    ELSIF p_feature_key = 'max_trades_per_month' THEN
        SELECT (free_usage->>'trades_this_month')::int INTO v_used FROM public.profiles WHERE id = p_user_id;
    ELSIF p_feature_key = 'max_tags' THEN
        SELECT COUNT(*) INTO v_used FROM public.tags WHERE user_id = p_user_id AND is_system = false;
    ELSE
        RETURN COALESCE(v_limit, 0) > 0;
    END IF;

    RETURN COALESCE(v_used, 0) < COALESCE(v_limit, 0);
END;
$$;

COMMIT;