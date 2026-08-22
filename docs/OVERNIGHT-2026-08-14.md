# Twisted Speed — Overnight Plan (2026-08-14)

> **For Grok 4.5:** You are the overnight builder. Primary runtime = **web three.js**. Do **not** touch Unity. Work the waves **in order**. **Map 2 is locked** until Wave 3 exit is play-confirmed in Chrome. Observe every ship. Keep going until you are stopped or tokens die — finish the current version + PROGRESS/CHANGELOG before dying.

**Repo:** `C:\Users\brand\1. Game Making\twisted-speed-build-pack`  
**Do not use:** `C:\Users\brand\TwistedSpeed`  
**Serve:** `web/` on **8765** · play `http://127.0.0.1:8765/?v=NNN`  
**Current cache at plan write:** **v327** (horizon cards were moved closer; director may still be on an older tab)

**Goal:** Neon Circuit looks and drives like one continuous road, you can **see a world beyond the canyon**, the first curve does **not** yank the car, then (and only then) ship a second map that is not the city.

**Architecture:** Keep the existing loop (title → garage → race → results). Fix the **ribbon + nearest + camera + scenery visibility**. Do not add lights. Do not rebuild the engine.

**Tech:** Vanilla JS + Three.js (`web/js/world.js`, `game.js`, `config.js`, `hud.js`). MeshBasic scenery. ≤4 PointLights. PBR hero car only.

---

## Director locks (never regress)

| Lock | Rule |
|------|------|
| Speed HUD | **mph** (`p.speed * 4.4 * 0.621371`) |
| Garage | Stats/details **RIGHT of** the spinning car; center clear |
| Camera | Glued to the car. **No** `getPointAt(progress + 0.05)` look-ahead. Local slope tilt only. Y leash ~car+0.55…+3.4 m. Snap if >12 m away |
| START | **Reuse** menu world (`world.path` if `_menuBuilt`). Never `world.build` on every START |
| Pack | Spawn **ahead** on the ribbon (~0.20 / 0.28 / 0.37). Re-drop **up the track**, not on the bumper |
| Void | Use **lateral** distance, not 3D. No teleport to `getPointAt(progress)` |
| Perf | MeshBasic scenery, InstancedMesh OK, `frustumCulled = false` on instances, **no new PointLights** |
| IP | No TM/NFS names, Sweet Tooth, EA liveries |
| Dual-ship | Web only tonight |

---

## What production lead already **saw** (do not re-litigate)

I ran Chrome on this build:

- **Garage right-panel + mph:** confirmed on screen.
- **Camera glue (v322):** chase stayed on the car in the opening.
- **v326 skyline:** 8 cards **existed in the scene** at ~300–650 m, **46 m tall**. From chase cam they were **100% hidden** behind 11 m canyon walls. Director was right: “nothing changed.”
- **v327:** cards moved along the ribbon, taller (88 m). In **my** chase screenshot at ~104 mph I **could** see jagged city + cyan belts over the wall. Director still reports darkness — **treat visibility as unsolved until a cold chase shot without debug camera shows city mass.**
- **Hills:** path Y goes 0 → ~50 m. Road is **box segments** with pitch. Looks faceted / broken. First curve after the flat is where **pull** happens (nearest-path + void + corridor + Y-fold).
- **First-curve pull:** still reported after v325. Likely remaining: corridor/lip pull, center suction, or nearest flipping on the first climb.

---

## How you work tonight

1. Read this file + `PROGRESS.md`. Resume the **first incomplete wave**.
2. One observable play goal per ship (≤2 min).
3. Bump **every** `?v=` in `web/index.html`. Next number = last + 1 (if tab says 327, next is 328).
4. Serve 8765. Hard-refresh. **Chrome DevTools MCP:** title → garage → START → hold W through the **first curve**. Screenshot.
5. “Confirmed by play” only if you **saw** it. Else “changed, not run.”
6. Append `CHANGELOG.md`. Update `PROGRESS.md` wave table.
7. If FPS dies: cut far cards / instance count **before** cutting hills or combat.
8. If you hitch or freeze: do **not** call `world.build` on START.

```powershell
cd "C:\Users\brand\1. Game Making\twisted-speed-build-pack\web"
python -m http.server 8765
```

---

## Wave 0 — Baseline (do first)

- [ ] Hard-refresh current `?v=`. Title → garage → START. No freeze.
- [ ] Hold W 20 s through the **first right-hand curve**.
- [ ] Screenshot + note: (a) road look, (b) can you see **anything** past the neon walls, (c) does the car get pulled.
- [ ] Write those three notes in PROGRESS. Then Wave 1.

---

## Wave 1 — Smooth the ribbon (P0 look + feel)

**Problem:** Hills were bolted onto box-segment roads. Seams, stair-step canyon, pitch cracks, paint that doesn’t follow the surface. First curve “feels broken.”

**Files:** `web/js/world.js` (`buildPath`, `_buildRoad`, `_buildOpeningCorridor`, sidewalks/curbs), maybe `web/js/config.js` drive.

### 1A — Soften the Y profile
The overnight path is too aggressive (0→50 m in one ramp). Keep **readable** hills, lose the kink:

- Opening **flat** until after the first curve (progress ~0.12–0.16 stays y≈0).
- Then a **smooth** climb to ~22–28 m (not 50) over a long arc.
- One gentle drop, one second rise ~20 m, settle to ~4–8 m at the gate.
- CatmullRom tension: try `0.15–0.25`. **More samples** on the ribbon: raise `nSamples` toward **280–320** if FPS allows (smoother boxes).
- **Do not** put a hard grade change on the first corner.

### 1B — Road mesh must look like one road
Current: each segment is a `BoxGeometry` with `rotation.x = -pitch`. Gaps and z-fight on hills.

Pick **one**:
- **Preferred:** a single (or few) **Ribbon / BufferGeometry strip** for asphalt (two rails at ±roadHalf, follow `curve.getPointAt` + side). One material. Curbs as two thinner strips.
- **Fallback:** keep boxes but **overlap more** (`scale.z = len + 1.2`), match pitch of **both** endpoints (average), lift paint 0.02 above asphalt so lines don’t z-fight.

Yellow center + cyan edges + sheen must use the **same** transform as the asphalt.

### 1C — Adjacent dress follows the road
Canyon walls, sidewalks, lamps, frontage: sit on `f.p.y`, **tilt with the ribbon** (same yaw/pitch as the road frame) so walls don’t stair-step or float.

`_frame()` must return a stable **horizontal** side vector (already: `(-tan.z, 0, tan.x)`). If `side.lengthSq() < 1e-8`, fallback `(1,0,0)`.

### 1D — Playtest
Hold W from START through first curve and first climb.  
**Pass:** no visible cracks in the asphalt, canyon doesn’t look like stacked crates, no sudden Y pop.

---

## Wave 2 — World beyond the neon (P0 visibility)

**Problem (verified):** Director still sees **black + neon strips**. Cards that don’t **peek over the 11 m canyon from chase cam** do not exist.

### Visibility math (do not ignore)
Chase cam ~1.75 m up, walls ~11 m tall ~15–20 m away. A card at distance D must have height roughly **> 2 + 0.5×D** to clear the wall.  
A 46 m card at 175 m **fails**. An 88 m card at 70 m **can** work if not fogged out.

### 2A — Fog
`FogExp2` density 0.0011–0.0032 eats the horizon. For HIGH: try **0.0007–0.0010** and a slightly lighter fog color (`0x152030`). LOW may keep thicker fog.

### 2B — Skyline that chase cam can see
- Place **along the path**, both sides, **just behind** canyon (`EDGE.tower + 12–20`), **not** a 175 m ring around map mid.
- Card / mass height **70–110 m**, base near road Y so they **rise above** the wall.
- Mix: painted skyline planes **and** 1 InstancedMesh of dark towers (frustumCulled = false).
- Neon only as **thin belts** on those masses (MeshBasic). No PointLights.

### 2C — Ground / void
Off-line look is black because haze used to sit at **world origin** (fixed in v326). Confirm haze + ground plane are centered on **path mid**. Ground tint slightly lighter than void so dirt isn’t a hole.

### 2D — Sky
Horizon band in `_buildSky` shader can stay a bit hotter (magenta/cyan). Do **not** restore FBM cloud tax.

### 2E — Proof
Chrome screenshot at ~8–15 s of chase, **no debug camera**.  
**Fail:** only canyon + neon belts.  
**Pass:** you can name 2+ things beyond the wall (skyline, ridge, far towers).

LOW (**O**): hide extra cards via `world.setDensity`.

---

## Wave 3 — First-curve pull (P0 feel)

**Problem:** 3–4 s yank on the **first curve**. After hills, nearest-path + void + corridor + Y-fold stacked.

### 3A — Confirm metric
During the first curve, log (once / 0.25 s) `{ progress, ribbonLat, dist3d, nearProg, posY, nearY, surface }`.  
If `dist3d` spikes while `ribbonLat` is small — that’s a fold/Y false void. v325 switched void to **lateral**; if pull remains, the culprit is **lip / corridor / center suction / assist**, not void.

### 3B — Kill the remaining tug
In `web/js/game.js` drive block:

- **Center suction** (`latC > 5.5` on asphalt): **disable on the first 20% of the course** or raise threshold to `> roadHalf * 0.85` so a normal racing line isn’t sucked.
- **Lip / sidewalk pull:** don’t run if `surface === 'asphalt'`.
- **Corridor / unstick:** only if `ribbonLat > roadHalf + 2.5` (really off).
- **Path assist yaw:** only `surface === 'offroad'`.
- **Never** `getPointAt(progress)` teleport.
- If `|near.point.y - pos.y| > 8` and lateral is small, **ignore that nearest** for pull/Y (fold).

### 3C — First curve geometry
If the first control points still kink (flat then `add(70, 14, -390)`), **delay the climb until after the curve**. First corner = flat Y.

### 3D — Playtest
Three runs, W held, through first curve.  
**Pass:** no invisible hook, no 3 s slide to the inside, camera stays on the car.

---

## Wave 3 exit — Neon Circuit “90%” gate (required before Map 2)

Play **one honest Marrow Adventurous** run (or 90 s if you die). All must be **confirmed by play**:

| # | Check |
|---|--------|
| 1 | START does not freeze |
| 2 | Camera never leaves the car |
| 3 | First curve: no pull |
| 4 | Road looks continuous on the climb |
| 5 | Beyond the walls: city/horizon **visible** in chase |
| 6 | Pack starts **ahead**, not in your pocket |
| 7 | mph HUD · garage stats on the right |
| 8 | No new PointLights; HIGH still playable |

If any fail: **stay on Waves 1–3**. Do **not** start Map 2.

Write a `## Neon Circuit 90%` table in `PROGRESS.md` with pass/fail.

---

## Wave 4 — Second map (only after the gate)

**Director:** second map, **not the city** — coast or farmland, day or night.

**Recommendation (do this unless you find a blocker):** **Salt Flats / Coastal Dusk** — “THE REACH”

- Same combat loop, same cars, same controls.
- **One new path** in `world.js` (or `web/js/maps.js` if `world.js` is too big): longer straights, **gentler** Y, wide horizon.
- Theme: low sun or blue hour, **water or fields** as a **single large MeshBasic plane** + 1 InstancedMesh of cheap props (rocks / silos / sea stacks). No neon canyon.
- Fog: lighter, longer draw.
- Register in `cfg.maps` so map select has **two rows**. Click still starts the selected map.
- `world.build(scene, mapDef)` already keys on `mapDef.theme` — add `theme: 'coast'` (or `'farm'`) dress functions. **Do not** restore Throat/Freedom as TM/NFS clones.

**Playtest:** garage → map → click the new row → 30 s drive. Horizon readable. No freeze. No driveline solids.

If time remains: one landmark (lighthouse **or** grain elevator) as MeshBasic, off the ribbon.

---

## Wave 5 — Overnight extras (after 1–4, or if blocked on 4)

Do these **only** when the current wave is healthy. Do not skip 1–3 for these.

1. **Audio:** engine + nitro still audible after first click; no silent oil/spike (already patched — re-check).
2. **Finish ceremony** past 0.9 on Marrow (4.5’s leftover hate).
3. **Results / R retry** still work.
4. **Quality O** on Map 2: hide extra cards.
5. Hunt: silent actions, facing-wrong cars, IP slips, hitch.

---

## Wave ∞ — If everything above is green

Playtest → 3 frictions you **saw** → fix worst → version bump. Cycle cars. **Do not** invent map 3.

---

## Forbidden tonight

- Unity
- `world.build` on every START
- Distant camera look-ahead
- Pocket-spawn / bumper re-drop
- New PointLights, SSR, god-rays
- Map 2 before the 90% table is all PASS
- Claiming “skyline works” without a **chase** screenshot
- IP names

---

## First three ships (so you are not paralyzed)

| Ver | Wave | Must see in 2 min |
|-----|------|-------------------|
| next | 1A+1C | First corner **flat**; walls follow road Y |
| +1 | 1B | Asphalt looks like one strip on the climb |
| +1 | 2+3 | Chase shot shows city **over** the wall; first curve **no pull** |

Then 90% table → Map 2.

---

*Production lead 2026-08-14. Director: smooth ribbon, visible world, first-curve pull, then a non-city map. Overnight until stopped.*
