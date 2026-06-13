"""``spike`` — the hero, SNN-ready raw spikes.

Events ARE spikes. This builder returns the raw stream as parallel
``t, x, y, p`` arrays (the form a spiking network consumes), carrying real
per-event timestamps and polarity. Only an :class:`EventStream` can produce it
(see the integrity rule in core.py).
"""
from __future__ import annotations

import numpy as np

from .base import Representation


def build(stream) -> Representation:
    return Representation(
        kind="spike",
        buffers={
            "t": np.ascontiguousarray(stream.t, dtype=np.int64),  # µs, sorted
            "x": np.ascontiguousarray(stream.x, dtype=np.int16),
            "y": np.ascontiguousarray(stream.y, dtype=np.int16),
            "p": np.ascontiguousarray(stream.p, dtype=np.int8),
        },
        H=stream.H,
        W=stream.W,
        source=dict(stream.source),
        stats={
            "n_events": stream.n_events,
            "t_span_us": stream.t_span_us,
            "on_frac": round(stream.on_frac, 4),
        },
    )
