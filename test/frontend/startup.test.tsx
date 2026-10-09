import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../code/frontend/src/app/App';
import { ApiError } from '../../code/frontend/src/api/client';
import { restoreSession } from '../../code/frontend/src/auth/startup';
import { act, cleanup, MemoryRouter, render, screen } from '../../code/frontend/src/test/test-utils';

const mocks = vi.hoisted(() => ({ liveness: vi.fn(), currentUser: vi.fn() }));
vi.mock('../../code/frontend/src/api/system', () => ({ systemApi: { liveness: mocks.liveness } }));
vi.mock('../../code/frontend/src/api/auth', async () => {
  const actual = await vi.importActual<typeof import('../../code/frontend/src/api/auth')>('../../code/frontend/src/api/auth');
  return { ...actual, authApi: { ...actual.authApi, currentUser: mocks.currentUser } };
});
const user = { id: 1, email: 'learner@example.com', displayName: 'Learner', role: 'LEARNER' };
const guest = new ApiError(401, 'UNAUTHORIZED', 'guest');

beforeEach(() => {
  vi.useFakeTimers();
  mocks.liveness.mockReset().mockResolvedValue({ status: 'UP' });
  mocks.currentUser.mockReset().mockResolvedValue(user);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('backend startup', () => {
  it('checks liveness before restoring the existing session', async () => {
    await expect(restoreSession(new AbortController().signal)).resolves.toEqual(user);
    expect(mocks.liveness.mock.invocationCallOrder[0]).toBeLessThan(mocks.currentUser.mock.invocationCallOrder[0]);
    expect(mocks.currentUser).toHaveBeenCalledWith(expect.any(AbortSignal), 15_000);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('treats only a session 401 as guest', async () => {
    mocks.currentUser.mockRejectedValue(guest);
    await expect(restoreSession(new AbortController().signal)).resolves.toBeNull();
    expect(mocks.currentUser).toHaveBeenCalledTimes(1);
  });
  it.each([502, 503, 504])('recovers from HTTP %s without overlapping requests', async (status) => {
    mocks.liveness.mockRejectedValueOnce(new ApiError(status, 'UNAVAILABLE', 'unavailable'));
    const result = restoreSession(new AbortController().signal);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(mocks.liveness).toHaveBeenCalledTimes(1);
    expect(mocks.currentUser).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toEqual(user);
    expect(mocks.liveness).toHaveBeenCalledTimes(2);
  });
  it.each(['NETWORK_ERROR', 'REQUEST_TIMEOUT'])('recovers from %s while reading session', async (code) => {
    mocks.currentUser.mockRejectedValueOnce(new ApiError(0, code, 'temporary'));
    const result = restoreSession(new AbortController().signal);
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(result).resolves.toEqual(user);
  });
  it('does not retry a forbidden session', async () => {
    const forbidden = new ApiError(403, 'FORBIDDEN', 'forbidden');
    mocks.currentUser.mockRejectedValue(forbidden);
    await expect(restoreSession(new AbortController().signal)).rejects.toBe(forbidden);
    expect(mocks.currentUser).toHaveBeenCalledTimes(1);
  });
  it('stops after 180 seconds and clears timers', async () => {
    mocks.liveness.mockRejectedValue(new ApiError(503, 'UNAVAILABLE', 'sleeping'));
    const assertion = expect(restoreSession(new AbortController().signal)).rejects.toMatchObject({ code: 'STARTUP_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(180_000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('can recover after a backend takes two and a half minutes to wake', async () => {
    mocks.liveness.mockImplementation(async () => {
      if (Date.now() - started < 150_000) throw new ApiError(503, 'UNAVAILABLE', 'sleeping');
      return { status: 'UP' };
    });
    const started = Date.now();
    const result = restoreSession(new AbortController().signal);
    await vi.advanceTimersByTimeAsync(150_000);
    await expect(result).resolves.toEqual(user);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('aborts an in-flight probe at the overall deadline', async () => {
    mocks.liveness.mockImplementation((signal: AbortSignal) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }));
    const assertion = expect(restoreSession(new AbortController().signal)).rejects.toMatchObject({ code: 'STARTUP_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(180_000);
    await assertion;
    expect(mocks.liveness).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels retries when the caller aborts', async () => {
    mocks.liveness.mockRejectedValue(new ApiError(503, 'UNAVAILABLE', 'sleeping'));
    const controller = new AbortController();
    const assertion = expect(restoreSession(controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await assertion;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(mocks.liveness).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('startup UI', () => {
  it('keeps Home visible while preparing the backend', async () => {
    mocks.liveness.mockRejectedValue(new ApiError(503, 'UNAVAILABLE', 'sleeping'));
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'คอร์สที่ใช่ เริ่มต้นได้ที่นี่' })).toBeInTheDocument();
    expect(screen.getByText('การเปิดใช้งานครั้งแรกอาจใช้เวลา 2–3 นาที กรุณารอสักครู่')).toBeInTheDocument();
  });
  it('retries after exhaustion and preserves the protected route destination', async () => {
    mocks.liveness.mockRejectedValue(new ApiError(503, 'UNAVAILABLE', 'sleeping'));
    render(<MemoryRouter initialEntries={['/profile?from=retry']}><App /></MemoryRouter>);
    await act(async () => { await vi.advanceTimersByTimeAsync(180_000); });
    expect(screen.getByRole('heading', { name: 'เชื่อมต่อระบบไม่ได้' })).toBeInTheDocument();
    mocks.liveness.mockResolvedValue({ status: 'UP' });
    mocks.currentUser.mockRejectedValue(guest);
    await act(async () => { screen.getByRole('button', { name: 'ลองใหม่' }).click(); });
    expect(screen.getByRole('heading', { name: 'ยินดีต้อนรับกลับ' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ลองใหม่' })).not.toBeInTheDocument();
  });
  it('ignores results from an unmounted startup round', async () => {
    let resolveHealth!: (value: { status: string }) => void;
    mocks.liveness.mockImplementation(() => new Promise((resolve) => { resolveHealth = resolve; }));
    const view = render(<MemoryRouter initialEntries={['/login']}><App /></MemoryRouter>);
    view.unmount();
    await act(async () => { resolveHealth({ status: 'UP' }); });
    expect(mocks.currentUser).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
