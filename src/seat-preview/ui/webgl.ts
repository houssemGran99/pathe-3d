let cached: boolean | null = null;

/** Cheap, cached WebGL capability check run before the 3D bundle is loaded. */
export function isWebGLAvailable(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    cached = !!gl && typeof (gl as WebGLRenderingContext).getParameter === 'function';
    const lose = (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context');
    lose?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}

export const isTouchDevice = () =>
  typeof window !== 'undefined' && (navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches);
