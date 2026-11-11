import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { MathUtils, PerspectiveCamera } from 'three';
import { LOOK_LIMITS } from '../camera/seatCamera';
import type { SeatViewpoint } from '../types';
import type { RigController } from './rigController';

interface Props {
  viewpoint: SeatViewpoint;
  controller: RigController;
  /** Seconds for a seat-to-seat transition. */
  transitionDuration?: number;
  onSettled?: () => void;
  wheelZoom?: boolean;
}

interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const shortestAngle = (from: number, to: number) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from));

/**
 * Keeps the camera at the viewer's eyes and applies the user's constrained head movement.
 *
 * - The base pose comes from the selected seat's viewpoint and is tweened when the seat changes
 *   (the camera glides from one seat to the other, rising/lowering with the stadium floor).
 * - Head movement and zoom are exponentially damped for a smooth, weighty feel.
 * - Pointer drag, wheel, pinch and arrow keys are handled on the canvas element.
 */
export function FirstPersonRig({ viewpoint, controller, transitionDuration = 1.4, onSettled, wheelZoom = true }: Props) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);

  const base = useRef<Pose>({
    x: viewpoint.position[0],
    y: viewpoint.position[1],
    z: viewpoint.position[2],
    yaw: viewpoint.yaw,
    pitch: viewpoint.pitch,
  });
  const tween = useRef<{ from: Pose; to: Pose; start: number } | null>(null);
  const smoothed = useRef({ yaw: 0, pitch: 0, fov: LOOK_LIMITS.fovDefault });
  const initialised = useRef(false);
  const lastSeatId = useRef<string | null>(null);
  const settledNotified = useRef(false);

  // Seat change: start a glide from the current base pose to the new viewpoint.
  useEffect(() => {
    const to: Pose = {
      x: viewpoint.position[0],
      y: viewpoint.position[1],
      z: viewpoint.position[2],
      yaw: viewpoint.yaw,
      pitch: viewpoint.pitch,
    };
    // Same pose again (StrictMode re-running effects, a parent re-render, or a rebuilt but identical
    // auditorium): nothing to glide to. A changed geometry for the same seat still moves the camera.
    const poseKey = [viewpoint.seatId, ...viewpoint.position, viewpoint.yaw, viewpoint.pitch].map((v) => (typeof v === 'number' ? v.toFixed(4) : v)).join('|');
    if (initialised.current && lastSeatId.current === poseKey) return;
    const seatChanged = !lastSeatId.current?.startsWith(`${viewpoint.seatId}|`);
    lastSeatId.current = poseKey;
    if (!initialised.current) {
      base.current = to;
      initialised.current = true;
      camera.position.set(to.x, to.y, to.z);
      camera.rotation.set(to.pitch, to.yaw, 0, 'YXZ');
      camera.fov = controller.state.fov;
      camera.updateProjectionMatrix();
      return;
    }
    tween.current = { from: { ...base.current }, to, start: performance.now() };
    // Keep the user's head position when only the room geometry changed (editing); reset it on a new seat.
    if (seatChanged) controller.reset();
    controller._set({ transitioning: true });
    settledNotified.current = false;
  }, [viewpoint, camera, controller]);

  // Input handling on the canvas.
  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDistance = 0;

    const sensitivity = () => (0.0042 * controller.state.fov) / LOOK_LIMITS.fovDefault;

    const onPointerDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      }
      el.style.cursor = 'grabbing';
    };
    const onPointerMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const next = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, next);
      if (pointers.size === 1) {
        // The picture follows the finger: dragging right reveals what is on the left.
        const s = sensitivity();
        controller.lookBy((next.x - prev.x) * s, (next.y - prev.y) * s);
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDistance > 0 && dist > 0) controller.zoomBy(pinchDistance / dist);
        pinchDistance = dist;
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (pointers.size === 0) el.style.cursor = 'grab';
      pinchDistance = 0;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      controller.zoomBy(e.deltaY > 0 ? 1.08 : 1 / 1.08);
    };
    const onKey = (e: KeyboardEvent) => {
      const step = 0.06;
      switch (e.key) {
        case 'ArrowLeft':
          controller.lookBy(step, 0);
          break;
        case 'ArrowRight':
          controller.lookBy(-step, 0);
          break;
        case 'ArrowUp':
          controller.lookBy(0, step);
          break;
        case 'ArrowDown':
          controller.lookBy(0, -step);
          break;
        case '+':
        case '=':
          controller.zoomBy(1 / 1.15);
          break;
        case '-':
          controller.zoomBy(1.15);
          break;
        case '0':
        case 'r':
        case 'R':
          controller.reset();
          break;
        default:
          return;
      }
      e.preventDefault();
    };

    el.style.cursor = 'grab';
    el.style.touchAction = 'none';
    el.tabIndex = 0;
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    if (wheelZoom) el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('keydown', onKey);
    };
  }, [gl, controller, wheelZoom]);

  useFrame((_, delta) => {
    // Large deltas (background tab, hitch) only make the damping converge faster; never explode.
    const dt = Math.min(delta, 0.25);

    // 1. Seat-to-seat glide, driven by wall-clock time so it lasts the same on any frame rate.
    const tw = tween.current;
    if (tw) {
      const t = Math.min(1, (performance.now() - tw.start) / (transitionDuration * 1000));
      const k = easeInOutCubic(t);
      const yawTo = shortestAngle(tw.from.yaw, tw.to.yaw);
      base.current = {
        x: MathUtils.lerp(tw.from.x, tw.to.x, k),
        // A slight arc so the camera does not clip through seat backs when moving between rows.
        y: MathUtils.lerp(tw.from.y, tw.to.y, k) + Math.sin(k * Math.PI) * 0.25,
        z: MathUtils.lerp(tw.from.z, tw.to.z, k),
        yaw: MathUtils.lerp(tw.from.yaw, yawTo, k),
        pitch: MathUtils.lerp(tw.from.pitch, tw.to.pitch, k),
      };
      if (t >= 1) {
        tween.current = null;
        base.current = { ...tw.to };
        controller._set({ transitioning: false });
      }
    }

    // 2. Damped head movement and zoom.
    const s = smoothed.current;
    const st = controller.state;
    const damp = 1 - Math.exp(-dt * 9);
    s.yaw += (st.yawOffset - s.yaw) * damp;
    s.pitch += (st.pitchOffset - s.pitch) * damp;
    s.fov += (st.fov - s.fov) * damp;

    const b = base.current;
    camera.position.set(b.x, b.y, b.z);
    camera.rotation.set(b.pitch + s.pitch, b.yaw + s.yaw, 0, 'YXZ');
    if (Math.abs(camera.fov - s.fov) > 0.01) {
      camera.fov = s.fov;
      camera.updateProjectionMatrix();
    }

    if (!tween.current && !settledNotified.current) {
      settledNotified.current = true;
      onSettled?.();
    }

    if (import.meta.env.DEV) {
      // Dev-only hook used by automated checks to read the live camera pose.
      (window as unknown as { __seatPreviewDebug?: unknown }).__seatPreviewDebug = {
        seatId: viewpoint.seatId,
        position: [camera.position.x, camera.position.y, camera.position.z],
        yaw: camera.rotation.y,
        pitch: camera.rotation.x,
        fov: camera.fov,
        transitioning: !!tween.current,
      };
    }
  });

  return null;
}
