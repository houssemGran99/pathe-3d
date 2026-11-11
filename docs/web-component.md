# `<seatview-preview>` web component

A framework-agnostic custom element that shows the first-person view from a cinema seat. It works in any
booking front end (Angular, React, Vue, server-rendered pages) with one script tag. It is display-only: it never
reads or changes seat availability, so the operator's ticketing system stays the source of truth.

Live example: https://seatview-3d.vercel.app/sdk/example.html

## Install

```html
<script type="module" src="https://seatview-3d.vercel.app/sdk/seatview.js"></script>
```

| File | Size (gzip) | Loaded |
|---|---|---|
| `seatview.js` + `chunks/index-*.js` | 82 kB | when the script tag runs (element, React, overlay UI) |
| `chunks/CinemaScene-*.js` | 344 kB | only when a preview is shown (Three.js scene) |

`seatview.js` is cached for 5 minutes; hashed chunks are cached for a year. CORS is open on `/sdk/*`.
For production, pin a version by self-hosting the `dist/sdk/` folder on your own CDN.

## Use

**Modal** (default): opened from the host's own "View from this seat" button.

```html
<seatview-preview id="preview" config-url="/auditoriums/room-3.json" brand="Your Cinema" locale="en"></seatview-preview>
<script>
  const preview = document.getElementById('preview');
  viewButton.addEventListener('click', () => preview.open(selectedSeatId));
</script>
```

**Inline**: an embedded viewer that fills its box (16:9 by default) and offers a full-screen button.

```html
<seatview-preview mode="inline" config-url="/auditoriums/room-3.json" seat="E8"></seatview-preview>
```

In Angular, add `CUSTOM_ELEMENTS_SCHEMA` to the component or module and bind `[attr.seat]="seatId"` or set
the `seat` property directly.

## API

| Attribute / property | Description |
|---|---|
| `config-url` | URL of the auditorium configuration (JSON). |
| `config` (property) | Configuration object; takes precedence over `config-url`. An inline `<script type="application/json">` child also works. |
| `seat` | Seat id to sit in, e.g. `E8`. Changing it glides the camera to the new seat. |
| `selected-seats` / `selectedSeats` | Comma-separated ids (or an array) of all seats in the basket; shown as quick-switch chips. |
| `mode` | `modal` (default) or `inline`. |
| `open` | Present while the full-screen preview is open. Also `open(seatId?)` and `close()` methods. |
| `locale` | `en` (default) or `fr`. |
| `brand` | Text shown in the preview's top bar. |
| `auditorium` (read-only) | The computed metric model, once loaded. |

Events bubble and cross shadow boundaries (`composed`):

| Event | `detail` |
|---|---|
| `seatview-load` | `{ auditoriumId, name, seatCount }` |
| `seatview-viewpoint` | `{ seatId, row, seat, category, distanceToScreen, horizontalAngle, verticalAngle, screenCoverage, rating }`, once per seat, ideal for analytics |
| `seatview-open` / `seatview-close` | `{ seatId }` |
| `seatview-seat-change` | `{ seatId }` when the user switches seat inside the preview |
| `seatview-error` | `{ code, message }`; `code` is `invalid-config`, `invalid-json`, `fetch-failed` or `unknown-seat` |

## Theming

The element renders in Shadow DOM, so host styles cannot break it and its styles cannot leak. Theme it with
CSS custom properties on the element or any ancestor:

```css
seatview-preview {
  --seatview-accent: #e50914;      /* buttons, seat badge, highlights */
  --seatview-brand-color: #ffffff; /* brand text in the top bar */
  --seatview-font: 'Your Font', system-ui, sans-serif;
  --seatview-radius: 12px;         /* inline viewer corners */
}
```

The modal uses `position: fixed`. Do not place the element inside an ancestor with a CSS `transform`,
`filter` or `perspective`, which would confine the modal to that ancestor.

## Auditorium configuration

```json
{
  "schema": "seatview/auditorium@1",
  "id": "cinema-12-room-3",
  "name": "Auditorium 3",
  "columns": 18,
  "rows": [
    { "label": "A", "seats": [{ "column": 2, "label": "1" }, { "column": 3, "label": "2", "category": "PRM" }] },
    { "label": "B", "seats": [{ "column": 0, "label": "1", "pair": "left" }, { "column": 1, "label": "2", "pair": "right" }] }
  ],
  "dimensions": { "screenWidth": 9.8, "screenHeight": 4.1, "frontRowDistance": 6.2, "rowPitch": 1.1, "rowRise": 0.32 }
}
```

- `rows` go from the **front** row (nearest the screen) to the back.
- `column` is a cell in a fixed grid of `columns` cells. **0 is the leftmost seat for someone facing the screen.**
  Aisles are columns with no seat.
- Seat `id` defaults to row label + seat label (`"A1"`); set it explicitly if the booking system uses other ids.
- `category` is free text; `STD`, `PRM`, `DUO`, `DIS`, `LOG`, `SOF`, `TRI` and `DBX` get default labels.
  `wheelchair: true` draws a wheelchair space; `pair: "left" | "right"` joins a double seat.
- `dimensions` are metres: `seatPitch`, `rowPitch`, `rowRise`, `frontRowDistance`, `screenWidth`,
  `screenHeight`, `screenBottomHeight`, `sideAisleWidth`, `backAisleDepth`, `ceilingHeight`. Measured values
  make the view accurate; omitted values use multiplex defaults.

Validation errors name the exact field, e.g. `rows[0].seats[3].column must be an integer from 0 to 17.`

## Build

```bash
npm run build      # site into dist/, then the component into dist/sdk/
npm run build:wc   # component only
npm run export:demo-config   # regenerate public/sdk/demo-auditorium.json from the site's demo room
```

Source: `src/web-component/` (element, config schema and validator, inline viewer) built by `vite.wc.config.ts`.
