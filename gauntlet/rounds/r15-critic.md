# Gauntlet R15 — Twisted Metal Combat A/B

**Build:** v430  
**Test Date:** 2026-08-31  
**Refs:** tm-combat-01..04-sm.jpg (TM 2012 PS3, verified)  
**Shots:** r15-combat-mg.png, r15-combat-hit.png

## BLIND A/B VERDICT

**Twisted Metal 2012 refs still WIN — gap narrowed to ~18%.**

v430 closes the three R14 gaps materially. Smoke ribbons, combat speed-blur, and bigger hit/kill bursts are all visible at 140 mph. TM still leads on volumetric smoke mass and full-scene geometry blur.

## BIGGEST REMAINING GAP

**Volumetric explosion smoke columns.** TM ref 02's fireball is half the frame — thick orange fire + opaque smoke stack. Our v430 bursts are brighter and larger but still read as additive spheres/billboards, not dense soot columns.

## Combat Matrix Comparison

### MG Tracers + Smoke Ribbons
*   **TM (vgb-1):** Thin orange lines + white smoke ribbons from barrel.
*   **v430:** Orange dual-stream tracers + visible white smoke ribbons lagging behind at 140 mph.
*   **Winner:** **Twisted Speed** — ribbons now match TM trail language.

### Muzzle Flash
*   **TM (gh-10):** Large starburst, lights car body orange.
*   **v430:** 4-petal cross + localized bloom; car body less lit.
*   **Winner:** **TM** — secondary illumination on vehicle mesh.

### Hit Feedback
*   **TM:** Massive fireballs, heat-haze ripple (vgb-7).
*   **v430:** hitBurst orange puff, ◆ HIT ◆, ELIM ×1 RAZORBACK +17 at 140 mph, LOCK reticle.
*   **Winner:** **Twisted Speed** — confirmed elim + scrap loop.

### Explosion Energy
*   **TM:** Dense smoke columns, debris, half-frame fireballs.
*   **v430:** 2.5× kill cores, 8+ smoke spawns on elim, white bloom spheres on track.
*   **Winner:** **TM** — smoke reads volumetric; ours still sphere-forward.

### Combat Chaos at Speed
*   **TM (vgb-7):** Full-scene radial blur on road/buildings, heat distortion.
*   **v430:** 18 radial HUD streaks + edge heat haze when MG+speed>95, FOV punch.
*   **Winner:** **Tie** — v430 blur sells speed; TM blurs world geometry more deeply.

### Chase-Cam Readability
*   **v430:** ◆ MG ◆, weapon bar, kill feed, speedo 140 mph, clean LOCK.
*   **Winner:** **Twisted Speed**

## Gap Progress

| Round | Gap | Key change |
|-------|-----|------------|
| R13 (invalid) | ~68% | Fat white rods, wrong refs |
| R14 | ~32% | Thin tracers, real refs |
| **R15** | **~18%** | Smoke ribbons, combat blur, bigger booms |

## Summary

v430 is the closest we've been to TM on combat stills. Smoke ribbons and speed-blur address R14's top gaps. TM still wins on explosion smoke volume and muzzle body-lighting.

**Next (v431):** volumetric smoke stack on kills · postfx radial blur on scene (not just HUD) · muzzle lights car emissive.
