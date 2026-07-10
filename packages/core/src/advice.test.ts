import { describe, expect, it } from 'vitest';
import { sellAdvice } from './advice';

describe('sellAdvice', () => {
  it('null при невалидной средней', () => {
    expect(sellAdvice(null, 100, 200)).toBeNull();
    expect(sellAdvice(0, 100, 200)).toBeNull();
    expect(sellAdvice(-5, 100, 200)).toBeNull();
  });

  it('fast = min, когда min выше порога avg*0.3', () => {
    // avg=1000, min=800 (> 300) -> fast=800; max=1500 (>avg) -> top=1500
    expect(sellAdvice(1000, 800, 1500)).toEqual({ fast: 800, fair: 1000, top: 1500 });
  });

  it('fast = avg*0.85, когда min мусорный (<= avg*0.3)', () => {
    // avg=1000, min=1 -> fast = round(850)
    expect(sellAdvice(1000, 1, 1500)).toEqual({ fast: 850, fair: 1000, top: 1500 });
  });

  it('top = fair, когда max не выше средней', () => {
    // max=900 (< avg) -> top = fair = 1000
    expect(sellAdvice(1000, 800, 900)).toEqual({ fast: 800, fair: 1000, top: 1000 });
  });

  it('корректно округляет', () => {
    expect(sellAdvice(1000.4, null, null)).toEqual({ fast: 850, fair: 1000, top: 1000 });
  });
});
