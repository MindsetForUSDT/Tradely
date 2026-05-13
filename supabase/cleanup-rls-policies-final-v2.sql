-- ============================================
-- Очистка дублирующих RLS политик (v2)
-- ============================================

-- Удалить дубликаты для profiles (оставить только политики с "can")
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;

-- Удалить дубликаты для wallets (оставить только политики с "can")
DROP POLICY IF EXISTS "Users insert own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users view own wallets" ON public.wallets;

-- Удалить дубликаты для trades (оставить только политики с "can")
DROP POLICY IF EXISTS "Users view own trades" ON public.trades;

-- ============================================
-- Проверка результата
-- ============================================
SELECT 
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count,
    array_agg(p.policyname ORDER BY p.policyname) as policies
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public' AND t.tablename IN ('profiles', 'wallets', 'trades', 'tags', 'trade_tags', 'daily_analytics', 'tax_reports', 'payment_logs')
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
