"use client";

// Synthetic, clearly-labelled ILLUSTRATION (not real data): the same fast-moving
// edge seen two ways. A frame camera integrates over an exposure -> motion blur +
// a full redundant frame. An event sensor fires per-pixel the instant brightness
// changes -> crisp, sparse edges with polarity. This teaches the "why" before the
// hero shows real events.
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
    let raf = 0;
    let t0 = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      const w = cv!.clientWidth;
      const h = cv!.clientHeight;
      cv!.width = Math.max(1, Math.floor(w * dpr));
      cv!.height = Math.max(1, Math.floor(h * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw(ts: number) {
      if (!t0) t0 = ts;
      const time = (ts - t0) / 1000;
      const W = cv!.clientWidth;
      const H = cv!.clientHeight;
      const half = W / 2;
      const pad = 26;
      const barW = 26;

      ctx!.fillStyle = BG;
      ctx!.fillRect(0, 0, W, H);

      // constant-velocity sweep, wraps left->right (always moving = always smeared)
      const period = reduce ? 1 : 2.4;
      const u = ((time / period) % 1 + 1) % 1; // 0..1
      const top = H * 0.18;
      const bot = H * 0.82;

      // ---- LEFT: frame camera (motion blur over the exposure) ----
      ctx!.save();
      ctx!.beginPath();
      ctx!.rect(0, 0, half, H);
      ctx!.clip();
      const lx = pad + u * (half - 2 * pad);
      const blur = reduce ? barW : 70; // exposure smear in px
      const g = ctx!.createLinearGradient(lx - blur, 0, lx + blur + barW, 0);
      g.addColorStop(0, "rgba(220,225,235,0)");
      g.addColorStop(0.5, "rgba(220,225,235,0.42)");
      g.addColorStop(1, "rgba(220,225,235,0)");
      ctx!.fillStyle = g;
      ctx!.fillRect(lx - blur, top, blur * 2 + barW, bot - top);
      // faint full-frame "everything is captured every frame" wash
      ctx!.fillStyle = "rgba(125,133,151,0.05)";
      ctx!.fillRect(0, top, half, bot - top);
      ctx!.restore();

      // ---- RIGHT: event sensor (crisp sparse polarity edges) ----
      ctx!.save();
      ctx!.beginPath();
      ctx!.rect(half, 0, half, H);
      ctx!.clip();
      const rx = half + pad + u * (half - 2 * pad);
      const lead = rx + barW / 2; // moving right -> leading edge brightens (ON)
      const trail = rx - barW / 2; // trailing edge darkens (OFF)
      const step = 9;
      for (let y = top; y < bot; y += step) {
        // sparse: skip ~1/3 of pixels, tiny jitter
        const seed = Math.sin(y * 12.9898 + Math.floor(time * 6)) * 43758.5453;
        const r = seed - Math.floor(seed);
        if (r < 0.34) continue;
        const jitter = (r - 0.5) * 3;
        ctx!.fillStyle = ON;
        ctx!.fillRect(lead + jitter, y, 1.6, 1.6);
        ctx!.fillStyle = OFF;
        ctx!.fillRect(trail + jitter, y, 1.6, 1.6);
      }
      ctx!.restore();

      // ---- divider + labels ----
      ctx!.strokeStyle = "rgba(255,255,255,0.10)";
      ctx!.beginPath();
      ctx!.moveTo(half, 0);
      ctx!.lineTo(half, H);
      ctx!.stroke();

      ctx!.font = "600 12px ui-monospace, Menlo, Consolas, monospace";
      ctx!.fillStyle = "#9aa3b5";
      ctx!.fillText("FRAME CAMERA  ·  blurred, redundant", 16, 24);
      ctx!.fillStyle = "#cdd3e0";
      ctx!.fillText("EVENT SENSOR  ·  crisp, sparse", half + 16, 24);

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
