"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Manifest } from "./lib/loadUniEvent";
import { PALETTE } from "./lib/palette";
import AccumulationSection from "./components/AccumulationSection";
import MorphSection from "./components/MorphSection";
import TutorSection from "./components/TutorSection";
import ClosingSection from "./components/ClosingSection";
import SmoothScroll from "./components/SmoothScroll";
import Reveal from "./components/Reveal";
import SensorOpener from "./components/SensorOpener";
import PipelineSection from "./components/PipelineSection";
import MountWhenNear from "./components/MountWhenNear";

// R3F must run client-only (no SSR of WebGL).
const HeroCanvas = dynamic(() => import("./components/HeroCanvas"), { ssr: false });

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

export default function Home() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [revealKey, setRevealKey] = useState(0);

  const s = manifest?.stats;
  const src = manifest?.source;
  const res = manifest?.resolution;

  return (
    <main className="relative w-full">
      <SmoothScroll />
      <span id="top" />

      {/* first principles: why event cameras (flows into the hero) */}
      <SensorOpener />

      <section id="hero" className="relative h-[100svh] w-full overflow-hidden">
      {/* the performed hero — lazy-mounted so the reveal plays on arrival */}
      <MountWhenNear className="absolute inset-0" rootMargin="400px">
        <HeroCanvas onManifest={setManifest} revealKey={revealKey} />
      </MountWhenNear>

      {/* top-left identity */}
      <header className="pointer-events-none absolute left-6 top-6 max-w-[52ch]">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          UniEvent<span className="text-[var(--muted)]"> · the space-time of a sensor</span>
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          One suite, zero to hero — for event-based vision. This is a <b className="text-white">real</b> event
          stream: every dot is one event, born on its true microsecond timestamp.
        </p>
        <div className="mono mt-3 flex items-center gap-4 text-xs">
          <span>
            <span style={{ color: PALETTE.on }}>●</span> ON
          </span>
          <span>
            <span style={{ color: PALETTE.off }}>●</span> OFF
          </span>
          <span className="text-[var(--muted)]">drag to orbit</span>
        </div>
      </header>

      {/* integrity badge */}
      <div className="pointer-events-none absolute right-6 top-7 text-right text-xs">
        <span
          className="mono rounded px-2 py-1"
          style={{
            color: src?.simulated === 0 ? "#6ee7b7" : "#ffd166",
            background: src?.simulated === 0 ? "rgba(16,185,129,.12)" : "rgba(255,209,102,.12)",
          }}
        >
          {src ? (src.simulated === 0 ? "REAL · not simulated" : "SIMULATED — teaching only") : "loading…"}
        </span>
      </div>

      {/* provenance ticker — the merge, made visible */}
      <footer className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="mono flex flex-wrap items-center gap-x-5 gap-y-1 px-6 py-3 text-xs text-[var(--fg)]">
          <span className="text-[var(--muted)]">provenance</span>
          <span className="text-emerald-300">ue.represent(stream, as_=&quot;spike&quot;)</span>
          {s && (
            <>
              <span>
                → <b className="text-white">{fmt(s.n_events)}</b> real events
              </span>
              <span className="text-[var(--muted)]">·</span>
              <span>
                {res?.W}×{res?.H}
              </span>
              <span className="text-[var(--muted)]">·</span>
              <span>{(s.t_span_us / 1000).toFixed(0)} ms</span>
              <span className="text-[var(--muted)]">·</span>
              <span>{(s.on_frac * 100).toFixed(0)}% ON</span>
            </>
          )}
          {src && (
            <>
              <span className="text-[var(--muted)]">·</span>
              <span>
                {src.name}{" "}
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300">{src.license}</span>
              </span>
            </>
          )}
          <button
            onClick={() => setRevealKey((k) => k + 1)}
            className="pointer-events-auto ml-auto rounded border border-white/15 px-3 py-1 text-white/90 transition hover:border-white/40 hover:bg-white/5"
          >
            ↻ replay reveal
          </button>
        </div>
      </footer>

        {/* scroll cue — clickable, inviting */}
        <a
          href="#payoff"
          className="group absolute bottom-24 left-1/2 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 backdrop-blur-sm transition hover:border-white/50 hover:bg-white/10"
        >
          <span className="text-sm font-medium text-white">what am I looking at?</span>
          <span className="text-base text-[var(--on)] transition-transform group-hover:translate-y-0.5 motion-safe:animate-bounce">
            ↓
          </span>
        </a>
      </section>

      <AccumulationSection />
      <MorphSection />
      <PipelineSection />
      <Reveal>
        <TutorSection />
      </Reveal>
      <ClosingSection />
    </main>
  );
}
