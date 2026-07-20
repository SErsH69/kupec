import { HOUSE_UPGRADES, REALTIES, type Realty, type UpgradeStep } from './data/index';

/** Что улучшаем в доме. */
export type UpgradeKind = 'workshop' | 'kitchen' | 'pantry' | 'garage';

export const UPGRADE_LABEL: Record<UpgradeKind, string> = {
  workshop: 'Мастерская',
  kitchen: 'Кухня',
  pantry: 'Кладовка',
  garage: 'Гараж',
};

/** Найти объект каталога по номеру. */
export function findRealty(num: number, type: Realty['type'] = 'house'): Realty | undefined {
  return REALTIES.find((r) => r.num === num && r.type === type);
}

/**
 * Шаги улучшения для раздела. Для гаража требования зависят от числа мест
 * в конкретном доме, поэтому нужен `garageSlots`.
 */
export function upgradeSteps(kind: UpgradeKind, garageSlots?: number): UpgradeStep[] {
  if (kind !== 'garage') return HOUSE_UPGRADES[kind];
  const key = String(garageSlots ?? '');
  return HOUSE_UPGRADES.garage[key] ?? [];
}

/** Максимальный достижимый уровень раздела (для гаража — с учётом дома). */
export function maxLevel(kind: UpgradeKind, garageSlots?: number): number {
  const steps = upgradeSteps(kind, garageSlots);
  return steps.length ? steps[steps.length - 1]!.lvl : 1;
}

export interface UpgradeMaterial {
  name: string;
  qty: number;
}

export interface UpgradePlan {
  kind: UpgradeKind;
  from: number;
  to: number;
  /** Шаги, которые войдут в план. */
  steps: UpgradeStep[];
  /** Суммарные материалы по всем шагам. */
  materials: UpgradeMaterial[];
  money: number;
  hours: number;
}

/**
 * План прокачки с уровня `from` до `to`: суммирует материалы, деньги и время
 * по всем промежуточным шагам. `from` — текущий уровень (что уже стоит).
 * Для мастерской уровень 0 значит «ещё не установлена».
 */
export function upgradePlan(
  kind: UpgradeKind,
  from: number,
  to: number,
  garageSlots?: number,
): UpgradePlan {
  const all = upgradeSteps(kind, garageSlots);
  const steps = all.filter((s) => s.lvl > from && s.lvl <= to);

  const byName = new Map<string, number>();
  let money = 0;
  let hours = 0;
  for (const s of steps) {
    money += s.money;
    hours += s.hours;
    for (const [name, qty] of s.req) byName.set(name, (byName.get(name) ?? 0) + qty);
  }

  return {
    kind,
    from,
    to,
    steps,
    materials: [...byName].map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty),
    money,
    hours,
  };
}

/** Сумма нескольких планов (например, «прокачать всё сразу»). */
export function mergePlans(plans: UpgradePlan[]): { materials: UpgradeMaterial[]; money: number; hours: number } {
  const byName = new Map<string, number>();
  let money = 0;
  let hours = 0;
  for (const p of plans) {
    money += p.money;
    hours += p.hours;
    for (const m of p.materials) byName.set(m.name, (byName.get(m.name) ?? 0) + m.qty);
  }
  return {
    materials: [...byName].map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty),
    money,
    hours,
  };
}
