# Twisted Speed — Progress

**Build:** web **v443** (Wreck Wake — dress clutter + smash juice)  
**Serve:** `cd web && python3 serve.py` → `http://127.0.0.1:8765/?v=443`  
**Gauntlet:** COMPLETE (Heat R12 · TM R17) — visual/combat baseline  
**SoT:** one build · follow `docs/AAA-ROADMAP.md` for next work  
**Quality bar:** Turbo Sloths Mad Max combat-racer density (felt), not UE5 photoreal.

## This block (v443)
| Check | Result |
|-------|--------|
| Dress layer | gravel / shard / scrub · ≤900 · lat 1.02–3.2× roadHalf · **no collide** |
| Knocked props | 0.45s tumble → y-scale 0.3 wreck mark |
| Debris wake | 96 chunks + 64 dust · player wake @0.10s · smash burst |
| Smash juice | collide SFX · camShake 0.18 · smashKick → motion blur |
| Hazard freeze | clearFrac 0.44 · maxInstances 400 · step 0.0032 · hpChip/hitCd unchanged |
| Locks | Maglev wait/gap · warden_lane · saveKey |

## Don’t regress
- Gauntlet VFX · maglev wait/gap · soft hazards · lip-only steer  
- Original cast · saves `twisted-speed-v5-night`  
- Toast substrings: BONE HARVEST, THREAD THE VEIN, VEIN MISS, BLACKOUT KISS, REAR VEIN  
- District index `0` is real (INTAKE ROW) — never falsy-skip  

## Next (from roadmap)
**P2.3** Finish ceremony polish (Parole Arch) as story punctuation — or further Turbo Sloths feel (thruster read / impact polish) if director keeps quality push.

## Run
```bash
cd web && python3 serve.py
# http://127.0.0.1:8765/?v=443  → BUILD 443
```
