-- Миграция: добавление колонок для шифрования в таблицу wallets
-- Выполнить после обновления supabase-setup.sql

-- Добавляем колонки для шифрования API-ключей
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS encrypted_credentials TEXT,
ADD COLUMN IF NOT EXISTS credentials_iv BYTEA,
ADD COLUMN IF NOT EXISTS credentials_tag BYTEA;

-- Добавляем колонку для типа провайдера
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS web3_provider TEXT,
ADD COLUMN IF NOT EXISTS cex_provider TEXT;

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_wallets_web3_provider ON public.wallets(web3_provider);
CREATE INDEX IF NOT EXISTS idx_wallets_cex_provider ON public.wallets(cex_provider);

COMMENT ON COLUMN public.wallets.encrypted_credentials IS 'Зашифрованные API-ключи биржи';
COMMENT ON COLUMN public.wallets.credentials_iv IS 'IV для шифрования AES-256-GCM';
COMMENT ON COLUMN public.wallets.credentials_tag IS 'Authentication tag для AES-256-GCM';
COMMENT ON COLUMN public.wallets.web3_provider IS 'Провайдер Web3 кошелька (metamask, trustwallet и т.д.)';
COMMENT ON COLUMN public.wallets.cex_provider IS 'Провайдер биржи (binance, bybit, okx и т.д.)';
