/**
 * SeatView 3D web component entry point.
 *
 *   <script type="module" src="https://seatview-3d.vercel.app/sdk/seatview.js"></script>
 *   <seatview-preview config-url="/auditoriums/room-3.json" seat="E8"></seatview-preview>
 *
 * Importing this module registers the <seatview-preview> custom element.
 */
import { SeatViewPreviewElement } from './element';

export const TAG_NAME = 'seatview-preview';
export const VERSION = '0.1.0';

if (!customElements.get(TAG_NAME)) customElements.define(TAG_NAME, SeatViewPreviewElement);

export { SeatViewPreviewElement };
export type { SeatViewEventMap } from './element';
export { CONFIG_SCHEMA, validateConfig, type SeatViewConfig, type SeatViewRowConfig, type SeatViewSeatConfig } from './config';

declare global {
  interface HTMLElementTagNameMap {
    'seatview-preview': SeatViewPreviewElement;
  }
}
