import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { CatalogCourseCard } from '../features/catalog/CatalogCourseCard';
import { getCatalogCourses, getCatalogOptions } from '../features/catalog/catalogApi';
import type { CatalogCourse, CatalogOption, CatalogPage as CatalogPageData } from '../features/catalog/types';
import { AuthActions } from '../features/auth/AuthActions';

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
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link to="/" className="text-xl font-black tracking-tight">
            Course<span className="text-cyan-600">Hub</span>
          </Link>
          <AuthActions />
        </div>
      </header>

      <section className="bg-slate-950 px-6 py-16 text-white lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-300">Course Catalog</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
            เรียนสิ่งที่สนใจ จากแหล่งเรียนรู้ที่ไว้ใจได้
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            รวมคอร์สจากหลายแพลตฟอร์มไว้ในที่เดียว ค้นหาและเปรียบเทียบก่อนเริ่มเรียนได้ง่ายขึ้น
          </p>

          <form
            className="mt-9 grid gap-3 rounded-2xl bg-white p-3 text-slate-950 shadow-2xl md:grid-cols-2 xl:grid-cols-4"
            onSubmit={handleSearch}
          >
            <label className="sr-only" htmlFor="catalog-search">ค้นหาคอร์ส</label>
            <input
              id="catalog-search"
              className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:col-span-2"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="ค้นหาจากชื่อคอร์ส"
            />

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

            <button className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700" type="submit">
              ค้นหา
            </button>

            {optionsError && (
              <div className="flex items-center justify-between gap-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 md:col-span-2 xl:col-span-3" role="alert">
                <span>โหลดหมวดหมู่และแพลตฟอร์มไม่สำเร็จ</span>
                <button className="font-bold underline" onClick={() => setOptionsRetry((count) => count + 1)} type="button">ลองใหม่</button>
              </div>
            )}

            {priceRangeInvalid && (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 md:col-span-2 xl:col-span-4" role="alert">
                ราคาต่ำสุดต้องไม่เกินราคาสูงสุด และราคาต้องไม่ติดลบ
              </p>
            )}
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-cyan-700">หลักสูตรทั้งหมด</p>
            <h2 className="mt-1 text-2xl font-bold" aria-live="polite" role="status">
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
            <button className="text-sm font-semibold text-slate-600 underline underline-offset-4 hover:text-slate-950" onClick={clearFilters} type="button">
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {!priceRangeInvalid && coursesError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center" role="alert">
            <h2 className="text-lg font-bold text-amber-950">กำลังเตรียมระบบให้พร้อม</h2>
            <p className="mt-2 text-sm text-amber-800">เซิร์ฟเวอร์อาจกำลังเริ่มทำงาน กรุณารอสักครู่แล้วลองใหม่</p>
            <button className="mt-5 rounded-xl bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white" onClick={() => setCoursesRetry((count) => count + 1)} type="button">
              ลองใหม่
            </button>
          </div>
        )}

        {!priceRangeInvalid && !coursesError && loading && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-[430px] animate-pulse rounded-3xl border border-slate-200 bg-white p-6">
                <div className="h-36 rounded-2xl bg-slate-200" />
                <div className="mt-6 h-4 w-1/3 rounded bg-slate-200" />
                <div className="mt-4 h-6 w-4/5 rounded bg-slate-200" />
                <div className="mt-3 h-4 w-full rounded bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {!priceRangeInvalid && !coursesError && !loading && catalog.content.length > 0 && (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {catalog.content.map((course) => <CatalogCourseCard key={course.id} course={course} />)}
            </div>
            {catalog.totalPages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-4" aria-label="หน้ารายการคอร์ส">
                <button
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={catalog.first}
                  onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
                  type="button"
                >
                  ก่อนหน้า
                </button>
                <span className="text-sm font-medium text-slate-600">หน้า {catalog.page + 1} จาก {catalog.totalPages}</span>
                <button
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
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
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <h2 className="text-xl font-bold">ยังไม่พบคอร์สที่ตรงกับตัวกรอง</h2>
            <p className="mt-2 text-slate-600">ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองใหม่</p>
            <button className="mt-5 font-semibold text-blue-700" onClick={clearFilters} type="button">ดูคอร์สทั้งหมด</button>
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
    <label className="grid gap-1 text-xs font-semibold text-slate-600" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        className="rounded-xl border border-slate-200 px-4 py-3 text-base font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
    <label className="grid gap-1 text-xs font-semibold text-slate-600" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        className="rounded-xl border border-slate-200 px-4 py-3 text-base font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
