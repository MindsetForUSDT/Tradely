-- Миграция: версионирование ключей + таблицы для логов
ALTER TABLE exchange_connections 
ADD COLUMN IF NOT EXISTS key_version INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS encryption_keys (
  id SERIAL PRIMARY KEY,
  key_version INT UNIQUE NOT NULL,
  key_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT,
  stack TEXT,
  component_stack TEXT,
  url TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event TEXT NOT NULL,
  reason TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  plan TEXT NOT NULL,
  provider TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exchange_connections_key_version 
ON exchange_connections(key_version);
