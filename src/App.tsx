import { lazy, Suspense } from 'react';
import { LandingPage } from './landing/LandingPage';

// The operator-branded booking prototype at /pathe-demo uses a real cinema's name and layout, so it is
// only served in development or when VITE_ENABLE_PATHE_DEMO=true is set at build time.
const PATHE_DEMO_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_PATHE_DEMO === 'true';

// Conditional so the bundler drops the chunk entirely when the flag is off.
const BookingPage = PATHE_DEMO_ENABLED
  ? lazy(() => import('./booking/BookingPage').then((m) => ({ default: m.BookingPage })))
  : null;

export function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') : '';
  if (BookingPage && path === '/pathe-demo') {
    return (
      <Suspense fallback={null}>
        <BookingPage />
      </Suspense>
    );
  }
  return <LandingPage />;
}
