#!/bin/bash
# Запуск дашборда Majestic через локальный сервер (нужно для автосейва в файл).
# Двойной клик по этому файлу поднимает сервер и открывает дашборд в браузере.

cd "$(dirname "$0")" || exit 1

PORT=8765
PAGE="majestic_market_dashboard.html"
URL="http://localhost:${PORT}/${PAGE}"

echo "=============================================="
echo "  Majestic RP — Маркет дашборд"
echo "  Адрес: ${URL}"
echo "  Не закрывай это окно, пока работаешь."
echo "  Остановить сервер: Ctrl+C или закрыть окно."
echo "=============================================="
echo ""

# открыть браузер чуть позже, когда сервер уже поднялся
( sleep 1; open "${URL}" ) &

# выбрать доступный сервер
if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "${PORT}"
elif command -v python >/dev/null 2>&1; then
  exec python -m SimpleHTTPServer "${PORT}"
elif command -v node >/dev/null 2>&1; then
  exec npx --yes http-server -p "${PORT}" -c-1
else
  echo "Не найден ни Python, ни Node."
  echo "Установи Python 3 (https://www.python.org) и запусти снова."
  read -r -p "Нажми Enter, чтобы закрыть..."
  exit 1
fi
