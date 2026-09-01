/**
 * Twisted Speed — Night Circuit config
 * Wet-night neon palette × combat-racer loadouts (original cast).
 */
window.GAME = window.GAME || {};
GAME.config = {
  saveKey: 'twisted-speed-v5-night',
  stageCount: 13,
  // Races are point-to-point (start → finish). Kept for save compat only.
  lapsDefault: 1,

  /** Night mutators — 1–2 per stage, seeded (Wave 7). Same map, different rules. */
  mutators: [
    { id: 'blood_hour', name: 'BLOOD HOUR', desc: 'Heavy rain · grip down · more electric' },
    { id: 'blackout', name: 'BLACKOUT', desc: 'Dim lamps · EMP bites harder' },
    { id: 'warden_sweep', name: 'WARDEN SWEEP', desc: 'Searchlight hunts · heat cools slow' },
    { id: 'pack', name: 'PACK MENTALITY', desc: '+1 rival · hunters ram more' },
    { id: 'open_vein', name: 'OPEN VEIN', desc: 'More scrap · AI drops mines' },
    { id: 'last_mile', name: 'LAST MILE', desc: 'Extra mid hazards · mean finish' },
  ],

  /** Difficulty — scales rivals only (player loadouts unchanged).
   *  v244: sweet-spot pack — hittable, beatable, still bites. */
  difficulties: {
    chill: {
      id: 'chill',
      name: 'CHILL',
      desc: 'Rivals cruise · light fire · room to learn',
      rivalSpeed: 0.82,
      rivalCatchUp: 0.52,
      rivalLeadCap: 0.96,
      rivalFire: 0.62,
      rivalDmg: 0.72,
      rivalCountMul: 0.9,
      rivalProgressLead: 0.05,
      rivalHpMul: 0.85,
    },
    adventurous: {
      id: 'adventurous',
      name: 'ADVENTUROUS',
      desc: 'Fair fight · you can gun them down · they push back',
      rivalSpeed: 0.92,
      rivalCatchUp: 0.68,
      rivalLeadCap: 1.02,
      rivalFire: 0.88,
      rivalDmg: 0.95,
      rivalCountMul: 1.05,
      rivalProgressLead: 0.1,
      rivalHpMul: 1.0,
    },
    brutal: {
      id: 'brutal',
      name: 'BRUTAL',
      desc: 'Aggressive pack · full heat',
      rivalSpeed: 1.04,
      rivalCatchUp: 0.88,
      rivalLeadCap: 1.08,
      // Softened slightly — bites without 5s melt (v287 smoke)
      rivalFire: 1.05,
      rivalDmg: 1.08,
      rivalCountMul: 1.15,
      rivalProgressLead: 0.14,
      rivalHpMul: 1.15,
    },
  },

  /** In-race temporary pickups (do not persist between stages). */
  powerups: {
    types: [
      { id: 'speed', label: 'NITRO+', color: 0x00e5ff, dur: 6.5 },
      { id: 'armor', label: 'ARMOR', color: 0x39ff14, dur: 8 },
      { id: 'guns', label: '2X MG', color: 0xffe66d, dur: 7 },
      { id: 'power', label: 'STOPPING', color: 0xff2d55, dur: 7 },
      { id: 'repair', label: 'REPAIR', color: 0xff9f1c, dur: 0 }, // instant
    ],
  },

  // Exposure / grade targets (post uses these)
  grade: {
    exposure: 1.48, // +hood/chase road read (no new lights)
    contrast: 1.22,
    saturation: 1.08,
    // Neon bloom — still capped to avoid road rainbow wash
    bloomStrength: 0.2,
    bloomThreshold: 0.74,
    vignette: 0.28, // was 0.38 — vignette ate mid-FOV asphalt
    grain: 0.024,
    chromatic: 0.001,
    liftCyan: 0.028,
    liftAmber: 0.016,
  },

  colors: {
    void: 0x05040a,
    fog: 0x0c1018,
    asphalt: 0x121018,
    asphaltWet: 0x1a1e28,
    lineWhite: 0xd8dde8,
    lineYellow: 0xffc857,
    curb: 0x2a2433,
    sidewalk: 0x1c1824,
    building: 0x14121c,
    buildingCool: 0x10161e,
    buildingWarm: 0x1a1410,
    windowWarm: 0xffb347,
    windowCool: 0x8ec8ff,
    neonPink: 0xff2d55,
    neonCyan: 0x00e5ff,
    neonMagenta: 0xff2d88,
    sodium: 0xffb347,
    moonlight: 0xa8b8d8,
    scrap: 0xff9f1c,
    rival: 0x39ff14,
    text: 0xf2e9e4,
    mute: 0x8a7a88,
  },

  // Arcade drive — punchy throttle, weighty top end, readable slip/drift
  drive: {
    accel: 42,
    brake: 62,
    reverse: 14,
    maxSpeed: 54,
    // Near-top accel falloff (0 = linear, 1 = strong curve)
    accelFalloff: 0.55,
    coastDrag: 0.988,
    engineBrake: 0.992,
    // Steering — rate/ease only (no stronger path suction). v278: bite at ~50 without tank/ice.
    steerRate: 2.6,
    steerEase: 13.5,
    // At top speed, retain this fraction of turn rate (understeer)
    steerSpeedFalloff: 0.72,
    // Lateral grip / slip (arcade, not sim)
    grip: 12.5,
    driftGrip: 1.6,       // low grip while drifting = big slide
    driftSteerMul: 1.85,
    driftYawBoost: 2.4,   // strong yaw when holding shift
    driftNitroFill: 0.55, // first-minute fill reads on the HUD bar (v314)
    driftSlipInject: 38,  // lateral kick while drifting
    driftMinSpeed: 5,
    // Slip → yaw coupling when sliding
    slipYaw: 0.95,
    // Visual bank
    bankAmount: 0.18,
    bankDrift: 0.42,
    offRoadMax: 18,
    offRoadDrag: 0.94,
    collisionPush: 9,
    roadHalf: 11.5, // multi-lane
    // Soft assist — only when truly leaving the road (was too aggressive → edge drag)
    pathAssistStart: 0.92, // fraction of roadHalf
    pathAssistStrength: 0.85,
    // Corridor pull only beyond road + this margin
    corridorPullStart: 1.6,
    // Finish — fraction of open course progress
    finishProgress: 0.97,
    // Surface bands (lateral metres from path center) — match world EDGE sidewalk
    curbWidth: 0.65,       // asphalt edge → top of curb
    sidewalkWidth: 3.4,    // full walk band outside curb
    curbHopMinSpeed: 12,   // need real speed to feel the lip
    curbHopSpeedLoss: 0.14, // rumble tax on hop
    curbHopBoost: 0.28,    // short height pop (metres), not a physics spring
    lipMax: 38,            // edge tax vs ~50+ center (not 22 brick, not free 50)
    lipDrag: 0.955,        // continuous scrub on lip
    sidewalkMax: 30,       // deep walk is a real tax (was 38 — edge surfing)
    sidewalkDrag: 0.95,
    sidewalkRumble: 0.035,
  },

  nitro: {
    mult: 1.38,
    capacity: 1,
    drain: 0.34,
    regen: 0.07,
  },

  heat: {
    fromNitro: 0.05,
    fromWeapons: 0.009,
    cool: 0.048,        // base cool
    idleCoolMul: 1.45,  // extra cool when not firing — Eye clears ~8s after fight
    hostileAt: 0.72,
  },

  combat: {
    // Wave 12 balance (Adventurous Night 1 teacher = Marrow)
    // Needle ~2 rockets to kill (HP ~48-55 rivals; rocket 42*muls)
    // Mausoleum shrugs one rocket; specials never full-delete mid-map tank
    playerHp: 120,
    shieldBase: 0,
    rocketDmg: 40,       // was 42 — keeps 2-rocket Needle kill, not one-shot
    rocketRate: 0.85,
    rocketSpeed: 92,
    mineDmg: 46,
    mineRate: 1.35,
    mineArm: 0.5,
    mgDmg: 7.0,          // slight soft — combat still bites with volume
    mgRate: 0.07,
    mgSpeed: 128,
    // Hit volumes (XZ) — was too tight to land shots at race speed
    mgHitR: 3.1,
    rocketHitR: 4.0,
    // v352: enemy return fire must read in fight band (was 2.6 — almost never hit)
    enemyMgHitR: 3.5,
    enemyRocketHitR: 4.0,
    ramDmg: 14,
    invuln: 0.55,
    specialCd: 6.5, // first-minute second Bones still in the same fight (v315)
    // Brief rival stagger on player hits so follow-ups land
    hitStun: 0.42,
    hitSlow: 0.72,
    // Needle stab-bike: mutual damage on pointy ends
    needleStabFront: 26,
    needleStabRear: 20,
    needleStabRange: 3.6,
    needleStabCd: 0.55,
    // Special caps (Wave 12) — bone/mortar/sermon cannot delete full Mausoleum alone
    specialBoneDmgMul: 0.72,
    specialMortarDmg: 24,
    specialSermonDmg: 10,
    specialEmpDisable: 3,
  },

  salvage: {
    cost: 60,
    parts: {
      injector: {
        id: 'injector', name: 'STRIPPED INJECTOR',
        desc: 'Full nitro at green · +25% nitro regen this night',
        fromClass: ['needle', 'vesper'],
      },
      hotFeed: {
        id: 'hotFeed', name: 'HOT FEED',
        desc: 'Special charged at green · −25% special CD this night',
        fromClass: ['marrow', 'razorback'],
      },
      tombPlate: {
        id: 'tombPlate', name: 'TOMB PLATE',
        desc: '+25 shield bolted at green (no generator needed)',
        fromClass: ['mausoleum', 'choir'],
      },
    },
  },

  // Legacy post-race quick upgrades (still work as global small bonuses)
  upgrades: {
    costBase: 30,
    costStep: 18,
    max: 8,
    effects: { speed: 0.1, armor: 0.12, firepower: 0.14 },
  },

  /**
   * NFS-style garage shop — per-car levels + unlocks (scrap currency).
   * type 'level' = stackable; type 'unlock' = one-shot hardpoint/system.
   */
  garageShop: {
    categories: [
      { id: 'engine', name: 'ENGINE', color: '#ff9f1c' },
      { id: 'handling', name: 'HANDLING', color: '#00e5ff' },
      { id: 'armor', name: 'ARMOR', color: '#ff2d55' },
      { id: 'arsenal', name: 'ARSENAL', color: '#ffc857' },
    ],
    items: [
      // —— ENGINE ——
      { id: 'topSpeed', cat: 'engine', type: 'level', max: 6, costBase: 45, costStep: 28,
        name: 'TOP SPEED', desc: '+7% max velocity per level' },
      { id: 'accel', cat: 'engine', type: 'level', max: 6, costBase: 40, costStep: 24,
        name: 'ACCELERATION', desc: '+9% punch off the line' },
      { id: 'nitroCap', cat: 'engine', type: 'level', max: 5, costBase: 50, costStep: 32,
        name: 'NITRO TANK', desc: '+18% nitro capacity' },
      { id: 'nitroPower', cat: 'engine', type: 'level', max: 5, costBase: 55, costStep: 30,
        name: 'NITRO BURN', desc: '+8% nitro thrust · slightly thirstier' },
      { id: 'nitroRegen', cat: 'engine', type: 'level', max: 4, costBase: 48, costStep: 26,
        name: 'NITRO RECOVERY', desc: '+22% passive nitro fill' },
      // —— HANDLING ——
      { id: 'agility', cat: 'handling', type: 'level', max: 6, costBase: 42, costStep: 26,
        name: 'AGILITY', desc: '+10% turn-in / steer rate' },
      { id: 'grip', cat: 'handling', type: 'level', max: 5, costBase: 44, costStep: 28,
        name: 'TIRE COMPOUND', desc: '+12% grip · less slip washout' },
      { id: 'driftTune', cat: 'handling', type: 'level', max: 5, costBase: 46, costStep: 28,
        name: 'DRIFT TUNE', desc: '+15% drift nitro fill · stronger slides' },
      { id: 'brakeTune', cat: 'handling', type: 'level', max: 4, costBase: 38, costStep: 22,
        name: 'BRAKE TUNE', desc: '+12% braking power' },
      { id: 'lighten', cat: 'handling', type: 'level', max: 3, costBase: 70, costStep: 45,
        name: 'LIGHTEN CHASSIS', desc: '−5% effective mass · snappier punch' },
      // —— ARMOR ——
      { id: 'plates', cat: 'armor', type: 'level', max: 6, costBase: 48, costStep: 30,
        name: 'ARMOR PLATES', desc: '+10% max armor HP' },
      { id: 'shieldCore', cat: 'armor', type: 'unlock', cost: 120,
        name: 'SHIELD GENERATOR', desc: 'Unlock energy shield layer (absorbs hits first)' },
      { id: 'shieldCap', cat: 'armor', type: 'level', max: 5, costBase: 55, costStep: 32,
        name: 'SHIELD CAPACITY', desc: '+18 shield points (needs generator)', req: 'shieldCore' },
      { id: 'ramGuard', cat: 'armor', type: 'level', max: 4, costBase: 40, costStep: 24,
        name: 'RAM GUARD', desc: '−12% collision / impact damage taken' },
      { id: 'regenPlates', cat: 'armor', type: 'level', max: 3, costBase: 70, costStep: 40,
        name: 'NANO REPAIR', desc: 'Slow HP regen when cool / out of heat' },
      { id: 'heatSink', cat: 'armor', type: 'level', max: 4, costBase: 46, costStep: 28,
        name: 'HEAT SINKS', desc: 'Faster warden-heat cool-down' },
      // —— ARSENAL ——
      { id: 'mgPower', cat: 'arsenal', type: 'level', max: 6, costBase: 42, costStep: 26,
        name: 'GUN CALIBER', desc: '+12% primary gun damage' },
      { id: 'mgCool', cat: 'arsenal', type: 'level', max: 4, costBase: 40, costStep: 24,
        name: 'FEED SYSTEM', desc: 'Faster fire rate (−9% cooldown)' },
      { id: 'unlockRocket', cat: 'arsenal', type: 'unlock', cost: 100,
        name: 'ROCKET RACK', desc: 'Install homing rockets (light rigs start without)' },
      { id: 'rocketPower', cat: 'arsenal', type: 'level', max: 5, costBase: 52, costStep: 30,
        name: 'WARHEADS', desc: '+14% rocket damage', reqWeapon: 'rocket' },
      { id: 'rocketCool', cat: 'arsenal', type: 'level', max: 4, costBase: 50, costStep: 28,
        name: 'RELOAD RACK', desc: '−10% rocket cooldown', reqWeapon: 'rocket' },
      { id: 'unlockMine', cat: 'arsenal', type: 'unlock', cost: 90,
        name: 'MINE BAY', desc: 'Install rear mines' },
      { id: 'minePower', cat: 'arsenal', type: 'level', max: 4, costBase: 48, costStep: 28,
        name: 'SHAPED CHARGES', desc: '+15% mine damage', reqWeapon: 'mine' },
      { id: 'mineCool', cat: 'arsenal', type: 'level', max: 3, costBase: 46, costStep: 26,
        name: 'DROP SYSTEM', desc: '−12% mine cooldown', reqWeapon: 'mine' },
      { id: 'specialCool', cat: 'arsenal', type: 'level', max: 4, costBase: 60, costStep: 35,
        name: 'SPECIAL COOLING', desc: '−12% special ability cooldown' },
    ],
  },

  /**
   * Garage rigs — mass ↔ armor/firepower tradeoff.
   * Light/fast = thin skin + light guns. Heavy/slow = plates + full arsenal.
   * weapons: which hardpoints exist at stock (upgrades buff numbers, not unlocks).
   */
  cars: [
    {
      id: 'marrow',
      name: 'MARROW',
      role: 'Bone Brawler',
      color: 0xc45c26,
      accent: 0xff2d55,
      // Balanced mid-weight fighter
      stats: { spd: 3, arm: 3, fire: 3, hand: 3 },
      special: 'Bone Harvest',
      specialDesc: 'Triple bone rockets · ram-fed bonus',
      flavor: 'A mid-weight sentence that teaches the pack how bones break.',
      model: 'assets/models/marrow.glb',
      mass: 1.05,
      weapons: {
        mg: true, rocket: true, mine: false,
        mgLabel: 'MG', rocketLabel: 'ROCKET',
        mgDmgMul: 1.0, mgRateMul: 1.0,
        rocketDmgMul: 1.0, rocketRateMul: 1.0,
      },
    },
    {
      id: 'needle',
      name: 'NEEDLE',
      role: 'Stab Bike',
      color: 0x0a0c10,
      accent: 0x00e5ff,
      // Fast glass cannon — pistol only, paper armor, stab is the real weapon
      stats: { spd: 5, arm: 1, fire: 1, hand: 5 },
      special: 'Thread the Vein',
      specialDesc: 'Harpoon tether 2s',
      flavor: 'Glass and knives — if you stop moving, you stop existing.',
      model: 'assets/models/needle.glb',
      mass: 0.55,
      weapons: {
        mg: true, rocket: false, mine: false,
        mgLabel: 'PISTOL',
        mgDmgMul: 0.45, mgRateMul: 1.55, // weak, slightly faster peashooter
      },
    },
    {
      id: 'mausoleum',
      name: 'MAUSOLEUM',
      role: 'Rolling Tomb',
      color: 0x4a4e55,
      accent: 0xff9f1c,
      // Slow fortress — max armor + full guns/rockets/mines
      stats: { spd: 1, arm: 5, fire: 5, hand: 1 },
      special: 'Last Rites',
      specialDesc: 'Lobbed mortar · crater slow',
      flavor: 'A rolling tomb that shrugs rockets and buries the road ahead.',
      model: 'assets/models/mausoleum.glb',
      mass: 1.75,
      weapons: {
        mg: true, rocket: true, mine: true,
        mgLabel: 'MG', rocketLabel: 'ROCKET', mineLabel: 'MINE',
        mgDmgMul: 1.45, mgRateMul: 0.9,
        rocketDmgMul: 1.4, rocketRateMul: 0.95,
        mineDmgMul: 1.35, mineRateMul: 1.0,
      },
    },
    {
      id: 'vesper',
      name: 'VESPER',
      role: 'Phantom Hyper',
      // Sketchfab McLaren P1 MSO (bohmerang) + light EMP kit — credit docs/CREDITS-MODELS.md
      // Violet that still reads at night (was 0x2a1040 — too near-black under matte)
      color: 0x7b4ec8,
      accent: 0xff4d7a,
      // Fast ghost — light armor, SMG only (no heavy ordinance stock)
      stats: { spd: 5, arm: 2, fire: 2, hand: 5 },
      special: 'Blackout Kiss',
      specialDesc: 'EMP pulse 3s',
      flavor: 'A phantom hyper that kisses the lights out of a convoy.',
      model: 'assets/models/vesper.glb',
      mass: 0.72,
      weapons: {
        mg: true, rocket: false, mine: false,
        mgLabel: 'SMG',
        mgDmgMul: 0.7, mgRateMul: 1.25,
      },
    },
    {
      id: 'choir',
      name: 'CHOIR',
      role: 'Sonic Van',
      color: 0xe8e4dc,
      accent: 0xff2d88,
      // Heavy support — thick sides, guns + mines + rockets
      stats: { spd: 2, arm: 4, fire: 4, hand: 2 },
      special: 'Sermon',
      specialDesc: 'Sonic ring shove',
      flavor: 'A white van that preaches in square waves until light cars fly.',
      model: 'assets/models/choir.glb',
      mass: 1.35,
      weapons: {
        mg: true, rocket: true, mine: true,
        mgLabel: 'MG', rocketLabel: 'ROCKET', mineLabel: 'MINE',
        mgDmgMul: 1.15, mgRateMul: 1.0,
        rocketDmgMul: 1.05, rocketRateMul: 1.0,
        mineDmgMul: 1.2, mineRateMul: 0.9,
      },
    },
    {
      id: 'razorback',
      name: 'RAZORBACK',
      role: 'Caltrop Hog',
      color: 0x39ff14,
      accent: 0x1aff80,
      // Fast mid armor — mines + MG stock, no rocket (Tire Choir is the trick)
      stats: { spd: 4, arm: 2, fire: 3, hand: 3 },
      special: 'Tire Choir',
      specialDesc: 'Rear caltrop fan · shred tires',
      flavor: 'Leaves a green hail of caltrops for anyone who drafts too close.',
      model: 'assets/models/razorback.glb',
      mass: 0.95,
      weapons: {
        mg: true, rocket: false, mine: true,
        mgLabel: 'MG', mineLabel: 'MINE',
        mgDmgMul: 1.05, mgRateMul: 1.1,
        mineDmgMul: 1.1, mineRateMul: 1.05,
      },
    },
  ],

  // Neon Circuit solid (v332 90% PASS) → second map THE REACH unlocked.
  maps: [
    {
      id: 'sepulcher',
      name: 'NEON CIRCUIT',
      desc: 'Neon canyon open · dense first stretch · far skyline',
      pointToPoint: true,
      fogDensity: 0.00085, // Wave 2: was eating skyline cards from chase
      ambient: 0x3a4a68,
      ambientIntensity: 2.05,
      moon: 0xc8d8ff,
      moonIntensity: 2.75,
      hemiSky: 0x6080b0,
      hemiGround: 0x2a2030,
      hemiIntensity: 1.45,
      fill: 0xff6a9a,
      fillIntensity: 0.5,
      streetFill: 0x40c0e0,
      streetFillIntensity: 0.48,
      fogColor: 0x152030, // lighter night so horizon mass reads
      bg: 0x080c16,
      groundColor: 0x12161f,
      theme: 'city',
      cleanTrack: false, // progressive soft traps enabled
      grade: {
        // Slightly brighter + more bloom so traps / neon read at speed
        exposure: 1.28, contrast: 1.18, saturation: 1.05,
        bloomStrength: 0.24, bloomThreshold: 0.7, // v420 Heat neon rain punch
        liftCyan: 0.014, liftAmber: 0.01, vignette: 0.28, chromatic: 0.0008,
      },
    },
    {
      id: 'reach',
      name: 'THE REACH',
      desc: 'Coastal dusk · long straights · salt air horizon',
      pointToPoint: true,
      fogDensity: 0.00055,
      ambient: 0x4a3a50,
      ambientIntensity: 1.85,
      moon: 0xffd0a0,
      moonIntensity: 2.2,
      hemiSky: 0x7080a8,
      hemiGround: 0x3a2820,
      hemiIntensity: 1.35,
      fill: 0xff8a50,
      fillIntensity: 0.55,
      streetFill: 0xffb070,
      streetFillIntensity: 0.35,
      fogColor: 0x322838,
      bg: 0x18101c,
      groundColor: 0x242018, // v338: was near-black void under chase
      theme: 'coast',
      cleanTrack: false,
      grade: {
        exposure: 1.22, contrast: 1.12, saturation: 1.08,
        bloomStrength: 0.14, bloomThreshold: 0.78,
        liftCyan: 0.004, liftAmber: 0.014, vignette: 0.28, chromatic: 0.0005,
      },
    },
  ],

  /** P2.1 — progress-gated warden / parole broadcast (Neon only). */
  wardenScript: {
    gates: [0.02, 0.22, 0.38, 0.62, 0.86],
    // skip 0.40–0.55 (lane sweep) and >0.92 (ceremony)
    buckets: {
      early: [ // nights 1–4
        'WARDEN: CARGO ON THE ASPHALT — KEEP ROLLING',
        'WARDEN: YOUR PLATE NUMBER IS NOTED',
        'WARDEN: FREIGHT DOES NOT PRAY',
        'PAROLE BOARD: ONE CLEAN NIGHT BUYS AIR',
        'WARDEN: THE ARCH DOES NOT FORGIVE SLOW',
      ],
      mid: [ // 5–9
        'WARDEN: YOU ARE NO LONGER CARGO',
        'WARDEN: THE PACK TALKS ABOUT YOU',
        'WARDEN: THAT SALVAGE SMELLS LIKE TROUBLE', // beat 2 can swap if activeSalvage
        'PAROLE BOARD: THREAT INDEX RISING',
        'WARDEN: FINISH OR BECOME FREIGHT',
      ],
      late: [ // 10–13
        'PAROLE BOARD: YOUR FILE IS OPEN',
        'WARDEN: THE CITY OWES YOU NOTHING',
        'WARDEN: WEARING A DEAD MAN\'S PARTS — BOLD',
        'PAROLE BOARD: ONE ARCH AND YOU BREATHE',
        'WARDEN: RUN THE LAST MILE LIKE YOU MEAN IT',
      ],
    },
    salvageBeat2: 'WARDEN: YOU\'RE WEARING A DEAD MAN\'S PLATE',
  },

  /** P1.4/v442 — Scrap Line + Wreck Wake dress (Neon). Soft hit params frozen. */
  scrapLine: {
    density: 1,
    maxInstances: 400,
    clearFrac: 0.44, // centre clear — do not tighten without a dedicated build
    hitCd: 0.55,
    hpChip: 3,
    maxDress: 900,
    dressStep: 0.0011,
    // Dress sits on the visible shoulder lip (0.92–1.87× roadHalf), past collidable 0.90 cap.
  },

  /** v442 — ballistic scrap + dust wake (InstancedMesh). */
  debris: {
    playerWake: 0.1,
    rivalWake: 0.22,
    speedNormGate: 0.45,
  },

  /** P2.2 — Sepulcher district fiction chips (Neon HUD placard; not toast). */
  sepulcherDistricts: [
    { gate: 0.10, name: 'INTAKE ROW', code: 'WRDN-03', tag: 'processing · no exit' },
    { gate: 0.26, name: 'FREIGHT SEPULCHER', code: 'SEP-12', tag: 'wait the gap' },
    { gate: 0.66, name: 'HOLDING TERRACES', code: 'HOLD-9', tag: 'stacking yard' },
    { gate: 0.80, name: 'PAROLE MILE', code: 'PAROLE', tag: 'arch ahead' },
  ],

  models: {
    marrow: 'assets/models/marrow.glb',
    needle: 'assets/models/needle.glb',
    mausoleum: 'assets/models/mausoleum.glb',
    vesper: 'assets/models/vesper.glb',
    choir: 'assets/models/choir.glb',
    razorback: 'assets/models/razorback.glb',
    buildingTower: 'assets/models/building_tower.glb',
    streetLamp: 'assets/models/street_lamp.glb',
    billboard: 'assets/models/billboard.glb',
    jerseyBarrier: 'assets/models/jersey_barrier.glb',
  },
};
