# Twisted Speed

**Arcade combat-racer** — night-street speed with vehicular combat.  
Original cast and liveries only (homage patterns; not a TM/NFS clone).

> *Drive like Heat · Kill like Black · Finish like a prison break.*

| | |
|---|---|
| **Play** | Browser (three.js) — no install beyond a local web server |
| **Genre** | 3D arcade combat-racer |
| **Build** | Night Circuit prototype (playable vertical slice) |

---

## Play in 60 seconds

### 1. Get the game
- **Code → Download ZIP**, then unzip  
  **or** `git clone https://github.com/brandonmcdowra-creator/TwistedSpeed.git`

### 2. Start it

**Windows:** double-click **`PLAY.bat`** in the repo root.

**Mac / Linux:**

```bash
chmod +x PLAY.sh
./PLAY.sh
```

**Any OS (manual):**

```bash
cd web
python -m http.server 8765
```

### 3. Open the browser
Go to **http://127.0.0.1:8765/**

Use **Chrome** or **Edge** for best WebGL performance.

> You need a local HTTP server so car models (`.glb`) load. Opening `web/index.html` as a `file://` page may fall back to simpler procedural cars.

### Requirements
- A modern browser with WebGL  
- **Python 3** (for the one-line server) — or any static server (`npx serve`, etc.)

---

## Controls

| Input | Action |
|--------|--------|
| **ENTER / SPACE** | Menus / confirm |
| **← →** or **A D** | Garage car select |
| **WASD** | Drive |
| **Shift** | Drift |
| **Space** | Nitro |
| **J / K / L** | MG / Rockets / Mines |
| **I** | Special |
| **C** | Camera |

**Loop:** Title → Garage → Map → Race → Results (spend scrap) → next night.

---

## What’s in this repo

| Path | What |
|------|------|
| **`web/`** | **Playable game** — open this (via local server) |
| `PLAY.bat` / `PLAY.sh` | One-click local server + browser |
| `BUILD-CONTEXT.md`, `ASSET-BIBLE.md`, … | Design docs |
| `docs/` | Map notes, credits, vehicle standard |
| `.grok/skills/twisted-speed/` | AI agent project locks |

Dev screenshots and Unity editor cache are **not** included (keeps the download under ~100 MB).

---

## Design pillars (locked)

1. Every rig is a sentence — silhouette + stats + signature special  
2. The track is the warden — hazards punish, don’t brick  
3. Speed is armor and sin  
4. Neon over rust  
5. One shared kit + one signature special  

Full contract: [BUILD-CONTEXT.md](BUILD-CONTEXT.md) · [STYLE-CONTRACT.md](STYLE-CONTRACT.md) · [ASSET-BIBLE.md](ASSET-BIBLE.md)

---

## Docs for collaborators / AI

| Doc | Why |
|-----|-----|
| [START-HERE.txt](START-HERE.txt) / [llms.txt](llms.txt) | Agent onboarding |
| [PROGRESS.md](PROGRESS.md) | Current version + handoff |
| [CHANGELOG.md](CHANGELOG.md) | Session history |
| [docs/CREDITS-MODELS.md](docs/CREDITS-MODELS.md) | Model credits |

---

## License / IP

Original fiction and roster. Free asset credits in [docs/CREDITS-MODELS.md](docs/CREDITS-MODELS.md). Do not ship third-party IP names, characters, or liveries.
