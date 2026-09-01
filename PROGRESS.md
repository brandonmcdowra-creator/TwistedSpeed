# Twisted Speed — Progress

**Build:** web **v441** (P1.4 Scrap Line shoulder freight)  
**Serve:** `cd web && python3 serve.py` → `http://127.0.0.1:8765/?v=441`  
**Gauntlet:** COMPLETE (Heat R12 · TM R17) — visual/combat baseline  
**SoT:** one build · follow `docs/AAA-ROADMAP.md` for next work  
**Quality bar:** Turbo Sloths Mad Max combat-racer density (felt), not UE5 photoreal.

## This block (v441)
| Check | Result |
|-------|--------|
| P1.4 Scrap Line | 5 InstancedMesh pools + gantries · ~400 cap · shoulders 0.50–0.90 roadHalf |
| Centre clear | \|across\| < 0.44 × roadHalf — no props |
| Skip bands | t<0.15 · t>0.90 · maglev [0.26,0.34] · thin density warden 0.38–0.56 |
| Hulks | Settled wrecks stay (cap 6) · smoke · soft collide proxy |
| Neon only | REACH/coast return null |
| Locks | Maglev wait/gap · warden_lane · saveKey · no freight toast |

## Don’t regress
- Gauntlet VFX · maglev wait/gap · soft hazards · lip-only steer  
- Original cast · saves `twisted-speed-v5-night`  
- Toast substrings: BONE HARVEST, THREAD THE VEIN, VEIN MISS, BLACKOUT KISS, REAR VEIN  
- District index `0` is real (INTAKE ROW) — never falsy-skip  

## Next (from roadmap)
**P2.3** Finish ceremony polish (Parole Arch) as story punctuation.

## Run
```bash
cd web && python3 serve.py
# http://127.0.0.1:8765/?v=441  → BUILD 441
```
