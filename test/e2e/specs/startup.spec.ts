import { test, expect } from '@playwright/test';

test('cold start keeps Home visible and retries through the frontend origin', async ({ page }) => {
  let attempts = 0;
  let ready = false;
  await page.route('**/api/v1/system/liveness', async (route) => {
    attempts++;
    await route.fulfill({ status: ready ? 200 : 503, json: { status: 'UP' } });
  });
  const unavailable = page.waitForResponse((response) => response.url().endsWith('/api/v1/system/liveness') && response.status() === 503);
  await page.goto('/');
  await unavailable;
  await expect(page.getByRole('heading', { name: 'คอร์สที่ใช่ เริ่มต้นได้ที่นี่' })).toBeVisible();
  await expect(page.getByText('การเปิดใช้งานครั้งแรกอาจใช้เวลา 2–3 นาที กรุณารอสักครู่')).toBeVisible();
  ready = true;
  await expect(page.getByRole('link', { name: 'เข้าสู่ระบบ', exact: true })).toBeVisible();
  expect(attempts).toBeGreaterThanOrEqual(2);
});

test('retry recovers a protected deep link after an immediate startup error', async ({ page }) => {
  let attempts = 0;
  let ready = false;
  await page.route('**/api/v1/system/liveness', async (route) => {
    attempts++;
    await route.fulfill({ status: ready ? 200 : 403, json: { status: 'UP' } });
  });
  await page.goto('/profile?from=retry');
  await expect(page).toHaveURL(/\/profile\?from=retry$/);
  await expect(page.getByRole('button', { name: 'ลองใหม่' })).toBeVisible();
  ready = true;
  await page.getByRole('button', { name: 'ลองใหม่' }).click();
  await expect(page.getByRole('heading', { name: 'ยินดีต้อนรับกลับ' })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  expect(attempts).toBeGreaterThanOrEqual(2);
});
