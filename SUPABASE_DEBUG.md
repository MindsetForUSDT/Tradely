# 🔧 Отладка Supabase Authentication

## ❌ Проблема

Система не распознаёт залогиненного пользователя после входа.

## ✅ Что исправлено

### 1. Создан файл `.env.local`

**Проблема:** Файл с переменными окружения отсутствовал  
**Решение:** Создан `.env.local` с правильными настройками Supabase

```env
VITE_SUPABASE_URL=https://zfgeofskmgycojbzrznk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **ВАЖНО:** Убедитесь что URL не содержит `/rest/v1/` в конце!

### 2. Исправлен URL в `.env.example`

**Было:** `https://zfgeofskmgycojbzrznk.supabase.co/rest/v1/`  
**Стало:** `https://zfgeofskmgycojbzrznk.supabase.co`

### 3. Добавлено подробное логирование

Теперь в консоли браузера можно увидеть:

- `[Supabase Storage] GET/SET/REMOVE` - операции с сессией
- `[Supabase Debug] Initial session` - начальное состояние
- `[AuthProvider] Initializing auth` - инициализация
- `[AuthProvider] getSession result` - результат получения сессии
- `[AuthProvider] onAuthStateChange` - изменения состояния
- `[LoginForm] Attempting login` - попытка входа
- `[RegisterForm] Attempting registration` - попытка регистрации

### 4. Улучшен Supabase клиент

Добавлен кастомный storage с логированием:

```typescript
storage: {
  getItem: (key) => { ... },
  setItem: (key, value) => { ... },
  removeItem: (key) => { ... },
}
```

---

## 🧪 Как проверить

### 1. Запустите dev сервер

```bash
npm run dev
```

### 2. Откройте консоль браузера (F12)

Вы увидите логи при загрузке страницы:

```
[Supabase Debug] Initial session: ❌ no session
[AuthProvider] Initializing auth...
```

### 3. Попробуйте войти

Введите email и пароль, затем посмотрите логи:

```
[LoginForm] Attempting login for: user@example.com
[LoginForm] Login successful: { userId: '...', hasSession: true }
[LoginForm] Updating AuthContext with user: ...
[AuthProvider] setUser called: ...
[AuthProvider] onAuthStateChange: { event: 'SIGNED_IN', hasSession: true }
```

### 4. Проверьте состояние

После входа в консоль должно быть:

```
Layout: auth state changed { isAuthenticated: true, isLoading: false }
```

---

## 🔍 Возможные проблемы и решения

### Проблема 1: Нет переменной VITE_SUPABASE_URL

**Решение:**

1. Создайте `.env.local` в корне проекта
2. Добавьте переменные из `.env.example`
3. Перезапустите dev сервер

### Проблема 2: Ошибка CORS

**Решение:**

1. Зайдите в Supabase Dashboard
2. Authentication → URL Configuration
3. Добавьте ваш локальный URL в "Site URL"
4. Добавьте `http://localhost:5173` в redirect URLs

### Проблема 3: Сессия не сохраняется

**Решение:**

1. Проверьте localStorage в браузере (F12 → Application → Local Storage)
2. Должен быть ключ `tradeumdiary-auth`
3. Если нет - проверьте настройки storage в supabase.ts

### Проблема 4: Ошибка политик RLS

**Решение:**

1. Зайдите в Supabase Dashboard → Database → Policies
2. Проверьте политики для таблиц: `users`, `trades`, `wallets`
3. Должны быть правила для `SELECT`, `INSERT`, `UPDATE`, `DELETE` для authenticated пользователей

### Проблема 5: Требуется подтверждение email

**Решение:**

1. Зайдите в Supabase Dashboard → Authentication → Users
2. Если пользователь не подтверждён - нажмите "Verify User"
3. Или отключите подтверждение в Authentication → Settings

---

## 📊 Проверка Supabase настроек

### 1. Проверьте проект в Supabase Dashboard

```
https://app.supabase.com/project/zfgeofskmgycojbzrznk
```

### 2. Проверьте Authentication

- Authentication → Users: есть ли пользователи
- Authentication → Settings: правильно ли настроен Site URL
- Authentication → Providers: включены ли нужные провайдеры

### 3. Проверьте Database

- Database → Tables: есть ли таблицы `users`, `trades`, `wallets`
- Database → Policies: есть ли RLS политики

### 4. Проверьте API ключи

- Settings → API:
  - Project URL: `https://zfgeofskmgycojbzrznk.supabase.co`
  - anon/public key: должен совпадать с `.env.local`

---

## 🛠️ Дополнительные команды для отладки

### Проверить сессию в консоли

```javascript
// В консоли браузера выполните:
await supabase.auth.getSession();
await supabase.auth.getUser();
await supabase.auth.signOut();
```

### Проверить localStorage

```javascript
// В консоли браузера:
localStorage.getItem('tradeumdiary-auth');
```

### Пересоздать сессию

```javascript
// В консоли браузера:
localStorage.removeItem('tradeumdiary-auth');
location.reload();
```

---

## 📝 Чек-лист для проверки

- [ ] `.env.local` создан и содержит правильные переменные
- [ ] URL Supabase не содержит `/rest/v1/`
- [ ] Dev сервер перезапущен после создания `.env.local`
- [ ] Консоль браузера показывает логи Supabase
- [ ] В localStorage есть ключ `tradeumdiary-auth`
- [ ] В Supabase Dashboard пользователь существует
- [ ] RLS политики настроены правильно
- [ ] Site URL добавлен в Supabase Authentication Settings

---

## 🎯 Если ничего не помогает

### 1. Очистите данные

```bash
# В консоли браузера:
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### 2. Проверьте сеть

- Откройте Network tab в F12
- Попробуйте войти
- Ищите запросы к `supabase.co/auth/v1/`
- Проверьте статус коды (должно быть 200)

### 3. Проверьте пользовательские таблицы

```sql
-- В SQL Editor Supabase:
SELECT * FROM auth.users;
SELECT * FROM public.users;
```

### 4. Проверьте логи Supabase

- Project Settings → Audit Log
- Там будут все запросы к auth

---

## ✅ После исправления

Вы должны увидеть:

1. ✅ Логи в консоли без ошибок
2. ✅ Сессию в localStorage
3. ✅ Header показывает меню пользователя (не "Войти")
4. ✅ Переход на /dashboard после входа
5. ✅ Доступ к защищённым страницам

Удачи в отладке! 🚀
