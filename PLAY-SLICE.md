# Twisted Speed — Playable Slice (Build 10)

## Fix summary
- **Cars:** multi-part FBX (body/cabin/glass/wheels/lights/weapons) — not joined potato-blobs.
- **Track:** closed ~2km loop, 8 laps; corridor solids removed so you do not soft-lock.
- **Drive:** silkier steer, more grip, auto-unstick if wedged with throttle held.

## Play
1. Stop Play so Unity reimports FBX/scripts.
2. Play → Garage (5 unlocked cars) → Map 1 → Start.
3. Complete 8 Freedom Gate laps. HUD: LAP x/8.

### Controls
WASD drive · Shift nitro · J MG · K rocket · L mine · I special · Esc results

### If stuck
Hold W ~1s — UnstickAssist snaps you to the path centerline.

### Rebuild cars
``python`` not required — Blender MCP: run ``tools/build_hq_cars.py``
