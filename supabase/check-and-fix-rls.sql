-- ============================================
-- Проверка и исправление RLS политик
-- Запустить в Supabase SQL Editor
-- ============================================

-- 1. Проверка статуса RLS для всех таблиц
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Проверка существующих политик
SELECT 
    tablename,
    policyname,
    cmd,
    roles::text,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. ТЕСТ: Попытка SELECT (должна показать ошибки если есть)
-- Раскомментируйте и выполните для тестирования:
-- SELECT * FROM wallets LIMIT 1;
-- SELECT * FROM trades LIMIT 1;
-- SELECT * FROM profiles LIMIT 1;

-- 4. Если RLS включён и политики отсутствуют/неправильны - создать заново

-- Включить RLS (если ещё не включён)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_reports ENABLE ROW LEVEL SECURITY;

-- Удалить старые политики (если есть)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can update own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can delete own wallets" ON public.wallets;

DROP POLICY IF EXISTS "Users can view own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can insert own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can update own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can delete own trades" ON public.trades;

DROP POLICY IF EXISTS "Users can view own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can manage own tags" ON public.tags;

DROP POLICY IF EXISTS "Users can view trade tags" ON public.trade_tags;
DROP POLICY IF EXISTS "Users can manage trade tags" ON public.trade_tags;

DROP POLICY IF EXISTS "Users can view own analytics" ON public.daily_analytics;
DROP POLICY IF EXISTS "Service can insert analytics" ON public.daily_analytics;

DROP POLICY IF EXISTS "Users can view own tax reports" ON public.tax_reports;
DROP POLICY IF EXISTS "Users can create own tax reports" ON public.tax_reports;

-- ============================================
-- СОЗДАНИЕ ПОЛИТИК ЗАНОВО
-- ============================================

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can create own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Wallets
CREATE POLICY "Users can view own wallets" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets" ON public.wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets" ON public.wallets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallets" ON public.wallets
    FOR DELETE USING (auth.uid() = user_id);

-- Trades
CREATE POLICY "Users can view own trades" ON public.trades
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON public.trades
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON public.trades
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" ON public.trades
    FOR DELETE USING (auth.uid() = user_id);

-- Tags
CREATE POLICY "Users can view own tags" ON public.tags
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tags" ON public.tags
    FOR ALL USING (auth.uid() = user_id);

-- Trade Tags
CREATE POLICY "Users can view trade tags" ON public.trade_tags
    FOR SELECT USING (
        trade_id IN (SELECT id FROM public.trades WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can manage trade tags" ON public.trade_tags
    FOR ALL USING (
        trade_id IN (SELECT id FROM public.trades WHERE user_id = auth.uid())
    );

-- Daily Analytics
CREATE POLICY "Users can view own analytics" ON public.daily_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert analytics" ON public.daily_analytics
    FOR INSERT WITH CHECK (true);

-- Tax Reports
CREATE POLICY "Users can view own tax reports" ON public.tax_reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tax reports" ON public.tax_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ТЕСТ: Проверка политик
-- ============================================

-- Проверка: сколько политик создано
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- TEMPORARY: Если всё ещё не работает
-- ============================================
-- Временно отключить RLS для тестирования (ТОЛЬКО ДЛЯ DEV!)
-- УДАЛИТЕ ЭТУ СЕКЦИЮ ДЛЯ PRODUCTION!

-- ALTER TABLE public.wallets DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.trades DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Конец скрипта
-- ============================================
