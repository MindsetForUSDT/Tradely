# TradeumDiary в Docker

## Быстрый запуск

Создайте корневой `.env` только для локальных секретов:

```env
JWT_SECRET=replace-with-a-long-random-secret
ENCRYPTION_KEY=replace-with-a-different-long-random-secret
```

Затем из корня проекта выполните:

```bash
docker compose up --build
```

После запуска:

- сайт: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:3001/api`
- health-check: `http://127.0.0.1:3001/health`
- PostgreSQL: `localhost:5433`

API-контейнер автоматически применяет существующие Prisma migrations перед запуском.

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
