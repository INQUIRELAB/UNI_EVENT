"""Representation builders for UniEvent.

``build(stream, as_)`` runs the right builder over a raw :class:`EventStream`.
``resample(sample, as_)`` re-derives a non-spike representation from an already
aggregated :class:`EventSample` (the unification path).

Every builder is a pure function ``stream -> Representation`` with all randomness
seeded — no unseeded RNG, no silent skips, no temporal collapse (the bugs the
v1 reference shipped, fixed here).
"""
from __future__ import annotations

import numpy as np

from .base import Representation
from . import spike as _spike
from . import frame as _frame
from . import voxel as _voxel
from . import graph as _graph
from . import timesurface as _timesurface

__all__ = ["build", "resample", "Representation", "BUILDERS"]

BUILDERS = {
    "spike": _spike.build,
    "frame": _frame.build,
    "voxel": _voxel.build,
    "graph": _graph.build,
    "timesurface": _timesurface.build,
}


def build(stream, as_: str) -> Representation:
    return BUILDERS[as_](stream)


def resample(sample, as_: str) -> Representation:
    """Re-derive a non-spike representation from an aggregated EventSample.

    Honest conversions only. Identity (same kind) passes through; ``voxel -> frame``
    collapses the signed voxel counts into the accumulation image. Anything that
    would require per-event data we did not keep raises loudly.
    """
    if sample.kind == as_:
        return Representation(
            kind=as_,
            buffers={k: np.asarray(v) for k, v in sample.data.items()},
            H=sample.H,
            W=sample.W,
            source=sample.source,
            stats=dict(sample.data.get("_stats", {})) if isinstance(sample.data.get("_stats"), dict) else {},
        )
    if sample.kind == "voxel" and as_ == "frame":
        coords = np.asarray(sample.data["coords"])  # (M,3) [t_bin,y,x]
        feats = np.asarray(sample.data["feats"])  # (M,2) [off,on]
        fr = np.zeros((sample.H, sample.W), dtype=np.float32)
        ys, xs = coords[:, 1], coords[:, 2]
        np.add.at(fr, (ys, xs), feats[:, 1] - feats[:, 0])  # on - off = signed
        return Representation(
            kind="frame",
            buffers={"frame": fr},
            H=sample.H,
            W=sample.W,
            source=sample.source,
            stats={"vmin": float(fr.min()), "vmax": float(fr.max())},
        )
    raise NotImplementedError(
        f"resample {sample.kind!r} -> {as_!r} is not an honest conversion "
        "(would require per-event data the aggregate does not retain)."
    )
