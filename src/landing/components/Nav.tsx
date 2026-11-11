import { useEffect, useState } from 'react';
import { Logo } from './Logo';

const LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#integration', label: 'Integration' },
  { href: '#benefits', label: 'Benefits' },
  { href: '#demo', label: 'Contact' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''} ${open ? 'nav--open' : ''}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="container nav__inner">
        <a href="#top" className="nav__brand" aria-label="SeatView 3D home">
          <Logo />
        </a>
        <nav className="nav__links" aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="nav__actions">
          <a href="#demo" className="btn btn--primary btn--sm">
            Request a Demo
          </a>
          <button
            type="button"
            className="nav__burger"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      <div id="mobile-menu" className="nav__mobile" hidden={!open}>
        <nav aria-label="Mobile">
          {LINKS.map((l, i) => (
            <a key={l.href} href={l.href} style={{ transitionDelay: `${60 + i * 40}ms` }} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
        </nav>
        <a href="#demo" className="btn btn--primary btn--lg" onClick={() => setOpen(false)}>
          Request a Demo
        </a>
      </div>
    </header>
  );
}
