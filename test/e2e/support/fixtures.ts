import { test as base, expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { CourseDetail } from '../../../code/frontend/src/features/course/types';

export { expect };
export type { CourseDetail };

export function credentials(label: string) {
  const slug = `e2e-${label}-${randomUUID().slice(0, 8)}`;
  return { slug, displayName: slug, email: `${slug}@example.test`, password: 'E2e-password-2026!' };
}

export type Actor = ReturnType<typeof credentials> & {
  id: number;
  context: BrowserContext;
  page: Page;
};

export async function mutate(request: APIRequestContext, method: string, path: string, data?: unknown) {
  const csrf = await request.get('/api/v1/auth/csrf');
  expect(csrf.status()).toBe(200);
  const { token } = await csrf.json();
  return request.fetch(path, { method, data, headers: { 'X-XSRF-TOKEN': token } });
}

export async function jsonMutation<T>(actor: Actor, method: string, path: string, data: unknown = undefined, status = 200): Promise<T> {
  const response = await mutate(actor.context.request, method, path, data);
  expect(response.status(), await response.text()).toBe(status);
  return response.json() as Promise<T>;
}

export async function loginUI(actor: Actor, destination = '/') {
  await actor.page.goto('/login');
  await actor.page.getByLabel('อีเมล', { exact: true }).fill(actor.email);
  await actor.page.getByLabel('รหัสผ่าน', { exact: true }).fill(actor.password);
  const response = actor.page.waitForResponse((r) => r.url().endsWith('/api/v1/auth/login') && r.request().method() === 'POST');
  await actor.page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(actor.page.getByRole('button', { name: 'ออกจากระบบ' })).toBeVisible();
  if (destination !== '/') await actor.page.goto(destination);
}

export async function loginAPI(actor: Actor) {
  await jsonMutation(actor, 'POST', '/api/v1/auth/login', { email: actor.email, password: actor.password });
}

export async function getCourse(actor: Actor, id: number): Promise<CourseDetail> {
  const response = await actor.context.request.get(`/api/v1/courses/${id}`);
  expect(response.status()).toBe(200);
  return response.json();
}

type Actors = { admin: Actor; provider: Actor; learner: Actor; other: Actor };

export const test = base.extend<{ actors: Actors }>({
  actors: async ({ browser, baseURL }, use, testInfo) => {
    const project = process.env.COURSEHUB_E2E_PROJECT;
    if (!project || !/^coursehub-e2e-[a-f0-9]{8}$/.test(project)) {
      throw new Error('Run E2E through npm run test:e2e so the isolated database is available');
    }
    const contexts: BrowserContext[] = [];
    const actors = {} as Actors;
    try {
      for (const label of ['admin', 'provider', 'learner', 'other'] as const) {
        const context = await browser.newContext({
          baseURL, recordVideo: { dir: testInfo.outputPath('videos') },
        });
        contexts.push(context);
        const account = credentials(label);
        const response = await mutate(context.request, 'POST', '/api/v1/auth/register', account);
        expect(response.status(), await response.text()).toBe(201);
        const user = await response.json();
        actors[label] = { ...account, id: user.id, context, page: await context.newPage() };
        const logout = await mutate(context.request, 'POST', '/api/v1/auth/logout');
        expect(logout.status()).toBe(204);
      }
      const id = actors.admin.id;
      if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Invalid fixture admin ID');
      // This fixed database and randomly named Compose project belong only to this E2E run.
      execFileSync('docker', [
        'compose', '-f', fileURLToPath(new URL('../compose.yml', import.meta.url)), '-p', project,
        'exec', '-T', 'postgres', 'psql', '-U', 'e2e', '-d', 'coursehub_e2e', '-v', 'ON_ERROR_STOP=1',
        '-c', `UPDATE users SET role = 'ADMIN' WHERE id = ${id};`,
      ], { stdio: 'pipe' });
      await use(actors);
    } finally {
      const failed = testInfo.status !== testInfo.expectedStatus;
      for (const [label, actor] of Object.entries(actors)) {
        if (failed) {
          const screenshot = testInfo.outputPath(`${label}.png`);
          await actor.page.screenshot({ path: screenshot, fullPage: true });
          await testInfo.attach(`${label} screenshot`, { path: screenshot, contentType: 'image/png' });
        }
      }
      await Promise.all(contexts.map((context) => context.close()));
      for (const [label, actor] of Object.entries(actors)) {
        const video = actor.page.video();
        if (video) {
          if (failed) await testInfo.attach(`${label} video`, { path: await video.path(), contentType: 'video/webm' });
          else await video.delete();
        }
      }
    }
  },
});

type Provider = { id: number; name: string; slug: string; status: string; version: number };

export async function prepareProvider(provider: Actor, admin: Actor): Promise<Provider> {
  await loginAPI(provider);
  await loginAPI(admin);
  const created = await jsonMutation<Provider>(provider, 'POST', '/api/v1/providers', {
    name: provider.displayName, slug: provider.slug, description: 'E2E fixture provider',
    websiteUrl: 'https://www.coursera.org',
  }, 201);
  const pending = await admin.context.request.get('/api/v1/admin/providers?status=PENDING');
  expect(pending.status()).toBe(200);
  const row = (await pending.json() as Provider[]).find((item) => item.id === created.id);
  expect(row).toBeDefined();
  return jsonMutation(admin, 'POST', `/api/v1/admin/providers/${created.id}/verification-decisions`, {
    decision: 'APPROVE', expectedVersion: row!.version,
  });
}

export async function prepareCourse(provider: Actor, admin: Actor, published = true): Promise<CourseDetail> {
  const institute = await prepareProvider(provider, admin);
  const options = await provider.context.request.get('/api/v1/catalog/platforms');
  expect(options.status()).toBe(200);
  const platforms = await options.json() as { id: number; slug: string }[];
  const categoriesResponse = await provider.context.request.get('/api/v1/catalog/categories');
  expect(categoriesResponse.status()).toBe(200);
  const categories = await categoriesResponse.json() as { id: number; slug: string }[];
  const course = await jsonMutation<CourseDetail>(provider, 'POST', `/api/v1/providers/${institute.id}/courses`, {
    title: `Course ${provider.slug}`, slug: provider.slug, description: 'Learn programming end to end',
    platformId: platforms.find((p) => p.slug === 'coursera')!.id,
    categoryIds: [categories.find((c) => c.slug === 'programming')!.id],
    url: `https://www.coursera.org/learn/${provider.slug}`,
    level: 'BEGINNER', language: 'THAI', effortHours: 8,
    paymentType: 'FREE', amount: 0, currency: 'THB',
  }, 201);
  if (!published) return course;
  const pending = await jsonMutation<CourseDetail>(provider, 'POST', `/api/v1/courses/${course.id}/submissions`);
  return jsonMutation(admin, 'POST', `/api/v1/admin/courses/${course.id}/moderation-decisions`, {
    decision: 'APPROVE', expectedVersion: pending.version,
  });
}
