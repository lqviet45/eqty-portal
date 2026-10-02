import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { apiPost, FOUNDER, signIn } from './helpers';

// Needs the Worker: validation runs in the background and the screen polls for the answer.
test('an unfilled Excel template is rejected with problems listed by sheet', async ({ page }) => {
  await signIn(page, FOUNDER);
  const company = await apiPost<{ id: string }>(page, '/api/v1/companies', {
    name: `Công ty Nhập ${Date.now().toString(36)}`,
    entityType: 'JOINT_STOCK_COMPANY',
    currency: 'VND',
    incorporationDate: null,
  });
  await page.goto(`/import/?c=${company.id}`);
  await expect(page.getByText('Chưa có file')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/30-import-ready.png', fullPage: true });

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Tải template/ }).click();
  const template = await download;
  const path = await template.path();
  expect(template.suggestedFilename()).toMatch(/\.xlsx$/);
  expect(readFileSync(path).subarray(0, 2).toString()).toBe('PK'); // an .xlsx is a zip

  await page.locator('#import-file').setInputFiles({
    name: 'so-lieu-dau-ky.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: readFileSync(path),
  });
  await expect(page.getByText(/File có \d+ lỗi/)).toBeVisible({ timeout: 45_000 });
  await page.screenshot({ path: 'test-results/screens/31-import-rejected.png', fullPage: true });
});
