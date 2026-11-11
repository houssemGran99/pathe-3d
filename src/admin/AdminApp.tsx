import { useCallback, useEffect, useMemo, useState } from 'react';
import { Logo } from '../landing/components/Logo';
import type { SeatViewConfig } from '../web-component/config';
import { importConfig } from './configTools';
import { Editor } from './components/Editor';
import { ImportDialog, NewRoomDialog } from './components/Dialogs';
import { RoomList } from './components/RoomList';
import { loadRooms, newKey, saveRooms, type StoredRoom } from './store';
import './admin.css';

const roomFromHash = () => new URLSearchParams(window.location.hash.slice(1)).get('room');

/**
 * SeatView 3D room configurator (/admin). A client-side tool: rooms are drafts in this browser's local
 * storage, and the exported JSON is what operators publish for the web component.
 */
export function AdminApp() {
  const [rooms, setRooms] = useState<StoredRoom[]>(() => loadRooms());
  const [activeKey, setActiveKey] = useState<string | null>(() => roomFromHash());
  const [dialog, setDialog] = useState<'new' | 'import' | null>(null);
  const [saveOk, setSaveOk] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Room configurator | SeatView 3D';
    // Override the site-wide robots tag rather than adding a second, conflicting one.
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previous = meta?.content ?? null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.append(meta);
    }
    meta.content = 'noindex, nofollow';
    return () => {
      if (previous === null) meta?.remove();
      else if (meta) meta.content = previous;
    };
  }, []);

  useEffect(() => setSaveOk(saveRooms(rooms)), [rooms]);

  // Deep links: #room=<key>; browser back returns to the list.
  useEffect(() => {
    const onHash = () => setActiveKey(roomFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const open = useCallback((key: string | null) => {
    window.location.hash = key ? `room=${encodeURIComponent(key)}` : '';
    setActiveKey(key);
  }, []);

  const addRoom = useCallback(
    (config: SeatViewConfig) => {
      const key = newKey();
      setRooms((rs) => [...rs, { key, config, updatedAt: Date.now() }]);
      setDialog(null);
      open(key);
    },
    [open],
  );

  const updateActive = useCallback(
    (config: SeatViewConfig) =>
      setRooms((rs) => rs.map((r) => (r.key === activeKey && r.config !== config ? { ...r, config, updatedAt: Date.now() } : r))),
    [activeKey],
  );

  const active = useMemo(() => rooms.find((r) => r.key === activeKey) ?? null, [rooms, activeKey]);

  const loadDemo = async () => {
    setDemoLoading(true);
    setDemoError(null);
    try {
      const res = await fetch('/sdk/demo-auditorium.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addRoom({ ...importConfig(await res.json()), id: 'demo-auditorium-3' });
    } catch {
      setDemoError('The demo auditorium could not be loaded.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-top__left">
          <a href="/" className="adm-top__brand" aria-label="SeatView 3D home">
            <Logo size={24} />
          </a>
          <span className="adm-top__sep" aria-hidden>
            /
          </span>
          {active ? (
            <>
              <button type="button" className="adm-link" onClick={() => open(null)}>
                Rooms
              </button>
              <span className="adm-top__sep" aria-hidden>
                /
              </span>
              <span className="adm-top__title">{active.config.name || 'Untitled room'}</span>
            </>
          ) : (
            <span className="adm-top__title">Room configurator</span>
          )}
        </div>
        <span className={`adm-save ${saveOk ? '' : 'is-error'}`} role="status">
          {saveOk ? 'Saved in this browser' : 'Browser storage unavailable: export your rooms to keep them'}
        </span>
      </header>

      {active ? (
        <Editor key={active.key} initial={active.config} onChange={updateActive} />
      ) : activeKey ? (
        <div className="adm-list">
          <div className="adm-empty">
            <h2>Room not found</h2>
            <p className="adm-muted">It may have been deleted, or saved in another browser.</p>
            <button type="button" className="adm-btn adm-btn--primary" onClick={() => open(null)}>
              Back to rooms
            </button>
          </div>
        </div>
      ) : (
        <>
          <RoomList
            rooms={rooms}
            onOpen={open}
            onNew={() => setDialog('new')}
            onImport={() => setDialog('import')}
            onLoadDemo={loadDemo}
            demoLoading={demoLoading}
            onDuplicate={(key) => {
              const r = rooms.find((x) => x.key === key);
              if (r) addRoom({ ...structuredClone(r.config), id: `${r.config.id}-copy`, name: `${r.config.name} (copy)` });
            }}
            onDelete={(key) => setRooms((rs) => rs.filter((r) => r.key !== key))}
          />
          {demoError && (
            <p className="adm-error adm-list" role="alert">
              {demoError}
            </p>
          )}
        </>
      )}

      {dialog === 'new' && <NewRoomDialog onCreate={addRoom} onClose={() => setDialog(null)} />}
      {dialog === 'import' && <ImportDialog onImport={addRoom} onClose={() => setDialog(null)} />}
    </div>
  );
}
