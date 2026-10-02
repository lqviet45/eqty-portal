import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { ledgerVersionOf } from '@/lib/api/hooks';
import { errorFor, failedFieldErrors } from '@/lib/checks';
import { parseConfig } from '@/lib/config';
import { describeCode, describeError } from '@/lib/i18n';
import { describeEntry, groupOf } from '@/lib/ledger/describe';
import { ROUTE_ROLES, companyHref, homeRouteOf, safeReturnTo } from '@/lib/routes';
import { frequencyLabel, humanize, label } from '@/messages/enums';

describe('runtime config', () => {
  it('reads /config.json and drops a trailing slash of the API base', () => {
    expect(
      parseConfig({
        oidcAuthority: 'https://auth.x/realms/eqty',
        oidcClientId: 'eqty-portal',
        apiBaseUrl: 'https://api.x/',
      }),
    ).toEqual({
      oidcAuthority: 'https://auth.x/realms/eqty',
      oidcClientId: 'eqty-portal',
      apiBaseUrl: 'https://api.x',
    });
    expect(parseConfig({ oidcAuthority: 'a', oidcClientId: 'b' }).apiBaseUrl).toBe('');
  });

  it.each([null, 'x', {}, { oidcAuthority: 'a' }, { oidcAuthority: 'a', oidcClientId: 'b', apiBaseUrl: 3 }])(
    'rejects %j',
    (raw) => {
      expect(() => parseConfig(raw)).toThrow();
    },
  );
});

describe('routes', () => {
  it('carries the company in ?c=', () => {
    expect(companyHref('capTable', 'abc')).toBe('/cap-table/?c=abc');
    expect(companyHref('portfolio', 'abc', { s: 'x', v: undefined })).toBe('/portfolio/?c=abc&s=x');
  });

  it('sends employees to the portfolio and everyone else to the dashboard', () => {
    expect(homeRouteOf('EMPLOYEE')).toBe('portfolio');
    expect(homeRouteOf('VIEWER')).toBe('dashboard');
  });

  it('keeps write screens away from viewers and ledger screens away from employees', () => {
    expect(ROUTE_ROLES.transactions).not.toContain('VIEWER');
    expect(ROUTE_ROLES.members).toEqual(['OWNER', 'ADMIN']);
    expect(ROUTE_ROLES.dashboard).not.toContain('EMPLOYEE');
    expect(ROUTE_ROLES.portfolio).toContain('EMPLOYEE');
  });

  it('only follows in-app paths after sign-in', () => {
    expect(safeReturnTo('/invite/?companyId=1&token=2')).toBe('/invite/?companyId=1&token=2');
    expect(safeReturnTo('//evil.example')).toBe('/');
    expect(safeReturnTo('https://evil.example')).toBe('/');
    expect(safeReturnTo('/\\evil')).toBe('/');
    expect(safeReturnTo(undefined)).toBe('/');
  });
});

describe('preview checks', () => {
  const checks = [
    { code: 'POOL_SUFFICIENT', status: 'PASSED', detail: 'ok', pointer: '#/poolId' },
    { code: 'NEGATIVE_BALANCE', status: 'FAILED', detail: 'would go negative', pointer: '#/quantity' },
    { code: 'INVALID_PRICE', status: 'FAILED', detail: 'must be > 0', pointer: '#/pricePerShare/amount' },
    { code: 'INFO', status: 'INFO', detail: 'fyi', pointer: '#/note' },
  ] as const;

  it('maps only failed checks to their form field', () => {
    expect(failedFieldErrors(checks)).toEqual({ quantity: 'would go negative', 'pricePerShare.amount': 'must be > 0' });
    expect(failedFieldErrors(undefined)).toEqual({});
  });

  it('finds a message for a field, also from a nested pointer', () => {
    const errors = failedFieldErrors(checks);
    expect(errorFor('quantity', {}, errors)).toBe('would go negative');
    expect(errorFor('pricePerShare', errors)).toBe('must be > 0');
    expect(errorFor('poolId', errors)).toBeUndefined();
  });
});

describe('ledger entry sentences', () => {
  const party = (role: string, name: string) => ({ role, id: name, name }) as never;

  it('describes a transfer from the names the BFF resolved', () => {
    expect(
      describeEntry({
        type: 'SHARES_TRANSFERRED',
        parties: [party('FROM', 'Founder B'), party('TO', 'Angel Y')],
        quantity: 50_000,
        price: { amount: '20000', currency: 'VND' },
      }),
    ).toBe('Founder B → Angel Y · 50.000 cổ phần @ 20.000 ₫');
  });

  it('signs a pool resize and names grants', () => {
    expect(
      describeEntry({
        type: 'EQUITY_POOL_RESIZED',
        parties: [party('POOL', 'ESOP 2025')],
        quantity: -5_000,
        price: null,
      }),
    ).toBe('ESOP 2025: -5.000');
    expect(
      describeEntry({
        type: 'GRANT_ISSUED',
        parties: [party('RECIPIENT', 'Nhân viên 1')],
        quantity: 10_000,
        price: { amount: '5000', currency: 'VND' },
      }),
    ).toBe('Nhân viên 1 · 10.000 · giá thực hiện 5.000 ₫');
  });

  it('falls back to the party names for a type it does not know', () => {
    expect(
      describeEntry({
        type: 'SOMETHING_NEW',
        parties: [party('HOLDER', 'A'), party('POOL', 'B')],
        quantity: null,
        price: null,
      }),
    ).toBe('A, B');
  });

  it('groups types for badge colour', () => {
    expect(groupOf('SHARES_ISSUED')).toBe('shares');
    expect(groupOf('SHARE_PRICE_RECORDED')).toBe('price');
    expect(groupOf('ENTRY_VOIDED')).toBe('void');
    expect(groupOf('GRANT_ISSUED')).toBe('equity');
  });
});

describe('Vietnamese wording', () => {
  it('labels known codes and reads unknown ones', () => {
    expect(label({ A: 'Một' }, 'A')).toBe('Một');
    expect(label({ A: 'Một' }, 'SOME_NEW_CODE')).toBe('Some new code');
    expect(label({}, null)).toBe('—');
    expect(humanize('LEAVER_TYPE_RECORDED')).toBe('Leaver type recorded');
    expect(frequencyLabel(3)).toBe('Hàng quý');
    expect(frequencyLabel(2)).toBe('2 tháng một lần');
  });

  it('rewords API errors by code and keeps the server detail as secondary text', () => {
    const rule = new ApiError({
      status: 422,
      code: 'AUTHORIZED_SHARES_EXCEEDED',
      message: "'Common' would have 10899999 shares",
    });
    expect(describeError(rule)).toEqual({
      message: 'Vượt số cổ phần được phép',
      detail: "'Common' would have 10899999 shares",
      traceId: null,
    });

    const stale = new ApiError({ status: 412, code: 'PRECONDITION_FAILED', message: 'Precondition failed.' });
    expect(describeError(stale).message).toContain('Sổ cái vừa được người khác thay đổi');

    const limited = new ApiError({ status: 429, code: 'RATE_LIMITED', message: 'x', retryAfterSeconds: 30 });
    expect(describeError(limited).detail).toBe('Thử lại sau 30 giây.');

    expect(describeError(new Error('boom')).detail).toBe('boom');
    expect(describeCode('IMPORT_PROCESSING_FAILED')).toContain('Không có gì được ghi');
    expect(describeCode('WHATEVER')).toBe('WHATEVER');
  });
});

describe('ETag', () => {
  it('reads the ledger version out of quoted and weak ETags', () => {
    expect(ledgerVersionOf('"13"')).toBe(13);
    expect(ledgerVersionOf('W/"7"')).toBe(7);
    expect(ledgerVersionOf(null)).toBeNull();
    expect(ledgerVersionOf('abc')).toBeNull();
  });
});
