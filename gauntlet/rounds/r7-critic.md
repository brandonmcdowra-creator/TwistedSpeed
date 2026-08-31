# Gauntlet R7 Critic — v421 vs NFS Heat Night-Rain Stills

**BLIND A/B VERDICT:** **NFS HEAT WINS**  
**Build tested:** v421 (title screen confirmed BUILD 421, URL showed v=420)

## BIGGEST REMAINING GAP
Road surface still reads as flat matte panel—no localized specular pools, no wet-asphalt texture grain, no lighting interaction depth.

## Matrix: v421 vs Heat Night-Rain Chase

| Category | Gap % | Notes |
|----------|-------|-------|
| **Wet road specular** | **85%** | IMPROVED from v420's 95% emissive glow, but still uniform dark-matte with zero localized lamp pools or streaking |
| **Rain atmosphere** | **80%** | Sparse vertical white lines vs Heat's dense diagonal streaks with screen splatter |
| **Neon storefronts** | **85%** | Flat colored rectangles on blocks vs Heat's layered signage with depth |
| **Palm/flank density** | **90%** | Simple geometric blocks vs Heat's rich urban furniture (palms, barriers, ads) |
| **Chase energy** | **75%** | Low-poly aesthetic with minimal motion blur vs Heat's cinematic camera shake and particle density |

## What v421 Fixed vs v420

**CONFIRMED IMPROVEMENT:**
- Road no longer glows/emits light (v420's "light panel" bug RESOLVED)
- Base color darkened from cyan-white to dark grey/blue
- Surface reads as "road" not "neon strip"

**STILL MISSING (per builder orders):**
1. ❌ **Localized specular streaks** — Heat shows distinct white lamp reflections that warp with texture; v421 has uniform matte finish
2. ❌ **Lamp pools** — Heat creates bright concentrated spots under lights; v421 has zero light interaction on road
3. ⚠️ **Denser rain** — Some vertical streaks present but far sparser than Heat's layered diagonal rain
4. ❌ **Wet texture grain** — Heat's road has visible roughness/imperfection variation; v421 is perfectly smooth polygon

## Side-by-Side Mental Comparison (heat-chase-01-sm.jpg vs r7-chase-open.webp)

**Heat Reference:**
- Dark wet concrete with sharp white tube-light reflections
- Reflections warped by floor texture, not uniform
- Clear distinction: dark matte zones vs bright specular streaks
- Ground reads as "wet polished surface with localized highlights"

**Twisted Speed v421:**
- Dark grey-blue flat polygon with zero reflections
- No light sources create ground interaction
- Uniform surface brightness across entire visible road
- Ground reads as "dark construction paper"

**Heat Advantage:** Heat's road is a **material surface** that receives light. Twisted Speed's road (even in v421) is still a **colored shape** that ignores the scene's lighting.

## Builder Orders for R8 (If Goal is Heat Parity)

1. **Specular mask pass** — Add white/bright spots on road directly under neon lights and car headlights
2. **Texture micro-detail** — Subtle noise/grain overlay on road to break up perfect smoothness
3. **Wetness shader** — Increase reflectivity in center of "puddle zones" near lights
4. **Rain interaction** — Make diagonal rain more dense + add faint splatter particles where rain hits road
5. **Atmospheric depth** — Slight fog/mist between camera and far neon walls to add Heat's "humid night" feel

## Harsh Truth

v421 solved the "emissive road panel" emergency (which was blocking any fair comparison), but the gap closed only from **95% → 85%**. Heat's wet roads feel **alive with light**—every lamp creates a pool, every reflection has character. Twisted Speed's road is now the correct darkness, but it's still **inert**—a stage floor that light passes over instead of into.

The opening stretch (r7-chase-open.webp) and wet section (r7-chase-wet.webp) show identical material behavior: dark, matte, uniformly lit. Heat would show variation—brighter under the START gate's cyan neon, dimmer in shadow zones, white streaks where overhead fixtures hit the wet surface.

If the goal is stylized low-poly + wet-night atmosphere, v421 is **50% there**. If the goal is "can fool a player for 2 seconds into thinking it's Heat," the road material is still the #1 blocker.

---

**Files captured:**
- r7-chase-open.webp (opening stretch, 55 mph, 7% progress)
- r7-chase-wet.webp (mid race, 47 mph, 16% progress)  
- r7-chase-flank.webp (freight gap zone, 50 mph, 23% progress)

**Heat references used:**
- heat-chase-01-sm.jpg (wet garage floor, tube-light reflections)
- heat-chase-04-sm.jpg (wet concrete, pink neon pool, god rays)

**Test conditions:**
- Server: `python3 serve.py` on port 8765 (no-cache confirmed)
- URL: http://127.0.0.1:8765/?v=421
- Title screen: "BUILD 421" confirmed before race
- Track: NEON CIRCUIT, CHILL mode, Night 2/13, BLACKOUT condition
- Camera: Chase cam, ~20-30 seconds of driving captured

---

**FINAL VERDICT:** Heat wins on wet-road fidelity. v421 closed 10% of the gap (85% vs v420's 95%). Biggest blocker remains lack of localized specular interaction—road doesn't "receive" the scene's lighting, it just sits beneath it.
