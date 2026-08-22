# Twisted Speed — AAA Night Circuit Marathon Plan

> **For Grok 4.5 (builder):** REQUIRED process: user skill `game-developer` + project skill `.grok/skills/twisted-speed` + domain `combat-racer` + `fi-game-build` / `fi-audio` / `fi-playtest` as you touch those crafts. Primary runtime = **web three.js**. Do **not** dual-implement Unity. Observe every change in a running browser. Work the next unfinished wave. When a wave is done, start the next. When the list ends, run **Wave ∞** until stopped or tokens are gone.

**Date:** 2026-08-14  
**Director:** Brandon (human). Production lead wrote this brief. You are the builder.  
**Repo:** `C:\Users\brand\1. Game Making\twisted-speed-build-pack`  
**Do not use:** `C:\Users\brand\TwistedSpeed` (stale slim copy).  

**Goal:** Make one 8–10 minute Night Circuit run feel AAA, exhilarating, and badass — a cold player should say *I am racing a neon prison at night and my car’s special is a character.*

**Architecture:** Deepen the existing web loop (title → garage → race → results → garage). Do not add a second map, a second engine feature-pair, or a new genre system. Vertical slice, not horizontal sprawl. Specials and combat identity first; presentation only after the loop hits.

**Tech stack:** Vanilla JS + Three.js (`web/`), procedural WebAudio (`web/js/sfx.js`), GLB fleet under `web/assets/models/`, serve with `python -m http.server 8765` from `web/`. Cache-bust `?v=NNN` in `web/index.html` on every ship.

---

## 0. Honest state (2026-08-14 audit)

### What this game actually is
Twisted Speed is a **3D arcade combat-racer** homage (Twisted Metal combat layering × NFS night speed-feel) with **original IP only**. Fantasy lock: *Drive like Heat · Kill like Black · Finish like a prison break.*

| Layer | Status |
|-------|--------|
| Gate A (design) | **OPEN / PASS** — `GATE-A-AUDIT.md` |
| Gate B (art polish) | **Partial** — canyon/arches/road improved; specials not signed; greybox *fun* not formally proven |
| Gate C (shippable 8–10 min slice) | **CLOSED** |
| Primary runtime | **web** Night Circuit **v253** |
| Unity | Exists (`unity/TwistedSpeed/`) as port surface. **Ignore this marathon.** |
| Critic (historical) | ~4.2/10 vs NFS Heat stills (v138). Env has moved since; combat identity has not. |

### What already works (do not rebuild)
- Closed loop: title → garage (5 cars) → Neon Circuit point-to-point → results/scrap → garage.
- Arcade drive: throttle, drift (Space/Shift), nitro (Q), path assist, curb hop, unstick.
- Shared kit: MG (J), rocket (K), mine (L) with garage unlocks / per-car loadouts.
- Soft hazards: spike / oil / debris / electric / sand — punish, don’t brick.
- Stage meta: 13 nights, scrap, NFS-style garage shop, difficulty chill/adventurous/brutal.
- Perf contract already paid for (v247 lag kill): MeshBasic scenery + fake neon; ≤4 PointLights; PBR **hero car only**; post scale ~0.62.
- Env v250–253: START/FINISH arches, canyon density, blue-grey asphalt canvas, cyan edges, wet sheen.
- Fleet GLBs: Marrow, Needle, Mausoleum, Vesper, Choir (+ Razorback as rival mesh). Credits in `docs/CREDITS-MODELS.md`.

### What is lying to the fantasy (fix these)
1. **Specials are parked stubs.** `fireSpecial()` in `web/js/game.js` (~1444) fires toast + cheap FX. No unique meshes, no unique SFX, no camera grammar, no telegraph. Needle tether has **no cable**. Mausoleum mortar is **instant AOE**, not a lob. Choir has **no expanding ring**. Vesper has **no EMP dome**. Razorback special **does not exist** in web (Unity has `TireChoir()`).
2. **Razorback is not playable.** `cfg.cars` has 5 entries. Slice lock is 5–8 cars. Razorback is rival-only.
3. **One physical map, 13 fake nights.** Stage increments numbers and rival stats, but the **course identity does not mutate**. 8–10 min “meaningful” play is not a living warden — it is the same canyon 13 times.
4. **Warden heat is mostly a number.** `cfg.heat` exists; it does not visibly escalate searchlights, spike density, or leader-hunts.
5. **Combat juice is thin.** Hits register; they do not *sell* violence at 50 m/s. Homing rockets + MG + mine is the whole movie.
6. **Audio character is a beep kit.** `sfx.js` is ~195 lines. Engine/drift/weapons exist; special stingers, hazard tells, nitro *event*, finish cyan sting do not feel authored.
7. **`game.js` is a 3362-line god object.** Prefer extract-on-touch (specials.js, combat.js, ai.js) when a wave needs new surface. Do not rewrite the file for sport.
8. **Throat + Freedom Gate maps are parked** (`cfg.maps` is Neon Circuit only). Leave them parked until this one map is excellent.
9. **CHANGELOG is stale** at v149. PROGRESS is the v253 source of truth. Update both every ship.

### Pillars (never compromise)
1. Every rig is a sentence (silhouette + stats + **signature special**).
2. The track is the warden (hazards hunt, don’t decorate).
3. Speed is armor and sin (nitro, heat, drift).
4. Neon over rust (palette in `STYLE-CONTRACT.md`).
5. Hazards punish, don’t brick (no idle solid walls on the driveline).
6. One shared kit + one special.

### Legal red list
No Sweet Tooth, Calypso, TM cast, NFS/EA liveries, cop-faction trade dress, copyrighted music, ripped unlicensed assets. Vesper is a *named-in-credits* McLaren mesh — do not label it McLaren/P1 in UI. Keep credits file honest.

### Perf contract (director: **no lag**)
- Scenery: `MeshBasicMaterial` + emissive fake neon. No extra PointLights beyond 4.
- PBR / MeshStandard only on the **player car** (and maybe 1 nearby rival if FPS allows).
- Do not reintroduce god-rays, 16 light pools, or high-res post.
- If FPS dips: cut mid-canyon density / mid landmarks / rain **before** cutting combat juice.

---

## 1. North star (Gate C target)

A cold 8–10 minute session on **Adventurous**:

1. Boot → title that feels like a televised death sport (not a debug menu).
2. Garage: 6 readable sentences. Pick Marrow. Know Bone Harvest from the card.
3. Drop under the START arch. First 10 seconds: wet canyon, pack around you, engine + rain, FOV selling speed.
4. Fight while racing. MG always. Heavies scarce. **I** fires a special you could identify with the sound off from the VFX alone.
5. Track hunts the leader. Yellow → red. You get punished, not bricked.
6. Finish the Freedom Gate. Cyan sting. Scrap + parts. Next night is **meaner and different**, not a clone.
7. Die once. Still get scrap. Garage spend is meaningful.
8. Two different cars feel like two different games.

**Differentiator (60s):** neon prison race + killing track + special-as-character.

---

## 2. Standing orders for Grok 4.5

### Session protocol (every work block)
1. Read `PROGRESS.md` + this file. Resume the **first incomplete wave**.
2. State in PROGRESS: phase, gate, primary runtime **web**, version you will ship.
3. One observable play goal per block (≤2 minutes of runtime).
4. Implement. Bump `?v=` in **every** `<script src>` and mental model of cache.
5. Serve `web/` on **8765**. Hard-refresh `http://127.0.0.1:8765/?v=NNN`.
6. **Observe** with Chrome DevTools MCP (or curl + screenshot fallback). Click Start, drive, fire weapons, fire special, hit a hazard. Record **confirmed by play** vs **changed, not run**.
7. Append `CHANGELOG.md`. Update `PROGRESS.md` (Now / Next / Known).
8. If a change bricks the driveline, FPS, or boot: revert that change before continuing.

### How to serve
```powershell
cd "C:\Users\brand\1. Game Making\twisted-speed-build-pack\web"
python -m http.server 8765
```
Play: `http://127.0.0.1:8765/?v=<current>`

### How to version
Current cache is **253**. Next ship is **254**, then 255, … never reuse a number. Every `web/index.html` script query and any `?v=` docs must match.

### File ownership
| Concern | Touch these |
|---------|-------------|
| Specials | Extract toward `web/js/specials.js` (new) + `game.js` `fireSpecial` call site + `sfx.js` + `particles.js` + `hud.js` |
| Combat juice | `game.js` projectiles/ram/hurt + `particles.js` + `postfx.js` (shake/flash only) + `sfx.js` |
| Rival AI | Extract toward `web/js/ai.js` (new) from `game.js` rival update |
| Drive / camera / nitro | `game.js` updateRace + `config.js` `drive`/`nitro`/`heat` |
| Living track | `game.js` `makeHazards` / hazard tick + `world.js` only if dress, not solids |
| Roster | `config.js` `cars` + `vehicles.js` + garage HUD |
| Audio | `web/js/sfx.js` first (synthesize). Optional `tools/make-sfx.py` oneshots |
| HUD / title / results | `hud.js` |
| World / arches / canyon | `world.js` — **only in Wave 10+** or if a driveline bug appears |
| Config / balance | `config.js` |

### Forbidden
- Unity feature work
- Second map / restoring Throat+Freedom as separate courses before Wave 7 mutation is good
- IP names or clown-ice-cream trade dress
- New PointLights, SSR, SAO, god-rays
- Silent essential actions
- Hard brick walls / gantries / plaza decks on the ribbon
- “Should work” without a run
- Deleting the director’s work to “clean up”
- Rewriting Three.js / replacing the engine
- Dual-implementing the same weapon in Unity
- Spending a whole block only on docs

### If you get lost
Do the next **special** that is not yet identifiable from VFX+SFX alone. That is always the highest-value work until Wave 1 is signed.

---

## 3. Waves (do in order)

Check a wave off in PROGRESS when its **Exit test** is confirmed by play.

### Wave 0 — Boot & baseline (30–45 min, do first if you have not run v253 this process)

**Goal:** Prove the build still plays.

- [ ] Serve v253, hard-refresh, zero red console errors (favicon 404 OK).
- [ ] Title → Garage → Start. Drive 20s. Confirm no solid slabs in FOV.
- [ ] Fire J/K/L/I. Confirm they do *something*.
- [ ] Note FPS feel (smooth / hitch / slide show). Write it in PROGRESS.
- [ ] If unbootable: fix boot only. Do not start Wave 1 on a dead game.

**Exit:** “I ran it and saw a race.”

---

### Wave 1 — Signature specials are characters (P0, longest high-value wave)

**Goal:** Each playable special is a readable verb with telegraph, unique VFX, unique SFX, camera punch, and a mechanical consequence that is not “toast + 3 rockets.”

**Files:** create `web/js/specials.js`; modify `game.js` `fireSpecial` / updateRace tether; `sfx.js`; `particles.js`; `hud.js`; `index.html` script tag.

#### Shared special grammar
Every special:
1. **Windup 0.12–0.25s** — pose / glow / charge sound (readable, not a cutscene).
2. **Fire** — unique mesh or particle language + `sfx.special<Id>()` + cam shake + FOV kick.
3. **Sustain** if the fantasy needs it (tether, EMP, sermon ring).
4. **Resolve** — rivals show the status (slow / disarmed / flipped / hooked).
5. **Cooldown** — HUD special pip drains then fills. Keep ~8s class unless the effect is huge (then 12–16s).
6. **Never a silent full delete** at mid-range.

#### Per-rig spec (implement all five before calling Wave 1 done)

**MARROW — Bone Harvest**
- Fantasy: ram-adjacent bone volley.
- Do: 3 bone-shaped rockets (not generic orange capsules) with smoke, slight homing, **bonus damage if fired within 1.5s of a ram**.
- SFX: wet crunch + rocket whoosh, lower than stock rocket.
- Fail state: still fires if no recent ram, weaker.

**NEEDLE — Thread the Vein**
- Fantasy: harpoon tether 2s.
- Do: visible cable (line or thin cylinder) from nose to target. Yank: target speed * 0.4, player gets a brief speed steal / draft nitro. Miss = short cooldown (not full) + “NO TARGET”.
- Range ~45m, prefer rival **ahead**.
- SFX: harpoon crack + tension hum while tethered.

**MAUSOLEUM — Last Rites**
- Fantasy: frontal mortar that cracks asphalt.
- Do: **lobbed** projectile (arc, 0.45–0.7s flight) to a ground mark 16–22m ahead. On impact: crater decal (additive ring, life 4s, **not a collider**), AOE slow + damage. Yellow mark on asphalt during flight.
- SFX: thump lob, delayed boom.

**VESPER — Blackout Kiss**
- Fantasy: EMP pulse, weapons down 3s.
- Do: expanding violet dome (additive sphere/ring, 0.4s). Rivals in 30m: `disabledT = 3`, headlights flicker off, no fire. Player windshield chromatic punch.
- SFX: glass-shatter synth down-sweep.

**CHOIR — Sermon**
- Fantasy: sonic ring that shoves light cars.
- Do: **visible expanding torus** (not just particles). Radius 0→16m over 0.35s. Impulse scales **inverse to target mass** (Needle flies, Mausoleum barely shrugs). Light cars get a brief airborne y-pop ≤1.2m then settle (no launch into orbit).
- SFX: distorted choir stab / square chord.

#### Implementation notes
```javascript
// specials.js public surface (keep this shape)
GAME.specials = {
  canFire: function (player) { /* cd + alive */ },
  fire: function (ctx) { /* ctx: state, player, rivals, scene, particles, sfx, cfg */ },
  update: function (ctx, dt) { /* tethers, rings, mortar flights, decals */ },
};
```

Wire `index.html` **after** `particles.js` and **before** `game.js`.

- [ ] Extract `fireSpecial` into `specials.js` without changing balance first (behavior-preserving move).
- [ ] Implement each special to spec.
- [ ] Unique SFX functions; HUD flash of special name stays.
- [ ] Playtest all 5 cars: start race, press I, **see and hear** identity.
- [ ] Bump version, CHANGELOG, PROGRESS.

**Exit (play):** With sound off you can name which car fired. With sound on you can name it from the next room.

---

### Wave 2 — Combat juice at speed

**Goal:** MG, rocket, mine, ram feel expensive and violent without becoming homing-spam.

- [ ] **MG:** tracers + light muzzle flash on the **existing gun meshes** if present; hit sparks on rival; slight cam nudge; overheat already or add a 1.2s overheat if missing (weak infinite with soft limit).
- [ ] **Rocket:** lock beep (optional short) + thicker trail + explosion you can read at night (already have `particles.explosion` — use it, don’t stack 3 systems).
- [ ] **Mine:** arm ring cyan → armed blink pink; explosion + rival hop; player can still hit own mine (skill issue).
- [ ] **Ram:** damage scales with relative speed (already conceptually); add **directional shove**, spark burst, engine dip, 0.15s hitstop-lite (timescale 0.55 for 80ms, then 1 — never linger).
- [ ] Rival HP bars or damage numbers only if they don’t clutter — prefer **body flash + smoke at low HP**.
- [ ] Confirm v244 combat sweet-spot is not lost (hittable, beatable, still bites). If you buff FX only, do not silently buff damage 2×.

**Exit:** A 20-second gunfight in the opening canyon looks like a highlight reel, not debug cubes.

---

### Wave 3 — Rival AI beats (not magic top-speed)

**Goal:** Pack has jobs. Rubber-band via **tools and hazards**, not +40% AI speed.

Roles (assign in `makeRivals`):
| Role | Behavior |
|------|----------|
| Hunter | Draft, sideswipe, ram when beside player |
| Gunner | Hold a lane, fire MG/rockets when player in cone |
| Blocker | Brake-check / occupy the racing line if player is catching |
| Coward | Flee when HP < 30%, drop mines |

- [ ] Extract rival tick to `web/js/ai.js` if the function is >150 lines.
- [ ] Beats: pass attempt, brake-check, pit maneuver, special-if-ready (rivals may fire a **weaker** version of their car special every 12–18s).
- [ ] Difficulty still scales `cfg.difficulties` only.
- [ ] No teleport. No invisible walls. Recovery < 1s if they leave the road.

**Exit:** In 60s you can tell two rivals apart by how they drive.

---

### Wave 4 — Speed is armor and sin (feel + audio)

**Goal:** Nitro is an **event**. Camera sells speed. Audio layers sell the car.

- [ ] FOV eases with speed (if already present, **increase the readable delta** — 62° idle → ~74° at max + extra on nitro).
- [ ] Nitro: FOV kick, underglow surge, speed lines **budgeted** (few, additive, no new lights), unique SFX whoosh + engine scream layer.
- [ ] Drift: tire noise scales with slip; nitro fill already exists — make the **fill pip** and a cyan drip VFX obvious.
- [ ] Heat: HUD warden meter already or add a thin bar. At `hostileAt` (0.72): grade shifts magenta, one extra spike arms near the **leader**, toast `WARDEN EYE`.
- [ ] Engine: rpm-ish pitch vs speed; different mass cars different base pitch (Needle high, Mausoleum low).
- [ ] Finish: **cyan freedom sting** (arpeggio up). Death: down-sweep. Hazard warn: siren/stab.

**Exit:** Boost with eyes closed still feels like boost. Warden heat is visible.

---

### Wave 5 — The track is the warden

**Goal:** Hazards target **leaders**, telegraph yellow → red, never brick.

- [ ] Leader-bias: spike/electric prefer `progress` near whoever is in 1st (player or rival).
- [ ] Guillotine / drop-gate **visual only if it cannot become a solid wall** — prefer a descending neon bar that **slows + damages** on contact (pillar 5). If you cannot do that cleanly, skip guillotine.
- [ ] Searchlight: 1 spot **faked** with a MeshBasic cone or ground card (NOT a new SpotLight if it tanks FPS). Adds heat when it holds the player.
- [ ] Opening 15% of the course stays readable (don’t spawn 6 spikes in the first 3 seconds).
- [ ] Stage ≥ 4: more electric + spikes. Stage ≥ 8: overlapping tells. Stage 1–2: oil/debris tutorial mix (already started — keep).

**Exit:** Leading feels dangerous. Following feels like hunting. Nobody soft-locks.

---

### Wave 6 — Razorback playable (6th sentence)

**Goal:** Slice roster 6/6. Special **Tire Choir** = caltrop fan.

- [ ] Add Razorback to `cfg.cars` with stats 4/2/3/3, mine+MG stock, no rocket (or light rocket — pick one, document).
- [ ] Special: 5 caltrop drops in a rear fan, arm 0.25s, shred tires (speed cap 40% for 2.5s) + small damage.
- [ ] Garage card + demo mesh facing correct (`faceBake` / `?faceAudit=1`).
- [ ] Unique SFX (metal hail).

**Exit:** You can start a race as Razorback and the special is obvious.

---

### Wave 7 — Thirteen nights on ONE map that actually changes

**Goal:** 8–10 minutes of **non-identical** play without a second mesh set.

Mutators (apply 1–2 per night, seeded by `stage`):
- Blood Hour — rain heavier, grip -8%, electric +1
- Blackout — lamps dim, Vesper EMP lasts +0.5s
- Warden Sweep — searchlight always on, heat cool -20%
- Pack Mentality — +1 rival, hunters prefer ram
- Open Vein — more scrap, more mines on AI
- Last Mile — finish 8% longer feel via extra mid hazards, not a longer spline unless cheap

- [ ] Results screen names the **next night’s mutator**.
- [ ] HUD chip during race: `NIGHT 4 · BLOOD HOUR`.
- [ ] Freedom at stage 13 still sets `freed` and plays the freedom scene — make that scene 20 seconds of swagger, not a paragraph.

**Exit:** Night 1 and Night 6 are obviously different in 30 seconds.

---

### Wave 8 — Parole loop (garage / results / fiction)

**Goal:** Menu → play → outcome → return is a **show**, not a spreadsheet.

- [ ] Title: one pulselight, tagline “WIN FREEDOM. OR BECOME THE HIGHLIGHT REEL.” Controls remain readable.
- [ ] Results: placement, elims, scrap, damage taken, specials landed. Eliminations grant a **parts roll** (small extra stat chip) — director lock.
- [ ] Garage: current sentence flavor line per car (one sentence, not lore dump).
- [ ] Death: “THE WARDEN KEPT YOU” + retry / garage. Never a blank canvas.
- [ ] Keyboard only is fine. Touch already partially there — don’t spend a wave on mobile unless broken.

**Exit:** A new player never needs the console.

---

### Wave 9 — Quality toggle + perf lock

**Goal:** Mid-laptop playable. Director machine stays silky.

- [ ] `Q` quality or garage toggle: **LOW** (no rain, no bloom, canyon medium only, dpr 0.85) / **HIGH** (current v253 look).
- [ ] Persist in `localStorage` with saveKey.
- [ ] Measure: log `renderer.info.render` + dt once per 2s in a debug flag `?perf=1`.
- [ ] If HIGH < 40fps on the agent machine, LOW must still look like *this game*.

**Exit:** Toggle works mid-garage; race stays stable.

---

### Wave 10 — Presentation (only after Waves 1–5 exist)

**Goal:** Look closer to Heat **without** breaking the perf contract.

Allowed:
- Facade variety, billboard copy (original — failed racers, parole ads).
- Finish arch ceremony (cyan pulse when `progress > 0.92`).
- Wet sheen already exists — improve **readability**, not SSR.
- Rival underglow color = their accent.
- Mid-canyon height match **if** FPS allows (PROGRESS known item).

Forbidden: new light types, real reflections, photoreal day, Tron grid.

**Exit:** Opening 10s still the money shot; rest of course no longer a drop-off.

---

### Wave 11 — Camera & HUD cinema

- [ ] Cameras C: chase (default), hood, near-chase. Hood must still show weapons hitting.
- [ ] Speed punch on ram / explosion (already shake — add brief FOV).
- [ ] HUD: speed, place, HP/shield, nitro, heat, special, weapon ammo. Night readable. **No essential color-only.**
- [ ] Kill feed one-liner when a rival dies (`MAUSOLEUM WRECKED`).
- [ ] Damage vignette already? If not, thin pink edges on hit.

**Exit:** You can race without thinking about the HUD, and you never miss special-ready.

---

### Wave 12 — Balance pass (numbers, not systems)

- [ ] Adventurous: player can win with skill, lose if they ignore combat.
- [ ] Chill: learn specials. Brutal: pack bites.
- [ ] Needle dies to two rockets. Mausoleum ignores one. Marrow is the teacher.
- [ ] Specials do not delete a full-HP Mausoleum from mid-map.
- [ ] Write the numbers you changed in CHANGELOG.

**Exit:** You beat Night 1 on Adventurous as Marrow in one honest run (or die and can say why).

---

### Wave ∞ — Playtest → fix → juice (never idle)

When Waves 0–12 are checked, **do not stop** and do not invent map 2. Loop:

1. Pick a 90-second play slice (opening canyon / mid fight / finish / garage).
2. Write 3 frictions you felt (or would feel).
3. Fix the worst one. Observe. Ship a version.
4. If fun is signed on Marrow, do the same for Needle, then Mausoleum, then Vesper, then Choir, then Razorback.
5. Recurring hunt list (keep using):
   - Silent action
   - Unreadable special
   - Rival clone-brain
   - Hazard that bricks or is invisible
   - FOV void / black road
   - FPS hitch
   - Garage dead-end
   - Facing-wrong car
   - Homing-only meta
   - IP slip
6. Only if the director later says **`send it!`**: restore Throat / Freedom as **visual theme mutations of the same spline**, not new games.

**Stop conditions (only):** process killed, repo gone, or director says stop. Tokens running low → finish the current ship (version + PROGRESS + CHANGELOG) before dying.

---

## 4. Playtest script (every ship)

1. Hard-refresh `/?v=NNN`.
2. Title visible, no red errors.
3. Garage: select a car you changed. Confirm silhouette + special name.
4. Start. First 5s: road readable, START arch, pack present.
5. Drive, drift, nitro.
6. J, K, L, I — each has flash + sound + world change.
7. Touch one hazard. Yellow tell if spike. You keep moving.
8. If you changed AI: watch 20s of pack.
9. If you changed results: finish or suicide (`R` / crash) and confirm menu return.
10. Write **confirmed by play** in the changelog line.

Chrome DevTools MCP is preferred. If MCP fails, still boot the server and use whatever screenshot/console path you have. Never skip the run.

---

## 5. Suggested first three ships (so you are not paralyzed)

| Version | Wave | Observable in 2 min |
|---------|------|---------------------|
| v254 | 1 start | `specials.js` extracted; Marrow Bone Harvest has bone meshes + unique SFX |
| v255 | 1 | Needle cable visible; Mausoleum lob + crater |
| v256 | 1 | Vesper dome + Choir torus; all 5 specials signed |

Then v257+ = Wave 2 juice, etc.

---

## 6. Success metrics (be honest)

| Claim | Evidence required |
|-------|-------------------|
| “Specials feel like characters” | 5/6 cars, VFX unique, play-confirmed |
| “AAA” | Do **not** say this. Say what you observed. |
| “Exhilarating” | Nitro + combat + warden in one 30s clip of behavior |
| “Slice done” | Gate C checklist in game-developer skill, 8–10 min honest run |
| “No lag” | `?perf=1` + director machine later; agent notes dt |

---

## 7. Handoff one-liner for a fresh 4.5

You are Grok 4.5, builder on Twisted Speed. Read `docs/AAA-MARATHON-PLAN.md`, `PROGRESS.md`, `.grok/skills/twisted-speed/SKILL.md`. Primary runtime web. Start at the first unchecked wave. Ship small versions. Observe every change. Do not touch Unity. Do not add a second map. Keep going through Wave ∞ until you are stopped.

---

*Production lead lock 2026-08-14. Director asked for reigns + a 4.5 marathon. Gates still apply; override phrase remains `send it!` for skipped gates only.*
