# 🔄 Миграция: Исправление уникального ограничения для кошельков

## Проблема

Текущее ограничение `unique_wallet_per_user (user_id, address, chain)` блокирует добавление нескольких CEX кошельков одной биржи (например, два аккаунта Bybit с разными API ключами).

## Решение

Заменено уникальное ограничение на триггер:

- **Для Web3 кошельков**: уникальный адрес + сеть (как было)
- **Для CEX кошельков**: уникальный провайдер на пользователя (один провайдер = один кошелёк)

---

## 📋 Применение миграции

### Шаг 1: Откройте Supabase Dashboard

🔗 https://app.supabase.com/project/TradeumD/sql

### Шаг 2: Скопируйте SQL из файла

Откройте: `supabase/migrations/20250115000001_wallet_unique_constraint.sql`

### Шаг 3: Выполните в SQL Editor

Вставьте SQL и нажмите **Run**

### Шаг 4: Проверьте результат

Выполните:

```sql
-- Проверьте что функции созданы
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('generate_wallet_unique_key', 'check_wallet_unique');

-- Проверьте триггер
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'wallets'
AND trigger_name = 'trg_check_wallet_unique';
```

Ожидаемый результат:

```
routine_name
---------------------------
generate_wallet_unique_key
check_wallet_unique

trigger_name
---------------------------
trg_check_wallet_unique
```

---

## ✅ После миграции

### Поведение:

**Web3 кошелёк:**

- Можно добавить только один раз для одного адреса + сети
- Ошибка если попробовать добавить повторно: `Кошелёк с таким провайдером/адресом уже добавлен`

**CEX кошелёк (Bybit, Binance, OKX):**

- Можно добавить только один провайдер на пользователя
- Ошибка если попробовать добавить тот же провайдер:
  ```
  "Кошелёк BYBIT уже добавлен. Удалите его перед добавлением нового."
  ```

**Watch-only кошелёк:**

- Можно добавить несколько разных адресов
- Один адрес + сеть только один раз

---

## 🔧 Если миграция не применилась

### Вариант A: Ручное выполнение

```sql
-- 1. Удалить старое ограничение
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS unique_wallet_per_user;

-- 2. Удалить старый индекс
DROP INDEX IF EXISTS idx_wallets_user_address;

-- 3. Удалить старый триггер если есть
DROP TRIGGER IF EXISTS trg_check_wallet_unique ON public.wallets;

-- 4. Создать функцию
CREATE OR REPLACE FUNCTION public.generate_wallet_unique_key(
  p_user_id UUID,
  p_address TEXT,
  p_chain TEXT,
  p_cex_provider TEXT
)
RETURNS TEXT AS $$
BEGIN
  IF p_cex_provider IS NOT NULL THEN
    RETURN 'cex_' || p_user_id || '_' || p_cex_provider;
  ELSE
    RETURN 'web3_' || p_user_id || '_' || COALESCE(p_address, '') || '_' || COALESCE(p_chain, '');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 5. Создать функцию проверки
CREATE OR REPLACE FUNCTION public.check_wallet_unique()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INTEGER;
  wallet_key TEXT;
BEGIN
  wallet_key := public.generate_wallet_unique_key(
    NEW.user_id, NEW.address, NEW.chain, NEW.cex_provider
  );

  SELECT COUNT(*) INTO existing_count
  FROM public.wallets
  WHERE user_id = NEW.user_id
    AND (
      (NEW.cex_provider IS NOT NULL AND cex_provider = NEW.cex_provider)
      OR
      (NEW.cex_provider IS NULL AND address = NEW.address AND chain = NEW.chain)
    )
    AND id IS DISTINCT FROM NEW.id;

  IF existing_count > 0 THEN
    RAISE EXCEPTION 'Кошелёк с таким провайдером/адресом уже добавлен';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 6. Создать триггер
CREATE TRIGGER trg_check_wallet_unique
  BEFORE INSERT OR UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.check_wallet_unique();
```

---

## 🎯 После применения

1. **Обновите приложение** (`F5`)
2. **Попробуйте добавить Bybit**
3. **Ожидаемый результат:**
   ```
   ✅ "Кошелёк добавлен! Начинаем синхронизацию..."
   ```

Если ошибка дубликата появится снова - проверьте что миграция применилась успешно.
