import { memo } from 'react';
import type { PatheSeat, PatheSeatMap } from './types';
import { SEAT_TYPE_LABELS, isSeatAvailable, seatId } from './types';
import type { Locale } from '../seat-preview/ui/i18n';
import './seatmap.css';

interface Props {
  map: PatheSeatMap;
  selectedIds: readonly string[];
  activeSeatId?: string | null;
  onToggleSeat: (id: string) => void;
  /** Compact sizing for the preview drawer. */
  compact?: boolean;
  /** Colour scheme; 'dark' suits the preview drawer and dark pages. */
  variant?: 'light' | 'dark';
  /** Disable interaction (illustrative use). */
  readOnly?: boolean;
  locale?: Locale;
  /** When set, clicking an already-selected seat makes it active instead of deselecting it. */
  selectActiveOnly?: boolean;
  onActivateSeat?: (id: string) => void;
}

const screenLabel = { fr: 'Écran', en: 'Screen' };

/**
 * Seat selection grid mirroring Pathé's seat map: rows listed from the back of the room at the top to
 * the front at the bottom, with the screen drawn underneath. Each seat is a button with the same
 * data attributes as the production markup (data-number, data-type, data-status).
 */
export const SeatMap = memo(function SeatMap({
  map,
  selectedIds,
  activeSeatId,
  onToggleSeat,
  compact,
  variant = 'light',
  readOnly,
  locale = 'fr',
  selectActiveOnly,
  onActivateSeat,
}: Props) {
  const selected = new Set(selectedIds);
  const columns = map.colCount;

  const onClick = (seat: PatheSeat) => {
    const id = seatId(seat);
    if (selectActiveOnly && selected.has(id)) {
      onActivateSeat?.(id);
      return;
    }
    onToggleSeat(id);
    if (selectActiveOnly) onActivateSeat?.(id);
  };

  return (
    <div
      className={`seatmap ${compact ? 'seatmap--compact' : ''} ${variant === 'dark' ? 'seatmap--dark' : ''} ${readOnly ? 'seatmap--readonly' : ''}`}
      role="group"
      aria-label={map.roomName}
    >
      <table className="seatmap__table" style={{ ['--cols' as string]: columns }}>
        <tbody>
          {map.seats.map((row, ri) => {
            if (row.length === 0) return null;
            const byIndex = new Map(row.map((s) => [s.seatIndex, s]));
            const rowName = row[0].rowName;
            return (
              <tr key={ri}>
                <th scope="row" className="seatmap__rowlabel">{rowName}</th>
                {Array.from({ length: columns }).map((_, ci) => {
                  const seat = byIndex.get(ci);
                  if (!seat) return <td key={ci} className="seatmap__cell seatmap__cell--empty" />;
                  const id = seatId(seat);
                  const available = isSeatAvailable(seat);
                  const isSelected = selected.has(id);
                  const status = isSelected ? 'selected' : available ? 'available' : 'taken';
                  const typeLabel = SEAT_TYPE_LABELS[seat.seatType]?.[locale] ?? seat.seatType;
                  return (
                    <td key={ci} className="seatmap__cell">
                      <button
                        type="button"
                        className={[
                          'seat',
                          `seat--${status}`,
                          `seat--${seat.seatType.toLowerCase()}`,
                          seat.seatSide ? `seat--side-${seat.seatSide.toLowerCase()}` : '',
                          id === activeSeatId ? 'seat--active' : '',
                        ].join(' ')}
                        data-number={id}
                        data-type={typeLabel}
                        data-seattypecode={seat.seatType}
                        data-status={available ? 'available' : 'taken'}
                        disabled={!available || readOnly}
                        tabIndex={readOnly ? -1 : undefined}
                        aria-pressed={isSelected}
                        aria-label={`${typeLabel} ${id}`}
                        title={`${id} · ${typeLabel}`}
                        onClick={() => onClick(seat)}
                      >
                        <span className="seat__glyph" aria-hidden>
                          {seat.seatType === 'DIS' ? <WheelchairIcon /> : <span className="seat__num">{seat.seatName}</span>}
                        </span>
                      </button>
                    </td>
                  );
                })}
                <th scope="row" className="seatmap__rowlabel">{rowName}</th>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="seatmap__screen">
        <span>{screenLabel[locale]}</span>
      </div>
    </div>
  );
});

const WheelchairIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
    <circle cx="10" cy="4" r="2" fill="currentColor" />
    <path d="M9 7v6h5l3 6M9 11H6a5 5 0 1 0 7 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
