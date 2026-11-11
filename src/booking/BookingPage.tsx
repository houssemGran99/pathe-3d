import { useCallback, useMemo, useState } from 'react';
import salle3 from './data/salle3.json';
import { SeatMap } from './SeatMap';
import { useBookingState } from './useBookingState';
import type { PatheSeatMapResponse } from './types';
import { SEAT_TYPE_LABELS } from './types';
import { SeatPreviewOverlay, patheSeatMapToAuditorium } from '../seat-preview';
import type { Locale } from '../seat-preview/ui/i18n';
import './booking.css';

/**
 * Fixture captured from GET https://s.pathe.tn/api/seatmap/fr-TN/5202/46700/map (Salle 3, Pathé Mall Of
 * Sousse). In production this comes from the existing booking service; the page shape is unchanged.
 */
const seatMapResponse = salle3 as PatheSeatMapResponse;
const map = seatMapResponse.maps[0];

/** `?no3d` forces the non-WebGL fallback, for QA on capable machines. */
const forceFallback = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('no3d');

const copy = {
  fr: {
    changeFilm: 'Changer de film',
    cinema: 'Cinéma',
    date: 'Date',
    session: 'Séance',
    ends: 'Fin prévue à 13:46',
    selectSeats: 'Sélectionnez vos places',
    free: (n: number) => `${n} places libres`,
    mySeats: 'Mes places',
    freeSeats: 'Places libres',
    taken: 'Places occupées',
    duo: 'Fauteuil Duo',
    pmr: 'Emplacement PMR',
    viewFromSeat: 'Voir depuis ce siège',
    continue: 'Continuer',
    noSeat: 'Cliquez sur un siège pour le sélectionner',
    selectedCount: (n: number) => (n > 1 ? `${n} sièges sélectionnés` : '1 siège sélectionné'),
    clear: 'Tout désélectionner',
    back: 'Retour',
  },
  en: {
    changeFilm: 'Change film',
    cinema: 'Cinema',
    date: 'Date',
    session: 'Session',
    ends: 'Ends at 13:46',
    selectSeats: 'Select your seats',
    free: (n: number) => `${n} seats available`,
    mySeats: 'My seats',
    freeSeats: 'Available',
    taken: 'Taken',
    duo: 'Duo seat',
    pmr: 'Wheelchair space',
    viewFromSeat: 'View from this seat',
    continue: 'Continue',
    noSeat: 'Click a seat to select it',
    selectedCount: (n: number) => (n > 1 ? `${n} seats selected` : '1 seat selected'),
    clear: 'Clear selection',
    back: 'Back',
  },
} as const;

export function BookingPage() {
  const [locale, setLocale] = useState<Locale>('fr');
  const t = copy[locale];
  const booking = useBookingState(map);
  const { selectedIds, activeSeatId, previewOpen, toggleSeat, openPreview, closePreview, setActiveSeatId } = booking;

  // The metric auditorium model is derived from the booking's own seat map; it is cheap to rebuild
  // when the selection changes so highlighted seats stay in sync.
  const auditorium = useMemo(
    () => patheSeatMapToAuditorium(map, { selectedSeatIds: selectedIds, locale }),
    [selectedIds, locale],
  );

  const activeSeat = activeSeatId ? booking.seatsById.get(activeSeatId) : undefined;
  const activeTypeLabel = activeSeat ? (SEAT_TYPE_LABELS[activeSeat.seatType]?.[locale] ?? activeSeat.seatType) : '';

  const renderSeatMapInPreview = useCallback(
    () => (
      <SeatMap
        map={map}
        selectedIds={selectedIds}
        activeSeatId={activeSeatId}
        onToggleSeat={toggleSeat}
        onActivateSeat={setActiveSeatId}
        selectActiveOnly
        compact
        locale={locale}
      />
    ),
    [selectedIds, activeSeatId, toggleSeat, setActiveSeatId, locale],
  );

  return (
    <div className="booking">
      <aside className="booking__sidebar">
        <div className="booking__poster" aria-hidden>
          <div className="booking__poster-art">
            <span>Scrooge</span>
            <small>Ebenezer</small>
          </div>
        </div>
        <h1 className="booking__film">Scrooge / Ebenezer</h1>
        <p className="booking__cinema">Pathé Mall Of Sousse</p>
        <button type="button" className="booking__link">{t.changeFilm}</button>
        <dl className="booking__meta">
          <div>
            <dt>{t.cinema}</dt>
            <dd>Pathé Mall Of Sousse</dd>
          </div>
          <div>
            <dt>{t.date}</dt>
            <dd>{locale === 'fr' ? 'mercredi 11 novembre 2026' : 'Wednesday 11 November 2026'}</dd>
          </div>
          <div>
            <dt>{t.session}</dt>
            <dd>
              11:30 <span className="booking__tag">VOSTFR</span>
              <small>{t.ends}</small>
            </dd>
          </div>
        </dl>
      </aside>

      <main className="booking__main">
        <header className="booking__header">
          <div className="booking__room">
            <span>{map.roomName}</span>
            {map.isHandicappedSeats && <WheelchairBadge />}
          </div>
          <h2 className="booking__title">{t.selectSeats}</h2>
          <p className="booking__free">{t.free(map.seatsAvailable)}</p>
          <button
            type="button"
            className="booking__lang"
            onClick={() => setLocale((l) => (l === 'fr' ? 'en' : 'fr'))}
            aria-label="Language"
          >
            {locale.toUpperCase()}
          </button>
        </header>

        <SeatMap map={map} selectedIds={selectedIds} activeSeatId={activeSeatId} onToggleSeat={toggleSeat} locale={locale} />

        <ul className="booking__legend">
          <li><i className="legend legend--selected" /> {t.mySeats}</li>
          <li><i className="legend legend--available" /> {t.freeSeats}</li>
          <li><i className="legend legend--taken" /> {t.taken}</li>
          <li><i className="legend legend--duo" /> {t.duo}</li>
          <li><i className="legend legend--pmr" /> {t.pmr}</li>
        </ul>
      </main>

      <footer className={`booking__bar ${selectedIds.length ? 'booking__bar--active' : ''}`}>
        <div className="booking__bar-inner">
          <div className="booking__selection">
            {selectedIds.length === 0 ? (
              <span className="booking__selection-empty">{t.noSeat}</span>
            ) : (
              <>
                <span className="booking__selection-count">{t.selectedCount(selectedIds.length)}</span>
                <div className="booking__chips">
                  {selectedIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={`booking__chip ${id === activeSeatId ? 'booking__chip--active' : ''}`}
                      onClick={() => setActiveSeatId(id)}
                      aria-pressed={id === activeSeatId}
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="booking__actions">
            {activeSeat && (
              <button type="button" className="btn btn--view" onClick={() => openPreview(activeSeatId!)}>
                <EyeIcon />
                <span>
                  {t.viewFromSeat}
                  <small>{activeSeatId} · {activeTypeLabel}</small>
                </span>
              </button>
            )}
            <button type="button" className="btn btn--primary" disabled={selectedIds.length === 0}>
              {t.continue}
            </button>
          </div>
        </div>
      </footer>

      <SeatPreviewOverlay
        open={previewOpen}
        auditorium={auditorium}
        seatId={activeSeatId}
        selectedSeatIds={selectedIds}
        onClose={closePreview}
        onSeatChange={setActiveSeatId}
        locale={locale}
        renderSeatMap={renderSeatMapInPreview}
        forceFallback={forceFallback}
      />
    </div>
  );
}

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
  </svg>
);

const WheelchairBadge = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-label="PMR">
    <circle cx="10" cy="4" r="2" fill="currentColor" />
    <path d="M9 7v6h5l3 6M9 11H6a5 5 0 1 0 7 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
