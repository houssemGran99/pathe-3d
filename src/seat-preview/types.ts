/**
 * Data model consumed by the 3D seat preview module.
 * It is framework-agnostic: any seat-map source (Pathé API, mock, other circuit)
 * is converted to this shape by an adapter (see ./adapters).
 *
 * Coordinate system (metres, Three.js convention, Y up):
 *  - origin = centre of the screen plane projected on the front-row floor
 *  - +x = audience's right when facing the screen
 *  - +z = toward the back of the auditorium (the screen is at z = 0, seats at z > 0)
 *  - +y = up
 */

export type SeatStatus = 'available' | 'selected' | 'occupied' | 'unavailable';

export interface Seat {
  /** Stable id, e.g. "F16". */
  id: string;
  /** 0 = front row (closest to the screen). */
  row: number;
  /** 0 = leftmost seat as seen by the audience facing the screen. */
  column: number;
  rowLabel: string;
  seatLabel: string;
  /** Seat centre, metres. */
  positionX: number;
  /** Floor level of the row, metres. */
  positionY: number;
  positionZ: number;
  /** Seat type code from the source system (STD, DUO, DIS, ...). */
  category?: string;
  categoryLabel?: string;
  status: SeatStatus;
  /** DUO seats share one armrest with their neighbour. */
  sharedArmrest?: 'left' | 'right';
  /** Wheelchair space: no chair is rendered and the eye height is adjusted. */
  wheelchair?: boolean;
}

export interface AuditoriumRow {
  index: number;
  label: string;
  /** Distance from the screen plane to the seat centres of this row. */
  z: number;
  floorY: number;
  seatCount: number;
}

export interface Auditorium {
  id: string;
  name: string;
  screenWidth: number;
  screenHeight: number;
  /** Centre of the screen. */
  screenPosition: { x: number; y: number; z: number };
  room: {
    width: number;
    /** From the screen wall to the back wall. */
    depth: number;
    /** Ceiling height above the front-row floor. */
    height: number;
  };
  /** Distance between two seat centres in a row. */
  seatPitch: number;
  /** Distance between two consecutive rows. */
  rowPitch: number;
  /** Stadium rise between consecutive rows. */
  rowRise: number;
  rows: AuditoriumRow[];
  seats: Seat[];
}

/** Everything the UI needs to describe the view from a seat. */
export interface SeatViewpoint {
  seatId: string;
  /** Eye position, metres. */
  position: [number, number, number];
  /** Point the viewer naturally looks at (screen centre). */
  target: [number, number, number];
  /** Horizontal heading (radians, 0 = facing the screen straight on, + = turned to the viewer's left). */
  yaw: number;
  /** Elevation (radians, + = looking up). */
  pitch: number;
  /** Straight-line distance from the eyes to the screen centre. */
  distanceToScreen: number;
  /** Lateral offset angle vs. the screen's perpendicular axis, degrees (+ = seat is on the right). */
  horizontalAngleDeg: number;
  /** Elevation angle to the screen centre, degrees (+ = looking up). */
  verticalAngleDeg: number;
  /** Angle subtended by the screen width, degrees (how "big" the screen appears). */
  screenCoverageDeg: number;
  /** Qualitative rating derived from SMPTE / THX viewing-angle guidance. */
  rating: SeatViewRating;
}

export type SeatViewRating = 'very-close' | 'immersive' | 'optimal' | 'comfortable' | 'far';
