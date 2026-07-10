import { describe, expect, it } from 'vitest';
import { computeFarm, farmType } from './farm';
import type { MarketRow } from './types';

const item = (name: string, avg: number | null, turnover: number | null = null): MarketRow => ({
  id: name,
  name,
  total: null,
  sold: null,
  avg,
  min: null,
  max: null,
  turnover,
});

describe('farmType', () => {
  it('классифицирует по ключевым словам', () => {
    expect(farmType('Железная руда')).toBe('Руда');
    expect(farmType('Сосновое бревно')).toBe('Дерево');
    expect(farmType('Мясо оленя')).toBe('Мясо/охота');
  });
  it('рыба по regex или списку', () => {
    expect(farmType('Свежая рыба')).toBe('Рыба');
    expect(farmType('плотва')).toBe('Рыба'); // из набора FISH
  });
  it('урожай из набора CROPS', () => {
    expect(farmType('пшеница')).toBe('Урожай');
  });
  it('не сырьё -> null', () => {
    expect(farmType('Часы Rolex')).toBeNull();
  });
});

describe('computeFarm', () => {
  it('отбирает сырьё с avg>0 и сортирует по обороту', () => {
    const rows = [
      item('Железная руда', 100, 5000),
      item('Часы Rolex', 100000, 999999), // не сырьё — отсеивается
      item('пшеница', 10, 20000),
      item('Мясо оленя', 0, 0), // avg=0 — отсеивается
    ];
    const out = computeFarm(rows);
    expect(out.map((r) => r.name)).toEqual(['пшеница', 'Железная руда']);
    expect(out[0]!.farmCat).toBe('Урожай');
  });
});
