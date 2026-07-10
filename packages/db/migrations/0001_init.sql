-- kupec — начальная схема БД (Postgres). Свой Postgres на VPS (не облако).
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;     -- регистронезависимый email

-- Справочник серверов.
create table if not exists servers (
  id   text primary key,
  name text not null
);

-- Снимки рынка: по строке на (сервер, раздел, предмет) на момент опроса.
-- История копится вставкой новых строк; «текущее» = max(polled_at).
create table if not exists market_snapshots (
  id         bigint generated always as identity primary key,
  server_id  text not null,
  path       text not null,
  item_id    text not null,
  name       text not null,
  total      integer,
  sold       integer,
  avg        double precision,
  min        double precision,
  max        double precision,
  polled_at  timestamptz not null default now()
);
create index if not exists idx_snap_latest on market_snapshots (server_id, path, polled_at desc);
create index if not exists idx_snap_item   on market_snapshots (server_id, path, item_id, polled_at desc);

-- Журнал опросов поллера (наблюдаемость).
create table if not exists poll_runs (
  id          bigint generated always as identity primary key,
  server_id   text not null,
  path        text not null,
  rows        integer not null default 0,
  ok          boolean not null,
  error       text,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

-- Пользователи (своя авторизация).
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         citext unique not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- Журнал сделок пользователя (синхрон вместо localStorage).
create table if not exists trades (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  item       text not null,
  qty        integer not null,
  buy        double precision not null,
  sell       double precision,
  server     text,
  note       text,
  created_at timestamptz not null default now(),
  closed_at  timestamptz
);
create index if not exists idx_trades_user on trades (user_id);

-- Избранное пользователя.
create table if not exists favorites (
  user_id uuid not null references users(id) on delete cascade,
  key     text not null,
  primary key (user_id, key)
);

-- Настройки пользователя (произвольный JSON: себестоимость, цели, фильтры).
create table if not exists settings (
  user_id uuid primary key references users(id) on delete cascade,
  data    jsonb not null default '{}'::jsonb
);
