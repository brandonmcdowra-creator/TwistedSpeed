# Round 0 critic — baseline v411 vs Heat bar

**Date:** 2026-08-30  
**Critic:** [Baseline capture](bc-1d811eca-b88f-536d-a4a0-d22fdb4ef3f6) + lead synthesis  
**Shots:** `gauntlet/shots/r0-*.png`  
**Refs:** `gauntlet/refs/heat-*-sm.jpg`, `heat-feature.jpg`

## Blind A/B — chase world
**Winner: Heat.** Ours reads as a neon trench (flat canyon slabs + black void). Heat has wet mirror asphalt, layered street furniture, bloomed lamps, motion depth.

## Biggest remaining gap (single)
**Wet reflective road + layered night-street fill** — asphalt does not carry neon; flanks lack nameable mid-depth street life.

## Maglev (v411 greybox frames)
Junction zone captured at ~26% but still greybox in those frames (dress is v412 — needs fresh critic).

## Combat
MG/special HUD clear; **world VFX fail** — no readable tracers/muzzle/impact in r0-combat-mg. Special toast only.

## Builder order
1. Piece C — wet road / neon asphalt (full course, MeshBasic fake sheen)  
2. Piece D — MG tracer + muzzle readability in chase  
3. Re-critic A (v413) + B (v412) with fresh chase at `?v=413`
