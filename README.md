# Pathé — Interactive 3D first-person seat view

Prototype of the "View from this seat" feature for the Pathé booking flow (`s.pathe.tn`).
When a customer selects a seat, a new action opens a first-person 3D preview of the auditorium rendered
from that exact chair, with constrained look-around, zoom, a viewing-quality panel, and an in-preview seat
map to compare seats without losing the booking selection.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type check + production build
```

QA switch: open `http://localhost:5173/?no3d` to force the non-WebGL fallback.

## What was analysed on the live site

The production booking page (`/fr/V5202S46700/booking`) is an Angular app. Its seat map comes from
`GET /api/seatmap/{locale}/{cinemaId}/{sessionId}/map`, which returns a grid, not metres:

- `maps[0].seats` is an array of rows ordered **from the back of the room (rowIndex 0) to the front**, the
  screen being drawn under the last row;
- each seat carries `rowName`, `seatName`, `seatIndex` (column), `seatType` (`STD`, `DUO`, `DIS`, ...),
  `status` (`0` available, `5` taken) and `seatSide` (`L`/`R`) for the two halves of a Duo seat;
- the rendered table uses `data-number`, `data-type`, `data-seattypecode` and `data-status` on each seat.

The Salle 3 map captured on 11 Nov 2026 (126 seats, 8 rows C to J, 16 columns, a wheelchair space and
Duo pairs) is checked in as `src/booking/data/salle3.json` in the API's exact shape, so the fixture can be
swapped for the real fetch without touching the 3D module.

## Architecture

```
src/
  booking/                  Minimal replica of the Pathé seat-selection page (host application)
    types.ts                Types of the Pathé seat-map API
    data/salle3.json        Real seat map captured from s.pathe.tn
    SeatMap.tsx             Seat grid (same data attributes as production), screen drawn underneath
    useBookingState.ts      Selection state: selected seats, active seat, preview open/closed
    BookingPage.tsx         Sidebar + seat map + bottom bar with the "Voir depuis ce siège" action
  seat-preview/             Independent, reusable 3D module (public API in index.ts)
    types.ts                Seat / Auditorium / SeatViewpoint data model (metres, Y up)
    geometry/auditorium.ts  Grid -> metric auditorium (row pitch, stadium rise, screen size, room)
    adapters/pathe.ts       Pathé seat map -> Auditorium
    camera/seatCamera.ts    Eye position + natural gaze per seat, viewing-angle metrics and rating
    scene/CinemaScene.tsx   React Three Fiber canvas (tone mapping, adaptive DPR, fog, lights)
    scene/Screen.tsx        Emissive screen running a procedural "film" shader + RectAreaLight
    scene/Seats.tsx         Instanced red seats (cushion, backrest, armrests, base), Duo and PMR handling
    scene/Room.tsx          Stepped floor, ribbed walls, ceiling, aisle step lights, sconces
    scene/FirstPersonRig.tsx Camera controller: seat glide, damped look-around, zoom, input
    scene/rigController.ts  Tiny store shared by the UI buttons and the rig
    ui/SeatPreviewOverlay.tsx Modal UI: viewport, info panel, controls, drawer, loading/error/fallback
    ui/seat-preview.css, ui/i18n.ts (fr/en), ui/webgl.ts (capability check)
```

### Integration contract

```tsx
import { SeatPreviewOverlay, patheSeatMapToAuditorium } from './seat-preview';

const auditorium = useMemo(() => patheSeatMapToAuditorium(map, { selectedSeatIds, locale }), [map, selectedSeatIds]);

<SeatPreviewOverlay
  open={previewOpen}
  auditorium={auditorium}
  seatId={activeSeatId}              // changing it glides the camera to the new seat
  selectedSeatIds={selectedIds}      // shown as "Mes places" chips
  onClose={closePreview}             // booking state is untouched
  onSeatChange={setActiveSeatId}
  renderSeatMap={() => <SeatMap ... />} // the host's own seat map, reused in the drawer
/>
```

The module never writes to seat availability. The only state it can change is which seat is being
previewed, through the callbacks the host provides. Closing the overlay unmounts the canvas and frees the
WebGL context, geometries and materials.

### First-person camera

`computeSeatViewpoint(seat, auditorium)`:

- eyes at `seat.position + (0, 1.16 m, -0.14 m)` (seated eye height; 1.25 m for a wheelchair space);
- natural gaze = screen centre, so `yaw = atan2(-dx, -dz)` and `pitch = atan2(dy, horizontalDistance)`;
  left seats look right, right seats look left, the front row looks up, the back row sees a smaller screen;
- metrics: distance to the screen centre, lateral angle off the screen axis, elevation, apparent screen
  width (angle subtended by the screen) and a rating based on SMPTE/THX guidance (30°/36° minimum,
  roughly 55° to 70° "immersive", more "very close").

The rig tweens between seats over 1.4 s on wall-clock time (so it finishes even on throttled tabs), damps
the user's head movement, and clamps it to ±35° yaw, ±22° pitch and a 34° to 78° field of view. The user
can drag, scroll or pinch, use the arrow keys, `+`/`-`, `R`/`0` to reset, and `Esc` to close.

### Default dimensions (used when the source has no metres)

Seat pitch 0.58 m, row pitch 1.10 m, stadium rise 0.32 m, front row 6.2 m from a 9.8 m x 4.1 m screen whose
bottom edge is 0.95 m above the front floor. All of it is overridable per auditorium through
`patheSeatMapToAuditorium(map, { dimensions })`.

## Validation (Salle 3, measured live from the camera)

| Seat | Position in room | Eye (x, y, z) m | Heading | Elevation | Distance | Apparent width | Rating |
|------|------------------|-----------------|---------|-----------|----------|----------------|--------|
| C9   | front row, far left  | -4.35, 1.16, 6.06  | 36° right | 14° up  | 7.7 m  | 67° | very close |
| C16  | front row, centre    | -0.29, 1.16, 6.06  | 3° right  | 17° up  | 6.3 m  | 78° | very close |
| C24  | front row, far right |  4.35, 1.16, 6.06  | 36° left  | 14° up  | 7.7 m  | 67° | very close |
| F9   | middle row, left     | -4.35, 2.12, 9.36  | 25° right | 5° up   | 10.4 m | 51° | optimal |
| F16  | middle row, centre   | -0.29, 2.12, 9.36  | 2° right  | 5° up   | 9.4 m  | 55° | immersive |
| J9   | back row, left       | -4.35, 3.40, 13.76 | 18° right | 2° down | 14.4 m | 38° | optimal |
| J15  | back row, centre     | -0.87, 3.40, 13.76 | 4° right  | 2° down | 13.8 m | 39° | optimal |
| J24  | back row, right      |  4.35, 3.40, 13.76 | 18° left  | 2° down | 14.4 m | 38° | optimal |

Also verified: closing the preview keeps the selection and active seat, the canvas is removed from the
DOM on close, the `?no3d` fallback shows the same metrics without WebGL, and the production build keeps
Three.js out of the booking bundle (`index` ≈ 44 kB, `three` chunk ≈ 1.1 MB loaded on demand).

## Performance notes

- Three.js, React Three Fiber and Drei are in a lazy chunk (`React.lazy` + `manualChunks`); the booking
  page never loads them until the preview opens.
- All seats are drawn with four `InstancedMesh`es; the whole room is a few dozen draw calls, no shadows.
- `PerformanceMonitor` lowers the device pixel ratio (capped at 1.75) when the frame rate drops.
- The screen is one procedural shader (no textures); the room is procedural geometry (no asset download).
- A WebGL capability check runs before the chunk loads; context loss shows an error state with retry.
