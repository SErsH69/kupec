import { describe, expect, it } from 'vitest';
import { craftMetrics, journalSummary, tradePnl, type Trade } from './journal';

const trade = (o: Partial<Trade>): Trade => ({
  id: 'x',
  item: 'X',
  qty: 1,
  buy: 100,
  sell: null,
  createdAt: 0,
  ...o,
});

describe('tradePnl (flip)', () => {
  it('открытая позиция — revenue/pnl null', () => {
    const p = tradePnl(trade({ qty: 3, buy: 100 }));
    expect(p).toMatchObject({ cost: 300, revenue: null, pnl: null, roi: null, open: true });
  });
  it('закрытая — прибыль и ROI', () => {
    const p = tradePnl(trade({ qty: 3, buy: 100, sell: 150 }));
    expect(p).toMatchObject({ cost: 300, revenue: 450, pnl: 150, open: false });
    expect(p.roi).toBeCloseTo(50, 5);
  });
});

describe('craftMetrics', () => {
  it('полностью продано: profit = выручка − материалы', () => {
    // Обработанная древесина: материалы 133471, 7 шт, продано 7, выручка 203000
    const m = craftMetrics(
      trade({ kind: 'craft', qty: 7, materials: 133471, soldUnits: 7, soldRevenue: 203000 }),
    );
    expect(m.crafted).toBe(7);
    expect(m.costPerUnit).toBeCloseTo(133471 / 7, 3);
    expect(m.realized).toBeCloseTo(69529, 0);
    expect(m.open).toBe(false);
    expect(m.invested).toBe(0);
    expect(m.roi).toBeCloseTo((69529 / 133471) * 100, 1);
  });

  it('частично продано: реализовано по проданной части, остаток «в товаре»', () => {
    // 8 шт, материалы 160000 (20000/шт), продано 5 по 30000 (выручка 150000)
    const m = craftMetrics(
      trade({ kind: 'craft', qty: 8, materials: 160000, soldUnits: 5, soldRevenue: 150000 }),
    );
    expect(m.costPerUnit).toBe(20000);
    expect(m.realized).toBe(150000 - 20000 * 5); // 50000
    expect(m.unsold).toBe(3);
    expect(m.invested).toBe(60000); // 3 * 20000
    expect(m.open).toBe(true);
  });

  it('ничего не продано — открыта, реализовано 0', () => {
    const m = craftMetrics(trade({ kind: 'craft', qty: 5, materials: 100000, soldUnits: 0 }));
    expect(m.realized).toBe(0);
    expect(m.open).toBe(true);
    expect(m.invested).toBe(100000);
    expect(m.roi).toBeNull();
  });

  it('выручка из listPrice, если soldRevenue не задан', () => {
    const m = craftMetrics(trade({ kind: 'craft', qty: 4, materials: 40000, soldUnits: 2, listPrice: 15000 }));
    expect(m.soldRevenue).toBe(30000);
    expect(m.realized).toBe(30000 - 10000 * 2); // 10000
  });
});

describe('journalSummary (flip + craft)', () => {
  it('агрегирует оба вида', () => {
    const s = journalSummary([
      trade({ id: 'a', qty: 10, buy: 100 }), // flip открыт: invested 1000
      trade({ id: 'b', qty: 5, buy: 100, sell: 200 }), // flip закрыт: +500 (cost 500)
      trade({ id: 'c', kind: 'craft', qty: 7, materials: 700, soldUnits: 7, soldRevenue: 1400 }), // craft закрыт: +700 (cost 700)
      trade({ id: 'd', kind: 'craft', qty: 8, materials: 800, soldUnits: 4, soldRevenue: 600 }), // craft частично: realized 600-400=200, invested 400
    ]);
    expect(s.open).toBe(2); // a (flip) + d (craft частично)
    expect(s.closed).toBe(2); // b + c
    expect(s.invested).toBe(1400); // 1000 (a) + 400 (d unsold)
    expect(s.realized).toBe(1400); // 500 (b) + 700 (c) + 200 (d)
    // realizedCost = 500 (b) + 700 (c) + 400 (d sold) = 1600
    expect(s.roi).toBeCloseTo((1400 / 1600) * 100, 5);
    // d: непродано 4 шт, listPrice не задан → в продаже не учитывается
    expect(s.listedValue).toBe(0);
  });

  it('«сейчас в продаже» = непроданные × цена выставления', () => {
    const s = journalSummary([
      trade({ id: 'a', kind: 'craft', qty: 10, materials: 100000, soldUnits: 4, listPrice: 15000 }),
    ]);
    expect(s.listedUnits).toBe(6);
    expect(s.listedValue).toBe(90000); // 6 * 15000
  });

  it('пустой журнал', () => {
    expect(journalSummary([])).toEqual({
      open: 0,
      closed: 0,
      invested: 0,
      realized: 0,
      roi: 0,
      listedValue: 0,
      listedUnits: 0,
    });
  });
});
