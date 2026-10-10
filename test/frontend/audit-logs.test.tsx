import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../code/frontend/src/api/client';
import { AdminRoute } from '../../code/frontend/src/components/RouteGuards';
import { AuditLogsPage } from '../../code/frontend/src/pages/AuditLogsPage';
import { cleanup, MemoryRouter, render, Route, Routes, screen, userEvent, waitFor } from '../../code/frontend/src/test/test-utils';

const mocks = vi.hoisted(() => ({ list: vi.fn(), role: 'ADMIN' }));
vi.mock('../../code/frontend/src/features/audit/auditLogApi', () => ({ auditLogApi: { list: mocks.list } }));
vi.mock('../../code/frontend/src/auth/AuthContext', () => ({
  useAuth: () => ({ status: 'authenticated', user: { role: mocks.role } }),
}));

const row = {
  id: 9, createdAt: '2026-01-01T00:00:00Z', actorId: 3, actorDisplayName: 'ผู้ตรวจ',
  action: 'COURSE_REQUEST_REVISION', entityType: 'COURSE', entityId: 41,
  oldStatus: 'PENDING', newStatus: 'REVISION_REQUESTED', reason: 'แก้ไขรายละเอียด '.repeat(30),
};
const page = (content = [row], number = 0, pages = 1) => ({
  content, page: number, size: 10, totalElements: pages * 10, totalPages: pages,
  first: number === 0, last: number === pages - 1,
});

function renderPage() { return render(<AuditLogsPage />); }

describe('audit logs page', () => {
  afterEach(cleanup);
  beforeEach(() => { mocks.list.mockReset(); mocks.role = 'ADMIN'; mocks.list.mockResolvedValue(page()); });

  it('renders Thai action, IDs, local time, nullable values and long reason', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'ขอแก้ไขคอร์ส' })).toBeInTheDocument();
    expect(screen.getByText('COURSE_REQUEST_REVISION')).toBeInTheDocument();
    expect(screen.getByText(/ผู้ตรวจ \(#3\)/)).toBeInTheDocument();
    expect(screen.getByText(/คอร์ส \/ #41/)).toBeInTheDocument();
    expect(screen.getByText(/แก้ไขรายละเอียด แก้ไขรายละเอียด/)).toBeInTheDocument();
    expect(screen.getByText(/เวลาแสดงตาม/)).toBeInTheDocument();
    expect(document.querySelector('time')).toHaveAttribute('dateTime', row.createdAt);
  });

  it('renders missing values and unknown action safely', async () => {
    mocks.list.mockResolvedValue(page([{ ...row, action: 'LEGACY_EVENT', oldStatus: null,
      newStatus: null, reason: null, actorDisplayName: '' }]));
    renderPage();
    expect(await screen.findByRole('heading', { name: 'LEGACY_EVENT' })).toBeInTheDocument();
    expect(screen.getByText(/ผู้ใช้ #3/)).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('searches, pages and clears filters', async () => {
    mocks.list.mockImplementation((_filters, number: number) => Promise.resolve(page([row], number, 3)));
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole('heading', { name: 'ขอแก้ไขคอร์ส' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('ประเภทข้อมูล'), 'COURSE');
    await user.type(screen.getByLabelText('ID ผู้กระทำ'), '3');
    await user.click(screen.getByRole('button', { name: 'ค้นหา' }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'COURSE', actorId: '3' }), 0, expect.any(AbortSignal)));
    await user.click(screen.getByRole('button', { name: 'หน้าถัดไป' }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'COURSE' }), 1, expect.any(AbortSignal)));
    await user.click(screen.getByRole('button', { name: 'ล้างตัวกรอง' }));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ entityType: '', actorId: '' }), 0, expect.any(AbortSignal)));
  });

  it('shows loading and empty results', async () => {
    let resolve!: (value: ReturnType<typeof page>) => void;
    mocks.list.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('กำลังโหลดประวัติ');
    resolve(page([]));
    expect(await screen.findByText('ไม่พบประวัติตามตัวกรอง')).toBeInTheDocument();
  });

  it('shows session expiry and retries the request', async () => {
    mocks.list.mockRejectedValueOnce(new ApiError(401, 'SESSION_INVALIDATED', 'หมดอายุ'))
      .mockResolvedValueOnce(page());
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ลองใหม่' }));
    expect(await screen.findByRole('heading', { name: 'ขอแก้ไขคอร์ส' })).toBeInTheDocument();
  });

  it('shows a server error and retries the request', async () => {
    mocks.list.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'ระบบขัดข้อง'))
      .mockResolvedValueOnce(page());
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('ระบบขัดข้อง');
    await user.click(screen.getByRole('button', { name: 'ลองใหม่' }));
    expect(await screen.findByRole('heading', { name: 'ขอแก้ไขคอร์ส' })).toBeInTheDocument();
  });

  it('ignores an older response after a new search', async () => {
    let resolve!: (value: ReturnType<typeof page>) => void;
    mocks.list.mockReturnValueOnce(new Promise((done) => { resolve = done; }))
      .mockResolvedValueOnce(page([{ ...row, id: 10, action: 'COURSE_CREATED' }]));
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(screen.getByLabelText('ประเภทข้อมูล'), 'COURSE');
    await user.click(screen.getByRole('button', { name: 'ค้นหา' }));
    expect(await screen.findByRole('heading', { name: 'สร้างคอร์ส' })).toBeInTheDocument();
    resolve(page());
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'ขอแก้ไขคอร์ส' })).not.toBeInTheDocument());
  });

  it('blocks non-admin route', () => {
    mocks.role = 'LEARNER';
    render(<MemoryRouter initialEntries={['/admin/audit-logs']}><Routes>
      <Route path="/admin/audit-logs" element={<AdminRoute><AuditLogsPage /></AdminRoute>} />
      <Route path="/" element={<p>หน้าแรก</p>} />
    </Routes></MemoryRouter>);
    expect(screen.getByText('หน้าแรก')).toBeInTheDocument();
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
