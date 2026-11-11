import type { SeatViewConfig, SeatViewSeatConfig } from '../../web-component/config';
import { seatIdOf } from '../configTools';

interface Props {
  config: SeatViewConfig;
  selected: { row: number; column: number } | null;
  previewSeatId: string | null;
  onChange: (patch: Partial<SeatViewSeatConfig>) => void;
  onPreview: (seatId: string) => void;
  onRemove: () => void;
}

const CATEGORIES = [
  { code: 'STD', label: 'Standard' },
  { code: 'PRM', label: 'Premium' },
  { code: 'DUO', label: 'Duo (pair)' },
  { code: 'DIS', label: 'Wheelchair' },
  { code: 'LOG', label: 'Box' },
  { code: 'SOF', label: 'Sofa' },
  { code: 'TRI', label: 'Trio' },
  { code: 'DBX', label: 'D-BOX' },
];

/** Edits the selected seat's identity and category. */
export function Inspector({ config, selected, previewSeatId, onChange, onPreview, onRemove }: Props) {
  const row = selected ? config.rows[selected.row] : undefined;
  const seat = row?.seats.find((s) => s.column === selected!.column);

  if (!row || !seat) {
    return (
      <section className="adm-card" aria-label="Seat inspector">
        <header className="adm-card__head">
          <h2>Seat</h2>
        </header>
        <p className="adm-hint">Use the Select tool and click a seat to edit its label, booking id and category.</p>
      </section>
    );
  }

  const id = seatIdOf(row, seat);
  const knownCategory = CATEGORIES.some((c) => c.code === (seat.category ?? 'STD'));

  return (
    <section className="adm-card" aria-label="Seat inspector">
      <header className="adm-card__head">
        <h2>
          Seat {row.label}
          {seat.label}
        </h2>
        <span className="adm-badge">column {seat.column + 1}</span>
      </header>
      <div className="adm-form">
        <label className="adm-field">
          <span>Seat label</span>
          <input value={seat.label} onChange={(e) => onChange({ label: e.target.value })} maxLength={8} />
        </label>
        <label className="adm-field">
          <span>Booking system id</span>
          <input
            value={seat.id ?? ''}
            placeholder={`${row.label}${seat.label} (default)`}
            onChange={(e) => onChange({ id: e.target.value })}
            maxLength={40}
          />
          <small>Must match the id your booking page passes to the component. Leave empty for row + seat label.</small>
        </label>
        <label className="adm-field">
          <span>Category</span>
          <select
            value={knownCategory ? (seat.category ?? 'STD') : '__custom'}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '__custom') onChange({ category: 'CUSTOM' });
              else onChange({ category: v, wheelchair: v === 'DIS' ? true : undefined, pair: v === 'DUO' ? seat.pair : undefined });
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label} ({c.code})
              </option>
            ))}
            <option value="__custom">Custom code…</option>
          </select>
        </label>
        {!knownCategory && (
          <label className="adm-field">
            <span>Custom category code</span>
            <input value={seat.category ?? ''} onChange={(e) => onChange({ category: e.target.value.toUpperCase() })} maxLength={12} />
          </label>
        )}
        <label className="adm-field">
          <span>Category display name</span>
          <input value={seat.categoryLabel ?? ''} placeholder="Default for the code" onChange={(e) => onChange({ categoryLabel: e.target.value })} maxLength={40} />
        </label>
        {seat.pair && <p className="adm-hint">This seat is the {seat.pair} half of a Duo pair. Paint it with the Duo tool to split the pair.</p>}
        <div className="adm-actions">
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => onPreview(id)} disabled={previewSeatId === id}>
            {previewSeatId === id ? 'Previewing this seat' : 'Preview from this seat'}
          </button>
          <button type="button" className="adm-btn adm-btn--danger" onClick={onRemove}>
            Remove seat
          </button>
        </div>
      </div>
    </section>
  );
}
