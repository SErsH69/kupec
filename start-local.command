#!/bin/bash
# kupec — запуск всего локально одной командой (двойной клик на macOS или ./start-local.command).
# Сервер выбирается прямо в приложении (выпадашка вверху) — данные тянутся по кнопке «С сервера».
set -e
cd "$(dirname "$0")"

export DATABASE_URL="postgres://kupec:kupec@localhost:5433/kupec"
export JWT_SECRET="local-dev-secret"

echo "🚀 kupec — локальный запуск"
echo "───────────────────────────────────────────"

# 0) Зависимости — ставим автоматически при первом запуске
if [ ! -d node_modules ] || [ ! -d apps/web/node_modules ]; then
  echo "① Первый запуск — ставлю зависимости (это разово, пару минут)…"
  corepack enable pnpm >/dev/null 2>&1 || true
  pnpm install
else
  echo "① Зависимости на месте."
fi

# 1) Postgres в Docker
echo "② Поднимаю базу (Docker)…"
if ! docker info >/dev/null 2>&1; then
  echo "   ⚠️  Docker не запущен. Открой приложение Docker Desktop и запусти скрипт снова."
  exit 1
fi
docker compose up -d db
until [ "$(docker inspect -f '{{.State.Health.Status}}' kupec_db 2>/dev/null)" = "healthy" ]; do
  sleep 1
done

# 2) Схема БД
echo "③ Применяю схему…"
pnpm --filter @kupec/db migrate

# 3) Остановка всего по Ctrl+C
cleanup() {
  echo ""
  echo "⏹  Останавливаю сервисы…"
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# 4) API (localhost:8787) — умеет опрашивать любой сервер по запросу
echo "④ Запускаю API…"
PORT=8787 pnpm --filter @kupec/api start &

# 5) Веб (localhost:3000)
echo "⑤ Запускаю веб…"
pnpm --filter @kupec/web dev &

sleep 7
echo "───────────────────────────────────────────"
echo "✅ Готово. Открой  http://localhost:3000"
echo "   1) Вверху выбери свой сервер (напр. RU17 · Portland)."
echo "   2) Нажми «🔄 С сервера» — подтянутся живые цены выбранного сервера."
echo "   3) «Войти» → «Регистрация» — заведи аккаунт (журнал/избранное синхронятся)."
echo "   Ctrl+C — остановить всё."
open http://localhost:3000 2>/dev/null || true
wait
