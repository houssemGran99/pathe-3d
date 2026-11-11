/**
 * Types mirroring the Pathé seat-map API
 * (GET /api/seatmap/{locale}/{cinemaId}/{sessionId}/map on s.pathe.tn).
 * Nothing here is invented: field names and enum values are those returned by the live endpoint.
 */

/** Seat type codes used by Pathé: standard, duo (love seat), wheelchair space, ... */
export type PatheSeatType = 'STD' | 'DUO' | 'DIS' | 'PRM' | 'LOG' | 'SOF' | 'TRI' | 'DBX' | (string & {});

/** 0 = available, 5 = taken (observed values). Other codes are treated as unavailable. */
export type PatheSeatStatus = 0 | 5 | number;

export interface PatheSeat {
  rowIndex: number;
  seatIndex: number;
  rowName: string;
  seatName: string;
  seatType: PatheSeatType;
  section: number;
  status: PatheSeatStatus;
  /** For DUO seats: which half of the double seat this is. */
  seatSide: 'L' | 'R' | null;
  companion: boolean;
  tooltip: string | null;
}

export interface PatheSection {
  number: number;
  areaCodeId: string;
  type: string;
}

export interface PatheSeatMap {
  seatsAvailable: number;
  sections: PatheSection[];
  roomName: string;
  isHandicappedSeats: boolean;
  rowCount: number;
  colCount: number;
  sessionId: string;
  isStandardSeats: boolean;
  isDuoSeats: boolean;
  isDboxSeats: boolean;
  isPremiumSeats: boolean;
  isLogeSeats: boolean;
  isSofaSeats: boolean;
  isTrioSeats: boolean;
  seatsTotalCount: number;
  /** Rows ordered from the back of the auditorium (rowIndex 0) to the front (screen side). */
  seats: PatheSeat[][];
}

export interface PatheSeatMapResponse {
  maps: PatheSeatMap[];
}

/** Stable identifier for a seat within a map, e.g. "F16". */
export const seatId = (seat: Pick<PatheSeat, 'rowName' | 'seatName'>) => `${seat.rowName}${seat.seatName}`;

export const isSeatAvailable = (seat: PatheSeat) => seat.status === 0;

export const SEAT_TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  STD: { fr: 'Fauteuil standard', en: 'Standard seat' },
  DUO: { fr: 'Fauteuil Duo', en: 'Duo seat' },
  DIS: { fr: 'Emplacement PMR', en: 'Wheelchair space' },
  PRM: { fr: 'Fauteuil Premium', en: 'Premium seat' },
  LOG: { fr: 'Loge', en: 'Box seat' },
  SOF: { fr: 'Sofa', en: 'Sofa' },
  TRI: { fr: 'Fauteuil Trio', en: 'Trio seat' },
  DBX: { fr: 'Fauteuil D-BOX', en: 'D-BOX seat' },
};
