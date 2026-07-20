/**
 * Справочные данные, вшитые снимком из Fletcher Wiki / вики Majestic.
 * Извлечены из прототипа (majestic_market_dashboard.html) скриптом; обновляются
 * отдельно, не в рантайме (клиент не ходит на вики). Формы — см. docs/PORTING_SPEC.md.
 */
import recipesJson from './recipes.json';
import kitchenJson from './kitchen-recipes.json';
import govJson from './gov.json';
import jobsJson from './jobs.json';
import vehiclesJson from './vehicles.json';
import classifiersJson from './classifiers.json';
import upgradesJson from './house-upgrades.json';
import realtiesJson from './realties.json';

/** Рецепт мастерской. */
export interface Recipe {
  lvl: number;
  out: string;
  qmin: number;
  qmax: number;
  /** Денежная стоимость крафта ($), помимо ингредиентов. */
  money: number;
  /** Время крафта, секунды. */
  sec: number;
  /** Шанс успеха [min%, max%]. */
  ch: [number, number];
  /** Ингредиенты: [имя, количество]. */
  ing: Array<[string, number]>;
}

/** Рецепт кухни. */
export interface KitchenRecipe {
  /** id блюда = id предмета в маркете. */
  id: number;
  name: string;
  lvl: number;
  /** Требуемый уровень кухни/фабрики. */
  kLvl: number | null;
  fac: boolean;
  /** Время готовки, миллисекунды. */
  ms: number;
  exp: number;
  m: string;
  /** Ингредиенты: [имя, количество, источник]. */
  ing: Array<[string, number, string]>;
}

/** Гос-цена скупщика. */
export interface GovPrice {
  name: string;
  cat: string;
  min: number | null;
  max: number | null;
  /** «Продажная» вилка (наценка). */
  pmin: number | null;
  pmax: number | null;
}

/** Работа. */
export interface Job {
  name: string;
  lvl: number;
  legal: string;
  /** Зарплаты по рангам. */
  ranks: number[];
}

/** Справочник транспорта. */
export interface VehicleName {
  /** Игровое название. */
  g: string;
  /** Реальное название. */
  i?: string;
  /** Гос-цена. */
  gos: number | null;
}
export interface VehicleSpec {
  spd: number;
  trunk: number;
  fuel: number;
  cls: string;
  ft: string;
}
export interface Vehicles {
  names: Record<string, VehicleName>;
  byReal: Record<string, { g: string; gos: number | null }>;
  market: Record<string, string>;
  specs: Record<string, VehicleSpec>;
  realBrands: string[];
}

/** Классификаторы сырья (для фарма/еды). */
export interface Classifiers {
  fish: string[];
  crops: string[];
  veg: string[];
  fruit: string[];
  grocery: string[];
}

export const RECIPES = recipesJson as Recipe[];
export const KITCHEN_RECIPES = kitchenJson as KitchenRecipe[];
export const GOV_PRICES = govJson as GovPrice[];
export const JOBS = jobsJson as Job[];
export const VEHICLES = vehiclesJson as Vehicles;
export const CLASSIFIERS = classifiersJson as Classifiers;

/* ---------------- недвижимость и прокачка дома ---------------- */

/** Один шаг улучшения: до какого уровня, сколько часов, денег и материалов. */
export interface UpgradeStep {
  lvl: number;
  hours: number;
  money: number;
  /** [название материала, количество] */
  req: [string, number][];
}

export interface HouseUpgrades {
  workshop: UpgradeStep[];
  kitchen: UpgradeStep[];
  pantry: UpgradeStep[];
  /** Гараж — по числу мест в доме (у каждого размера свои требования). */
  garage: Record<string, UpgradeStep[]>;
}

export const HOUSE_UPGRADES = upgradesJson as unknown as HouseUpgrades;

/** Объект недвижимости из каталога. */
export interface Realty {
  num: number;
  type: 'house' | 'apartment';
  gosPrice: number;
  rentPerDay: number;
  /** Роялти в игровой валюте проекта (0 — нет). */
  royaltyCoins: number;
  garageSlots: number;
  maxPpl: number;
  storageKg: number;
}

/** Развернуть упакованный каталог (тип,цены|номера с диапазонами) в список. */
function unpackRealties(lines: string[]): Realty[] {
  const out: Realty[] = [];
  for (const line of lines) {
    const [tuple, nums] = line.split('|');
    if (!tuple || !nums) continue;
    const [type, gos, rent, royalty, garage, ppl, kg] = tuple.split(',');
    for (const part of nums.trim().split(/\s+/)) {
      const [a, b] = part.split('-').map(Number);
      for (let n = a!; n <= (b ?? a!); n++) {
        out.push({
          num: n,
          type: type as Realty['type'],
          gosPrice: Number(gos),
          rentPerDay: Number(rent),
          royaltyCoins: Number(royalty),
          garageSlots: Number(garage),
          maxPpl: Number(ppl),
          storageKg: Number(kg),
        });
      }
    }
  }
  return out;
}

export const REALTIES: Realty[] = unpackRealties((realtiesJson as { packed: string[] }).packed);
