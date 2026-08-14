/**
 * Twisted Speed — Night Circuit config
 * NFS Heat wet-night palette × TM Black combat loadouts.
 */
window.GAME = window.GAME || {};
GAME.config = {
  saveKey: 'twisted-speed-v5-night',
  stageCount: 13,
  // Races are point-to-point (start → finish). Kept for save compat only.
  lapsDefault: 1,

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
      rivalFire: 1.15,
      rivalDmg: 1.2,
      rivalCountMul: 1.2,
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
    exposure: 1.38,
    contrast: 1.26,
    saturation: 1.1,
    // Neon bloom — still capped to avoid road rainbow wash
    bloomStrength: 0.22,
    bloomThreshold: 0.72,
    vignette: 0.38,
    grain: 0.028,
    chromatic: 0.0012,
    liftCyan: 0.018,
    liftAmber: 0.02,
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
    // Steering
    steerRate: 2.35,
    steerEase: 10.5,
    // At top speed, retain this fraction of turn rate (understeer)
    steerSpeedFalloff: 0.72,
    // Lateral grip / slip (arcade, not sim)
    grip: 12.5,
    driftGrip: 1.6,       // low grip while drifting = big slide
    driftSteerMul: 1.85,
    driftYawBoost: 2.4,   // strong yaw when holding shift
    driftNitroFill: 0.42,
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
    curbHopMinSpeed: 9,    // need some speed to feel the lip
    curbHopSpeedLoss: 0.2,
    curbHopBoost: 0.32,    // short height pop (metres), not a physics spring
    sidewalkMax: 26,       // slower on pavers
    sidewalkDrag: 0.978,
    sidewalkRumble: 0.03,
  },

  nitro: {
    mult: 1.38,
    capacity: 1,
    drain: 0.34,
    regen: 0.07,
  },

  heat: {
    fromNitro: 0.05,
    fromWeapons: 0.012,
    cool: 0.034,
    hostileAt: 0.72,
  },

  combat: {
    playerHp: 120,
    shieldBase: 0,
    rocketDmg: 42,
    rocketRate: 0.85,
    rocketSpeed: 92,
    mineDmg: 48,
    mineRate: 1.35,
    mineArm: 0.5,
    mgDmg: 7.2,
    mgRate: 0.07,
    mgSpeed: 128,
    // Hit volumes (XZ) — was too tight to land shots at race speed
    mgHitR: 3.1,
    rocketHitR: 4.0,
    enemyMgHitR: 2.6,
    enemyRocketHitR: 3.2,
    ramDmg: 14,
    invuln: 0.55,
    specialCd: 8,
    // Brief rival stagger on player hits so follow-ups land
    hitStun: 0.42,
    hitSlow: 0.72,
    // Needle stab-bike: mutual damage on pointy ends
    needleStabFront: 28,
    needleStabRear: 22,
    needleStabRange: 3.6,
    needleStabCd: 0.55,
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
      specialDesc: 'Dual bone-rocket volley',
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
      specialDesc: 'Mortar AOE crack',
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
  ],

  // Scorched-earth foundation (v200): ONE clean map until the track is signed off.
  // Throat / Freedom Gate return after Neon Circuit is solid.
  maps: [
    {
      id: 'sepulcher',
      name: 'NEON CIRCUIT',
      desc: 'Neon canyon open · dense first stretch · far skyline',
      pointToPoint: true,
      fogDensity: 0.0018,
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
      fogColor: 0x0a1220,
      bg: 0x050810,
      groundColor: 0x0c0e14,
      theme: 'city',
      cleanTrack: false, // progressive soft traps enabled
      grade: {
        // Slightly brighter + more bloom so traps / neon read at speed
        exposure: 1.28, contrast: 1.18, saturation: 1.05,
        bloomStrength: 0.16, bloomThreshold: 0.76,
        liftCyan: 0.01, liftAmber: 0.008, vignette: 0.32, chromatic: 0.0006,
      },
    },
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
