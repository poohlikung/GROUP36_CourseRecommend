import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../code/frontend/src/api/client';
import { ProviderMemberManagementSection } from '../../code/frontend/src/features/provider/ProviderMemberManagementSection';
import { ProviderPage } from '../../code/frontend/src/pages/ProviderPage';
import type { MyProvider, ProviderMember } from '../../code/frontend/src/features/provider/types';
import { act, cleanup, render, screen, userEvent, waitFor, within } from '../../code/frontend/src/test/test-utils';

const mocks = vi.hoisted(() => ({
  listMembers: vi.fn(), addMember: vi.fn(), removeMember: vi.fn(), findMine: vi.fn(),
}));
vi.mock('../../code/frontend/src/features/provider/providerApi', () => ({ providerApi: mocks }));
vi.mock('../../code/frontend/src/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, email: 'owner@example.com' } }),
}));

const provider: MyProvider = {
  id: 3, name: 'Chula MOOC', slug: 'chula-mooc', description: null, websiteUrl: null,
  status: 'ACTIVE', role: 'OWNER', createdAt: '2026-10-10T00:00:00Z',
};
const owner: ProviderMember = { id: 42, userId: 7, email: 'owner@example.com', memberRole: 'OWNER' };
const editor: ProviderMember = { id: 43, userId: 8, email: 'editor@example.com', memberRole: 'EDITOR' };
const secondOwner: ProviderMember = { id: 44, userId: 9, email: 'other-owner@example.com', memberRole: 'OWNER' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function openTeam(members = [owner, editor]) {
  mocks.listMembers.mockResolvedValue(members);
  const onBack = vi.fn();
  const view = render(<ProviderMemberManagementSection provider={provider} onBack={onBack} />);
  await screen.findByText(owner.email);
  return { ...view, onBack };
}

describe('provider team management', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.addMember.mockResolvedValue({ id: 45, userId: 10, email: 'new@example.com', memberRole: 'EDITOR' });
    mocks.removeMember.mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it('shows members, roles, count, current user, and protects the last owner', async () => {
    await openTeam();
    expect(screen.getByText('2 สมาชิก')).toBeInTheDocument();
    expect(screen.getByText('คุณ')).toBeInTheDocument();
    const list = within(screen.getByRole('region', { name: 'สมาชิกในทีม' }));
    expect(list.getByText('Owner (เจ้าของ)')).toBeInTheDocument();
    expect(list.getByText('Editor (ผู้ดูแล)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `ลบสมาชิก ${owner.email}` })).toBeDisabled();
    expect(screen.getByRole('button', { name: `ลบสมาชิก ${editor.email}` })).toBeEnabled();
    expect(screen.getByRole('combobox', { name: 'บทบาทสมาชิก' })).toHaveValue('EDITOR');
    expect(screen.getByRole('heading', { name: 'จัดการสมาชิกทีม' })).toHaveFocus();
  });

  it('does not request or expose members for an Editor even when mounted directly', async () => {
    render(<ProviderMemberManagementSection provider={{ ...provider, role: 'EDITOR' }} onBack={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('เฉพาะ Owner');
    expect(mocks.listMembers).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'เพิ่มสมาชิก' })).not.toBeInTheDocument();
  });

  it.each(['PENDING', 'SUSPENDED'] as const)('allows an Owner to manage a %s provider', async (status) => {
    mocks.listMembers.mockResolvedValue([owner]);
    render(<ProviderMemberManagementSection provider={{ ...provider, status }} onBack={vi.fn()} />);
    await screen.findByText(owner.email);
    expect(mocks.listMembers).toHaveBeenCalledWith(3, expect.any(AbortSignal));
    expect(screen.getByRole('button', { name: 'เพิ่มสมาชิก' })).toBeEnabled();
  });

  it.each(['OWNER', 'EDITOR'] as const)('adds %s with a trimmed email, reloads, and resets the form', async (memberRole) => {
    await openTeam();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('อีเมลสมาชิก'), '  new@example.com  ');
    await user.selectOptions(screen.getByLabelText('บทบาทสมาชิก'), memberRole);
    await user.click(screen.getByRole('button', { name: 'เพิ่มสมาชิก' }));
    await screen.findByText('เพิ่มสมาชิกทีมสำเร็จ');
    expect(mocks.addMember).toHaveBeenCalledWith(3, { email: 'new@example.com', memberRole }, expect.any(AbortSignal));
    expect(mocks.listMembers).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('อีเมลสมาชิก')).toHaveValue('');
    expect(screen.getByLabelText('บทบาทสมาชิก')).toHaveValue('EDITOR');
  });

  it.each(['', '   ', 'invalid-email'])('validates email %j without sending a request', async (email) => {
    await openTeam();
    const user = userEvent.setup();
    if (email) await user.type(screen.getByLabelText('อีเมลสมาชิก'), email);
    await user.click(screen.getByRole('button', { name: 'เพิ่มสมาชิก' }));
    expect(screen.getByRole('alert')).toHaveTextContent('กรุณากรอกอีเมลที่ถูกต้อง');
    expect(screen.getByLabelText('อีเมลสมาชิก')).toHaveFocus();
    expect(mocks.addMember).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'ไม่พบบัญชีผู้ใช้'], [409, 'ผู้ใช้นี้เป็นสมาชิกอยู่แล้ว'], [409, 'บัญชีเป้าหมายถูกระงับ'],
  ])('preserves the form after %s: %s', async (status, message) => {
    await openTeam();
    mocks.addMember.mockRejectedValueOnce(new ApiError(Number(status), 'FAILED', String(message)));
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('อีเมลสมาชิก'), 'new@example.com');
    await user.selectOptions(screen.getByLabelText('บทบาทสมาชิก'), 'OWNER');
    await user.click(screen.getByRole('button', { name: 'เพิ่มสมาชิก' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(String(message));
    expect(screen.getByLabelText('อีเมลสมาชิก')).toHaveValue('new@example.com');
    expect(screen.getByLabelText('บทบาทสมาชิก')).toHaveValue('OWNER');
    expect(mocks.listMembers).toHaveBeenCalledTimes(1);
  });

  it('associates backend field errors with the inputs', async () => {
    await openTeam();
    mocks.addMember.mockRejectedValueOnce(new ApiError(400, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', [
      { field: 'email', message: 'อีเมลไม่ถูกต้อง' }, { field: 'memberRole', message: 'บทบาทไม่ถูกต้อง' },
    ]));
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('อีเมลสมาชิก'), 'new@example.com');
    await user.click(screen.getByRole('button', { name: 'เพิ่มสมาชิก' }));
    await screen.findByText('อีเมลไม่ถูกต้อง');
    expect(screen.getByLabelText('อีเมลสมาชิก')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('อีเมลสมาชิก')).toHaveAccessibleDescription(expect.stringContaining('อีเมลไม่ถูกต้อง'));
    expect(screen.getByLabelText('บทบาทสมาชิก')).toHaveAttribute('aria-invalid', 'true');
  });

  it('prevents duplicate submissions while adding', async () => {
    await openTeam();
    const pending = deferred<ProviderMember>();
    mocks.addMember.mockReturnValueOnce(pending.promise);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('อีเมลสมาชิก'), 'new@example.com');
    await user.dblClick(screen.getByRole('button', { name: 'เพิ่มสมาชิก' }));
    expect(mocks.addMember).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'กำลังเพิ่มสมาชิก...' })).toBeDisabled();
    await act(async () => pending.resolve(editor));
    await screen.findByText('เพิ่มสมาชิกทีมสำเร็จ');
  });

  it('separates successful addition from a failed reload and retries only the list', async () => {
    await openTeam();
    mocks.listMembers.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'โหลดรายชื่อไม่ได้'));
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('อีเมลสมาชิก'), 'new@example.com');
    await user.click(screen.getByRole('button', { name: 'เพิ่มสมาชิก' }));
    await screen.findByText('เพิ่มสมาชิกทีมสำเร็จ');
    expect(screen.getByRole('alert')).toHaveTextContent('บันทึกสำเร็จแล้ว แต่โหลดรายชื่อใหม่ไม่สำเร็จ');
    expect(screen.getByRole('button', { name: 'เพิ่มสมาชิก' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'ลองใหม่' }));
    await screen.findByText(owner.email);
    expect(mocks.addMember).toHaveBeenCalledTimes(1);
    expect(mocks.listMembers).toHaveBeenCalledTimes(3);
  });

  it('shows loading, load failure, retry, and empty state', async () => {
    const pending = deferred<ProviderMember[]>();
    mocks.listMembers.mockReturnValueOnce(pending.promise).mockRejectedValueOnce(new Error('โหลดไม่ได้')).mockResolvedValueOnce([]);
    render(<ProviderMemberManagementSection provider={provider} onBack={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('กำลังโหลดรายชื่อสมาชิก');
    await act(async () => pending.resolve([owner]));
    // Re-enter to exercise an initial load error independently of mutations.
    cleanup();
    render(<ProviderMemberManagementSection provider={provider} onBack={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('โหลดไม่ได้');
    await userEvent.click(screen.getByRole('button', { name: 'ลองใหม่' }));
    expect(await screen.findByText(/ยังไม่มีสมาชิกในทีม/)).toBeInTheDocument();
    expect(screen.getByText('0 สมาชิก')).toBeInTheDocument();
  });

  it('cancels deletion, traps focus, closes with Escape, and restores the trigger', async () => {
    await openTeam();
    const user = userEvent.setup();
    const trigger = screen.getByRole('button', { name: `ลบสมาชิก ${editor.email}` });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'ยืนยันการลบสมาชิก' });
    expect(within(dialog).getByRole('button', { name: 'ยกเลิก' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(within(dialog).getByRole('button', { name: 'ยืนยันการลบ' })).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByRole('button', { name: 'ยกเลิก' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'ยกเลิก' }));
    expect(mocks.removeMember).not.toHaveBeenCalled();
  });

  it('deletes by member ID, blocks repeated confirmation and Escape while deleting', async () => {
    await openTeam();
    const pending = deferred<void>();
    mocks.removeMember.mockReturnValueOnce(pending.promise);
    mocks.listMembers.mockResolvedValueOnce([owner]);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: `ลบสมาชิก ${editor.email}` }));
    await user.dblClick(screen.getByRole('button', { name: 'ยืนยันการลบ' }));
    expect(mocks.removeMember).toHaveBeenCalledExactlyOnceWith(3, 43, expect.any(AbortSignal));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeDisabled();
    await act(async () => pending.resolve());
    await screen.findByText('ลบสมาชิกทีมสำเร็จ');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(editor.email)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'จัดการสมาชิกทีม' })).toHaveFocus();
  });

  it('refreshes after a last-owner conflict and blocks another deletion', async () => {
    await openTeam([owner, secondOwner]);
    mocks.removeMember.mockRejectedValueOnce(new ApiError(409, 'CONFLICT', 'ไม่สามารถลบ Owner คนสุดท้าย'));
    mocks.listMembers.mockResolvedValueOnce([owner]);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: `ลบสมาชิก ${owner.email}` }));
    await user.click(screen.getByRole('button', { name: 'ยืนยันการลบ' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'ยืนยันการลบ' })).toBeDisabled());
    expect(screen.getByRole('dialog')).toHaveTextContent('ไม่สามารถลบ Owner คนสุดท้าย');
    expect(mocks.listMembers).toHaveBeenCalledTimes(2);
  });

  it('keeps the deletion dialog on a network failure and permits retry', async () => {
    await openTeam();
    mocks.removeMember.mockRejectedValueOnce(new Error('เชื่อมต่อไม่ได้'));
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: `ลบสมาชิก ${editor.email}` }));
    await user.click(screen.getByRole('button', { name: 'ยืนยันการลบ' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('เชื่อมต่อไม่ได้');
    expect(screen.getByRole('button', { name: 'ยืนยันการลบ' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'ยืนยันการลบ' }));
    await screen.findByText('ลบสมาชิกทีมสำเร็จ');
    expect(mocks.removeMember).toHaveBeenCalledTimes(2);
  });

  it.each([401, 403])('disables management after an add returns %s', async (status) => {
    await openTeam();
    mocks.addMember.mockRejectedValueOnce(new ApiError(status, 'FORBIDDEN', 'ไม่มีสิทธิ์'));
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('อีเมลสมาชิก'), 'new@example.com');
    await user.click(screen.getByRole('button', { name: 'เพิ่มสมาชิก' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('เฉพาะ Owner');
    expect(screen.queryByText(owner.email)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'เพิ่มสมาชิก' })).not.toBeInTheDocument();
  });

  it('does not expose stale members after the initial load is forbidden', async () => {
    mocks.listMembers.mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'ไม่มีสิทธิ์'));
    render(<ProviderMemberManagementSection provider={provider} onBack={vi.fn()} />);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'เพิ่มสมาชิก' })).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'ลองใหม่' })).not.toBeInTheDocument();
  });

  it('aborts pending loads and ignores their late result after leaving', async () => {
    const pending = deferred<ProviderMember[]>();
    mocks.listMembers.mockReturnValueOnce(pending.promise);
    const view = render(<ProviderMemberManagementSection provider={provider} onBack={vi.fn()} />);
    const signal = mocks.listMembers.mock.calls[0][1] as AbortSignal;
    view.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => pending.resolve([owner]));
    expect(screen.queryByText(owner.email)).not.toBeInTheDocument();
  });

  it('aborts a pending addition without loading again after leaving', async () => {
    const view = await openTeam();
    const pending = deferred<ProviderMember>();
    mocks.addMember.mockReturnValueOnce(pending.promise);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('อีเมลสมาชิก'), 'new@example.com');
    await user.click(screen.getByRole('button', { name: 'เพิ่มสมาชิก' }));
    const signal = mocks.addMember.mock.calls[0][2] as AbortSignal;
    view.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => pending.resolve(editor));
    expect(mocks.listMembers).toHaveBeenCalledTimes(1);
  });

  it('shows only the Owner entry point and returns to a refreshed Provider list after self-removal', async () => {
    mocks.findMine.mockResolvedValueOnce([provider, { ...provider, id: 4, name: 'Editor Provider', role: 'EDITOR' }]).mockResolvedValueOnce([]);
    mocks.listMembers.mockResolvedValue([owner, secondOwner]);
    render(<ProviderPage />);
    const user = userEvent.setup();
    await screen.findByText(provider.name);
    expect(screen.getAllByRole('button', { name: 'จัดการสมาชิกทีม' })).toHaveLength(1);
    expect(mocks.listMembers).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'จัดการสมาชิกทีม' }));
    await screen.findByText(owner.email);
    await user.click(screen.getByRole('button', { name: `ลบสมาชิก ${owner.email}` }));
    expect(screen.getByRole('dialog')).toHaveTextContent('คุณกำลังออกจากทีม');
    await user.click(screen.getByRole('button', { name: 'ยืนยันการลบ' }));
    await screen.findByText('ยังไม่มี Provider ที่คุณดูแล');
    expect(mocks.findMine).toHaveBeenCalledTimes(2);
    expect(mocks.removeMember).toHaveBeenCalledWith(3, 42, expect.any(AbortSignal));
    expect(mocks.listMembers).toHaveBeenCalledTimes(1);
  });
});
