# 🚀 Настройка Timeweb Cloud + Clerk

## 📋 Пошаговая инструкция

---

## **Шаг 1: Регистрация в Clerk (Auth)**

1. Перейдите на https://clerk.com
2. Зарегистрируйтесь и создайте новое приложение
3. Получите ключи:
   - `Publishable key` (начинается с `pk_test_` или `pk_live_`)
   - `Secret key` (начинается с `sk_test_` или `sk_live_`)

4. Настройте URL для вебхука:
   - В Clerk Dashboard → Webhooks → Add Endpoint
   - URL: `https://your-server.com/api/webhook/clerk`
   - Выберите события: `user.created`, `user.updated`, `user.deleted`

---

## **Шаг 2: Регистрация в Timeweb Cloud**

1. Перейдите на https://timeweb.cloud
2. Зарегистрируйтесь (можно через Telegram)
3. Пополните баланс (минимум 150 ₽)

---

## **Шаг 3: Создание PostgreSQL**

1. В Timeweb Dashboard → "Базы данных" → "Создать"
2. Выберите:
   - **Тип:** PostgreSQL
   - **Тариф:** Start (2 vCPU, 2 GB RAM, 10 GB) — 150 ₽/мес
   - **Версия:** 15
   - **Имя:** tradeumdiary-db
3. Создайте и запомните:
   - Хост (например: `postgres123.timeweb.ru`)
   - Порт (обычно `5432`)
   - Имя базы данных
   - Логин
   - Пароль

---

## **Шаг 4: Настройка сервера**

### 4.1 Обновите `.env` в папке `server/`

```env
DATABASE_URL="postgresql://username:password@host:5432/dbname?schema=public"
CLERK_SECRET_KEY=sk_test_ваш_ключ_из_clerk
CLERK_PUBLISHABLE_KEY=pk_test_ваш_ключ_из_clerk
JWT_SECRET=сгенерируйте_случайную_строку_минимум_32_символа
PORT=3001
NODE_ENV=production
```

### 4.2 Примените миграции Prisma

```bash
cd server
npx prisma migrate dev --name init
npx prisma generate
```

### 4.3 Запустите сервер локально

```bash
npm run dev
```

Сервер запустится на http://localhost:3001

---

## **Шаг 5: Настройка фронтенда**

### 5.1 Обновите `.env.local`

```env
# API Server
VITE_API_URL=http://localhost:3001/api

# Clerk Auth
VITE_CLERK_PUBLISHABLE_KEY=pk_test_ваш_ключ_из_clerk

# RPC Providers
VITE_RPC_PROVIDERS='["https://mainnet.infura.io/v3/YOUR_KEY"]'

# Feature Flags
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=true
```

### 5.2 Запустите фронтенд

```bash
npm run dev
```

---

## **Шаг 6: Деплой сервера**

### Вариант A: Timeweb Cloud (рекомендуется)

1. В Timeweb Dashboard → "Облачные серверы" → "Создать"
2. Выберите тариф (достаточно Start: 1 vCPU, 1 GB RAM — 200 ₽/мес)
3. Установите Node.js:

```bash
# Подключитесь к серверу по SSH
ssh root@your-server-ip

# Установите Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Установите PM2
npm install -g pm2

# Клонируйте репозиторий
git clone https://github.com/your-repo/tradeumdiary.git
cd tradeumdiary/server

# Установите зависимости
npm install

# Примените миграции
npx prisma migrate deploy
npx prisma generate

# Соберите проект
npm run build

# Запустите через PM2
pm2 start dist/index.js --name tradeumdiary-api
pm2 save
pm2 startup
```

### Вариант B: Render.com (бесплатно)

1. Зарегистрируйтесь на https://render.com
2. Создайте новый Web Service
3. Укажите:
   - Build Command: `cd server && npm install && npx prisma migrate deploy && npx prisma generate && npm run build`
   - Start Command: `cd server && npm start`
4. Добавьте переменные окружения из `.env`

---

## **Шаг 7: Деплой фронтенда**

### Вариант A: Vercel (рекомендуется)

1. Зарегистрируйтесь на https://vercel.com
2. Импортируйте GitHub репозиторий
3. Укажите:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Добавьте Environment Variables из `.env.local`

### Вариант B: Netlify

1. Зарегистрируйтесь на https://netlify.com
2. Загрузите папку `dist/` после сборки

---

## **💰 Итоговая стоимость**

| Услуга                 | Стоимость                  |
| ---------------------- | -------------------------- |
| PostgreSQL (Timeweb)   | 150 ₽/мес                  |
| Сервер (Timeweb Start) | 200 ₽/мес                  |
| Clerk Auth             | 0 ₽ (до 10k пользователей) |
| Vercel (фронтенд)      | 0 ₽                        |
| **Итого**              | **350 ₽/мес**              |

---

## **✅ Проверка**

После настройки проверьте:

1. Регистрация через Clerk работает
2. Профиль создаётся в PostgreSQL
3. Кошельки добавляются
4. Сделки загружаются
5. Выход из аккаунта работает

---

## **🆘 Если что-то не работает**

### Проблема: "Не могу подключиться к БД"

```bash
# Проверьте строку подключения
psql "postgresql://user:pass@host:5432/dbname"
```

### Проблема: "CORS ошибка"

```typescript
// В server/src/index.ts
app.use(
  cors({
    origin: ['https://your-frontend-url.com'],
    credentials: true,
  })
);
```

### Проблема: "Clerk не работает"

Проверьте:

1. Правильный `VITE_CLERK_PUBLISHABLE_KEY`
2. В Clerk Dashboard разрешён ваш домен

---

**Готово!** 🎉
