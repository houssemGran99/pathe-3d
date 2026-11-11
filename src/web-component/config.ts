import type { PatheSeatMap } from '../booking/types';
import { SEAT_TYPE_LABELS } from '../booking/types';
import { patheSeatMapToAuditorium } from '../seat-preview/adapters/pathe';
import { buildAuditorium, type AuditoriumDimensions, type RowSpec } from '../seat-preview/geometry/auditorium';
import type { Auditorium } from '../seat-preview/types';
import type { Locale } from '../seat-preview/ui/i18n';

/**
 * Public auditorium configuration accepted by <seatview-preview>.
 *
 * Conventions:
 *  - `rows` are listed from the FRONT row (closest to the screen) to the back row.
 *  - `column` is the seat's position in a fixed grid of `columns` cells, 0 = leftmost seat as seen by
 *    an audience member facing the screen. Gaps in the grid (aisles) are simply columns with no seat.
 *  - All lengths in `dimensions` are metres; any omitted value uses a typical multiplex default.
 */
export const CONFIG_SCHEMA = 'seatview/auditorium@1' as const;

export interface SeatViewSeatConfig {
  /** Seat id used by the booking system. Defaults to row label + seat label, e.g. "E8". */
  id?: string;
  column: number;
  label: string;
  /** Category code, e.g. STD, PRM, DUO, DIS, or any operator-specific code. */
  category?: string;
  /** Display name of the category; known codes get a default label. */
  categoryLabel?: string;
  /** Wheelchair space: no chair is drawn and eye height is adjusted. */
  wheelchair?: boolean;
  /** Half of a double seat; the armrest between the two halves is removed. */
  pair?: 'left' | 'right';
}

export interface SeatViewRowConfig {
  label: string;
  seats: SeatViewSeatConfig[];
}

export interface SeatViewConfig {
  schema: typeof CONFIG_SCHEMA;
  id: string;
  name: string;
  columns: number;
  rows: SeatViewRowConfig[];
  dimensions?: Partial<AuditoriumDimensions>;
}

export type ConfigErrorCode = 'invalid-config' | 'invalid-json' | 'fetch-failed' | 'unknown-seat';

export class ConfigError extends Error {
  constructor(
    public readonly code: ConfigErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

const DIMENSION_KEYS: (keyof AuditoriumDimensions)[] = [
  'seatPitch',
  'rowPitch',
  'rowRise',
  'frontRowDistance',
  'screenWidth',
  'screenHeight',
  'screenBottomHeight',
  'sideAisleWidth',
  'backAisleDepth',
  'ceilingHeight',
];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fail = (message: string): never => {
  throw new ConfigError('invalid-config', message);
};

/** Validates a SeatView configuration and returns it typed. Throws ConfigError with a precise path. */
export function validateConfig(raw: unknown): SeatViewConfig {
  if (!isObject(raw)) fail('Configuration must be a JSON object.');
  const c = raw as Record<string, unknown>;
  if (c.schema !== CONFIG_SCHEMA) fail(`"schema" must be "${CONFIG_SCHEMA}".`);
  if (typeof c.id !== 'string' || !c.id) fail('"id" must be a non-empty string.');
  if (typeof c.name !== 'string') fail('"name" must be a string.');
  const columns = c.columns;
  if (typeof columns !== 'number' || !Number.isInteger(columns) || columns < 1 || columns > 200)
    fail('"columns" must be an integer between 1 and 200.');
  if (!Array.isArray(c.rows) || c.rows.length === 0) fail('"rows" must be a non-empty array (front row first).');

  const ids = new Set<string>();
  (c.rows as unknown[]).forEach((row, ri) => {
    const at = `rows[${ri}]`;
    if (!isObject(row)) fail(`${at} must be an object.`);
    const r = row as Record<string, unknown>;
    if (typeof r.label !== 'string' || !r.label) fail(`${at}.label must be a non-empty string.`);
    if (!Array.isArray(r.seats)) fail(`${at}.seats must be an array.`);
    const usedColumns = new Set<number>();
    (r.seats as unknown[]).forEach((seat, si) => {
      const sat = `${at}.seats[${si}]`;
      if (!isObject(seat)) fail(`${sat} must be an object.`);
      const s = seat as Record<string, unknown>;
      if (typeof s.column !== 'number' || !Number.isInteger(s.column) || s.column < 0 || s.column >= (columns as number))
        fail(`${sat}.column must be an integer from 0 to ${(columns as number) - 1}.`);
      if (usedColumns.has(s.column as number)) fail(`${sat}.column ${s.column} is used twice in row "${r.label}".`);
      usedColumns.add(s.column as number);
      if (typeof s.label !== 'string' || !s.label) fail(`${sat}.label must be a non-empty string.`);
      if (s.id !== undefined && (typeof s.id !== 'string' || !s.id)) fail(`${sat}.id must be a non-empty string.`);
      if (s.pair !== undefined && s.pair !== 'left' && s.pair !== 'right') fail(`${sat}.pair must be "left" or "right".`);
      const id = (s.id as string | undefined) ?? `${r.label}${s.label}`;
      if (ids.has(id)) fail(`Seat id "${id}" appears more than once.`);
      ids.add(id);
    });
  });

  if (c.dimensions !== undefined) {
    if (!isObject(c.dimensions)) fail('"dimensions" must be an object.');
    for (const [k, v] of Object.entries(c.dimensions as Record<string, unknown>)) {
      if (!DIMENSION_KEYS.includes(k as keyof AuditoriumDimensions)) fail(`Unknown dimension "${k}".`);
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 200) fail(`dimensions.${k} must be a number of metres.`);
    }
  }
  return raw as unknown as SeatViewConfig;
}

export interface NormaliseOptions {
  selectedSeatIds?: readonly string[];
  locale?: Locale;
}

const isGridSeatMap = (v: unknown): v is PatheSeatMap =>
  isObject(v) && Array.isArray((v as Record<string, unknown>).seats) && typeof (v as Record<string, unknown>).colCount === 'number';

/**
 * Turns any accepted input into the metric auditorium model used by the renderer.
 * Accepts a SeatView configuration, or the row-grid seat-map shape the prototype was built on
 * (`{ colCount, seats: [[...back row], ..., [...front row]] }`, optionally wrapped in `{ maps: [...] }`).
 */
export function normaliseConfig(raw: unknown, options: NormaliseOptions = {}): Auditorium {
  const locale = options.locale ?? 'en';
  const selected = new Set(options.selectedSeatIds ?? []);

  if (isObject(raw) && raw.schema === CONFIG_SCHEMA) {
    const cfg = validateConfig(raw);
    const rows: RowSpec[] = cfg.rows.map((row) => ({
      label: row.label,
      seats: row.seats.map((s) => {
        const id = s.id ?? `${row.label}${s.label}`;
        return {
          id,
          column: s.column,
          label: s.label,
          category: s.category,
          categoryLabel: s.categoryLabel ?? (s.category ? (SEAT_TYPE_LABELS[s.category]?.[locale] ?? s.category) : undefined),
          status: selected.has(id) ? ('selected' as const) : ('available' as const),
          wheelchair: s.wheelchair,
          // The left half of a pair shares its right-hand armrest, and vice versa.
          sharedArmrest: s.pair === 'left' ? ('right' as const) : s.pair === 'right' ? ('left' as const) : undefined,
        };
      }),
    }));
    return buildAuditorium({ id: cfg.id, name: cfg.name, columnCount: cfg.columns, rows, dimensions: cfg.dimensions });
  }

  const grid = isObject(raw) && Array.isArray(raw.maps) ? raw.maps[0] : raw;
  if (isGridSeatMap(grid)) {
    return patheSeatMapToAuditorium(grid, { selectedSeatIds: [...selected], locale });
  }

  throw new ConfigError('invalid-config', `Unrecognised configuration. Expected "schema": "${CONFIG_SCHEMA}".`);
}
