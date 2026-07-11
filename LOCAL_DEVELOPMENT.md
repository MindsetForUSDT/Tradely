# TradeumDiary — Локальная разработка

## 🚀 Быстрый старт

### 1. Запуск PostgreSQL

```powershell
docker compose up -d db
```

### 2. Запуск серверов

**Файлы окружения уже настроены!**

- `server/.env` — Backend (PostgreSQL + Clerk)
- `.env.local` — Frontend

#### Откройте 2 терминала:

**Терминал 1 (Backend):**

```powershell
cd server
npm run dev
```

**Терминал 2 (Frontend):**

```powershell
npm run dev
```

### 3. Открыть в браузере

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api

---

## 🔑 Настройка Clerk

Для работы аутентификации нужно получить ключи:

1. Зарегистрируйтесь на https://clerk.com
2. Создайте новое приложение
3. Получите ключи:
   - `Publishable key` (начинается с `pk_test_`)
   - `Secret key` (начинается с `sk_test_`)

4. Обновите файлы:

   ```
   server/.env:
   CLERK_SECRET_KEY=sk_test_ваш_ключ
   CLERK_PUBLISHABLE_KEY=pk_test_ваш_ключ

   .env.local:
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_ваш_ключ
   ```

---

## 📦 Управление базой данных

### Просмотр БД (Prisma Studio)

```powershell
cd server
npx prisma studio
```

Откроется на http://localhost:5555

### Применить миграции

```powershell
cd server
npx prisma migrate dev
```

### Генерация Prisma Client

```powershell
cd server
npx prisma generate
```

### Сброс базы данных

```powershell
cd server
npx prisma migrate reset
```

---

## 🛠 Команды

### Backend

| Команда             | Описание                   |
| ------------------- | -------------------------- |
| `npm run dev`       | Запуск в режиме разработки |
| `npm run build`     | Сборка для production      |
| `npm start`         | Запуск production сборки   |
| `npx prisma studio` | GUI для БД                 |

### Frontend

| Команда           | Описание                       |
| ----------------- | ------------------------------ |
| `npm run dev`     | Запуск в режиме разработки     |
| `npm run build`   | Сборка для production          |
| `npm run preview` | Предпросмотр production сборки |

---

## 📊 Архитектура

```
┌─────────────────────────────────────┐
│  Ваш компьютер                      │
│                                     │
│  Frontend: localhost:3000 (Vite)    │
│  Backend:  localhost:3001 (Express) │
│  БД:       localhost:5433 (Postgres)│
│                                     │
│  Все работает локально — 0 ₽        │
└─────────────────────────────────────┘
```

---

## ⚠️ Важно

- **Никогда не коммитьте `.env` файлы в Git!**
- Для production нужно настроить Timeweb Cloud
- См. `TIMWEB_SETUP.md` для production deployment

---

## 🆘 Если что-то не работает

### Ошибка: "Cannot connect to database"

```powershell
docker ps  # Проверить запущен ли контейнер
docker logs tradeumdiary-db  # Посмотреть логи
```

### Ошибка: "Port 3000 already in use"

```powershell
# Убедитесь что не запущен другой dev сервер
# Или используйте другой порт
npm run dev -- --port 3001
```

### Ошибка: "Clerk authentication failed"

- Проверьте `VITE_CLERK_PUBLISHABLE_KEY` в `.env.local`
- Убедитесь что домен добавлен в Clerk Dashboard

---

**Готово! Удачи в разработке!** 🎉
