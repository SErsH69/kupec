import type { MarketRow } from './types';
import { PERIOD_DAYS } from './market';
import { RECIPES, type Recipe } from './data/index';

/** Настройки мастерской (прототип: mjwshours=20, mjwstax=0, mjwsbudget=0). */
export interface CraftOptions {
  /** Учитывать шанс успеха крафта. */
  useChance?: boolean;
  /** Крафтить промежуточные ингредиенты самому (рекурсия себестоимости). */
  selfCraft?: boolean;
  /** Часов крафта в неделю. */
  hours?: number;
  /** Комиссия маркета при продаже, %. */
  tax?: number;
  /** Бюджет на закупку ингредиентов. */
  budget?: number;
}

const CRAFT_DEFAULTS: Required<CraftOptions> = {
  useChance: true,
  selfCraft: true,
  hours: 20,
  tax: 0,
  budget: 0,
};

/** Ключ индекса: имя в нижнем регистре без крайних пробелов. */
export function nameKey(name: unknown): string {
  return String(name).toLowerCase().trim();
}

/** Индекс предметов рынка по имени (itemIndex, line 759). */
export function itemIndex(rows: MarketRow[]): Record<string, MarketRow> {
  const m: Record<string, MarketRow> = {};
  for (const r of rows) {
    if (r.name) m[nameKey(r.name)] = r;
  }
  return m;
}

/** Индекс рецептов по выходному предмету (recipeByOut, line 750). */
export function recipeIndex(recipes: Recipe[]): Record<string, Recipe> {
  const m: Record<string, Recipe> = {};
  for (const r of recipes) m[nameKey(r.out)] = r;
  return m;
}

export interface UnitCost {
  cost: number | null;
  market: number | null;
  craft: number | null;
}

/**
 * Рекурсивная себестоимость единицы: дешевле купить или скрафтить (с под-крафтами).
 * Точный порт bestUnitCost (line 765). `stack` (Set) рвёт циклические рецепты,
 * `memo` кэширует по имени. Если хоть один ингредиент неоценим — craft = null.
 */
export function bestUnitCost(
  name: string,
  idx: Record<string, MarketRow>,
  recipeByOut: Record<string, Recipe>,
  memo: Record<string, UnitCost>,
  stack: Set<string>,
): UnitCost {
  const key = nameKey(name);
  const cached = memo[key];
  if (cached) return cached;

  const it = idx[key];
  const market = it && it.avg != null ? it.avg : null;
  let craft: number | null = null;

  const rc = recipeByOut[key];
  if (rc && !stack.has(key)) {
    stack.add(key);
    let sum = 0;
    let ok = true;
    for (const [n, q] of rc.ing) {
      const c = bestUnitCost(n, idx, recipeByOut, memo, stack);
      if (c.cost == null) {
        ok = false;
        break;
      }
      sum += c.cost * q;
    }
    stack.delete(key);
    if (ok) {
      const outQty = (rc.qmin + rc.qmax) / 2;
      craft = (sum + rc.money) / outQty;
    }
  }

  let cost: number | null;
  if (market != null && craft != null) cost = Math.min(market, craft);
  else cost = market != null ? market : craft;

  const res: UnitCost = { cost, market, craft };
  memo[key] = res;
  return res;
}

/** Деталь по ингредиенту рецепта. */
export interface IngredientDetail {
  n: string;
  q: number;
  avg: number | null;
  self: number | null;
  unit: number | null;
  via: 'craft' | 'market' | 'none';
  line: number | null;
  min: number | null;
  cheap: boolean;
}

/** Результат расчёта одного рецепта. */
export interface CraftResult extends Recipe {
  chBase: number;
  ingCost: number;
  ingDetail: IngredientDetail[];
  outAvg: number | null;
  outMin: number | null;
  outMax: number | null;
  outSold: number | null;
  outPerDay: number | null;
  outRate: number | null;
  outQty: number;
  revenue: number | null;
  cost: number;
  profit: number | null;
  roi: number | null;
  perHour: number | null;
  weekly: number | null;
  daily: number | null;
  bottleneck: 'время' | 'спрос';
  budgetCrafts: number;
  budgetProfit: number | null;
  unknownIng: string[];
  outUnknown: boolean;
}

/**
 * Расчёт профита по всем рецептам (computeRecipes, line 786). Точный порт.
 * ВАЖНО: шанс успеха берётся СРЕДНИЙ `(ch[0]+ch[1])/2`, а не максимум — иначе у
 * рецептов с макс. 100% галка «шанс» не влияла бы (см. комментарий в прототипе).
 */
export function computeRecipes(
  rows: MarketRow[],
  opts: CraftOptions = {},
  recipes: Recipe[] = RECIPES,
): CraftResult[] {
  const o = { ...CRAFT_DEFAULTS, ...opts };
  const idx = itemIndex(rows);
  const recipeByOut = recipeIndex(recipes);
  const get = (n: unknown) => idx[nameKey(n)];
  const memo: Record<string, UnitCost> = {};

  return recipes.map((rc): CraftResult => {
    let ingCost = 0;
    const unknownIng: string[] = [];
    const ingDetail = rc.ing.map(([n, q]): IngredientDetail => {
      const it = get(n);
      const market = it && it.avg != null ? it.avg : null;
      const self = o.selfCraft
        ? bestUnitCost(n, idx, recipeByOut, memo, new Set()).craft
        : null;
      let unit: number | null;
      let via: IngredientDetail['via'];
      if (o.selfCraft && self != null && (market == null || self < market)) {
        unit = self;
        via = 'craft';
      } else if (market != null) {
        unit = market;
        via = 'market';
      } else {
        unit = null;
        via = 'none';
      }
      if (unit == null) {
        unknownIng.push(n);
        return { n, q, avg: market, self, unit: null, via, line: null, min: it ? it.min : null, cheap: false };
      }
      const line = unit * q;
      ingCost += line;
      const cheap = !!(it && it.min != null && it.avg != null && it.avg > 0 && it.min <= it.avg * 0.5);
      return { n, q, avg: market, self, unit, via, line, min: it ? it.min : null, cheap };
    });

    const outIt = get(rc.out);
    const outAvg = outIt ? outIt.avg : null;
    const outSold = outIt ? outIt.sold : null;
    const outRate = outIt ? (outIt.sellRate ?? null) : null;
    const outMin = outIt ? outIt.min : null;
    const outMax = outIt ? outIt.max : null;
    const outQty = (rc.qmin + rc.qmax) / 2;
    const succ = o.useChance ? (rc.ch[0] + rc.ch[1]) / 2 / 100 : 1;
    const revenue = outAvg != null ? outAvg * outQty * succ * (1 - o.tax / 100) : null;
    const cost = ingCost + rc.money;
    const profit = revenue != null ? revenue - cost : null;
    const roi = profit != null && cost > 0 ? (profit / cost) * 100 : null;
    const perHour = profit != null ? profit / (rc.sec / 3600) : null;
    const maxCraftsTime = (o.hours * 3600) / rc.sec;
    let effCrafts = maxCraftsTime;
    let bottleneck: CraftResult['bottleneck'] = 'время';
    if (outSold != null) {
      const cfd = outSold / outQty;
      if (cfd < maxCraftsTime) {
        effCrafts = cfd;
        bottleneck = 'спрос';
      }
    }
    const weekly = profit != null ? profit * effCrafts : null;
    const daily = weekly != null ? weekly / 7 : null;
    const outPerDay = outSold != null ? outSold / PERIOD_DAYS : null;
    const maxByBudget = o.budget > 0 && cost > 0 ? Math.floor(o.budget / cost) : Infinity;
    const budgetCrafts = Math.min(effCrafts, maxByBudget);
    const budgetProfit = profit != null && o.budget > 0 ? profit * budgetCrafts : null;

    return {
      ...rc,
      chBase: rc.ch[0],
      ingCost,
      ingDetail,
      outAvg,
      outMin,
      outMax,
      outSold,
      outPerDay,
      outRate,
      outQty,
      revenue,
      cost,
      profit,
      roi,
      perHour,
      weekly,
      daily,
      bottleneck,
      budgetCrafts,
      budgetProfit,
      unknownIng,
      outUnknown: outAvg == null,
    };
  });
}
