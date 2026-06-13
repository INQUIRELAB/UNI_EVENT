"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { MorphMode } from "./MorphScene";

const MorphScene = dynamic(() => import("./MorphScene"), { ssr: false });

const ORDER: MorphMode[] = ["spike", "voxel", "frame", "graph"];

const INFO: Record<MorphMode, { label: string; blurb: string; call: string }> = {
  spike: {
    label: "Spike",
    blurb: "Raw spikes — every event, microsecond-exact. The native form; what a spiking network consumes.",
    call: 'ue.represent(stream, as_="spike")',
  },
  voxel: {
    label: "Voxel",
    blurb: "Time bucketed into 16 discrete slabs — a sparse space-time grid. Fast, structured, conv-ready.",
    call: 'ue.represent(stream, as_="voxel")',
  },
  frame: {
    label: "Frame",
    blurb: "Time collapsed to a single picture — the event frame. Familiar to any ordinary vision model.",
    call: 'ue.represent(stream, as_="frame")',
  },
  graph: {
    label: "Graph",
    blurb: "Events as nodes, linked by k-nearest neighbours in space-time. For graph neural networks.",
    call: 'ue.represent(stream, as_="graph")',
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

  // real stats from each bundle's manifest
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

  // auto-cycle (advances from current; manual selection just jumps + resets timer)
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
    <section className="relative w-full bg-[var(--bg)] py-20">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--muted)]">the unification · one stream, four ways</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          One clip. Every representation. One call.
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)]">
          The same 120,000 events, seen four ways. Watch the <span className="text-white">time axis</span> reshape —
          continuous spikes, quantized into voxel slabs, collapsed to a frame, rewired as a graph. Every view is
          real <span className="mono text-white">unievent</span> output from one canonical stream.
        </p>

        {/* toggles */}
        <div className="mt-6 flex flex-wrap gap-2">
          {ORDER.map((m) => (
            <button
              key={m}
              onClick={() => pick(m)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                mode === m
                  ? "border-[var(--on)]/60 bg-[var(--on)]/10 text-white"
                  : "border-white/15 text-[var(--muted)] hover:border-white/40 hover:text-white"
              }`}
            >
              {INFO[m].label}
            </button>
          ))}
        </div>

        <div className="relative mt-5 overflow-hidden rounded-xl border border-white/10 bg-black/30">
          <div className="h-[58vh] min-h-[440px] w-full">
            <MorphScene mode={mode} />
          </div>
          <div className="pointer-events-none absolute left-5 top-5 max-w-[44ch]">
            <div className="text-base font-semibold text-white">{INFO[mode].label}</div>
            <div className="mt-1 text-sm leading-snug text-[var(--muted)]">{INFO[mode].blurb}</div>
          </div>
        </div>

        {/* provenance line */}
        <div className="mono mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="text-emerald-300">{INFO[mode].call}</span>
          <span className="text-[var(--muted)]">→</span>
          <span className="text-[var(--fg)]">{statLine(mode, stats)}</span>
        </div>
      </div>
    </section>
  );
}
