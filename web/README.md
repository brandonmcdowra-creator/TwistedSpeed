# Twisted Speed — Night Circuit (browser)

Combat racing in Three.js: wet neon city, armed cars, scrap upgrades, tournament nights.

All source and assets for this web build live under this folder. Nothing else is required to play.

---

## How to play (no AI required)

### 1. Open a terminal in this folder

```powershell
cd "C:\Users\brand\1. Game Making\twisted-speed-build-pack\web"
```

### 2. Start a local web server

**Python (recommended):**

```powershell
python -m http.server 8765
```

Leave that window open while you play.

### 3. Open the game in a browser

Go to:

**http://127.0.0.1:8765/**

Use Chrome or Edge for best WebGL performance.

### Stop the server

In the terminal: `Ctrl+C`

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

---

## Project layout

| Path | Role |
|------|------|
| `index.html` | Entry shell |
| `js/game.js` | Main loop, race, combat, garage |
| `js/world.js` | City / track |
| `js/vehicles.js` | Cars (GLB + multiparts) |
| `js/materials.js` / `postfx.js` / `particles.js` | Look + VFX |
| `assets/models/*.glb` | Cars, weapons, city props |
| `vendor/three.min.js` | Three.js (local, no CDN) |
| `shots/` | Dev screenshots |
| `JUDGE-REPORT.md` / `BUILD-CHECK.md` | Visual status notes |

---

## Notes

- Prefer **http://** via the server above. Opening `index.html` as `file://` may block GLB loads; procedural cars still work as fallback.
- Progress saves in **localStorage** key `twisted-speed-v4-night`. In garage, **R** wipes save.
- Visual target (AAA photoreal bar) is still in progress; the game is fully playable as a night combat racer prototype.
