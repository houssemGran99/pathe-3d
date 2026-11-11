import type { PatheSeat, PatheSeatMap } from '../../booking/types';
import { SEAT_TYPE_LABELS, isSeatAvailable, seatId } from '../../booking/types';
import { buildAuditorium, type AuditoriumDimensions, type RowSpec } from '../geometry/auditorium';
import type { Auditorium, SeatStatus } from '../types';

export interface PatheAdapterOptions {
  /** Ids of the seats the user has selected (they are rendered highlighted). */
  selectedSeatIds?: ReadonlySet<string> | readonly string[];
  locale?: 'fr' | 'en';
  dimensions?: Partial<AuditoriumDimensions>;
}

const toStatus = (seat: PatheSeat, selected: ReadonlySet<string>): SeatStatus => {
  if (selected.has(seatId(seat))) return 'selected';
  if (isSeatAvailable(seat)) return 'available';
  return seat.status === 5 ? 'occupied' : 'unavailable';
};

/**
 * Converts a Pathé seat map (as returned by /api/seatmap/.../map) into the metric
 * auditorium model used by the 3D preview.
 *
 * Pathé rows are listed from the back (rowIndex 0) to the front, with the screen drawn
 * under the last row; the adapter reverses them so that row 0 is the front row.
 */
export function patheSeatMapToAuditorium(map: PatheSeatMap, options: PatheAdapterOptions = {}): Auditorium {
  const locale = options.locale ?? 'fr';
  const selected = new Set(options.selectedSeatIds ?? []);

  const nonEmptyRows = map.seats.filter((row) => row.length > 0);
  const frontToBack = [...nonEmptyRows].reverse();

  const rows: RowSpec[] = frontToBack.map((row) => ({
    label: row[0].rowName,
    seats: row.map((s) => ({
      id: seatId(s),
      column: s.seatIndex,
      label: s.seatName,
      category: s.seatType,
      categoryLabel: SEAT_TYPE_LABELS[s.seatType]?.[locale] ?? s.seatType,
      status: toStatus(s, selected),
      sharedArmrest:
        s.seatType === 'DUO' ? (s.seatSide === 'L' ? 'right' : s.seatSide === 'R' ? 'left' : undefined) : undefined,
      wheelchair: s.seatType === 'DIS',
    })),
  }));

  return buildAuditorium({
    id: `${map.sessionId}-${map.roomName}`,
    name: map.roomName,
    columnCount: map.colCount,
    rows,
    dimensions: options.dimensions,
  });
}
