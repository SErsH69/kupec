# Бэкенд: локальный запуск и деплой на VPS Бегета

Стек: свой **Postgres** + сервис **API** (Hono) + **поллер** (опрос Majestic API → кэш в БД).
Всё на TypeScript, запускается через `tsx`. Общая логика — `@kupec/core`, доступ к БД — `@kupec/db`.

## Локальная разработка

```bash
# 1. Поднять Postgres (Docker). Слушает на localhost:5433 (5432 занят локальным PG).
docker compose up -d db

# 2. Настроить окружение
cp .env.example .env      # при желании поправить

# 3. Применить схему
DATABASE_URL=postgres://kupec:kupec@localhost:5433/kupec pnpm --filter @kupec/db migrate

# 4. Запустить API (http://localhost:8787)
DATABASE_URL=... JWT_SECRET=dev pnpm --filter @kupec/api dev

# 5. Запустить поллер (ограничь серверы/разделы, чтобы уложиться в лимит 5/60с)
DATABASE_URL=... POLL_SERVERS=RU17 POLL_PATHS=items,vehicles pnpm --filter @kupec/poller dev
```

Проверка API:
```bash
curl localhost:8787/health
curl localhost:8787/v1/market/RU17/items
curl -X POST localhost:8787/v1/auth/register -H 'content-type: application/json' \
  -d '{"email":"me@example.com","password":"secret123"}'
```

## Эндпоинты API

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/health` | проверка живости |
| GET | `/v1/servers` | список серверов |
| GET | `/v1/market/:server` | последние строки всех разделов (enriched) |
| GET | `/v1/market/:server/:path` | последние строки раздела |
| POST | `/v1/refresh/:server` | опросить сервер вживую (Majestic→БД) и вернуть свежие строки |
| POST | `/v1/auth/register` | регистрация → `{token}` |
| POST | `/v1/auth/login` | вход → `{token}` |
| GET | `/v1/trades` | журнал (нужен `Authorization: Bearer`) |
| POST | `/v1/trades` | добавить сделку |
| POST | `/v1/trades/:id/close` | закрыть сделку (`{sell}`) |
| DELETE | `/v1/trades/:id` | удалить сделку |

## Деплой на VPS Бегета (когда покупать — на этом этапе)

Почему Бегет, а не облачный Supabase: аудитория из РФ + **152-ФЗ** (перс. данные при регистрации
должны лежать на серверах в РФ). Бегет — РФ, оплата в рублях.

Ориентир по ресурсам: VPS 2 vCPU / 2–4 ГБ RAM (Postgres + API + поллер на одной машине).

1. **Postgres** — поставить на VPS (пакетом или в Docker), создать БД/роль `kupec`.
2. Склонировать репо, `corepack enable pnpm && pnpm install`.
3. `.env` на сервере: `DATABASE_URL`, надёжный `JWT_SECRET`, `PORT`, `POLL_SERVERS`/`POLL_PATHS`.
4. `pnpm --filter @kupec/db migrate`.
5. Запустить API и поллер как сервисы (systemd или `pm2`), рестарт при падении.
   Пример systemd-юнита: `ExecStart=/usr/bin/pnpm --filter @kupec/api start`.
6. Nginx перед API: TLS (Let's Encrypt), домен, проксирование на `localhost:8787`.
7. Веб (`@kupec/web`) — `pnpm --filter @kupec/web build && start` за тем же Nginx (или отдельный поддомен),
   переменная `NEXT_PUBLIC_API_URL` → адрес API.

### Ограничения Majestic (соблюдать)
- Только публичный API, **5 запросов / 60 сек** — поллер держит общий лимит на весь сервис.
- Опрашивать не всё сразу: 19 серверов × 7 разделов = 133 запроса ≈ 27 мин/цикл при 5/60с.
  На старте ограничить `POLL_SERVERS`/`POLL_PATHS`, расширять по мере надобности.
- Реклама/Pro — только после письменного «ок» Majestic.
