import type { SeatViewConfig } from '../web-component/config';

/**
 * Local draft storage for the configurator. Rooms live in this browser only (localStorage); the JSON export
 * is the deliverable that operators host and reference from <seatview-preview config-url>.
 */
export interface StoredRoom {
  /** Internal key, stable even when the config id is edited. */
  key: string;
  config: SeatViewConfig;
  updatedAt: number;
}

const KEY = 'seatview-admin:rooms:v1';

export function loadRooms(): StoredRoom[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is StoredRoom =>
        !!r && typeof r === 'object' && typeof (r as StoredRoom).key === 'string' && typeof (r as StoredRoom).config?.id === 'string',
    );
  } catch {
    return [];
  }
}

/** Returns false when the browser refuses storage (private mode, quota): the UI warns the user to export. */
export function saveRooms(rooms: StoredRoom[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(rooms));
    return true;
  } catch {
    return false;
  }
}

export const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function downloadJson(config: SeatViewConfig) {
  const blob = new Blob([JSON.stringify(config, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${config.id || 'auditorium'}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
