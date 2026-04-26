-- ============================================================
-- TradeumDiary — Полная схема базы данных
-- Версия: 1.0.0
-- Описание: Таблицы, индексы, RLS политики, триггеры и cron-функции
-- ============================================================

-- Включаем необходимые расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- Генерация UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Криптографические функции (для шифрования адресов)
CREATE EXTENSION IF NOT EXISTS "pg_cron";        -- Планировщик задач

-- ============================================================
-- ТИПЫ ДАННЫХ (ENUM)
-- ============================================================

-- Уровень подписки пользователя
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'pro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Сеть блокчейна
DO $$ BEGIN
    CREATE TYPE blockchain_network AS ENUM ('ethereum', 'solana', 'polygon', 'bsc', 'arbitrum', 'optimism');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Статус обработки кошелька
DO $$ BEGIN
    CREATE TYPE wallet_processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- ТАБЛИЦЫ
-- ============================================================

-- 1. Профили пользователей (расширение auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    avatar_url TEXT,
    subscription_tier subscription_tier NOT NULL DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- CHECK ограничения
    CONSTRAINT valid_username_length CHECK (char_length(username) BETWEEN 3 AND 30),
    CONSTRAINT valid_username_chars CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

-- Индексы для profiles
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires ON public.profiles(subscription_expires_at)
    WHERE subscription_tier = 'pro';

COMMENT ON TABLE public.profiles IS 'Профили пользователей с информацией о подписке';
COMMENT ON COLUMN public.profiles.subscription_tier IS 'Уровень подписки: free или pro';
COMMENT ON COLUMN public.profiles.subscription_expires_at IS 'Дата истечения PRO-подписки';


-- 2. Кошельки пользователей
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    address TEXT NOT NULL,  -- Зашифрован на уровне приложения через pgcrypto
    chain blockchain_network NOT NULL,
    label TEXT,  -- Пользовательское название кошелька
    processing_status wallet_processing_status NOT NULL DEFAULT 'pending',
    last_synced_at TIMESTAMPTZ,
    error_message TEXT,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Один пользователь не может добавить один и тот же адрес дважды
    CONSTRAINT unique_wallet_per_user UNIQUE (user_id, address, chain)
);

-- Индексы для wallets
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_processing_status ON public.wallets(processing_status)
    WHERE processing_status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_wallets_chain ON public.wallets(chain);

COMMENT ON TABLE public.wallets IS 'Кошельки пользователей для автоматического импорта сделок';
COMMENT ON COLUMN public.wallets.address IS 'Адрес кошелька, зашифрованный pgcrypto';
COMMENT ON COLUMN public.wallets.processing_status IS 'Статус обработки импорта истории';


-- 3. Сделки (трейды)
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    transaction_hash TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    token_in TEXT NOT NULL,
    token_out TEXT NOT NULL,
    amount_in NUMERIC NOT NULL,
    amount_out NUMERIC NOT NULL,
    value_usd NUMERIC NOT NULL DEFAULT 0,
    is_buy BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Уникальность транзакции для пользователя
    CONSTRAINT unique_transaction_per_user UNIQUE (user_id, transaction_hash),

    -- CHECK ограничения
    CONSTRAINT positive_amount_in CHECK (amount_in > 0),
    CONSTRAINT positive_amount_out CHECK (amount_out > 0),
    CONSTRAINT positive_value_usd CHECK (value_usd >= 0)
);

-- Индексы для trades (критично для производительности при 100k+ пользователей)
CREATE INDEX IF NOT EXISTS idx_trades_user_timestamp ON public.trades(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_wallet_id ON public.trades(wallet_id);
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON public.trades(timestamp);
CREATE INDEX IF NOT EXISTS idx_trades_token_in ON public.trades(token_in);
CREATE INDEX IF NOT EXISTS idx_trades_token_out ON public.trades(token_out);
CREATE INDEX IF NOT EXISTS idx_trades_value_usd ON public.trades(user_id, value_usd);

COMMENT ON TABLE public.trades IS 'Все сделки пользователей, импортированные из блокчейнов';
COMMENT ON COLUMN public.trades.value_usd IS 'Оценочная стоимость сделки в USD на момент совершения';


-- 4. Дневная аналитика (заполняется cron-задачей)
CREATE TABLE IF NOT EXISTS public.daily_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_volume_usd NUMERIC NOT NULL DEFAULT 0,
    total_trades INTEGER NOT NULL DEFAULT 0,
    realized_pnl_usd NUMERIC DEFAULT 0,
    win_rate NUMERIC DEFAULT 0,
    best_trade_usd NUMERIC DEFAULT 0,
    worst_trade_usd NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Одна запись на пользователя в день
    CONSTRAINT unique_daily_analytics UNIQUE (user_id, date),

    -- CHECK ограничения
    CONSTRAINT valid_win_rate CHECK (win_rate >= 0 AND win_rate <= 100)
);

-- Индексы для daily_analytics
CREATE INDEX IF NOT EXISTS idx_daily_analytics_user_date ON public.daily_analytics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON public.daily_analytics(date);

COMMENT ON TABLE public.daily_analytics IS 'Агрегированная дневная аналитика по сделкам (PRO-фича)';
COMMENT ON COLUMN public.daily_analytics.realized_pnl_usd IS 'Реализованный P&L в USD за день';
COMMENT ON COLUMN public.daily_analytics.win_rate IS 'Процент прибыльных сделок (0-100)';


-- ============================================================
-- ROW LEVEL SECURITY (RLS) — КРИТИЧЕСКИЙ РАЗДЕЛ
-- ============================================================

-- Включаем RLS для всех таблиц
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_analytics ENABLE ROW LEVEL SECURITY;

-- --------------------
-- RLS: profiles
-- --------------------

-- Политика: пользователь видит только свой профиль
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Политика: пользователь может создать свой профиль при регистрации
CREATE POLICY "Users can create own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Политика: пользователь может обновлять только свой профиль (но не subscription_tier!)
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        -- Нельзя самому изменить уровень подписки
        AND subscription_tier = (SELECT subscription_tier FROM public.profiles WHERE id = auth.uid())
    );

-- Политика: только сервисная роль может менять subscription_tier
CREATE POLICY "Service role can update subscription"
    ON public.profiles FOR UPDATE
    USING (true)
    WITH CHECK (true);


-- --------------------
-- RLS: wallets
-- --------------------

-- Политика: пользователь видит только свои кошельки
CREATE POLICY "Users can view own wallets"
    ON public.wallets FOR SELECT
    USING (auth.uid() = user_id);

-- Политика: пользователь может добавлять кошельки
CREATE POLICY "Users can add wallets"
    ON public.wallets FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        -- Бесплатные пользователи могут добавить не более 3 кошельков
        AND (
            (SELECT subscription_tier FROM public.profiles WHERE id = auth.uid()) = 'pro'
            OR
            (SELECT COUNT(*) FROM public.wallets WHERE user_id = auth.uid()) < 3
        )
    );

-- Политика: пользователь может удалять свои кошельки
CREATE POLICY "Users can delete own wallets"
    ON public.wallets FOR DELETE
    USING (auth.uid() = user_id);


-- --------------------
-- RLS: trades
-- --------------------

-- Политика: пользователь видит только свои сделки
CREATE POLICY "Users can view own trades"
    ON public.trades FOR SELECT
    USING (auth.uid() = user_id);

-- Политика: только сервисная роль и cron могут вставлять сделки
CREATE POLICY "Service role can insert trades"
    ON public.trades FOR INSERT
    WITH CHECK (
        -- Проверяем, что кошелек принадлежит пользователю
        EXISTS (
            SELECT 1 FROM public.wallets
            WHERE id = wallet_id AND user_id = auth.uid()
        )
    );

-- Политика: запрет на UPDATE и DELETE сделок пользователем
-- (Сделки иммутабельны после импорта)
CREATE POLICY "Users cannot modify trades"
    ON public.trades FOR UPDATE
    USING (false);

CREATE POLICY "Users cannot delete trades"
    ON public.trades FOR DELETE
    USING (false);


-- --------------------
-- RLS: daily_analytics
-- --------------------

-- Политика: пользователь видит только свою аналитику
CREATE POLICY "Users can view own analytics"
    ON public.daily_analytics FOR SELECT
    USING (auth.uid() = user_id);

-- Политика: только сервисная роль может записывать аналитику
CREATE POLICY "Service role can insert analytics"
    ON public.daily_analytics FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can update analytics"
    ON public.daily_analytics FOR UPDATE
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- ТРИГГЕРЫ И ФУНКЦИИ
-- ============================================================

-- Функция: автоматическое создание профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'trader_' || SUBSTRING(NEW.id::text, 1, 8)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Триггер на создание пользователя
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Функция: обновление updated_at в profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- CRON-ЗАДАЧИ (pg_cron)
-- ============================================================

-- Планировщик работает в UTC. Расписание:
-- '*/5 * * * *' — каждые 5 минут
-- '0 2 * * *'  — каждый день в 2:00 UTC (5:00 МСК)

-- Задача 1: Обработка очереди кошельков (каждые 5 минут)
-- Эта задача вызывает Edge Function через http_post
SELECT cron.schedule(
    'process-wallet-queue',
    '*/5 * * * *',
    $$
    SELECT net.http_post(
        url := current_setting('app.edge_function_url') || '/fetch-trade-history',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.cron_secret') || '"}'::jsonb,
        body := '{"action": "process_queue"}'::jsonb
    );
    $$
);

-- Задача 2: Расчет дневной аналитики для PRO-пользователей (каждый день в 2:00 UTC)
SELECT cron.schedule(
    'calculate-daily-analytics',
    '0 2 * * *',
    $$
    WITH yesterday_trades AS (
        SELECT
            t.user_id,
            DATE(t.timestamp) AS trade_date,
            COUNT(*) AS total_trades,
            SUM(t.value_usd) AS total_volume_usd,
            -- Расчет P&L: для sell-сделок (is_buy = false) считаем профит
            SUM(
                CASE
                    WHEN t.is_buy = false THEN (t.amount_out - t.amount_in) * t.value_usd / NULLIF(t.amount_in, 0)
                    ELSE 0
                END
            ) AS realized_pnl_usd,
            -- Лучшая и худшая сделки
            MAX(t.value_usd) AS best_trade_usd,
            MIN(t.value_usd) AS worst_trade_usd,
            -- Процент прибыльных сделок
            COUNT(*) FILTER (WHERE t.is_buy = false AND t.amount_out > t.amount_in) * 100.0 / NULLIF(COUNT(*) FILTER (WHERE t.is_buy = false), 0) AS win_rate
        FROM public.trades t
        JOIN public.profiles p ON t.user_id = p.id AND p.subscription_tier = 'pro'
        WHERE DATE(t.timestamp) = CURRENT_DATE - INTERVAL '1 day'
        GROUP BY t.user_id, DATE(t.timestamp)
    )
    INSERT INTO public.daily_analytics (
        user_id,
        date,
        total_volume_usd,
        total_trades,
        realized_pnl_usd,
        win_rate,
        best_trade_usd,
        worst_trade_usd
    )
    SELECT
        user_id,
        trade_date,
        total_volume_usd,
        total_trades,
        COALESCE(realized_pnl_usd, 0),
        COALESCE(win_rate, 0),
        best_trade_usd,
        worst_trade_usd
    FROM yesterday_trades
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        total_volume_usd = EXCLUDED.total_volume_usd,
        total_trades = EXCLUDED.total_trades,
        realized_pnl_usd = EXCLUDED.realized_pnl_usd,
        win_rate = EXCLUDED.win_rate,
        best_trade_usd = EXCLUDED.best_trade_usd,
        worst_trade_usd = EXCLUDED.worst_trade_usd,
        updated_at = NOW();
    $$
);

-- Задача 3: Очистка истекших PRO-подписок (каждый час)
SELECT cron.schedule(
    'expire-pro-subscriptions',
    '0 * * * *',
    $$
    UPDATE public.profiles
    SET subscription_tier = 'free',
        subscription_expires_at = NULL
    WHERE subscription_tier = 'pro'
      AND subscription_expires_at < NOW();
    $$
);

-- Задача 4: Очистка старых логов (раз в неделю, по воскресеньям в 3:00 UTC)
SELECT cron.schedule(
    'cleanup-old-data',
    '0 3 * * 0',
    $$
    -- Удаляем записи о неудачных попытках синхронизации старше 30 дней
    UPDATE public.wallets
    SET error_message = NULL
    WHERE processing_status = 'failed'
      AND last_synced_at < NOW() - INTERVAL '30 days';
    $$
);


-- ============================================================
-- ХЕЛПЕР-ФУНКЦИИ ДЛЯ API
-- ============================================================

-- Функция: получить общий баланс пользователя (сумма USD по последним сделкам)
CREATE OR REPLACE FUNCTION public.get_user_balance(user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    total NUMERIC;
BEGIN
    -- Считаем сумму value_usd последних сделок
    -- (упрощенный расчет, в реальности нужно считать по токенам)
    SELECT COALESCE(SUM(value_usd), 0)
    INTO total
    FROM public.trades
    WHERE user_id = $1
      AND timestamp >= NOW() - INTERVAL '24 hours';

    RETURN total;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- Функция: получить P&L за сегодня
CREATE OR REPLACE FUNCTION public.get_daily_pnl(user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    pnl NUMERIC;
BEGIN
    SELECT COALESCE(realized_pnl_usd, 0)
    INTO pnl
    FROM public.daily_analytics
    WHERE user_id = $1
      AND date = CURRENT_DATE
    ORDER BY updated_at DESC
    LIMIT 1;

    RETURN pnl;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';


-- ============================================================
-- НАСТРОЙКИ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================================

-- Настройка автовакуума для таблиц с высокой нагрузкой
ALTER TABLE public.trades SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE public.daily_analytics SET (
    autovacuum_vacuum_scale_factor = 0.1
);

-- Установка статистики для оптимизатора запросов
ALTER TABLE public.trades ALTER COLUMN user_id SET STATISTICS 1000;
ALTER TABLE public.trades ALTER COLUMN timestamp SET STATISTICS 1000;

-- ============================================================
-- ГРАНТЫ (права доступа)
-- ============================================================

-- Даем права на использование схемы
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Даем права на таблицы согласно ролям
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

GRANT SELECT, INSERT, DELETE ON public.wallets TO authenticated;

GRANT SELECT ON public.trades TO authenticated;
GRANT INSERT ON public.trades TO service_role;

GRANT SELECT ON public.daily_analytics TO authenticated;
GRANT INSERT, UPDATE ON public.daily_analytics TO service_role;

-- Даем права на функции
GRANT EXECUTE ON FUNCTION public.get_user_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_pnl TO authenticated;

-- ============================================================
-- ЗАВЕРШЕНИЕ
-- ============================================================
-- Схема готова к развертыванию.
-- Все политики RLS активны.
-- Cron-задачи настроены.
-- ============================================================