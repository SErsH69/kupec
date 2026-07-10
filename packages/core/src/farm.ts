import type { MarketRow } from './types';
import { CLASSIFIERS, type Classifiers } from './data/index';

/** Категория сырья для фарма. */
export type FarmCategory = 'Руда' | 'Дерево' | 'Мясо/охота' | 'Рыба' | 'Урожай';

/**
 * Классификатор сырья по названию (farmType, line 1055). Точный порт.
 * Возвращает категорию фарма или null (не сырьё).
 */
export function farmType(
  name: unknown,
  classifiers: Classifiers = CLASSIFIERS,
): FarmCategory | null {
  const n = String(name).toLowerCase().trim();
  if (/руда/.test(n)) return 'Руда';
  if (/бревно/.test(n)) return 'Дерево';
  if (/мясо/.test(n)) return 'Мясо/охота';
  if (classifiers.fish.includes(n) || /рыб/.test(n)) return 'Рыба';
  if (classifiers.crops.includes(n)) return 'Урожай';
  return null;
}

/** Строка фарма — сырьё рынка с проставленной категорией. */
export interface FarmRow extends MarketRow {
  farmCat: FarmCategory;
}

/**
 * Отобрать сырьё для фарма (renderFarm, line 1065): только строки, где
 * `farmType != null && avg > 0`, с сортировкой по обороту (turnover) по убыванию.
 */
export function computeFarm(
  rows: MarketRow[],
  classifiers: Classifiers = CLASSIFIERS,
): FarmRow[] {
  return rows
    .map((r) => {
      const cat = farmType(r.name, classifiers);
      return cat && r.avg != null && r.avg > 0 ? { ...r, farmCat: cat } : null;
    })
    .filter((r): r is FarmRow => r !== null)
    .sort((a, b) => (b.turnover ?? 0) - (a.turnover ?? 0));
}
