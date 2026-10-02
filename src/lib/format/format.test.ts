import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, isRealDate, monthsBetween, parseDate } from './date';
import {
  formatBytes,
  formatCount,
  formatDecimalString,
  formatInt,
  formatMoney,
  formatPercent,
  formatSignedInt,
} from './number';
import { parseDecimalAmount, parseWholeNumber } from './parse';

describe('number formatting (vi-VN)', () => {
  it('groups thousands with dots', () => {
    expect(formatInt(1_000_000)).toBe('1.000.000');
    expect(formatInt(999)).toBe('999');
    expect(formatInt(0)).toBe('0');
    expect(formatInt(Number.MAX_SAFE_INTEGER)).toBe('9.007.199.254.740.991');
  });

  it('shows the sign of a change', () => {
    expect(formatSignedInt(416)).toBe('+416');
    expect(formatSignedInt(-50_000)).toBe('-50.000');
    expect(formatSignedInt(0)).toBe('0');
  });

  it('shows zero counts as a dash', () => {
    expect(formatCount(0)).toBe('—');
    expect(formatCount(20_000)).toBe('20.000');
  });

  it('formats decimal strings without going through floating point', () => {
    expect(formatDecimalString('25000.50')).toBe('25.000,50');
    expect(formatDecimalString('25000.50', { trimZeros: true })).toBe('25.000,5');
    expect(formatDecimalString('0.1')).toBe('0,1');
    expect(formatDecimalString('12345678901234567890.123456')).toBe('12.345.678.901.234.567.890,123456');
    expect(formatDecimalString('not a number')).toBe('not a number');
  });

  it('keeps two decimals on percentages', () => {
    expect(formatPercent('43.48')).toBe('43,48%');
    expect(formatPercent('100')).toBe('100,00%');
    expect(formatPercent('0.00')).toBe('0,00%');
  });

  it('formats money with the currency symbol', () => {
    expect(formatMoney({ amount: '25000', currency: 'VND' })).toBe('25.000 ₫');
    expect(formatMoney({ amount: '25000.000000', currency: 'VND' })).toBe('25.000 ₫');
    expect(formatMoney({ amount: '12.5', currency: 'USD' })).toBe('12,50 $');
    expect(formatMoney({ amount: '1', currency: 'CHF' })).toBe('1,00 CHF');
    expect(formatMoney(null)).toBe('—');
  });

  it('formats file sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5,0 MB');
  });
});

describe('parsing what people type', () => {
  it.each([
    ['1.000.000', 1_000_000],
    ['1,000,000', 1_000_000],
    ['  12 000 ', 12_000],
    ['0', 0],
  ])('reads %s as the whole number %d', (text, expected) => {
    expect(parseWholeNumber(text)).toBe(expected);
  });

  it.each(['', 'abc', '12a', '-5', '1e3', '9007199254740993'])('rejects %j as a whole number', (text) => {
    expect(parseWholeNumber(text)).toBeNull();
  });

  it.each([
    ['25.000', '25000'],
    ['1.000.000', '1000000'],
    ['25,5', '25.5'],
    ['25.000,50', '25000.50'],
    ['25.5', '25.5'],
    ['0.5', '0.5'],
    ['0.500', '0.500'],
    ['5000', '5000'],
    ['007', '7'],
  ])('reads money %s as %s', (text, expected) => {
    expect(parseDecimalAmount(text)).toBe(expected);
  });

  it.each(['', 'abc', '1,2,3', '1.2.3', '1,1234567', '-5'])('rejects money %j', (text) => {
    expect(parseDecimalAmount(text)).toBeNull();
  });
});

describe('dates', () => {
  it('formats business dates by text, not by Date', () => {
    expect(formatDate('2026-10-01')).toBe('01/10/2026');
    expect(formatDate(null)).toBe('—');
  });

  it('parses typed dates and rejects impossible ones', () => {
    expect(parseDate('01/10/2026')).toBe('2026-10-01');
    expect(parseDate('1-2-2026')).toBe('2026-02-01');
    expect(parseDate('31/02/2026')).toBeNull();
    expect(parseDate('2026-10-01')).toBeNull();
    expect(isRealDate('2028-02-29')).toBe(true);
    expect(isRealDate('2027-02-29')).toBe(false);
  });

  it('shows instants in Vietnam time (UTC+7)', () => {
    expect(formatDateTime('2026-10-01T03:14:07.512Z')).toBe('01/10/2026 10:14');
    expect(formatDateTime('2026-09-30T18:00:00Z')).toBe('01/10/2026 01:00');
  });
});

describe('months between business dates', () => {
  it('counts calendar months from the vesting start', () => {
    expect(monthsBetween('2025-09-01', '2026-10-01')).toBe(13);
    expect(monthsBetween('2025-09-01', '2026-09-01')).toBe(12);
    expect(monthsBetween('2025-09-01', '2029-09-01')).toBe(48);
    expect(monthsBetween('2025-09-01', 'x')).toBeNull();
  });
});
