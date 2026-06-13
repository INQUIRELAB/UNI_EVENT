"""Compute REAL, grounded stats about the bundled hero clip for the Opus tutor.

    python scripts/clip_stats.py [out_dir]      # default: labs/public/data

Every number here is measured from the real event stream — the tutor (pre-baked
AND live) narrates ONLY from these, never fabricated. Writes stats.json.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

import unievent as ue


def _direction(dx: float, dy: float) -> str:
    """Human label for an image-space displacement (x right, y down)."""
    if abs(dx) < 2 and abs(dy) < 2:
        return "roughly stationary"
    parts = []
    if abs(dy) >= 2:
        parts.append("downward" if dy > 0 else "upward")
    if abs(dx) >= 2:
        parts.append("rightward" if dx > 0 else "leftward")
    return " and ".join(parts)


def main(argv: list[str]) -> int:
    out = Path(argv[1]) if len(argv) > 1 else Path("labs/public/data")
    out.mkdir(parents=True, exist_ok=True)

    s = ue.sample_stream()
    t = s.t.astype(np.int64)
    x = s.x.astype(np.float64)
    y = s.y.astype(np.float64)
    p = s.p
    N = s.n_events
    t0 = int(t[0])
    span = max(int(t[-1]) - t0, 1)
    tn = (t - t0) / span

    # polarity
    on_frac = float((p == 1).mean())

    # coverage: distinct active pixels
    active = np.unique(y.astype(np.int64) * s.W + x.astype(np.int64)).size
    coverage = active / (s.W * s.H)

    # motion proxy: activity centroid drift, first 20% vs last 20% of the window
    early = tn < 0.2
    late = tn > 0.8
    cx_e, cy_e = float(x[early].mean()), float(y[early].mean())
    cx_l, cy_l = float(x[late].mean()), float(y[late].mean())
    dx, dy = cx_l - cx_e, cy_l - cy_e

    # activity clusters: peaks in the x-profile of active columns (pedestrians ~vertical)
    col = np.zeros(s.W, np.float64)
    np.add.at(col, x.astype(np.int64), 1.0)
    # smooth
    k = np.ones(31) / 31
    cols = np.convolve(col, k, mode="same")
    thr = cols.max() * 0.35
    above = cols > thr
    # count contiguous runs above threshold
    clusters = int(np.sum(np.diff(above.astype(int)) == 1) + (1 if above[0] else 0))

    # temporal burstiness: events per 50 ms bin, coefficient of variation
    nb = max(int(round(span / 50_000)), 1)
    binned = np.bincount((tn * nb).clip(0, nb - 1).astype(int), minlength=nb).astype(float)
    cov_t = float(binned.std() / (binned.mean() + 1e-9))

    # real event rate uses the ORIGINAL (pre-decimation) count if available
    src = s.source
    orig = int(src.get("original_events", N))
    decim = src.get("decimation", {})
    window_n = int(decim.get("from", N))
    rate_meps = window_n / (span / 1e6) / 1e6

    # bounding box of activity
    bbox = {
        "x0": int(x.min()), "x1": int(x.max()),
        "y0": int(y.min()), "y1": int(y.max()),
    }

    stats = {
        "source": {"name": src.get("name"), "license": src.get("license"), "simulated": int(s.simulated)},
        "resolution": {"W": s.W, "H": s.H},
        "n_events_web": N,
        "n_events_window": window_n,
        "t_span_ms": round(span / 1000, 1),
        "event_rate_meps": round(rate_meps, 2),
        "on_frac": round(on_frac, 3),
        "off_frac": round(1 - on_frac, 3),
        "sensor_coverage_pct": round(coverage * 100, 1),
        "active_pixels": int(active),
        "motion": {
            "dx_px": round(dx, 1), "dy_px": round(dy, 1),
            "magnitude_px": round(float(np.hypot(dx, dy)), 1),
            "direction": _direction(dx, dy),
        },
        "activity_clusters": clusters,
        "temporal_cv": round(cov_t, 2),
        "bbox": bbox,
    }

    (out / "stats.json").write_text(json.dumps(stats, indent=2), encoding="utf-8")
    print("[clip_stats] wrote", out / "stats.json")
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
