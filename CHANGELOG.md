# Changelog

## 2026-08-07 — Web v149: HARD clear — zero solid road blockers (city)

User frustration: full-width slabs still blocking chase FOV.

### Source removals (city / Neon Sepulcher)
- Elevated freeways, thick overpasses, bridge decks (already gone)
- **Sign gantries** across road removed
- **Start/finish overhead beam + banner** removed for city (side posts + road stripe only)

### Nuclear sanitize
- `_sanitizeDriveline` now **hides** any mesh that **spans** the road or sits in-lane with real height (samples AABB corners)
- Soft-push only for shoulder encroachment
- Road segments tagged `isRoadSurface` so they are never purged

Hard-refresh `?v=149`. Console: `[sanitizeDriveline] { hidden, pushed }`.

---

## 2026-08-07 — Web v148: no solid bars across Neon Sepulcher street

That blue slab in chase FOV was **city elevated freeway decks** + short overpass arches + bridge slabs spanning the full road width (drive-through ghosts that still *look* like walls).

### City (Neon Sepulcher) only
- Removed full-width elevated freeways
- Removed short thick overpass arches
- Removed full bridge decks
- Replaced with **thin high sign gantries** (open air under — posts on sides only)

Hard-refresh `?v=148`.

---

## 2026-08-07 — Web v146–147: clear driveline on Neon Sepulcher

### Root causes of “buildings in the track”
- Jersey barriers at `roadHalf - 0.35` and cones at `roadHalf - 1.3` (**inside lanes**)
- HQ jersey at `roadHalf - 0.4`
- Axis-aligned tower/mid boxes poking in on curves
- Mid-lane traffic silhouettes
- **Neon ground light cards** (diameter ~7m) placed *onto* the asphalt under lamps

### Fixes
- Barriers/cones → **outside curb** (`rh + 0.85` / `rh + 1.4`)
- Towers + midground: **path-aligned** depth, larger setback
- Traffic → outer lane edge only
- Lamp/shop spill cards: under pole / sidewalk only, smaller radius
- **`_sanitizeDriveline()`** end of build: push remaining solid footprints off asphalt

Hard-refresh `?v=147`.

---

## 2026-08-07 — Web v145: Neon Sepulcher env pass (canyon + bloom)

### Canyon fill
- New `_buildCanyonWalls`: path-aligned continuous walls both sides (glass face + neon belts + outer backfill)
- Denser storefronts; towers as accent only
- Corridor mass tagged `ignoreIntrusion`

### Road wash
- City grade: bloom 0.26→0.14, lower exposure/lifts
- Road material envMapIntensity 1.08→0.48; wet patches toned down

### Intrusion report
- True lane flags only (`dist < roadHalf - 0.75`); skip elevated decks, canyon walls, ground plate
- Verified via Chrome overview: walls frame the full loop

Hard-refresh `?v=145` or `?v=145&overview=1`.

---

## 2026-08-07 — Web v144: overview visibility fix

- Path-only bounds + pad (far towers no longer shoot camera into space)
- Height capped (~140–380m) instead of span×0.95+80
- `scene.fog = null` in overview; slate background
- Strong directional + ambient lights for top-down night
- No rain in overview; brighter post grade
- Docs updated

Open: `?v=144&overview=1` → start race.

---

## 2026-08-07 — Web v143: whole-map overview + layer diagnostics

- `?overview=1` — top-down camera over full path bounds, all LOD layers forced on
- `World.getBounds()`, `layerReport()`, `showAllLayers()` — console diagnostics for scenery vs driveline
- Docs: `docs/MAP-OVERVIEW.md`
- `GAME._lastWorld` set on race start for agent/human inspection

Hard-refresh `?v=143&overview=1` then start Neon Sepulcher.

---

## 2026-08-07 — Web v142: NO solids on driveline + lighter env

### Critical bug (v141)
Path-centered **90×70 plaza decks** and **40×40 neon rings** were placed on the race line — buildings “in the middle of the track” (drive-through ghosts). Embankments also overlapped lanes (half-width math wrong).

### Fix
- Corridor: `clear(halfW, margin) = roadHalf + halfW + margin` for every bank/mass/deck
- Side plazas only (left/right), never path center
- Towers: lateral offset uses half-diagonal of AABB + margin (axis-aligned boxes)
- Storefronts: deeper offset so awnings clear road

### Perf
- Fewer towers / shop bays; sparser corridor step

Hard-refresh `?v=142`. If anything still sits in the lane, screenshot + map theme.

---

## 2026-08-07 — Web v141: environment epic E1–E3 (corridor + LOD)

### E1 — Ground the road
- New `_buildCorridorContext`: embankments, outer shelves, shoulders, theme mass blocks, path anchor decks
- Ground plate lowered/tinted so banks read as mass (not floating ribbon)

### E2 — Place identity (partial)
- City: block mass + midrise + neon belts along corridor
- Coastal: water plane anchored to path mid; water-edge lips on corridor
- Industrial: gravel/yard mass along banks
- Far skyline cards centered on path mid, not world origin

### E3 — Drive-by stability
- Buildings sit on `base.y` (road elevation) — no buried towers on climbs
- Glass floor bands 8→3; tower count and storefront caps reduced
- `updateLOD`: squared distance, tighter detail range, staggered full-list pass, fewer lamp pools/neon pulse

Specials still parked. Hard-refresh `?v=141`.

---

## 2026-08-07 — Web v140: Needle face + Vesper readable violet

- **Needle** faceBake force `0 → π` (only car still reverse after v139 playtest)
- **Vesper** body color `0x2a1040 → 0x7b4ec8`, accent pink lift; satin paint with slight emissive so violet reads at night

Hard-refresh `?v=140`.

---

## 2026-08-07 — Web v139: face bake + matte paint (primary = web)

### Decision
- **Primary runtime: web** (highest bang per token). Unity AI researched; recovery path in `docs/UNITY-AI-NOTES.md` (Assistant Plan/Agent when Editor stable — not dual-build).

### Facing
- `glb.js`: no longer pre-spins models by π (was stacking with faceYaw)
- `vehicles.js`: detectFaceYaw force table converted to absolute bake; **`faceBake` child** holds correction so `rotation.y = yaw` paths stay correct
- `?faceAudit=1` logs baked yaw per car

### Materials
- `carPaint` default: matte/satin (low metal, high roughness, weak clearcoat, **no flake**)
- GLB decorate softens chrome/glass/authored Sketchfab metals
- Garage + still-shot clearcoat amp **removed**
- `vehicle_bodies` procedural paint matches matte

Hard-refresh `web/?v=139`.

---

## 2026-08-07 — BUILD-CONTEXT reconcile + Gate A audit

### Design docs
- **Rewrote `BUILD-CONTEXT.md`** — retired 2D top-down/pixel/desert V1; aligned to 3D Night Circuit combat-racer (pillars, loop, legal red list, dual-ship, 8–10 min / 5–8 cars slice)
- **Updated `STYLE-CONTRACT.md` pipeline** — web + Unity both first-class; one primary runtime per session; shared GLB SoT
- **`DESIGN-RESEARCH.md`** — win condition: finish → next level; eliminations reward gear/stats
- **Added `GATE-A-AUDIT.md`** — Gate A **PASS / OPEN**
- Project skill `.grok/skills/twisted-speed/` + user skill `game-developer` remain process/product split

### Not done this session
- No gameplay code changes
- Gate B/C still not open for “shippable”

---

## 2026-08-01 — Environment AAA push loops (v137–v138)

Multi-agent visual gauntlet: lighting, geometry, weather, materials, harsh Heat critics.

### Atmosphere & lighting
- Cinematic sky: moon disc + corona, fbm drifting clouds, multi-band horizon, stars, `uTime` drift
- Theme light kits; ≤16 PointLight pools with distance LOD; sodium/neon themed
- 16–24 volumetric god-ray cones + ground light splash cards (neon color on asphalt)
- Atmospheric haze sheets; half-float post RTs when available; richer bloom grade

### Geometry & materials
- Denser canyon (city ~72 towers, 4 depth rings); continuous storefront frontage both sides
- 10 unique procedural facade atlas kits (per-building assignment)
- Tunnels, bridges, containers/pipes, cliff rocks, pier, cranes, cooling towers, neon monoliths
- Fake road mirror cards (inverted emissive window strips on wet asphalt)

### Weather
- Instanced rain (theme counts), mist cards, industrial embers
- Ground splash rings + `getWetBias()` road wetness boost while raining

### Honest critic status
- **Not** Heat parity. Blind critic scores ~4.2/10 vs NFS Heat stills.
- Strongest gains: frontage, facades, weather contact, ground color splash.
- Remaining gap: true SSR wet road, architectural massing, FOV void kill, SAO.

Hard-refresh `?v=138`.

---

## 2026-08-01 — Difficulty bump + map visual identity gauntlet (v136)

### Difficulty (all tiers, modest)
- **Chill** 0.62→0.70 speed, fire/dmg/count/catch-up nudged up
- **Adventurous** 0.78→0.86 speed, pack denser & meaner
- **Brutal** 0.95→1.02 speed, fire 1.2 / dmg 1.25
- Still not “impossible” — recovers soft nerf without returning runaway AI

### Map differentiation (look as good as it drives)
Each course now has its own **sky shader, lighting kit, fog, grade, road wetness, props, landmarks**:

| Map | Identity |
|-----|----------|
| **Neon Sepulcher** | Magenta/cyan sky band, glass canyon, neon monoliths, pink/cyan lamps, punchy grade |
| **The Throat** | Sodium amber fog, rust sheds + smokestacks, cranes/flares, cooling towers/tanks, underpass sodium strips, no palms |
| **Freedom Gate** | Cool blue sky + stars, water plane + glints, lighthouse, sea-wall piles, sparse hotels, cool grade |

- Per-map **postFX grade** (`setGrade` on race start): cyan city / amber industrial / cool coastal
- Theme **START/FINISH** gate colors + billboard ad sets
- Theme-aware **wet road** (city gloss / industrial grit / coastal blue-black)
- Landmarks: monoliths · cranes · lighthouse/piers

Hard-refresh `?v=136`. Compare the three courses — they should no longer feel like the same canyon.

---

## 2026-08-01 — NFS-style garage tune bay (v135)

### Garage shop (per-car intentional builds)
- **U / TAB** opens full **TUNE** bay for the selected rig (ESC back to roster)
- Four categories: **ENGINE · HANDLING · ARMOR · ARSENAL**
- **25 parts**: stackable levels + one-shot unlocks (scrap currency, saved in `meta.builds[carId]`)
- **Weapons:** upgrade caliber/feed, or **install** Rocket Rack / Mine Bay on light rigs that start bare
- **Speed:** top speed, accel, nitro tank/burn/recovery
- **Handling:** agility, grip, drift tune, brakes, lighten chassis
- **Armor:** plates, shield generator + capacity, ram guard, nano repair, heat sinks
- Build summary + investment score per car; roster shows tuned stat pips (gold = shop boost)

### Combat / drive wiring
- `applyBuildToMul` feeds player mul (speed, accel, hand, armor, nitro, guns, cooldowns, mass)
- `playerWeapons()` merges stock hardpoints with unlocks + damage/rate muls
- Shield layer + slow regen when cool; ram guard reduces impact damage

### Fixes
- Shop buy used filtered list index vs HUD full list → wrong part purchased — **fixed**
- Shield HUD bar no longer clipped outside panel
- Menu toasts (buy confirm / locked / not enough scrap)
- Deny toasts point players to garage unlocks for rockets/mines

Hard-refresh `?v=135`. Garage → **U** → spend scrap → **ENTER** race.

---

## 2026-08-01 — Drift freeze fix + NFS turn arrows (v134)

### Drift / Space stutter
- Root cause: every frame spawned many smoke/spark meshes + **cloned materials** (and SFX spam)
- Drift FX throttled (~14 Hz), nitro FX throttled, particle cap **100**
- Shared materials (no per-spark clone); tire spray reduced to 1 puff
- **Space = drift** (with Shift); nitro is **Q** / **E** only

### NFS turn arrows
- Path scanned for bends **≥ 60°**
- HUD chevrons left/right with angle + distance bar when turn is ahead

Hard-refresh `?v=134`. Drift = Space or Shift. Nitro = Q.

---

## 2026-08-01 — Chill/Adventurous/Brutal + edge-drag fix (v133)

### Difficulty rename
- **CHILL** / **ADVENTUROUS** / **BRUTAL** (was Easy/Normal/Hard)
- Old saves migrate automatically
- Still: garage `1/2/3` or `[ ]`

### Path “edge gravity” (same spots every run)
- **Cause:** snake track folds near itself; nearest-point snapped to the wrong segment and pulled/steered you sideways
- **Also:** `dist` used vertex distance, not true lateral offset → false “off-road” assist mid-lane on curves
- **Fix:** progress-windowed nearest search; lateral-only corridor math; weaker assist only at true road edge

Hard-refresh `?v=133`.

---

## 2026-08-01 — Difficulty levels + Vesper face + softer AI (v132)

### Difficulty (saved)
- **EASY / NORMAL / HARD** in `config.difficulties`
- Garage: **[ ]** cycle or **1 / 2 / 3**
- Map select: same **[ ]** + visible difficulty strip
- Scales: rival top speed, catch-up rubber band, lead soft-brake, fire rate/dmg, count
- Default **NORMAL**; rivals no longer runaway-finish (progress lead cap)

### Vesper facing
- Force `faceYaw = 180°` for P1 MSO (override heuristics)

### AI pack
- Spawn near start (not mid-course)
- Lower max speeds; soft-brake when too far ahead of player

Hard-refresh `?v=132`. Try **Easy** first if foes felt unfair.

---

## 2026-08-01 — Vesper = McLaren P1 MSO (v131)

- Downloaded free **McLaren P1 MSO** (Sketchfab UID `c7687064e08c4be9a0af88e98bcf0a8e`, author bohmerang)
- Armed via `arm_fleet_vehicle` kit_ghost (fins / EMP pods / spoiler)
- Exported `web/assets/models/vesper.glb` (~64 MB) — cache `fleet131`
- Credit: `docs/CREDITS-MODELS.md`
- Stock loadout still light: SMG only (mass 0.72)

Hard-refresh `?v=131`. Garage → Vesper.

---

## 2026-08-01 — Class loadouts + Vesper hypercar (v130)

### Balance (mass ↔ firepower / armor)
| Rig | Mass | Armor | Fire | Stock arsenal |
|-----|------|-------|------|----------------|
| Needle | 0.55 | 1 (72 HP) | 1 | **PISTOL only** |
| Vesper | 0.72 | 2 (96 HP) | 2 | **SMG only** |
| Marrow | 1.05 | 3 (120 HP) | 3 | MG + rockets |
| Choir | 1.35 | 4 (144 HP) | 4 | MG + rockets + mines |
| Mausoleum | 1.75 | 5 (168 HP) | 5 | **heavy MG + rockets + mines** |

- Denied weapons toast + grey HUD hardpoints (`K —` / `L —`)
- `statsMul` wider spread so light rigs feel fragile

### Vesper
- Replaced sedan with Kenney **race-future** hypercar GLB (CC0)
- Role: **Phantom Hyper**

### Minimap
- Foes **red** (was green); legend **FOE**

Gauntlet stills: `web/shots/gauntlet_v130/`

---

## 2026-08-01 — All-vehicle facing + minimap + gates (v129)

### Facing (every fleet GLB)
- **Auto-detect** nose from headlights / front parts vs taillights / rear parts
- Headlights **must** sit on +Z (accelerate); Vesper/Needle/Mausoleum flip when they don’t
- `setYaw(mesh, yaw + faceYaw)` still required every frame (don’t assign `rotation.y = yaw` alone)
- Verified OK: marrow, needle, mausoleum, **vesper**, choir, razorback

### Minimap (top-right)
- Course path, **S**tart / **F**inish, **YOU** (arrow), **RIVAL**s (green + heading)
- Wired `state.world` so map actually has path data

### Start / Finish (obvious)
- Tall neon posts, dual-sided **▶ START** / **FINISH ▶** banners
- Checkered road stripe, approach chevrons, gate PointLights
- HUD **▶ START** banner on race boot; toast at 88% “FINISH GATE AHEAD”

Honest: still pre-beta — facing/minimap/gates are table-stakes, not a content finish line.

---

## 2026-08-01 — Facing fix + drift feel + race loop (v125)

### Vehicle facing (critical)
- Root cause: `mesh.rotation.y = yaw` **wiped** any 180° GLB flip every frame
- Fix: `userData.faceYaw` + `GAME.vehicles.setYaw(mesh, yaw)` used everywhere
- Flip map (nose → +Z / accelerate):
  - **needle**, **mausoleum** → 180°
  - marrow, vesper, choir, razorback → OK

### Drift (Shift)
- Much stronger slip + yaw; power-slide keeps speed
- Dense tire smoke, cam FOV kick, HUD **◆ DRIFT ◆** banner + slip bar
- Lower min speed so drift doesn’t die immediately

### Track density (void at start)
- `_buildStartBackfill` — towers + apron + lamps **behind** start (chase cam void)
- Prop counts scale with course length (`_dens`)
- Larger ground + sky dome

### Race screenshots
`web/shots/race_loop_v122/` — 01 void start, 03 mausoleum, 04–06 midcourse/drift

Hard-refresh `?v=125`.

---

## 2026-08-01 — Point-to-point track + drive physics (v121)

### Track
- **No more laps** — all three maps are open **start → finish** courses
- Longer routes (~5 km Neon Sepulcher snake; industrial S-bend; coastal climb)
- Pink start gate + cyan finish gate; progress is monotonic (no wrap)
- Road mesh open (no loop join); minimap shows start/finish markers

### Hazards
- Mixed **spike / oil / debris**, irregular progress slots
- Placed in **lanes / shoulders**, not a center-line parade
- Spikes arm only when you’re nearby; oil adds slip; debris solid hits

### Driving (arcade, game-worthy)
- Accel curve (punchy off line, soft top end)
- **Lateral slip** + drift grip, slip→yaw coupling, mass/handling matter
- Snappier steer ease, understeer at speed, softer path assist
- Tuned brake/coast/nitro in `config.drive`

### HUD
- Course **% progress bar** → FINISH (no lap counter)
- Map select: “START → FINISH”

Hard-refresh `?v=121`. Play: garage → course → race to cyan gate.

---

## 2026-08-01 — Overnight v119 (ship for morning)

### Environment
- Multi-lane dashes + sidewalks, theme fog, neon pulse, LOD lamp falloff
- Charcoal wet asphalt (restrained env — no rainbow wash slabs)
- Wet patches without additive pink/cyan road cards

### Combat / AI
- **Needle `stabFront`/`stabRear` armed** (was never set → stabs dead)
- Rival multi-lane pack, rubber band, road pull, MG + rockets
- Ram collision CD; HUD damage vignette; enemy rocket FX

### Garage / post / paint
- Epoxy floor, ceiling tubes, tire stack; fleet clearcoat amp
- Money-shot forces Marrow + warmer hero keys (flake moderated)
- Tighter bloom / cyan night grade

### Smoke (Chrome DevTools, no JS errors)
- Full fleet GLB load (marrow/needle/mausoleum/vesper/choir/razorback)
- Race spawn 3 GLB rivals, mines/rockets OK, freeze only on `?shot=1`
- Stills: `web/shots/race_v119.png`, `web/shots/garage_v119.png`

### Play
```
cd web
python -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/          hard-refresh Ctrl+Shift+R
# http://127.0.0.1:8765/?garage=1
# http://127.0.0.1:8765/?shot=1
```
Cache: `?v=119` / `fleet119`  
**Honest:** last scored judge 58/100; do not claim 75 without adversarial re-judge.

---

## 2026-08-01 — Overnight v116 (env + combat + garage)

### Environment (perf-safe)
- Multi-lane dashed whites + continuous sidewalk slabs along highway
- Theme fog: industrial denser underpass; city/coastal open skyline
- Charcoal wet asphalt (darker base, stronger env mirror)
- Soft neon emissive breathe on pink/cyan signs
- LOD: lamp intensity falloff fixed; far props cull farther
- Wet ground plane slight metal sheen under fog

### Gameplay / combat
- **Needle stab flags fixed** — `stabFront`/`stabRear` now set on GLB + procedural (was never armed)
- Rival AI: multi-lane pack, rubber band, road pull, mixed MG + rockets
- Ram collision cooldown (stops multi-hit freeze spam)
- Enemy rocket hits explode + camera shake
- HUD damage vignette flash on hit

### Garage / materials / post
- Epoxy floor + mirror plane, ceiling tube lights, tire stack prop
- Garage clearcoat amp for full fleet (not Marrow-only)
- Grade: slightly tighter bloom, cyan lift for Heat night

### Fleet (unchanged assets, cache fleet116)
- Marrow Camaro SS, Needle Hayabusa, Mausoleum, Vesper, Choir, Razorback
- Rivals cycle full HQ roster (skip player pick)

### Play
```
cd web
python -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/   hard-refresh Ctrl+Shift+R
# Garage: ?garage=1   Still freeze: ?garage=1&still=1 or ?shot=1
```

---

## 2026-07-31 — Marrow via Blender MCP (live)

### MCP session
- Built Marrow in **live Blender** (120 meshes, loft body + kits)
- Studio lights (key/fill/rim/ground), floor, camera frame
- Paint node flake + full clearcoat coat weight
- Re-exported `marrow.glb` + saved `marrow_hero.blend`
- Blender EEVEE still: `web/shots/marrow_blender_viewport.png`
- In-game: prefer GLB, scale fix (no double-normalize)

### Play
Hard-refresh http://127.0.0.1:8765/ — Marrow loads hero GLB after preload.

PolyHaven in Blender MCP is **disabled** (enable in BlenderMCP N-panel for free textures next).

---

## 2026-07-31 — Marrow hero GLB path (v99)

### Strategy lock
Stop multiparts-as-hero thrash. **Marrow is authored in Blender**, loaded as GLB by default.

### Free tools acquired / documented
- Poly Haven night HDRI → `web/assets/env/night_city.hdr`
- `tools/FREE-TOOLS.md` — Blender, Poly Haven, ambientCG, glTF-Transform
- Headless rebuild: `tools/build_marrow_hero.py`

### Marrow hero mesh
- Lofted body (32-pt sections, subsurf×2, bevel, smart UV)
- Clearcoat Principled materials, bone kit, dual rockets, MG, multi-spoke wheels
- ~9.3k faces, ~120 named parts, **557 KB** GLB (was 267 KB)
- `assets/models/marrow_hero.blend` for further authoring

### Runtime
- Prefer GLB when preloaded (`?proc=1` forces multiparts)
- GLB loader: node names preserved, asset version cache bust (`GLB_ASSET_VER`)
- Material routing by Blender names (Body/Bone/Glass/HL/TL…)
- No extra combat kit stacked on Marrow GLB

### Play
```
cd web
python -m http.server 8765
# http://127.0.0.1:8765/   hard-refresh Ctrl+Shift+R
```
Rebuild car: Blender headless script above, then bump `GLB_ASSET_VER` in `glb.js` if needed.

Honest ceiling: still multiparts loft (not ZBrush/NFS kit), but this is the **correct pipeline** for further gains.

---

## 2026-07-31 — Vehicle-first refinement (v97)

### Priority: real vehicles (no blobs)
- Full rewrite of `vehicle_bodies.js`: **coupe chassis multiparts** (hood/cabin/fenders/wing/LED/shutlines/multi-spoke rims)
- Theme is **kit on a car**, not a pile of spheres:
  - Marrow = muscle coupe + bone armor + dual rockets
  - Needle = real motorcycle frame + front/rear spikes
  - Mausoleum = armored hearse/SUV plates
  - Vesper = sleek coupe + ghost glass
  - Choir = panel van + speakers
- Shared geos for perf; Marrow mesh count down from “hundreds of shards”

### Freeze fix
- `startRace()` clears `_frozen`, shot-hold speed, re-detonate timers so normal play never sticks in money-shot freeze
- Rain particle count reduced

### Adversarial judge (v97)
- Overall **58/100** (was 55 peak) — **not 75**
- Car **56** — readable cars/bike; still multiparts short of NFS

### Play (hard-refresh Ctrl+Shift+R)
```
cd web
python -m http.server 8765
# http://127.0.0.1:8765/   ← use THIS for play (not ?shot=1)
```
`?shot=1` / `?garage=1` intentionally freeze for still capture — avoid those when testing drive/combat.
