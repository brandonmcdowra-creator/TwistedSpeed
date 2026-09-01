# BUILD 441 — "SCRAP LINE" (director decision)

**Status:** planned, not implemented. Written against measured BUILD 440 runtime.
**Reference pressure:** 80Level / Turbo Sloths (RainStyle, UE5) — multi-ton rigs at insane
speed, opponents turned to scrap while racing, wasteland density, story-rich scrap props.
**Honest constraint:** we do not reach UE5 photoreal on a MeshBasic three.js runtime this
session. We close the largest *felt* gap instead.

---

## Measured baseline (BUILD 440, chase at 140 mph, Neon Circuit)

Captured this session at 1280×720, throttle held, Marrow, Night 5:

| Probe | Value |
|-------|-------|
| Draw calls | **586** |
| Triangles | **64,302** |
| Geometries | 3,377 |
| Textures | 31 |
| Renderer | ANGLE / SwiftShader (software) |

Baseline frames captured to `gauntlet/shots/v440-baseline-chase-{early,maglev,warden}.png`
(local only — `gauntlet/shots` is gitignored; re-capture with the drive script in §5).

**The number that decides the build:** 586 draw calls against 64k triangles. We have roughly
5× triangle headroom and almost **no** draw-call headroom. Every prop this build adds must be
instanced or it does not ship. FPS in this container is meaningless (software rasteriser) —
draw calls and triangles are the budget.

---

## 1. Top 5 gaps vs Turbo Sloths, ranked for chase-cam at race speed

**1. The ribbon is empty.** 23 m of clean asphalt with nothing on it. Every solid object obeys
the sacred setback (≥2.4 m outside the curb), so at speed there is nothing to thread, nothing
to smash, and no racing line carved by clutter. Turbo Sloths' core texture is *matter in your
lane*. This is simultaneously the biggest look gap and the biggest gameplay gap, and it is the
one that most directly serves our own locked pillar: hold throttle while dodging.

**2. Nothing crosses overhead, so speed has no near-field reference.** The sky is a large empty
wedge; the only thing spanning the road is the START gate. Speed reads from objects flicking
*past and over* the camera, and our roadside is parallel strips that slide rather than objects
that whip by. Turbo Sloths gets free velocity from gantries, pipes and hanging signage.

**3. Kills leave no trace.** `_corpseT = 3.2` then `mesh.visible = false`. "Turn opponents into
scrap" is the reference's entire hook, and here carnage is a toast plus a floating octahedron.
Twenty seconds after a triple wreck the track looks exactly as it did before the fight.

**4. Roadside frontage reads as flat pastel cards.** Bright unlit rectangles — pink, apricot,
lilac. That satisfies "neon over rust" but currently it is neon over *nothing*: no scarred
concrete, no scrap silhouettes, no story props. Turbo Sloths sells story-rich wasteland junk.

**5. Nothing in the world breaks.** Hazards damage the player; the player never damages the
world. Mass exists in data (0.55 Needle → 1.75 Mausoleum) but only ever surfaces in ram damage,
so "multi-ton" is a stat, not a feeling.

Considered and deliberately ranked out: weather variety (rain already reads well), material
photorealism (wrong fight, and blocked by the MeshBasic lock), track layout — sharp turns and
airstrip straights (path geometry is locked and re-authoring it is a far more invasive build).

---

## 2. DECISION — one cohesive pass

### BUILD 441 · **SCRAP LINE**

> **The Sepulcher is a freight yard being wrecked, and you narrow the road by driving through it.**

Gaps 1, 3 and 5 are one system seen from three angles: *freight matter on the ribbon that you
can hit, that breaks, and that your kills add to.* Gap 2 rides along on the same fiction as the
freight yard's overhead. That is one idea, not a kitchen sink:

intact freight on the shoulders → broken freight when you plough it → wrecked rigs that
**become** freight.

Gap 4 (frontage dressing) is explicitly **not** in this build. It is the least felt of the five
at speed and it would turn this into a dressing pass.

---

## 3. DO THIS — deliverables

### D1 · Shoulder freight (environment)
New module `web/js/scrapline.js`. Five `InstancedMesh` for the entire 2.2 km:

| Kit | Geometry | Notes |
|-----|----------|-------|
| `drum` | Cylinder 8-seg | rusted barrel, neon hazard band baked into the canvas texture |
| `block` | Box | concrete ballast / jersey mass |
| `spool` | Cylinder on its side | cable spool |
| `crate` | Box | stacked freight pallet, WARDEN FREIGHT stencil |
| `glow` | additive disc | **required** — dark MeshBasic props on dark asphalt will not read at 140 mph |

- ~90–140 clusters, 2–4 instances each → ~300–450 instances, **5 draw calls total**.
- Placement seeded from `state.meta.stage` + map id via `U.seeded()` — same night, same layout.
- Lateral band **0.46–0.92 × roadHalf**, both sides. The centre 46 % (≈10.6 m) is always clear.
- Progress bands: nothing below `t = 0.15`; nothing in `[0.26, 0.34]` (maglev); thinned to ~35 %
  density across `[0.38, 0.56]` so it never fights the warden sweep telegraph; nothing above
  `t = 0.90` (ceremony owns the last mile).
- LOD by instance-matrix ring: instances beyond ~130 m get a scale-0 matrix, rewritten in thirds
  per frame like the existing `_lodTick % 3` pattern. Instanced meshes bypass the per-object LOD
  in `updateLOD`, so this has to be explicit.

### D2 · Freight breaks (props + juice, and mass finally means something)
- Collision: XZ distance test against clusters inside a progress window around each body,
  following the existing `state.hazards.forEach` pattern in `game.js`.
- On hit: instance matrix → scale 0 (gone for the race), emit through the **existing** particle
  pool (`sparks`, `spawn('smoke')`, `hitBurst`) — zero new draw calls — plus a small `camShake`
  and `_fovPunch`.
- Speed tax scales with `p.mul.mass`: Mausoleum (1.75) sheds ~8 %, Needle (0.55) sheds ~22 % and
  takes a small lateral kick. Hard floor on speed, and a ~0.6 s cap on total loss so a row of
  clusters can never chain-stop you.
- Chip damage 2–4 HP flat. This is a **speed** decision, not an attrition decision.
- Rivals break freight too, with no damage and a smaller slow — the pack carves the line with
  you, which is what makes the yard feel shared rather than staged.

### D3 · Hulks stay (gameplay persistence)
- At `_corpseT ≤ 0`, stop hiding the mesh. Settle the pitch, stop the spin, park the hulk at its
  final position, darken it further, and register it in `state.hazards` as a `debris` entry so it
  reuses the collision that already exists and is already soft.
- Slow smoke plume, throttled hard: one emit per ~1.2 s, only within ~90 m of camera.
- Cap 6 hulks; oldest fades out if exceeded. Cleared on race teardown — **per-race only**.

### D4 · Freight gantries (near-field speed cue) — *first item to cut if budget bites*
- 4–6 spans over the road at **≥7.0 m** clearance, which is already legal: `_assertDrivelineClear`
  skips anything whose box sits above `p.y + 6.0` (drive-under).
- Two instanced meshes: beam + legs kit, and an additive underside light bar. ~3 draw calls.
- Placed at district gates 0.10 / 0.66 / 0.80 plus two fillers. Never within ±0.04 of
  `CROSS_T = 0.30`.

### Budget lock
**≤ +12 draw calls and ≤ +120k triangles** against the measured 586 / 64,302.

---

## 4. DON'T

- **Never** place anything in the centre 44 % of the ribbon. Not one instance, not one hulk spawn.
- Don't touch `maglev.js` `CROSS_T / SPEED / SPEED_NEAR / GAP / LOOP / WAIT`, or `warden_lane.js`
  `T0 / T1 / CYCLE`. Wait/gap is locked.
- Don't add a per-prop `Mesh`. Instanced only. No new `PointLight`. No `MeshStandard` on clutter.
- Don't change `saveKey`, the save schema, or the locked toast substrings (BONE HARVEST,
  THREAD THE VEIN, VEIN MISS, BLACKOUT KISS, REAR VEIN).
- Don't give freight hits a toast. It is a physical beat, not a HUD beat — the message channel is
  already crowded and v439/v440 spent real work protecting it.
- Don't write `if (!x)` against a density index, district index, lane index or instance index.
  **Zero is real** — instance 0 and district 0 (INTAKE ROW) are both live.
- Don't touch the path geometry. Sharp turns and airstrip straights are a different, invasive build.
- Don't reach for PBR, normal maps or photoreal materials on clutter. MeshBasic-friendly is locked.
- Don't copy Turbo Sloths props one-to-one. Freight-prison fiction only, original cast, our own
  stencil vocabulary (SEP-12, WRDN-03, HOLD-9, PAROLE).
- Don't let hulks accumulate without a cap or survive across races.
- **Don't ship if a full-speed Needle run through the densest cluster row stops the car.** Soft
  hazards are a lock: they punish, they never brick.

---

## 5. ACCEPTANCE

FPS is not a gate — this container renders in software (SwiftShader). Gate on counters, state
probes and frames.

**Probes** (console / `GAME.state`, all must pass):

1. **Budget** — `GAME.renderer.info.render` at `t ≈ 0.20 / 0.45 / 0.70`: `calls ≤ 598`,
   `triangles ≤ 185000`.
2. **Centre clear** — sweep `t = 0…1` in 400 steps; assert no clutter instance and no hulk has
   `|lat| < 0.44 × roadHalf`. Must return **0 violations**.
3. **No-go bands** — 0 clutter instances at `t < 0.15`, in `[0.26, 0.34]`, or at `t > 0.90`.
4. **Determinism** — build the layout twice with the same stage seed, hash instance positions,
   require identical hashes. Randomness stays honest and bugs stay reproducible.
5. **Soft hazard** — Needle, full throttle, straight through the densest row: speed never drops
   below 55 % of max, total HP loss across the row < 15, car never reaches 0 speed.
6. **Mass reads** — same row, Mausoleum vs Needle, record exit speed for each. Mausoleum must
   exit meaningfully faster. If it doesn't, the mass curve is decoration and the pass has failed
   its gameplay half.
7. **Persistence** — kill a rival, drive 400 m, then assert the hulk is still `visible === true`
   and present in `state.hazards` after 10 s.
8. **Maglev lock** — diff shows no change to the timing constants, plus one wait frame and one
   gap frame matching v440 behaviour.

**Frames** (1280×720, chase, throttle held), side-by-side against the three v440 baselines:

- `b441-chase-freight.png` — `t ≈ 0.20`, shoulder freight lining the lane
- `b441-chase-maglev.png` — `t ≈ 0.33`, junction visibly unchanged
- `b441-gantry.png` — a span passing overhead
- `b441-break.png` — mid-impact, freight shattering
- `b441-hulks.png` — two or more burning hulks left on the ribbon behind

---

## 6. FILES

| File | Change | Size |
|------|--------|------|
| `web/js/scrapline.js` | **new** — kit, instanced build, LOD ring, break state | ~450–600 lines |
| `web/js/world.js` | hook only: build/teardown, feed `path` + `roadHalf`, district gates for gantries | keep under ~60 lines (file is already 3,991) |
| `web/js/game.js` | collision + break + mass tax in the hazard loop; `_corpseT` → persistent hulk | ~120 lines |
| `web/js/config.js` | `scrapLine` block: band densities, lateral band, mass curve, hulk cap | ~30 lines |
| `web/js/particles.js` | only if the existing sparks/smoke combo isn't punchy enough | 0 or one preset |
| `web/index.html` | script tag + `?v=441` on every tag, title, `BUILD 441` | small |
| `PROGRESS.md`, `CHANGELOG.md`, `docs/AAA-ROADMAP.md` | bookkeeping | small |

**Roadmap note:** this is inserted as **P1.4** (race feel). It is *not* the roadmap's next
unchecked item, and that is deliberate — P2.3 Parole Arch stays next and lands better when the
player arrives at it through a mile of freight they personally wrecked.

---

## 7. FOR COMPOSER

> BUILD 441 "SCRAP LINE": add `web/js/scrapline.js` — seeded instanced freight clutter (drums,
> ballast blocks, cable spools, crates, plus one additive glow disc; 5 InstancedMesh total) on
> the outer shoulders of the Neon ribbon only (lateral 0.46–0.92 × roadHalf, centre 44 % always
> clear; skip t<0.15, skip t∈[0.26,0.34] for maglev, thin to 35 % across the 0.38–0.56 warden
> sweep, skip t>0.90), make each cluster shatter on contact into the existing particle pool with
> a mass-scaled speed tax (heavy ploughs, light bounces, hard speed floor, ≤4 HP chip, never a
> stop), stop hiding dead rivals at `_corpseT` so wrecks stay as smoking soft-debris hulks
> (cap 6, per-race only, registered in `state.hazards`), and hang 4–6 instanced freight gantries
> at ≥7 m over the road at district gates — all inside +12 draw calls and +120k triangles of
> BUILD 440's measured 586 / 64,302, MeshBasic only, no new PointLights, no maglev or warden
> constant changes, no toast for freight hits, no save-format or toast-substring changes.
