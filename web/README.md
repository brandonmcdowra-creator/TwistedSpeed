# Twisted Speed — Night Circuit (browser)

Playable three.js combat-racer. **Everything you need to play is in this folder.**

## Quick start

### Windows
From the **repo root**, double-click **`PLAY.bat`**  
(or run it from a terminal).

### Any OS (terminal)

```bash
cd web
python -m http.server 8765
```

Then open **http://127.0.0.1:8765/** in Chrome or Edge.

> Prefer `http://` via a local server. Opening `index.html` as `file://` can block GLB model loads (procedural fallback cars still work).

### Stop the server
`Ctrl+C` in the terminal.

---

## Controls

| Input | Action |
|--------|--------|
| **ENTER / SPACE** | Menus / confirm |
| **← →** or **A D** | Garage car select |
| **↑ ↓** | Map select (where shown) |
| **WASD** | Drive |
| **Shift** | Drift |
| **Space** | Nitro |
| **J** | Machine guns |
| **K** | Rockets |
| **L** | Mines |
| **I** | Special |
| **C** | Camera (chase / hood) |

---

## Loop

1. **Title** → ENTER  
2. **Garage** → pick a car (← →) → ENTER  
3. **Map** → pick circuit → ENTER  
4. **Race** — survive, wreck rivals, grab scrap  
5. **Results** — spend scrap on speed / armor / firepower (1 / 2 / 3) → ENTER for next night  

Goal: clear nights toward freedom (stage ladder in HUD).

Progress saves in **localStorage** key `twisted-speed-v4-night`. In garage, **R** wipes save.

---

## Layout

| Path | Role |
|------|------|
| `index.html` | Entry shell |
| `js/` | Game code |
| `assets/models/*.glb` | Cars + city props |
| `vendor/three.min.js` | Three.js (local, no CDN) |
