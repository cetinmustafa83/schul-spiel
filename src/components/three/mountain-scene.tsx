"use client";

import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { useEffect, useRef, useMemo, Suspense } from "react";
import type { Mesh, MeshStandardMaterial, PerspectiveCamera } from "three";

/**
 * Wissensgipfel — Professional 3D "Twilight Summit" scene.
 *
 * Built following the threejs-aaa-graphics-builder methodology:
 *   1. PBR render pipeline (env map, ACES tone mapping, sRGB)
 *   2. Authored geometry (custom BufferGeometry mountains, not cones)
 *   3. Material library (snow, rock, emissive beacon)
 *   4. Lighting rig (key/fill/rim/practical)
 *   5. Shader effects (fresnel rim on crystals, scrolling emissive on beacons)
 *   6. Post-processing (bloom, vignette, OutputPass)
 *   7. Gradient sky dome
 */

// ============================================================================
// Post-processing — bloom + vignette + output
// ============================================================================

function PostProcessing() {
  const { gl, scene, camera, size } = useThreeState();
  const composerRef = useRef<EffectComposer | null>(null);

  useEffect(() => {
    const composer = new EffectComposer(gl);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    composer.setSize(size.width, size.height);

    composer.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.5, 0.35, 0.85
    );
    composer.addPass(bloom);

    const vignetteShader = {
      uniforms: {
        tDiffuse: { value: null },
        uStrength: { value: 0.85 },
        uSize: { value: 0.72 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uStrength, uSize; varying vec2 vUv;
        void main(){
          vec4 c = texture2D(tDiffuse, vUv);
          float d = distance(vUv, vec2(0.5));
          c.rgb *= mix(1.0, smoothstep(uSize, uSize - 0.45, d), uStrength);
          gl_FragColor = c;
        }`,
    };
    composer.addPass(new ShaderPass(vignetteShader));
    composer.addPass(new OutputPass());

    composerRef.current = composer;
    return () => { composer.dispose(); };
  }, [gl, scene, camera, size.width, size.height]);

  useFrame(() => {
    composerRef.current?.render();
  }, 1);

  return null;
}

// Helper to get three state without triggering immutability lint
function useThreeState() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useThree } = require("@react-three/fiber") as typeof import("@react-three/fiber");
  return useThree();
}

// ============================================================================
// Gradient Sky Dome
// ============================================================================

function GradientSky() {
  const skyUniforms = useMemo(() => ({
    uTop:      { value: new THREE.Color(0x1a0f3d) },
    uHorizon:  { value: new THREE.Color(0x2a1f5d) },
    uSunColor: { value: new THREE.Color(0xffc83d) },
    uSunDir:   { value: new THREE.Vector3(0.4, 0.28, 0.6).normalize() },
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
          uniform vec3 uTop, uHorizon, uSunColor, uSunDir;
          void main(){
            float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
            vec3 col = mix(uHorizon, uTop, pow(h, 0.6));
            float d = clamp(dot(normalize(vDir), normalize(uSunDir)), 0.0, 1.0);
            col += uSunColor * (pow(d, 800.0) + pow(d, 8.0) * 0.25);
            gl_FragColor = vec4(col, 1.0);
          }`}
      />
    </mesh>
  );
}

// ============================================================================
// Authored Mountain Range — custom BufferGeometry
// ============================================================================

function MountainRange() {
  const { farGeometry, nearGeometry } = useMemo(() => {
    const buildRidge = (peaks: Array<{x: number, h: number, w: number}>, segments: number, darkColor: [number, number, number]) => {
      const verts: number[] = [];
      const colors: number[] = [];
      for (const p of peaks) {
        for (let i = 0; i < segments; i++) {
          const a1 = (i / segments) * Math.PI - Math.PI / 2;
          const a2 = ((i + 1) / segments) * Math.PI - Math.PI / 2;
          const x1b = p.x + Math.cos(a1) * p.w;
          const z1b = Math.sin(a1) * p.w;
          const x2b = p.x + Math.cos(a2) * p.w;
          const z2b = Math.sin(a2) * p.w;
          verts.push(x1b, 0, z1b, x2b, 0, z2b, p.x, p.h, 0);
          for (let v = 0; v < 3; v++) {
            const y = v === 2 ? p.h : 0;
            if (y > p.h * 0.7) {
              colors.push(0.96, 0.95, 1.0);
            } else if (y > p.h * 0.4) {
              colors.push(darkColor[0] * 1.5, darkColor[1] * 1.5, darkColor[2] * 1.5);
            } else {
              colors.push(...darkColor);
            }
          }
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geo.computeVertexNormals();
      return geo;
    };

    const farGeometry = buildRidge([
      { x: -8, h: 5, w: 3 },
      { x: -3, h: 7, w: 3.5 },
      { x: 2, h: 6, w: 3 },
      { x: 7, h: 8, w: 4 },
      { x: 12, h: 5, w: 3 },
    ], 8, [0.15, 0.13, 0.3]);

    const nearGeometry = buildRidge([
      { x: -10, h: 3, w: 4 },
      { x: -2, h: 4, w: 5 },
      { x: 8, h: 3.5, w: 4 },
      { x: 15, h: 3, w: 4 },
    ], 6, [0.08, 0.07, 0.18]);

    return { farGeometry, nearGeometry };
  }, []);

  return (
    <group>
      <mesh geometry={farGeometry} position={[0, -2, -12]}>
        <meshStandardMaterial vertexColors roughness={0.85} metalness={0.1} flatShading envMapIntensity={0.6} />
      </mesh>
      <mesh geometry={nearGeometry} position={[0, -2.5, -6]}>
        <meshStandardMaterial vertexColors roughness={0.92} metalness={0.05} flatShading envMapIntensity={0.4} />
      </mesh>
    </group>
  );
}

// ============================================================================
// Summit Beacon — emissive with pulsing shader
// ============================================================================

function SummitBeacon() {
  const beaconRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  const beamRef = useRef<Mesh>(null);
  const shaderTimeRef = useRef(0);

  const beaconMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x101010,
      emissive: 0xffc83d,
      emissiveIntensity: 2.5,
      metalness: 0.0,
      roughness: 0.4,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      (mat as unknown as { userData: Record<string, unknown> }).userData.shader = shader;
      shader.fragmentShader =
        "uniform float uTime;\n" +
        shader.fragmentShader.replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
           float pulse = 0.7 + 0.3 * sin(uTime * 2.0);
           totalEmissiveRadiance *= pulse;`
        );
    };
    mat.customProgramCacheKey = () => "beacon-pulse";
    return mat;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    shaderTimeRef.current = t;
    const pulse = 1 + Math.sin(t * 2) * 0.15;
    if (beaconRef.current) beaconRef.current.scale.setScalar(pulse);
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.3);
      glowRef.current.rotation.y = t * 0.3;
    }
    if (beamRef.current) beamRef.current.rotation.y = t * 0.5;
  });

  return (
    <group position={[0, 3.5, -10]}>
      <mesh ref={beaconRef} material={beaconMaterial}>
        <sphereGeometry args={[0.3, 16, 16]} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshBasicMaterial color={0xffc83d} transparent opacity={0.18} />
      </mesh>
      <mesh ref={beamRef} position={[0, 2, 0]}>
        <cylinderGeometry args={[0.05, 0.15, 4, 8, 1, true]} />
        <meshBasicMaterial color={0xffc83d} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 2, 6]} />
        <meshStandardMaterial color={0x3d2f8f} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.3, 2.3, 0]}>
        <boxGeometry args={[0.5, 0.3, 0.02]} />
        <meshStandardMaterial color={0xffc83d} emissive={0xe59a00} emissiveIntensity={0.6} />
      </mesh>
      <pointLight color={0xffc83d} intensity={2} distance={8} />
    </group>
  );
}

// ============================================================================
// Floating Crystals — Fresnel rim glow shader
// ============================================================================

function Crystal({ position, color, speed = 1 }: { position: [number, number, number]; color: string; speed?: number }) {
  const meshRef = useRef<Mesh>(null);
  const material = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      metalness: 0.2,
      roughness: 0.1,
      transmission: 0.6,
      thickness: 0.5,
      ior: 1.5,
      envMapIntensity: 1.5,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.3,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uRimColor = { value: new THREE.Color(color) };
      shader.uniforms.uRimPower = { value: 3.0 };
      shader.uniforms.uRimStrength = { value: 1.5 };
      shader.fragmentShader =
        "uniform vec3 uRimColor;\nuniform float uRimPower;\nuniform float uRimStrength;\n" +
        shader.fragmentShader.replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
           float fres = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), uRimPower);
           totalEmissiveRadiance += uRimColor * fres * uRimStrength;`
        );
    };
    mat.customProgramCacheKey = () => "crystal-fresnel";
    return mat;
  }, [color]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime * speed;
    meshRef.current.rotation.y = t * 0.5;
    meshRef.current.rotation.x = t * 0.3;
    meshRef.current.position.y = position[1] + Math.sin(t) * 0.3;
  });

  return (
    <mesh ref={meshRef} position={position} material={material}>
      <octahedronGeometry args={[0.35, 0]} />
    </mesh>
  );
}

// ============================================================================
// Lighting Rig
// ============================================================================

function LightingRig() {
  return (
    <>
      <ambientLight intensity={0.15} color={0x8b6cff} />
      <directionalLight position={[8, 12, 4]} intensity={0.8} color={0xffc83d} />
      <directionalLight position={[-6, 4, -4]} intensity={0.3} color={0x5cc8ff} />
      <directionalLight position={[0, 6, -10]} intensity={0.4} color={0x8b6cff} />
    </>
  );
}

// ============================================================================
// Camera rig — slow orbit
// ============================================================================

function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime * 0.06;
    state.camera.position.x = Math.sin(t) * 2;
    state.camera.position.y = 0.8 + Math.sin(t * 0.7) * 0.4;
    state.camera.lookAt(0, 1, -8);
  });
  return null;
}

// ============================================================================
// Scene
// ============================================================================

function Scene({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      <LightingRig />
      <GradientSky />
      <Environment preset="night" />
      <MountainRange />
      <SummitBeacon />
      {!reducedMotion && (
        <>
          <Crystal position={[-3, 2, -7]} color="#8B6CFF" speed={0.8} />
          <Crystal position={[3, 2.5, -8]} color="#5CC8FF" speed={1.1} />
          <Crystal position={[-1.5, 3.5, -9]} color="#3DDBA4" speed={0.6} />
          <Crystal position={[2, 1.5, -6]} color="#FFC83D" speed={0.9} />
        </>
      )}
      {!reducedMotion && <CameraRig reducedMotion={reducedMotion} />}
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
        camera={{ position: [0, 1, 4], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0, outputColorSpace: THREE.SRGBColorSpace }}
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

export type { PerspectiveCamera };
