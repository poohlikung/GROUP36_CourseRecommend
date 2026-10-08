import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, getErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { CatalogCourseCard } from '../features/catalog/CatalogCourseCard';
import type { CatalogCourse, CatalogPage } from '../features/catalog/types';
import { bookmarkApi } from '../features/bookmarks/bookmarkApi';

export function BookmarksPage() {
  const { refresh } = useAuth();
  const [page, setPage] = useState(0);
  const [data, setData] = useState<CatalogPage<CatalogCourse> | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    bookmarkApi.list(page, controller.signal)
      .then((result) => { setData(result); setError(''); })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        if (requestError instanceof ApiError && requestError.status === 401) void refresh();
        setError(getErrorMessage(requestError));
      });
    return () => controller.abort();
  }, [page, retry]);

  function removeCourse(courseId: number) {
    if (!data?.content.some((course) => course.id === courseId)) return;
    setData(null);
    if (data.content.length === 1 && page > 0) setPage(page - 1);
    else setRetry((value) => value + 1);
  }

  return (
    <main className="page-shell">
      <header className="relative overflow-hidden rounded-[2rem] bg-[color:var(--ink)] px-6 py-10 text-white shadow-2xl sm:px-10 sm:py-12">
        <div className="hero-grid absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-300/25 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-cyan-300">Your Learning Shelf</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-4xl">คอร์สที่บันทึกไว้</h1>
            <p className="mt-3 text-slate-300">รายการนี้เห็นได้เฉพาะบัญชีของคุณ</p>
          </div>
          <Link to="/courses" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15">
            สำรวจคอร์สเพิ่ม <span className="ml-2" aria-hidden="true">→</span>
          </Link>
        </div>
      </header>
      {error && <div role="alert" className="alert-error mt-8 flex flex-wrap items-center justify-between gap-3">{error} <button type="button" className="ghost-button text-rose-800" onClick={() => setRetry((value) => value + 1)}>ลองใหม่</button></div>}
      {!error && !data && (
        <div role="status" className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label="กำลังโหลดคอร์สที่บันทึก…">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="surface-card h-[430px] p-6" aria-hidden="true">
              <div className="skeleton-block h-36" />
              <div className="skeleton-block mt-6 h-5 w-2/3" />
              <div className="skeleton-block mt-4 h-4 w-full" />
            </div>
          ))}
          <span className="sr-only">กำลังโหลดคอร์สที่บันทึก…</span>
        </div>
      )}
      {!error && data?.content.length === 0 && (
        <div className="empty-state mt-8 py-14">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-100 text-3xl text-rose-600" aria-hidden="true">♡</div>
          <p className="mt-5 text-xl font-black text-slate-950">ยังไม่มีคอร์สที่บันทึกไว้</p>
          <p className="mt-2">เก็บคอร์สที่สนใจไว้ แล้วกลับมาเปรียบเทียบภายหลังได้</p>
          <Link to="/courses" className="primary-button mt-6">ดูคอร์สทั้งหมด</Link>
        </div>
      )}
      {!error && data && data.content.length > 0 && <>
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data.content.map((course) => <CatalogCourseCard key={course.id} course={course} saved onBookmarkChange={(saved) => { if (!saved) removeCourse(course.id); }} />)}
        </div>
        {data.totalPages > 1 && <nav className="mt-8 flex items-center justify-center gap-4" aria-label="หน้าคอร์สที่บันทึก">
          <button type="button" className="secondary-button min-h-10 rounded-xl px-4 py-2 text-sm" disabled={data.first} onClick={() => { setData(null); setPage(page - 1); }}>ก่อนหน้า</button>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm">หน้า {data.page + 1} จาก {data.totalPages}</span>
          <button type="button" className="secondary-button min-h-10 rounded-xl px-4 py-2 text-sm" disabled={data.last} onClick={() => { setData(null); setPage(page + 1); }}>ถัดไป</button>
        </nav>}
      </>}
    </main>
  );
}
