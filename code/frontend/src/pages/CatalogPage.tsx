import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { CatalogCourseCard } from '../features/catalog/CatalogCourseCard';
import { getCatalogCourses, getCatalogOptions } from '../features/catalog/catalogApi';
import type { CatalogCourse, CatalogOption } from '../features/catalog/types';

export function CatalogPage() {
  const [categories, setCategories] = useState<CatalogOption[]>([]);
  const [platforms, setPlatforms] = useState<CatalogOption[]>([]);
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [platform, setPlatform] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getCatalogOptions(controller.signal)
      .then(({ categories: categoryOptions, platforms: platformOptions }) => {
        setCategories(categoryOptions);
        setPlatforms(platformOptions);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(true);
      });

    return () => controller.abort();
  }, [retryCount]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    getCatalogCourses({ query, category, platform }, controller.signal)
      .then(setCourses)
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [query, category, platform, retryCount]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(searchInput);
  }

  function clearFilters() {
    setSearchInput('');
    setQuery('');
    setCategory('');
    setPlatform('');
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link to="/" className="text-xl font-black tracking-tight">
            Course<span className="text-cyan-600">Hub</span>
          </Link>
          <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800">
            ค้นหาคอร์สที่เหมาะกับคุณ
          </span>
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

          <form className="mt-9 grid gap-3 rounded-2xl bg-white p-3 text-slate-950 shadow-2xl md:grid-cols-[1fr_220px_220px_auto]" onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="catalog-search">ค้นหาคอร์ส</label>
            <input
              id="catalog-search"
              className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="ค้นหาจากชื่อคอร์ส"
            />

            <label className="sr-only" htmlFor="category-filter">หมวดหมู่</label>
            <select
              id="category-filter"
              className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">ทุกหมวดหมู่</option>
              {categories.map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}
            </select>

            <label className="sr-only" htmlFor="platform-filter">แพลตฟอร์ม</label>
            <select
              id="platform-filter"
              className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
            >
              <option value="">ทุกแพลตฟอร์ม</option>
              {platforms.map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}
            </select>

            <button className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700" type="submit">
              ค้นหา
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-cyan-700">หลักสูตรทั้งหมด</p>
            <h2 className="mt-1 text-2xl font-bold">
              {loading ? 'กำลังค้นหาคอร์ส...' : `พบ ${courses.length} คอร์ส`}
            </h2>
          </div>
          {(query || category || platform) && (
            <button className="text-sm font-semibold text-slate-600 underline underline-offset-4 hover:text-slate-950" onClick={clearFilters} type="button">
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <h2 className="text-lg font-bold text-amber-950">กำลังเตรียมระบบให้พร้อม</h2>
            <p className="mt-2 text-sm text-amber-800">เซิร์ฟเวอร์อาจกำลังเริ่มทำงาน กรุณารอสักครู่แล้วลองใหม่</p>
            <button className="mt-5 rounded-xl bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white" onClick={() => setRetryCount((count) => count + 1)} type="button">
              ลองใหม่
            </button>
          </div>
        )}

        {!error && loading && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label="กำลังโหลดคอร์ส">
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

        {!error && !loading && courses.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => <CatalogCourseCard key={course.id} course={course} />)}
          </div>
        )}

        {!error && !loading && courses.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <h2 className="text-xl font-bold">ยังไม่พบคอร์สที่ตรงกับตัวกรอง</h2>
            <p className="mt-2 text-slate-600">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่และแพลตฟอร์มใหม่</p>
            <button className="mt-5 font-semibold text-blue-700" onClick={clearFilters} type="button">ดูคอร์สทั้งหมด</button>
          </div>
        )}
      </section>
    </main>
  );
}
