-- ============================================
-- Очистка лишних RLS политик
-- ============================================

-- Проверка: какие именно политики существуют
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- Удаление ДУБЛИРУЮЩИХСЯ политик
-- ============================================

-- Profiles (должно быть 3: SELECT, INSERT, UPDATE)
-- Удалим лишние, если есть
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.profiles;

-- Wallets (должно быть 4: SELECT, INSERT, UPDATE, DELETE)
-- Удалим лишние
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.wallets;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.wallets;

-- Trades (должно быть 4: SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.trades;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.trades;

-- ============================================
-- Проверка после очистки
-- ============================================
SELECT 
    tablename,
    COUNT(*) as policy_count,
    array_agg(policyname) as policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- ТЕСТ: Проверка доступа
-- ============================================
-- Замените на ваш user_id для тестирования
-- SELECT auth.uid() as my_user_id;

-- Тест SELECT (должен вернуть данные или пустой массив)
-- SELECT COUNT(*) FROM wallets;
-- SELECT COUNT(*) FROM trades;
