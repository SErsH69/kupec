import { describe, expect, it } from 'vitest';
import { computeFlip, flipScore, planBudget } from './flip';
import type { FlipRow } from './flip';
import type { MarketRow } from './types';

const row = (o: Partial<MarketRow>): MarketRow => ({
  id: 1,
  name: 'X',
  total: null,
  sold: null,
  avg: null,
  min: null,
  max: null,
  ...o,
});

describe('computeFlip', () => {
  it('считает целевые цены и навар', () => {
    // avg=1000, min=800 (>=max(100, 50)), sold=10 (>=5)
    const [r] = computeFlip([row({ avg: 1000, min: 800, sold: 10 })]);
    expect(r).toBeDefined();
    expect(r!.deal).toBe(800); // max(800, 600) = 800
    expect(r!.jack).toBe(800);
    expect(r!.sell).toBe(1000);
    expect(r!.profit).toBe(200); // 1000 - 800
    expect(r!.roi).toBeCloseTo(25, 5);
  });

  it('deal не глубже −40% от средней', () => {
    // avg=1000, min=200 -> deal = max(200, 600) = 600
    const [r] = computeFlip([row({ avg: 1000, min: 200, sold: 10 })]);
    expect(r!.deal).toBe(600);
    expect(r!.jack).toBe(200);
    expect(r!.profit).toBe(400);
  });

  it('учитывает налог', () => {
    // avg=1000, min=800, tax=10 -> profit = round(900 - 800) = 100
    const [r] = computeFlip([row({ avg: 1000, min: 800, sold: 10 })], { tax: 10 });
    expect(r!.profit).toBe(100);
  });

  it('отсекает мусорный min (< max(100, avg*0.05))', () => {
    // avg=1000 -> порог = max(100, 50) = 100; min=50 отсекается
    expect(computeFlip([row({ avg: 1000, min: 50, sold: 10 })])).toHaveLength(0);
  });

  it('отсекает по минимальному спросу', () => {
    expect(computeFlip([row({ avg: 1000, min: 800, sold: 3 })], { minDemand: 5 })).toHaveLength(0);
  });

  it('отсекает лоты без навара (profit<=0)', () => {
    // deal=max(999, 600)=999, после налога 10%: 900-999 < 0 -> отсекается
    expect(computeFlip([row({ avg: 1000, min: 999, sold: 10 })], { tax: 10 })).toEqual([]);
  });
});

describe('flipScore', () => {
  it('ликвидность × навар', () => {
    expect(flipScore({ perDay: 4, profit: 100 })).toBe(400);
    expect(flipScore({ perDay: 4, profit: -100 })).toBe(0);
    expect(flipScore({})).toBe(0);
  });
});

describe('planBudget', () => {
  const cand = (o: Partial<FlipRow>): FlipRow => ({
    ...row({}),
    perDay: 10,
    sell: 1000,
    deal: 800,
    jack: 800,
    profit: 200,
    margin: 20,
    vol: 20,
    roi: 25,
    score: 2000,
    ...o,
  });

  it('набирает по ROI и ограничивает объём ~3 днями спроса', () => {
    // perDay=10 -> demCap = 30; бюджет большой
    const { plan, invested, expProfit } = planBudget([cand({})], 1_000_000);
    expect(plan[0]!.units).toBe(30); // demCap, а не afford (1250)
    expect(invested).toBe(30 * 800);
    expect(expProfit).toBe(30 * 200);
  });

  it('ограничен бюджетом, когда денег мало', () => {
    const { plan } = planBudget([cand({ perDay: 100 })], 5000); // afford = floor(5000/800)=6
    expect(plan[0]!.units).toBe(6);
  });

  it('пропускает, когда не хватает даже на один deal', () => {
    const { plan, invested } = planBudget([cand({})], 500);
    expect(plan).toHaveLength(0);
    expect(invested).toBe(0);
  });

  it('сортирует итог по навару', () => {
    const { plan } = planBudget(
      [cand({ id: 'a', roi: 50, perDay: 1, profit: 100 }), cand({ id: 'b', roi: 25, perDay: 100, profit: 200 })],
      1_000_000,
    );
    // b даёт больше суммарного навара, хоть и ниже ROI
    expect(plan[0]!.id).toBe('b');
  });
});
