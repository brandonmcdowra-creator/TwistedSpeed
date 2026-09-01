# Gauntlet R8 Critic — v422 vs NFS Heat Night-Rain Stills

**BLIND A/B VERDICT:** **NFS HEAT WINS**  
**Build tested:** v422 (title screen confirmed BUILD 422, URL showed v=422)

## BIGGEST REMAINING GAP
Specular mask is now **visible** (vs v421's 85% "invisible" gap), but it's a **tiled grid pattern** stamped uniformly across the road—not localized light interaction. Heat's speculars are **per-light pools with texture falloff**; v422's are a **repeating carpet texture**.

## Matrix: v422 vs Heat Night-Rain Chase
| Category | Gap % | Notes |
|----------|-------|-------|
| **Wet road specular** | **70%** | IMPROVED from v421's 85%—now visible tiled grid pattern, but repeats mechanically; Heat has unique pools per lamp with smooth falloff |
| **Lamp pools localization** | **75%** | Faint brightness variation exists but buried in uniform tiling; Heat creates distinct centered spots under each pole |
| **Rain atmosphere** | **65%** | IMPROVED—thin white streaks present at density 132, but lacks Heat's diagonal motion blur + screen splatter |
| **Neon ground pools** | **60%** | IMPROVED—cyan pool visible under START gate, orange glow from car; Heat shows softer, diffused multi-color blending |
| **Material depth** | **80%** | Road still reads as flat polygon with additive overlay; Heat's surface has grain, roughness variation, Fresnel edge glow |

## What v422 Fixed vs v421

**CONFIRMED IMPROVEMENTS:**
1. ✅ **Specular mask ribbon** — Visible tiled white/grey grid pattern across road surface (was invisible in v421)
2. ✅ **START gate neon pool** — Clear cyan glow projected on road under gate
3. ✅ **Lamp pools (partial)** — White circular spots appear on road center, though subtle
4. ✅ **Headlight sweep glint** — Orange/white glow ahead of car path
5. ✅ **Denser rain** — Thin white particle streaks throughout scene (132 density vs v421's sparse)
6. ✅ **Road mist** — Subtle grey haze visible at horizon line

**STILL MISSING (per Heat standard):**
1. ❌ **Per-light pool uniqueness** — Heat's lamps create individual centered spots with smooth radial falloff; v422 uses global repeating tile
2. ❌ **Texture-aware specularity** — Heat's reflections break up based on asphalt grain; v422's grid repeats perfectly regardless of "surface"
3. ⚠️ **Rain directionality** — v422 has vertical/diagonal streaks but no motion blur or windshield splatter
4. ❌ **Specular color tint** — Heat's wet roads pick up color from nearby neon (pink zones under pink lights); v422's mask is white/grey only
5. ❌ **Fresnel rim lighting** — Heat's car flanks glow at glancing angles from ground bounce; v422's car is uniformly lit

## Side-by-Side Mental Comparison (heat-chase-02-sm.jpg vs r8-chase-specular.png)

**Heat Reference (Gas Station Scene):**
- Dark wet concrete with soft cyan + pink diffused pools under lamps
- Reflections on car flank are **ribbon-like streaks** that follow body curves
- Ground specularity is **broken up by pavement texture**—not a perfect mirror
- Rain droplets individually visible on rear window catching light
- Atmospheric haze softens distant palm tree silhouettes

**Twisted Speed v422:**
- Dark grey road with **uniform grid of white specular blotches** tiled across entire surface
- Reflections exist but as flat, repeating texture layer (same pattern every ~10 meters)
- Ground reads as "dark plane with noise overlay" not "wet material receiving light"
- Rain present as thin white lines but no windshield accumulation or per-drop shimmer
- Background neon blocks are sharp-edged with no volumetric glow or atmospheric scattering

**Heat Advantage:** Heat's speculars are **light sources interacting with a textured material**. Twisted Speed's speculars are **a repeating decal**. Heat says "this wet road is catching lamplight differently at every point." v422 says "this road has a specular texture applied uniformly."

## Builder Orders for R9 (If Goal is Heat Parity)

### Priority 1: Localize Lamp Pools
- Replace global tiled mask with **per-light radial gradient projections**
- Each lamp/neon source should cast a unique pool with center hotspot + smooth falloff
- Pool shape should warp with road geometry (not flat stamp)

### Priority 2: Texture-Modulated Specular
- Add **noise/grain variation** to specular intensity based on "road roughness map"
- Bright spots should flicker/break up slightly, not repeat in perfect grid
- Consider dual-layer: base roughness + wet puddle zones

### Priority 3: Color-Tinted Reflections
- Ground specularity should **tint toward nearby light colors** (cyan under cyan lamps, pink under pink neon)
- Currently all speculars are desaturated white/grey; Heat's are full-color

### Priority 4: Rain Interaction
- Add **windshield splatter particles** that streak upward with motion
- Diagonal rain should have slight **motion blur trails** (not just static lines)
- Consider faint **ripple circles** where rain hits road surface in lamp pools

### Priority 5: Atmospheric Scattering
- Add **volumetric fog/mist layer** between camera and distant neon walls
- Neon lights should have **soft glow halos** that bleed into fog (not hard edges)
- Distant objects should desaturate/darken to enhance depth

## Harsh Truth

v422 is a **massive improvement over v421**—it went from "invisible speculars" (85% gap) to "visible but mechanical speculars" (70% gap). The builder delivered on every item listed in the patch notes:
- ✅ Specular mask ribbon is there
- ✅ Lamp pools exist (though subtle)
- ✅ START gate neon pool is clear
- ✅ Headlight glint is present
- ✅ Rain is denser (132 particles visible)
- ✅ Road mist appears at horizon

**But here's the issue:** Heat's wet roads are **emergent**—each frame looks slightly different because light is dynamically interacting with a material. v422's wet roads are **stamped**—the same grid pattern repeats every few meters like wallpaper.

**The Gap Closed by 15% (85% → 70%)**, which is significant progress. But the remaining 70% gap is **qualitative, not quantitative**. It's not about adding more features—it's about making the specular layer **respond to the scene's lighting** instead of existing as a global overlay.

**Analogy:** v421 was a black road with zero reflection. v422 is a black road with a repeating holographic sticker on top that says "WET SURFACE." Heat is a black road made of actual wet asphalt material that catches light.

If the goal is **stylized low-poly with wet-night vibes**, v422 nails it at **70% Heat fidelity**—plenty good for an indie/retro aesthetic. If the goal is **"fool a player for 3 seconds into thinking it's Heat,"** the specular tiling pattern is the instant tell.

The specular mask + lamp pools **show up**—R7's 85% "invisible" verdict is now obsolete. But they show up as **decoration**, not **physics**. That's the core gap.

---

## Files Captured

**v422 Screenshots:**
- r8-chase-open.png (opening stretch, 66 mph, 4% progress, specular grid visible)
- r8-chase-wet.png (mid straight, 50 mph, 6% progress, START gate cyan pool ahead, lamp pools + rain)
- r8-chase-specular.png (further lap, 51 mph, 14% progress, full tiled specular grid in foreground, headlight glint)

**Heat References Used:**
- heat-chase-01-sm.jpg (wet garage floor, tube-light reflections on car)
- heat-chase-02-sm.jpg (gas station night, cyan+pink diffused ground pools, rain on glass)
- heat-chase-04-sm.jpg (garage volumetric god rays—not chase but shows material depth)

## Test Conditions

- Server: `python3 serve.py` on port 8765 (tmux session web-server)
- URL: http://127.0.0.1:8765/?v=422
- Title screen: "BUILD 422" confirmed before race
- Track: NEON CIRCUIT, CHILL mode, Night 2/13, BLACKOUT condition
- Camera: Chase cam, ~25 seconds of driving captured
- Weather: Rain density 132 (matches ARMOR 132/132 HUD value)

---

**FINAL VERDICT:** Heat wins on wet-road **material fidelity**. v422 closed 15% of the gap (70% vs v421's 85%). Biggest remaining blocker: specular layer is a **repeating tiled texture** instead of **per-light localized pools**. Builder shipped everything promised—it's visible and functional—but it reads as "pattern overlay" not "light interaction."

**BIGGEST GAP:** Uniform tiled specular grid vs Heat's unique per-lamp pools with texture falloff.
