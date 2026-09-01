# Twisted Speed — Progress

**Build:** web **v439** (P2.1 thin warden parole broadcast — Neon)  
**Serve:** `cd web && python3 serve.py` → `http://127.0.0.1:8765/?v=439`  
**Gauntlet:** COMPLETE (Heat R12 · TM R17) — visual/combat baseline  
**SoT:** one build · follow `docs/AAA-ROADMAP.md` for next work  

## This block (v439)
| Check | Result |
|-------|--------|
| P2.1 Warden broadcast | 5 progress gates · stage buckets (early/mid/late) · salvage beat swap |
| Scope | Neon/Sepulcher only — REACH/coast skipped; no audio/cutscenes/HUD panels |
| Combat yield | pri-0 toasts wait for wreck/special/hunter + 1.6s post-combat tail |
| Locks | Maglev · warden_lane · specials damage/timing · salvage · saveKey unchanged |

## Don't regress
- Gauntlet VFX · maglev wait/gap logic · rivals own-pace  
- Soft hazards only (no hard ribbon walls)  
- Lip-only steer · original cast · saves `twisted-speed-v5-night`
- Shield at 0 is real (dim bar when maxShield > 0)
- Toast substrings: BONE HARVEST, THREAD THE VEIN, VEIN MISS, BLACKOUT KISS, REAR VEIN
- P1.3 salvage bolt toast queues after map banner (v438)

## Next (from roadmap)
**P2.2** Map fiction chips (Sepulcher districts, freight codes) tied to landmarks.

## Run
```bash
cd web && python3 serve.py
# http://127.0.0.1:8765/?v=439  → BUILD 439
```
