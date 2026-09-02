# Turbo Sloths felt-gap backlog (planner output, v445 baseline)

**Scope:** Neon only. MeshBasic + InstancedMesh. No new external assets.
**Locks respected:** maglev timing · `warden_lane` · soft hazards (speed floor) ·
`scrapLine.clearFrac 0.44` · collidable cap 400 · `saveKey` · toast substrings · draw calls.

Every item below is one commit. Ranked by felt-impact-per-effort.

---

## What the baseline actually looks like

Measured in-browser at v445 (`?v=445&shot=1`, unfrozen, driving):

- **~85% of the 900 dress props never reach the screen.** With `roadHalf 11.5`, the
  sidewalk deck spans lateral 11.56–14.76 at y 0.16. Dress lateral range is 10.58–21.50.
  Measured split: **89 on the asphalt**, **282 inside the deck footprint (100 of them
  buried below deck Y)**, **529 beyond the deck** where the raised deck and curb occlude
  them from a low chase cam. The density budget is already paid for; it just isn't visible.
- **No dust wake at 132 mph.** Dust quads are pinned flat to the ground and rise 13 cm
  over their whole life, so the chase cam sees them nearly edge-on.
- **No exhaust heat unless nitro is held.** `nitroFlame.visible = !!p.nitroActive`.
- **Ground is a flat untextured slab** (`0x12161f`, 4200 × 4200, no map).
- Net read: tidy neon street, not wasteland.

Frame timing was not measured meaningfully — this VM renders through software GL
(median 222 ms/frame), so treat all perf claims here as reasoning about work done per
tick, not as measured regressions.

---

## Verification recipe (use for every item)

```js
// 1. Load and un-freeze. ?shot=1 calls prepareMoneyShotFrame() which sets _frozen = true;
//    the sim is stopped until you clear it. This is the #1 way to get a false negative.
await page.goto('http://127.0.0.1:8765/?v=445&shot=1');
await page.evaluate(() => { GAME.state._frozen = false; });

// 2. Drive (don't teleport if you can avoid it — see note).
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' })));

// 3. Teleport, if you must: set BOTH pos and progress. The physics re-derives progress
//    from world position via world.nearest(), so it will drift off your target t and can
//    drop the car off the ribbon. Verify state.player._lat ≈ 0 after teleporting.
```

---

## Ranked backlog

### 1. SL-01 — Lift shoulder dress onto the walkway berm
*Fantasy: the freight yard has spilled its guts over the kerb and onto the walkway.*

- **Files:** `web/js/scrapline.js` → `placeMatrix()`, `spawn()` dress loop.
- **Numbers:** define `DECK_INNER = roadHalf + 0.06` (11.56), `DECK_OUTER = roadHalf + 3.26`
  (14.76), `DECK_Y = 0.16`. At spawn, stamp `item.yBase = (|lat| >= DECK_INNER && |lat| <
  DECK_OUTER) ? DECK_Y : 0`, and add `item.yBase` in `placeMatrix`. Raise the `shard`
  Y offset 0.04 → 0.09 so it clears whatever surface it lands on instead of z-fighting.
- **Verify:** eval the same lateral-band census used above and confirm
  `buriedUnderDeckY === 0`; screenshot at progress ≈ 0.20 showing junk sitting on the walkway.
- **Risk:** low-medium. Watch for `scrub` planes clipping through the deck edge.
- **Size:** ~30 lines.

### 2. DB-01 — Billboard the dust so the wake is visible from the chase cam
*Fantasy: you drag a wall of grit behind you.*

- **Files:** `web/js/debris.js` → `writeDust()`, `update()` (accept `ctx.camera`), `puff()`.
- **Numbers:** replace the fixed `-PI/2` X-rotation with a yaw-only camera-facing
  quaternion (upright cards, no pitch, so they don't fan flat). Dust rise
  `0.15` → `1.1` m/s. Base opacity `0.55` → `0.70`. Keep `DUST_CAP 64` for this commit.
- **Verify:** eval a dust instance matrix and assert the decomposed quaternion has a
  non-zero Y component; screenshot at ~130 mph with visible grit behind the car.
- **Risk:** low. `writeDust` currently allocates a `Vector3` per call — hoist it while
  you are in there.
- **Size:** ~50 lines.

### 3. VX-01 — Always-on exhaust heat, nitro becomes the peak
*Fantasy: the thrusters are lit whenever your foot is down.*

- **Files:** `web/js/game.js` → `pulseFlame()` (~line 3822).
- **Numbers:** drop `nf.visible = !!p.nitroActive`; always visible during race. Idle-cruise:
  opacity `0.18 + throttle * 0.30`, scale `(0.35 + speedNorm * 0.35)`, colour amber
  `0xff7a2a`. Nitro: current values, colour lerps to `0x66f0ff` over 0.15 s.
- **Verify:** eval `GAME.state.player.mesh.userData.nitroFlame.visible === true` while
  `player.nitroActive` is false; screenshot from chase.
- **Risk:** low. `flame2 = flame.clone()` shares the material, so one opacity write drives
  both cones — intended, just don't be surprised.
- **Size:** ~25 lines.

### 4. SL-02 — Stop non-collidable dress from sitting on the racing surface
*Fantasy: road grit reads as grit, not as a bush you drive through.*

89 dress items currently spawn inside `roadHalf`, so cars ghost straight through gravel
lumps and scrub planes. The v443 lip intended "past the collidable 0.90 cap", not
"on the asphalt".

- **Files:** `web/js/scrapline.js` → `spawn()` dress loop.
- **Numbers:** when `latMul < 1.02`, force `dk = 'shard'` (flat, 0.12 m tall — ghosting is
  invisible) instead of picking from all three kinds. Leaves the lip intact; kills the tell.
- **Verify:** eval that every dress item with `|lat| < roadHalf + 0.06` has `kind === 'shard'`.
- **Risk:** low.
- **Size:** ~6 lines.

### 5. WD-01 — Grit the ground plane
*Fantasy: off the ribbon is dirt and ash, not a coloured void.*

- **Files:** `web/js/world.js` → `_buildGround()`, plus a new `_groundTextures()` modelled
  on the existing `_roadTextures()` canvas helper.
- **Numbers:** 256 px canvas, base `0x241d18` warm ash, ~6000 aggregate specks at alpha
  0.6, a dozen darker drift streaks. `RepeatWrapping`, `repeat.set(60, 60)`. Same single
  mesh, same single material — zero new draw calls.
- **Verify:** eval that the ground mesh's `material.map` is non-null; screenshot aimed off
  the ribbon.
- **Risk:** low.
- **Size:** ~45 lines.

### 6. DB-02 — Continuous rooster tail instead of one puff per 100 ms
*Fantasy: two rooster tails off the rear wheels, not a hiccup.*

- **Files:** `web/js/debris.js` → `update()` player-wake block; `web/js/config.js` → `debris`.
- **Numbers:** `playerWake` `0.1` → `0.055`; emit a left/right pair offset ±0.75 m on the
  car's side axis instead of one centre puff; scale `1.1 + sn * 0.8` → `0.9 + sn * 1.4`;
  raise `DUST_CAP` `64` → `96`. Keep `speedNormGate 0.45`.
- **Verify:** eval `GAME.state.debris.dust.length` while cruising above the gate — expect
  a steady 18–30, versus roughly 8 today.
- **Risk:** low-medium — this is the one item that can visibly cost fill rate. Land it
  after DB-01 so you're tuning something you can actually see.
- **Size:** ~35 lines. Do not land before DB-01.

### 7. SL-04 — Glow discs: make them spin, and restore the two-colour mix
*Fantasy: hazard beacons pulse and turn.*

Two confirmed bugs, both cosmetic and both cheap. See the bug list below for detail.

- **Files:** `web/js/scrapline.js` → `placeMatrix()` glow branch, `kindMat()`, `spawn()`/`addPool()`.
- **Numbers:** glow quaternion becomes `rotateX(-PI/2)` **then** `rotateZ(item.spin)` rather
  than an overwrite. Give the glow pool an `instanceColor` and alternate
  `0x00e5ff` / `0xff9f1c` by instance index.
- **Verify:** eval two glow instance matrices 0.5 s apart and confirm the decomposed
  quaternions differ; eval `pools.glow.mesh.instanceColor !== null`. Sample a
  non-LOD-hidden instance — hidden ones decompose to `NaN` because their scale is zero.
- **Risk:** low.
- **Size:** ~25 lines.

### 8. WD-02 — Dirt drift ribbons washing over the asphalt edge
*Fantasy: sand is reclaiming the outside of the track.*

- **Files:** `web/js/world.js` → new `_buildShoulderDrift()`, called from `build()`; reuses
  the existing `_flankRibbonGeo()` helper and WD-01's grit texture.
- **Numbers:** two strips at lateral `roadHalf * 0.72` → `roadHalf`, y offset 0.03,
  colour `0x3a2f24`, opacity 0.35, normal blending, `uvAlongScale 0.12`. Two draw calls total.
- **Verify:** screenshot; eval that meshes named `driftL` / `driftR` exist in `world.buildings`.
- **Risk:** low. Depends on WD-01 for the texture.
- **Size:** ~40 lines.

### 9. SL-06 — Fill the density hole in the Warden band
*Fantasy: the sweep zone is the most choked stretch, not the emptiest.*

Today `spawnProb` multiplies by 0.42 and the dress loop drops to 2 picks with an extra
0.72 rejection across 0.38–0.56 — so the track visibly thins out exactly where the lane
sweep lives.

- **Files:** `web/js/scrapline.js` → `spawn()` dress loop only. **Do not touch `spawnProb`**
  — collidable thinning in the Warden band is hazard behaviour and stays frozen.
- **Numbers:** in the band, keep `picks = 3` and drop the `drv > 0.72` rejection, but force
  `dk` to `'shard'` or `'gravel'` (never `'scrub'`, which stands 0.55 m tall and would
  occlude the sweep telegraph).
- **Verify:** eval a dress-count histogram over t in 0.05 buckets and confirm the
  0.38–0.56 buckets are within 15% of neighbours; confirm `items.length` is unchanged at 184.
- **Risk:** low-medium. Re-drive the sweep and confirm the telegraph still reads.
- **Size:** ~12 lines.

### 10. FX-01 — Give the smash a light kick and a longer blur tail
*Fantasy: hitting a drum flashes the whole cabin.*

- **Files:** `web/js/scrapline.js` → `applyHit()`; `web/js/game.js` → `smashKick` decay (~4002).
- **Numbers:** on player smashes call `ctx.particles.burstLight(hitPos, 0xffa040, 6, 0.12)`.
  Raise `smashKick` `0.28` → `0.38` and slow the decay from `dt / 0.35` to `dt / 0.5`.
  Leave the `postfx` `mb` multiplier (`smashKick * 0.55`) and the 0.52 clamp alone.
- **Verify:** eval `GAME.state.smashKick` immediately after a scripted `applyHit` and again
  0.3 s later; screenshot mid-smash showing the radial smear.
- **Risk:** low. Keep the `mb` clamp so a smash inside a nitro run can't white out the frame.
- **Size:** ~10 lines.

### 11. SL-03 — Cache prop world transforms at spawn
*Fantasy: (none — this buys headroom for items 12–14.)*

Static props re-evaluate the CatmullRom curve every LOD tick. `placeMatrix` calls both
`getPointAt` and `getTangentAt`, and the LOD pass runs over 184 items + 900 dress every
4th frame, calling `placeMatrix` again for everything in range — roughly 2000+ arc-length
curve evaluations per tick for props that never move.

- **Files:** `web/js/scrapline.js` → `placeMatrix()`, `spawn()`, `update()` LOD block.
- **Numbers:** stamp `item.wp` (Vector3), `item.wq` (Quaternion) at spawn. LOD then does a
  distance test against `item.wp` and composes from the cache. Knocked and settled items
  keep the current recompute path. Target: under 50 curve evaluations per LOD tick.
- **Verify:** monkey-patch `state.path.curve.getPointAt` with a counter, run 40 frames,
  compare totals before and after. Also assert instance matrices are byte-identical to
  the pre-change build for a fixed seed — this is a pure refactor and must not move a prop.
- **Risk:** medium. It is the largest surface area of any item here, and a placement
  regression is subtle. Land it on its own, with the byte-identical check.
- **Size:** ~60 lines.

### 12. SL-05 — Hero hulk silhouettes
*Fantasy: burnt-out freight hulks loom over the shoulder.*

Density is handled; scale is what actually sells Turbo Sloths. This is dress, so the
collidable cap of 400 is untouched.

- **Files:** `web/js/scrapline.js` → `geos()`, `DRESS_KINDS`, `kindMat()`, `spawn()`
  (a separate small loop so it does not eat the 900 dress budget).
- **Numbers:** new `hulk` kind, box 4.0 × 2.2 × 6.5 plus a slanted plane. 24 instances
  spread over `T_MIN`–`T_MAX`, lateral 1.35–1.70 × `roadHalf` (safely outside the deck),
  y at `DECK_Y`, colour `0x2e2a26`. One InstancedMesh, one draw call.
- **Verify:** eval `pools.hulk.cap === 24` and `dress.length === 900` (unchanged);
  screenshot from chase.
- **Risk:** medium — big silhouettes can occlude corner entry. Keep lateral ≥ 1.35 and
  re-drive the full lap watching apexes.
- **Size:** ~55 lines.

### 13. VX-02 — Brake and decel taillight surge
*Fantasy: the pack lights up red when the leader lifts.*

- **Files:** `web/js/vehicles.js` → `buildBody()` (collect taillight meshes into
  `g.userData.tails`), `buildFromGlb()` (~line 569 already classifies `_tl|tail|stop`);
  `web/js/game.js` → the drive-FX block near `pulseFlame`.
- **Numbers:** `emissiveIntensity` 3.5 idle → 7.0 on brake, damped at 12/s.
- **Verify:** eval `player.mesh.userData.tails.length > 0` and sample `emissiveIntensity`
  with and without brake held.
- **Risk:** medium — needs a new `userData` collection point on both the procedural and
  GLB paths, and the GLB path's name-matching is already fiddly. Lowest confidence of
  anything above it.
- **Size:** ~30 lines.

### 14. FX-02 — Near-camera speed streak cards ⚠️ FLAG: ~130–150 lines
*Fantasy: the world tears past your peripheral vision.*

Camera-relative recycled InstancedMesh of ~40 thin dark cards at 6–14 m lateral, scrolling
backward at player speed with length scaled by `speedNorm` — the same pattern as
`particles.js` `rainStart`/`rainUpdate`. Probably the single strongest remaining "sense of
speed" lever, but it is a **new subsystem with its own lifecycle** (create, per-frame
recycle, clear on race end, low-quality path), not a tweak. **Do not attempt this on a
thin budget.** If it gets cut, items 2 and 6 already carry most of the speed read.

- **Files:** new `web/js/streaks.js`; `web/js/game.js` spawn (~1482), clear (~1318),
  race tick (~3993); `web/js/index.html` script tag.
- **Risk:** medium-high. Easy to make it read as visual noise or as a dirty lens.

---

## Bugs and smells found while reading

Confirmed in-browser unless marked "by inspection".

### `scrapline.js`

1. **Glow discs never spin.** `placeMatrix` builds the yaw+spin quaternion, then the
   `kind === 'glow'` branch *overwrites* it with `setFromAxisAngle(_axisX, -PI/2)`.
   `update()` increments `item.spin` and re-places every alive glow every frame — the
   work is done and then thrown away. (SL-04)
2. **All glow discs are amber; cyan never appears.** `addPool` calls `kindMat(kind, 0)`,
   so the `idx % 2 ? 0x00e5ff : 0xff9f1c` alternation always takes the amber branch.
   Verified: `pools.glow.mesh.material.color` is `0xff9f1c` and `instanceColor` is null. (SL-04)
3. **Glow discs are placed twice per frame** — once in the spin block, once again in the
   LOD pass, each placement costing a `getPointAt` plus a `getTangentAt`.
4. **LOD tick cost.** ~1084 props × (`getPointAt` + `getTangentAt`) every 4th frame, plus a
   second full `placeMatrix` for everything in range, for props that never move. (SL-03)
5. **`collide()` evaluates the curve twice for one vector:** `getTangentAt(item.t).x` and
   `getTangentAt(item.t).z` are two separate full evaluations. Hoist to one call.
6. **Per-frame allocations:** `placeMatrix` news a `Quaternion` for every `spool`;
   `update()` news a `Quaternion` per knocked item per frame; `beginKnock` news 4 vectors
   plus a quaternion; `hitDir` news a `Vector3` per hit.
7. **`markDead()` is dead code** — defined, never called.
8. **`collide()` is O(items) per body per frame.** 184 items × (1 player + rivals) each
   frame. Items are generated in ascending `t`, so a binary search or a bucketed index
   would make it near-constant. Not urgent at this scale; noting it before the count grows.
9. **`hitRadT = 0.012` ≈ 54 m of track** at the measured ~45 m per 0.01 t, so props
   register a hit from up to 27 m ahead or behind. Possibly a source of phantom smashes.
   **Not proposing a change** — it sits close enough to the frozen hazard behaviour that it
   deserves its own dedicated build, not a drive-by.

### `debris.js`

10. **Dust quads are never billboarded.** `writeDust` hardcodes `-PI/2` about X, so every
    puff lies flat on the ground and is close to edge-on from the chase cam. (DB-01)
11. **`writeDust` allocates a `Vector3` per call** for the rotation axis — up to 64 per
    frame. Hoist to a module-level constant. (DB-01)
12. **Per-chunk colour is entirely unused.** The init guard reads
    `chunkMesh.instanceColor === undefined`, but three.js initialises it to `null`, so the
    loop never runs. Verified: `instanceColor` is null. Every chunk is the same
    `0x5a5048` brown. Either wire it up (hot sparks near the impact fading to cold scrap)
    or delete the dead branch.
13. **Dust barely rises** — `du.pos.y += dt * 0.15` over a 0.9 s life is 13 cm total.
    Combined with (10), it is invisible at speed. (DB-01)
14. **`burst()` allocates ~5 objects per chunk** (`pos.clone()`, `base.clone()`, euler and
    spin literals) — roughly 45 allocations per smash. Bursty GC during combat.
15. **`allocChunk`/`allocDust` do an O(n) reverse scan with a `splice` on every alloc.**
    Fine at 96/64; a per-slot back-reference would make it constant time.
16. **Rival dust always picks the same rival.** The loop `break`s after the first rival
    within 90 m in array order, not the nearest — so one rival gets a permanent wake and
    the rest get none. (by inspection)

### Cross-cutting

17. **`?shot=1` leaves the sim frozen.** `prepareMoneyShotFrame()` sets `state._frozen = true`,
    and it is easy to screenshot a dead frame and conclude a feature is broken —
    every LOD flag reads "hidden" because the LOD last ran with the car at the start line.
    Clear `_frozen` before any verification. Worth a line in the handoff.
18. **Teleporting by `state.player.progress` alone does not stick.** The physics re-derives
    progress from world position through `world.nearest()`; setting `pos` to a curve point
    without matching yaw can drop the car off the ribbon entirely. Set both, then assert
    `player._lat ≈ 0`.
