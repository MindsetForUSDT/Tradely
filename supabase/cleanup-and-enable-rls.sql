-- ============================================
-- Очистка старых таблиц и включение RLS
-- ============================================

-- 1. Удалить старые неиспользуемые таблицы (если нет важных данных)
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.analytics_cache CASCADE;
DROP TABLE IF EXISTS public.encryption_keys CASCADE;
DROP TABLE IF EXISTS public.exchange_connections CASCADE;
DROP TABLE IF EXISTS public.feature_flags CASCADE;
DROP TABLE IF EXISTS public.import_sources CASCADE;
DROP TABLE IF EXISTS public.payment_attempts CASCADE;
DROP TABLE IF EXISTS public.payment_logs CASCADE;
DROP TABLE IF EXISTS public.risk_limits CASCADE;
DROP TABLE IF EXISTS public.subscription_limits CASCADE;
DROP TABLE IF EXISTS public.trading_journal CASCADE;
DROP TABLE IF EXISTS public.user_goals CASCADE;

-- 2. Включить RLS для основных таблиц
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_reports ENABLE ROW LEVEL SECURITY;

-- 3. Удалить старые политики (если есть дубликаты)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.wallets;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.wallets;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.trades;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.trades;

-- 4. Проверка результата
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE t.schemaname = 'public'
ORDER BY tablename;

-- 5. ТЕСТ: Проверить доступ (должно вернуть данные)
SELECT COUNT(*) as wallets_count FROM wallets;
SELECT COUNT(*) as trades_count FROM trades;
