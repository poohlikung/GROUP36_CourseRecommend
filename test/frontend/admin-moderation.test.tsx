import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminPage } from '../../code/frontend/src/pages/AdminPage';
import type { CourseDetail } from '../../code/frontend/src/features/course/types';
import { render, screen, userEvent, waitFor } from '../../code/frontend/src/test/test-utils';

const mocks = vi.hoisted(() => ({
  courses: vi.fn(),
  decideCourse: vi.fn(),
  providers: vi.fn(),
  decideProvider: vi.fn(),
}));

vi.mock('../../code/frontend/src/features/admin/adminApi', () => ({ adminApi: mocks }));

const pendingCourse: CourseDetail = {
  id: 11, providerId: 2, providerName: 'School', providerSlug: 'school',
  platformId: 3, platformName: 'Platform', platformSlug: 'platform',
  title: 'React Course', slug: 'react-course', description: 'เรียน React',
  url: 'https://example.com/course', level: 'BEGINNER', language: 'THAI',
  effortHours: 5, status: 'PENDING', version: 4,
  moderationReason: null,
  paymentType: 'FREE', amount: 0, currency: 'THB', categories: [],
  createdAt: '2026-10-06T00:00:00Z', updatedAt: '2026-10-06T00:00:00Z',
};

describe('admin moderation page', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.courses.mockResolvedValue([pendingCourse]);
    mocks.providers.mockResolvedValue([]);
    mocks.decideCourse.mockResolvedValue({ ...pendingCourse, status: 'REVISION_REQUESTED', version: 5 });
  });

  it('requires a reason before requesting course revision', async () => {
    const user = userEvent.setup();
    render(<AdminPage />);
    expect(await screen.findByText('React Course')).toBeInTheDocument();
    const revisionButton = screen.getByRole('button', { name: 'ขอให้แก้ไข' });
    expect(revisionButton).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: 'เหตุผลสำหรับคอร์ส React Course' }), 'ลิงก์ผิด');
    await user.click(revisionButton);
    await waitFor(() => expect(mocks.decideCourse).toHaveBeenCalledWith(
      pendingCourse, 'REQUEST_REVISION', 'ลิงก์ผิด',
    ));
  });

  it('approves a provider from the pending queue', async () => {
    const user = userEvent.setup();
    const provider = {
      id: 7, name: 'Academy', slug: 'academy', description: 'สถาบัน',
      websiteUrl: 'https://example.com', status: 'PENDING', version: 2,
    };
    mocks.providers.mockResolvedValue([provider]);
    mocks.decideProvider.mockResolvedValue({ ...provider, status: 'ACTIVE', version: 3 });
    render(<AdminPage />);
    expect(await screen.findByText('Academy')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'รับรอง Provider' }));
    await waitFor(() => expect(mocks.decideProvider).toHaveBeenCalledWith(provider, 'APPROVE', ''));
  });
});
