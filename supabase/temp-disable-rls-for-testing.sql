-- ============================================
-- ВРЕМЕННОЕ РЕШЕНИЕ: Отключить RLS для тестирования
-- УДАЛИТЬ ЭТОТ СКРИПТ ПОСЛЕ ТЕСТОВ!
-- ============================================

-- ВНИМАНИЕ: Это отключает защиту данных! Только для dev окружения!
-- После тестирования обязательно включите RLS обратно и создайте политики!

ALTER TABLE public.wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_reports DISABLE ROW LEVEL SECURITY;

-- Проверка: RLS должен быть отключён
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Теперь запросы должны работать без политик
-- ТЕСТ:
-- SELECT COUNT(*) FROM wallets;
-- SELECT COUNT(*) FROM trades;

-- ============================================
-- ПОСЛЕ ТЕСТОВ: Включить RLS обратно!
-- ============================================

-- ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- ... и создать политики из check-and-fix-rls.sql
