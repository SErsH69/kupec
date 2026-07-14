import type { MarketRow } from './types';

export type TargetType = 'buy' | 'sell';

/** Ценовая цель по товару. */
export interface PriceTarget {
  price: number;
  type: TargetType;
}

/**
 * Достигнута ли ценовая цель по текущему рынку.
 * - `buy`: можно купить по цели — самый дешёвый лот `min <= price`.
 * - `sell`: можно продать по цели — рыночная средняя `avg >= price`.
 */
export function targetHit(
  row: Pick<MarketRow, 'avg' | 'min'>,
  target: PriceTarget,
): boolean {
  if (!(target.price > 0)) return false;
  if (target.type === 'buy') return row.min != null && row.min <= target.price;
  return row.avg != null && row.avg >= target.price;
}
