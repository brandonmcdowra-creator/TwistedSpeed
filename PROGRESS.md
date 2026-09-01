# Twisted Speed — Progress

**Build:** web **v440** (P2.2 Sepulcher district fiction chips)  
**Serve:** `cd web && python3 serve.py` → `http://127.0.0.1:8765/?v=440`  
**Gauntlet:** COMPLETE (Heat R12 · TM R17) — visual/combat baseline  
**SoT:** one build · follow `docs/AAA-ROADMAP.md` for next work  

## This block (v440)
| Check | Result |
|-------|--------|
| P2.2 District chips | Left-edge placard · 4 districts · freight codes from maglev stencil vocabulary |
| Channel | Own HUD state (`_districtChip`) — never `toast()` |
| Neon only | REACH/coast skipped; defer if warden beat <2.5s ago |
| Locks | Maglev · warden_lane · saveKey · toast substrings unchanged |

## Don’t regress
- Gauntlet VFX · maglev wait/gap · soft hazards · lip-only steer  
- Original cast · saves `twisted-speed-v5-night`  
- Toast substrings: BONE HARVEST, THREAD THE VEIN, VEIN MISS, BLACKOUT KISS, REAR VEIN  
- District index `0` is real (INTAKE ROW) — never falsy-skip  

## Next (from roadmap)
**P1.4 (inserted)** BUILD 441 "SCRAP LINE" — see `docs/BUILD-441-PLAN.md`.
Shoulder freight that breaks · kills stay as hulks · overhead gantries.
Budget lock: ≤ +12 draw calls / ≤ +120k tris over the measured 586 / 64,302 baseline.

**P2.3** Finish ceremony polish (Parole Arch) — still next after 441.

## Run
```bash
cd web && python3 serve.py
# http://127.0.0.1:8765/?v=440  → BUILD 440
```
