import type { Auditorium } from '../../seat-preview';
import { HeroScene } from './HeroScene';

interface Props {
  auditorium: Auditorium;
  previewOpen: boolean;
  onOpenPreview: (seatId: string) => void;
}

export function Hero({ auditorium, previewOpen, onOpenPreview }: Props) {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero__bg" aria-hidden>
        <div className="hero__beam" />
        <div className="hero__grid" />
      </div>
      <div className="container hero__inner">
        <div className="hero__copy">
          <p className="eyebrow">
            <span className="eyebrow__dot" /> 3D seat visualization for cinema booking
          </p>
          <h1 id="hero-title" className="hero__title">
            See the cinema from your seat. <span className="accent">Before you book.</span>
          </h1>
          <p className="hero__lead">
            Transform the way audiences choose their seats with immersive first-person 3D visualization. Help
            customers experience their view before purchasing their tickets.
          </p>
          <div className="hero__actions">
            <a href="#demo" className="btn btn--primary btn--lg">
              Request a Demo
            </a>
            <a href="#how-it-works" className="btn btn--ghost btn--lg">
              Explore the Experience
            </a>
          </div>
          <ul className="hero__proof" aria-label="Key properties">
            <li>Works with your existing ticketing</li>
            <li>Procedural 3D, no asset production</li>
            <li>Desktop, tablet and mobile</li>
          </ul>
        </div>
        <div className="hero__visual">
          <HeroScene auditorium={auditorium} paused={previewOpen} onOpenFull={onOpenPreview} />
        </div>
      </div>
    </section>
  );
}
