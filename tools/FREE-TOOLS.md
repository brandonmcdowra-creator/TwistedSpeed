# Free tools useful for Twisted Speed (fleet + Marrow path)

## Already in use
| Tool | Role |
|------|------|
| **Blender 5.2** | Hero vehicle authoring + GLB export |
| **Blender MCP** | Live scene control when GUI Blender is open (not headless) |
| **Three.js r160 (vendored)** | Runtime renderer |
| **Sketchfab (API key)** | Fleet body downloads: Camaro / Hayabusa / hearse / coupe / van / truck |
| **Kenney Car Kit (CC0)** | Baseline sedan mesh (Vesper path / free_cars/) |
| **Poly Haven HDRI** | `web/assets/env/dikhololo_night_2k.hdr`, `night_city.hdr` |

## Recommended free tools
| Tool | Why |
|------|-----|
| **[Poly Haven](https://polyhaven.com)** | CC0 HDRIs + textures (asphalt, metal, paint noise) |
| **[ambientCG](https://ambientcg.com)** | Free PBR sets for asphalt / metal / rubber |
| **[glTF Transform](https://gltf-transform.dev)** | Compress GLBs (Mausoleum is ~12MB — prime candidate) |
| **[Khronos glTF Sample Viewer](https://github.khronos.org/glTF-Sample-Viewer-Release/)** | Inspect materials/UVs outside the game |
| **[Materialize](https://boundingboxsoftware.com/materialize/)** | Normal/roughness from albedo if needed |

## Fleet arm scripts
```bat
:: Marrow Camaro (Sketchfab key required in Blender MCP)
blender --background --python tools\arm_sketchfab_camaro.py

:: Generic fleet arm
blender --background --python tools\arm_fleet_vehicle.py

:: Marrow loft rebuild
blender --background --python tools\build_marrow_hero.py
```

Outputs land in `web/assets/models/*.glb` and `assets/models/*.glb`.

Then hard-refresh the game (Ctrl+Shift+R). Bump `GLB_ASSET_VER` in `web/js/glb.js` after asset swaps.

**Visual standard:** `docs/MARROW-STANDARD.md`  
**Credits:** `docs/CREDITS-MODELS.md`
