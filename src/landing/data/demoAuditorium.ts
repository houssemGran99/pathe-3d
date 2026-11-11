import type { PatheSeat, PatheSeatMap } from '../../booking/types';

/**
 * Neutral demo auditorium for the SeatView 3D site (no operator branding).
 * It uses the same grid shape as the seat-map adapter so the whole engine is reused as-is:
 * 9 rows (A front to I back), 18 columns with a central aisle, a premium back row, Duo pairs,
 * a wheelchair space and a scattering of taken seats.
 */
export const DEMO_ROOM_NAME = 'Auditorium 3';

const ROWS = ['I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A']; // back to front, as the adapter expects
const COLS = 18;
const AISLE = new Set([8, 9]);
const TAKEN: Record<string, number[]> = { I: [3, 4], H: [11, 12, 13], F: [2], E: [14, 15], D: [6, 7], B: [10] };
const DUO: Record<string, number[]> = { G: [4, 5, 12, 13], E: [4, 5], D: [12, 13] };

function buildSeats(): PatheSeat[][] {
  return ROWS.map((rowName, rowIndex) => {
    const row: PatheSeat[] = [];
    let number = 1;
    for (let col = 0; col < COLS; col++) {
      if (AISLE.has(col)) continue;
      if (rowName === 'A' && (col < 2 || col > 15)) continue; // the front row is narrower
      const duoIdx = (DUO[rowName] ?? []).indexOf(col);
      const seatType = rowName === 'I' ? 'PRM' : duoIdx >= 0 ? 'DUO' : rowName === 'C' && col === 2 ? 'DIS' : 'STD';
      row.push({
        rowIndex,
        seatIndex: col,
        rowName,
        seatName: String(number++),
        seatType,
        section: 1,
        status: (TAKEN[rowName] ?? []).includes(col) ? 5 : 0,
        seatSide: duoIdx >= 0 ? (duoIdx % 2 === 0 ? 'L' : 'R') : null,
        companion: false,
        tooltip: null,
      });
    }
    return row;
  });
}

const seats = buildSeats();
const flat = seats.flat();

export const demoSeatMap: PatheSeatMap = {
  seatsAvailable: flat.filter((s) => s.status === 0).length,
  sections: [{ number: 1, areaCodeId: 'demo', type: 'Standard' }],
  roomName: DEMO_ROOM_NAME,
  isHandicappedSeats: true,
  rowCount: ROWS.length,
  colCount: COLS,
  sessionId: 'demo',
  isStandardSeats: true,
  isDuoSeats: true,
  isDboxSeats: false,
  isPremiumSeats: true,
  isLogeSeats: false,
  isSofaSeats: false,
  isTrioSeats: false,
  seatsTotalCount: flat.length,
  seats,
};

/** Seats used by the hero quick-picker to show how the perspective changes. */
export const HERO_PICKS: { id: string; label: string; hint: string }[] = [
  { id: 'A6', label: 'Front row', hint: 'Close and steep' },
  { id: 'E8', label: 'Centre', hint: 'Reference seat' },
  { id: 'E1', label: 'Far left', hint: 'Angled view' },
  { id: 'E16', label: 'Far right', hint: 'Angled view' },
  { id: 'I8', label: 'Back row', hint: 'Premium, widest view' },
];
