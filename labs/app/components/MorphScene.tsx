"use client";

// "One stream, four ways." The SAME real events, morphing across representations:
//   spike  — continuous space-time cloud (time = depth)
//   voxel  — time quantized to 16 discrete slabs (what binning does)
//   frame  — time collapsed to one plane (the event frame)
//   graph  — a kNN graph in (x,y,t): nodes + edges (the real graph bundle)
// The cloud's TIME axis is what morphs (x,y are shared) — honest to what each
// representation actually keeps. Graph is the real graph bundle, faded in.

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { loadUniEvent, type Bundle } from "../lib/loadUniEvent";
import { PALETTE } from "../lib/palette";

export type MorphMode = "spike" | "voxel" | "frame" | "graph";

const ON = new THREE.Color(PALETTE.on);
const OFF = new THREE.Color(PALETTE.off);
const GRAPHC = new THREE.Color("#9ad8ff");
const DEPTH = 2.5;
const VOX_BINS = 16;

const cloudVert = /* glsl */ `
  attribute float aZspike;
  attribute float aZvox;
  attribute float aPol;
  uniform float uVox;    // 0 = spike z, 1 = voxel z
  uniform float uFlat;   // 1 = collapse to plane (frame)
  uniform float uCloud;  // overall cloud alpha
  uniform float uSize;
  uniform vec3 uOn;
  uniform vec3 uOff;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = mix(uOff, uOn, aPol);
    float z = mix(mix(aZspike, aZvox, uVox), 0.0, uFlat);
    vec3 pos = vec3(position.x, position.y, z);
    vAlpha = 0.42 * uCloud;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = clamp(uSize * 4.0 / -mv.z, 1.0, 6.0);
    gl_Position = projectionMatrix * mv;
    if (uCloud < 0.01) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  }
`;
const cloudFrag = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    if (dot(d, d) > 0.25) discard;
    float a = smoothstep(0.25, 0.0, dot(d, d)) * vAlpha;
    if (a <= 0.0) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

function map(coordsX: number, coordsY: number, W: number, H: number, asp: number) {
  return [(coordsX / W - 0.5) * 2 * asp, (0.5 - coordsY / H) * 2] as const;
}

function Scene({ spike, graph, mode }: { spike: Bundle; graph: Bundle | null; mode: MorphMode }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const graphMatRef = useRef<THREE.LineBasicMaterial>(null);
  const graphPtsRef = useRef<THREE.PointsMaterial>(null);

  // ---- cloud geometry (shared x,y; spike z + voxel z attributes) ----
  const { cloudGeom, cloudMat, cx, cy } = useMemo(() => {
    const t = spike.buffers.t as Int32Array;
    const coords = spike.buffers.coords as Int16Array;
    const p = spike.buffers.p as Int8Array;
    const N = t.length;
    const { H, W } = spike.manifest.resolution;
    const tSpan = spike.manifest.stats.t_span_us || t[N - 1] - t[0] || 1;
    const t0 = t[0];
    const asp = W / H;

    const pos = new Float32Array(N * 3);
    const aZspike = new Float32Array(N);
    const aZvox = new Float32Array(N);
    const aPol = new Float32Array(N);
    let mx = 0;
    let my = 0;
    for (let i = 0; i < N; i++) {
      const [px, py] = map(coords[i * 2], coords[i * 2 + 1], W, H, asp);
      const tn = (t[i] - t0) / tSpan;
      pos[i * 3] = px;
      pos[i * 3 + 1] = py;
      pos[i * 3 + 2] = 0;
      aZspike[i] = (tn - 0.5) * DEPTH;
      aZvox[i] = ((Math.floor(tn * VOX_BINS) + 0.5) / VOX_BINS - 0.5) * DEPTH; // 16 slabs
      aPol[i] = p[i] > 0 ? 1 : 0;
      mx += px;
      my += py;
    }
    mx /= N;
    my /= N;
    for (let i = 0; i < N; i++) {
      pos[i * 3] -= mx;
      pos[i * 3 + 1] -= my;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aZspike", new THREE.BufferAttribute(aZspike, 1));
    g.setAttribute("aZvox", new THREE.BufferAttribute(aZvox, 1));
    g.setAttribute("aPol", new THREE.BufferAttribute(aPol, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uVox: { value: 0 },
        uFlat: { value: 0 },
        uCloud: { value: 1 },
        uSize: { value: 1.9 },
        uOn: { value: ON },
        uOff: { value: OFF },
      },
      vertexShader: cloudVert,
      fragmentShader: cloudFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { cloudGeom: g, cloudMat: m, cx: mx, cy: my };
  }, [spike]);

  // ---- graph geometry (nodes + edges), aligned to the cloud centroid ----
  const graphObjs = useMemo(() => {
    if (!graph) return null;
    const nodes = graph.buffers.nodes as Float32Array; // (Nn,3) [x,y,t] (t zero-based us)
    const edges = graph.buffers.edges as Int32Array; // (2,E)
    const { H, W } = graph.manifest.resolution;
    const asp = W / H;
    const tSpan = spike.manifest.stats.t_span_us || 1;
    const Nn = nodes.length / 3;
    const np = new Float32Array(Nn * 3);
    for (let i = 0; i < Nn; i++) {
      const [px, py] = map(nodes[i * 3], nodes[i * 3 + 1], W, H, asp);
      np[i * 3] = px - cx;
      np[i * 3 + 1] = py - cy;
      np[i * 3 + 2] = (nodes[i * 3 + 2] / tSpan - 0.5) * DEPTH;
    }
    const E = edges.length / 2;
    const linePos = new Float32Array(E * 2 * 3);
    for (let e = 0; e < E; e++) {
      const a = edges[e];
      const b = edges[E + e];
      linePos.set([np[a * 3], np[a * 3 + 1], np[a * 3 + 2]], e * 6);
      linePos.set([np[b * 3], np[b * 3 + 1], np[b * 3 + 2]], e * 6 + 3);
    }
    const ng = new THREE.BufferGeometry();
    ng.setAttribute("position", new THREE.BufferAttribute(np, 3));
    const eg = new THREE.BufferGeometry();
    eg.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    return { ng, eg };
  }, [graph, spike, cx, cy]);

  useEffect(() => {
    matRef.current = cloudMat;
    return () => {
      cloudGeom.dispose();
      cloudMat.dispose();
    };
  }, [cloudMat, cloudGeom]);

  // ---- transitions ----
  useEffect(() => {
    const u = cloudMat.uniforms;
    const target = {
      spike: { uVox: 0, uFlat: 0, uCloud: 1, graph: 0 },
      voxel: { uVox: 1, uFlat: 0, uCloud: 1, graph: 0 },
      frame: { uVox: 0, uFlat: 1, uCloud: 1, graph: 0 },
      graph: { uVox: 0, uFlat: 0, uCloud: 0, graph: 1 },
    }[mode];
    const tl = gsap.timeline();
    tl.to(u.uVox, { value: target.uVox, duration: 1.1, ease: "power2.inOut" }, 0);
    tl.to(u.uFlat, { value: target.uFlat, duration: 1.1, ease: "power2.inOut" }, 0);
    tl.to(u.uCloud, { value: target.uCloud, duration: 0.8, ease: "power2.inOut" }, 0);
    const ga = { v: graphMatRef.current?.opacity ?? 0 };
    tl.to(
      ga,
      {
        v: target.graph,
        duration: 0.8,
        ease: "power2.inOut",
        onUpdate: () => {
          if (graphMatRef.current) graphMatRef.current.opacity = ga.v * 0.5;
          if (graphPtsRef.current) graphPtsRef.current.opacity = ga.v;
        },
      },
      0
    );
    return () => {
      tl.kill();
    };
  }, [mode, cloudMat]);

  return (
    <>
      <points geometry={cloudGeom} material={cloudMat} />
      {graphObjs && (
        <>
          <lineSegments geometry={graphObjs.eg}>
            <lineBasicMaterial
              ref={graphMatRef}
              color={GRAPHC}
              transparent
              opacity={0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </lineSegments>
          <points geometry={graphObjs.ng}>
            <pointsMaterial
              ref={graphPtsRef}
              color={GRAPHC}
              size={0.035}
              transparent
              opacity={0}
              depthWrite={false}
              sizeAttenuation
            />
          </points>
        </>
      )}
    </>
  );
}

export default function MorphScene({ mode }: { mode: MorphMode }) {
  const [spike, setSpike] = useState<Bundle | null>(null);
  const [graph, setGraph] = useState<Bundle | null>(null);

  useEffect(() => {
    let alive = true;
    loadUniEvent("/data/spike").then((b) => alive && setSpike(b)).catch(() => {});
    loadUniEvent("/data/graph").then((b) => alive && setGraph(b)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Canvas camera={{ position: [1.7, 0.9, 2.6], fov: 55 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={[PALETTE.bg]} />
      {spike && <Scene spike={spike} graph={graph} mode={mode} />}
      <OrbitControls enableDamping dampingFactor={0.08} autoRotate autoRotateSpeed={0.35} enablePan={false} enableZoom={false} />
    </Canvas>
  );
}
