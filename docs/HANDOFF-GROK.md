# Handoff — Twisted Speed quality loop (for Grok 4.6 or any next agent)

**Updated:** 2026-09-02 (mid-session — see Done list)  
**Branch:** `cursor/living-warden-neon-b53d` · **PR:** https://github.com/brandonmcdowra-creator/TwistedSpeed/pull/7 (base `main`)  
**Canonical build:** web **v448** — title/boot/HUD all say BUILD 448. One SoT; do not fork a second version.  
**Run:** `cd web && python3 serve.py` → `http://127.0.0.1:8765/?v=448` (`&shot=1` auto-starts a Neon race for testing)

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

## Backlog source
`docs/BACKLOG-TURBO.md` — ranked list SL/DB/VX/WD/FX with numbers + verification. Work top-down.

## Done this session (2026-09-02)
- **v446** SL-01/SL-02/SL-04/SL-03: dress confined to lip+deck (0.94–1.32× roadHalf) with per-band `yBase` (curb 0.22 / deck 0.16); shards-only on asphalt; glow discs alternate cyan/amber via instanceColor; LOD restores cached matrices (0 curve evals/tick).
- **v447** DB-01/DB-02/VX-01: upright camera-yaw dust billboards, twin rooster tails (`playerWake 0.055`, cap 96), camera-proximity fade so dust never walls off the hero, chunk ember→cold tint, exhaust cones always lit (amber cruise, cyan nitro), nearest-rival dust.
- **v448** WD-01/WD-02/SL-06/FX-01 + **bug**: dress cap 900 ran dry at t≈0.56 (back half of Neon had zero dress) → cap 1900 (1830 spawned, even histogram). Ground grit canvas tile on void floor; shoulder drift ribbons (`driftL/R`); warden band full dress but flat kinds; smash burstLight + smashKick 0.38 / 0.5s.

## Verification recipe (Playwright `browser_run_code_unsafe`, file must live under `/workspace/.playwright-mcp/`)
- Load `?v=NNN&shot=1&cb=X` (cb busts cache), wait ~3.5s, then `GAME.state._frozen = false`.
- Teleport: set `s.player.progress = t`, `s.player.pos.copy(curve.getPointAt(t))`, yaw from tangent, mesh pos/rot.
- Census scripts: `.playwright-mcp/census.js`, `t447.js`, `t448.js` (not committed).
- Do NOT run a browser test in the same tool batch as file edits — it will load a half-edited file.

## Not done / next for Grok (in priority order)
1. **SL-05 hero hulk silhouettes** — new `hulk` dress kind (box 4.0×2.2×6.5 + slanted plane), ~24 instances at 1.20–1.32× roadHalf on the deck, one draw call. Watch corner-apex occlusion.
2. **VX-02 brake taillight surge** — collect `userData.tails` in `vehicles.js` (procedural + GLB paths), drive emissive 3.5→7 on brake in `game.js`.
3. **FX-02 near-camera speed streaks** — new `streaks.js` (~150 lines) modelled on `particles.js` rain; only if budget allows.
4. Perf pass (P3.3): `collide()` is O(items) per body per frame and evaluates curve twice per hit; items are sorted by `t` so a windowed scan is easy. `hitRadT 0.012` (~54m) is generous — leave unless director asks (hazard lock).
5. Low-quality tier: `debris.setLow` halves puffs; dress LOD drops odd indices. Re-check FPS on real GPU (this VM is software GL, ~220ms/frame — no perf claims possible here).
6. Then roadmap **P2.3 Parole Arch** ceremony polish.
