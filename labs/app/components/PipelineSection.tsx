"use client";

import Reveal from "./Reveal";

// The usual way: a tangle of incompatible formats + per-dataset loaders.
const SOURCES = [
  { name: "DSEC", fmt: ".h5", x: "2%", y: "6%", rot: -7 },
  { name: "Gen1", fmt: ".dat", x: "30%", y: "30%", rot: 5 },
  { name: "PEDRo", fmt: ".npy", x: "0%", y: "58%", rot: 4 },
  { name: "FRED", fmt: ".npz", x: "26%", y: "78%", rot: -6 },
  { name: "1Mpx", fmt: ".dat", x: "34%", y: "2%", rot: 8 },
  { name: "eTram", fmt: ".h5", x: "4%", y: "32%", rot: -3 },
];

export default function PipelineSection() {
  return (
    <section id="oldway" className="relative w-full bg-[var(--bg)] py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--muted)]">05 · the old way → the one import</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            From a tangle of formats to one import.
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--fg)]">
            The event-camera world has no standard — every dataset ships its own format and its own loader, so most
            projects burn days on glue before a model sees data.
          </p>

          <div className="mt-8 grid items-stretch gap-6 lg:grid-cols-2">
            {/* LEFT — the tangle */}
            <div className="relative overflow-hidden rounded-xl border border-rose-400/20 bg-rose-500/[0.03] p-6">
              <span className="mono text-xs uppercase tracking-wider text-rose-300">the usual way · complex</span>
              <div className="relative mt-3 h-60">
                {/* crossing connectors */}
                <svg className="absolute inset-0 h-full w-full" aria-hidden>
                  {SOURCES.map((s, i) => (
                    <line
                      key={i}
                      x1={`${parseInt(s.x) + 8}%`}
                      y1={`${parseInt(s.y) + 10}%`}
                      x2="88%"
                      y2="50%"
                      stroke="rgba(244,114,114,0.28)"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                  ))}
                </svg>
                {SOURCES.map((s) => (
                  <div
                    key={s.name}
                    className="absolute rounded-md border border-white/12 bg-[#16121a] px-2.5 py-1.5 shadow"
                    style={{ left: s.x, top: s.y, transform: `rotate(${s.rot}deg)` }}
                  >
                    <span className="text-xs font-medium text-white">{s.name}</span>
                    <span className="mono ml-1.5 text-[10px] text-rose-300/80">{s.fmt}</span>
                  </div>
                ))}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 rounded-md border border-white/15 bg-black/60 px-3 py-2 text-center">
                  <div className="text-xs font-semibold text-white">your model</div>
                  <div className="mono text-[10px] text-rose-300/80">+ weeks of glue</div>
                </div>
              </div>
              <p className="mono mt-3 text-xs text-[var(--muted)]">a different loader per dataset · no shared representation</p>
            </div>

            {/* RIGHT — one import */}
            <div className="rounded-xl border border-[var(--off)]/25 bg-[var(--off)]/[0.05] p-6">
              <span className="mono text-xs uppercase tracking-wider text-emerald-300">UniEvent · one call</span>
              <div className="mt-4 flex flex-col items-center gap-2.5 text-center">
                <code className="rounded-md bg-black/50 px-3 py-1.5 text-sm text-white">import unievent as ue</code>
                <span className="text-[var(--muted)]">↓</span>
                <div className="rounded-md border border-white/15 bg-black/40 px-3 py-1.5">
                  <span className="mono text-sm text-white">one (x, y, t, p) stream</span>
                </div>
                <span className="text-[var(--muted)]">↓ ue.represent</span>
                <div className="flex flex-wrap justify-center gap-2">
                  {["spike", "voxel", "frame", "graph"].map((r) => (
                    <span key={r} className="mono rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-xs text-[var(--fg)]">
                      {r}
                    </span>
                  ))}
                </div>
                <span className="text-[var(--muted)]">↓</span>
                <div className="rounded-md border border-[var(--off)]/30 bg-[var(--off)]/10 px-3 py-1.5">
                  <span className="text-sm font-medium text-white">the right AI model</span>
                </div>
              </div>
              <p className="mono mt-4 text-center text-xs text-[var(--muted)]">
                any (x,y,t,p) stream → one canonical model → every representation
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
