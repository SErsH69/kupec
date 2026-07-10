import type { MarketRow } from './types';

/** Один снимок цен: дата (YYYY-MM-DD) и карта `path:id → цена`. */
export interface Snapshot {
  d: string;
  p: Record<string, number>;
}

/** Максимум хранимых снимков на сервер (прототип: while(arr.length>30)). */
export const MAX_SNAPSHOTS = 30;

/**
 * Карта цен из строк рынка для снимка (recordSnapshot, line 1773).
 * Ключ — `${_path}:${id}`, значение — round(avg). Берутся только `avg>0 && id!=null`.
 */
export function snapshotPrices(rows: MarketRow[]): Record<string, number> {
  const p: Record<string, number> = {};
  for (const r of rows) {
    if (r.avg != null && r.avg > 0 && r.id != null) {
      p[(r._path || '') + ':' + r.id] = Math.round(r.avg);
    }
  }
  return p;
}

/**
 * Добавить снимок в историю (иммутабельно). Точный порт логики recordSnapshot:
 * снимок за тот же день перезаписывается, история обрезается до MAX_SNAPSHOTS.
 * Пустой снимок (нет цен) не добавляется — возвращается исходная история.
 */
export function recordSnapshot(
  history: readonly Snapshot[],
  prices: Record<string, number>,
  day: string,
  maxLen: number = MAX_SNAPSHOTS,
): Snapshot[] {
  if (Object.keys(prices).length === 0) return history.slice();
  const arr = history.slice();
  const last = arr[arr.length - 1];
  if (last && last.d === day) arr[arr.length - 1] = { d: day, p: prices };
  else arr.push({ d: day, p: prices });
  while (arr.length > maxLen) arr.shift();
  return arr;
}

/**
 * % изменения цены между двумя последними снимками (trendMap, line 1787).
 * Нужно ≥2 снимка; ключи, где прошлая цена null или 0, пропускаются.
 */
export function trendMap(history: readonly Snapshot[]): Record<string, number> {
  const m: Record<string, number> = {};
  if (history.length < 2) return m;
  const cur = history[history.length - 1]!.p;
  const prev = history[history.length - 2]!.p;
  for (const k in cur) {
    const pv = prev[k];
    if (pv != null && pv !== 0) m[k] = ((cur[k]! - pv) / pv) * 100;
  }
  return m;
}

/** Тренд для конкретной строки по её `_path:id` (trendFor, line 1794). */
export function trendFor(
  trends: Record<string, number>,
  row: Pick<MarketRow, 'id' | '_path'>,
): number | null {
  if (!row || row.id == null) return null;
  const v = trends[(row._path || '') + ':' + row.id];
  return v == null ? null : v;
}

/** Строка «движения» для вкладки movers. */
export interface Mover {
  key: string;
  pct: number;
  cur: number;
  prev: number;
}

/**
 * Разбивка движений на подорожавшие/подешевевшие (renderMovers, line 1413).
 * Отсекает |pct| < minMove и случаи cur<=0 || prev<=0. Возвращает по топ-`limit`.
 */
export function computeMovers(
  history: readonly Snapshot[],
  minMove = 3,
  limit = 40,
): { up: Mover[]; down: Mover[] } {
  if (history.length < 2) return { up: [], down: [] };
  const cur = history[history.length - 1]!.p;
  const prev = history[history.length - 2]!.p;
  const trends = trendMap(history);

  const movers: Mover[] = [];
  for (const key in trends) {
    const pct = trends[key]!;
    const c = cur[key]!;
    const p = prev[key]!;
    if (Math.abs(pct) < minMove || c <= 0 || p <= 0) continue;
    movers.push({ key, pct, cur: c, prev: p });
  }

  const up = movers
    .filter((m) => m.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, limit);
  const down = movers
    .filter((m) => m.pct < 0)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, limit);
  return { up, down };
}
