import { test, expect, credentials, loginUI, mutate } from '../support/fixtures';

test('learner registers, keeps session on refresh, logs out and logs in again', async ({ page, context }) => {
  const account = credentials('registration');
  await page.goto('/register');
  await page.getByLabel('ชื่อที่แสดง', { exact: true }).fill(account.displayName);
  await page.getByLabel('อีเมล', { exact: true }).fill(account.email);
  await page.getByLabel(/^รหัสผ่าน/).fill(account.password);
  await page.getByLabel('ยืนยันรหัสผ่าน', { exact: true }).fill(account.password);
  const registration = page.waitForResponse((r) => r.url().endsWith('/api/v1/auth/register') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'สมัครสมาชิก', exact: true }).click();
  expect((await registration).status()).toBe(201);
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByLabel('ชื่อที่แสดง', { exact: true })).toHaveValue(account.displayName);
  await page.reload();
  await expect(page.getByLabel('อีเมล', { exact: true })).toHaveValue(account.email);
  await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await context.request.get('/api/v1/me')).status()).toBe(401);
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('อีเมล', { exact: true }).fill(account.email);
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill('wrong-password');
  const rejected = page.waitForResponse((r) => r.url().endsWith('/api/v1/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  expect((await rejected).status()).toBe(401);
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByLabel('ชื่อที่แสดง', { exact: true })).toHaveValue(account.displayName);
});

test('guest is redirected from all protected routes and API rejects unauthenticated access', async ({ page, request }) => {
  for (const route of ['/profile', '/providers', '/bookmarks', '/admin']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'ยินดีต้อนรับกลับ' })).toBeVisible();
  }
  expect((await request.get('/api/v1/me/bookmarks')).status()).toBe(401);
});

test('learner cannot enter admin UI or bypass admin and CSRF rules through API', async ({ actors }) => {
  await loginUI(actors.learner, '/admin');
  await expect(actors.learner.page).toHaveURL('http://localhost:15173/');
  await expect(actors.learner.page.getByRole('link', { name: 'งานตรวจ Admin' })).toHaveCount(0);
  expect((await actors.learner.context.request.get('/api/v1/admin/courses')).status()).toBe(403);
  const blocked = await mutate(actors.learner.context.request, 'POST', '/api/v1/admin/courses/1/moderation-decisions', {
    decision: 'APPROVE', expectedVersion: 0,
  });
  expect(blocked.status()).toBe(403);
  const noCsrf = await actors.learner.context.request.put('/api/v1/me/profile', {
    data: { displayName: 'Should not change', bio: '' },
  });
  expect(noCsrf.status()).toBe(403);
  const profile = await actors.learner.context.request.get('/api/v1/me/profile');
  expect((await profile.json()).displayName).toBe(actors.learner.displayName);
});
