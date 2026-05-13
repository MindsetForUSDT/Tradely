-- ============================================
-- ТЕСТ: Проверка работы RLS политик
-- Запустить в Supabase SQL Editor
-- ============================================

-- 1. Получить свой user_id
SELECT auth.uid() as my_user_id;

-- 2. Проверить, есть ли данные (должно вернуть 0 или больше)
SELECT 'wallets' as table_name, COUNT(*) as count FROM wallets
UNION ALL
SELECT 'trades' as table_name, COUNT(*) as count FROM trades
UNION ALL
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles;

-- 3. Проверить конкретный user_id (замените UUID на свой)
-- SELECT * FROM wallets WHERE user_id = 'ВАШ-USER-ID';

-- ============================================
-- Если запросы возвращают ошибки:
-- ============================================

-- Вариант A: Проверить ошибки в логах
-- Database → Logs → PostgreSQL Logs

-- Вариант B: Временно отключить RLS для теста
-- supabase/temp-disable-rls-for-testing.sql

-- Вариант C: Проверить token в приложении
-- В консоли браузера: 
-- window.localStorage.getItem('tradeumdiary-auth')
