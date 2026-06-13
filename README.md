<div align="center">

# UniEvent

### One suite. Zero to hero. Education · visualization · unification · research — for event-based vision.

```python
import unievent as ue
ue.represent(ue.sample_stream(), as_="frame").to_web("labs/public/data/frame")
```

**Any event-camera recording → one canonical `(x, y, t, p)` stream → spike · voxel · frame · graph (+ time-surface), from a single call.**

### [**▶ Open the live experience →**](https://uni-event-yazan-inquire.vercel.app)

[The library](#the-library) · [The merge](#the-merge-one-function-two-audiences) · [How it scores](#how-it-scores) · [Reproduce](#reproduce-make-grade)

<sub>🟠 Proud submission · **Anthropic Build Day** · San Francisco · 13 June 2026 · @Shack15</sub>

</div>

---

> **Why this exists.** Event cameras are the most exciting sensor in computer vision — microsecond latency, HDR, sparse, power-sipping — and the hardest to *get into*. There is no on-ramp: no place where a newcomer sees what an event stream *is*, feels why the representation matters, and walks out building with a real tool. UniEvent is that on-ramp. It is research-and-education infrastructure: a genuine problem → solution, taught from first principles, open-source for the field.
>
> Built by **Yazan** ([@INQUIRELAB](https://github.com/INQUIRELAB)) — PhD researcher and educator in neuromorphic, event-based vision. *(An Event-Vision-to-AI textbook is on the way from our INQUIRE.ai team.)*

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

## The experience — a zero-to-hero journey · [▶ live](https://uni-event-yazan-inquire.vercel.app)

Built backward from one hero moment that proves impact and demo at once. Four scroll beats, each rendered from real `ue.represent()` output, with a **provenance line** behind every visual showing the real call + count (the merge, made visible):

1. **The hook** — the raw spike stream as an orbitable **space-time point cloud** (x×y = image plane, z = time), born event-by-event on real microsecond timestamps. *"What am I even looking at?"*
2. **The payoff** — integrate those same events over time and the scene resolves into a legible **event frame**: two people, walking. *Representation is everything, felt.*
3. **The unification** — one stream, four ways: the time axis morphs across **spike → frame → voxel → graph**, every view a real `ue.represent(stream, as_=…)` call, each labelled with the AI model it feeds (spike → neuromorphic SNN, frame → CNN, voxel → sparse 3D-conv, graph → GNN).
4. **The Opus touch** — **Claude reads the sensor**: Opus 4.8 narrates the clip from *real computed stats* (never vibes), with a live "ask about this clip" answered, grounded, on stage. See [`ORCHESTRATION.md`](ORCHESTRATION.md) for how an adversarial integrity-auditor agent keeps it honest.

## From a tangle of formats to one import

The event-camera world has no standard. Every dataset ships its own loader, its own format, its own quirks — so most projects burn days on glue before they can train anything.

| The usual way | UniEvent |
|---|---|
| A different loader / SDK per dataset (DSEC · Gen1 · PEDRo · FRED · 1Mpx…) | **one import** — `import unievent as ue` |
| Glue code to reconcile incompatible event formats | **one canonical** `(x, y, t, p)` stream |
| Hand-rolled representation code, often buggy (unseeded RNG, `argmax` time-collapse, silent skips) | **`represent(stream, as_=…)`** → spike · voxel · frame · graph — seeded, fail-loud, tested |
| Days of preprocessing before a model sees data | **model-ready arrays** + static web bundles, in one call |
| No shared on-ramp for newcomers | an interactive **zero-to-hero** experience, rendered from the same output |

Pain → solution, undeniable: per-dataset glue and weeks of preprocessing collapse into **one stream → any representation → the right AI model**.

## How it scores

- **Impact** — the field's most exciting sensor has its steepest on-ramp; UniEvent is the missing unified bridge from raw events to AI-ready representations, taught from first principles on real CC0 data, end to end. Built by an educator in the field (textbook on the way from INQUIRE.ai) — authority you can't fake in a day.
- **Demo** — a live, deployed [zero-to-hero experience](https://uni-event-yazan-inquire.vercel.app): the performed space-time cloud → accumulate to a legible event frame (two people, walking) → one stream, four representations → Claude reading the sensor.
- **Opus 4.8 creative use** — an in-Labs tutor that *perceives a sensor modality it cannot natively see*, grounded in real computed stats (never vibes), plus a live, capped "ask about this clip."
- **Orchestration** — the autonomy story below + [`ORCHESTRATION.md`](ORCHESTRATION.md) + `make grade` **8/8**.

### How this was built (the autonomy story)

Briefed once with a vision and a **machine-checkable rubric**, then told to go — Claude (Opus 4.8) ran it as a fleet. By the git log, the initial build was **9 commits from 14:36 to 16:34** (`git log --reverse`): it designed the library, decoded the CC0 recording, baked real bundles **through** the library, ported a deep-learning reference's *logic while fixing its bugs* (unseeded RNG → seeded, `argmax` time-collapse → full structure, silent skips → fail-loud), and **screenshotted its own WebGL with Playwright** — catching and fixing its own bugs (a 145× point-size blowout; an un-legible hero window) — all while keeping `make grade` green. It survived a **mid-session socket drop** and continued on a one-line "continue"; the only human inputs were answers to its **own clarifying questions** (data license, identity, Opus-on-stage) and a single "looks right." Then a second focused brief for the finishing pass — the security cap, the sensor opener, the data→AI arc, the Opus visual — same loop: **brief → autonomous → verify.** Full evidence in [`ORCHESTRATION.md`](ORCHESTRATION.md) and [`BUILD_JOURNAL.md`](BUILD_JOURNAL.md).

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
unievent/             the library (one import)
  core.py             EventStream / EventSample + represent() dispatch + integrity raise
  representations/    spike · frame · voxel · graph · timesurface builders + SPEC.md
  web.py              web.export() — bake a representation to a static bundle
  io.py               decode .raw, window/decimate, npz round-trip
  cli.py              `unievent bake` one-command entrypoint
labs/                 Next.js + R3F + GSAP — renders real UniEvent output
  app/api/ask/        live "ask about this clip" → Claude Opus 4.8 (grounded)
scripts/              make_bundles.py · clip_stats.py · grade.sh · reproduce.sh
rubric.md             machine-checkable PASS/FAIL list · ORCHESTRATION.md  build evidence
WEB_BUNDLE_SCHEMA.md  the static bundle contract
```

---

<div align="center">
<sub>MIT-licensed library · CC0 hero data · built in one day, commit by commit — see <code>BUILD_JOURNAL.md</code> and <code>ORCHESTRATION.md</code>.</sub>
</div>
