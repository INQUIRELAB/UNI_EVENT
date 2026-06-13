"""Dev-only previews: render the REAL representations as PNGs to eyeball the data.

    python scripts/preview.py [out_dir]

Not part of the public demo (the Labs are the experience) — this is the
`rep.show()`-style sanity check the build agent uses to confirm the real stream
is legible, plus provenance PNGs for docs. Uses matplotlib (the [dev] extra).
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap, TwoSlopeNorm

import unievent as ue

ON, OFF, BG = ue.PALETTE["on"], ue.PALETTE["off"], ue.PALETTE["bg"]
# diverging map: OFF(cool) -> dark -> ON(warm)
CMAP = LinearSegmentedColormap.from_list("polarity", [OFF, "#0b0e16", ON])


def main(argv: list[str]) -> int:
    out = Path(argv[1]) if len(argv) > 1 else Path("_previews")
    out.mkdir(parents=True, exist_ok=True)
    s = ue.sample_stream()

    # 1) event frame (signed accumulation) — should reveal scene structure
    fr = ue.represent(s, as_="frame").buffers["frame"]
    fig, ax = plt.subplots(figsize=(10, 5.6), facecolor=BG)
    ax.imshow(fr, cmap=CMAP, norm=TwoSlopeNorm(vcenter=0, vmin=-4, vmax=4), interpolation="nearest")
    ax.set_title(f"event frame — {s.source['name']} ({s.source['license']}) — {s.n_events:,} real events",
                 color="#cdd3e0", fontsize=11)
    ax.axis("off")
    fig.tight_layout()
    fig.savefig(out / "frame.png", dpi=110, facecolor=BG)
    plt.close(fig)

    # 2) space-time projection (x vs t), polarity-colored — the "wow" of raw events
    t = (s.t - s.t[0]) / 1000.0  # ms
    on = s.p == 1
    fig, ax = plt.subplots(figsize=(10, 5.6), facecolor=BG)
    ax.scatter(t[~on], s.x[~on], s=0.6, c=OFF, alpha=0.35, linewidths=0)
    ax.scatter(t[on], s.x[on], s=0.6, c=ON, alpha=0.35, linewidths=0)
    ax.set_facecolor(BG)
    ax.set_xlabel("time (ms)", color="#9aa3b5")
    ax.set_ylabel("x (px)", color="#9aa3b5")
    ax.set_title("raw events in space-time (x vs t) — structure is hard to read here", color="#cdd3e0", fontsize=11)
    for spine in ax.spines.values():
        spine.set_color("#222")
    ax.tick_params(colors="#5b6170")
    fig.tight_layout()
    fig.savefig(out / "spacetime_xt.png", dpi=110, facecolor=BG)
    plt.close(fig)

    # 3) y vs t too (vertical structure / moving pedestrians)
    fig, ax = plt.subplots(figsize=(10, 5.6), facecolor=BG)
    ax.scatter(t[~on], s.y[~on], s=0.6, c=OFF, alpha=0.35, linewidths=0)
    ax.scatter(t[on], s.y[on], s=0.6, c=ON, alpha=0.35, linewidths=0)
    ax.set_facecolor(BG)
    ax.set_xlabel("time (ms)", color="#9aa3b5")
    ax.set_ylabel("y (px)", color="#9aa3b5")
    ax.set_title("raw events (y vs t)", color="#cdd3e0", fontsize=11)
    fig.tight_layout()
    fig.savefig(out / "spacetime_yt.png", dpi=110, facecolor=BG)
    plt.close(fig)

    print(f"[preview] wrote frame.png, spacetime_xt.png, spacetime_yt.png to {out}")
    print(f"[preview] frame range [{fr.min():.0f},{fr.max():.0f}], nonzero {int((fr!=0).sum()):,} px")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
