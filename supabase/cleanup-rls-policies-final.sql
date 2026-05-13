-- ============================================
-- Очистка дублирующих RLS политик
-- ============================================

-- Удалить дубликаты для profiles (должно быть 3: SELECT, INSERT, UPDATE)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.profiles;

-- Удалить дубликаты для wallets (должно быть 4: SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.wallets;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.wallets;

-- Удалить дубликаты для trades (должно быть 4: SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.trades;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.trades;

-- ============================================
-- Проверка результата
-- ============================================
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    COUNT(*) as policy_count,
    array_agg(policyname) as policies
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public' AND t.tablename IN ('profiles', 'wallets', 'trades', 'tags', 'trade_tags', 'daily_analytics', 'tax_reports', 'payment_logs')
GROUP BY tablename, rowsecurity
ORDER BY tablename;

-- ============================================
-- ТЕСТ: Проверка доступа
-- ============================================
-- SELECT COUNT(*) FROM wallets;
-- SELECT COUNT(*) FROM trades;
-- SELECT COUNT(*) FROM payment_logs;
