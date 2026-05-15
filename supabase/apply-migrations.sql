-- ============================================
-- TradeumDiary - ИСПРАВЛЕННЫЕ миграции
-- Скопируйте и выполните в Supabase SQL Editor
-- ============================================

-- ============================================
-- ЧАСТЬ 1: Таблицы аудита безопасности
-- ============================================

-- 1.1 События безопасности
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL', 'ERROR')),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    request_id TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON public.security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity) WHERE severity IN ('CRITICAL', 'ERROR');

-- 1.2 Алерты об аномалиях
CREATE TABLE IF NOT EXISTS public.anomaly_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ip_address INET,
    description TEXT NOT NULL,
    evidence JSONB DEFAULT '{}',
    recommended_action TEXT,
    status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE')),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_timestamp ON public.anomaly_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_severity ON public.anomaly_alerts(severity) WHERE severity IN ('HIGH', 'CRITICAL');
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_status ON public.anomaly_alerts(status) WHERE status = 'NEW';

-- 1.3 Счётчики для rate limiting (ИСПРАВЛЕНО: time_window_ms вместо window)
CREATE TABLE IF NOT EXISTS public.rate_limit_counts (
    id BIGSERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    time_window_ms INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_counts_key ON public.rate_limit_counts(key);

-- 1.4 Отслеживание неудачных попыток аутентификации
CREATE TABLE IF NOT EXISTS public.auth_failures (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ip_address INET,
    reason TEXT NOT NULL,
    failure_count INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_auth_failures_timestamp ON public.auth_failures(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_auth_failures_user_id ON public.auth_failures(user_id);

-- 1.5 Отслеживание неудач расшифровки
CREATE TABLE IF NOT EXISTS public.decryption_failures (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    encrypted_data_hash TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_decryption_failures_timestamp ON public.decryption_failures(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_decryption_failures_user_id ON public.decryption_failures(user_id);

-- 1.6 Отслеживание API запросов
CREATE TABLE IF NOT EXISTS public.api_requests (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    ip_address INET,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_api_requests_timestamp ON public.api_requests(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_user_id ON public.api_requests(user_id);

-- ============================================
-- ЧАСТЬ 2: RLS политики
-- ============================================

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decryption_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service can manage security events" ON public.security_events;
CREATE POLICY "Service can manage security events" ON public.security_events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service can manage anomaly alerts" ON public.anomaly_alerts;
CREATE POLICY "Service can manage anomaly alerts" ON public.anomaly_alerts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service can manage rate limits" ON public.rate_limit_counts;
CREATE POLICY "Service can manage rate limits" ON public.rate_limit_counts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service can manage auth failures" ON public.auth_failures;
CREATE POLICY "Service can manage auth failures" ON public.auth_failures FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service can manage decryption failures" ON public.decryption_failures;
CREATE POLICY "Service can manage decryption failures" ON public.decryption_failures FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service can manage API requests" ON public.api_requests;
CREATE POLICY "Service can manage API requests" ON public.api_requests FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ЧАСТЬ 3: Обновление таблицы wallets
-- ============================================

ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"autoSync": true, "syncInterval": 60}'::jsonb,
ADD COLUMN IF NOT EXISTS passphrase_encrypted TEXT,
ADD COLUMN IF NOT EXISTS last_trade_id TEXT,
ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sync_error TEXT,
ADD COLUMN IF NOT EXISTS last_sync_status TEXT,
ADD COLUMN IF NOT EXISTS total_trades_imported INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_wallets_sync_enabled ON public.wallets(sync_enabled) WHERE sync_enabled = true;
CREATE INDEX IF NOT EXISTS idx_wallets_last_synced ON public.wallets(last_synced_at DESC) WHERE sync_enabled = true;

-- ============================================
-- ЧАСТЬ 4: Обновление таблицы trades
-- ============================================

ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS exchange_trade_id TEXT,
ADD COLUMN IF NOT EXISTS order_id TEXT,
ADD COLUMN IF NOT EXISTS trade_type TEXT DEFAULT 'spot' CHECK (trade_type IN ('spot', 'future', 'margin', 'option'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_user_exchange_trade_id ON public.trades(user_id, exchange_trade_id) WHERE exchange_trade_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trades_order_id ON public.trades(order_id);

-- ============================================
-- ЧАСТЬ 5: Таблица sync_logs
-- ============================================

CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trades_imported INTEGER DEFAULT 0,
    trades_skipped INTEGER DEFAULT 0,
    trades_failed INTEGER DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'partial', 'failed')),
    error_message TEXT,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_ms INTEGER,
    from_date TIMESTAMPTZ,
    to_date TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_wallet_id ON public.sync_logs(wallet_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON public.sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON public.sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_start_time ON public.sync_logs(start_time DESC);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sync logs" ON public.sync_logs;
CREATE POLICY "Users can view own sync logs" ON public.sync_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can manage sync logs" ON public.sync_logs;
CREATE POLICY "Service can manage sync logs" ON public.sync_logs FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ПРОВЕРКА УСПЕШНОСТИ
-- ============================================

-- Выполните этот запрос чтобы проверить что таблицы созданы:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('security_events', 'anomaly_alerts', 'sync_logs', 'rate_limit_counts', 'auth_failures', 'decryption_failures', 'api_requests')
ORDER BY table_name;

-- Ожидаемый результат: все 7 таблиц должны быть в списке
