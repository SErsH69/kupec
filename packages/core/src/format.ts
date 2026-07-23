/**
 * Форматтеры чисел/денег. Порт из прототипа (nf, money, pct, groupInt).
 * Прототип использует локаль 'ru-RU' (неразрывный пробел как разделитель тысяч).
 */

const DASH = '—';

function isNil(n: number | null | undefined): n is null | undefined {
  return n == null || Number.isNaN(n);
}

/** Целое число с разделителями тысяч, либо «—». */
export function nf(n: number | null | undefined): string {
  if (isNil(n)) return DASH;
  return Math.round(n).toLocaleString('ru-RU');
}

/** Денежная сумма «$1 234», либо «—». */
export function money(n: number | null | undefined): string {
  if (isNil(n)) return DASH;
  return '$' + Math.round(n).toLocaleString('ru-RU');
}

/**
 * Компактная денежная сумма для тесных мест (чипы, мобилка): «$6.2M», «$850k»,
 * «$1 234». Знак сохраняется. `null`/NaN → «—».
 */
export function moneyShort(n: number | null | undefined): string {
  if (isNil(n)) return DASH;
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${sign}$${trim(a / 1_000_000)}M`;
  if (a >= 10_000) return `${sign}$${trim(a / 1000)}k`;
  return money(n);
}

/** «1.2» без хвостового «.0» (12 → «12», 1.25 → «1.3»). */
function trim(x: number): string {
  return x.toFixed(1).replace(/\.0$/, '');
}

/** Проценты без дробной части «42%», либо «—». */
export function pct(n: number | null | undefined): string {
  if (isNil(n)) return DASH;
  return n.toFixed(0) + '%';
}

/**
 * Группировка целого из произвольной строки (для полей ввода): '1234567' -> '1 234 567'.
 * Нецифровые символы удаляются. Пустой ввод -> ''.
 */
export function groupInt(v: string | number | null | undefined): string {
  const x = String(v == null ? '' : v).replace(/[^\d]/g, '');
  return x ? x.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '';
}
