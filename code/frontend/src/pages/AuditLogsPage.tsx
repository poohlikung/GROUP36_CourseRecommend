import { useEffect, useState, type FormEvent } from 'react';

import { ApiError, getErrorMessage } from '../api/client';
import { auditLogApi } from '../features/audit/auditLogApi';
import type { AuditLog, AuditLogFilters, AuditLogPage } from '../features/audit/types';

const emptyFilters: AuditLogFilters = {
  entityType: '', action: '', actorId: '', entityId: '', from: '', to: '',
};

const actions: Record<string, string> = {
  PUBLISH_COURSE: 'เผยแพร่คอร์ส (ข้อมูลเดิม)',
  COURSE_CREATED: 'สร้างคอร์ส', COURSE_UPDATED: 'แก้ไขคอร์ส', COURSE_SUBMITTED: 'ส่งคอร์สตรวจ',
  COURSE_DELETED: 'ลบคอร์ส', COURSE_APPROVE: 'อนุมัติคอร์ส',
  COURSE_REQUEST_REVISION: 'ขอแก้ไขคอร์ส', COURSE_SUSPEND: 'ระงับคอร์ส',
  COURSE_RESTORE: 'คืนสถานะคอร์ส', COURSE_ARCHIVE: 'เก็บคอร์สถาวร',
  PROVIDER_CREATED: 'สร้างผู้ให้บริการ', PROVIDER_UPDATED: 'แก้ไขผู้ให้บริการ',
  PROVIDER_DELETED: 'ลบผู้ให้บริการ', PROVIDER_APPROVE: 'รับรองผู้ให้บริการ',
  PROVIDER_SUSPEND: 'ระงับผู้ให้บริการ', PROVIDER_RESTORE: 'คืนสถานะผู้ให้บริการ',
  PROVIDER_MEMBER_ADDED: 'เพิ่มสมาชิกทีม', PROVIDER_MEMBER_REMOVED: 'ลบสมาชิกทีม',
  REVIEW_APPROVE: 'อนุมัติรีวิว', REVIEW_REJECT: 'ปฏิเสธรีวิว',
};

const entityTypes = [
  ['COURSE', 'คอร์ส'], ['PROVIDER', 'ผู้ให้บริการ'], ['PROVIDER_MEMBER', 'สมาชิกทีม'], ['REVIEW', 'รีวิว'],
];

function localTime(utc: string): string {
  const date = new Date(utc);
  return Number.isNaN(date.getTime()) ? utc : new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium', timeStyle: 'medium', hour12: false,
  }).format(date);
}

function LogCard({ log }: { log: AuditLog }) {
  return (
    <li className="surface-card min-w-0 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-black text-slate-900">{actions[log.action] ?? log.action}</h2>
          <p className="break-all text-xs text-slate-500">{log.action}</p>
        </div>
        <time dateTime={log.createdAt} className="text-sm text-slate-600">{localTime(log.createdAt)}</time>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-slate-500">ผู้กระทำ</dt><dd className="font-semibold">{log.actorDisplayName || `ผู้ใช้ #${log.actorId}`} (#{log.actorId})</dd></div>
        <div><dt className="text-slate-500">ประเภท / ID รายการ</dt><dd className="font-semibold">{entityTypes.find(([code]) => code === log.entityType)?.[1] ?? log.entityType} / #{log.entityId}</dd></div>
        <div><dt className="text-slate-500">สถานะก่อน</dt><dd className="font-semibold">{log.oldStatus || '—'}</dd></div>
        <div><dt className="text-slate-500">สถานะหลัง</dt><dd className="font-semibold">{log.newStatus || '—'}</dd></div>
      </dl>
      <div className="mt-3 border-t border-slate-200 pt-3 text-sm">
        <span className="text-slate-500">เหตุผล: </span><span className="whitespace-pre-wrap break-words">{log.reason || '—'}</span>
      </div>
    </li>
  );
}

export function AuditLogsPage() {
  const [draft, setDraft] = useState<AuditLogFilters>(emptyFilters);
  const [filters, setFilters] = useState<AuditLogFilters>(emptyFilters);
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<AuditLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setSessionExpired(false);
    auditLogApi.list(filters, page, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        setSessionExpired(cause instanceof ApiError && cause.status === 401);
        setError(getErrorMessage(cause));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, page, reload]);

  function update<K extends keyof AuditLogFilters>(key: K, value: AuditLogFilters[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setPage(0);
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.from && draft.to && new Date(draft.from) >= new Date(draft.to)) {
      setError('เวลาเริ่มต้นต้องก่อนเวลาสิ้นสุด');
      return;
    }
    setPage(0);
    setFilters({ ...draft });
  }

  function clear() {
    setDraft({ ...emptyFilters });
    setFilters({ ...emptyFilters });
    setPage(0);
  }

  return (
    <main className="page-shell space-y-6">
      <header className="surface-panel p-6 sm:p-8">
        <p className="eyebrow">ประวัติระบบ</p>
        <h1 className="section-heading mt-2">ประวัติการใช้งานระบบ</h1>
        <p className="mt-2 text-sm text-slate-600">ตรวจสอบกิจกรรมที่บันทึกไว้ตามเวลา ผู้กระทำ และรายการ</p>
      </header>
      <form onSubmit={search} className="surface-panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="ค้นหาประวัติ">
        <label className="text-sm font-bold">ประเภทข้อมูล
          <select className="form-input" value={draft.entityType} onChange={(e) => update('entityType', e.target.value)}>
            <option value="">ทั้งหมด</option>
            {entityTypes.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">กิจกรรม
          <select className="form-input" value={draft.action} onChange={(e) => update('action', e.target.value)}>
            <option value="">ทั้งหมด</option>
            {Object.entries(actions).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">ID ผู้กระทำ
          <input className="form-input" type="number" min="1" step="1" value={draft.actorId} onChange={(e) => update('actorId', e.target.value)} />
        </label>
        <label className="text-sm font-bold">ID รายการ
          <input className="form-input" type="number" min="1" step="1" value={draft.entityId} onChange={(e) => update('entityId', e.target.value)} />
        </label>
        <label className="text-sm font-bold">ตั้งแต่ ({timezone})
          <input className="form-input" type="datetime-local" value={draft.from} onChange={(e) => update('from', e.target.value)} />
        </label>
        <label className="text-sm font-bold">ก่อนเวลา ({timezone})
          <input className="form-input" type="datetime-local" value={draft.to} onChange={(e) => update('to', e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
          <button type="submit" className="primary-button">ค้นหา</button>
          <button type="button" onClick={clear} className="secondary-button">ล้างตัวกรอง</button>
        </div>
      </form>

      <section className="surface-panel p-5 sm:p-7" aria-busy={loading} aria-label="รายการประวัติ">
        {loading && <p role="status">กำลังโหลดประวัติ…</p>}
        {!loading && error && <div role="alert" className="alert-error">
          <p>{sessionExpired ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' : error}</p>
          <button type="button" className="secondary-button mt-3" onClick={() => setReload((value) => value + 1)}>ลองใหม่</button>
        </div>}
        {!loading && !error && data && <>
          <p className="mb-4 text-sm text-slate-600">พบ {data.totalElements} รายการ · หน้า {data.page + 1} จาก {Math.max(data.totalPages, 1)} · เวลาแสดงตาม {timezone}</p>
          {data.content.length === 0 ? <p className="empty-state">ไม่พบประวัติตามตัวกรอง</p> :
            <ul className="space-y-3">{data.content.map((log) => <LogCard key={log.id} log={log} />)}</ul>}
          <nav className="mt-5 flex flex-wrap items-center justify-between gap-3" aria-label="หน้าประวัติ">
            <button type="button" className="secondary-button" disabled={data.first} onClick={() => setPage((value) => value - 1)}>หน้าก่อน</button>
            <span className="text-sm">หน้า {data.page + 1}</span>
            <button type="button" className="secondary-button" disabled={data.last} onClick={() => setPage((value) => value + 1)}>หน้าถัดไป</button>
          </nav>
        </>}
      </section>
    </main>
  );
}
