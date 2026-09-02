# Twisted Speed — Progress

**Build:** web **v445** (Wreck Wake + night-readable Scrap Line silhouettes)  
**Serve:** `cd web && python3 serve.py` → `http://127.0.0.1:8765/?v=445`  
**Quality bar:** Turbo Sloths Mad Max density (felt), not UE5 photoreal.

## This block (v442–v445)
| Check | Result |
|-------|--------|
| Dress | ≤900 · lat 0.92–1.87× · brighter/larger night silhouettes · no collide |
| Knocked props | tumble → flattened wreck |
| Debris wake | chunks + dust + smashKick |
| Hazard freeze | clearFrac 0.44 · max 400 · maglev/warden/save untouched |

## Next
**P2.3** Parole Arch ceremony — or thruster/exhaust readability if still chasing Turbo Sloths.

## Cloud env
`.cursor/environment.json` `start` auto-runs `python3 web/serve.py` (port 8765) on Cloud Agents — no install step (three.js is vendored).

## Run
```bash
cd web && python3 serve.py
# http://127.0.0.1:8765/?v=445
```
