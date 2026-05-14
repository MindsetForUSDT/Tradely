-- ============================================
-- TradeumDiary - Обновление схемы БД для кошельков
-- Версия: 2.1
-- Дата: 2025-01-03
-- Добавляет поддержку настроек синхронизации и расширенных полей
-- ============================================

-- Добавление новых полей в таблицу wallets
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"autoSync": true, "syncInterval": 60}'::jsonb,
ADD COLUMN IF NOT EXISTS passphrase_encrypted TEXT,
ADD COLUMN IF NOT EXISTS last_trade_id TEXT,
ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sync_error TEXT,
ADD COLUMN IF NOT EXISTS last_sync_status TEXT,
ADD COLUMN IF NOT EXISTS total_trades_imported INTEGER DEFAULT 0;

COMMENT ON COLUMN public.wallets.settings IS 'Настройки синхронизации: startDate, autoSync, syncInterval';
COMMENT ON COLUMN public.wallets.passphrase_encrypted IS 'Зашифрованный passphrase для бирж (OKX, Coinbase)';
COMMENT ON COLUMN public.wallets.last_trade_id IS 'ID последней импортированной сделки для дедупликации';
COMMENT ON COLUMN public.wallets.sync_enabled IS 'Включена ли автосинхронизация';
COMMENT ON COLUMN public.wallets.sync_error IS 'Последняя ошибка синхронизации';
COMMENT ON COLUMN public.wallets.last_sync_status IS 'Статус последней синхронизации: success, partial, failed';
COMMENT ON COLUMN public.wallets.total_trades_imported IS 'Общее количество импортированных сделок';

-- Добавление индексов для новых полей
CREATE INDEX IF NOT EXISTS idx_wallets_sync_enabled ON public.wallets(sync_enabled) WHERE sync_enabled = true;
CREATE INDEX IF NOT EXISTS idx_wallets_last_synced ON public.wallets(last_synced_at DESC) WHERE sync_enabled = true;

-- Обновление таблицы trades для поддержки trade_id от бирж
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS exchange_trade_id TEXT,
ADD COLUMN IF NOT EXISTS order_id TEXT,
ADD COLUMN IF NOT EXISTS trade_type TEXT DEFAULT 'spot' CHECK (trade_type IN ('spot', 'future', 'margin', 'option'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_user_exchange_trade_id ON public.trades(user_id, exchange_trade_id) WHERE exchange_trade_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trades_order_id ON public.trades(order_id);

COMMENT ON COLUMN public.trades.exchange_trade_id IS 'Уникальный ID сделки на бирже (для дедупликации)';
COMMENT ON COLUMN public.trades.order_id IS 'ID ордера на бирже';
COMMENT ON COLUMN public.trades.trade_type IS 'Тип торговли: spot, future, margin, option';

-- Обновление ENUM типов для обработки ошибок
ALTER TYPE wallet_processing_status ADD VALUE IF NOT EXISTS 'syncing';

-- Добавление таблицы для логов синхронизации
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Результаты синхронизации
    trades_imported INTEGER DEFAULT 0,
    trades_skipped INTEGER DEFAULT 0,
    trades_failed INTEGER DEFAULT 0,
    
    -- Статус и ошибки
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'partial', 'failed')),
    error_message TEXT,
    
    -- Метаданные
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Детали
    from_date TIMESTAMPTZ,
    to_date TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

COMMENT ON TABLE public.sync_logs IS 'История синхронизаций кошельков';

-- Индексы для sync_logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_wallet_id ON public.sync_logs(wallet_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON public.sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON public.sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_start_time ON public.sync_logs(start_time DESC);

-- RLS политики для новых полей и таблиц
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sync logs" ON public.sync_logs;
CREATE POLICY "Users can view own sync logs" ON public.sync_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can manage sync logs" ON public.sync_logs;
CREATE POLICY "Service can manage sync logs" ON public.sync_logs
    FOR ALL USING (true)
    WITH CHECK (true);

-- Функция для обновления last_sync_status при изменении processing_status
CREATE OR REPLACE FUNCTION public.update_sync_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.processing_status = 'completed' THEN
        NEW.last_sync_status := 'success';
    ELSIF NEW.processing_status = 'failed' THEN
        NEW.last_sync_status := 'failed';
        IF NEW.error_message IS NOT NULL THEN
            NEW.sync_error := NEW.error_message;
        END IF;
    END IF;
    
    IF NEW.processing_status IN ('completed', 'failed') THEN
        -- Создаем запись в sync_logs
        INSERT INTO public.sync_logs (
            wallet_id,
            user_id,
            trades_imported,
            status,
            error_message,
            metadata
        ) VALUES (
            NEW.id,
            NEW.user_id,
            COALESCE((SELECT COUNT(*) FROM public.trades WHERE wallet_id = NEW.id AND created_at > NOW() - INTERVAL '1 hour'), 0),
            CASE 
                WHEN NEW.processing_status = 'completed' THEN 'completed'
                ELSE 'failed'
            END,
            NEW.error_message,
            jsonb_build_object(
                'last_synced_at', NEW.last_synced_at,
                'error_message', NEW.error_message
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Триггер для автоматического обновления sync_logs
DROP TRIGGER IF EXISTS on_wallet_sync_complete ON public.wallets;
CREATE TRIGGER on_wallet_sync_complete
    AFTER UPDATE OF processing_status ON public.wallets
    FOR EACH ROW
    WHEN (OLD.processing_status IS DISTINCT FROM NEW.processing_status)
    EXECUTE FUNCTION public.update_sync_status();

-- Обновление комментариев
COMMENT ON FUNCTION public.update_sync_status() IS 'Автоматически обновляет last_sync_status и создаёт записи в sync_logs';

-- ============================================
-- END OF MIGRATION
-- ============================================
