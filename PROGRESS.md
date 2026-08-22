# Twisted Speed — Progress

**Build:** web **v404** (steer the corners · meatier guns)  
**Date:** 2026-08-22  
**Serve:** `web/` → hard-refresh `?v=404` — title must say **BUILD 404**  
**Primary runtime:** **web** · Wave ∞  
**Gate C:** CLOSED  

## This block (controller-verified in Chrome)
| Check | Result |
|-------|--------|
| v399 P0 | BUILD 399 boots. Keyboard THE REACH **does load coast** (`theme=coast`, water/mesas). HUD had no map name. MG projectiles spawned but chase-cam mute. |
| v400 | HUD chip shows **THE REACH** / **NEON CIRCUIT**. Chase MG: muzzle burst + sparks visible (Choir van still hides thin rods). |
| v401 | Large red hit chevron (right-hit screenshot). Special toast ` → NAME`. Banner no longer hardcodes REACH FINISH. |
| Climb FOV | **v402 PASS vs pink-slab:** chase ~33% both canyon walls have depth. Skyline above lips still sparse/black. |
| First-curve | **v404 PASS:** Marrow Neon hold-W peak `p._lat` **−11.51** (lip). Must steer the first right-hander. |
| Guns | **v404 PASS:** LOCK pip on rival ahead (screenshot). Rocket fireball/trail in chase. |
| REACH load | PASS on keyboard select + R retry keepWorld. |
| Results | REACH finish → populated results → R retry same map. |
| Locks | mph · garage · same-map keepWorld · cast · Parole Arch · no map 3 |

## Don’t regress
- Map name chip · chase MG muzzle · hit chevron HUD-safe frame  
- Neon keepWorld / REACH rebuild on switch · R retry  
- Late peeks 0.58/0.70/0.82 · original cast · Parole Arch  
- First-curve: out-steer still owns lip (`steeringOutFC` weak pull)

## Next session
Pickup: **`docs/NEXT-SESSION.md`**  
Director still needs to play. No ship claim.

```powershell
cd "C:\Users\brand\1. Game Making\twisted-speed-build-pack\web"
python -m http.server 8765
# http://127.0.0.1:8765/?v=404
```
