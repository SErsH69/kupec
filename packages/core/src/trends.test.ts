import { describe, expect, it } from 'vitest';
import { computeMovers, recordSnapshot, snapshotPrices, trendFor, trendMap } from './trends';
import type { Snapshot } from './trends';
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

describe('snapshotPrices', () => {
  it('строит карту path:id → round(avg), пропуская avg<=0', () => {
    const p = snapshotPrices([
      row({ id: 5, avg: 1000.6, _path: 'items' }),
      row({ id: 6, avg: 0, _path: 'items' }),
      row({ id: 7, avg: null, _path: 'items' }),
    ]);
    expect(p).toEqual({ 'items:5': 1001 });
  });
});

describe('recordSnapshot', () => {
  it('добавляет новый снимок', () => {
    const h = recordSnapshot([], { 'items:1': 100 }, '2026-07-01');
    expect(h).toEqual([{ d: '2026-07-01', p: { 'items:1': 100 } }]);
  });

  it('перезаписывает снимок за тот же день', () => {
    const h1 = recordSnapshot([], { 'items:1': 100 }, '2026-07-01');
    const h2 = recordSnapshot(h1, { 'items:1': 200 }, '2026-07-01');
    expect(h2).toHaveLength(1);
    expect(h2[0]!.p).toEqual({ 'items:1': 200 });
  });

  it('иммутабелен — не мутирует вход', () => {
    const h1: Snapshot[] = [{ d: '2026-07-01', p: { a: 1 } }];
    const h2 = recordSnapshot(h1, { a: 2 }, '2026-07-02');
    expect(h1).toHaveLength(1);
    expect(h2).toHaveLength(2);
  });

  it('обрезает историю до maxLen', () => {
    let h: Snapshot[] = [];
    for (let i = 0; i < 5; i++) h = recordSnapshot(h, { a: i + 1 }, `d${i}`, 3);
    expect(h).toHaveLength(3);
    expect(h[0]!.d).toBe('d2');
  });

  it('пустой снимок не добавляется', () => {
    expect(recordSnapshot([], {}, '2026-07-01')).toEqual([]);
  });
});

describe('trendMap / trendFor', () => {
  const hist: Snapshot[] = [
    { d: 'd1', p: { 'items:1': 100, 'items:2': 200 } },
    { d: 'd2', p: { 'items:1': 150, 'items:2': 180, 'items:3': 50 } },
  ];

  it('считает % между двумя последними снимками', () => {
    const m = trendMap(hist);
    expect(m['items:1']).toBeCloseTo(50, 5);
    expect(m['items:2']).toBeCloseTo(-10, 5);
    expect(m['items:3']).toBeUndefined(); // нет в prev
  });

  it('нужно ≥2 снимка', () => {
    expect(trendMap([hist[0]!])).toEqual({});
  });

  it('trendFor по строке', () => {
    const m = trendMap(hist);
    expect(trendFor(m, { id: 1, _path: 'items' })).toBeCloseTo(50, 5);
    expect(trendFor(m, { id: 999, _path: 'items' })).toBeNull();
  });
});

describe('computeMovers', () => {
  const hist: Snapshot[] = [
    { d: 'd1', p: { a: 100, b: 100, c: 100, d: 100 } },
    { d: 'd2', p: { a: 150, b: 90, c: 101, d: 100 } },
  ];

  it('делит на up/down и отсекает малые движения', () => {
    const { up, down } = computeMovers(hist, 3);
    expect(up.map((m) => m.key)).toEqual(['a']); // +50%
    expect(down.map((m) => m.key)).toEqual(['b']); // -10%; c(+1%) и d(0%) отсечены
  });

  it('отсекает cur<=0 или prev<=0', () => {
    const h: Snapshot[] = [
      { d: 'd1', p: { x: 0, y: 100 } },
      { d: 'd2', p: { x: 100, y: 100 } },
    ];
    const { up, down } = computeMovers(h, 1);
    expect(up).toHaveLength(0);
    expect(down).toHaveLength(0);
  });
});
