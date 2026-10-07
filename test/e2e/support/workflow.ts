import { expect, type Page } from '@playwright/test';
import type { Actor, CourseDetail } from './fixtures';

export async function createProviderUI(actor: Actor) {
  const page = actor.page;
  await page.goto('/providers');
  await page.getByRole('button', { name: 'ลงทะเบียน Provider ใหม่', exact: true }).first().click();
  await page.getByLabel('ชื่อสถาบัน / ผู้ให้บริการ', { exact: false }).fill(actor.displayName);
  await page.getByLabel('URL Slug', { exact: false }).fill(actor.slug);
  await page.getByLabel('เว็บไซต์ทางการ', { exact: false }).fill('https://www.coursera.org');
  const response = page.waitForResponse((r) => r.url().endsWith('/api/v1/providers') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'ลงทะเบียน', exact: true }).click();
  const result = await response;
  expect(result.status(), await result.text()).toBe(201);
  await expect(page.getByRole('article', { name: actor.displayName, exact: true })).toContainText('รอการอนุมัติ');
  return result.json() as Promise<{ id: number; name: string }>;
}

export async function manageCourses(actor: Actor, providerName: string) {
  await actor.page.goto('/providers');
  await actor.page.getByRole('article', { name: providerName, exact: true })
    .getByRole('button', { name: 'จัดการคอร์สเรียน' }).click();
  await expect(actor.page.getByRole('heading', { name: `คอร์สเรียนของ ${providerName}` })).toBeVisible();
}

export async function createCourseUI(actor: Actor): Promise<CourseDetail> {
  const page = actor.page;
  await page.getByRole('button', { name: 'เพิ่มคอร์สใหม่', exact: true }).first().click();
  await page.getByLabel('ชื่อคอร์สเรียน', { exact: false }).fill(`Course ${actor.slug}`);
  await page.getByLabel('URL Slug', { exact: false }).fill(actor.slug);
  await page.getByLabel('แพลตฟอร์ม', { exact: false }).selectOption({ label: 'Coursera' });
  await page.getByLabel('ลิงก์คอร์สเรียน (URL)', { exact: false }).fill(`https://www.coursera.org/learn/${actor.slug}`);
  await page.getByLabel('ระดับความยาก', { exact: true }).selectOption('BEGINNER');
  await page.getByLabel('ภาษาที่ใช้สอน', { exact: true }).selectOption('THAI');
  await page.getByLabel('ระยะเวลาเรียน (ชั่วโมง)', { exact: true }).fill('8');
  await page.getByLabel('รูปแบบราคา', { exact: true }).selectOption('FREE');
  await page.getByRole('button', { name: 'Computer Science & Programming', exact: true }).click();
  await page.getByLabel('คำอธิบายคอร์สเรียน', { exact: true }).fill('Learn programming end to end');
  const response = page.waitForResponse((r) => /\/api\/v1\/providers\/\d+\/courses$/.test(r.url()) && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'สร้างคอร์สดราฟต์', exact: true }).click();
  const result = await response;
  expect(result.status(), await result.text()).toBe(201);
  const course = await result.json() as CourseDetail;
  await expect(page.getByRole('article', { name: course.title, exact: true })).toContainText('แบบร่าง (Draft)');
  return course;
}

export async function submitCourseUI(page: Page, title: string) {
  const response = page.waitForResponse((r) => /\/api\/v1\/courses\/\d+\/submissions$/.test(r.url()) && r.request().method() === 'POST');
  await page.getByRole('article', { name: title, exact: true }).getByRole('button', { name: 'ส่งตรวจ', exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole('article', { name: title, exact: true })).toContainText('รอตรวจสอบ (Pending)');
}

export async function decideCourseUI(page: Page, title: string, action: 'อนุมัติเผยแพร่' | 'ขอให้แก้ไข', reason?: string) {
  await page.goto('/admin');
  const row = page.getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  if (reason) await row.getByLabel(`เหตุผลสำหรับคอร์ส ${title}`, { exact: true }).fill(reason);
  const response = page.waitForResponse((r) => /\/api\/v1\/admin\/courses\/\d+\/moderation-decisions$/.test(r.url()) && r.request().method() === 'POST');
  await row.getByRole('button', { name: action, exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(row).toHaveCount(0);
}

export async function searchCourse(page: Page, title: string, visible: boolean) {
  await page.goto('/courses');
  const response = page.waitForResponse((r) => {
    const url = new URL(r.url());
    return url.pathname === '/api/v1/courses' && url.searchParams.get('q') === title;
  });
  await page.getByLabel('ค้นหาคอร์ส', { exact: true }).fill(title);
  expect((await response).status()).toBe(200);
  const row = page.getByRole('article', { name: title, exact: true });
  if (visible) await expect(row).toBeVisible();
  else await expect(row).toHaveCount(0);
  return row;
}
