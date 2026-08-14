# SELF-REVIEW — Twisted Speed rev-1

## 1) Completeness

**Is the core loop playable end-to-end with feedback on every action?**  
Yes. Flow: **menu → garage → race → win/lose results → upgrade picks → garage** (and **freedom** after Night 3). Implemented in `web/js/game.js` state machine.

| Action | Feedback |
|--------|----------|
| Start / confirm | `sfx.confirm` / `click` |
| Throttle / steer | Motion + speedo needle |
| MG fire | Beeps, muzzle particles, bullet sprites |
| Rockets | Sweep SFX, shake, trail particles |
| Hit rival | `hit`, particles, HP bar, scrap drop on kill |
| Player hurt | `hurt`, shake, invuln flash, knockback |
| Scrap pickup | `pickup`, particles, run scrap counter |
| Track hostile | Toast, shake, cyan road edge, HUD banner |
| Win / lose | `win`/`lose` jingles, results screen |

**Where it still breaks / dead-ends / feels thin**

1. **One vehicle only** — garage shows Brawler only (V1 scope); multi-rig is deferred.  
2. **One map** — stages escalate the same loop, not unique layouts yet.  
3. **AI is pursue+ram only** — intentional cut; rivals can feel samey.  
4. **Lap progress needs on-road driving** — heavy off-road can stall progress (fair but may confuse).  
5. **No mouse/touch controls** — keyboard only for V1.

**Fixes applied this pass**

- Input edge queue so quick Enter/taps register (`web/js/engine.js`).  
- Stronger living-track beat at 72% progress (hostile lock on dunes, spike/bridge spike, HUD + road color).  
- Ellipse fallback for dunes if `ctx.ellipse` missing.

## 2) Uniqueness & feel

**Where it looked generic**  
Top-down cars + guns + oval could read as “mini Twisted Metal / combat racing template” if hazards were static props.

**Single strongest change (unique hook)**  
**The track is a living predator that reconfigures mid-race and actively targets the player** — not static Mario Kart obstacles.

**Applied:** at ~72% lap progress the highway goes HOSTILE: dunes stay awake and chase hard, spikes snap up on the racing line, bridges warn/collapse, road edge turns cyan, permanent HUD warning. Combined with **Night Runs toward freedom from dystopian overlords** (stage ladder + freedom ending) so session 2 is a later night with a meaner track and a banked scrap build — not the same neutral arcade lap.

## Files cited

- `web/js/game.js` — full game  
- `web/js/config.js` — palette, tunables, stage count  
- `web/js/engine.js` — loop, input, placeholder draw  
- `web/js/sfx.js` — synth audio  
- `web/index.html` — shell title/controls  
