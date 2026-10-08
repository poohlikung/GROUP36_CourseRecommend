import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../code/frontend/src/app/App';
import { ApiError } from '../../code/frontend/src/api/client';
import { cleanup, MemoryRouter, render, screen, userEvent, waitFor } from '../../code/frontend/src/test/test-utils';

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  profile: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('../../code/frontend/src/api/auth', async () => {
  const actual = await vi.importActual<typeof import('../../code/frontend/src/api/auth')>(
    '../../code/frontend/src/api/auth',
  );
  return { ...actual, authApi: mocks };
});

describe('authentication flow', () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  it('automatically signs in after registration and opens the profile page', async () => {
    mocks.currentUser.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'กรุณาเข้าสู่ระบบ'));
    mocks.register.mockResolvedValueOnce({
      id: 10,
      email: 'new@example.com',
      displayName: 'New Learner',
      role: 'LEARNER',
    });
    mocks.profile.mockResolvedValueOnce({
      userId: 10,
      email: 'new@example.com',
      displayName: 'New Learner',
      bio: null,
    });

    render(<MemoryRouter initialEntries={['/register']}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'สร้างบัญชีผู้เรียน' })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('ชื่อที่แสดง'), 'New Learner');
    await user.type(screen.getByLabelText('อีเมล'), 'new@example.com');
    const passwordInputs = screen.getAllByLabelText(/รหัสผ่าน/);
    await user.type(passwordInputs[0], 'safe-password');
    await user.type(passwordInputs[1], 'safe-password');
    await user.click(screen.getByRole('button', { name: 'สมัครสมาชิก' }));

    expect(await screen.findByRole('heading', { name: 'โปรไฟล์ของฉัน' })).toBeInTheDocument();
    expect(mocks.register).toHaveBeenCalledWith({
      displayName: 'New Learner',
      email: 'new@example.com',
      password: 'safe-password',
    });
    await waitFor(() => expect(mocks.profile).toHaveBeenCalled());
  });

  it('keeps the profile mounted and shows success after saving without restarting session restoration', async () => {
    const profile = { userId: 10, email: 'learner@example.com', displayName: 'Learner', bio: null };
    mocks.currentUser.mockResolvedValueOnce({
      id: profile.userId, email: profile.email, displayName: profile.displayName, role: 'LEARNER',
    });
    mocks.profile.mockResolvedValue(profile);
    mocks.updateProfile.mockResolvedValueOnce({ ...profile, displayName: 'Updated Learner', bio: 'New bio' });

    render(<MemoryRouter initialEntries={['/profile']}><App /></MemoryRouter>);
    const input = await screen.findByLabelText('ชื่อที่แสดง');
    const user = userEvent.setup();
    await user.clear(input);
    await user.type(input, 'Updated Learner');
    await user.type(screen.getByLabelText(/ประวัติย่อ/), 'New bio');
    await user.click(screen.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }));

    expect(await screen.findByRole('status')).toHaveTextContent('บันทึกโปรไฟล์แล้ว');
    expect(screen.getByLabelText('ชื่อที่แสดง')).toBe(input);
    expect(input).toHaveValue('Updated Learner');
    expect(screen.getByLabelText(/ประวัติย่อ/)).toHaveValue('New bio');
    expect(screen.getByRole('link', { name: 'Updated Learner' })).toBeInTheDocument();
    expect(screen.queryByText('กำลังเตรียมระบบ…')).not.toBeInTheDocument();
    expect(mocks.profile).toHaveBeenCalledTimes(1);
    expect(mocks.currentUser).toHaveBeenCalledTimes(1);
    expect(mocks.updateProfile).toHaveBeenCalledTimes(1);
    expect(mocks.updateProfile).toHaveBeenCalledWith({ displayName: 'Updated Learner', bio: 'New bio' });
  });

  it('redirects a guest from the profile page to login', async () => {
    mocks.currentUser.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'กรุณาเข้าสู่ระบบ'));
    render(<MemoryRouter initialEntries={['/profile']}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'ยินดีต้อนรับกลับ' })).toBeInTheDocument();
  });
});

vi.mock('../../code/frontend/src/api/system', () => ({
  systemApi: { liveness: vi.fn().mockResolvedValue({ status: 'UP' }) },
}));
