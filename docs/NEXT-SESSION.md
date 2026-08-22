# Twisted Speed — Next session pickup

**Frozen at:** web **v404** (2026-08-22)  
**Why we stopped:** Director: v403 auto-centered too hard; wanted more shooting. v404 lip-only steer + meatier rockets/LOCK. Durability / skyline still open.  
**Primary runtime:** web three.js only. Do **not** touch Unity.  
**Repo:** `C:\Users\brand\1. Game Making\twisted-speed-build-pack`  
**Do not use:** `C:\Users\brand\TwistedSpeed` as the edit tree (sync that clone only when pushing GitHub).

## Start play (do this first)

```powershell
cd "C:\Users\brand\1. Game Making\twisted-speed-build-pack\web"
python -m http.server 8765
```

Open **http://127.0.0.1:8765/?v=404** and hard-refresh (`Ctrl+Shift+R`). Title **BUILD 404**.

Same-map START **reuses the world**. After any path/scenery ship, switch Neon ↔ THE REACH once so dress rebuilds.

---

## Shipped this session

| Ver | What | Honest leftover |
|-----|------|-----------------|
| v400 | HUD map name; chase MG muzzle/sparks | Tracer *rods* still easy to miss behind Choir van |
| v401 | Hit chevron (large, HUD-safe); `BONE HARVEST → NAME`; banner not `REACH FINISH` | Chevron not yet proven on a live rival hit (forced `hitDir` screenshot) |
| v402 | Neon climb: canyon densify, no pink fullscreen slab, both-side wall depth | Skyline above canyon lips still black/sparse |
| v403 | First-curve auto-center (peak −0.92) | Director: overcorrected — W drove the line |
| v404 | Lip-only assist (W peak **−11.5**); rocket boom + LOCK pip | MG rods still easy to miss; durability |

**THE REACH load:** keyboard select **does** build coast (water, mesas, `theme=coast`). HUD now names the map.

---

## Still open

### P1
- [x] **Steer the corners (v404)** — W no longer drives the line (peak −11.5). Director play: does first bend still need A/D?
- [ ] Climb still **faceted / steep** (y 0→18 by 30%) — one surface?
- [ ] Skyline beyond canyon lips (name 2+ *city* things, not just wall texture)
- [ ] Durability — armor evaporates (177→126 in ~30s). Prefer cues/pickups over flat HP. Director feel.

### P2
- [ ] Neon FPS toward 40+ if it dipped
- [ ] Ground hop (not seen this session, hopLift 0)
- [ ] Special toast in *play* (Marrow ` → NAME`)
- [ ] Pack fight 15–45 m
- [ ] IP sweep
- [ ] Quality **O** both maps

### Do not
- Unity · `world.build` on same-map START · distant camera look-ahead · pocket-spawn · new PointLights · map 3

---

## Locks (never regress)

mph HUD · garage car clear + stats **RIGHT** · camera glue · START same-map `clearRace({ keepWorld })` · pack 50–120m **outer** · void = lateral · REACH stays **coast** · Neon both-side climb walls · late peeks 0.58/0.70/0.82 · map name chip · chase MG muzzle · hit chevron HUD-safe · R retry win+lose · Parole Arch · original cast · saves `twisted-speed-v5-night`

Gate C **CLOSED**.
