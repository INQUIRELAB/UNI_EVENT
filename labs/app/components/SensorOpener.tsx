"use client";

import dynamic from "next/dynamic";

const SensorDemo = dynamic(() => import("./SensorDemo"), { ssr: false });

const SPECS = [
  ["~1 µs", "latency"],
  ["no", "motion blur"],
  [">120 dB", "dynamic range"],
  ["milliwatts", "power"],
];

export default function SensorOpener() {
  return (
    <section
      id="opener"
      className="relative flex min-h-[100svh] w-full flex-col justify-center bg-[var(--bg)] py-16"
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <p className="mono text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
          01 · the eye — a brain-inspired sensor
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          Two ways to see a moving world.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--fg)] sm:text-base">
          A normal camera re-reads <span className="text-white">every pixel on a fixed clock</span> — the whole frame
          at once, most of it unchanged. An <span className="text-white">event camera</span> is built like a retina:
          each pixel fires on its own, the microsecond its brightness changes. Same blob, two sensors —
        </p>

        {/* the side-by-side illustration */}
        <div className="relative mt-7 overflow-hidden rounded-xl border border-white/10 bg-black/40">
          <div className="aspect-[16/6] w-full">
            <SensorDemo />
          </div>
          <span className="mono pointer-events-none absolute bottom-3 right-4 text-[10px] uppercase tracking-wider text-[var(--muted)]">
            illustration — teaching aid, not sensor data
          </span>
        </div>

        {/* the two readings */}
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
            <span className="font-semibold text-white">Frame camera</span>
            <span className="mono ml-2 text-xs text-[var(--muted)]">every pixel, every frame · ~30–1000 fps · mostly redundant</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
            <span className="font-semibold text-white">Event sensor</span>
            <span className="mono ml-2 text-xs text-[var(--muted)]">each pixel fires alone · µs latency · ~mW · brain-inspired</span>
          </div>
        </div>

        {/* specs */}
        <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
          {SPECS.map(([big, small]) => (
            <div key={small} className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-white">{big}</span>
              <span className="mono text-xs text-[var(--muted)]">{small}</span>
            </div>
          ))}
        </div>

        {/* the real sensor — big */}
        <div className="mt-8 border-t border-white/10 pt-7">
          <p className="text-sm text-[var(--muted)]">This isn&apos;t a thought experiment. It ships today, in</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Sony <span style={{ color: "#FF5A3C" }}>IMX636</span> · Prophesee EVS
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">a stacked event-vision sensor. So what does one actually output?</p>
        </div>

        <a
          href="#hero"
          className="group mt-7 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 backdrop-blur-sm transition hover:border-white/50 hover:bg-white/10"
        >
          <span className="text-sm font-medium text-white">see real events</span>
          <span className="text-base text-[var(--on)] motion-safe:animate-bounce">↓</span>
        </a>
      </div>
    </section>
  );
}
