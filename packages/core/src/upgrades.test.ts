import { describe, expect, it } from 'vitest';
import { findRealty, maxLevel, mergePlans, upgradePlan, upgradeSteps } from './upgrades';
import { REALTIES } from './data/index';

describe('каталог недвижимости', () => {
  it('разворачивает упакованные диапазоны', () => {
    expect(REALTIES.length).toBeGreaterThan(1900);
    expect(REALTIES.filter((r) => r.type === 'apartment').length).toBeGreaterThan(400);
  });

  it('находит дом по номеру со всеми характеристиками', () => {
    const h = findRealty(1)!;
    expect(h.gosPrice).toBe(5_000_000);
    expect(h.rentPerDay).toBe(12_500);
    expect(h.royaltyCoins).toBe(125);
    expect(h.garageSlots).toBe(10);
    expect(h.storageKg).toBe(500);
  });

  it('различает дом и квартиру с одним номером', () => {
    expect(findRealty(1, 'house')!.gosPrice).toBe(5_000_000);
    expect(findRealty(1, 'apartment')!.gosPrice).toBe(3_000_000);
  });

  it('есть дома вообще без роялти', () => {
    const free = REALTIES.filter((r) => r.type === 'house' && r.royaltyCoins === 0);
    expect(free.length).toBeGreaterThan(0);
    // самый дорогой дом без роялти
    const best = free.sort((a, b) => b.gosPrice - a.gosPrice)[0]!;
    expect(best.gosPrice).toBeGreaterThan(0);
  });
});

describe('upgradePlan', () => {
  it('суммирует материалы и деньги по шагам мастерской', () => {
    const p = upgradePlan('workshop', 0, 3);
    expect(p.steps.length).toBe(3);
    expect(p.money).toBe(150_000 + 450_000 + 1_350_000);
    expect(p.hours).toBe(6 + 12 + 24);
    const sm1 = p.materials.find((m) => m.name === 'Строительные материалы 1 уровня')!;
    expect(sm1.qty).toBe(12 + 24 + 48);
  });

  it('считает только недостающие уровни', () => {
    const p = upgradePlan('workshop', 2, 3);
    expect(p.steps.map((s) => s.lvl)).toEqual([3]);
    expect(p.money).toBe(1_350_000);
  });

  it('пустой план, если уже прокачано', () => {
    const p = upgradePlan('kitchen', 5, 5);
    expect(p.steps).toEqual([]);
    expect(p.money).toBe(0);
    expect(p.materials).toEqual([]);
  });

  it('гараж зависит от числа мест в доме', () => {
    const small = upgradePlan('garage', 1, 3, 2);
    const big = upgradePlan('garage', 1, 3, 10);
    expect(small.money).toBe(200_000 + 400_000);
    expect(big.money).toBe(1_800_000 + 2_400_000);
    // у 10-местного есть 4-й уровень, у 2-местного нет
    expect(maxLevel('garage', 10)).toBe(4);
    expect(maxLevel('garage', 2)).toBe(3);
  });

  it('нет шагов для неизвестного размера гаража', () => {
    expect(upgradeSteps('garage', 30)).toEqual([]);
    expect(upgradePlan('garage', 1, 3, 30).money).toBe(0);
  });

  it('складывает несколько планов', () => {
    const merged = mergePlans([upgradePlan('kitchen', 1, 2), upgradePlan('pantry', 1, 2)]);
    expect(merged.money).toBe(150_000 + 1_200_000);
    const wood = merged.materials.find((m) => m.name === 'Обработанная древесина')!;
    expect(wood.qty).toBe(2 + 10);
  });
});
