import type { CatalogCourse } from './types';

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

  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: course.price.currency,
    maximumFractionDigits: 0,
  }).format(course.price.amount);
}

export function CatalogCourseCard({ course }: { course: CatalogCourse }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70">
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 p-6 text-white">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-white/20" />
        <div className="absolute -bottom-12 right-10 h-28 w-28 rounded-full bg-white/10" />
        <p className="relative text-sm font-semibold text-cyan-100">{course.platform.name}</p>
        <p className="relative mt-2 line-clamp-2 text-2xl font-bold leading-tight">{course.title}</p>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-sm font-semibold text-blue-700">{course.provider.name}</p>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
          {course.description ?? 'ดูรายละเอียดหลักสูตรและเนื้อหาทั้งหมดได้ที่เว็บไซต์ผู้ให้บริการ'}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1.5">{levelLabels[course.level]}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5">{languageLabels[course.language]}</span>
          {course.effortHours !== null && (
            <span className="rounded-full bg-slate-100 px-3 py-1.5">{course.effortHours} ชั่วโมง</span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {course.categories.map((category) => (
            <span key={category.id} className="text-xs font-medium text-cyan-700">
              #{category.name}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 border-t border-slate-100 pt-5">
          <div>
            <p className="text-xs text-slate-500">ราคาเริ่มต้น</p>
            <p className="mt-1 text-lg font-bold text-slate-950">{formatPrice(course)}</p>
          </div>
          <a
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            href={course.url}
            target="_blank"
            rel="noreferrer"
          >
            ดูคอร์ส
          </a>
        </div>
      </div>
    </article>
  );
}
