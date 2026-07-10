import { describe, expect, it } from 'vitest';
import { bestUnitCost, computeRecipes, itemIndex, recipeIndex } from './craft';
import { RECIPES, type Recipe } from './data/index';
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

const recipe = (o: Partial<Recipe> & Pick<Recipe, 'out' | 'ing'>): Recipe => ({
  lvl: 1,
  qmin: 1,
  qmax: 1,
  money: 0,
  sec: 3600,
  ch: [100, 100],
  ...o,
});

describe('computeRecipes', () => {
  it('считает cost/revenue/profit со средним шансом', () => {
    const recipes = [recipe({ out: 'Widget', money: 100, ch: [50, 100], ing: [['Bolt', 2]] })];
    const rows = [item(1, 'Bolt', 50), item(2, 'Widget', 1000)];
    const [r] = computeRecipes(rows, { useChance: true }, recipes);
    expect(r!.ingCost).toBe(100); // 50 * 2
    expect(r!.cost).toBe(200); // ingCost + money
    // succ = (50+100)/2/100 = 0.75 -> revenue = 1000*1*0.75 = 750
    expect(r!.revenue).toBe(750);
    expect(r!.profit).toBe(550);
    expect(r!.roi).toBeCloseTo(275, 5);
    expect(r!.perHour).toBe(550); // sec=3600 -> 1ч
  });

  it('шанс отключается опцией useChance=false', () => {
    const recipes = [recipe({ out: 'Widget', money: 100, ch: [50, 100], ing: [['Bolt', 2]] })];
    const rows = [item(1, 'Bolt', 50), item(2, 'Widget', 1000)];
    const [r] = computeRecipes(rows, { useChance: false }, recipes);
    expect(r!.revenue).toBe(1000);
    expect(r!.profit).toBe(800);
  });

  it('bottleneck переключается со «время» на «спрос»', () => {
    const recipes = [recipe({ out: 'Widget', sec: 3600, ing: [['Bolt', 1]] })];
    const rows = [item(1, 'Bolt', 10), item(2, 'Widget', 100, { sold: 3 })];
    // maxCraftsTime = 20*3600/3600 = 20; cfd = sold/outQty = 3 -> спрос
    const [r] = computeRecipes(rows, { hours: 20 }, recipes);
    expect(r!.bottleneck).toBe('спрос');
    expect(r!.weekly).toBeCloseTo(r!.profit! * 3, 5);
  });

  it('неизвестный ингредиент попадает в unknownIng', () => {
    const recipes = [recipe({ out: 'Widget', ing: [['Ghost', 1]] })];
    const [r] = computeRecipes([item(2, 'Widget', 100)], { selfCraft: false }, recipes);
    expect(r!.unknownIng).toContain('Ghost');
    expect(r!.ingCost).toBe(0);
  });
});

describe('bestUnitCost', () => {
  const build = (recipes: Recipe[], rows: MarketRow[]) => ({
    idx: itemIndex(rows),
    rbo: recipeIndex(recipes),
  });

  it('рекурсивно считает себестоимость под-крафтов', () => {
    const recipes = [
      recipe({ out: 'A', ing: [['B', 2]] }),
      recipe({ out: 'B', qmin: 2, qmax: 2, ing: [['Raw', 3]] }),
    ];
    const { idx, rbo } = build(recipes, [item(1, 'Raw', 10)]);
    // B: (10*3)/2 = 15 ; A: (15*2)/1 = 30
    expect(bestUnitCost('B', idx, rbo, {}, new Set()).craft).toBe(15);
    expect(bestUnitCost('A', idx, rbo, {}, new Set()).craft).toBe(30);
  });

  it('берёт минимум из рынка и крафта', () => {
    const recipes = [recipe({ out: 'A', money: 0, ing: [['Raw', 1]] })];
    // рынок A = 5, крафт A = 100 (Raw=100) -> cost = 5
    const { idx, rbo } = build(recipes, [item(1, 'Raw', 100), item(2, 'A', 5)]);
    const res = bestUnitCost('A', idx, rbo, {}, new Set());
    expect(res.market).toBe(5);
    expect(res.craft).toBe(100);
    expect(res.cost).toBe(5);
  });

  it('защита от циклических рецептов (не зависает, cost=null)', () => {
    const recipes = [recipe({ out: 'X', ing: [['Y', 1]] }), recipe({ out: 'Y', ing: [['X', 1]] })];
    const { idx, rbo } = build(recipes, []);
    const res = bestUnitCost('X', idx, rbo, {}, new Set());
    expect(res.cost).toBeNull();
    expect(res.craft).toBeNull();
  });
});

describe('реальные RECIPES', () => {
  it('загружены и считаются без ошибок', () => {
    expect(RECIPES.length).toBe(40);
    const out = computeRecipes([], {});
    expect(out).toHaveLength(40);
    // без данных рынка выручка неизвестна
    expect(out.every((r) => r.outUnknown)).toBe(true);
  });
});
