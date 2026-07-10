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
}

export async function listTrades(sql: Sql, userId: string): Promise<TradeRow[]> {
  return sql<TradeRow[]>`
    select id, item, qty, buy, sell, server, note, created_at, closed_at
    from trades where user_id = ${userId} order by created_at desc
  `;
}

export async function addTrade(
  sql: Sql,
  userId: string,
  t: { item: string; qty: number; buy: number; sell?: number | null; server?: string | null; note?: string | null },
): Promise<TradeRow> {
  const [row] = await sql<TradeRow[]>`
    insert into trades ${sql({
      user_id: userId,
      item: t.item,
      qty: t.qty,
      buy: t.buy,
      sell: t.sell ?? null,
      server: t.server ?? null,
      note: t.note ?? null,
      closed_at: t.sell != null ? new Date() : null,
    })}
    returning id, item, qty, buy, sell, server, note, created_at, closed_at
  `;
  return row!;
}

export async function closeTrade(sql: Sql, userId: string, id: string, sell: number): Promise<void> {
  await sql`update trades set sell = ${sell}, closed_at = now() where id = ${id} and user_id = ${userId}`;
}

export async function deleteTrade(sql: Sql, userId: string, id: string): Promise<void> {
  await sql`delete from trades where id = ${id} and user_id = ${userId}`;
}
