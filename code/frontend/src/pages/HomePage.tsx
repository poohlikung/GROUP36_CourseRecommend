import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { HeroVisual } from '../components/HeroVisual';

const journeySteps = [
  { number: '01', title: 'บอกเป้าหมาย', text: 'เลือกเรื่องที่สนใจ ระดับ ภาษา เวลา และงบประมาณที่เหมาะกับคุณ' },
  { number: '02', title: 'เทียบแบบชัดเจน', text: 'ดูเหตุผล คะแนนความเข้ากัน และรายละเอียดจากหลายแพลตฟอร์ม' },
  { number: '03', title: 'เริ่มเรียนอย่างมั่นใจ', text: 'บันทึกตัวเลือกที่ชอบ แล้วกลับมาวางแผนเส้นทางการเรียนได้ทุกเมื่อ' },
];

export function HomePage() {
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const revealItems = Array.from(page.querySelectorAll<HTMLElement>('.motion-reveal'));

    if (!reducedMotion?.matches && 'IntersectionObserver' in window) {
      page.classList.add('motion-ready');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

      revealItems.forEach((item) => observer.observe(item));

      return () => {
        observer.disconnect();
        page.classList.remove('motion-ready');
      };
    }

    return undefined;
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    if (!page || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const updateScrollMotion = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      const heroShift = Math.min(window.scrollY, window.innerHeight) * 0.12;

      page.style.setProperty('--page-progress', `${progress * 100}%`);
      page.style.setProperty('--hero-shift', `${heroShift.toFixed(1)}px`);
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScrollMotion);
    };

    updateScrollMotion();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main ref={pageRef} className="home-page bg-[#0d0f12] text-white">
      <span className="home-progress" aria-hidden="true" />
      <section className="home-stage relative isolate overflow-hidden" aria-labelledby="home-heading">
        <div className="contour-lines absolute inset-0" aria-hidden="true" />
        <div className="hero-wordmark" aria-hidden="true">COURSEHUB</div>

        <div className="shell-container relative grid min-h-[calc(100svh-92px)] items-center gap-10 pb-14 pt-24 sm:py-14 lg:grid-cols-[0.82fr_1.18fr] lg:py-12">
          <div className="hero-copy relative z-10 max-w-2xl lg:pt-12">
            <p className="reference-eyebrow">เรียนให้ตรงเป้ากว่าเดิม</p>
            <h1 id="home-heading" className="mt-5 text-balance text-5xl font-semibold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-[5.4rem]">
              <span className="block">คอร์สที่ใช่</span>
              <span className="type-reveal mt-1 inline-block text-black/70">เริ่มต้นได้ที่นี่</span>
            </h1>
            <p className="mt-7 max-w-xl text-base font-light leading-8 text-black/60 sm:text-lg">
              ค้นหา เปรียบเทียบ และรับคำแนะนำคอร์สจากหลายแพลตฟอร์ม ในเส้นทางที่ออกแบบจากเป้าหมายของคุณจริง ๆ
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link className="reference-button reference-button-solid" to="/match">
                หาคอร์สที่ใช่ <span aria-hidden="true">↗</span>
              </Link>
              <Link className="reference-button reference-button-ghost" to="/courses">
                สำรวจคอร์สทั้งหมด <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium uppercase tracking-[0.12em] text-black/70">
              <span className="inline-flex items-center gap-2"><i className="signal-dot" />เทียบหลายแพลตฟอร์ม</span>
              <span className="inline-flex items-center gap-2"><i className="signal-dot" />มีเหตุผลทุกคำแนะนำ</span>
              <span className="inline-flex items-center gap-2"><i className="signal-dot" />บันทึกไว้ดูทีหลัง</span>
            </div>
          </div>

          <div className="hero-art relative z-[2] lg:-mr-14 lg:pt-8">
            <HeroVisual />
          </div>
        </div>

        <a className="scroll-cue" href="#journey-heading">
          <span>SCROLL DOWN</span>
          <i aria-hidden="true" />
        </a>
      </section>

      <section className="home-journey relative overflow-hidden border-t border-white/10 py-24 sm:py-32" aria-labelledby="journey-heading">
        <div className="contour-lines contour-lines-muted absolute inset-0" aria-hidden="true" />
        <div className="shell-container relative">
          <div className="motion-reveal grid gap-7 lg:grid-cols-[0.65fr_1.35fr] lg:items-end">
            <p className="reference-eyebrow">Your learning orbit</p>
            <div>
              <h2 id="journey-heading" className="text-balance text-4xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                จากคอร์สนับพัน<br /><span className="text-white/40">สู่ตัวเลือกที่เหมาะกับคุณ</span>
              </h2>
              <p className="mt-5 max-w-2xl text-base font-light leading-8 text-white/55 sm:text-lg">
                ไม่ต้องเปิดหลายเว็บและจดเทียบเอง CourseHub ช่วยย่อการตัดสินใจให้เหลือสามขั้นตอน
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-px overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 md:grid-cols-3">
            {journeySteps.map((step, index) => (
              <article
                key={step.number}
                className="journey-card motion-reveal relative min-h-[310px] bg-[#111419] p-7 sm:p-9"
                style={{ '--reveal-delay': `${index * 100}ms` } as React.CSSProperties}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium tracking-[0.2em] text-white/70">STEP {step.number}</span>
                  <span className="journey-arrow" aria-hidden="true">↗</span>
                </div>
                <div className="mt-20">
                  <h3 className="text-2xl font-medium tracking-[-0.035em] text-white">{step.title}</h3>
                  <p className="mt-4 max-w-sm font-light leading-7 text-white/50">{step.text}</p>
                </div>
                <span className="journey-index" aria-hidden="true">{step.number}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 py-20 sm:py-28">
        <div className="shell-container">
          <div className="home-cta motion-reveal relative overflow-hidden rounded-[2rem] border border-white/10 px-7 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
            <div className="cta-orbit" aria-hidden="true" />
            <p className="reference-eyebrow">Ready when you are</p>
            <div className="relative mt-7 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
              <h2 className="max-w-4xl text-balance text-4xl font-semibold leading-[1.12] tracking-[-0.05em] text-white/90 sm:text-5xl lg:text-7xl">
                เริ่มจากคำตอบไม่กี่ข้อ<br /><span className="text-white/70">แล้วดูคอร์สที่เข้ากับคุณ</span>
              </h2>
              <Link className="reference-button reference-button-solid shrink-0" to="/match">
                เริ่มค้นหาเส้นทาง <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
