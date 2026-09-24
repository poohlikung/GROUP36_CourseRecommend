import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../code/frontend/src/app/App';
import { ApiError } from '../../code/frontend/src/api/client';
import { MemoryRouter, render, screen, userEvent, waitFor } from '../../code/frontend/src/test/test-utils';

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

  it('redirects a guest from the profile page to login', async () => {
    mocks.currentUser.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'กรุณาเข้าสู่ระบบ'));
    render(<MemoryRouter initialEntries={['/profile']}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'ยินดีต้อนรับกลับ' })).toBeInTheDocument();
  });
});
