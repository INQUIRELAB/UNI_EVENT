"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Manifest } from "../lib/loadUniEvent";

const FrameAccumulator = dynamic(() => import("./FrameAccumulator"), { ssr: false });

// inOutQuad
const ease = (e: number) => (e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2);

export default function AccumulationSection() {
  const [reveal, setReveal] = useState(0);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [autoKey, setAutoKey] = useState(0);
  const raf = useRef(0);

  // autoplay 0 -> 1 over ~5.5s (re-fires on autoKey)
  useEffect(() => {
    let mounted = true;
    let start = 0;
    const dur = 5500;
    setReveal(0);
    const step = (ts: number) => {
      if (!start) start = ts;
      const e = Math.min((ts - start) / dur, 1);
      if (mounted) setReveal(ease(e));
      if (e < 1 && mounted) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      mounted = false;
      cancelAnimationFrame(raf.current);
    };
  }, [autoKey]);

  const tSpanMs = manifest ? manifest.stats.t_span_us / 1000 : 500;
  const N = manifest ? manifest.stats.n_events : 120000;
  const ms = reveal * tSpanMs;
  const count = Math.round(reveal * N);
  // a "1 ms slice" is unrecognizable; the full window is two people.
  const legible = reveal > 0.78;
  const tiny = ms < 6;

  return (
    <section className="relative w-full bg-[var(--bg)] py-20">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--muted)]">the payoff · representation is everything</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          So… what were you looking at?
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)]">
          A single millisecond of an event camera is almost nothing — a few hundred sparse spikes tracing the
          edges of whatever moved. Too thin to be sure what it is. Now{" "}
          <span className="text-white">integrate over time</span>: accumulate those same events onto the image
          plane and watch the scene fill in.
        </p>

        <div className="relative mt-8 overflow-hidden rounded-xl border border-white/10 bg-black/30">
          <div className="h-[58vh] min-h-[420px] w-full">
            <FrameAccumulator reveal={reveal} onManifest={setManifest} />
          </div>

          {/* live caption overlaid on the frame */}
          <div className="pointer-events-none absolute left-5 top-5">
            <div
              className="mono text-sm font-medium transition-colors"
              style={{ color: legible ? "#6ee7b7" : tiny ? "#ffd166" : "#cdd3e0" }}
            >
              {tiny
                ? "a single slice — sparse edges. can you be sure what it is?"
                : legible
                  ? "two people, walking."
                  : "filling in — structure resolving…"}
            </div>
            <div className="mono mt-1 text-xs text-[var(--muted)]">
              integration {ms < 10 ? ms.toFixed(1) : ms.toFixed(0)} ms · {count.toLocaleString("en-US")} events
            </div>
          </div>
        </div>

        {/* control */}
        <div className="mt-5 flex items-center gap-4">
          <span className="mono whitespace-nowrap text-xs text-[var(--muted)]">integration time</span>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(reveal * 1000)}
            onChange={(e) => setReveal(Number(e.target.value) / 1000)}
            data-testid="acc-slider"
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-[var(--on)]"
          />
          <span className="mono w-20 whitespace-nowrap text-right text-xs text-white">
            {ms < 10 ? ms.toFixed(1) : ms.toFixed(0)} ms
          </span>
          <button
            onClick={() => setAutoKey((k) => k + 1)}
            className="rounded border border-white/15 px-3 py-1 text-xs text-white/90 transition hover:border-white/40 hover:bg-white/5"
          >
            ↻ replay
          </button>
        </div>

        <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)]">
          Same events. We just chose <span className="text-white">how to turn spikes into structure</span> — an
          event frame. That choice is the entire game: the wrong representation hides the signal, the right one
          makes it obvious. It is exactly what UniEvent does, from raw <span className="mono text-white">(x, y, t, p)</span>,
          in one call.
        </p>
      </div>
    </section>
  );
}
