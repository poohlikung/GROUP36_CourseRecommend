import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../code/frontend/src/auth/AuthContext';
import { ProviderPage } from '../../code/frontend/src/pages/ProviderPage';
import { cleanup, MemoryRouter, render, screen, userEvent, waitFor } from '../../code/frontend/src/test/test-utils';
import type { MyProvider } from '../../code/frontend/src/features/provider/types';

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  findMine: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../../code/frontend/src/api/auth', async () => {
  const actual = await vi.importActual<typeof import('../../code/frontend/src/api/auth')>(
    '../../code/frontend/src/api/auth',
  );
  return { ...actual, authApi: { ...actual.authApi, currentUser: mocks.currentUser } };
});

vi.mock('../../code/frontend/src/features/provider/providerApi', () => ({
  providerApi: {
    findMine: mocks.findMine,
    create: mocks.create,
    update: mocks.update,
    delete: mocks.delete,
  },
}));

const mockProviders: MyProvider[] = [
  {
    id: 1,
    name: 'Chula MOOC',
    slug: 'chula-mooc',
    description: 'คอร์สเรียนจุฬาฯ',
    websiteUrl: 'https://mooc.chula.ac.th',
    status: 'APPROVED',
    role: 'OWNER',
    createdAt: '2026-09-30T10:00:00Z',
  },
  {
    id: 2,
    name: 'Skooldio',
    slug: 'skooldio',
    description: 'ทักษะแห่งอนาคต',
    websiteUrl: 'https://skooldio.com',
    status: 'PENDING',
    role: 'EDITOR',
    createdAt: '2026-09-30T11:00:00Z',
  },
];

describe('provider flow', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.currentUser.mockResolvedValue({
      id: 1,
      email: 'owner@example.com',
      displayName: 'Provider Owner',
      role: 'LEARNER',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders provider list with statuses and roles', async () => {
    mocks.findMine.mockResolvedValueOnce(mockProviders);

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Chula MOOC')).toBeInTheDocument();
    expect(screen.getByText('slug: chula-mooc')).toBeInTheDocument();
    expect(screen.getByText('อนุมัติแล้ว')).toBeInTheDocument();
    expect(screen.getByText('Owner (เจ้าของ)')).toBeInTheDocument();

    expect(screen.getByText('Skooldio')).toBeInTheDocument();
    expect(screen.getByText('รอการอนุมัติ (Pending)')).toBeInTheDocument();
    expect(screen.getByText('Editor (ผู้ดูแล)')).toBeInTheDocument();
  });

  it('registers a new provider and reloads list', async () => {
    mocks.findMine.mockResolvedValueOnce([]).mockResolvedValueOnce(mockProviders);
    mocks.create.mockResolvedValueOnce({
      id: 3,
      name: 'New Provider',
      slug: 'new-provider',
      description: 'Desc',
      websiteUrl: 'https://new.com',
      status: 'PENDING',
      createdAt: '2026-09-30T12:00:00Z',
      updatedAt: '2026-09-30T12:00:00Z',
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const user = userEvent.setup();
    const openBtns = await screen.findAllByRole('button', { name: 'ลงทะเบียน Provider ใหม่' });
    await user.click(openBtns[0]);

    await user.type(screen.getByLabelText(/ชื่อสถาบัน/), 'New Provider');
    await user.type(screen.getByLabelText(/URL Slug/), 'new-provider');
    await user.type(screen.getByLabelText(/คำอธิบายสถาบัน/), 'Desc');
    await user.type(screen.getByLabelText(/เว็บไซต์ทางการ/), 'https://new.com');

    await user.click(screen.getByRole('button', { name: 'ลงทะเบียน' }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        name: 'New Provider',
        slug: 'new-provider',
        description: 'Desc',
        websiteUrl: 'https://new.com',
      })
    );
  });

  it('allows owner to delete provider', async () => {
    mocks.findMine.mockResolvedValueOnce([mockProviders[0]]).mockResolvedValueOnce([]);
    mocks.delete.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Chula MOOC')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'ลบ Provider' }));

    expect(screen.getByText('ยืนยันการลบ Provider')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ยืนยันการลบ' }));

    await waitFor(() => expect(mocks.delete).toHaveBeenCalledWith(1));
  });

  it('clears description and websiteUrl when updating with empty inputs', async () => {
    mocks.findMine.mockResolvedValueOnce([mockProviders[0]]).mockResolvedValueOnce([]);
    mocks.update.mockResolvedValueOnce({
      ...mockProviders[0],
      description: null,
      websiteUrl: null,
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Chula MOOC')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'แก้ไขข้อมูล' }));

    expect(screen.getByText(/แก้ไขข้อมูล Provider/)).toBeInTheDocument();

    const descInput = screen.getByLabelText(/คำอธิบายสถาบัน/);
    const webInput = screen.getByLabelText(/เว็บไซต์ทางการ/);

    await user.clear(descInput);
    await user.clear(webInput);

    await user.click(screen.getByRole('button', { name: 'บันทึกการแก้ไข' }));

    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(1, {
        name: 'Chula MOOC',
        description: '',
        websiteUrl: '',
      })
    );
  });

  it('does not render link for unsafe url scheme like javascript:', async () => {
    const providerWithUnsafeUrl: MyProvider = {
      id: 99,
      name: 'Unsafe Link Provider',
      slug: 'unsafe-link-provider',
      description: 'Test description',
      websiteUrl: 'javascript:alert(1)',
      status: 'APPROVED',
      role: 'VIEWER',
      createdAt: '2026-09-30T10:00:00Z',
    };
    mocks.findMine.mockResolvedValueOnce([providerWithUnsafeUrl]);

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Unsafe Link Provider')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /javascript:alert/ })).not.toBeInTheDocument();
  });
});
