import { test, expect, loginAPI, prepareProvider } from '../support/fixtures';
import type { ProviderMember } from '../../../code/frontend/src/features/provider/types';

test('Owner adds and removes an Editor through the real backend', async ({ actors }) => {
  const { provider, admin, other } = actors;
  const institute = await prepareProvider(provider, admin);
  const membersPath = `/api/v1/providers/${institute.id}/members`;
  const page = provider.page;

  await page.goto('/providers');
  await page.getByRole('article', { name: institute.name, exact: true })
    .getByRole('button', { name: 'จัดการสมาชิกทีม' }).click();
  await expect(page.getByText(provider.email, { exact: true })).toBeVisible();
  await expect(page.getByText('1 สมาชิก', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: `ลบสมาชิก ${provider.email}`, exact: true })).toBeDisabled();
  await expect(page.getByLabel('บทบาทสมาชิก')).toHaveValue('EDITOR');

  await page.getByLabel('อีเมลสมาชิก').fill(other.email);
  const addedResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === membersPath && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'เพิ่มสมาชิก', exact: true }).click();
  const added = await addedResponse;
  expect(added.status(), await added.text()).toBe(201);
  const member = await added.json() as ProviderMember;
  expect(member).toMatchObject({ userId: other.id, email: other.email, memberRole: 'EDITOR' });
  await expect(page.getByText(other.email, { exact: true })).toBeVisible();
  await expect(page.getByText('2 สมาชิก', { exact: true })).toBeVisible();

  const list = await provider.context.request.get(membersPath);
  expect(list.status()).toBe(200);
  expect(await list.json()).toContainEqual(member);
  await loginAPI(other);
  await other.page.goto('/providers');
  const otherProvider = other.page.getByRole('article', { name: institute.name, exact: true });
  await expect(otherProvider).toContainText('Editor (ผู้ดูแล)');
  await expect(otherProvider.getByRole('button', { name: 'จัดการสมาชิกทีม' })).toHaveCount(0);
  const forbiddenList = await other.context.request.get(membersPath);
  expect(forbiddenList.status()).toBe(403);

  await page.getByRole('button', { name: `ลบสมาชิก ${other.email}`, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'ยืนยันการลบสมาชิก' });
  await expect(dialog).toContainText(other.email);
  const removedResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === `${membersPath}/${member.id}` && response.request().method() === 'DELETE');
  await dialog.getByRole('button', { name: 'ยืนยันการลบ' }).click();
  expect((await removedResponse).status()).toBe(204);
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText(other.email, { exact: true })).toHaveCount(0);
  await expect(page.getByText('1 สมาชิก', { exact: true })).toBeVisible();

  const remaining = await provider.context.request.get(membersPath);
  expect(remaining.status()).toBe(200);
  const members = await remaining.json() as ProviderMember[];
  expect(members).toHaveLength(1);
  expect(members[0]).toMatchObject({ userId: provider.id, memberRole: 'OWNER' });
  await other.page.reload();
  await expect(other.page.getByRole('article', { name: institute.name, exact: true })).toHaveCount(0);
  await expect(other.page.getByText('ยังไม่มี Provider ที่คุณดูแล', { exact: true })).toBeVisible();
});
