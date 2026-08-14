# Marrow Visual Standard (locked)

**Status:** Free-pipeline hero baseline for Twisted Speed.  
**Date locked:** 2026-07-31 · asset ver `muscle106`  
**Shape:** '60s/'70s muscle coupe — curved hard-side loft (long hood, short deck, coke-bottle haunch). Not polar blob, not pure brick.

All other cars and still-read QA should be judged **against this Marrow**, not against NFS Heat/Unbound photoreal.

---

## What “standard” means

| Layer | Locked choice |
|--------|----------------|
| Mesh path | Blender **hard multiparts** (beveled volumes + bone kit) → GLB |
| Runtime load | `web/assets/models/marrow.glb` (default; `?proc=1` = multiparts fallback) |
| Theme | Bone Brawler — copper/blood paint `0xc45c26`, bone kit, dual rockets, roof MG |
| Env (Blender) | Poly Haven **dikhololo_night** 2k HDRI + soft studio keys |
| Env (game, paint IBL) | Synthetic night env + **controlled** microflake (not disco glitter) |
| Paint read | Copper clearcoat; warm flake; desaturated city reflections |

This is the **best free multiparts ceiling** we accept as the working bar. It is **not** NFS mesh parity.

---

## Canonical files

| File | Role |
|------|------|
| `tools/build_marrow_hero.py` | Rebuild script (Blender 5.x) |
| `assets/models/marrow_hero.blend` | Source scene (HDRI + studio + mesh) |
| `web/assets/models/marrow.glb` | Runtime hero (~670 KB, ~195 meshes, ~10k faces) |
| `assets/models/marrow.glb` | Mirror export |
| `web/assets/env/dikhololo_night_2k.hdr` | Poly Haven 2k night world |
| `web/assets/env/night_city.hdr` | 1k fallback |
| `web/js/glb.js` → `GLB_ASSET_VER` | Cache bust (`muscle106`) |

### Reference stills (judge against these)

| Still | Path |
|-------|------|
| 3/4 rear hero | `web/shots/marrow_STANDARD_34rear.png` |
| 3/4 front | `web/shots/marrow_STANDARD_34front.png` |
| Side profile | `web/shots/marrow_STANDARD_side.png` |
| Continuity hero | `web/shots/marrow_blender_hero.png` |

---

## Rebuild (lock-in recipe)

```bat
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python tools\build_marrow_hero.py
```

Or live via **Blender MCP** (GUI open, Poly Haven checkbox on):

1. Run `build_marrow_hero.py` in Blender (script auto-loads local HDRI if present).
2. Optional: re-download `dikhololo_night` 2k via Poly Haven if world was purged.
3. Soft keys: Key ~280, Fill ~90, Rim ~160, Ground ~40; HDRI strength ~0.9.
4. Export GLB to `web/assets/models/marrow.glb` + assets mirror.
5. Bump `GLB_ASSET_VER` in `web/js/glb.js` and `?v=` on `web/index.html`.
6. Hard-refresh game: `http://127.0.0.1:8765/?garage=1` (Ctrl+Shift+R).

---

## In-game paint standard (do not re-crank)

| Param | Value | Notes |
|-------|-------|--------|
| Base color | `0xc45c26` | config.js Marrow |
| Flake intensity | ~0.85–0.95 | garage amp **must not** exceed ~1.0 |
| envMapIntensity | ~3.2 | was 7.2 (pink wash) |
| clearcoat | 1.0 | MeshPhysical |
| Magenta env bands | low | materials.js flake envSynth |

If paint looks pink/sparkly again, check garage amp in `game.js` and flake shader in `materials.js` first.

---

## Identity checklist (still-read)

When judging Marrow stills or garage:

1. **Silhouette** — coupe proportions: cabin, hood, haunches, wheels (not potato, not pure brick).
2. **Bone theme** — ribs, spine, brow, rockets readable at a glance.
3. **Paint** — copper/orange clearcoat; soft flake; not hot magenta glitter.
4. **Combat kit** — dual rockets + roof MG present; not double-stacked by runtime kit.
5. **Lights** — HL / TL / exhaust chrome read under night HDRI or garage keys.

---

## Out of scope for this standard

- Photoreal NFS Heat body panels / real manufacturer PBR sets  
- Hand-sculpt high-poly with retopo  
- Full RGBELoader world swap (HDRI file is on disk; Three wiring optional next)

Other vehicles (Needle, Mausoleum, …) should **match process** (Blender multiparts → named GLB → paint rules), not necessarily match Marrow part count.
