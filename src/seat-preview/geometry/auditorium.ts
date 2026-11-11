import type { Auditorium, AuditoriumRow, Seat, SeatStatus } from '../types';

/**
 * Physical dimensions used when the seat-map source does not provide them
 * (the Pathé seat-map API only exposes the grid, not metres).
 * Values are typical of a mid-size multiplex auditorium.
 */
export interface AuditoriumDimensions {
  /** Centre-to-centre distance between two seats in a row. */
  seatPitch: number;
  /** Centre-to-centre distance between two rows. */
  rowPitch: number;
  /** Floor rise between consecutive rows (stadium seating). */
  rowRise: number;
  /** Distance from the screen plane to the front row's seat centres. */
  frontRowDistance: number;
  screenWidth: number;
  screenHeight: number;
  /** Height of the screen's bottom edge above the front-row floor. */
  screenBottomHeight: number;
  /** Width of the walkway on each side of the seating block. */
  sideAisleWidth: number;
  /** Walkway between the back row and the back wall. */
  backAisleDepth: number;
  ceilingHeight: number;
}

export const DEFAULT_DIMENSIONS: AuditoriumDimensions = {
  seatPitch: 0.58,
  rowPitch: 1.1,
  rowRise: 0.32,
  frontRowDistance: 6.2,
  screenWidth: 9.8,
  screenHeight: 4.1, // about 2.39:1 (scope ratio)
  screenBottomHeight: 0.95,
  sideAisleWidth: 1.3,
  backAisleDepth: 2.2,
  ceilingHeight: 7.6,
};

/** Seat dimensions shared by the renderer and the camera model (metres). */
export const SEAT_DIMENSIONS = {
  width: 0.52,
  depth: 0.5,
  /** Top of the cushion above the row floor. */
  cushionHeight: 0.44,
  /** Top of the backrest above the row floor. */
  backHeight: 1.02,
  armrestHeight: 0.64,
  armrestWidth: 0.07,
  /** Seated eye height above the row floor (spec: 1.10 to 1.20 m). */
  eyeHeight: 1.16,
  /** Eye height for a wheelchair user. */
  wheelchairEyeHeight: 1.25,
  /** Eyes sit slightly in front of the backrest. */
  eyeForwardOffset: 0.14,
} as const;

/** Source-agnostic description of a row, ordered front (index 0) to back. */
export interface RowSpec {
  label: string;
  seats: Array<{
    id: string;
    /** Grid column, 0 = audience's left. */
    column: number;
    label: string;
    category?: string;
    categoryLabel?: string;
    status: SeatStatus;
    sharedArmrest?: 'left' | 'right';
    wheelchair?: boolean;
  }>;
}

export interface LayoutInput {
  id: string;
  name: string;
  /** Number of grid columns (used to centre the block). */
  columnCount: number;
  rows: RowSpec[];
  dimensions?: Partial<AuditoriumDimensions>;
}

/**
 * Builds a metric auditorium model from a grid description.
 * Rows are stacked back from the screen with a stadium rise; columns are centred on the screen axis.
 */
export function buildAuditorium(input: LayoutInput): Auditorium {
  const d: AuditoriumDimensions = { ...DEFAULT_DIMENSIONS, ...input.dimensions };
  const centreColumn = (input.columnCount - 1) / 2;

  const rows: AuditoriumRow[] = input.rows.map((row, index) => ({
    index,
    label: row.label,
    z: d.frontRowDistance + index * d.rowPitch,
    floorY: index * d.rowRise,
    seatCount: row.seats.length,
  }));

  const seats: Seat[] = input.rows.flatMap((row, rowIndex) =>
    row.seats.map((s) => ({
      id: s.id,
      row: rowIndex,
      column: s.column,
      rowLabel: row.label,
      seatLabel: s.label,
      positionX: (s.column - centreColumn) * d.seatPitch,
      positionY: rows[rowIndex].floorY,
      positionZ: rows[rowIndex].z,
      category: s.category,
      categoryLabel: s.categoryLabel,
      status: s.status,
      sharedArmrest: s.sharedArmrest,
      wheelchair: s.wheelchair,
    })),
  );

  const blockWidth = input.columnCount * d.seatPitch;
  const lastRow = rows[rows.length - 1];
  const depth = (lastRow ? lastRow.z : d.frontRowDistance) + d.backAisleDepth;

  return {
    id: input.id,
    name: input.name,
    screenWidth: d.screenWidth,
    screenHeight: d.screenHeight,
    screenPosition: { x: 0, y: d.screenBottomHeight + d.screenHeight / 2, z: 0 },
    room: {
      width: Math.max(blockWidth + 2 * d.sideAisleWidth, d.screenWidth + 1.2),
      depth,
      height: d.ceilingHeight,
    },
    seatPitch: d.seatPitch,
    rowPitch: d.rowPitch,
    rowRise: d.rowRise,
    rows,
    seats,
  };
}

export const findSeat = (auditorium: Auditorium, seatId: string | null | undefined) =>
  seatId ? (auditorium.seats.find((s) => s.id === seatId) ?? null) : null;
