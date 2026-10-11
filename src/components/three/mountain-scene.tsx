"use client";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Stars } from "@react-three/drei";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { useEffect, useRef, useMemo, Suspense } from "react";
import type { Mesh, Group } from "three";

/**
 * Wissensgipfel — Cinematic "Twilight Summit" scene.
 *
 * Neutral, sophisticated aesthetic — not childish. Inspired by:
 *   - Atmospheric mountain films (The Revenant, Lord of the Rings)
 *   - Architectural visualization lighting
 *   - AAA game environment art (Horizon Zero Dawn, Death Stranding)
 *
 * Palette: deep twilight blues, muted purples, subtle warm rim.
 * No cartoony beams or saturated colors.
 */

// ============================================================================
// Post-Processing — cinematic bloom + vignette + color grade
// ============================================================================

function PostProcessing() {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);

  useEffect(() => {
    const composer = new EffectComposer(gl);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    composer.setSize(size.width, size.height);

    composer.addPass(new RenderPass(scene, camera));

    // Subtle bloom — only on emissive highlights
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.35,  // strength — subtle
      0.4,   // radius
      0.9    // threshold — only brightest
    );
    composer.addPass(bloom);

    // Cinematic vignette + color grade
    const cinematicShader = {
      uniforms: {
        tDiffuse: { value: null },
        uVignette: { value: 0.9 },
        uVignetteSize: { value: 0.65 },
        uContrast: { value: 1.08 },
        uSaturation: { value: 0.85 }, // desaturate slightly for cinematic feel
        uTint: { value: new THREE.Color(0x1a1a2e) },
        uTintAmount: { value: 0.12 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse;
        uniform float uVignette, uVignetteSize, uContrast, uSaturation, uTintAmount;
        uniform vec3 uTint;
        varying vec2 vUv;
        void main(){
          vec4 c = texture2D(tDiffuse, vUv);
          // Vignette
          float d = distance(vUv, vec2(0.5));
          c.rgb *= mix(1.0, smoothstep(uVignetteSize, uVignetteSize - 0.5, d), uVignette);
          // Contrast
          c.rgb = (c.rgb - 0.5) * uContrast + 0.5;
          // Desaturate (luminance blend)
          float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
          c.rgb = mix(vec3(lum), c.rgb, uSaturation);
          // Subtle cool tint
          c.rgb = mix(c.rgb, c.rgb * uTint, uTintAmount);
          gl_FragColor = c;
        }`,
    };
    composer.addPass(new ShaderPass(cinematicShader));
    composer.addPass(new OutputPass());

    composerRef.current = composer;
    return () => { composer.dispose(); };
  }, [gl, scene, camera, size.width, size.height]);

  useFrame(() => {
    composerRef.current?.render();
  }, 1);

  return null;
}

// ============================================================================
// Atmospheric Sky — muted twilight gradient
// ============================================================================

function AtmosphericSky() {
  const skyUniforms = useMemo(() => ({
    uTop:      { value: new THREE.Color(0x0a0e1a) },      // deep navy
    uHorizon:  { value: new THREE.Color(0x1e1b3a) },      // muted purple
    uBottom:   { value: new THREE.Color(0x0d0a1f) },      // dark violet
    uSunColor: { value: new THREE.Color(0x4a5568) },      // muted warm grey (not bright yellow)
    uSunDir:   { value: new THREE.Vector3(0.3, 0.15, 0.6).normalize() },
  }), []);

  return (
    <mesh frustumCulled={false} scale={[500, 500, 500]}>
      <sphereGeometry args={[1, 32, 16]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={skyUniforms}
        vertexShader={`varying vec3 vDir;
          void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
        fragmentShader={`varying vec3 vDir;
          uniform vec3 uTop, uHorizon, uBottom, uSunColor, uSunDir;
          void main(){
            float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
            vec3 col;
            if (h > 0.5) {
              col = mix(uHorizon, uTop, pow((h - 0.5) * 2.0, 0.7));
            } else {
              col = mix(uBottom, uHorizon, pow(h * 2.0, 0.8));
            }
            // Subtle sun glow (not a disc — atmospheric scatter)
            float d = clamp(dot(normalize(vDir), normalize(uSunDir)), 0.0, 1.0);
            col += uSunColor * pow(d, 4.0) * 0.15;
            gl_FragColor = vec4(col, 1.0);
          }`}
      />
    </mesh>
  );
}

// ============================================================================
// Realistic Mountain Range — layered, atmospheric, with snow
// ============================================================================

function MountainLayer({ peaks, z, color, snowColor, roughness, segments = 12 }: {
  peaks: Array<{x: number, h: number, w: number}>;
  z: number;
  color: string;
  snowColor: string;
  roughness: number;
  segments?: number;
}) {
  const geometry = useMemo(() => {
    const verts: number[] = [];
    const colors: number[] = [];
    const normals: number[] = [];

    for (const p of peaks) {
      // Build a proper mountain shape with multiple segments
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI - Math.PI / 2;
        const a2 = ((i + 1) / segments) * Math.PI - Math.PI / 2;

        // Base ring
        const x1b = p.x + Math.cos(a1) * p.w;
        const z1b = Math.sin(a1) * p.w;
        const x2b = p.x + Math.cos(a2) * p.w;
        const z2b = Math.sin(a2) * p.w;

        // Mid point (halfway up)
        const x1m = p.x + Math.cos(a1) * p.w * 0.6;
        const z1m = Math.sin(a1) * p.w * 0.6;
        const x2m = p.x + Math.cos(a2) * p.w * 0.6;
        const z2m = Math.sin(a2) * p.w * 0.6;

        // Peak
        const xp = p.x;
        const yp = p.h;
        const zp = 0;

        // Triangle 1: base1, base2, mid1
        verts.push(x1b, 0, z1b, x2b, 0, z2b, x1m, p.h * 0.5, z1m);
        // Triangle 2: base2, mid2, mid1
        verts.push(x2b, 0, z2b, x2m, p.h * 0.5, z2m, x1m, p.h * 0.5, z1m);
        // Triangle 3: mid1, mid2, peak
        verts.push(x1m, p.h * 0.5, z1m, x2m, p.h * 0.5, z2m, xp, yp, zp);

        // Vertex colors — gradient from base (dark) to peak (snow)
        for (let v = 0; v < 9; v++) {
          const y = v % 3 === 2 ? yp : (v < 3 ? 0 : p.h * 0.5);
          const snowLine = p.h * 0.75;
          const rockLine = p.h * 0.4;
          if (y > snowLine) {
            // Snow — bright but not pure white
            colors.push(0.78, 0.82, 0.88);
          } else if (y > rockLine) {
            // Rock — gradient
            const t = (y - rockLine) / (snowLine - rockLine);
            colors.push(0.12 + t * 0.08, 0.11 + t * 0.07, 0.16 + t * 0.08);
          } else {
            // Dark base
            colors.push(0.05, 0.045, 0.08);
          }
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [peaks, segments]);

  return (
    <mesh geometry={geometry} position={[0, -2, z]}>
      <meshStandardMaterial
        vertexColors
        roughness={roughness}
        metalness={0.05}
        flatShading
        envMapIntensity={0.5}
      />
    </mesh>
  );
}

function MountainRange() {
  return (
    <group>
      {/* Far ridge — atmospheric, hazy */}
      <MountainLayer
        peaks={[
          { x: -12, h: 6, w: 4 },
          { x: -5, h: 8, w: 4.5 },
          { x: 2, h: 7, w: 4 },
          { x: 9, h: 9, w: 5 },
          { x: 16, h: 6, w: 4 },
        ]}
        z={-14}
        color="#1a1a2e"
        snowColor="#7a8090"
        roughness={0.95}
        segments={14}
      />
      {/* Mid ridge */}
      <MountainLayer
        peaks={[
          { x: -8, h: 4, w: 4.5 },
          { x: 0, h: 5, w: 5 },
          { x: 8, h: 4.5, w: 4.5 },
        ]}
        z={-8}
        color="#0d0d1a"
        snowColor="#5a6070"
        roughness={0.98}
        segments={10}
      />
      {/* Near ridge — dark silhouettes */}
      <MountainLayer
        peaks={[
          { x: -10, h: 2.5, w: 5 },
          { x: -2, h: 3, w: 6 },
          { x: 8, h: 2.8, w: 5 },
          { x: 16, h: 2.5, w: 5 },
        ]}
        z={-3}
        color="#050510"
        snowColor="#3a3a4a"
        roughness={1.0}
        segments={8}
      />
    </group>
  );
}

// ============================================================================
// Atmospheric Fog — volumetric depth
// ============================================================================

function AtmosphericFog() {
  const fogRef = useRef<Mesh>(null);
  useFrame((state) => {
    if (!fogRef.current) return;
    const t = state.clock.elapsedTime;
    fogRef.current.position.x = Math.sin(t * 0.1) * 2;
  });

  return (
    <mesh ref={fogRef} position={[0, 1, -6]}>
      <planeGeometry args={[40, 8]} />
      <meshBasicMaterial
        color={0x1a1a2e}
        transparent
        opacity={0.3}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ============================================================================
// Volumetric God Rays — subtle, atmospheric (NOT a beam cylinder)
// ============================================================================

function GodRays() {
  const groupRef = useRef<Group>(null);

  // Create subtle light shafts using planes with gradient shader
  const rayMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x3a4055) }, // muted warm grey
        uOpacity: { value: 0.15 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          // Vertical gradient — brighter at top, fades down
          float vertical = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
          // Horizontal soft edges
          float horizontal = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
          // Subtle shimmer
          float shimmer = 0.9 + 0.1 * sin(uTime * 0.5 + vUv.y * 4.0);
          float alpha = vertical * horizontal * uOpacity * shimmer;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });
  }, []);

  useFrame((state) => {
    godRayShaderUpdate(groupRef, state.clock.elapsedTime);
  });

  return (
    <group ref={groupRef} position={[2, 6, -12]}>
      {/* 3 subtle light shafts at different angles */}
      <mesh material={rayMaterial} position={[0, 0, 0]} rotation={[0, 0, 0.1]}>
        <planeGeometry args={[1.5, 12, 1, 1]} />
      </mesh>
      <mesh material={rayMaterial} position={[1.5, 0, 0]} rotation={[0, 0, -0.05]}>
        <planeGeometry args={[1.2, 10, 1, 1]} />
      </mesh>
      <mesh material={rayMaterial} position={[-1.2, 0, 0]} rotation={[0, 0, 0.15]}>
        <planeGeometry args={[1.3, 11, 1, 1]} />
      </mesh>
    </group>
  );
}

function godRayShaderUpdate(groupRef: React.RefObject<Group | null>, time: number) {
  if (!groupRef.current) return;
  groupRef.current.children.forEach((child) => {
    const mesh = child as Mesh;
    const mat = mesh.material as THREE.ShaderMaterial;
    if (mat && mat.uniforms && mat.uniforms.uTime) {
      mat.uniforms.uTime.value = time;
    }
  });
}

// ============================================================================
// Summit Glow — subtle, atmospheric (NOT a beacon)
// ============================================================================

function SummitGlow() {
  const glowRef = useRef<Mesh>(null);
  useFrame((state) => {
    if (!glowRef.current) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 0.8) * 0.1;
    glowRef.current.scale.setScalar(pulse);
    glowRef.current.rotation.y = t * 0.1;
  });

  return (
    <group position={[9, 5, -14]}>
      {/* Subtle glow sphere — atmospheric, not a beacon */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial
          color={0x4a5568}
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>
      {/* Practical light — subtle warm */}
      <pointLight color={0x6a7a90} intensity={0.5} distance={12} />
    </group>
  );
}

// ============================================================================
// Drifting Particles — subtle atmospheric dust (not cartoony)
// ============================================================================

function AtmosphericParticles({ count = 80 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 10;
      positions[i * 3 + 2] = -Math.random() * 15 - 2;
      sizes[i] = Math.random() * 0.05 + 0.02;
    }
    return { positions, sizes };
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime;
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      positions[i * 3] += Math.sin(t * 0.2 + i) * 0.002;
      positions[i * 3 + 1] += Math.sin(t * 0.3 + i * 0.5) * 0.003 - 0.005;
      if (positions[i * 3 + 1] < 0) positions[i * 3 + 1] = 10;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color={0x8a8aa0}
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ============================================================================
// Lighting Rig — cinematic, moody
// ============================================================================

function CinematicLighting() {
  return (
    <>
      {/* Low ambient — moody */}
      <ambientLight intensity={0.08} color={0x3a4055} />
      {/* Key light — cool, from the side (moonlight feel) */}
      <directionalLight
        position={[-8, 10, 2]}
        intensity={0.4}
        color={0x6a7a9a}
      />
      {/* Rim light — subtle warm, behind (sunset glow) */}
      <directionalLight
        position={[8, 4, -10]}
        intensity={0.25}
        color={0x8a7a6a}
      />
      {/* Fill — very subtle, cool */}
      <hemisphereLight args={[0x2a2a4a, 0x0a0a14, 0.15]} />
    </>
  );
}

// ============================================================================
// Camera rig — slow, smooth dolly
// ============================================================================

function CinematicCamera({ reducedMotion }: { reducedMotion: boolean }) {
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime * 0.03;
    // Very slow, smooth dolly — no fast motion
    state.camera.position.x = Math.sin(t) * 1.2;
    state.camera.position.y = 1.2 + Math.sin(t * 0.5) * 0.2;
    state.camera.position.z = 4 + Math.cos(t * 0.3) * 0.5;
    state.camera.lookAt(0, 2, -10);
  });
  return null;
}

// ============================================================================
// Scene
// ============================================================================

function Scene({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      <CinematicLighting />
      <AtmosphericSky />
      <Environment preset="night" />
      <MountainRange />
      <AtmosphericFog />
      <GodRays />
      <SummitGlow />
      {!reducedMotion && <AtmosphericParticles count={60} />}
      {!reducedMotion && (
        <Stars
          radius={100}
          depth={50}
          count={800}
          factor={4}
          saturation={0}
          fade
          speed={reducedMotion ? 0 : 0.3}
        />
      )}
      {!reducedMotion && <CinematicCamera reducedMotion={reducedMotion} />}
    </>
  );
}

// ============================================================================
// Export
// ============================================================================

interface MountainScene3DProps {
  className?: string;
  reducedMotion?: boolean;
}

export function MountainScene3D({ className, reducedMotion = false }: MountainScene3DProps) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 1.2, 4], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.95,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene reducedMotion={reducedMotion} />
          <PostProcessing />
        </Suspense>
      </Canvas>
    </div>
  );
}
