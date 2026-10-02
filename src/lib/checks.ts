import { pointerPath } from '@/lib/api/errors';
import type { PreviewCheck } from '@/lib/api/types';

/** Failed checks that point at a form field → message, so the field can be outlined and explained. */
export function failedFieldErrors(checks: readonly PreviewCheck[] | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const check of checks ?? []) {
    const key = check.status === 'FAILED' ? pointerPath(check.pointer) : null;
    if (key && !(key in result)) {
      result[key] = check.detail;
    }
  }
  return result;
}

/** A field-level message from an array of sources, first non-empty wins (path may match its parent: "pricePerShare.amount" → "pricePerShare"). */
export function errorFor(field: string, ...sources: Record<string, string>[]): string | undefined {
  for (const source of sources) {
    const hit = source[field] ?? Object.entries(source).find(([key]) => key.startsWith(`${field}.`))?.[1];
    if (hit) {
      return hit;
    }
  }
  return undefined;
}
