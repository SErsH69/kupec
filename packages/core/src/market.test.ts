import { describe, expect, it } from 'vitest';
import { enrich, num, parse, parseEnriched } from './market';
import type { MarketRow } from './types';

describe('num', () => {
  it('берёт первый валидный числовой ключ', () => {
    expect(num({ a: 'x', b: '42', c: 7 }, 'a', 'b', 'c')).toBe(42);
  });
  it('пропускает null/NaN', () => {
    expect(num({ a: null, b: 'nope', c: 5 }, 'a', 'b', 'c')).toBe(5);
    expect(num({ a: null }, 'a', 'missing')).toBeNull();
  });
});

describe('parse', () => {
  it('снимает обёртку result и находит массив статистики', () => {
    const api = {
      code: 200,
      status: 'ok',
      result: {
        serverName: 'Portland',
        serverId: 'RU17',
        periodDays: 30,
        itemStatistics: [
          { itemId: 101, itemName: 'Сталь', totalCount: 50, soldCount: 20, averagePrice: 1000, minPrice: 800, maxPrice: 1500 },
        ],
      },
    };
    const { meta, rows } = parse(api);
    expect(meta.serverId).toBe('RU17');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 101,
      name: 'Сталь',
      total: 50,
      sold: 20,
      avg: 1000,
      min: 800,
      max: 1500,
    });
  });

  it('работает без обёртки result', () => {
    const { rows } = parse({ vehicleStatistics: [{ model: 'zentorno', avgPrice: 500000 }] });
    expect(rows[0]?.id).toBe('zentorno');
    expect(rows[0]?.avg).toBe(500000);
  });

  it('строит id одежды из компонентов при отсутствии *id', () => {
    const { rows } = parse({
      clothesStatistics: [{ component: 11, drawable: 4, texture: 2, gender: 1, price: 300 }],
    });
    expect(rows[0]?.id).toBe('c_11_4_2_1');
  });

  it('name падает на #id, когда нет *name', () => {
    const { rows } = parse({ itemStatistics: [{ itemId: 7, price: 10 }] });
    expect(rows[0]?.name).toBe('#7');
  });

  it('нет массива → пустой rows', () => {
    expect(parse({ result: { serverId: 'RU1' } }).rows).toEqual([]);
    expect(parse(null).rows).toEqual([]);
  });

  it('отсутствующие цены → null, не 0', () => {
    const { rows } = parse({ itemStatistics: [{ itemId: 1, itemName: 'X' }] });
    expect(rows[0]).toMatchObject({ avg: null, min: null, max: null, total: null, sold: null });
  });
});

describe('enrich', () => {
  const base = (o: Partial<MarketRow>): MarketRow => ({
    id: 1,
    name: 'X',
    total: null,
    sold: null,
    avg: null,
    min: null,
    max: null,
    ...o,
  });

  it('считает производные метрики', () => {
    const r = enrich(base({ total: 100, sold: 40, avg: 1000, min: 800, max: 1200 }));
    expect(r.sellRate).toBe(40);
    expect(r.turnover).toBe(40000);
    expect(r.spreadPct).toBeCloseTo(50, 5);
    expect(r.perDay).toBeCloseTo(40 / 30, 5);
  });

  it('null там, где данных нет', () => {
    const r = enrich(base({ total: 0, sold: null, avg: null }));
    expect(r.sellRate).toBeNull();
    expect(r.turnover).toBeNull();
    expect(r.spreadPct).toBeNull();
    expect(r.perDay).toBeNull();
  });
});

describe('parseEnriched', () => {
  it('парсит и обогащает за один проход', () => {
    const { rows } = parseEnriched({
      itemStatistics: [{ itemId: 1, itemName: 'X', totalCount: 10, soldCount: 5, averagePrice: 200 }],
    });
    expect(rows[0]?.turnover).toBe(1000);
    expect(rows[0]?.sellRate).toBe(50);
  });
});
