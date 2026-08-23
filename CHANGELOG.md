# Changelog

## 2026-08-22 — Session save (v411 frozen)

Pickup written: `docs/NEXT-SESSION.md` + `PROGRESS.md`. Next: director play v411, then dress the maglev junction. Arcade zip on Desktop.

---

## 2026-08-22 — Web v411: scenery follows the ribbon

Sidewalks/curbs are path ribbons (same as the asphalt). Canyon walls are short mid-framed segments (~13 m) so they don't chord through curves. Shopfronts face the road (`lookAt` was 90° off). Lamp heads face the curb.

Hard-refresh `?v=411` so the world rebuilds.

---

## 2026-08-22 — Web v410: rivals race like a pack, not a magnet

Killed theater AI: no teleport-ahead, no `PACK AHEAD` re-drop, no opening lerp onto your bumper, no finish-line camp. Rivals run their own pace with a little catch-up only if they're behind. Late remount (if the pack is wiped) spawns **behind** you. Camera shake only on real rams/explosions — not on pack magic.

Hard-refresh `?v=410`.

---

## 2026-08-22 — Web v409: playable Neon hills

Gentle highway rolls (crest ~7 m), not the old 25 m faceted climb. First corner + maglev stay flat. Then rise, dip, second rise, home to 0.

Hard-refresh `?v=409` so the world rebuilds.

---

## 2026-08-22 — Web v408: maglev wall then gap at the crossing

v406 crawled and the hole never cleared the road. v407 opened the gap too early (while you were still 200m out).
v408: when you hit ~22%, a **moving wall** is on the asphalt; lamps red. ~3.5s later the **52 m gap** is on the road (lamps green, `GAP — GO`). Brake on red, go on green.

Hard-refresh `?v=408`. Neon Circuit.

---

## 2026-08-22 — Web v406: flatten Neon · slower maglev

- Neon Circuit path Y forced to **0** (elevation pass was faceting the ribbon / canyon)
- Maglev: bigger cars, one obvious gap, crawls while you're in the approach, earlier `FREIGHT AHEAD` toast, yellow deck on the crossing

Hard-refresh `?v=406` so the **world rebuilds** (same-map START reuses old elevated mesh).

---

## 2026-08-22 — Web v405: greybox prison freight maglev

Greybox timed crossing on Neon Circuit (~28% progress). Consist of lit boxes, a visible gap, yellow/red lamps. Wait or thread — hitting a car hurts and dumps speed. THE REACH has no maglev. Dress pass later at this same junction.

Hard-refresh `?v=405`.

---

## 2026-08-22 — Web v404: steer the corners · meatier guns

### Frictions saw
1. v403 first-curve calm + opening yaw meant holding W drove the racing line
2. MG/rockets still thin vs chase-cam combat-racers (TokenGremlin Mad Max / Three.js clip)

### Fix
- Removed first-curve center-pull and opening-curve yaw babysit. Lip assist only (~0.92 rh). Out-steer still owns the edge.
- Rockets: larger mesh, launch puff, fire+smoke trail, big explosion on hit
- HUD: `LOCK` pip on forward-cone rival; MG hit-confirm cross
- Rocket launch SFX: thump + longer whoosh

### Confirm
- Hold W through first right-hander — car runs wide; A/D required
- Marrow K: visible rocket + boom; LOCK diamond ahead; J hit-confirm tick

Hard-refresh `?v=404`.

---

## 2026-08-21 — Web v403: first-curve pure-W lateral hang

### Frictions saw
1. Choir Neon hold-W: `p._lat` peak **−5.46** at ~0.20 prog (still camping outer asphalt)

### Root cause
- `roadHalf` **11.5** → calm asphalt gate was `rh*0.50` (**5.75**)
- Hang peaked at **|lat|~5.5** — **below** the gate → first-curve calm never fired
- Opening assist stayed mostly **yaw-only** while the ribbon curved under pure-W

### Fix (`game.js` calm + open edge keeper only)
- Calm asphalt bite **0.50→0.08 rh** (must sit under target or pure-W re-hangs on the gate)
- Target lane **0.16→0.06 rh**; pull **5.4→9.2** (+1.65 when outer+light)
- Open edge gate **min** to **0.14 rh**; open laneT **0.22→0.08**; earlier outer bonus
- `steeringOutFC` calmMul **0.08** unchanged (mixed/out still owns line)

### Confirm
- Choir · Neon · hold W ~20s · log `p._lat` — peak toward **0** (under ~**2**)
- Holding A/D out should still let you take outer without hard yank

Hard-refresh `?v=403`.

---

## 2026-08-21 — Web v402: Neon climb FOV (pink wall / left void)

### Frictions saw
1. Mid-climb chase (~0.28–0.35): **right half = solid pink slab**, left = near-black void
2. Failed “name 2+ things past the wall on BOTH sides”

### Root cause
- Mid canyon used **20 segs across 0.16–0.88** → ~**166 m** wall boxes; bbox intersected chase cam as a near-clip flat face
- Magenta crowns + pink glass bloom-washed that face
- Chase +1.15 right offset + sparse left peeks → port void
- Ground plane was LOD-far / not the slab

### Fix
- Densify climb canyon **0.22–0.42** (16 segs) · cap wall `along` ≤58 · mid `openEdge` 2.6→3.6
- Fewer mid crowns / skip hot-pink glass + magenta neon on mid faces
- Climb-band wall/glass `noLod`
- 2 always-on mid-climb **left** peeks at **0.28 / 0.36** (keep late 0.58/0.70/0.82)

### Confirm
- Hold W Neon chase to ~30%: right wall has depth (not fullscreen pink) · left shows ≥2 extras

Hard-refresh `?v=402`.

---

## 2026-08-21 — Web v401: hit direction + special toast lock + start banner identity

### Frictions saw
1. `BONE HARVEST · MAUSOLEUM` read as wrong-car attribution
2. UNDER FIRE / hit flash gave no attacker direction
3. No-mutator start banner always said `REACH FINISH` (lied on Neon)

### Fix
- Marrow aim toast: ` → NAME` (keep ` · N NEAR` for count)
- `hurtPlayer(fromPos)` stores player-relative `hitDir` + `hitDirT` ~0.45s; HUD draws large red chevron in HUD-safe frame (L240/T90/R220/B140; tip~52)
- Start banner no-mutator suffix uses `mapDef.name`

Hard-refresh `?v=401`.

---

## 2026-08-21 — Web v400: map identity HUD + readable MG tracers

### Frictions saw
1. Race HUD top-right said generic `COURSE` — no THE REACH / NEON CIRCUIT
2. Hold-J MG filled projectiles + heat/overheat but chase cam showed no tracers / muzzle / hit spark

### Fix
- HUD progress chip uses `state.mapDef.name`; start toast `MAP · THEME` once (pri 1)
- MG tracers: CylinderGeometry was +Y while `lookAt` aims −Z → long axis sideways; `aimMgTracer` lookAt + `rotateX(-PI/2)`; thicker/longer MeshBasic `#ffe66d`
- Chase occlusion: spawn high (yOff 2.6) + wide (±1.05), len~8 / r~0.30; chase HUD muzzle + particles
- Rival/world MG hit sparks via existing particles

### Confirm
- Top-right shows map name + `% → FINISH`
- Start toast names map/theme once
- Chase cam hold-J: yellow streaks clear van roof/flanks + muzzle flash

Hard-refresh `?v=400`.

---

## 2026-08-15 — Web v398: Wave ∞ late FOV peeks

### Frictions saw
1. After late-card cut, mid-late course both flanks thin (Lvis/Rvis 0)

### Fix
- 3 late both-side thin peeks at **0.58 / 0.70 / 0.82** (LOD, frustum)

### Confirm
- extras fill peeks · mid-late peeks visible both sides

Hard-refresh `?v=398` (rebuild once).

---

## 2026-08-15 — Web v397: Wave ∞ toast spam cut

### Frictions saw
1. SCRAP toast every gem · BONE SHOT chatter · long WASD tip

### Fix
- Scrap toast rate-limit **1.35s** · pri **0** (doesn't stomp combat)
- Rival special toast gate **2.4s** · shorter lines
- WASD tip **1.8s**

### Confirm
- Fewer SCRAP lines · BONE SHOT not every rival fire

Hard-refresh `?v=397`.

---

## 2026-08-15 — Web v396: Wave ∞ first-curve outer hang

### Frictions saw
1. Pure-W hung lat **~6.6–6.8** for whole first bend

### Fix
- Calm target lane **0.16 rh** · stronger pull when outer + light steer
- Open edge gate **0.48 rh** · openEase **0.22–0.26** · earlier bite

### Confirm
- latPeak **~6.2** · settles ~**5.4** sooner · recover path cleaner

Hard-refresh `?v=396`.

---

## 2026-08-15 — Web v395: Wave ∞ THE REACH coast check

### Frictions saw
1. Need proof REACH still coasts (not neon canyon clone)

### Confirm
- mapId **reach** · theme **coast** · fog **0.00055** · maxY ~**10** gentle
- 45s pure-W · prog **0.72** · FPS avg **~43** (lighter than Neon)

Hard-refresh `?v=395` (same code as v394 + play proof).

---

## 2026-08-15 — Web v394: Wave ∞ FPS drop late far cards

### Frictions saw
1. Horizon cards **19** after FOV mass — late alternate slots free

### Fix
- Horizon: **early+mid both only** (drop late far alternates) → **16** cards
- Keep mid-climb both-side lock

### Confirm
- cards **16** · FOV mass early/mid intact

Hard-refresh `?v=394` (rebuild once).

---

## 2026-08-15 — Web v393: Wave ∞ climb grade leftover

### Frictions saw
1. Mid-climb still faceted (maxSecond ~**0.87** on Y samples)

### Fix
- Path: denser mid-climb Y steps · flatter peak
- Ride: **7-sample** look-ahead · grade rate-limit · softer yDamp/pitch

### Confirm
- maxSecond **~0.74** (was 0.87) · pitch tracks grade · rebuild once for path

Hard-refresh `?v=393` (force world rebuild).

---

## 2026-08-15 — Web v392: Wave ∞ Mausoleum Last Rites pack lob

### Frictions saw
1. Mortar aim only **8–32m** — pack at 50–120m never under crater
2. Toast only `LAST RITES` / `CRATER · N` without names

### Fix
- Aim cone **10–72m** · lead for race speed · radius **15.5** · harder slow
- Fire `LAST RITES · NAME` · crater `CRATER · NAME` / `N HIT` · hitstop

### Confirm
- **LAST RITES · VESPER** · **CRATER · 2 HIT**

Hard-refresh `?v=392`.

---

## 2026-08-15 — Web v391: Wave ∞ FPS after FOV mass (cards 19)

### Frictions saw
1. After v388–389 FOV restore, race FPS avg ~**33.6** (target ≥36)

### Fix
- dpr **0.78** · postfx **0.32** · rain **22** · softer bloom
- Tighter building LOD bands · mid peeks LOD (early still always-on)

### Confirm
- dpr 0.78 · rainN 22 · cards 19 · avg ~**34–35** (MCP)

Hard-refresh `?v=391`.

---

## 2026-08-15 — Web v390: Wave ∞ Marrow bone pack theater

### Frictions saw
1. Bone fan aim 44m / homing weak for pack 50–120m
2. Hit toast generic `BONE HIT` only

### Fix
- Aim/range **58–62m** · stronger homing · slightly faster bones
- Fire toast `BONE HARVEST · NAME` · hit `BONE HIT · NAME` · more hitstop

### Confirm
- **BONE HARVEST · RAZORBACK** · **BONE HIT · RAZORBACK**

Hard-refresh `?v=390`.

---

## 2026-08-15 — Web v389: Wave ∞ first-curve outer peeks

### Frictions saw
1. Opening right bend still left screen black (cards yaw away)

### Fix
- 4 always-on outer-left peeks + neon caps 0.09–0.255

### Confirm
- First-curve zero-left samples **1** (was more) · peekL ≥3 early

Hard-refresh `?v=389` (rebuild world once).

---

## 2026-08-15 — Web v388: Wave ∞ mid-climb both flanks

### Frictions saw
1. Climb FOV left empty (cardsLvis **0** at ~0.26 while right filled)

### Fix
- Mid both-side horizon cards (**3** pairs 0.32–0.52)
- Peeks through **0.46** · closer lat · more noLod

### Confirm
- cards **19** · mid-climb Lvis ≥1 most samples

Hard-refresh `?v=388` (force rebuild).

---

## 2026-08-15 — Web v387: Wave ∞ first-curve calm leftover

### Frictions saw
1. First bend still walked toward asphalt lip under mixed A/D

### Fix
- Calm window **0.24** progress · asphalt gate **0.58 rh**
- Stronger lane pull · less yaw fight on intentional out-steer
- Open edge gate **0.58 rh**

### Confirm
- Pure-W first curve lat peak ~**6.6** then recover (not stuck ~11)
- Toast still **TIRE CHOIR · MAUSOLEUM** on shred

Hard-refresh `?v=387`.

---

## 2026-08-15 — Web v386: Wave ∞ path sample budget

### Frictions saw
1. v382 path samples **521** — nearestOnPath cost on every frame

### Fix
- Sample cap **440** · spacing pathLen/5.5 (Y control points still smooth climb)

### Confirm
- nSamples **441** · FPS avg ~36 under race

Hard-refresh `?v=386` (force rebuild once if same-map cached 521).

---

## 2026-08-15 — Web v385: Wave ∞ Razorback Tire Choir pack fight

### Frictions saw
1. Caltrops only ~3m rear · pack 50–120m never drafted into them
2. Shred toast spam (every caltrop pop) · no unique rival count

### Fix
- Long rear trail (3 rows) · wider hitR **5.8** · harder shred cap **0.32**
- Draft + ahead detect · FRONT+REAR / DRAFT TRAP / SURROUND toasts
- Unique-rival shred · named `TIRE CHOIR · NAME` · hitstop on first shreds

### Confirm
- shredN **2** unique · mausoleum+vesper capped · specialsLanded 1

Hard-refresh `?v=385`.

---

## 2026-08-15 — Web v384: Wave ∞ Parole Arch (IP rename)

### Frictions saw
1. Player-facing **Freedom Gate** copy reads as clone language

### Fix
- Finish strings → **PAROLE ARCH** / **PAROLE WITHIN REACH** / **PAROLE ARCH — BREAK OUT**
- Comment scrub: NFS/TM name-drops out of runtime headers

### Confirm
- Approach toast **PAROLE ARCH — BREAK OUT** · no Freedom Gate in live HUD

Hard-refresh `?v=384`.

---

## 2026-08-15 — Web v383: Wave ∞ Choir Sermon pack reach

### Frictions saw
1. Choir ring maxR **22m** — pack at 50–120m outer never felt the shove
2. Resolve toast stomped named hit

### Fix
- Instant blast **58m** + expanding ring maxR **58** · thicker wavefront
- Harder shove / stun · hitstop · toast `SERMON · NAME` / `N SHOVED`
- No resolve stomp over named toast

### Confirm
- Choir fire in pack · rival speed yank · shove lands at ~30–55m

Hard-refresh `?v=383`.

---

## 2026-08-15 — Web v382: Wave ∞ climb less faceted

### Frictions saw
1. Climb Y still stair-stepped (coarse control Y + 3-sample blend)

### Fix
- Path: extra climb/descent Y steps · catmull tension **0.08** · samples ≤**520**
- Ride: **5-sample** curve look-ahead · double-smooth target · grade pitch on mesh
- Rebuild world once if same-map cached old path

### Confirm
- nSamples **521** · mesh pitch tracks grade · softer early climb ease-in

Hard-refresh `?v=382` (force rebuild if same-map).

---

## 2026-08-15 — Web v381: Wave ∞ rain budget honored + FPS trim

### Frictions saw
1. City rain set **28** but floor forced **50** (v376 cut never landed)
2. Draw calls ~977 mid-run under both-flank mass

### Fix
- Rain floor **20** · city **26** · splash 12 · industrial/coastal trimmed
- dpr **0.8** · postfx scale **0.34**

### Confirm
- rainN **26** · calls ~817 · cards 15 · dpr 0.8

Hard-refresh `?v=381`.

---

## 2026-08-15 — Web v380: Wave ∞ Vesper local Blackout Kiss

### Frictions saw
1. Vesper special claimed **5 DISABLED** with only **1** rival in 62m (140m along-track ghost EMP)
2. Soft disable only — no blood, weak multi-hit juice

### Fix
- **Local 3D only** (burst **62m**) — no along-track ghost
- Speed yank **0.32** · shield-first chip · multi hitstop/FOV/shake
- Toast `BLACKOUT KISS · NAME` (single) or `N DISABLED`
- Dome/linger slightly larger for pack theater

### Confirm
- Toast **BLACKOUT KISS · RAZORBACK** · empHitN **1** · near62 **1** · specialsLanded 1

Hard-refresh `?v=380`.

---

## 2026-08-15 — Web v379: Wave ∞ results not empty asphalt

### Frictions saw
1. Win results: 3D backdrop open void at Freedom Gate (LOD off + finish pad)
2. Footer on win omitted **R retry** (middle line had it; lock broken)
3. Freedom win hollow mutator band · no rig identity · NITRO toast pri stomped combat

### Fix
- Results seat: early street pad (**0.22**) when finish/climb/open
- `_resultsLodBoost` wider LOD + full scan · rain off · underglow/body fill
- Wider/lower orbit so neon flanks frame hero
- Footer always **ENTER / CLICK — GARAGE · R — RETRY NIGHT**
- Identity line **CAR · SPECIAL** · freedom strip **PAROLE BOARD RESET**
- NITRO toast pri **0** / shorter

### Confirm
- Vesper results: `VESPER · BLACKOUT KISS` · R footer · near buildings ~129 / vis ~87 · focusY ~1.8

Hard-refresh `?v=379`.

---

## 2026-08-15 — Web v378: Wave ∞ Needle vein in real pack fight

### Frictions saw
1. Needle special often miss/toast-only with pack at ~50m (old 45m ahead cone)
2. Results R hint win/lose inconsistent

### Fix
- Vein hook range **58m** ahead / **28m** rear · pierces inv/shield
- Damage + disable + yank · hitstop/FOV · toast `THREAD THE VEIN · NAME`
- Results footer: **R retry night** always

### Confirm
- Needle toast **THREAD THE VEIN · RAZORBACK** · tether true · specialsLanded 1

Hard-refresh `?v=378`.

---

## 2026-08-15 — Web v377: Wave ∞ climb smooth + first-curve yaw soft

### Frictions saw
1. Climb still faceted (path samples + nearest Y only)
2. First-curve calm still yaw-fought intentional A/D

### Fix
- Path: catmull tension **0.12**, denser samples
- Y: 3-sample look-ahead blend · hotter grade damp
- First-curve: edge gate 0.60 rh · less yaw when out-steering

Hard-refresh `?v=377` (rebuild world once if same-map cached old path).

---

## 2026-08-15 — Web v376: Wave ∞ FPS after both-flank restore

### Frictions saw
1. After v373 cards/peeks, Neon FPS min **~35** (was 38 with 11 cards)

### Fix
- Cards **15** (pair 5 early both-side) · peeks 5 · fewer ridge caps
- Fewer towers/street/billboards · canyon 16/20/8
- dpr **0.82** · postfx scale **0.36** · **no bloom mips** · rain 28
- LOD every 3rd building/frame

### Confirm
- buildings **~1892** · cards **15** · early L/R both non-zero
- FPS steady samples **~36–39** (same-map restart)

Hard-refresh `?v=376`.

---

## 2026-08-15 — Web v375: Wave ∞ combat hit juice + R retry always

### Frictions saw
1. Rocket/bone hits mostly toast + small shake after heat pass
2. R retry only on lose — win re-run needed Enter→garage→map

### Fix
- Bone/rocket hits: hitstop + FOV punch + flash · toast `BONE HIT` / `DIRECT HIT`
- Results **R always** restarts same map (win or lose)

### Confirm
- No IP names in runtime JS · original cast only

Hard-refresh `?v=375`.

---

## 2026-08-15 — Web v374: Wave ∞ first-curve climb smooth + edge calm

### Frictions saw
1. First-curve still parked at asphalt edge (lat ~11) with mixed A/D
2. Climb Y felt stair-stepped (nearest-point only)

### Fix
- First-curve calm: asphalt edge gate **0.65 rh**, stronger pull, softer out-steer
- Ride Y: blend look-ahead path Y · grade-scaled damp (less faceted climb)

Hard-refresh `?v=374`.

---

## 2026-08-15 — Web v373: Wave ∞ Neon both flanks after FPS cut

### Frictions saw
1. After v370 card cut (11), **left FOV black** by prog ~0.11 (right still filled)
2. Ridge pairs only first 2 slots — not enough mass mid-opening

### Fix
- Horizon pairs **6** through ~34% + wider early cards (total cards **18**)
- Early ridges both flanks denser (5 paired)
- Close over-wall peeks 0.04–0.32 both sides (fill FOV on yaw)

### Confirm
- early prog L/R both >0 most samples · blackLeft rare (1/14 vs 4/10)
- cards **18** · FPS ~33–40 · still Neon both-side early

Hard-refresh `?v=373`.

---

## 2026-08-15 — Web v372: Wave ∞ heat Eye truth + hitstop + cam guard

### Frictions saw
1. Warden magenta grade **stuck forever** after heat Eye (`_wardenGrade` never cleared)
2. Special hitstop felt thin · cam could NaN freak

### Fix
- Restore map grade when Eye ends + heat cools
- Slow heat bleed while spraying MG (Eye not permanent)
- Deeper special hitstop (0.11 / dt×0.42) · cam NaN snap guard

Hard-refresh `?v=372`.

---

## 2026-08-15 — Web v371: Wave ∞ REACH coast + no offroad tele-finish

### Frictions saw
1. REACH offroad progress crawl ×0.9 **tele-finished** (prog 0.32→1 while off ribbon)
2. Need coast not city after 45s

### Fix
- Deep offroad (`ribbonDist≥40`): **freeze** progress
- Near-offroad crawl 0.15× maxStep only
- Coast verify: theme coast · tallCards 0 · water mass · first-curve centerClose 0

Hard-refresh `?v=371` (superseded cache by v372).

---

## 2026-08-15 — Web v370: Wave ∞ Neon FPS ≥38

### Frictions saw
1. Neon mid-chase dips to **~37** under combat (avg ~40)

### Fix
- Canyon mid 24 segs · cards **11** (pair 3 early both-side kept)
- LOD tighter · rain 36 · dpr **0.85** · postfx **0.4**

### Confirm
- Neon fps **[43,40,38]** min **38** · buildings ~2026 · cards 11
- Early both-side peeks retained

Hard-refresh `?v=370`.

---

## 2026-08-15 — Web v369: Wave ∞ Vesper/Choir/Razorback fight identity

### Frictions saw
1. Vesper EMP still aimed at 700m rubber-band ghosts after pack is close
2. Choir/Razorback hit feedback thin besides toast

### Fix
- Vesper: prefer **3D ≤55m**, along-track fallback ≤**140m** · per-hit sparks · juice
- Choir: `SERMON · N IN RANGE` · shove hit sparks
- Razorback: keep front+rear when pack leads (v366)

### Confirm
- Toast **BLACKOUT KISS · 5 DISABLED** · empHitN 5 · disabled 5
- SERMON / TIRE CHOIR fire clean · original cast only

Hard-refresh `?v=369`.

---

## 2026-08-15 — Web v368: Wave ∞ START same-map reuse (no rebuild hitch)

### Frictions saw
1. **Worst:** `clearRace()` always `world.clear` before sameMap check → path null → **every START rebuilt**
2. Map switch Neon↔REACH paid full rebuild freeze with no feedback

### Fix
- Decide `sameMap` **before** clear; `clearRace({ keepWorld })` preserves path+group
- Rebuild only on map switch + toast `BUILDING NIGHT…`
- Flag `state._sameMapReuse` for verify

### Confirm
- Restart same map: `sameMap=true` · ~430–580ms · groupParent true
- Switch map: `sameMap=false` · rebuild ~800ms · buildings flip (445↔2087)

Hard-refresh `?v=368`.

---

## 2026-08-15 — Web v367: Wave ∞ first-curve apex free of pack

### Frictions saw
1. Closer pack (v364) sat **center lane** on first bend — apex felt blocked
2. Hunter AI mirrored player lateral into the racing line early

### Fix
- Spawn **outer flanks only** (±3.8–4.9, no 0 lane)
- AI openApex (`prog < 0.14`): outer laneWant, no sideswipe/brake-check on line
- Soft lateral peel when `toP < 14` during open apex

### Confirm
- spawnLanes all |lane|≥3.8 · centerClose **0** through first curve
- spd holds **62** · contact still exists later (one RAM ok) · FPS ~40

Hard-refresh `?v=367`.

---

## 2026-08-15 — Web v366: Wave ∞ specials in real pack fight

### Frictions saw
1. Pack finally close (v364) but specials still read as silent rocket clones
2. Marrow bones pure-forward miss · Razorback rear-only when pack leads

### Fix
- Fight juice: hitstop/FOV/shake when pack ≤48m
- Marrow: aim bias + stronger homing · toast `BONE HARVEST · N NEAR`
- Razorback: front+rear caltrops when pack ahead
- HUD: `I BONES!` pulse when ready + pack near

### Confirm
- Toast **BONE HARVEST · 1 NEAR** · 3 bones · specialsLanded 1 · minD~29
- No console errors

Hard-refresh `?v=366`.

---

## 2026-08-15 — Web v365: Wave ∞ Neon FPS stagger LOD

### Frictions saw
1. Neon sepulcher still ~34 FPS mid-chase after v362

### Fix
- Canyon segs 20/28/10 · landmarks 4 · rain 48
- LOD: **squared dist** + **stagger half-list/frame** · tighter bands
- dpr **0.88** · postfx scale **0.44**

### Confirm
- buildings **~2087** · FPS **~36–39** on Neon · pack still near (minD~22)
- cards 14 · engine audible

Hard-refresh `?v=365`.

---

## 2026-08-15 — Web v364: Wave ∞ pack first-contact earlier

### Frictions saw
1. **Worst:** Pack spawn at t=0.20+ ≈ **900m** + `_reengageCd:16s` → first near at ~15–18s
2. Open grace only pushed pack *farther* when already ahead

### Fix
- Spawn **~52–120m** ahead (path-length aware), not progress 0.20
- `_reengageCd` **4.5s** · weapons ready sooner · inv 1.35s
- Open grace **4.2s**, grill-only reseat (`toP < 14` → ~42m seat)
- Player opening inv **1.2s** (was 2.0)

### Confirm
- firstNear **t≈2.4s @ 37m** (was ~16s @ 500m+)
- minD floor ~12–16 (not bumper thrash) · rear by t≈6.5 · UNDER FIRE
- FPS ~43 · engine audible

Hard-refresh `?v=364`.

---

## 2026-08-15 — Web v363: Wave ∞ pack theater + climb cam glue

### Frictions saw
1. Pack stayed ~500m+ after open grace; theater empty until late
2. Camera Y lag on climbs risked pop under/over car
3. Results → garage → START path must stay clean (same-map reuse)

### Fix
- Presence bands tighter (fight ~18–48m); re-drop at **90m** / ~55m seat ahead
- Cam Y: faster damp on grade + snap if yErr>1.4; leash p.y+3.2
- ELIM toast recognized in rival-special suppress list

### Confirm
- Pack minD drops ~500→38→16 by t≈18s · cam dy≈1.7 glue
- Results→garage→race · sameMap · engine audible · FPS ~39
- IP: original cast only (MARROW/NEEDLE/…); no Sweet Tooth / NFS UI strings

Hard-refresh `?v=363`.

---

## 2026-08-15 — Web v362: Wave ∞ FPS toward 40

### Frictions saw
1. **Worst:** Chase FPS still ~30 after v358 (buildings ~2575 / cards 20)
2. Far ridges/spikes always-on (`noLod` + no frustum)

### Fix
- Cards **14** (pair first **4** only always-on; late LOD+frustum)
- Fewer ridges/spikes/depth rings · canyon 24/32/12 · landmarks 6
- LOD tighter · dpr **0.92** · postfx scale **0.48**
- Rain 70 · fewer curb strips · dense windows every-other

### Confirm
- buildings **~2200** · cards **14** · FPS samples **~35–40** (was ~30)
- Early both-flank peeks kept · engine audible

Hard-refresh `?v=362`.

---

## 2026-08-15 — Web v361: Wave ∞ garage car clear of panels

### Frictions saw
1. **Worst:** Garage stats were RIGHT, but spinning car sat under **LEFT roster** (lookAt +1.6 left-biased)
2. Side panels wide (268/380) squeezed the clear band

### Fix
- Roster cam: car projects into **open center** (nx≈0.49); lookAt no longer parks under left list
- Narrower panels: left ≤248 / right ≤340 (stats still RIGHT, car uncovered)

### Confirm
- car AABB clear of leftEdge + right panel · statsOnRight · center band open
- Shot: `docs/shots/winf-v361-garage-clear.png`

Hard-refresh `?v=361`.

---

## 2026-08-15 — Web v360: Wave ∞ first-curve steer owns apex

### Frictions saw
1. **Worst:** First-curve calm + openEase keeper fought mixed A/D — rubber-band pull while holding turn
2. Edge gate bit early on open course

### Fix
- First-curve calm **gated by steer-out** (calmMul 0.18 when intentional out-steer)
- openEase: hard steer softens keeper · edgeGate ≥ rh×0.62 on open
- Still recovers lip (raised scrub not sticky)

### Confirm
- Mixed A/D first 10s: raisedN≤1 · lipMax≈0 · asphalt dominate · FPS ~36
- Engine still audible

Hard-refresh `?v=360`.

---

## 2026-08-15 — Web v359: Wave ∞ wreck/elim juice

### Frictions saw
1. **Worst:** Rival death felt empty vs combat hit juice — thin boom, short corpse, quiet SFX
2. Toast/feed read as plain "NAME WRECKED" without elim count

### Fix
- Louder `rivalWreck` + new `elimSting` rising credit
- Death: bigger fire/spark/smoke, hitstop 0.12, FOV punch 10, shake 0.55
- Corpse **3.2s** with chassis tumble + delayed secondary boom
- Toast/feed: `ELIM ×N · NAME DOWN +scrap` · kill-feed chip pop when fresh
- `isWreckToast` recognizes ELIM / DOWN lines

### Confirm (Chrome `?v=359`)
- Toast `ELIM ×2 · MAUSOLEUM DOWN +53 SCRAP` · feed line present
- corpseT≈3 · wreckSpin · secondary boom clears `_wreckBoomT`
- Engine still audible (v357)

Hard-refresh `?v=359`.

---

## 2026-08-15 — Web v358: Wave ∞ FPS cut far mass

### Frictions saw
1. **Worst:** After skyline pairs, rAF FPS still ~29 with buildings ~2775 / cards 28
2. Late horizon cards forced `frustumCulled=false` forever

### Fix
- Horizon cards **20** (was 28): pair first **6** only (both-side early peeks kept)
- Fewer ridges/spikes + canyon segs 30/40/14 · landmarks trimmed
- LOD bands tighter (detail/building/far)
- High postfx `internalScale` 0.62→**0.55**
- Late cards may frustum-cull

### Confirm
- cards **20** · buildings **~2575** · FPS **~31–34** (was ~29)
- Early progress both flanks still have mass (aheadL/R ≥1)
- Engine still audible (v357 probe)

Hard-refresh `?v=358`.

---

## 2026-08-15 — Web v357: Wave ∞ engine+nitro audible

### Frictions saw
1. **Worst:** Engine/nitro code existed (unlock · engineStart · engineUpdateEx · nitroWhoosh) but continuous layer stayed near-silent on laptop speakers — idle ~0.05×master, no resume re-pump, no structural probe
2. Nitro latch whoosh too thin vs combat SFX

### Fix
- Hotter master (0.58) + mid-present dual-osc idle/run gains (g≈0.10–0.24, g2≈0.055–0.14)
- Crank-up ramp + ignition bark on `engineStart`
- `engineUpdateEx` auto-restarts dead layer; unlock resume re-pumps last mix
- Louder nitro whoosh + continuous nitro loop
- Race kick retries ~45 frames until `engineProbe().audible`
- `GAME.sfx.engineProbe()` for ear-less verify

### Confirm (Chrome `?v=357`)
- Probe mid-chase: `ctx=running` · `audible=true` · g1≈0.25–0.29 · nitroG≈0.05–0.12 while Q held
- NITRO · BURN toast · 140 mph asphalt
- Shot: `docs/shots/winf-v357-engine-nitro.png`

Hard-refresh `?v=357`.

---

## 2026-08-14 — Web v356: Wave ∞ FPS trim + UNDER FIRE gate

### Frictions saw
1. After v355 pairs, FPS ~29 / cards 46 / buildings ~3100
2. UNDER FIRE could chatter at pri 1

### Fix
- Fewer early card slots (28 total pairs) + fewer far ridges/spikes
- Mid canyon segs 64→48, open 44→36
- UNDER FIRE pri 0, gate **2.4s**

### Confirm
- cards **28** · extras **30** · buildings **~2775**
- Early chase still both flanks lit (not pure black left)

Hard-refresh `?v=356`.

---

## 2026-08-14 — Web v355: Wave ∞ Neon both-side skyline

### Frictions saw
1. **Worst:** Early Neon chase left FOV pure black (cards 2 left / 24 right at sample)
2. Climb later already had mass both sides

### Fix
- Horizon cards **paired** left+right through first 30% of course
- Early ridges **both sides** with neon crowns

### Confirm
- Shot: `docs/shots/winf-v355-neon-both-sides.png` — walls + skyline both flanks
- 170 mph asphalt

Hard-refresh `?v=355` (superseded by v356 cache).

---

## 2026-08-14 — Web v354: Wave ∞ under-fire juice

### Frictions saw
1. Enemy hits felt silent when shield/tiny HP (early return skipped sfx/flash)
2. Pack rear fire already lands (v352) but no HUD read

### Fix
- Shield hits still shake + flash + hurt sfx
- Gated toast `UNDER FIRE` / `SHIELD HIT` (1.4s)

### Confirm
- Toast **UNDER FIRE** · hurtSfx · fightSec ~21s · grill ~0

Hard-refresh `?v=354`.

---

## 2026-08-14 — Web v353: Wave ∞ REACH coast, not city

### Frictions saw
1. **Worst:** REACH chase horizon still read as **neon skyscrapers** (tall rect cards + tower cliffs)
2. First-curve W+D on REACH: asphalt, maxLat 9.6, hop 0 (held)
3. Map switch Neon↔REACH: no freeze (startMs 0.2–1.5s)

### Fix
- Horizon paint: **rolling ridge polys** + warm dusk only (no cyan city belts)
- Cards **wide+low** (36–68h) not 88–150 tower planes
- Cliffs → low mesas; sea stacks stubbier, mostly ocean-side
- Brighter/larger water strips; shorter farm silos
- Denser coast path samples

### Confirm
- First-curve REACH: raised **0**, 170 mph asphalt
- Chase names water + mesas + amber dusk (not skyline)
- Shot: `docs/shots/winf-v353-reach-coast.png`

Hard-refresh `?v=353`.

---

## 2026-08-14 — Web v352: Wave ∞ pack return fire

### Frictions saw
1. Pack ahead never shot — `aimDot > 0.12` required facing player; leaders face path
2. Enemy hit R / MG range too tight; invuln 0.55 muted return MG
3. First-curve D+S trail-brake: raised 0, maxLat 9.8 asphalt (held)
4. R retry: results → race, player alive (held)

### Fix
- Rear fire when leading (`progLead>0` + range) — weapons aim at player
- Enemy MG/rocket hit R, speed, life, dmg up; tighter close aim
- MG hit on player: inv clamp 0.18 + hit sfx

### Confirm
- maxEnemyProj **4** in fight band · hurtSfx fires · grillSec ~0 · fightSec ~21s
- Curve D+S / R retry still clean

Hard-refresh `?v=352`.

---

## 2026-08-14 — Web v351: Wave ∞ pack floor (not grill)

### Frictions saw (post-v349)
1. **Worst:** Pack closed to **7–13m** / alongside (ahead 1m) — grill, not fight band
2. Far ease (`toP>14` → 0.8×pace) still dragged close pack into bumper

### Fix
- Presence floor: `<14m` punch ahead, `14–22m` soft pull, `22–36m` hang
- Lead ease only when still far (`toP>32/40`)

### Confirm (Marrow · Neon · 50s)
- grillSec **0** · under15Sec **0** · fightSec **~20s** (15–45m)
- min3 **~15–17m** (was 7–13) · still closes from 500m after re-drop

Hard-refresh `?v=351`.

---

## 2026-08-14 — Web v350: Wave ∞ finish sting once

### Frictions saw
1. Finish ceremony **triple finishSting** (0.92 gate + clear + results)
2. Ceremony copy sequence itself OK: AHEAD → BREAK OUT → CLEARED → results

### Fix
- Approach (0.92): soft confirm/beep only
- One `finishSting` at GATE CLEARED (`_finishStingPlayed`)
- Results: `win` if sting already played
- Reset finish flags on START

### Confirm
- stingCount **1** · sfx: beep → confirm → finishSting → win
- Ceremony toasts intact · outcome win

Hard-refresh `?v=350`.

---

## 2026-08-14 — Web v349: Wave ∞ pack fightable (not locked gap)

### Frictions saw (Marrow · Neon · combat after v348)
1. **Worst:** Pack locked at ~200m forever — presence `toP>40` set `pPace*1.05+3`, then catch-up branch **overwrote** theater; `reengageCd=0.12` when far re-dropped every frame
2. MG range ~70m / rocket ~200m — 200m gap = empty combat (0 kills, 0 hits)
3. Pocket/block: none (pass) · spawn still ahead at 0.20+

### Fix
- Presence theater: ease when far, hang near when close — **never** outrun player
- Do not overwrite presence band with catch-up sprint
- Re-drop only when `toP>120` or `progLead>0.06`; seat ~75m; Cd 12s
- Remove far→Cd=0.12 thrash

### Confirm (Marrow · 50s combat)
- Gap after re-drop **closes** (43→7m) · **1 kill** · hit/explode sfx · BONE HARVEST
- pocketSec **0** · blockSec **0** · still up-track

Hard-refresh `?v=349`.

---

## 2026-08-14 — Web v348: Wave ∞ pack fight distance

### Frictions saw
1. **Worst:** Pack rubber-band sat **700–900m** ahead — MG/specials empty theater
2. Re-drop only when 3D `toP>55` after 22s — never by progress lead

### Fix
- Stronger lead ease when `progLead>0.035/0.07`
- Re-drop also when `progLead>0.055` or `toP>42` (from 16s)
- Seat closer: `liveProg+0.045` (was +0.07)

### Confirm (Marrow · Neon · 45s)
- Early minAlong **~750m** → after 16s **~206m**
- PACK AHEAD toast once · still up-track (not bumper)

Hard-refresh `?v=348`.

---

## 2026-08-14 — Web v347: Wave ∞ climb ribbon / canyon smooth

### Frictions saw
1. **Worst:** Climb still read faceted — box curbs + wall pitch only used segment start
2. First-curve human steer held (v346) — reconfirm after denser samples

### Fix
- Path samples denser (260–340)
- Continuous **curb ribbons** (both sides) instead of pitched box curbs
- Canyon walls: average pitch, +1.35m overlap, more mid-course segs

### Confirm
- First-curve D: raised **0**, maxLat 9.5 asphalt, 170 mph
- Climb shot: `docs/shots/winf-v347-climb-road.png`
- pathPts ~341 · no console errors

Hard-refresh `?v=347`.

---

## 2026-08-14 — Web v346: Wave ∞ first-curve human steer

### Frictions saw (Marrow · Neon · W + light D on first RH bend)
1. **Worst:** Holding D through first curve killed edge keeper (`|steer|≥0.22` hard cut) → **7.7s raised** lat 14, mph 131 scrub
2. Path-follow light A/D alone was fine (asphalt) — pure W-only was never the pull
3. Lip return weakened when player held turn

### Fix
- Progressive edge-keeper steer gate (full ≤0.28, fades to 0 by 0.78; out-steer ×0.15)
- First-curve calm `prog<0.18`: pull to 0.38·rh + face ribbon on raised/wide asphalt
- Lip stuck recovery sooner on opening (0.22s); stronger open pull (≥4.2)

### Confirm (Marrow · Neon · W+D first bend)
- curve raised **0s** (was 7.7) · maxLat **9.6 asphalt** · minMph **170**
- W-only reconfirm maxLat 6.3 asphalt
- Shot: `docs/shots/winf-v346-first-curve-steer.png`

Hard-refresh `?v=346`.

---

## 2026-08-14 — Web v345: Wave ∞ high-speed lip shove

### Frictions saw (post-v344)
1. **Worst:** Vesper REACH pure-W still maxLat **12.5** / minMph **49** (brief offroad kiss)
2. EMP chase-pack hits held from v344

### Fix
- speedNorm>0.85: gate **0.34·rh**, lane **0.28·rh**, stronger yaw/pull
- Extra pull when `|lat| > 0.88·rh` (shove off lip before offroad tax)

### Confirm
| Car · REACH | asphalt/off | maxLat | minMph |
|-------------|-------------|--------|--------|
| Vesper 48s | **48 / 0** | **7.3** | **155** (was 12.5 / 49) |
| Needle 40s | **40 / 0** | 7.4 | **211** |

Hard-refresh `?v=345`.

---

## 2026-08-14 — Web v344: Wave ∞ Vesper EMP hits chase pack

### Frictions saw (Mausoleum + Vesper · REACH)
1. **Worst:** `BLACKOUT KISS · MISS` always — EMP was pure 3D 32m while pack rubber-bands 350–900m up ribbon
2. Mausoleum LAST RITES lands · asphalt 50s · hop 0 · cards 20/20 (pass)
3. Vesper still brief edge kiss (maxLat ~12) — queued

### Fix
- EMP hits local burst **or** nearest chase-pack by along-track (≤700m, max 4, ahead-biased)
- `specialCtx` exposes `path` for length
- Miss copy → `NO ONE NEAR` when empty

### Confirm (Vesper · REACH)
- Toast **BLACKOUT KISS · 1 DISABLED** (empHitN 1)
- Mausoleum RITES + horizon held

Hard-refresh `?v=344`.

---

## 2026-08-14 — Web v343: Wave ∞ missing-weapon toast once

### Frictions saw (Choir + Razorback · Neon · combat)
1. **Worst:** Razorback (no stock rockets) **NO ROCKETS** toast every K press (~2.5s) — flooded channel over SERMON/TIRE
2. Choir **SERMON** special + sfx landed (pass) · asphalt held maxLat ~10
3. Tire Choir special lands (pass)

### Fix
- Missing rocket / mine deny toast **once per race** (`_denyRkSaid` / `_denyMnSaid`)
- Re-press after first: silent gate only (no toast spam)

### Confirm
- Razorback K-spam: **NO ROCKETS edges = 1** (was 3+)
- Choir SERMON toast · specialsLanded ≥1 · asphalt

Hard-refresh `?v=343`.

---

## 2026-08-14 — Web v342: Wave ∞ high-speed edge gate earlier

### Frictions saw (post-v341)
1. **Worst:** Needle pure-W still briefly kissed offroad (maxLat 12.5, minMph 49) before recovery
2. Edge gate `0.55·rh` too late at 228 mph

### Fix
- When `speedNorm > 0.72`: edge gate **0.42·rh**, lane target **0.32·rh**, stronger pull
- Yaw ease slightly stronger at speed

### Confirm
| Car · Map | asphalt/off | maxLat | minMph |
|-----------|-------------|--------|--------|
| Needle · REACH 48s | **48 / 0** | 8.7 | **161** (was 49) |
| Marrow · Neon 35s | **35 / 0** | 7.4 | 133 |

Hard-refresh `?v=342`.

---

## 2026-08-14 — Web v341: Wave ∞ Needle REACH offroad recovery

### Frictions saw (Needle · REACH · W-only 48s @ v340)
1. **Worst:** At prog ~0.43 lat 14 **offroad pin** 21s @ 49 mph — stuck recovery required `speed<10` OR `lat>1.7·rh` (never true at offRoadMax)
2. Corridor gate `roadHalf+2.5` left a dead band just past coast raised hairline
3. No hop (raised 0) · cards 20/20 horizon OK

### Fix
- Offroad continuous return while light steer
- Corridor from `raisedOuter+0.35`; deep pull from `1.45·rh`
- Stuck scrub: any offroad + light steer **>0.4s** → pull to `rh−2.8`, face ribbon, min speed 28

### Confirm (Needle · REACH · 50s W-only)
- asphalt **50 / raised 0 / offroad 0.05** (was 26.6 / 0 / 21.4)
- maxOffStreak **0.05s** · prog **0.79** @50s · 228 mph race pace
- hop 0 · cards 20/20
- Shot: `docs/shots/winf-v341-needle-reach.png`

Hard-refresh `?v=341`.

---

## 2026-08-14 — Web v340: Wave ∞ Marrow combat heat truth

### Frictions saw (Marrow · Neon · W + J/K/I 70s)
1. **Worst:** Hold-J applied **warden heat every frame** even during MG overheat lockout / rate CD — heat maxed while guns silent
2. `GUNS OVERHEAT` toast re-fired every ~2.6s while holding J (channel spam)
3. First curve + climb: asphalt held, maxLat ~9.5 (no lip-pin) — pass

### Fix
- Warden heat only on **successful** MG / rocket / mine discharge
- Overheat toast **once per cool-cycle** (`_overheatToastArmed`, re-arm when mgHeat < 0.25)

### Confirm (Marrow · Neon · 50s combat)
- asphalt **45s / raised 0** · maxLat 9.2 · 170 mph
- OVERHEAT edges **1** (was 10+) · BONE HARVEST · rockets fired
- Heat still climbs under sustained fire (hostile reachable)
- Shot: `docs/shots/winf-v340-marrow-combat.png`

Hard-refresh `?v=340`.

---

## 2026-08-14 — Web v339: Wave ∞ Neon left mass + toast clear

### Frictions saw
1. **Worst:** Neon chase left FOV still black void (right skyline OK)
2. Canyon wall mat `0x16141f` read as pure black face
3. Toast `msg` string lingered after `msgT=0` (HUD gated; sample lie)

### Fix
- Horizon cards **26**, early bias **left (−)** · denser early left ridges
- Canyon wall lift `0x222030` + **neon crown belts** on wall tops
- Taller early **left** landmark towers (over wall)
- Clear `state.msg` when toast timer expires and queue empty

### Confirm
- Chase `docs/shots/winf-v339-neon-left-mass.png` — left red/cyan crowns + mass, not pure void
- Vesper 199 mph asphalt on climb; cards 26/26 HIGH
- `msg` empty after toast expires

Hard-refresh `?v=339`.

---

## 2026-08-14 — Web v338: Wave ∞ THE REACH horizon + O density

### Frictions saw
1. **Worst:** REACH late chase — inland side pure black void (water left OK, land empty)
2. Ground plane centered at origin missed path mid on long coast ribbon
3. O quality already hid cards/extras on v335 — reconfirm after mass add

### Fix
- Path-mid ground (4200²) · warmer `groundColor` / fog / bg
- Inland dirt shelf + **10 cliff ridges** w/ amber belts (quality extras)
- Horizon cards **20** (bias inland), taller; path-following dusk haze
- Sea stacks alternate shores; denser silos

### Confirm (Vesper · REACH · W-only)
- Chase shot names water + cliffs + lamp — `docs/shots/winf-v338-reach-horizon.png`
- raised **0s** · no hop · maxLat ~7 early (edge keeper holds)
- HIGH cards **20/20** · LOW **0/20** cards + **0/50** extras (O / setDensity)

Hard-refresh `?v=338`.

---

## 2026-08-14 — Web v337: Wave ∞ edge-keeper lateral (Vesper/Mausoleum)

### Frictions saw (Mausoleum Neon · Vesper REACH · W-only)
1. **Worst:** High-speed pure-W drifts to lat ~11 and rides the asphalt lip forever — edge keeper was **yaw-only**, so Vesper scrubbed raised (199→104 mph)
2. Mausoleum Neon first curve + climb: no lip-pin (asphalt held) — pass for tank
3. REACH inland side still reads black in late chase (queued for next)

### Fix
- Edge keeper now **walks lateral** toward outer racing line (`0.40·roadHalf`) when `|lat| > 0.55·rh` + light steer
- Stronger speed-scaled yaw ease + center suction (`0.82·rh`, pull `0.42+speed`)

### Confirm
| Car · Map | asphalt / raised | maxLat | minMph | note |
|-----------|------------------|--------|--------|------|
| Vesper · Neon 50s | **50 / 0** | 9.5 | 133 | settles ~6.3 outer lane @199 |
| Mausoleum · Neon 40s | **40 / 0** | 7.6 | — | first curve+climb, no pin |
| Vesper · REACH 45s | **45 / 0.1** | 11 brief | 142 | was 0.6s raised + stuck 11 |

Shot: `docs/shots/winf-v337-vesper-neon-climb.png`  
Hard-refresh `?v=337`.

---

## 2026-08-14 — Web v336: Wave ∞ Needle lip-pin recovery

### Frictions saw (Needle · Neon · W-only 70s)
1. **Worst:** After first bend, stuck on raised lip 60s+ (lat ~−15, 228→49 mph, prog frozen ~0.30)
2. Opening soft **zeroed lip return pull** (`pullLip * 0.15`) so curb never recovered
3. Wide-line high-speed cars leave asphalt once opening ease ends at 0.16

### Fix
- Lip return pull always full strength (open soft = speed tax only)
- **Lip stuck recovery** after 0.4s on raised → nudge to `roadHalf−2.8`, face ribbon, min 30 speed
- Opening ease to **0.20** + **edge keeper** when `|lat| > roadHalf*0.55` on asphalt (speed-scaled yaw ease, light steer only)

### Confirm (Needle · Neon · 60s W-only)
- asphalt **58s** / raised **2s** (was inverted)
- progress **0.43 @30s · 0.82 @60s** (was stuck ~0.30)
- maxLat ~11.9 brief; recovers to asphalt at race pace

Hard-refresh `?v=336`.

---

## 2026-08-14 — Web v335: Wave 5 + Wave ∞ (quality · REACH horizon · coast hop)

### Play-confirm v334→v335
- **Neon Circuit:** W-only first curve lat ≤8 @ 161 mph asphalt; chase skyline still peeks (cards 20)
- **THE REACH:** 20s drive; water + stacks + dusk cards readable; mph HUD
- **O quality on REACH:** horizon cards **0/14 visible** on LOW; toast `QUALITY LOW…`; 4 PointLights

### Wave 5
- `setDensity`: hides `_horizonCards` + `_qualityExtras` (+ traverse belt-and-suspenders)
- Coast dusk cards (warm cliffs + amber belts), path-following water/sand strips, taller stacks
- Lighthouse taller / fog:false so landmark reads at range
- sfx unlock still fires on first key + START kick (held)

### Wave ∞ (worst friction saw)
- REACH sidewalk raised band made chase hop mid-air on lip — **no sidewalk slabs on coast**; raised band hairline (walkW 0.35)

Hard-refresh `?v=335`.

---

## 2026-08-14 — Web v334: Wave 4 THE REACH (second map, coastal dusk)

Neon Circuit 90% gate all PASS → Map 2 unlocked.

- `cfg.maps` second row: **THE REACH** (`theme: 'coast'`)
- `buildPathCoast()` — long straights, gentle Y, ~5.1 km
- `_buildCoastDress()` — water plane, sand shelf, sea stacks InstancedMesh, inland silos, lighthouse + glow disc (no PointLights)
- START reuses world only when **same map id**; rebuilds on map switch (keeps freeze fix, enables Map 2)
- **Confirmed chase:** `docs/shots/w4-v334-the-reach-chase.png` — open horizon, blue water left, stacks right, continuous road, mph HUD

Hard-refresh `?v=334`.

---

## 2026-08-14 — Web v332: Waves 0–3 (smooth ribbon · visible city · first-curve calm)

Overnight plan `docs/OVERNIGHT-2026-08-14.md` through Neon Circuit 90% gate.

### Wave 1 — Smooth ribbon
- Path Y: **flat through first curve** (~0→0.15), then soft climb **max ~26 m** (was 0→50 kink)
- Wider opening right-hand sweep (no tight 55/−400 kink)
- Asphalt as **continuous BufferGeometry strip** + cyan edge rails + overlapped curbs
- Canyon dress tilts with ribbon pitch; denser samples (~220–320)

### Wave 2 — World beyond neon
- Fog HIGH **0.00085**, color `0x152030` (was eating cards)
- Horizon cards: taller (100–124 m), just behind canyon, **fog:false**, dense early
- Depth ridges + ahead spikes with cyan/magenta belts so chase vanishing point reads city
- **Confirmed chase:** `docs/shots/w2-v332-chase-skyline.png` — skyline mass + neon belts over wall

### Wave 3 — First-curve pull
- Center suction off first 20%; threshold `roadHalf * 0.85` after
- Lip/sidewalk: soft tax first 22% (no 58→14 crawl); corridor only `> roadHalf + 2.5`
- Fold guard: ignore nearest when `|ΔY| > 8` and lateral small
- Opening ribbon ease: light yaw follow on asphalt progress < 0.16 if almost no steer
- **Confirmed:** W-only through first bend, lat ≤8 @ 161 mph, asphalt

### Locks held
mph · garage right · camera glue · START reuse · pack ahead · ≤4 PointLights · no IP

Hard-refresh `?v=332`.

---

## 2026-08-14 — Web v326: Horizon city beyond the ribbon

8 painted skyline cards (one canvas), haze recentered on the course, hotter magenta/cyan sky glow. LOW (O) hides the cards. No new lights.

Hard-refresh `?v=326`.

---

## 2026-08-14 — Web v324: Wave ∞ Razor shred + START warm + death guard

### Play checks (v321→v324)
- START reuses menu world — **no tab freeze** (path reuse path)
- Hills: Y **0→50** in 30s; cyan ridges present; local cam slope tilt
- **Vesper:** `BLACKOUT KISS · 3 DISABLED` + EMP dark (confirmed)
- **Razorback:** 7-fan caltrops, **`TIRE CHOIR · N SHRED`** when draft pack hits (confirmed)

### Fixes
- Rival Basic mesh demote-once + garage warm (START less stutter)
- HP≤0 soft-lock → always `endRace` (was stuck dead in race mode)
- Tire Choir wider fan / hitR / shred toast

Hard-refresh `?v=324`.

---

## 2026-08-14 — Web v323: Pack starts as a race field

Rivals no longer spawn in your pocket or teleport onto the bumper.
- Grid spawn **ahead** on the ribbon (~0.20 / 0.28 / 0.37 …)
- Re-drop seats **up the track**, not beside you
- Late hunter appears ahead on the line, not “on your six”

Hard-refresh `?v=323`.

---

## 2026-08-14 — Web v322: Camera glued to the car

Hill look-ahead (5% of the course) yanked the camera into the sky / under the road.
- Removed distant path look-at
- Camera stays on the car; tiny local slope tilt only
- Snap back if >12m away; Y leashed to car +0.55…+3.4m

Hard-refresh `?v=322`.

---

## 2026-08-14 — Web v321: Wave ∞ progress freeze crawl

### Cold Marrow Adventurous hunt
- Stuck **~0.218 for 60s+** when ribbon nearest lagged maxProgress (CORRIDOR spam)
- After **1.2s** on-ribbon stall with forward speed: tiny progress crawl (no tele-finish)
- Throttle climbs out of accidental reverse
- Confirmed: 60s **0.015 → 0.707**, advances through former freeze zone

Hard-refresh `?v=321`.

---

## 2026-08-14 — Web v320: Unfreeze START after hill pass

Clicking START rebuilt the entire city; InstancedMesh bounds/sanitize could stall the tab.
- Reuse the menu world at race start
- Skip InstancedMesh in driveline assert
- Guard steep-grade tangents (no NaN side/speed)

Hard-refresh `?v=320`.

---

## 2026-08-14 — Web v319: Wave ∞ hazard audio holes

- **Oil** was silent on slip — `sfx.oil` wet hiss + toast still `OIL — SLIP` (confirmed)
- **Sand** grit rumble `sfx.sand` on grit hurt tick
- **Spike** red bite `sfx.spike` metal thump (fallback hurt)
- No red console

Hard-refresh `?v=319`.

---

## 2026-08-14 — Web v318: Wave ∞ identity land + camera crash fix

### Needle / Maus / Choir 30s identity (confirmed by play)
- **Needle:** `THREAD THE VEIN` + cyan cable tether (~1.5s)
- **Mausoleum:** lob aims at pack with speed lead; radius 12.5; toast **`CRATER · N HIT`** when it lands (3/3 in test)
- **Choir:** larger sermon ring (22m / 0.52s); path-space knock + shield bite; toast **`SERMON · N SHOVED`** (3 shoved, HP tick)

### Rival special toast gate
- EMP/BONE SHOT/etc. skip while player special/wreck owns the channel

### Camera
- Climb look-ahead no longer references undefined `near` (was spamming red console)

Hard-refresh `?v=318`.

---

## 2026-08-14 — Web v317: Wave ∞ Maus aim + Choir shove groundwork

- Maus forward-cone aim + hit toast
- Choir path knock / mass-from-defId
- Folded into v318 play-confirm after camera crash surfaced

---

## 2026-08-14 — Web v316: Wave ∞ overheat toast + re-seat

### Confirmed by play (v315)
- Space at speed = drift, nitro fills, DRIFT toast
- Q = **NITRO · BURN** event
- I ×2 with **~6.5s** CD; no red console (three.js deprecation only)

### Contact / re-seat
- Forced 3-rival sandwich after grace: **~15 HP one ram** in 2s — keep **1.1s** ram CD
- HP @10s full on clean open
- Re-seat lerp **0.3 → 0.4s**

### 90s hunt fix
- Dual **GUNS OVERHEAT / OVERHEAT** spam → one toast + red **J OVERHEAT** HUD chip

Hard-refresh `?v=316`.

---

## 2026-08-14 — Web v315: Wave ∞ straight drift + special CD read

- **Straight Space/Shift** at speed is a drift (no steer required)
- Special CD **8 → 6.5s**; HUD `READY IN Xs`
- LOW quality skips world cyan drip

Hard-refresh `?v=315`.

---

## 2026-08-14 — Web v314: Wave ∞ drift fills nitro + bones read

- Drift fill pip + Q NITRO · BURN + Bone Harvest femur

Hard-refresh `?v=314`.
