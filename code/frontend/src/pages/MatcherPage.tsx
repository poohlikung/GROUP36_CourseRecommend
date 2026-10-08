import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { getErrorMessage } from '../api/client';
import type { CatalogCourse, CatalogOption } from '../features/catalog/types';
import { getCourseMatches, getMatcherCategories, getMatcherCategoryCourses } from '../features/matcher/matcherApi';
import type { MatchResponse } from '../features/matcher/types';

const steps = ['หมวดหมู่', 'ระดับและภาษา', 'งบประมาณ', 'เวลาเรียน'];
const levels: { value: CatalogCourse['level']; label: string }[] = [
  { value: 'BEGINNER', label: 'เริ่มต้น' },
  { value: 'INTERMEDIATE', label: 'ระดับกลาง' },
  { value: 'ADVANCED', label: 'ระดับสูง' },
];
const languages: { value: CatalogCourse['language']; label: string }[] = [
  { value: 'THAI', label: 'ภาษาไทย' },
  { value: 'ENGLISH', label: 'ภาษาอังกฤษ' },
  { value: 'SUB_THAI', label: 'อังกฤษพร้อมซับไทย' },
];

function isValidBudget(value: string) {
  return /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) <= 99_999_999.99;
}

function isValidHours(value: string) {
  return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 168;
}

export function MatcherPage() {
  const [categories, setCategories] = useState<CatalogOption[]>([]);
  const [categoryError, setCategoryError] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryRetry, setCategoryRetry] = useState(0);
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryData, setCategoryData] = useState<{ slug: string; courses: CatalogCourse[] } | null>(null);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [level, setLevel] = useState<CatalogCourse['level'] | ''>('');
  const [language, setLanguage] = useState<CatalogCourse['language'] | ''>('');
  const [budget, setBudget] = useState('');
  const [hours, setHours] = useState('');
  const [step, setStep] = useState(0);
  const [validationError, setValidationError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestController = useRef<AbortController | null>(null);
  const quizTitleRef = useRef<HTMLHeadingElement>(null);
  const resultsTitleRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const previouslyShowingResults = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setCategoryError('');
    setCategoriesLoading(true);
    getMatcherCategories(controller.signal)
      .then((options) => { if (!controller.signal.aborted) setCategories(options); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setCategoryError(getErrorMessage(error));
      })
      .finally(() => { if (!controller.signal.aborted) setCategoriesLoading(false); });
    return () => controller.abort();
  }, [categoryRetry]);

  useEffect(() => () => requestController.current?.abort(), []);

  useEffect(() => {
    if (!categorySlug) {
      setCategoryData(null);
      setAvailabilityError(false);
      return;
    }
    const controller = new AbortController();
    setAvailabilityError(false);
    getMatcherCategoryCourses(categorySlug, controller.signal)
      .then((courses) => { if (!controller.signal.aborted) setCategoryData({ slug: categorySlug, courses }); })
      .catch(() => { if (!controller.signal.aborted) setAvailabilityError(true); });
    return () => controller.abort();
  }, [categorySlug]);

  const categoryCourses = categoryData?.slug === categorySlug ? categoryData.courses : null;
  const matchableCourses = categoryCourses?.filter((course) => course.price?.paymentType === 'FREE'
    || (course.price?.paymentType === 'ONE_TIME' && course.price.amount !== null
      && course.price.amount >= 0 && course.price.currency?.toUpperCase() === 'THB'));
  const levelCourses = matchableCourses?.filter((course) => !level || course.level === level);
  const matchingChoices = levelCourses?.filter((course) => !language || course.language === language);
  const minimumPrice = matchingChoices?.length
    ? matchingChoices.reduce((lowest, course) => Math.min(lowest,
      course.price?.paymentType === 'FREE' ? 0 : course.price?.amount ?? Infinity), Infinity)
    : null;
  const selectedCategoryName = categories.find((category) => category.slug === categorySlug)?.name;
  const emptyResultHint = categoryCourses?.length === 0
    ? 'หมวดนี้ยังไม่มีคอร์สที่เผยแพร่ ลองเลือกหมวดอื่น'
    : matchableCourses?.length === 0
      ? 'คอร์สในหมวดนี้ยังไม่มีราคาแบบฟรีหรือจ่ายครั้งเดียวเป็นบาทที่ระบบจับคู่ได้'
      : matchingChoices?.length === 0
        ? 'ยังไม่มีคอร์สในหมวดนี้ที่ตรงระดับและภาษาที่เลือก'
        : minimumPrice !== null && Number(budget) < minimumPrice
          ? `คอร์สที่ตรงหมวด ระดับ และภาษาเริ่มต้น ${minimumPrice.toLocaleString('th-TH')} บาท สูงกว่างบ ${Number(budget).toLocaleString('th-TH')} บาท`
          : '';

  useLayoutEffect(() => {
    const showingResults = result !== null;
    const stepChanged = previousStep.current !== step;
    const viewChanged = previouslyShowingResults.current !== showingResults;

    previousStep.current = step;
    previouslyShowingResults.current = showingResults;

    if (!stepChanged && !viewChanged) return;

    (showingResults ? resultsTitleRef.current : quizTitleRef.current)?.focus();
  }, [result, step]);

  function checkStep() {
    if (step === 0 && !categorySlug) return 'กรุณาเลือกหมวดหมู่';
    if (step === 1 && (!level || !language)) return 'กรุณาเลือกระดับและภาษา';
    if (step === 2 && !isValidBudget(budget)) return 'กรุณาระบุงบ 0–99,999,999.99 บาท ทศนิยมไม่เกิน 2 ตำแหน่ง';
    if (step === 3 && !isValidHours(hours)) return 'กรุณาระบุเวลาเรียน 1–168 ชั่วโมงต่อสัปดาห์เป็นจำนวนเต็ม';
    return '';
  }

  async function handleNext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = checkStep();
    setValidationError(error);
    if (error) return;
    if (step < steps.length - 1) {
      setStep(step + 1);
      return;
    }

    if (!level || !language) return;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setSubmitting(true);
    setRequestError('');
    try {
      const response = await getCourseMatches({
        categorySlug,
        level,
        language,
        budgetThb: Number(budget),
        hoursPerWeek: Number(hours),
      }, controller.signal);
      if (!controller.signal.aborted) setResult(response);
    } catch (requestFailure) {
      if (!controller.signal.aborted) setRequestError(getErrorMessage(requestFailure));
    } finally {
      if (!controller.signal.aborted) setSubmitting(false);
    }
  }

  function editAnswers() {
    setResult(null);
    setRequestError('');
    setStep(0);
  }

  return (
    <main className="page-shell max-w-6xl">
      <Link to="/courses" className="inline-flex min-h-10 items-center rounded-xl text-sm font-bold text-blue-700 transition hover:-translate-x-1 hover:text-blue-900">← ดูคอร์สทั้งหมด</Link>
      <header className="ink-surface relative mt-5 overflow-hidden rounded-[2rem] bg-[color:var(--ink)] p-7 text-white shadow-2xl sm:p-10">
        <div className="hero-grid absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl" aria-hidden="true" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-cyan-300">CourseHub Matcher</p>
            <h1 className="mt-3 text-balance text-3xl font-black tracking-[-0.035em] sm:text-5xl">หาคอร์สที่เข้ากับคุณ</h1>
            <p className="mt-4 max-w-xl leading-7 text-slate-300">ตอบคำถาม 4 ช่วง แล้วดูคอร์สที่ตรงกับสิ่งที่อยากเรียน งบ และเวลาที่มี</p>
          </div>
          <div className="hidden items-center gap-3 lg:flex" aria-hidden="true">
            {steps.map((name, index) => (
              <div key={name} className={`grid h-16 w-16 place-items-center rounded-2xl border text-lg font-black shadow-xl ${index === step && !result ? 'border-cyan-200 bg-cyan-300 text-slate-950' : 'border-white/20 bg-white/10 text-white'}`}>{index + 1}</div>
            ))}
          </div>
        </div>
      </header>

        {result ? (
          <section aria-labelledby="match-results-title" className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">เส้นทางที่เหมาะกับคุณ</p>
                <h2
                  ref={resultsTitleRef}
                  id="match-results-title"
                  className="section-heading mt-3"
                  tabIndex={-1}
                  aria-describedby={result.matches.length === 0 ? 'match-empty-title' : 'match-results-summary'}
                >
                  ผลแนะนำคอร์ส
                </h2>
                <p id="match-results-summary" className="mt-1 text-slate-600">แสดงสูงสุด 3 คอร์สที่ผ่านเงื่อนไขของคุณ</p>
              </div>
              <button type="button" onClick={editAnswers} className="secondary-button">แก้คำตอบ</button>
            </div>
            {result.matches.length === 0 ? (
              <div className="surface-panel mt-6 p-7 sm:p-9">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-2xl" aria-hidden="true">⌕</div>
                <h3 id="match-empty-title" className="mt-5 text-xl font-black">ยังไม่พบคอร์สที่ตรงทุกเงื่อนไข</h3>
                <p className="mt-2 text-slate-600">ลองปรับคำตอบแล้วค้นหาอีกครั้ง ระบบจะไม่เปลี่ยนเงื่อนไขให้เอง</p>
                {emptyResultHint && <p className="mt-3 font-bold text-amber-900">{emptyResultHint}</p>}
                {categoryCourses && (
                  <p className="mt-3 text-sm text-slate-700">
                    ในหมวด {selectedCategoryName} มีคอร์สเผยแพร่ {categoryCourses.length} คอร์ส
                    {matchingChoices && ` โดย ${matchingChoices.length} คอร์สตรงระดับและภาษาที่เลือกและรองรับการจับคู่`}
                    {minimumPrice !== null && ` ราคาต่ำสุด ${minimumPrice.toLocaleString('th-TH')} บาท`}
                  </p>
                )}
                {result.constraints.length > 0 && (
                  <div className="mt-5">
                  <p className="text-sm font-bold text-slate-600">ข้อจำกัดที่พบจากคอร์สทั้งหมด (หนึ่งคอร์สอาจมีหลายข้อ)</p>
                  <ul className="mt-3 grid gap-3 text-slate-700">
                    {result.constraints.map((constraint) => (
                      <li key={constraint.code} className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold">{constraint.message}{constraint.excludedCourseCount > 0 ? ` (${constraint.excludedCourseCount} คอร์ส)` : ''}</li>
                    ))}
                  </ul>
                  </div>
                )}
              </div>
            ) : (
              <ol className="mt-6 grid gap-5">
                {result.matches.map((match, index) => (
                  <li key={match.course.id} className="surface-card depth-card relative overflow-hidden p-6 sm:p-8">
                    <div className={`absolute bottom-0 left-0 top-0 w-2 ${index === 0 ? 'bg-[color:var(--coral)]' : index === 1 ? 'bg-[color:var(--cyan)]' : 'bg-[color:var(--mint)]'}`} aria-hidden="true" />
                    <div className="flex flex-wrap items-start justify-between gap-5 pl-2">
                      <div className="max-w-2xl">
                        <p className="text-sm font-extrabold text-blue-700">อันดับ {index + 1} · {match.course.provider.name}</p>
                        <h3 className="mt-2 text-2xl font-black tracking-[-0.02em]">{match.course.title}</h3>
                        <p className="mt-2 text-sm text-slate-600">{match.course.platform.name} · {match.course.price?.paymentType === 'FREE' ? 'ฟรี' : match.course.price?.amount != null ? `${match.course.price.amount.toLocaleString('th-TH')} บาท` : 'ดูราคาที่เว็บไซต์'}</p>
                      </div>
                      <p className="rounded-2xl border border-cyan-100 bg-cyan-50 px-5 py-3 text-lg font-black text-cyan-900 shadow-sm">{match.score.toFixed(2)} / 100</p>
                    </div>
                    {match.course.description && <p className="mt-5 pl-2 leading-7 text-slate-700">{match.course.description}</p>}
                    <ul className="mt-5 flex flex-wrap gap-2 pl-2 text-sm font-semibold text-slate-700">
                      {match.reasons.map((reason) => <li key={reason.code} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2"><span aria-hidden="true">✓ </span><span>{reason.message}</span></li>)}
                    </ul>
                    {match.course.externalUrl && (
                      <a href={match.course.externalUrl} target="_blank" rel="noopener noreferrer" className="primary-button ml-2 mt-6">ดูคอร์ส <span aria-hidden="true">↗</span></a>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        ) : (
          <section aria-labelledby="quiz-title" className="surface-panel mt-8 overflow-hidden p-0">
            <div className="grid lg:grid-cols-[17rem_1fr]">
              <aside className="bg-blue-50/80 p-6 sm:p-8" aria-label="ความคืบหน้าแบบทดสอบ">
                <p className="text-sm font-extrabold text-blue-700">ข้อ {step + 1} จาก {steps.length}</p>
                <ol className="mt-6 grid grid-cols-4 gap-2 lg:grid-cols-1 lg:gap-3">
                  {steps.map((name, index) => (
                    <li key={name} aria-current={index === step ? 'step' : undefined} className={`flex min-h-12 items-center gap-3 rounded-2xl border px-3 py-2 text-sm font-bold transition ${index === step ? 'border-blue-200 bg-white text-blue-800 shadow-sm' : index < step ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-transparent text-slate-600'}`}>
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs ${index === step ? 'bg-blue-600 text-white' : index < step ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`} aria-hidden="true">{index < step ? '✓' : index + 1}</span>
                      <span className="hidden lg:inline">{name}</span>
                      <span className="sr-only lg:hidden">{name}</span>
                    </li>
                  ))}
                </ol>
              </aside>
              <div className="p-6 sm:p-9">
                <p className="eyebrow">คำถามของคุณ</p>
                <h2 ref={quizTitleRef} id="quiz-title" className="section-heading mt-3" tabIndex={-1}>{steps[step]}</h2>
                <form onSubmit={handleNext} noValidate className="mt-8 space-y-6">
              {step === 0 && (
                <div>
                  <label htmlFor="match-category" className="block font-extrabold">อยากเรียนเรื่องอะไร</label>
                  <select id="match-category" value={categorySlug} onChange={(event) => { setCategorySlug(event.target.value); setLevel(''); setLanguage(''); setValidationError(''); }} className="form-input" disabled={categories.length === 0}>
                    <option value="">เลือกหมวดหมู่</option>
                    {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
                  </select>
                  {categoryError && <p role="alert" className="alert-error mt-3">โหลดหมวดหมู่ไม่ได้: {categoryError} <button type="button" onClick={() => setCategoryRetry((count) => count + 1)} className="font-bold underline underline-offset-4">ลองอีกครั้ง</button></p>}
                  {categoriesLoading && <p role="status" className="mt-3 text-sm text-slate-600">กำลังโหลดหมวดหมู่…</p>}
                  {!categoriesLoading && !categoryError && categories.length === 0 && <p role="status" className="mt-3 text-sm text-slate-600">ยังไม่มีหมวดหมู่ให้เลือกในขณะนี้</p>}
                  {categorySlug && !categoryCourses && !availabilityError && <p role="status" className="mt-3 text-sm text-slate-600">กำลังตรวจคอร์สในหมวดนี้…</p>}
                  {categoryCourses && <p role="status" className="mt-3 text-sm text-slate-600">มีคอร์สเผยแพร่ในหมวดนี้ {categoryCourses.length} คอร์ส · รองรับการจับคู่ {matchableCourses?.length ?? 0} คอร์ส</p>}
                  {categoryCourses && matchableCourses?.length === 0 && <p className="mt-2 text-sm font-semibold text-amber-900">หมวดนี้ยังไม่มีคอร์สที่จับคู่ได้ ลองเลือกหมวดอื่น</p>}
                  {availabilityError && <p role="status" className="mt-3 text-sm text-slate-600">ยังตรวจจำนวนคอร์สไม่ได้ แต่ทำแบบทดสอบต่อได้</p>}
                </div>
              )}
              {step === 1 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div><label htmlFor="match-level" className="block font-extrabold">ระดับที่เหมาะกับคุณ</label><select id="match-level" value={level} onChange={(event) => { setLevel(event.target.value as CatalogCourse['level'] | ''); setLanguage(''); }} className="form-input"><option value="">เลือกระดับ</option>{levels.map((item) => <option key={item.value} value={item.value}>{item.label}{matchableCourses ? ` (${matchableCourses.filter((course) => course.level === item.value).length} คอร์ส)` : ''}</option>)}</select></div>
                  <div><label htmlFor="match-language" className="block font-extrabold">ภาษาของคอร์ส</label><select id="match-language" value={language} onChange={(event) => setLanguage(event.target.value as CatalogCourse['language'] | '')} className="form-input"><option value="">เลือกภาษา</option>{languages.map((item) => <option key={item.value} value={item.value}>{item.label}{levelCourses ? ` (${levelCourses.filter((course) => course.language === item.value).length} คอร์ส)` : ''}</option>)}</select></div>
                  {level && language && matchingChoices?.length === 0 && <p className="text-sm font-semibold text-amber-900 sm:col-span-2">ยังไม่มีคอร์สที่ตรงระดับและภาษานี้ในหมวดที่เลือก ลองเปลี่ยนตัวเลือก</p>}
                </div>
              )}
              {step === 2 && <div><label htmlFor="match-budget" className="block font-extrabold">งบประมาณสูงสุด (บาท)</label><input id="match-budget" type="number" min="0" max="99999999.99" step="0.01" inputMode="decimal" value={budget} onChange={(event) => setBudget(event.target.value)} className="form-input" placeholder="เช่น 1000 หรือ 0 สำหรับคอร์สฟรี" /><p className="mt-2 text-sm text-slate-500">ระบุ 0 ได้ถ้าอยากดูเฉพาะคอร์สฟรีหรือคอร์สราคา 0 บาท</p>{minimumPrice !== null && <p className="mt-2 text-sm font-semibold text-slate-700">คอร์สที่ตรงหมวด ระดับ และภาษาที่เลือก ราคาเริ่มต้น {minimumPrice.toLocaleString('th-TH')} บาท{budget && Number(budget) < minimumPrice ? ' · งบที่ระบุยังไม่ถึงราคานี้' : ''}</p>}</div>}
              {step === 3 && <div><label htmlFor="match-hours" className="block font-extrabold">มีเวลาเรียนกี่ชั่วโมงต่อสัปดาห์</label><input id="match-hours" type="number" min="1" max="168" step="1" inputMode="numeric" value={hours} onChange={(event) => setHours(event.target.value)} className="form-input" placeholder="เช่น 4" /><p className="mt-2 text-sm text-slate-500">คะแนนด้านเวลาประเมินจากเป้าหมายเรียนจบภายใน 4 สัปดาห์</p></div>}
              {validationError && <p role="alert" className="alert-error">{validationError}</p>}
              {requestError && <p role="alert" className="alert-error">ขอผลแนะนำไม่ได้: {requestError}</p>}
              <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-6">
                <button type="button" onClick={() => { setValidationError(''); setStep((current) => current - 1); }} disabled={step === 0 || submitting} className="secondary-button">ย้อนกลับ</button>
                <button type="submit" disabled={submitting || (step === 0 && categories.length === 0)} className="primary-button">{submitting ? 'กำลังค้นหา…' : step === steps.length - 1 ? 'ดูผลแนะนำ' : 'ถัดไป'} <span aria-hidden="true">→</span></button>
              </div>
            </form>
              </div>
            </div>
          </section>
        )}
    </main>
  );
}
