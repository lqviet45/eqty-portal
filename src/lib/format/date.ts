// Business dates are "YYYY-MM-DD" strings and are formatted by splitting the text: no Date object, so no
// time zone can shift a legal effective date by a day. Instants (recordedAt…) are shown in Vietnam time.

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-10-01" → "01/10/2026". */
export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const match = DATE_ONLY.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

/** "01/10/2026" typed by a person → "2026-10-01", or null when it is not a real date. */
export function parseDate(text: string): string | null {
  const match = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(text.trim());
  if (!match) {
    return null;
  }
  const [, d = '', m = '', y = ''] = match;
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return isRealDate(iso) ? iso : null;
}

export function isRealDate(iso: string): boolean {
  const match = DATE_ONLY.exec(iso);
  if (!match) {
    return false;
  }
  const [, y = '', m = '', d = ''] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return date.getUTCFullYear() === Number(y) && date.getUTCMonth() === Number(m) - 1 && date.getUTCDate() === Number(d);
}

const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: VN_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function partsOf(date: Date): Record<string, string> {
  return Object.fromEntries(dateTimeFormat.formatToParts(date).map((part) => [part.type, part.value]));
}

/** RFC 3339 instant → "01/10/2026 10:24" in Vietnam time (UTC+7). Built from parts: no locale pattern to trust. */
export function formatDateTime(instant: string | null | undefined): string {
  if (!instant) {
    return '—';
  }
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) {
    return instant;
  }
  const p = partsOf(date);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/** The Vietnamese calendar date of an instant, as "dd/MM/yyyy". */
export function formatInstantDate(instant: string | null | undefined): string {
  if (!instant) {
    return '—';
  }
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) {
    return instant;
  }
  const p = partsOf(date);
  return `${p.day}/${p.month}/${p.year}`;
}

/** Whole days from now to the instant (negative once past), for "còn 6 ngày". */
export function daysUntil(instant: string, now: Date = new Date()): number {
  return Math.ceil((new Date(instant).getTime() - now.getTime()) / 86_400_000);
}

/** Whole calendar months from one business date to another ("2025-09-01" → "2026-10-01" = 13); text only, no Date. */
export function monthsBetween(from: string, to: string): number | null {
  const a = DATE_ONLY.exec(from);
  const b = DATE_ONLY.exec(to);
  if (!a || !b) {
    return null;
  }
  return (Number(b[1]) - Number(a[1])) * 12 + (Number(b[2]) - Number(a[2]));
}
