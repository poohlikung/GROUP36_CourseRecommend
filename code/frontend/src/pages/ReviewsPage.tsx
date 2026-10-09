import { type FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { ApiError, getErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { courseApi } from '../features/course/courseApi';
import { reviewApi, type Review, type ReviewInput, type ReviewPage } from '../features/reviews/reviewApi';

const initialInput: ReviewInput = { overallScore: 5, contentScore: 5, teachingScore: 5, difficultyScore: 3, body: '' };
const scoreFields: { key: keyof ReviewInput; label: string; hint: string }[] = [
  { key: 'overallScore', label: 'คะแนนรวม', hint: 'ประสบการณ์โดยรวม' },
  { key: 'contentScore', label: 'เนื้อหา', hint: 'คุณภาพและประโยชน์ที่ได้รับ' },
  { key: 'teachingScore', label: 'การสอน', hint: 'ความชัดเจนในการอธิบาย' },
  { key: 'difficultyScore', label: 'ความยาก', hint: '1 ง่าย ถึง 5 ยาก' },
];

const reviewStatusLabels: Record<Review['status'], string> = {
  PENDING: 'รอตรวจสอบ', PUBLISHED: 'เผยแพร่แล้ว', REJECTED: 'ไม่ผ่านการตรวจสอบ',
};

export function ReviewsPage() {
  const courseId = Number(useParams().courseId);
  // A new course must get fresh form and pagination state on the first render.
  return <CourseReviewsPage key={courseId} courseId={courseId} />;
}

function CourseReviewsPage({ courseId }: { courseId: number }) {
  const { status, user, refresh } = useAuth();
  const location = useLocation();
  const canReview = status === 'authenticated' && user?.role === 'LEARNER';
  const [courseTitle, setCourseTitle] = useState('');
  const [courseError, setCourseError] = useState('');
  const [reviews, setReviews] = useState<ReviewPage | null>(null);
  const [mine, setMine] = useState<Review | null>(null);
  const [input, setInput] = useState<ReviewInput>(initialInput);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMine, setLoadingMine] = useState(true);
  const [mineError, setMineError] = useState('');
  const [mineReload, setMineReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!Number.isInteger(courseId) || courseId <= 0) return;
    const controller = new AbortController();
    setCourseTitle(''); setCourseError('');
    courseApi.getById(courseId, controller.signal)
      .then((course) => { if (!controller.signal.aborted) setCourseTitle(course.title); })
      .catch((requestError) => { if (!controller.signal.aborted) setCourseError(getErrorMessage(requestError)); });
    return () => controller.abort();
  }, [courseId]);

  useEffect(() => {
    if (!Number.isInteger(courseId) || courseId <= 0) { setError('ไม่พบคอร์สที่ต้องการ'); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    let pageCorrected = false;
    reviewApi.list(courseId, page, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (page > 0 && page >= result.totalPages) {
          pageCorrected = true;
          setPage(Math.max(0, result.totalPages - 1));
          return;
        }
        setReviews(result);
      })
      .catch((requestError) => { if (!controller.signal.aborted) setError(getErrorMessage(requestError)); })
      .finally(() => { if (!controller.signal.aborted && !pageCorrected) setLoading(false); });
    return () => controller.abort();
  }, [courseId, page, reload]);

  useEffect(() => {
    if (!canReview || !Number.isInteger(courseId) || courseId <= 0) { setMine(null); setInput(initialInput); setLoadingMine(status === 'loading'); return; }
    const controller = new AbortController();
    setLoadingMine(true); setMineError('');
    reviewApi.mine(courseId, controller.signal).then((review) => {
      if (controller.signal.aborted) return;
      setMine(review);
      setInput({ overallScore: review.overallScore, contentScore: review.contentScore, teachingScore: review.teachingScore, difficultyScore: review.difficultyScore, body: review.body ?? '' });
    }).catch((requestError) => {
      if (controller.signal.aborted) return;
      if (requestError instanceof ApiError && requestError.status === 404) {
        setMine(null);
        setInput(initialInput);
      } else {
        setMineError(getErrorMessage(requestError));
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingMine(false);
    });
    return () => controller.abort();
  }, [canReview, courseId, mineReload, status]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canReview || loadingMine || mineError) return;
    setSaving(true); setFormError(''); setMessage('');
    try {
      const saved = mine ? await reviewApi.update(courseId, input) : await reviewApi.create(courseId, input);
      setMine(saved); setMessage(saved.status === 'PENDING' ? 'บันทึกรีวิวแล้วและส่งให้ผู้ดูแลตรวจสอบ' : 'บันทึกรีวิวแล้ว');
      setReload((value) => value + 1);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) await refresh();
      setFormError(getErrorMessage(requestError));
    }
    finally { setSaving(false); }
  }

  return <main className="page-shell min-h-screen">
    <Link to="/courses" className="text-sm font-bold text-blue-700 hover:text-blue-900">← กลับไปหน้าคอร์ส</Link>
    <header className="ink-surface relative mt-5 overflow-hidden rounded-[2rem] bg-[color:var(--ink)] px-6 py-10 text-white sm:px-10">
      <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="relative"><p className="text-xs font-extrabold tracking-[0.24em] text-cyan-300">เสียงจากผู้เรียน</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">รีวิวคอร์ส{courseTitle ? ` ${courseTitle}` : ''}</h1>
        <p className="mt-4 max-w-2xl text-slate-300">อ่านประสบการณ์จากผู้เรียน หรือเข้าสู่ระบบเพื่อแบ่งปันความคิดเห็นของคุณ</p>
        {courseError && <p className="mt-3 text-sm text-rose-200" role="alert">โหลดชื่อคอร์สไม่ได้: {courseError}</p>}
      </div>
    </header>

    <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-labelledby="reviews-heading">
        <div className="flex items-end justify-between gap-4"><div><p className="eyebrow">ความคิดเห็นจากผู้เรียน</p><h2 id="reviews-heading" className="section-heading mt-2">รีวิวที่เผยแพร่</h2></div>
          {reviews && <span className="status-chip border-amber-200 bg-amber-50 text-amber-800">★ {reviews.totalElements} รีวิว</span>}
        </div>
        {loading && <p className="empty-state mt-5">กำลังโหลดรีวิว…</p>}
        {error && <p className="alert-error mt-5" role="alert">{error}</p>}
        {!loading && reviews?.content.length === 0 && <p className="empty-state mt-5">ยังไม่มีรีวิวที่เผยแพร่</p>}
        <div className="mt-5 space-y-4">{reviews?.content.map((review) => <article key={review.id} className="surface-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-slate-950">{review.reviewerDisplayName}</h3><p className="mt-1 text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString('th-TH')}</p></div><strong className="text-lg text-amber-700">★ {review.overallScore}/5</strong></div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><span className="rounded-xl bg-blue-50 p-2">เนื้อหา <b>{review.contentScore}/5</b></span><span className="rounded-xl bg-emerald-50 p-2">การสอน <b>{review.teachingScore}/5</b></span><span className="rounded-xl bg-amber-50 p-2">ความยาก <b>{review.difficultyScore}/5</b></span></div>
          {review.body && <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">{review.body}</p>}
        </article>)}</div>
        {reviews && reviews.totalPages > 1 && <nav aria-label="หน้ารีวิว" className="mt-6 flex items-center justify-center gap-3"><button className="secondary-button" disabled={loading || reviews.first} onClick={() => { setLoading(true); setPage((value) => value - 1); }}>ก่อนหน้า</button><span className="text-sm font-bold">หน้า {reviews.page + 1} จาก {reviews.totalPages}</span><button className="secondary-button" disabled={loading || reviews.last} onClick={() => { setLoading(true); setPage((value) => value + 1); }}>ถัดไป</button></nav>}
      </section>

      <aside className="surface-card p-5 sm:p-6 lg:sticky lg:top-24"><p className="eyebrow">ความคิดเห็นของคุณ</p><h2 className="mt-2 text-2xl font-black">{status === 'authenticated' && !canReview ? 'การเขียนรีวิว' : mine ? 'จัดการรีวิวของคุณ' : 'ให้คะแนนคอร์สนี้'}</h2>
        {status === 'guest' ? <div className="mt-5 rounded-2xl bg-blue-50 p-5"><p className="text-sm leading-6 text-slate-700">เข้าสู่ระบบเพื่อเขียนและจัดการรีวิวของคุณ</p><Link className="primary-button mt-4 w-full" to="/login" state={{ from: `${location.pathname}${location.search}` }}>เข้าสู่ระบบเพื่อรีวิว</Link></div> : status === 'authenticated' && !canReview ? <p className="mt-5 text-sm text-slate-600">เฉพาะบัญชีผู้เรียนเท่านั้นที่เขียนรีวิวได้</p> : canReview && mineError ? <div className="mt-5"><p className="alert-error" role="alert">โหลดรีวิวของคุณไม่ได้: {mineError}</p><button className="secondary-button mt-3" type="button" onClick={() => setMineReload((value) => value + 1)}>ลองใหม่</button></div> : canReview && !loadingMine ? <form className="mt-5 space-y-5" onSubmit={submit}>
          {scoreFields.map(({ key, label, hint }) => <fieldset key={key}><legend className="text-sm font-extrabold">{label} <span className="font-normal text-slate-500">— {hint}</span></legend><div className="mt-2 flex gap-1" role="radiogroup">{[1,2,3,4,5].map((score) => <label key={score} className="flex-1"><input className="peer sr-only" type="radio" name={key} value={score} checked={input[key] === score} onChange={() => setInput((current) => ({ ...current, [key]: score }))}/><span className="grid min-h-11 cursor-pointer place-items-center rounded-xl border border-slate-300 bg-white font-black text-slate-600 peer-checked:border-amber-400 peer-checked:bg-amber-50 peer-checked:text-amber-800 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-600 peer-focus-visible:ring-offset-2">{score}</span></label>)}</div></fieldset>)}
          <label className="block text-sm font-extrabold">ความคิดเห็น <span className="font-normal text-slate-500">(ไม่บังคับ)</span><textarea className="form-input min-h-32 resize-y" maxLength={2000} value={input.body} onChange={(event) => setInput((current) => ({ ...current, body: event.target.value }))} placeholder="คอร์สนี้มีข้อดีอะไร และผู้เรียนคนอื่นควรรู้อะไรบ้าง"/></label>
          {mine && <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-600">สถานะ: <b>{reviewStatusLabels[mine.status]}</b>{mine.moderationReason ? ` — เหตุผล: ${mine.moderationReason}` : ''} การแก้ไขจะส่งรีวิวกลับไปให้ผู้ดูแลตรวจอีกครั้ง</p>}
          {message && <p className="alert-success" role="status">{message}</p>}{formError && <p className="alert-error" role="alert">{formError}</p>}<button className="primary-button w-full" disabled={saving}>{saving ? 'กำลังบันทึก…' : mine ? 'อัปเดตรีวิว' : 'ส่งรีวิว'}</button>
        </form> : <p className="mt-5 text-sm text-slate-600">กำลังตรวจสอบบัญชีและรีวิวของคุณ…</p>}
      </aside>
    </div>
  </main>;
}
