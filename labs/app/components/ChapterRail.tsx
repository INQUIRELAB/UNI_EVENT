"use client";

// A fixed scroll-spy chapter rail — frames the whole thing as one zero-to-hero
// journey and highlights the stage you're in. Clickable (lenis smooth-scrolls).
import { useEffect, useState } from "react";

const CHAPTERS = [
  { id: "opener", n: "01", t: "The Eye" },
  { id: "hero", n: "02", t: "The Raw" },
  { id: "payoff", n: "03", t: "The Reveal" },
  { id: "morph", n: "04", t: "The Four" },
  { id: "oldway", n: "05", t: "The Old Way" },
  { id: "read", n: "06", t: "The Read" },
  { id: "merge", n: "07", t: "Zero → Hero" },
];

export default function ChapterRail() {
  const [active, setActive] = useState("opener");

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (vis[0]) setActive((vis[0].target as HTMLElement).id);
      },
      { threshold: [0.15, 0.4, 0.7], rootMargin: "-30% 0px -30% 0px" }
    );
    CHAPTERS.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <nav className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 lg:block" aria-label="chapters">
      <div className="mono mb-3 text-right text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
        the journey
      </div>
      <ul className="flex flex-col gap-3">
        {CHAPTERS.map((c) => {
          const on = active === c.id;
          return (
            <li key={c.id}>
              <a href={`#${c.id}`} className="group flex items-center justify-end gap-2.5">
                <span
                  className={`mono whitespace-nowrap text-[10px] uppercase tracking-wider transition-opacity ${
                    on ? "text-white opacity-100" : "text-[var(--muted)] opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {c.n} · {c.t}
                </span>
                <span
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    on ? "w-7 bg-[var(--on)]" : "w-3 bg-white/25 group-hover:bg-white/50"
                  }`}
                />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
