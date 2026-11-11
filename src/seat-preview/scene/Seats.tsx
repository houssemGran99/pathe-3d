import { useEffect, useMemo } from 'react';
import { Color, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SEAT_DIMENSIONS as S } from '../geometry/auditorium';
import type { Auditorium, Seat } from '../types';

interface Props {
  auditorium: Auditorium;
  /** The seat the camera sits in: its backrest is hidden so it never clips the view. */
  currentSeatId: string | null;
}

const COLOURS = {
  velvet: new Color('#9c1620'),
  velvetSelected: new Color('#d8303c'),
  velvetWorn: new Color('#8a131c'),
  plastic: new Color('#15161a'),
};

interface Part {
  matrix: Matrix4;
  colour: Color;
}

const tmpPos = new Vector3();
const tmpQuat = new Quaternion();
const tmpScale = new Vector3();

function seatParts(seat: Seat, hideBackrest: boolean) {
  const cushions: Part[] = [];
  const backs: Part[] = [];
  const arms: Part[] = [];
  const bases: Part[] = [];

  const { positionX: x, positionY: y, positionZ: z } = seat;
  const colour =
    seat.status === 'selected' ? COLOURS.velvetSelected : seat.row % 2 === 0 ? COLOURS.velvet : COLOURS.velvetWorn;
  const place = (px: number, py: number, pz: number, sx: number, sy: number, sz: number, tiltX = 0) => {
    tmpQuat.setFromAxisAngle(new Vector3(1, 0, 0), tiltX);
    return new Matrix4().compose(tmpPos.set(px, py, pz), tmpQuat, tmpScale.set(sx, sy, sz));
  };

  // Cushion: slightly tilted back for comfort.
  cushions.push({
    matrix: place(x, y + S.cushionHeight - 0.08, z + 0.02, S.width, 0.16, S.depth, -0.06),
    colour,
  });
  // Backrest: a tall padded panel leaning back by ~12 degrees.
  if (!hideBackrest) {
    const backH = S.backHeight - 0.3;
    backs.push({
      matrix: place(x, y + 0.3 + backH / 2, z + S.depth / 2 - 0.04, S.width, backH, 0.14, -0.21),
      colour,
    });
  }
  // Base / pedestal under the cushion.
  bases.push({ matrix: place(x, y + 0.16, z + 0.05, S.width - 0.1, 0.32, S.depth - 0.14), colour: COLOURS.plastic });

  // Armrests, skipped on the side shared with a DUO neighbour.
  const armY = y + S.armrestHeight - 0.03;
  const armLen = S.depth + 0.06;
  if (seat.sharedArmrest !== 'left') {
    arms.push({
      matrix: place(x - S.width / 2 - S.armrestWidth / 2 + 0.01, armY, z, S.armrestWidth, 0.06, armLen),
      colour: COLOURS.plastic,
    });
    arms.push({
      matrix: place(x - S.width / 2 - S.armrestWidth / 2 + 0.01, y + 0.42, z + 0.08, S.armrestWidth - 0.02, 0.4, 0.12),
      colour: COLOURS.plastic,
    });
  }
  if (seat.sharedArmrest !== 'right') {
    arms.push({
      matrix: place(x + S.width / 2 + S.armrestWidth / 2 - 0.01, armY, z, S.armrestWidth, 0.06, armLen),
      colour: COLOURS.plastic,
    });
    arms.push({
      matrix: place(x + S.width / 2 + S.armrestWidth / 2 - 0.01, y + 0.42, z + 0.08, S.armrestWidth - 0.02, 0.4, 0.12),
      colour: COLOURS.plastic,
    });
  }
  return { cushions, backs, arms, bases };
}

function InstancedParts({
  parts,
  geometry,
  material,
}: {
  parts: Part[];
  geometry: RoundedBoxGeometry;
  material: MeshStandardMaterial;
}) {
  const mesh = useMemo(() => {
    const m = new InstancedMesh(geometry, material, Math.max(parts.length, 1));
    parts.forEach((p, i) => {
      m.setMatrixAt(i, p.matrix);
      m.setColorAt(i, p.colour);
    });
    m.count = parts.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.frustumCulled = false;
    return m;
  }, [parts, geometry, material]);
  useEffect(
    () => () => {
      mesh.dispose();
    },
    [mesh],
  );
  return <primitive object={mesh} />;
}

/**
 * Every seat of the auditorium rendered with four instanced meshes (cushion, backrest, armrests, base),
 * so a full room costs a handful of draw calls regardless of its size.
 */
export function Seats({ auditorium, currentSeatId }: Props) {
  const geometries = useMemo(
    () => ({
      cushion: new RoundedBoxGeometry(1, 1, 1, 3, 0.05),
      back: new RoundedBoxGeometry(1, 1, 1, 3, 0.06),
      arm: new RoundedBoxGeometry(1, 1, 1, 2, 0.02),
      base: new RoundedBoxGeometry(1, 1, 1, 1, 0.01),
    }),
    [],
  );
  const materials = useMemo(
    () => ({
      velvet: new MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, metalness: 0 }),
      plastic: new MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, metalness: 0.15 }),
    }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(geometries).forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
    },
    [geometries, materials],
  );

  const parts = useMemo(() => {
    const acc = { cushions: [] as Part[], backs: [] as Part[], arms: [] as Part[], bases: [] as Part[] };
    for (const seat of auditorium.seats) {
      if (seat.wheelchair) continue;
      const p = seatParts(seat, seat.id === currentSeatId);
      acc.cushions.push(...p.cushions);
      acc.backs.push(...p.backs);
      acc.arms.push(...p.arms);
      acc.bases.push(...p.bases);
    }
    return acc;
  }, [auditorium, currentSeatId]);

  return (
    <group>
      <InstancedParts parts={parts.cushions} geometry={geometries.cushion} material={materials.velvet} />
      <InstancedParts parts={parts.backs} geometry={geometries.back} material={materials.velvet} />
      <InstancedParts parts={parts.arms} geometry={geometries.arm} material={materials.plastic} />
      <InstancedParts parts={parts.bases} geometry={geometries.base} material={materials.plastic} />
      {/* Wheelchair spaces: a flat marked area instead of a chair. */}
      {auditorium.seats
        .filter((s) => s.wheelchair)
        .map((s) => (
          <mesh key={s.id} position={[s.positionX, s.positionY + 0.006, s.positionZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[S.width + 0.1, S.depth + 0.3]} />
            <meshStandardMaterial color="#1d2a44" roughness={0.8} emissive="#1a3a8a" emissiveIntensity={0.25} />
          </mesh>
        ))}
    </group>
  );
}
