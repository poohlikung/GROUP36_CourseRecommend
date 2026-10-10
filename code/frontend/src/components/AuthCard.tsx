import { Link } from 'react-router-dom';

import { BrandMark } from './BrandMark';

interface AuthCardProps {
  title: string;
  description: string;
  alternateText: string;
  alternateLinkText: string;
  alternateTo: string;
  children: React.ReactNode;
}

export function AuthCard({
  title,
  description,
  alternateText,
  alternateLinkText,
  alternateTo,
  children,
}: AuthCardProps) {
  return (
    <main className="shell-container grid min-h-[calc(100vh-76px)] place-items-center py-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
      <aside className="relative hidden min-h-[620px] w-full overflow-hidden rounded-[2.5rem] bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between" aria-hidden="true">
        <div className="hero-grid absolute inset-0 opacity-60" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="relative"><BrandMark inverse /></div>
        <div className="relative [perspective:900px]">
          <div className="mx-auto w-[82%] rotate-[-4deg] rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md [transform-style:preserve-3d]">
            <span className="status-chip border-cyan-300/30 bg-cyan-300/10 text-cyan-200">เส้นทางของคุณ</span>
            <div className="mt-6 space-y-4">
              <div className="h-3 w-4/5 rounded-full bg-white/80" />
              <div className="h-3 w-3/5 rounded-full bg-white/25" />
              <div className="grid grid-cols-3 gap-3 pt-3">
                <div className="h-20 rounded-2xl bg-blue-500/70" />
                <div className="h-20 translate-y-4 rounded-2xl bg-orange-400/80" />
                <div className="h-20 rounded-2xl bg-emerald-300/70" />
              </div>
            </div>
          </div>
        </div>
        <p className="relative max-w-sm text-lg font-bold leading-8 text-slate-200">ค้นพบคอร์สที่เข้ากับเป้าหมาย เวลา และงบประมาณของคุณ</p>
      </aside>
      <section className="surface-card w-full max-w-xl p-7 sm:p-10">
        <p className="eyebrow">CourseHub account</p>
        <h1 className="mt-4 text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
        <div className="mt-8">{children}</div>
        <p className="mt-7 border-t border-slate-200 pt-6 text-center text-sm text-slate-600">
          {alternateText}{' '}
          <Link to={alternateTo} className="font-extrabold text-blue-700 underline decoration-blue-200 decoration-2 underline-offset-4 hover:decoration-blue-500">
            {alternateLinkText}
          </Link>
        </p>
      </section>
    </main>
  );
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1.5 text-sm font-medium text-red-700">{message}</p> : null;
}
