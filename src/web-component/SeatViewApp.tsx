import { createPortal } from 'react-dom';
import type { Auditorium } from '../seat-preview/types';
import type { Locale } from '../seat-preview/ui/i18n';
import { SeatPreviewOverlay } from '../seat-preview/ui/SeatPreviewOverlay';
import { InlineViewer } from './InlineViewer';

export type AppStatus = 'idle' | 'loading' | 'ready' | 'error';
export type Mode = 'modal' | 'inline';

export interface SeatViewAppProps {
  status: AppStatus;
  error?: string;
  auditorium: Auditorium | null;
  mode: Mode;
  open: boolean;
  seatId: string | null;
  selectedSeatIds: string[];
  locale: Locale;
  brand?: string;
  portalContainer: Element;
  onClose: () => void;
  onSeatChange: (seatId: string) => void;
  onExpand: () => void;
}

const COPY = {
  en: { loading: 'Loading auditorium…', error: 'The auditorium could not be loaded.', noSeat: 'Select a seat to preview the view.' },
  fr: { loading: 'Chargement de la salle…', error: 'La salle n’a pas pu être chargée.', noSeat: 'Sélectionnez un siège pour voir la vue.' },
} as const;

/** Root React tree rendered inside the custom element's shadow root. */
export function SeatViewApp(p: SeatViewAppProps) {
  const c = COPY[p.locale];
  const ready = p.status === 'ready' && p.auditorium;
  const seatKnown = !!(ready && p.seatId && p.auditorium!.seats.some((s) => s.id === p.seatId));

  return (
    <>
      {p.mode === 'inline' &&
        (ready && seatKnown ? (
          <InlineViewer auditorium={p.auditorium!} seatId={p.seatId!} locale={p.locale} paused={p.open} onExpand={p.onExpand} />
        ) : (
          <div className="sv-inline sv-inline--status" role={p.status === 'error' ? 'alert' : 'status'}>
            <p className="sv-note">{p.status === 'error' ? c.error : p.status === 'loading' ? c.loading : c.noSeat}</p>
          </div>
        ))}

      {p.open && ready && seatKnown && (
        <SeatPreviewOverlay
          open
          auditorium={p.auditorium!}
          seatId={p.seatId}
          selectedSeatIds={p.selectedSeatIds.length ? p.selectedSeatIds : p.seatId ? [p.seatId] : []}
          onClose={p.onClose}
          onSeatChange={p.onSeatChange}
          locale={p.locale}
          brand={p.brand}
          portalContainer={p.portalContainer}
          className="sv-overlay"
        />
      )}

      {p.open &&
        p.status === 'loading' &&
        createPortal(
          <div className="sp-overlay sv-overlay" role="dialog" aria-modal="true" aria-label={c.loading}>
            <div className="sp-loading">
              <div className="sp-loading__reel" aria-hidden>
                <span />
                <span />
                <span />
              </div>
              <p className="sp-loading__title">{c.loading}</p>
            </div>
          </div>,
          p.portalContainer,
        )}
    </>
  );
}
