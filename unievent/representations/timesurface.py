"""``timesurface`` — exponentially-decayed time surface (the stretch 5th rep).

Per pixel, ``exp(-(t_ref - t_last) / tau)`` of the most recent event in the
window, per polarity. Empty pixels = 0. ``t_ref`` is the last event time.

NOTE: this is the forward-designed stretch representation. Its shape/dtype match
SPEC.md; it is validated by the test-suite on the real stream at build time.
"""
from __future__ import annotations

import numpy as np

from .base import Representation

DEFAULT_TAU_US = 30_000.0


def build(stream, tau_us: float = DEFAULT_TAU_US) -> Representation:
    H, W = stream.H, stream.W
    t = stream.t.astype(np.float64)
    t_ref = float(t[-1])

    # last event time per (polarity, y, x). Stream is sorted ascending, so plain
    # indexed assignment leaves the LAST (latest) event time per cell.
    last = np.full((2, H, W), -np.inf, dtype=np.float64)
    last[stream.p.astype(np.intp), stream.y.astype(np.intp), stream.x.astype(np.intp)] = t

    surface = np.zeros((2, H, W), dtype=np.float32)
    seen = np.isfinite(last)
    surface[seen] = np.exp(-(t_ref - last[seen]) / tau_us).astype(np.float32)

    return Representation(
        kind="timesurface",
        buffers={"surface": surface},
        H=H,
        W=W,
        source=dict(stream.source),
        stats={
            "n_events": stream.n_events,
            "tau_us": float(tau_us),
            "active_px": int(seen.any(axis=0).sum()),
        },
        params={"tau_us": float(tau_us), "channel_order": ["off", "on"]},
    )
