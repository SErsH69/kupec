import { describe, expect, it } from 'vitest';
import { buildRL } from './vehicles';
import { VEHICLES } from './data/index';

describe('buildRL', () => {
  it('оставляет только реальные бренды и берёт гос-цену', () => {
    const list = buildRL();
    expect(list.length).toBeGreaterThan(0);
    // все реальные имена начинаются с известного бренда
    for (const v of list) {
      const rl = v.real.toLowerCase();
      expect(VEHICLES.realBrands.some((b) => rl.startsWith(b))).toBe(true);
    }
  });

  it('работает на синтетическом справочнике', () => {
    const list = buildRL({
      market: { z: 'BMW M5', junk: 'Random Cart' },
      names: { z: { g: 'Ubermacht 5', i: 'BMW M5', gos: 5_000_000 } },
      byReal: {},
      specs: {},
      realBrands: ['bmw'],
    });
    expect(list).toEqual([{ code: 'z', real: 'BMW M5', game: 'Ubermacht 5', gos: 5_000_000 }]);
  });
});
