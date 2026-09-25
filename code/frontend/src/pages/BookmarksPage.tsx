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
    <main className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <h1 className="text-3xl font-bold">คอร์สที่บันทึกไว้</h1>
      <p className="mt-2 text-slate-600">รายการนี้เห็นได้เฉพาะบัญชีของคุณ</p>
      {error && <div role="alert" className="mt-8 rounded-xl bg-rose-50 p-5 text-rose-800">{error} <button type="button" className="underline" onClick={() => setRetry((value) => value + 1)}>ลองใหม่</button></div>}
      {!error && !data && <p role="status" className="mt-8">กำลังโหลดคอร์สที่บันทึก…</p>}
      {!error && data?.content.length === 0 && <p className="mt-8 rounded-xl bg-white p-8">ยังไม่มีคอร์สที่บันทึกไว้ <Link to="/courses" className="text-blue-700 underline">ดูคอร์สทั้งหมด</Link></p>}
      {!error && data && data.content.length > 0 && <>
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data.content.map((course) => <CatalogCourseCard key={course.id} course={course} saved onBookmarkChange={(saved) => { if (!saved) removeCourse(course.id); }} />)}
        </div>
        {data.totalPages > 1 && <nav className="mt-8 flex items-center justify-center gap-4" aria-label="หน้าคอร์สที่บันทึก">
          <button type="button" disabled={data.first} onClick={() => { setData(null); setPage(page - 1); }}>ก่อนหน้า</button>
          <span>หน้า {data.page + 1} จาก {data.totalPages}</span>
          <button type="button" disabled={data.last} onClick={() => { setData(null); setPage(page + 1); }}>ถัดไป</button>
        </nav>}
      </>}
    </main>
  );
}
