"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float, Sparkles } from "@react-three/drei";
import { useMemo, useRef, Suspense } from "react";
import type { Mesh, Group } from "three";
import * as THREE from "three";

/**
 * Wissensgipfel — 3D "Twilight Summit" scene.
 *
 * Original 3D composition: layered mountain ridges at twilight, a winding
 * golden path to the summit with a glowing beacon, and a star field above.
 * Built with React Three Fiber + Drei. Honours `prefers-reduced-motion`.
 */

interface MountainProps {
  position: [number, number, number];
  color: string;
  scale?: number;
  speed?: number;
}

function MountainRidge({ position, color, scale = 1, speed = 0.05 }: MountainProps) {
  const mesh = useRef<Mesh>(null);
  useFrame((state) => {
    if (!mesh.current) return;
    // Gentle parallax drift — moves slightly with the camera.
    mesh.current.position.x = position[0] + Math.sin(state.clock.elapsedTime * speed) * 0.15;
  });

  // Build a stylised mountain silhouette using a cone with a flat back.
  return (
    <mesh ref={mesh} position={position} scale={scale}>
      <coneGeometry args={[3, 4, 6]} />
      <meshStandardMaterial
        color={color}
        roughness={0.85}
        metalness={0.1}
        flatShading
      />
    </mesh>
  );
}

function SummitBeacon() {
  const beacon = useRef<Mesh>(null);
  const glow = useRef<Mesh>(null);
  useFrame((state) => {
    if (!beacon.current || !glow.current) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 2) * 0.15;
    beacon.current.scale.setScalar(pulse);
    glow.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.3);
    glow.current.rotation.y = t * 0.3;
  });

  return (
    <group position={[0, 3.2, -4]}>
      {/* Beacon beam */}
      <mesh ref={beacon} position={[0, 1, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 3, 8]} />
        <meshStandardMaterial
          color="#FFC83D"
          emissive="#FFC83D"
          emissiveIntensity={2}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Glow halo */}
      <mesh ref={glow} position={[0, 1, 0]}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial
          color="#FFC83D"
          transparent
          opacity={0.18}
        />
      </mesh>
      {/* Summit flag */}
      <mesh position={[0, 2.6, 0]}>
        <boxGeometry args={[0.6, 0.35, 0.02]} />
        <meshStandardMaterial color="#FFC83D" emissive="#E59A00" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function GoldenPath() {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (!groupRef.current) return;
    // Subtle flowing shimmer along the path.
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.opacity !== undefined) {
        mat.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 1.5 + i * 0.4) * 0.2;
      }
    });
  });

  // A series of small glowing segments forming the winding path.
  const segments = useMemo(() => {
    const arr: Array<{ pos: [number, number, number]; scale: number }> = [];
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const x = Math.sin(t * Math.PI * 1.5) * 1.8;
      const y = -1.2 + t * 3.8;
      const z = -3 + t * 0.5;
      arr.push({ pos: [x, y, z], scale: 0.15 + t * 0.1 });
    }
    return arr;
  }, []);

  return (
    <group ref={groupRef}>
      {segments.map((s, i) => (
        <mesh key={i} position={s.pos} scale={s.scale}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial
            color="#FFC83D"
            emissive="#FFC83D"
            emissiveIntensity={1.5}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

function FloatingCrystal({ position, color, speed = 1 }: { position: [number, number, number]; color: string; speed?: number }) {
  return (
    <Float speed={speed * 2} rotationIntensity={0.6} floatIntensity={0.8}>
      <mesh position={position}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
          flatShading
        />
      </mesh>
    </Float>
  );
}

function CameraRig() {
  useFrame((state) => {
    // Slow gentle camera orbit.
    const t = state.clock.elapsedTime * 0.08;
    state.camera.position.x = Math.sin(t) * 1.5;
    state.camera.position.y = 0.5 + Math.sin(t * 0.7) * 0.3;
    state.camera.lookAt(0, 0.5, -3);
  });
  return null;
}

interface SceneProps {
  reducedMotion?: boolean;
}

function Scene({ reducedMotion = false }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.3} color="#8B6CFF" />
      <directionalLight position={[5, 8, 2]} intensity={0.6} color="#FFC83D" />
      <pointLight position={[-4, 2, -2]} intensity={0.4} color="#5CC8FF" />

      {/* Mountain layers — far to near */}
      <MountainRidge position={[-3, -0.5, -6]} color="#1C1A44" scale={2.2} speed={reducedMotion ? 0 : 0.03} />
      <MountainRidge position={[3, -0.8, -5]} color="#241F50" scale={2.0} speed={reducedMotion ? 0 : 0.04} />
      <MountainRidge position={[0, -1.2, -4]} color="#2A2766" scale={2.5} speed={reducedMotion ? 0 : 0.05} />
      <MountainRidge position={[-4, -1.5, -3]} color="#12102B" scale={1.8} speed={reducedMotion ? 0 : 0.06} />
      <MountainRidge position={[4, -1.5, -3]} color="#12102B" scale={1.8} speed={reducedMotion ? 0 : 0.06} />

      <SummitBeacon />
      {!reducedMotion && <GoldenPath />}

      {/* Floating crystals */}
      {!reducedMotion && (
        <>
          <FloatingCrystal position={[-2, 1.5, -3]} color="#8B6CFF" speed={0.8} />
          <FloatingCrystal position={[2.2, 2, -3.5]} color="#5CC8FF" speed={1.1} />
          <FloatingCrystal position={[-1.5, 2.8, -4]} color="#3DDBA4" speed={0.6} />
          <FloatingCrystal position={[1.8, 0.8, -2.5]} color="#FFC83D" speed={0.9} />
        </>
      )}

      {/* Sparkles along the path */}
      {!reducedMotion && (
        <Sparkles
          count={40}
          scale={[8, 4, 4]}
          position={[0, 1, -3]}
          size={2}
          speed={0.3}
          opacity={0.5}
          color="#FFC83D"
        />
      )}

      <Stars radius={50} depth={30} count={1500} factor={3} saturation={0.5} fade speed={reducedMotion ? 0 : 0.5} />

      {!reducedMotion && <CameraRig />}
    </>
  );
}

export function MountainScene3D({ className, reducedMotion = false }: { className?: string; reducedMotion?: boolean }) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.5, 3], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene reducedMotion={reducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}
