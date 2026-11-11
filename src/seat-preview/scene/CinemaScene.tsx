import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { LOOK_LIMITS } from '../camera/seatCamera';
import type { Auditorium, SeatViewpoint } from '../types';
import { FirstPersonRig } from './FirstPersonRig';
import type { RigController } from './rigController';
import { Room } from './Room';
import { Screen } from './Screen';
import { Seats } from './Seats';

const CAMERA_CONFIG = { fov: LOOK_LIMITS.fovDefault, near: 0.05, far: 80 } as const;

export interface CinemaSceneProps {
  auditorium: Auditorium;
  viewpoint: SeatViewpoint;
  controller: RigController;
  /** Called after the first frame has been rendered. */
  onReady?: () => void;
  onError?: (error: unknown) => void;
  className?: string;
  /** When false the render loop is paused (e.g. an inline embed scrolled out of view). */
  active?: boolean;
  /** Mouse-wheel zoom; disable for inline embeds so the page keeps scrolling. */
  wheelZoom?: boolean;
}

/**
 * Self-contained React Three Fiber canvas rendering the auditorium from the selected seat.
 * The canvas only exists while the preview is open, so nothing renders during the normal booking flow.
 */
export function CinemaScene({
  auditorium,
  viewpoint,
  controller,
  onReady,
  onError,
  className,
  active = true,
  wheelZoom = true,
}: CinemaSceneProps) {
  // Device pixel ratio adapts to the measured frame rate so low-end phones stay smooth.
  const [dpr, setDpr] = useState<number>(() => Math.min(window.devicePixelRatio || 1, 1.75));
  // Unmounting disposes the renderer, which deliberately loses the WebGL context. That is not an error,
  // so context-loss reports are ignored once the scene is going away.
  const unmounted = useRef(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  useEffect(() => {
    unmounted.current = false;
    return () => {
      unmounted.current = true;
    };
  }, []);

  return (
    <Canvas
      className={className}
      dpr={dpr}
      frameloop={active ? 'always' : 'never'}
      // Static config only: the rig owns position and orientation from the first frame.
      camera={CAMERA_CONFIG}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
        outputColorSpace: SRGBColorSpace,
      }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          if (!unmounted.current) onErrorRef.current?.(new Error('webgl-context-lost'));
        });
        // First frame has been produced by the time the next animation frame fires.
        requestAnimationFrame(() => {
          if (!unmounted.current) onReady?.();
        });
      }}
    >
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(1, d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(Math.min(window.devicePixelRatio || 1, 1.75), d + 0.25))}
        flipflops={3}
      />
      <color attach="background" args={['#050508']} />
      <fog attach="fog" args={['#07070a', 14, 48]} />

      <hemisphereLight args={['#3a2f33', '#0b0a0d', 0.55]} />
      <ambientLight intensity={0.12} color="#ffd6b0" />

      <Screen auditorium={auditorium} />
      <Room auditorium={auditorium} />
      <Seats auditorium={auditorium} currentSeatId={viewpoint.seatId} />
      <FirstPersonRig viewpoint={viewpoint} controller={controller} wheelZoom={wheelZoom} />
      {import.meta.env.DEV && <DevFrameDriver />}
    </Canvas>
  );
}

/** Dev-only: lets automated checks render frames on demand when the tab's animation frames are throttled. */
function DevFrameDriver() {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    const w = window as unknown as { __seatPreviewAdvance?: (t: number) => void };
    w.__seatPreviewAdvance = (t) => advance(t, true);
    return () => {
      delete w.__seatPreviewAdvance;
    };
  }, [advance]);
  return null;
}
