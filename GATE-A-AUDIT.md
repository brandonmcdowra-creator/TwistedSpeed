# Gate A audit — Twisted Speed

**Date:** 2026-08-07  
**Auditor:** game-developer skill checklist  
**Context:** After BUILD-CONTEXT reconciliation  

Gate A = required before *new* production code without override `send it!`.  
Existing codebase may continue under Gate B/C for polish once A is open.

---

## Verdict: **PASS (Gate A open)** with follow-ups

All Gate A checklist items are now satisfied in pack docs. Two items need **ongoing hygiene** (perf budget written into PROGRESS; Phase 0 plan each non-trivial session).

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Fantasy one-liner agreed | **PASS** | *Drive like Heat · Kill like Black · Finish like a prison break.* — BUILD-CONTEXT, ASSET-BIBLE, DESIGN-RESEARCH, twisted-speed skill |
| 2 | 3–5 pillars written | **PASS** | Six pillars in BUILD-CONTEXT / ASSET-BIBLE / project skill |
| 3 | Non-goals written | **PASS** | BUILD-CONTEXT + twisted-speed skill (sim, pure arena, open-world-first, IP clones, dual-feature thrash) |
| 4 | Core loop verb chain | **PASS** | Garage → drop → drive → fight → survive → resolve (finish/elim) → results → garage |
| 5 | Research / reference note | **PASS** | `DESIGN-RESEARCH.md` + `~/.grok/skills/game-developer/references/research/` |
| 6 | Legal red list (IP) | **PASS** | BUILD-CONTEXT + STYLE-CONTRACT + ASSET-BIBLE creative twist; strict no TM/NFS names/liveries |
| 7 | Platform(s) + rough perf budget | **PASS*** | Dual-ship web+Unity locked; budgets referenced via game-developer `08-performance-budgets.md` (*paste concrete numbers into PROGRESS when profiling — see follow-up) |
| 8 | Vertical slice scope | **PASS** | 8–10 min, 5–8 cars, finish→next level, elim→gear/stats, one map City→Throat→Gate |
| 9 | 60s differentiator stated | **PASS** | BUILD-CONTEXT: neon city race + killing track/rivals + special as character |
| 10 | Phase 0 plan for non-trivial work | **PROCESS** | Not a one-time doc — **required each session** before large features (game-developer protocol) |

\*Perf: heuristic budgets exist in the skill; project-specific measured baselines are a **Gate B** concern. Gate A only needs platform + rough budget chosen — done.

---

## What was broken before this session

| Stale (old BUILD-CONTEXT) | Locked truth |
|---------------------------|--------------|
| 2D top-down pixel racer | 3D arcade combat-racer |
| Cyber-Mex desert 32-screen | Neon Sepulcher → Throat → Freedom Gate |
| 15–30 min / 1 brawler V1 | 8–10 min / 5–8 cars |
| Pixel 32×32 art list | GLB vehicles + modular city |
| “Not a clone” empty | Creative twist table filled |
| Deployment TBD | Dual-ship web + Unity, shared GLB SoT |
| STYLE said web legacy only | Dual-ship; one primary per session |

**Root cause:** FI export froze early ideation; research + Unity/web build moved on without reconciling BUILD-CONTEXT (fi-game-build still reads it first).

---

## Consistency check across docs

| Doc | Aligned after reconcile? |
|-----|---------------------------|
| BUILD-CONTEXT.md | **Yes** (rewritten) |
| STYLE-CONTRACT.md | **Yes** (pipeline dual-ship update) |
| ASSET-BIBLE.md | Yes — roster/pillars already correct |
| DESIGN-RESEARCH.md | Yes — fantasy/combat stack correct; win condition now explicit finish+elim rewards in BUILD-CONTEXT |
| twisted-speed skill | Yes |
| PROGRESS.md | Partially — still web-v138 focused; should note Gate A pass + primary runtime |
| ai_manifest.json | Likely stale — optional refresh later |
| Pixel prompts in assets/prompts | Legacy FI — do not treat as current art contract |

---

## Gate B / C preview (not required for A)

| Gate | Likely status | Notes |
|------|---------------|-------|
| **B** art polish | **At risk / partial** | Much art already exists; greybox *fun* + specials completeness + cold play not formally signed |
| **C** shippable slice | **Not open** | Critic ~4.2/10 vs Heat; facing regressions; 8–10 min ladder/elim rewards may be incomplete |

Do **not** call the slice shippable. Prefer vertical P0 specials + race feel over more env glam until Gate B checklist is honest-pass.

---

## Follow-ups (do next, in order)

1. **PROGRESS.md** — record Gate A PASS, dual-ship SoT, current primary runtime choice for next session.  
2. **Phase 0 plan** — before next feature block, one short plan (P0 specials vs facing audit vs Unity) for director OK.  
3. **DESIGN-RESEARCH win row** — optional one-line update: finish advances level; elim rewards gear (matches director).  
4. **ai_manifest.json** — refresh uniqueness_answers / loop flags when convenient.  
5. **Gate B audit** — separate session after silent 8–10 min play on primary runtime.

---

## Gate A checklist (copy)

- [x] Fantasy one-liner agreed  
- [x] 3–5 pillars written  
- [x] Non-goals written  
- [x] Core loop verb chain  
- [x] Research / reference note exists  
- [x] Legal red list (IP)  
- [x] Platform(s) + rough perf budget  
- [x] Vertical slice scope locked  
- [x] 60s differentiator stated  
- [x] Phase 0 plan process understood (per non-trivial session)  

**Gate A: OPEN.** Production code may proceed under game-developer session protocol without `send it!` for Gate A. Gate B still blocks pure art-glam if loop fun unproven — use checklist, not vibes.
