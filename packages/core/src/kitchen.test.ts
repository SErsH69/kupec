import { describe, expect, it } from 'vitest';
import { computeKitchen } from './kitchen';
import { KITCHEN_RECIPES, type KitchenRecipe } from './data/index';
import type { MarketRow } from './types';

const item = (id: number, name: string, avg: number | null, extra: Partial<MarketRow> = {}): MarketRow => ({
  id,
  name,
  total: null,
  sold: null,
  avg,
  min: null,
  max: null,
  ...extra,
});

const dishRecipe: KitchenRecipe = {
  id: 500,
  name: 'Soup',
  lvl: 1,
  kLvl: null,
  fac: false,
  ms: 3_600_000, // 1 час
  exp: 1,
  m: '',
  ing: [
    ['Water', 2, 'shop'],
    ['Salt', 1, 'shop'],
  ],
};

describe('computeKitchen', () => {
  it('блюдо по id, ингредиенты по имени', () => {
    const rows = [
      item(500, 'Soup', 100, { sold: 30 }),
      item(1, 'Water', 10),
      item(2, 'Salt', 5),
    ];
    const [r] = computeKitchen(rows, { out: 10, tax: 0 }, [dishRecipe]);
    expect(r!.ingCost).toBe(25); // 10*2 + 5*1
    expect(r!.revenue).toBe(1000); // 100 * 10
    expect(r!.profit).toBe(975);
    expect(r!.perHour).toBe(975); // 1 час
    expect(r!.perDay).toBe(1); // 30 / 30
    expect(r!.dishUnknown).toBe(false);
  });

  it('учитывает налог и неизвестные ингредиенты', () => {
    const rows = [item(500, 'Soup', 100), item(1, 'Water', 10)]; // нет Salt
    const [r] = computeKitchen(rows, { out: 10, tax: 10 }, [dishRecipe]);
    expect(r!.unknown).toEqual(['Salt']);
    expect(r!.ingCost).toBe(20); // только Water
    expect(r!.revenue).toBe(900); // 100*10*0.9
    expect(r!.profit).toBe(880);
  });

  it('нет цены блюда -> dishUnknown, revenue null', () => {
    const [r] = computeKitchen([item(1, 'Water', 10)], {}, [dishRecipe]);
    expect(r!.dishUnknown).toBe(true);
    expect(r!.revenue).toBeNull();
    expect(r!.profit).toBeNull();
  });

  it('реальные KITCHEN_RECIPES загружены и считаются', () => {
    expect(KITCHEN_RECIPES.length).toBe(69);
    expect(computeKitchen([])).toHaveLength(69);
  });
});
