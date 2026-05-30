# 📊 TradeumDiary — Полный список ресурсов

---

## 🖥️ **Локальная разработка (текущая конфигурация)**

### **1. Docker Container — PostgreSQL 15**

| Ресурс              | Значение                                                                                                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Тип**             | PostgreSQL 15                                                                                                                                                                                             |
| **Хост**            | `localhost:5432`                                                                                                                                                                                          |
| **База данных**     | `tradeumdiary`                                                                                                                                                                                            |
| **Пользователь**    | `tradeumdiary`                                                                                                                                                                                            |
| **Пароль**          | `dev_password_123`                                                                                                                                                                                        |
| **Стоимость**       | **0 ₽** (локально)                                                                                                                                                                                        |
| **Команда запуска** | `docker run -d --name tradeumdiary-db -e POSTGRES_USER=tradeumdiary -e POSTGRES_PASSWORD=dev_password_123 -e POSTGRES_DB=tradeumdiary -p 5432:5432 -v postgres_data:/var/lib/postgresql/data postgres:15` |

---

### **2. Backend Server — Node.js + Express**

| Ресурс              | Значение                      |
| ------------------- | ----------------------------- |
| **Порт**            | `localhost:3001`              |
| **API Base URL**    | `http://localhost:3001/api`   |
| **Фреймворк**       | Express 5                     |
| **ORM**             | Prisma 5                      |
| **Аутентификация**  | Отключена для dev (Clerk SDK) |
| **Стоимость**       | **0 ₽** (локально)            |
| **Команда запуска** | `cd server && npm run dev`    |

---

### **3. Frontend — React 18 + Vite**

| Ресурс              | Значение                |
| ------------------- | ----------------------- |
| **Порт**            | `localhost:3000`        |
| **URL**             | `http://localhost:3000` |
| **Фреймворк**       | React 18 + Vite 5       |
| **Стили**           | Tailwind CSS            |
| **Стоимость**       | **0 ₽** (локально)      |
| **Команда запуска** | `npm run dev`           |

---

### **4. Аутентификация — Supabase Auth**

| Ресурс        | Значение                                   |
| ------------- | ------------------------------------------ |
| **URL**       | `https://zfgeofskmgycojbzrznk.supabase.co` |
| **Анон ключ** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`  |
| **Статус**    | ⚠️ Может блокироваться в РФ                |
| **Стоимость** | **0 ₽** (Free tier)                        |

**Если блокируется:** Аутентификация отключена, работает локальная эмуляция.

---

### **5. Тестовый пользователь**

| Поле        | Значение                        |
| ----------- | ------------------------------- |
| **Email**   | `test@tradeumdiary.com`         |
| **User ID** | `dev-user-12345`                |
| **Пароль**  | (любой, профиль создан вручную) |

---

## 🌐 **Production (при развёртывании на Timeweb)**

### **1. PostgreSQL (Timeweb Cloud)**

| Ресурс        | Значение                              |
| ------------- | ------------------------------------- |
| **Тариф**     | 1 vCPU / 2 GB RAM / 20 GB NVMe        |
| **Регион**    | Москва                                |
| **Сеть**      | Приватная сеть                        |
| **Бэкапы**    | Раз в день                            |
| **Стоимость** | **~910 ₽/мес** (790 ₽ + 120 ₽ бэкапы) |

---

### **2. Backend Server (Timeweb Cloud)**

| Ресурс                 | Значение                  |
| ---------------------- | ------------------------- |
| **Тариф**              | 1 vCPU / 1 GB RAM / 15 GB |
| **ОС**                 | Ubuntu 22.04              |
| **Менеджер процессов** | PM2                       |
| **Стоимость**          | **~350 ₽/мес**            |

---

### **3. Аутентификация (Clerk)**

| Ресурс        | Значение                |
| ------------- | ----------------------- |
| **Тариф**     | Free tier               |
| **Лимит**     | До 10,000 пользователей |
| **Стоимость** | **0 ₽**                 |

---

### **4. Frontend (Vercel / Netlify)**

| Ресурс        | Значение                   |
| ------------- | -------------------------- |
| **Хостинг**   | Vercel Free / Netlify Free |
| **Стоимость** | **0 ₽**                    |

---

### **Production Итого:**

| Компонент                | Стоимость        |
| ------------------------ | ---------------- |
| PostgreSQL (Timeweb)     | 910 ₽/мес        |
| Backend Server (Timeweb) | 350 ₽/мес        |
| Clerk Auth               | 0 ₽              |
| Frontend (Vercel)        | 0 ₽              |
| **ВСЕГО**                | **~1 260 ₽/мес** |

---

## 📦 **Зависимости проекта**

### **Frontend Dependencies:**

```json
{
  "dependencies": {
    "@clerk/clerk-react": "^5.61.6",
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@supabase/supabase-js": "^2.39.0",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-virtual": "^3.13.24",
    "clsx": "^2.0.0",
    "date-fns": "^3.0.0",
    "framer-motion": "^10.16.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.49.0",
    "react-hot-toast": "^2.6.0",
    "react-router-dom": "^6.21.0",
    "recharts": "^2.10.0",
    "tailwind-merge": "^2.1.0"
  }
}
```

### **Backend Dependencies:**

```json
{
  "dependencies": {
    "@clerk/clerk-sdk-node": "^4.13.23",
    "@prisma/client": "^5.22.0",
    "bcryptjs": "^3.0.3",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "helmet": "^8.2.0",
    "jsonwebtoken": "^9.0.3",
    "pg": "^8.21.0",
    "prisma": "^5.22.0"
  }
}
```

---

## 🔧 **Инструменты разработки**

| Инструмент         | Назначение                         |
| ------------------ | ---------------------------------- |
| **Docker Desktop** | PostgreSQL в контейнере            |
| **Node.js 20**     | Runtime для backend/frontend       |
| **Prisma Studio**  | GUI для БД (http://localhost:5555) |
| **VS Code**        | Редактор кода                      |
| **Git**            | Контроль версий                    |

---

## 📋 **Чек-лист для запуска**

### **Первый запуск:**

- [ ] Установить Docker Desktop
- [ ] Запустить PostgreSQL: `docker run -d --name tradeumdiary-db -e POSTGRES_USER=tradeumdiary -e POSTGRES_PASSWORD=dev_password_123 -e POSTGRES_DB=tradeumdiary -p 5432:5432 postgres:15`
- [ ] Применить миграции: `cd server && npx prisma migrate dev --name init`
- [ ] Запустить backend: `cd server && npm run dev`
- [ ] Запустить frontend: `npm run dev`
- [ ] Открыть: http://localhost:3000

### **Повседневная разработка:**

- [ ] Запустить Docker Desktop
- [ ] Запустить PostgreSQL: `docker start tradeumdiary-db`
- [ ] Запустить backend: `cd server && npm run dev`
- [ ] Запустить frontend: `npm run dev`

---

## 🌍 **Внешние API (опционально)**

| API              | Назначение    | Статус                                  |
| ---------------- | ------------- | --------------------------------------- |
| **Binance API**  | Крипто данные | `https://api.binance.com`               |
| **Bybit API**    | Крипто данные | `https://api.bybit.com`                 |
| **Infura RPC**   | Ethereum RPC  | `https://mainnet.infura.io/v3/YOUR_KEY` |
| **Google Fonts** | Шрифты        | `https://fonts.googleapis.com`          |

---

**Дата обновления:** 2024-05-24
**Версия проекта:** 1.0.0-dev
