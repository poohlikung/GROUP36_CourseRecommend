import { test, expect, loginAPI, loginUI, prepareCourse, getCourse, jsonMutation, mutate } from '../support/fixtures';
import type { AuditLogPage } from '../../../code/frontend/src/features/audit/types';

test('admin reads business audit history with filters, paging and deleted draft', async ({ actors }) => {
  test.setTimeout(180_000);
  const { admin, provider, learner, other } = actors;
  const published = await prepareCourse(provider, admin);
  await loginAPI(learner);
  await loginAPI(other);

  const add = await jsonMutation<{ id: number }>(provider, 'POST',
    `/api/v1/providers/${published.providerId}/members`, { email: other.email, memberRole: 'EDITOR' }, 201);
  await mutate(provider.context.request, 'DELETE', `/api/v1/providers/${published.providerId}/members/${add.id}`)
    .then((response) => expect(response.status()).toBe(204));

  const review = await jsonMutation<{ id: number; version: number }>(learner, 'POST',
    `/api/v1/courses/${published.id}/reviews`, {
      overallScore: 5, contentScore: 4, teachingScore: 5, difficultyScore: 2, body: 'เนื้อหาดี',
    }, 201);
  await jsonMutation(admin, 'POST', `/api/v1/admin/reviews/${review.id}/moderation-decisions`, {
    decision: 'REJECT', expectedVersion: review.version, reason: 'ตรวจสอบข้อความ',
  });
  await jsonMutation(admin, 'POST', `/api/v1/admin/courses/${published.id}/moderation-decisions`, {
    decision: 'SUSPEND', expectedVersion: (await getCourse(provider, published.id)).version,
    reason: 'ตรวจสอบลิงก์',
  });

  const platformsResponse = await provider.context.request.get('/api/v1/catalog/platforms');
  const platforms = await platformsResponse.json() as { id: number; slug: string }[];
  const platformId = platforms.find((entry) => entry.slug === 'coursera')!.id;
  const drafts: number[] = [];
  for (let i = 0; i < 11; i++) {
    const slug = `${provider.slug}-audit-${i}`;
    const draft = await jsonMutation<{ id: number }>(provider, 'POST',
      `/api/v1/providers/${published.providerId}/courses`, {
        title: `Audit ${i}`, slug, url: `https://www.coursera.org/learn/${slug}`, platformId,
      }, 201);
    drafts.push(draft.id);
  }
  const deleted = drafts[0];
  expect((await mutate(provider.context.request, 'DELETE', `/api/v1/courses/${deleted}`)).status()).toBe(204);
  expect((await provider.context.request.get(`/api/v1/courses/${deleted}`)).status()).toBe(404);

  const query = async (params: Record<string, string>) => {
    const response = await admin.context.request.get(`/api/v1/admin/audit-logs?${new URLSearchParams(params)}`);
    expect(response.status(), await response.text()).toBe(200);
    return response.json() as Promise<AuditLogPage>;
  };
  const courseHistory = await query({ entityType: 'COURSE', entityId: String(published.id) });
  expect(courseHistory.content.map((row) => row.action)).toEqual([
    'COURSE_SUSPEND', 'COURSE_APPROVE', 'COURSE_SUBMITTED', 'COURSE_CREATED',
  ]);
  expect(courseHistory.content.find((row) => row.action === 'COURSE_CREATED')).toMatchObject({
    actorId: provider.id, oldStatus: null, newStatus: 'DRAFT',
  });
  expect(courseHistory.content.find((row) => row.action === 'COURSE_APPROVE')).toMatchObject({
    actorId: admin.id, oldStatus: 'PENDING', newStatus: 'PUBLISHED',
  });
  const providerHistory = await query({ entityType: 'PROVIDER', entityId: String(published.providerId) });
  expect(providerHistory.content.map((row) => row.action)).toContain('PROVIDER_APPROVE');
  const byActor = await query({ actorId: String(provider.id), page: '0', size: '10' });
  expect(byActor.totalElements).toBeGreaterThan(10);
  expect(byActor.content).toHaveLength(10);
  const next = await query({ actorId: String(provider.id), page: '1', size: '10' });
  expect(next.content.length).toBeGreaterThan(0);
  expect(next.content[0].id).toBeLessThan(byActor.content[9].id);
  const deletedHistory = await query({ entityType: 'COURSE', entityId: String(deleted), actorId: String(provider.id) });
  expect(deletedHistory.content.map((row) => row.action)).toEqual(['COURSE_DELETED', 'COURSE_CREATED']);
  const memberHistory = await query({ entityType: 'PROVIDER_MEMBER', entityId: String(add.id) });
  expect(memberHistory.content.map((row) => row.action)).toEqual(['PROVIDER_MEMBER_REMOVED', 'PROVIDER_MEMBER_ADDED']);
  const reviewHistory = await query({ entityType: 'REVIEW', action: 'REVIEW_REJECT', entityId: String(review.id) });
  expect(reviewHistory.content[0].reason).toBe('ตรวจสอบข้อความ');
  const suspension = await query({ entityType: 'COURSE', action: 'COURSE_SUSPEND', entityId: String(published.id) });
  expect(suspension.content[0]).toMatchObject({ oldStatus: 'PUBLISHED', newStatus: 'SUSPENDED', reason: 'ตรวจสอบลิงก์', actorId: admin.id });
  const from = new Date(Date.parse(suspension.content[0].createdAt) - 1000).toISOString();
  const to = new Date(Date.parse(suspension.content[0].createdAt) + 1000).toISOString();
  expect((await query({ entityType: 'COURSE', action: 'COURSE_SUSPEND', entityId: String(published.id), from, to })).totalElements).toBe(1);

  await admin.page.goto('/admin/audit-logs');
  await expect(admin.page.getByRole('heading', { name: 'ประวัติการใช้งานระบบ' })).toBeVisible();
  await expect(admin.page.getByRole('link', { name: 'ประวัติระบบ' })).toBeVisible();
  await admin.page.getByLabel('ประเภทข้อมูล').selectOption('COURSE');
  await admin.page.getByLabel('กิจกรรม').selectOption('COURSE_SUSPEND');
  await admin.page.getByLabel('ID รายการ').fill(String(published.id));
  await admin.page.getByRole('button', { name: 'ค้นหา' }).click();
  await expect(admin.page.getByRole('heading', { name: 'ระงับคอร์ส' })).toBeVisible();
  await expect(admin.page.getByText('ตรวจสอบลิงก์')).toBeVisible();
  await admin.page.getByRole('button', { name: 'ล้างตัวกรอง' }).click();
  await expect(admin.page.getByRole('button', { name: 'หน้าถัดไป' })).toBeEnabled();
  await admin.page.getByRole('button', { name: 'หน้าถัดไป' }).click();
  await expect(admin.page.getByText('หน้า 2', { exact: true })).toBeVisible();

  await admin.page.setViewportSize({ width: 390, height: 844 });
  await expect(admin.page.getByRole('heading', { name: 'ประวัติการใช้งานระบบ' })).toBeVisible();
  expect(await admin.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await admin.page.getByRole('button', { name: 'เปิดเมนู' }).click();
  await expect(admin.page.getByRole('link', { name: 'ประวัติระบบ' })).toBeVisible();
  await admin.page.getByRole('button', { name: 'ปิดเมนู' }).click();
  await admin.page.getByLabel('ID ผู้กระทำ').focus();
  await admin.page.keyboard.type(String(admin.id));
  const keyboardSearch = admin.page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/v1/admin/audit-logs'
      && url.searchParams.get('actorId') === String(admin.id);
  });
  await admin.page.keyboard.press('Enter');
  expect((await keyboardSearch).status()).toBe(200);
});

test('learner cannot open audit route or API', async ({ actors }) => {
  const { learner } = actors;
  await loginUI(learner);
  await expect(learner.page.getByRole('link', { name: 'ประวัติระบบ' })).toHaveCount(0);
  await learner.page.goto('/admin/audit-logs');
  await expect(learner.page).toHaveURL('/');
  expect((await learner.context.request.get('/api/v1/admin/audit-logs')).status()).toBe(403);
});
