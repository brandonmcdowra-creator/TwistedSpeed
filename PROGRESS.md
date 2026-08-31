# Twisted Speed — Progress

**Build:** web **v412** (debug glitch loop — wall clamp · road z-fight · ride height · HUD)  
**Date:** 2026-08-31  
**Serve:** `web/` → hard-refresh `?v=412` — title must say **BUILD 412**  
**Primary runtime:** **web** · Wave ∞  
**Gate C:** CLOSED  

## This block
| Check | Result |
|-------|--------|
| Play | BUILD 412. Debug pass after v411 scenery: cars no longer tunnel canyon glass; road shimmer reduced; ride height raised; FREEDOM HUD cleared top clip. |
| Neon walls | Canyon `openEdge` 4.5/5.4 (was 2.2/3.6). Hard lateral rail after integrate. Void tug earlier (15/12.5). |
| Road | Sheen/paint lifted + polygonOffset — asphalt z-fight shimmer. |
| Ride | Player + rivals `+0.38` above ribbon (was `+0.2`). |
| HUD | FREEDOM at y=42; BUILD 412. |
| REACH | Same drive clamps apply (coast walk band stays thin). |
| Maglev | Unchanged wait/thread gap on Neon ~22–30%. |
| Quality bar | Night city at clip density — not wasteland day. |

## Don’t regress
- keepWorld on same-map START · REACH rebuild on switch  
- Maglev wait/thread · rivals own-pace  
- Ribbon sidewalks · shopfronts face street  
- Lip-only steer · map name chip · Parole Arch · original cast  
- Saves `twisted-speed-v5-night`
- Canyon faces clear of sidewalk band (openEdge ≥ ~4.5)

## Next session
Pickup: **`docs/NEXT-SESSION.md`**

```powershell
cd "C:\Users\brand\1. Game Making\twisted-speed-build-pack\web"
python -m http.server 8765
# http://127.0.0.1:8765/?v=412
```
