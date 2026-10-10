import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../code/frontend/src/auth/AuthContext';
import { ProviderPage } from '../../code/frontend/src/pages/ProviderPage';
import { CourseManagementSection } from '../../code/frontend/src/features/course/CourseManagementSection';
import { cleanup, MemoryRouter, render, screen, userEvent, waitFor } from '../../code/frontend/src/test/test-utils';
import type { CourseDetail } from '../../code/frontend/src/features/course/types';
import type { MyProvider } from '../../code/frontend/src/features/provider/types';

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  findMine: vi.fn(),
  listByProvider: vi.fn(),
  createCourse: vi.fn(),
  updateCourse: vi.fn(),
  submitCourse: vi.fn(),
  deleteCourse: vi.fn(),
  getCatalogOptions: vi.fn(),
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
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../code/frontend/src/features/course/courseApi', () => ({
  courseApi: {
    listByProvider: mocks.listByProvider,
    create: mocks.createCourse,
    update: mocks.updateCourse,
    submit: mocks.submitCourse,
    delete: mocks.deleteCourse,
  },
}));

vi.mock('../../code/frontend/src/features/catalog/catalogApi', () => ({
  getCatalogOptions: mocks.getCatalogOptions,
  getCatalogCourses: vi.fn(),
}));

const mockProvider: MyProvider = {
  id: 1,
  name: 'Acme Academy',
  slug: 'acme-academy',
  description: 'Online learning academy',
  websiteUrl: 'https://acme.org',
  status: 'ACTIVE',
  role: 'OWNER',
  createdAt: '2026-09-30T10:00:00Z',
};

const mockCourses: CourseDetail[] = [
  {
    id: 101,
    providerId: 1,
    providerName: 'Acme Academy',
    providerSlug: 'acme-academy',
    platformId: 1,
    platformName: 'Coursera',
    platformSlug: 'coursera',
    title: 'Modern Web Development',
    slug: 'modern-web-dev',
    description: 'Learn full-stack web development',
    url: 'https://coursera.org/learn/modern-web',
    level: 'BEGINNER',
    language: 'THAI',
    effortHours: 30,
    status: 'DRAFT',
    paymentType: 'FREE',
    amount: 0,
    currency: 'THB',
    categories: [{ id: 1, name: 'Web Dev', slug: 'web-dev' }],
    createdAt: '2026-09-30T11:00:00Z',
    updatedAt: '2026-09-30T11:00:00Z',
  },
  {
    id: 102,
    providerId: 1,
    providerName: 'Acme Academy',
    providerSlug: 'acme-academy',
    platformId: 1,
    platformName: 'Coursera',
    platformSlug: 'coursera',
    title: 'Advanced Cloud Architectures',
    slug: 'adv-cloud',
    description: 'Master microservices and Kubernetes',
    url: 'https://coursera.org/learn/adv-cloud',
    level: 'ADVANCED',
    language: 'ENGLISH',
    effortHours: 50,
    status: 'PENDING',
    paymentType: 'ONE_TIME',
    amount: 1990,
    currency: 'THB',
    categories: [],
    createdAt: '2026-09-30T12:00:00Z',
    updatedAt: '2026-09-30T12:00:00Z',
  },
];

describe('course management flow', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.currentUser.mockResolvedValue({
      id: 1,
      email: 'owner@example.com',
      displayName: 'Course Creator',
      role: 'LEARNER',
    });
    mocks.findMine.mockResolvedValue([mockProvider]);
    mocks.getCatalogOptions.mockResolvedValue({
      platforms: [{ id: 1, name: 'Coursera', slug: 'coursera' }],
      categories: [{ id: 1, name: 'Web Dev', slug: 'web-dev' }],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('detects the platform from the URL without asking for a platform selection', async () => {
    mocks.listByProvider.mockResolvedValue([]);
    render(<MemoryRouter><CourseManagementSection provider={mockProvider} onBack={() => {}} /></MemoryRouter>);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: 'เพิ่มคอร์สใหม่' })[0]);
    expect(screen.queryByLabelText(/^แพลตฟอร์ม/)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/ลิงก์คอร์สเรียน/), 'https://www.opendurian.com/course');
    expect(screen.getByText(/opendurian\.com/)).toBeInTheDocument();
  });

  it('navigates to course management and renders course list with status badges', async () => {
    mocks.listByProvider.mockResolvedValueOnce(mockCourses);

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Acme Academy')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'จัดการคอร์สเรียน' }));

    expect(await screen.findByText('คอร์สเรียนของ Acme Academy')).toBeInTheDocument();
    expect(screen.getByText('Modern Web Development')).toBeInTheDocument();
    expect(screen.getByText('Advanced Cloud Architectures')).toBeInTheDocument();
    expect(screen.getByText('แบบร่าง (Draft)')).toBeInTheDocument();
    expect(screen.getByText('รอตรวจสอบ (Pending)')).toBeInTheDocument();
  });

  it('creates a new course draft (UC12)', async () => {
    mocks.listByProvider.mockResolvedValueOnce([]).mockResolvedValueOnce([mockCourses[0]]);
    mocks.createCourse.mockResolvedValueOnce(mockCourses[0]);

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'จัดการคอร์สเรียน' }));

    expect(await screen.findByText('ยังไม่มีคอร์สเรียนใน Provider นี้')).toBeInTheDocument();

    const createBtns = screen.getAllByRole('button', { name: 'เพิ่มคอร์สใหม่' });
    await user.click(createBtns[0]);

    expect(screen.getByText('เพิ่มคอร์สเรียนใหม่ (Draft)')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/ชื่อคอร์สเรียน/), 'Modern Web Development');
    await user.type(screen.getByLabelText(/URL Slug/), 'modern-web-dev');
    await user.type(screen.getByLabelText(/ลิงก์คอร์สเรียน/), 'https://coursera.org/learn/modern-web');

    await user.click(screen.getByRole('button', { name: 'สร้างคอร์สดราฟต์' }));

    await waitFor(() =>
      expect(mocks.createCourse).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          title: 'Modern Web Development',
          slug: 'modern-web-dev',
          url: 'https://coursera.org/learn/modern-web',
        })
      )
    );
    expect(mocks.createCourse.mock.calls[0][1]).not.toHaveProperty('platformId');
  });

  it('submits a draft course for review (UC13)', async () => {
    mocks.listByProvider.mockResolvedValueOnce([mockCourses[0]]).mockResolvedValueOnce([
      { ...mockCourses[0], status: 'PENDING' },
    ]);
    mocks.submitCourse.mockResolvedValueOnce({ ...mockCourses[0], status: 'PENDING' });

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'จัดการคอร์สเรียน' }));

    expect(await screen.findByText('Modern Web Development')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: 'ส่งตรวจ' });
    await user.click(submitBtn);

    await waitFor(() => expect(mocks.submitCourse).toHaveBeenCalledWith(101));
    expect(await screen.findByText(/ส่งคอร์สให้ผู้ดูแลระบบตรวจสอบแล้ว/)).toBeInTheDocument();
  });

  it('deletes a draft course (UC14)', async () => {
    mocks.listByProvider.mockResolvedValueOnce([mockCourses[0]]).mockResolvedValueOnce([]);
    mocks.deleteCourse.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'จัดการคอร์สเรียน' }));

    expect(await screen.findByText('Modern Web Development')).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: 'ลบ' });
    await user.click(deleteBtn);

    expect(screen.getByText('ยืนยันการลบคอร์สดราฟต์')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'ยืนยันการลบ' });
    await user.click(confirmBtn);

    await waitFor(() => expect(mocks.deleteCourse).toHaveBeenCalledWith(101));
    expect(await screen.findByText(/ลบคอร์สดราฟต์สำเร็จ/)).toBeInTheDocument();
  });

  it('clears description when updating course with empty description input', async () => {
    mocks.listByProvider.mockResolvedValueOnce([mockCourses[0]]).mockResolvedValueOnce([
      { ...mockCourses[0], description: null },
    ]);
    mocks.updateCourse.mockResolvedValueOnce({
      ...mockCourses[0],
      description: null,
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'จัดการคอร์สเรียน' }));

    expect(await screen.findByText('Modern Web Development')).toBeInTheDocument();

    const editBtn = screen.getByRole('button', { name: 'แก้ไข' });
    await user.click(editBtn);

    expect(screen.getByText('แก้ไขข้อมูลคอร์สเรียน')).toBeInTheDocument();

    const descInput = screen.getByLabelText(/คำอธิบายคอร์ส/);
    await user.clear(descInput);

    await user.click(screen.getByRole('button', { name: 'บันทึกการแก้ไข' }));

    await waitFor(() =>
      expect(mocks.updateCourse).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          description: '',
        })
      )
    );
    expect(mocks.updateCourse.mock.calls[0][1]).not.toHaveProperty('platformId');
  });

  it('keeps an unknown price empty when editing a paid course', async () => {
    const paidWithoutPrice: CourseDetail = {
      ...mockCourses[0],
      paymentType: 'ONE_TIME',
      amount: null,
    };
    mocks.listByProvider.mockResolvedValueOnce([paidWithoutPrice]).mockResolvedValueOnce([paidWithoutPrice]);
    mocks.updateCourse.mockResolvedValueOnce(paidWithoutPrice);

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'จัดการคอร์สเรียน' }));
    expect(await screen.findByText('Modern Web Development')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'แก้ไข' }));
    expect(screen.getByLabelText('จำนวนเงิน')).toHaveValue(null);

    await user.click(screen.getByRole('button', { name: 'บันทึกการแก้ไข' }));

    await waitFor(() => expect(mocks.updateCourse).toHaveBeenCalled());
    const [, payload] = mocks.updateCourse.mock.calls[0];
    expect(payload.paymentType).toBe('ONE_TIME');
    expect(payload.amount).toBeUndefined();
  });

  it('displays "ดูราคาที่เว็บไซต์" on course card when paid course amount is null', async () => {
    const paidWithoutPrice: CourseDetail = {
      ...mockCourses[0],
      id: 201,
      title: 'Variable Pricing Course',
      paymentType: 'ONE_TIME',
      amount: null,
    };
    mocks.listByProvider.mockResolvedValueOnce([paidWithoutPrice]);

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'จัดการคอร์สเรียน' }));

    expect(await screen.findByText('Variable Pricing Course')).toBeInTheDocument();
    expect(screen.getByText('ดูราคาที่เว็บไซต์')).toBeInTheDocument();
  });

  it('submits a revision-requested course for review (UC13)', async () => {
    const revisionCourse: CourseDetail = {
      ...mockCourses[0],
      id: 301,
      title: 'Revision Needed Course',
      status: 'REVISION_REQUESTED',
    };
    mocks.listByProvider.mockResolvedValueOnce([revisionCourse]).mockResolvedValueOnce([
      { ...revisionCourse, status: 'PENDING' },
    ]);
    mocks.submitCourse.mockResolvedValueOnce({ ...revisionCourse, status: 'PENDING' });

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'จัดการคอร์สเรียน' }));

    expect(await screen.findByText('Revision Needed Course')).toBeInTheDocument();
    expect(screen.getByText('ต้องแก้ไข (Revision Requested)')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: 'ส่งตรวจ' });
    await user.click(submitBtn);

    await waitFor(() => expect(mocks.submitCourse).toHaveBeenCalledWith(301));
    expect(await screen.findByText(/ส่งคอร์สให้ผู้ดูแลระบบตรวจสอบแล้ว/)).toBeInTheDocument();
  });

  it('displays correct price labels for subscription and free courses', async () => {
    const subCourse: CourseDetail = {
      ...mockCourses[0],
      id: 401,
      title: 'Subscription Course',
      paymentType: 'SUBSCRIPTION',
      amount: 499,
      currency: 'THB',
    };
    mocks.listByProvider.mockResolvedValueOnce([mockCourses[0], subCourse]);

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'จัดการคอร์สเรียน' }));

    expect(await screen.findByText('Subscription Course')).toBeInTheDocument();
    expect(screen.getByText('ฟรี')).toBeInTheDocument();
    expect(screen.getByText('499 THB / เดือน')).toBeInTheDocument();
  });

  it('keeps the course list visible when submitting for review fails', async () => {
    mocks.listByProvider.mockResolvedValueOnce([mockCourses[0]]);
    mocks.submitCourse.mockRejectedValueOnce(new Error('คอร์สต้องอยู่ในสถานะ DRAFT'));

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'จัดการคอร์สเรียน' }));
    expect(await screen.findByText('Modern Web Development')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ส่งตรวจ' }));

    expect(await screen.findByText('คอร์สต้องอยู่ในสถานะ DRAFT')).toBeInTheDocument();
    expect(screen.getByText('Modern Web Development')).toBeInTheDocument();
  });

  it('disables submitting for review when the provider is not active', async () => {
    mocks.findMine.mockResolvedValue([{ ...mockProvider, status: 'PENDING' }]);
    mocks.listByProvider.mockResolvedValueOnce([mockCourses[0]]);

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'จัดการคอร์สเรียน' }));
    expect(await screen.findByText('Modern Web Development')).toBeInTheDocument();

    expect(screen.getByText(/ยังส่งคอร์สเข้าตรวจไม่ได้/)).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: 'ส่งตรวจ' });
    expect(submitBtn).toBeDisabled();
    await user.click(submitBtn);
    expect(mocks.submitCourse).not.toHaveBeenCalled();
  });

  it('hides the edit button for suspended and archived courses', async () => {
    mocks.listByProvider.mockResolvedValueOnce([
      { ...mockCourses[0], id: 201, title: 'Suspended Course', status: 'SUSPENDED' },
      { ...mockCourses[0], id: 202, title: 'Archived Course', slug: 'archived', status: 'ARCHIVED' },
    ]);

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'จัดการคอร์สเรียน' }));
    expect(await screen.findByText('Suspended Course')).toBeInTheDocument();
    expect(screen.getByText('Archived Course')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'แก้ไข' })).not.toBeInTheDocument();
  });

  it('warns that editing a published course returns it to draft', async () => {
    mocks.listByProvider.mockResolvedValueOnce([{ ...mockCourses[0], status: 'PUBLISHED' }]);

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProviderPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'จัดการคอร์สเรียน' }));
    expect(await screen.findByText('Modern Web Development')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'แก้ไข' }));
    expect(screen.getByText(/คอร์สนี้จะกลับเป็นสถานะ Draft/)).toBeInTheDocument();
  });
});

vi.mock('../../code/frontend/src/api/system', () => ({
  systemApi: { liveness: vi.fn().mockResolvedValue({ status: 'UP' }) },
}));
