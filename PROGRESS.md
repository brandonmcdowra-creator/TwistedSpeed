# Twisted Speed — Progress

**Build:** web **v411** (ribbon-aligned scenery · own-pace rivals · maglev gap hold · gentle hills)  
**Date:** 2026-08-22  
**Serve:** `web/` → hard-refresh `?v=411` — title must say **BUILD 411**  
**Primary runtime:** **web** · Wave ∞  
**Gate C:** CLOSED  

## This block
| Check | Result |
|-------|--------|
| Play | BUILD 411. Arcade zip on Desktop (`TwistedSpeed-v411-arcade.zip`, ~43 MB, `index.html` at zip root). |
| REACH | Keyboard select loads coast. HUD names the map. |
| Maglev | v408: wall then held gap on Neon ~22–30%. Greybox. Not on REACH. |
| Hills | v409: ~6 m, ~1.5% grade. First corner + maglev plateau flat. |
| Rivals | v410: no teleport-ahead / pack tug / finish camp. Remount from behind. |
| Scenery | v411: sidewalk ribbons, short canyon segs, shopfronts face the road. |
| Steer | v404: W does **not** drive the racing line (lip assist only). |
| Quality bar | Night city at clip density — not wasteland day. Maglev = living-track train pattern. |

## Don’t regress
- keepWorld on same-map START · REACH rebuild on switch  
- Maglev wait/thread · rivals own-pace  
- Ribbon sidewalks · shopfronts face street  
- Lip-only steer · map name chip · Parole Arch · original cast  
- Saves `twisted-speed-v5-night`

## Next session
Pickup: **`docs/NEXT-SESSION.md`**

```powershell
cd "C:\Users\brand\1. Game Making\twisted-speed-build-pack\web"
python -m http.server 8765
# http://127.0.0.1:8765/?v=411
```
