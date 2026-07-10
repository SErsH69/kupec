/**
 * Доменные типы рыночных данных. Форма соответствует прототипу
 * (parse/enrich, majestic_market_dashboard.html:374–410).
 */

/** Endpoint'ы маркета Majestic API. */
export const PATHS = [
  'items',
  'vehicles',
  'houses',
  'apartments',
  'warehouses',
  'offices',
  'clothes',
] as const;

export type MarketPath = (typeof PATHS)[number];

/** Метаданные ответа API одного раздела. */
export interface MarketMeta {
  serverName?: string;
  serverId?: string;
  lastUpdated?: string | number;
  periodDays?: number;
}

/**
 * Нормализованная строка рынка. Базовые поля (id..max) — из `parse`;
 * производные (sellRate..perDay) — из `enrich`; поля `_*` навешивают
 * вызывающие (контекст категории/тренда).
 */
export interface MarketRow {
  id: string | number;
  name: string;
  /** Выставлено лотов. */
  total: number | null;
  /** Продано за период. */
  sold: number | null;
  /** Средняя цена. */
  avg: number | null;
  /** Минимальная цена лота. */
  min: number | null;
  /** Максимальная цена лота. */
  max: number | null;

  // --- производные (enrich) ---
  /** % проданного от выставленного. */
  sellRate?: number | null;
  /** Оборот в деньгах = sold*avg. */
  turnover?: number | null;
  /** Разброс цен (max-min)/min*100. */
  spreadPct?: number | null;
  /** Продаж в день = sold/PERIOD_DAYS. */
  perDay?: number | null;

  // --- контекст (навешивается UI/агрегаторами) ---
  _path?: string;
  _cat?: string;
  _tag?: string;
  _trend?: number | null;
}

/** Результат парсинга одного раздела. */
export interface ParsedMarket {
  meta: MarketMeta;
  rows: MarketRow[];
}

/** Снимок рынка одного сервера (для истории/движений). */
export interface MarketSnapshot {
  serverId: string;
  /** Unix-время снимка, мс. */
  takenAt: number;
  rows: MarketRow[];
}

/** Рекомендация по цене продажи (sellAdvice). */
export interface SellAdvice {
  /** Продать быстрее (ниже средней). */
  fast: number;
  /** Справедливая цена (≈ средняя). */
  fair: number;
  /** Потолок рынка. */
  top: number;
}
