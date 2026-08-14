# How to inspect Neon Sepulcher (whole map)

Chase cam only shows ~80–150 m of scenery. Use these to see **layers + positioning**.

## 1. In-game map overview (easiest)

1. Serve `web/`
2. Open:  
   `http://127.0.0.1:PORT/?v=144&overview=1`
3. Start a race on **Neon Sepulcher** (or any map)
4. Camera jumps **top-down** over the **path** (not inflated by far towers)
5. Fog off, rain off, extra top light, brighter grade — map should be readable
6. Open DevTools console → full `layerReport` (counts + near-driveline flags)

### If it was pure black (v143 bug)
Camera sat above FogExp2 → everything fogged out. **v144** caps height, kills fog, path-only bounds.

Toggle: remove `overview=1` for normal chase play.

## 2. Console (any race)

After a race has started:

```js
GAME._lastWorld.layerReport()
GAME._lastWorld.getBounds()
GAME._lastWorld.showAllLayers()
GAME._lastWorld._overviewMode = true  // then re-enable overview cam with ?overview=1
```

`worstIntrusions` = scenery centers within `roadHalf + 4` of the path (suspect on-track clutter).

## 3. What agents can see without overview

| Source | What we get |
|--------|-------------|
| Your screenshots | Chase POV, HUD, immediate blockers |
| Code (`world.js` path + builders) | Full layer recipe, offsets, themes |
| `layerReport` | Counts + intrusion list |
| Overview mode | Whole course composition |

We **cannot** natively “orbit Unity Scene view” on web without overview/debug tools. Prefer `?overview=1` + screenshots of that view when reviewing env.

## 4. Layer stack (city / Neon Sepulcher)

Bottom → top (build order):

1. Sky dome + atmos sheets  
2. Ground plate (y ≈ −2.4)  
3. Road ribbon + lines  
4. **Corridor context** (banks, shelves, side mass — must stay outside driveline)  
5. Towers / frontage / billboards  
6. Lamps, neon, furniture, street life  
7. Landmarks, tunnels/bridges, finish  

If something sits in the lane, check corridor + tower lateral math first (`clear()`, half-diagonal).
