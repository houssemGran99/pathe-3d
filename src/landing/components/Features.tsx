import type { ReactNode } from 'react';
import { Reveal } from './Reveal';

const FEATURES: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: 'Realistic First-Person View',
    body: 'Simulate the actual viewing perspective from the selected cinema seat: seated eye height, screen size and the rows ahead.',
    icon: <IconEye />,
  },
  {
    title: 'Dynamic Camera Positioning',
    body: 'Camera position and orientation are calculated from seat coordinates and auditorium geometry, for every seat in the room.',
    icon: <IconTarget />,
  },
  {
    title: 'Interactive Auditorium',
    body: 'Smooth, constrained camera controls: look around, zoom, re-centre and glide between seats without ever leaving the chair.',
    icon: <IconMove />,
  },
  {
    title: 'Seamless Integration',
    body: 'Sits on top of your existing booking website. Your ticketing, pricing and seat availability stay exactly where they are.',
    icon: <IconPlug />,
  },
  {
    title: 'Mobile Optimized',
    body: 'Adaptive resolution, touch controls and a lightweight procedural scene keep the experience smooth on phones and tablets.',
    icon: <IconPhone />,
  },
  {
    title: 'Custom Branding',
    body: 'Operator name, colours and seat categories are configurable so the preview feels like part of your brand, not a plug-in.',
    icon: <IconBrush />,
  },
];

export function Features() {
  return (
    <section className="section features" id="product" aria-labelledby="features-title">
      <div className="container">
        <Reveal className="section__head">
          <p className="eyebrow">Product</p>
          <h2 id="features-title">Everything needed to put the customer in the seat.</h2>
        </Reveal>
        <div className="features__grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} className="card feature" delay={(i % 3) * 80}>
              <span className="feature__icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconTarget() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}
function IconMove() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4" />
    </svg>
  );
}
function IconPlug() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}
function IconBrush() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M20 4L9 15M9 15a3 3 0 1 1-4 4c2 0 2-1 2-2a2 2 0 0 1 2-2z" />
    </svg>
  );
}
