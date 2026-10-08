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
  const visibleReviews = !loading && !error && reviews?.page === page ? reviews : null;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setReviews(null);
    reviewApi.list(status, page, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setReviews(result); })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setReviews(null);
          setError(getErrorMessage(cause));
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [status, page, reload]);

  async function decide(review: AdminReview, decision: ReviewDecision) {
    if (!visibleReviews || busyId !== null || review.status !== 'PENDING') return;
    setBusyId(review.id);
    setError('');
    setMessage('');
    try {
      await reviewApi.decide(review, decision, reasons[review.id] ?? '');
      setMessage(`บันทึกผลตรวจรีวิวของ ${review.reviewerDisplayName} แล้ว`);
      setReasons((current) => ({ ...current, [review.id]: '' }));
      setReviews(null);
      if (visibleReviews.content.length === 1 && page > 0) {
        setPage(page - 1);
      } else {
        setReload((value) => value + 1);
      }
    } catch (cause) {
      setError(getErrorMessage(cause));
      setReviews(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-labelledby="review-heading" className="surface-panel space-y-5 p-5 sm:p-7">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Community trust</p>
          <h2 id="review-heading" className="section-heading mt-2">รีวิว</h2>
          <p className="mt-1 text-sm text-slate-600">ดูแลคุณภาพเสียงจากผู้เรียนก่อนนำไปแสดงบนหน้าคอร์ส</p>
        </div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
          คิวที่แสดง
          <select
            aria-label="สถานะรีวิว"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ReviewStatus);
              setPage(0);
              setReviews(null);
              setError('');
              setMessage('');
            }}
            className="form-input !mt-1 !min-w-40 !py-2.5 text-sm normal-case tracking-normal"
          >
            <option value="PENDING">รอตรวจ</option>
            <option value="PUBLISHED">เผยแพร่</option>
            <option value="REJECTED">ปฏิเสธ</option>
          </select>
        </label>
      </div>
      {message && <p role="status" className="alert-success">{message}</p>}
      {error && <p role="alert" className="alert-error">{error}</p>}
      {loading && (
        <div className="grid gap-3 sm:grid-cols-2" role="status" aria-label="กำลังโหลดรีวิว">
          <div className="skeleton-block h-40" />
          <div className="skeleton-block h-40" />
          <span className="sr-only">กำลังโหลดรีวิว…</span>
        </div>
      )}
      {error && !loading && <button type="button" onClick={() => { setError(''); setReload((value) => value + 1); }}
        className="secondary-button !min-h-10 !px-4 !py-2 text-sm">ลองโหลดใหม่</button>}
      {visibleReviews?.content.length === 0 && <p className="empty-state">ไม่มีรีวิวในสถานะนี้</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {visibleReviews?.content.map((review) => (
          <article
            key={review.id}
            aria-labelledby={`review-title-${review.id}`}
            className="surface-card depth-card flex flex-col gap-4 p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-slate-500">รีวิวโดย {review.reviewerDisplayName}</p>
                <h3 id={`review-title-${review.id}`} className="mt-1 text-lg font-black tracking-tight text-slate-950">{review.courseTitle}</h3>
              </div>
              <span className="status-chip shrink-0 border-violet-200 bg-violet-50 text-violet-800">{review.status}</span>
            </div>
            <dl className="grid grid-cols-4 gap-2 rounded-2xl bg-slate-950 p-3 text-center text-white">
              <div><dt className="text-[10px] uppercase tracking-wide text-slate-400">รวม</dt><dd className="mt-1 text-lg font-black text-cyan-300">{review.overallScore}/5</dd></div>
              <div><dt className="text-[10px] uppercase tracking-wide text-slate-400">เนื้อหา</dt><dd className="mt-1 text-lg font-black">{review.contentScore}/5</dd></div>
              <div><dt className="text-[10px] uppercase tracking-wide text-slate-400">การสอน</dt><dd className="mt-1 text-lg font-black">{review.teachingScore}/5</dd></div>
              <div><dt className="text-[10px] uppercase tracking-wide text-slate-400">ความยาก</dt><dd className="mt-1 text-lg font-black">{review.difficultyScore}/5</dd></div>
            </dl>
            <blockquote className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-slate-700">{review.body || 'ไม่มีข้อความรีวิว'}</blockquote>
            {review.moderationReason && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">เหตุผล: {review.moderationReason}</p>}
            {review.status === 'PENDING' && (
              <>
                <label className="block text-sm font-bold text-slate-700">เหตุผลที่ปฏิเสธ
                  <textarea aria-label={`เหตุผลที่ปฏิเสธรีวิว ${review.id}`} maxLength={1000}
                    value={reasons[review.id] ?? ''}
                    onChange={(event) => setReasons((current) => ({ ...current, [review.id]: event.target.value }))}
                    className="form-input min-h-24 resize-y text-sm font-normal" />
                </label>
                <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-200/80 pt-4">
                  <button type="button" disabled={loading || !!error || busyId !== null} onClick={() => void decide(review, 'APPROVE')}
                    className="primary-button !min-h-10 !px-4 !py-2 text-sm">อนุมัติรีวิว</button>
                  <button type="button" disabled={loading || !!error || busyId !== null || !(reasons[review.id] ?? '').trim()}
                    onClick={() => void decide(review, 'REJECT')}
                    className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-rose-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-600 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50">ปฏิเสธรีวิว</button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
      {visibleReviews && visibleReviews.totalPages > 1 && (
        <nav aria-label="หน้ารายการรีวิว" className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200/80 pt-5">
          <button type="button" disabled={visibleReviews.first || loading} onClick={() => { setReviews(null); setPage((value) => value - 1); }} className="ghost-button !min-h-10">ก่อนหน้า</button>
          <span className="status-chip border-slate-200 bg-white text-slate-700">หน้า {visibleReviews.page + 1} จาก {visibleReviews.totalPages}</span>
          <button type="button" disabled={visibleReviews.last || loading} onClick={() => { setReviews(null); setPage((value) => value + 1); }} className="ghost-button !min-h-10">ถัดไป</button>
        </nav>
      )}
    </section>
  );
}
