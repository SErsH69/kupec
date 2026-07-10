import type { SellAdvice } from './types';

/**
 * Рекомендация по цене выставления на маркете.
 * Точный порт из прототипа (sellAdvice, строки 297–303):
 *   fair = round(avg)
 *   fast = round( (min != null && min > avg*0.3) ? min : avg*0.85 )
 *   top  = (max != null && max > avg) ? round(max) : fair
 *
 * Возвращает null, если средняя цена невалидна (нет данных / <= 0).
 * `avg*0.3` отсекает мусорные лоты по $1, тянущие «быструю» цену в пол.
 */
export function sellAdvice(
  avg: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
): SellAdvice | null {
  if (avg == null || !(avg > 0)) return null;
  const fair = Math.round(avg);
  const fast = Math.round(min != null && min > avg * 0.3 ? min : avg * 0.85);
  const top = max != null && max > avg ? Math.round(max) : fair;
  return { fast, fair, top };
}
