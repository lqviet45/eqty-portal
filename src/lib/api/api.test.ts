import { describe, expect, it } from 'vitest';
import { buildQuery, fileNameOf, quoteEtag } from './client';
import { ApiError, fieldErrorsOf, pointerPath, problemFromResponse } from './errors';
import { IdempotencyKeys, newIdempotencyKey } from './idempotency';

describe('query strings', () => {
  it('skips empty values and encodes the rest', () => {
    expect(buildQuery({ q: 'nguyễn văn', relationship: undefined, employment: '', asOfDate: '2026-10-01', n: 0 })).toBe(
      '?q=nguy%E1%BB%85n+v%C4%83n&asOfDate=2026-10-01&n=0',
    );
    expect(buildQuery({})).toBe('');
    expect(buildQuery(undefined)).toBe('');
  });

  it('quotes the ledger version for If-Match', () => {
    expect(quoteEtag(13)).toBe('"13"');
  });
});

describe('Content-Disposition', () => {
  it('reads plain and RFC 5987 file names', () => {
    expect(fileNameOf('attachment; filename=cap-table_2026-10-01_v13.xlsx')).toBe('cap-table_2026-10-01_v13.xlsx');
    expect(fileNameOf('attachment; filename="a b.xlsx"')).toBe('a b.xlsx');
    expect(fileNameOf("attachment; filename*=UTF-8''c%E1%BA%A5p.xlsx")).toBe('cấp.xlsx');
    expect(fileNameOf(null)).toBeNull();
  });
});

describe('problem+json', () => {
  it('reads code, detail, trace id and field errors', async () => {
    const response = new Response(
      JSON.stringify({
        type: 'urn:eqty:problem:rule-violation',
        title: 'The request breaks a business rule.',
        status: 422,
        detail: 'Pool is over-allocated.',
        code: 'POOL_EXHAUSTED',
        traceId: '00-abc-01',
        errors: [{ pointer: '#/vesting/cliffMonths', parameter: null, code: 'INVALID_VESTING_TERMS', detail: 'Cliff too long.' }],
      }),
      { status: 422, headers: { 'content-type': 'application/problem+json' } },
    );
    const error = await problemFromResponse(response);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.code).toBe('POOL_EXHAUSTED');
    expect(error.traceId).toBe('00-abc-01');
    expect(error.message).toBe('Pool is over-allocated.');
    expect(fieldErrorsOf(error)).toEqual({ 'vesting.cliffMonths': 'Cliff too long.' });
  });

  it('falls back to a generic problem for non-JSON answers', async () => {
    const error = await problemFromResponse(new Response('<html>bad gateway</html>', { status: 502 }));
    expect(error.code).toBe('SERVER_ERROR');
    expect(error.outcomeUnknown).toBe(true);
  });

  it('keeps Retry-After of a rate-limited call', async () => {
    const error = await problemFromResponse(
      new Response(JSON.stringify({ status: 429, code: 'RATE_LIMITED' }), { status: 429, headers: { 'retry-after': '30' } }),
    );
    expect(error.code).toBe('RATE_LIMITED');
    expect(error.retryAfterSeconds).toBe(30);
    expect(error.outcomeUnknown).toBe(false);
  });

  it('maps JSON pointers to form field paths', () => {
    expect(pointerPath('#/quantity')).toBe('quantity');
    expect(pointerPath('#/pricePerShare/amount')).toBe('pricePerShare.amount');
    expect(pointerPath('#/a~1b')).toBe('a/b');
    expect(pointerPath(null)).toBeNull();
    expect(pointerPath('#/')).toBeNull();
  });
});

describe('Idempotency-Key', () => {
  it('makes distinct visible-ASCII keys', () => {
    const a = newIdempotencyKey();
    expect(a).toMatch(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
    expect(newIdempotencyKey()).not.toBe(a);
  });

  it('reuses the key for the same body until the attempt is settled', () => {
    const keys = new IdempotencyKeys();
    const body = { quantity: 10 };
    const first = keys.next(body);
    expect(keys.next({ quantity: 10 })).toBe(first); // retry after a lost response
    expect(keys.next({ quantity: 11 })).not.toBe(first); // different intent
    const third = keys.next({ quantity: 11 });
    keys.settle();
    expect(keys.next({ quantity: 11 })).not.toBe(third);
  });
});
