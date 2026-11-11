import { checkConfig, roomStats } from '../configTools';
import type { StoredRoom } from '../store';

interface Props {
  rooms: StoredRoom[];
  onOpen: (key: string) => void;
  onNew: () => void;
  onImport: () => void;
  onLoadDemo: () => void;
  onDuplicate: (key: string) => void;
  onDelete: (key: string) => void;
  demoLoading: boolean;
}

const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function RoomList({ rooms, onOpen, onNew, onImport, onLoadDemo, onDuplicate, onDelete, demoLoading }: Props) {
  const sorted = [...rooms].sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <div className="adm-list">
      <div className="adm-list__head">
        <div>
          <h1>Room configurations</h1>
          <p className="adm-muted">
            Describe each auditorium once: seat layout, categories and measurements. Export the JSON and point
            <code> &lt;seatview-preview config-url&gt;</code> at it.
          </p>
        </div>
        <div className="adm-actions">
          <button type="button" className="adm-btn" onClick={onImport}>
            Import JSON
          </button>
          <button type="button" className="adm-btn adm-btn--primary" onClick={onNew}>
            New room
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="adm-empty">
          <h2>No rooms yet</h2>
          <p className="adm-muted">Create a room from a grid, import an existing seat map, or start from the demo auditorium.</p>
          <div className="adm-actions">
            <button type="button" className="adm-btn adm-btn--primary" onClick={onNew}>
              New room
            </button>
            <button type="button" className="adm-btn" onClick={onImport}>
              Import JSON
            </button>
            <button type="button" className="adm-btn" onClick={onLoadDemo} disabled={demoLoading}>
              {demoLoading ? 'Loading…' : 'Load demo auditorium'}
            </button>
          </div>
        </div>
      ) : (
        <ul className="adm-rooms">
          {sorted.map((room) => {
            const s = roomStats(room.config);
            const ok = checkConfig(room.config).ok;
            const measured = Object.keys(room.config.dimensions ?? {}).length;
            return (
              <li key={room.key} className="adm-room">
                <button type="button" className="adm-room__open" onClick={() => onOpen(room.key)}>
                  <MiniMap room={room} />
                  <span className="adm-room__name">{room.config.name || 'Untitled room'}</span>
                  <span className="adm-room__id">{room.config.id}</span>
                  <span className="adm-room__meta">
                    {s.seats} seats · {s.rows} rows · {measured}/10 measured
                  </span>
                  <span className={`adm-badge ${ok ? 'adm-badge--ok' : 'adm-badge--error'}`}>{ok ? 'Valid' : 'Has errors'}</span>
                  <span className="adm-room__date">Edited {fmt.format(room.updatedAt)}</span>
                </button>
                <div className="adm-room__actions">
                  <button type="button" className="adm-btn adm-btn--small" onClick={() => onDuplicate(room.key)}>
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn--small adm-btn--danger"
                    onClick={() => {
                      if (window.confirm(`Delete "${room.config.name}" from this browser? This cannot be undone. Export it first if you need a copy.`)) onDelete(room.key);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Tiny SVG thumbnail of the seat layout. */
function MiniMap({ room }: { room: StoredRoom }) {
  const { columns, rows } = room.config;
  const w = columns * 6;
  const h = rows.length * 7 + 6;
  return (
    <svg className="adm-room__map" viewBox={`0 0 ${Math.max(w, 6)} ${h}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
      <rect x={w * 0.15} y={0} width={w * 0.7} height={2} rx={1} fill="#e7c38a" />
      {rows.flatMap((row, r) =>
        row.seats.map((s) => (
          <rect
            key={`${r}-${s.column}`}
            x={s.column * 6 + 0.6}
            y={r * 7 + 6}
            width={4.8}
            height={5}
            rx={1}
            fill={s.wheelchair ? '#2f6fed' : s.category === 'PRM' ? '#d9a93a' : s.pair ? '#e5737b' : '#8a8f9c'}
          />
        )),
      )}
    </svg>
  );
}
