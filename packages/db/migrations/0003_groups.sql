-- Группы (семья / банда): общий журнал сделок на нескольких игроков.
create table if not exists groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- Код приглашения: по нему вступают, владелец может сменить.
  invite_code text unique not null,
  owner_id    uuid not null references users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists group_members (
  group_id  uuid not null references groups(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists idx_group_members_user on group_members (user_id);

-- Сделка может быть личной (null) или общей — видна всей группе.
alter table trades add column if not exists group_id uuid references groups(id) on delete set null;
create index if not exists idx_trades_group on trades (group_id) where group_id is not null;
