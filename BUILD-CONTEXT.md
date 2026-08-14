# Twisted Speed — FutureIndustries build context

**Reconciled:** 2026-08-07  
**Supersedes:** 2026-07-26 export (2D top-down / desert / pixel V1 — **retired**)  
**Authoritative companions:** `DESIGN-RESEARCH.md` · `STYLE-CONTRACT.md` · `ASSET-BIBLE.md` · `.grok/skills/twisted-speed/` · user skill `game-developer`

Developer: creator (director)  
Genre: **Arcade combat-racer** (vehicular combat × night street racing)  
Deployment: **Dual-ship** — browser (three.js `web/`) + Unity URP (`unity/TwistedSpeed/`); shared GLB + design data are source of truth; **one primary runtime per session** (state in `PROGRESS.md`)

---

## Instructions for your AI

1. Load **`game-developer`** (process, gates, override phrase `send it!`).  
2. Load **project skill** `.grok/skills/twisted-speed/SKILL.md` (product locks).  
3. Load domain pack **combat-racer** when implementing systems.  
4. Read **FI-PLAYBOOK.md** before craft work; hand off to `fi-game-build` / `fi-graphics` / `fi-audio` / `fi-playtest` **after** gates allow.  
5. Treat this file + STYLE-CONTRACT + ASSET-BIBLE as the design contract; do not revive retired 2D pixel scope.  
6. Ask one uniqueness check only if locks below are missing or contradictory — then implement the next milestone.

---

## Unique hook

**Night Circuit parole sport:** you pick a sentenced rig (speed vs armor vs firepower tradeoffs), drop into a **living neon city track** that hunts leaders, and fight through to the **Freedom Gate**. Finish advances the ladder; wrecking rivals still pays in scrap/parts so combat is never wasted. The track is a warden, not wallpaper.

## Not a clone because

| Homage pattern | Our twist |
|----------------|-----------|
| TM-style shared kit + signature special | **Original “Sentences” roster** (Marrow, Needle, Mausoleum, Vesper, Choir, Razorback…) — no TM names/characters/liveries |
| NFS night heat / nitro / wet neon | **Warden Attention** (track AI + hazards escalate), not licensed cops/brands |
| Mario Kart living track | Hazards **target leaders**, yellow→red telegraph, **punish don’t brick** |
| Running Man death sport | **Freedom Ladder** fiction — win chains of parole, original broadcast tone |

---

## Elevator pitch

Twisted Speed is a **3D arcade combat-racer**: Need for Speed night-street speed feel crossed with Twisted Metal–style weapon identity — without copying either IP. Choose a scarred neon rig, race the **Neon Sepulcher → Throat → Freedom Gate** loop while rivals and the track try to end you, finish to climb the ladder, or farm eliminations for upgrades. Fantasy: *Drive like Heat · Kill like Black · Finish like a prison break.*

## Player fantasy

Survive the Night Circuit, upgrade your sentence-on-wheels, and taste freedom at the gate — louder, meaner, and one rung higher each clear.

## Design pillars (locked)

1. **Every rig is a sentence** — silhouette + stats + signature special.  
2. **The track is the warden** — hazards hunt, don’t just decorate.  
3. **Speed is armor and sin** — nitro, heat/warden meter, drift feed.  
4. **Neon over rust** — wet asphalt, danger pink, freedom cyan, scrap amber.  
5. **Hazards punish, don’t brick** — slow/damage; never idle solid walls on the driveline.  
6. **One shared kit + one special** — MG / rocket / mine + per-rig recharge special.

### Non-goals

- Sim racing / full Pacejka authenticity  
- Pure arena with no race finish fantasy  
- Open-world sprawl before one map is excellent  
- IP clones (TM/NFS names, characters, logos, near-identical liveries)  
- Dual-implementing the same feature in Unity and three.js in one session without director order  

---

## Core loop (verb chain)

1. **Garage** — select rig (and later loadout/upgrades)  
2. **Drop** into the living night track as Warden heat arms  
3. **Drive** — throttle, drift, nitro; camera sells speed  
4. **Fight** — MG always; heavies scarce; signature special on cooldown  
5. **Survive** hazards (yellow warn → red punish) and rivals  
6. **Resolve** — **Finish** → next level/stage on the Freedom Ladder; **Eliminations** → scrap/parts chance to enhance stats/equipment  
7. **Results → garage** — spend rewards, queue next night  

## Mechanics

| Layer | Spec |
|-------|------|
| **Core** | Drive-and-destroy at speed: arcade handling, ram scales with relative speed, weapons while moving |
| **Combat stack** | Infinite weak MG (overheat) → limited rockets/mines → per-rig special (~15–45s recharge class) → optional shield energy before HP |
| **Progression** | Scrap / parts into speed, armor, firepower (and equipment); finish unlocks ladder steps |
| **Challenge** | Living track (spikes, guillotine, oil, potholes, Warden lights) + rival AI beats; rubber-band via **tools/hazards**, not magic +40% AI top speed |
| **Session length (slice)** | **8–10 minutes** meaningful continuous play per run target |
| **Multiplayer** | Solo for V-slice |

## Style (locked — see STYLE-CONTRACT)

- **Visual:** NFS Heat/Unbound **night street** energy × scarred combat vehicles (not Tron grid, not day suburb photoreal)  
- **Tone:** Neon noir death sport / parole ladder (Running Man × night run)  
- **Camera:** Chase / hood / optional top-down; **FOV eases with speed** + impact punch  
- **Environment:** Neon Sepulcher (city) → Throat (underpass) → Freedom Gate  
- **Art pipeline:** Blender hero/modular GLB → glTF-Transform → web + Unity; procedural/city dress; AI 3D only for free game-changing props with clean licenses  
- **Audio:** Engine layers by speed, tire, ram/weapon impacts, hazard tells, unique special stingers, cyan freedom sting on finish  

## Influences (patterns only)

Twisted Metal Black (combat layering, vehicle identity), Need for Speed Heat/Unbound (speed feel, night, nitro/heat), Mario Kart (active track), Running Man (televised stake). **No trademarked names or trade dress in production.**

## Legal red list (production)

Forbidden in ship/production tree:

- Twisted Metal / Sweet Tooth / Calypso / named TM cast or near-copy clowns  
- Need for Speed / EA liveries, Underground brand marks, cop faction trade dress copies  
- Copyrighted music, ripped commercial assets without license  
- “Temp IP” placeholders that look shippable  

Allowed: original roster names, original weapon labels, homage **systems**.

## Why play twice

- Different rig = different sentence (special + stat tradeoffs change line and fights)  
- Finish ladder vs elimination farming for builds  
- Warden heat / hazard pressure varies run-to-run  
- Mastery of special timing + drift nitro on one excellent map before map 2  

---

## Vertical slice scope (director lock 2026-08-07)

| Item | Target |
|------|--------|
| Play time | **8–10 min** meaningful continuous play |
| Cars | **5–8** playable (bible has 6 named: Marrow, Needle, Mausoleum, Vesper, Choir, Razorback) |
| Map | **One** living loop: City → Throat → Gate |
| Win | **Finish** advances to next level/stage |
| Side path | **Elimination** still rewards gear/stat enhancement chance |
| Systems must-include | Shared MG+rocket+mine, per-rig special, nitro, warden/heat stub, hazard family with telegraph, garage → race → results |
| Perf | Browser: mid-laptop playable tier; Unity desktop full; budgets in game-developer `08-performance-budgets.md` |
| Platforms | **three.js web** + **Unity URP**; shared assets |

### 60-second differentiator

A cold player should feel: *I’m racing a neon city at night while the track and armed rivals try to kill me — and my car’s special is a character, not a reskin.*

---

## Engines and source of truth

| Layer | SoT |
|-------|-----|
| Design | This file + DESIGN-RESEARCH + ASSET-BIBLE + STYLE-CONTRACT |
| Meshes | Blender → `assets/models/*.glb` → copy/import web + Unity |
| Runtime gameplay | **One primary per session** (PROGRESS); port proven systems to the other |
| Web | `web/` three.js Night Circuit |
| Unity | `unity/TwistedSpeed/` URP vertical slice path |

STYLE-CONTRACT pipeline notes: prefer not to dual-rebuild the same feature blindly; web is **not** “legacy discarded” — it is a first-class ship surface under dual-ship policy.

---

## V1 / slice build priority

**P0** Combat identity + signature specials  
**P1** Race feel (nitro economy, heat/warden, FOV/audio)  
**P2** Living track (leader-biased hazards, soft banking, finish ceremony)  
**P3** Presentation (underglow, light quality, unlock ladder chrome)

### Risks and cuts

- Rival AI: pursuit/ram/beats first; deep tactics later  
- If handling slips: keep MG + one heavy before full special set  
- Results/upgrade UI can stay minimal text/cards until loop is fun  
- One hazard family fully telegraphed before five half-hazards  
- AI meshes: free + no surprise billing + game-changer props only; heroes authored  

---

## Art direction (3D — not 32×32 pixel)

Retired: pixel 32×32 brawler/dune prompts from initial FI export.

**Current asset classes**

1. Hero/roster vehicles (GLB, named materials, weapon mounts)  
2. Modular city kit (facades, neon, road pieces) — instance in engine  
3. Hazards (spike, guillotine, oil, pothole) with warn VFX  
4. Pickups (scrap, weapon crates)  
5. Weapon/VFX (tracers, rocket trail, mine ring, specials)  
6. HDRI + wet asphalt materials (Poly Haven / ambientCG CC0 preferred)  
7. HUD: speed, race status, HP/shield, weapon/special state (night readable)

Roster and mesh paths: `ASSET-BIBLE.md`. Credits: `docs/CREDITS-MODELS.md`.

---

## Creator scratch (still true)

Dystopian televised race for freedom; environment is an enemy; no perfect car — trade driving vs weapons; maps escalate; wrong rig can be swapped but upgrades may reset or partial-transfer (balance later). Running Man energy without licensed IP.

---

## Academy / FI track

- Browser craft patterns remain useful for `web/`  
- Unity path is first-class for desktop vertical slice  
- Process gates from **game-developer** override “hack first”  
- Skills: `.claude/skills/fi-*` + `.grok/skills/twisted-speed` + user `game-developer`

## Also in this build pack

- `llms.txt`, `FI-PLAYBOOK.md`, `FI-GRAPHICS.md`, `FI-AUDIO.md`  
- `STYLE-CONTRACT.md`, `ASSET-BIBLE.md`, `DESIGN-RESEARCH.md`  
- `GATE-A-AUDIT.md` — Gate A status (2026-08-07)  
- `PROGRESS.md`, `CHANGELOG.md`, `ai_manifest.json`  
- `tools/FREE-TOOLS.md`, Blender MCP under `tools/blender/`  
- Design Lab: `LOOK-AT-ME.html`, `RUN-DESIGN-LAB.txt`, `fi-design-lab/`  

---

## Full AI expansion (reconciled)

```json
{
  "elevatorPitch": "Twisted Speed is a 3D arcade combat-racer: NFS night-street speed feel crossed with TM-style weapon identity, original cast only. Race Neon Sepulcher to Freedom Gate; finish climbs the parole ladder; eliminations fund upgrades.",
  "fantasyOneLiner": "Drive like Heat · Kill like Black · Finish like a prison break.",
  "coreLoop": [
    "Garage: select rig",
    "Drop into living night track",
    "Drive with nitro and speed-feel camera",
    "Fight with MG, heavies, signature special",
    "Survive warden hazards and rivals",
    "Finish to next level or eliminate for gear/stats",
    "Results to garage and upgrades"
  ],
  "pillars": [
    "Every rig is a sentence",
    "Track is the warden",
    "Speed is armor and sin",
    "Neon over rust",
    "Hazards punish don't brick",
    "One shared kit + one special"
  ],
  "mechanics": {
    "core": "Arcade drive-and-destroy at speed; ram scales with velocity",
    "combat": "Infinite MG overheat, limited rockets/mines, per-rig recharge special",
    "progression": "Scrap/parts upgrades; finish advances ladder",
    "challenge": "Leader-biased living track + rival beats"
  },
  "verticalSlice": {
    "playMinutes": "8-10",
    "cars": "5-8",
    "map": "City-Throat-Gate one loop",
    "finish": "Advances next level",
    "elimination": "Rewards stat/equipment enhancement chance"
  },
  "platforms": {
    "web": "web/ three.js",
    "unity": "unity/TwistedSpeed URP",
    "assetSot": "Blender to GLB shared"
  },
  "legalRedList": [
    "Twisted Metal character/names/liveries",
    "Need for Speed / EA brand liveries",
    "Unlicensed music and ripped assets"
  ],
  "retiredScope": [
    "2D top-down pixel 32x32 V1",
    "Cyber-Mex desert 32-screen loop as primary art",
    "Single brawler-only V1 as final slice target"
  ],
  "risksAndCuts": [
    "Basic rival pursuit before deep AI",
    "One full hazard family before many half-hazards",
    "Minimal results UI until loop is fun",
    "No dual-engine feature pairs without director order"
  ],
  "audioDirection": "Engine layers by speed, tire, impacts, hazard tells, special stingers, cyan freedom finish sting; loops+oneshots before orchestra",
  "uiPhilosophy": "Minimal night HUD: speed, race status, HP/shield, weapon and special state; readable at speed"
}
```

## Audio Direction

Engine layer scales with speed; tire screech on slick/drift; distorted impacts on ram/weapons; hazard sirens/stings on warn; unique special stinger per rig; finish = cyan freedom sting. Loops + one-shots first; no full orchestra required for slice.

## UI Philosophy

Minimal night HUD always showing **speed + race status + health/shield + weapon/special state**. No essential information color-only; no baked text in world textures.
