// Exports the site's neutral demo auditorium as a SeatView configuration file
// (public/sdk/demo-auditorium.json), used by the web-component example page.
// Run with: npm run export:demo-config   (Node 22.18+ strips TypeScript types natively)
import { mkdirSync, writeFileSync } from 'node:fs';
import { demoSeatMap } from '../src/landing/data/demoAuditorium.ts';

// The demo grid lists rows back to front; the SeatView schema lists them front to back.
const rows = demoSeatMap.seats
  .filter((row) => row.length > 0)
  .reverse()
  .map((row) => ({
    label: row[0].rowName,
    seats: row.map((s) => ({
      column: s.seatIndex,
      label: s.seatName,
      category: s.seatType,
      ...(s.seatType === 'DIS' ? { wheelchair: true } : {}),
      ...(s.seatType === 'DUO' && s.seatSide ? { pair: s.seatSide === 'L' ? 'left' : 'right' } : {}),
    })),
  }));

const config = {
  schema: 'seatview/auditorium@1',
  id: 'demo-auditorium-3',
  name: demoSeatMap.roomName,
  columns: demoSeatMap.colCount,
  rows,
  dimensions: {
    seatPitch: 0.58,
    rowPitch: 1.1,
    rowRise: 0.32,
    frontRowDistance: 6.2,
    screenWidth: 9.8,
    screenHeight: 4.1,
    screenBottomHeight: 0.95,
  },
};

mkdirSync('public/sdk', { recursive: true });
writeFileSync('public/sdk/demo-auditorium.json', JSON.stringify(config, null, 2) + '\n');
console.log(`Wrote public/sdk/demo-auditorium.json: ${rows.length} rows, ${rows.reduce((n, r) => n + r.seats.length, 0)} seats`);
