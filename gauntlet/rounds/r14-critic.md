# Gauntlet R14 — Twisted Metal Combat A/B (valid refs)

**Build:** v428 (tested) · v429 speed-blur shipped same session  
**Test Date:** 2026-08-31  
**Refs:** tm-combat-01..04-sm.jpg — verified TM 2012 PS3 stills (VGB/GameHope)  
**R13 status:** INVALID (refs were dev-build top-down, not TM 2012)

## BLIND A/B VERDICT

**Twisted Metal 2012 refs still WIN — but gap closed sharply from v427.**

v428 with real TM refs is a fair fight. Our chase-cam combat is functional and readable at 129–140 mph with eliminations, but TM still leads on volumetric explosion mass, background motion blur, and environmental combat lighting.

## BIGGEST REMAINING GAP

**Motion blur + explosion volume at speed.** TM ref 03 shows heavy radial blur on road/buildings during chase combat; our v428 frame is sharp (no speed smear). TM ref 02's fireball fills half the frame with smoke; our hit bursts are bright but compact spheres.

## Combat Matrix Comparison

### MG Tracers
*   **TM (vgb-1, gh-10):** Thin orange/red glowing lines + white smoke ribbons from turret/barrel.
*   **v428:** Thin orange additive streaks (0.14 box, 2.4× scale), dual stream at 140 mph. Visible and directional.
*   **Winner:** **Tie** — v428 finally matches tracer *shape*; TM wins on smoke-trail volume.

### Muzzle Flash
*   **TM (gh-10):** Large 4-petal starburst, bloom fills hood area, lights car body.
*   **v428:** TM-style 4-petal cross (world + HUD), localized — no longer screen-filling rectangle.
*   **Winner:** **TM** — more particle depth and secondary illumination on vehicle.

### Hit Feedback
*   **TM (gh-09, gh-10):** Massive fireballs, debris, heat-haze distortion.
*   **v428:** White burst on impact, ◆ HIT ◆ crosshair, ELIM ×N toast, +scrap, rival wreck explosion on kill.
*   **Winner:** **Twisted Speed** — gameplay feedback loop TM stills can't show; our elim at 129 mph confirmed (RAZORBACK +17).

### Explosion Energy
*   **TM:** Volumetric orange fire + thick smoke columns (refs 02, 04, 09).
*   **v428:** Additive sphere cores + ring; kill explosions spawn fire/spark/smoke burst.
*   **Winner:** **TM** — smoke mass and scale still AAA-tier above ours.

### Combat Chaos at Speed
*   **TM (vgb-7):** Motion blur, heat haze, multi-target HUD, character leaning out firing.
*   **v428:** 140 mph dual-stream MG, rain, wet pools, neon canyon — sharp but busy.
*   **Winner:** **TM** — blur + atmospheric distortion sell speed chaos better.

### Chase-Cam Readability
*   **TM:** Dense HUD (minimap, weapon tray, lock reticle) but motion blur reduces clarity.
*   **v428:** ◆ MG ◆ banner, weapon bar, kill feed, speedo, clean tracer read.
*   **Winner:** **Twisted Speed** — more legible for actual play.

## v428 vs v427 (invalid R13)

| Item | v427 | v428 |
|------|------|------|
| Tracer shape | Fat white 0.8 box ×5.5 | Thin orange 0.14 ×2.4 |
| Muzzle | Full-screen cream rectangle | 4-petal cross, localized |
| Ref validity | Wrong (dev 0.7.1 top-down) | Real TM 2012 PS3 |
| R13 verdict | "WINS" (invalid) | — |

## Gap Estimate

~**32%** remaining to TM bar (down from ~68% geometric-primitive gap in R13 invalid run).

## v429 follow-up (same session)

Chase speed radial streaks when mph > 88 — addresses motion-blur gap partially. Re-test R15 after v429 bake.

## Summary

Real TM refs reset the bar. v428 passes the "not embarrassing" threshold: tracers read, muzzle is TM-shaped, hits confirm with elim credit. TM still wins the still-frame AAA aesthetic on explosion volume and speed blur.

**Next:** v429 R15 re-test · smoke ribbon trails on MG path · bigger kill fireball scale · optional camera FOV punch blur.
