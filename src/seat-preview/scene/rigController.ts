import { LOOK_LIMITS, clamp } from '../camera/seatCamera';

/**
 * Small imperative store shared between the UI (buttons, hints) and the camera rig.
 * It only holds the user's head movement relative to the seat's natural gaze; the rig
 * owns the base orientation computed from the selected seat.
 */
export interface RigState {
  yawOffset: number;
  pitchOffset: number;
  fov: number;
  /** True once the user has looked around or zoomed (used to fade the hint). */
  interacted: boolean;
  /** True while a seat-to-seat transition is playing. */
  transitioning: boolean;
}

export interface RigController {
  readonly state: RigState;
  /** Turn the head by a delta (radians). Clamped so the viewer never leaves the seat. */
  lookBy(dYaw: number, dPitch: number): void;
  /** Multiply the current zoom (fov) by a factor; < 1 zooms in. */
  zoomBy(factor: number): void;
  /** Return to the natural gaze and the default zoom. */
  reset(): void;
  subscribe(listener: () => void): () => void;
  /** @internal called by the rig */
  _set(partial: Partial<RigState>): void;
}

export function createRigController(): RigController {
  const state: RigState = {
    yawOffset: 0,
    pitchOffset: 0,
    fov: LOOK_LIMITS.fovDefault,
    interacted: false,
    transitioning: false,
  };
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  return {
    state,
    lookBy(dYaw, dPitch) {
      state.yawOffset = clamp(state.yawOffset + dYaw, -LOOK_LIMITS.yaw, LOOK_LIMITS.yaw);
      state.pitchOffset = clamp(state.pitchOffset + dPitch, -LOOK_LIMITS.pitch, LOOK_LIMITS.pitch);
      if (!state.interacted && (dYaw !== 0 || dPitch !== 0)) state.interacted = true;
      emit();
    },
    zoomBy(factor) {
      state.fov = clamp(state.fov * factor, LOOK_LIMITS.fovMin, LOOK_LIMITS.fovMax);
      state.interacted = true;
      emit();
    },
    reset() {
      state.yawOffset = 0;
      state.pitchOffset = 0;
      state.fov = LOOK_LIMITS.fovDefault;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    _set(partial) {
      Object.assign(state, partial);
      emit();
    },
  };
}
