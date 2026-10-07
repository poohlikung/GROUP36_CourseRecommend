import { test, expect, loginUI, prepareCourse, getCourse, mutate, jsonMutation } from '../support/fixtures';
import { searchCourse } from '../support/workflow';

test('learner saves a course, refreshes it, keeps bookmarks private and removes it', async ({ actors }) => {
  const { provider, admin, learner, other } = actors;
  const course = await prepareCourse(provider, admin);
  await loginUI(learner);
  await loginUI(other, '/bookmarks');
  const card = await searchCourse(learner.page, course.title, true);
  await card.getByRole('button', { name: `บันทึก ${course.title}`, exact: true }).click();
  await expect(card.getByRole('button', { name: `ยกเลิกบันทึก ${course.title}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await learner.page.reload();
  await expect(learner.page.getByRole('button', { name: `ยกเลิกบันทึก ${course.title}`, exact: true })).toBeVisible();
  const duplicate = await mutate(learner.context.request, 'PUT', `/api/v1/me/bookmarks/${course.id}`);
  expect(duplicate.status()).toBe(204);
  const mine = await learner.context.request.get('/api/v1/me/bookmarks');
  expect((await mine.json()).totalElements).toBe(1);
  await other.page.reload();
  await expect(other.page.getByText('ยังไม่มีคอร์สที่บันทึกไว้', { exact: false })).toBeVisible();
  const theirs = await other.context.request.get('/api/v1/me/bookmarks');
  expect((await theirs.json()).totalElements).toBe(0);
  await learner.page.goto('/bookmarks');
  await expect(learner.page.getByRole('article', { name: course.title, exact: true })).toBeVisible();
  await learner.page.getByRole('button', { name: `ยกเลิกบันทึก ${course.title}`, exact: true }).click();
  await expect(learner.page.getByRole('article', { name: course.title, exact: true })).toHaveCount(0);
  await learner.page.reload();
  await expect(learner.page.getByText('ยังไม่มีคอร์สที่บันทึกไว้', { exact: false })).toBeVisible();
  expect((await (await learner.context.request.get('/api/v1/me/bookmarks')).json()).totalElements).toBe(0);
});

test('non-member cannot edit or submit provider courses and the stored draft remains unchanged', async ({ actors }) => {
  const { provider, admin, other } = actors;
  const course = await prepareCourse(provider, admin, false);
  await loginUI(other, '/providers');
  await expect(other.page.getByText('ยังไม่มี Provider ที่คุณดูแล', { exact: true })).toBeVisible();
  expect((await other.context.request.get(`/api/v1/providers/${course.providerId}/courses`)).status()).toBe(403);
  expect((await other.context.request.get(`/api/v1/courses/${course.id}`)).status()).toBe(404);
  const edit = await mutate(other.context.request, 'PUT', `/api/v1/courses/${course.id}`, {
    title: 'Unauthorized edit', slug: course.slug, url: course.url, platformId: course.platformId,
    level: course.level, language: course.language, description: 'Should not be stored',
  });
  expect(edit.status()).toBe(403);
  expect((await mutate(other.context.request, 'POST', `/api/v1/courses/${course.id}/submissions`)).status()).toBe(403);
  const unchanged = await getCourse(provider, course.id);
  expect(unchanged.title).toBe(course.title);
  expect(unchanged.description).toBe(course.description);
  expect(unchanged.status).toBe('DRAFT');
  expect(unchanged.version).toBe(course.version);
});

test('learner reviews through real API, admin approves or rejects through UI and catalog ratings follow published reviews', async ({ actors }) => {
  const { provider, admin, learner } = actors;
  const course = await prepareCourse(provider, admin);
  await loginUI(learner);
  const reviewBody = `Review ${learner.slug}`;
  const payload = { overallScore: 5, contentScore: 5, teachingScore: 4, difficultyScore: 2, body: reviewBody };
  const review = await jsonMutation<{ id: number; status: string }>(learner, 'POST', `/api/v1/courses/${course.id}/reviews`, payload, 201);
  expect(review.status).toBe('PENDING');
  expect((await mutate(learner.context.request, 'POST', `/api/v1/courses/${course.id}/reviews`, payload)).status()).toBe(409);
  let card = await searchCourse(learner.page, course.title, true);
  await expect(card).toContainText('ยังไม่มีรีวิว');
  const publicReviews = await learner.context.request.get(`/api/v1/courses/${course.id}/reviews`);
  expect((await publicReviews.json()).totalElements).toBe(0);

  await admin.page.goto('/admin');
  const region = admin.page.getByRole('region', { name: 'รีวิว', exact: true });
  let row = region.getByRole('article').filter({ hasText: reviewBody });
  await expect(row).toContainText(course.title);
  const approval = admin.page.waitForResponse((r) => r.url().endsWith(`/api/v1/admin/reviews/${review.id}/moderation-decisions`) && r.request().method() === 'POST');
  await row.getByRole('button', { name: 'อนุมัติรีวิว', exact: true }).click();
  expect((await approval).status()).toBe(200);
  await expect(row).toHaveCount(0);
  card = await searchCourse(learner.page, course.title, true);
  await expect(card).toContainText('★ 5.0 (1 รีวิว)');
  const published = await learner.context.request.get(`/api/v1/courses/${course.id}/reviews`);
  expect((await published.json()).content[0].body).toBe(reviewBody);

  const editedBody = `Edited ${learner.slug}`;
  const edited = await jsonMutation<{ status: string }>(learner, 'PUT', `/api/v1/courses/${course.id}/reviews/me`, {
    ...payload, overallScore: 2, body: editedBody,
  });
  expect(edited.status).toBe('PENDING');
  card = await searchCourse(learner.page, course.title, true);
  await expect(card).toContainText('ยังไม่มีรีวิว');
  await admin.page.reload();
  row = region.getByRole('article').filter({ hasText: editedBody });
  await expect(row.getByRole('button', { name: 'ปฏิเสธรีวิว', exact: true })).toBeDisabled();
  await row.getByLabel(`เหตุผลที่ปฏิเสธรีวิว ${review.id}`, { exact: true }).fill('เนื้อหาไม่เกี่ยวข้อง');
  const rejection = admin.page.waitForResponse((r) => r.url().endsWith(`/api/v1/admin/reviews/${review.id}/moderation-decisions`) && r.request().method() === 'POST');
  await row.getByRole('button', { name: 'ปฏิเสธรีวิว', exact: true }).click();
  expect((await rejection).status()).toBe(200);
  await expect(row).toHaveCount(0);
  await region.getByLabel('สถานะรีวิว', { exact: true }).selectOption('REJECTED');
  await expect(region.getByRole('article').filter({ hasText: editedBody })).toContainText('เนื้อหาไม่เกี่ยวข้อง');
  const ownReview = await learner.context.request.get(`/api/v1/courses/${course.id}/reviews/me`);
  const mine = await ownReview.json();
  expect(mine.status).toBe('REJECTED');
  expect(mine.moderationReason).toBe('เนื้อหาไม่เกี่ยวข้อง');
  await learner.page.reload();
  await expect(learner.page.getByRole('article', { name: course.title, exact: true })).toContainText('ยังไม่มีรีวิว');
  expect((await (await learner.context.request.get(`/api/v1/courses/${course.id}/reviews`)).json()).totalElements).toBe(0);
});
