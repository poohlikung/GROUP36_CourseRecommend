import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import type { ProviderMember } from '../../../code/frontend/src/features/provider/types';

// Real browser/UI with an isolated API fixture; no live accounts or backend mutations.
for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`Provider team layout and keyboard flow (${viewport.name})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    let members: ProviderMember[] = [
      { id: 42, userId: 7, email: 'owner@example.com', memberRole: 'OWNER' },
      { id: 43, userId: 8, email: 'editor@example.com', memberRole: 'EDITOR' },
      { id: 44, userId: 9, email: 'long-member-email-for-responsive-layout@example.com', memberRole: 'EDITOR' },
    ];
    let nextId = 45;
    const mutations: { method: string; path: string; body: unknown }[] = [];
    await page.route('**/api/v1/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path === '/api/v1/system/liveness') return route.fulfill({ json: { status: 'UP' } });
      if (path === '/api/v1/me') return route.fulfill({ json: { id: 7, email: 'owner@example.com', displayName: 'Provider Owner', role: 'LEARNER' } });
      if (path === '/api/v1/auth/csrf') return route.fulfill({ json: { headerName: 'X-XSRF-TOKEN', token: 'test-csrf' } });
      if (path === '/api/v1/providers/me') return route.fulfill({ json: [{
        id: 3, name: 'Chula MOOC', slug: 'chula-mooc', description: 'เรียนรู้ไปด้วยกันกับทีมผู้ให้บริการคอร์ส',
        websiteUrl: null, status: 'ACTIVE', role: 'OWNER', createdAt: '2026-10-10T00:00:00Z',
      }] });
      if (path === '/api/v1/providers/3/members' && request.method() === 'GET') return route.fulfill({ json: members });
      expect(request.headers()['x-xsrf-token']).toBe('test-csrf');
      if (path === '/api/v1/providers/3/members' && request.method() === 'POST') {
        const body = request.postDataJSON();
        mutations.push({ method: 'POST', path, body });
        const member = { id: nextId++, userId: nextId + 100, ...body };
        members.push(member);
        return route.fulfill({ status: 201, json: member });
      }
      if (path.startsWith('/api/v1/providers/3/members/') && request.method() === 'DELETE') {
        mutations.push({ method: 'DELETE', path, body: null });
        members = members.filter((member) => member.id !== Number(path.split('/').pop()));
        return route.fulfill({ status: 204 });
      }
      throw new Error(`Unexpected API request: ${request.method()} ${path}`);
    });

    await page.goto('/providers');
    await page.getByRole('button', { name: 'จัดการสมาชิกทีม' }).click();
    await expect(page.getByText('3 สมาชิก', { exact: true })).toBeVisible();
    await expect(page.getByText('คุณ', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ลบสมาชิก owner@example.com', exact: true })).toBeDisabled();
    await expect(page.getByLabel('บทบาทสมาชิก')).toHaveValue('EDITOR');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({
      path: fileURLToPath(new URL(`../../../doc/test-reports/evidence/uc11-members-${viewport.name}.png`, import.meta.url)),
      fullPage: true,
    });

    await page.getByLabel('อีเมลสมาชิก').fill(' new-owner@example.com ');
    await page.getByLabel('บทบาทสมาชิก').selectOption('OWNER');
    await page.getByRole('button', { name: 'เพิ่มสมาชิก', exact: true }).click();
    await expect(page.getByText('4 สมาชิก', { exact: true })).toBeVisible();
    expect(mutations[0]).toMatchObject({ method: 'POST', body: { email: 'new-owner@example.com', memberRole: 'OWNER' } });

    await page.getByLabel('อีเมลสมาชิก').fill('new-editor@example.com');
    await page.getByRole('button', { name: 'เพิ่มสมาชิก', exact: true }).click();
    await expect(page.getByText('5 สมาชิก', { exact: true })).toBeVisible();
    expect(mutations[1]).toMatchObject({ method: 'POST', body: { email: 'new-editor@example.com', memberRole: 'EDITOR' } });

    const trigger = page.getByRole('button', { name: 'ลบสมาชิก editor@example.com', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'ยืนยันการลบสมาชิก' });
    const cancel = dialog.getByRole('button', { name: 'ยกเลิก' });
    const confirm = dialog.getByRole('button', { name: 'ยืนยันการลบ' });
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(confirm).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await confirm.click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('4 สมาชิก', { exact: true })).toBeVisible();
    expect(mutations[2]).toMatchObject({ method: 'DELETE', path: '/api/v1/providers/3/members/43' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
