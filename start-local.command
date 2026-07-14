#!/bin/bash
# kupec — локальный запуск всего стека с живыми данными (двойной клик на macOS).
# Использование: ./start-local.command [СЕРВЕР]   напр. ./start-local.command RU17
set -e
cd "$(dirname "$0")"

SERVER="${1:-RU17}"
export DATABASE_URL="postgres://kupec:kupec@localhost:5433/kupec"
export JWT_SECRET="local-dev-secret"

echo "🚀 kupec — локальный запуск. Сервер: $SERVER"
echo "───────────────────────────────────────────"

# 1) Postgres в Docker
echo "① Поднимаю базу (Docker)…"
docker compose up -d db
until [ "$(docker inspect -f '{{.State.Health.Status}}' kupec_db 2>/dev/null)" = "healthy" ]; do
  sleep 1
done

# 2) Миграции
echo "② Применяю схему…"
pnpm --filter @kupec/db migrate

# 3) Останавливаем всё по Ctrl+C
cleanup() {
  echo ""
  echo "⏹  Останавливаю сервисы…"
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# 4) Поллер (живые данные Majestic → БД, цикл каждые 30 мин)
echo "③ Запускаю поллер (первый сбор данных ~10–20 сек)…"
POLL_SERVERS="$SERVER" POLL_PATHS="items,houses,apartments,vehicles,clothes" \
  pnpm --filter @kupec/poller start &

# 5) API
echo "④ Запускаю API (localhost:8787)…"
PORT=8787 pnpm --filter @kupec/api start &

# 6) Веб
echo "⑤ Запускаю веб (localhost:3000)…"
pnpm --filter @kupec/web dev &

sleep 7
echo "───────────────────────────────────────────"
echo "✅ Готово. Открой  http://localhost:3000"
echo "   Нажми «🔄 С сервера» — подтянутся живые цены $SERVER."
echo "   Ctrl+C — остановить всё."
open http://localhost:3000 2>/dev/null || true
wait
