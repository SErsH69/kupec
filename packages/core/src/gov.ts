/**
 * Гос-цены НПС × живой рынок. Скупщик (НПС) покупает товар по вилке
 * `min..max` и продаёт игроку по `pmin..pmax`. Скрещиваем со средней рыночной
 * ценой, чтобы найти **гарантированные** сделки, которых нет в обычном перекупе:
 *  - «сдать скупщику» — НПС берёт дороже рынка: продаёшь мгновенно, без ожидания
 *    покупателя (edge = npcBuyMax − marketAvg);
 *  - «купить у НПС → продать на рынке» — НПС продаёт дешевле рынка: безрисковый
 *    флип (edge = marketAvg − npcSellMin).
 * Значения НПС — вилки (меняются в течение дня), поэтому edge — «лучший случай».
 */

import { GOV_PRICES, type GovPrice } from './data';
import type { MarketRow } from './types';

export type GovAction = 'sell' | 'flip';

/**
 * Минимум продаж, чтобы считать рынок «живым». Ниже — средняя цена строится на
 * 1–2 лотах и легко завышена/занижена (одна дорогая выставка раздувает навар в
 * фейковый). Половина товаров вообще без цены (avg≤0) — их тоже не сравниваем.
 */
export const GOV_MIN_SOLD = 3;

export interface GovDeal {
  gov: GovPrice;
  /** Рыночная строка по совпадению названия (или null — нет на рынке). */
  market: MarketRow | null;
  /** Средняя рыночная цена (для сравнения), либо null. */
  marketAvg: number | null;
  /** Навар «сдать скупщику»: npcBuyMax − marketAvg (>0 — НПС платит больше). */
  sellEdge: number | null;
  /** Навар «купить у НПС → продать на рынке»: marketAvg − npcSellMin. */
  flipEdge: number | null;
  /** Лучшее действие (положительный больший навар), либо null. */
  action: GovAction | null;
  /** Навар лучшего действия; 0 — действия нет (для сортировки). */
  edge: number;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Считает гос-сделки: для каждой гос-позиции ищет рыночную строку по названию
 * и вычисляет навар обоих направлений. `gov` по умолчанию — вшитый снимок.
 */
export function computeGovDeals(market: MarketRow[], gov: GovPrice[] = GOV_PRICES): GovDeal[] {
  // Индекс рынка по названию: предпочитаем строку с ценой, не перетираем валидную пустой.
  const byName = new Map<string, MarketRow>();
  for (const r of market) {
    if (!r.name) continue;
    const k = norm(r.name);
    const prev = byName.get(k);
    if (!prev || (prev.avg == null && r.avg != null)) byName.set(k, r);
  }

  return gov.map((g) => {
    const m = byName.get(norm(g.name)) ?? null;
    // Считаем навар только против «живого» рынка: реальная цена + достаточно продаж.
    const liquid = m != null && (m.avg ?? 0) > 0 && (m.sold ?? 0) >= GOV_MIN_SOLD;
    const avg = liquid ? (m!.avg as number) : null;
    const sellEdge = g.max != null && avg != null ? g.max - avg : null;
    const flipEdge = g.pmin != null && avg != null ? avg - g.pmin : null;

    let action: GovAction | null = null;
    let edge = 0;
    const s = sellEdge ?? -Infinity;
    const f = flipEdge ?? -Infinity;
    if (s > 0 || f > 0) {
      if (s >= f) {
        action = 'sell';
        edge = sellEdge as number;
      } else {
        action = 'flip';
        edge = flipEdge as number;
      }
    }

    return { gov: g, market: m, marketAvg: avg, sellEdge, flipEdge, action, edge };
  });
}
