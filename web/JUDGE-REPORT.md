# AAA Visual Judge Report — v97 (adversarial)

**Role:** Independent harsh AAA critic. Did not implement.  
**Bar:** Twisted Metal Black vehicle identity + NFS Heat/Unbound body craft + combat freeze readability.  
**Target:** overall ≥ 75.  
**Stills:** `garage_v97.png` (Marrow — primary vehicle plate), `garage_needle_v97.png`, `race_v97.png` (combat money shot).  
**Prior peak:** overall 55 (v93), car ~52.

---

## Verdict

| Gate | Result |
|------|--------|
| **Overall ≥ 75?** | **NO** |
| **As good as AAA still-read?** | **NO** |
| **Vehicles first priority met?** | **PARTIAL** — real coupe/bike multiparts (no sphere-blobs); still low-poly multiparts vs NFS |

---

## Scores (0–100)

| Category | Score | Notes |
|----------|------:|-------|
| **Car** | **56** | Marrow reads as a **car**: hood, cabin, wheels, wing, LED bars, dual rockets, bone kit as armor not random blob. Needle is a **2-wheel stab bike** with frame/tank/spikes (not a sphere blob). Still multiparts, hard edges, limited panel craft. **+4 vs v93 car 52.** Theme identity improves character. |
| **Lighting** | **48** | Garage hero keys reveal paint flake; night city fill + combat fire. Soft shadows still weak. |
| **Environment** | **46** | Wet road reflections, glass towers, billboards, palms/shops from prior passes. Still extrusion city vs NFS downtown. |
| **Post** | **48** | Bloom/grade package held; 220 chase energy. |
| **VFX / Combat** | **52** | Soft elevated explosion + tracers/rockets/mines improved in code; still arcade not TMB. |
| **HUD** | **48** | Functional. |
| **Overall** | **58** | Vehicle readability is the biggest win this rev. Package improved but **far from 75**. |

**Overall: 58 / 100** — not 75.

---

## Adversarial checklist

| Item | Result |
|------|--------|
| Car is not sphere-blob? | **PASS** — 0 spheres on Marrow chassis (boxes+cyls) |
| Car is not pure crate? | **PASS** — multiparts coupe proportions |
| Needle is a bike? | **PASS** — 2 wheels, frame, spikes |
| Theme readable (bone / stab / tomb)? | **PARTIAL** — kits present; density still light |
| Combat feels non-basic? | **PARTIAL** — tracers/trails yes; impact craft still thin |
| Freeze only on capture URLs? | **FIXED** — startRace clears `_frozen` / shot hold |
| AAA 75 gate? | **NO** |

---

## Path to 75 (ordered)

1. **Vehicles (still #1):** Bevel/chamfer language, multi-material paint vs trim vs glass, more body-kit density, unique silhouettes sketchable from memory  
2. **Combat:** Per-weapon impact cards, screen hit flash, rival wreck pieces, audio punch  
3. **Environment:** Larger billboard density in chase FOV, storefront row continuous, wet mirrors of towers  

**Do not claim 75. Continue vehicle-first loop.**
