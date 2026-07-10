import { VEHICLES, type Vehicles } from './data/index';

/** Строка RL-авто: код, реальное/игровое имя, гос-цена. */
export interface RLVehicle {
  code: string;
  real: string;
  game: string;
  gos: number | null;
}

/**
 * Список машин реальных брендов с гос-ценой (buildRL, line 1231). Точный порт.
 * Оставляет только те, чьё реальное имя начинается с известного бренда.
 */
export function buildRL(vehicles: Vehicles = VEHICLES): RLVehicle[] {
  const { market, names, byReal, realBrands } = vehicles;
  const list: RLVehicle[] = [];
  for (const code in market) {
    const real = market[code]!;
    const rl = String(real).toLowerCase();
    if (!realBrands.some((b) => rl.startsWith(b))) continue;
    const vn = names[code];
    const br = byReal[rl];
    const game = (vn && vn.g) || (br && br.g) || '';
    const gos = (vn && vn.gos) || (br && br.gos) || null;
    list.push({ code, real, game, gos });
  }
  return list;
}
