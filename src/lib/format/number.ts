// Display formatting for Vietnam (vi-VN): "1.000.000", "43,48". Money and percentages arrive as decimal
// strings and stay strings: they are grouped as text, never parsed into floating point.

const GROUP = '.';
const DECIMAL = ',';

function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP);
}

/** Whole quantity, e.g. 1000000 → "1.000.000". */
export function formatInt(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const text = Math.trunc(Math.abs(value)).toString();
  return `${value < 0 ? '-' : ''}${group(text)}`;
}

/** Signed change, e.g. 416 → "+416", -3 → "-3", 0 → "0". */
export function formatSignedInt(value: number): string {
  return value > 0 ? `+${formatInt(value)}` : formatInt(value);
}

const DECIMAL_STRING = /^(-?)(\d+)(?:\.(\d+))?$/;

/** "25000.50" → "25.000,50" (keeps the fraction exactly as given). */
export function formatDecimalString(
  value: string,
  options: { trimZeros?: boolean; minFraction?: number } = {},
): string {
  const match = DECIMAL_STRING.exec(value.trim());
  if (!match) {
    return value;
  }
  const [, sign = '', whole = '0', fractionRaw = ''] = match;
  let fraction = fractionRaw;
  if (options.trimZeros) {
    fraction = fraction.replace(/0+$/, '');
  }
  const minFraction = options.minFraction ?? 0;
  if (fraction.length < minFraction) {
    fraction = fraction.padEnd(minFraction, '0');
  }
  const intPart = group(whole.replace(/^0+(?=\d)/, ''));
  return `${sign}${intPart}${fraction === '' ? '' : `${DECIMAL}${fraction}`}`;
}

/** "43.48" → "43,48%". */
export function formatPercent(value: string): string {
  return `${formatDecimalString(value, { minFraction: 2 })}%`;
}

/** Percent without the sign, for table cells whose header says "%". */
export function formatPercentPlain(value: string): string {
  return formatDecimalString(value, { minFraction: 2 });
}

const CURRENCY_SYMBOL: Record<string, string> = { VND: '₫', USD: '$', EUR: '€', SGD: 'S$', JPY: '¥', GBP: '£' };

/** { amount: "25000", currency: "VND" } → "25.000 ₫". */
export function formatMoney(money: { amount: string; currency: string } | null | undefined): string {
  if (!money) {
    return '—';
  }
  const symbol = CURRENCY_SYMBOL[money.currency] ?? money.currency;
  const minFraction = money.currency === 'VND' ? 0 : 2;
  return `${formatDecimalString(money.amount, { trimZeros: true, minFraction })} ${symbol}`;
}

/** Zero counts shown as an em dash in tables ("—") so the eye lands on what is there. */
export function formatCount(value: number): string {
  return value === 0 ? '—' : formatInt(value);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', DECIMAL)} MB`;
}
