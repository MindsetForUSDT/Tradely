# TradeumDiary в Docker

## Быстрый запуск

Скопируйте шаблон окружения и замените секреты. Compose намеренно не запускается со
стандартными ключами:

```powershell
Copy-Item .env.example .env
```

Минимальный `.env`:

```env
POSTGRES_PASSWORD=replace-with-a-long-database-password
JWT_SECRET=replace-with-at-least-32-random-characters
ENCRYPTION_KEY=replace-with-a-different-32-character-secret
APP_URL=http://localhost:3000
```

Для отправки писем восстановления добавьте `RESEND_API_KEY` и `EMAIL_FROM`. Без них
в локальном режиме API вернёт тестовую ссылку прямо в интерфейс; в production эти
переменные обязательны.

Затем из корня проекта выполните:

```bash
docker compose up --build
```

Если Docker использовал старый слой `npm ci` и сборка сообщает `tsc: not found`,
пересоберите web и API без кэша:

```powershell
docker compose build --no-cache web api
docker compose up -d --force-recreate
```

В Dockerfile зафиксирован npm 10.9.4: npm 11 из обновляемого образа Node Alpine может
завершать `npm ci` сообщением `Exit handler never called`, оставляя неполный `node_modules`.

После запуска:

- сайт: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:3001/api`
- health-check: `http://127.0.0.1:3001/health`
- PostgreSQL: `localhost:5433`

API-контейнер автоматически применяет существующие Prisma migrations перед запуском.
После обновления текущей ветки миграция создаст таблицы сессий, токенов восстановления,
аудита, риск-лимитов и целей.

## Полезные команды

```bash
docker compose ps
docker compose logs -f api
docker compose down
docker compose down -v
```

Последняя команда удаляет также локальные данные PostgreSQL; используйте её только для полного сброса среды.

## Если Docker Hub отвечает 403

Это внешний сетевой блок на скачивание базовых образов, а не ошибка приложения. Авторизуйтесь в Docker Desktop, проверьте доступ к Docker Hub и повторите `docker compose pull`, затем `docker compose up --build`.
