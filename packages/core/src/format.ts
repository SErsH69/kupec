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
