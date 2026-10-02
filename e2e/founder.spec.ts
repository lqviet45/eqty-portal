import { expect, test, type Page } from '@playwright/test';
import { FOUNDER, signIn } from './helpers';

// One company is built up screen by screen, the way a founder would, against the real API.
test.describe.configure({ mode: 'serial' });

const COMPANY = `Công ty Mẫu ${Date.now().toString(36)}`;

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/screens/${name}.png`, fullPage: true });
}

async function nav(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name, exact: true }).click();
}

test('founder creates a company and builds its ledger', async ({ page }) => {
  await signIn(page, FOUNDER);

  // --- create the company
  await page.goto('/companies/new/'); // a founder may already have companies from earlier runs
  await page.getByLabel('Tên công ty').fill(COMPANY);
  await page.getByRole('button', { name: 'Tạo công ty' }).click();
  await expect(page.getByRole('heading', { name: COMPANY })).toBeVisible();
  await shot(page, '01-dashboard-empty');

  // --- share class
  await nav(page, 'Quỹ ESOP & lớp CP');
  await page.getByRole('button', { name: 'Tạo lớp cổ phần' }).first().click();
  await page.getByLabel('Tên lớp').fill('Phổ thông');
  await page.getByLabel('Số được phép phát hành').fill('2.000.000');
  await expect(page.getByRole('button', { name: 'Tạo lớp', exact: true })).toBeEnabled();
  await shot(page, '02-new-class');
  await page.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Phổ thông', exact: true }).first()).toBeVisible();

  // --- pool
  await page.getByRole('button', { name: 'Tạo quỹ ESOP' }).first().click();
  await page.getByLabel('Tên quỹ').fill('ESOP 2025');
  await page.getByLabel('Lớp cổ phần').selectOption({ label: 'Phổ thông' });
  await page.getByLabel('Quy mô').fill('150.000');
  await expect(page.getByRole('button', { name: 'Tạo quỹ', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Tạo quỹ', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'ESOP 2025' })).toBeVisible();
  await shot(page, '03-equity');

  // --- stakeholders
  await nav(page, 'Cổ đông');
  for (const [name, relationship] of [
    ['Founder A', 'Founder'],
    ['Founder B', 'Founder'],
    ['Nhân viên 1', 'Nhân viên'],
  ] as const) {
    await page.getByRole('button', { name: 'Thêm cổ đông' }).first().click();
    await page.getByLabel('Tên hiển thị').fill(name);
    await page.getByLabel('Quan hệ với công ty').selectOption({ label: relationship });
    await page.locator('aside').getByRole('button', { name: 'Thêm cổ đông' }).click();
    await expect(page.getByRole('cell', { name: new RegExp(name) })).toBeVisible();
  }
  await shot(page, '04-stakeholders');

  // --- transactions: issue, issue, transfer, price
  await nav(page, 'Giao dịch');
  const submit = (name: string) => page.getByRole('button', { name, exact: true });
  await page.getByRole('tab', { name: 'Phát hành' }).click();
  await page.getByLabel('Người nhận').selectOption({ label: 'Founder A' });
  await page.getByLabel('Lớp cổ phần').selectOption({ index: 1 });
  await page.getByLabel('Số lượng cổ phần').fill('500.000');
  await expect(submit('Ghi nhận phát hành')).toBeEnabled();
  await shot(page, '05-transaction-issue');
  await submit('Ghi nhận phát hành').click();
  await expect(page.getByText('Đã ghi vào sổ cái.')).toBeVisible();

  await page.getByLabel('Người nhận').selectOption({ label: 'Founder B' });
  await page.getByLabel('Số lượng cổ phần').fill('250.000');
  await expect(submit('Ghi nhận phát hành')).toBeEnabled();
  await submit('Ghi nhận phát hành').click();

  await page.getByRole('tab', { name: 'Chuyển nhượng' }).click();
  await page.getByLabel('Bên chuyển').selectOption({ index: 2 }); // Founder B holds shares
  await page.getByLabel('Bên nhận').selectOption({ label: 'Nhân viên 1' });
  await page.getByLabel('Lớp cổ phần').selectOption({ index: 1 });
  await page.getByLabel('Số lượng cổ phần').fill('10.000');
  await expect(submit('Ghi nhận chuyển nhượng')).toBeEnabled();
  await shot(page, '06-transaction-transfer');
  await submit('Ghi nhận chuyển nhượng').click();

  await page.getByRole('tab', { name: 'Giá cổ phần' }).click();
  await page.getByLabel(/Giá mỗi cổ phần/).fill('25.000');
  await expect(submit('Ghi nhận giá')).toBeEnabled();
  await submit('Ghi nhận giá').click();

  // --- a rule rejects an impossible issue before anything is written
  await page.getByRole('tab', { name: 'Phát hành' }).click();
  await page.getByLabel('Người nhận').selectOption({ label: 'Founder A' });
  await page.getByLabel('Lớp cổ phần').selectOption({ index: 1 });
  await page.getByLabel('Số lượng cổ phần').fill('9.999.999');
  await expect(page.getByText('AUTHORIZED_SHARES_EXCEEDED').first()).toBeVisible();
  await expect(submit('Ghi nhận phát hành')).toBeDisabled();
  await shot(page, '07-transaction-rejected');

  // --- grant
  await nav(page, 'Quỹ ESOP & lớp CP');
  await page.getByRole('link', { name: 'Cấp grant' }).first().click();
  const recipient = await page.locator('select option', { hasText: 'Nhân viên 1' }).first().getAttribute('value');
  await page.getByLabel('Người nhận').selectOption(recipient ?? '');
  await page.getByLabel('Số lượng').fill('10.000');
  await page.getByLabel(/Giá thực hiện/).fill('5.000');
  await expect(page.getByRole('button', { name: 'Cấp grant', exact: true })).toBeEnabled();
  await shot(page, '08-new-grant');
  await page.getByRole('button', { name: 'Cấp grant', exact: true }).click();
  await expect(page.getByRole('heading', { name: COMPANY })).toBeVisible();
  await expect(page.getByText('750.000').first()).toBeVisible();
  await shot(page, '09-dashboard');

  // --- cap table
  await nav(page, 'Cap table');
  await expect(page.getByRole('cell', { name: 'Founder A' })).toBeVisible();
  await shot(page, '10-cap-table');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất Excel' }).click();
  expect((await download).suggestedFilename()).toMatch(/^cap-table_.*\.xlsx$/);

  // --- ledger: void the recorded price
  await nav(page, 'Nhật ký sổ cái');
  await page
    .getByRole('button', { name: /Xem bút toán/ })
    .first()
    .click();
  await shot(page, '11-ledger');

  // --- settings
  await nav(page, 'Cài đặt');
  await page.getByLabel('Tên công ty').fill(`${COMPANY} (đổi tên)`);
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByText('Đã lưu cài đặt.')).toBeVisible();
  await shot(page, '12-settings');

  // --- members & import screens render for an owner
  await nav(page, 'Thành viên');
  await expect(page.getByRole('heading', { name: 'Thành viên', exact: true })).toBeVisible();
  await shot(page, '13-members');
  await nav(page, 'Nhập từ Excel');
  await expect(page.getByText('Công ty đã có dữ liệu')).toBeVisible();
  await shot(page, '14-import-not-empty');
});
