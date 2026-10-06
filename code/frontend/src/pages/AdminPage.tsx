import { useEffect, useState } from 'react';

import { getErrorMessage } from '../api/client';
import { adminApi } from '../features/admin/adminApi';
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
    <main className="mx-auto max-w-6xl space-y-10 px-5 py-8">
      <div>
        <h1 className="text-3xl font-bold">งานตรวจของ Admin</h1>
        <p className="mt-2 text-slate-600">ตรวจรายละเอียดและลิงก์ต้นทางก่อนตัดสินใจ ระบบบันทึกผู้ตรวจและเหตุผล</p>
      </div>
      {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-green-800">{message}</p>}

      <section aria-labelledby="course-heading" className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 id="course-heading" className="text-2xl font-semibold">คอร์ส</h2>
          <select aria-label="สถานะคอร์ส" value={courseStatus} onChange={(event) => { setCourseStatus(event.target.value as CourseStatus); setCourses([]); setCourseError(''); }}>
            <option value="PENDING">รอตรวจ</option>
            <option value="PUBLISHED">เผยแพร่</option>
            <option value="SUSPENDED">ระงับ</option>
            <option value="ARCHIVED">เก็บถาวร</option>
          </select>
        </div>
        {courseError && <p role="alert" className="text-red-700">{courseError}</p>}
        {courseLoading ? <p className="text-slate-500">กำลังโหลดคอร์ส…</p> : courses.length === 0 && !courseError && <p className="text-slate-500">ไม่มีคอร์สในสถานะนี้</p>}
        {courses.map((course) => (
          <article key={course.id} className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">{course.title}</h3>
            <p>Provider: {course.providerName} · แพลตฟอร์ม: {course.platformName} · สถานะ: {course.status}</p>
            <p>{course.description || 'ไม่มีคำอธิบาย'}</p>
            <p>ระดับ: {course.level} · ภาษา: {course.language} · ราคา: {course.paymentType === 'FREE' ? 'ฟรี' : `${course.amount ?? 'ดูที่เว็บไซต์'} ${course.currency}`}</p>
            <a href={course.url} target="_blank" rel="noopener noreferrer" className="text-cyan-700 underline">ตรวจลิงก์คอร์สต้นทาง</a>
            {courseActions[course.status]?.some((action) => action.reason) && (
              <label className="block">เหตุผล
                <textarea aria-label={`เหตุผลสำหรับคอร์ส ${course.title}`} maxLength={1000} value={courseReasons[course.id] ?? ''}
                  onChange={(event) => setCourseReasons({ ...courseReasons, [course.id]: event.target.value })}
                  className="mt-1 block w-full rounded border p-2" />
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              {courseActions[course.status]?.map((action) => (
                <button key={action.decision} type="button" onClick={() => void decideCourse(course, action.decision)}
                  disabled={busy || (action.reason && !(courseReasons[course.id] ?? '').trim())}
                  className="rounded bg-cyan-700 px-3 py-2 text-white disabled:opacity-50">{action.label}</button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section aria-labelledby="provider-heading" className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 id="provider-heading" className="text-2xl font-semibold">Provider</h2>
          <select aria-label="สถานะ Provider" value={providerStatus} onChange={(event) => { setProviderStatus(event.target.value as ProviderStatus); setProviders([]); setProviderError(''); }}>
            <option value="PENDING">รอรับรอง</option>
            <option value="ACTIVE">รับรองแล้ว</option>
            <option value="SUSPENDED">ระงับ</option>
          </select>
        </div>
        {providerError && <p role="alert" className="text-red-700">{providerError}</p>}
        {providerLoading ? <p className="text-slate-500">กำลังโหลด Provider…</p> : providers.length === 0 && !providerError && <p className="text-slate-500">ไม่มี Provider ในสถานะนี้</p>}
        {providers.map((provider) => (
          <article key={provider.id} className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">{provider.name}</h3>
            <p>{provider.description || 'ไม่มีคำอธิบาย'}</p>
            {provider.websiteUrl && <a href={provider.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-700 underline">ตรวจเว็บไซต์ Provider</a>}
            {provider.status === 'ACTIVE' && (
              <label className="block">เหตุผลในการระงับ
                <textarea aria-label={`เหตุผลสำหรับ Provider ${provider.name}`} maxLength={1000} value={providerReasons[provider.id] ?? ''}
                  onChange={(event) => setProviderReasons({ ...providerReasons, [provider.id]: event.target.value })}
                  className="mt-1 block w-full rounded border p-2" />
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              {providerActions[provider.status].map((action) => (
                <button key={action.decision} type="button" onClick={() => void decideProvider(provider, action.decision)}
                  disabled={busy || (action.reason && !(providerReasons[provider.id] ?? '').trim())}
                  className="rounded bg-cyan-700 px-3 py-2 text-white disabled:opacity-50">{action.label}</button>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
