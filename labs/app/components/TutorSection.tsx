"use client";

import { useEffect, useState } from "react";

type Beat = { beat: string; title: string; narration: string; grounded?: boolean | null };
type Tutor = { beats: Beat[] };

interface Stats {
  n_events_web: number;
  n_events_window: number;
  t_span_ms: number;
  event_rate_meps: number;
  on_frac: number;
  sensor_coverage_pct: number;
  activity_clusters: number;
  motion: { direction: string; magnitude_px: number };
}

const SUGGESTED = [
  "Why is this clip so sparse?",
  "Which representation should I use to detect these people?",
  "What does the balanced ON/OFF polarity tell you?",
  "Why would an event camera beat a normal camera here?",
];

const CLAUDE_ORANGE = "#D97757";

// A warm radial burst — evokes Claude/Anthropic without copying the trademark.
function ClaudeMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g stroke={CLAUDE_ORANGE} strokeWidth="2.3" strokeLinecap="round">
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI;
          const dx = Math.cos(a) * 7.5;
          const dy = Math.sin(a) * 7.5;
          return <line key={i} x1={12 - dx} y1={12 - dy} x2={12 + dx} y2={12 + dy} />;
        })}
      </g>
    </svg>
  );
}

function CardHeader({ note }: { note: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
      <ClaudeMark />
      <span className="font-semibold text-white">Claude</span>
      <span className="mono text-xs text-[var(--muted)]">Opus 4.8</span>
      <span className="mono ml-auto rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
        {note}
      </span>
    </div>
  );
}

export default function TutorSection() {
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    fetch("/data/tutor.json").then((r) => (r.ok ? r.json() : null)).then(setTutor).catch(() => {});
    fetch("/data/stats.json").then((r) => (r.ok ? r.json() : null)).then(setStats).catch(() => {});
  }, []);

  const read = tutor?.beats?.find((b) => b.beat === "read");

  async function ask(question: string) {
    const Q = question.trim();
    if (!Q || loading) return;
    setAsked(Q);
    setQ("");
    setLoading(true);
    setAnswer(null);
    setOffline(false);
    setFallback(false);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: Q }),
      });
      if (!r.ok) {
        setOffline(true);
      } else {
        const j = await r.json();
        setAnswer(j.answer);
        setFallback(!!j.fallback);
      }
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }

  const chips = stats
    ? [
        `${stats.n_events_window.toLocaleString()} events`,
        `${stats.event_rate_meps} Mev/s`,
        `${(stats.on_frac * 100).toFixed(0)}% ON`,
        `${stats.activity_clusters} clusters`,
        `drift ${stats.motion.direction}`,
        `${stats.sensor_coverage_pct}% active`,
      ]
    : [];

  const ChipRow = () => (
    <div className="mono flex flex-wrap gap-2 px-5 pt-4 text-xs">
      {chips.map((c) => (
        <span key={c} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[var(--fg)]">
          {c}
        </span>
      ))}
    </div>
  );

  return (
    <section className="relative w-full bg-[var(--bg)] py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          the Opus touch · perceiving a sensor it cannot natively see
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Claude reads the sensor.
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--fg)]">
          Microsecond, asynchronous events are a modality language models have never been able to see. Here Claude
          reasons about this clip — grounded in <span className="text-white">real computed statistics</span>, never
          vibes. Every chip below is measured from the stream.
        </p>

        {/* the read — a branded card */}
        {read && (
          <div className="mt-7 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
            <CardHeader note={read.grounded ? "grounded ✓" : "grounded"} />
            <ChipRow />
            <p className="px-5 py-4 text-[17px] leading-relaxed text-white">{read.narration}</p>
          </div>
        )}

        {/* live ask */}
        <div className="mt-9">
          <div className="mono mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">ask about this clip — live</div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                disabled={loading}
                className="rounded-full border border-white/15 px-3 py-1 text-xs text-[var(--muted)] transition hover:border-white/40 hover:text-white disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(q);
            }}
            className="mt-3 flex gap-2"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. what is causing the events on the right edge?"
              className="flex-1 rounded-lg border border-white/15 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-[var(--muted)] focus:border-white/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg border px-4 py-2 text-sm text-white transition disabled:opacity-40"
              style={{ borderColor: `${CLAUDE_ORANGE}80`, background: `${CLAUDE_ORANGE}1a` }}
            >
              {loading ? "reading…" : "ask"}
            </button>
          </form>

          {/* answer — a branded card */}
          {asked && (
            <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
              <CardHeader note={fallback ? "pre-baked" : "live · grounded"} />
              <div className="px-5 py-4">
                <div className="mono text-xs text-[var(--muted)]">you · {asked}</div>
                {loading && <div className="mt-2 animate-pulse text-sm text-[var(--muted)]">Claude is reading the stream…</div>}
                {answer && <div className="mt-2 text-[15px] leading-relaxed text-white">{answer}</div>}
                {answer && fallback && (
                  <div className="mono mt-2 text-xs text-[var(--muted)]">
                    live tutor at capacity — showing the pre-computed read (same real stats, never fabricated)
                  </div>
                )}
                {offline && (
                  <div className="mt-2 text-[15px] leading-relaxed text-[var(--muted)]">
                    Live tutor is offline right now — but the pre-computed read above is grounded in the same real
                    stats and never fabricated.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="mono mt-6 text-xs text-[var(--muted)]">
          Pre-computed narration is integrity-audited (a second agent flags any unsupported claim). Live answers call
          Claude Opus 4.8 with these real stats as context — grounded, never vibes.
        </p>
      </div>
    </section>
  );
}
