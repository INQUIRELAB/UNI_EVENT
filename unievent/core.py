"""UniEvent core — the canonical event model and the ``represent()`` dispatch.

One canonical ``(x, y, t, p)`` stream in; any representation out. Two input types
flow through :func:`represent`:

* :class:`EventStream` — RAW per-event data (parallel ``t, x, y, p`` arrays). The
  ONLY type that carries true per-event timestamps and polarity.
* :class:`EventSample` — an already-AGGREGATED representation (voxel / frame /
  graph). Per-event identity is gone; real spikes cannot be recovered from it.

Integrity rule (stated identically in SPEC.md / rubric.md / README.md):

    ``spike`` requires a raw ``EventStream``. ``represent(EventSample, as_="spike")``
    RAISES. You cannot fabricate real per-event spikes from an aggregated
    representation — events ARE spikes, and once aggregated they are gone.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np

__all__ = [
    "EventStream",
    "EventSample",
    "represent",
    "UniEventIntegrityError",
    "REPRESENTATIONS",
    "MODEL_HINT",
]

# The five representation names. The first four are the validated "core" set the
# hero morph is built from; ``timesurface`` is the stretch fifth.
REPRESENTATIONS = ("spike", "voxel", "frame", "graph", "timesurface")

# The "→ AI" step that completes zero-to-hero: each representation is a model-ready
# numpy array (no extra glue), and this maps it to the model family it feeds. The
# through-line is *raw events → one stream → representation → the right AI model*.
MODEL_HINT = {
    "spike": "spiking neural nets · neuromorphic AI (events ARE spikes — the native form)",
    "voxel": "sparse 3D-convolution detectors",
    "frame": "ordinary CNNs / any 2D vision model",
    "graph": "graph neural networks",
    "timesurface": "CNNs · classic feature pipelines",
}


class UniEventIntegrityError(TypeError):
    """Raised when a representation would fabricate data that does not exist.

    The canonical case: asking for raw ``spike``s from an already-aggregated
    :class:`EventSample`. Events ARE spikes; once aggregated into a voxel / frame
    / graph the per-event timestamps and polarity are gone and cannot be honestly
    recovered. We crash loudly rather than invent timestamps.
    """


def _unknown_source() -> dict:
    return {"name": "unknown", "license": "UNKNOWN", "simulated": 1, "note": ""}


@dataclass
class EventStream:
    """Raw per-event data: parallel arrays ``t, x, y, p`` + resolution + provenance.

    Invariants (validated on construction — we crash loudly, never silently fix):
    ``t`` is non-decreasing int64 µs; ``0 <= x < W`` int16; ``0 <= y < H`` int16;
    ``p`` is int8 in ``{0, 1}`` (1 = ON, 0 = OFF).
    """

    t: np.ndarray  # int64 µs, sorted ascending
    x: np.ndarray  # int16
    y: np.ndarray  # int16
    p: np.ndarray  # int8 in {0, 1}
    H: int
    W: int
    source: dict = field(default_factory=_unknown_source)

    def __post_init__(self) -> None:
        self.t = np.ascontiguousarray(self.t, dtype=np.int64)
        self.x = np.ascontiguousarray(self.x, dtype=np.int16)
        self.y = np.ascontiguousarray(self.y, dtype=np.int16)
        self.p = np.ascontiguousarray(self.p, dtype=np.int8)
        self.H = int(self.H)
        self.W = int(self.W)
        self.validate()

    def validate(self) -> "EventStream":
        n = self.t.shape[0]
        if not (self.x.shape[0] == self.y.shape[0] == self.p.shape[0] == n):
            raise ValueError("EventStream: t, x, y, p must be equal length")
        if n == 0:
            raise ValueError(
                "EventStream: empty stream (no events). Crash loudly — no silent pass."
            )
        if np.any(np.diff(self.t) < 0):
            raise ValueError("EventStream: t must be non-decreasing (sort before constructing)")
        if int(self.x.min()) < 0 or int(self.x.max()) >= self.W:
            raise ValueError(f"EventStream: x out of bounds [0, {self.W})")
        if int(self.y.min()) < 0 or int(self.y.max()) >= self.H:
            raise ValueError(f"EventStream: y out of bounds [0, {self.H})")
        uniq = np.unique(self.p)
        if not np.all(np.isin(uniq, (0, 1))):
            raise ValueError(f"EventStream: p must be in {{0, 1}}, got {uniq.tolist()}")
        return self

    # --- convenience -----------------------------------------------------
    @property
    def n_events(self) -> int:
        return int(self.t.shape[0])

    @property
    def t_span_us(self) -> int:
        return int(self.t[-1] - self.t[0]) if self.n_events else 0

    @property
    def on_frac(self) -> float:
        return float(self.p.mean()) if self.n_events else 0.0

    @property
    def simulated(self) -> int:
        return int(self.source.get("simulated", 1))

    def __repr__(self) -> str:  # pragma: no cover - cosmetic
        return (
            f"EventStream(n={self.n_events:,}, {self.W}x{self.H}, "
            f"{self.t_span_us/1000:.0f}ms, on={self.on_frac:.0%}, "
            f"src={self.source.get('name')!r}, simulated={self.simulated})"
        )


@dataclass
class EventSample:
    """An already-AGGREGATED representation (voxel / frame / graph / ...).

    Per-event identity has been collapsed into bins / pixels / nodes. Carrying it
    through :func:`represent` lets the library *re-derive* other aggregates from
    it (the unification story) — but never raw ``spike``s (the integrity rule).
    """

    kind: str
    data: dict[str, Any]
    H: int
    W: int
    source: dict = field(default_factory=_unknown_source)

    @property
    def simulated(self) -> int:
        return int(self.source.get("simulated", 1))


def represent(obj, as_: str):
    """Dispatch on input type to produce a representation.

    ``EventStream`` -> any of {spike, voxel, frame, timesurface, graph}.
    ``EventSample`` -> {voxel, frame, timesurface, graph} (re-derived from the
    aggregate); ``as_="spike"`` RAISES :class:`UniEventIntegrityError`.
    """
    if as_ not in REPRESENTATIONS:
        raise ValueError(f"unknown representation {as_!r}; choose from {list(REPRESENTATIONS)}")

    from . import representations as _r  # the builders package

    if isinstance(obj, EventStream):
        return _r.build(obj, as_)

    if isinstance(obj, EventSample):
        if as_ == "spike":
            raise UniEventIntegrityError(
                f"cannot build raw 'spike's from an aggregated EventSample(kind={obj.kind!r}): "
                "per-event timestamps and polarity were lost during aggregation. "
                "'spike' requires a raw EventStream."
            )
        return _r.resample(obj, as_)

    raise TypeError(
        f"represent() expects EventStream or EventSample, got {type(obj).__name__}"
    )
