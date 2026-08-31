# Twisted Speed — Progress

**Build:** web **v418**  
**Serve:** `cd web && python3 serve.py` → `http://127.0.0.1:8765/?v=418`  
**Must say:** BUILD 418 (boot) · title TWISTED SPEED — v418 · URL `?v=418`  
**Do not use** bare `python -m http.server` (allows stale index cache).  

## Gauntlet critics
| R | Heat A/B | Maglev | MG |
|---|----------|--------|-----|
| 0–2 | Heat | FAIL | FAIL |
| 3 | Heat | mirrored | FAIL (stale tab) |
| 4 | Heat | **PASS** | FAIL (stale ?v=411) |
| next | R5 on **v418** no-cache | verify PASS holds | must PASS HUD flash |

Gate C CLOSED.
