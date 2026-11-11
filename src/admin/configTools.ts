import type { PatheSeatMap } from '../booking/types';
import type { AuditoriumDimensions } from '../seat-preview/geometry/auditorium';
import {
  CONFIG_SCHEMA,
  ConfigError,
  validateConfig,
  type SeatViewConfig,
  type SeatViewRowConfig,
  type SeatViewSeatConfig,
} from '../web-component/config';

/**
 * Pure, immutable editing operations on a SeatView auditorium configuration.
 * Every function returns the SAME object when nothing changes, so the undo history only records real edits.
 */

export type Brush = 'select' | 'seat' | 'premium' | 'duo' | 'wheelchair' | 'aisle';
export type PaintMode = 'apply' | 'clear';
export type Numbering = 'ltr' | 'rtl';

export const MAX_COLUMNS = 80;
export const MAX_ROWS = 60;

const clone = (c: SeatViewConfig): SeatViewConfig => structuredClone(c);
const sortRow = (row: SeatViewRowConfig) => row.seats.sort((a, b) => a.column - b.column);
export const seatIdOf = (row: SeatViewRowConfig, seat: SeatViewSeatConfig) => seat.id ?? `${row.label}${seat.label}`;
export const seatAt = (cfg: SeatViewConfig, r: number, col: number) => cfg.rows[r]?.seats.find((s) => s.column === col);

export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'auditorium';

/** Row letters A, B, ... Z, AA, AB ... optionally skipping I and O (common in cinemas). */
export function rowLetters(count: number, first = 'A', skipIO = false): string[] {
  const out: string[] = [];
  const toLabel = (n: number) => {
    let s = '';
    n += 1;
    while (n > 0) {
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };
  const start = Math.max(0, (first.toUpperCase().charCodeAt(0) || 65) - 65);
  for (let n = start; out.length < count; n++) {
    const label = toLabel(n);
    if (skipIO && (label === 'I' || label === 'O')) continue;
    out.push(label);
  }
  return out;
}

export interface GenerateParams {
  name: string;
  id: string;
  rows: number;
  columns: number;
  /** Columns left empty in every row (aisles), 0-based. */
  aisles: number[];
  firstRow: string;
  skipIO: boolean;
  numbering: Numbering;
}

export function generateRoom(p: GenerateParams): SeatViewConfig {
  const columns = Math.min(MAX_COLUMNS, Math.max(1, Math.round(p.columns)));
  const rows = Math.min(MAX_ROWS, Math.max(1, Math.round(p.rows)));
  const aisles = new Set(p.aisles.filter((a) => a >= 0 && a < columns));
  const cfg: SeatViewConfig = {
    schema: CONFIG_SCHEMA,
    id: p.id || slugify(p.name),
    name: p.name || 'New auditorium',
    columns,
    rows: rowLetters(rows, p.firstRow || 'A', p.skipIO).map((label) => ({
      label,
      seats: Array.from({ length: columns }, (_, column) => column)
        .filter((c) => !aisles.has(c))
        .map((column) => ({ column, label: '', category: 'STD' })),
    })),
  };
  return renumberSeats(cfg, p.numbering, 1, true);
}

/** Next free numeric label in a row, used for seats painted by hand. */
function nextLabel(row: SeatViewRowConfig) {
  const max = row.seats.reduce((m, s) => Math.max(m, Number.parseInt(s.label, 10) || 0), 0);
  return String(max + 1);
}

function ensureSeat(row: SeatViewRowConfig, column: number): SeatViewSeatConfig {
  let seat = row.seats.find((s) => s.column === column);
  if (!seat) {
    seat = { column, label: nextLabel(row), category: 'STD' };
    row.seats.push(seat);
    sortRow(row);
  }
  return seat;
}

function unpair(row: SeatViewRowConfig, seat: SeatViewSeatConfig) {
  if (!seat.pair) return;
  const partnerColumn = seat.pair === 'left' ? seat.column + 1 : seat.column - 1;
  const partner = row.seats.find((s) => s.column === partnerColumn);
  if (partner?.pair) {
    delete partner.pair;
    if (partner.category === 'DUO') partner.category = 'STD';
  }
  delete seat.pair;
  if (seat.category === 'DUO') seat.category = 'STD';
}

/** Whether the brush's effect is already present on a cell (decides apply vs clear for a stroke). */
export function brushActiveAt(cfg: SeatViewConfig, r: number, col: number, brush: Brush): boolean {
  const s = seatAt(cfg, r, col);
  switch (brush) {
    case 'premium':
      return s?.category === 'PRM';
    case 'wheelchair':
      return !!s?.wheelchair;
    case 'duo':
      return !!s?.pair;
    case 'seat':
      return !!s && (s.category ?? 'STD') === 'STD' && !s.wheelchair && !s.pair;
    case 'aisle':
      return !s;
    default:
      return false;
  }
}

/** Applies a brush to one grid cell. `mode` matters for toggling brushes (premium, wheelchair, duo). */
export function paintCell(cfg: SeatViewConfig, r: number, col: number, brush: Brush, mode: PaintMode = 'apply'): SeatViewConfig {
  if (brush === 'select' || !cfg.rows[r] || col < 0 || col >= cfg.columns) return cfg;
  const existing = seatAt(cfg, r, col);

  if (brush === 'aisle' && !existing) return cfg;
  if (brush === 'seat' && brushActiveAt(cfg, r, col, 'seat')) return cfg;
  if (mode === 'clear' && (brush === 'premium' || brush === 'wheelchair' || brush === 'duo')) {
    if (!brushActiveAt(cfg, r, col, brush)) return cfg;
  } else if (brush !== 'seat' && brush !== 'aisle' && brushActiveAt(cfg, r, col, brush)) {
    return cfg;
  }
  if (brush === 'duo' && mode === 'apply' && col + 1 >= cfg.columns) return cfg;

  const next = clone(cfg);
  const row = next.rows[r];
  switch (brush) {
    case 'aisle': {
      const s = row.seats.find((x) => x.column === col)!;
      unpair(row, s);
      row.seats = row.seats.filter((x) => x.column !== col);
      break;
    }
    case 'seat': {
      const s = ensureSeat(row, col);
      unpair(row, s);
      s.category = 'STD';
      delete s.wheelchair;
      break;
    }
    case 'premium': {
      const s = ensureSeat(row, col);
      unpair(row, s);
      delete s.wheelchair;
      s.category = mode === 'apply' ? 'PRM' : 'STD';
      break;
    }
    case 'wheelchair': {
      const s = ensureSeat(row, col);
      unpair(row, s);
      if (mode === 'apply') {
        s.wheelchair = true;
        s.category = 'DIS';
      } else {
        delete s.wheelchair;
        s.category = 'STD';
      }
      break;
    }
    case 'duo': {
      const s = ensureSeat(row, col);
      unpair(row, s);
      if (mode === 'apply') {
        const t = ensureSeat(row, col + 1);
        unpair(row, t);
        for (const seat of [s, t]) {
          seat.category = 'DUO';
          delete seat.wheelchair;
        }
        s.pair = 'left';
        t.pair = 'right';
      }
      break;
    }
  }
  return next;
}

/** Renumbers every row's seats 1..n from the left or right (as seen facing the screen). */
export function renumberSeats(cfg: SeatViewConfig, dir: Numbering, start = 1, force = false): SeatViewConfig {
  let changed = force;
  const next = clone(cfg);
  for (const row of next.rows) {
    const ordered = [...row.seats].sort((a, b) => a.column - b.column);
    if (dir === 'rtl') ordered.reverse();
    ordered.forEach((s, i) => {
      const label = String(start + i);
      if (s.label !== label) {
        s.label = label;
        changed = true;
      }
    });
  }
  return changed ? next : cfg;
}

/** Re-letters rows from the front row backwards. */
export function reletterRows(cfg: SeatViewConfig, first = 'A', skipIO = false): SeatViewConfig {
  const labels = rowLetters(cfg.rows.length, first, skipIO);
  if (cfg.rows.every((r, i) => r.label === labels[i])) return cfg;
  const next = clone(cfg);
  next.rows.forEach((r, i) => (r.label = labels[i]));
  return next;
}

function uniqueRowLabel(cfg: SeatViewConfig) {
  const used = new Set(cfg.rows.map((r) => r.label));
  for (let n = cfg.rows.length + 1; ; n++) if (!used.has(`R${n}`)) return `R${n}`;
}

/** Adds a row at the front or back, copying the seat layout of the adjacent row. */
export function addRow(cfg: SeatViewConfig, where: 'front' | 'back'): SeatViewConfig {
  if (cfg.rows.length >= MAX_ROWS) return cfg;
  const next = clone(cfg);
  const template = where === 'front' ? next.rows[0] : next.rows[next.rows.length - 1];
  const columns = template ? template.seats.map((s) => s.column) : Array.from({ length: next.columns }, (_, i) => i);
  const row: SeatViewRowConfig = {
    label: uniqueRowLabel(next),
    seats: columns.map((column, i) => ({ column, label: String(i + 1), category: 'STD' })),
  };
  if (where === 'front') next.rows.unshift(row);
  else next.rows.push(row);
  return next;
}

export function removeRow(cfg: SeatViewConfig, r: number): SeatViewConfig {
  if (cfg.rows.length <= 1 || !cfg.rows[r]) return cfg;
  const next = clone(cfg);
  next.rows.splice(r, 1);
  return next;
}

export function moveRow(cfg: SeatViewConfig, r: number, delta: -1 | 1): SeatViewConfig {
  const to = r + delta;
  if (!cfg.rows[r] || !cfg.rows[to]) return cfg;
  const next = clone(cfg);
  [next.rows[r], next.rows[to]] = [next.rows[to], next.rows[r]];
  return next;
}

export function renameRow(cfg: SeatViewConfig, r: number, label: string): SeatViewConfig {
  if (!cfg.rows[r] || cfg.rows[r].label === label) return cfg;
  const next = clone(cfg);
  next.rows[r].label = label;
  return next;
}

/** Changes the grid width; seats beyond the new width are removed and broken pairs undone. */
export function setColumns(cfg: SeatViewConfig, columns: number): SeatViewConfig {
  const n = Math.min(MAX_COLUMNS, Math.max(1, Math.round(columns)));
  if (n === cfg.columns) return cfg;
  const next = clone(cfg);
  next.columns = n;
  for (const row of next.rows) {
    for (const s of row.seats.filter((x) => x.column >= n)) unpair(row, s);
    row.seats = row.seats.filter((x) => x.column < n);
  }
  return next;
}

/** Shifts every seat one column right (insert an empty column at the left) or left (delete column 0 if empty). */
export function shiftColumns(cfg: SeatViewConfig, delta: -1 | 1): SeatViewConfig {
  if (delta === -1 && cfg.rows.some((r) => r.seats.some((s) => s.column === 0))) return cfg;
  if (delta === 1 && cfg.columns >= MAX_COLUMNS) return cfg;
  const next = clone(cfg);
  next.columns += delta;
  for (const row of next.rows) for (const s of row.seats) s.column += delta;
  return next;
}

export function updateSeat(cfg: SeatViewConfig, r: number, col: number, patch: Partial<SeatViewSeatConfig>): SeatViewConfig {
  const current = seatAt(cfg, r, col);
  if (!current) return cfg;
  const next = clone(cfg);
  const seat = next.rows[r].seats.find((s) => s.column === col)!;
  for (const [k, v] of Object.entries(patch) as [keyof SeatViewSeatConfig, unknown][]) {
    if (v === undefined || v === '' || v === false) delete seat[k];
    else (seat as unknown as Record<string, unknown>)[k] = v;
  }
  if (!seat.label) seat.label = current.label;
  return JSON.stringify(seat) === JSON.stringify(current) ? cfg : next;
}

export function setMeta(cfg: SeatViewConfig, patch: { id?: string; name?: string }): SeatViewConfig {
  if ((patch.id === undefined || patch.id === cfg.id) && (patch.name === undefined || patch.name === cfg.name)) return cfg;
  return { ...cfg, ...patch };
}

export function setDimension(cfg: SeatViewConfig, key: keyof AuditoriumDimensions, value: number | undefined): SeatViewConfig {
  if (cfg.dimensions?.[key] === value) return cfg;
  const dimensions = { ...cfg.dimensions };
  if (value === undefined) delete dimensions[key];
  else dimensions[key] = value;
  const next: SeatViewConfig = { ...cfg, dimensions };
  if (Object.keys(dimensions).length === 0) delete next.dimensions;
  return next;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Converts the row-grid seat-map shape (rows listed back to front, { maps: [...] } optional) to a SeatView config. */
export function gridToConfig(raw: unknown): SeatViewConfig {
  const map = (isObject(raw) && Array.isArray(raw.maps) ? raw.maps[0] : raw) as PatheSeatMap;
  const rows = map.seats
    .filter((row) => row.length > 0)
    .reverse()
    .map((row) => ({
      label: row[0].rowName,
      seats: row
        .map((s): SeatViewSeatConfig => ({
          column: s.seatIndex,
          label: s.seatName,
          category: s.seatType,
          ...(s.seatType === 'DIS' ? { wheelchair: true } : {}),
          ...(s.seatType === 'DUO' && s.seatSide ? { pair: s.seatSide === 'L' ? ('left' as const) : ('right' as const) } : {}),
        }))
        .sort((a, b) => a.column - b.column),
    }));
  return {
    schema: CONFIG_SCHEMA,
    id: slugify(`${map.roomName ?? 'auditorium'}-${map.sessionId ?? ''}`),
    name: map.roomName ?? 'Imported auditorium',
    columns: map.colCount,
    rows,
  };
}

/** Accepts a SeatView config or a row-grid seat map, and returns a validated SeatView config. */
export function importConfig(raw: unknown): SeatViewConfig {
  if (isObject(raw) && raw.schema === CONFIG_SCHEMA) return structuredClone(validateConfig(raw));
  const grid = isObject(raw) && Array.isArray(raw.maps) ? raw.maps[0] : raw;
  if (isObject(grid) && Array.isArray(grid.seats) && typeof grid.colCount === 'number') {
    return validateConfig(gridToConfig(raw));
  }
  throw new ConfigError('invalid-config', `Not a SeatView configuration ("schema": "${CONFIG_SCHEMA}") or a row-grid seat map.`);
}

/** Validation result in a UI-friendly shape: the first error and the row it points at, if any. */
export function checkConfig(cfg: SeatViewConfig): { ok: true } | { ok: false; message: string; row?: number } {
  try {
    validateConfig(cfg);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid configuration.';
    const m = /rows\[(\d+)\]/.exec(message);
    const dup = /Seat id "([^"]+)"/.exec(message);
    let row = m ? Number(m[1]) : undefined;
    if (row === undefined && dup) row = cfg.rows.findIndex((r) => r.seats.some((s) => seatIdOf(r, s) === dup[1]));
    return { ok: false, message, row: row !== undefined && row >= 0 ? row : undefined };
  }
}

export interface RoomStats {
  rows: number;
  seats: number;
  premium: number;
  duo: number;
  wheelchair: number;
  other: number;
}

export function roomStats(cfg: SeatViewConfig): RoomStats {
  const seats = cfg.rows.flatMap((r) => r.seats);
  const by = (c: string) => seats.filter((s) => s.category === c).length;
  const wheelchair = seats.filter((s) => s.wheelchair).length;
  const premium = by('PRM');
  const duo = seats.filter((s) => s.pair).length;
  return {
    rows: cfg.rows.length,
    seats: seats.length,
    premium,
    duo,
    wheelchair,
    other: seats.length - premium - duo - wheelchair - seats.filter((s) => (s.category ?? 'STD') === 'STD' && !s.wheelchair && !s.pair).length,
  };
}
