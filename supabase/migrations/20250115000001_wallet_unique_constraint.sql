-- ============================================
-- Улучшение уникального ограничения для кошельков
-- Версия: 2.2
-- Дата: 2025-01-15
-- Разрешает несколько CEX кошельков одной биржи с разными API ключами
-- ============================================

-- 1. Удаляем старое уникальное ограничение
ALTER TABLE public.wallets 
DROP CONSTRAINT IF EXISTS unique_wallet_per_user;

-- 2. Удаляем старый индекс если есть
DROP INDEX IF EXISTS idx_wallets_user_address;

-- 3. Создаём функцию для генерации уникального ключа
CREATE OR REPLACE FUNCTION public.generate_wallet_unique_key(
  p_user_id UUID,
  p_address TEXT,
  p_chain TEXT,
  p_cex_provider TEXT
)
RETURNS TEXT AS $$
BEGIN
  -- Для CEX возвращаем провайдер, для Web3 - адрес+сеть
  IF p_cex_provider IS NOT NULL THEN
    RETURN 'cex_' || p_user_id || '_' || p_cex_provider;
  ELSE
    RETURN 'web3_' || p_user_id || '_' || COALESCE(p_address, '') || '_' || COALESCE(p_chain, '');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. Создаём функцию для проверки уникальности перед вставкой/обновлением
CREATE OR REPLACE FUNCTION public.check_wallet_unique()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INTEGER;
  wallet_key TEXT;
BEGIN
  -- Генерируем уникальный ключ
  wallet_key := public.generate_wallet_unique_key(
    NEW.user_id,
    NEW.address,
    NEW.chain,
    NEW.cex_provider
  );
  
  -- Проверяем наличие дубликата
  SELECT COUNT(*) INTO existing_count
  FROM public.wallets
  WHERE user_id = NEW.user_id
    AND (
      -- Для CEX: проверяем провайдер
      (NEW.cex_provider IS NOT NULL AND cex_provider = NEW.cex_provider)
      OR
      -- Для Web3: проверяем адрес+сеть
      (NEW.cex_provider IS NULL AND address = NEW.address AND chain = NEW.chain)
    )
    AND id IS DISTINCT FROM NEW.id;
  
  IF existing_count > 0 THEN
    RAISE EXCEPTION 'Кошелёк с таким провайдером/адресом уже добавлен';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 5. Создаём триггер для проверки уникальности
DROP TRIGGER IF EXISTS trg_check_wallet_unique ON public.wallets;
CREATE TRIGGER trg_check_wallet_unique
  BEFORE INSERT OR UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.check_wallet_unique();

-- 6. Добавляем комментарий
COMMENT ON FUNCTION public.generate_wallet_unique_key() IS 
'Генерирует уникальный ключ кошелька: cex_{user_id}_{provider} или web3_{user_id}_{address}_{chain}';

COMMENT ON FUNCTION public.check_wallet_unique() IS 
'Проверяет уникальность кошелька перед вставкой/обновлением: один CEX провайдер на пользователя, уникальный адрес+сеть для Web3';

-- ============================================
-- END OF MIGRATION
-- ============================================
