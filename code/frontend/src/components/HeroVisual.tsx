import { useRef } from 'react';

export function HeroVisual() {
  const visualRef = useRef<HTMLDivElement>(null);

  function updateTilt(event: React.PointerEvent<HTMLDivElement>) {
    const element = visualRef.current;
    if (!element || event.pointerType === 'touch') return;
    const bounds = element.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    element.style.setProperty('--tilt-x', `${(-y * 5).toFixed(2)}deg`);
    element.style.setProperty('--tilt-y', `${(x * 7).toFixed(2)}deg`);
  }

  function resetTilt() {
    visualRef.current?.style.setProperty('--tilt-x', '0deg');
    visualRef.current?.style.setProperty('--tilt-y', '0deg');
  }

  return (
    <div
      ref={visualRef}
      className="hero-visual mx-auto w-full max-w-[660px]"
      aria-hidden="true"
      onPointerMove={updateTilt}
      onPointerLeave={resetTilt}
    >
      <div className="hero-visual-inner">
        <span className="visual-orbit visual-orbit-one" />
        <span className="visual-orbit visual-orbit-two" />
        <img
          src="/images/coursehub-learning-orbit.webp"
          alt=""
          width="1536"
          height="1024"
          decoding="async"
        />
        <span className="orbit-chip orbit-chip-one">DESIGN</span>
        <span className="orbit-chip orbit-chip-two">TECH</span>
        <span className="orbit-chip orbit-chip-three">BUSINESS</span>
        <span className="visual-caption">YOUR LEARNING ORBIT <i /></span>
      </div>
    </div>
  );
}
