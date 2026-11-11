import { useState } from 'react';
import type { SeatViewConfig } from '../../web-component/config';
import { copyText, downloadJson } from '../store';

interface Props {
  config: SeatViewConfig;
  valid: boolean;
  error?: string;
  previewSeatId: string | null;
}

/** Exports the configuration file and the matching embed snippet. Disabled while the config is invalid. */
export function ExportPanel({ config, valid, error, previewSeatId }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const flash = (what: string, ok: boolean) => {
    setCopied(ok ? what : `${what}-failed`);
    setTimeout(() => setCopied(null), 1800);
  };
  const file = `${config.id || 'auditorium'}.json`;
  const snippet = `<script type="module" src="https://seatview-3d.vercel.app/sdk/seatview.js"></script>
<seatview-preview config-url="/auditoriums/${file}"${previewSeatId ? ` seat="${previewSeatId}"` : ''}></seatview-preview>`;

  return (
    <section className="adm-card" aria-label="Export">
      <header className="adm-card__head">
        <h2>Export</h2>
        <span className={`adm-badge ${valid ? 'adm-badge--ok' : 'adm-badge--error'}`}>{valid ? 'Valid' : 'Has errors'}</span>
      </header>
      {!valid && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      <div className="adm-actions">
        <button type="button" className="adm-btn adm-btn--primary" disabled={!valid} onClick={() => downloadJson(config)}>
          Download {file}
        </button>
        <button
          type="button"
          className="adm-btn"
          disabled={!valid}
          onClick={async () => flash('json', await copyText(JSON.stringify(config, null, 2)))}
        >
          {copied === 'json' ? 'Copied' : copied === 'json-failed' ? 'Copy failed' : 'Copy JSON'}
        </button>
      </div>
      <p className="adm-hint">Host the file on your site, then embed the preview on your booking page:</p>
      <pre className="adm-code">{snippet}</pre>
      <button type="button" className="adm-btn adm-btn--small" onClick={async () => flash('snippet', await copyText(snippet))}>
        {copied === 'snippet' ? 'Copied' : copied === 'snippet-failed' ? 'Copy failed' : 'Copy snippet'}
      </button>
    </section>
  );
}
