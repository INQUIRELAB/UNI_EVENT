"use client";

// The payoff: the SAME real events, flattened onto the image plane and accumulated
// over integration time. A single ~1 ms slice is unrecognizable noise; integrate
// the full window and two people walking emerge. Representation, felt.
// (No faked RGB — this clip is event-only; the event frame IS the honest answer.)

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { loadUniEvent, type Bundle, type Manifest } from "../lib/loadUniEvent";
import { PALETTE } from "../lib/palette";

const ON = new THREE.Color(PALETTE.on);
const OFF = new THREE.Color(PALETTE.off);

const vertexShader = /* glsl */ `
  attribute float aTime;   // normalized event time [0,1]
  attribute float aPol;    // 1 = ON, 0 = OFF
  uniform float uReveal;   // cumulative integration cursor [0,1]
  uniform float uSize;
  uniform vec3 uOn;
  uniform vec3 uOff;
  varying vec3 vColor;
  varying float vShow;
  void main() {
    vColor = mix(uOff, uOn, aPol);
    vShow = aTime <= uReveal ? 1.0 : 0.0;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(uSize * 4.0 / -mv.z, 1.0, 4.0);
    gl_Position = projectionMatrix * mv;
    if (vShow < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vShow;
  void main() {
    if (vShow < 0.5) discard;
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = dot(d, d);
    if (r > 0.25) discard;
    float a = smoothstep(0.25, 0.0, r) * 0.4;
    gl_FragColor = vec4(vColor, a);
  }
`;

function Points({ bundle, reveal }: { bundle: Bundle; reveal: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

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
      const px = (coords[i * 2] / W - 0.5) * 2 * asp;
      const py = (0.5 - coords[i * 2 + 1] / H) * 2;
      pos[i * 3] = px;
      pos[i * 3 + 1] = py;
      pos[i * 3 + 2] = 0; // FLAT — collapse time onto the image plane
      aTime[i] = (t[i] - t0) / tSpan;
      aPol[i] = p[i] > 0 ? 1 : 0;
      cx += px;
      cy += py;
    }
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
        uReveal: { value: 0 },
        uSize: { value: 1.35 },
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
  }, [bundle]);

  useEffect(() => {
    matRef.current = material;
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [material, geometry]);

  // smooth follow of the target reveal
  useFrame(() => {
    if (matRef.current) {
      const u = matRef.current.uniforms.uReveal;
      u.value += (reveal - u.value) * 0.25;
    }
  });

  return <points geometry={geometry} material={material} />;
}

export default function FrameAccumulator({
  reveal,
  onManifest,
}: {
  reveal: number;
  onManifest?: (m: Manifest) => void;
}) {
  const [bundle, setBundle] = useState<Bundle | null>(null);

  useEffect(() => {
    let alive = true;
    loadUniEvent("/data/spike")
      .then((b) => {
        if (!alive) return;
        setBundle(b);
        onManifest?.(b.manifest);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [onManifest]);

  return (
    <Canvas camera={{ position: [0, 0, 3.6], fov: 50 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={[PALETTE.bg]} />
      {bundle && <Points bundle={bundle} reveal={reveal} />}
    </Canvas>
  );
}
