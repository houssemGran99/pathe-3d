# SeatView 3D — first-person cinema seat preview

Two things live in this repository:

1. **The 3D seat-preview engine** (`src/seat-preview`): a reusable React Three Fiber module that renders a
   cinema auditorium from the exact position of a selected seat, with constrained look-around, zoom and
   per-seat viewing metrics.
2. **Two front ends that use it**:
   - `/` — the **SeatView 3D** B2B marketing site (hero with the live engine, before/after comparison, live
     demo, features, integration, benefits, segments, demo-request form).
   - `/pathe-demo` — a replica of the Pathé booking page built on the real Salle 3 seat map captured from
     `s.pathe.tn`, used as the integration prototype.

3. **The `<seatview-preview>` web component** (`src/web-component`): the engine packaged as a custom element
   for any booking site, built to `dist/sdk/` and served at `/sdk/seatview.js`. See
   [docs/web-component.md](docs/web-component.md) and the live example at `/sdk/example.html`.
4. **The room configurator** (`src/admin`, at `/admin`): build each auditorium's configuration without
   writing JSON. Generate a room from a grid or import a seat map, paint seats, premium rows, Duo pairs,
   wheelchair spaces and aisles, number rows and seats, enter measurements, check the first-person view
   live, then download the `seatview/auditorium@1` file for `config-url`. Rooms are drafts in the browser's
   local storage (no server yet), so the exported file is the deliverable. Undo/redo with Ctrl+Z / Ctrl+Y,
   tool keys V S P D W A.

```bash
npm install
npm run dev        # http://localhost:5173  (landing)  ·  /pathe-demo (booking prototype)
npm run build      # type check + site build into dist/ + web component into dist/sdk/
```

Stack: Vite 6, React 19, TypeScript, Three.js 0.176, @react-three/fiber 9, @react-three/drei 10, plain CSS with
design tokens. No UI framework, no animation library: scroll reveals use IntersectionObserver + CSS.

## Configuration

| Variable | Purpose |
|---|---|
| `VITE_DEMO_ENDPOINT` | HTTPS URL that receives the demo-request form as a JSON `POST`. Unset: the form validates but tells the visitor nothing was sent. |
| `VITE_LINKEDIN_URL` | Company LinkedIn page. Unset: the footer shows the label without a link. |

Query switches (development only unless noted):

- `?no3d` — force the non-WebGL fallback (works in production too, for QA).
- `?capture=E8` — opens the preview on that seat with the UI hidden, for screenshots. Used to produce
  `public/seatview-preview.jpg` and `public/og-seatview.jpg` with headless Chrome:

```bash
chrome --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1200,750 --virtual-time-budget=20000 --screenshot=capture.png "http://localhost:5173/?capture=E8"
```

Set the `og:image` URL in `index.html` to an absolute URL once the site has a domain. The SPA needs a
history fallback on the host (serve `index.html` for `/pathe-demo`).

## Architecture

```
src/
  landing/                   SeatView 3D marketing site
    LandingPage.tsx          Composition, shared demo booking state, full-screen preview, capture mode
    landing.css              Design tokens (#080808 / #111 / #171717 / #E50914) and all section styles
    data/demoAuditorium.ts   Neutral 9-row demo room (no operator branding) + hero quick-pick seats
    components/              Nav, Hero + HeroScene (inline engine), Problem (before/after), Experience
                             (live demo), Features, Integration (+ SVG diagram), Benefits, Segments,
                             FinalCta, DemoForm, Footer, Logo, Reveal
    hooks/useReveal.ts       IntersectionObserver reveal + in-view flag
  booking/                   Booking-page replica (host application for the prototype)
    types.ts                 Types of the Pathé seat-map API (also the shape the demo room uses)
    data/salle3.json         Real seat map captured from s.pathe.tn (Salle 3, 126 seats)
    SeatMap.tsx + seatmap.css Seat grid, light/dark variants, compact and read-only modes
    useBookingState.ts       Selection state: selected seats, active seat, preview open/closed
    BookingPage.tsx          Pathé-styled page at /pathe-demo
  seat-preview/              Reusable 3D module (public API in index.ts)
    types.ts                 Seat / Auditorium / SeatViewpoint (metres, Y up)
    geometry/auditorium.ts   Grid -> metric auditorium (row pitch, stadium rise, screen, room)
    adapters/pathe.ts        Seat-map grid -> Auditorium
    camera/seatCamera.ts     Eye position + natural gaze per seat, viewing metrics and rating
    scene/CinemaScene.tsx    Canvas: tone mapping, adaptive DPR, fog, lights, `active` and `wheelZoom`
    scene/Screen.tsx         Emissive screen with a procedural film shader + RectAreaLight
    scene/Seats.tsx          Instanced red seats (cushion, back, armrests, base); Duo and wheelchair spaces
    scene/Room.tsx           Stepped floor, ribbed walls, ceiling, aisle lights, sconces
    scene/FirstPersonRig.tsx Camera controller: wall-clock seat glide, damped look, zoom, input
    ui/SeatPreviewOverlay.tsx Modal UI: viewport, panel, controls, drawer, loading/error/fallback, `brand`
```

### Using the engine in a host page

```tsx
import { SeatPreviewOverlay, patheSeatMapToAuditorium } from './seat-preview';

const auditorium = useMemo(() => patheSeatMapToAuditorium(map, { selectedSeatIds, locale }), [map, selectedSeatIds]);

<SeatPreviewOverlay
  open={previewOpen}
  auditorium={auditorium}
  seatId={activeSeatId}                  // changing it glides the camera to the new seat
  selectedSeatIds={selectedIds}
  onClose={closePreview}                 // booking state is untouched
  onSeatChange={setActiveSeatId}
  renderSeatMap={() => <SeatMap ... />}  // the host's own seat map, reused in the drawer
  brand="Your cinema"
  locale="en"
/>
```

For an inline embed (as in the landing hero) render `CinemaScene` directly with a `viewpoint` from
`computeSeatViewpoint`, a `createRigController()` instance, `active` tied to visibility and `wheelZoom={false}`.
The module never writes to seat availability; closing the overlay unmounts the canvas and frees GPU resources.

### First-person camera

`computeSeatViewpoint(seat, auditorium)`: eyes at seat position + 1.16 m (1.25 m for a wheelchair space),
14 cm in front of the backrest; natural gaze at the screen centre (`yaw = atan2(-dx, -dz)`,
`pitch = atan2(dy, horizontal)`), plus distance, lateral and vertical angles, apparent screen width and an
SMPTE/THX-based rating. The rig glides between seats over 1.4 s on wall-clock time and clamps head movement to
±35° yaw, ±22° pitch and a 34° to 78° field of view.

## Validation

Camera poses measured live for the Pathé Salle 3 map (eye position in metres; heading relative to the screen axis):

| Seat | Eye (x, y, z) | Heading | Elevation | Distance | Apparent width | Rating |
|------|---------------|---------|-----------|----------|----------------|--------|
| C9  (front, far left)  | -4.35, 1.16, 6.06  | 36° right | 14° up  | 7.7 m  | 67° | very close |
| C16 (front, centre)    | -0.29, 1.16, 6.06  | 3° right  | 17° up  | 6.3 m  | 78° | very close |
| F16 (middle, centre)   | -0.29, 2.12, 9.36  | 2° right  | 5° up   | 9.4 m  | 55° | immersive |
| J9  (back, left)       | -4.35, 3.40, 13.76 | 18° right | 2° down | 14.4 m | 38° | optimal |
| J24 (back, right)      |  4.35, 3.40, 13.76 | 18° left  | 2° down | 14.4 m | 38° | optimal |

Landing-page checks (browser automation): mobile menu open/close, form validation (6 required fields,
business-email rule, unconfigured-endpoint notice), anchor targets, live demo opens the overlay with the
SeatView brand and keeps the selection after closing, no horizontal overflow at 375 px.

## Performance

- Three.js, React Three Fiber and Drei live in a lazy chunk; the landing's first bundle is about 57 kB
  (18 kB gzip) and the booking page about 25 kB on top. The 3D chunk loads when the hero is idle-mounted
  (desktop) or when a preview opens (mobile), never during the normal booking flow.
- Inline scene pauses its render loop when scrolled out of view or when the full-screen preview is open.
- Seats are four `InstancedMesh`es; the screen is one shader; the room is procedural. No external assets.
- `PerformanceMonitor` lowers the pixel ratio (capped at 1.75) when the frame rate drops.
- Touch devices get a poster in the hero and open the full-screen experience on tap, keeping the hero light.

## Positioning notes

The site makes no claims of customers, partners, statistics or specific ticketing integrations. The Pathé
page under `/pathe-demo` is an integration prototype built on public seat-map data and is excluded from
indexing via `robots.txt`; it is not presented on the site as a customer.
