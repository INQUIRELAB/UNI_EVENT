"use client";

// Synthetic, clearly-labelled ILLUSTRATION (not real data). The same moving blob,
// two sensors:
//   LEFT  — a frame camera: every pixel is re-read together on a fixed clock, so
//           the whole grid flashes at once and most of it is redundant.
//   RIGHT — an event sensor: each pixel fires on its own the instant its brightness
//           changes, so only the moving edge lights up — sparse, async, polarity.
import { useEffect, useRef } from "react";

const ON = "#FF5A3C";
const OFF = "#3CC8FF";
const BG = "#05060A";

export default function SensorDemo() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t0 = 0;
    const cell = 15;

    let cols = 0;
    let rows = 0;
    let prevLit: Uint8Array = new Uint8Array(0); // right panel: last-frame lit state
    let frameLit: Uint8Array = new Uint8Array(0); // left panel: captured frame
    let frameIdx = -1;
    const events: { c: number; r: number; on: boolean; born: number }[] = [];

    function resize() {
      const w = cv!.clientWidth;
      const h = cv!.clientHeight;
      cv!.width = Math.max(1, Math.floor(w * dpr));
      cv!.height = Math.max(1, Math.floor(h * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.floor(w / 2 / cell);
      rows = Math.floor(h / cell);
      prevLit = new Uint8Array(cols * rows);
      frameLit = new Uint8Array(cols * rows);
      frameIdx = -1;
    }
    resize();
    window.addEventListener("resize", resize);

    function lit(c: number, r: number, ox: number, oy: number, rad: number): boolean {
      const dx = c + 0.5 - ox;
      const dy = r + 0.5 - oy;
      return dx * dx + dy * dy < rad * rad;
    }

    function draw(ts: number) {
      if (!t0) t0 = ts;
      const time = (ts - t0) / 1000;
      const W = cv!.clientWidth;
      const H = cv!.clientHeight;
      const half = W / 2;

      ctx!.fillStyle = BG;
      ctx!.fillRect(0, 0, W, H);

      // blob path: a slow loop so you can follow it (in grid coords)
      const rad = Math.max(1.6, rows * 0.22);
      const t = reduce ? 0.25 : (time * 0.16) % 1;
      const ox = 1.5 + t * (cols - 3);
      const oy = rows / 2 + Math.sin(time * 1.6) * rows * 0.18;

      // ---------- LEFT: frame camera (synchronous clock) ----------
      const clockHz = reduce ? 1 : 2.2;
      const fi = Math.floor(time * clockHz);
      const captured = fi !== frameIdx;
      if (captured) {
        frameIdx = fi;
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) frameLit[r * cols + c] = lit(c, r, ox, oy, rad) ? 1 : 0;
      }
      const sinceTick = time * clockHz - fi; // 0..1
      const flash = Math.max(0, 1 - sinceTick * 6); // brief refresh flash
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const on = frameLit[r * cols + c];
          // EVERY pixel is drawn every frame (redundant): background grey, blob white
          const base = on ? 0.92 : 0.1;
          const v = Math.min(1, base + flash * 0.22);
          ctx!.fillStyle = `rgba(220,225,235,${v})`;
          ctx!.fillRect(c * cell + 1, r * cell + 1, cell - 2, cell - 2);
        }
      }

      // ---------- RIGHT: event sensor (async per-pixel) ----------
      const ox2 = ox; // same motion
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const now = lit(c, r, ox2, oy, rad) ? 1 : 0;
          const idx = r * cols + c;
          if (now !== prevLit[idx]) {
            events.push({ c, r, on: now === 1, born: time }); // ON = brightened, OFF = darkened
            prevLit[idx] = now;
          }
        }
      }
      // draw fading events (sparse, crisp)
      for (let i = events.length - 1; i >= 0; i--) {
        const e = events[i];
        const age = time - e.born;
        if (age > 0.5) {
          events.splice(i, 1);
          continue;
        }
        const a = 1 - age / 0.5;
        ctx!.fillStyle = e.on ? ON : OFF;
        ctx!.globalAlpha = a;
        ctx!.fillRect(half + e.c * cell + 2, e.r * cell + 2, cell - 4, cell - 4);
      }
      ctx!.globalAlpha = 1;

      // ---------- divider + labels ----------
      ctx!.strokeStyle = "rgba(255,255,255,0.12)";
      ctx!.beginPath();
      ctx!.moveTo(half, 0);
      ctx!.lineTo(half, H);
      ctx!.stroke();
      ctx!.font = "600 12px ui-monospace, Menlo, Consolas, monospace";
      ctx!.fillStyle = "#9aa3b5";
      ctx!.fillText("FRAME CAMERA — whole grid, every tick", 14, 22);
      ctx!.fillStyle = "#cdd3e0";
      ctx!.fillText("EVENT SENSOR — only what changed", half + 14, 22);

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="h-full w-full" />;
}
