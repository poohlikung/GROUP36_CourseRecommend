import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { CatalogCourseCard } from '../features/catalog/CatalogCourseCard';
import { bookmarkApi } from '../features/bookmarks/bookmarkApi';
import { useAuth } from '../auth/AuthContext';
import { getCatalogCourses, getCatalogOptions } from '../features/catalog/catalogApi';
import type { CatalogCourse, CatalogOption, CatalogPage as CatalogPageData } from '../features/catalog/types';

const emptyCatalogPage: CatalogPageData<CatalogCourse> = {
  content: [],
  page: 0,
  size: 12,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
};

export function CatalogPage() {
  const { status } = useAuth();
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [categories, setCategories] = useState<CatalogOption[]>([]);
  const [platforms, setPlatforms] = useState<CatalogOption[]>([]);
  const [catalog, setCatalog] = useState<CatalogPageData<CatalogCourse>>(emptyCatalogPage);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [platform, setPlatform] = useState('');
  const [level, setLevel] = useState('');
  const [language, setLanguage] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [optionsError, setOptionsError] = useState(false);
  const [coursesError, setCoursesError] = useState(false);
  const [optionsRetry, setOptionsRetry] = useState(0);
  const [coursesRetry, setCoursesRetry] = useState(0);
  const priceRangeInvalid = Boolean(
    (minPrice && Number(minPrice) < 0)
      || (maxPrice && Number(maxPrice) < 0)
      || (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)),
  );

  useEffect(() => {
    if (status !== 'authenticated' || catalog.content.length === 0) {
      setSavedIds([]);
      return;
    }
    const controller = new AbortController();
    bookmarkApi.savedIds(catalog.content.map((course) => course.id), controller.signal)
      .then(setSavedIds)
      .catch(() => { if (!controller.signal.aborted) setSavedIds([]); });
    return () => controller.abort();
  }, [catalog, status]);

  useEffect(() => {
    if (priceRangeInvalid) {
      setLoading(false);
      setCoursesError(false);
      return;
    }

    const controller = new AbortController();
    setOptionsError(false);

    getCatalogOptions(controller.signal)
      .then(({ categories: categoryOptions, platforms: platformOptions }) => {
        setCategories(categoryOptions);
        setPlatforms(platformOptions);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setOptionsError(true);
      });

    return () => controller.abort();
  }, [optionsRetry]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(0);
      setQuery(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setCoursesError(false);

    getCatalogCourses(
      { query, category, platform, level, language, paymentType, minPrice, maxPrice, sort },
      page,
      controller.signal,
    )
      .then(setCatalog)
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setCoursesError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [query, category, platform, level, language, paymentType, minPrice, maxPrice, sort, page, coursesRetry, priceRangeInvalid]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(0);
    setQuery(searchInput.trim());
  }

  function clearFilters() {
    setSearchInput('');
    setQuery('');
    setCategory('');
    setPlatform('');
    setLevel('');
    setLanguage('');
    setPaymentType('');
    setMinPrice('');
    setMaxPrice('');
    setSort('latest');
    setPage(0);
  }

  const hasFilters = Boolean(
    query
      || category
      || platform
      || level
      || language
      || paymentType
      || minPrice
      || maxPrice
      || sort !== 'latest',
  );

  return (
    <main className="min-h-screen pb-16 text-slate-950">
      <section className="relative overflow-hidden bg-[color:var(--ink)] text-white">
        <div className="hero-grid absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="absolute -left-28 top-20 h-72 w-72 rounded-full bg-blue-600/25 blur-3xl" aria-hidden="true" />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" aria-hidden="true" />
        <div className="shell-container relative py-14 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-cyan-300">Course Catalog</p>
              <h1 className="mt-4 max-w-3xl text-balance text-4xl font-black leading-[1.12] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                เรียนสิ่งที่สนใจ จากแหล่งเรียนรู้ที่ไว้ใจได้
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                รวมคอร์สจากหลายแพลตฟอร์มไว้ในที่เดียว ค้นหาและเปรียบเทียบก่อนเริ่มเรียนได้ง่ายขึ้น
              </p>
              <Link to="/match" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/15">
                ยังเลือกไม่ถูก? ลองระบบแนะนำ <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="relative hidden min-h-64 lg:block" aria-hidden="true">
              <div className="absolute left-6 top-8 w-64 -rotate-6 rounded-[1.75rem] border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-md">
                <span className="text-xs font-bold text-cyan-200">DESIGN</span>
                <p className="mt-12 text-xl font-black">เรียนจากผู้สอนที่ใช่</p>
                <div className="mt-5 h-2 w-3/4 rounded-full bg-cyan-300/70" />
              </div>
              <div className="absolute bottom-0 right-4 w-64 rotate-6 rounded-[1.75rem] border border-white/20 bg-blue-600/50 p-5 shadow-2xl backdrop-blur-md">
                <span className="text-xs font-bold text-blue-100">TECHNOLOGY</span>
                <p className="mt-12 text-xl font-black">เริ่มเส้นทางใหม่วันนี้</p>
                <div className="mt-5 flex gap-2"><span className="h-9 w-9 rounded-xl bg-[color:var(--coral)]" /><span className="h-9 w-20 rounded-xl bg-white/20" /></div>
              </div>
            </div>
          </div>

          <form
            className="surface-card relative mt-12 grid gap-4 p-4 text-slate-950 sm:p-6 md:grid-cols-2 xl:grid-cols-4"
            onSubmit={handleSearch}
          >
            <div className="md:col-span-2 xl:col-span-4">
              <label className="text-sm font-extrabold text-slate-800" htmlFor="catalog-search">ค้นหาคอร์ส</label>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400" aria-hidden="true">⌕</span>
                <input
                  id="catalog-search"
                  className="min-h-12 w-full min-w-0 rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-base outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="ค้นหาจากชื่อคอร์ส"
                />
              </div>
            </div>

            <FilterSelect id="category-filter" label="หมวดหมู่" value={category} onChange={(value) => { setCategory(value); setPage(0); }}>
              <option value="">ทุกหมวดหมู่</option>
              {categories.map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}
            </FilterSelect>

            <FilterSelect id="platform-filter" label="แพลตฟอร์ม" value={platform} onChange={(value) => { setPlatform(value); setPage(0); }}>
              <option value="">ทุกแพลตฟอร์ม</option>
              {platforms.map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}
            </FilterSelect>

            <FilterSelect id="level-filter" label="ระดับ" value={level} onChange={(value) => { setLevel(value); setPage(0); }}>
              <option value="">ทุกระดับ</option>
              <option value="BEGINNER">เริ่มต้น</option>
              <option value="INTERMEDIATE">ระดับกลาง</option>
              <option value="ADVANCED">ระดับสูง</option>
            </FilterSelect>

            <FilterSelect id="language-filter" label="ภาษา" value={language} onChange={(value) => { setLanguage(value); setPage(0); }}>
              <option value="">ทุกภาษา</option>
              <option value="THAI">ภาษาไทย</option>
              <option value="ENGLISH">ภาษาอังกฤษ</option>
              <option value="SUB_THAI">อังกฤษ · ซับไทย</option>
            </FilterSelect>

            <FilterSelect id="price-filter" label="รูปแบบราคา" value={paymentType} onChange={(value) => { setPaymentType(value); setPage(0); }}>
              <option value="">ทุกราคา</option>
              <option value="FREE">ฟรี</option>
              <option value="ONE_TIME">ซื้อครั้งเดียว</option>
              <option value="SUBSCRIPTION">สมาชิกรายเดือน</option>
            </FilterSelect>

            <FilterNumberInput
              id="min-price-filter"
              label="ราคาต่ำสุด (บาท)"
              value={minPrice}
              onChange={(value) => { setMinPrice(value); setPage(0); }}
            />

            <FilterNumberInput
              id="max-price-filter"
              label="ราคาสูงสุด (บาท)"
              value={maxPrice}
              onChange={(value) => { setMaxPrice(value); setPage(0); }}
            />

            <FilterSelect id="sort-filter" label="เรียงลำดับ" value={sort} onChange={(value) => { setSort(value); setPage(0); }}>
              <option value="latest">ใหม่ล่าสุด</option>
              <option value="title-asc">ชื่อ A–Z</option>
              <option value="title-desc">ชื่อ Z–A</option>
              <option value="price-asc">ราคาต่ำไปสูง</option>
              <option value="price-desc">ราคาสูงไปต่ำ</option>
            </FilterSelect>

            <button className="primary-button self-end" type="submit">
              ค้นหา
            </button>

            {optionsError && (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 md:col-span-2 xl:col-span-3" role="alert">
                <span>โหลดหมวดหมู่และแพลตฟอร์มไม่สำเร็จ</span>
                <button className="min-h-10 font-bold underline underline-offset-4" onClick={() => setOptionsRetry((count) => count + 1)} type="button">ลองใหม่</button>
              </div>
            )}

            {priceRangeInvalid && (
              <p className="alert-error md:col-span-2 xl:col-span-4" role="alert">
                ราคาต่ำสุดต้องไม่เกินราคาสูงสุด และราคาต้องไม่ติดลบ
              </p>
            )}
          </form>
        </div>
      </section>

      <section className="page-shell">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">หลักสูตรทั้งหมด</p>
            <h2 className="section-heading mt-3" aria-live="polite" role="status">
              {loading
                ? 'กำลังค้นหาคอร์ส...'
                : priceRangeInvalid
                  ? 'กรุณาตรวจสอบช่วงราคา'
                : coursesError
                  ? 'ยังโหลดรายการคอร์สไม่ได้'
                  : `พบ ${catalog.totalElements} คอร์ส`}
            </h2>
          </div>
          {hasFilters && (
            <button className="ghost-button" onClick={clearFilters} type="button">
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {!priceRangeInvalid && coursesError && (
          <div className="surface-panel p-8 text-center" role="alert">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-2xl" aria-hidden="true">↻</div>
            <h2 className="mt-4 text-lg font-black text-amber-950">กำลังเตรียมระบบให้พร้อม</h2>
            <p className="mt-2 text-sm text-amber-800">เซิร์ฟเวอร์อาจกำลังเริ่มทำงาน กรุณารอสักครู่แล้วลองใหม่</p>
            <button className="primary-button mt-5" onClick={() => setCoursesRetry((count) => count + 1)} type="button">
              ลองใหม่
            </button>
          </div>
        )}

        {!priceRangeInvalid && !coursesError && loading && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="surface-card h-[450px] overflow-hidden p-6">
                <div className="skeleton-block h-36" />
                <div className="skeleton-block mt-6 h-4 w-1/3" />
                <div className="skeleton-block mt-4 h-6 w-4/5" />
                <div className="skeleton-block mt-3 h-4 w-full" />
              </div>
            ))}
          </div>
        )}

        {!priceRangeInvalid && !coursesError && !loading && catalog.content.length > 0 && (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {catalog.content.map((course) => <CatalogCourseCard key={course.id} course={course}
                saved={savedIds.includes(course.id)}
                onBookmarkChange={(saved) => setSavedIds((ids) => saved ? [...ids, course.id] : ids.filter((id) => id !== course.id))} />)}
            </div>
            {catalog.totalPages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-4" aria-label="หน้ารายการคอร์ส">
                <button
                  className="secondary-button min-h-10 rounded-xl px-4 py-2 text-sm"
                  disabled={catalog.first}
                  onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
                  type="button"
                >
                  ก่อนหน้า
                </button>
                <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm">หน้า {catalog.page + 1} จาก {catalog.totalPages}</span>
                <button
                  className="secondary-button min-h-10 rounded-xl px-4 py-2 text-sm"
                  disabled={catalog.last}
                  onClick={() => setPage((currentPage) => currentPage + 1)}
                  type="button"
                >
                  ถัดไป
                </button>
              </nav>
            )}
          </>
        )}

        {!priceRangeInvalid && !coursesError && !loading && catalog.content.length === 0 && (
          <div className="empty-state px-6 py-16">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-100 text-3xl text-blue-700" aria-hidden="true">⌕</div>
            <h2 className="mt-5 text-xl font-black text-slate-950">ยังไม่พบคอร์สที่ตรงกับตัวกรอง</h2>
            <p className="mt-2 text-slate-600">ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองใหม่</p>
            <button className="primary-button mt-5" onClick={clearFilters} type="button">ดูคอร์สทั้งหมด</button>
          </div>
        )}
      </section>
    </main>
  );
}

type FilterSelectProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
};

function FilterSelect({ id, label, value, onChange, children }: FilterSelectProps) {
  return (
    <label className="grid gap-2 text-xs font-extrabold text-slate-600" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-normal text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

type FilterNumberInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function FilterNumberInput({ id, label, value, onChange }: FilterNumberInputProps) {
  return (
    <label className="grid gap-2 text-xs font-extrabold text-slate-600" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-normal text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="ไม่จำกัด"
      />
    </label>
  );
}
