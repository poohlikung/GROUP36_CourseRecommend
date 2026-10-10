import { afterEach, describe, expect, it, vi } from 'vitest';

import { MatcherPage } from '../../code/frontend/src/pages/MatcherPage';
import { cleanup, MemoryRouter, render, screen, userEvent, waitFor } from '../../code/frontend/src/test/test-utils';

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

const course = {
  id: 7,
  title: 'Java เบื้องต้น',
  slug: 'java-basics',
  description: 'เรียนพื้นฐาน Java',
  level: 'BEGINNER',
  language: 'THAI',
  effortHours: 12,
  provider: { id: 3, name: 'ผู้สอนตัวอย่าง', slug: 'sample-provider' },
  platform: { id: 4, name: 'CourseHub', slug: 'coursehub' },
  price: { paymentType: 'FREE', amount: null, currency: null },
  categories: [{ id: 1, name: 'โปรแกรมมิง', slug: 'programming' }],
  averageRating: null,
  reviewCount: 0,
  externalUrl: 'https://example.com/course',
};

function catalogPage(courses: unknown[]) {
  return jsonResponse({ content: courses, page: 0, size: 48, totalElements: courses.length,
    totalPages: courses.length ? 1 : 0, first: true, last: true });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function answerQuestions(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(await screen.findByLabelText('อยากเรียนเรื่องอะไร'), 'programming');
  await user.click(screen.getByRole('button', { name: 'ถัดไป' }));
  await user.selectOptions(screen.getByLabelText('ระดับที่เหมาะกับคุณ'), 'BEGINNER');
  await user.selectOptions(screen.getByLabelText('ภาษาของคอร์ส'), 'THAI');
  await user.click(screen.getByRole('button', { name: 'ถัดไป' }));
  await user.type(screen.getByLabelText('งบประมาณสูงสุด (บาท)'), '1000');
  await user.click(screen.getByRole('button', { name: 'ถัดไป' }));
  await user.type(screen.getByLabelText('มีเวลาเรียนกี่ชั่วโมงต่อสัปดาห์'), '4');
  await user.click(screen.getByRole('button', { name: 'ดูผลแนะนำ' }));
}

describe('course matcher quiz', () => {
  it('keeps the selected language when the learner changes level', async () => {
    const fetchMock = vi.fn(async (path: string) => {
      if (path === '/api/v1/catalog/categories') return jsonResponse([{ id: 1, name: 'โปรแกรมมิง', slug: 'programming' }]);
      if (path.startsWith('/api/v1/courses?category=programming')) return catalogPage([course]);
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter><MatcherPage /></MemoryRouter>);

    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('อยากเรียนเรื่องอะไร'), 'programming');
    await user.click(screen.getByRole('button', { name: 'ถัดไป' }));
    await user.selectOptions(screen.getByLabelText('ภาษาของคอร์ส'), 'THAI');
    await user.selectOptions(screen.getByLabelText('ระดับที่เหมาะกับคุณ'), 'BEGINNER');
    expect(screen.getByLabelText('ภาษาของคอร์ส')).toHaveValue('THAI');
    await user.selectOptions(screen.getByLabelText('ระดับที่เหมาะกับคุณ'), 'INTERMEDIATE');
    expect(screen.getByLabelText('ภาษาของคอร์ส')).toHaveValue('THAI');
  });

  it('submits answers with CSRF and shows course reasons', async () => {
    const fetchMock = vi.fn(async (path: string) => {
      if (path === '/api/v1/catalog/categories') return jsonResponse([{ id: 1, name: 'โปรแกรมมิง', slug: 'programming' }]);
      if (path.startsWith('/api/v1/courses?category=programming')) return catalogPage([course]);
      if (path === '/api/v1/auth/csrf') return jsonResponse({ headerName: 'X-XSRF-TOKEN', token: 'csrf-test' });
      if (path === '/api/v1/course-matches') return jsonResponse({
        matches: [{ course, score: 83.33, scoreBreakdown: [], reasons: [{ code: 'BUDGET', message: 'คอร์สนี้เรียนฟรี' }] }],
        constraints: [],
      });
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter><MatcherPage /></MemoryRouter>);

    await answerQuestions(userEvent.setup());

    expect(await screen.findByText('Java เบื้องต้น')).toBeInTheDocument();
    expect(screen.getByText('คอร์สนี้เรียนฟรี')).toBeInTheDocument();
    expect(screen.getByText('83.33 / 100')).toBeInTheDocument();
    const matchRequest = fetchMock.mock.calls.find(([path]) => path === '/api/v1/course-matches');
    expect(matchRequest).toBeDefined();
    const options = matchRequest?.[1] as RequestInit;
    expect(options.credentials).toBe('include');
    expect(new Headers(options.headers).get('X-XSRF-TOKEN')).toBe('csrf-test');
    expect(JSON.parse(options.body as string)).toEqual({
      categorySlug: 'programming', level: 'BEGINNER', language: 'THAI', budgetThb: 1000, hoursPerWeek: 4,
    });
  });

  it('validates hours before sending and explains empty results', async () => {
    const fetchMock = vi.fn(async (path: string) => {
      if (path === '/api/v1/catalog/categories') return jsonResponse([{ id: 1, name: 'โปรแกรมมิง', slug: 'programming' }]);
      if (path.startsWith('/api/v1/courses?category=programming')) return catalogPage([
        { ...course, price: { paymentType: 'ONE_TIME', amount: 1500, currency: 'THB' } },
      ]);
      if (path === '/api/v1/auth/csrf') return jsonResponse({ headerName: 'X-XSRF-TOKEN', token: 'csrf-test' });
      if (path === '/api/v1/course-matches') return jsonResponse({
        matches: [], constraints: [{ code: 'BUDGET_EXCEEDED', message: 'ราคาเกินงบที่เลือก ลองเพิ่มงบประมาณ', excludedCourseCount: 2 }],
      });
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter><MatcherPage /></MemoryRouter>);

    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('อยากเรียนเรื่องอะไร'), 'programming');
    await user.click(screen.getByRole('button', { name: 'ถัดไป' }));
    await user.selectOptions(screen.getByLabelText('ระดับที่เหมาะกับคุณ'), 'BEGINNER');
    await user.selectOptions(screen.getByLabelText('ภาษาของคอร์ส'), 'THAI');
    await user.click(screen.getByRole('button', { name: 'ถัดไป' }));
    await user.type(screen.getByLabelText('งบประมาณสูงสุด (บาท)'), '1000');
    await user.click(screen.getByRole('button', { name: 'ถัดไป' }));
    await user.click(screen.getByRole('button', { name: 'ดูผลแนะนำ' }));
    expect(screen.getByRole('alert')).toHaveTextContent('1–168 ชั่วโมง');
    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/v1/course-matches')).toHaveLength(0);

    await user.type(screen.getByLabelText('มีเวลาเรียนกี่ชั่วโมงต่อสัปดาห์'), '4');
    await user.click(screen.getByRole('button', { name: 'ดูผลแนะนำ' }));
    await waitFor(() => expect(screen.getByText('ยังไม่พบคอร์สที่ตรงทุกเงื่อนไข')).toBeInTheDocument());
    expect(screen.getByText(/คอร์สที่ตรงหมวด ระดับ และภาษาเริ่มต้น 1,500 บาท สูงกว่างบ 1,000 บาท/)).toBeInTheDocument();
    expect(screen.getByText('ราคาเกินงบที่เลือก ลองเพิ่มงบประมาณ (2 คอร์ส)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'แก้คำตอบ' }));
    expect(screen.getByLabelText('อยากเรียนเรื่องอะไร')).toHaveValue('programming');
  });

  it('shows when a category has no public courses before the learner submits', async () => {
    const fetchMock = vi.fn(async (path: string) => {
      if (path === '/api/v1/catalog/categories') return jsonResponse([{ id: 5, name: 'ธุรกิจ', slug: 'business-marketing' }]);
      if (path.startsWith('/api/v1/courses?category=business-marketing')) return catalogPage([]);
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter><MatcherPage /></MemoryRouter>);

    await userEvent.setup().selectOptions(await screen.findByLabelText('อยากเรียนเรื่องอะไร'), 'business-marketing');
    expect(await screen.findByText('มีคอร์สเผยแพร่ในหมวดนี้ 0 คอร์ส · รองรับการจับคู่ 0 คอร์ส')).toBeInTheDocument();
    expect(screen.getByText('หมวดนี้ยังไม่มีคอร์สที่จับคู่ได้ ลองเลือกหมวดอื่น')).toBeInTheDocument();
  });
});
