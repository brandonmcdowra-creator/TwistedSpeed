---
name: twisted-speed
description: >
  Project locks for Twisted Speed (combat-racer hybrid). Use when working in the
  twisted-speed-build-pack repo, or when the user mentions Twisted Speed, Marrow,
  Needle, Night Circuit, or Map1 vertical slice. Load after game-developer;
  product facts here override generic defaults; process/gates stay with
  game-developer. Hands off to fi-game-build / fi-graphics / fi-audio / fi-playtest.
---

# Twisted Speed — project skill

## Relationship
1. **game-developer** (user skill) — phases, gates, override `send it!`, tools.  
2. **This file** — product locks.  
3. **Domain** — `game-developer/references/domains/combat-racer.md`.  
4. **FI craft** — `fi-game-build`, `fi-graphics`, `fi-audio`, `fi-playtest` after gates.  

## Fantasy
Drive like Heat · Kill like Black · Finish like a prison break.  
**Original cast, names, and liveries only** — homage patterns, never TM/NFS IP.

## Pillars (locked)
1. Every rig is a sentence (silhouette + stats + signature special).  
2. Track is the warden; hazards punish, don’t brick.  
3. Speed is armor and sin.  
4. Neon over rust.  
5. One shared kit + one signature special.  

## Non-goals
- Sim racing depth  
- Pure arena with no race fantasy  
- Open-world sprawl before one map sings  
- IP clones (no Sweet Tooth, EA liveries, TM/NFS names)  

## Slice scope (director 2026-08-07)
| Item | Lock |
|------|------|
| Play time | **8–10 minutes** meaningful continuous play |
| Cars | **5–8** (shared kit + unique special each) |
| Finish | Advances to **next level** / stage |
| Elimination | Still rewards — chance to **enhance stats/equipment** |
| Map | One excellent living track first (Neon Sepulcher / Map1 lineage) |

## Combat stack
Infinite weak MG (overheat) → limited heavies (rockets/mines/…) → per-rig recharge special.  
Shield energy before Health HP when implemented.  
Close-range tools preferred over pure projectile spam.

## Engines / SoT
| Layer | Location |
|-------|----------|
| Design research | `DESIGN-RESEARCH.md` |
| Style | `STYLE-CONTRACT.md` |
| Roster / fiction | `ASSET-BIBLE.md` |
| Shared models | `assets/models/` → `web/assets/models/` + Unity `Assets/Art/` |
| Web runtime | `web/` (three.js) |
| Unity runtime | `unity/TwistedSpeed/` |
| Free tools | `tools/FREE-TOOLS.md` |
| Progress | `PROGRESS.md`, `CHANGELOG.md` |

**Dual-ship:** shared GLB + data are SoT. **One primary runtime per session**
(state in PROGRESS). Do not dual-implement the same feature in Unity and web
without director order. See game-developer `15-source-of-truth-dual-ship.md`.

## Build priority
P0 combat identity/specials → P1 race feel → P2 living track → P3 presentation.

## Doc drift
**Reconciled 2026-08-07:** `BUILD-CONTEXT.md` matches this skill + STYLE-CONTRACT +
DESIGN-RESEARCH. If they diverge again, stop and reconcile (or `send it!`).
Gate A status: `GATE-A-AUDIT.md`.

## Session reminder
Gate A/B/C from game-developer. Override phrase: **`send it!`**
State **primary runtime** (web | Unity) in PROGRESS at session start.  
**Pickup:** `docs/NEXT-SESSION.md` — frozen **web v411** (2026-08-22). Quality bar = clip-level night city (not desert). Maglev = wait/thread gap. Dress that junction next. No Unity.

