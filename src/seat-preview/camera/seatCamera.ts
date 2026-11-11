import { SEAT_DIMENSIONS } from '../geometry/auditorium';
import type { Auditorium, Seat, SeatViewRating, SeatViewpoint } from '../types';

const RAD = 180 / Math.PI;

/**
 * Computes where a person's eyes are when seated in `seat`, and how they naturally face the screen.
 *
 * - Eyes are at seated height above the row floor, a few centimetres in front of the backrest.
 * - The natural gaze targets the screen centre, so a seat on the left yields a heading turned to the
 *   right, a front-row seat yields an upward pitch, and a back-row seat sees a smaller screen.
 */
export function computeSeatViewpoint(seat: Seat, auditorium: Auditorium): SeatViewpoint {
  const eyeHeight = seat.wheelchair ? SEAT_DIMENSIONS.wheelchairEyeHeight : SEAT_DIMENSIONS.eyeHeight;
  const position: [number, number, number] = [
    seat.positionX,
    seat.positionY + eyeHeight,
    seat.positionZ - SEAT_DIMENSIONS.eyeForwardOffset,
  ];
  const { x: sx, y: sy, z: sz } = auditorium.screenPosition;
  const target: [number, number, number] = [sx, sy, sz];

  const dx = sx - position[0];
  const dy = sy - position[1];
  const dz = sz - position[2]; // negative: the screen is in front (-z)
  const horizontal = Math.hypot(dx, dz);
  const distanceToScreen = Math.hypot(dx, dy, dz);

  // A Three.js camera looks down -z at yaw 0; positive yaw turns the view to the viewer's left.
  const yaw = Math.atan2(-dx, -dz);
  const pitch = Math.atan2(dy, horizontal);

  // Angle between the seat and the screen's perpendicular axis, measured at the screen centre.
  const horizontalAngleDeg = Math.atan2(position[0] - sx, position[2] - sz) * RAD;
  const verticalAngleDeg = pitch * RAD;

  const screenCoverageDeg = 2 * Math.atan(auditorium.screenWidth / 2 / Math.max(horizontal, 0.01)) * RAD;

  return {
    seatId: seat.id,
    position,
    target,
    yaw,
    pitch,
    distanceToScreen,
    horizontalAngleDeg,
    verticalAngleDeg,
    screenCoverageDeg,
    rating: rateView(screenCoverageDeg, horizontalAngleDeg),
  };
}

/**
 * SMPTE recommends a screen covering at least 30 degrees of the horizontal field of view, THX at least
 * 36 degrees for the best seats; beyond roughly 55 degrees the eyes must scan the image, and lateral
 * seats past roughly 25 degrees off-axis see a distorted picture.
 */
export function rateView(screenCoverageDeg: number, horizontalAngleDeg: number): SeatViewRating {
  const offAxis = Math.abs(horizontalAngleDeg);
  if (screenCoverageDeg > 68) return 'very-close';
  if (screenCoverageDeg > 52) return offAxis > 24 ? 'very-close' : 'immersive';
  if (screenCoverageDeg >= 34) return offAxis > 26 ? 'comfortable' : 'optimal';
  if (screenCoverageDeg >= 24) return 'comfortable';
  return 'far';
}

/** Limits applied to the user's head movement so they never leave their seat. */
export const LOOK_LIMITS = {
  /** Max head turn from the natural gaze, radians (about 35 degrees). */
  yaw: 0.61,
  /** Max head tilt from the natural gaze, radians (about 22 degrees). */
  pitch: 0.38,
  /** Vertical field of view range, degrees (zoom). */
  fovMin: 34,
  fovMax: 78,
  fovDefault: 60,
} as const;

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
