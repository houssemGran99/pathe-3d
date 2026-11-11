import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { computeSeatViewpoint } from '../seat-preview/camera/seatCamera';
import { findSeat } from '../seat-preview/geometry/auditorium';
import { createRigController } from '../seat-preview/scene/rigController';
import type { Auditorium } from '../seat-preview/types';
import { getStrings, type Locale } from '../seat-preview/ui/i18n';
import { isWebGLAvailable } from '../seat-preview/ui/webgl';

const CinemaScene = lazy(() => import('../seat-preview/scene/CinemaScene').then((m) => ({ default: m.CinemaScene })));

interface Props {
  auditorium: Auditorium;
  seatId: string;
  locale: Locale;
  /** Pause rendering (e.g. while the full-screen preview is open). */
  paused: boolean;
  onExpand: () => void;
}

/**
 * Embedded first-person viewer. The 3D chunk is requested only when the element first scrolls into
 * view, and the render loop stops whenever it is off-screen or paused.
 */
export function InlineViewer({ auditorium, seatId, locale, paused, onExpand }: Props) {
  const t = getStrings(locale);
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const controller = useMemo(() => createRigController(), []);
  const webgl = useMemo(() => isWebGLAvailable(), []);

  const seat = findSeat(auditorium, seatId);
  const viewpoint = useMemo(() => (seat ? computeSeatViewpoint(seat, auditorium) : null), [seat, auditorium]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      setMounted(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        setInView(e.isIntersecting);
        if (e.isIntersecting) setMounted(true);
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const showCanvas = webgl && mounted && !failed && viewpoint;

  return (
    <div ref={ref} className={`sv-inline ${ready ? 'is-ready' : ''}`}>
      <div className="sv-poster" aria-hidden={ready}>
        <div className="sv-poster__screen" />
        {!webgl || failed ? (
          <p className="sv-note">{t.unsupportedTitle}</p>
        ) : (
          !ready && <p className="sv-note">{t.loading}</p>
        )}
      </div>

      {showCanvas && (
        <Suspense fallback={null}>
          <CinemaScene
            auditorium={auditorium}
            viewpoint={viewpoint}
            controller={controller}
            active={inView && !paused}
            wheelZoom={false}
            onReady={() => setReady(true)}
            onError={() => setFailed(true)}
            className="sv-canvas"
          />
        </Suspense>
      )}

      {viewpoint && seat && (
        <div className="sv-chip" aria-live="polite">
          <strong>
            {seat.rowLabel}
            {seat.seatLabel}
          </strong>
          <span>{viewpoint.distanceToScreen.toFixed(1)} m</span>
          <span className={`sv-rating sv-rating--${viewpoint.rating}`}>{t.rating[viewpoint.rating]}</span>
        </div>
      )}

      <div className="sv-actions">
        {ready && (
          <button type="button" className="sv-btn" onClick={() => controller.reset()} aria-label={t.reset} title={t.reset}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path d="M4 12a8 8 0 1 0 2.5-5.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M4 4v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
        )}
        <button type="button" className="sv-btn" onClick={onExpand} aria-label={t.fullscreen} title={t.fullscreen}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        </button>
      </div>
    </div>
  );
}
