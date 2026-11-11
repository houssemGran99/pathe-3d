import { lazy, Suspense } from 'react';
import { LandingPage } from './landing/LandingPage';

// The operator-branded booking demo stays available at /pathe-demo; the SaaS site is the default route.
const BookingPage = lazy(() => import('./booking/BookingPage').then((m) => ({ default: m.BookingPage })));

export function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') : '';
  if (path === '/pathe-demo') {
    return (
      <Suspense fallback={null}>
        <BookingPage />
      </Suspense>
    );
  }
  return <LandingPage />;
}
