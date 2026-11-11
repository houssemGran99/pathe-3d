import { useMemo } from 'react';
import type { Auditorium } from '../types';

interface Props {
  auditorium: Auditorium;
}

/**
 * The auditorium shell: stepped stadium floor, dark ribbed walls, ceiling, aisle step lights and
 * wall sconces. All geometry is procedural and sized from the auditorium model.
 */
export function Room({ auditorium }: Props) {
  const { room, rows, rowPitch, rowRise, seatPitch } = auditorium;
  const halfW = room.width / 2;
  const blockHalfW = (auditorium.seats.reduce((m, s) => Math.max(m, Math.abs(s.positionX)), 0) || 1) + seatPitch / 2;

  const steps = useMemo(() => {
    const out: { z: number; depth: number; y: number }[] = [];
    rows.forEach((r, i) => {
      const zStart = i === 0 ? 0 : r.z - rowPitch / 2;
      const zEnd = r.z + rowPitch / 2;
      out.push({ z: (zStart + zEnd) / 2, depth: zEnd - zStart, y: r.floorY });
    });
    const last = rows[rows.length - 1];
    if (last) {
      const zStart = last.z + rowPitch / 2;
      out.push({ z: (zStart + room.depth) / 2, depth: room.depth - zStart, y: last.floorY + rowRise });
    }
    return out;
  }, [rows, rowPitch, rowRise, room.depth]);

  const ribs = useMemo(() => {
    const out: number[] = [];
    for (let z = 1.2; z < room.depth - 0.6; z += 1.1) out.push(z);
    return out;
  }, [room.depth]);

  const sconces = useMemo(() => {
    const out: number[] = [];
    for (let z = 3; z < room.depth - 1; z += 4) out.push(z);
    return out;
  }, [room.depth]);

  const backY = (rows[rows.length - 1]?.floorY ?? 0) + rowRise;
  const stepThickness = 0.6;

  return (
    <group>
      {/* Stepped floor, one slab per row plus the back walkway. Each slab spans the full room width. */}
      {steps.map((s, i) => (
        <mesh key={i} position={[0, s.y - stepThickness / 2, s.z]}>
          <boxGeometry args={[room.width, stepThickness, s.depth]} />
          <meshStandardMaterial color={i === 0 ? '#101014' : '#1a1418'} roughness={0.98} />
        </mesh>
      ))}
      {/* Aisle carpet strips either side of the seating block, a shade lighter so the walkway reads. */}
      {steps.map((s, i) => (
        <group key={`aisle-${i}`}>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[side * (blockHalfW + (halfW - blockHalfW) / 2), s.y + 0.004, s.z]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[halfW - blockHalfW - 0.1, s.depth - 0.02]} />
              <meshStandardMaterial color="#2a1c22" roughness={1} />
            </mesh>
          ))}
          {/* Amber step-edge lights on the aisles. */}
          {i > 0 &&
            [-1, 1].map((side) => (
              <mesh
                key={`light-${side}`}
                position={[side * (blockHalfW + (halfW - blockHalfW) / 2), s.y + 0.012, s.z - s.depth / 2 + 0.06]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[halfW - blockHalfW - 0.3, 0.05]} />
                <meshStandardMaterial color="#ffb347" emissive="#ff9a2e" emissiveIntensity={2.2} toneMapped={false} />
              </mesh>
            ))}
        </group>
      ))}

      {/* Side walls with vertical acoustic ribs. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * halfW, room.height / 2 - 0.3, room.depth / 2]} rotation={[0, (-side * Math.PI) / 2, 0]}>
            <planeGeometry args={[room.depth, room.height + 1]} />
            <meshStandardMaterial color="#141317" roughness={0.97} />
          </mesh>
          {ribs.map((z) => (
            <mesh key={z} position={[side * (halfW - 0.08), room.height / 2 - 0.3, z]}>
              <boxGeometry args={[0.16, room.height + 1, 0.22]} />
              <meshStandardMaterial color="#1c1a1f" roughness={0.9} />
            </mesh>
          ))}
          {sconces.map((z) => (
            <group key={`sconce-${z}`} position={[side * (halfW - 0.2), 2.6 + (z / room.depth) * backY, z]}>
              <mesh>
                <boxGeometry args={[0.08, 0.5, 0.18]} />
                <meshStandardMaterial color="#ffd08a" emissive="#ffb050" emissiveIntensity={1.6} toneMapped={false} />
              </mesh>
              <pointLight color="#ffb060" intensity={2.2} distance={6} decay={2} position={[-side * 0.3, 0, 0]} />
            </group>
          ))}
        </group>
      ))}

      {/* Back wall with the projection booth window. */}
      <mesh position={[0, room.height / 2 - 0.3, room.depth]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[room.width, room.height + 1]} />
        <meshStandardMaterial color="#121115" roughness={0.97} />
      </mesh>
      <mesh position={[0, backY + 2.6, room.depth - 0.02]}>
        <planeGeometry args={[0.6, 0.3]} />
        <meshStandardMaterial color="#5c6b8c" emissive="#8fa6d9" emissiveIntensity={0.6} />
      </mesh>

      {/* Front wall behind the screen. */}
      <mesh position={[0, room.height / 2 - 0.3, -0.4]}>
        <planeGeometry args={[room.width, room.height + 1]} />
        <meshStandardMaterial color="#0a0a0c" roughness={1} />
      </mesh>

      {/* Ceiling with a few dimmed downlights. */}
      <mesh position={[0, room.height, room.depth / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial color="#0b0b0e" roughness={1} />
      </mesh>
      {[0.25, 0.5, 0.75].flatMap((fz) =>
        [-0.3, 0.3].map((fx) => (
          <mesh key={`${fz}-${fx}`} position={[fx * room.width, room.height - 0.02, fz * room.depth]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.09, 16]} />
            <meshStandardMaterial color="#ffe3b0" emissive="#ffd9a0" emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
        )),
      )}
    </group>
  );
}
