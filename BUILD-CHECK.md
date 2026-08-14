# BUILD-CHECK — Twisted Speed Web Night Circuit (2026-08-01 · v136)

## Environment
- Served via `python -m http.server 8765` from `web/`
- Browser: Chrome DevTools MCP
- Cache: `?v=136`

## Gates
| Gate | Result |
|------|--------|
| Boots with zero hard errors | PASS (favicon 404 only) |
| Assets load (GLB 200) | PASS fleet + props |
| Race all 3 maps | PASS sepulcher / throat / freedom |
| Theme identity | PASS industrial path.theme + grade; coastal water; city neon |
| Difficulty values | PASS adventurous rivalSpeed 0.86; brutal 1.02 |
| Garage shop | PASS (v135) |
| 60fps target | ~ok (dpr cap 1.0) |

## Map smoke (v136)
| Map | theme | Notes |
|-----|-------|-------|
| sepulcher | city | Magenta/cyan sky + monoliths + wet road |
| throat | industrial | Sodium grade, cranes, cooling towers, underpasses |
| freedom | coastal | Water plane, lighthouse, cool grade |

Hard-refresh: `http://127.0.0.1:8765/?v=136`
