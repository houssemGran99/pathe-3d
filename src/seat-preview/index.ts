/**
 * Public API of the 3D seat preview module.
 *
 * Usage:
 *   const auditorium = patheSeatMapToAuditorium(map, { selectedSeatIds });
 *   <SeatPreviewOverlay open auditorium={auditorium} seatId="F16" onClose={...} />
 *
 * The overlay itself is light; the Three.js scene is code-split and only downloaded when it opens.
 */
export { SeatPreviewOverlay, type SeatPreviewOverlayProps } from './ui/SeatPreviewOverlay';
export { patheSeatMapToAuditorium, type PatheAdapterOptions } from './adapters/pathe';
export { buildAuditorium, findSeat, DEFAULT_DIMENSIONS, SEAT_DIMENSIONS } from './geometry/auditorium';
export { computeSeatViewpoint, rateView, LOOK_LIMITS } from './camera/seatCamera';
export { isWebGLAvailable } from './ui/webgl';
export type { Auditorium, AuditoriumRow, Seat, SeatStatus, SeatViewpoint, SeatViewRating } from './types';
export type { Locale } from './ui/i18n';
