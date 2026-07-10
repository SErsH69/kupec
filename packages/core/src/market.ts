import type { MarketMeta, MarketRow, ParsedMarket } from './types';

/** Период статистики API (periodDays=30). */
export const PERIOD_DAYS = 30;

type Raw = Record<string, unknown>;

/**
 * Первое из `keys` числовое поле объекта, иначе null.
 * Точный порт `num(o, ...keys)` (line 402): проверка `!= null && !isNaN`.
 */
export function num(o: Raw, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = o[k];
    if (v != null && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

function isRecord(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null;
}

/**
 * Адаптивный парсер ответа Majestic API в строки рынка.
 * Точный порт `parse(json)` (line 374): снимает обёртку `{result}`, находит
 * первый массив-статистику, эвристически вытаскивает id/name/цены.
 */
export function parse(json: unknown): ParsedMarket {
  const root = isRecord(json) ? json : {};
  const d: Raw = isRecord(root.result) ? (root.result as Raw) : root;

  const meta: MarketMeta = {
    serverName: d.serverName as string | undefined,
    serverId: d.serverId as string | undefined,
    lastUpdated: d.lastUpdated as string | number | undefined,
    periodDays: d.periodDays as number | undefined,
  };

  let arr: unknown[] | null = null;
  for (const k in d) {
    if (Array.isArray(d[k])) {
      arr = d[k] as unknown[];
      break;
    }
  }
  const list = arr ?? [];

  const rows: MarketRow[] = list.map((raw): MarketRow => {
    const o = isRecord(raw) ? raw : {};
    const keys = Object.keys(o);
    const idKey = keys.find((k) => /id$/i.test(k) && k !== 'serverId');
    const nameKey = keys.find((k) => /name$/i.test(k) && k !== 'serverName');

    const total = num(o, 'totalCount', 'count', 'listed', 'total');
    const sold = num(o, 'soldCount', 'sold', 'salesCount');
    const avg = num(o, 'averagePrice', 'avgPrice', 'avg', 'price');
    const min = num(o, 'minPrice', 'min');
    const max = num(o, 'maxPrice', 'max');

    let id: string | number = (idKey ? o[idKey] : (o.model ?? o.id)) as string | number;
    if (id == null) {
      if ('drawable' in o) {
        id = 'c_' + [o.component, o.drawable, o.texture, o.gender].join('_');
      } else {
        id = (nameKey ? (o[nameKey] as string) : JSON.stringify(o)) as string;
      }
    }
    const name = ((nameKey ? o[nameKey] : null) ?? '#' + id) as string;

    return { id, name, total, sold, avg, min, max };
  });

  return { meta, rows };
}

/**
 * Производные метрики строки (мутирует и возвращает её же).
 * Точный порт `enrich(r)` (line 405).
 */
export function enrich(r: MarketRow): MarketRow {
  r.sellRate = r.total != null && r.total > 0 ? (r.sold! / r.total) * 100 : null;
  r.turnover = r.sold != null && r.avg != null ? r.sold * r.avg : null;
  r.spreadPct = r.min != null && r.min > 0 && r.max != null ? ((r.max - r.min) / r.min) * 100 : null;
  r.perDay = r.sold != null ? r.sold / PERIOD_DAYS : null;
  return r;
}

/** Распарсить и обогатить за один проход. */
export function parseEnriched(json: unknown): ParsedMarket {
  const parsed = parse(json);
  parsed.rows.forEach(enrich);
  return parsed;
}
