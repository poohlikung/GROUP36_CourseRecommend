import { Link } from 'react-router-dom';
import { AuthActions } from '../features/auth/AuthActions';

export function HomePage() {
  return (
    <main className="relative grid min-h-screen place-items-center bg-slate-950 px-6 text-center text-slate-50">
      <div className="absolute right-6 top-6"><AuthActions dark /></div>
      <section className="max-w-2xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
          CourseHub
        </p>
        <h1 className="text-4xl font-bold sm:text-5xl">คอร์สที่ใช่ เริ่มต้นได้ที่นี่</h1>
        <p className="mt-5 text-lg leading-8 text-slate-300">
          ค้นหาและเปรียบเทียบคอร์สจากหลายแพลตฟอร์ม ก่อนเลือกเส้นทางการเรียนรู้ที่เหมาะกับคุณ
        </p>
        <Link
          className="mt-8 inline-flex rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-950"
          to="/courses"
        >
          สำรวจคอร์สทั้งหมด
        </Link>
      </section>
    </main>
  );
}
