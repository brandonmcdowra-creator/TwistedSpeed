# Twisted Speed — Progress

**Build:** web **v436** (maglev audio + shield readability)  
**Serve:** `cd web && python3 serve.py` → `http://127.0.0.1:8765/?v=436`  
**Gauntlet:** COMPLETE (Heat R12 · TM R17) — visual/combat baseline  
**SoT:** one build · follow `docs/AAA-ROADMAP.md` for next work  

## This block (v435–v436)
| Check | Result |
|-------|--------|
| Model workflow | Other Models plan → Cursor Models implement (persisted in AGENTS / rule) |
| P0.4 Maglev audio | approach / gap / hit synth + `ml.audioProbe` |
| P1.1 Shield FX | absorb ring + break sting + HUD pulse/dim empty bar |
| Timing / saves | Maglev wait/gap untouched · `twisted-speed-v5-night` |

## Don’t regress
- Gauntlet VFX · maglev wait/gap logic · rivals own-pace  
- Soft hazards only (no hard ribbon walls)  
- Lip-only steer · original cast · saves `twisted-speed-v5-night`
- Shield at 0 is real (dim bar when maxShield > 0)

## Next (from roadmap)
**P1.2** Signature special readability (wind-up / impact / cooldown HUD) for 2–3 roster cars.

## Run
```bash
cd web && python3 serve.py
# http://127.0.0.1:8765/?v=436  → BUILD 436
```
