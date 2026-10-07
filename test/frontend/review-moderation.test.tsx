import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewModerationSection } from '../../code/frontend/src/features/admin/ReviewModerationSection';
import type { AdminReview } from '../../code/frontend/src/features/admin/reviewApi';
import { cleanup, render, screen, userEvent, waitFor } from '../../code/frontend/src/test/test-utils';

const mocks = vi.hoisted(() => ({ list: vi.fn(), decide: vi.fn() }));
vi.mock('../../code/frontend/src/features/admin/reviewApi', () => ({ reviewApi: mocks }));

const pendingReview: AdminReview = {
  id: 21, courseId: 5, courseTitle: 'React Course', reviewerDisplayName: 'Somchai',
  overallScore: 4, contentScore: 5, teachingScore: 4, difficultyScore: 3,
  body: 'สอนเข้าใจง่าย', status: 'PENDING', version: 2, moderationReason: null,
  createdAt: '2026-10-06T00:00:00Z', updatedAt: '2026-10-06T00:00:00Z',
};

const pendingPage = {
  content: [pendingReview], page: 0, size: 10, totalElements: 1,
  totalPages: 1, first: true, last: true,
};

describe('review moderation section', () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.list.mockReset();
    mocks.decide.mockReset();
    mocks.list.mockResolvedValue(pendingPage);
    mocks.decide.mockResolvedValue({ ...pendingReview, status: 'REJECTED', version: 3 });
  });

  it('shows the pending queue and requires a reason to reject', async () => {
    const user = userEvent.setup();
    render(<ReviewModerationSection />);
    expect(await screen.findByText('React Course')).toBeInTheDocument();
    expect(screen.getByText('สอนเข้าใจง่าย')).toBeInTheDocument();
    const reject = screen.getByRole('button', { name: 'ปฏิเสธรีวิว' });
    expect(reject).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: 'เหตุผลที่ปฏิเสธรีวิว 21' }), 'ข้อความไม่เกี่ยวข้อง');
    await user.click(reject);
    await waitFor(() => expect(mocks.decide).toHaveBeenCalledWith(
      pendingReview, 'REJECT', 'ข้อความไม่เกี่ยวข้อง',
    ));
  });

  it('can approve without a reason and switch to published reviews', async () => {
    const user = userEvent.setup();
    render(<ReviewModerationSection />);
    expect(await screen.findByText('React Course')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'อนุมัติรีวิว' }));
    await waitFor(() => expect(mocks.decide).toHaveBeenCalledWith(pendingReview, 'APPROVE', ''));
    await user.selectOptions(screen.getByRole('combobox', { name: 'สถานะรีวิว' }), 'PUBLISHED');
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith('PUBLISHED', 0, expect.any(AbortSignal)));
  });

  it('hides old reviews and decisions while the next page loads or fails', async () => {
    const user = userEvent.setup();
    const firstPage = { ...pendingPage, totalElements: 2, totalPages: 2, last: false };
    const nextReview = { ...pendingReview, id: 22, courseTitle: 'Vue Course', version: 1 };
    const nextPage = {
      ...firstPage, content: [nextReview], page: 1, first: false, last: true,
    };
    let rejectNextPage: (error: Error) => void = () => {};
    mocks.list.mockReset();
    mocks.list.mockResolvedValueOnce(firstPage);
    mocks.list.mockImplementationOnce(() => new Promise((_, reject) => {
      rejectNextPage = reject;
    }));
    mocks.list.mockResolvedValueOnce(nextPage);

    render(<ReviewModerationSection />);
    expect(await screen.findByText('React Course')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ถัดไป' }));
    expect(screen.getByText('กำลังโหลดรีวิว…')).toBeInTheDocument();
    expect(screen.queryByText('React Course')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'อนุมัติรีวิว' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ปฏิเสธรีวิว' })).not.toBeInTheDocument();

    rejectNextPage(new Error('โหลดหน้าถัดไปไม่สำเร็จ'));
    expect(await screen.findByRole('alert')).toHaveTextContent('โหลดหน้าถัดไปไม่สำเร็จ');
    expect(screen.queryByText('React Course')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'อนุมัติรีวิว' })).not.toBeInTheDocument();
    expect(mocks.decide).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'ลองโหลดใหม่' }));
    expect(await screen.findByText('Vue Course')).toBeInTheDocument();
    expect(screen.queryByText('React Course')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'อนุมัติรีวิว' })).toBeEnabled();
  });
});
