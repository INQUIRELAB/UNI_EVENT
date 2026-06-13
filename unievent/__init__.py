"""UniEvent — one import, one canonical ``(x, y, t, p)`` stream, every representation.

    import unievent as ue
    stream = ue.sample_stream()                         # real raw events (EventStream)
    ue.represent(stream, as_="frame").to_web("labs/public/data/frame")

Any event-camera recording -> one canonical stream -> spike / voxel / frame /
graph (+ stretch time-surface) from a single call. The Labs render REAL output
of this library; the thing that teaches you is the thing you build with.
"""
from __future__ import annotations

from .core import (
    EventSample,
    EventStream,
    MODEL_HINT,
    REPRESENTATIONS,
    UniEventIntegrityError,
    represent,
)
from .representations.base import Representation
from . import web
from . import io

__version__ = "0.1.0"

# polarity palette (LOCKED): warm ON, cool OFF — used by the library previews and the Labs.
PALETTE = {"on": "#FF5A3C", "off": "#3CC8FF", "bg": "#05060A"}

__all__ = [
    "__version__",
    "EventStream",
    "EventSample",
    "Representation",
    "REPRESENTATIONS",
    "MODEL_HINT",
    "UniEventIntegrityError",
    "represent",
    "sample_stream",
    "web",
    "io",
    "PALETTE",
]


def sample_stream() -> EventStream:
    """Return the bundled REAL hero clip as an :class:`EventStream` (raw t, x, y, p).

    Despite the name this returns an *EventStream* (raw events), not an
    *EventSample* — "sample" refers to the bundled sample clip, not the type.
    """
    return io.load_sample()
