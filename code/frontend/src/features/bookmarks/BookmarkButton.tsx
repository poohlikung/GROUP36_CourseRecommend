import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiError, getErrorMessage } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { bookmarkApi } from './bookmarkApi';

type Props = {
  courseId: number;
  courseTitle: string;
  saved: boolean;
  onChange: (saved: boolean) => void;
};

export function BookmarkButton({ courseId, courseTitle, saved, onChange }: Props) {
  const { status, refresh } = useAuth();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  if (status === 'guest') {
    return <Link className="inline-flex min-h-10 items-center rounded-xl text-sm font-bold text-blue-700 underline decoration-blue-200 decoration-2 underline-offset-4 transition hover:text-blue-900" to="/login" state={{ from: `${location.pathname}${location.search}` }}>เข้าสู่ระบบเพื่อบันทึก</Link>;
  }
  if (status !== 'authenticated') return null;

  async function toggle() {
    setPending(true);
    setError('');
    try {
      if (saved) await bookmarkApi.remove(courseId);
      else await bookmarkApi.save(courseId);
      onChange(!saved);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) await refresh();
      setError(getErrorMessage(requestError));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-full">
      <button type="button" disabled={pending} aria-pressed={saved}
        aria-label={`${saved ? 'ยกเลิกบันทึก' : 'บันทึก'} ${courseTitle}`}
        onClick={() => void toggle()}
        className={`inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition disabled:cursor-wait disabled:opacity-60 ${saved ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'border-blue-200 bg-blue-50 text-blue-700 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100'}`}>
        <span className="text-lg leading-none" aria-hidden="true">{saved ? '♥' : '♡'}</span>
        {pending ? 'กำลังบันทึก…' : saved ? 'บันทึกแล้ว' : 'บันทึกคอร์ส'}
      </button>
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{error}</p>}
    </div>
  );
}
