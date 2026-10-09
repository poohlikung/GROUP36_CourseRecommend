import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewsPage } from '../../code/frontend/src/pages/ReviewsPage';
import { cleanup, MemoryRouter, render, Route, Routes, screen, userEvent, waitFor } from '../../code/frontend/src/test/test-utils';

const mocks = vi.hoisted(() => ({
  role: 'ADMIN',
  getById: vi.fn(),
  list: vi.fn(),
  mine: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../../code/frontend/src/auth/AuthContext', () => ({
  useAuth: () => ({ status: 'authenticated', user: { id: 1, role: mocks.role } }),
}));
vi.mock('../../code/frontend/src/features/course/courseApi', () => ({
  courseApi: { getById: mocks.getById },
}));
vi.mock('../../code/frontend/src/features/reviews/reviewApi', () => ({
  reviewApi: { list: mocks.list, mine: mocks.mine, create: mocks.create, update: mocks.update },
}));

const ownReview = {
  id: 8, courseId: 7, reviewerDisplayName: 'ผู้เรียน',
  overallScore: 5, contentScore: 5, teachingScore: 4, difficultyScore: 2,
  body: 'รีวิวเดิม', status: 'PUBLISHED', version: 1, moderationReason: null,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
};

function renderPage() {
  return render(<MemoryRouter initialEntries={['/courses/7/reviews']}>
    <Routes><Route path="/courses/:courseId/reviews" element={<ReviewsPage />} /></Routes>
  </MemoryRouter>);
}

describe('reviews page', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.role = 'ADMIN';
    mocks.getById.mockResolvedValue({ id: 7, title: 'คอร์ส React' });
    mocks.list.mockResolvedValue({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true });
    mocks.mine.mockResolvedValue(ownReview);
    mocks.update.mockResolvedValue({ ...ownReview, status: 'PENDING', body: 'รีวิวใหม่' });
  });

  it('shows the course name and published reviews without offering admin a review form', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'รีวิวคอร์ส คอร์ส React' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'รีวิวที่เผยแพร่' })).toBeInTheDocument();
    expect(screen.getByText('เฉพาะบัญชีผู้เรียนเท่านั้นที่เขียนรีวิวได้')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ส่งรีวิว' })).not.toBeInTheDocument();
    expect(mocks.mine).not.toHaveBeenCalled();
  });

  it('loads the learner review before allowing an update through the form', async () => {
    mocks.role = 'LEARNER';
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole('heading', { name: 'จัดการรีวิวของคุณ' })).toBeInTheDocument();
    const comment = screen.getByRole('textbox', { name: /ความคิดเห็น/ });
    expect(comment).toHaveValue('รีวิวเดิม');
    await user.clear(comment);
    await user.type(comment, 'รีวิวใหม่');
    await user.click(screen.getByRole('button', { name: 'อัปเดตรีวิว' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(7, {
      overallScore: 5, contentScore: 5, teachingScore: 4, difficultyScore: 2, body: 'รีวิวใหม่',
    }));
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
