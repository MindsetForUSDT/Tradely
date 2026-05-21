-- ============================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ SERVICE_ROLE
-- ============================================
-- Эти политики позволяют Edge Functions и cron-задачам работать с данными
-- ============================================

-- ============================================
-- 1. POLICIES FOR PROFILES (Service Role)
-- ============================================

-- Service role может читать все профили
DROP POLICY IF EXISTS "Service role can view all profiles" ON public.profiles;
CREATE POLICY "Service role can view all profiles" ON public.profiles
    FOR SELECT
    USING (true);

-- Service role может обновлять все профили (для подписки и т.д.)
DROP POLICY IF EXISTS "Service role can update all profiles" ON public.profiles;
CREATE POLICY "Service role can update all profiles" ON public.profiles
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Service role может вставлять профили (для миграций)
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles" ON public.profiles
    FOR INSERT
    WITH CHECK (true);

-- ============================================
-- 2. POLICIES FOR WALLETS (Service Role)
-- ============================================

-- Service role может читать все кошельки
DROP POLICY IF EXISTS "Service role can view all wallets" ON public.wallets;
CREATE POLICY "Service role can view all wallets" ON public.wallets
    FOR SELECT
    USING (true);

-- Service role может вставлять кошельки (из Edge Functions)
DROP POLICY IF EXISTS "Service role can insert wallets" ON public.wallets;
CREATE POLICY "Service role can insert wallets" ON public.wallets
    FOR INSERT
    WITH CHECK (true);

-- Service role может обновлять кошельки (статус синхронизации)
DROP POLICY IF EXISTS "Service role can update wallets" ON public.wallets;
CREATE POLICY "Service role can update wallets" ON public.wallets
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Service role может удалять кошельки (при удалении пользователя)
DROP POLICY IF EXISTS "Service role can delete wallets" ON public.wallets;
CREATE POLICY "Service role can delete wallets" ON public.wallets
    FOR DELETE
    USING (true);

-- ============================================
-- 3. POLICIES FOR TRADES (Service Role)
-- ============================================

-- Service role может читать все сделки
DROP POLICY IF EXISTS "Service role can view all trades" ON public.trades;
CREATE POLICY "Service role can view all trades" ON public.trades
    FOR SELECT
    USING (true);

-- Service role может вставлять сделки (из импорта)
DROP POLICY IF EXISTS "Service role can insert trades" ON public.trades;
CREATE POLICY "Service role can insert trades" ON public.trades
    FOR INSERT
    WITH CHECK (true);

-- Service role может обновлять сделки (для аналитики)
DROP POLICY IF EXISTS "Service role can update trades" ON public.trades;
CREATE POLICY "Service role can update trades" ON public.trades
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Service role может удалять сделки (при удалении кошелька)
DROP POLICY IF EXISTS "Service role can delete trades" ON public.trades;
CREATE POLICY "Service role can delete trades" ON public.trades
    FOR DELETE
    USING (true);

-- ============================================
-- 4. POLICIES FOR DAILY_ANALYTICS (Service Role)
-- ============================================

-- Service role может читать аналитику
DROP POLICY IF EXISTS "Service role can view all analytics" ON public.daily_analytics;
CREATE POLICY "Service role can view all analytics" ON public.daily_analytics
    FOR SELECT
    USING (true);

-- Service role может вставлять аналитику (cron-задачи)
DROP POLICY IF EXISTS "Service role can insert analytics" ON public.daily_analytics;
CREATE POLICY "Service role can insert analytics" ON public.daily_analytics
    FOR INSERT
    WITH CHECK (true);

-- Service role может обновлять аналитику (пересчет)
DROP POLICY IF EXISTS "Service role can update analytics" ON public.daily_analytics;
CREATE POLICY "Service role can update analytics" ON public.daily_analytics
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 5. POLICIES FOR TAGS (Service Role)
-- ============================================

-- Service role может управлять тегами
DROP POLICY IF EXISTS "Service role can manage tags" ON public.tags;
CREATE POLICY "Service role can manage tags" ON public.tags
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 6. POLICIES FOR TRADE_TAGS (Service Role)
-- ============================================

-- Service role может управлять связями сделок и тегов
DROP POLICY IF EXISTS "Service role can manage trade tags" ON public.trade_tags;
CREATE POLICY "Service role can manage trade tags" ON public.trade_tags
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 7. POLICIES FOR TAX_REPORTS (Service Role)
-- ============================================

-- Service role может управлять налоговыми отчётами
DROP POLICY IF EXISTS "Service role can manage tax reports" ON public.tax_reports;
CREATE POLICY "Service role can manage tax reports" ON public.tax_reports
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 8. GRANT PRIVILEGES (Дополнительные права)
-- ============================================

-- Даем права на использование последовательностей
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Даем права на все таблицы
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;

-- Даем права на все функции
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================
-- 9. ВЕРИФИКАЦИЯ
-- ============================================

-- Проверить что политики созданы
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- Конец скрипта
-- ============================================
