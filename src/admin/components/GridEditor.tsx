import { useEffect, useRef } from 'react';
import type { SeatViewConfig } from '../../web-component/config';
import { brushActiveAt, paintCell, seatIdOf, type Brush, type PaintMode } from '../configTools';

interface Props {
  config: SeatViewConfig;
  brush: Brush;
  selected: { row: number; column: number } | null;
  previewSeatId: string | null;
  errorRow?: number;
  /** First edit of a stroke (new undo step). */
  onStrokeStart: (fn: (c: SeatViewConfig) => SeatViewConfig) => void;
  /** Further edits within the same stroke. */
  onStrokeContinue: (fn: (c: SeatViewConfig) => SeatViewConfig) => void;
  onSelect: (cell: { row: number; column: number } | null) => void;
  onRenameRow: (row: number, label: string) => void;
  onRemoveRow: (row: number) => void;
  onMoveRow: (row: number, delta: -1 | 1) => void;
}

const BRUSH_LABEL: Record<Brush, string> = {
  select: 'Select',
  seat: 'Seat',
  premium: 'Premium',
  duo: 'Duo pair',
  wheelchair: 'Wheelchair',
  aisle: 'Aisle / remove',
};

/**
 * Seat grid painter. Rows run from the front (top, under the screen) to the back; column 0 is on the left as
 * seen by an audience member facing the screen. Click or drag to paint with the active brush.
 */
export function GridEditor(p: Props) {
  const { config } = p;
  const stroke = useRef<{ mode: PaintMode; visited: Set<string> } | null>(null);

  useEffect(() => {
    const end = () => (stroke.current = null);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);

  const paintAt = (row: number, column: number, first: boolean) => {
    const s = stroke.current;
    if (!s) return;
    const key = `${row}:${column}`;
    if (s.visited.has(key)) return;
    s.visited.add(key);
    // A duo pair occupies two cells: never start a new pair on the right half of the last one.
    if (p.brush === 'duo' && s.mode === 'apply') s.visited.add(`${row}:${column + 1}`);
    const fn = (c: SeatViewConfig) => paintCell(c, row, column, p.brush, s.mode);
    if (first) p.onStrokeStart(fn);
    else p.onStrokeContinue(fn);
  };

  const onDown = (e: React.PointerEvent, row: number, column: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    if (p.brush === 'select') {
      const seat = config.rows[row]?.seats.find((s) => s.column === column);
      p.onSelect(seat ? { row, column } : null);
      return;
    }
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    stroke.current = { mode: brushActiveAt(config, row, column, p.brush) ? 'clear' : 'apply', visited: new Set() };
    paintAt(row, column, true);
  };

  const onKeyCell = (e: React.KeyboardEvent, row: number, column: number) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (p.brush === 'select') {
      const seat = config.rows[row]?.seats.find((s) => s.column === column);
      p.onSelect(seat ? { row, column } : null);
      return;
    }
    const mode: PaintMode = brushActiveAt(config, row, column, p.brush) ? 'clear' : 'apply';
    p.onStrokeStart((c) => paintCell(c, row, column, p.brush, mode));
  };

  return (
    <div className="adm-grid" style={{ ['--cols' as string]: config.columns }}>
      <div className="adm-grid__screen" aria-hidden>
        Screen
      </div>
      <div className="adm-grid__scroll">
        <table className={`adm-grid__table adm-grid__table--${p.brush}`} role="grid" aria-label={`Seat grid, ${BRUSH_LABEL[p.brush]} tool`}>
          <tbody>
            {config.rows.map((row, r) => {
              const byCol = new Map(row.seats.map((s) => [s.column, s]));
              return (
                <tr key={r} className={p.errorRow === r ? 'has-error' : undefined}>
                  <th scope="row" className="adm-grid__label">
                    <input
                      value={row.label}
                      onChange={(e) => p.onRenameRow(r, e.target.value)}
                      aria-label={`Row ${r + 1} label`}
                      maxLength={4}
                    />
                  </th>
                  {Array.from({ length: config.columns }, (_, c) => {
                    const seat = byCol.get(c);
                    const id = seat ? seatIdOf(row, seat) : null;
                    const isSel = p.selected?.row === r && p.selected.column === c;
                    const cls = [
                      'adm-cell',
                      seat ? 'is-seat' : 'is-empty',
                      seat?.category === 'PRM' && 'is-premium',
                      seat?.pair && `is-pair is-pair-${seat.pair}`,
                      seat?.wheelchair && 'is-wheelchair',
                      seat && seat.category && !['STD', 'PRM', 'DUO', 'DIS'].includes(seat.category) && 'is-custom',
                      isSel && 'is-selected',
                      id && id === p.previewSeatId && 'is-preview',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <td key={c}>
                        <button
                          type="button"
                          className={cls}
                          onPointerDown={(e) => onDown(e, r, c)}
                          onPointerEnter={() => paintAt(r, c, false)}
                          onKeyDown={(e) => onKeyCell(e, r, c)}
                          aria-label={seat ? `Seat ${id}${seat.category ? `, ${seat.category}` : ''}` : `Empty, row ${row.label}, column ${c + 1}`}
                          aria-pressed={isSel}
                        >
                          {seat ? (seat.wheelchair ? '♿' : seat.label) : ''}
                        </button>
                      </td>
                    );
                  })}
                  <td className="adm-grid__rowtools">
                    <button type="button" onClick={() => p.onMoveRow(r, -1)} disabled={r === 0} aria-label={`Move row ${row.label} towards the screen`} title="Move towards screen">
                      ↑
                    </button>
                    <button type="button" onClick={() => p.onMoveRow(r, 1)} disabled={r === config.rows.length - 1} aria-label={`Move row ${row.label} away from the screen`} title="Move away from screen">
                      ↓
                    </button>
                    <button type="button" onClick={() => p.onRemoveRow(r)} disabled={config.rows.length <= 1} aria-label={`Delete row ${row.label}`} title="Delete row">
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="adm-grid__axis">
        <span>← Audience left</span>
        <span>Back of the room is at the bottom</span>
        <span>Audience right →</span>
      </p>
    </div>
  );
}
