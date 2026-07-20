import { describe, expect, it } from 'vitest';
import { computeGoal, type Goal } from './goals';
import type { MarketRow } from './types';
import type { Recipe } from './data/index';

const row = (name: string, avg: number | null, min: number | null = null, perDay = 0): MarketRow => ({
  id: name,
  name,
  total: null,
  sold: null,
  avg,
  min,
  max: null,
  _path: 'items',
  sellRate: null,
  turnover: null,
  spreadPct: null,
  perDay,
});

const goal = (items: Goal['items']): Goal => ({ id: 'g', name: 'Дом', items, createdAt: 0 });

describe('computeGoal', () => {
  it('считает остаток и его стоимость по рынку', () => {
    const rows = [row('Доска', 100)];
    const r = computeGoal(goal([{ name: 'Доска', need: 10, have: 4 }]), rows, []);
    const it = r.items[0]!;
    expect(it.left).toBe(6);
    expect(it.via).toBe('buy');
    expect(it.lineCost).toBe(600);
    expect(r.remainingCost).toBe(600);
    expect(r.totalCost).toBe(1000);
  });

  it('берёт крафт, если он дешевле рынка', () => {
    // Доска: рынок 100, крафт из 2 брёвен по 10 + 0 денег → 20 за 1 шт (выход 1).
    const rows = [row('Доска', 100), row('Бревно', 10)];
    const recipes: Recipe[] = [
      { out: 'Доска', ing: [['Бревно', 2]], money: 0, qmin: 1, qmax: 1, lvl: 1, ch: [100, 100], time: 1 } as Recipe,
    ];
    const r = computeGoal(goal([{ name: 'Доска', need: 5, have: 0 }]), rows, recipes);
    const it = r.items[0]!;
    expect(it.craft).toBe(20);
    expect(it.via).toBe('craft');
    expect(it.unit).toBe(20);
    expect(r.remainingCost).toBe(100);
  });

  it('считает дно рынка отдельно от средней', () => {
    const rows = [row('Доска', 100, 60)];
    const r = computeGoal(goal([{ name: 'Доска', need: 10, have: 0 }]), rows, []);
    expect(r.remainingCost).toBe(1000);
    expect(r.remainingMin).toBe(600);
  });

  it('помечает позиции без цены и рецепта', () => {
    const r = computeGoal(goal([{ name: 'Неведомое', need: 3, have: 0 }]), [], []);
    expect(r.items[0]!.via).toBe('none');
    expect(r.items[0]!.unit).toBeNull();
    expect(r.unpriced).toBe(1);
    expect(r.remainingCost).toBe(0);
  });

  it('прогресс взвешен по стоимости, а не по штукам', () => {
    // 1 дорогая позиция закрыта, 1 дешёвая нет → по штукам 50%, по деньгам почти 100%.
    const rows = [row('Дорогое', 1000), row('Дешёвое', 1)];
    const r = computeGoal(
      goal([
        { name: 'Дорогое', need: 1, have: 1 },
        { name: 'Дешёвое', need: 1, have: 0 },
      ]),
      rows,
      [],
    );
    expect(r.progress).toBeCloseTo(1000 / 1001, 5);
    expect(r.done).toBe(false);
  });

  it('цель закрыта, когда всё набрано (излишки не ломают счёт)', () => {
    const rows = [row('Доска', 100)];
    const r = computeGoal(goal([{ name: 'Доска', need: 5, have: 9 }]), rows, []);
    expect(r.done).toBe(true);
    expect(r.remainingCost).toBe(0);
    expect(r.totalHave).toBe(5);
    expect(r.progress).toBe(1);
  });

  it('оценивает срок закупки по спросу', () => {
    const rows = [row('Доска', 100, null, 4)];
    const r = computeGoal(goal([{ name: 'Доска', need: 10, have: 0 }]), rows, []);
    expect(r.items[0]!.daysToBuy).toBe(2.5);
  });
});
