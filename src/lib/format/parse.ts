// Turns what a person typed into what the API takes. Both return null for input that is not a clean number,
// so a form can leave the field empty in the request and let the server's check say what is missing.

import { formatDecimalString, formatInt } from './number';

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

// Plain digits, or groups of exactly three after the first with one separator used throughout.
const WHOLE_NUMBER = /^(?:\d+|\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+|\d{1,3}(?: \d{3})+)$/;

/**
 * "1.000.000", "1,000,000", "1 000 000" or "1000000" → 1000000. Whole numbers only: anything that is not
 * a clean grouping ("1.5", "12.34") is null, because dropping its separators would silently change the
 * quantity ("1.5" would become 15).
 */
export function parseWholeNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!WHOLE_NUMBER.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed.replace(/[\s.,]/g, ''));
  return Number.isSafeInteger(value) && value <= MAX_SAFE ? value : null;
}

/**
 * Money typed the Vietnamese way ("25.000" = twenty-five thousand, "25,5" = 25.5) → decimal string "25000"
 * / "25.5" for the API. A lone "." followed by a group that is not exactly three digits is read as a
 * decimal point, so "25.5" still means 25.5.
 */
export function parseDecimalAmount(text: string): string | null {
  const value = text.replace(/\s/g, '');
  if (value === '') {
    return null;
  }

  let whole: string;
  let fraction = '';
  if (value.includes(',')) {
    const parts = value.split(',');
    if (parts.length !== 2) {
      return null;
    }
    whole = (parts[0] ?? '').replaceAll('.', '');
    fraction = parts[1] ?? '';
  } else if (value.includes('.')) {
    const parts = value.split('.');
    const rest = parts.slice(1);
    const groupedThousands = rest.every((p) => p.length === 3) && (parts[0] ?? '') !== '0' && (parts[0] ?? '') !== '';
    if (groupedThousands) {
      whole = parts.join('');
    } else if (parts.length === 2) {
      whole = parts[0] ?? '';
      fraction = parts[1] ?? '';
    } else {
      return null;
    }
  } else {
    whole = value;
  }

  if (!/^\d+$/.test(whole) || (fraction !== '' && !/^\d{1,6}$/.test(fraction))) {
    return null;
  }
  const normalized = whole.replace(/^0+(?=\d)/, '');
  return fraction === '' ? normalized : `${normalized}.${fraction}`;
}

/**
 * What a quantity box shows once the person leaves it: "1000000" → "1.000.000". Text that is not a clean
 * number is left alone so the field's error still points at what was typed.
 */
export function groupWholeInput(text: string): string {
  const value = parseWholeNumber(text);
  return value === null ? text : formatInt(value);
}

/** Same for money: "25000,5" → "25.000,5". Reads back to the same amount through parseDecimalAmount. */
export function groupDecimalInput(text: string): string {
  const amount = parseDecimalAmount(text);
  return amount === null ? text : formatDecimalString(amount);
}
