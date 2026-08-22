# Grok Build prompt — Twisted Speed improvement pass

Copy everything below the line into Grok Build with this repo folder open.

---

You are working on **Twisted Speed**, a cyberpunk / Mad Max combat racer (web, three.js). The repo is a FutureIndustries build pack. Before writing any code, read these files in order — they are the source of truth, not this prompt:

1. `AGENTS.md` — working rules (honest testing, small steps, don't wipe saves)
2. `.grok/skills/twisted-speed/SKILL.md` — product locks (pillars, slice scope, non-goals)
3. `PROGRESS.md` + `CHANGELOG.md` — current build is **web v253**; primary runtime is **web** (`web/`), do NOT touch `unity/` this session
4. `web/js/config.js` — cars, combat numbers, difficulty, garage shop
5. `web/js/game.js` — race loop, `fireSpecial()`, rivals, hazards, stage ladder

## Current state (verified against code)

- One map, **Neon Circuit**, point-to-point ~5 km. Stage ladder exists (`stageCount: 13`; rivals/hazards/powerups scale with `stage`).
- **5 playable rigs** (Marrow, Needle, Mausoleum, Vesper, Choir). A sixth model, **Razorback**, is fully wired as a rival (`web/js/game.js` roster, `vehicles.js`, `vehicle_bodies.js`) but is **not in the playable `cfg.cars` roster**. Slice lock says 5–8 cars.
- **Signature specials are the weakest part** (docs call them "parked"). In `fireSpecial()` every special is an instant radius check or a stat tweak with a generic particle puff and a shared flat 8 s cooldown. The #1 pillar is "every rig is a sentence" — right now the specials don't carry that.
- Combat sweet-spot was **v244**; later env passes (v247–v253) were visual/perf only, so don't re-tune base combat numbers without playtesting first.
- Gate C (shippable slice) is closed: the **8–10 minute continuous play** bar is not met, and "elimination rewards gear/stats" is only loosely represented by scrap.

## Your mission, in priority order (P0 first; stop and report between phases)

### P0 — Make the five specials feel signature
Rework each special in `fireSpecial()` (and rival-side reactions) so each has a distinct fantasy, telegraph, and payoff. Keep the existing names and intent:
- **Marrow · Bone Harvest** — rocket fan is okay mechanically; give it distinct bone-styled projectiles, sound, and screen kick so it reads as *his*.
- **Needle · Thread the Vein** — visible harpoon tether line to the target, player gets a slingshot pull toward/past them; currently it's an invisible slow.
- **Mausoleum · Last Rites** — mortar should have a visible arcing shell + ground crack telegraph before the AOE, not an instant hit.
- **Vesper · Blackout Kiss** — EMP should visibly kill rival headlights/neon for the 3 s and add a screen-space pulse ring.
- **Choir · Sermon** — visible expanding sonic ring that physically shoves rivals (it already moves them; make the ring readable at speed).
Per-rig cooldowns (light rigs shorter, tanks longer) instead of the flat `specialCd: 8`. HUD: show the special name + a charge ring so players know what they have. Do **not** nerf/buff base MG/rocket/mine numbers — combat feel is signed at v244.

### P1 — Razorback playable + 8–10 minute ladder
- Add **Razorback** to `cfg.cars` as a sixth playable rig with its own stat sentence, stock loadout, and a new signature special that fits the roster (it's the green raider — something ramming/aggression flavored). Reuse the existing GLB and rival wiring.
- Make the stage ladder deliver the slice: finishing → **NEXT NIGHT** flow (stage++ with a results screen beat), and eliminations grant a **visible reward choice** (small stat/equipment enhance), matching the lock "elim → gear/stats". Target 8–10 minutes of meaningful continuous play across stages.

### P2 — Living track
Neon Circuit hazards exist (spikes/oil/debris/electric, stage-scaled). Add one **active** terrain trap that moves or triggers (e.g., timed steam vents or a collapsing sign) so the track feels like the warden. Hazards punish, never brick: no unavoidable full-width kills.

### P3 — Presentation only if FPS allows
Optional Low/High quality toggle (PROGRESS lists it as wanted). Nothing else — env look is director-signed at v253.

## Hard constraints (violating these fails the session)

- **Perf contract:** MeshBasic scenery + fake neon, ≤4 PointLights in the world, PBR on hero car only. Test that FPS does not regress from v253.
- **Saves:** `saveKey: 'twisted-speed-v5-night'` — existing saves (scrap, `meta.builds`, difficulty, stage) must still load. Migrate, never wipe.
- **IP:** original names/liveries only. No Twisted Metal / NFS names, no Sweet Tooth.
- **One runtime:** web only. Don't create Unity work.
- **Cache:** bump the `?v=` version in `web/index.html` and reference it in your notes.
- **Honesty:** run the game (`cd web && python -m http.server 8765`, open `http://127.0.0.1:8765/?v=NEW`) and confirm each change works before claiming it. Say "I ran it and saw X" or "changed but not yet verified".
- **End of session:** update `CHANGELOG.md` and `PROGRESS.md` (now / next / gate status).

## Definition of done

A cold playtest from the garage: pick any of 6 rigs, each special is visually distinct and readable at speed with its own cooldown, finish a night → advance to the next, get an elim reward beat, survive one active trap, and total meaningful play across the ladder lands in the 8–10 minute window — all at v253-level FPS with old saves intact.
