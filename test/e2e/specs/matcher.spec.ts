import { test, expect } from '../support/fixtures';
import type { Page } from '@playwright/test';

async function quiz(page: Page, category: string, level: string, language: string) {
  await page.goto('/match');
  await page.getByLabel('อยากเรียนเรื่องอะไร', { exact: true }).selectOption(category);
  await page.getByRole('button', { name: 'ถัดไป', exact: true }).click();
  await page.getByLabel('ระดับที่เหมาะกับคุณ', { exact: true }).selectOption(level);
  await page.getByLabel('ภาษาของคอร์ส', { exact: true }).selectOption(language);
  await page.getByRole('button', { name: 'ถัดไป', exact: true }).click();
  await page.getByLabel('งบประมาณสูงสุด (บาท)', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'ถัดไป', exact: true }).click();
  await page.getByLabel('มีเวลาเรียนกี่ชั่วโมงต่อสัปดาห์', { exact: true }).fill('5');
  const response = page.waitForResponse((r) => r.url().endsWith('/api/v1/course-matches') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'ดูผลแนะนำ', exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'ผลแนะนำคอร์ส', exact: true })).toBeVisible();
  return result.json();
}

test('guest matcher uses real CSRF and shows eligible seeded course, score and ranking reasons', async ({ page }) => {
  const result = await quiz(page, 'data-science-ai', 'BEGINNER', 'THAI');
  expect(result.matches).toHaveLength(1);
  const match = result.matches[0];
  expect(match.course.title).toBe('Data Analytics and Python for Everyone');
  expect(match.course.level).toBe('BEGINNER');
  expect(match.course.language).toBe('THAI');
  expect(match.course.price.paymentType).toBe('FREE');
  expect(match.score).toBeGreaterThanOrEqual(0);
  expect(match.score).toBeLessThanOrEqual(100);
  expect(match.reasons.length).toBeGreaterThanOrEqual(3);
  await expect(page.getByRole('heading', { name: match.course.title, exact: true })).toBeVisible();
  await expect(page.getByText(`${Number(match.score).toFixed(2)} / 100`, { exact: true })).toBeVisible();
  for (const reason of match.reasons) await expect(page.getByText(reason.message, { exact: true })).toBeVisible();
});

test('matcher explains empty results and lets the learner edit answers without relaxing constraints', async ({ page }) => {
  const result = await quiz(page, 'programming', 'ADVANCED', 'SUB_THAI');
  expect(result.matches).toEqual([]);
  expect(result.constraints.length).toBeGreaterThan(0);
  await expect(page.getByRole('heading', { name: 'ยังไม่พบคอร์สที่ตรงทุกเงื่อนไข', exact: true })).toBeVisible();
  await expect(page.getByText('ลองปรับคำตอบแล้วค้นหาอีกครั้ง ระบบจะไม่เปลี่ยนเงื่อนไขให้เอง', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'แก้คำตอบ', exact: true }).click();
  await expect(page.getByLabel('อยากเรียนเรื่องอะไร', { exact: true })).toHaveValue('programming');
  await page.getByRole('button', { name: 'ถัดไป', exact: true }).click();
  await expect(page.getByLabel('ระดับที่เหมาะกับคุณ', { exact: true })).toHaveValue('ADVANCED');
  await expect(page.getByLabel('ภาษาของคอร์ส', { exact: true })).toHaveValue('SUB_THAI');
});
