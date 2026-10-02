import { expect, type Page } from '@playwright/test';

export const FOUNDER = { user: 'founder@example.com', password: 'dev-password-founder' };
export const EMPLOYEE = { user: 'employee@example.com', password: 'dev-password-employee' };

/** Signs in through the Keycloak login page (the realm ships two dev users, README "Chạy local"). */
export async function signIn(page: Page, who: { user: string; password: string }) {
  await page.goto('/');
  await page.waitForURL(/\/realms\/eqty\//);
  await page.locator('#username').fill(who.user);
  await page.locator('#password').fill(who.password);
  await page.locator('#kc-login').click();
  await expect(page).not.toHaveURL(/\/realms\/eqty\//);
  // The OIDC callback stores the session, then the app navigates on: wait for both.
  await page.waitForFunction(() => Object.keys(sessionStorage).some((key) => key.startsWith('oidc.user:')));
  await expect(page).not.toHaveURL(/\/auth\/callback/);
}

/** Today's date in Vietnam (UTC+7), the calendar the ledger uses. */
export function todayVn(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
}

/** Calls the API from the signed-in page with its own access token: fast set-up of data the test is not about. */
export async function apiPost<T = unknown>(page: Page, path: string, body: unknown): Promise<T> {
  return page.evaluate(
    async ({ path, body }) => {
      const entry = Object.keys(sessionStorage).find((key) => key.startsWith('oidc.user:'));
      const token = entry
        ? (JSON.parse(sessionStorage.getItem(entry) ?? '{}') as { access_token?: string }).access_token
        : undefined;
      const response = await fetch(path, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(`${path} → ${response.status} ${await response.text()}`);
      }
      return response.json();
    },
    { path, body },
  );
}

interface Created {
  id: string;
}

/** A company with one share class, an ESOP pool, an employee (linked by email) and one option grant. */
export async function seedCompany(page: Page, name: string, employeeEmail: string) {
  const date = '2025-08-01'; // before the grant: the ledger checks the whole timeline
  const company = await apiPost<Created>(page, '/api/v1/companies', {
    name,
    entityType: 'JOINT_STOCK_COMPANY',
    currency: 'VND',
    incorporationDate: null,
  });
  const base = `/api/v1/companies/${company.id}`;
  const shareClass = await apiPost<Created>(page, `${base}/share-classes`, {
    name: 'Phổ thông',
    kind: 'COMMON',
    votesPerShare: 1,
    authorizedShares: 2_000_000,
    effectiveDate: date,
  });
  const pool = await apiPost<Created>(page, `${base}/equity-pools`, {
    shareClassId: shareClass.id,
    name: 'ESOP 2025',
    size: 150_000,
    effectiveDate: date,
  });
  const employee = await apiPost<Created>(page, `${base}/stakeholders`, {
    kind: 'PERSON',
    displayName: 'Nhân viên A',
    email: employeeEmail,
    relationship: 'EMPLOYEE',
  });
  await apiPost(page, `${base}/grants`, {
    stakeholderId: employee.id,
    poolId: pool.id,
    awardType: 'OPTION',
    quantity: 10_000,
    strikePrice: { amount: '5000', currency: 'VND' },
    vesting: { startDate: '2025-09-01', cliffMonths: 12, durationMonths: 48, frequencyMonths: 1 },
    exerciseWindowDays: 90,
    grantDate: '2025-09-01',
  });
  await apiPost(page, `${base}/share-prices`, {
    pricePerShare: { amount: '25000', currency: 'VND' },
    source: 'FUNDING_ROUND',
    note: null,
    effectiveDate: '2025-09-01',
  });
  return { companyId: company.id, employeeId: employee.id };
}
