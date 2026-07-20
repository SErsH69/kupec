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
    from trades where user_id = ${userId} order by created_at desc
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
