# CLAUDE.md — контекст проекта для Claude Code

Этот файл — память проекта. Прочитай его целиком перед работой.

## Что это

`majestic_market_dashboard.html` — рабочий инструмент аналитики маркета для GTA RP (Majestic RP, RU17 Portland и др.): цены рынка, спрос/оборот, выгода крафта и перекупа, журнал сделок, гос-цены скупщиков, работы. Это **действующий прототип** (им реально пользуются) и одновременно референс для продукта.

**Эта папка = проект `kupec`** (репозиторий `git@github.com:SErsH69/kupec.git`, ветка `main`). Прод-версию на нормальном стеке строим **прямо здесь**, рядом с прототипом, а не в отдельной папке. Прежняя черновая папка `../kupec` удалена — монорепо собираем заново.

## Технически (прототип)

- **Один HTML-файл**, ~2000 строк: ванильный HTML + CSS + JS, без фреймворков и сборки.
- Данные пользователя (журнал, цели, настройки) — в `localStorage`.
- Рыночные данные — из **публичного API Majestic**; браузер напрямую не пускает (CORS), поэтому обход: закладка/консоль/импорт JSON.
- Данные Fletcher Wiki (гос-цены 209, работы 23, рецепты 40) вшиты снимком в сам файл.
- Автосейв журнала — File System Access API (только `localhost`, запуск через `start.command`).

## Ключевые файлы

- `majestic_market_dashboard.html` — сам дашборд (единственный исполняемый файл).
- `start.command` / `~/Desktop/Majestic Dashboard.command` — локальный сервер + автосейв.
- `data/` — исходные JSON (транспорт, рецепты, спеки).
- `majestic_data.json`, `majestic_recovery.json` — снимки/восстановление журнала.
- `docs/`-нет; планы лежат рядом: `Архитектура_и_план.md`, `Письмо_Majestic.md`.
- `majestic_market_dashboard.backup-*.html` — бэкапы правок (можно проредить, оставив пару свежих).

## Правки в коде (как редактировать прототип)

Файл большой, строки длинные. Правь точечно (grep + замена), после каждой правки проверяй JS: извлеки `<script>` и `node --check`. Вкладки задаются объектом `CATS`, роутинг — в `render()`, рендер-функции `renderX()` пишут в `panel().innerHTML`.

## Ограничения Majestic (ВАЖНО, не нарушать)

Ответ их поддержки (заявка №1375671-80970):
1. Только **публичный API**, лимит **5 запросов / 60 сек**.
2. Можно **только текстовое название**. Логотип, иконки, любые их файлы — нельзя (уже вычищено, логотип свой оригинальный).
3. **Партнёрство отклонили.**

## Монетизация — правило

Данные Majestic и базовые инструменты — бесплатно. Платить (Pro) — только за свои функции (синхрон, история журнала, уведомления, аналитика). Реклама/Pro — после письменного «ок» Majestic (`Письмо_Majestic.md`).

## Продуктовая переделка (в этом же репо)

Прототип остаётся референсом. Прод-версия — монорепо на TypeScript в этой же папке: Next.js веб + Expo мобилки (Android/iOS) + общий пакет `@kupec/core`, бэкенд Supabase (аккаунты/регистрация) + поллер, логирование (Sentry + PostHog/pino). Логику из `majestic_market_dashboard.html` порти в `@kupec/core`.

**Статус монорепо (Этап 0 + вся расчётная логика — сделано):** pnpm + Turborepo подняты (`pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`). Пакет `packages/core` (`@kupec/core`) — чистая логика без DOM/localStorage, состояние передаётся параметрами. Портировано с тестами (vitest, 65 шт., `pnpm --filter @kupec/core test`):
- `servers`, `format` (nf/money/pct/groupInt)
- `market` (parse/enrich/num, PERIOD_DAYS=30), `advice` (sellAdvice)
- `flip` (computeFlip/flipScore/planBudget), `trends` (snapshotPrices/recordSnapshot/trendMap/computeMovers)
- `craft` (itemIndex/bestUnitCost/computeRecipes — средний шанс, рекурсия себестоимости с защитой циклов)
- `kitchen` (computeKitchen — блюдо по id, ингредиенты по name), `farm` (farmType/computeFarm), `vehicles` (buildRL)
- `journal` (tradePnl/journalSummary — «своя» функция, P&L журнала сделок)
- `ingest` (detectPath/ingestMarketJson — импорт JSON из API/закладки в строки по разделам)
- Вшитые справочники извлечены из прототипа в `packages/core/src/data/*.json` (RECIPES 40, KITCHEN_RECIPES 69, GOV 209, JOBS 23, транспорт, классификаторы), типизированы в `data/index.ts`.

**Веб `apps/web` (`@kupec/web`) — рабочий каркас (Этап 2, часть без аккаунтов):** Next.js 15 (App Router) + React 19 + Tailwind v4, `transpilePackages:['@kupec/core']`. Современный тёмный UI с нуля. Стор на React Context + localStorage (`lib/store.tsx`), импорт JSON (диалог), выбор сервера. Вкладки поверх core: Топ выгодных, Перекупка (+бюджет-планировщик), Мастерская, Кухня, Что фармить, Движения, Журнал сделок (add/close/P&L, `lib/journal.tsx`), RL-авто, Гос-цены. Проверено вживую (preview): импорт → расчёты сходятся с ручной проверкой, журнал (P&L +$75k/ROI 33% сошёлся), консоль чистая. Запуск: `pnpm --filter @kupec/web dev` (или preview-конфиг `web` в `.claude/launch.json`).

**Бэкенд (Этап 1) — код готов и проверен end-to-end (Docker Postgres):**
- `packages/db` (`@kupec/db`) — Postgres-схема (`migrations/0001_init.sql`: снимки рынка, poll_runs, users, trades, favorites, settings), клиент (postgres.js), миграции (`pnpm --filter @kupec/db migrate`), типизированные запросы.
- `services/poller` (`@kupec/poller`) — рейт-лимитер 5/60с (тесты), клиент Majestic (fetch инъектируем), `pollPath/pollAll` (fetch → parse core → upsert), цикл каждые 30 мин, pino-логи.
- `services/api` (`@kupec/api`) — Hono API: рынок (enriched из core), регистрация/логин (bcrypt + JWT/jose), журнал сделок (защищён Bearer). Эндпоинты и деплой — `docs/DEPLOY.md`.
- Проверено: поллер (mock API → БД → latestRows), API (market/register/login/401/trades) — всё сходится. Тесты: core 75, poller 3, api 3.
- Локально: `docker compose up -d db` (Postgres на **localhost:5433** — 5432 занят локальным PG), `.env` из `.env.example`.

**Веб ↔ бэкенд связаны (Этап 2 завершён), проверено вживую:** `apps/web/lib/api.ts` (клиент API, `NEXT_PUBLIC_API_URL`, по умолч. localhost:8787), `lib/auth.tsx` (AuthProvider: регистрация/логин/выход, токен в localStorage), `components/AuthDialog.tsx`. Журнал (`lib/journal.tsx`) при входе синхронизируется с аккаунтом и **мигрирует локальные сделки в БД**, без входа — localStorage. Кнопка «🔄 С сервера» тянет живой рынок из API (`loadServerRows` в сторе). Проверено в preview против Docker Postgres: регистрация → миграция журнала → добавление через API → перезагрузка (данные из аккаунта) → загрузка рынка с сервера (поллер→БД→API→веб). Консоль чистая.

**Общий API-клиент вынесен в `packages/client` (`@kupec/client`):** `createApi(baseUrl, getToken)` на глобальном `fetch` — используют и веб (`apps/web/lib/api.ts` оборачивает с `NEXT_PUBLIC_API_URL`), и мобилка. Тесты с мок-fetch.

**Мобилка `apps/mobile` (`@kupec/mobile`) — рабочее приложение (Этап 4), проверено вживую:** Expo SDK 53 + React Native 0.79 + **React 19** (выровнен с вебом!) + Expo Router + react-native-web. Три вкладки (`app/_layout.tsx` → Tabs): **Топ выгодных** (загрузка рынка с API), **Журнал сделок** (add/close/delete + P&L, `lib/journal.tsx`, синхрон с аккаунтом или локально в AsyncStorage), **Аккаунт** (регистрация/логин/выход, `lib/auth.tsx`, токен в AsyncStorage). Всё поверх `@kupec/core` (money/nf/journalSummary/tradePnl) и `@kupec/client`. Проверено в мобильном вьюпорте: рендер, `GET /v1/market/RU17`, регистрация (`POST /v1/auth/register`→синхрон журнала), добавление сделки (`POST /v1/trades`, вложено $900=50×18) — идентично вебу, консоль чистая. Запуск: `pnpm --filter @kupec/mobile dev` (Expo Go/эмулятор) или превью веб-бандла (`expo export -p web` + `node apps/mobile/serve-web.mjs`, конфиг `mobile-web`).

**ВАЖНО про монорепо-раскладку:** из-за Expo/Metro включён `node-linker=hoisted` (плоский node_modules) в `.npmrc` — иначе Metro не резолвит транзитивные зависимости pnpm. Версии `@types/react`/`@types/react-dom` зафиксированы в `pnpm-workspace.yaml` (`overrides`), т.к. web и mobile теперь оба на React 19 и рассинхрон типов ломает JSX.

**Осталось:** запустить поллер на живых данных Majestic (нужен VPS — вот теперь покупать); Sentry+PostHog (наблюдаемость); деплой по `docs/DEPLOY.md`; довести мобилку (авторизация, журнал, ещё экраны — по образцу веба поверх тех же core/client). Хостинг: VPS Бегета (РФ, 152-ФЗ), свой Postgres+Auth. Публикация мобилки требует внешних аккаунтов: Google Play $25 разово, Apple $99/год (у россиян сложности с оплатой — начинать проще с Android).

**Карта расчётной логики → `docs/PORTING_SPEC.md`** — точные формулы/константы, сверять оттуда. Хрупкие места: средний (не max) шанс крафта, рекурсия себестоимости с защитой циклов, `deal=max(min, avg*0.6)` во flip, отсечка `cur>0 && prev>0` в movers, кухня — блюдо по id, ингредиенты по name.

Команды: `pnpm install`, `pnpm test` (turbo), `pnpm typecheck`, `pnpm --filter @kupec/core test`. pnpm ставится через `corepack enable pnpm`.

Статус письма Majestic: **ждём ответ** (см. `Письмо_Majestic.md`). До письменного «ок» — без рекламы/Pro.

## Журнал решений (уже решено — не переспрашивать)

- **Прод-стек — TypeScript везде (Next.js + Expo + `core`), НЕ Flutter** — переиспользуем существующий JS, один язык, одна логика.
- **Бэкенд — Supabase + серверный поллер** — снимает CORS и лимит централизованно, даёт аккаунты/синхрон вместо localStorage.
- **Данные вики — снимком, не в рантайме** — Fletcher Wiki под Cloudflare, клиент не заберёт.
- **Имя `kupec` — нейтральное** — Majestic ограничивает бренд.
- **Монетизация — только за свои функции; реклама/Pro после «ок» Majestic.**
- **Никакого логотипа/иконок/картинок Majestic.**
- **Вкладка «Пропуск» удалена** (решение пользователя).
- **Гос-цены и Работы оставили; прочие таблицы вики НЕ добавляли** — справочники, малополезны, устаревают.
- **Рецепты не переписывали** — совпадают с официальными (сверено, включая шансы/время).
- **File System Access / `start.command` — временное решение** проблемы «данные только в localStorage»; в продукте заменяется аккаунтами + БД.

## Известные грабли

- `localStorage` привязан к origin: `file://` и `localhost` — разные хранилища (при переезде на аккаунты уходит).
- Успех крафта зависит от шанса (напр. «Стальная кирка» 1%/2%) — без учёта шанса профит раздут; в дашборде есть галка «шанс».
