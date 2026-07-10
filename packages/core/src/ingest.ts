import type { MarketPath, MarketRow } from './types';
import { PATHS } from './types';
import { parseEnriched } from './market';

/** Суффикс *Statistics в ключе API → наш path (detectPath, line 1744). */
export const STAT2PATH: Record<string, MarketPath> = {
  item: 'items',
  vehicle: 'vehicles',
  house: 'houses',
  apartment: 'apartments',
  warehouse: 'warehouses',
  office: 'offices',
  clothes: 'clothes',
  clothing: 'clothes',
};

function body(json: unknown): Record<string, unknown> {
  const root = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  return (root.result && typeof root.result === 'object' ? root.result : root) as Record<
    string,
    unknown
  >;
}

/**
 * Определить раздел маркета по имени массива-статистики (detectPath, line 1746).
 */
export function detectPath(json: unknown): MarketPath | null {
  const d = body(json);
  for (const k in d) {
    if (Array.isArray(d[k])) {
      const base = k.replace(/Statistics$/i, '').toLowerCase();
      if (STAT2PATH[base]) return STAT2PATH[base];
    }
  }
  return null;
}

export interface IngestResult {
  /** Сервер из тела ответа (если удалось определить). */
  serverId: string | null;
  /** Разобранные строки по разделам. */
  paths: Partial<Record<MarketPath, MarketRow[]>>;
  /** Сколько разделов загружено. */
  sections: number;
}

/**
 * Разобрать импортированный JSON в строки по разделам (ingestText, line 1855).
 * Поддерживает два формата: объект с ключами-разделами `{items:{…}, vehicles:{…}}`
 * (как из закладки) либо одиночный ответ API (раздел определяется автоматически).
 * Каждой строке проставляется `_path`. Чистая функция (без IO).
 */
export function ingestMarketJson(json: unknown): IngestResult {
  const paths: Partial<Record<MarketPath, MarketRow[]>> = {};
  let serverId: string | null = null;
  let sections = 0;

  const store = (path: MarketPath, payload: unknown) => {
    const parsed = parseEnriched(payload);
    parsed.rows.forEach((r) => {
      r._path = path;
    });
    paths[path] = parsed.rows;
    if (!serverId && parsed.meta.serverId) serverId = String(parsed.meta.serverId);
    sections++;
  };

  const root = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  const hasSectionKeys = PATHS.some((p) => root[p]);

  if (hasSectionKeys) {
    for (const p of PATHS) {
      if (root[p]) store(p, root[p]);
    }
  } else {
    const p = detectPath(json);
    if (p) store(p, json);
  }

  return { serverId, paths, sections };
}
