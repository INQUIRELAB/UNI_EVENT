"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { MorphMode } from "./MorphScene";
import MountWhenNear from "./MountWhenNear";
import Reveal from "./Reveal";

const MorphScene = dynamic(() => import("./MorphScene"), { ssr: false });

// frame 2nd = legibility early; voxel last = strong structured close.
const ORDER: MorphMode[] = ["spike", "frame", "graph", "voxel"];

const INFO: Record<MorphMode, { label: string; blurb: string; call: string; dest: string }> = {
  spike: {
    label: "Spike",
    blurb: "Raw spikes — every event, microsecond-exact. The native form; what a spiking network consumes.",
    call: 'ue.represent(stream, as_="spike")',
    dest: "→ spiking neural nets · neuromorphic AI",
  },
  frame: {
    label: "Frame",
    blurb: "Time collapsed to a single picture — the event frame. Familiar to any ordinary vision model.",
    call: 'ue.represent(stream, as_="frame")',
    dest: "→ ordinary CNNs",
  },
  graph: {
    label: "Graph",
    blurb: "Events as nodes, linked by k-nearest neighbours in space-time. For graph neural networks.",
    call: 'ue.represent(stream, as_="graph")',
    dest: "→ graph neural nets",
  },
  voxel: {
    label: "Voxel",
    blurb: "Time bucketed into 16 discrete slabs — a sparse space-time grid. Fast, structured, conv-ready.",
    call: 'ue.represent(stream, as_="voxel")',
    dest: "→ sparse 3D-conv detectors",
  },
};

function statLine(mode: MorphMode, stats: Record<string, Record<string, number>>): string {
  const s = stats[mode];
  if (!s) return "";
  if (mode === "spike") return `${s.n_events?.toLocaleString()} raw spikes · (t, x, y, p)`;
  if (mode === "voxel") return `${s.n_voxels?.toLocaleString()} active voxels · ${s.bins} time bins · [off, on]`;
  if (mode === "frame") return `signed accumulation · ${s.n_events?.toLocaleString()} events`;
  if (mode === "graph") return `${s.num_nodes?.toLocaleString()} nodes · ${s.num_edges?.toLocaleString()} kNN edges`;
  return "";
}

export default function MorphSection() {
  const [mode, setMode] = useState<MorphMode>("spike");
  const [stats, setStats] = useState<Record<string, Record<string, number>>>({});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all(
      ORDER.map((m) =>
        fetch(`/data/${m}/manifest.json`)
          .then((r) => r.json())
          .then((j) => [m, j.stats] as const)
          .catch(() => [m, {}] as const)
      )
    ).then((pairs) => alive && setStats(Object.fromEntries(pairs)));
    return () => {
      alive = false;
    };
  }, []);

  const startTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setMode((prev) => ORDER[(ORDER.indexOf(prev) + 1) % ORDER.length]);
    }, 4500);
  };
  useEffect(() => {
    startTimer();
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const pick = (m: MorphMode) => {
    setMode(m);
    startTimer();
  };

  return (
    <section className="relative w-full bg-[var(--bg)] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
            {/* visual — left / center */}
            <div className="lg:col-span-7">
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
                <MountWhenNear className="aspect-[16/10] w-full" rootMargin="200px">
                  <MorphScene mode={mode} />
                </MountWhenNear>
                <div className="pointer-events-none absolute left-5 top-5 max-w-[46ch]">
                  <div className="text-base font-semibold text-white">{INFO[mode].label}</div>
                  <div className="mt-1 text-sm leading-snug text-[var(--fg)]">{INFO[mode].blurb}</div>
                  <div className="mono mt-1 text-xs text-[var(--off)]">{INFO[mode].dest}</div>
                </div>
              </div>
            </div>

            {/* text rail — middle-right */}
            <div className="lg:col-span-5">
              <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--muted)]">the unification · one stream, four ways</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                One clip. Every representation. One call.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--fg)]">
                The same 120,000 events, <span className="text-white">re-binned</span> four ways. Watch the{" "}
                <span className="text-white">time axis</span> reshape — continuous spikes, collapsed to a frame,
                rewired as a kNN graph, quantized into 16 voxel slabs. The counts are real{" "}
                <span className="mono text-white">unievent</span> output; the morph shows one canonical stream taking
                each shape.
              </p>

              {/* segmented control */}
              <div className="mt-6 inline-flex rounded-lg border border-white/12 bg-white/[0.03] p-1">
                {ORDER.map((m) => (
                  <button
                    key={m}
                    onClick={() => pick(m)}
                    className={`relative rounded-md px-4 py-1.5 text-sm transition ${
                      mode === m ? "text-white" : "text-[var(--muted)] hover:text-white"
                    }`}
                  >
                    {mode === m && (
                      <span className="absolute inset-0 rounded-md bg-[var(--on)]/15 ring-1 ring-[var(--on)]/40" />
                    )}
                    <span className="relative">{INFO[m].label}</span>
                  </button>
                ))}
              </div>

              {/* provenance line */}
              <div className="mono mt-5 flex flex-col gap-1 text-xs">
                <span className="text-emerald-300">{INFO[mode].call}</span>
                <span className="text-[var(--fg)]">→ {statLine(mode, stats)}</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
