# Handoff — Twisted Speed quality loop (for Grok 4.6 or any next agent)

**Updated:** 2026-09-02 (session start)  
**Branch:** `cursor/living-warden-neon-b53d` · **PR:** https://github.com/brandonmcdowra-creator/TwistedSpeed/pull/7 (base `main`)  
**Canonical build:** web **v445** — title/boot/HUD all say BUILD 445. One SoT; do not fork a second version.  
**Run:** `cd web && python3 serve.py` → `http://127.0.0.1:8765/?v=445` (`&shot=1` auto-starts a Neon race for testing)

## End goal (director)
Get gameplay / environment / props toward **Turbo Sloths** (UE5 Mad Max combat-racer):
https://x.com/80Level/status/1551892588650643458 — packed wasteland shoulders, smashable junk,
dust + debris wakes, thruster heat, readable track. Honest ceiling: three.js MeshBasic + InstancedMesh,
so we close the *felt* gap (density, reaction, motion), not photoreal.

## Locks (never regress)
- Maglev wait/gap timing (`web/js/maglev.js`) · Warden Lane Sweep (`warden_lane.js`)
- Soft hazards only — speed floor, never brick Needle
- Scrap Line centre clear `clearFrac 0.44`, collidable cap 400 (visual density goes in non-hit dress)
- Save key `twisted-speed-v5-night` · original cast · toast substrings (BONE HARVEST, THREAD THE VEIN, VEIN MISS, BLACKOUT KISS, REAR VEIN)
- District index `0` is real · shield at 0 is real
- Model workflow: plan with Other Models (Opus/Sonnet high, GPT xhigh); implement with Cursor Models unless blocked

## Key files
| File | Role |
|------|------|
| `web/js/scrapline.js` | Shoulder freight (collidable) + dress (non-hit) + knocked props + LOD |
| `web/js/debris.js` | Ballistic chunks (96) + dust wake (64) InstancedMesh |
| `web/js/config.js` | `scrapLine`, `debris` blocks |
| `web/js/game.js` | spawn (~1471), clear (~1313), race tick (~3963), motion blur (~6289) |
| `web/js/world.js` | Road, buildings, lamps, billboards |
| `web/js/particles.js` | sparks/smoke/rain |
| `web/js/postfx.js` | grade, bloom, motion blur |

## Shipped this arc
v441 Scrap Line · v442 Wreck Wake · v443 lip · v444 night silhouettes · v445 LOD fix (track ≈45m per 0.01 t; old 165m LOD zeroed everything)

## Session log (append as you go)
- [ ] (in progress) review + improvement loop — see "Done / Not done" below

## Done this session
(none yet)

## Not done / next for Grok
(to be filled — see bottom of file as session proceeds)
