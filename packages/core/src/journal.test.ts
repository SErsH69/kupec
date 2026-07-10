import { describe, expect, it } from 'vitest';
import { journalSummary, tradePnl, type Trade } from './journal';

const trade = (o: Partial<Trade>): Trade => ({
  id: 'x',
  item: 'X',
  qty: 1,
  buy: 100,
  sell: null,
  createdAt: 0,
  ...o,
});

describe('tradePnl', () => {
  it('открытая позиция — revenue/pnl null', () => {
    const p = tradePnl(trade({ qty: 3, buy: 100 }));
    expect(p).toMatchObject({ cost: 300, revenue: null, pnl: null, roi: null, open: true });
  });

  it('закрытая позиция — считает прибыль и ROI', () => {
    const p = tradePnl(trade({ qty: 3, buy: 100, sell: 150 }));
    expect(p).toMatchObject({ cost: 300, revenue: 450, pnl: 150, open: false });
    expect(p.roi).toBeCloseTo(50, 5);
  });

  it('убыток отражается отрицательным pnl', () => {
    const p = tradePnl(trade({ qty: 2, buy: 100, sell: 60 }));
    expect(p.pnl).toBe(-80);
    expect(p.roi).toBeCloseTo(-40, 5);
  });
});

describe('journalSummary', () => {
  it('агрегирует открытые и закрытые', () => {
    const s = journalSummary([
      trade({ id: 'a', qty: 10, buy: 100 }), // открыта: cost 1000
      trade({ id: 'b', qty: 5, buy: 100, sell: 200 }), // закрыта: cost 500, pnl +500
      trade({ id: 'c', qty: 2, buy: 100, sell: 50 }), // закрыта: cost 200, pnl -100
    ]);
    expect(s.open).toBe(1);
    expect(s.closed).toBe(2);
    expect(s.invested).toBe(1000); // деньги в открытых
    expect(s.realized).toBe(400); // 500 - 100
    // ROI по закрытым: 400 / (500+200) * 100
    expect(s.roi).toBeCloseTo((400 / 700) * 100, 5);
  });

  it('пустой журнал', () => {
    expect(journalSummary([])).toEqual({ open: 0, closed: 0, invested: 0, realized: 0, roi: 0 });
  });
});
