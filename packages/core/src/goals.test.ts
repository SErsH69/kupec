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
      { out: 'Доска', ing: [['Бревно', 2]], money: 0, qmin: 1, qmax: 1, lvl: 1, ch: [100, 100], sec: 60 },
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

describe('взносы за улучшения', () => {
  it('считаются отдельно от материалов и попадают в общий остаток', () => {
    const rows = [row('Доска', 100)];
    const g: Goal = {
      id: 'g',
      name: 'Дом',
      createdAt: 0,
      items: [{ name: 'Доска', need: 10, have: 4, section: 'Мастерская · ур. 1' }],
      fees: [{ section: 'Мастерская · ур. 1', money: 150_000, hours: 6 }],
    };
    const r = computeGoal(g, rows, []);
    expect(r.remainingCost).toBe(600); // только материалы
    expect(r.feesTotal).toBe(150_000);
    expect(r.feeHours).toBe(6);
    expect(r.remainingWithFees).toBe(150_600);
    expect(r.feeBySection['Мастерская · ур. 1']!.money).toBe(150_000);
  });

  it('без взносов ведёт себя как раньше', () => {
    const r = computeGoal(goal([{ name: 'Доска', need: 1, have: 0 }]), [row('Доска', 100)], []);
    expect(r.feesTotal).toBe(0);
    expect(r.remainingWithFees).toBe(r.remainingCost);
  });
});

describe('оплаченные взносы', () => {
  it('не считаются в остатке, но видны в разбивке', () => {
    const rows = [row('Доска', 100)];
    const g: Goal = {
      id: 'g',
      name: 'Дом',
      createdAt: 0,
      items: [{ name: 'Доска', need: 10, have: 0, section: 'Мастерская · ур. 1' }],
      fees: [
        { section: 'Мастерская · ур. 1', money: 150_000, hours: 6, paid: true },
        { section: 'Мастерская · ур. 2', money: 450_000, hours: 12 },
      ],
    };
    const r = computeGoal(g, rows, []);
    expect(r.feesTotal).toBe(450_000); // оплаченный ур.1 исключён
    expect(r.feeHours).toBe(12);
    expect(r.remainingWithFees).toBe(1000 + 450_000);
    expect(r.feeBySection['Мастерская · ур. 1']!.paid).toBe(true);
  });
});
