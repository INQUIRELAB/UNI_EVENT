"use client";

// The performed hero: the REAL spike bundle rendered as an orbitable space-time
// point cloud (x×y = image plane, z = time). On load, events are born in real
// timestamp order — structure writing itself from scatter (the accumulation
// reveal). Polarity = color, a fresh "birth flash" makes each event feel alive.

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { loadUniEvent, type Bundle, type Manifest } from "../lib/loadUniEvent";
import { PALETTE } from "../lib/palette";

const ON = new THREE.Color(PALETTE.on);
const OFF = new THREE.Color(PALETTE.off);

const vertexShader = /* glsl */ `
  attribute float aTime;   // normalized event time [0,1]
  attribute float aPol;    // 1 = ON, 0 = OFF
  uniform float uTime;     // reveal cursor [0,1]
  uniform float uSize;
  uniform float uBirth;    // birth-flash window (in normalized time)
  uniform vec3 uOn;
  uniform vec3 uOff;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float age = uTime - aTime;              // >= 0 means this event has been born
    vColor = mix(uOff, uOn, aPol);
    float flash = age >= 0.0 ? smoothstep(uBirth, 0.0, age) : 0.0;  // 1 at birth -> 0
    float base = 0.38;
    vAlpha = age >= 0.0 ? base + (1.0 - base) * flash : 0.0;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float size = uSize * (1.0 + 1.6 * flash);
    gl_PointSize = clamp(size * 4.0 / -mv.z, 1.0, 7.0);  // perspective px size, capped
    gl_Position = projectionMatrix * mv;
    if (age < 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // cull unborn (off clip space)
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    if (vAlpha <= 0.0) discard;
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = dot(d, d);
    if (r > 0.25) discard;
    float a = smoothstep(0.25, 0.0, r) * vAlpha;   // soft round glow
    gl_FragColor = vec4(vColor, a);
  }
`;

export interface HeroControls {
  uTime: { value: number };
}

function Cloud({
  bundle,
  depth = 2.5,
  matRef,
}: {
  bundle: Bundle;
  depth?: number;
  matRef: React.MutableRefObject<THREE.ShaderMaterial | null>;
}) {
  const { geometry, material } = useMemo(() => {
    const t = bundle.buffers.t as Int32Array;
    const coords = bundle.buffers.coords as Int16Array;
    const p = bundle.buffers.p as Int8Array;
    const N = t.length;
    const { H, W } = bundle.manifest.resolution;
    const tSpan = bundle.manifest.stats.t_span_us || t[N - 1] - t[0] || 1;
    const t0 = t[0];
    const asp = W / H;

    const pos = new Float32Array(N * 3);
    const aTime = new Float32Array(N);
    const aPol = new Float32Array(N);
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < N; i++) {
      const x = coords[i * 2];
      const y = coords[i * 2 + 1];
      const tn = (t[i] - t0) / tSpan;
      const px = (x / W - 0.5) * 2 * asp; // x -> [-asp, asp]
      const py = (0.5 - y / H) * 2; // y -> [1, -1] (image y flipped)
      pos[i * 3] = px;
      pos[i * 3 + 1] = py;
      pos[i * 3 + 2] = (tn - 0.5) * depth; // t -> depth
      aTime[i] = tn;
      aPol[i] = p[i] > 0 ? 1 : 0;
      cx += px;
      cy += py;
    }
    // recenter the visual mass (events are left-weighted) on the orbit origin
    cx /= N;
    cy /= N;
    for (let i = 0; i < N; i++) {
      pos[i * 3] -= cx;
      pos[i * 3 + 1] -= cy;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geom.setAttribute("aTime", new THREE.BufferAttribute(aTime, 1));
    geom.setAttribute("aPol", new THREE.BufferAttribute(aPol, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 1 },
        uSize: { value: 1.9 },
        uBirth: { value: 0.05 },
        uOn: { value: ON },
        uOff: { value: OFF },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: geom, material: mat };
  }, [bundle, depth]);

  useEffect(() => {
    matRef.current = material;
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [material, geometry, matRef]);

  return <points geometry={geometry} material={material} />;
}

export default function HeroCanvas({
  onManifest,
  autoReveal = true,
  revealKey = 0,
}: {
  onManifest?: (m: Manifest) => void;
  autoReveal?: boolean;
  revealKey?: number;
}) {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const matRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    let alive = true;
    loadUniEvent("/data/spike")
      .then((b) => {
        if (b.representation !== "spike")
          throw new Error(`expected spike bundle, got ${b.representation}`);
        if (!alive) return;
        setBundle(b);
        onManifest?.(b.manifest);
      })
      .catch((e) => alive && setErr(String(e?.message ?? e)));
    return () => {
      alive = false;
    };
  }, [onManifest]);

  // performed accumulation reveal: drive uTime 0 -> 1 (also re-fires on revealKey)
  useEffect(() => {
    if (!bundle || !autoReveal || !matRef.current) return;
    const u = matRef.current.uniforms.uTime;
    u.value = 0;
    const tw = gsap.to(u, { value: 1, duration: 5.5, ease: "power1.inOut", delay: 0.25 });
    return () => {
      tw.kill();
    };
  }, [bundle, autoReveal, revealKey]);

  if (err)
    return (
      <div className="absolute inset-0 grid place-items-center p-8 text-center text-[#ff8a7a] mono">
        Viewer error: {err}
      </div>
    );

  return (
    <Canvas
      camera={{ position: [1.75, 1.0, 2.5], fov: 55, near: 0.01, far: 100 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={[PALETTE.bg]} />
      {bundle && <Cloud bundle={bundle} matRef={matRef} />}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        autoRotate
        autoRotateSpeed={0.45}
        enablePan={false}
        minDistance={1.3}
        maxDistance={7}
      />
    </Canvas>
  );
}
