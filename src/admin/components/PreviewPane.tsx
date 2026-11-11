import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { computeSeatViewpoint } from '../../seat-preview/camera/seatCamera';
import { findSeat } from '../../seat-preview/geometry/auditorium';
import { createRigController } from '../../seat-preview/scene/rigController';
import type { Auditorium } from '../../seat-preview/types';
import { getStrings } from '../../seat-preview/ui/i18n';
import { isWebGLAvailable } from '../../seat-preview/ui/webgl';

const CinemaScene = lazy(() => import('../../seat-preview/scene/CinemaScene').then((m) => ({ default: m.CinemaScene })));

interface Props {
  auditorium: Auditorium | null;
  seatId: string | null;
  invalidReason?: string;
}

const t = getStrings('en');

/** Live first-person preview of the room being edited, rendered by the production engine. */
export function PreviewPane({ auditorium, seatId, invalidReason }: Props) {
  const controller = useMemo(() => createRigController(), []);
  const webgl = useMemo(() => isWebGLAvailable(), []);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Fall back to the seat nearest the room's centre when nothing is picked.
  const seat = useMemo(() => {
    if (!auditorium) return null;
    const picked = findSeat(auditorium, seatId);
    if (picked) return picked;
    const midRow = Math.floor(auditorium.rows.length / 2);
    return (
      [...auditorium.seats]
        .filter((s) => s.row === midRow)
        .sort((a, b) => Math.abs(a.positionX) - Math.abs(b.positionX))[0] ?? auditorium.seats[0] ?? null
    );
  }, [auditorium, seatId]);
  const viewpoint = useMemo(() => (seat && auditorium ? computeSeatViewpoint(seat, auditorium) : null), [seat, auditorium]);
  const showing = !!viewpoint;
  // The canvas unmounts while the config is invalid; fade it in again when it comes back.
  useEffect(() => {
    if (!showing) setReady(false);
  }, [showing]);

  return (
    <section className="adm-card adm-preview" aria-label="3D preview">
      <header className="adm-card__head">
        <h2>Preview</h2>
        {seat && (
          <span className="adm-badge">
            Seat {seat.rowLabel}
            {seat.seatLabel}
            {!seatId || !findSeat(auditorium!, seatId) ? ' · auto' : ''}
          </span>
        )}
      </header>
      <div className={`adm-preview__frame ${ready ? 'is-ready' : ''}`}>
        {!webgl || failed ? (
          <p className="adm-preview__msg">The 3D preview needs WebGL, which this browser does not provide.</p>
        ) : !auditorium || !viewpoint ? (
          <p className="adm-preview__msg">{invalidReason ? 'Fix the configuration error to see the preview.' : 'Add seats to see the preview.'}</p>
        ) : (
          <>
            {!ready && <p className="adm-preview__msg">Loading the 3D engine…</p>}
            <Suspense fallback={null}>
              <CinemaScene
                auditorium={auditorium}
                viewpoint={viewpoint}
                controller={controller}
                wheelZoom={false}
                onReady={() => setReady(true)}
                onError={() => setFailed(true)}
                className="adm-preview__canvas"
              />
            </Suspense>
            {ready && (
              <button type="button" className="adm-iconbtn adm-preview__reset" onClick={() => controller.reset()} title="Re-centre view" aria-label="Re-centre view">
                ⟲
              </button>
            )}
          </>
        )}
      </div>
      {viewpoint && (
        <dl className="adm-metrics">
          <div>
            <dt>Distance</dt>
            <dd>{viewpoint.distanceToScreen.toFixed(1)} m</dd>
          </div>
          <div>
            <dt>Angle</dt>
            <dd>
              {Math.abs(viewpoint.horizontalAngleDeg) < 2.5
                ? 'centred'
                : `${Math.abs(viewpoint.horizontalAngleDeg).toFixed(0)}° ${viewpoint.horizontalAngleDeg > 0 ? 'right' : 'left'}`}
              , {Math.abs(viewpoint.verticalAngleDeg).toFixed(0)}° {viewpoint.verticalAngleDeg >= 0 ? 'up' : 'down'}
            </dd>
          </div>
          <div>
            <dt>Screen width</dt>
            <dd>{viewpoint.screenCoverageDeg.toFixed(0)}° of view</dd>
          </div>
          <div>
            <dt>Rating</dt>
            <dd className={`adm-rating adm-rating--${viewpoint.rating}`}>{t.rating[viewpoint.rating]}</dd>
          </div>
        </dl>
      )}
      <p className="adm-hint">Select a seat with the Select tool to preview from it. Drag in the view to look around.</p>
    </section>
  );
}
