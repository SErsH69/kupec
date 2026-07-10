import type { MarketRow } from './types';
import { PERIOD_DAYS } from './market';

/** Значения по умолчанию (прототип: mjflipdem=5, mjfliptax=0, mjbudgetv=1000000). */
export const FLIP_DEFAULTS = { minDemand: 5, tax: 0 } as const;
export const DEFAULT_BUDGET = 1_000_000;

export interface FlipOptions {
  /** Мин. продаж за период, чтобы товар считался ликвидным. */
  minDemand?: number;
  /** Комиссия маркета при продаже, %. */
  tax?: number;
}

/** Строка перекупа с расчётом навара. */
export interface FlipRow extends MarketRow {
  perDay: number;
  /** Цена продажи (= средняя). */
  sell: number;
  /** «Бери ≤» — дно, но не глубже −40% от средней. */
  deal: number;
  /** Джекпот — абсолютное дно (min). */
  jack: number;
  profit: number;
  margin: number;
  /** Разброс (avg-min)/avg*100. */
  vol: number;
  roi: number;
  /** Рейтинг = ликвидность × навар. */
  score: number;
}

/**
 * Рейтинг перекупа: ликвидность × реальный навар (flipScore, line 969).
 * Что часто покупают И выгодно перепродать — наверх.
 */
export function flipScore(r: { perDay?: number | null; profit?: number | null }): number {
  return (r.perDay || 0) * Math.max(0, r.profit || 0);
}

/**
 * Сканер перекупки (computeFlip, line 974). Точный порт.
 * На вход — строки рынка (с проставленным _path/_cat при необходимости).
 * Отбирает ликвидные лоты с потенциалом навара и считает целевые цены.
 */
export function computeFlip(rows: MarketRow[], opts: FlipOptions = {}): FlipRow[] {
  const dem = opts.minDemand ?? FLIP_DEFAULTS.minDemand;
  const tax = opts.tax ?? FLIP_DEFAULTS.tax;

  return rows
    .filter(
      (r) =>
        r.min != null &&
        r.avg != null &&
        r.avg > r.min &&
        r.min >= Math.max(100, r.avg * 0.05) &&
        (r.sold || 0) >= dem,
    )
    .map((r): FlipRow => {
      const avg = r.avg!;
      const min = r.min!;
      const perDay = r.perDay != null ? r.perDay : (r.sold || 0) / PERIOD_DAYS;
      const sell = avg;
      const deal = Math.round(Math.max(min, avg * 0.6));
      const jack = Math.round(min);
      const profit = Math.round(sell * (1 - tax / 100) - deal);
      const margin = sell > 0 ? (profit / sell) * 100 : 0;
      const vol = ((avg - min) / avg) * 100;
      const roi = deal > 0 ? (profit / deal) * 100 : 0;
      const out: FlipRow = { ...r, perDay, sell, deal, jack, profit, margin, vol, roi, score: 0 };
      out.score = flipScore(out);
      return out;
    })
    .filter((r) => r.profit > 0);
}

/** Позиция бюджет-плана. */
export interface BudgetLine extends FlipRow {
  units: number;
  cost: number;
  prof: number;
}

export interface BudgetPlan {
  plan: BudgetLine[];
  invested: number;
  left: number;
  expProfit: number;
  roiTot: number;
}

/**
 * Жадный планировщик перекупа по бюджету (renderBudget, line 1373).
 * Сортирует кандидатов по ROI, набирает, ограничивая объём ~3 днями спроса,
 * останавливается когда остаток < 1000.
 */
export function planBudget(candidates: FlipRow[], budget: number): BudgetPlan {
  const cands = candidates
    .filter((r) => r.deal > 0 && r.profit > 0)
    .sort((a, b) => b.roi - a.roi);

  let left = budget;
  let invested = 0;
  let expProfit = 0;
  const plan: BudgetLine[] = [];

  for (const r of cands) {
    if (left < r.deal) continue;
    const demCap = Math.max(1, Math.round(r.perDay * 3));
    const afford = Math.floor(left / r.deal);
    const units = Math.min(afford, demCap);
    if (units < 1) continue;
    const cost = units * r.deal;
    const prof = units * r.profit;
    plan.push({ ...r, units, cost, prof });
    left -= cost;
    invested += cost;
    expProfit += prof;
    if (left < 1000) break;
  }

  plan.sort((a, b) => b.prof - a.prof);
  const roiTot = invested > 0 ? (expProfit / invested) * 100 : 0;
  return { plan, invested, left, expProfit, roiTot };
}
