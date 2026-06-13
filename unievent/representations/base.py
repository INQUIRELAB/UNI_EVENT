"""The :class:`Representation` result object — what every builder returns.

It holds the canonical SPEC arrays (full precision) plus provenance and stats,
and knows how to bake itself into a static web bundle via ``.to_web()`` (the
one-liner the README promises and the Labs consume).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np

__all__ = ["Representation"]


@dataclass
class Representation:
    """One built representation: SPEC-shaped arrays + provenance + stats.

    ``buffers`` holds the canonical arrays exactly as ``represent/SPEC.md``
    specifies (full precision; e.g. spike ``t`` stays int64 µs). ``web.export``
    down-converts to the web-bundle dtypes (e.g. int32 zero-based ``t``).
    """

    kind: str
    buffers: dict[str, np.ndarray]
    H: int
    W: int
    source: dict
    stats: dict[str, Any] = field(default_factory=dict)
    params: dict[str, Any] = field(default_factory=dict)

    def to_web(self, out_dir):
        """Bake this representation to ``out_dir/{manifest.json, payload.bin}``."""
        from ..web import export

        return export(self, out_dir)

    def __repr__(self) -> str:  # pragma: no cover - cosmetic
        shapes = {k: tuple(v.shape) for k, v in self.buffers.items()}
        return f"Representation(kind={self.kind!r}, buffers={shapes}, simulated={self.source.get('simulated')})"
