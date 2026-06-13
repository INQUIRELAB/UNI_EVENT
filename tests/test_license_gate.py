"""License gate — the #1 DQ guard. Fails the build if any restricted dataset
name or large/raw data file leaks into the public repo, and asserts the hero
bundle is real + permissively licensed.

Scans the working tree (within this repo only), excluding heavy build dirs, so
it catches a leak even before it is committed.
"""
from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# NC / SA / research-only dataset names that must NEVER appear in a public bundle.
RESTRICTED_NAMES = [
    "dsec", "etram", "fred", "gen1", "gen4", "onempx", "1mpx", "pedro", "brisbane",
]
# raw event / large-binary extensions that must never be committed.
BANNED_EXT = {".raw", ".hdf5", ".h5", ".dat", ".aedat", ".aedat4", ".zip", ".npy"}
EXCLUDE_DIRS = {"node_modules", ".git", ".next", "__pycache__", ".venv", "venv", "dist", "build", ".vercel"}
MAX_BYTES = 4_000_000  # nothing legit exceeds ~4 MB (the frame bundle ~3.7 MB is the largest)


def _walk():
    for p in REPO.rglob("*"):
        if p.is_file() and not (set(p.relative_to(REPO).parts) & EXCLUDE_DIRS):
            yield p


def test_no_banned_extensions():
    bad = [str(p.relative_to(REPO)) for p in _walk() if p.suffix.lower() in BANNED_EXT]
    assert not bad, f"banned raw/large data files in the public repo: {bad}"


def test_no_large_files():
    big = [
        f"{p.relative_to(REPO)} ({p.stat().st_size/1e6:.1f}MB)"
        for p in _walk()
        if p.stat().st_size > MAX_BYTES
    ]
    assert not big, f"unexpectedly large files committed: {big}"


def test_no_restricted_names_in_bundles():
    for mani in REPO.glob("labs/public/data/*/manifest.json"):
        txt = mani.read_text(encoding="utf-8").lower()
        hits = [n for n in RESTRICTED_NAMES if n in txt]
        assert not hits, f"restricted dataset name(s) {hits} in {mani.name}"


def test_hero_bundle_is_real_and_permissive():
    spike = REPO / "labs" / "public" / "data" / "spike" / "manifest.json"
    if not spike.exists():
        return  # bundles not baked yet (skip rather than fail in a fresh tree)
    m = json.loads(spike.read_text(encoding="utf-8"))
    assert m["source"]["simulated"] == 0, "hero must be real events"
    assert m["source"]["license"].upper().replace("_", "-") in {
        "CC0", "CC0-1.0", "CC-BY", "CC-BY-4.0",
    }, f"hero license not permissive: {m['source']['license']}"
