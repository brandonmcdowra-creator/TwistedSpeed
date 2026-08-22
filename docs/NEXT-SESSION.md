# Twisted Speed — Next session pickup

**Frozen at:** web **v398** (2026-08-15)  
**Why we stopped:** Overnight Grok 4.5 hit usage (402) mid-launch of the **v399** loop. Nothing after v398 shipped.  
**Primary runtime:** web three.js only. Do **not** touch Unity.  
**Repo:** `C:\Users\brand\1. Game Making\twisted-speed-build-pack`  
**Do not use:** `C:\Users\brand\TwistedSpeed`

## Start play (do this first)

```powershell
cd "C:\Users\brand\1. Game Making\twisted-speed-build-pack\web"
python -m http.server 8765
```

Open **http://127.0.0.1:8765/?v=398** and hard-refresh (`Ctrl+Shift+R`).

Confirm View Source shows every script `?v=398` and `PROGRESS.md` still says **Build: web v398**. If they disagree, you are on the wrong folder or a stale tab.

Same-map START **reuses the world**. After any path/scenery ship, switch Neon ↔ THE REACH once so dress rebuilds.

---

## Director originals — still the real 90% (human play, not agent table)

These were the overnight order. Agents marked them PASS; **director has not signed off**. Treat feel as unsolved until Brandon plays v398.

| # | Item | Agent claim at freeze | Next action |
|---|------|----------------------|-------------|
| 1 | Smooth the elevated road + adjacent dress | Ribbon + curb ribbons + climb damp (v347, v374, v382, v393). Climb second-deriv still ~0.74 | Chase-cam climb: still look like stairs / broken canyon? |
| 2 | See a world beyond darkness + neon strips | Both-flank cards + late peeks (v355, v373, v388–389, v398). Left FOV went black after every FPS cut | Hold W 20s: can you **name** 2+ things past the wall on **both** sides? |
| 3 | First-curve pull | Many keeper/calm passes. Last: lat hang ~6.6 → ~6.2 (v396). Still not zero | Hold W, then W+D, through first right-hander. Yank / lip park? |
| 4 | Second map after Neon ~90% | **THE REACH** exists (coast dusk, water/mesas). v395 45s proof FPS ~43 | Play from map select. Still city-clone? Hop? Black inland? |

**Do not start map 3.** If Neon still fails 1–3, stay on Neon.

---

## In progress when we died (v399 loop — never shipped)

Next ships were going to be:

1. **Climb leftover faceting** after a hard-refresh + one map rebuild  
2. **Neon FPS** if still ~37 (cut far cards/buildings **before** combat)  
3. **Residual first-curve hang** (lat still ~6 under pure-W)  
4. Camera freak / Y pop re-check  
5. Results still empty? (v379 claimed scenic seat + R footer)  
6. Cycle a car that is not Needle (last first-curve sample was Needle)

Resume at **v399** if those still reproduce.

---

## Open friction pile (saw in overnight, not director-closed)

- Neon HIGH FPS soft (~36–38 after card restore). REACH is fine (~43).  
- First-curve **outer-lane hang** under pure-W — reduced, not gone.  
- Black left FOV **regresses** whenever cards get cut for FPS.  
- Same-map `keepWorld` can leave a tab on a **pre-rebuild path** — easy to “play old hills.”  
- Finish ceremony past 0.9 — done once (v350 sting-once); not re-run at v398.  
- Pack first-contact / floor / outer lanes — fightable in agent samples; director never confirmed.  
- Specials all had a range/toast pass (Marrow, Needle not special-last, Vesper, Choir, Razorback, Mausoleum). Prefer **drive/look** leftovers over more range tweaks unless a special misses in play.  
- `Freedom Gate` HUD copy → **Parole Arch** (v384). Comment/doc sweep may still have old name.  
- Gate C still **CLOSED**. No ship claim.

---

## Next-session todo (priority)

### P0 — Director play of v398
- [ ] Neon Circuit, any car: title → garage → START (no freeze)  
- [ ] First right-hander: W-only, then W+steer. Note pull / lip / cam freak  
- [ ] Climb: does the road + canyon look like one surface?  
- [ ] Beyond the wall: city/horizon readable left **and** right?  
- [ ] THE REACH from map select: 30–45s, coast not city, no hop  
- [ ] Write pass/fail on the 8-row Neon 90% table in `PROGRESS.md` from **human** play  

### P1 — Whatever fails P0 (next code ships start at v399)
- [ ] Climb faceting / canyon stairs  
- [ ] First-curve hang / pull (mixed steer, not only W-hold)  
- [ ] Black FOV after FPS cuts — keep both flanks without dropping under ~38 FPS  
- [ ] REACH leftover (inland void, hop, city cards sneaking back)  

### P2 — Loop leftovers (only if P0/P1 are green)
- [ ] Neon FPS toward 40+ without eating horizon  
- [ ] Toast spam if it came back  
- [ ] Finish 0.9 ceremony + results + **R** retry (win and lose)  
- [ ] Engine/nitro audible after first click  
- [ ] Pack fightable 15–45m, not grill, not 500m theater  
- [ ] IP sweep: no Freedom Gate / TM / NFS names in HUD  
- [ ] Quality **O** still hides extras on both maps  

### Do not
- Unity  
- `world.build` on every same-map START  
- Distant camera look-ahead  
- Pocket-spawn / bumper re-drop  
- New PointLights / map 3  
- Launch another overnight 4.5 loop until usage is reset **and** Brandon has played v398  

---

## Locks (never regress)

mph HUD · garage car clear + stats **RIGHT** · camera glue (no `getPointAt(progress+0.05)` look-ahead) · START same-map `clearRace({ keepWorld })` · pack 50–120m **outer** lanes · pack floor not bumper · void = lateral · no teleport · ≤4 PointLights · REACH stays **coast** · Neon both-side early + mid-climb + late peeks · one finishSting · R retry win+lose · Parole Arch · original cast (Marrow, Needle, Mausoleum, Vesper, Choir, Razorback)

---

## Overnight that already shipped (do not redo)

Waves 1–5 + Wave ∞ **v336–v398**. Highlights: ribbon road, THE REACH, first-curve keepers, pack fight distance, named specials, engine audible, elim juice, Parole Arch rename, FPS/FOV tug-of-war.

Plan file: `docs/OVERNIGHT-2026-08-14.md` (historical). This file is the pickup.

*Written 2026-08-15 after overnight 402. Next code bump = v399.*
