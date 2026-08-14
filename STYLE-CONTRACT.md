# Style contract — Twisted Speed

Agents: treat this as a hard visual filter. Reject assets that break it.
**Research:** `DESIGN-RESEARCH.md` · **Fiction/roster:** `ASSET-BIBLE.md`

## Locked choices
- **Game title:** Twisted Speed
- **Visual style:** NFS Heat / Unbound **night street** energy × TM Black **scarred combat vehicles** (not pure Tron grid, not photoreal day suburb)
- **Palette:**
  - `#0a0610` / `#0a0614` / `#0c0e14` void night
  - `#1a1522` / `#1c1a22` wet asphalt
  - `#ff2d55` / `#e8455a` neon danger / primary HUD
  - `#00e5ff` / `#4ecdc4` electric / freedom / hostile track
  - `#ff9f1c` / `#f0a500` scrap / reward
  - `#c45c26` / `#b85c38` brawler / Marrow
  - `#39ff14` / `#6bcb77` rival green
  - `#ffe66d` / `#f4d35e` spike warn yellow
  - `#f2e9e4` text
  - Sodium warm `#ffb347` · moonlight cool `#a8b8d8` (NFS night fill)
- **Resolution:** 16:9; dual-ship web + Unity (see BUILD-CONTEXT)
- **Camera:** Hood / Chase / Top-down (NFS multi-cam). Speed FOV ease + impact punch required for “feel of speed”
- **Environment:** Neon Sepulcher curved city → Throat underpass → Freedom Gate. Wet asphalt, billboards, high-rises, taxis as dressing
- **Vehicles:** Glossy night-street paint + original combat weapon props (MG pods, rockets, spikes, mortars). Silhouette must read at 50m
- **Hazards:** Yellow warn → red punish; **never** solid idle walls across the driveline
- **What is forbidden:** cozy pastel, pure Tron grid aesthetic, photoreal day suburban, baked UI text in textures, silent core actions, IP clones (no TM/NFS names, Sweet Tooth, EA liveries, near-trade-dress)

## Pipeline
1. **Design SoT:** `BUILD-CONTEXT.md` + this file + `ASSET-BIBLE.md` + `DESIGN-RESEARCH.md`.
2. **Assets SoT:** Blender → GLB → `assets/models/` → import `web/assets/models/` and Unity `Assets/Art/`.
3. **Runtimes (dual-ship):** `web/` three.js and `unity/TwistedSpeed` URP — both first-class. **One primary runtime per session** (state in `PROGRESS.md`); do not dual-implement the same gameplay feature in both without director order.
4. Process: user skill `game-developer` + project skill `.grok/skills/twisted-speed/`.

## Audio character
- Engine layer scales with speed; tire screech on slick/drift; distorted impacts on ram/weapons.
- Hazard tells: siren/sting on guillotine warn; synth stab on spike deploy.
- Special weapon unique sting per rig. Finish = cyan freedom sting.
- No full orchestra required for slice; loops + one-shots first.
