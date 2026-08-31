# Twisted Speed — Progress

**Build:** web **v412** (debug glitch loop — wall clamp · road z-fight · ride height · HUD)  
**Date:** 2026-08-31  
**Serve:** `web/` → hard-refresh `?v=412` — title must say **BUILD 412**  
**Primary runtime:** **web** · Wave ∞  
**Gate C:** CLOSED  

## This block
| Check | Result |
|-------|--------|
| Play | BUILD 412. Debug pass after v411: wall rails, road z-fight, ride height, hill Y catch-up, FREEDOM under PLACE. |
| Neon walls | Canyon `openEdge` 4.5/5.4. Hard rail ~12m max lat in verify (was clipping at glass ~16). |
| Road | Sheen/paint lifted + polygonOffset. |
| Ride | `+0.72` ride + fast catch-up when \|gap\| > 1.15m (REACH hills stay ≥ ~0.72). |
| HUD | FREEDOM parole bar at y≈106 under PLACE. BUILD 412. |
| REACH | Wall rail + hill Y fix verified (teleport mid-climb ride ~1.1m clear). |
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
