/** A fresh Idempotency-Key per user intent (IETF idempotency-key header draft: 1–200 visible ASCII). */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Keeps one key for one user intent. Pressing "save" again after a lost response must reuse the key (the
 * server then replays the first result instead of writing twice); a different body or a clean rejection
 * is a new intent and gets a new key.
 */
export class IdempotencyKeys {
  private key: string | null = null;
  private fingerprint: string | null = null;

  /** Key to send for this body: the previous one only while an earlier attempt's outcome is unknown. */
  next(body: unknown): string {
    const fingerprint = JSON.stringify(body ?? null);
    if (this.key === null || this.fingerprint !== fingerprint) {
      this.key = newIdempotencyKey();
      this.fingerprint = fingerprint;
    }
    return this.key;
  }

  /** The attempt ended with an answer (success or a clean rejection): the next attempt is a new intent. */
  settle(): void {
    this.key = null;
    this.fingerprint = null;
  }
}
