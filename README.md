<div align="center">

# UniEvent

### One suite. Zero to hero. Education · visualization · unification · research — for event-based vision.

```python
import unievent as ue
ue.represent(ue.sample_stream(), as_="frame").to_web("labs/public/data/frame")
```

**Any event-camera recording → one canonical `(x, y, t, p)` stream → spike · voxel · frame · graph (+ time-surface), from a single call.**

### [**▶ Open the live experience →**](https://uni-event-yazan-inquire.vercel.app)

[The library](#the-library) · [The merge](#the-merge-one-function-two-audiences) · [Reproduce](#reproduce-make-grade)

</div>

---

> **Why this exists.** Event cameras are the most exciting sensor in computer vision — microsecond latency, HDR, sparse, power-sipping — and the hardest to *get into*. There is no on-ramp: no place where a newcomer sees what an event stream *is*, feels why the representation matters, and walks out building with a real tool. UniEvent is that on-ramp. It is research-and-education infrastructure: a genuine problem → solution, taught from first principles, open-source for the field — built by an educator writing its textbook.
>
> Built by **Yazan** ([@INQUIRELAB](https://github.com/INQUIRELAB)) — PhD researcher and educator in neuromorphic, event-based vision, author of the field's forthcoming textbook.

## The two legs

| | | |
|---|---|---|
| **UniEvent** — the library | the **engine** | Canonical `(x,y,t,p)` → every representation. `pip install`-able, one import, fully typed, integrity-checked. |
| **The Labs** — the experience | the **face** | A Next.js + React-Three-Fiber + GSAP journey that teaches event cameras from first principles — and renders **real UniEvent output**, baked into static bundles. Zero backend on stage. |

### The merge (one function, two audiences)

The thing that **teaches** you is the thing you **build** with. The Labs do not mock anything: every visual is a static bundle emitted by `unievent.web.export()` from a real CC0 event recording, with a provenance block behind each frame. `represent()` serves the researcher and the newcomer with the same call.

```
recording.raw ──ue.io.decode──► EventStream(t,x,y,p) ──ue.represent──► spike │ voxel │ frame │ graph
                                                              │
                                                       .to_web() ──► manifest.json + payload.bin ──► the Labs (R3F)
```

## The library

```python
import unievent as ue

stream = ue.sample_stream()                 # EventStream: real raw t,x,y,p (CC0 Prophesee clip)
ue.represent(stream, as_="spike")           # SNN-ready raw spikes — the hero
ue.represent(stream, as_="voxel")           # sparse (t_bin,y,x) grid + [off,on] feats
ue.represent(stream, as_="frame")           # signed accumulation image (H,W)
ue.represent(stream, as_="graph")           # kNN graph in normalized (x,y,t)

# bake all four into static web bundles the Labs read:
ue.represent(stream, as_="frame").to_web("labs/public/data/frame")
```

### Integrity rule (stated identically in `SPEC.md`, `rubric.md`, this README)

> `spike` requires a raw `EventStream`. `represent(EventSample, as_="spike")` **RAISES**.
> You cannot fabricate real per-event spikes from an aggregated representation — events ARE spikes, and once aggregated they are gone.

This is not a slogan; it is a tested contract (`tests/test_integrity.py`). Real failures crash loudly. Every visual traces to a real `source` with a `simulated` flag — the hero is `simulated: 0`.

## Install

```bash
pip install -e ".[io,dev]"   # library + .raw decoder + tests
cd labs && npm install       # the R3F / Next.js Labs
```

Lean by design: the base `pip install unievent` needs only `numpy` + `scipy`, so a newcomer can run `represent()` on their own `(t,x,y,p)` arrays immediately. Decoding vendor `.raw` files (`[io]`) and heavy DL deps (`[datasets]`) are opt-in.

## Build the Labs data + run

```bash
unievent bake pedestrians.raw --out labs/public/data --reps spike,voxel,frame,graph
make serve        # cd labs && npm run dev
make grade        # PASS/FAIL rubric scorecard
```

## Reproduce (`make grade`)

`done` is machine-verifiable. [`rubric.md`](rubric.md) is a list of real commands with real exit codes; `make grade` prints a scorecard:

1. `pip install -e .` → exit 0  ·  2. `pytest -q` → 0 failures  ·  3. four builders match SPEC shapes/dtypes on one real stream  ·  4. the spike-integrity guard RAISES  ·  5. bundles are schema-conformant  ·  6. the live Labs URL responds  ·  7. a clean clone reaches the hero bundle  ·  8. the built-today fence holds.

## Data + license

Hero clip = a **CC0** Prophesee recording (real raw events, decoded with `expelliarmus`, windowed + uniformly decimated for the web — a render choice, stated in the provenance; every surviving per-event value is real). No restricted data ships in this repo; a license-gate test fails the build if it ever does.

## Layout

```
unievent/            the library (one import)
  core.py            EventStream / EventSample + represent() dispatch + integrity raise
  represent/         spike · frame · voxel · graph · timesurface builders + SPEC.md
  web.py             web.export() — bake a representation to a static bundle
  io.py              decode .raw, window/decimate, npz round-trip
  cli.py             `unievent bake` one-command entrypoint
labs/                Next.js + R3F + GSAP — renders real UniEvent output
scripts/             make_bundles.py · grade.sh · reproduce.sh
rubric.md            machine-checkable PASS/FAIL list
WEB_BUNDLE_SCHEMA.md the static bundle contract
```

---

<div align="center">
<sub>MIT-licensed library · CC0 hero data · built in one day, commit by commit — see <code>BUILD_JOURNAL.md</code> and <code>ORCHESTRATION.md</code>.</sub>
</div>
