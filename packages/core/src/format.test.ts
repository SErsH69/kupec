import { describe, expect, it } from 'vitest';
import { groupInt, money, moneyShort, nf, pct } from './format';

describe('nf', () => {
  it('округляет и группирует тысячи', () => {
    expect(nf(1234567)).toBe('1 234 567');
    expect(nf(1234.6)).toBe('1 235');
  });
  it('возвращает «—» для пустого/невалидного', () => {
    expect(nf(null)).toBe('—');
    expect(nf(undefined)).toBe('—');
    expect(nf(NaN)).toBe('—');
  });
});

describe('money', () => {
  it('добавляет знак доллара', () => {
    expect(money(1500)).toBe('$1 500');
    expect(money(0)).toBe('$0');
  });
  it('возвращает «—» без данных', () => {
    expect(money(null)).toBe('—');
  });
});

describe('moneyShort', () => {
  it('миллионы и тысячи компактно', () => {
    expect(moneyShort(3915000)).toBe('$3.9M');
    expect(moneyShort(6200000)).toBe('$6.2M');
    expect(moneyShort(850000)).toBe('$850k');
    expect(moneyShort(12000)).toBe('$12k');
  });
  it('мелкие суммы — как money, «.0» без хвоста', () => {
    expect(moneyShort(1500)).toBe(money(1500)); // < 10k → полный формат
    expect(moneyShort(2000000)).toBe('$2M');
  });
  it('знак и пустое', () => {
    expect(moneyShort(-4500000)).toBe('-$4.5M');
    expect(moneyShort(null)).toBe('—');
  });
});

describe('pct', () => {
  it('целые проценты', () => {
    expect(pct(42.7)).toBe('43%');
    expect(pct(0)).toBe('0%');
  });
  it('«—» без данных', () => {
    expect(pct(null)).toBe('—');
  });
});

describe('groupInt', () => {
  it('группирует и чистит нецифры', () => {
    expect(groupInt('1234567')).toBe('1 234 567');
    expect(groupInt('$12 000')).toBe('12 000');
  });
  it('пустой ввод -> пустая строка', () => {
    expect(groupInt('')).toBe('');
    expect(groupInt(null)).toBe('');
  });
});
