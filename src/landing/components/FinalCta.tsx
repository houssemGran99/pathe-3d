import { Reveal } from './Reveal';

export function FinalCta() {
  return (
    <section className="final" aria-labelledby="final-title">
      <div className="final__bg" aria-hidden>
        <div className="final__screen" />
        <div className="final__rows">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ ['--i' as string]: i }} />
          ))}
        </div>
      </div>
      <Reveal className="container final__inner">
        <h2 id="final-title">
          Your cinema. Your seats. <span className="accent">A whole new perspective.</span>
        </h2>
        <p className="final__lead">Let’s bring your auditoriums into 3D.</p>
        <a href="#demo" className="btn btn--primary btn--lg">
          Schedule a Product Demo
        </a>
        <p className="final__sub">Discover how SeatView 3D can integrate into your cinema booking experience.</p>
      </Reveal>
    </section>
  );
}
