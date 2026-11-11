import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { computeSeatViewpoint } from '../camera/seatCamera';
import { findSeat } from '../geometry/auditorium';
import { createRigController } from '../scene/rigController';
import type { Auditorium, Seat, SeatViewpoint } from '../types';
import { getStrings, type Locale } from './i18n';
import { isTouchDevice, isWebGLAvailable } from './webgl';
import './seat-preview.css';

// The Three.js stack is only fetched when the overlay mounts.
const CinemaScene = lazy(() => import('../scene/CinemaScene').then((m) => ({ default: m.CinemaScene })));

export interface SeatPreviewOverlayProps {
  open: boolean;
  auditorium: Auditorium;
  /** The seat to sit in. Changing it glides the camera to the new seat. */
  seatId: string | null;
  /** All seats selected in the booking (shown as "my seats" chips). */
  selectedSeatIds?: readonly string[];
  onClose: () => void;
  /** Called when the user picks another seat from inside the preview. */
  onSeatChange?: (seatId: string) => void;
  locale?: Locale;
  /**
   * Optional seat-map renderer displayed in the "seat map" drawer. Receives the booking's own seat map
   * so the preview never re-implements selection logic.
   */
  renderSeatMap?: () => ReactNode;
  /** QA switch: show the non-WebGL fallback even on capable browsers. */
  forceFallback?: boolean;
}

type Phase = 'loading' | 'ready' | 'error';

const fmtAngle = (deg: number) => `${Math.abs(deg).toFixed(0)}°`;

export function SeatPreviewOverlay({
  open,
  auditorium,
  seatId,
  selectedSeatIds = [],
  onClose,
  onSeatChange,
  locale = 'fr',
  renderSeatMap,
  forceFallback = false,
}: SeatPreviewOverlayProps) {
  const t = getStrings(locale);
  const [phase, setPhase] = useState<Phase>('loading');
  const [retryKey, setRetryKey] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const controller = useMemo(() => createRigController(), []);
  const webgl = useMemo(() => (open ? !forceFallback && isWebGLAvailable() : true), [open, forceFallback]);

  const seat = findSeat(auditorium, seatId);
  const viewpoint = useMemo(() => (seat ? computeSeatViewpoint(seat, auditorium) : null), [seat, auditorium]);

  // Hint fades once the user looks around.
  useEffect(() => controller.subscribe(() => setInteracted(controller.state.interacted)), [controller]);

  // Escape closes, and the page behind must not scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) void document.exitFullscreen();
        else onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!open) {
      setPhase('loading');
      setMapOpen(false);
      controller.reset();
    }
  }, [open, controller]);

  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);

  if (!open || !seat || !viewpoint) return null;

  const canFullscreen = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;
  const mySeats = selectedSeatIds.map((id) => findSeat(auditorium, id)).filter((s): s is Seat => !!s);

  const content = (
    <div ref={rootRef} className="sp-overlay" role="dialog" aria-modal="true" aria-label={t.title}>
      <div className="sp-viewport">
        {webgl ? (
          <Suspense fallback={null}>
            <CinemaScene
              key={retryKey}
              auditorium={auditorium}
              viewpoint={viewpoint}
              controller={controller}
              onReady={() => setPhase('ready')}
              onError={() => setPhase('error')}
              className="sp-canvas"
            />
          </Suspense>
        ) : (
          <StaticFallback viewpoint={viewpoint} auditorium={auditorium} t={t} />
        )}
        <div className="sp-vignette" aria-hidden />

        {webgl && phase === 'loading' && (
          <div className="sp-loading" aria-live="polite">
            <div className="sp-loading__reel" aria-hidden>
              <span />
              <span />
              <span />
            </div>
            <p className="sp-loading__title">{t.loading}</p>
            <p className="sp-loading__sub">{t.loadingSub}</p>
          </div>
        )}
        {webgl && phase === 'error' && (
          <div className="sp-message">
            <h3>{t.errorTitle}</h3>
            <p>{t.errorBody}</p>
            <div className="sp-message__actions">
              <button
                className="sp-btn sp-btn--primary"
                onClick={() => {
                  setPhase('loading');
                  setRetryKey((k) => k + 1);
                }}
              >
                {t.retry}
              </button>
              <button className="sp-btn" onClick={onClose}>
                {t.backToSelection}
              </button>
            </div>
          </div>
        )}
        {webgl && phase === 'ready' && (
          <p className={`sp-hint ${interacted ? 'sp-hint--hidden' : ''}`} aria-hidden={interacted}>
            {isTouchDevice() ? t.hintTouch : t.hint}
          </p>
        )}
      </div>

      <header className="sp-topbar">
        <div className="sp-topbar__brand">
          <span className="sp-logo" aria-hidden>
            Pathé
          </span>
          <div>
            <h2 className="sp-topbar__title">{t.title}</h2>
            <p className="sp-topbar__sub">
              {auditorium.name} · {t.subtitle}
            </p>
          </div>
        </div>
        <div className="sp-topbar__actions">
          {canFullscreen && (
            <button
              className="sp-iconbtn"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? t.exitFullscreen : t.fullscreen}
              title={fullscreen ? t.exitFullscreen : t.fullscreen}
            >
              {fullscreen ? <IconCompress /> : <IconExpand />}
            </button>
          )}
          <button className="sp-iconbtn sp-iconbtn--close" onClick={onClose} aria-label={t.close} title={t.close}>
            <IconClose />
          </button>
        </div>
      </header>

      <aside className="sp-panel">
        <div className="sp-panel__seat">
          <span className="sp-panel__seatnum">{seat.rowLabel}{seat.seatLabel}</span>
          <div>
            <div className="sp-panel__label">{t.seat} {seat.seatLabel} · {t.row} {seat.rowLabel}</div>
            <div className="sp-panel__category">{seat.categoryLabel ?? seat.category ?? '—'}</div>
          </div>
        </div>
        <div className={`sp-rating sp-rating--${viewpoint.rating}`}>
          <strong>{t.rating[viewpoint.rating]}</strong>
          <span>{t.ratingHint[viewpoint.rating]}</span>
        </div>
        <dl className="sp-stats">
          <div>
            <dt>{t.distance}</dt>
            <dd>{viewpoint.distanceToScreen.toFixed(1)} m</dd>
          </div>
          <div>
            <dt>{t.angle}</dt>
            <dd>
              <AngleIndicator viewpoint={viewpoint} />
              <span>
                {Math.abs(viewpoint.horizontalAngleDeg) < 2.5
                  ? t.centre
                  : `${fmtAngle(viewpoint.horizontalAngleDeg)} ${viewpoint.horizontalAngleDeg > 0 ? t.right : t.left}`}
                {' · '}
                {fmtAngle(viewpoint.verticalAngleDeg)} {viewpoint.verticalAngleDeg >= 0 ? t.up : t.down}
              </span>
            </dd>
          </div>
          <div>
            <dt>{t.coverage}</dt>
            <dd>{viewpoint.screenCoverageDeg.toFixed(0)}°</dd>
          </div>
        </dl>
        {mySeats.length > 1 && (
          <div className="sp-myseats">
            <span className="sp-myseats__label">{t.mySeats}</span>
            <div className="sp-myseats__chips">
              {mySeats.map((s) => (
                <button
                  key={s.id}
                  className={`sp-chip ${s.id === seat.id ? 'sp-chip--active' : ''}`}
                  onClick={() => onSeatChange?.(s.id)}
                  aria-pressed={s.id === seat.id}
                >
                  {s.rowLabel}{s.seatLabel}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      <div className="sp-controls" role="toolbar" aria-label={t.subtitle}>
        <button className="sp-ctl" onClick={() => controller.zoomBy(1 / 1.2)} aria-label={t.zoomIn} title={t.zoomIn}>
          <IconPlus />
        </button>
        <button className="sp-ctl" onClick={() => controller.zoomBy(1.2)} aria-label={t.zoomOut} title={t.zoomOut}>
          <IconMinus />
        </button>
        <button className="sp-ctl" onClick={() => controller.reset()} aria-label={t.reset} title={t.reset}>
          <IconReset />
        </button>
        {renderSeatMap && (
          <button
            className={`sp-ctl sp-ctl--wide ${mapOpen ? 'sp-ctl--active' : ''}`}
            onClick={() => setMapOpen((v) => !v)}
            aria-pressed={mapOpen}
          >
            <IconMap />
            <span>{mapOpen ? t.hideSeatMap : t.seatMap}</span>
          </button>
        )}
      </div>

      {renderSeatMap && (
        <section className={`sp-drawer ${mapOpen ? 'sp-drawer--open' : ''}`} aria-hidden={!mapOpen}>
          <div className="sp-drawer__head">
            <strong>{t.otherSeats}</strong>
            <span>{t.pickSeatInMap}</span>
          </div>
          <div className="sp-drawer__body">{mapOpen && renderSeatMap()}</div>
        </section>
      )}
    </div>
  );

  return createPortal(content, document.body);
}

/** Tiny top-down diagram: screen bar, seat dot and the gaze line toward the screen centre. */
function AngleIndicator({ viewpoint }: { viewpoint: SeatViewpoint }) {
  const a = (viewpoint.horizontalAngleDeg * Math.PI) / 180;
  const cx = 22 + Math.sin(a) * 14;
  const cy = 30;
  return (
    <svg className="sp-angle" viewBox="0 0 44 36" aria-hidden>
      <rect x="8" y="3" width="28" height="3" rx="1.5" />
      <line x1={cx} y1={cy} x2="22" y2="4.5" />
      <circle cx={cx} cy={cy} r="3" />
    </svg>
  );
}

function StaticFallback({ viewpoint, auditorium, t }: { viewpoint: SeatViewpoint; auditorium: Auditorium; t: ReturnType<typeof getStrings> }) {
  // Draws the screen as it would be seen: its apparent size from the apparent angle, offset by the lateral angle.
  const scale = Math.min(1, viewpoint.screenCoverageDeg / 60);
  const shift = Math.max(-30, Math.min(30, -viewpoint.horizontalAngleDeg * 0.8));
  const rows = auditorium.rows.length;
  return (
    <div className="sp-fallback">
      <div className="sp-fallback__screen" style={{ transform: `translateX(${shift}%) scale(${scale})` }} />
      <div className="sp-fallback__seats" aria-hidden>
        {Array.from({ length: Math.min(rows, 6) }).map((_, i) => (
          <div key={i} style={{ opacity: 0.25 + i * 0.12, transform: `scale(${0.6 + i * 0.08})` }} />
        ))}
      </div>
      <div className="sp-message sp-message--inline">
        <h3>{t.unsupportedTitle}</h3>
        <p>{t.unsupportedBody}</p>
      </div>
    </div>
  );
}

const IconClose = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);
const IconExpand = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);
const IconCompress = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);
const IconPlus = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
const IconMinus = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path d="M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
const IconReset = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path d="M4 12a8 8 0 1 0 2.5-5.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M4 4v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);
const IconMap = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <rect x="4" y="5" width="4" height="3" rx="1" fill="currentColor" />
    <rect x="10" y="5" width="4" height="3" rx="1" fill="currentColor" />
    <rect x="16" y="5" width="4" height="3" rx="1" fill="currentColor" />
    <rect x="4" y="10" width="4" height="3" rx="1" fill="currentColor" />
    <rect x="10" y="10" width="4" height="3" rx="1" fill="currentColor" />
    <rect x="16" y="10" width="4" height="3" rx="1" fill="currentColor" />
    <path d="M5 18h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
