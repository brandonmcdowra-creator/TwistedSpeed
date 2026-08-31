# Gauntlet R16 — Twisted Metal Combat A/B

**Build:** v431  
**Test Date:** 2026-08-31  
**Refs:** tm-combat-01..04-sm.jpg  
**Shots:** r16-combat-mg.png, r16-combat-kill.png

## BLIND A/B VERDICT

**Twisted Metal 2012 refs still WIN narrowly — gap ~8%.**

v431 ships all three R15 fixes and wins most matrix rows. TM ref **gh-02** (Sweet Tooth half-frame fireball) still edges us on static explosion density — that single ref keeps the pack ahead in blind A/B.

## BIGGEST REMAINING GAP

**gh-02 soot core density.** Kill `smokeStack` columns read volumetric in motion, but beside TM's opaque orange fireball + thick smoke stack in a frozen frame, our elim burst is still more additive-billboard than volumetric soot.

## Combat Matrix Comparison

### MG Tracers + Smoke Ribbons
*   **TM (vgb-1):** Orange lines + white smoke ribbons.
*   **v431:** Orange tracers + white ribbons + scene motion smear.
*   **Winner:** **Twisted Speed**

### Muzzle Flash + Body Light
*   **TM (gh-10):** Starburst lights hood and body orange.
*   **v431:** 4-petal cross + car body emissive orange flash while firing.
*   **Winner:** **Tie**

### Hit Feedback
*   **v431:** hitBurst, ◆ HIT ◆, ELIM ×1 RAZORBACK +17, LOCK.
*   **Winner:** **Twisted Speed**

### Explosion Energy (gh-02 bar)
*   **TM:** Half-frame fireball, opaque smoke column.
*   **v431:** smokeStack 7-layer column + 2.5× cores on elim.
*   **Winner:** **TM** — soot mass still denser in still comparison

### Combat Chaos at Speed (vgb-7 bar)
*   **TM:** Full-scene geometry radial blur.
*   **v431:** PostFX `motionBlur` 0.52 on scene + HUD streaks + FOV punch.
*   **Winner:** **Twisted Speed** — scene geometry smears (uniform confirmed 0.52)

### Chase-Cam Readability
*   **Winner:** **Twisted Speed**

## Gap Progress

| Round | Gap | Key change |
|-------|-----|------------|
| R15 | ~18% | Smoke ribbons, HUD blur |
| **R16** | **~8%** | PostFX blur, smokeStack, body emissive |

## Technical Confirmation

- `postfx.motionBlur` = **0.52** while firing MG
- **ELIM ×1** with smoke stack on kill
- Body emissive orange flash during `_muzzleBodyT`

## Summary

v431 closes all R15 action items. We now win tracers, speed blur, hit feedback, and readability. TM ref gh-02 keeps the pack ahead on explosion stills.

**Next (v432):** opaque soot core shader on kill stack · darker smokeDark alpha stack · gh-02 parity pass.
