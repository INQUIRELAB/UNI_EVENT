"""``frame`` — signed event accumulation image.

``+1`` per ON event, ``-1`` per OFF event, summed per pixel. This is the
"now look at the event frame" payoff beat: structure that was invisible in the
raw spike scatter becomes obvious once accumulated.
"""
from __future__ import annotations

import numpy as np

from .base import Representation


def build(stream) -> Representation:
    H, W = stream.H, stream.W
    fr = np.zeros((H, W), dtype=np.float32)
    sign = np.where(stream.p == 1, np.float32(1.0), np.float32(-1.0))
    # accumulate with np.add.at so repeated pixels sum (not last-wins)
    np.add.at(fr, (stream.y.astype(np.intp), stream.x.astype(np.intp)), sign)
    return Representation(
        kind="frame",
        buffers={"frame": fr},
        H=H,
        W=W,
        source=dict(stream.source),
        stats={
            "n_events": stream.n_events,
            "vmin": float(fr.min()),
            "vmax": float(fr.max()),
            "nonzero_px": int(np.count_nonzero(fr)),
        },
        params={"display_clip": [-3, 3]},
    )
