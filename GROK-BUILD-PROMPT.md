# Grok Build prompt — Twisted Speed v399+ friction pass

Copy everything below the line into Grok Build with this repo folder open.
(Rewritten 2026-08-22 for the v399 sync; the earlier v253-era prompt is obsolete.)

---

You are working on **Twisted Speed**, a cyberpunk / Mad Max combat racer (web, three.js), frozen at **web v399** after an overnight loop died mid-flight. Before writing any code, read these files in order — they are the source of truth, not this prompt:

1. `docs/NEXT-SESSION.md` — **the pickup list. This session executes that file.**
2. `AGENTS.md` — working rules (honest testing, small steps, don't wipe saves)
3. `.grok/skills/twisted-speed/SKILL.md` — product locks
4. `PROGRESS.md` + top of `CHANGELOG.md` — what shipped through v398/v399
5. Code as needed: `web/js/game.js` (drive/race), `web/js/world.js` (road/canyon/cards), `web/js/specials.js`, `web/js/quality.js`, `web/js/hud.js`

## What is already done — do NOT redo

Waves 1–5 + Wave ∞ (v336–v398) shipped: signature specials with telegraphs (`specials.js`), Razorback playable (6-rig cast), second map **THE REACH** (coast dusk), quality toggle (**O**), night mutators, rival AI (`ai.js`), mph HUD, Parole Arch rename, elim juice, engine audio. Specials had a full range/toast pass — **no more special tweaks unless one visibly misses in play.**

## The situation

Agents marked the overnight items PASS, but the **director has not played v398** — treat feel as unsolved. Your job is the v399 loop that never shipped, plus the open friction pile. Work at **v400+** (bump `?v=` in `web/index.html` per ship; title stamp must match).

## Fresh playtest findings (agent-played, 2026-08-22, build 399 — verified, not guesses)

An agent played v399 in a real browser (garage → Neon race → death → results → R retry → map select → THE REACH). These reproduce and should be folded into the priorities below:

1. **BUG — THE REACH does not load.** Map select lists both maps correctly and THE REACH highlights (red border, "Coastal dusk" description), but starting the race spawns the purple neon canyon: no water plane, no dusk sky, no coast. Code has a real coast theme (`world.js` `theme === 'coast'` → `buildPathCoast()`, water, mesas), so trace why the selected mapDef isn't reaching `world.build` — likely map-select index/state or a keepWorld path. **This is now the top P1 item.**
2. **BUG — no on-screen map identity.** Nothing in the HUD names the current map ("REACH FINISH" is the generic goal text). Combined with (1), a player cannot tell which map they're on. Add the map name to the race-start banner or HUD strip.
3. **Ground hop reproduced** — one fall-through/hover moment ~10 s into a run (known friction pile item; now agent-confirmed on a fresh serve).
4. **MG is visually mute.** Tracers exist in code (`game.js` `_combatPool`, 0.05-radius, ~0.08 s life) but were invisible in play across repeated bursts — no muzzle flash, no readable line, no impact spark. Player only knows the MG worked from damage numbers. Thicken/lengthen tracers, add a 1-frame muzzle sprite and small hit spark within the perf contract (MeshBasic, no new lights).
5. **Damage source unreadable.** Armor drops 20–30 in a beat with no cue of what hit you (rocket? MG? ram?). Add a directional hit indicator (screen-edge wedge toward attacker) or brief tint + "UNDER FIRE".
6. **Toast copy misreads.** `BONE HARVEST · MAUSOLEUM` (aim-target name appended) reads as wrong-car attribution. Change to an arrow/lock form, e.g. `BONE HARVEST → MAUSOLEUM`.
7. **Combat durability feels suicidal.** ~120 armor evaporates in seconds of return fire, discouraging the drive-and-destroy fantasy. Prefer readable counterplay (armor pickups on-track / clearer incoming-fire cues) over flat HP inflation, and treat as a feel item for director sign-off.

What genuinely works (don't break it): 2–3 s load, instant R retry, 6 distinct rigs with readable stats, rival health bars, distinct special visuals (bone fan vs caltrop cloud), meaty results screen with progression that persists across reloads, quality toggle O visibly working.

## Priority order (verify each item reproduces before fixing it)

### P0 — Reproduce first (agent playtest of v399)
Serve `web/` (`python -m http.server 8765` or `web/serve.py`), open `http://127.0.0.1:8765/?v=399`, hard-refresh, confirm the title says **BUILD 399**. Then check, in chase cam, and record honest pass/fail with numbers/screenshots before touching code:
1. **First right-hander, pure-W then W+D** — outer-lane hang: lateral offset was still ~6.2 peak at v396. Sample a car that is NOT Needle.
2. **The climb** — does road + canyon read as one surface, or stairs/faceting? (climb second-derivative was ~0.74)
3. **World beyond the wall** — holding W for 20 s, can you name 2+ things past the wall on BOTH sides? Left FOV has regressed to black after every FPS cut.
4. **Neon FPS** — HIGH was soft (~36–38). THE REACH was fine (~43).
5. **THE REACH from map select** — 30–45 s: coast not city-clone, no hop, no black inland.
6. **Results/finish** — past 0.9: ceremony, results screen populated, **R** retry works on both win and lose.

### P1 — Fix what reproduced, one ship per item
- **THE REACH not loading** (playtest finding #1) — fix map selection → world build, and add the map name to the HUD/start banner so map identity is verifiable in one glance.
- **First-curve hang**: get lateral hang toward 0 under mixed steer without adding center-pull yank elsewhere.
- **Climb faceting**: smooth the elevated ribbon + adjacent canyon dress so it reads as one surface in chase cam.
- **Black FOV vs FPS**: this is a tug-of-war — keep both flanks readable (early, mid-climb, late peeks at 0.58/0.70/0.82) **without** dropping Neon under ~38 FPS. If you must cut, cut far cards/buildings before combat, and re-verify flanks after every cut.
- **REACH leftovers**: inland void, hop, or city cards sneaking back in.

### P2 — Only if P0/P1 are green
- Neon FPS toward 40+ without eating the horizon
- Toast spam if it returned (scrap rate-limit 1.35 s, rival special gate 2.4 s were the v397 numbers)
- Engine/nitro audible after first click
- Pack fightable at 15–45 m — not on your grill, not 500 m theater
- IP sweep: no "Freedom Gate" / TM / NFS names left in HUD or docs
- Quality **O** still hides extras on both maps

## Hard "do not" list (from the pickup doc — violating these fails the session)

- **No Unity.** Web three.js only.
- **No `world.build` on every same-map START** — same-map START must reuse the world (`clearRace({ keepWorld })`). After any path/scenery ship, switch Neon ↔ REACH once so dress rebuilds — otherwise you're playing old hills.
- **No distant camera look-ahead** (no `getPointAt(progress+0.05)` style glue changes).
- **No pocket-spawn / bumper re-drop. No new PointLights (≤4 world). No map 3.**

## Locks (never regress)

mph HUD · garage car clear + stats RIGHT · camera glue · START same-map keepWorld · pack 50–120 m outer lanes · pack floor not bumper · void = lateral, no teleport · REACH stays coast · Neon both-side early + mid-climb + late peeks · one finishSting · R retry win+lose · Parole Arch · original cast (Marrow, Needle, Mausoleum, Vesper, Choir, Razorback) · saves under `twisted-speed-v5-night` must keep loading (migrate, never wipe).

## Honesty + wrap-up

- Every claim is "I ran it and saw X" (with the FPS/lat numbers or a screenshot) or "changed, not yet verified — check by doing Y". Agent PASS ≠ director sign-off; flag every feel item for Brandon's own play of the final build.
- End of session: update `CHANGELOG.md` (per version shipped) and `PROGRESS.md` (build number, pass/fail table, next pickup), and refresh `docs/NEXT-SESSION.md` so the next session starts clean.
- **Gate C stays CLOSED** — no ship claims.

## Definition of done

A fresh serve of the final build: first curve holds line under pure-W in a non-Needle car, the climb reads as one surface, both flanks stay readable end-to-end at ≥38 FPS on Neon HIGH, THE REACH plays as coast with no hop, finish → populated results → R retry works both ways — each backed by an in-session run, with the honest leftovers written into `docs/NEXT-SESSION.md` for the director's play.
