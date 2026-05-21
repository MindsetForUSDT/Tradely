# 🚀 Следующие шаги после исправлений

## ✅ **Выполненные исправления**

Все критичные и важные проблемы исправлены. Сборка проекта работает корректно.

---

## 🔴 **СРОЧНО: Что нужно сделать немедленно**

### 1. Применить исправления RLS политик

```bash
# Подключитесь к Supabase Dashboard
# https://app.supabase.com/project/YOUR_PROJECT/sql

# Скопируйте и выполните содержимое файла:
# supabase/fix-service-role-rls.sql
```

**Зачем:** Без этого Edge Functions не смогут работать с БД.

---

### 2. Сделать бэкап базы данных

```bash
# В Supabase Dashboard:
# Settings → Database → Backups → Create manual backup
```

**Зачем:** На случай проблем при миграции.

---

### 3. Протестировать исправления в staging

```bash
# Запустите dev-сервер
npm run dev

# Проверьте:
# 1. Регистрация/вход пользователей
# 2. Добавление кошельков
# 3. Ручная синхронизация (должна быть защищена от повторных нажатий)
# 4. Нет ошибок в Console браузере
```

---

## 🟠 **В ТЕЧНЕ НЕДЕЛИ: Важно**

### 4. Применить схему БД из corrected-schema.sql

**Файл:** `supabase/supabase-corrected-schema.sql`

```bash
# Через Supabase Dashboard → SQL Editor
# Скопируйте содержимое файла и выполните
```

**Что исправляет:**

- Отсутствующие поля в таблицах
- Новые индексы для производительности
- Правильные RLS политики

**Инструкция:** Смотрите `DATABASE_MIGRATION_GUIDE.md`

---

### 5. Развернуть Edge Functions

Проверьте что все Edge Functions развернуты:

```bash
# Через Supabase Dashboard
# https://app.supabase.com/project/YOUR_PROJECT/functions

# Должны быть:
# - sync-wallet-trades
# - test-exchange-connection
# - fetch-trade-history
# - encrypt-credentials
# - decrypt-credentials
```

**Файлы:** `supabase/functions/*/index.ts`

---

### 6. Настроить мониторинг ошибок

**Варианты:**

- Sentry (рекомендуется)
- LogRocket
- Supabase Logs

**Что мониторить:**

- Ошибки Edge Functions
- Ошибки RLS policies
- Ошибки шифрования

---

## 🟡 **В ТЕЧНЕ МЕСЯЦА: Оптимизация**

### 7. Реализовать реальный блокчейн-импорт

**Текущее состояние:** Моки данных  
**Требуется:** Интеграция viem

```bash
# viem уже установлен в package.json
# Нужно реализовать парсинг в:
# supabase/functions/fetch-trade-history/index.ts
```

**Пример:**

```typescript
import { createPublicClient, http, getLogs } from 'viem';
import { mainnet } from 'viem/chains';

const client = createPublicClient({
  chain: mainnet,
  transport: http()
});

const logs = await getLogs(client, {
  address: UNISWAP_V2_ROUTER,
  fromBlock: /* ... */,
  event: parseEvent({ abi: UNISWAP_ABI, eventName: 'Swap' })
});
```

---

### 8. Добавить пагинацию и виртуализацию

**Файл:** `src/components/dashboard/TradeList.tsx`

```bash
npm install @tanstack/react-virtual
```

**Зачем:** Для производительности при 1000+ сделок

---

### 9. Внедрить Zod валидацию форм

**Файлы:**

- `src/components/dashboard/WalletConnect.tsx`
- `src/pages/Login.tsx`
- `src/pages/Register.tsx`

```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const walletSchema = z.object({
  apiKey: z
    .string()
    .min(16)
    .regex(/^[a-zA-Z0-9]+$/),
  apiSecret: z.string().min(16),
  // ...
});

const form = useForm({
  resolver: zodResolver(walletSchema),
});
```

---

### 10. Настроить CI/CD

**Рекомендации:**

- GitHub Actions для автоматического build & test
- Автоматический lint перед деплоем
- Проверка типов в CI

**Пример workflow:**

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

---

## 📊 **Мониторинг производительности**

### Ключевые метрики для отслеживания:

| Метрика                       | Целевое значение | Текущее |
| ----------------------------- | ---------------- | ------- |
| Время загрузки дашборда       | < 2 сек          | ?       |
| Кол-во запросов к БД в минуту | < 10             | ?       |
| Ошибки Edge Functions         | 0                | ?       |
| Memory usage в браузере       | < 100 MB         | ?       |

**Инструменты:**

- Lighthouse (Chrome DevTools)
- React DevTools Profiler
- Supabase Query Analytics

---

## 🔐 **Безопасность: Дополнительные меры**

### 1. Включить 2FA для Supabase аккаунта

### 2. Ограничить IP доступ к Supabase API

```bash
# В Supabase Dashboard → Settings → API
# Add allowed URLs
```

### 3. Регулярно обновлять зависимости

```bash
npm audit
npm update
```

### 4. Настроить CSP report-uri

```typescript
// В vite.security-plugin.ts
reportUri: 'https://your-csp-endpoint.com/report';
```

---

## 📝 **Чек-лист релиза**

Перед деплоем в production:

- [ ] Все критичные исправления применены
- [ ] Бэкап БД сделан
- [ ] RLS политики исправлены (`fix-service-role-rls.sql`)
- [ ] Схема БД обновлена (`supabase-corrected-schema.sql`)
- [ ] Edge Functions развернуты
- [ ] Нет ошибок в Console
- [ ] Нет warning в React DevTools
- [ ] Lighthouse score > 90
- [ ] Тестирование на мобильных устройствах
- [ ] Мониторинг настроен
- [ ] Документация обновлена

---

## 🆘 **Если что-то пошло не так**

### Откат изменений:

```bash
# 1. Откатить БД из бэкапа
# Supabase Dashboard → Database → Backups → Restore

# 2. Откатить код
git revert HEAD

# 3. Пересобрать
npm run build
```

### Диагностика:

```bash
# Проверить логи Supabase
# Dashboard → Logs → Postgres Logs

# Проверить Edge Functions логи
# Dashboard → Functions → Logs

# Проверить ошибки в браузере
# DevTools → Console
```

---

## 📞 **Поддержка**

**Документация:**

- `DATABASE_MIGRATION_GUIDE.md` — миграция БД
- `CHANGES_SUMMARY.md` — список всех исправлений
- `README.md` — общая документация

**Контакты:**

- GitHub Issues — для багов
- Supabase Docs — https://supabase.com/docs

---

**Дата создания:** 2025-01-15  
**Версия:** 1.0.0  
**Статус:** Актуально
