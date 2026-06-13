"use client";

import Reveal from "./Reveal";

const DECODERS = [".raw", ".aedat", ".dat", ".hdf5"];
const REPS = ["spike", "voxel", "frame", "graph"];

function Box({ label, tone = "rose" }: { label: string; tone?: "rose" | "dim" }) {
  const cls =
    tone === "rose"
      ? "border-rose-400/30 bg-rose-500/[0.06] text-rose-100"
      : "border-white/12 bg-white/[0.03] text-[var(--fg)]";
  return <span className={`mono rounded border px-2 py-1 text-[11px] ${cls}`}>{label}</span>;
}

export default function PipelineSection() {
  return (
    <section id="oldway" className="relative w-full scroll-mt-8 bg-[var(--bg)] py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--muted)]">05 · the old way → the one import</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            From a tangle of formats to one import.
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--fg)]">
            The event-camera world has no standard. Do it yourself and you write — and re-write, per dataset — a
            decoder, a parser, a builder for <em>every</em> representation, and a visualizer for <em>every</em> one.
          </p>

          <div className="mt-8 grid items-stretch gap-6 lg:grid-cols-2">
            {/* LEFT — the brutal tangle */}
            <div className="relative overflow-hidden rounded-xl border border-rose-400/25 bg-rose-500/[0.03] p-5">
              <span className="mono text-xs uppercase tracking-wider text-rose-300">the usual way · complex</span>

              <div className="mt-4 space-y-1">
                <div className="mono text-[10px] uppercase tracking-wider text-rose-300/70">per-vendor decoders</div>
                <div className="flex flex-wrap gap-1.5">
                  {DECODERS.map((d) => (
                    <Box key={d} label={`${d} decoder`} />
                  ))}
                </div>
              </div>
              <div className="my-1 text-center text-rose-300/50">↓ custom parsing, per format</div>

              <div className="space-y-1">
                <div className="mono text-[10px] uppercase tracking-wider text-rose-300/70">hand-write a builder for EACH rep</div>
                <div className="flex flex-wrap gap-1.5">
                  {REPS.map((r) => (
                    <Box key={r} label={`${r} builder`} />
                  ))}
                </div>
              </div>
              <div className="my-1 text-center text-rose-300/50">↓</div>

              <div className="space-y-1">
                <div className="mono text-[10px] uppercase tracking-wider text-rose-300/70">…and a visualizer for EACH rep</div>
                <div className="flex flex-wrap gap-1.5">
                  {REPS.map((r) => (
                    <Box key={r} label={`${r} viz`} />
                  ))}
                </div>
              </div>

              <div className="mt-3 rounded border border-rose-400/30 bg-rose-500/[0.08] px-3 py-2 text-center">
                <span className="mono text-xs text-rose-100">+ per-dataset glue</span>
                <span className="mono ml-2 text-[10px] text-rose-300/80">× every new dataset</span>
              </div>
              <p className="mono mt-3 text-xs text-[var(--muted)]">you build every box yourself — per dataset, per representation</p>
            </div>

            {/* RIGHT — one import (no install noise) */}
            <div className="flex flex-col rounded-xl border border-[var(--off)]/25 bg-[var(--off)]/[0.05] p-5">
              <span className="mono text-xs uppercase tracking-wider text-emerald-300">UniEvent · one call</span>
              <div className="mt-5 flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <code className="rounded-md bg-black/50 px-4 py-2 text-sm text-white">import unievent as ue</code>
                <span className="text-[var(--muted)]">↓</span>
                <code className="rounded-md bg-black/50 px-4 py-2 text-sm text-white">
                  ue.represent(stream, as_=<span className="text-[var(--on)]">&quot;spike&quot;</span>)
                </code>
                <div className="mt-1 flex flex-wrap justify-center gap-2">
                  {REPS.map((r) => (
                    <span key={r} className="mono rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-xs text-[var(--fg)]">
                      {r}
                    </span>
                  ))}
                </div>
                <p className="mono mt-2 text-xs text-[var(--muted)]">every representation — and the Labs render it for you</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
