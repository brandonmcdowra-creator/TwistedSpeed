# Twisted Speed — AAA roadmap (autonomous)

**SoT:** one web build on `main` lineage. Primary runtime: **web**.  
**North star:** Drive like Heat · Kill like Black · Finish like a prison break.  
**Rule:** Track is the warden — hazards punish, don’t brick. One living map first (Neon).

Agents: when the director says “keep going,” pick the **top unchecked** item below.  
Mark items done in this file + `PROGRESS.md` when shipped. Do not invent parallel branches of the game.

---

## Now (P0) — Living Neon as warden

- [x] **P0.1** Maglev junction dress pass — prison freight yard identity (signage, chevrons, container codes, gantry sync). Logic wait/gap unchanged.
- [x] **P0.2** Neon living hazard: **Warden Lane Sweep** (~40–55% progress) — telegraph + soft punish, center line stays open half the cycle.
- [x] **P0.3** Playtest Neon maglev + sweep; confirm REACH unchanged; bump BUILD.
- [x] **P0.4** Maglev junction *audio* sting (approach / gap / hit) — WebAudio synth, no new assets.

## Next (P1) — Combat rhythm (after Neon feels alive)

- [x] **P1.1** Shield energy before HP (readable bar + absorb FX) — absorb/break sting + HUD pulse (v436).
- [x] **P1.2** Signature special readability pass (wind-up, impact, cooldown HUD) for 2–3 roster cars.
- [x] **P1.3** Wreck → scrap loop that changes the *next* night (one meaningful upgrade beat).
- [x] **P1.4** Scrap Line — wreckable shoulder freight toward Turbo Sloths Mad Max density (MeshBasic + InstancedMesh; soft punish).
- [x] **P1.4b** Wreck Wake (v442) — non-hit dress clutter + knocked props + debris/dust smash juice (hazard count frozen).
- [x] **P1.4c** Turbo Sloths felt-gap loop (v446–v457) — deck dress, soft dust, streaks, hulks, fire barrels, cables, taillight/exhaust life. See `docs/HANDOFF-GROK.md`.

## Then (P2) — Diegetic story

- [x] **P2.1** Warden / parole toast script arc across one 8–10 min Neon run (no cutscenes). *(thin Neon broadcast — v439)*
- [x] **P2.2** Map fiction chips (Sepulcher districts, freight codes) tied to landmarks. *(HUD placards — v440)*
- [ ] **P2.3** Finish ceremony polish (Parole Arch) as story punctuation.

## Later (P3) — REACH as contrast + presentation

- [ ] **P3.1** REACH atmosphere pass (coast contrast only — don’t clone Neon density).
- [ ] **P3.2** Audio bed / combat mix pass.
- [ ] **P3.3** Performance budget (draw calls / GC) under combat on mid hardware.

## Done lately

- [x] Gauntlet Heat chase + TM combat stills (v432)
- [x] Single-build consolidation on main (v432 SoT)
- [x] Cleanup / debug / efficiency (v433)

---

## Session checklist

1. Read `PROGRESS.md` + this file.  
2. Work **one** P0/P1 item to a playable BUILD bump.  
3. Playtest the touched map(s).  
4. Update this checklist + `CHANGELOG.md` + `docs/NEXT-SESSION.md`.  
5. PR; do not open a second “version” of the game.
