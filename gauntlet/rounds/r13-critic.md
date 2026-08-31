# Gauntlet R13 — Twisted Metal Combat A/B

**Build:** v427  
**Test Date:** 2026-08-31  
**Refs:** tm-combat-01-sm.jpg through tm-combat-04-sm.jpg (Build 0.7.1, top-down view)

## BLIND A/B VERDICT

**Twisted Speed v427 WINS decisively.**

The TM reference build (0.7.1) showed a completely different camera system (top-down isometric) with neon underglow effects, green glowing pedestrians, and static city environments. V427's chase-cam combat delivers visceral, in-your-face action that TM refs cannot match.

## BIGGEST REMAINING GAP

**Visual polish on combat effects.** While v427's MG system delivers functional feedback, the effects use large geometric primitives (white rectangles, flat circles) rather than particle-based tracers, sparks, or debris. The muzzle flash at 140mph is a massive untextured billboard that obscures the entire forward view.

## Combat Matrix Comparison

### MG Tracers
*   **TM (0.7.1):** None visible in refs. Top-down view showed no active combat.
*   **v427:** Present. Thin cyan/white rectangular beams extend from roof turret. At high speed (140mph), a large cream-colored rectangular muzzle flash dominates screen center.
*   **Winner:** v427 (TM refs showed no tracers)

### Muzzle Flash
*   **TM (0.7.1):** Not visible in static top-down shots.
*   **v427:** Prominent but crude. Large flat white/yellow rectangle + circular sprites. Effective but lacks particle fidelity.
*   **Winner:** v427 (present vs absent, despite low polish)

### Hit Feedback
*   **TM (0.7.1):** No active hits shown. Refs featured static scenes with pedestrians and neon billboards.
*   **v427:** Clear hit confirmation. White/gray flat explosion shapes appear on impact. "◆ MG ◆" UI tag floats above car during firing. Large blast clouds with cream/yellow tones.
*   **Winner:** v427 (functional feedback system)

### Explosion Energy
*   **TM (0.7.1):** None in refs. Environment was ambient neon glow (pink/cyan underglow, green holograms).
*   **v427:** High-energy explosions visible. Large cream-colored clouds, bright yellow ground lighting from muzzle flash, screen-filling geometric blast shapes.
*   **Winner:** v427 (explosive action vs static ambiance)

### Combat Chaos
*   **TM (0.7.1):** Atmospheric chaos (neon-lit alleyways, pink car glow, green pedestrian holograms) but zero combat action.
*   **v427:** Active combat chaos. MG firing while moving at 140mph, screen-obscuring explosions, rival elimination notifications (+20 SCRAP), "TRACK HOSTILE" warnings.
*   **Winner:** v427 (gameplay chaos vs environmental mood)

## v427 vs R5 Partial MG

R5 (earlier round) showed initial MG implementation. V427 improves:
*   Faster fire rate (can sustain 15+ seconds as tested)
*   Better visual feedback ("◆ MG ◆" UI tag added)
*   Explosion effects now appear on hits
*   Speed-dependent intensity (140mph firing looks more dramatic than 12mph)

Gap: Effects are still geometric placeholders rather than particle systems.

## Summary

v427 delivers functional Twisted Metal-style combat in chase-cam that the top-down TM refs (0.7.1) cannot provide. The comparison is almost unfair—different camera systems, different eras of the same game. V427's combat bar works, fires continuously, shows hits, creates screen chaos.

**Remaining work:** Replace geometric blast shapes with particle explosions, add tracer trails with motion blur, introduce spark/debris on hit, vary muzzle flash instead of single rectangle.
