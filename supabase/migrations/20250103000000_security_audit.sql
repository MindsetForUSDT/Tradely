-- ============================================
-- TradeumDiary - Схема аудита безопасности
-- Версия: 1.0
-- Дата: 2025-01-03
-- ============================================

-- ============================================
-- 1. ТАБЛИЦЫ АУДИТА БЕЗОПАСНОСТИ
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

COMMENT ON TABLE public.security_events IS 'Лог всех событий безопасности';
COMMENT ON COLUMN public.security_events.event_type IS 'Тип события: AUTH_SUCCESS, AUTH_FAILURE, ENCRYPTION_OPERATION и т.д.';
COMMENT ON COLUMN public.security_events.severity IS 'Уровень серьезности: INFO, WARNING, CRITICAL, ERROR';

-- Индексы для security_events
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON public.security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity) WHERE severity IN ('CRITICAL', 'ERROR');
CREATE INDEX IF NOT EXISTS idx_security_events_request_id ON public.security_events(request_id);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON public.security_events(ip_address);

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

COMMENT ON TABLE public.anomaly_alerts IS 'Алерты системы детекции аномалий';
COMMENT ON COLUMN public.anomaly_alerts.type IS 'Тип аномалии: BRUTE_FORCE_ATTEMPT, CREDENTIAL_STUFFING и т.д.';

-- Индексы для anomaly_alerts
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_timestamp ON public.anomaly_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_user_id ON public.anomaly_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_severity ON public.anomaly_alerts(severity) WHERE severity IN ('HIGH', 'CRITICAL');
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_status ON public.anomaly_alerts(status) WHERE status = 'NEW';

-- 1.3 Счетчики для rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_counts (
    id BIGSERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    window INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.rate_limit_counts IS 'Счетчики для rate limiting';

-- Индексы для rate_limit_counts
CREATE INDEX IF NOT EXISTS idx_rate_limit_counts_key ON public.rate_limit_counts(key);
CREATE INDEX IF NOT EXISTS idx_rate_limit_counts_window ON public.rate_limit_counts(window);

-- Очистка старых записей (старше 24 часов)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM public.rate_limit_counts
    WHERE updated_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SET search_path = '';

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

COMMENT ON TABLE public.auth_failures IS 'Отслеживание неудачных попыток аутентификации';

-- Индексы для auth_failures
CREATE INDEX IF NOT EXISTS idx_auth_failures_timestamp ON public.auth_failures(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_auth_failures_user_id ON public.auth_failures(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_failures_ip ON public.auth_failures(ip_address);

-- Автоматическая очистка старых записей (старше 30 дней)
CREATE OR REPLACE FUNCTION public.cleanup_old_auth_failures()
RETURNS void AS $$
BEGIN
    DELETE FROM public.auth_failures
    WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- 1.5 Отслеживание неудач расшифровки
CREATE TABLE IF NOT EXISTS public.decryption_failures (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    reason TEXT NOT NULL,
    encrypted_data_hash TEXT, -- Хэш зашифрованных данных (не сами данные!)
    
    metadata JSONB DEFAULT '{}'
);

COMMENT ON TABLE public.decryption_failures IS 'Отслеживание неудачных попыток расшифровки';

-- Индексы для decryption_failures
CREATE INDEX IF NOT EXISTS idx_decryption_failures_timestamp ON public.decryption_failures(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_decryption_failures_user_id ON public.decryption_failures(user_id);

-- Автоматическая очистка старых записей (старше 7 дней)
CREATE OR REPLACE FUNCTION public.cleanup_old_decryption_failures()
RETURNS void AS $$
BEGIN
    DELETE FROM public.decryption_failures
    WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- 1.6 Отслеживание API запросов для анализа
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

COMMENT ON TABLE public.api_requests IS 'Лог API запросов для анализа и детекции аномалий';

-- Индексы для api_requests
CREATE INDEX IF NOT EXISTS idx_api_requests_timestamp ON public.api_requests(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_user_id ON public.api_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_api_requests_endpoint ON public.api_requests(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_requests_status ON public.api_requests(status_code) WHERE status_code >= 400;

-- Автоматическая очистка старых записей (старше 7 дней)
CREATE OR REPLACE FUNCTION public.cleanup_old_api_requests()
RETURNS void AS $$
BEGIN
    DELETE FROM public.api_requests
    WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- ============================================
-- 2. РАСПИСАНИЕ ОЧИСТКИ (cron jobs)
-- ============================================

-- Примечание: Для production используйте pg_cron или внешний scheduler
-- Ниже приведены команды для ручной запуска или интеграции с cron

-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Очистка rate limit счетчиков (каждый час)
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT public.cleanup_old_rate_limits()');

-- Очистка auth failures (ежедневно)
-- SELECT cron.schedule('cleanup-auth-failures', '0 0 * * *', 'SELECT public.cleanup_old_auth_failures()');

-- Очистка decryption failures (ежедневно)
-- SELECT cron.schedule('cleanup-decryption-failures', '0 0 * * *', 'SELECT public.cleanup_old_decryption_failures()');

-- Очистка API requests (ежедневно)
-- SELECT cron.schedule('cleanup-api-requests', '0 0 * * *', 'SELECT public.cleanup_old_api_requests()');

-- ============================================
-- 3. RLS ПОЛИТИКИ
-- ============================================

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decryption_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;

-- Политики для security_events (только сервис может читать/писать)
DROP POLICY IF EXISTS "Service can manage security events" ON public.security_events;
CREATE POLICY "Service can manage security events" ON public.security_events
    FOR ALL USING (true) -- Сервисная роль может всё
    WITH CHECK (true);

-- Политики для anomaly_alerts (админы могут читать и обновлять)
DROP POLICY IF EXISTS "Service can manage anomaly alerts" ON public.anomaly_alerts;
CREATE POLICY "Service can manage anomaly alerts" ON public.anomaly_alerts
    FOR ALL USING (true)
    WITH CHECK (true);

-- Политики для rate_limit_counts (только сервис)
DROP POLICY IF EXISTS "Service can manage rate limits" ON public.rate_limit_counts;
CREATE POLICY "Service can manage rate limits" ON public.rate_limit_counts
    FOR ALL USING (true)
    WITH CHECK (true);

-- Политики для auth_failures (только сервис)
DROP POLICY IF EXISTS "Service can manage auth failures" ON public.auth_failures;
CREATE POLICY "Service can manage auth failures" ON public.auth_failures
    FOR ALL USING (true)
    WITH CHECK (true);

-- Политики для decryption_failures (только сервис)
DROP POLICY IF EXISTS "Service can manage decryption failures" ON public.decryption_failures;
CREATE POLICY "Service can manage decryption failures" ON public.decryption_failures
    FOR ALL USING (true)
    WITH CHECK (true);

-- Политики для api_requests (только сервис)
DROP POLICY IF EXISTS "Service can manage API requests" ON public.api_requests;
CREATE POLICY "Service can manage API requests" ON public.api_requests
    FOR ALL USING (true)
    WITH CHECK (true);

-- ============================================
-- 4. ПРЕИДУСЛОВИЯ И ТРИГГЕРЫ
-- ============================================

-- Триггер для автоматического создания записи при регистрации пользователя
CREATE OR REPLACE FUNCTION public.log_user_registration()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.security_events (
        event_type,
        severity,
        user_id,
        request_id,
        details
    ) VALUES (
        'AUTH_SUCCESS',
        'INFO',
        NEW.id,
        'registration',
        jsonb_build_object('action', 'user_registered', 'ip_address', inet_client_addr())
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- ============================================
-- 5. ВУ И ВИДЫ ДЛЯ АНАЛИТИКИ
-- ============================================

-- Вид: Последние критические события
CREATE OR REPLACE VIEW public.recent_critical_events AS
SELECT
    id,
    timestamp,
    event_type,
    severity,
    user_id,
    ip_address,
    details,
    created_at
FROM public.security_events
WHERE severity IN ('CRITICAL', 'ERROR')
ORDER BY timestamp DESC
LIMIT 100;

-- Вид: Новые алерты аномалий
CREATE OR REPLACE VIEW public.new_anomaly_alerts AS
SELECT
    id,
    timestamp,
    type,
    severity,
    user_id,
    ip_address,
    description,
    evidence,
    recommended_action
FROM public.anomaly_alerts
WHERE status = 'NEW'
ORDER BY timestamp DESC;

-- Вид: Статистика неудач аутентификации за последние 24 часа
CREATE OR REPLACE VIEW public.auth_failure_stats_24h AS
SELECT
    user_id,
    ip_address,
    COUNT(*) as total_failures,
    MAX(timestamp) as last_failure,
    ARRAY_AGG(DISTINCT reason) as reasons
FROM public.auth_failures
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY user_id, ip_address
HAVING COUNT(*) >= 3;

-- ============================================
-- 6. ПРИМЕЧАНИЯ
-- ============================================

COMMENT ON SCHEMA public IS 'Основная схема для TradeumDiary с аудитами безопасности';

-- ============================================
-- END OF MIGRATION
-- ============================================
