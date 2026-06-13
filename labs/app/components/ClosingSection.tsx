"use client";

import { PALETTE } from "../lib/palette";

const REPO = "https://github.com/INQUIRELAB/UNI_EVENT";

export default function ClosingSection() {
  return (
    <section className="relative w-full overflow-hidden border-t border-white/10 bg-[var(--bg)] py-24">
      {/* soft polarity glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(60% 50% at 25% 30%, ${PALETTE.on}22, transparent 70%), radial-gradient(55% 45% at 80% 70%, ${PALETTE.off}22, transparent 70%)`,
        }}
      />
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <p className="mono text-xs uppercase tracking-[0.25em] text-[var(--muted)]">the merge</p>
        <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          The thing that taught you is the thing you build with.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-[var(--muted)]">
          Every frame you just saw is real <span className="mono text-white">unievent</span> output — one canonical{" "}
          <span className="mono text-white">(x, y, t, p)</span> stream, every representation, one call. The library is
          the engine; the experience is its face. <span className="text-white">One suite, zero to hero</span> — for
          research and education in event-based vision.
        </p>

        <div className="mx-auto mt-8 max-w-xl rounded-xl border border-white/10 bg-black/40 p-4 text-left">
          <div className="mono text-[13px] leading-relaxed">
            <span className="text-[var(--muted)]">$ </span>
            <span className="text-white">pip install -e &quot;.[io]&quot;</span>
            <br />
            <span className="text-emerald-300">import</span> <span className="text-white">unievent</span>{" "}
            <span className="text-emerald-300">as</span> <span className="text-white">ue</span>
            <br />
            <span className="text-white">ue.represent(ue.sample_stream(), as_=</span>
            <span className="text-[var(--on)]">&quot;frame&quot;</span>
            <span className="text-white">).to_web(</span>
            <span className="text-[var(--off)]">&quot;.../frame&quot;</span>
            <span className="text-white">)</span>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm text-white transition hover:border-white/50 hover:bg-white/10"
          >
            ★ Open the repo on GitHub
          </a>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="rounded-full border border-white/15 px-5 py-2 text-sm text-[var(--muted)] transition hover:border-white/40 hover:text-white"
          >
            ↑ replay the journey
          </a>
        </div>

        <p className="mt-10 text-sm text-[var(--muted)]">
          Built by <span className="text-white">Yazan</span> (
          <a href="https://github.com/INQUIRELAB" className="underline decoration-white/20 hover:text-white">
            @INQUIRELAB
          </a>
          ) — PhD researcher and educator in neuromorphic, event-based vision, author of the field&apos;s forthcoming
          textbook.
        </p>
        <p className="mono mt-2 text-xs text-[var(--muted)]">
          MIT-licensed library · CC0 hero data · open-source for the field · built in one day, commit by commit.
        </p>
      </div>
    </section>
  );
}
