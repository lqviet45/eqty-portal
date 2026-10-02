import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { EMPLOYEE, FOUNDER, seedCompany, signIn } from './helpers';

// Needs the Worker (sends the invitation email) and an SMTP sink writing .eml files to EQTY_MAIL_DIR.
const MAIL_DIR = process.env.EQTY_MAIL_DIR;
test.skip(!MAIL_DIR, 'EQTY_MAIL_DIR (directory the SMTP sink writes to) is not set');

/** Quoted-printable → text, enough to read the link out of the email. */
function decodeQuotedPrintable(text: string): string {
  return text
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
}

async function inviteLinkFor(email: string, since: number): Promise<string> {
  const dir = MAIL_DIR as string;
  for (let attempt = 0; attempt < 40; attempt++) {
    const file = readdirSync(dir)
      .filter((f) => f.endsWith(`-${email}.eml`) && Number(f.split('-')[0]) >= since)
      .sort()
      .at(-1);
    if (file) {
      const match = /https?:\/\/[^\s"<>]+\/invite\?companyId=[^\s"<>]+/.exec(
        decodeQuotedPrintable(readFileSync(join(dir, file), 'utf8')),
      );
      if (match) {
        return match[0].replace(/&amp;/g, '&');
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No invitation email for ${email} arrived in ${dir}`);
}

test('an employee accepts an invitation, sees the portfolio and confirms the grant', async ({ page, browser }) => {
  await signIn(page, FOUNDER);
  const company = `Công ty Nhân viên ${Date.now().toString(36)}`;
  const { companyId } = await seedCompany(page, company, EMPLOYEE.user);

  // The founder invites the employee from the members screen.
  const since = Date.now();
  await page.goto(`/members/?c=${companyId}`);
  await page.getByLabel('Email').fill(EMPLOYEE.user);
  await page.getByLabel('Là cổ đông nào').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Gửi lời mời' }).click();
  await expect(page.getByText(`Đã gửi lời mời tới ${EMPLOYEE.user}`)).toBeVisible();
  await expect(page.getByText(`Lời mời đang chờ (1)`)).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/20-members-invited.png', fullPage: true });

  const link = await inviteLinkFor(EMPLOYEE.user, since);

  // The invitee opens the link in another browser, signed out: the preview needs no account.
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
  });
  const employee = await context.newPage();
  await employee.goto(link.replace(/^https?:\/\/[^/]+/, ''));
  await expect(employee.getByRole('heading', { name: new RegExp(`mời bạn tham gia ${company}`) })).toBeVisible();
  await expect(employee.getByText(EMPLOYEE.user).first()).toBeVisible();
  await employee.screenshot({ path: 'test-results/screens/21-invite-anonymous.png', fullPage: true });

  await employee.getByRole('button', { name: 'Tôi đã có tài khoản — Đăng nhập' }).click();
  await employee.locator('#username').fill(EMPLOYEE.user);
  await employee.locator('#password').fill(EMPLOYEE.password);
  await employee.locator('#kc-login').click();

  // Back on the invitation, now signed in: join.
  await employee.getByRole('button', { name: `Tham gia ${company}` }).click();
  await expect(employee.getByText('Đã vested tại')).toBeVisible();
  await expect(employee.getByText('Giá trị nội tại ước tính*').first()).toBeVisible();
  await employee.screenshot({ path: 'test-results/screens/22-portfolio.png', fullPage: true });

  // Confirm the grant.
  await employee.getByRole('button', { name: 'Xác nhận đã nhận grant' }).click();
  await expect(employee.getByText('Đã xác nhận grant.')).toBeVisible();
  await expect(employee.getByRole('button', { name: 'Xác nhận đã nhận grant' })).toHaveCount(0);

  // Schedule tab, and an employee cannot open an admin screen.
  await employee.getByRole('link', { name: 'Lịch' }).click();
  await expect(employee.getByText('Lịch vesting')).toBeVisible();
  await employee.goto(`/dashboard/?c=${companyId}`);
  await expect(employee.getByText('Bạn không có quyền xem màn này')).toBeVisible();
  await context.close();
});
