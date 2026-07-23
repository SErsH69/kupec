import { describe, expect, it } from 'vitest';
import { computeGovDeals } from './gov';
import type { GovPrice } from './data';
import type { MarketRow } from './types';

/** Первая (единственная) сделка — тесты гоняют по одной гос-позиции. */
const one = (market: MarketRow[], gov: GovPrice[]) => computeGovDeals(market, gov)[0]!;

const gov = (o: Partial<GovPrice> & { name: string }): GovPrice => ({
  cat: 'Ферма',
  min: null,
  max: null,
  pmin: null,
  pmax: null,
  ...o,
});
const row = (o: Partial<MarketRow> & { name: string }): MarketRow => ({
  id: o.name,
  total: null,
  sold: 10, // по умолчанию «живой» рынок (>= GOV_MIN_SOLD)
  avg: null,
  min: null,
  max: null,
  ...o,
});

describe('computeGovDeals', () => {
  it('сдать скупщику выгоднее рынка: НПС берёт дороже средней', () => {
    // НПС покупает до $500, рынок в среднем $400 → продать скупщику +$100
    const d = one([row({ name: 'Банан', avg: 400 })], [gov({ name: 'Банан', min: 400, max: 500 })]);
    expect(d.action).toBe('sell');
    expect(d.sellEdge).toBe(100);
    expect(d.edge).toBe(100);
  });

  it('купить у НПС → продать на рынке: НПС продаёт дешевле рынка', () => {
    // НПС продаёт игроку от $200, рынок в среднем $500 → флип +$300
    const d = one(
      [row({ name: 'Апельсин', avg: 500 })],
      [gov({ name: 'Апельсин', min: 100, max: 150, pmin: 200, pmax: 260 })],
    );
    expect(d.action).toBe('flip');
    expect(d.flipEdge).toBe(300);
    expect(d.edge).toBe(300);
  });

  it('выбирает большее из двух направлений', () => {
    // sellEdge = 900-500 = 400; flipEdge = 500-450 = 50 → sell
    const d = one(
      [row({ name: 'Груша', avg: 500 })],
      [gov({ name: 'Груша', max: 900, pmin: 450 })],
    );
    expect(d.action).toBe('sell');
    expect(d.edge).toBe(400);
  });

  it('нет выгоды — action null, edge 0', () => {
    // НПС берёт до $100, продаёт от $600, рынок $300: sell −200, flip нет (pmin 600 > avg)
    const d = one(
      [row({ name: 'Слива', avg: 300 })],
      [gov({ name: 'Слива', max: 100, pmin: 600 })],
    );
    expect(d.action).toBeNull();
    expect(d.edge).toBe(0);
  });

  it('нет рыночной строки — market/marketAvg null, без действия', () => {
    const d = one([], [gov({ name: 'Редкий предмет', max: 100 })]);
    expect(d.market).toBeNull();
    expect(d.marketAvg).toBeNull();
    expect(d.action).toBeNull();
  });

  it('матч по названию регистронезависимо; предпочитает строку с ценой', () => {
    const d = one(
      [row({ name: 'Банан' }), row({ name: 'банан', avg: 400 })],
      [gov({ name: 'Банан', max: 500 })],
    );
    expect(d.marketAvg).toBe(400);
    expect(d.action).toBe('sell');
  });

  it('рынок без цены (avg≤0) не считается — нет фейкового «сдать скупщику»', () => {
    const d = one([row({ name: 'Часы', avg: 0, sold: 10 })], [gov({ name: 'Часы', max: 300000 })]);
    expect(d.marketAvg).toBeNull();
    expect(d.action).toBeNull();
  });

  it('тонкий рынок (мало продаж) не считается', () => {
    const d = one([row({ name: 'Винтовка', avg: 2_000_000, sold: 1 })], [gov({ name: 'Винтовка', pmin: 2500 })]);
    expect(d.marketAvg).toBeNull();
    expect(d.action).toBeNull();
  });
});
