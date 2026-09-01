# Twisted Speed — Progress

**Build:** web **v438** (P1.3 salvage rig — wreck feeds next night)  
**Serve:** `cd web && python3 serve.py` → `http://127.0.0.1:8765/?v=438`  
**Gauntlet:** COMPLETE (Heat R12 · TM R17) — visual/combat baseline  
**SoT:** one build · follow `docs/AAA-ROADMAP.md` for next work  

## This block (v438)
| Check | Result |
|-------|--------|
| P1.3 Salvage rig | Wreck class → results offer (key 4) → armed meta → bolt at next race start |
| Parts | Injector (needle/vesper), Hot Feed (marrow/razorback), Tomb Plate (mausoleum/choir) |
| Locks | Maglev · warden_lane · specials damage/timing · saveKey unchanged |
| Saves | `twisted-speed-v5-night` — `meta.salvage` added; older saves load |

## Don't regress
- Gauntlet VFX · maglev wait/gap logic · rivals own-pace  
- Soft hazards only (no hard ribbon walls)  
- Lip-only steer · original cast · saves `twisted-speed-v5-night`
- Shield at 0 is real (dim bar when maxShield > 0)
- Toast substrings: BONE HARVEST, THREAD THE VEIN, VEIN MISS, BLACKOUT KISS, REAR VEIN

## Next (from roadmap)
**P2.1** Warden / parole toast script arc across one 8–10 min Neon run.

## Run
```bash
cd web && python3 serve.py
# http://127.0.0.1:8765/?v=438  → BUILD 438
```
