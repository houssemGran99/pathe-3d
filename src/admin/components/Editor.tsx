import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SeatViewConfig, SeatViewSeatConfig } from '../../web-component/config';
import { normaliseConfig } from '../../web-component/config';
import {
  addRow,
  checkConfig,
  MAX_COLUMNS,
  moveRow,
  paintCell,
  reletterRows,
  removeRow,
  renameRow,
  renumberSeats,
  roomStats,
  seatAt,
  seatIdOf,
  setColumns,
  setDimension,
  setMeta,
  shiftColumns,
  slugify,
  updateSeat,
  type Brush,
  type Numbering,
} from '../configTools';
import { useHistory } from '../useHistory';
import { DimensionsForm } from './DimensionsForm';
import { ExportPanel } from './ExportPanel';
import { GridEditor } from './GridEditor';
import { Inspector } from './Inspector';
import { PreviewPane } from './PreviewPane';

interface Props {
  initial: SeatViewConfig;
  onChange: (config: SeatViewConfig) => void;
}

const BRUSHES: { id: Brush; label: string; key: string; hint: string }[] = [
  { id: 'select', label: 'Select', key: 'V', hint: 'Pick a seat to edit or preview from' },
  { id: 'seat', label: 'Seat', key: 'S', hint: 'Add standard seats' },
  { id: 'premium', label: 'Premium', key: 'P', hint: 'Toggle premium seats' },
  { id: 'duo', label: 'Duo pair', key: 'D', hint: 'Join two seats into a double seat' },
  { id: 'wheelchair', label: 'Wheelchair', key: 'W', hint: 'Toggle wheelchair spaces' },
  { id: 'aisle', label: 'Aisle', key: 'A', hint: 'Remove seats to make aisles' },
];

export function Editor({ initial, onChange }: Props) {
  const history = useHistory(initial);
  const cfg = history.present;
  const [brush, setBrush] = useState<Brush>('seat');
  const [selected, setSelected] = useState<{ row: number; column: number } | null>(null);
  const [previewSeatId, setPreviewSeatId] = useState<string | null>(null);
  const [numbering, setNumbering] = useState<Numbering>('ltr');
  const [firstRow, setFirstRow] = useState('A');
  const [skipIO, setSkipIO] = useState(false);

  // Persist every change (the parent saves to local storage).
  useEffect(() => onChange(cfg), [cfg, onChange]);

  // Keyboard: undo/redo and tool shortcuts (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest('input, textarea, select');
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      } else if (mod && e.key.toLowerCase() === 'y' && !typing) {
        e.preventDefault();
        history.redo();
      } else if (!mod && !e.altKey && !typing) {
        const b = BRUSHES.find((x) => x.key === e.key.toUpperCase());
        if (b) setBrush(b.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [history]);

  const check = useMemo(() => checkConfig(cfg), [cfg]);
  const stats = useMemo(() => roomStats(cfg), [cfg]);
  const auditorium = useMemo(() => {
    if (!check.ok) return null;
    try {
      return normaliseConfig(cfg, { selectedSeatIds: previewSeatId ? [previewSeatId] : [], locale: 'en' });
    } catch {
      return null;
    }
  }, [cfg, check.ok, previewSeatId]);

  // Keep the selection valid after edits (undo, row deletion, removal).
  const selectedSeat = selected ? seatAt(cfg, selected.row, selected.column) : undefined;
  useEffect(() => {
    if (selected && !selectedSeat) setSelected(null);
  }, [selected, selectedSeat]);

  const onSeatPatch = useCallback(
    (patch: Partial<SeatViewSeatConfig>) => {
      if (!selected) return;
      const { row, column } = selected;
      history.push((c) => {
        const seat = seatAt(c, row, column);
        if (!seat) return c;
        let next = c;
        // Category changes keep Duo pairs consistent: leaving DUO splits the pair, choosing DUO creates one.
        if (patch.category !== undefined && seat.pair && patch.category !== 'DUO') next = paintCell(next, row, column, 'duo', 'clear');
        if (patch.category === 'DUO' && !seat.pair) return paintCell(next, row, column, 'duo', 'apply');
        const { pair: _pair, ...rest } = patch;
        void _pair;
        return updateSeat(next, row, column, rest);
      });
      // Follow the preview if the previewed seat's id changes.
      if ((patch.label !== undefined || patch.id !== undefined) && selectedSeat && cfg.rows[row]) {
        const before = seatIdOf(cfg.rows[row], selectedSeat);
        if (before === previewSeatId) {
          const after = patch.id || `${cfg.rows[row].label}${patch.label ?? selectedSeat.label}`;
          setPreviewSeatId(after);
        }
      }
    },
    [selected, selectedSeat, history, cfg, previewSeatId],
  );

  const selectCell = (cell: { row: number; column: number } | null) => {
    setSelected(cell);
    if (cell) {
      const row = cfg.rows[cell.row];
      const seat = row?.seats.find((s) => s.column === cell.column);
      if (row && seat) setPreviewSeatId(seatIdOf(row, seat));
    }
  };

  return (
    <div className="adm-editor">
      <aside className="adm-editor__side">
        <section className="adm-card" aria-label="Room details">
          <header className="adm-card__head">
            <h2>Room</h2>
            <span className="adm-badge">{stats.seats} seats</span>
          </header>
          <div className="adm-form">
            <label className="adm-field">
              <span>Name</span>
              <input value={cfg.name} onChange={(e) => history.push((c) => setMeta(c, { name: e.target.value }))} maxLength={80} />
            </label>
            <label className="adm-field">
              <span>Config id</span>
              <span className="adm-inline">
                <input value={cfg.id} onChange={(e) => history.push((c) => setMeta(c, { id: e.target.value }))} maxLength={80} />
                <button type="button" className="adm-btn adm-btn--small" onClick={() => history.push((c) => setMeta(c, { id: slugify(c.name) }))}>
                  From name
                </button>
              </span>
              <small>Also the exported file name. Use one id per auditorium, e.g. cinema-12-room-3.</small>
            </label>
          </div>
          <ul className="adm-stats">
            <li>
              <strong>{stats.rows}</strong> rows
            </li>
            <li>
              <strong>{cfg.columns}</strong> columns
            </li>
            <li>
              <strong>{stats.premium}</strong> premium
            </li>
            <li>
              <strong>{stats.duo / 2}</strong> duo pairs
            </li>
            <li>
              <strong>{stats.wheelchair}</strong> wheelchair
            </li>
          </ul>
        </section>

        <section className="adm-card" aria-label="Numbering">
          <header className="adm-card__head">
            <h2>Numbering</h2>
          </header>
          <div className="adm-form">
            <div className="adm-field">
              <span>Seat numbers start from</span>
              <div className="adm-seg" role="radiogroup" aria-label="Seat numbering direction">
                {(['ltr', 'rtl'] as const).map((d) => (
                  <button key={d} type="button" role="radio" aria-checked={numbering === d} className={numbering === d ? 'is-on' : ''} onClick={() => setNumbering(d)}>
                    {d === 'ltr' ? 'Left' : 'Right'}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="adm-btn" onClick={() => history.push((c) => renumberSeats(c, numbering))}>
              Renumber all seats
            </button>
            <div className="adm-inline">
              <label className="adm-field adm-field--narrow">
                <span>Front row</span>
                <input value={firstRow} onChange={(e) => setFirstRow(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1))} aria-label="Front row letter" />
              </label>
              <label className="adm-check">
                <input type="checkbox" checked={skipIO} onChange={(e) => setSkipIO(e.target.checked)} /> Skip I and O
              </label>
            </div>
            <button type="button" className="adm-btn" onClick={() => history.push((c) => reletterRows(c, firstRow || 'A', skipIO))}>
              Re-letter rows from the front
            </button>
            <p className="adm-hint">Renumbering changes default seat ids. Make sure they still match your booking system.</p>
          </div>
        </section>

        <DimensionsForm config={cfg} onChange={(k, v) => history.push((c) => setDimension(c, k, v))} />
      </aside>

      <main className="adm-editor__main">
        <div className="adm-toolbar" role="toolbar" aria-label="Seat tools">
          <div className="adm-tools">
            {BRUSHES.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`adm-tool adm-tool--${b.id} ${brush === b.id ? 'is-on' : ''}`}
                aria-pressed={brush === b.id}
                onClick={() => setBrush(b.id)}
                title={`${b.hint} (${b.key})`}
              >
                <i aria-hidden />
                {b.label}
                <kbd>{b.key}</kbd>
              </button>
            ))}
          </div>
          <div className="adm-tools">
            <button type="button" className="adm-tool" onClick={history.undo} disabled={!history.canUndo} title="Undo (Ctrl+Z)">
              Undo
            </button>
            <button type="button" className="adm-tool" onClick={history.redo} disabled={!history.canRedo} title="Redo (Ctrl+Shift+Z)">
              Redo
            </button>
          </div>
        </div>

        <div className="adm-gridbar">
          <div className="adm-inline">
            <button type="button" className="adm-btn adm-btn--small" onClick={() => history.push((c) => addRow(c, 'front'))}>
              + Row at front
            </button>
            <button type="button" className="adm-btn adm-btn--small" onClick={() => history.push((c) => addRow(c, 'back'))}>
              + Row at back
            </button>
          </div>
          <div className="adm-inline">
            <span className="adm-muted">Columns</span>
            <button type="button" className="adm-btn adm-btn--small" onClick={() => history.push((c) => shiftColumns(c, 1))} title="Insert an empty column on the left">
              + Left
            </button>
            <button type="button" className="adm-btn adm-btn--small" onClick={() => history.push((c) => shiftColumns(c, -1))} title="Remove the left column (only if empty)">
              − Left
            </button>
            <input
              type="number"
              className="adm-num"
              min={1}
              max={MAX_COLUMNS}
              value={cfg.columns}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n >= 1) history.push((c) => setColumns(c, n));
              }}
              aria-label="Number of columns"
            />
          </div>
        </div>

        <GridEditor
          config={cfg}
          brush={brush}
          selected={selected}
          previewSeatId={previewSeatId}
          errorRow={check.ok ? undefined : check.row}
          onStrokeStart={history.push}
          onStrokeContinue={history.replace}
          onSelect={selectCell}
          onRenameRow={(r, label) => history.push((c) => renameRow(c, r, label))}
          onRemoveRow={(r) => history.push((c) => removeRow(c, r))}
          onMoveRow={(r, d) => history.push((c) => moveRow(c, r, d))}
        />

        <ul className="adm-legend" aria-label="Legend">
          <li><i className="adm-cell is-seat" /> Standard</li>
          <li><i className="adm-cell is-seat is-premium" /> Premium</li>
          <li><i className="adm-cell is-seat is-pair" /> Duo pair</li>
          <li><i className="adm-cell is-seat is-wheelchair" /> Wheelchair</li>
          <li><i className="adm-cell is-seat is-custom" /> Other category</li>
          <li><i className="adm-cell is-seat is-preview" /> Preview seat</li>
        </ul>
      </main>

      <aside className="adm-editor__side adm-editor__side--right">
        <PreviewPane auditorium={auditorium} seatId={previewSeatId} invalidReason={check.ok ? undefined : check.message} />
        <Inspector
          config={cfg}
          selected={selected}
          previewSeatId={previewSeatId}
          onChange={onSeatPatch}
          onPreview={setPreviewSeatId}
          onRemove={() => selected && history.push((c) => paintCell(c, selected.row, selected.column, 'aisle'))}
        />
        <ExportPanel config={cfg} valid={check.ok} error={check.ok ? undefined : check.message} previewSeatId={previewSeatId} />
      </aside>
    </div>
  );
}
