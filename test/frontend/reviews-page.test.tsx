import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../code/frontend/src/api/client';
import { ReviewsPage } from '../../code/frontend/src/pages/ReviewsPage';
import { act, cleanup, MemoryRouter, render, Route, Routes, screen, useNavigate, userEvent, waitFor } from '../../code/frontend/src/test/test-utils';

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

function CourseLinks() {
  const navigate = useNavigate();
  return <><button onClick={() => navigate('/courses/7/reviews')}>คอร์ส 7</button><button onClick={() => navigate('/courses/9/reviews')}>คอร์ส 9</button></>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
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

  it('opens the create form only when the own-review request returns 404', async () => {
    mocks.role = 'LEARNER';
    mocks.mine.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'ไม่พบรีวิว'));
    renderPage();
    expect(await screen.findByRole('button', { name: 'ส่งรีวิว' })).toBeInTheDocument();
    expect(screen.queryByText('โหลดรีวิวของคุณไม่ได้')).not.toBeInTheDocument();
  });

  it.each([
    new ApiError(500, 'INTERNAL_ERROR', 'ระบบขัดข้อง'),
    new ApiError(0, 'REQUEST_TIMEOUT', 'ระบบตอบกลับช้า กรุณาลองใหม่'),
  ])('blocks creation on an own-review error and allows retry (%s)', async (failure) => {
    mocks.role = 'LEARNER';
    mocks.mine.mockRejectedValueOnce(failure).mockResolvedValueOnce(ownReview);
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole('alert', { name: '' })).toHaveTextContent(failure.message);
    expect(screen.queryByRole('button', { name: 'ส่งรีวิว' })).not.toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'ลองใหม่' }));
    expect(await screen.findByRole('button', { name: 'อัปเดตรีวิว' })).toBeInTheDocument();
  });

  it('resets course state and ignores late responses from the previous course', async () => {
    mocks.role = 'LEARNER';
    const oldMine = deferred<typeof ownReview>();
    const oldList = deferred<ReturnType<typeof emptyPage>>();
    mocks.mine.mockImplementation((id: number) => id === 7 ? oldMine.promise : Promise.reject(new ApiError(404, 'NOT_FOUND', 'ไม่พบรีวิว')));
    mocks.list.mockImplementation((id: number) => id === 7 ? oldList.promise : Promise.resolve(emptyPage()));
    mocks.getById.mockImplementation((id: number) => Promise.resolve({ id, title: `คอร์ส ${id}` }));
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/courses/7/reviews']}><CourseLinks />
      <Routes><Route path="/courses/:courseId/reviews" element={<ReviewsPage />} /></Routes>
    </MemoryRouter>);
    await waitFor(() => expect(mocks.mine).toHaveBeenCalledWith(7, expect.any(AbortSignal)));
    await user.click(screen.getByRole('button', { name: 'คอร์ส 9' }));
    expect(await screen.findByRole('heading', { name: 'รีวิวคอร์ส คอร์ส 9' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'ส่งรีวิว' })).toBeInTheDocument();
    await act(async () => { oldMine.resolve(ownReview); oldList.resolve({ ...emptyPage(), content: [ownReview], totalElements: 1 }); });
    expect(screen.queryByText('รีวิวเดิม')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'อัปเดตรีวิว' })).not.toBeInTheDocument();
    expect(screen.queryByText('1 รีวิว')).not.toBeInTheDocument();
  });
});

function emptyPage() {
  return { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true };
}
