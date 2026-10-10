import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../code/frontend/src/api/client';
import { ReviewsPage } from '../../code/frontend/src/pages/ReviewsPage';
import { act, cleanup, MemoryRouter, render, Route, Routes, screen, useLocation, useNavigate, userEvent, waitFor } from '../../code/frontend/src/test/test-utils';

const mocks = vi.hoisted(() => ({
  role: 'ADMIN',
  status: 'authenticated',
  refresh: vi.fn(),
  getById: vi.fn(),
  list: vi.fn(),
  mine: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../../code/frontend/src/auth/AuthContext', () => ({
  useAuth: () => ({ status: mocks.status, user: { id: 1, role: mocks.role }, refresh: mocks.refresh }),
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
    mocks.status = 'authenticated';
    mocks.refresh.mockResolvedValue(undefined);
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
    expect(mocks.mine).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'อัปเดตรีวิว' })).toBeInTheDocument();
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

  it('shows save errors beside the submit button and refreshes auth on 401', async () => {
    mocks.role = 'LEARNER';
    mocks.update.mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'กรุณาเข้าสู่ระบบ'));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'อัปเดตรีวิว' }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('กรุณาเข้าสู่ระบบ');
    expect(alert.closest('form')).not.toBeNull();
    expect(alert.closest('section')).toBeNull();
  });

  it('sends the review page as the login return destination', async () => {
    mocks.status = 'guest';
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/courses/7/reviews?sort=new']}>
      <Routes>
        <Route path="/courses/:courseId/reviews" element={<ReviewsPage />} />
        <Route path="/login" element={<LoginDestination />} />
      </Routes>
    </MemoryRouter>);
    await user.click(screen.getByRole('link', { name: 'เข้าสู่ระบบเพื่อรีวิว' }));
    expect(screen.getByText('/courses/7/reviews?sort=new')).toBeInTheDocument();
  });

  it('disables pagination while the next page is loading', async () => {
    const nextPage = deferred<ReturnType<typeof emptyPage>>();
    mocks.list.mockImplementation((_id: number, page: number) => page === 0
      ? Promise.resolve({ ...emptyPage(), totalPages: 2, last: false })
      : nextPage.promise);
    const user = userEvent.setup();
    renderPage();
    const next = await screen.findByRole('button', { name: 'ถัดไป' });
    await user.click(next);
    expect(next).toBeDisabled();
    await user.click(next);
    expect(mocks.list).toHaveBeenCalledTimes(2);
    expect(screen.getByText('หน้า 1 จาก 2')).toBeInTheDocument();
    await act(async () => { nextPage.resolve({ ...emptyPage(), page: 1, totalPages: 2, first: false }); });
    expect(screen.getByText('หน้า 2 จาก 2')).toBeInTheDocument();
  });

  it('retries a failed previous page without decrementing past the last loaded page', async () => {
    let firstPageRequests = 0;
    mocks.list.mockImplementation((_id: number, page: number) => {
      if (page === 0) {
        firstPageRequests++;
        return firstPageRequests === 2
          ? Promise.reject(new ApiError(500, 'REQUEST_FAILED', 'โหลดหน้ารีวิวไม่ได้'))
          : Promise.resolve({ ...emptyPage(), totalPages: 2, last: false });
      }
      if (page === 1) return Promise.resolve({ ...emptyPage(), page: 1, totalPages: 2, first: false });
      throw new Error(`Unexpected page ${page}`);
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'ถัดไป' }));
    expect(await screen.findByText('หน้า 2 จาก 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ก่อนหน้า' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('โหลดหน้ารีวิวไม่ได้');
    expect(screen.getByText('หน้า 2 จาก 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ก่อนหน้า' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'ก่อนหน้า' }));
    expect(mocks.list.mock.calls.map((call) => call[1])).toEqual([0, 1, 0]);
    await user.click(screen.getByRole('button', { name: 'ลองใหม่' }));
    await waitFor(() => expect(screen.getByText('หน้า 1 จาก 2')).toBeInTheDocument());
    expect(mocks.list.mock.calls.map((call) => call[1])).toEqual([0, 1, 0, 0]);
  });

  it('returns to the last valid page if the review count shrinks', async () => {
    mocks.list.mockImplementation((_id: number, page: number) => Promise.resolve(page === 0
      ? { ...emptyPage(), totalPages: 2, last: false }
      : { ...emptyPage(), page: 1, totalPages: 1, first: false }));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'ถัดไป' }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(7, 1, expect.any(AbortSignal)));
    await waitFor(() => expect(screen.getByText('หน้า 1 จาก 2')).toBeInTheDocument());
    expect(screen.queryByText('หน้า 2 จาก 1')).not.toBeInTheDocument();
  });
});

function LoginDestination() {
  const location = useLocation();
  return <p>{(location.state as { from: string }).from}</p>;
}

function emptyPage() {
  return { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true };
}
