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
    return <Link className="text-sm font-semibold text-blue-700 underline" to="/login" state={{ from: `${location.pathname}${location.search}` }}>เข้าสู่ระบบเพื่อบันทึก</Link>;
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
    <div>
      <button type="button" disabled={pending} aria-pressed={saved}
        aria-label={`${saved ? 'ยกเลิกบันทึก' : 'บันทึก'} ${courseTitle}`}
        onClick={() => void toggle()}
        className="rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">
        {pending ? 'กำลังบันทึก…' : saved ? '♥ บันทึกแล้ว' : '♡ บันทึกคอร์ส'}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
