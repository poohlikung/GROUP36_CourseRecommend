import { useEffect, useState } from 'react';

import { getErrorMessage } from '../api/client';
import { adminApi } from '../features/admin/adminApi';
import { ReviewModerationSection } from '../features/admin/ReviewModerationSection';
import type { AdminProvider, CourseDecision, ProviderDecision, ProviderStatus } from '../features/admin/adminApi';
import type { CourseDetail, CourseStatus } from '../features/course/types';

const courseActions: Partial<Record<CourseStatus, { decision: CourseDecision; label: string; reason: boolean }[]>> = {
  PENDING: [
    { decision: 'APPROVE', label: 'อนุมัติเผยแพร่', reason: false },
    { decision: 'REQUEST_REVISION', label: 'ขอให้แก้ไข', reason: true },
  ],
  PUBLISHED: [
    { decision: 'SUSPEND', label: 'ระงับ', reason: true },
    { decision: 'ARCHIVE', label: 'เก็บถาวร', reason: true },
  ],
  SUSPENDED: [
    { decision: 'RESTORE', label: 'คืนสถานะเผยแพร่', reason: false },
    { decision: 'ARCHIVE', label: 'เก็บถาวร', reason: true },
  ],
};

const providerActions: Record<ProviderStatus, { decision: ProviderDecision; label: string; reason: boolean }[]> = {
  PENDING: [{ decision: 'APPROVE', label: 'รับรอง Provider', reason: false }],
  ACTIVE: [{ decision: 'SUSPEND', label: 'ระงับ Provider', reason: true }],
  SUSPENDED: [{ decision: 'RESTORE', label: 'คืนสถานะ Provider', reason: false }],
};

export function AdminPage() {
  const [courseStatus, setCourseStatus] = useState<CourseStatus>('PENDING');
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>('PENDING');
  const [courses, setCourses] = useState<CourseDetail[]>([]);
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [courseLoading, setCourseLoading] = useState(true);
  const [providerLoading, setProviderLoading] = useState(true);
  const [courseReasons, setCourseReasons] = useState<Record<number, string>>({});
  const [providerReasons, setProviderReasons] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [courseReload, setCourseReload] = useState(0);
  const [providerReload, setProviderReload] = useState(0);
  const [courseError, setCourseError] = useState('');
  const [providerError, setProviderError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setCourseLoading(true);
    adminApi.courses(courseStatus, controller.signal)
      .then(setCourses)
      .catch((error: unknown) => { if (!controller.signal.aborted) setCourseError(getErrorMessage(error)); })
      .finally(() => { if (!controller.signal.aborted) setCourseLoading(false); });
    return () => controller.abort();
  }, [courseStatus, courseReload]);

  useEffect(() => {
    const controller = new AbortController();
    setProviderLoading(true);
    adminApi.providers(providerStatus, controller.signal)
      .then(setProviders)
      .catch((error: unknown) => { if (!controller.signal.aborted) setProviderError(getErrorMessage(error)); })
      .finally(() => { if (!controller.signal.aborted) setProviderLoading(false); });
    return () => controller.abort();
  }, [providerStatus, providerReload]);

  async function decideCourse(course: CourseDetail, decision: CourseDecision) {
    setBusy(true);
    setCourseError('');
    setMessage('');
    try {
      await adminApi.decideCourse(course, decision, courseReasons[course.id] ?? '');
      setMessage(`บันทึกผลตรวจคอร์ส ${course.title} แล้ว`);
    } catch (error) {
      setCourseError(getErrorMessage(error));
    } finally {
      setCourseReload((value) => value + 1);
      setBusy(false);
    }
  }

  async function decideProvider(provider: AdminProvider, decision: ProviderDecision) {
    setBusy(true);
    setProviderError('');
    setMessage('');
    try {
      await adminApi.decideProvider(provider, decision, providerReasons[provider.id] ?? '');
      setMessage(`บันทึกผลตรวจ Provider ${provider.name} แล้ว`);
    } catch (error) {
      setProviderError(getErrorMessage(error));
    } finally {
      setProviderReload((value) => value + 1);
      setBusy(false);
    }
  }

  return (
    <main className="page-shell space-y-8">
      <header className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-9 text-white shadow-[0_28px_70px_rgba(4,20,46,0.24)] sm:px-9">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">CourseHub control room</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-4xl">งานตรวจของ Admin</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            ตรวจรายละเอียดและลิงก์ต้นทางก่อนตัดสินใจ ระบบบันทึกผู้ตรวจและเหตุผล
            เพื่อให้ทุกคอร์สและ Provider พร้อมสำหรับผู้เรียน
          </p>
        </div>
      </header>

      {message && <p role="status" className="alert-success">{message}</p>}

      <section aria-labelledby="course-heading" className="surface-panel space-y-5 p-5 sm:p-7">
        <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Content review</p>
            <h2 id="course-heading" className="section-heading mt-2">คอร์ส</h2>
            <p className="mt-1 text-sm text-slate-600">ตรวจเนื้อหา ราคา และปลายทางของคอร์สก่อนเปลี่ยนสถานะ</p>
          </div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            คิวที่แสดง
            <select
              aria-label="สถานะคอร์ส"
              value={courseStatus}
              onChange={(event) => { setCourseStatus(event.target.value as CourseStatus); setCourses([]); setCourseError(''); }}
              className="form-input !mt-1 !min-w-40 !py-2.5 text-sm normal-case tracking-normal"
            >
              <option value="PENDING">รอตรวจ</option>
              <option value="PUBLISHED">เผยแพร่</option>
              <option value="SUSPENDED">ระงับ</option>
              <option value="ARCHIVED">เก็บถาวร</option>
            </select>
          </label>
        </div>
        {courseError && <p role="alert" className="alert-error">{courseError}</p>}
        {courseLoading ? (
          <div className="grid gap-3 sm:grid-cols-2" role="status" aria-label="กำลังโหลดคอร์ส">
            <div className="skeleton-block h-36" />
            <div className="skeleton-block h-36" />
          </div>
        ) : courses.length === 0 && !courseError ? (
          <p className="empty-state">ไม่มีคอร์สในสถานะนี้</p>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {courses.map((course) => (
            <article
              key={course.id}
              aria-labelledby={`admin-course-${course.id}`}
              className="surface-card depth-card flex flex-col gap-4 p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">{course.providerName}</p>
                  <h3 id={`admin-course-${course.id}`} className="mt-1 text-lg font-black tracking-tight text-slate-950">{course.title}</h3>
                </div>
                <span className="status-chip shrink-0 border-blue-200 bg-blue-50 text-blue-800">{course.status}</span>
              </div>
              <p className="text-sm leading-6 text-slate-600">{course.description || 'ไม่มีคำอธิบาย'}</p>
              <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                <div><dt className="text-xs text-slate-500">แพลตฟอร์ม</dt><dd className="mt-1 font-bold text-slate-800">{course.platformName}</dd></div>
                <div><dt className="text-xs text-slate-500">ระดับ / ภาษา</dt><dd className="mt-1 font-bold text-slate-800">{course.level} · {course.language}</dd></div>
                <div className="col-span-2"><dt className="text-xs text-slate-500">ราคา</dt><dd className="mt-1 font-bold text-slate-800">{course.paymentType === 'FREE' ? 'ฟรี' : `${course.amount ?? 'ดูที่เว็บไซต์'} ${course.currency}`}</dd></div>
              </dl>
              <a href={course.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-bold text-blue-700 hover:text-blue-900 hover:underline">ตรวจลิงก์คอร์สต้นทาง ↗</a>
              {courseActions[course.status]?.some((action) => action.reason) && (
                <label className="block text-sm font-bold text-slate-700">เหตุผล
                  <textarea aria-label={`เหตุผลสำหรับคอร์ส ${course.title}`} maxLength={1000} value={courseReasons[course.id] ?? ''}
                    onChange={(event) => setCourseReasons({ ...courseReasons, [course.id]: event.target.value })}
                    className="form-input min-h-24 resize-y text-sm font-normal" />
                </label>
              )}
              <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-200/80 pt-4">
                {courseActions[course.status]?.map((action) => (
                  <button key={action.decision} type="button" onClick={() => void decideCourse(course, action.decision)}
                    disabled={busy || (action.reason && !(courseReasons[course.id] ?? '').trim())}
                    className={action.decision === 'APPROVE' || action.decision === 'RESTORE' ? 'primary-button !min-h-10 !px-4 !py-2 text-sm' : 'secondary-button !min-h-10 !px-4 !py-2 text-sm'}>{action.label}</button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="provider-heading" className="surface-panel space-y-5 p-5 sm:p-7">
        <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Partner review</p>
            <h2 id="provider-heading" className="section-heading mt-2">Provider</h2>
            <p className="mt-1 text-sm text-slate-600">รับรองและดูแลสถานะของสถาบันที่นำคอร์สเข้าสู่ระบบ</p>
          </div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            คิวที่แสดง
            <select
              aria-label="สถานะ Provider"
              value={providerStatus}
              onChange={(event) => { setProviderStatus(event.target.value as ProviderStatus); setProviders([]); setProviderError(''); }}
              className="form-input !mt-1 !min-w-40 !py-2.5 text-sm normal-case tracking-normal"
            >
              <option value="PENDING">รอรับรอง</option>
              <option value="ACTIVE">รับรองแล้ว</option>
              <option value="SUSPENDED">ระงับ</option>
            </select>
          </label>
        </div>
        {providerError && <p role="alert" className="alert-error">{providerError}</p>}
        {providerLoading ? (
          <div className="grid gap-3 sm:grid-cols-2" role="status" aria-label="กำลังโหลด Provider">
            <div className="skeleton-block h-32" />
            <div className="skeleton-block h-32" />
          </div>
        ) : providers.length === 0 && !providerError ? (
          <p className="empty-state">ไม่มี Provider ในสถานะนี้</p>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {providers.map((provider) => (
            <article
              key={provider.id}
              aria-labelledby={`admin-provider-${provider.id}`}
              className="surface-card depth-card flex flex-col gap-4 p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700">Learning partner</p>
                  <h3 id={`admin-provider-${provider.id}`} className="mt-1 text-lg font-black tracking-tight text-slate-950">{provider.name}</h3>
                </div>
                <span className="status-chip shrink-0 border-cyan-200 bg-cyan-50 text-cyan-800">{provider.status}</span>
              </div>
              <p className="text-sm leading-6 text-slate-600">{provider.description || 'ไม่มีคำอธิบาย'}</p>
              {provider.websiteUrl && <a href={provider.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-bold text-blue-700 hover:text-blue-900 hover:underline">ตรวจเว็บไซต์ Provider ↗</a>}
              {provider.status === 'ACTIVE' && (
                <label className="block text-sm font-bold text-slate-700">เหตุผลในการระงับ
                  <textarea aria-label={`เหตุผลสำหรับ Provider ${provider.name}`} maxLength={1000} value={providerReasons[provider.id] ?? ''}
                    onChange={(event) => setProviderReasons({ ...providerReasons, [provider.id]: event.target.value })}
                    className="form-input min-h-24 resize-y text-sm font-normal" />
                </label>
              )}
              <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-200/80 pt-4">
                {providerActions[provider.status].map((action) => (
                  <button key={action.decision} type="button" onClick={() => void decideProvider(provider, action.decision)}
                    disabled={busy || (action.reason && !(providerReasons[provider.id] ?? '').trim())}
                    className={action.decision === 'SUSPEND' ? 'secondary-button !min-h-10 !px-4 !py-2 text-sm' : 'primary-button !min-h-10 !px-4 !py-2 text-sm'}>{action.label}</button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
      <ReviewModerationSection />
    </main>
  );
}
