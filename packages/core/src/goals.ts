import type { MarketRow } from './types';
import { RECIPES, type Recipe } from './data/index';
import { bestUnitCost, itemIndex, nameKey, recipeIndex, type UnitCost } from './craft';

/** Позиция цели: что нужно и сколько уже есть. */
export interface GoalItem {
  name: string;
  need: number;
  have: number;
}

/** Цель («прокачать дом», «собрать на тачку») — список нужных материалов. */
export interface Goal {
  id: string;
  name: string;
  items: GoalItem[];
  createdAt: number;
  note?: string;
}

/** Откуда выгоднее взять недостающее. */
export type GoalSource = 'buy' | 'craft' | 'none';

export interface GoalItemResult extends GoalItem {
  /** Сколько ещё не хватает (не меньше нуля). */
  left: number;
  done: boolean;
  /** Прогресс по позиции, 0..1. */
  progress: number;
  /** Средняя цена рынка. */
  market: number | null;
  /** Дно рынка. */
  min: number | null;
  /** Себестоимость крафта за штуку (null — рецепта нет или неоценим). */
  craft: number | null;
  /** Лучшая цена за штуку: дешевле купить или скрафтить. */
  unit: number | null;
  via: GoalSource;
  /** Сколько стоит добрать остаток по лучшей цене. */
  lineCost: number | null;
  /** Если ловить дно рынка. */
  lineMin: number | null;
  /** Продаж в день — насколько реально быстро набрать. */
  perDay: number | null;
  /** Дней закупки при текущем спросе (остаток / продажи в день). */
  daysToBuy: number | null;
}

export interface GoalResult {
  goal: Goal;
  items: GoalItemResult[];
  /** Всего единиц нужно / уже есть. */
  totalNeed: number;
  totalHave: number;
  /** Прогресс по цели в целом (по стоимости, если она известна, иначе по штукам), 0..1. */
  progress: number;
  /** Сколько денег нужно, чтобы закрыть остаток по лучшей цене. */
  remainingCost: number;
  /** То же, если ловить дно рынка. */
  remainingMin: number;
  /** Полная стоимость цели (всё количество, не только остаток). */
  totalCost: number;
  /** Позиции, для которых нет ни цены, ни рецепта. */
  unpriced: number;
  done: boolean;
}

/**
 * Расчёт цели: чего и сколько не хватает, где брать дешевле и почём выйдет.
 * Себестоимость крафта — через ту же рекурсию, что в мастерской (bestUnitCost).
 */
export function computeGoal(goal: Goal, rows: MarketRow[], recipes: Recipe[] = RECIPES): GoalResult {
  const idx = itemIndex(rows);
  const byOut = recipeIndex(recipes);
  const memo: Record<string, UnitCost> = {};

  let totalNeed = 0;
  let totalHave = 0;
  let remainingCost = 0;
  let remainingMin = 0;
  let totalCost = 0;
  let unpriced = 0;
  let costKnown = 0;
  let costDone = 0;

  const items = goal.items.map((it): GoalItemResult => {
    const need = Math.max(0, it.need || 0);
    const have = Math.max(0, it.have || 0);
    const left = Math.max(0, need - have);
    const row = idx[nameKey(it.name)];
    const market = row?.avg ?? null;
    const min = row?.min ?? null;
    const perDay = row?.perDay ?? null;

    const uc = bestUnitCost(it.name, idx, byOut, memo, new Set());
    const craft = uc.craft;

    let unit: number | null;
    let via: GoalSource;
    if (market != null && craft != null) {
      unit = Math.min(market, craft);
      via = craft < market ? 'craft' : 'buy';
    } else if (market != null) {
      unit = market;
      via = 'buy';
    } else if (craft != null) {
      unit = craft;
      via = 'craft';
    } else {
      unit = null;
      via = 'none';
    }

    const lineCost = unit != null ? unit * left : null;
    const lineMin = min != null ? min * left : lineCost;

    totalNeed += need;
    totalHave += Math.min(have, need);
    if (unit == null) {
      if (left > 0) unpriced += 1;
    } else {
      remainingCost += lineCost ?? 0;
      remainingMin += lineMin ?? 0;
      totalCost += unit * need;
      costKnown += unit * need;
      costDone += unit * Math.min(have, need);
    }

    return {
      name: it.name,
      need,
      have,
      left,
      done: left === 0 && need > 0,
      progress: need > 0 ? Math.min(1, have / need) : 0,
      market,
      min,
      craft,
      unit,
      via,
      lineCost,
      lineMin,
      perDay,
      daysToBuy: perDay != null && perDay > 0 && left > 0 ? left / perDay : null,
    };
  });

  const progress =
    costKnown > 0 ? costDone / costKnown : totalNeed > 0 ? totalHave / totalNeed : 0;

  return {
    goal,
    items,
    totalNeed,
    totalHave,
    progress,
    remainingCost,
    remainingMin,
    totalCost,
    unpriced,
    done: totalNeed > 0 && items.every((i) => i.left === 0),
  };
}
