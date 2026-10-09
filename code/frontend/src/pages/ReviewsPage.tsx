import { type FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ApiError, getErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { reviewApi, type Review, type ReviewInput, type ReviewPage } from '../features/reviews/reviewApi';

const initialInput: ReviewInput = { overallScore: 5, contentScore: 5, teachingScore: 5, difficultyScore: 3, body: '' };
const scoreFields: { key: keyof ReviewInput; label: string; hint: string }[] = [
  { key: 'overallScore', label: 'Overall', hint: 'Your total experience' },
  { key: 'contentScore', label: 'Content', hint: 'Quality and usefulness' },
  { key: 'teachingScore', label: 'Teaching', hint: 'Clarity and delivery' },
  { key: 'difficultyScore', label: 'Difficulty', hint: '1 easy, 5 challenging' },
];

export function ReviewsPage() {
  const courseId = Number(useParams().courseId);
  const { status } = useAuth();
  const [reviews, setReviews] = useState<ReviewPage | null>(null);
  const [mine, setMine] = useState<Review | null>(null);
  const [input, setInput] = useState<ReviewInput>(initialInput);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMine, setLoadingMine] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!Number.isInteger(courseId) || courseId <= 0) { setError('Invalid course'); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    reviewApi.list(courseId, page, controller.signal)
      .then(setReviews)
      .catch((requestError) => { if (!controller.signal.aborted) setError(getErrorMessage(requestError)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [courseId, page, reload]);

  useEffect(() => {
    if (status !== 'authenticated' || !Number.isInteger(courseId)) { setMine(null); setInput(initialInput); setLoadingMine(false); return; }
    const controller = new AbortController();
    setLoadingMine(true);
    reviewApi.mine(courseId, controller.signal).then((review) => {
      setMine(review);
      setInput({ overallScore: review.overallScore, contentScore: review.contentScore, teachingScore: review.teachingScore, difficultyScore: review.difficultyScore, body: review.body ?? '' });
    }).catch((requestError) => {
      if (!controller.signal.aborted && requestError instanceof ApiError && requestError.status !== 404) setError(getErrorMessage(requestError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingMine(false);
    });
    return () => controller.abort();
  }, [courseId, status, reload]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const saved = mine ? await reviewApi.update(courseId, input) : await reviewApi.create(courseId, input);
      setMine(saved); setMessage(saved.status === 'PENDING' ? 'Review saved and sent for moderation.' : 'Review saved.');
      setReload((value) => value + 1);
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setSaving(false); }
  }

  return <main className="page-shell min-h-screen">
    <Link to="/courses" className="text-sm font-bold text-blue-700 hover:text-blue-900">← Back to catalog</Link>
    <header className="ink-surface relative mt-5 overflow-hidden rounded-[2rem] bg-[color:var(--ink)] px-6 py-10 text-white sm:px-10">
      <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="relative"><p className="text-xs font-extrabold uppercase tracking-[0.24em] text-cyan-300">Course voices</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Reviews that help you choose.</h1>
        <p className="mt-4 max-w-2xl text-slate-300">Read verified community experiences, or share a detailed rating after signing in.</p>
      </div>
    </header>

    <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-labelledby="reviews-heading">
        <div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Community</p><h2 id="reviews-heading" className="section-heading mt-2">Published reviews</h2></div>
          {reviews && <span className="status-chip border-amber-200 bg-amber-50 text-amber-800">★ {reviews.totalElements} reviews</span>}
        </div>
        {loading && <p className="empty-state mt-5">Loading reviews...</p>}
        {error && <p className="alert-error mt-5" role="alert">{error}</p>}
        {!loading && reviews?.content.length === 0 && <p className="empty-state mt-5">No published reviews yet. Be the first to share your experience.</p>}
        <div className="mt-5 space-y-4">{reviews?.content.map((review) => <article key={review.id} className="surface-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-slate-950">{review.reviewerDisplayName}</h3><p className="mt-1 text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</p></div><strong className="text-lg text-amber-700">★ {review.overallScore}/5</strong></div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><span className="rounded-xl bg-blue-50 p-2">Content <b>{review.contentScore}/5</b></span><span className="rounded-xl bg-emerald-50 p-2">Teaching <b>{review.teachingScore}/5</b></span><span className="rounded-xl bg-amber-50 p-2">Difficulty <b>{review.difficultyScore}/5</b></span></div>
          {review.body && <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">{review.body}</p>}
        </article>)}</div>
        {reviews && reviews.totalPages > 1 && <nav aria-label="Review pages" className="mt-6 flex items-center justify-center gap-3"><button className="secondary-button" disabled={reviews.first} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="text-sm font-bold">{page + 1} / {reviews.totalPages}</span><button className="secondary-button" disabled={reviews.last} onClick={() => setPage((value) => value + 1)}>Next</button></nav>}
      </section>

      <aside className="surface-card p-5 sm:p-6 lg:sticky lg:top-24"><p className="eyebrow">Your voice</p><h2 className="mt-2 text-2xl font-black">{mine ? 'Manage your review' : 'Rate this course'}</h2>
        {status === 'guest' ? <div className="mt-5 rounded-2xl bg-blue-50 p-5"><p className="text-sm leading-6 text-slate-700">Sign in to add and manage your rating.</p><Link className="primary-button mt-4 w-full" to="/login">Sign in to review</Link></div> : status === 'authenticated' && !loadingMine ? <form className="mt-5 space-y-5" onSubmit={submit}>
          {scoreFields.map(({ key, label, hint }) => <fieldset key={key}><legend className="text-sm font-extrabold">{label} <span className="font-normal text-slate-500">— {hint}</span></legend><div className="mt-2 flex gap-1" role="radiogroup">{[1,2,3,4,5].map((score) => <label key={score} className="flex-1"><input className="peer sr-only" type="radio" name={key} value={score} checked={input[key] === score} onChange={() => setInput((current) => ({ ...current, [key]: score }))}/><span className="grid min-h-11 cursor-pointer place-items-center rounded-xl border border-slate-300 bg-white font-black text-slate-600 peer-checked:border-amber-400 peer-checked:bg-amber-50 peer-checked:text-amber-800">{score}</span></label>)}</div></fieldset>)}
          <label className="block text-sm font-extrabold">Comment <span className="font-normal text-slate-500">(optional)</span><textarea className="form-input min-h-32 resize-y" maxLength={2000} value={input.body} onChange={(event) => setInput((current) => ({ ...current, body: event.target.value }))} placeholder="What worked well? What should future learners know?"/></label>
          {mine && <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-600">Status: <b>{mine.status}</b>{mine.moderationReason ? ` — ${mine.moderationReason}` : ''}. Editing sends the review back to moderation.</p>}
          {message && <p className="alert-success" role="status">{message}</p>}<button className="primary-button w-full" disabled={saving}>{saving ? 'Saving...' : mine ? 'Update review' : 'Submit review'}</button>
        </form> : <p className="mt-5 text-sm text-slate-600">Checking your session...</p>}
      </aside>
    </div>
  </main>;
}
