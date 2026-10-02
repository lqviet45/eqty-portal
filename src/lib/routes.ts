import type { CompanyRole } from '@/lib/api/types';

// A static export has no dynamic path segments, so the company travels as ?c=<companyId>.
export const ROUTES = {
  dashboard: '/dashboard/',
  capTable: '/cap-table/',
  newGrant: '/grants/new/',
  stakeholders: '/stakeholders/',
  transactions: '/transactions/',
  equity: '/equity/',
  ledger: '/ledger/',
  import: '/import/',
  members: '/members/',
  settings: '/settings/',
  portfolio: '/portfolio/',
  monitor: '/monitor/',
} as const;

export type RouteKey = keyof typeof ROUTES;

export const PICKER_PATH = '/companies/';
/** The picker without auto-opening a lone company: for the explicit "switch company" action. */
export const CHOOSE_PATH = '/companies/?choose=1';
export const NEW_COMPANY_PATH = '/companies/new/';

export function companyHref(
  route: RouteKey,
  companyId: string,
  params: Record<string, string | null | undefined> = {},
): string {
  const search = new URLSearchParams({ c: companyId });
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  return `${ROUTES[route]}?${search.toString()}`;
}

/** Screens a company role decides. The monitoring screen is not one of them: it follows the platform-admin role of the account. */
export type CompanyRoute = Exclude<RouteKey, 'monitor'>;

const ADMINS: CompanyRole[] = ['OWNER', 'ADMIN'];
const LEDGER_READERS: CompanyRole[] = ['OWNER', 'ADMIN', 'VIEWER'];
const EVERYONE: CompanyRole[] = ['OWNER', 'ADMIN', 'VIEWER', 'EMPLOYEE'];

/** Which roles see which screen. Mirrors AccessPolicy in the API, which enforces it; this only hides what would be refused. */
export const ROUTE_ROLES: Record<CompanyRoute, readonly CompanyRole[]> = {
  dashboard: LEDGER_READERS,
  capTable: LEDGER_READERS,
  stakeholders: LEDGER_READERS,
  equity: LEDGER_READERS,
  ledger: LEDGER_READERS,
  newGrant: ADMINS,
  transactions: ADMINS,
  import: ADMINS,
  members: ADMINS,
  settings: ADMINS,
  portfolio: EVERYONE,
};

export function homeRouteOf(role: CompanyRole): RouteKey {
  return role === 'EMPLOYEE' ? 'portfolio' : 'dashboard';
}

/** Only same-app paths are followed after sign-in: a crafted state must not become an open redirect. */
export function safeReturnTo(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }
  return value;
}
