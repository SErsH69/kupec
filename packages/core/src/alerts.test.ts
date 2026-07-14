import { describe, expect, it } from 'vitest';
import { targetHit } from './alerts';

describe('targetHit', () => {
  it('buy: срабатывает, когда min опустился к цели', () => {
    expect(targetHit({ avg: 100, min: 80 }, { price: 80, type: 'buy' })).toBe(true);
    expect(targetHit({ avg: 100, min: 90 }, { price: 80, type: 'buy' })).toBe(false);
  });

  it('sell: срабатывает, когда средняя поднялась к цели', () => {
    expect(targetHit({ avg: 120, min: 90 }, { price: 120, type: 'sell' })).toBe(true);
    expect(targetHit({ avg: 100, min: 90 }, { price: 120, type: 'sell' })).toBe(false);
  });

  it('нет данных или невалидная цель — false', () => {
    expect(targetHit({ avg: null, min: null }, { price: 100, type: 'buy' })).toBe(false);
    expect(targetHit({ avg: 100, min: 50 }, { price: 0, type: 'buy' })).toBe(false);
  });
});
