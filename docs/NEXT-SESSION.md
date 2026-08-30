# Twisted Speed — Next session pickup

**Frozen at:** web **v412** (2026-08-30) — Gauntlet Loop active  
**Why we stopped:** Lead Gauntlet in progress (Piece B maglev dress shipped; critic pending).  
**Primary runtime:** **web** three.js only. Do **not** touch Unity.  
**Gate C:** CLOSED (director play, not a ship claim).  
**Edit tree:** `C:\Users\brand\1. Game Making\twisted-speed-build-pack`  
**Do not edit:** `C:\Users\brand\TwistedSpeed` (GitHub clone — sync + push only).

## Start play (do this first)

```powershell
cd "C:\Users\brand\1. Game Making\twisted-speed-build-pack\web"
python -m http.server 8765
```

Open **http://127.0.0.1:8765/?v=411** and hard-refresh (`Ctrl+Shift+R`). Title **BUILD 411**.

Same-map START **reuses the world**. After any path/scenery change, switch Neon ↔ THE REACH once (or hard-refresh) so dress rebuilds.

**Arcade zip (already built):**  
`C:\Users\brand\Desktop\TwistedSpeed-v411-arcade.zip`  
(also `...\twisted-speed-build-pack\dist\TwistedSpeed-v411-arcade.zip`)  
Zip root = `index.html`. ~43 MB. GitHub: https://github.com/brandonmcdowra-creator/TwistedSpeed (`83cf7e0`).

---

## Quality bar (director, this round)

Reference clip: https://x.com/TokenGremlin/status/2089812957274230962  
**Steal:** clip-level *quality* and *amount of world* (asphalt, props with scale, both flanks a place, haze, chase-cam combat). **Do not** reskin to dusty wasteland day. **Neon over rust** stays.

Living track pattern (the train): the world occupies the road; yellow→red telegraph; **wait or thread a gap**; punish, don’t brick. First beat = **prison freight maglev** on Neon.

Build approach (locked): **greybox the beat, then dress that same junction** — not whole-map polish.

---

## Shipped this round (honest)

| Ver | What | Leftover |
|-----|------|----------|
| v400 | HUD map name; chase MG muzzle/sparks | Tracer *rods* still easy to miss behind Choir |
| v401 | Hit chevron; special toast ` → NAME` | Chevron proven with forced `hitDir`, not only live hit |
| v402 | Canyon densify vs pink-slab | Skyline above lips still sparse |
| v403 | First-curve auto-center | **Overcorrected** — W drove the line |
| v404 | Lip-only assist; rocket boom + LOCK pip | Must steer; MG rods still thin |
| v405 | Greybox maglev ~28% | Blink / no readable gap |
| v406 | Flatten 25 m faceted climb; slower maglev | Still no real gap; crawled |
| v407–v408 | Maglev **wall then held gap** (red wait → green GO) | Greybox boxes; dress junction not done |
| v409 | Gentle hills (~6 m, ~1.5% grade); first corner + maglev flat | Can raise crests later with same sample density |
| v410 | Rivals **own pace** — no warp-ahead, no pack tug, no finish camp; remount from behind | Blocker brake-check still exists (dirty racing, not teleport) |
| v411 | Sidewalks/curbs = path **ribbons**; canyon ~13 m mid-framed; shopfronts **face the street** | Still a neon trench vs clip density; 43 driveline hides |

**THE REACH:** keyboard select **does** load coast (`theme=coast`). HUD names the map. No maglev on REACH.

---

## First acts next round

1. Critic A/B **v412** maglev (~22–30%): wait-red / gap-green + prison-freight place vs Heat night bar.
2. Piece A: both-flank / skyline density (name 2+ things past the wall each side).
3. Piece D: MG readability + durability cues (not silent HP buff).
4. Director play when critic rounds land.

---

## Still open

### P1
- [ ] Maglev junction **dress** (greybox boxes → prison freight silhouette + place)
- [ ] Skyline / world beyond canyon lips
- [ ] Durability
- [ ] Director sign-off on maglev wait/gap and rival AI

### P2
- [ ] Neon FPS if v411 canyon segs hurt
- [ ] MG tracer rods in chase (muzzle/sparks exist)
- [ ] Ground hop (not seen; hopLift 0)
- [ ] Special toast in live Marrow play
- [ ] IP sweep · Quality **O** both maps

### Do not
- Unity · `world.build` on same-map START · camera look-ahead · pocket-spawn · new PointLights · map 3  
- Desert reskin · smash-through maglev as a valid line · teleport rivals ahead · W-only auto-steer through corners  
- 25 m faceted climb (hills stay gentle + dense samples)

---

## Locks (never regress)

mph HUD · garage stats **RIGHT** · camera glue · START same-map `clearRace({ keepWorld })` · void = lateral · REACH **coast** · map name chip · chase MG muzzle · hit chevron HUD-safe · maglev: wait/thread, not ram · rivals own-pace (no warp-ahead) · lip-only steer assist · ribbon sidewalks + short canyon segs · R retry win+lose · Parole Arch · original cast · saves `twisted-speed-v5-night`

Gate C **CLOSED**.
