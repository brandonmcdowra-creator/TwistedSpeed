# Twisted Speed — Deep Research Brief

**Date:** 2026-07-27  
**Purpose:** Ground the rest of the Unity/Blender build in racing design practice + TM Black + NFS (Heat/Unbound) — not clones, a hybrid with locked pillars.

**Sources (sampled):** Game Design Skills racing design guide; Twisted Metal Wiki (specials, Roadkill/Black); IGN TM Black weapons guide; genre postmortems (car combat decline / Carmageddon lessons); NFS Heat night-run / heat / vanity discourse; pack docs (`ASSET-BIBLE.md`, `STYLE-CONTRACT.md`).

---

## 1. What Twisted Speed is (genre position)

| Axis | Choice | Rationale |
|------|--------|-----------|
| Spectrum | **Arcade racer + vehicular combat** | Sim depth is wrong for weapon juggling; pure arena TM loses NFS race fantasy |
| Win condition | **Finish Freedom Gate → next level**; **eliminations reward** scrap/parts for stats/equipment | TM: eliminate; NFS: place/escape; we blend ladder progress + combat farming (director lock 2026-08-07: 8–10 min slice, 5–8 cars) |
| Fantasy | **Night Circuit parole sport** | Running Man televised death sport × Heat night runs × TM tournament |

**One-line:** *Drive like Heat, kill like Black, finish like a prison break.*

---

## 2. Racing game design (what we must nail)

### 2.1 Speed is a feeling, not a number
Research consensus: FOV, camera motion, particles, audio, and environment parallax sell speed more than raw m/s.

| Technique | Industry use | Twisted Speed application |
|-----------|--------------|---------------------------|
| Wider FOV at speed | Arcade / NFS | Chase cam FOV eases up with velocity (partially done) |
| Camera shake on weapons / impacts | Criterion vehicle talks, GDS | Weapon fire + ram already soft-shake; add pothole/spike punch |
| Environment feedback | Sparks, wet reflections, chevrons | Wet asphalt + neon + chevrons on curves (in progress) |
| Sound progression | Engine → tire screech | **Gap:** synth stabs only; need engine layers + slick whoosh |
| Collision recovery | Never full race-over on bump | Hazards slow/damage; no solid idle walls (**done this pass**) |

### 2.2 Arcade vs sim (we are arcade)
- **Drifts preserve or feed nitro** (Unbound energy) — already partially true.
- **Assists interpret intent** (brake+steer → drift bias).
- **Tracks favor flow:** on-camber feel, wide enough for combat, narrow throats for tension.
- **Collisions bounce and continue** — death only on HP 0 or fail state, not on wall kiss.

### 2.3 AI & tension
- **Rubber-band via tools, not only speed:** shells / boosts / hazards targeting leaders (Mario Kart lesson).
- Prefer: rival aggression up, spike density up, Warden heat — not AI magically +40% top speed.
- **Race beats:** rivals start ahead, mid weave, end push (scripted phase on path progress).

### 2.4 Track design
- Map curves in 2D first; densify with spline (we have `RacePath` + Catmull-Rom).
- **Width:** combat wants room to pass *and* pinch points (Throat).
- **Camber / banking** on curves = next polish (optional).
- Dress before final playtest: same width feels different between two semis vs open canyon.
- **Hazards must telegraph:** yellow → red (TM / MK living track). Never hard-block idle geometry.

### 2.5 HUD
- Always: **speed + race status + health + weapon state**.
- NFS-like dials optional; keep readable night HUD (already IMGUI).
- Turn-in callouts (Burnout-style chevrons) — we place road chevrons; HUD turn arrows = next.

---

## 3. Vehicular combat design (TM + Carmageddon lessons)

### 3.1 Why the genre worked
- **Personality per car** — silhouette, special, story beat.
- **Readable weapons** — unique deploy animation, distinct VFX.
- **Compact arenas with escape routes** (Carma max-damage lesson).
- **Small shared weapon pool + 1 signature special** — easy to learn, hard to master.
- Couch/local energy: short rounds, big moments.

### 3.2 Weapon architecture (from TM Black)
TM Black pattern we adopt:

| Layer | TM Black | Twisted Speed |
|-------|----------|---------------|
| Always-on chip damage | Infinite weak MG | Chatterbox MG (J) |
| Pickup / charge heavy | Rockets, napalm, freeze, etc. | Rockets (K), Mines (L) |
| **Signature special** | Per-vehicle, recharge | Per-rig special (hold or 4th input) — **priority gap** |
| Environment as weapon | Level traps | Spike / guillotine / oil / pothole / Warden lights |

**Rules that keep combat fair while racing:**
1. **Never full wall with idle hazard** — slow and/or damage only (locked).
2. **Speed multiplies ram damage** — impact fantasy (GDS combat note).
3. **Specials recharge, not infinite spam** — ~15–45s class (Roadkill Black ~45s special recharge is a reference upper bound; our arcade slice can be shorter).
4. **Worse drive ↔ better weapons** — already in `VehicleCatalog`; keep strict.

### 3.3 Special weapon design bar (TM Black)
Each special should:
- Be **readable from silhouette** (Marrow spikes, Mausoleum mortars, Needle thin profile).
- Change **decision making** (when to hold vs dump).
- Not delete a full-health rival in one un-telegraphed hit at mid-range (except boss fantasy).
- Leave a **track scar** (our fiction): residual oil, crater, EMP static on asphalt.

### 3.4 Signature map (build target)

| Rig | TM echo | Signature (bible) | Combat feel |
|-----|---------|-------------------|-------------|
| Marrow | Roadkill / Outlaw | Bone Harvest — dual rockets after ram | Balanced volley |
| Needle | Spectre | Thread the Vein — harpoon tether 2s | Glass cannon control |
| Mausoleum | Darkside / Monster | Last Rites — mortar AOE crack | Slow artillery |
| Vesper | Stealth coupe | Blackout Kiss — EMP weapons drop | Mid armor disrupt |
| Choir | Utility van | Sermon — sonic flip ring | Area denial |
| Razorback | Road kill rival | Tire Choir — caltrop fan | Chase denial |

---

## 4. Twisted Metal: Black — what we steal

### 4.1 Core fantasy
- Dark tournament / asylum energy, grotesque vehicles, **each car is a character**.
- Mastery = **drive under pressure + weapon timing**.
- Specials define identity more than paint alone.

### 4.2 Systems to mirror
- Stat axes: **Speed / Handling / Armor / Special** (Black character select used point spreads; we use 1–5 SPD/ARM/FIRE/HAND).
- Infinite weak MG so you always do *something*.
- Heavy weapons as resource.
- Unique special with recharge.
- Dense, vertical, *mean* environments (Black’s city/asylum stages).

### 4.3 What we do **not** clone
- No Sweet Tooth / Calypso IP.
- Not pure deathmatch arena only — we keep **a race spine** (gate finish).
- Tone: Black is horror-gore; we push **neon parole sport** (still grim, less splatter).

---

## 5. Need for Speed (Heat / Unbound) — what we steal

### 5.1 Presentation
- **Night city as star:** wet asphalt, reflections, billboards, sodium + neon, underglow.
- **Garage as fantasy:** turntable, livery, “this is *my* car.”
- Speed feedback: FOV, motion, exhaust, neon streaks (Unbound stylization optional; Heat realism+night preferred for this pack).

### 5.2 Systems
| NFS idea | Twisted Speed twist |
|----------|---------------------|
| Nitro | Afterburn — fill from drift / wrecks |
| Heat / wanted (cops) | **Warden Attention** — track + AI get meaner, not cop cars as primary |
| Night runs risk/reward | Night Circuit nights / Freedom Ladder scrap |
| Customization | Liveries + underglow (gameplay-light vanity later) |
| Wide urban flow | Curved Neon Sepulcher + Throat pinch |

### 5.3 Handling target
- Weight and steer falloff at speed (already softened).
- Drift as **skill expression and nitro economy**, not mandatory.
- Not GT sim; not Mario Kart float — **Heat-adjacent arcade**.

---

## 6. Hybrid pillars (locked for remaining build)

1. **Every rig is a sentence** — silhouette + special + blurb.
2. **The track is the warden** — hazards hunt leaders / heat.
3. **Speed is armor and sin** — nitro + heat from aggression.
4. **Neon over rust** — NFS night paint, TM scars/weapons.
5. **Hazards punish, don’t brick** — slow/damage; lethal only via HP.
6. **One shared kit + one special** — learn once, master per car.

---

## 7. Gap analysis vs current Unity slice (build 5)

| Area | Status | Next action informed by research |
|------|--------|----------------------------------|
| Curved city path | Done | Add banking + mid-curve vistas; keep chevrons |
| Hazard colliders | Fixed | Add leader-targeted spike timing (MK/TM living track) |
| Vehicle catalog tradeoff | Done | Wire **signature specials** with recharge UI |
| MG / rocket / mine | Done | Homing “Bone-Seeker” soft lock beep (TM readability) |
| Warden heat | Partial | Heat tiers → hazard density + rival aggression (not pure speed RB) |
| Rival AI path follow | Done | Add race **beats** by path % |
| Cameras | Done | Speed FOV + impact punch; optional hood vibration |
| Garage | Stub | Livery/underglow vanity; unlocks by night |
| Audio | Weak | Engine layer, slick whoosh, weapon thumps, special sting |
| Special weapons | **Missing** | Highest combat-design priority |
| Ram damage × speed | Weak | Implement contact damage scale |
| Turn callouts | Partial | Path look-ahead HUD arrows on tight bends |

---

## 8. Recommended build order (research → ship)

### P0 — Combat identity (TM Black DNA)
1. Per-vehicle **Special** (hold key or `I` / gamepad bumper) with recharge meter on HUD.
2. Implement signatures for Marrow, Needle, Mausoleum first (hero + glass + tank).
3. **Ram damage** scales with relative speed; small scrap burst on kill already exists.

### P1 — Race feel (NFS DNA)
4. Nitro fill from drift + rival scrap.
5. Heat tiers: 0 calm → 1 oil denser → 2 spikes + lights → 3 guillotine faster.
6. Chase FOV + landing/hazard camera punch; wind/engine audio loop.

### P2 — Living track
7. Spike banks prefer nearest-to-leader trigger (not only timer).
8. Soft banking on RacePath segments.
9. Finish ceremony: cyan Freedom Gate sting + results beat.

### P3 — Presentation polish
10. Garage vanity (underglow color per rig).
11. Light bake / reflection probes on Map1 scene.
12. Choir special + full unlock ladder.

---

## 9. Anti-patterns (reject these)

- Infinite special spam.
- Idle spike teeth as solid walls.
- Rubber-band only as +maxSpeed on AI.
- Photoreal day suburban NFS with TM gore (style clash).
- 20 weapons with no readability.
- Straight ribbon city after curved path investment.
- Dual browser+Unity full rebuilds (prior decision: Unity ship path).

---

## 10. Success criteria for “research-informed” vertical slice

A playtester can say:

1. “Cars feel different to drive **and** to fight.”
2. “The city at night looks like a night run, not a Tron grid.”
3. “I died to spikes I saw coming, not a invisible wall.”
4. “My special felt like *my* car.”
5. “I wanted one more run for scrap / unlock.”

---

## 11. Citation anchors (for humans)

- Racing principles (camera, rubber-band nuance, track width/camber, combat impact): Game Design Skills — *Racing Game Design*.
- TM specials / weapon layers: Twisted Metal Wiki Special Weapon; IGN TM Black weapons guide; Roadkill/Black stats pages.
- Genre lessons: car-combat postmortems / Carmageddon stage density notes.
- NFS night + heat fantasy: Heat community guides (night risk, underglow vanity); pack ASSET-BIBLE pillars.

*This document supersedes informal session notes when they conflict; ASSET-BIBLE roster names and fiction remain canonical.*
