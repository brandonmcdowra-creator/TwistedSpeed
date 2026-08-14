# FutureIndustries Graphics Playbook

You are making art for a FutureIndustries game. This is the studio's graphics skill pack — the distilled answer to the most expensive question in AI game-building: **why does my art take fifty regenerations and still look wrong?** Read it before generating or drawing anything, and keep it in context through every art pass. It extends [FI-PLAYBOOK.md](FI-PLAYBOOK.md) Part 4; when the two overlap, this file is the deeper reference for graphics.

The one-sentence thesis: **match the art process to what an AI is actually good at — write CODE for systematic art, use image generation only for singular art, and never approve anything you haven't seen rendered inside the running game.**

These rules were paid for in shipped FI games: Crookémon (a browser crime-satire RPG whose AI-painted shop interiors were all retired for code-drawn ones after a director playtest — "use that style everywhere"), 2342 (Godot survivor-roguelike), and Confluence (browser cozy colony sim).

---

## Part 1 · The one decision that matters: systematic or singular?

Before making any asset, classify it:

- **Systematic art** must agree with something else — a grid, a palette, a perspective, a collision map, other tiles, the UI layout. Interiors, backgrounds, tiles, terrain, UI chrome, effects, cutscene scenery.
- **Singular art** stands alone — nothing else has to line up with it. Character portraits, busts, key art, a title logo, one hero illustration.

**Systematic art gets drawn in code. Singular art may be image-generated.** That's the whole doctrine; the rest of this file is how.

Why this split: a text model can *edit* code but can only *re-roll* an image. When a code-drawn counter is 8px too low, the fix is a one-line diff and everything else stays put. When a generated interior has the counter wrong, the only move is regenerating the entire image and hoping the shelves, floor, and perspective survive the dice roll. That re-roll loop — regenerate, squint, regenerate — is the single biggest time sink in AI game art, and it is structural, not a prompting problem. *(FI, paid for in Crookémon:)* the "finished" Grok shop paintings looked fine as thumbnails but in play had walk-over counters, sticker-looking props, and broken perspective; no amount of re-prompting fixed them. The procedural rewrite did, permanently.

Quick table:

| Asset | Process |
|---|---|
| Interiors, buildings, rooms | Procedural (code-drawn) |
| Tiles, terrain, ground | Procedural, or hand-authored pixel art on a locked grid |
| Cutscene / menu backgrounds | Procedural |
| UI panels, frames, HUD | Procedural or DOM/CSS (9-slice if raster) |
| Particles, effects, weather | Procedural — always |
| Character sprites | Image gen on a strict template, or pixel art |
| Portraits, busts, key art, title | Image gen — its genuine strength |

---

## Part 2 · Know your five rendering paths (browser)

1. **Canvas 2D, procedural** — shapes/gradients/patterns drawn by JS each frame. The FI default for scenes, backgrounds, UI, effects. Text-editable, deterministic, resolution-independent.
2. **Canvas 2D, raster sprites** — PNGs blitted with `drawImage`. The FI default for characters and anything image-generated. Use `ctx.imageSmoothingEnabled = false` for pixel art.
3. **DOM/CSS** — divs, flexbox, CSS transitions. Excellent for menus, card games, dialog, HUD overlays (AI models are extremely fluent in CSS and you get text layout free). Janky past a few hundred animated elements.
4. **SVG** — crisp vector icons and scalable UI. Fine for icons; rarely worth it for game scenes (Canvas covers it).
5. **WebGL/WebGPU (PixiJS, Three.js)** — thousands of sprites, shaders, 3D. **Do not start here.** Adopt only when Canvas 2D measurably bottlenecks; it adds a dependency layer with far more ways to fail silently.

*(FI)* The standard stack: **Canvas 2D for the game (procedural scenes + sprite characters), DOM for menus and overlays.** This is Confluence's and Crookémon's real architecture.

---

## Part 3 · Procedural scenes — the code-drawn doctrine *(FI, the big lesson)*

Every scene is composed from **parameterized helper functions reading one shared theme module**. Crookémon's working pattern, generalized:

- **One theme/palette constants module.** Every color, material, and light value in the game comes from one source of truth (`THEME` / `ROOM_THEME` tables — e.g. `{wall, floor, trim, signText, lightPool}` per room type). This is what makes five scenes look like one game instead of five games. Changing the game's mood = editing one file.
- **Helpers, not blobs.** Build a vocabulary of scene pieces — `drawInteriorShell(theme)`, `drawWallShelf(x, y, w, items)`, `drawCounter(...)`, `drawSign(text)` — and compose rooms from them. New room = new composition of existing helpers + a theme row, not 200 new lines. (Playbook rule "add a data row, not a subsystem" applies to art too.)
- **Draw ON the game's grid and collision.** The counter renders on the tile that blocks movement; the door aligns to the walkable cell. When art is drawn from the same data the simulation uses, art *cannot* contradict gameplay. This single rule killed Crookémon's walk-over-counter bug class permanently.
- **Layer like a painter, then ground the room.** Back wall → wall fixtures → floor → floor objects → actors → foreground. Add one soft radial **light pool** on the floor's focal point — it's the cheapest trick that makes a flat room read as a place.
- **Deterministic detail only.** Texture and variety come from a *seeded* RNG or hash-of-position — never bare `Math.random()` inside a draw call, or your scene shimmers at 60fps. Same seed, same scene, every frame.
- **Procedural art is alive for free.** Sine-bob idle motion, flickering signs, drifting dust, pulsing light — a few lines each, and they satisfy the playbook's "nothing on screen perfectly static" juice rule at zero asset cost.
- **Sprites live inside procedural scenes.** The room is code; the people are sprites. Crookémon's shops draw staff and customers as normal character sprites standing in the code-drawn interior — the two processes compose cleanly because the scene obeys the grid.

Cutscene and menu backgrounds follow the same doctrine (Crookémon's `drawSceneDowntown`-style full-screen procedural backdrops): a themed gradient sky, layered silhouette shapes, one light source. Faster to make than one image-gen re-roll, and always on-palette.

---

## Part 4 · Image generation — the narrow lane where it wins

Image gen is for **singular** assets: character sprites, portraits/busts, key art, the title. Apply FI-PLAYBOOK Part 4's pipeline in full (style brief; `subject + style + view + size + game keyword` prompts; one fixed suffix; quantize output to the locked palette; a traceable AI-PROMPTS entry per asset). Additional graphics-pack rules:

- **Author on the game's exact projection template.** Sprites must be generated on the projection the game assumes (Confluence's lesson: "standing centered on a flat 2:1 isometric diamond, no base pedestal"). Free-composition images never place correctly, no matter the code.
- **Judge at full size, in the game.** *(FI, paid for in Crookémon:)* a whole batch of interiors was signed off from quarter-crop renders and looked great — the full view in play was a walk-over brown box. Approval happens on a screenshot of the running game, never in the generator's preview.
- **Never ask image gen for:** tileable textures, grid-aligned interiors, multi-object scenes whose layout matters to gameplay, matched sets ("the same shelf from three angles"), text/UI, or anything that must seam with a neighbor. Those are systematic — Part 3's job.
- **Budget for coherence, late.** Generate custom art in the final polish pass, after the game is fun on placeholders — coherence is expensive and you'd waste it on cut features.

---

## Part 5 · Raster craft rules (when you do use images)

- **One grid, one palette, one light.** Pick a sprite grid (16/24/32px), a named palette (≤32 colors, tokens in the theme module), and one light direction up front; every asset conforms or is rejected. A small consistent set beats a big mismatched one.
- **Author small, scale by integers.** 2342 renders at 640×360 and upscales 2× — pixel art stays crisp only at integer multiples. Browser: `image-rendering: pixelated` + `imageSmoothingEnabled = false`, and snap draw positions to whole pixels.
- **Placeholder-first is still the law.** Every entity draws a colored labeled shape every frame until real art lands, and every image load falls back to that shape (playbook hard rule — a missing file must show a box, never a blank).
- **Spritesheet when count grows.** Dozens of tiny PNGs = dozens of requests and load-order bugs; consolidate to an atlas once the set stabilizes.

---

## Part 6 · Close the loop: you must SEE your render *(FI, non-negotiable)*

An AI that looks at its own output iterates about five times faster than one drawing blind. Every art session runs this loop:

1. **Build a screenshot harness once** — a page/script that boots the game, jumps straight to any scene (a debug hook like Crookémon's `GAME.__show(sceneId)`), and captures every room/scene into one contact sheet (`ui_shots.html` pattern). Godot: headless screenshot per the playbook Part 3.
2. **Render → look → diff → re-render.** Adjust the code, re-shoot, compare. Because Part 3 art is deterministic, any pixel change you see is a change you made.
3. **Verify in the real run state** — the scene with the player in it, HUD on, real save data; not just in isolation. Zero console errors, zero failed asset requests (this is the playbook's Phase 2 build check applied per art pass).
4. **Director sign-off happens on those full-size in-game screenshots** via a review artifact (Keep/Tweak/Revert per item, like 2342's `polish-review.html`), and the exported answers drive the next pass.

---

## Part 7 · Beyond the browser

The doctrine is engine-independent — only the vocabulary changes:

- **Godot:** systematic art = `_draw()`, `Polygon2D`, shaders, TileMap with per-tile modulate, procedural generation into textures; singular art = imported sprites on the 2342 rules (small viewport, integer upscale, palette-locked). Theme constants live in a `.tres` resource so they're data, not magic numbers.
- **Any engine:** the invariants are the same five — systematic/singular split, one theme source of truth, art drawn from simulation data, deterministic detail, screenshot-verified approval.

---

## Anti-patterns — refuse these on sight

- **The re-roll loop:** regenerating a whole image to fix one detail of systematic art. That's the signal you're on the wrong process — switch to code.
- **One-piece scene paintings** for any space the player walks in. Retired in Crookémon; don't reintroduce them.
- **Approving crops or generator previews.** Full size, in the game, or it isn't approved.
- **Palette drift / mixed fidelity:** any asset that ignores the theme module, or a 32px sprite next to a 128px one.
- **Unseeded randomness in draw calls** — shimmering scenes, unreproducible screenshots.
- **Art that owns layout.** Layout lives in code/data (grid, collision, theme); art conforms to it, never the reverse.
- **Referencing ungenerated files.** The placeholder fallback is mandatory; a blank screen is always a process failure, not an art failure.
