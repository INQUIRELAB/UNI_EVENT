"use client";

import dynamic from "next/dynamic";

const SensorDemo = dynamic(() => import("./SensorDemo"), { ssr: false });

const SPECS = [
  ["~1 µs", "latency"],
  ["no", "motion blur"],
  [">120 dB", "dynamic range"],
  ["milliwatts", "power"],
  ["sparse", "only what changes"],
];

export default function SensorOpener() {
  return (
    <section
      id="opener"
      className="relative flex min-h-[100svh] w-full flex-col justify-center bg-[var(--bg)] py-16"
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <p className="mono text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
          first principles · a brain-inspired sensor
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          Two ways to see a moving world.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--fg)] sm:text-base">
          An ordinary camera shoots full frames on a fixed clock — it smears fast motion into blur and spends
          bandwidth re-photographing everything that didn&apos;t move. An <span className="text-white">event camera</span>{" "}
          is different: each pixel fires independently, the microsecond its brightness changes. Same motion, two
          worlds —
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

        {/* specs */}
        <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
          {SPECS.map(([big, small]) => (
            <div key={small} className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-white">{big}</span>
              <span className="mono text-xs text-[var(--muted)]">{small}</span>
            </div>
          ))}
        </div>

        <p className="mt-7 max-w-2xl text-[15px] leading-relaxed text-[var(--fg)]">
          This isn&apos;t a thought experiment — it ships in <span className="text-white">Sony&apos;s IMX636</span> /
          Prophesee EVS, a stacked event-vision sensor. So what does one actually output?
        </p>

        <a
          href="#hero"
          className="group mt-6 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 backdrop-blur-sm transition hover:border-white/50 hover:bg-white/10"
        >
          <span className="text-sm font-medium text-white">see real events</span>
          <span className="text-base text-[var(--on)] motion-safe:animate-bounce">↓</span>
        </a>
      </div>
    </section>
  );
}
