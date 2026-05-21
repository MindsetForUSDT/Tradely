# TradeumDiary

Профессиональный дневник трейдера с автоматическим импортом сделок из блокчейнов и бирж.

## Features

- Автоматический импорт сделок из Web3 кошельков и CEX бирж
- Глубокая аналитика — P&L, win rate, Sharpe ratio, Kelly criterion
- Визуализация данных — графики, heatmap, equity curves
- Налоговые отчёты
- Безопасность — шифрование API ключей

## Tech Stack

**Frontend:**

- React 18 + TypeScript
- Tailwind CSS + Framer Motion
- Recharts
- TanStack Query
- Zustand

**Backend:**

- Supabase (PostgreSQL + Auth)
- Edge Functions (Deno)

## Quick Start

```bash
# Установить зависимости
npm install

# Создать .env.local
cp .env.example .env.local
# Отредактируйте .env.local с вашими Supabase credentials

# Запустить dev-сервер
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Documentation

- `CHANGES_SUMMARY.md` — список всех исправлений
- `DATABASE_MIGRATION_GUIDE.md` — миграция БД
- `NEXT_STEPS.md` — план развития

## License

MIT
