import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { SeatViewConfig } from '../../web-component/config';
import { generateRoom, importConfig, MAX_COLUMNS, MAX_ROWS, slugify, type Numbering } from '../configTools';

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d?.addEventListener('cancel', onCancel);
    return () => d?.removeEventListener('cancel', onCancel);
  }, [onClose]);
  return (
    <dialog ref={ref} className="adm-dialog" aria-labelledby="adm-dialog-title">
      <header className="adm-dialog__head">
        <h2 id="adm-dialog-title">{title}</h2>
        <button type="button" className="adm-iconbtn" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}

/** Generates a rectangular room with optional aisles, then the user refines it in the grid. */
export function NewRoomDialog({ onCreate, onClose }: { onCreate: (c: SeatViewConfig) => void; onClose: () => void }) {
  const [name, setName] = useState('Auditorium 1');
  const [rows, setRows] = useState(10);
  const [columns, setColumns] = useState(16);
  const [aisles, setAisles] = useState('');
  const [firstRow, setFirstRow] = useState('A');
  const [skipIO, setSkipIO] = useState(true);
  const [numbering, setNumbering] = useState<Numbering>('ltr');

  const aisleCols = aisles
    .split(/[\s,;]+/)
    .map((s) => Number.parseInt(s, 10) - 1)
    .filter((n) => Number.isInteger(n) && n >= 0 && n < columns);
  const valid = name.trim().length > 0 && rows >= 1 && rows <= MAX_ROWS && columns >= 1 && columns <= MAX_COLUMNS;

  return (
    <Dialog title="New room" onClose={onClose}>
      <form
        className="adm-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onCreate(generateRoom({ name: name.trim(), id: slugify(name), rows, columns, aisles: aisleCols, firstRow, skipIO, numbering }));
        }}
      >
        <label className="adm-field">
          <span>Room name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoFocus />
        </label>
        <div className="adm-inline adm-inline--grow">
          <label className="adm-field">
            <span>Rows</span>
            <input type="number" min={1} max={MAX_ROWS} value={rows} onChange={(e) => setRows(Number(e.target.value))} />
          </label>
          <label className="adm-field">
            <span>Seats per row (grid columns)</span>
            <input type="number" min={1} max={MAX_COLUMNS} value={columns} onChange={(e) => setColumns(Number(e.target.value))} />
          </label>
        </div>
        <label className="adm-field">
          <span>Aisle columns (optional)</span>
          <input value={aisles} onChange={(e) => setAisles(e.target.value)} placeholder="e.g. 5, 12" />
          <small>Column numbers counted from the audience's left, left empty in every row.</small>
        </label>
        <div className="adm-inline adm-inline--grow">
          <label className="adm-field">
            <span>Front row letter</span>
            <input value={firstRow} onChange={(e) => setFirstRow(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1))} />
          </label>
          <label className="adm-field">
            <span>Seat 1 is on the</span>
            <select value={numbering} onChange={(e) => setNumbering(e.target.value as Numbering)}>
              <option value="ltr">Left</option>
              <option value="rtl">Right</option>
            </select>
          </label>
        </div>
        <label className="adm-check">
          <input type="checkbox" checked={skipIO} onChange={(e) => setSkipIO(e.target.checked)} /> Skip rows I and O
        </label>
        <p className="adm-hint">
          {rows * (columns - new Set(aisleCols).size)} seats. Shape it afterwards: paint aisles, premium rows, Duo pairs and wheelchair spaces.
        </p>
        <div className="adm-actions adm-actions--end">
          <button type="button" className="adm-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={!valid}>
            Create room
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/** Imports a SeatView config or a row-grid seat map from a file or pasted JSON. */
export function ImportDialog({ onImport, onClose }: { onImport: (c: SeatViewConfig) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tryImport = (raw: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setError('This is not valid JSON.');
      return;
    }
    try {
      onImport(importConfig(parsed));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The file could not be imported.');
    }
  };

  return (
    <Dialog title="Import a room" onClose={onClose}>
      <div className="adm-form">
        <p className="adm-hint">
          Accepts a SeatView configuration (<code>seatview/auditorium@1</code>) or a row-grid seat map with <code>colCount</code> and{' '}
          <code>seats</code> rows listed back to front.
        </p>
        <label className="adm-field">
          <span>JSON file</span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 2_000_000) {
                setError('The file is larger than 2 MB.');
                return;
              }
              const t = await f.text();
              setText(t);
              setError(null);
              tryImport(t);
            }}
          />
        </label>
        <label className="adm-field">
          <span>Or paste JSON</span>
          <textarea rows={8} value={text} onChange={(e) => (setText(e.target.value), setError(null))} spellCheck={false} />
        </label>
        {error && (
          <p className="adm-error" role="alert">
            {error}
          </p>
        )}
        <div className="adm-actions adm-actions--end">
          <button type="button" className="adm-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="adm-btn adm-btn--primary" disabled={!text.trim()} onClick={() => tryImport(text)}>
            Import
          </button>
        </div>
      </div>
    </Dialog>
  );
}
