"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Manifest } from "../lib/loadUniEvent";
import MountWhenNear from "./MountWhenNear";
import Reveal from "./Reveal";

const FrameAccumulator = dynamic(() => import("./FrameAccumulator"), { ssr: false });

// inOutQuad
const ease = (e: number) => (e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2);

export default function AccumulationSection() {
  const [reveal, setReveal] = useState(0);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [autoKey, setAutoKey] = useState(0);
  const raf = useRef(0);

  // autoplay 0 -> 1 over ~5.5s (re-fires on autoKey, which fires when the canvas mounts)
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
  const legible = reveal > 0.78;
  const tiny = ms < 6;

  return (
    <section id="payoff" className="relative w-full scroll-mt-8 bg-[var(--bg)] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
            {/* visual — left / center */}
            <div className="lg:col-span-7">
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
                <MountWhenNear className="aspect-[16/10] w-full" rootMargin="200px">
                  <FrameAccumulator reveal={reveal} onManifest={setManifest} />
                </MountWhenNear>
                <div className="pointer-events-none absolute left-5 top-5">
                  <div
                    className="mono text-sm font-medium transition-colors"
                    style={{ color: legible ? "#6ee7b7" : tiny ? "#ffd166" : "#e7ebf4" }}
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
            </div>

            {/* text rail — middle-right */}
            <div className="lg:col-span-5">
              <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--muted)]">03 · the reveal — representation is everything</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                So… what were you looking at?
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--fg)]">
                A single millisecond of an event camera is almost nothing — a few hundred sparse spikes tracing the
                edges of whatever moved. Too thin to be sure what it is. Now{" "}
                <span className="text-white">integrate over time</span>: accumulate those same events onto the image
                plane and watch the scene fill in.
              </p>

              <div className="mt-6 flex items-center gap-4">
                <span className="mono whitespace-nowrap text-xs text-[var(--muted)]">integration</span>
                <input
                  type="range"
                  min={0}
                  max={1000}
                  value={Math.round(reveal * 1000)}
                  onChange={(e) => setReveal(Number(e.target.value) / 1000)}
                  data-testid="acc-slider"
                  className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-[var(--on)]"
                />
                <span className="mono w-16 whitespace-nowrap text-right text-xs text-white">
                  {ms < 10 ? ms.toFixed(1) : ms.toFixed(0)} ms
                </span>
                <button
                  onClick={() => setAutoKey((k) => k + 1)}
                  className="rounded border border-white/15 px-3 py-1 text-xs text-white/90 transition hover:border-white/40 hover:bg-white/5"
                >
                  ↻ replay
                </button>
              </div>

              <p className="mt-6 text-[15px] leading-relaxed text-[var(--fg)]">
                Same events. We just chose <span className="text-white">how to turn spikes into structure</span> — an
                event frame. That choice is the entire game: the wrong representation hides the signal, the right one
                makes it obvious. It is exactly what UniEvent does, from raw{" "}
                <span className="mono text-white">(x, y, t, p)</span>, in one call.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
