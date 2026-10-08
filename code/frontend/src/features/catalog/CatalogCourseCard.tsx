import type { CatalogCourse } from './types';
import { BookmarkButton } from '../bookmarks/BookmarkButton';

const levelLabels: Record<CatalogCourse['level'], string> = {
  BEGINNER: 'เริ่มต้น',
  INTERMEDIATE: 'ระดับกลาง',
  ADVANCED: 'ระดับสูง',
};

const languageLabels: Record<CatalogCourse['language'], string> = {
  THAI: 'ภาษาไทย',
  ENGLISH: 'ภาษาอังกฤษ',
  SUB_THAI: 'อังกฤษ · ซับไทย',
};

function formatPrice(course: CatalogCourse) {
  if (!course.price || course.price.paymentType === 'FREE') return 'เรียนฟรี';
  if (course.price.amount === null) return 'ดูราคาที่เว็บไซต์';

  const currency = course.price.currency;
  if (currency && /^[A-Z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(course.price.amount);
    } catch {
      // Fall through to a plain amount when a stored currency is unsupported.
    }
  }

  return `${course.price.amount.toLocaleString('th-TH')} ${currency ?? ''}`.trim();
}

export function CatalogCourseCard({ course, saved = false, onBookmarkChange = () => {} }: {
  course: CatalogCourse;
  saved?: boolean;
  onBookmarkChange?: (saved: boolean) => void;
}) {
  return (
    <article
      aria-labelledby={`course-title-${course.id}`}
      className="surface-card depth-card group flex h-full flex-col overflow-hidden"
    >
      <div className="relative min-h-44 overflow-hidden bg-[color:var(--ink)] p-6 text-white">
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-cyan-300/30 blur-sm transition duration-500 group-hover:scale-110" />
        <div className="absolute -bottom-16 right-20 h-36 w-36 rounded-full bg-blue-500/35 blur-md transition duration-500 group-hover:-translate-y-2" />
        <div className="relative flex items-center justify-between gap-3">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-extrabold text-cyan-100 backdrop-blur-sm">{course.platform.name}</p>
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/20 bg-white/10 text-lg" aria-hidden="true">↗</span>
        </div>
        <h3 id={`course-title-${course.id}`} className="relative mt-5 line-clamp-2 text-2xl font-black leading-tight tracking-[-0.02em]">
          {course.title}
        </h3>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="eyebrow normal-case tracking-normal before:hidden">{course.provider.name}</p>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
          {course.description ?? 'ดูรายละเอียดหลักสูตรและเนื้อหาทั้งหมดได้ที่เว็บไซต์ผู้ให้บริการ'}
        </p>

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-700">
          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5">{levelLabels[course.level]}</span>
          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5">{languageLabels[course.language]}</span>
          {course.effortHours !== null && (
            <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5">{course.effortHours} ชั่วโมง</span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-x-3 gap-y-2">
          {course.categories.map((category) => (
            <span key={category.id} className="text-xs font-bold text-blue-700">
              #{category.name}
            </span>
          ))}
        </div>

        <p className="mt-4 text-sm font-bold text-amber-700">
          {course.averageRating === null
            ? 'ยังไม่มีรีวิว'
            : `★ ${course.averageRating.toFixed(1)} (${course.reviewCount} รีวิว)`}
        </p>

        <div className="mt-5"><BookmarkButton courseId={course.id} courseTitle={course.title} saved={saved} onChange={onBookmarkChange} /></div>

        <div className="mt-auto flex items-end justify-between gap-4 border-t border-slate-200/80 pt-5">
          <div>
            <p className="text-xs font-semibold text-slate-500">ราคาเริ่มต้น</p>
            <p className="mt-1 text-lg font-black text-slate-950">{formatPrice(course)}</p>
          </div>
          {course.externalUrl ? (
            <a
              aria-label={`ดูคอร์ส ${course.title}`}
              className="primary-button min-h-10 rounded-xl px-4 py-2 text-sm"
              href={course.externalUrl}
              target="_blank"
              rel="noreferrer"
            >
              ดูคอร์ส
            </a>
          ) : (
            <span className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500">
              ลิงก์ไม่พร้อม
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
