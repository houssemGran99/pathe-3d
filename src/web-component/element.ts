import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { computeSeatViewpoint } from '../seat-preview/camera/seatCamera';
import { findSeat } from '../seat-preview/geometry/auditorium';
import type { Auditorium, SeatViewRating } from '../seat-preview/types';
import type { Locale } from '../seat-preview/ui/i18n';
import overlayCss from '../seat-preview/ui/seat-preview.css?inline';
import { ConfigError, normaliseConfig, type ConfigErrorCode } from './config';
import { SeatViewApp, type AppStatus, type Mode } from './SeatViewApp';
import wcCss from './wc.css?inline';

/** Payloads of the DOM events dispatched by <seatview-preview> (all bubble and cross shadow roots). */
export interface SeatViewEventMap {
  'seatview-load': { auditoriumId: string; name: string; seatCount: number };
  'seatview-viewpoint': {
    seatId: string;
    row: string;
    seat: string;
    category?: string;
    distanceToScreen: number;
    horizontalAngle: number;
    verticalAngle: number;
    screenCoverage: number;
    rating: SeatViewRating;
  };
  'seatview-open': { seatId: string | null };
  'seatview-close': { seatId: string | null };
  'seatview-seat-change': { seatId: string };
  'seatview-error': { code: ConfigErrorCode; message: string };
}

const ATTRIBUTES = ['config-url', 'seat', 'selected-seats', 'mode', 'open', 'locale', 'brand'] as const;
const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/**
 * <seatview-preview> — framework-agnostic first-person seat preview.
 *
 * Attributes: config-url, seat, selected-seats (comma separated), mode ("modal" | "inline"), open,
 * locale ("en" | "fr"), brand.
 * Properties: config (object, takes precedence over config-url), seat, selectedSeats.
 * Methods: open(seatId?), close().
 * Events: see SeatViewEventMap.
 *
 * The element never reads or changes seat availability: the host booking system stays the source of truth.
 */
export class SeatViewPreviewElement extends HTMLElement {
  static observedAttributes = [...ATTRIBUTES];

  #mount: HTMLDivElement;
  #portal: HTMLDivElement;
  #root: Root | null = null;
  #raw: unknown = undefined;
  #rawFromProperty = false;
  #auditorium: Auditorium | null = null;
  #status: AppStatus = 'idle';
  #error: string | undefined;
  #fetch: AbortController | null = null;
  #lastViewpointKey = '';

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `${overlayCss}\n${wcCss}`;
    this.#mount = document.createElement('div');
    this.#mount.className = 'sv-root';
    this.#portal = document.createElement('div');
    this.#portal.className = 'sv-portal';
    shadow.append(style, this.#mount, this.#portal);
  }

  connectedCallback() {
    // Properties set before the element was upgraded live on the instance; re-apply them through setters.
    for (const prop of ['config', 'seat', 'selectedSeats'] as const) {
      if (Object.prototype.hasOwnProperty.call(this, prop)) {
        const value = (this as Record<string, unknown>)[prop];
        delete (this as Record<string, unknown>)[prop];
        (this as Record<string, unknown>)[prop] = value;
      }
    }
    if (!this.#root) this.#root = createRoot(this.#mount);
    if (!this.#rawFromProperty && this.#status === 'idle') this.#loadConfig();
    this.#render();
  }

  disconnectedCallback() {
    // Defer so that moving the element in the DOM does not tear down the 3D scene.
    queueMicrotask(() => {
      if (this.isConnected) return;
      this.#fetch?.abort();
      this.#root?.unmount();
      this.#root = null;
    });
  }

  attributeChangedCallback(name: (typeof ATTRIBUTES)[number], oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue) return;
    switch (name) {
      case 'config-url':
        if (!this.#rawFromProperty && this.isConnected) this.#loadConfig();
        break;
      case 'selected-seats':
      case 'locale':
        this.#rebuild();
        break;
      case 'seat':
        this.#emitViewpoint();
        break;
      case 'open':
        if (newValue !== null) this.#emit('seatview-open', { seatId: this.seat });
        break;
    }
    this.#render();
  }

  /* ------------------------------ public API ------------------------------ */

  get config(): unknown {
    return this.#raw;
  }
  set config(value: unknown) {
    this.#fetch?.abort();
    this.#raw = value;
    this.#rawFromProperty = value != null;
    if (value == null) {
      this.#status = 'idle';
      this.#loadConfig();
      return;
    }
    this.#rebuild();
  }

  get seat(): string | null {
    return this.getAttribute('seat');
  }
  set seat(value: string | null) {
    if (value) this.setAttribute('seat', value);
    else this.removeAttribute('seat');
  }

  get selectedSeats(): string[] {
    return (this.getAttribute('selected-seats') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  set selectedSeats(value: readonly string[] | null) {
    if (value && value.length) this.setAttribute('selected-seats', value.join(','));
    else this.removeAttribute('selected-seats');
  }

  get mode(): Mode {
    return this.getAttribute('mode') === 'inline' ? 'inline' : 'modal';
  }
  set mode(value: Mode) {
    this.setAttribute('mode', value);
  }

  get isOpen(): boolean {
    return this.hasAttribute('open');
  }

  /** The auditorium the element is rendering, once loaded. */
  get auditorium(): Auditorium | null {
    return this.#auditorium;
  }

  /** Opens the full-screen preview, optionally on a given seat. */
  open(seatId?: string) {
    if (seatId) this.seat = seatId;
    this.setAttribute('open', '');
  }

  close() {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.#emit('seatview-close', { seatId: this.seat });
  }

  /* ------------------------------ internals ------------------------------ */

  get #locale(): Locale {
    return this.getAttribute('locale') === 'fr' ? 'fr' : 'en';
  }

  #emit<K extends keyof SeatViewEventMap>(type: K, detail: SeatViewEventMap[K]) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  #loadConfig() {
    const inline = this.querySelector('script[type="application/json"]');
    if (inline?.textContent?.trim()) {
      try {
        this.#raw = JSON.parse(inline.textContent);
      } catch {
        this.#fail('invalid-json', 'The inline <script type="application/json"> is not valid JSON.');
        return;
      }
      this.#rebuild();
      return;
    }

    const url = this.getAttribute('config-url');
    if (!url) {
      this.#status = 'idle';
      this.#render();
      return;
    }

    this.#fetch?.abort();
    const ctrl = new AbortController();
    this.#fetch = ctrl;
    this.#status = 'loading';
    this.#render();
    fetch(new URL(url, document.baseURI), { signal: ctrl.signal, credentials: 'same-origin' })
      .then((res) => {
        if (!res.ok) throw new ConfigError('fetch-failed', `HTTP ${res.status} while loading ${url}.`);
        return res.json().catch(() => {
          throw new ConfigError('invalid-json', `${url} did not return valid JSON.`);
        });
      })
      .then((json) => {
        if (ctrl.signal.aborted) return;
        this.#raw = json;
        this.#rebuild();
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        if (err instanceof ConfigError) this.#fail(err.code, err.message);
        else this.#fail('fetch-failed', `Could not load ${url}.`);
      });
  }

  #rebuild() {
    if (this.#raw === undefined) return;
    try {
      const firstLoad = this.#status !== 'ready';
      this.#auditorium = normaliseConfig(this.#raw, { selectedSeatIds: this.selectedSeats, locale: this.#locale });
      this.#status = 'ready';
      this.#error = undefined;
      if (firstLoad) {
        this.#lastViewpointKey = '';
        this.#emit('seatview-load', {
          auditoriumId: this.#auditorium.id,
          name: this.#auditorium.name,
          seatCount: this.#auditorium.seats.length,
        });
      }
      this.#emitViewpoint();
    } catch (err) {
      if (err instanceof ConfigError) this.#fail(err.code, err.message);
      else this.#fail('invalid-config', 'The configuration could not be read.');
      return;
    }
    this.#render();
  }

  #fail(code: ConfigErrorCode, message: string) {
    this.#status = 'error';
    this.#error = message;
    this.#auditorium = null;
    this.#emit('seatview-error', { code, message });
    this.#render();
  }

  /** Emits the viewing metrics for the current seat (once per auditorium + seat), for analytics or UI. */
  #emitViewpoint() {
    const aud = this.#auditorium;
    const id = this.seat;
    if (this.#status !== 'ready' || !aud || !id) return;
    const key = `${aud.id}|${id}`;
    if (key === this.#lastViewpointKey) return;
    this.#lastViewpointKey = key;
    const seat = findSeat(aud, id);
    if (!seat) {
      this.#emit('seatview-error', { code: 'unknown-seat', message: `Seat "${id}" is not in auditorium "${aud.id}".` });
      return;
    }
    const vp = computeSeatViewpoint(seat, aud);
    this.#emit('seatview-viewpoint', {
      seatId: seat.id,
      row: seat.rowLabel,
      seat: seat.seatLabel,
      category: seat.category,
      distanceToScreen: round(vp.distanceToScreen),
      horizontalAngle: round(vp.horizontalAngleDeg, 1),
      verticalAngle: round(vp.verticalAngleDeg, 1),
      screenCoverage: round(vp.screenCoverageDeg, 1),
      rating: vp.rating,
    });
  }

  #render() {
    if (!this.#root) return;
    this.#root.render(
      createElement(SeatViewApp, {
        status: this.#status,
        error: this.#error,
        auditorium: this.#auditorium,
        mode: this.mode,
        open: this.isOpen,
        seatId: this.seat,
        selectedSeatIds: this.selectedSeats,
        locale: this.#locale,
        brand: this.getAttribute('brand') ?? undefined,
        portalContainer: this.#portal,
        onClose: () => this.close(),
        onSeatChange: (seatId: string) => {
          this.seat = seatId;
          this.#emit('seatview-seat-change', { seatId });
        },
        onExpand: () => this.open(),
      }),
    );
  }
}
