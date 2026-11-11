import { useEffect, useState } from 'react';
import { DEFAULT_DIMENSIONS, type AuditoriumDimensions } from '../../seat-preview/geometry/auditorium';
import type { SeatViewConfig } from '../../web-component/config';

type Key = keyof AuditoriumDimensions;

const FIELDS: { key: Key; label: string; help: string; min: number; max: number }[] = [
  { key: 'screenWidth', label: 'Screen width', help: 'Width of the projected picture, masking excluded.', min: 2, max: 40 },
  { key: 'screenHeight', label: 'Screen height', help: 'Height of the picture. Scope ≈ width ÷ 2.39, flat ≈ width ÷ 1.85.', min: 1, max: 20 },
  { key: 'screenBottomHeight', label: 'Screen bottom height', help: 'Bottom edge of the picture above the front-row floor.', min: 0, max: 6 },
  { key: 'frontRowDistance', label: 'Front row distance', help: 'Screen to the centre of the front-row seats.', min: 1, max: 30 },
  { key: 'rowPitch', label: 'Row spacing', help: 'Seat centre to seat centre, front to back.', min: 0.7, max: 2.5 },
  { key: 'rowRise', label: 'Rise per row', help: 'Step height between consecutive rows (0 for a flat floor).', min: 0, max: 0.8 },
  { key: 'seatPitch', label: 'Seat spacing', help: 'Seat centre to seat centre within a row.', min: 0.4, max: 1.5 },
  { key: 'sideAisleWidth', label: 'Side aisle width', help: 'Walkway beside the outermost seats.', min: 0, max: 5 },
  { key: 'backAisleDepth', label: 'Back walkway', help: 'Back row to the back wall.', min: 0, max: 10 },
  { key: 'ceilingHeight', label: 'Ceiling height', help: 'Above the front-row floor.', min: 2.5, max: 25 },
];

interface Props {
  config: SeatViewConfig;
  onChange: (key: Key, value: number | undefined) => void;
}

/** Physical measurements in metres. Empty fields use multiplex defaults, shown as placeholders. */
export function DimensionsForm({ config, onChange }: Props) {
  const dims = { ...DEFAULT_DIMENSIONS, ...config.dimensions };
  const measured = Object.keys(config.dimensions ?? {}).length;
  const ratio = dims.screenWidth / dims.screenHeight;
  const backRowDistance = dims.frontRowDistance + (config.rows.length - 1) * dims.rowPitch;
  const totalRise = (config.rows.length - 1) * dims.rowRise;

  return (
    <section className="adm-card" aria-label="Room dimensions">
      <header className="adm-card__head">
        <h2>Dimensions</h2>
        <span className={`adm-badge ${measured === FIELDS.length ? 'adm-badge--ok' : ''}`}>
          {measured}/{FIELDS.length} measured
        </span>
      </header>
      <p className="adm-hint">Metres. Empty fields use typical multiplex values (shown greyed). Measured values make the view accurate.</p>
      <div className="adm-dims">
        {FIELDS.map((f) => (
          <DimInput key={f.key} field={f} value={config.dimensions?.[f.key]} placeholder={DEFAULT_DIMENSIONS[f.key]} onChange={(v) => onChange(f.key, v)} />
        ))}
      </div>
      <dl className="adm-derived">
        <div>
          <dt>Screen ratio</dt>
          <dd>
            {ratio.toFixed(2)}:1{Math.abs(ratio - 2.39) < 0.08 ? ' (scope)' : Math.abs(ratio - 1.85) < 0.08 ? ' (flat)' : ''}
          </dd>
        </div>
        <div>
          <dt>Back row distance</dt>
          <dd>{backRowDistance.toFixed(1)} m</dd>
        </div>
        <div>
          <dt>Total rake</dt>
          <dd>{totalRise.toFixed(2)} m</dd>
        </div>
      </dl>
    </section>
  );
}

function DimInput({
  field,
  value,
  placeholder,
  onChange,
}: {
  field: (typeof FIELDS)[number];
  value: number | undefined;
  placeholder: number;
  onChange: (v: number | undefined) => void;
}) {
  // Local text state so partial input ("1.", "") does not fight the stored number.
  const [text, setText] = useState(value === undefined ? '' : String(value));
  useEffect(() => setText(value === undefined ? '' : String(value)), [value]);
  const num = text.trim() === '' ? undefined : Number(text.replace(',', '.'));
  const error =
    num !== undefined && (!Number.isFinite(num) || num < field.min || num > field.max) ? `Expected ${field.min} to ${field.max} m.` : undefined;

  return (
    <label className="adm-field adm-field--dim">
      <span>{field.label}</span>
      <span className="adm-unit">
        <input
          inputMode="decimal"
          value={text}
          placeholder={String(placeholder)}
          aria-invalid={!!error}
          onChange={(e) => {
            const t = e.target.value;
            setText(t);
            const n = t.trim() === '' ? undefined : Number(t.replace(',', '.'));
            if (n === undefined) onChange(undefined);
            else if (Number.isFinite(n) && n >= field.min && n <= field.max) onChange(n);
          }}
        />
        <em>m</em>
      </span>
      <small className={error ? 'is-error' : undefined}>{error ?? field.help}</small>
    </label>
  );
}
