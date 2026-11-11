import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { computeSeatViewpoint, findSeat, isWebGLAvailable } from '../../seat-preview';
import { createRigController } from '../../seat-preview/scene/rigController';
import { getStrings } from '../../seat-preview/ui/i18n';
import type { Auditorium } from '../../seat-preview';
import { HERO_PICKS } from '../data/demoAuditorium';
import { useInView } from '../hooks/useReveal';

const CinemaScene = lazy(() => import('../../seat-preview/scene/CinemaScene').then((m) => ({ default: m.CinemaScene })));

interface Props {
  auditorium: Auditorium;
  /** Pause rendering (e.g. while the full-screen preview is open). */
  paused?: boolean;
  /** Mobile devices open the full-screen experience instead of an inline canvas. */
  onOpenFull: (seatId: string) => void;
}

const isDesktopPointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 900px) and (pointer: fine)').matches;

/**
 * The hero visual: the real first-person engine rendered inline, with a quick seat picker that glides the
 * camera between characteristic positions and a live readout of the viewing metrics.
 * The 3D chunk is only requested after the page is idle, so the hero text paints first.
 */
export function HeroScene({ auditorium, paused = false, onOpenFull }: Props) {
  const t = getStrings('en');
  const [seatId, setSeatId] = useState(HERO_PICKS[1].id);
  const [inline, setInline] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inView = useInView(wrapRef, '120px');
  const controller = useMemo(() => createRigController(), []);
  const webgl = useMemo(() => isWebGLAvailable(), []);

  const seat = findSeat(auditorium, seatId);
  const viewpoint = useMemo(() => (seat ? computeSeatViewpoint(seat, auditorium) : null), [seat, auditorium]);

  // Mount the canvas on desktop once the page is idle and the hero is on screen.
  useEffect(() => {
    if (inline || !webgl || !isDesktopPointer() || !inView) return;
    const start = () => setInline(true);
    const hasIdle = 'requestIdleCallback' in window;
    const handle = hasIdle ? window.requestIdleCallback(start, { timeout: 1500 }) : window.setTimeout(start, 600);
    return () => {
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [inline, webgl, inView]);

  const active = inline && inView && !paused && !document.hidden;

  return (
    <div ref={wrapRef} className={`hero-scene ${ready ? 'hero-scene--ready' : ''}`}>
      <div className="hero-scene__frame">
        {/* Poster: visible until the first 3D frame, and permanently on touch devices / without WebGL. */}
        <div className="hero-poster" aria-hidden={ready}>
          <div className="hero-poster__screen" />
          <div className="hero-poster__rows">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="hero-poster__row" style={{ ['--i' as string]: i }}>
                {Array.from({ length: 9 }).map((__, j) => (
                  <span key={j} />
                ))}
              </div>
            ))}
          </div>
          {!inline && webgl && !failed && (
            <button type="button" className="btn btn--glass hero-poster__cta" onClick={() => onOpenFull(seatId)}>
              <PlayIcon /> Explore in 3D
            </button>
          )}
          {(!webgl || failed) && <p className="hero-poster__note">3D preview needs WebGL. The experience still works on supported browsers.</p>}
          {inline && !ready && !failed && <span className="hero-poster__loading">Loading the auditorium…</span>}
        </div>

        {inline && viewpoint && !failed && (
          <Suspense fallback={null}>
            <CinemaScene
              auditorium={auditorium}
              viewpoint={viewpoint}
              controller={controller}
              active={active}
              wheelZoom={false}
              onReady={() => setReady(true)}
              onError={() => setFailed(true)}
              className="hero-scene__canvas"
            />
          </Suspense>
        )}

        {ready && (
          <>
            <span className="hero-scene__hint">Drag to look around</span>
            <button type="button" className="hero-scene__expand" onClick={() => onOpenFull(seatId)} aria-label="Open full-screen preview">
              <ExpandIcon />
            </button>
          </>
        )}
      </div>

      <div className="hero-picker" role="group" aria-label="Choose a seat to preview">
        {HERO_PICKS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`hero-picker__seat ${p.id === seatId ? 'is-active' : ''}`}
            aria-pressed={p.id === seatId}
            onClick={() => setSeatId(p.id)}
          >
            <strong>{p.label}</strong>
            <small>{p.id}</small>
          </button>
        ))}
      </div>

      {viewpoint && (
        <dl className="hero-readout" aria-live="polite">
          <div>
            <dt>Seat</dt>
            <dd>
              {seat?.rowLabel}
              {seat?.seatLabel} · {seat?.categoryLabel}
            </dd>
          </div>
          <div>
            <dt>Distance</dt>
            <dd>{viewpoint.distanceToScreen.toFixed(1)} m</dd>
          </div>
          <div>
            <dt>Angle</dt>
            <dd>
              {Math.abs(viewpoint.horizontalAngleDeg) < 2.5
                ? 'centred'
                : `${Math.abs(viewpoint.horizontalAngleDeg).toFixed(0)}° ${viewpoint.horizontalAngleDeg > 0 ? 'right' : 'left'}`}
              {' · '}
              {Math.abs(viewpoint.verticalAngleDeg).toFixed(0)}° {viewpoint.verticalAngleDeg >= 0 ? 'up' : 'down'}
            </dd>
          </div>
          <div>
            <dt>Rating</dt>
            <dd className={`rating rating--${viewpoint.rating}`}>{t.rating[viewpoint.rating]}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
    <path d="M8 5v14l11-7z" fill="currentColor" />
  </svg>
);
const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);
