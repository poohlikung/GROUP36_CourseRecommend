import { useEffect, useState } from 'react';

import { getErrorMessage } from '../../api/client';
import { reviewApi } from './reviewApi';
import type { AdminReview, AdminReviewPage, ReviewDecision, ReviewStatus } from './reviewApi';

export function ReviewModerationSection() {
  const [status, setStatus] = useState<ReviewStatus>('PENDING');
  const [page, setPage] = useState(0);
  const [reviews, setReviews] = useState<AdminReviewPage | null>(null);
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    reviewApi.list(status, page, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setReviews(result); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(getErrorMessage(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [status, page, reload]);

  async function decide(review: AdminReview, decision: ReviewDecision) {
    setBusyId(review.id);
    setError('');
    setMessage('');
    try {
      await reviewApi.decide(review, decision, reasons[review.id] ?? '');
      setMessage(`บันทึกผลตรวจรีวิวของ ${review.reviewerDisplayName} แล้ว`);
      setReasons((current) => ({ ...current, [review.id]: '' }));
      if (reviews?.content.length === 1 && page > 0) {
        setPage(page - 1);
      } else {
        setReload((value) => value + 1);
      }
    } catch (cause) {
      setError(getErrorMessage(cause));
      setReload((value) => value + 1);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-labelledby="review-heading" className="space-y-4">
      <div className="flex items-center gap-4">
        <h2 id="review-heading" className="text-2xl font-semibold">รีวิว</h2>
        <select aria-label="สถานะรีวิว" value={status} onChange={(event) => {
          setStatus(event.target.value as ReviewStatus);
          setPage(0);
          setReviews(null);
          setError('');
          setMessage('');
        }}>
          <option value="PENDING">รอตรวจ</option>
          <option value="PUBLISHED">เผยแพร่</option>
          <option value="REJECTED">ปฏิเสธ</option>
        </select>
      </div>
      {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-green-800">{message}</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {loading && <p className="text-slate-500">กำลังโหลดรีวิว…</p>}
      {!loading && reviews?.content.length === 0 && !error && <p className="text-slate-500">ไม่มีรีวิวในสถานะนี้</p>}
      {reviews?.content.map((review) => (
        <article key={review.id} className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">{review.courseTitle}</h3>
          <p>ผู้รีวิว: {review.reviewerDisplayName} · สถานะ: {review.status}</p>
          <p>คะแนนรวม: {review.overallScore}/5 · เนื้อหา: {review.contentScore}/5 · การสอน: {review.teachingScore}/5 · ความยาก: {review.difficultyScore}/5</p>
          <p>{review.body || 'ไม่มีข้อความรีวิว'}</p>
          {review.moderationReason && <p>เหตุผล: {review.moderationReason}</p>}
          {review.status === 'PENDING' && (
            <>
              <label className="block">เหตุผลที่ปฏิเสธ
                <textarea aria-label={`เหตุผลที่ปฏิเสธรีวิว ${review.id}`} maxLength={1000}
                  value={reasons[review.id] ?? ''}
                  onChange={(event) => setReasons((current) => ({ ...current, [review.id]: event.target.value }))}
                  className="mt-1 block w-full rounded border p-2" />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busyId !== null} onClick={() => void decide(review, 'APPROVE')}
                  className="rounded bg-cyan-700 px-3 py-2 text-white disabled:opacity-50">อนุมัติรีวิว</button>
                <button type="button" disabled={busyId !== null || !(reasons[review.id] ?? '').trim()}
                  onClick={() => void decide(review, 'REJECT')}
                  className="rounded bg-rose-700 px-3 py-2 text-white disabled:opacity-50">ปฏิเสธรีวิว</button>
              </div>
            </>
          )}
        </article>
      ))}
      {reviews && reviews.totalPages > 1 && (
        <div className="flex items-center gap-3">
          <button type="button" disabled={reviews.first || loading} onClick={() => setPage((value) => value - 1)}>ก่อนหน้า</button>
          <span>หน้า {reviews.page + 1} จาก {reviews.totalPages}</span>
          <button type="button" disabled={reviews.last || loading} onClick={() => setPage((value) => value + 1)}>ถัดไป</button>
        </div>
      )}
    </section>
  );
}
