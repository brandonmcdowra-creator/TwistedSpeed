# FutureIndustries Craft Playbook

You are building a FutureIndustries game. This is the studio's distilled craft guide — read it before you write code, and keep it in context while you build. The human you work with is the **director**: they own the uniqueness call, the one core verb, and the pacing. **You are the builder**: you write the code, generate the art, run the game, and report what to playtest. When generic advice conflicts with a rule marked *(FI)*, the FI rule wins — it was paid for in shipped games (2342, a Godot survivor-roguelike; Confluence Colony, a browser cozy colony sim in the `NileInSpace` repo).

The whole point of this playbook: turn "prompt-to-game slop" into a game built with craft. Do not ask the director to "make a fun game." Serve one deliberate hook, ship one complete loop, and juice the action they'll repeat a thousand times.

**Run the build as a single scripted pass — see [Part 5 · The build protocol](#part-5--the-build-protocol-your-top-level-procedure). It is your top-level procedure; the rest of this playbook is how to do each phase well.**

---

## Part 1 · Universal craft

### The core loop: one verb, one loop
- Name the **single most-repeated action** in one sentence before writing any system (shoot, harvest, place-a-building, dodge). That verb is the game. Everything else is scaffolding around it [4].
- Polish that verb **first and most**. The 30-second loop is repeated hundreds to thousands of times; a loop that's merely "fine" compounds into boredom, a loop with a crisp anticipation→action→reward beat compounds into "one more run" [4].
- You author *mechanics*; fun is an emergent output you tune indirectly. Before building a system, write its one-line **target feeling** (tension, discovery, mastery, coziness) and the dynamic that produces it. If a proposed mechanic maps to no named feeling, cut it [1].
- *(FI)* Confluence's pillar: **every session = one bottleneck → one action → one reward.** Make one asymmetry the engine of the whole game. Confluence's honest audit found its systems all "worked but were optional" because the colony could make everything — the entire overhaul was adding a random raw-resource hand so every session forces a real choice. Ask: *what forces the player to choose this session?*

### Game feel & juice: feedback on every action
- Keep the **input→feedback loop under ~100 ms**. Start the response on the *same frame* as the input; layer animation on top. Never gate an action behind an animation that must finish before the game reacts [2].
- Separate the **simulation layer** (movement/collision/physics constants, in one place) from the **polish layer** (particles, shake, sound as decoupled listeners on game events) so you can tune each independently [2].
- On every core action emit a **bundle** of feedback on one event: a flash, a particle burst, a short directional screen-shake (0.1–0.3 s, randomized dir, eased taper), camera kick opposite the action, knockback/recoil on both actor and target, and a sound. No single effect matters — the accumulation creates the feel [5].
- **Never move things linearly.** Route every UI transition, camera move, and object motion through an easing curve — ease-out for arrivals, elastic/overshoot for playful bounce, sharp exponential for hits. Linear lerp reads as robotic and cheap [5][3].
- **Hit-pause:** freeze the involved sprites ~2–6 frames on significant hits (scale to impact). Freeze only the affected actors, not the whole game — a global sleep stacks badly when many things die at once [5].
- **Every juice effect must echo a mechanic.** Reserve the strongest feedback for the most important events; scale intensity to magnitude. For each effect name the mechanic it reinforces — if none, delete it [3].
- **Audio is half of juice.** Attach a sound to every meaningful action, mix gameplay SFX above ambience, and randomize pitch/volume ±~10% so repeats don't sound robotic. Layer a quiet ambient bed under everything [3][26].
- **Forgiveness is invisible feel:** add coyote time (~5–8 frames after leaving a ledge) and input buffering (~6–9 frames before an action becomes valid). Players never see these — they just feel "tight" [6].
- **Exaggerate.** Bigger/faster projectiles, squash-on-land and stretch-on-launch, subtle sine idle-bob so nothing on screen is perfectly static. Realistic proportions feel dead [3].

### Scope & the v1 vertical slice
- Build a **vertical slice, not a horizontal one**: one representative chunk (one 2342 wave, one Confluence day-cycle) polished end-to-end through every layer — input, mechanic, art, audio, UI — before you add a second content type. Do not scaffold ten systems at 20%; finish one at 100% and clone it [7].
- *(FI, hard gate)* **Ship a complete loop before adding any feature.** The submission bar rejects "tutorial-scene-only" / demo-tier outright. A complete loop = menu → core loop → win/lose outcome, runs start-to-finish with no dev tools, has a clear goal and a fail/success state, and gives 5+ minutes of non-identical play. Verify this each session (it's CURSOR-RULES rule #6).
- Over 70% of indie devs who slipped or abandoned blamed **scope too large** — games die from taking too long, not from being bad [7]. Sort every feature into **Must / Should / Could / Won't**, build all Musts to shippable quality first, and keep the Won't list written down [7]. Timebox each feature; at the deadline ship the simplest version, cut it, or defer — never silently extend [7].
- **Cut to the core** (Derek Yu): keep deleting until you hit the edge of what makes the game good — everything past that edge is fluff [8]. New mid-build ideas go in a `NEXT-GAME.md` backlog, not this build [8]. Don't restart to "do it right" — make surgical fixes and push into unbuilt content [8].
- *(FI)* **Cap breadth until the core is fun.** Freeze the content count (2342's rule: "stop at 5 weapons until it's fun"; Confluence: one bottleneck) and iterate on *feel* first. Reuse sprites via tint/scale as placeholders, swap in distinct art in a later batch. Adding content before the base feels good just multiplies slop.
- *(FI, hard rule)* **Never render nothing — every entity draws a placeholder.** Build the whole game on visible primitives first: each entity draws a colored rectangle/circle (labeled if helpful) *every frame*, before any real art exists. Load images with a fallback — if the file is missing or still loading, draw the placeholder shape, never a blank space. This makes "the game boots to sound and a background but no graphics" structurally impossible (that failure = the code referenced art that wasn't generated yet and drew nothing). Real sprites swap in during the art pass; the game is playable and *visible* the entire time.
- Fall in love with the *game*, not the tools. Prefer the boring engine path (Godot for 2342, plain HTML/JS for Confluence). Hardcode before you generalize; refactor only on the third real use. Crude, messy, shipped beats elegant and unfinished [8][9].

### Difficulty & onboarding: teach without walls of text
- Respect the **~3-item working-memory limit** while the player is learning. Never stack introductions: teach movement in a safe space, *then* one enemy, *then* one hazard. Introduce exactly one new variable at a time, then combine [11][16].
- **Show, don't tell.** Teach mechanics through the world — a demo enemy, an obvious affordance, a glowing ledge — not "Press X" modals. Reserve modal text for truly non-inferable systems [12].
- Each new mechanic gets a **three-beat micro-level**: (1) consequence-free practice, (2) a trivial application, (3) a real encounter that requires it. **Never punish during the learning window** — widen hitboxes/timers/costs during onboarding, tighten later [12][11].
- Shape difficulty as an **oscillating sawtooth**, not a straight ramp: after each spike, script a ~20–40% easier recovery beat so the player feels powerful and consolidates the skill. In 2342 follow a tough wave with a loot/breather wave; in Confluence follow a crunch with a surplus stretch [13].
- Keep challenge **slightly above** proven skill — tune so the player wins on the 2nd–3rd attempt at a new threat, off a running skill estimate (waves survived, upgrades owned, wealth), not a fixed clock [14].
- **Fair, not punishing:** telegraph every lethal threat (wind-up, audio tell, tinted zone), and on death show the specific cause. Frustration that kills retention comes from unclear death, not raw difficulty [15].

### Session design
- Optimize for **time-to-fun**: skip splashes/menus into an instant playable state, defer account/settings/lore, and guarantee a satisfying win (a cleared wave, a first built structure) within the first 60–90 s. First-session success predicts retention more than anything else [17].
- Target a **bounded loop** (a 3–8 min 2342 run; a discrete Confluence day) with a **one-input restart** — no reload wait, no repeated intro. Persist meta-progress so returning players feel forward momentum [18].
- Drip-feed complexity: lock advanced buildings/weapons/HUD panels behind the basics; show the empty slot to tease depth ("show the lock before the key") [11].

### Anti-slop & uniqueness *(FI — non-negotiable)*
AI can only remix its dataset; unconstrained, it converges on the mean and reads as soulless [29]. Uniqueness has to be *authored*. Before feature work, the director answers three questions in one sentence each, stored in `ai_manifest.json → uniqueness_answers`:
1. **Differentiator** — what can players do here they can't in the closest genre hit?
2. **Rejected suggestion** — name one AI proposal you rejected as clone/slop. (You, the builder, must actively flag when your own idea resembles 2342 or Confluence so there's a real one to cite.)
3. **Why play twice** — what changes between session 1 and session 2?

Vague answers auto-flag. Inject one deliberate human hook the training data can't supply and make it non-negotiable in the design doc [29].

- **Enforce audiovisual cohesion:** one resolution/palette/pixel-density and one audio character, chosen up front. Reject any asset that doesn't match. A smaller consistent set beats a large mismatched one.
- *(FI)* **Visual polish first wins playtests.** If it doesn't *look* like a real game, mechanics won't save it. 2342 deliberately deferred deep mechanics (banish UI, carrier drones) until it looked finished. Do a graphics/juice pass early — parallax, HUD bars, feedback toasts, kill VFX — and weigh "does this read as a shipped game in a screenshot?" above adding the Nth mechanic.

---

## Part 2 · Browser track (reference: Confluence / `NileInSpace`)

**Architecture — single page, no build step.** One `index.html`, native ES modules under `js/`, `css/`, `assets/`. One module per concern. Confluence's real split: `state.js`, `config.js` (all tunable tables/data), `production.js`, `contracts.js`, `trade.js`, `ui.js`, `station.js` (render), plus `cloud.js` for the optional server. Canvas 2D or DOM for rendering; `requestAnimationFrame` for scheduling. Add a framework only when a concrete need forces it [32].

**One authoritative state module.** `update()` mutates state; `render()` only reads it; input only queues intents into a buffer. This single source of truth makes save/load, replay, and debugging tractable — never mutate game state from a render or input handler [32].

**The game loop — decouple update from render.** For anything action-paced, do *not* multiply by raw rAF delta (120 Hz players move twice as fast; low FPS tunnels collisions). Use a fixed-timestep accumulator [30][31]:

```js
const FIXED_DT = 1000 / 60;
let acc = 0, last = performance.now();
function frame(now) {
  let elapsed = Math.min(now - last, 250); // clamp to avoid spiral of death
  last = now; acc += elapsed;
  while (acc >= FIXED_DT) { update(FIXED_DT); acc -= FIXED_DT; }
  render(state, acc / FIXED_DT); // pass alpha to interpolate prev→current
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```
Interpolate rendered position between the two most recent sim steps using `alpha` so 144 Hz displays stay smooth without touching determinism [31]. *(FI)* A cozy/turn sim like Confluence needs less: it runs a **1 s logic tick** (`setInterval`) for the economy plus a separate rAF render loop — same principle, decoupled update and render.

**Save / load.** Serialize an **explicit, versioned schema** — never the whole runtime object, or the first refactor breaks every save [33]:
```js
const save = { version: 3, timestamp: Date.now(), /* hand-picked fields */ };
localStorage.setItem(KEY, JSON.stringify(save));
```
On load, read `version` first and run forward-migration functions, then validate. Wrap every read/write in try/catch (localStorage throws `QuotaExceededError`). Autosave on a `setInterval` **and** on `visibilitychange → hidden` (more reliable than `beforeunload` on mobile). Offer export/import buttons for the save JSON [33].

**Optional Python server.** Ship fully client-simulated first (Confluence proves this — each tab simulates its own copy against simulated neighbors). Only bolt on a backend if you need cloud saves/multiplayer, and keep it **stdlib-only** (`http.server` + `sqlite3`) per HOSTING.md. *(FI)* Serve dev via a threaded no-cache server — **never bare `py -m http.server`** (stale-cache + zombie-process hell).

**Cozy-sim rules (Confluence).** No hard timers, no decay/upkeep that punishes absence, no "act now" notifications. Most objectives optional with zero penalty. For async fairness, a late login is never structurally disadvantaged: offline accrues value (Confluence: 50% rate up to a real-hour cap), buffs only go up, and **solo paths net ~80% of social/trade pace** — social = max speed, solo = never blocked [21][22].

---

## Part 3 · Godot track (reference: 2342)

**Bootstrap the engine first — Godot needs it, browser games don't.** A Godot game can't run, verify, or export without the Godot 4 editor/runtime — and it's a **single portable binary, no admin install**. Before the build check:
1. Detect the OS.
2. Check for an existing engine: is `godot` or `godot4` on PATH? Is there a local copy in `tools/godot/`?
3. If none, download **Godot 4 stable** for this OS from the official releases (<https://github.com/godotengine/godot/releases>) and extract to `tools/godot/` — Windows: the `win64.exe` zip → `Expand-Archive`; macOS: the `macos.universal` zip → unzip; Linux: the `linux.x86_64` zip → unzip + `chmod +x`. Verify with `<godot> --version`. **Official godotengine releases only**, and match the version to `project.godot`.
4. Use that binary for ALL engine commands: `--headless --import` (register assets), `--headless --quit-after N` + grep **stderr** (boot check), a headless screenshot (render check), and `--headless --export-release` (the downloadable build).

A **runnable Godot starter already ships in `godot/`** (project + main scene + the three autoloads). Build ON it — edit `scripts/main.gd` into the creator's game; **do not reskin it**.

**Project structure** (2342's real layout): `scripts/autoload/`, `scripts/combat/`, `scripts/ui/`, `scripts/map/`, `scripts/vfx/`; `scenes/`; `data/` (JSON); `tests/`; `assets/sprites/` + `assets/sfx/`.

**Autoloads — three, no junk drawer.** 2342 registers exactly `GameState`, `EventBus`, `AudioManager`. Before adding a singleton, require all three: it survives scene changes, multiple unrelated scenes need it, and passing it manually would only add noise. Everything else stays scene-local and communicates via signals [34]. *(FI, critical)* Keep **`GameState` free of autoload dependencies** so `--script` SceneTree tests can instantiate it directly — those tests **cannot reference autoload singletons by name** (they fail to compile). Store run state as data (2342 holds weapons as an `id → level` dict, not an array).

**Scenes & signals — "call down, signal up."** One script per scene root, named the same as the root; reach children via scene-unique `%Node`, never `get_node("../../Foo")`. A scene must not reach outside itself — expose signals / `@export` properties and let the parent wire dependencies. Children emit `health_changed`, `died`, `item_picked_up`; parents/UI connect and react instead of polling a global every frame [35][34].

**Resource-driven data.** Make content custom `Resource` subclasses authored as **`.tres`** (text — Git-diffable), not hardcoded values or god-dictionaries [35]:
```gdscript
class_name WeaponData extends Resource
@export var damage: float = 10.0
@export var fire_rate: float = 5.0
@export var sprite: Texture2D
```
2342 keeps `data/weapons.json`, `enemies.json`, `cards.json`, `events.json` — **add a data row, not a subsystem**, when adding content.

**delta & processing — the #1 beginner bug.** Put movement/physics/collision in `_physics_process(delta)` (fixed rate); put UI/VFX in `_process(delta)` (variable). Always express speeds as units-per-second and multiply by delta (`velocity += accel * delta`). Use `CharacterBody2D.move_and_slide`, not manual position writes [36].

**Feel levers (2342).** Viewport 640×360, pixel art authored small and upscaled integer-multiple (2× → 1280×720) so bullet-dodging has room. Make anything spatial viewport-relative. Give the player active defense — dash + i-frames, contact-damage ticks — and design boss patterns that **reward movement, not stat-checks**. Reward cadence: something good (XP tick, pickup, level choice, number-go-up) every 2–5 s; dead air kills the feel [5].

**Common anti-patterns to refuse:** autoload junk-drawer; absolute `get_node` paths; movement in `_process` or without `delta`; `.res` binary blobs for editable data; children mutating siblings.

**Godot-4 gotchas that cost real time** *(FI)*:
- Headless verification: run `--import` **first** (registers assets), then boot with `--quit-after N` and grep **stderr** for errors — don't trust screenshots.
- `change_scene_to_file` during `_ready()` throws "parent node busy" → always `call_deferred`.

**Roguelike design (2342).** Generate replayability from **combinations**, not content volume — ~15–25 items × ~10–20 modifiers × a few layout templates yields thousands of runs from little authored content [19]. Randomize what's *offered* (drops, level-up choices, map), never whether a chosen upgrade *works* [19]. Give items tags/triggers (`onHit`, `onKill`, `onBurn`) that chain through the shared `EventBus`; telegraph evolution recipes in UI. Keep meta-progression as **option-expansion** (new weapons/characters/biomes), not permanent stat multipliers — and every failed run yields at least one unlock so failure reads as progress [20].

---

## Part 4 · Working with AI (the FutureIndustries method)

**Human directs, AI builds — draw the line hard.** The "complexity wall" hits when the AI decides *how systems connect*: coupling tangles, debugging needs whole-system understanding, projects get abandoned [24]. So: the director (or a planning pass) fixes scene/file structure, module boundaries, and data ownership; you implement one vertical slice at a time inside that skeleton. Never invent global architecture or refactor across boundaries unprompted [24]. Split ownership: **human owns economy/pacing/uniqueness/"why is this different"; AI owns code + art generation + iteration.**

**The 30-second-playtest cadence — the unit of work.** *(FI)* If a feature can't be playtested in 30 seconds, it's too big — split it. **End every session with a fixed block:** (1) files changed, (2) how to playtest in 30 s, (3) manifest fields to update. If you can't write the 30-s playtest, decompose before coding.

**One feature per session. Run it, don't trust it.** LLMs emit syntactically valid code that is functionally wrong or calls hallucinated APIs — the loop only closes when you actually build/run the game, drive the flow, and feed back concrete observations ("enemy clips wall", "jump feels floaty") [24]. Keep the regression suite green: *(FI)* every real FI artifact ships one (Confluence `sim.html`, 93 checks; 2342 `tests/logic_check.gd` walks 50 generated maps; the platform's smoke(31)+journey(16)). Never let it go red before shipping. Verify an engine API exists before trusting it [24].

**Pin intent, demand small diffs.** Ambiguity is what the model fills with generic invention (a documented agent shipped "space invaders with cats" instead of a match-3). Keep the short design doc in context; for fixes ask for the **smallest change to specific files**, not a rewrite; reject output that adds unrequested features. *(FI)* **Prefer extending existing files over new abstractions** — the analyzer flags a 500-line `main.js` with no modules / god objects / no data layer [24].

**Graphics: read FI-GRAPHICS.md before any art pass** *(FI)*. The doctrine in one line: classify every asset **systematic or singular**. Art that must agree with something — a grid, palette, perspective, collision map, or neighboring asset (interiors, tiles, backgrounds, UI, effects) — is **drawn in code** (procedural Canvas 2D / engine draw calls, one shared theme module, seeded detail, rendered on the collision grid). Only stand-alone **singular** assets (character sprites, portraits, key art, title) go to image generation. A text model can *edit* code but can only *re-roll* an image — if you're regenerating a scene to fix one detail, you're on the wrong process (paid for in Crookémon: every AI-painted shop interior was retired for code-drawn scenes after a director playtest — "use that style everywhere"). FI-GRAPHICS.md has the full playbook: rendering-path table, scene-helper pattern, screenshot-verify loop, anti-patterns. The AI-PROMPTS pipeline below is the **singular-asset lane** of that doctrine.

**The AI-PROMPTS art pipeline.** Build and playtest on **placeholder/primitive art**; spend generation budget on custom art only in the final polish pass — coherence is expensive and you'd waste it on cut features [25]. When you do generate:
- Author a **one-page style brief first**: locked palette tokens, one reference asset that already "feels right."
- Structure every prompt as **subject + style + view + size + game keyword**, e.g. `pixel art knight, silver armor, side view, 32x32, game sprite, limited palette`. A few strong anchors ("16-bit", "limited palette") beat ten vague adjectives ("beautiful", "detailed") which push toward illustration slop [28].
- Reuse **one fixed prompt-suffix** on every asset and **quantize every output to the locked palette** afterward — consistency comes from post-processing, not hoping the model stays on-model [28][27].
- *(FI, hard-won)* The **art template** is the real lesson, not the renderer: sprites must be authored on the exact projection the game assumes. Confluence: "standing centered on a flat 2:1 isometric diamond ground tile whose corners touch the image edges, footprint within the diamond, **no base platform/pedestal**." Free-composition paintings never place correctly no matter the code. Watch orientation (2342's diagonally-authored seeker bullet looked off-axis once projectiles rotate to velocity).
- Every generated asset gets a **traceable AI-PROMPTS entry** (`FILENAME` / `FOLDER` / `SIZE` / `FULL PROMPT`) in a versioned `AI-PROMPTS-*.txt`. Vary prompts meaningfully — the analyzer flags "same prompt ×40" as asset slop. Preserve the generation log so `ai_generated_count` is verifiable.
- *(FI)* No composer? Synthesize audio with a stdlib `make-sfx.py` (2342 ships 15 SFX + an ambient loop this way) so audio never blocks — **a runnable starter version ships in this pack at `tools/make-sfx.py`, and FI-AUDIO.md is the full audio doctrine (synthesize-first, the five primitives, browser unlock gotchas, verify-without-ears): read it before any audio pass.** Batch tools buffer stdout when redirected — check the target folders for progress, not the log.

**Fill `ai_manifest.json` honestly, continuously.** Update code/art/audio/design percents as you build; set `has_complete_loop=true` only when the loop truly closes; record real `playtested_minutes`. *(FI)* **AI-heavy is welcome; lazy is not** — high AI% is fine (Confluence ~68% collaborative, 2342 ~82% AI-native), so there's zero incentive to under-report. Dishonest manifests are auto-declined. It's a transparency badge, not a quality score.

**Keep context fresh — it's perishable.** Re-attach reference files at each phase transition, don't assume the agent still remembers: new week → Academy track + manifest + design doc; before an art batch → the reference game's AI-PROMPTS format; before submit → guidelines + uniqueness answers; after a rejection → analyzer feedback + the linked Academy lesson. Start each chat with "What Academy step am I on? What's next?"

**Structured feedback loop.** After a big pass, generate a review artifact (like 2342's `polish-review.html` — Keep/Tweak/Revert + notes per item, autosaves, exports JSON/MD; or the site's ◎ Annotate → `SITE-FEEDBACK.md`), export it, and re-attach it as the driver for the next session.

---

## Part 5 · The build protocol (your top-level procedure)

Run every FutureIndustries build as **one scripted pass**. Do not skip a phase, and do not present the game as finished until Phase 5 is complete. There is exactly **one approval gate** (Phase 0); after it, run autonomously.

**Phase 0 — Plan, then get approval.** Read BUILD-CONTEXT.md and this playbook. Present the director a short plan — the track (Browser/Godot), the one core verb, the V1 vertical slice you'll build, and the ordered steps you'll follow — and wait for their go-ahead. This is the only interaction gate. Do not start building until they approve.

**Phase 1 — Build V1.** Implement the vertical slice to BUILD-CONTEXT.md on placeholder art: menu → core loop → win/lose, running with no dev tools. Juice the core verb. Follow the "First 10 things" checklist below for step order. **For browser games, a RUNNABLE starter ships in `web/`, chosen to fit your genre** (arcade / puzzle / sim / narrative / neutral) — it boots, renders, and closes a loop. It is a **stage, not a script**: **build ON it — replace the placeholder mechanic in `js/game.js` with the creator's actual core verb from BUILD-CONTEXT.md; do not start from a blank file, and do NOT just reskin the shell.** Modifying working code is far more reliable than greenfield generation and keeps the floor at "a working game," never a blank screen — but if rev-1 is "the shell with different colors and labels," that's a **FAIL**. The plumbing (loop, render, placeholder-draw) is yours to keep; the *play* must become the creator's game.

**Phase 2 — Build check (does it actually run and RENDER?).** Compiling is not "working." Actually launch the game and OBSERVE it — the #1 way an AI ships a broken rev-1 is trusting code it never ran. Write the results to `BUILD-CHECK.md`. Every gate below must pass before you continue; if one fails, fix it now and re-check.
- **Boots clean** — zero errors in the browser devtools Console / engine stderr. Read them. A silent asset 404 or a thrown exception is the usual reason a game boots to a blank or background-only screen.
- **Assets load** — every asset the game references actually loads (browser: Network tab, zero failed requests; Godot: no "failed to load"/"resource not found" in stderr). If any art isn't generated yet, it MUST fall back to a visible placeholder — never reference a file that doesn't exist.
- **It actually renders** — the player AND at least one other game entity are VISIBLY on screen, not just a background, gradient, or sound. **"It has audio and a background but no sprites" is a FAIL, not a rev-1.** Confirm with your own eyes (or a screenshot), not by assuming the draw calls ran.
- **Input responds** — a key/click produces a visible on-screen change.
- **The loop completes** — you can play menu → core loop → a win/lose outcome with no crash.
Browser: open it and read the Console + Network tabs (0 red), then confirm sprites are drawn. Godot: run `--import` first, then boot with `--quit-after N` and grep stderr for errors, or take a headless screenshot to confirm nodes render. Never trust a screenshot-free "it compiled."

**Phase 3 — Self-review, in writing.** With the game confirmed running, answer these **two questions** in `SELF-REVIEW.md`, honestly and specifically, citing exact files/lines. These two are fixed — always ask both:
1. **Completeness** — Is the core loop playable end-to-end (menu → play → win/lose → restart) with feedback on every action? Where does it currently dead-end, break, or feel unresponsive? List each gap.
2. **Uniqueness & feel** — Where does this look like the generic version of its genre? What is the single strongest change, per the unique hook in BUILD-CONTEXT.md, that would make it distinctly *this* game? Name it.

Write the answers before you touch code — externalizing the critique first makes the fix pass far sharper than "silently reconsider."

**Phase 4 — Action your answers (one pass).** Implement the completeness fixes and the one uniqueness change your self-review named. **One revision pass only** — do not loop indefinitely; over-editing degrades a draft. Re-run the Phase 2 build check after your fixes (don't reintroduce a blank screen). Record what you changed.

**Phase 5 — Deliver two artifacts.**
- **The rev-1 game** — boots clean, renders, loop closed, build check passed (`BUILD-CHECK.md`), self-review fixes applied, **and its core mechanic is the creator's own, not the starter shell's placeholder** (a reskinned shell is not a rev-1).
- **`REVIEW-DASHBOARD.html`** — a single self-contained interactive page (inline CSS/JS, no external dependencies; match the game's tone) that surfaces *only what needs the human*. Required sections:
  1. **What I built & verified** — a one-paragraph rev-1 summary, exactly how to run and playtest it in 60 seconds, and your build-check result (what you ran, that it renders, any known issues).
  2. **Self-review results** — your two answers and what you already fixed.
  3. **Needs your call** — every decision you could NOT make yourself (taste, fun, tone, ambiguous spec). For each: the question, why it needs a human, **your best-guess default**, and a text field for the director's answer. Always supply a default so an unanswered item still ships.
  4. **Gaps & clarity** — anything underspecified in the pack that capped quality, with the assumption you made.
  5. **Playtest checklist** — the subjective calls only a human can make (is the core verb fun? does it feel complete? what's missing?), each with a notes field.
  Include an **Export answers** button that downloads the director's inputs (as `REVIEW-ANSWERS.md` or JSON) to feed into the next session for rev 2.

You cannot judge whether the game is *fun* — that is exactly why Phase 5 exists. Determine everything you can yourself; put everything you can't into the dashboard with your best guess. Rev 1 is a strong, self-corrected first draft for the director to react to — not a finished game. Its quality is bounded by your model; do the most you can, and be honest in the dashboard about what you were unsure of.

---

## First 10 things to do when you open a build pack

1. Read **BUILD-CONTEXT.md** (this game: hook, loop, mechanics, style, art list, V1 scope) fully.
2. Read **CURSOR-RULES.md** and this **FI-PLAYBOOK.md**. The pack also ships **CLAUDE.md** (identical **AGENTS.md** for Codex/other agents) — a plain-English rulebook for working honestly with the director that your local AI auto-loads.
3. Pick the track from the deployment field: Godot (2342) → `godot/`, Browser (Confluence) → `web/`.
4. Ask the director **one uniqueness question** (differentiator / rejected clone / why-play-twice) and record answers in `ai_manifest.json`.
5. Name the **one core verb** in a sentence. Confirm it with the director.
6. Define the **V1 vertical slice** — the smallest menu → core loop → win/lose that runs with no dev tools. Sort everything else into Should/Could/Won't.
7. Grey-box that slice on **placeholder art**. Browser: the runnable starter in `web/` already boots and renders — edit `js/game.js` into your game rather than starting blank. Godot: build on placeholder primitives. Get it playable in days, not weeks.
8. Wire the skeleton: browser → `state.js` + fixed-timestep loop + versioned save; Godot → `GameState`/`EventBus`/`AudioManager` autoloads + `data/*.json`.
9. Stand up the **regression suite** (browser checks page / Godot logic test) and a **30-second playtest** for the slice.
10. Juice the core verb — one bundle of feedback (flash + particle + shake + sound) — then report: files changed, 30-s playtest, manifest fields to update.

---

## References

1. MDA Framework — https://en.wikipedia.org/wiki/MDA_framework
2. Game Feel (Steve Swink) — https://en.wikipedia.org/wiki/Game_feel
3. Squeezing More Juice Out of Your Game Design — https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design
4. Compulsion Loop / Core Game Loop — https://en.wikipedia.org/wiki/Compulsion_loop
5. Jan Willem Nijman — The Art of Screenshake — https://theengineeringofconsciousexperience.com/jan-willem-nijman-vlambeer-the-art-of-screenshake/
6. Coyote Time & Input Buffering — https://www.gamejuice.co.uk/articles/coyote-time-input-buffering
7. Scope Creep in Indie Games — https://www.wayline.io/blog/scope-creep-indie-games-avoiding-development-hell
8. Finishing a Game (Derek Yu) — https://makegames.tumblr.com/post/1136623767/finishing-a-game
9. Spelunky Designer: Learn to Finish Games Reliably — https://www.gamedeveloper.com/design/-i-spelunky-i-designer-want-to-be-an-indie-then-learn-how-to-finish-games-reliably
11. The Gamer's Brain, Part 2: UX of Onboarding (Celia Hodent) — https://celiahodent.com/gamers-brain-ux-onboarding/
12. Designing Game Systems That Teach Without a Tutorial — https://gamedevfriends.com/how-to-teach-your-game-without-a-tutorial/
13. Game Design Theory Applied: The Flow Channel — https://www.gamedeveloper.com/design/game-design-theory-applied-the-flow-channel
14. Make It Difficult, Not Punishing (Ricardo Valério) — https://ricardo-valerio.medium.com/make-it-difficult-not-punishing-7198334573b8
15. Mastering the Difficulty Curve — https://www.designthegame.com/learning/tutorial/balance-mastering-difficulty-curve-game-design
16. Difficulty Curves: Getting the Right Balance — https://www.gamedeveloper.com/design/difficulty-curves-how-to-get-the-right-balance-
17. Mobile Game Onboarding UX Strategies — https://medium.com/@amol346bhalerao/mobile-game-onboarding-top-ux-strategies-that-boost-retention-6ef266f433cb
18. Improve Game Retention and Player Engagement — https://www.designthegame.com/learning/tutorial/how-improve-game-retention-player-engagement
19. The Key Design Elements of Roguelikes — https://code.tutsplus.com/the-key-design-elements-of-roguelikes--cms-23510a
20. How to Design a Roguelite Meta-Progression — https://bugnet.io/blog/how-to-design-a-roguelite-meta-progression
21. Cozy Games (Daniel Cook, Lostgarden) — https://lostgarden.com/2018/01/24/cozy-games/
22. The Calming Effect of Low Stakes Games — https://www.gamedeveloper.com/design/the-calming-effect-of-low-stakes-games
23. Designing Video Game Puzzles — https://www.gamedeveloper.com/design/designing-video-game-puzzles
24. Vibe Coding Games: What Ships and What Breaks — https://ziva.sh/blogs/vibe-coding-games
25. How To Finish Every Game Jam (Saeed Gatson) — https://saeedgatson.com/how-to-finish-every-game-jam/
26. Making a Game Feel Juicy with Simple Effects — https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects
27. AI in UI Design: Avoiding 'AI Slop' — https://www.managed-code.com/blog-post/ai-slop-in-design
28. AI Sprite Prompts That Actually Work — https://www.sprite-ai.art/blog/advanced-prompting-tips
29. AI in Games Doesn't Have to Be Slop — https://medium.com/@shenshenlove/ai-in-games-is-inevitable-but-it-doesnt-have-to-be-slop-0d6ed7a19535
30. Performant Game Loops in JavaScript (Aleksandr Hovhannisyan) — https://www.aleksandrhovhannisyan.com/blog/javascript-game-loop/
31. Fix Your Timestep! (Gaffer On Games) — https://gafferongames.com/post/fix_your_timestep/
32. JavaScript Game Foundations: The Game Loop (Jake Gordon) — https://jakesgordon.com/writing/javascript-game-foundations-the-game-loop/
33. Game Save Best Practices for Web Games — https://bugnet.io/blog/game-save-best-practices-web
34. Autoloads Versus Regular Nodes (Godot Docs) — https://docs.godotengine.org/en/4.4/tutorials/best_practices/autoloads_versus_internal_nodes.html
35. Godot Architecture & Organization Advice (abmarnie) — https://github.com/abmarnie/godot-architecture-organization-advice
36. Understanding 'delta' — Godot 4 Recipes (KidsCanCode) — https://kidscancode.org/godot_recipes/4.x/basics/understanding_delta/index.html
