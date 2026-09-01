# Twisted Speed — Progress

**Build:** web **v433** (cleanup · debug · efficiency on gauntlet v432)  
**Serve:** `cd web && python3 serve.py` → `http://127.0.0.1:8765/?v=433`  
**Gauntlet:** COMPLETE (Heat R12 · TM R17) — still the visual/combat baseline  
**SoT:** **one build** on `main` lineage — no parallel v412 tree  

## This block (v433)
| Check | Result |
|-------|--------|
| Cleanup | Removed unused `city.js`, `night_circuit.js`, `engine.js`, `engine2d.js`, `shaders.js`, syntax-check stubs |
| Debug | Canyon `openEdge` 4.5/5.4, hard lateral rail, ride `+0.72`, hill Y catch-up, FREEDOM under PLACE |
| Efficiency | Shared particle mats (less GC), canvas tex without mipmaps (texSubImage noise), cached cloud mid, tighter LOD bands |
| Logs | World/preload `console` gated behind `?debug=1`; favicon 404 silenced |

## Don’t regress
- Gauntlet VFX (killNova soot, chase asphalt)  
- Maglev wait/thread · rivals own-pace  
- Lip-only steer · map name chip · original cast  
- Saves `twisted-speed-v5-night`

## Run
```bash
cd web && python3 serve.py
# http://127.0.0.1:8765/?v=433  → title BUILD 433
```
