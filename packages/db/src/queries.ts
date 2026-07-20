import type { MarketRow } from '@kupec/core';
import type { Sql } from './client';

/* ---------------- рынок ---------------- */

/** Вставить снимок рынка (пакетно) для раздела сервера. */
export async function insertSnapshots(
  sql: Sql,
  serverId: string,
  path: string,
  rows: MarketRow[],
  polledAt: Date = new Date(),
): Promise<number> {
  if (rows.length === 0) return 0;
  const data = rows.map((r) => ({
    server_id: serverId,
    path,
    item_id: String(r.id),
    name: r.name,
    total: r.total,
    sold: r.sold,
    avg: r.avg,
    min: r.min,
    max: r.max,
    polled_at: polledAt,
  }));
  await sql`insert into market_snapshots ${sql(
    data,
    'server_id',
    'path',
    'item_id',
    'name',
    'total',
    'sold',
    'avg',
    'min',
    'max',
    'polled_at',
  )}`;
  return data.length;
}

interface SnapshotRow {
  path: string;
  item_id: string;
  name: string;
  total: number | null;
  sold: number | null;
  avg: number | null;
  min: number | null;
  max: number | null;
}

/** Последние (текущие) строки рынка сервера; можно ограничить разделом. */
export async function latestRows(sql: Sql, serverId: string, path?: string): Promise<MarketRow[]> {
  const rows = await sql<SnapshotRow[]>`
    select distinct on (path, item_id)
      path, item_id, name, total, sold, avg, min, max
    from market_snapshots
    where server_id = ${serverId} ${path ? sql`and path = ${path}` : sql``}
    order by path, item_id, polled_at desc
  `;
  return rows.map((r) => ({
    id: r.item_id,
    name: r.name,
    total: r.total,
    sold: r.sold,
    avg: r.avg,
    min: r.min,
    max: r.max,
    _path: r.path,
  }));
}

/** Точка истории цены: когда опросили и почём был предмет. */
export interface HistoryPoint {
  at: Date;
  avg: number | null;
  min: number | null;
  max: number | null;
  sold: number | null;
}

/**
 * История цены предмета — то, чего нет в публичном API (там окно 30 дней).
 * Копится нашими снимками: чем дольше работает поллер, тем длиннее ряд.
 */
export async function itemHistory(
  sql: Sql,
  serverId: string,
  path: string,
  itemId: string,
  limit = 500,
): Promise<HistoryPoint[]> {
  const rows = await sql<{ polled_at: Date; avg: number | null; min: number | null; max: number | null; sold: number | null }[]>`
    select polled_at, avg, min, max, sold
    from market_snapshots
    where server_id = ${serverId} and path = ${path} and item_id = ${itemId}
    order by polled_at desc
    limit ${limit}
  `;
  return rows
    .map((r) => ({ at: r.polled_at, avg: r.avg, min: r.min, max: r.max, sold: r.sold }))
    .reverse();
}

export interface PollRun {
  serverId: string;
  path: string;
  rows: number;
  ok: boolean;
  error?: string | null;
  startedAt: Date;
  finishedAt: Date;
}

/** Записать результат опроса (наблюдаемость). */
export async function recordPollRun(sql: Sql, run: PollRun): Promise<void> {
  await sql`insert into poll_runs ${sql({
    server_id: run.serverId,
    path: run.path,
    rows: run.rows,
    ok: run.ok,
    error: run.error ?? null,
    started_at: run.startedAt,
    finished_at: run.finishedAt,
  })}`;
}

/* ---------------- пользователи ---------------- */

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
}

export async function createUser(sql: Sql, email: string, passwordHash: string): Promise<UserRow> {
  const [row] = await sql<UserRow[]>`
    insert into users ${sql({ email, password_hash: passwordHash })}
    returning id, email, password_hash
  `;
  return row!;
}

export async function findUserByEmail(sql: Sql, email: string): Promise<UserRow | undefined> {
  const [row] = await sql<UserRow[]>`
    select id, email, password_hash from users where email = ${email}
  `;
  return row;
}

export async function findUserById(sql: Sql, id: string): Promise<UserRow | undefined> {
  const [row] = await sql<UserRow[]>`
    select id, email, password_hash from users where id = ${id}
  `;
  return row;
}

export async function updatePasswordHash(sql: Sql, id: string, passwordHash: string): Promise<void> {
  await sql`update users set password_hash = ${passwordHash} where id = ${id}`;
}

/* ---------------- группы (общий журнал) ---------------- */

export interface GroupRow {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
}

/** Код приглашения: короткий, без похожих символов (0/O, 1/I). */
function inviteCode(): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

export async function createGroup(sql: Sql, userId: string, name: string): Promise<GroupRow> {
  const [group] = await sql<GroupRow[]>`
    insert into groups ${sql({ name, invite_code: inviteCode(), owner_id: userId })}
    returning id, name, invite_code, owner_id
  `;
  await sql`insert into group_members ${sql({ group_id: group!.id, user_id: userId })}`;
  return group!;
}

/** Группа пользователя (по первому членству) — одна группа на игрока. */
export async function myGroup(sql: Sql, userId: string): Promise<GroupRow | undefined> {
  const [row] = await sql<GroupRow[]>`
    select g.id, g.name, g.invite_code, g.owner_id
    from groups g join group_members m on m.group_id = g.id
    where m.user_id = ${userId}
    order by m.joined_at
    limit 1
  `;
  return row;
}

/** Вступить по коду. undefined — кода нет. */
export async function joinGroup(sql: Sql, userId: string, code: string): Promise<GroupRow | undefined> {
  const [group] = await sql<GroupRow[]>`
    select id, name, invite_code, owner_id from groups where invite_code = ${code.trim().toUpperCase()}
  `;
  if (!group) return undefined;
  await sql`
    insert into group_members ${sql({ group_id: group.id, user_id: userId })}
    on conflict do nothing
  `;
  return group;
}

export async function leaveGroup(sql: Sql, userId: string, groupId: string): Promise<void> {
  await sql`delete from group_members where group_id = ${groupId} and user_id = ${userId}`;
  // Личные сделки остаются, общие — отвязываются от автора, но остаются у группы.
}

export async function groupMembers(sql: Sql, groupId: string): Promise<{ id: string; email: string }[]> {
  return sql<{ id: string; email: string }[]>`
    select u.id, u.email
    from users u join group_members m on m.user_id = u.id
    where m.group_id = ${groupId}
    order by m.joined_at
  `;
}

/** Состоит ли пользователь в группе (проверка доступа). */
export async function isMember(sql: Sql, userId: string, groupId: string): Promise<boolean> {
  const [row] = await sql<{ one: number }[]>`
    select 1 as one from group_members where group_id = ${groupId} and user_id = ${userId}
  `;
  return !!row;
}

/* ---------------- сделки (журнал) ---------------- */

export interface TradeRow {
  id: string;
  item: string;
  qty: number;
  buy: number;
  sell: number | null;
  server: string | null;
  note: string | null;
  created_at: Date;
  closed_at: Date | null;
  kind: string;
  materials: number | null;
  list_price: number | null;
  sold_units: number | null;
  sold_revenue: number | null;
}

const TRADE_COLS = sqlCols();
function sqlCols() {
  return `id, item, qty, buy, sell, server, note, created_at, closed_at,
          kind, materials, list_price, sold_units, sold_revenue`;
}

export async function listTrades(sql: Sql, userId: string): Promise<TradeRow[]> {
  return sql<TradeRow[]>`
    select ${sql.unsafe(TRADE_COLS)}
    from trades where user_id = ${userId} and group_id is null order by created_at desc
  `;
}

export interface GroupTradeRow extends TradeRow {
  author: string;
}

/** Общий журнал группы: сделки всех участников с автором. */
export async function listGroupTrades(sql: Sql, groupId: string): Promise<GroupTradeRow[]> {
  return sql<GroupTradeRow[]>`
    select ${sql.unsafe(TRADE_COLS.split(',').map((c) => `t.${c.trim()}`).join(', '))}, u.email as author
    from trades t left join users u on u.id = t.user_id
    where t.group_id = ${groupId} order by t.created_at desc
  `;
}

export interface AddTradeInput {
  item: string;
  qty: number;
  buy: number;
  sell?: number | null;
  server?: string | null;
  note?: string | null;
  kind?: string | null;
  materials?: number | null;
  listPrice?: number | null;
  soldUnits?: number | null;
  soldRevenue?: number | null;
  /** Если задан — сделка общая, видна всей группе. */
  groupId?: string | null;
}

export async function addTrade(sql: Sql, userId: string, t: AddTradeInput): Promise<TradeRow> {
  const isCraft = t.kind === 'craft';
  const closed = isCraft
    ? (t.soldUnits ?? 0) >= t.qty && (t.soldUnits ?? 0) > 0
      ? new Date()
      : null
    : t.sell != null
      ? new Date()
      : null;
  const [row] = await sql<TradeRow[]>`
    insert into trades ${sql({
      user_id: userId,
      item: t.item,
      qty: t.qty,
      buy: t.buy,
      sell: t.sell ?? null,
      server: t.server ?? null,
      note: t.note ?? null,
      kind: t.kind ?? 'flip',
      materials: t.materials ?? null,
      list_price: t.listPrice ?? null,
      sold_units: t.soldUnits ?? null,
      sold_revenue: t.soldRevenue ?? null,
      group_id: t.groupId ?? null,
      closed_at: closed,
    })}
    returning ${sql.unsafe(TRADE_COLS)}
  `;
  return row!;
}

export async function closeTrade(sql: Sql, userId: string, id: string, sell: number): Promise<void> {
  await sql`update trades set sell = ${sell}, closed_at = now() where id = ${id} and user_id = ${userId}`;
}

const PATCH_COLS: Record<string, string> = {
  item: 'item',
  qty: 'qty',
  buy: 'buy',
  sell: 'sell',
  note: 'note',
  kind: 'kind',
  materials: 'materials',
  listPrice: 'list_price',
  soldUnits: 'sold_units',
  soldRevenue: 'sold_revenue',
};

/** Частичное обновление сделки (правка крафта/продажа). Пересчитывает closed_at. */
export async function updateTrade(
  sql: Sql,
  userId: string,
  id: string,
  patch: Partial<AddTradeInput>,
): Promise<TradeRow | undefined> {
  const [cur] = await sql<TradeRow[]>`
    select ${sql.unsafe(TRADE_COLS)} from trades where id = ${id} and user_id = ${userId}
  `;
  if (!cur) return undefined;

  const set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const col = PATCH_COLS[k];
    if (col) set[col] = v ?? null;
  }

  const kind = patch.kind ?? cur.kind;
  const qty = patch.qty ?? cur.qty;
  const sell = patch.sell ?? cur.sell;
  const soldUnits = patch.soldUnits ?? cur.sold_units ?? 0;
  set['closed_at'] =
    kind === 'craft'
      ? soldUnits >= qty && soldUnits > 0
        ? new Date()
        : null
      : sell != null
        ? new Date()
        : null;

  const [row] = await sql<TradeRow[]>`
    update trades set ${sql(set)} where id = ${id} and user_id = ${userId}
    returning ${sql.unsafe(TRADE_COLS)}
  `;
  return row;
}

export async function deleteTrade(sql: Sql, userId: string, id: string): Promise<void> {
  await sql`delete from trades where id = ${id} and user_id = ${userId}`;
}
