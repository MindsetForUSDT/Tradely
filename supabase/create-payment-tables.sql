-- ============================================
-- Создание таблиц для платежей
-- ============================================

-- Таблица логов платежей
CREATE TABLE IF NOT EXISTS public.payment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    reason TEXT,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON public.payment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON public.payment_logs(created_at DESC);

-- RLS политики
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payment logs" ON public.payment_logs;
CREATE POLICY "Users can view own payment logs" ON public.payment_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can insert payment logs" ON public.payment_logs;
CREATE POLICY "Service can insert payment logs" ON public.payment_logs
    FOR INSERT WITH CHECK (true);

-- ============================================
-- ТЕСТ: Проверка
-- ============================================
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE t.schemaname = 'public' AND tablename IN ('payment_logs')
ORDER BY tablename;
