import { Logo } from './Logo';

const LINKEDIN = (import.meta.env.VITE_LINKEDIN_URL as string | undefined)?.trim() || '';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Logo />
          <p>
            Immersive first-person 3D seat visualization for cinema booking. A visualization layer for operators and
            ticketing platforms, not a ticket shop.
          </p>
        </div>
        <nav className="footer__nav" aria-label="Footer">
          <a href="#product">Product</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#integration">Integration</a>
          <a href="#demo">Contact</a>
          {LINKEDIN ? (
            <a href={LINKEDIN} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          ) : (
            <span className="footer__soon" title="Profile link not configured">
              LinkedIn
            </span>
          )}
        </nav>
      </div>
      <div className="container footer__legal">
        <span>© {new Date().getFullYear()} SeatView 3D. All rights reserved.</span>
        <span>Cinema names shown in demos are illustrative auditorium layouts, not customers.</span>
      </div>
    </footer>
  );
}
