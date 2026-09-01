# Twisted Speed — Progress

**Build:** web **v437** (P1.2 special readability — Marrow / Needle / Vesper)  
**Serve:** `cd web && python3 serve.py` → `http://127.0.0.1:8765/?v=437`  
**Gauntlet:** COMPLETE (Heat R12 · TM R17) — visual/combat baseline  
**SoT:** one build · follow `docs/AAA-ROADMAP.md` for next work  

## This block (v437)
| Check | Result |
|-------|--------|
| P1.2 Special readability | Charge rings, target marks, needle miss stub, HUD charging/cooldown bars |
| Cars touched | Marrow, Needle, Vesper only |
| Locks | Windup/CD/damage/range unchanged · Mausoleum/Choir/Razorback untouched |
| Saves | `twisted-speed-v5-night` unchanged |

## Don't regress
- Gauntlet VFX · maglev wait/gap logic · rivals own-pace  
- Soft hazards only (no hard ribbon walls)  
- Lip-only steer · original cast · saves `twisted-speed-v5-night`
- Shield at 0 is real (dim bar when maxShield > 0)
- Toast substrings: BONE HARVEST, THREAD THE VEIN, VEIN MISS, BLACKOUT KISS, REAR VEIN

## Next (from roadmap)
**P1.3** Wreck → scrap loop that changes the *next* night (one meaningful upgrade beat).

## Run
```bash
cd web && python3 serve.py
# http://127.0.0.1:8765/?v=437  → BUILD 437
```
