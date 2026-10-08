import { Link } from 'react-router-dom';

import { HeroVisual } from '../components/HeroVisual';

const journeySteps = [
  { number: '01', title: 'บอกเป้าหมาย', text: 'เลือกเรื่องที่สนใจ ระดับ ภาษา เวลา และงบประมาณที่เหมาะกับคุณ', color: 'bg-blue-600' },
  { number: '02', title: 'เทียบแบบชัดเจน', text: 'ดูเหตุผล คะแนนความเข้ากัน และรายละเอียดจากหลายแพลตฟอร์ม', color: 'bg-orange-700' },
  { number: '03', title: 'เริ่มเรียนอย่างมั่นใจ', text: 'บันทึกตัวเลือกที่ชอบ แล้วกลับมาวางแผนเส้นทางการเรียนได้ทุกเมื่อ', color: 'bg-emerald-700' },
];

export function HomePage() {
  return (
    <main>
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="absolute -left-40 top-16 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -right-36 bottom-0 h-96 w-96 rounded-full bg-orange-500/15 blur-3xl" aria-hidden="true" />
        <div className="shell-container relative grid min-h-[720px] items-center gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <div className="max-w-2xl">
            <p className="eyebrow !text-cyan-300 before:!bg-orange-400">เรียนให้ตรงเป้ากว่าเดิม</p>
            <h1 className="mt-6 text-balance text-5xl font-black leading-[1.08] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              คอร์สที่ใช่<br /><span className="text-cyan-300">เริ่มต้นได้ที่นี่</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
              ค้นหา เปรียบเทียบ และรับคำแนะนำคอร์สจากหลายแพลตฟอร์ม ในเส้นทางที่ออกแบบจากเป้าหมายของคุณจริง ๆ
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link className="primary-button !bg-cyan-300 !text-slate-950 hover:!bg-cyan-200" to="/match">
                หาคอร์สที่ใช่ <span aria-hidden="true">→</span>
              </Link>
              <Link className="secondary-button !border-white/25 !bg-white/10 !text-white hover:!bg-white/15" to="/courses">
                สำรวจคอร์สทั้งหมด
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-bold text-slate-300">
              <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-cyan-300" />เทียบหลายแพลตฟอร์ม</span>
              <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-orange-400" />มีเหตุผลทุกคำแนะนำ</span>
              <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald-300" />บันทึกไว้ดูทีหลัง</span>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="shell-container py-20 sm:py-24" aria-labelledby="journey-heading">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Your learning orbit</p>
          <h2 id="journey-heading" className="section-heading mt-4">จากคอร์สนับพัน สู่ตัวเลือกที่เหมาะกับคุณ</h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">ไม่ต้องเปิดหลายเว็บและจดเทียบเอง CourseHub ช่วยย่อการตัดสินใจให้เหลือสามขั้นตอน</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {journeySteps.map((step, index) => (
            <article key={step.number} className="surface-card depth-card relative overflow-hidden p-7">
              <div className={`absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full ${step.color} opacity-10`} aria-hidden="true" />
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${step.color} text-sm font-black text-white shadow-lg`} aria-hidden="true">{step.number}</span>
              <h3 className="mt-8 text-xl font-black text-slate-950">{step.title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{step.text}</p>
              {index < journeySteps.length - 1 && <span className="absolute -right-3 top-12 z-10 hidden h-6 w-6 rotate-45 border-r border-t border-slate-200 bg-[color:var(--canvas)] md:block" aria-hidden="true" />}
            </article>
          ))}
        </div>
      </section>

      <section className="shell-container pb-20 sm:pb-24">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-blue-600 px-7 py-10 text-white shadow-[0_28px_80px_rgba(21,94,239,0.25)] sm:px-12 sm:py-14">
          <div className="absolute -bottom-24 -right-12 h-72 w-72 rounded-full border-[48px] border-cyan-300/20" aria-hidden="true" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Ready when you are</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-4xl">เริ่มจากคำตอบไม่กี่ข้อ แล้วดูคอร์สที่เข้ากับคุณ</h2>
            </div>
            <Link className="secondary-button shrink-0 !border-white !bg-white !text-blue-700 hover:!bg-cyan-50" to="/match">เริ่มค้นหาเส้นทาง <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
