import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, DoubleSide, RectAreaLight, ShaderMaterial, Vector3 } from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import type { Auditorium } from '../types';

let rectAreaInitialised = false;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Procedural "film" inspired by the reference photograph: a warm sky, a low sun and a golden field,
 * with gentle camera drift, film grain and a soft vignette. No texture download required.
 */
const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uAspect;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 11.3; a *= 0.5; }
    return v;
  }

  void main() {
    // Slow lateral drift, like a tracking shot.
    vec2 uv = vUv;
    uv.x += uTime * 0.004;

    float horizon = 0.46 + 0.01 * sin(uTime * 0.2);
    vec2 sun = vec2(0.62 + 0.02 * sin(uTime * 0.07), horizon + 0.12);

    // Sky: cream near the sun, pale peach at the top.
    vec3 skyTop = vec3(0.93, 0.80, 0.62);
    vec3 skyHorizon = vec3(1.0, 0.93, 0.78);
    float skyT = smoothstep(horizon, 1.0, uv.y);
    vec3 sky = mix(skyHorizon, skyTop, skyT);
    float sunDist = distance(vec2(uv.x * uAspect, uv.y), vec2(sun.x * uAspect, sun.y));
    sky += vec3(1.0, 0.95, 0.85) * (0.55 * exp(-sunDist * sunDist * 90.0) + 0.22 * exp(-sunDist * 4.0));

    // Field: golden wheat with heads catching the light and a gentle wind.
    float depth = clamp((horizon - uv.y) / horizon, 0.0, 1.0);
    vec2 fp = vec2(uv.x * (6.0 + depth * 40.0), uv.y * 70.0);
    float wind = sin(uv.x * 25.0 + uTime * 1.2 + uv.y * 10.0) * 0.5 + 0.5;
    float stalks = fbm(fp + vec2(uTime * 0.6 * wind, 0.0));
    float heads = smoothstep(0.55, 0.85, noise(fp * vec2(3.0, 0.6) + uTime * 0.15));
    vec3 fieldFar = vec3(0.98, 0.84, 0.56);
    vec3 fieldNear = vec3(0.62, 0.38, 0.14);
    vec3 field = mix(fieldNear, fieldFar, depth);
    field *= 0.75 + 0.5 * stalks;
    field += vec3(0.35, 0.25, 0.1) * heads * (0.3 + 0.7 * depth);
    // Backlight glow near the horizon.
    field = mix(field, skyHorizon, smoothstep(0.0, 0.18, 1.0 - (horizon - uv.y) / horizon) * 0.55 * (1.0 - smoothstep(0.0, 0.12, horizon - uv.y)));

    vec3 col = uv.y > horizon ? sky : field;

    // Soft haze band at the horizon.
    col = mix(col, vec3(1.0, 0.94, 0.8), 0.35 * exp(-pow((uv.y - horizon) * 22.0, 2.0)));

    // Film grain, vignette and gentle contrast.
    float grain = (hash(vUv * 1024.0 + fract(uTime * 7.0) * 100.0) - 0.5) * 0.045;
    col += grain;
    float vig = smoothstep(1.25, 0.35, distance(vUv, vec2(0.5)) * 1.4);
    col *= 0.85 + 0.15 * vig;
    // Projected images are never fully white: keep headroom so the tone mapper preserves detail.
    col = pow(col * 0.78, vec3(1.12));

    // Scope letterbox is intrinsic to the 2.39:1 screen; keep a thin matte at the top/bottom.
    float matte = step(0.012, vUv.y) * step(vUv.y, 0.988);
    gl_FragColor = vec4(col * matte, 1.0);
  }
`;

interface Props {
  auditorium: Auditorium;
}

/**
 * The cinema screen: an unlit emissive plane running the film shader, with black masking around it
 * and a RectAreaLight that bathes the seats in the picture's warm light.
 */
export function Screen({ auditorium }: Props) {
  const { screenWidth: w, screenHeight: h, screenPosition: p } = auditorium;
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uTime: { value: 0 }, uAspect: { value: w / h } },
        toneMapped: true,
      }),
    [w, h],
  );
  const lightRef = useRef<RectAreaLight>(null);
  const lightTarget = useMemo(() => new Vector3(p.x, p.y - 2, p.z + 30), [p]);
  const lightColour = useMemo(() => new Color('#ffd9a8'), []);

  useEffect(() => {
    if (!rectAreaInitialised) {
      RectAreaLightUniformsLib.init();
      rectAreaInitialised = true;
    }
    lightRef.current?.lookAt(lightTarget);
    return () => material.dispose();
  }, [material, lightTarget]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    material.uniforms.uTime.value = t;
    // Subtle flicker as the picture changes, like real projected light.
    const l = lightRef.current;
    if (l) l.intensity = 7.5 + Math.sin(t * 1.7) * 0.5 + Math.sin(t * 4.3) * 0.3;
  });

  const maskingDepth = 0.12;
  const border = 0.35;

  return (
    <group position={[p.x, p.y, p.z]}>
      <mesh material={material} frustumCulled={false}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <rectAreaLight ref={lightRef} args={[lightColour, 7.5, w, h]} position={[0, 0, 0.02]} />
      {/* Black masking frame around the picture. */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[w + border * 2, h + border * 2]} />
        <meshStandardMaterial color="#050505" roughness={1} side={DoubleSide} />
      </mesh>
      {/* Curtain pelmet above the screen. */}
      <mesh position={[0, h / 2 + border + 0.35, maskingDepth]}>
        <boxGeometry args={[w + border * 2 + 1.2, 0.7, maskingDepth * 2]} />
        <meshStandardMaterial color="#2a0b0f" roughness={0.95} />
      </mesh>
      {/* Low stage lip under the screen. */}
      <mesh position={[0, -h / 2 - border - 0.02, 0.4]}>
        <boxGeometry args={[w + border * 2 + 1.2, 0.08, 0.8]} />
        <meshStandardMaterial color="#111114" roughness={0.9} />
      </mesh>
    </group>
  );
}
