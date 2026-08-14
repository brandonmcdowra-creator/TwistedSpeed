# Twisted Speed — Asset Bible (v3 “Night Circuit”)

**Direction:** Twisted Metal: Black vehicle archetypes + weapon fantasy × Need for Speed Unbound/Heat night-street graphics and handling, with an original **Freedom Ladder** fiction.

**Research lock:** See `DESIGN-RESEARCH.md` (2026-07-27). One-line fantasy: *Drive like Heat, kill like Black, finish like a prison break.*

**Pillars**

1. **Every rig is a sentence** — drivers are convicts racing for parole; vehicles are mobile death warrants.
2. **The track is the warden** — hazards hunt, don’t just decorate.
3. **Speed is armor and sin** — NFS nitro, heat, and drift; TM Black ramming and weapon loadouts.
4. **Neon over rust** — wet asphalt reflections, hot pink danger, electric cyan freedom, scrap amber.
5. **Hazards punish, don’t brick** — slow and/or damage only; no idle solid roadblocks (HP 0 is the only full stop).
6. **One shared kit + one special** — MG / rocket / mine for all; per-rig signature with recharge (TM Black pattern).

Palette lock (STYLE-CONTRACT): void `#0a0610`, asphalt `#1a1522`, danger `#ff2d55`, freedom `#00e5ff`, scrap `#ff9f1c`, brawler `#c45c26`, rival `#39ff14`, warn `#ffe66d`.

---

## Creative twist (not a clone)

| Source | We steal | We twist |
|--------|----------|----------|
| TM Black | Archetype loadouts, personality per car, weapon inventory | No Sweet Tooth IP; original “Sentences” cast; weapons leave lasting track scars |
| NFS Unbound/Heat | Night city glow, custom liveries, nitro, heat/wanted | Heat is **Warden Attention** — track AI gets meaner, not cops |
| Mario Kart | Active environment | Hazards *target* leaders; yellow-warn → red-kill timing |
| Running Man | Televised death sport | 13 nights; each finish unlocks one chain of the ladder |

Working title for the campaign mode: **THE NIGHT CIRCUIT** — “Win freedom. Or become the highlight reel.”

---

## Vehicle roster (6 playable + rivals)

Stats: **SPD / ARM / FIRE / HAND** (1–5). Mass affects ram damage.

### 1. MARROW — Balanced Brawler (default hero)
- **Role:** All-rounder muscle coupe, spiked fenders, dual roof MG, rear rocket pods  
- **Stats:** 3 / 3 / 3 / 3  
- **Signature:** “Bone Harvest” — short dual-rocket volley after a ram  
- **Livery:** Burnt rust orange `#c45c26`, scarred chrome, red underglow  
- **TM echo:** Roadkill / Outlaw hybrid  
- **Mesh:** `assets/models/marrow.glb`

### 2. NEEDLE — Glass Cannon Speedster
- **Role:** Open-wheel dune interceptor, paper armor  
- **Stats:** 5 / 1 / 2 / 4  
- **Signature:** “Thread the Vein” — harpoon that tethers rival for 2s  
- **Livery:** Matte black + cyan `#00e5ff` pinstripes  
- **TM echo:** Spectre / Axel lite  
- **Mesh:** `assets/models/needle.glb`

### 3. MAUSOLEUM — Armored Crusher
- **Role:** Wedge tank on truck chassis  
- **Stats:** 2 / 5 / 4 / 1  
- **Signature:** “Last Rites” — frontal mortar lob that cracks asphalt (slow AOE)  
- **Livery:** Funeral grey plates, scrap-gold rivets `#ff9f1c`  
- **TM echo:** Darkside / Monster  
- **Mesh:** `assets/models/mausoleum.glb`

### 4. VESPER — Ghost Coupe
- **Role:** Low sports car, EMP + smoke  
- **Stats:** 4 / 2 / 2 / 5  
- **Signature:** “Blackout Kiss” — pulse that drops rival weapons 3s  
- **Livery:** Readable night violet `#7b4ec8` (not near-black), pink `#ff4d7a` edge light  

- **TM echo:** Mr. Grimm stealth energy  
- **Mesh:** `assets/models/vesper.glb`

### 5. CHOIR — Disruptor Van
- **Role:** Tall support van, area denial  
- **Stats:** 2 / 3 / 4 / 2  
- **Signature:** “Sermon” — sonic ring that flips light cars  
- **Livery:** White washed with graffiti neon  
- **TM echo:** Thumper / Minion utility  
- **Mesh:** `assets/models/choir.glb`

### 6. RAZORBACK — Off-Road Rival Boss
- **Role:** Spiked buggy pack leader  
- **Stats:** 4 / 2 / 3 / 3  
- **Signature:** “Tire Choir” — deploys caltrops in a fan  
- **Livery:** Toxic green `#39ff14` cage  
- **TM echo:** Twister / Roadkill rival  
- **Mesh:** `assets/models/razorback.glb`

---

## Weapon kit

| ID | Name | Type | Fantasy | VFX color |
|----|------|------|---------|-----------|
| `mg` | Chatterbox | Hitscan-ish projectiles | Twin hood/roof MGs | Warm white tracers |
| `rocket` | Bone-Seeker | Slow projectile | Homing after lock beep | Orange trail `#ff9f1c` |
| `mine` | Widow Egg | Dropped, arm delay | Proximity scrap mine | Cyan arm ring |
| `emp` | Blackout | Pulse AOE | Vesper only default | Violet flash |
| `harpoon` | Vein Hook | Tether | Needle signature | Cable + spark |
| `mortar` | Last Rites | Arc AOE | Mausoleum | Smoke pillar |
| `sonic` | Sermon | Expanding ring | Choir | Sound-wave cyan |
| `napalm` | Red Eucharist | Trail | Optional upgrade | Pink fire `#ff2d55` |
| `ram` | Chassis | Contact | All | Sparks + screen punch |

**NFS-style systems (all cars)**

- **Nitro (Afterburn):** short burst; fills from drafts + wrecks  
- **Heat / Warden Meter:** aggression + weapons raise meter → spike density up, searchlights, EMP storms  
- **Drift score:** holds nitro fill (arcade Unbound energy)

---

## Environment assets — Night Run 01 “CITY → THROAT → GATE”

Three zones, one loop:

1. **Neon Sepulcher (City)** — wet streets, vertical signs, billboards of failed racers  
2. **The Throat (Industrial)** — underpass, pipe steam, collapsing bridge hazard  
3. **Freedom Gate (Mountain)** — cliff highway, cyan gate pylons, finish arch

### Hazards (living track)

| Hazard | Tell | Kill | Mesh/VFX |
|--------|------|------|----------|
| Spike teeth | Yellow 1.0s | Red deploy | `spike_bank` |
| Electrified dune | Cyan crackle | Slow + DoT | `elec_dune` |
| Searchlight | Beam sweep | Warden +heat | light only |
| Oil bloom | Dark slick | Spin | decal |
| Guillotine gate | Siren | Instant if late | `guillotine` |
| Rival ghost pack | Green silhouettes | Ram AI | Razorback clones |

### Set dressing (priority)

- Street lamps (neon pink/cyan pairs)  
- Ruined cars as barriers  
- Scaffolding + hanging chains  
- Mountain rock silhouettes  
- Finish gate arch with freon-cyan bars  
- Scrap pickups (glowing twisted metal chunks)

---

## LODs & delivery paths

| Path | Format | Consumer |
|------|--------|----------|
| Hero glTF | `.glb` mid-poly | `web/` Three.js + Unity import |
| Unity prefabs | URP Lit materials | Editor NightRun scene |
| Procedural fallback | Three.js primitives | Always available if glTF missing |
| Concept stills | Imagine / screenshots | Design Lab, marketing |

**Poly budgets (hero vehicles):** ~3–8k tris game-ready; hard edges + bevel; no subdivision-only.

**Export scale:** 1 unit = 1 meter; car length ~4.2–5.5 m; origin at ground center under chassis.

---

## Build order (this session → next)

1. **Bridge** Unity Pipeline + Grok MCP  
2. **Marrow** hero mesh + weapons hardpoints in Blender → export glb  
3. **Needle + Mausoleum** body blocks  
4. **Weapon props** rocket, mine, MG barrels  
5. **Unity** folders, NightRun scene scaffold, materials  
6. **web/** load glTF, upgrade lighting, nitro/heat VFX  
7. Remaining roster + track kit

---

## Naming / IP safety

Do **not** use: Sweet Tooth, Twisted Metal logos, NFS logos, licensed cars.  
Use original names above. Tagline OK: “Twisted Speed” (FI project title).

---

## Success look

A still from hood-cam at night: wet asphalt mirrors pink neon; Marrow’s rust orange body is lit from below; a yellow spike bank warns ahead; a green Razorback drafts left; cyan Freedom Gate glows far up the mountain. Feels like **Unbound photo mode** with **Black’s bloodsport**.
