import type { MarketRow } from './types';
import { PERIOD_DAYS } from './market';
import { KITCHEN_RECIPES, type KitchenRecipe } from './data/index';
import { nameKey } from './craft';

/** Настройки кухни (прототип: mjkitout=10, mjkittax=0). */
export interface KitchenOptions {
  /** Сколько порций на выходе (фиксировано пользователем). */
  out?: number;
  /** Комиссия маркета при продаже, %. */
  tax?: number;
}

const KITCHEN_DEFAULTS: Required<KitchenOptions> = { out: 10, tax: 0 };

/** Деталь по ингредиенту блюда. */
export interface KitchenIngredient {
  n: string;
  amt: number;
  src: string;
  price: number | null;
  line: number | null;
}

/** Результат расчёта одного блюда. */
export interface KitchenResult extends KitchenRecipe {
  dishPrice: number | null;
  dishMin: number | null;
  dishMax: number | null;
  dishSold: number | null;
  dishRate: number | null;
  ingCost: number;
  ingDetail: KitchenIngredient[];
  revenue: number | null;
  profit: number | null;
  perHour: number | null;
  perDay: number | null;
  hours: number;
  unknown: string[];
  dishUnknown: boolean;
  _path: 'items';
}

/**
 * Расчёт профита по блюдам кухни (computeKitchen, line 1127). Точный порт.
 * Ключевое отличие от мастерской: блюдо сопоставляется по **id** (byId),
 * ингредиенты — по **имени** (byName); шанс не учитывается (готовка успешна),
 * выход фиксирован `out`, себестоимость только рыночная (без самокрафта).
 */
export function computeKitchen(
  rows: MarketRow[],
  opts: KitchenOptions = {},
  recipes: KitchenRecipe[] = KITCHEN_RECIPES,
): KitchenResult[] {
  const o = { ...KITCHEN_DEFAULTS, ...opts };
  const byId: Record<string, MarketRow> = {};
  const byName: Record<string, MarketRow> = {};
  for (const r of rows) {
    if (r.id != null) byId[String(r.id)] = r;
    if (r.name) byName[nameKey(r.name)] = r;
  }

  return recipes.map((rc): KitchenResult => {
    const dish = byId[String(rc.id)];
    const dishPrice = dish ? dish.avg : null;
    const dishSold = dish ? dish.sold : null;
    const dishRate = dish ? (dish.sellRate ?? null) : null;
    const dishMin = dish ? dish.min : null;
    const dishMax = dish ? dish.max : null;

    let ingCost = 0;
    const unknown: string[] = [];
    const ingDetail = rc.ing.map(([n, amt, src]): KitchenIngredient => {
      const m = byName[nameKey(n)];
      const p = m ? m.avg : null;
      if (p == null) unknown.push(n);
      else ingCost += p * amt;
      return { n, amt, src, price: p, line: p != null ? p * amt : null };
    });

    const out = o.out;
    const revenue = dishPrice != null ? dishPrice * out * (1 - o.tax / 100) : null;
    const profit = revenue != null ? revenue - ingCost : null;
    const hours = rc.ms / 3600000;
    const perHour = profit != null ? profit / hours : null;
    const perDay = dishSold != null ? dishSold / PERIOD_DAYS : null;

    return {
      ...rc,
      dishPrice,
      dishMin,
      dishMax,
      dishSold,
      dishRate,
      ingCost,
      ingDetail,
      revenue,
      profit,
      perHour,
      perDay,
      hours,
      unknown,
      dishUnknown: dishPrice == null,
      _path: 'items',
    };
  });
}
