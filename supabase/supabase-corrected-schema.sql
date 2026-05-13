-- ============================================
-- TradeumDiary - Исправленная схема БД
-- Версия: 2.0
-- Дата: 2025-01-02
-- ============================================

-- ============================================
-- 1. ENUM ТИПЫ
-- ============================================

-- Подписка пользователя
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Блокчейн сети
DO $$ BEGIN
    CREATE TYPE blockchain_network AS ENUM ('ethereum', 'solana', 'polygon', 'bsc', 'arbitrum', 'optimism', 'avalanche', 'base');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Статус сделки
DO $$ BEGIN
    CREATE TYPE trade_status AS ENUM ('open', 'closed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Категория тега
DO $$ BEGIN
    CREATE TYPE tag_category AS ENUM ('custom', 'strategy', 'emotion', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Метод расчёта налогов
DO $$ BEGIN
    CREATE TYPE tax_method AS ENUM ('FIFO', 'LIFO', 'HIFO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Статус обработки кошелька
DO $$ BEGIN
    CREATE TYPE wallet_processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. ОСНОВНЫЕ ТАБЛИЦЫ
-- ============================================

-- 2.1 Профили пользователей
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    avatar_url TEXT,
    email_verified_at TIMESTAMPTZ,
    timezone TEXT DEFAULT 'Europe/Moscow',
    referrer_id UUID REFERENCES public.profiles(id),
    last_login_at TIMESTAMPTZ,
    last_login_ip TEXT,
    
    -- Подписка
    subscription_tier subscription_tier DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    trial_started_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Настройки
    preferences JSONB DEFAULT '{"theme": "dark", "language": "ru", "notifications": {"email": true, "discord": false, "telegram": false}}'::jsonb,
    
    -- Использование (для free тарифа)
    free_usage JSONB DEFAULT '{"tag_limit": 10, "reset_date": null, "trade_limit": 500, "wallet_limit": 3, "trades_this_month": 0}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Профили пользователей с информацией о подписке';
COMMENT ON COLUMN public.profiles.subscription_tier IS 'Уровень подписки: free, pro или enterprise';
COMMENT ON COLUMN public.profiles.free_usage IS 'Лимиты и статистика использования для free тарифа';

-- Индексы для profiles
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON public.profiles(subscription_tier) WHERE subscription_tier = 'pro';
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_referrer ON public.profiles(referrer_id);

-- 2.2 Кошельки и биржи
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    chain blockchain_network NOT NULL DEFAULT 'ethereum',
    label TEXT,
    
    -- Статус
    is_verified BOOLEAN DEFAULT false,
    sync_enabled BOOLEAN DEFAULT true,
    processing_status wallet_processing_status DEFAULT 'pending',
    
    -- Синхронизация
    last_synced_at TIMESTAMPTZ,
    last_processed_block BIGINT,
    error_message TEXT,
    
    -- Зашифрованные API-ключи (для CEX)
    encrypted_credentials TEXT,
    credentials_iv BYTEA,
    credentials_tag BYTEA,
    
    -- Провайдеры
    web3_provider TEXT,
    cex_provider TEXT,
    
    -- Timestamps
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.wallets IS 'Кошельки пользователей для автоматического импорта сделок';
COMMENT ON COLUMN public.wallets.encrypted_credentials IS 'Зашифрованные API-ключи биржи';
COMMENT ON COLUMN public.wallets.processing_status IS 'Статус обработки импорта истории';

-- Индексы для wallets
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_chain ON public.wallets(chain);
CREATE INDEX IF NOT EXISTS idx_wallets_processing_status ON public.wallets(processing_status) WHERE processing_status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_wallets_web3_provider ON public.wallets(web3_provider);
CREATE INDEX IF NOT EXISTS idx_wallets_cex_provider ON public.wallets(cex_provider);

-- Уникальность адреса для пользователя
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_user_address ON public.wallets(user_id, address) WHERE address IS NOT NULL;

-- 2.3 Сделки
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    transaction_hash TEXT,
    
    -- Основная информация
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    price NUMERIC NOT NULL CHECK (price > 0),
    
    -- Для спотовых сделок
    entry_price NUMERIC,
    exit_price NUMERIC,
    
    -- Финансы
    value_usd NUMERIC NOT NULL DEFAULT 0 CHECK (value_usd >= 0),
    fee NUMERIC DEFAULT 0,
    fee_currency TEXT DEFAULT 'USDT',
    
    -- Статус и леверидж
    status trade_status DEFAULT 'closed',
    leverage NUMERIC DEFAULT 1 CHECK (leverage >= 1),
    
    -- P&L
    pnl_realized NUMERIC,
    pnl_percent NUMERIC,
    
    -- Дополнительная информация
    notes TEXT,
    exchange TEXT,
    commission NUMERIC DEFAULT 0,
    screenshot_url TEXT,
    timeframe TEXT,
    strategy_tag TEXT,
    risk_reward NUMERIC,
    
    -- Источники
    import_source TEXT DEFAULT 'manual',
    
    -- Timestamps
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Вычисляемые поля
    holding_time_minutes INTEGER
);

COMMENT ON TABLE public.trades IS 'Сделки пользователей';
COMMENT ON COLUMN public.trades.import_source IS 'Источник импорта: manual, binance, bybit, metamask и т.д.';

-- Индексы для trades (критично для производительности!)
CREATE INDEX IF NOT EXISTS idx_trades_user_timestamp ON public.trades(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_status ON public.trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_wallet_id ON public.trades(wallet_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON public.trades(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_pnl ON public.trades(user_id, pnl_realized DESC);

-- 2.4 Теги для сделок
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#00FFA3',
    category tag_category DEFAULT 'custom',
    is_system BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tags IS 'Пользовательские теги для категоризации сделок';

-- Индексы для tags
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_user_name ON public.tags(user_id, name);

-- Связь сделок и тегов (многие-ко-многим)
CREATE TABLE IF NOT EXISTS public.trade_tags (
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (trade_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_trade_tags_trade_id ON public.trade_tags(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_tags_tag_id ON public.trade_tags(tag_id);

-- 2.5 Дневная аналитика (PRO фича)
CREATE TABLE IF NOT EXISTS public.daily_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Метрики
    total_volume_usd NUMERIC DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    realized_pnl_usd NUMERIC DEFAULT 0,
    unrealized_pnl_usd NUMERIC DEFAULT 0,
    win_rate NUMERIC DEFAULT 0 CHECK (win_rate >= 0 AND win_rate <= 100),
    best_trade_usd NUMERIC DEFAULT 0,
    worst_trade_usd NUMERIC DEFAULT 0,
    avg_hold_time_minutes INTEGER DEFAULT 0,
    profit_factor NUMERIC DEFAULT 0,
    
    -- Timestamps
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.daily_analytics IS 'Агрегированная дневная аналитика по сделкам (PRO-фича)';

-- Индексы для daily_analytics
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_analytics_user_date ON public.daily_analytics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON public.daily_analytics(date);

-- 2.6 Налоговые отчёты
CREATE TABLE IF NOT EXISTS public.tax_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tax_year SMALLINT NOT NULL,
    jurisdiction TEXT DEFAULT 'RU',
    calculation_method tax_method DEFAULT 'FIFO',
    
    -- Итоги
    total_trades INTEGER DEFAULT 0,
    total_proceeds NUMERIC DEFAULT 0,
    total_cost_basis NUMERIC DEFAULT 0,
    total_gains NUMERIC DEFAULT 0,
    total_losses NUMERIC DEFAULT 0,
    net_result NUMERIC DEFAULT 0,
    taxable_amount NUMERIC DEFAULT 0,
    tax_rate NUMERIC DEFAULT 13.00,
    estimated_tax NUMERIC DEFAULT 0,
    
    -- Детальные данные
    report_data JSONB,
    
    -- Timestamps
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.tax_reports IS 'Налоговые отчёты для пользователей';

-- Индексы для tax_reports
CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_reports_user_year ON public.tax_reports(user_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_tax_reports_tax_year ON public.tax_reports(tax_year);

-- ============================================
-- 3. RLS ПОЛИТИКИ (Row Level Security)
-- ============================================

-- Включить RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_reports ENABLE ROW LEVEL SECURITY;

-- Политики для profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
CREATE POLICY "Users can create own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND subscription_tier = (SELECT subscription_tier FROM public.profiles WHERE id = auth.uid())
    );

-- Политики для wallets
DROP POLICY IF EXISTS "Users can view own wallets" ON public.wallets;
CREATE POLICY "Users can view own wallets" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wallets" ON public.wallets;
CREATE POLICY "Users can insert own wallets" ON public.wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wallets" ON public.wallets;
CREATE POLICY "Users can update own wallets" ON public.wallets
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wallets" ON public.wallets;
CREATE POLICY "Users can delete own wallets" ON public.wallets
    FOR DELETE USING (auth.uid() = user_id);

-- Политики для trades
DROP POLICY IF EXISTS "Users can view own trades" ON public.trades;
CREATE POLICY "Users can view own trades" ON public.trades
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own trades" ON public.trades;
CREATE POLICY "Users can insert own trades" ON public.trades
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own trades" ON public.trades;
CREATE POLICY "Users can update own trades" ON public.trades
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own trades" ON public.trades;
CREATE POLICY "Users can delete own trades" ON public.trades
    FOR DELETE USING (auth.uid() = user_id);

-- Политики для tags
DROP POLICY IF EXISTS "Users can view own tags" ON public.tags;
CREATE POLICY "Users can view own tags" ON public.tags
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own tags" ON public.tags;
CREATE POLICY "Users can manage own tags" ON public.tags
    FOR ALL USING (auth.uid() = user_id);

-- Политики для trade_tags
DROP POLICY IF EXISTS "Users can view trade tags" ON public.trade_tags;
CREATE POLICY "Users can view trade tags" ON public.trade_tags
    FOR SELECT USING (
        trade_id IN (SELECT id FROM public.trades WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can manage trade tags" ON public.trade_tags;
CREATE POLICY "Users can manage trade tags" ON public.trade_tags
    FOR ALL USING (
        trade_id IN (SELECT id FROM public.trades WHERE user_id = auth.uid())
    );

-- Политики для daily_analytics
DROP POLICY IF EXISTS "Users can view own analytics" ON public.daily_analytics;
CREATE POLICY "Users can view own analytics" ON public.daily_analytics
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can insert analytics" ON public.daily_analytics;
CREATE POLICY "Service can insert analytics" ON public.daily_analytics
    FOR INSERT WITH CHECK (true); -- Сервисная роль может создавать

-- Политики для tax_reports
DROP POLICY IF EXISTS "Users can view own tax reports" ON public.tax_reports;
CREATE POLICY "Users can view own tax reports" ON public.tax_reports
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own tax reports" ON public.tax_reports;
CREATE POLICY "Users can create own tax reports" ON public.tax_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. ТРИГГЕРЫ И ФУНКЦИИ
-- ============================================

-- 4.1 Автоматическое создание профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email_verified_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at ELSE NULL END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Триггер на регистрацию
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4.2 Обновление updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4.3 Обновление usage_count для тегов
CREATE OR REPLACE FUNCTION public.update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS on_trade_tag_change ON public.trade_tags;
CREATE TRIGGER on_trade_tag_change
    AFTER INSERT OR DELETE ON public.trade_tags
    FOR EACH ROW EXECUTE FUNCTION public.update_tag_usage_count();

-- 4.4 Функция обновления дневной аналитики
CREATE OR REPLACE FUNCTION public.calculate_daily_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Вставка или обновление записей daily_analytics
    INSERT INTO public.daily_analytics (user_id, date, total_volume_usd, total_trades, realized_pnl_usd, win_rate, best_trade_usd, worst_trade_usd, avg_hold_time_minutes, profit_factor)
    SELECT 
        user_id,
        DATE(timestamp) as date,
        SUM(value_usd) as total_volume_usd,
        COUNT(*) as total_trades,
        COALESCE(SUM(CASE WHEN status = 'closed' THEN pnl_realized ELSE 0 END), 0) as realized_pnl_usd,
        0 as unrealized_pnl_usd,
        CASE 
            WHEN COUNT(*) FILTER (WHERE status = 'closed' AND pnl_realized > 0) > 0 
            THEN (COUNT(*) FILTER (WHERE status = 'closed' AND pnl_realized > 0)::numeric / NULLIF(COUNT(*) FILTER (WHERE status = 'closed'), 0)::numeric * 100)
            ELSE 0 
        END as win_rate,
        MAX(CASE WHEN status = 'closed' THEN pnl_realized ELSE 0 END) as best_trade_usd,
        MIN(CASE WHEN status = 'closed' THEN pnl_realized ELSE 0 END) as worst_trade_usd,
        AVG(COALESCE(holding_time_minutes, 0))::integer as avg_hold_time_minutes,
        CASE 
            WHEN COALESCE(SUM(CASE WHEN status = 'closed' AND pnl_realized < 0 THEN ABS(pnl_realized) ELSE 0 END), 0) > 0
            THEN COALESCE(SUM(CASE WHEN status = 'closed' AND pnl_realized > 0 THEN pnl_realized ELSE 0 END), 0) / 
                 SUM(CASE WHEN status = 'closed' AND pnl_realized < 0 THEN ABS(pnl_realized) ELSE 0 END)
            ELSE 0 
        END as profit_factor
    FROM public.trades
    WHERE DATE(timestamp) = DATE(CURRENT_DATE)
    GROUP BY user_id, DATE(timestamp)
    ON CONFLICT (user_id, date) DO UPDATE
    SET 
        total_volume_usd = EXCLUDED.total_volume_usd,
        total_trades = EXCLUDED.total_trades,
        realized_pnl_usd = EXCLUDED.realized_pnl_usd,
        win_rate = EXCLUDED.win_rate,
        best_trade_usd = EXCLUDED.best_trade_usd,
        worst_trade_usd = EXCLUDED.worst_trade_usd,
        avg_hold_time_minutes = EXCLUDED.avg_hold_time_minutes,
        profit_factor = EXCLUDED.profit_factor,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Триггер на вставку/обновление сделок
DROP TRIGGER IF EXISTS on_trade_change_calculate_analytics ON public.trades;
CREATE TRIGGER on_trade_change_calculate_analytics
    AFTER INSERT OR UPDATE ON public.trades
    FOR EACH STATEMENT EXECUTE FUNCTION public.calculate_daily_analytics();

-- ============================================
-- 5. ТЕСТОВЫЕ ФУНКЦИИ (ОПЦИОНАЛЬНО - НЕ ОБЯЗАТЕЛЬНО)
-- ============================================
-- Примечание: Эта секция не обязательна для работы приложения.
-- Закомментируйте или удалите, если не нужна.

/* 
-- Функция для генерации тестовых данных (только для dev окружения)
-- Раскомментируйте, если нужны тестовые данные

CREATE OR REPLACE FUNCTION public.generate_mock_trades(user_id_param UUID, num_trades INTEGER DEFAULT 100)
RETURNS VOID AS $$
DECLARE
    i INTEGER := 0;
    symbols TEXT[] := ARRAY['ETH/USDT', 'BTC/USDT', 'SOL/USDT', 'BNB/USDT', 'ADA/USDT'];
    sides TEXT[] := ARRAY['buy', 'sell'];
    base_price NUMERIC;
    amount NUMERIC;
    pnl NUMERIC;
BEGIN
    WHILE i < num_trades LOOP
        base_price := (RANDOM() * 50000 + 1000)::NUMERIC;
        amount := (RANDOM() * 10 + 0.1)::NUMERIC;
        pnl := (RANDOM() * 1000 - 300)::NUMERIC;
        
        INSERT INTO public.trades (user_id, symbol, side, amount, price, value_usd, status, pnl_realized, timestamp)
        VALUES (
            user_id_param,
            symbols[FLOOR(RANDOM() * ARRAY_LENGTH(symbols, 1) + 1)::INTEGER],
            sides[FLOOR(RANDOM() * ARRAY_LENGTH(sides, 1) + 1)::INTEGER],
            amount,
            base_price,
            amount * base_price,
            'closed',
            pnl,
            NOW() - (INTERVAL '1 day' * FLOOR(RANDOM() * 30)) - (INTERVAL '1 hour' * FLOOR(RANDOM() * 24))
        );
        
        i := i + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = '';

COMMENT ON FUNCTION public.generate_mock_trades() IS 'Генерирует тестовые данные (только для dev)';
*/

-- ============================================
-- 6. ПРИМЕЧАНИЯ И КОММЕНТАРИИ
-- ============================================

COMMENT ON SCHEMA public IS 'Основная схема для TradeumDiary';
COMMENT ON FUNCTION public.handle_new_user() IS 'Создаёт профиль при регистрации пользователя';
COMMENT ON FUNCTION public.calculate_daily_analytics() IS 'Обновляет дневную аналитику при изменении сделок';

-- ============================================
-- END OF MIGRATION
-- ============================================
