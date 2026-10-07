import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { getErrorMessage } from '../api/client';
import type { CatalogCourse, CatalogOption } from '../features/catalog/types';
import { getCourseMatches, getMatcherCategories } from '../features/matcher/matcherApi';
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
    <main className="min-h-[calc(100vh-73px)] bg-slate-50 px-5 py-10 text-slate-900 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <Link to="/courses" className="text-sm font-semibold text-cyan-800 hover:underline">← ดูคอร์สทั้งหมด</Link>
        <header className="mt-6 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-700">CourseHub Matcher</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">หาคอร์สที่เข้ากับคุณ</h1>
          <p className="mt-3 leading-7 text-slate-600">ตอบคำถาม 4 ช่วง แล้วดูคอร์สที่ตรงกับสิ่งที่อยากเรียน งบ และเวลาที่มี</p>
        </header>

        {result ? (
          <section aria-labelledby="match-results-title" className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="match-results-title" className="text-2xl font-bold">ผลแนะนำคอร์ส</h2>
                <p className="mt-1 text-slate-600">แสดงสูงสุด 3 คอร์สที่ผ่านเงื่อนไขของคุณ</p>
              </div>
              <button type="button" onClick={editAnswers} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold hover:bg-slate-100">แก้คำตอบ</button>
            </div>
            {result.matches.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-white p-6" role="status">
                <h3 className="text-lg font-bold">ยังไม่พบคอร์สที่ตรงทุกเงื่อนไข</h3>
                <p className="mt-2 text-slate-600">ลองปรับคำตอบแล้วค้นหาอีกครั้ง ระบบจะไม่เปลี่ยนเงื่อนไขให้เอง</p>
                {result.constraints.length > 0 && (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-700">
                    {result.constraints.map((constraint) => (
                      <li key={constraint.code}>{constraint.message}{constraint.excludedCourseCount > 0 ? ` (${constraint.excludedCourseCount} คอร์ส)` : ''}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <ol className="mt-6 grid gap-5">
                {result.matches.map((match, index) => (
                  <li key={match.course.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-cyan-700">อันดับ {index + 1} · {match.course.provider.name}</p>
                        <h3 className="mt-1 text-xl font-bold">{match.course.title}</h3>
                        <p className="mt-2 text-sm text-slate-600">{match.course.platform.name} · {match.course.price?.paymentType === 'FREE' ? 'ฟรี' : match.course.price?.amount != null ? `${match.course.price.amount.toLocaleString('th-TH')} บาท` : 'ดูราคาที่เว็บไซต์'}</p>
                      </div>
                      <p className="rounded-xl bg-cyan-50 px-4 py-2 text-lg font-bold text-cyan-900">{match.score.toFixed(2)} / 100</p>
                    </div>
                    {match.course.description && <p className="mt-4 text-slate-700">{match.course.description}</p>}
                    <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {match.reasons.map((reason) => <li key={reason.code}>{reason.message}</li>)}
                    </ul>
                    {match.course.externalUrl && (
                      <a href={match.course.externalUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white hover:bg-slate-700">ดูคอร์ส</a>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        ) : (
          <section aria-labelledby="quiz-title" className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-cyan-700">ข้อ {step + 1} จาก {steps.length}</p>
            <h2 id="quiz-title" className="mt-2 text-2xl font-bold">{steps[step]}</h2>
            <ol aria-label="ความคืบหน้าแบบทดสอบ" className="mt-5 grid grid-cols-4 gap-2">
              {steps.map((name, index) => <li key={name} aria-current={index === step ? 'step' : undefined} className={`h-2 rounded-full ${index <= step ? 'bg-cyan-600' : 'bg-slate-200'}`}><span className="sr-only">{name}</span></li>)}
            </ol>
            <form onSubmit={handleNext} noValidate className="mt-8 space-y-5">
              {step === 0 && (
                <div>
                  <label htmlFor="match-category" className="block font-semibold">อยากเรียนเรื่องอะไร</label>
                  <select id="match-category" value={categorySlug} onChange={(event) => { setCategorySlug(event.target.value); setValidationError(''); }} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3" disabled={categories.length === 0}>
                    <option value="">เลือกหมวดหมู่</option>
                    {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
                  </select>
                  {categoryError && <p role="alert" className="mt-3 text-sm text-red-700">โหลดหมวดหมู่ไม่ได้: {categoryError} <button type="button" onClick={() => setCategoryRetry((count) => count + 1)} className="font-semibold underline">ลองอีกครั้ง</button></p>}
                  {categoriesLoading && <p role="status" className="mt-3 text-sm text-slate-600">กำลังโหลดหมวดหมู่…</p>}
                  {!categoriesLoading && !categoryError && categories.length === 0 && <p role="status" className="mt-3 text-sm text-slate-600">ยังไม่มีหมวดหมู่ให้เลือกในขณะนี้</p>}
                </div>
              )}
              {step === 1 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div><label htmlFor="match-level" className="block font-semibold">ระดับที่เหมาะกับคุณ</label><select id="match-level" value={level} onChange={(event) => setLevel(event.target.value as CatalogCourse['level'] | '')} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"><option value="">เลือกระดับ</option>{levels.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                  <div><label htmlFor="match-language" className="block font-semibold">ภาษาของคอร์ส</label><select id="match-language" value={language} onChange={(event) => setLanguage(event.target.value as CatalogCourse['language'] | '')} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"><option value="">เลือกภาษา</option>{languages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                </div>
              )}
              {step === 2 && <div><label htmlFor="match-budget" className="block font-semibold">งบประมาณสูงสุด (บาท)</label><input id="match-budget" type="number" min="0" max="99999999.99" step="0.01" inputMode="decimal" value={budget} onChange={(event) => setBudget(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="เช่น 1000 หรือ 0 สำหรับคอร์สฟรี" /><p className="mt-2 text-sm text-slate-500">ระบุ 0 ได้ถ้าอยากดูเฉพาะคอร์สฟรีหรือคอร์สราคา 0 บาท</p></div>}
              {step === 3 && <div><label htmlFor="match-hours" className="block font-semibold">มีเวลาเรียนกี่ชั่วโมงต่อสัปดาห์</label><input id="match-hours" type="number" min="1" max="168" step="1" inputMode="numeric" value={hours} onChange={(event) => setHours(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="เช่น 4" /><p className="mt-2 text-sm text-slate-500">คะแนนด้านเวลาประเมินจากเป้าหมายเรียนจบภายใน 4 สัปดาห์</p></div>}
              {validationError && <p role="alert" className="text-sm font-medium text-red-700">{validationError}</p>}
              {requestError && <p role="alert" className="text-sm font-medium text-red-700">ขอผลแนะนำไม่ได้: {requestError}</p>}
              <div className="flex justify-between gap-3 pt-4">
                <button type="button" onClick={() => { setValidationError(''); setStep((current) => current - 1); }} disabled={step === 0 || submitting} className="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold disabled:opacity-40">ย้อนกลับ</button>
                <button type="submit" disabled={submitting || (step === 0 && categories.length === 0)} className="rounded-xl bg-cyan-700 px-5 py-2.5 font-semibold text-white hover:bg-cyan-600 disabled:opacity-50">{submitting ? 'กำลังค้นหา…' : step === steps.length - 1 ? 'ดูผลแนะนำ' : 'ถัดไป'}</button>
              </div>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
