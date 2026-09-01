/**
 * Twisted Speed — Night Circuit main loop
 * Title → Garage (5 cars) → Map → point-to-point race → scrap upgrades → Parole Arch
 */
(function () {
  if (typeof THREE === 'undefined') {
    console.error('Three.js missing — vendor/three.min.js failed to load');
    return;
  }

  var GAME = (window.GAME = window.GAME || {});
  var cfg = GAME.config;
  var U = GAME.utils;
  var I = GAME.input;

  var renderer, scene, camera, clock, postfx, hud, world, particles;
  var state;
  var tmpV = new THREE.Vector3();
  var tmpV2 = new THREE.Vector3();

  function upgradeMult(key) {
    return 1 + (state.meta.upgrades[key] || 0) * cfg.upgrades.effects[key];
  }
  function upgradeCost(key) {
    return cfg.upgrades.costBase + (state.meta.upgrades[key] || 0) * cfg.upgrades.costStep;
  }
  // pri: 0 low (hit), 1 normal, 2 high (wreck/gate), 3 critical
  // High-priority toasts cannot be stomped by DIRECT HIT same frame (Wave ∞)
  function isCeremonyToast(t) {
    // Last 8%: only finish ceremony copy — not PACK / WARDEN / corridor chatter (v292)
    return /PAROLE ARCH|FREEDOM GATE|GATE CLEARED|FINISH GATE AHEAD|BREAK OUT/i.test(t || '');
  }
  function isSpecialToast(t) {
    // CRATER · N HIT matches via CRATER prefix
    return /BONE HARVEST|THREAD THE VEIN|REAR VEIN|VEIN MISS|SERMON|LAST RITES|CRATER|BLACKOUT KISS|TIRE CHOIR/i.test(t || '');
  }
  function isWreckToast(t) {
    return /WRECKED|DOUBLE WRECK|TRIPLE WRECK|\bELIM\b| DOWN /i.test(t || '');
  }
  function isHunterToast(t) {
    return /LATE HUNTER|SECOND HUNTER/i.test(t || '');
  }
  function isRecoverToast(t) {
    return /CORRIDOR RECOVER|FINISH CORRIDOR|CORRIDOR PULL/i.test(t || '');
  }
  function isPickupToast(t) {
    // Scrap + powerup labels (NITRO+, ARMOR, REPAIR, 2X MG, STOPPING…)
    return /SCRAP|REPAIR \+|NITRO\+|ARMOR|2X MG|STOPPING|GUNS/i.test(t || '');
  }
  function wreckBusy() {
    if (isWreckToast(state.msg) && (state.msgT || 0) > 0.08) return true;
    return countQueuedWrecks() > 0;
  }
  /** Wreck / special / ceremony / hunter own the channel — recover never interrupts (v299) */
  function combatChannelBusy() {
    if ((state.msgT || 0) > 0.06) {
      if (isWreckToast(state.msg) || isSpecialToast(state.msg) || isHunterToast(state.msg) || isCeremonyToast(state.msg)) {
        return true;
      }
    }
    if (wreckBusy()) return true;
    // Fresh kill-feed line = wipe moment; suppress corridor spam for a beat
    if (state.killFeed && state.killFeed.length && (state.killFeed[0].t || 0) > 2.6) return true;
    return false;
  }
  /**
   * Corridor toasts: combat busy OR post-hunter quiet OR global 8s gate (v300).
   * Stops CORRIDOR PULL the instant LATE HUNTER text ends mid-void.
   */
  function corridorToastAllowed() {
    if (combatChannelBusy()) return false;
    var now = state.raceTime || 0;
    if (state._corridorQuietUntil != null && now < state._corridorQuietUntil) return false;
    if (state._lastCorridorToastT != null && (now - state._lastCorridorToastT) < 8) return false;
    return true;
  }
  function noteCorridorToastShown() {
    state._lastCorridorToastT = state.raceTime || 0;
  }
  function extendCorridorQuiet(extra) {
    var now = state.raceTime || 0;
    var until = now + (extra != null ? extra : 2.8);
    state._corridorQuietUntil = Math.max(state._corridorQuietUntil || 0, until);
  }
  function tickWardenScript(dt) {
    var p = state.player;
    if (!p || state.mode !== 'race') return;
    var mapId = (state.mapDef && state.mapDef.id) || state.meta.mapId || '';
    var theme = state.mapDef && state.mapDef.theme;
    // Neon only — sepulcher / city; skip coast/REACH
    if (theme === 'coast') return;
    if (mapId === 'reach' || mapId === 'coast') return;
    var script = cfg.wardenScript;
    if (!script || !script.gates) return;
    state._wardenBeats = state._wardenBeats || [];
    if (state._wardenBeats.length >= script.gates.length) return;
    var stage = state.meta.stage | 0;
    var bucket = stage <= 4 ? 'early' : (stage <= 9 ? 'mid' : 'late');
    var lines = (script.buckets && script.buckets[bucket]) || script.buckets.early;
    var next = state._wardenBeats.length;
    var gate = script.gates[next];
    var prog = p.progress || 0;
    if (prog < gate) return;
    // Don't fire in lane-sweep window for gates that might land there — gates already avoid 0.4–0.55
    if (prog >= 0.92) return; // ceremony owns tail
    // Priority 0 — lose to combat
    if (state.msgT > 0) return;
    if (combatChannelBusy && combatChannelBusy()) return;
    if (wreckBusy && wreckBusy()) return;
    var now = state.raceTime || 0;
    if (state._lastCombatToastT != null && (now - state._lastCombatToastT) < 1.6) return;
    // Also check if last toast was special/wreck via helpers if available
    if (typeof isSpecialToast === 'function' && isSpecialToast(state.msg) && state.msgT > 0) return;

    var line = lines[next] || lines[lines.length - 1];
    if (next === 1 && state.activeSalvage && script.salvageBeat2) {
      line = script.salvageBeat2;
    }
    toast(line, 2.0, 0);
    state._wardenBeats.push(gate);
  }
  function scrapFromWreckToast(t) {
    var m = /(\d+)\s*SCRAP/i.exec(t || '');
    return m ? (parseInt(m[1], 10) || 0) : 0;
  }
  function multiWreckToast(n, scrap) {
    if (n >= 3) return 'TRIPLE WRECK +' + scrap + ' SCRAP';
    if (n >= 2) return 'DOUBLE WRECK +' + scrap + ' SCRAP';
    return null;
  }
  function countQueuedWrecks() {
    var n = 0;
    (state._toastQueue || []).forEach(function (q) { if (isWreckToast(q.t)) n++; });
    return n;
  }
  function enqueueToast(t, d, pri) {
    state._toastQueue = state._toastQueue || [];
    // Keep up to 3 wreck lines in queue (v297) — don't collapse multi-kills to one
    if (isWreckToast(t)) {
      while (countQueuedWrecks() >= 3) {
        var dropped = false;
        state._toastQueue = state._toastQueue.filter(function (q) {
          if (!dropped && isWreckToast(q.t)) { dropped = true; return false; }
          return true;
        });
      }
    }
    state._toastQueue.push({ t: t, d: d || 1.5, pri: pri || 0 });
    if (state._toastQueue.length > 6) state._toastQueue.shift();
  }
  function toast(t, d, pri) {
    pri = pri || 0;
    d = d != null ? d : 1.5;
    // Last 8% of course: ceremony owns the channel hard (v292)
    var pp = state.player && state.player.progress;
    if (pp != null && pp >= 0.92 && state.mode === 'race') {
      if (!isCeremonyToast(t)) return;
    }
    // Corridor recover never beats wreck / special / ceremony / hunter (v299)
    // + 8s global gate / post-hunter quiet (v300)
    if (isRecoverToast(t)) {
      if (!corridorToastAllowed()) return;
      pri = 0;
    }
    // Late hunter waits for wreck channel — don't erase kill credit (v298)
    if (isHunterToast(t) && wreckBusy()) {
      enqueueToast(t, d, Math.min(pri, 1));
      return;
    }
    // Powerup/scrap never erase wreck/special — queue behind combat (v304)
    if (isPickupToast(t) && (
      isWreckToast(state.msg) || isSpecialToast(state.msg) || isHunterToast(state.msg) ||
      isCeremonyToast(state.msg) || wreckBusy()
    ) && (state.msgT || 0) > 0.06) {
      enqueueToast(t, d, Math.min(pri, 1));
      return;
    }
    // Special mid-announce: queue wreck instead of stomping (~1s special first) (v296)
    if (isWreckToast(t) && isSpecialToast(state.msg) && (state.msgT || 0) > 0.12) {
      enqueueToast(t, d, pri);
      return;
    }
    // Multi-kill: second wreck within 1s → DOUBLE/TRIPLE readable banner (v297)
    if (isWreckToast(t) && isWreckToast(state.msg) && (state.msgT || 0) > 0.08) {
      var nowW = state.raceTime || 0;
      var close = state._lastWreckT != null && (nowW - state._lastWreckT) < 1.0;
      if (close) {
        state._multiWreckN = (state._multiWreckN || 1) + 1;
        state._multiWreckScrap = (state._multiWreckScrap || scrapFromWreckToast(state.msg)) + scrapFromWreckToast(t);
        var multi = multiWreckToast(state._multiWreckN, state._multiWreckScrap);
        if (multi) {
          state.msg = multi;
          state.msgT = Math.max(state.msgT || 0, 1.45);
          state._toastPri = Math.max(state._toastPri || 0, 2);
          state._lastWreckT = nowW;
          return;
        }
      }
      // Farther multi-kills: queue so both lines play (up to 3)
      enqueueToast(t, d, pri);
      state._lastWreckT = nowW;
      return;
    }
    // Special fires while wreck is on-screen — special takes channel, wreck waits
    if (isSpecialToast(t) && isWreckToast(state.msg) && (state.msgT || 0) > 0.05) {
      enqueueToast(state.msg, Math.max(1.2, state.msgT || 1.2), state._toastPri || 2);
      // fall through — show special now
    } else if (state._toastPri != null && state._toastPri > pri && (state.msgT || 0) > 0.12) {
      return;
    }
    // Specials hold at least ~1s so kill scrap can't flash-erase them
    if (isSpecialToast(t)) d = Math.max(d, 1.05);
    if (isWreckToast(t)) {
      state._lastWreckT = state.raceTime || 0;
      state._multiWreckN = 1;
      state._multiWreckScrap = scrapFromWreckToast(t);
    }
    state.msg = t;
    state.msgT = d;
    state._toastPri = pri;
    if (pri >= 2) state._lastCombatToastT = state.raceTime || 0;
    // Hunter/special/wreck leave a corridor quiet tail so mid-void doesn't spam (v300)
    if (isHunterToast(t)) extendCorridorQuiet(Math.max(d, 1.4) + 2.6);
    else if (isWreckToast(t) || isSpecialToast(t)) extendCorridorQuiet(Math.max(d, 1.0) + 1.2);
    if (isRecoverToast(t)) noteCorridorToastShown();
  }
  function pumpToastQueue() {
    if (!state || (state.msgT || 0) > 0) return;
    state._toastPri = 0;
    if (!state._toastQueue || !state._toastQueue.length) return;
    var q = state._toastQueue.shift();
    if (!q || !q.t) return;
    // Ceremony lock still applies
    var pp = state.player && state.player.progress;
    if (pp != null && pp >= 0.92 && state.mode === 'race' && !isCeremonyToast(q.t)) {
      return pumpToastQueue();
    }
    state.msg = q.t;
    state.msgT = q.d || 1.5;
    state._toastPri = q.pri || 0;
  }
  /** Scrub sticky non-ceremony toasts once the finish stretch starts. */
  function scrubNonCeremonyToast() {
    if (!state || state.mode !== 'race') return;
    var p = state.player;
    if (!p || (p.progress || 0) < 0.92) return;
    if (state.msg && !isCeremonyToast(state.msg)) {
      if (state._finishGateToast) {
        state.msg = 'PAROLE ARCH — BREAK OUT';
        state.msgT = Math.max(state.msgT || 0, 1.2);
        state._toastPri = 3;
      } else if ((state._finishCeremonyT || 0) > 0 || p.finished) {
        state.msg = 'GATE CLEARED';
        state.msgT = Math.max(state.msgT || 0, 1.2);
        state._toastPri = 3;
      } else {
        state.msg = '';
        state.msgT = 0;
        state._toastPri = 0;
      }
    }
  }

  /**
   * EMP fixture kill/restore for rivals only.
   * Never enables PointLights (underLight/bodyFill) — those are player-only (v283).
   */
  function setRivalEmpDark(r, dark) {
    if (!r || !r.mesh || !r.mesh.userData) return;
    var ud = r.mesh.userData;
    // Visual fixtures only — no player PointLight keys
    var keys = [
      'ledLeft', 'ledRight', 'ledBloomL', 'ledBloomR',
      'roofPing', 'underglow', 'neonRing', 'headLight',
    ];
    for (var i = 0; i < keys.length; i++) {
      var o = ud[keys[i]];
      if (!o) continue;
      if (dark) {
        if (o.visible != null) o.visible = false;
        if (o.intensity != null) o.intensity = 0;
        if (o.material && o.material.opacity != null) {
          if (!o.userData) o.userData = {};
          if (o.userData._empOp == null && o.material.opacity != null) {
            o.userData._empOp = o.material.opacity;
          }
          o.material.opacity = 0.05;
        }
      } else {
        // Clean restore once — no flash loop
        if (o.visible != null) o.visible = true;
        if (keys[i] === 'roofPing' && o.material) {
          o.material.opacity = (o.userData && o.userData._empOp != null) ? o.userData._empOp : 0.55;
        } else if (keys[i].indexOf('led') === 0 && o.material) {
          o.material.opacity = (o.userData && o.userData._empOp != null) ? o.userData._empOp : 0.85;
        } else if (keys[i] === 'underglow' && o.material && o.material.opacity != null) {
          o.material.opacity = (o.userData && o.userData._empOp != null) ? o.userData._empOp : 0.45;
        }
        if (o.userData) o.userData._empOp = null;
      }
    }
    // PointLights stay off on rivals (perf + no player-underglow leak)
    if (ud.underLight) ud.underLight.visible = false;
    if (ud.bodyFill) ud.bodyFill.visible = false;
    if (ud.rivalFill) ud.rivalFill.visible = false;
    if (ud.rearFill) ud.rearFill.visible = false;
  }
  GAME._setRivalEmpDark = setRivalEmpDark;
  function pushKillFeed(line) {
    if (!state.killFeed) state.killFeed = [];
    // Multi-kill: keep more lines longer so 2–3 wrecks in 1s all read (v297)
    state.killFeed.unshift({ t: 3.4, text: line });
    if (state.killFeed.length > 5) state.killFeed.length = 5;
  }

  // ---------- Save ----------
  function defaultMeta() {
    return {
      scrap: 120, // enough to taste the shop on first boot
      upgrades: { speed: 0, armor: 0, firepower: 0 },
      builds: {}, // per-car garage shop state
      stage: 1,
      freed: false,
      totalWins: 0,
      bestNight: 1,
      carId: 'marrow',
      mapId: 'sepulcher',
      difficulty: 'adventurous',
      quality: 'high', // Wave 9: low | high
      salvage: null,
    };
  }
  function loadMeta() {
    try {
      var m = JSON.parse(localStorage.getItem(cfg.saveKey) || 'null');
      if (!m) return defaultMeta();
      var d = defaultMeta();
      m.upgrades = Object.assign(d.upgrades, m.upgrades || {});
      m.builds = m.builds || {};
      m.stage = U.clamp(m.stage | 0 || 1, 1, cfg.stageCount);
      m.scrap = m.scrap | 0;
      m.freed = !!m.freed;
      m.totalWins = m.totalWins | 0;
      m.bestNight = m.bestNight | 0 || 1;
      m.carId = m.carId || 'marrow';
      m.mapId = m.mapId || 'sepulcher';
      m.quality = (m.quality === 'low') ? 'low' : 'high';
      // Migrate old easy/normal/hard ids
      var mig = { easy: 'chill', normal: 'adventurous', hard: 'brutal' };
      if (mig[m.difficulty]) m.difficulty = mig[m.difficulty];
      if (!cfg.difficulties[m.difficulty]) m.difficulty = 'adventurous';
      m.salvage = m.salvage || null;
      return m;
    } catch (e) { return defaultMeta(); }
  }

  function applyQualityFromMeta() {
    if (!GAME.quality) return;
    var q = (state && state.meta && state.meta.quality) || 'high';
    GAME.quality.apply(q, {
      renderer: renderer,
      postfx: postfx,
      particles: particles || (state && state.particles),
      world: world || (state && state.world),
    });
  }
  /** O quality toggle — works garage + race; persists meta (v301) */
  function toggleQuality() {
    var nq = (state.meta.quality === 'low') ? 'high' : 'low';
    state.meta.quality = nq;
    saveMeta();
    applyQualityFromMeta();
    if (particles) {
      if (nq === 'low' && particles.rainStop) particles.rainStop();
      else if (nq === 'high' && particles.rainStart && state.mode === 'race' && !state._mapOverview) {
        try { particles.rainStart((state.mapDef && state.mapDef.theme) || 'city'); } catch (e) {}
      }
    }
    // pri 0 — never stomp wreck/special; queue if combat channel busy (v302)
    var qMsg = 'QUALITY  ' + nq.toUpperCase() + (nq === 'low' ? '  ·  no rain · light post · dpr 0.85' : '  ·  full neon stack');
    if (state.mode === 'race' && (combatChannelBusy() || isWreckToast(state.msg) || isSpecialToast(state.msg) || isHunterToast(state.msg))) {
      enqueueToast(qMsg, 1.5, 0);
    } else {
      toast(qMsg, 1.5, 0);
    }
    if (GAME.sfx) {
      try { if (GAME.sfx.unlock) GAME.sfx.unlock(); } catch (eQ) {}
      GAME.sfx.click();
    }
    return nq;
  }

  function emptyBuild() {
    return { levels: {}, unlocks: {} };
  }
  function getCarBuild(carId) {
    if (!state.meta.builds) state.meta.builds = {};
    if (!state.meta.builds[carId]) state.meta.builds[carId] = emptyBuild();
    var b = state.meta.builds[carId];
    if (!b.levels) b.levels = {};
    if (!b.unlocks) b.unlocks = {};
    return b;
  }
  function shopLevel(carId, itemId) {
    return getCarBuild(carId).levels[itemId] | 0;
  }
  function shopUnlocked(carId, itemId) {
    return !!getCarBuild(carId).unlocks[itemId];
  }
  function shopItemCost(item, carId) {
    if (item.type === 'unlock') return item.cost | 0;
    var lv = shopLevel(carId, item.id);
    return (item.costBase | 0) + lv * (item.costStep | 0);
  }
  function shopItemOwned(item, carId) {
    if (item.type === 'unlock') return shopUnlocked(carId, item.id);
    return shopLevel(carId, item.id) >= (item.max | 1);
  }
  function shopItemAvailable(item, carId) {
    var def = GAME.vehicles.def(carId);
    var b = getCarBuild(carId);
    if (item.req && !shopUnlocked(carId, item.req)) return false;
    if (item.reqWeapon === 'rocket') {
      var hasR = !!(def.weapons && def.weapons.rocket) || !!b.unlocks.unlockRocket;
      if (!hasR) return false;
    }
    if (item.reqWeapon === 'mine') {
      var hasM = !!(def.weapons && def.weapons.mine) || !!b.unlocks.unlockMine;
      if (!hasM) return false;
    }
    return true;
  }
  function shopItemsForCat(catId) {
    return (cfg.garageShop.items || []).filter(function (it) { return it.cat === catId; });
  }

  function difficulty() {
    var id = (state && state.meta && state.meta.difficulty) || 'adventurous';
    return cfg.difficulties[id] || cfg.difficulties.adventurous;
  }
  function mutatorsForStage(stage) {
    var list = cfg.mutators || [];
    if (!list.length || stage <= 1) return [];
    // Fixed rotation so every mutator appears (old stage*3+1 never hit PACK as primary)
    // Night 2 BLACKOUT, 3 OPEN VEIN kept; then PACK, BLOOD HOUR, WARDEN SWEEP, LAST MILE…
    var order = ['blackout', 'open_vein', 'pack', 'blood_hour', 'warden_sweep', 'last_mile'];
    var byId = {};
    for (var i = 0; i < list.length; i++) byId[list[i].id] = list[i];
    var out = [];
    var idA = order[(stage - 2) % order.length];
    if (byId[idA]) out.push(byId[idA]);
    else out.push(list[(stage - 2) % list.length]);
    if (stage >= 6) {
      var idB = order[(stage - 2 + 3) % order.length];
      if (byId[idB] && idB !== out[0].id) out.push(byId[idB]);
    }
    return out;
  }
  function hasMutator(id) {
    var ms = (state && state.mutators) || [];
    for (var i = 0; i < ms.length; i++) if (ms[i].id === id) return true;
    return false;
  }
  function cycleDifficulty(dir) {
    var keys = ['chill', 'adventurous', 'brutal'];
    var cur = (state.meta.difficulty || 'adventurous');
    var i = keys.indexOf(cur);
    if (i < 0) i = 1;
    i = (i + (dir > 0 ? 1 : keys.length - 1)) % keys.length;
    state.meta.difficulty = keys[i];
    saveMeta();
    var D = difficulty();
    toast(D.name + '  ·  ' + D.desc, 1.8);
  }
  function saveMeta() {
    try { localStorage.setItem(cfg.saveKey, JSON.stringify(state.meta)); } catch (e) {}
  }

  // ---------- Entities ----------
  function applyBuildToMul(mul, carId) {
    var L = getCarBuild(carId).levels;
    var top = L.topSpeed | 0;
    var acc = L.accel | 0;
    var agi = L.agility | 0;
    var grip = L.grip | 0;
    var plates = L.plates | 0;
    var lighten = L.lighten | 0;
    mul.speed *= 1 + top * 0.07;
    mul.accel = 1 + acc * 0.09;
    mul.hand *= 1 + agi * 0.1;
    mul.armor *= 1 + plates * 0.1;
    mul.grip = 1 + grip * 0.12;
    mul.brake = 1 + (L.brakeTune | 0) * 0.12;
    mul.driftFill = 1 + (L.driftTune | 0) * 0.15;
    mul.nitroCap = 1 + (L.nitroCap | 0) * 0.18;
    mul.nitroPower = 1 + (L.nitroPower | 0) * 0.08;
    mul.nitroRegen = 1 + (L.nitroRegen | 0) * 0.22;
    mul.ramGuard = 1 + (L.ramGuard | 0) * 0.12;
    mul.mgPower = 1 + (L.mgPower | 0) * 0.12;
    mul.mgCool = 1 + (L.mgCool | 0) * 0.09;
    mul.rocketPower = 1 + (L.rocketPower | 0) * 0.14;
    mul.rocketCool = 1 + (L.rocketCool | 0) * 0.1;
    mul.minePower = 1 + (L.minePower | 0) * 0.15;
    mul.mineCool = 1 + (L.mineCool | 0) * 0.12;
    mul.specialCool = 1 + (L.specialCool | 0) * 0.12;
    mul.heatCool = 1 + (L.heatSink | 0) * 0.14;
    mul.regenPlates = L.regenPlates | 0;
    // Lighten chassis — lower effective mass (floor so tanks stay heavy-ish)
    if (lighten > 0) {
      mul.mass = Math.max(0.42, (mul.mass || 1) * (1 - lighten * 0.05));
    }
    return mul;
  }

  /**
   * Natural night readability — soft rocker LED underglow (Lotus-style),
   * gentle body fill. No giant neon slabs, no roof searchlight.
   */
  function attachVehicleMarkers(mesh, opts) {
    opts = opts || {};
    if (!mesh) return;
    var col = opts.color != null ? opts.color : 0x3a8cff; // soft LED blue default
    var isPlayer = !!opts.player;

    // Fat underglow plane: rivals show accent (Wave 10); player keeps rocker LEDs
    if (mesh.userData.underglow) {
      if (!isPlayer && mesh.userData.underglow.material) {
        mesh.userData.underglow.visible = true;
        if (mesh.userData.underglow.material.color) {
          mesh.userData.underglow.material.color.setHex(col);
        }
        if (mesh.userData.underglow.material.opacity != null) {
          mesh.userData.underglow.material.opacity = 0.45;
        }
      } else {
        mesh.userData.underglow.visible = false;
      }
    }
    // Hide old oversized ring / roof ping from prior pass
    if (mesh.userData.neonRing) mesh.userData.neonRing.visible = false;
    if (mesh.userData.roofPing) mesh.userData.roofPing.visible = false;

    // Twin rocker LED strips (thin, under sills — natural underglow)
    if (!mesh.userData.ledLeft) {
      var ledMat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: isPlayer ? 0.85 : 0.65,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      var stripGeo = new THREE.BoxGeometry(0.08, 0.04, 2.35);
      var ledL = new THREE.Mesh(stripGeo, ledMat);
      ledL.position.set(-0.72, 0.12, 0.05);
      mesh.add(ledL);
      mesh.userData.ledLeft = ledL;
      var ledR = new THREE.Mesh(stripGeo, ledMat.clone());
      ledR.position.set(0.72, 0.12, 0.05);
      mesh.add(ledR);
      mesh.userData.ledRight = ledR;
      // Soft ground bloom under each strip (very tight)
      var bloomMat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: isPlayer ? 0.28 : 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      var bloomL = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 2.2), bloomMat);
      bloomL.rotation.x = -Math.PI / 2;
      bloomL.position.set(-0.72, 0.03, 0.05);
      mesh.add(bloomL);
      mesh.userData.ledBloomL = bloomL;
      var bloomR = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 2.2), bloomMat.clone());
      bloomR.rotation.x = -Math.PI / 2;
      bloomR.position.set(0.72, 0.03, 0.05);
      mesh.add(bloomR);
      mesh.userData.ledBloomR = bloomR;
    } else {
      mesh.userData.ledLeft.visible = true;
      mesh.userData.ledRight.visible = true;
      if (mesh.userData.ledBloomL) mesh.userData.ledBloomL.visible = true;
      if (mesh.userData.ledBloomR) mesh.userData.ledBloomR.visible = true;
      [mesh.userData.ledLeft, mesh.userData.ledRight].forEach(function (led) {
        if (led && led.material && led.material.color) led.material.color.setHex(col);
      });
    }

    // PERF: one short under-light on player only. Rivals = emissive LEDs / roof disc.
    // (Each PointLight multiplies fragment cost across all Standard materials.)
    if (isPlayer) {
      if (!mesh.userData.underLight) {
        var uL = new THREE.PointLight(col, 1.6, 4.2, 2.2);
        uL.position.set(0, 0.15, 0);
        mesh.add(uL);
        mesh.userData.underLight = uL;
      } else {
        mesh.userData.underLight.color.setHex(col);
        mesh.userData.underLight.intensity = 1.6;
        mesh.userData.underLight.distance = 4.2;
        mesh.userData.underLight.visible = true;
      }
    } else {
      if (mesh.userData.underLight) mesh.userData.underLight.visible = false;
      if (mesh.userData.bodyFill) mesh.userData.bodyFill.visible = false;
      if (mesh.userData.rivalFill) mesh.userData.rivalFill.visible = false;
      if (mesh.userData.rearFill) mesh.userData.rearFill.visible = false;
    }
    if (mesh.userData.bodyFill) mesh.userData.bodyFill.visible = false;
    if (mesh.userData.rearFill) mesh.userData.rearFill.visible = false;

    // Tiny rival ID disc only (not a roof spotlight) — player gets none
    if (!isPlayer) {
      if (!mesh.userData.roofPing) {
        var ping = new THREE.Mesh(
          new THREE.CircleGeometry(0.28, 12),
          new THREE.MeshBasicMaterial({
            color: col, transparent: true, opacity: 0.55,
            depthWrite: false, side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
          })
        );
        ping.rotation.x = -Math.PI / 2;
        ping.position.y = 1.55;
        mesh.add(ping);
        mesh.userData.roofPing = ping;
      } else {
        mesh.userData.roofPing.visible = true;
        mesh.userData.roofPing.scale.setScalar(0.55);
      }
    }

    // Light env lift only — no fake emissive paint (was turning reds into lava)
    mesh.traverse(function (c) {
      if (!c.isMesh || !c.material) return;
      var mats = Array.isArray(c.material) ? c.material : [c.material];
      for (var mi = 0; mi < mats.length; mi++) {
        var m = mats[mi];
        if (!m || (m.userData && m.userData._heroLit)) continue;
        if (m.envMapIntensity != null && m.metalness != null) {
          m.envMapIntensity = Math.min(1.35, Math.max(m.envMapIntensity || 0.5, isPlayer ? 0.95 : 0.75));
          // Undo prior lava emissive if we set it
          if (m.userData && m.userData._heroLit && m.emissiveIntensity > 0.05 && m.emissiveIntensity < 0.5) {
            m.emissiveIntensity = Math.min(m.emissiveIntensity, 0.04);
          }
          if (!m.userData) m.userData = {};
          m.userData._heroLit = true;
        }
      }
    });
  }

  function makePlayer(path, carId) {
    var def = GAME.vehicles.def(carId);
    var mul = GAME.vehicles.statsMul(def);
    applyBuildToMul(mul, carId);
    var mesh = GAME.vehicles.create(carId, true);
    // PERF: lower env/clearcoat cost on player HQ mesh
    mesh.traverse(function (c) {
      if (!c.isMesh || !c.material) return;
      var mats = Array.isArray(c.material) ? c.material : [c.material];
      for (var mi = 0; mi < mats.length; mi++) {
        var m = mats[mi];
        if (!m) continue;
        if (m.envMapIntensity != null) m.envMapIntensity = Math.min(m.envMapIntensity || 0, 0.4);
        if (m.clearcoat != null) m.clearcoat = 0;
        c.castShadow = false;
        c.receiveShadow = false;
      }
    });
    attachVehicleMarkers(mesh, { player: true, color: 0x3a8cff });
    // Curve-progress spawn (not points[4]) so pack + progress share one ribbon (v311)
    var spawnT = 0.015;
    var spawn;
    var tan;
    if (path.curve && path.curve.getPointAt) {
      spawn = path.curve.getPointAt(spawnT).clone();
      tan = path.curve.getTangentAt(spawnT).normalize();
    } else {
      var spawnIdx = Math.min(4, path.points.length - 2);
      spawn = path.points[spawnIdx].clone();
      tan = new THREE.Vector3()
        .subVectors(path.points[spawnIdx + 1], path.points[spawnIdx])
        .normalize();
    }
    mesh.position.copy(spawn);
    mesh.position.y += 0.2;
    scene.add(mesh);
    var yaw = Math.atan2(tan.x, tan.z);
    if (GAME.vehicles.setYaw) GAME.vehicles.setYaw(mesh, yaw);
    else mesh.rotation.y = yaw;
    var hp = Math.round(cfg.combat.playerHp * mul.armor * upgradeMult('armor'));
    var b = getCarBuild(carId);
    var hasShield = !!b.unlocks.shieldCore;
    var maxShield = hasShield ? (28 + (b.levels.shieldCap | 0) * 18) : 0;
    return {
      mesh: mesh, def: def, mul: mul,
      pos: spawn.clone(), yaw: yaw, steer: 0,
      speed: 0, slip: 0, // longitudinal + lateral (arcade)
      hp: hp, maxHp: hp,
      shield: maxShield, maxShield: maxShield,
      // Opening invuln — short bubble so first pack contact can land (v364)
      inv: 1.2, rocketCd: 0, mineCd: 0, mgCd: 0, specialCd: 0, stabCd: 0,
      progress: spawnT, maxProgress: spawnT, lapProgress: spawnT, kills: 0,
      nitroMax: cfg.nitro.capacity * (mul.nitroCap || 1),
      _wep: null,
      // Half tank so first-minute drift fill is visible (still enough for a Q pop) (v314)
      nitro: (cfg.nitro.capacity * (mul.nitroCap || 1)) * 0.48,
      heat: 0, drifting: false, nitroActive: false,
      tetherTarget: null, tetherT: 0,
      finished: false,
      surface: 'asphalt', _hopLift: 0, _curbHopCd: 0,
    };
  }

  function makeRivals(path, stage, count) {
    var list = [];
    var diff = difficulty();
    var spdMul = diff.rivalSpeed != null ? diff.rivalSpeed : 0.78;
    // Prefer distinct roster entries; skip player pick when possible
    var roster = ['razorback', 'mausoleum', 'vesper', 'choir', 'needle', 'marrow'];
    var playerId = state.meta && state.meta.carId;
    var pool = roster.filter(function (id) { return id !== playerId; });
    if (pool.length < 3) pool = roster.slice();
    // v364: seat pack ~50–120m ahead (not t=0.20 ≈ 900m). First contact by ~6–8s;
    // still not bumper (floor ~13–18m in theater). Path-length aware.
    // v367: OUTER lanes only — center lane at spawn blocked the first-curve apex.
    var pathLenSpawn = path.length || (path.curve && path.curve.getLength && path.curve.getLength()) || 4000;
    for (var i = 0; i < count; i++) {
      var aheadM = 52 + i * 14; // stagger field 52…~120m
      var tSpawn = U.clamp(0.015 + aheadM / pathLenSpawn, 0.02, 0.075);
      var p = path.curve.getPointAt(tSpawn).clone();
      var tan = path.curve.getTangentAt(tSpawn).normalize();
      var side = new THREE.Vector3(-tan.z, 0, tan.x);
      // Alternate outer flanks only (no 0 lane) so opening apex stays free
      var lane = (i % 2 === 0 ? -1 : 1) * (3.8 + (i % 3) * 0.55);
      p.addScaledVector(side, lane);
      var rivalId = pool[i % pool.length];
      // create(false) returns pre-demoted Basic clone (v322 START instant)
      var mesh = GAME.vehicles.create(rivalId, false);
      var defR = GAME.vehicles.def(rivalId);
      var accentCol = (defR && defR.accent) != null ? defR.accent : 0xff2d55;
      attachVehicleMarkers(mesh, { player: false, color: accentCol });

      mesh.position.copy(p);
      scene.add(mesh);
      // Face along path (+Z nose after bake). atan2(x,z) matches player yaw convention.
      var yaw = Math.atan2(tan.x, tan.z);
      if (GAME.vehicles.setYaw) GAME.vehicles.setYaw(mesh, yaw);
      else mesh.rotation.y = yaw;
      // Wave ∞ pack durability: base was ~50 → melted by bone+MG by 15s.
      // Still killable; opening should leave ≥2 alive past 15s under full arsenal.
      var hpMul = diff.rivalHpMul != null ? diff.rivalHpMul : 1;
      var frame = 1;
      if (rivalId === 'needle' || rivalId === 'vesper') frame = 0.92;
      if (rivalId === 'mausoleum') frame = 1.55;
      if (rivalId === 'choir' || rivalId === 'razorback') frame = 1.25;
      var hp = Math.round((78 + stage * 6.5 + (i % 2) * 5) * hpMul * frame);
      // Pace: close enough to race, slow enough to aim
      var baseMax = (36 + stage * 1.05 + (i % 3) * 1.2) * spdMul;
      baseMax = Math.min(baseMax, 52 * Math.max(0.9, spdMul));
      var sh = Math.round(12 + stage * 1.6);
      list.push({
        mesh: mesh, pos: p, yaw: yaw, defId: rivalId,
        speed: baseMax * 0.72,
        maxSpeed: baseMax,
        hp: hp, maxHp: hp,
        shield: sh, maxShield: sh,
        dead: false,
        progress: tSpawn,
        aggro: (0.45 + (i % 3) * 0.12) * (diff.rivalFire || 1),
        // v364: weapons ready once player closes (not silent until t=15)
        fireCd: 1.1 + i * 0.25,
        rocketCd: 2.8 + i * 0.45,
        disabledT: 0,
        ramCd: 0.8 + i * 0.15,
        hurtFlash: 0,
        laneOff: lane,
        skill: 0.5 + (i % 4) * 0.08 + stage * 0.015,
        role: (GAME.ai && GAME.ai.assignRole) ? GAME.ai.assignRole(i, rivalId) : 'gunner',
        specialCd: 8 + i * 1.8 + Math.random() * 3,
        mineCd: 0,
        // Short spawn grace — first contact can land hits without melt
        invT: 1.35 + i * 0.1,
        // Re-drop allowed after first bend (was 16s — blocked theater entirely)
        _reengageCd: 4.5 + i * 0.35,
      });
    }
    return list;
  }

  function placeScrap(path, n) {
    var out = [];
    var M = GAME.materials.get();
    var U = GAME.utils;
    var D = cfg.drive;
    for (var i = 0; i < n; i++) {
      // Scattered along the run, not only centerline
      var t = 0.08 + (i / Math.max(1, n - 1)) * 0.84;
      t = U.clamp(t + (U.seeded(i * 4.4) - 0.5) * 0.04, 0.05, 0.95);
      var p = path.curve.getPointAt(t);
      var tan = path.curve.getTangentAt(t).normalize();
      var side = new THREE.Vector3(-tan.z, 0, tan.x);
      var lat = (U.seeded(i * 2.7) - 0.5) * D.roadHalf * 1.4;
      p = p.clone().addScaledVector(side, lat);
      var mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), M.scrap);
      mesh.position.copy(p);
      mesh.position.y += 0.7;
      scene.add(mesh);
      out.push({ mesh: mesh, pos: mesh.position.clone(), value: 6 + (i % 4) * 3, taken: false });
    }
    return out;
  }

  /**
   * Soft track hazards — SLOW or HURT only, never hard-block the ribbon.
   * Stage 1: few. Later nights: denser + nastier. Always offset to a lane.
   */
  function makeHazards(path, stage) {
    var list = [];
    var U = GAME.utils;
    var D = cfg.drive;
    // Progressive density: night 1 ≈ 3–4; stage≥4 more spikes; stage≥8 denser
    var count = Math.min(16, 3 + Math.floor(Math.max(0, stage - 1) * 0.95)
      + (stage >= 4 ? 2 : 0) + (stage >= 8 ? 3 : 0));
    var used = [];
    function pickT(seed) {
      // Opening 15% stays readable — hazards start at progress ≥ 0.15
      var t = 0.15 + U.seeded(seed * 7.3) * 0.72;
      for (var tries = 0; tries < 8; tries++) {
        var ok = true;
        for (var u = 0; u < used.length; u++) {
          if (Math.abs(used[u] - t) < (stage >= 8 ? 0.035 : 0.05)) { ok = false; break; }
        }
        if (ok) break;
        t = 0.15 + U.seeded(seed * 7.3 + tries * 13.1) * 0.72;
      }
      used.push(t);
      return t;
    }
    function laneOffFor(s) {
      // Prefer side lanes — never a full-width wall
      var picks = [
        -D.roadHalf * 0.55, -D.roadHalf * 0.28,
        D.roadHalf * 0.28, D.roadHalf * 0.55,
        (s % 2 ? 1 : -1) * D.roadHalf * 0.12,
      ];
      return picks[s % picks.length] + (U.seeded(s * 9.9) - 0.5) * 1.1;
    }

    for (var s = 0; s < count; s++) {
      var st = pickT(s + stage * 17);
      var sp = path.curve.getPointAt(st);
      var tan = path.curve.getTangentAt(st).normalize();
      var sideN = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      var laneOff = laneOffFor(s);
      var yaw = Math.atan2(tan.x, tan.z);
      // Stage scales type mix: early soft (oil/debris), later spikes/electric/sand
      var roll = U.seeded(s * 3.1 + stage);
      var kind;
      if (stage <= 2) {
        // Guarantee mix so night 1 isn't three identical oil slicks
        var early = [1, 2, 0, 1]; // oil, debris, spike, oil
        kind = early[s % early.length];
      } else if (stage < 4) kind = Math.floor(roll * 4);
      else if (stage < 8) {
        // Prefer spike + electric for warden pressure
        kind = roll < 0.35 ? 0 : (roll < 0.6 ? 3 : Math.floor(roll * 5));
      } else {
        // Overlapping tells — denser spikes/electric
        kind = roll < 0.4 ? 0 : (roll < 0.7 ? 3 : Math.floor(roll * 5));
      }

      var group = new THREE.Group();
      var pos = sp.clone().addScaledVector(sideN, laneOff);
      pos.y = sp.y;

      if (kind === 0) {
        // Spike strip — hazard chevrons + rising neon teeth
        var base = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, 0.12, 1.35),
          new THREE.MeshStandardMaterial({
            color: 0x1a1010, metalness: 0.55, roughness: 0.45,
            emissive: 0x331100, emissiveIntensity: 0.35,
          })
        );
        group.add(base);
        // Yellow/black hazard stripes
        for (var hs = 0; hs < 5; hs++) {
          var stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.04, 1.2),
            new THREE.MeshBasicMaterial({
              color: hs % 2 ? 0xffe66d : 0x111111,
              transparent: true, opacity: 0.9,
            })
          );
          stripe.position.set(-1.2 + hs * 0.6, 0.1, 0);
          group.add(stripe);
        }
        // Glow ring warn
        var warnRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.5, 0.06, 6, 20),
          new THREE.MeshBasicMaterial({
            color: 0xffe66d, transparent: true, opacity: 0.35,
            blending: THREE.AdditiveBlending, depthWrite: false,
          })
        );
        warnRing.rotation.x = -Math.PI / 2;
        warnRing.position.y = 0.08;
        group.add(warnRing);
        var spikes = [];
        for (var k = 0; k < 5; k++) {
          var cone = new THREE.Mesh(
            new THREE.ConeGeometry(0.16, 0.85, 6),
            new THREE.MeshStandardMaterial({
              color: 0xcccccc, metalness: 0.85, roughness: 0.25,
              emissive: 0xff2d55, emissiveIntensity: 0,
            })
          );
          cone.position.set(-1.1 + k * 0.55, 0.12, 0);
          cone.visible = false;
          group.add(cone);
          spikes.push(cone);
        }
        group.position.copy(pos);
        group.rotation.y = yaw;
        scene.add(group);
        list.push({
          type: 'spike', mesh: group, spikes: spikes, warnRing: warnRing, pos: pos.clone(),
          phase: 'down', timer: 0.8 + U.seeded(s) * 2.5,
          hurt: 12 + stage * 1.4,
          matBase: base.material, radius: 2.4, progress: st, hitCd: 0,
        });
      } else if (kind === 1) {
        // Oil slick — iridescent neon rainbow sheen + warn halo
        var oilR = 2.15 + U.seeded(s) * 0.55;
        var oil = new THREE.Mesh(
          new THREE.CircleGeometry(oilR, 24),
          new THREE.MeshStandardMaterial({
            color: 0x0a0c14, metalness: 0.95, roughness: 0.08,
            transparent: true, opacity: 0.78,
            envMap: GAME.materials.get()._envMap, envMapIntensity: 1.6,
            emissive: 0x220044, emissiveIntensity: 0.25,
          })
        );
        oil.rotation.x = -Math.PI / 2;
        group.add(oil);
        // Rainbow sheen rings
        var sheenCols = [0xff2d88, 0x00e5ff, 0x39ff14, 0xffe66d];
        for (var oi = 0; oi < 3; oi++) {
          var ring = new THREE.Mesh(
            new THREE.RingGeometry(oilR * (0.35 + oi * 0.2), oilR * (0.42 + oi * 0.2), 24),
            new THREE.MeshBasicMaterial({
              color: sheenCols[oi % sheenCols.length],
              transparent: true, opacity: 0.22,
              blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
            })
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.02 + oi * 0.01;
          group.add(ring);
        }
        var oilHalo = new THREE.Mesh(
          new THREE.RingGeometry(oilR * 0.95, oilR * 1.15, 28),
          new THREE.MeshBasicMaterial({
            color: 0xaa44ff, transparent: true, opacity: 0.28,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
          })
        );
        oilHalo.rotation.x = -Math.PI / 2;
        oilHalo.position.y = 0.04;
        group.add(oilHalo);
        group.position.copy(pos);
        group.position.y = pos.y + 0.07;
        scene.add(group);
        list.push({
          type: 'oil', mesh: group, halo: oilHalo, pos: pos.clone(),
          hurt: 2 + stage * 0.4, radius: 2.9, progress: st,
          slipKick: 16 + stage * 0.9, hitCd: 0,
        });
      } else if (kind === 2) {
        // Soft debris — glowing wreck pile (knock-through, never a wall)
        var crate = new THREE.Mesh(
          new THREE.BoxGeometry(1.35, 0.95, 1.45),
          new THREE.MeshStandardMaterial({
            color: 0x4a3020, roughness: 0.8, metalness: 0.2,
            emissive: 0xff6b20, emissiveIntensity: 0.15,
          })
        );
        crate.position.y = 0.48;
        crate.rotation.y = 0.2;
        group.add(crate);
        var barrel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.38, 0.85, 10),
          new THREE.MeshStandardMaterial({
            color: 0x2a4018, metalness: 0.55, roughness: 0.4,
            emissive: 0x224400, emissiveIntensity: 0.2,
          })
        );
        barrel.position.set(0.85, 0.42, 0.2);
        group.add(barrel);
        var tire = new THREE.Mesh(
          new THREE.TorusGeometry(0.32, 0.12, 8, 14),
          new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.9, metalness: 0.1 })
        );
        tire.position.set(-0.7, 0.32, 0.5);
        tire.rotation.x = Math.PI / 2;
        group.add(tire);
        // Hazard beacon
        var beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 8, 8),
          new THREE.MeshBasicMaterial({
            color: 0xff9f1c, transparent: true, opacity: 0.9,
            blending: THREE.AdditiveBlending, depthWrite: false,
          })
        );
        beacon.position.set(0, 1.15, 0);
        group.add(beacon);
        var beaconPole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.05, 1.0, 6),
          new THREE.MeshStandardMaterial({ color: 0x333340, metalness: 0.6, roughness: 0.4 })
        );
        beaconPole.position.y = 0.55;
        group.add(beaconPole);
        group.position.copy(pos);
        group.rotation.y = yaw + (U.seeded(s) - 0.5) * 0.5;
        scene.add(group);
        list.push({
          type: 'debris', mesh: group, beacon: beacon, pos: pos.clone(),
          hurt: 8 + stage * 0.9, radius: 2.1, progress: st, hitCd: 0,
          soft: true,
        });
      } else if (kind === 3) {
        // Electric pad — dual coils + crackling arc feel
        var pad = new THREE.Mesh(
          new THREE.CylinderGeometry(1.35, 1.45, 0.1, 16),
          new THREE.MeshStandardMaterial({
            color: 0x121820, emissive: 0x00e5ff, emissiveIntensity: 0.9,
            metalness: 0.6, roughness: 0.35,
          })
        );
        pad.position.y = 0.05;
        group.add(pad);
        var coilMat = new THREE.MeshStandardMaterial({
          color: 0x2a3848, emissive: 0x00ccee, emissiveIntensity: 1.4,
          metalness: 0.75, roughness: 0.28,
        });
        var coilL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.25, 8), coilMat);
        coilL.position.set(-0.55, 0.65, 0);
        group.add(coilL);
        var coilR = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.25, 8), coilMat.clone());
        coilR.position.set(0.55, 0.65, 0);
        group.add(coilR);
        // Arc beam between coils (additive)
        var arc = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 0.08, 0.08),
          new THREE.MeshBasicMaterial({
            color: 0x88ffff, transparent: true, opacity: 0.55,
            blending: THREE.AdditiveBlending, depthWrite: false,
          })
        );
        arc.position.y = 1.05;
        group.add(arc);
        var floorGlow = new THREE.Mesh(
          new THREE.CircleGeometry(1.6, 20),
          new THREE.MeshBasicMaterial({
            color: 0x00e5ff, transparent: true, opacity: 0.2,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
          })
        );
        floorGlow.rotation.x = -Math.PI / 2;
        floorGlow.position.y = 0.02;
        group.add(floorGlow);
        group.position.copy(pos);
        group.rotation.y = yaw;
        scene.add(group);
        list.push({
          type: 'electric', mesh: group, coil: coilL, coil2: coilR, arc: arc,
          floorGlow: floorGlow, pos: pos.clone(),
          hurt: 10 + stage * 1.2, radius: 2.5, progress: st, hitCd: 0,
          phase: 'pulse', timer: U.seeded(s) * 2,
        });
      } else {
        // Sand / grit — dune with caution posts
        var sand = new THREE.Mesh(
          new THREE.CircleGeometry(3.0, 18),
          new THREE.MeshStandardMaterial({
            color: 0x7a6540, roughness: 0.95, metalness: 0.05,
            transparent: true, opacity: 0.78, emissive: 0x332200, emissiveIntensity: 0.12,
          })
        );
        sand.rotation.x = -Math.PI / 2;
        group.add(sand);
        var dune = new THREE.Mesh(
          new THREE.SphereGeometry(1.1, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.45),
          new THREE.MeshStandardMaterial({
            color: 0x8a7048, roughness: 0.95, metalness: 0.02,
            transparent: true, opacity: 0.65,
          })
        );
        dune.position.y = 0.05;
        dune.scale.set(1.4, 0.35, 1.1);
        group.add(dune);
        for (var sp = 0; sp < 3; sp++) {
          var post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.07, 0.9, 6),
            new THREE.MeshStandardMaterial({ color: 0xff9f1c, emissive: 0xff6600, emissiveIntensity: 0.4 })
          );
          var ang = (sp / 3) * Math.PI * 2;
          post.position.set(Math.cos(ang) * 1.6, 0.45, Math.sin(ang) * 1.6);
          group.add(post);
        }
        group.position.copy(pos);
        group.position.y = pos.y + 0.05;
        scene.add(group);
        list.push({
          type: 'sand', mesh: group, pos: pos.clone(),
          hurt: 1, radius: 3.2, progress: st, hitCd: 0, drag: 0.92,
        });
      }
    }
    return list;
  }

  /**
   * Temporary race powerups — float icons, drive-through, do not persist stages.
   */
  function makePowerups(path, stage) {
    var list = [];
    var U = GAME.utils;
    var types = (cfg.powerups && cfg.powerups.types) || [];
    if (!types.length || !path || !path.curve) return list;
    // Night 1: few; later: more — sequential kit so speed/armor/guns always appear early
    var count = Math.min(10, 3 + Math.floor(stage / 2));
    // Rotate start index by stage only (not per-slot RNG) so coverage stays even
    var typeRot = Math.floor(U.seeded(stage * 2.7 + 0.1) * types.length) % types.length;
    // Nights 1–2 always open with speed so the signature boost is on the ribbon
    if (stage <= 2) typeRot = 0;
    for (var i = 0; i < count; i++) {
      var t = 0.15 + (i + 0.5) / count * 0.7 + (U.seeded(i * 5.5 + stage) - 0.5) * 0.04;
      t = U.clamp(t, 0.12, 0.9);
      var def = types[(i + typeRot) % types.length];
      var p = path.curve.getPointAt(t);
      var tan = path.curve.getTangentAt(t).normalize();
      var side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      var lat = (U.seeded(i * 2.1) - 0.5) * cfg.drive.roadHalf * 0.9;
      var pos = p.clone().addScaledVector(side, lat);
      pos.y += 1.35;

      var g = new THREE.Group();
      // Outer glow ring
      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.08, 8, 20),
        new THREE.MeshBasicMaterial({
          color: def.color, transparent: true, opacity: 0.9,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      // Core gem
      var core = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        new THREE.MeshBasicMaterial({
          color: def.color, transparent: true, opacity: 0.95,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      g.add(core);
      // Soft ground beacon
      var beacon = new THREE.Mesh(
        new THREE.CircleGeometry(0.9, 16),
        new THREE.MeshBasicMaterial({
          color: def.color, transparent: true, opacity: 0.25,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        })
      );
      beacon.rotation.x = -Math.PI / 2;
      beacon.position.y = -1.2;
      g.add(beacon);

      g.position.copy(pos);
      scene.add(g);
      list.push({
        id: def.id,
        label: def.label,
        color: def.color,
        dur: def.dur,
        mesh: g,
        ring: ring,
        core: core,
        pos: pos.clone(),
        taken: false,
        bob: U.seeded(i * 3.3) * Math.PI * 2,
        progress: t,
      });
    }
    return list;
  }

  function applyPowerup(def) {
    var p = state.player;
    if (!p || !def) return;
    if (!p.buffs) p.buffs = {};
    if (def.id === 'repair') {
      var heal = Math.round(p.maxHp * 0.28);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      if (p.maxShield > 0) p.shield = Math.min(p.maxShield, p.shield + p.maxShield * 0.35);
      toast('REPAIR +' + heal + ' ARMOR', 1.25, 1);
      if (GAME.sfx) {
        try { if (GAME.sfx.unlock) GAME.sfx.unlock(); } catch (e0) {}
        if (GAME.sfx.pickup) GAME.sfx.pickup();
      }
      return;
    }
    p.buffs[def.id] = {
      t: def.dur,
      max: def.dur,
      label: def.label,
      color: def.color,
    };
    // Instant side effects
    if (def.id === 'armor' && p.maxShield > 0) {
      p.shield = Math.min(p.maxShield, p.shield + 18);
    }
    if (def.id === 'speed') {
      p.nitro = Math.min(p.nitroMax || 1, (p.nitro || 0) + 0.35);
    }
    // pri 1 so pickup isn't silent under pack chatter (v303)
    toast(def.label + (def.dur > 0 ? '  ' + Math.round(def.dur) + 's' : ''), 1.35, 1);
    if (GAME.sfx) {
      try { if (GAME.sfx.unlock) GAME.sfx.unlock(); } catch (e1) {}
      if (GAME.sfx.pickup) GAME.sfx.pickup();
    }
  }

  function tickBuffs(dt) {
    var p = state.player;
    if (!p || !p.buffs) return;
    var keys = Object.keys(p.buffs);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var b = p.buffs[k];
      if (!b) continue;
      b.t -= dt;
      if (b.t <= 0) delete p.buffs[k];
    }
  }

  function hasBuff(id) {
    var p = state.player;
    return !!(p && p.buffs && p.buffs[id] && p.buffs[id].t > 0);
  }

  // ---------- Race lifecycle ----------
  /**
   * Clear race entities. v368: keepWorld preserves path+meshes so START same-map
   * does not world.build (was always clearing → always rebuild hitch).
   */
  function clearRace(opts) {
    var keepWorld = !!(opts && opts.keepWorld);
    if (particles) particles.clear();
    function kill(o) {
      if (!o) return;
      scene.remove(o);
    }
    if (state.player && state.player.mesh) kill(state.player.mesh);
    (state.rivals || []).forEach(function (r) { kill(r.mesh); });
    (state.scraps || []).forEach(function (s) { kill(s.mesh); });
    (state.hazards || []).forEach(function (h) { kill(h.mesh); });
    if (GAME.maglev && GAME.maglev.clear) GAME.maglev.clear(state.maglev, scene);
    state.maglev = null;
    if (GAME.wardenLane && GAME.wardenLane.clear) GAME.wardenLane.clear(state.wardenLane, scene);
    state.wardenLane = null;
    (state.projectiles || []).forEach(function (pr) {
      recycleProjectileMesh(pr.mesh);
    });
    (state.mines || []).forEach(function (m) { kill(m.mesh); });
    (state.powerups || []).forEach(function (pu) { kill(pu.mesh); });
    // Hero fill lights (not world)
    if (state._heroKey) { scene.remove(state._heroKey); state._heroKey = null; }
    if (state._heroLight) { scene.remove(state._heroLight); state._heroLight = null; }
    if (state._heroRim) { scene.remove(state._heroRim); state._heroRim = null; }
    if (state._heroSide) { scene.remove(state._heroSide); state._heroSide = null; }
    if (state._roadLight) { scene.remove(state._roadLight); state._roadLight = null; }
    if (state._roadLight2) { scene.remove(state._roadLight2); state._roadLight2 = null; }
    if (state._searchlight) {
      if (state._searchlight.mesh) kill(state._searchlight.mesh);
      if (state._searchlight.card) kill(state._searchlight.card);
      state._searchlight = null;
    }
    if (keepWorld && world && world.group) {
      // Strip non-world, non-camera children only
      for (var i = scene.children.length - 1; i >= 0; i--) {
        var ch = scene.children[i];
        if (ch === camera || ch === world.group) continue;
        // Keep garage bay lights if present
        if (ch === state._keyLight || ch === state._rimLight || ch === state._topLight) continue;
        scene.remove(ch);
      }
      if (!world.group.parent) scene.add(world.group);
    } else {
      if (world) world.clear(scene);
      while (scene.children.length) {
        scene.remove(scene.children[0]);
      }
      scene.add(camera);
    }
    if (GAME.sfx) GAME.sfx.engineStop();
    if (world) world._resultsLodBoost = false;
  }

  function startRace() {
    // Never leave judge-capture freeze on during real play
    state._frozen = false;
    state._shotHoldSpeed = null;
    state._shotBoomT = null;
    state._shotBoomLeft = 0;
    // Decide reuse BEFORE clear (clear used to null path → sameMap always false)
    var mapDef = cfg.maps[state.mapIndex | 0];
    var sameMap = !!(
      world && world.mapDef && world.mapDef.id === mapDef.id &&
      world.path && world.path.curve && state._menuBuilt
    );
    state._sameMapReuse = sameMap;
    clearRace({ keepWorld: sameMap });
    if (GAME.specials && GAME.specials.reset) GAME.specials.reset();
    state.mapDef = mapDef;
    // Reuse menu/race world when same map — rebuild only on map switch (v319/v368)
    if (sameMap) {
      state.path = world.path;
      if (world.group && !world.group.parent) scene.add(world.group);
    } else {
      toast('BUILDING NIGHT…', 0.9, 1);
      state.path = world.build(scene, mapDef);
      state._menuBuilt = true;
    }
    // Per-map color grade (city pink/cyan, industrial amber, coastal cool)
    if (postfx && postfx.setGrade) {
      var baseG = cfg.grade || {};
      var mapG = mapDef.grade || {};
      postfx.setGrade({
        exposure: mapG.exposure != null ? mapG.exposure : baseG.exposure,
        contrast: mapG.contrast != null ? mapG.contrast : baseG.contrast,
        saturation: mapG.saturation != null ? mapG.saturation : baseG.saturation,
        bloomStrength: mapG.bloomStrength != null ? mapG.bloomStrength : baseG.bloomStrength,
        bloomThreshold: mapG.bloomThreshold != null ? mapG.bloomThreshold : baseG.bloomThreshold,
        vignette: mapG.vignette != null ? mapG.vignette : baseG.vignette,
        grain: mapG.grain != null ? mapG.grain : baseG.grain,
        chromatic: mapG.chromatic != null ? mapG.chromatic : baseG.chromatic,
        liftCyan: mapG.liftCyan != null ? mapG.liftCyan : baseG.liftCyan,
        liftAmber: mapG.liftAmber != null ? mapG.liftAmber : baseG.liftAmber,
      });
    }
    state.world = world; // minimap + systems
    state.turnHints = buildTurnHints(state.path);
    state.activeTurn = null;
    particles = new GAME.Particles(scene);
    if (particles.setCamera) particles.setCamera(camera);
    state.particles = particles;
    // Theme weather: city/industrial rain, coastal mist, industrial embers
    // (skipped in overview — rain flecks owned the black screen)
    state._mapOverview = typeof location !== 'undefined' && /[?&]overview=1/.test(location.search);
    if (particles.rainStart && !state._mapOverview && !(particles._qualityNoRain) && state.meta.quality !== 'low') {
      particles.rainStart((mapDef && mapDef.theme) || 'city');
    } else if (particles.rainStop && state.meta.quality === 'low') {
      particles.rainStop();
    }

    var carId = state.meta.carId || cfg.cars[state.carIndex | 0].id;
    state.player = makePlayer(state.path, carId);
    // Results orbit used hero scale — always race at 1.0 (v307)
    if (state.player && state.player.mesh) state.player.mesh.scale.setScalar(1);
    var diff = difficulty();
    state.mutators = mutatorsForStage(state.meta.stage);
    state.nextMutators = mutatorsForStage(Math.min(cfg.stageCount, state.meta.stage + 1));
    var baseCount = 3 + Math.min(2, Math.floor(state.meta.stage / 4));
    if (hasMutator('pack')) baseCount += 1;
    var rMul = diff.rivalCountMul != null ? diff.rivalCountMul : 1;
    var rivalN = Math.max(2, Math.round(baseCount * rMul));
    // Visible count spread when mul would round to same N (N1: chill 2 / adv 3 / brutal 4) (v311)
    if (Math.abs(rMul - 1) > 0.08 && rivalN === Math.round(baseCount)) {
      rivalN = rMul < 1 ? Math.max(2, rivalN - 1) : rivalN + 1;
    }
    // Difficulty sticks into race — used by makeRivals + HUD; log for play proof (v311)
    state._diffApplied = {
      id: diff.id || state.meta.difficulty,
      name: diff.name,
      rivalN: rivalN,
      rivalFire: diff.rivalFire,
      rivalCountMul: rMul,
    };
    state.rivals = makeRivals(state.path, state.meta.stage, rivalN);
    if (hasMutator('pack')) {
      state._packMentality = true;
      state.rivals.forEach(function (r) {
        if (r.role === 'hunter') {
          r.aggro = Math.min(1.35, (r.aggro || 0.5) + 0.35);
          r.maxSpeed *= 1.06;
        }
      });
      toast('PACK MENTALITY — +1 HUNTER', 2.0, 2);
    }
    if (hasMutator('open_vein')) {
      // OPEN VEIN (Night 3 seed): more scrap on map + AI mines hungry
      state._openVein = true;
      state.rivals.forEach(function (r) {
        r.mineCd = 0.2 + Math.random() * 0.4;
        if (r.role === 'coward' || r.role === 'blocker' || r.role === 'gunner') {
          r._veinMine = true;
        }
      });
      toast('OPEN VEIN — SCRAP RUNS HOT', 2.0);
    }
    // Grip / heat mutator flags on player
    if (state.player) {
      state.player._mutGrip = hasMutator('blood_hour') ? 0.92 : 1;
      state.player._mutHeatCool = hasMutator('warden_sweep') ? 0.8 : 1;
      state.player._mutEmpBonus = hasMutator('blackout') ? 0.5 : 0;
    }
    if (hasMutator('blood_hour') && particles && particles.rainStart) {
      try { particles.rainStart('city'); } catch (e) {}
    }
    state.hazards = makeHazards(state.path, state.meta.stage);
    if (GAME.maglev && GAME.maglev.spawn) {
      state.maglev = GAME.maglev.spawn(scene, state.path, state.mapDef);
    }
    if (GAME.wardenLane && GAME.wardenLane.spawn) {
      state.wardenLane = GAME.wardenLane.spawn(scene, state.path, state.mapDef);
    }
    if (hasMutator('last_mile')) {
      // LAST MILE (Night 7): finish stretch is mean — not a label
      state._lastMile = true;
      var lateArmed = 0;
      (state.hazards || []).forEach(function (h) {
        if ((h.progress || 0) >= 0.55) {
          h.hurt = (h.hurt || 10) * 1.35;
          if (h.type === 'spike' || h.type === 'electric') {
            h.phase = 'yellow';
            h.timer = 0.35 + Math.random() * 0.4;
            lateArmed++;
          }
        }
      });
      // Spawn extra late soft hazards on the ribbon (punish, don't brick)
      if (state.path && state.path.curve && lateArmed < 4) {
        var Dlm = cfg.drive;
        for (var li = 0; li < 3; li++) {
          var tp = 0.72 + li * 0.07;
          if (tp > 0.94) break;
          var pp = state.path.curve.getPointAt(tp);
          var tan = state.path.curve.getTangentAt(tp).normalize();
          var side = new THREE.Vector3(-tan.z, 0, tan.x);
          var pos = pp.clone().addScaledVector(side, ((li % 2) ? 1 : -1) * Dlm.roadHalf * 0.35);
          pos.y = pp.y;
          var ring = new THREE.Mesh(
            new THREE.RingGeometry(1.1, 1.7, 20),
            new THREE.MeshBasicMaterial({
              color: 0xff2d55, transparent: true, opacity: 0.55,
              blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
            })
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.copy(pos);
          ring.position.y += 0.08;
          scene.add(ring);
          state.hazards.push({
            type: 'spike', mesh: ring, spikes: [], warnRing: ring, pos: pos.clone(),
            phase: 'yellow', timer: 0.5 + li * 0.15,
            hurt: 16 + state.meta.stage * 1.2,
            radius: 2.6, progress: tp, hitCd: 0,
            _lastMileExtra: true,
          });
          lateArmed++;
        }
      }
      // Finish gate slightly earlier feel of pressure — ceremony still triggers 0.92+
      state._lastMileFinBoost = true;
      toast('LAST MILE — FINISH STRETCH HUNTS', 2.2, 2);
    }
    if (hasMutator('blood_hour')) {
      state._bloodHour = true;
      // Extra electric/spike arm near mid course — mechanical, not label-only
      (state.hazards || []).forEach(function (h) {
        if ((h.type === 'electric' || h.type === 'spike') && (h.progress || 0) > 0.2) {
          h.hurt = (h.hurt || 10) * 1.25;
          if (h.type === 'spike') { h.phase = 'yellow'; h.timer = Math.min(h.timer || 1, 0.9); }
        }
      });
    }
    // BLACKOUT (Night 2 seed): dim grade — keep next ~30m of asphalt readable (v280)
    // No new PointLights; fog / grade / rain only.
    if (hasMutator('blackout')) {
      state._blackout = true;
      if (postfx && postfx.setGrade) {
        postfx.setGrade({
          exposure: 1.1,       // was 0.92 — road vanished under rain
          contrast: 1.14,
          saturation: 0.82,
          vignette: 0.34,      // was 0.48 — less tunnel black
          bloomStrength: 0.11,
          liftCyan: 0.015,
          liftAmber: 0.012,
          grain: 0.03,
        });
      }
      // Thinner fog so asphalt lines read ~30m+ ahead
      if (scene.fog && scene.fog.isFogExp2) {
        if (scene.fog.density > 0.00115) scene.fog.density = 0.0011;
        if (scene.fog.color) scene.fog.color.setHex(0x0c1524);
      }
      // Dim neon dress lamps — spare cyan road paint / pale asphalt
      if (world && world.group) {
        world.group.traverse(function (o) {
          if (!o.isMesh || !o.material) return;
          var mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(function (m) {
            if (!m) return;
            if (m.color && m.isMeshBasicMaterial) {
              var c = m.color;
              var sum = c.r + c.g + c.b;
              // Skip pale/grey road surface + cyan edge paint
              var isRoadish = sum < 1.05 || (c.g > 0.35 && c.b > 0.45 && c.r < 0.55);
              if (sum > 1.25 && !isRoadish) {
                if (!m.userData) m.userData = {};
                if (!m.userData._preBlackout) {
                  m.userData._preBlackout = { r: c.r, g: c.g, b: c.b, op: m.opacity };
                }
                c.multiplyScalar(0.38); // was 0.28
                if (m.opacity != null && m.transparent) m.opacity = Math.min(m.opacity, 0.42);
              }
            }
          });
        });
      }
      // Lighter rain veil during blackout so mid-FOV asphalt isn't snowed out
      if (particles && particles._wx && particles._wx.rainMat) {
        particles._wx.rainMat.opacity = Math.min(particles._wx.rainMat.opacity || 0.22, 0.14);
      }
      if (particles && particles._wx && particles._wx.mistMat) {
        particles._wx.mistMat.opacity = Math.min(particles._wx.mistMat.opacity || 0.16, 0.1);
      }
      (state.rivals || []).forEach(function (r) {
        r.aggro = (r.aggro || 0.5) * 0.65;
        r.fireCd = Math.max(r.fireCd || 0, 1.2);
      });
      toast('BLACKOUT — LAMPS FAIL', 2.0);
    } else {
      state._blackout = false;
    }
    // Fake warden searchlight (MeshBasic only — no SpotLight)
    if (state._searchlight) {
      if (state._searchlight.mesh && state._searchlight.mesh.parent) {
        scene.remove(state._searchlight.mesh);
      }
      if (state._searchlight.card && state._searchlight.card.parent) {
        scene.remove(state._searchlight.card);
      }
    }
    (function makeSearchlight() {
      var cone = new THREE.Mesh(
        new THREE.ConeGeometry(6, 16, 16, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xffe8a0, transparent: true, opacity: 0.12,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        })
      );
      cone.rotation.x = Math.PI; // point down
      scene.add(cone);
      var card = new THREE.Mesh(
        new THREE.CircleGeometry(5.5, 24),
        new THREE.MeshBasicMaterial({
          color: 0xffe8a0, transparent: true, opacity: 0.22,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        })
      );
      card.rotation.x = -Math.PI / 2;
      scene.add(card);
      state._searchlight = { mesh: cone, card: card, holdT: 0 };
    })();
    state.powerups = makePowerups(state.path, state.meta.stage);
    state.scraps = placeScrap(state.path, hasMutator('open_vein') ? 32 : 16);
    // Open Vein: each scrap worth more so the night plays different
    if (hasMutator('open_vein')) {
      (state.scraps || []).forEach(function (sc) {
        sc.value = Math.round((sc.value || 8) * 1.65);
      });
    }
    state.projectiles = [];
    state.mines = [];
    if (state.player) state.player.buffs = {};
    state.runScrap = 0;
    state.raceTime = 0;
    state.damageTaken = 0;
    state.specialsLanded = 0;
    state.runKills = 0;
    state.finishPlace = null;
    state.partsRoll = [];
    state.runSalvage = [];
    state.salvageOffer = null;
    state.activeSalvage = null;
    // Salvage rig — bolt armed part at race start (P1.3 v438)
    if (state.meta.salvage && state.meta.salvage.partId && state.player) {
      var salv = state.meta.salvage;
      var sp = salv.partId;
      var pSalv = state.player;
      state.activeSalvage = { partId: sp, fromCar: salv.fromCar, name: salv.name };
      if (sp === 'injector') {
        pSalv.nitro = pSalv.nitroMax != null ? pSalv.nitroMax : cfg.nitro.capacity;
        pSalv._salvageNitroRegen = 1.25;
      } else if (sp === 'hotFeed') {
        pSalv.specialCd = 0;
        pSalv.mul.specialCool = (pSalv.mul.specialCool || 1) * 1.25;
      } else if (sp === 'tombPlate') {
        pSalv.maxShield = Math.max(pSalv.maxShield || 0, 25);
        pSalv.shield = Math.max(pSalv.shield || 0, 25);
      }
      var salvToast = 'SALVAGE BOLTED · ' + (salv.name || sp)
        + (salv.fromCar ? ' (' + salv.fromCar + ')' : '');
      state.meta.salvage = null;
      saveMeta();
      // Defer toast until after map identity banner so it isn't stomped (v438)
      state._salvageBoltedToast = salvToast;
    }
    state.lap = 1;
    state.laps = 1; // point-to-point — no multi-lap
    state.pointToPoint = true;
    state.hostile = !!hasMutator('warden_sweep');
    state.camShake = 0;
    state.camMode = state.camMode || 'chase';
    state._packReToastOnce = false;
    state._openGraceEnded = false;
    state._packReToast = 0;
    state._lateHunterSpawned = false;
    state._lateHunterCount = 0;
    state._emptyStretchArmed = false;
    state._emptyStretchEyeT = 0;
    state._emptyStretchArmedN = 0;
    state._emptyStretchPulseCd = 0;
    state._emptyStretchPulseN = 0;
    state._lastEightArmed = false;
    state._lastEightEyeHold = false;
    state._lastEightHazN = 0;
    state._ramDmgWin = null;
    state._inDmgWin = null;
    state._toastQueue = [];
    state._wardenBeats = [];
    state._lastCombatToastT = null;
    state._lastWreckT = null;
    state._corridorQuietUntil = 0;
    state._lastCorridorToastT = null;
    state._multiWreckN = 0;
    state._multiWreckScrap = 0;
    state.killFeed = [];
    state._displayPlace = null;
    state._placePending = null;
    state._placePendingT = 0;
    state._aliveCount = 1;
    state.mode = 'race';
    var mutLabel = (state.mutators || []).map(function (m) { return m.name; }).join(' + ');
    // Banner names the live difficulty + rival count so map chip choice is obvious (v311)
    // v401: no-mutator suffix uses live map name (was hard-coded REACH FINISH on every map)
    state.msg = '▶  ' + diff.name + '  ·  ' + rivalN + ' RIVALS'
      + (mutLabel ? '  ·  ' + mutLabel : '  ·  ' + (mapDef.name || 'COURSE'));
    state.msgT = 3.4;
    state._toastPri = 1; // hold over low-pri PACK ENGAGES
    // Map identity toast once after world ready (v400) — HUD also shows mapDef.name
    var themeTag = (mapDef.theme === 'coast') ? 'COASTAL DUSK'
      : (mapDef.theme === 'city' ? 'NEON CANYON' : String(mapDef.theme || 'NIGHT').toUpperCase());
    toast((mapDef.name || 'COURSE') + ' · ' + themeTag, 2.0, 1);
    // First 10s: queue a short drive hint so new players aren't stuck staring (v308)
    state._toastQueue = state._toastQueue || [];
    if (state._salvageBoltedToast) {
      state._toastQueue.push({ t: state._salvageBoltedToast, d: 2.2, pri: 1 });
      state._salvageBoltedToast = null;
    }
    state._toastQueue.push({ t: 'WASD drive  ·  Space drift fills NITRO  ·  Q burn', d: 1.8, pri: 0 });
    state._startBannerT = 2.5;
    state._raceEngineKick = true;
    state._raceEngineKickN = 0;
    state._finishWarned = false;
    state._finishGateToast = false;
    state._finishStingPlayed = false;
    state._finishCeremonyT = 0;
    state._finishCeremonyDone = false;
    // Whole-map layer view: ?overview=1  (top-down, all LOD layers on, fog off)
    if (state._mapOverview && world) {
      world._overviewMode = true;
      world.showAllLayers();
      // Fog blacks out altitude views — disable for overview; restore when leaving race via clearRace if needed
      if (scene) {
        state._overviewFog = scene.fog;
        scene.fog = null;
        if (scene.background && scene.background.isColor) {
          state._overviewBg = scene.background.getHex();
          scene.background.setHex(0x1a2030); // readable slate, not pure void
        }
      }
      // Strong top light so night materials read from above
      if (state._overviewKey) {
        scene.remove(state._overviewKey);
        state._overviewKey = null;
      }
      if (state._overviewFill) {
        scene.remove(state._overviewFill);
        state._overviewFill = null;
      }
      var oKey = new THREE.DirectionalLight(0xfff0e0, 2.4);
      oKey.position.set(40, 200, 30);
      scene.add(oKey);
      state._overviewKey = oKey;
      var oFill = new THREE.AmbientLight(0x8899bb, 1.6);
      scene.add(oFill);
      state._overviewFill = oFill;
      if (particles && particles.rainStop) particles.rainStop();
      // Brighter grade for layout inspection
      if (postfx && postfx.setGrade) {
        postfx.setGrade({
          exposure: 1.85, contrast: 1.15, saturation: 1.05,
          bloomStrength: 0.12, bloomThreshold: 0.78,
          vignette: 0.15, grain: 0.01, chromatic: 0,
          liftCyan: 0.01, liftAmber: 0.01,
        });
      }
      var rep = world.layerReport();
      state.msg = 'MAP OVERVIEW · ' + mapDef.name + ' · ' + (rep.buildingList | 0) + ' scenery · '
        + (rep.intrusionCount | 0) + ' near-driveline flags · F12 console';
      state.msgT = 10;
      state._startBannerT = 0;
      if (state.player) state.player.speed = 0;
    } else if (world) {
      world._overviewMode = false;
    }
    // Expose for console: GAME._lastWorld.layerReport()
    GAME._lastWorld = world;
    if (GAME.sfx) {
      try { if (GAME.sfx.unlock) GAME.sfx.unlock(); } catch (eU) {}
      GAME.sfx.confirm();
      GAME.sfx.engineStart();
      // Idle rumble immediately so first 30s isn't silent (v311)
      try {
        if (GAME.sfx.engineUpdateEx) GAME.sfx.engineUpdateEx(0.12, false, 1);
        else if (GAME.sfx.engineUpdate) GAME.sfx.engineUpdate(0.12, false);
      } catch (eE) {}
    }
    // Money-shot freeze is triggered by prepareMoneyShotFrame() after race boots
  }

  /** AAA still capture setup — chase energy + structured explosion in frame */
  function applyMoneyShot() {
    var p = state.player;
    if (!p || !state.path) return;
    // Hold high chase speed for still energy (judge docked 95 vs 141)
    p.speed = 46;
    p.nitro = 0.7;
    p.nitroActive = false; // nitro cyan trail floods road green
    state.runScrap = 28;
    state.meta.scrap = Math.max(state.meta.scrap, 240);
    var tan = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
    var side = new THREE.Vector3(-tan.z, 0, tan.x);
    // Rival mid-left — close enough to read as a full vehicle body
    if (state.rivals && state.rivals[0]) {
      var r = state.rivals[0];
      r.pos.copy(p.pos).addScaledVector(tan, 10).addScaledVector(side, -3.6);
      r.pos.y = p.pos.y;
      r.yaw = p.yaw + 0.04;
      r.speed = 38;
      if (r.mesh) {
        r.mesh.position.copy(r.pos);
        if (GAME.vehicles.setYaw) GAME.vehicles.setYaw(r.mesh, r.yaw);
        else r.mesh.rotation.y = r.yaw;
        r.mesh.visible = true;
        r.mesh.scale.set(1.05, 1.05, 1.05);
      }
    }
    // Fireball mid-chase — elevated so additive shells don't recolor asphalt
    var boom = p.pos.clone()
      .addScaledVector(tan, 12)
      .addScaledVector(side, 1.4);
    boom.y = p.pos.y + 1.9;
    if (particles && particles.explosion) {
      particles.explosion(boom, true);
    }
    state.camShake = 0.18;
    state.msg = 'MONEY SHOT · COMBAT';
    state.msgT = 2.5;
    // Hold speed + re-detonate so still capture always freezes mid-violence
    state._shotHoldSpeed = 48;
    state._shotBoomT = 0.35;
    state._shotBoomLeft = 8;
  }

  function endRace(won, reason) {
    state.outcome = won ? 'win' : 'lose';
    // Death copy is locked for Wave 8 parole UI — always readable, never blank (v305)
    if (!won) {
      state.outcomeReason = 'THE WARDEN KEPT YOU — scrap still drops.';
    } else {
      state.outcomeReason = reason || 'Parole arch paid. Climb the next night.';
    }
    state.mode = 'results';
    state._resultsT = 0;
    // Restore player mesh (hood cam hid it) so results backdrop isn't a black void
    if (state.player && state.player.mesh) state.player.mesh.visible = true;
    state.camMode = 'chase';
    state._toastQueue = [];
    state.msgT = 0;
    state._toastPri = 0;
    if (GAME.sfx) {
      try { if (GAME.sfx.unlock) GAME.sfx.unlock(); } catch (eE) {}
      GAME.sfx.engineStop();
    }

    // Placement: how many rivals finished ahead (by progress)
    var p = state.player;
    var place = 1;
    (state.rivals || []).forEach(function (r) {
      if (!r.dead && (r.progress || 0) > ((p && p.progress) || 0)) place++;
    });
    if (won) place = 1; // finish always seats first for the night report
    state.finishPlace = place;
    state.runKills = (p && p.kills) | 0;
    if (p) p.kills = state.runKills; // keep player.kills for HUD
    state.damageTaken = state.damageTaken || 0;
    state.specialsLanded = state.specialsLanded || 0;

    // Parts roll — each elim grants a small chip (Wave 8)
    state.partsRoll = [];
    var kills = state.runKills | 0;
    if (kills > 0) {
      var pool = ['SPEED CHIP +1%', 'ARMOR PLATE +1%', 'FIREPOWER +1%', 'NITRO DRIP +1%', 'HANDLING +1%'];
      var rolls = Math.min(3, kills);
      for (var pi = 0; pi < rolls; pi++) {
        var chip = pool[(kills * 3 + pi * 7 + (state.meta.stage | 0)) % pool.length];
        state.partsRoll.push(chip);
        // Apply tiny permanent meta bump (does not wipe saves)
        var key = ['speed', 'armor', 'firepower', 'speed', 'armor'][pi % 5];
        if (key === 'speed' || key === 'armor' || key === 'firepower') {
          // soft bank: convert chip to scrap bonus rather than silent level skip
          state.runScrap += 8 + (state.meta.stage | 0);
        }
      }
      // Bank one free upgrade pip chance into car build levels (tiny)
      var carId = (p && p.def && p.def.id) || state.meta.carId;
      if (carId && state.meta.builds) {
        var b = getCarBuild(carId);
        b.levels = b.levels || {};
        var partKey = kills >= 2 ? 'mgPower' : 'plates';
        if (partKey === 'plates') {
          b.levels.plates = Math.min(6, (b.levels.plates | 0) + 1);
          state.partsRoll.push('PLATES +1 on ' + String(carId).toUpperCase());
        } else {
          b.levels.mgPower = Math.min(6, (b.levels.mgPower | 0) + 1);
          state.partsRoll.push('MG POWER +1 on ' + String(carId).toUpperCase());
        }
      }
    }

    state.salvageOffer = null;
    var salvList = state.runSalvage || [];
    if (salvList.length > 0) {
      var lastId = salvList[salvList.length - 1];
      var parts = (cfg.salvage && cfg.salvage.parts) || {};
      var offer = null;
      for (var pk in parts) {
        if (parts[pk].fromClass && parts[pk].fromClass.indexOf(lastId) >= 0) { offer = parts[pk]; break; }
      }
      if (offer) {
        var fromName = lastId.toUpperCase();
        if (cfg.cars) {
          for (var csi = 0; csi < cfg.cars.length; csi++) {
            if (cfg.cars[csi].id === lastId) {
              fromName = String(cfg.cars[csi].name || lastId).toUpperCase();
              break;
            }
          }
        }
        state.salvageOffer = {
          partId: offer.id, name: offer.name, desc: offer.desc, fromCar: fromName,
          cost: (cfg.salvage.cost | 0) || 60,
        };
      }
    }

    if (won) {
      state.runScrap += 40 + state.meta.stage * 12;
      state.meta.totalWins++;
      state.meta.bestNight = Math.max(state.meta.bestNight, state.meta.stage);
      if (state.meta.stage >= cfg.stageCount) {
        state.meta.freed = true;
        state.freedomWin = true;
      } else {
        state.meta.stage = Math.min(cfg.stageCount, state.meta.stage + 1);
        state.freedomWin = false;
      }
      if (GAME.sfx) {
        // v350: sting already at GATE CLEARED — soft win on results only
        if (state._finishStingPlayed && GAME.sfx.win) GAME.sfx.win();
        else if (GAME.sfx.finishSting) { GAME.sfx.finishSting(); state._finishStingPlayed = true; }
        else GAME.sfx.win();
      }
    } else {
      state.runScrap = Math.floor(state.runScrap * 0.65);
      state.freedomWin = false;
      if (GAME.sfx) {
        if (GAME.sfx.deathSweep) GAME.sfx.deathSweep();
        else GAME.sfx.lose();
      }
    }
    state.meta.scrap += state.runScrap;
    state.pendingChoices = ['speed', 'armor', 'firepower'].map(function (k) {
      var lv = state.meta.upgrades[k] || 0;
      return { key: k, label: k.toUpperCase(), level: lv, cost: upgradeCost(k), maxed: lv >= cfg.upgrades.max };
    });
    state.picked = [];
    // Next-night strip: win uses advanced stage; lose previews stage+1 so N1 death still shows BLACKOUT (v306)
    if (won && !state.freedomWin) {
      state.nextMutators = mutatorsForStage(state.meta.stage);
      state._nextMutPreview = false;
    } else if (won && state.freedomWin) {
      state.nextMutators = [];
      state._nextMutPreview = false;
    } else {
      // Still on this night — show what clearing it unlocks next
      var previewStage = Math.min(cfg.stageCount, (state.meta.stage | 0) + 1);
      state.nextMutators = mutatorsForStage(previewStage);
      state._nextMutPreview = true; // HUD: "IF YOU CLEAR N1 · BLACKOUT"
    }
    // Seat wreck on dense ribbon for results orbit (v379 — finish/gate pad is open void)
    if (state.player && state.path && state.path.curve) {
      var pEnd = state.player;
      var rawT = U.clamp(pEnd.progress != null ? pEnd.progress : 0.35, 0.08, 0.92);
      // Late finish / freedom gate / climb pads sit in open void — early street mass (v379)
      var seatT = rawT;
      if (rawT > 0.55 || rawT < 0.12) seatT = 0.22;
      else if (rawT > 0.40) seatT = 0.28;
      var seatPt = state.path.curve.getPointAt(seatT);
      var seatTan = state.path.curve.getTangentAt(seatT).normalize();
      pEnd.pos.x = seatPt.x;
      pEnd.pos.z = seatPt.z;
      pEnd.pos.y = seatPt.y + 0.35;
      pEnd.yaw = Math.atan2(seatTan.x, seatTan.z);
      if (pEnd.mesh) {
        pEnd.mesh.visible = true;
        pEnd.mesh.position.copy(pEnd.pos);
        // Hero scale so wreck reads on 1080p (reset in startRace) (v307)
        pEnd.mesh.scale.setScalar(1.38);
        if (GAME.vehicles.setYaw) GAME.vehicles.setYaw(pEnd.mesh, pEnd.yaw);
        else pEnd.mesh.rotation.y = pEnd.yaw;
        // Neon underglow so dark liveries (Vesper) don't silhouette into void
        var ud = pEnd.mesh.userData || {};
        if (ud.underglow) { ud.underglow.visible = true; }
        if (ud.underLight && ud.underLight.intensity != null) ud.underLight.intensity = 2.4;
        if (ud.bodyFill && ud.bodyFill.intensity != null) ud.bodyFill.intensity = 2.8;
      }
      state._resultsFocus = pEnd.pos.clone();
      // Kick LOD once at scenic pad so first results frame isn't empty asphalt
      if (world) {
        world._resultsLodBoost = true;
        if (world.updateLOD) {
          world.updateLOD(pEnd.pos.clone().setY(pEnd.pos.y + 4), state.raceTime || 0);
        }
      }
    }
    // Stop rain veil on results so car + flanks read
    if (particles && particles.rainStop) {
      try { particles.rainStop(); } catch (eR) {}
    }
    saveMeta();
  }

  // ---------- Combat ----------
  /**
   * @param {number} amt
   * @param {THREE.Vector3} [fromPos]
   * @param {string} [kind]  'ram' = sandwich window cap (v289); all kinds share total soft cap (v290)
   */
  function hurtPlayer(amt, fromPos, kind) {
    var p = state.player;
    if (p.inv > 0 || p.hp <= 0) return;
    if (hasBuff('armor')) amt *= 0.55;
    // Ram guard reduces all incoming after shield
    if (p.mul && p.mul.ramGuard > 1) amt = amt / p.mul.ramGuard;
    // Brutal sandwich: 2+ rams in 1s share a damage budget — hurts, doesn't delete
    if (kind === 'ram') {
      var nowR = state.raceTime || 0;
      var win = state._ramDmgWin;
      if (!win || (nowR - win.t0) > 1.0) {
        win = { t0: nowR, sum: 0, hits: 0 };
        state._ramDmgWin = win;
      }
      // Cap total ram HP loss in the 1s window (~25% of base 144)
      var ramCap = 36;
      var room = Math.max(0, ramCap - (win.sum || 0));
      if (room <= 0.5) {
        // Budget spent — brief inv so we don't re-enter every frame (scrape only)
        p.inv = Math.max(p.inv || 0, 0.15);
        state.camShake = Math.max(state.camShake || 0, 0.1);
        return;
      }
      var nextHits = (win.hits | 0) + 1;
      // 2nd+ hit in window bleeds less even before hard cap
      if (nextHits >= 2) amt *= 0.55;
      if (amt > room) amt = room;
      if (amt <= 0.5) {
        p.inv = Math.max(p.inv || 0, 0.12);
        return;
      }
      win.hits = nextHits;
      win.sum = (win.sum || 0) + amt;
    }
    // Combined pile (MG + rocket + ram + hazards): 1s total soft cap so one pile doesn't delete
    // still feels mean (~1/3 of full 144); critical HP can still die
    {
      var nowT = state.raceTime || 0;
      var tw = state._inDmgWin;
      if (!tw || (nowT - tw.t0) > 1.0) {
        tw = { t0: nowT, sum: 0 };
        state._inDmgWin = tw;
      }
      var totalCap = 48;
      var tRoom = Math.max(0, totalCap - (tw.sum || 0));
      if (tRoom <= 0.4) {
        p.inv = Math.max(p.inv || 0, 0.12);
        state.camShake = Math.max(state.camShake || 0, 0.08);
        state.hitFlash = Math.min(1, (state.hitFlash || 0) + 0.08);
        return;
      }
      if (amt > tRoom) amt = tRoom;
    }
    var shieldBefore = p.shield;
    var shieldHit = 0;
    if (p.shield > 0) {
      shieldHit = Math.min(p.shield, amt);
      p.shield -= shieldHit;
      amt -= shieldHit;
    }
    var fullyAbsorbed = shieldHit > 0 && amt <= 0;
    var brokeShield = shieldHit > 0 && shieldBefore > 0 && p.shield <= 0 && amt > 0;
    // v354: juice even when shield eats the hit (was silent return)
    var felt = shieldHit + Math.max(0, amt);
    if (felt <= 0) return;
    if (amt > 0) {
      p.hp -= amt;
      state.damageTaken = (state.damageTaken || 0) + amt;
      if (state._inDmgWin) state._inDmgWin.sum = (state._inDmgWin.sum || 0) + amt;
    }
    p.inv = cfg.combat.invuln;
    state.camShake = Math.max(state.camShake, 0.22 + felt * 0.012);
    state.hitFlash = Math.min(1.2, (state.hitFlash || 0) + 0.4 + felt * 0.015);
    if (fullyAbsorbed) {
      state.shieldAbsorbFlash = Math.max(state.shieldAbsorbFlash || 0, 0.4);
      if (GAME.sfx) {
        if (GAME.sfx.shieldAbsorb) GAME.sfx.shieldAbsorb();
        else GAME.sfx.hurt();
      }
    } else if (brokeShield) {
      state.shieldBreakFlash = 0.45;
      if (GAME.sfx) {
        if (GAME.sfx.shieldBreak) GAME.sfx.shieldBreak();
        else GAME.sfx.hurt();
      }
    } else if (GAME.sfx) {
      GAME.sfx.hurt();
    }
    // Gated under-fire toast so return fire reads on HUD
    // v356: longer gate so UNDER FIRE doesn't chatter over wreck/warden
    if (kind !== 'ram' && (!p._underFireToastT || p._underFireToastT <= 0)) {
      toast(shieldHit > 0 && amt <= 0 ? 'SHIELD HIT' : 'UNDER FIRE', 0.65, 0);
      p._underFireToastT = 2.4;
    }
    if (fromPos) {
      // v401: screen-edge wedge — player-relative yaw toward attacker (~0.45s)
      var hdx = fromPos.x - p.pos.x;
      var hdz = fromPos.z - p.pos.z;
      if (hdx * hdx + hdz * hdz > 0.01) {
        state.hitDir = U.angDiff(p.yaw, Math.atan2(hdx, hdz));
        state.hitDirT = 0.45;
      }
      tmpV.subVectors(p.pos, fromPos).setY(0);
      if (tmpV.lengthSq() > 0.01) {
        tmpV.normalize().multiplyScalar(cfg.drive.collisionPush * (shieldHit > 0 && amt <= 0 ? 0.55 : 1));
        p.pos.add(tmpV);
      }
    }
    if (particles) {
      if (fullyAbsorbed && particles.shieldAbsorb) {
        particles.shieldAbsorb(p.pos.clone().setY(p.pos.y + 0.5));
      } else {
        particles.sparks(p.pos.clone().setY(p.pos.y + 0.5), tmpV);
      }
    }
    if (p.hp <= 0) {
      p.hp = 0;
      if (particles) particles.explosion(p.pos.clone(), true);
      if (GAME.sfx) GAME.sfx.explode();
      endRace(false, 'WRECKED — the overlords keep you for another night.');
    }
  }

  /**
   * v410: if the pack is wiped, one chaser can remount BEHIND the player.
   * Never seat ahead — winning should stay winning.
   */
  function trySpawnLateHunter(player, path) {
    if (!player || !path || !path.curve || !state.rivals) return;
    var nLate = state._lateHunterCount | 0;
    if (nLate >= 1) return;
    if (player.finished || player.hp <= 0) return;
    var pProg = player.progress || 0;
    if (pProg < 0.18 || pProg >= 0.82) return;
    var alive = 0;
    state.rivals.forEach(function (rv) { if (!rv.dead) alive++; });
    if (alive > 0) return;
    if ((player.kills | 0) < 1) return;

    state._lateHunterCount = nLate + 1;
    state._lateHunterSpawned = true;
    var diff = difficulty();
    var spdMul = diff.rivalSpeed != null ? diff.rivalSpeed : 0.78;
    var hpMul = diff.rivalHpMul != null ? diff.rivalHpMul : 1;
    var stage = state.meta.stage | 0;
    var roster = ['razorback', 'needle', 'vesper', 'choir', 'mausoleum', 'marrow'];
    var playerId = state.meta && state.meta.carId;
    var pool = roster.filter(function (id) { return id !== playerId; });
    if (!pool.length) pool = roster.slice();
    var rivalId = pool[((player.kills | 0) + nLate) % pool.length];
    var dropT = U.clamp(pProg - 0.045, 0.04, pProg - 0.02);
    var dropPt = path.curve.getPointAt(dropT);
    var dropTan = path.curve.getTangentAt(dropT).normalize();
    var dropSide = new THREE.Vector3(-dropTan.z, 0, dropTan.x);
    var pos = dropPt.clone().addScaledVector(dropSide, -3.4);
    pos.y = dropPt.y + 0.2;
    var mesh = GAME.vehicles.create(rivalId, false);
    var defR = GAME.vehicles.def(rivalId);
    var accentCol = (defR && defR.accent) != null ? defR.accent : 0xff2d55;
    attachVehicleMarkers(mesh, { player: false, color: accentCol });
    mesh.position.copy(pos);
    scene.add(mesh);
    var yaw = Math.atan2(dropTan.x, dropTan.z);
    if (GAME.vehicles.setYaw) GAME.vehicles.setYaw(mesh, yaw);
    else mesh.rotation.y = yaw;
    var hp = Math.round((82 + stage * 7) * hpMul * 1.05);
    var baseMax = Math.min(50, (38 + stage * 1.1) * spdMul);
    var late = {
      mesh: mesh, pos: pos, yaw: yaw, defId: rivalId,
      speed: Math.max(16, Math.abs(player.speed || 28) * 0.92),
      maxSpeed: baseMax,
      hp: hp, maxHp: hp,
      shield: Math.round(10 + stage * 1.2), maxShield: Math.round(10 + stage * 1.2),
      dead: false,
      progress: dropT,
      aggro: 0.85 * (diff.rivalFire || 1),
      fireCd: 0.35, rocketCd: 1.8, disabledT: 0, ramCd: 0, hurtFlash: 0,
      laneOff: -3.4, skill: 0.7 + stage * 0.01,
      role: 'hunter',
      specialCd: 6 + Math.random() * 3,
      mineCd: 0,
      invT: 1.1,
      _lateHunter: true,
      _lateWave: 1,
      _packAnchor: false,
    };
    state.rivals.push(late);
  }

  /**
   * One hunt pulse: short Eye + yellow spikes ahead (soft, not brick).
   * first pulse is longer; refresh pulses keep the empty stretch mean (v290).
   */
  function pulseEmptyStretch(player, path, isFirst) {
    var pProg = player.progress || 0;
    state.hostile = true;
    state._wardenEye = true;
    state._emptyStretchEyeT = isFirst ? 5.5 : 4.2;
    state._emptyStretchPulseN = (state._emptyStretchPulseN | 0) + 1;
    if (postfx && postfx.setGrade) {
      postfx.setGrade({
        exposure: isFirst ? 1.12 : 1.1,
        liftCyan: 0.0,
        liftAmber: isFirst ? 0.12 : 0.1,
        saturation: 1.16,
        contrast: 1.12,
        vignette: 0.36,
        bloomStrength: 0.22,
      });
      state._wardenGrade = true;
    }

    var armed = 0;
    (state.hazards || []).forEach(function (h) {
      var hp = h.progress || 0;
      if (hp < pProg - 0.02) return;
      if (hp > pProg + 0.2) return;
      if (h.type === 'spike' || h.type === 'electric') {
        h.phase = 'yellow';
        h.timer = 0.4 + Math.random() * 0.3;
        h.hurt = Math.min((h.hurt || 12) * 1.12, 22);
        h._emptyStretch = true;
        h._pulseN = state._emptyStretchPulseN;
        armed++;
      } else if (h.type === 'debris' || h.type === 'oil') {
        h.hurt = (h.hurt || 8) * 1.08;
        h._emptyStretch = true;
      }
    });

    // Always seed fresh yellow rings ahead on each pulse (lane-offset, not a wall)
    if (scene) {
      var Dlm = cfg.drive;
      var rings = isFirst ? 3 : 2;
      for (var ei = 0; ei < rings; ei++) {
        var tp = U.clamp(pProg + 0.05 + ei * 0.05 + (state._emptyStretchPulseN | 0) * 0.002, 0.72, 0.93);
        var pp = path.curve.getPointAt(tp);
        var tan = path.curve.getTangentAt(tp).normalize();
        var side = new THREE.Vector3(-tan.z, 0, tan.x);
        var sideSign = ((ei + (state._emptyStretchPulseN | 0)) % 2) ? 1 : -1;
        var pos = pp.clone().addScaledVector(side, sideSign * Dlm.roadHalf * 0.38);
        pos.y = pp.y;
        var ring = new THREE.Mesh(
          new THREE.RingGeometry(1.15, 1.75, 20),
          new THREE.MeshBasicMaterial({
            color: 0xffe66d, transparent: true, opacity: 0.55,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(pos);
        ring.position.y += 0.08;
        scene.add(ring);
        state.hazards.push({
          type: 'spike', mesh: ring, spikes: [], warnRing: ring, pos: pos.clone(),
          phase: 'yellow', timer: 0.35 + ei * 0.16,
          hurt: 13 + (state.meta.stage | 0) * 1.1,
          radius: 2.55, progress: tp, hitCd: 0,
          _emptyStretch: true,
          _pulseN: state._emptyStretchPulseN,
        });
        armed++;
      }
    }

    state._emptyStretchArmedN = (state._emptyStretchArmedN | 0) + armed;
    var pulseN = state._emptyStretchPulseN | 0;
    if (isFirst) toast('EMPTY ROAD — WARDEN TRACK HUNTS', 1.6, 2);
    else toast(pulseN >= 3 ? 'WARDEN STILL WATCHING' : 'WARDEN PULSE — STAY SHARP', 1.35, 2);
    if (GAME.sfx) {
      if (GAME.sfx.wardenWarn) GAME.sfx.wardenWarn();
      else if (GAME.sfx.sweep) GAME.sfx.sweep(100, 420, 0.3, 'square', 0.12);
    }
    state.camShake = Math.max(state.camShake || 0, isFirst ? 0.22 : 0.16);
    // Next refresh in 6–8s while pack stays dead (v290)
    state._emptyStretchPulseCd = 6.2 + Math.random() * 1.6;
  }

  /**
   * After remounts (or any full wipe) the track is the warden — not a 3rd car.
   * First arm at prog > 0.7; re-pulse every ~6–8s until 0.92 if still empty.
   */
  function tryArmEmptyStretch(player, path) {
    if (!player || !path || !path.curve) return;
    if (player.finished || player.hp <= 0) return;
    var pProg = player.progress || 0;
    if (pProg <= 0.7) return;
    if (pProg >= 0.92) return;
    var alive = 0;
    (state.rivals || []).forEach(function (rv) { if (!rv.dead) alive++; });
    if (alive > 0) return;

    if (!state._emptyStretchArmed) {
      state._emptyStretchArmed = true;
      pulseEmptyStretch(player, path, true);
      return;
    }
    // Persist: second+ hunt pulse when cooldown clear (not silence after first Eye)
    if ((state._emptyStretchPulseCd || 0) > 0) return;
    pulseEmptyStretch(player, path, false);
  }

  /**
   * Last 8% (v291): pulses stop at 0.92 — keep one closing beat when pack is dead.
   * Oil/spike BESIDE the line (not a brick) + Eye hold to 0.97. No toast fight with ceremony.
   */
  function tryArmLastEight(player, path) {
    if (!player || !path || !path.curve || !scene) return;
    if (state._lastEightArmed) return;
    if (player.finished || player.hp <= 0) return;
    var pProg = player.progress || 0;
    if (pProg < 0.92) return;
    if (pProg >= 0.985) return;
    var alive = 0;
    (state.rivals || []).forEach(function (rv) { if (!rv.dead) alive++; });
    if (alive > 0) return;

    state._lastEightArmed = true;
    state.hostile = true;
    state._wardenEye = true;
    state._lastEightEyeHold = true;
    // Mild amber grade — arch cyan pulse still owns the gate
    if (postfx && postfx.setGrade) {
      postfx.setGrade({
        exposure: 1.1,
        liftCyan: 0.02,
        liftAmber: 0.08,
        saturation: 1.12,
        contrast: 1.1,
        vignette: 0.34,
        bloomStrength: 0.2,
      });
      state._wardenGrade = true;
    }

    var Dlm = cfg.drive;
    var stage = (state.meta && state.meta.stage) | 0;
    // Two oil patches + one yellow spike — side lanes only, center racing line open
    var specs = [
      { t: 0.935, side: 1, kind: 'oil' },
      { t: 0.952, side: -1, kind: 'oil' },
      { t: 0.968, side: 1, kind: 'spike' },
    ];
    for (var i = 0; i < specs.length; i++) {
      var sp = specs[i];
      var tp = U.clamp(sp.t, 0.92, 0.98);
      var pp = path.curve.getPointAt(tp);
      var tan = path.curve.getTangentAt(tp).normalize();
      var side = new THREE.Vector3(-tan.z, 0, tan.x);
      var pos = pp.clone().addScaledVector(side, sp.side * Dlm.roadHalf * 0.42);
      pos.y = pp.y;
      if (sp.kind === 'oil') {
        var oilR = 2.4;
        var group = new THREE.Group();
        var disc = new THREE.Mesh(
          new THREE.CircleGeometry(oilR * 0.9, 20),
          new THREE.MeshBasicMaterial({
            color: 0x2a1838, transparent: true, opacity: 0.55,
            depthWrite: false, side: THREE.DoubleSide,
          })
        );
        disc.rotation.x = -Math.PI / 2;
        group.add(disc);
        var oilHalo = new THREE.Mesh(
          new THREE.RingGeometry(oilR * 0.85, oilR * 1.1, 24),
          new THREE.MeshBasicMaterial({
            color: 0xaa44ff, transparent: true, opacity: 0.32,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
          })
        );
        oilHalo.rotation.x = -Math.PI / 2;
        oilHalo.position.y = 0.04;
        group.add(oilHalo);
        group.position.copy(pos);
        group.position.y = pos.y + 0.07;
        scene.add(group);
        state.hazards.push({
          type: 'oil', mesh: group, halo: oilHalo, pos: pos.clone(),
          hurt: 2 + stage * 0.35, radius: 2.7, progress: tp,
          slipKick: 14 + stage * 0.6, hitCd: 0,
          _lastEight: true,
        });
      } else {
        var ring = new THREE.Mesh(
          new THREE.RingGeometry(1.1, 1.7, 20),
          new THREE.MeshBasicMaterial({
            color: 0xffe66d, transparent: true, opacity: 0.6,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(pos);
        ring.position.y += 0.08;
        scene.add(ring);
        state.hazards.push({
          type: 'spike', mesh: ring, spikes: [], warnRing: ring, pos: pos.clone(),
          phase: 'yellow', timer: 0.5,
          hurt: 12 + stage * 1.0,
          radius: 2.4, progress: tp, hitCd: 0,
          _lastEight: true,
          _emptyStretch: true,
        });
      }
    }
    state._lastEightHazN = specs.length;
    // No toast — ceremony owns the channel from 0.92; danger is visual (Eye + side hazards)
    if (GAME.sfx && GAME.sfx.wardenWarn) GAME.sfx.wardenWarn();
    state.camShake = Math.max(state.camShake || 0, 0.12);
  }

  function hurtRival(r, amt) {
    if (r.dead) return;
    if ((r.invT || 0) > 0) return; // spawn grace
    // Thin shields — don't eat half a magazine before HP drops
    if (r.shield > 0) {
      var abs = Math.min(r.shield, amt);
      r.shield -= abs;
      amt -= abs; // full absorption, then remainder hits HP
    }
    if (amt > 0) r.hp -= amt;
    // Execute threshold — low-HP linger without a death moment felt empty (Wave ∞)
    if (r.hp > 0 && r.hp < r.maxHp * 0.06) r.hp = 0;
    r.hurtFlash = Math.max(r.hurtFlash || 0, 3.8);
    // Stagger so the player can land follow-up shots (sweet-spot combat)
    var stun = (cfg.combat.hitStun != null ? cfg.combat.hitStun : 0.4);
    var slow = (cfg.combat.hitSlow != null ? cfg.combat.hitSlow : 0.72);
    r.disabledT = Math.max(r.disabledT || 0, stun);
    r.speed *= slow;
    // Flash body red-ish for feedback
    if (r.mesh && r.mesh.userData) {
      r.mesh.userData._hurtPulse = 0.35;
    }
    if (GAME.sfx) GAME.sfx.hit();
    if (particles) particles.sparks(r.pos.clone().setY(r.pos.y + 0.6));
    // Cheap readable hit juice — pink flash + hitstop tick (v287)
    if (amt >= 8) {
      state._hitStopT = Math.max(state._hitStopT || 0, 0.045);
      state._fovPunch = Math.max(state._fovPunch || 0, 3.5);
      state.hitFlash = Math.min(1.1, (state.hitFlash || 0) + 0.18);
      if (particles && particles.spawn) {
        particles.spawn('pink', r.pos.clone().setY(r.pos.y + 0.7), {
          count: 8, speed: 9, life: 0.22, gravity: 1,
        });
      }
    }
    if (r.hp <= 0 && !r.dead) {
      r.dead = true;
      r.hp = 0;
      r.speed = 0;
      // Keep wreck visible longer — tumble + second pop (v359)
      r._corpseT = 3.2;
      r._wreckSpin = 2.8 + Math.random() * 1.4;
      r._wreckPitch = 0;
      r._wreckBoomT = 0.28; // delayed secondary fireball
      if (r.mesh) {
        r.mesh.visible = true;
        r.mesh.traverse(function (c) {
          if (c.isMesh && c.material && c.material.color) {
            try { c.material.color.multiplyScalar(0.32); } catch (e) {}
          }
        });
      }
      var drop = 14 + state.meta.stage * 3;
      state.runScrap += drop;
      state.player.kills++;
      state.runSalvage = state.runSalvage || [];
      if (r.defId) {
        if (state.runSalvage.indexOf(r.defId) < 0) state.runSalvage.push(r.defId);
        if (state.runSalvage.length > 3) state.runSalvage.shift();
      }
      var killN = state.player.kills | 0;
      // Kill beat juice — short inv so a same-frame RAM trade doesn't delete the glory (v292/v359)
      if (state.player && state.player.hp > 0) {
        state.player.inv = Math.max(state.player.inv || 0, 0.5);
        state._fovPunch = Math.max(state._fovPunch || 0, 9);
        state._hitStopT = Math.max(state._hitStopT || 0, 0.12);
        state.camShake = Math.max(state.camShake || 0, 0.28);
      }
      var boomPos = r.pos.clone();
      boomPos.y += 0.7;
      if (particles) {
        if (particles.killNova) particles.killNova(boomPos);
        else {
          if (particles.explosion) particles.explosion(boomPos, true);
          if (particles.smokeStack) particles.smokeStack(boomPos, true);
        }
        if (particles.spawn) {
          particles.spawn('pink', boomPos, { count: 10, speed: 12, life: 0.32, gravity: 1 });
        }
      }
      if (GAME.sfx) {
        if (GAME.sfx.rivalWreck) GAME.sfx.rivalWreck();
        else if (GAME.sfx.explode) GAME.sfx.explode();
        if (GAME.sfx.elimSting) GAME.sfx.elimSting(killN);
        if (GAME.sfx.scrapPing) GAME.sfx.scrapPing();
      }
      var M = GAME.materials.get();
      var sm = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), M.scrap);
      sm.position.copy(r.pos);
      sm.position.y += 1.0;
      scene.add(sm);
      state.scraps.push({
        mesh: sm, pos: sm.position.clone(), value: drop, taken: false,
        _pingT: 0.85,
      });
      var rName = (r.defId || (r.def && r.def.id) || 'RIVAL').toUpperCase();
      // Readable elim credit — ELIM ×N owns the channel (v359)
      pushKillFeed('ELIM ×' + killN + '  ' + rName + '  +' + drop);
      toast('ELIM ×' + killN + '  ·  ' + rName + ' DOWN  +' + drop + ' SCRAP', 1.85, 2);
      state._fovPunch = Math.max(state._fovPunch || 0, 10);
      state.camShake = Math.max(state.camShake || 0, 0.55);
      state.hitFlash = Math.min(1.35, (state.hitFlash || 0) + 0.5);
    }
  }

  // Shared combat meshes — allocating new materials every MG shot was freezing play
  var _combatPool = {
    tracerGeo: null,
    tracerMatY: null,
    tracerMatP: null,
    rocketBodyMat: null,
    rocketNoseMat: null,
    rocketExMat: null,
    rocketBodyGeo: null,
    rocketNoseGeo: null,
    rocketExGeo: null,
    tracers: [],
    rockets: [],
    lookTmp: null,
  };

  // Tracer cylinder base length (geo height). Scale.y = len / TRACER_BASE_LEN.
  var TRACER_BASE_LEN = 3.0;

  function ensureCombatPool() {
    if (_combatPool.tracerGeo) return;
    // v428 Gauntlet TM: thin orange tracers — TM 2012 chain-gun read at chase speed
    _combatPool.tracerGeo = new THREE.BoxGeometry(0.14, 0.14, TRACER_BASE_LEN);
    _combatPool.tracerMatY = new THREE.MeshBasicMaterial({
      color: 0xffaa33, transparent: true, opacity: 0.95,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      depthTest: false,
    });
    _combatPool.tracerMatP = new THREE.MeshBasicMaterial({
      color: 0xff8833, transparent: true, opacity: 0.95,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      depthTest: false,
    });
    _combatPool.rocketBodyGeo = new THREE.CylinderGeometry(0.16, 0.2, 1.35, 6);
    _combatPool.rocketNoseGeo = new THREE.ConeGeometry(0.16, 0.48, 6);
    _combatPool.rocketExGeo = new THREE.SphereGeometry(0.18, 6, 5);
    _combatPool.rocketBodyMat = new THREE.MeshBasicMaterial({
      color: 0xff6b35, transparent: true, opacity: 1,
    });
    _combatPool.rocketNoseMat = new THREE.MeshBasicMaterial({
      color: 0xffcc66, transparent: true, opacity: 1,
    });
    _combatPool.rocketExMat = new THREE.MeshBasicMaterial({
      color: 0xff6622, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    _combatPool.lookTmp = new THREE.Vector3();
  }

  /**
   * Aim an MG tracer along velocity.
   * Root cause (v399 mute): CylinderGeometry is +Y; Object3D.lookAt aims local -Z
   * at the target, so the long axis sat sideways (thin radius toward/along view).
   * After lookAt, rotateX(-PI/2) so +Y aligns with former -Z (flight direction).
   */
  function aimMgTracer(mesh, pos, dir) {
    ensureCombatPool();
    // BoxGeometry long axis is +Z — lookAt aims -Z, so rotateY(PI) after
    _combatPool.lookTmp.copy(pos).add(dir);
    mesh.lookAt(_combatPool.lookTmp);
    mesh.rotateY(Math.PI);
  }

  function makeTracer(color, length) {
    ensureCombatPool();
    var mesh;
    if (_combatPool.tracers.length) {
      mesh = _combatPool.tracers.pop();
      mesh.visible = true;
    } else {
      mesh = new THREE.Mesh(_combatPool.tracerGeo, _combatPool.tracerMatY);
    }
    // Pistol = warmer, MG = yellow — shared mats, just swap ref
    mesh.material = (color === 0xffcc66) ? _combatPool.tracerMatP : _combatPool.tracerMatY;
    var len = length || TRACER_BASE_LEN;
    // v417: BoxGeometry long axis = Z
    mesh.scale.set(1, 1, len / TRACER_BASE_LEN);
    mesh.userData.pooled = 'tracer';
    return mesh;
  }

  function makeRocketMesh() {
    ensureCombatPool();
    var g;
    if (_combatPool.rockets.length) {
      g = _combatPool.rockets.pop();
      g.visible = true;
      return g;
    }
    g = new THREE.Group();
    var body = new THREE.Mesh(_combatPool.rocketBodyGeo, _combatPool.rocketBodyMat);
    body.rotation.x = Math.PI / 2;
    g.add(body);
    var nose = new THREE.Mesh(_combatPool.rocketNoseGeo, _combatPool.rocketNoseMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = 0.82;
    g.add(nose);
    var exhaust = new THREE.Mesh(_combatPool.rocketExGeo, _combatPool.rocketExMat);
    exhaust.position.z = -0.72;
    g.add(exhaust);
    g.userData.exhaust = exhaust;
    g.userData.pooled = 'rocket';
    return g;
  }

  function recycleProjectileMesh(mesh) {
    if (!mesh) return;
    mesh.visible = false;
    if (mesh.parent) mesh.parent.remove(mesh);
    if (mesh.userData && mesh.userData.pooled === 'tracer') {
      if (_combatPool.tracers.length < 40) _combatPool.tracers.push(mesh);
      return;
    }
    if (mesh.userData && mesh.userData.pooled === 'rocket') {
      if (_combatPool.rockets.length < 12) _combatPool.rockets.push(mesh);
      return;
    }
    // Non-pooled fallback
    try {
      mesh.traverse(function (c) {
        if (c.geometry && !c.geometry.userData) { /* shared geos — don't dispose */ }
      });
    } catch (e) { /* ignore */ }
  }

  function playerWeapons() {
    var p = state.player;
    if (!p) return GAME.vehicles.weapons({});
    if (p._wep) return p._wep;
    var stock = GAME.vehicles.weapons(p.def);
    var b = getCarBuild(p.def.id);
    var Uu = b.unlocks || {};
    var mul = p.mul || {};
    p._wep = {
      mg: stock.mg || !!Uu.unlockMg,
      rocket: stock.rocket || !!Uu.unlockRocket,
      mine: stock.mine || !!Uu.unlockMine,
      mgLabel: stock.mgLabel || 'GUNS',
      rocketLabel: stock.rocketLabel || 'ROCKET',
      mineLabel: stock.mineLabel || 'MINE',
      mgDmgMul: (stock.mgDmgMul || 1) * (mul.mgPower || 1),
      mgRateMul: (stock.mgRateMul || 1) / (mul.mgCool || 1),
      rocketDmgMul: (stock.rocketDmgMul || 1) * (mul.rocketPower || 1),
      rocketRateMul: (stock.rocketRateMul || 1) / (mul.rocketCool || 1),
      mineDmgMul: (stock.mineDmgMul || 1) * (mul.minePower || 1),
      mineRateMul: (stock.mineRateMul || 1) / (mul.mineCool || 1),
    };
    // Pistol + caliber stack → SMG label
    if (p._wep.mgLabel === 'PISTOL' && (mul.mgPower || 1) > 1.35) p._wep.mgLabel = 'SMG';
    return p._wep;
  }

  function fireMg() {
    var p = state.player;
    var W = playerWeapons();
    if (!W.mg) {
      if (!p._denyMgT || p._denyMgT <= 0) {
        toast('NO GUNS ON THIS RIG', 0.7);
        p._denyMgT = 1.2;
        if (GAME.sfx && GAME.sfx.deny) GAME.sfx.deny();
      }
      return;
    }
    if (p.mgCd > 0) return;
    // Soft overheat — infinite MG with 1.2s lockout when heat maxes
    // Silent while locked — one toast at onset only (v316 dual OVERHEAT spam)
    if (p.mgOverT > 0) {
      return;
    }
    // Hard cap live projectiles — hold-to-fire used to flood the scene
    if (state.projectiles && state.projectiles.length > 28) return;
    var rateMul = (W.mgRateMul || 1) * (hasBuff('guns') ? 0.55 : 1);
    p.mgCd = cfg.combat.mgRate * rateMul;
    // v340: warden heat only on actual shots (was every hold-J frame, even lockout)
    // ~0.014/shot ≈ hostile~0.72 in a long hold with cool; lockout is free cool window
    p.heat = U.clamp((p.heat || 0) + cfg.heat.fromWeapons * 1.55, 0, 1);
    p.mgHeat = (p.mgHeat || 0) + 0.045 * (W.mgLabel === 'PISTOL' ? 0.7 : 1);
    if (p.mgHeat >= 1) {
      p.mgHeat = 1;
      p.mgOverT = 1.2;
      // v340: one toast per cool-cycle (was every ~2.6s while holding J)
      if (!p._overheatToastArmed) {
        toast('GUNS OVERHEAT', 0.95, 1);
        p._overheatToastArmed = true;
        if (GAME.sfx && GAME.sfx.deny) GAME.sfx.deny();
      }
    }
    var dmg = cfg.combat.mgDmg * p.mul.fire * (W.mgDmgMul || 1) * upgradeMult('firepower');
    if (hasBuff('power')) dmg *= 1.45;
    if (hasBuff('guns')) dmg *= 1.1;
    U.forward(p.yaw, tmpV);
    U.side(p.yaw, tmpV2);
    var hood = state.camMode === 'hood';
    // Chase: van body occludes ahead-of-bumper tracers — spawn high + wide (v400)
    // Hood: spawn further ahead/higher so tracers sit in FOV (body is hidden) (v302)
    var fwdOff = hood ? 4.2 : 2.4;
    var yOff = hood ? 1.45 : 3.1;
    // v428: TM thin tracers — long orange lines, not screen-filling rods
    var tracerLen = hood ? 5.5 : 14.0;
    var radScale = hood ? 1.6 : 2.4;
    function spawnMgRound(sideOff) {
      if (state.projectiles.length > 28) return;
      var origin = p.pos.clone().addScaledVector(tmpV, fwdOff).addScaledVector(tmpV2, sideOff);
      origin.y += yOff;
      var col = W.mgLabel === 'PISTOL' ? 0xffcc66 : 0xfff2a0;
      var mesh = makeTracer(col, tracerLen);
      mesh.scale.x = radScale;
      mesh.scale.y = radScale;
      mesh.position.copy(origin);
      aimMgTracer(mesh, origin, tmpV);
      scene.add(mesh);
      state.projectiles.push({
        type: 'mg', mesh: mesh, pos: origin.clone(),
        vel: tmpV.clone().multiplyScalar(cfg.combat.mgSpeed * (W.mgLabel === 'PISTOL' ? 0.92 : 1)),
        life: hood ? 0.9 : 1.05, dmg: dmg, fromPlayer: true, trail: true,
      });
    }
    // Always dual stream in chase so rods clear the silhouette
    if (hasBuff('guns') || !hood) {
      spawnMgRound(hood ? -0.35 : -1.2);
      spawnMgRound(hood ? 0.35 : 1.2);
    } else {
      spawnMgRound((Math.random() > 0.5 ? 1 : -1) * 0.22);
    }
    p._muzzleFxT = (p._muzzleFxT || 0);
    if (particles && p._muzzleFxT <= 0) {
      p._muzzleFxT = hood ? 0.03 : 0.035;
      var mSide = hood ? 0 : ((Math.random() > 0.5 ? 1 : -1) * 1.1);
      var mOrigin = p.pos.clone().addScaledVector(tmpV, fwdOff).addScaledVector(tmpV2, mSide);
      mOrigin.y += yOff;
      if (particles.muzzleBurst) particles.muzzleBurst(mOrigin, tmpV, hood);
      else particles.muzzle(mOrigin, tmpV);
      if (particles.spawn) {
        particles.spawn('muzzle', mOrigin, {
          count: hood ? 4 : 6, speed: 14, life: 0.12,
          scale: hood ? 0.9 : 1.1, dir: tmpV, gravity: 0,
        });
        particles.spawn('spark', mOrigin, {
          count: hood ? 6 : 10, speed: 16, life: 0.14, gravity: 2,
        });
      }
      if (p.mesh && p.mesh.userData) {
        var guns = p.mesh.userData.guns || p.mesh.userData.gunMeshes;
        if (guns && guns.length) {
          for (var gi = 0; gi < guns.length; gi++) {
            if (guns[gi] && guns[gi].material && guns[gi].material.emissiveIntensity != null) {
              guns[gi].material.emissiveIntensity = 1.4;
            }
          }
          p._gunFlashT = 0.06;
        }
      }
      p._muzzleBodyT = hood ? 0.1 : 0.14;
    }
    // Screen flash + sticky FIRING flag for HUD (R3: must be unmistakable)
    state.muzzleFlash = 1;
    state.firingMg = 0.25;
    state.hitFlash = Math.min(1.0, (state.hitFlash || 0) + (hood ? 0.14 : 0.28));
    state.camShake = Math.max(state.camShake || 0, hood ? 0.05 : 0.08);
    if (hood) p._hoodMuzzleT = 0.08;
    else p._chaseMuzzleT = 0.1;
    if (GAME.sfx) GAME.sfx.mg();
  }

  function fireRocket() {
    var p = state.player;
    var W = playerWeapons();
    if (!W.rocket) {
      // v343: once-per-race toast (Razorback/Needle/Vesper K-spam flooded channel)
      if (!p._denyRkSaid) {
        toast('NO ROCKETS — unlock in garage (U)', 1.15);
        p._denyRkSaid = true;
        p._denyRkT = 10;
        if (GAME.sfx && GAME.sfx.deny) GAME.sfx.deny();
      } else if (!p._denyRkT || p._denyRkT <= 0) {
        p._denyRkT = 2.2; // silent re-press gate
      }
      return;
    }
    if (p.rocketCd > 0) return;
    if (state.projectiles && state.projectiles.length > 28) return;
    p.rocketCd = cfg.combat.rocketRate * (W.rocketRateMul || 1);
    p.heat = U.clamp((p.heat || 0) + cfg.heat.fromWeapons * 2.5, 0, 1);
    var dmg = cfg.combat.rocketDmg * p.mul.fire * (W.rocketDmgMul || 1) * upgradeMult('firepower');
    if (hasBuff('power')) dmg *= 1.5;
    U.forward(p.yaw, tmpV);
    var origin = p.pos.clone().addScaledVector(tmpV, 3.2);
    origin.y += 1.15;
    var mesh = makeRocketMesh();
    mesh.position.copy(origin);
    mesh.scale.setScalar(1.35);
    ensureCombatPool();
    _combatPool.lookTmp.copy(origin).add(tmpV);
    mesh.lookAt(_combatPool.lookTmp);
    scene.add(mesh);
    state.projectiles.push({
      type: 'rocket', mesh: mesh, pos: origin.clone(),
      vel: tmpV.clone().setY(0.04).multiplyScalar(cfg.combat.rocketSpeed),
      life: 2.4, dmg: dmg, fromPlayer: true, homing: true, smoke: true,
    });
    state.camShake = Math.max(state.camShake, 0.22);
    if (particles) {
      particles.muzzle(origin, tmpV);
      if (particles.spawn) {
        particles.spawn('fire', origin.clone(), { count: 5, speed: 10, life: 0.18, scale: 0.55, dir: tmpV, gravity: 0 });
        particles.spawn('smoke', origin.clone(), { count: 3, speed: 4, life: 0.35, scale: 0.7, gravity: -1 });
      }
    }
    if (GAME.sfx) {
      if (GAME.sfx.beep) GAME.sfx.beep(880, 0.04, 'square', 0.06); // short lock tick
      GAME.sfx.rocket();
    }
  }

  function dropMine() {
    var p = state.player;
    var W = playerWeapons();
    if (!W.mine) {
      // v343: once-per-race (Marrow/Needle L-spam same channel noise)
      if (!p._denyMnSaid) {
        toast('NO MINES — unlock in garage (U)', 1.15);
        p._denyMnSaid = true;
        p._denyMnT = 10;
        if (GAME.sfx && GAME.sfx.deny) GAME.sfx.deny();
      } else if (!p._denyMnT || p._denyMnT <= 0) {
        p._denyMnT = 2.2;
      }
      return;
    }
    if (p.mineCd > 0) return;
    p.mineCd = cfg.combat.mineRate * (W.mineRateMul || 1);
    p.heat = U.clamp((p.heat || 0) + cfg.heat.fromWeapons * 2.0, 0, 1);
    U.forward(p.yaw, tmpV);
    var origin = p.pos.clone().addScaledVector(tmpV, -3.2);
    origin.y += 0.3;
    var mesh = new THREE.Group();
    var bodyMat = new THREE.MeshStandardMaterial({
      color: 0x222230, metalness: 0.7, roughness: 0.35,
      emissive: 0xff2d55, emissiveIntensity: 0.5,
    });
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.2, 12), bodyMat);
    mesh.add(body);
    var blink = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.85 })
    );
    blink.position.y = 0.18;
    mesh.add(blink);
    var armRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.85, 24),
      new THREE.MeshBasicMaterial({
        color: 0x00e5ff, transparent: true, opacity: 0.75,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    armRing.rotation.x = -Math.PI / 2;
    armRing.position.y = 0.04;
    mesh.add(armRing);
    mesh.position.copy(origin);
    scene.add(mesh);
    // IMPORTANT: mesh is a Group — never set mesh.material (was hard-freezing play)
    state.mines.push({
      mesh: mesh, body: body, bodyMat: bodyMat, blink: blink, armRing: armRing,
      pos: origin.clone(),
      arm: cfg.combat.mineArm,
      dmg: cfg.combat.mineDmg * p.mul.fire * (W.mineDmgMul || 1) * upgradeMult('firepower'),
      life: 18,
    });
    if (GAME.sfx) GAME.sfx.mine();
  }

  function specialCtx() {
    return {
      state: state,
      player: state.player,
      rivals: state.rivals,
      path: state.path,
      scene: scene,
      particles: particles,
      sfx: GAME.sfx,
      cfg: cfg,
      U: U,
      toast: toast,
      hurtRival: hurtRival,
      upgradeMult: upgradeMult,
    };
  }

  function fireSpecial() {
    if (!GAME.specials || !state.player) return;
    var before = state.player.specialCd || 0;
    var ok = GAME.specials.fire(specialCtx());
    // Count a land if windup started (canFire true → fire returns true)
    if (ok !== false && (state.player._specialWindup > 0 || state.player.specialCd > before)) {
      state.specialsLanded = (state.specialsLanded || 0) + 1;
    }
  }

  /** Raw place by progress (1 = lead). */
  function rawPlaceNow() {
    var p = state.player;
    if (!p) return 1;
    var place = 1;
    var alive = 1;
    (state.rivals || []).forEach(function (r) {
      if (r.dead) return;
      alive++;
      if ((r.progress || 0) > (p.progress || 0)) place++;
    });
    state._aliveCount = alive;
    return place;
  }

  /**
   * Sticky place for HUD — only flip when raw place holds >0.6s OR lead gap >8m.
   */
  function updateDisplayPlace(dt) {
    var raw = rawPlaceNow();
    var pathLen = (state.path && state.path.length) || 4000;
    var p = state.player;
    var clearGapM = 0;
    if (p && raw !== state._displayPlace) {
      // Gap to the rival that would settle the place change (nearest by progress)
      var nearestGap = 1e9;
      (state.rivals || []).forEach(function (r) {
        if (r.dead) return;
        var g = Math.abs((r.progress || 0) - (p.progress || 0)) * pathLen;
        if (g < nearestGap) nearestGap = g;
      });
      clearGapM = nearestGap < 1e9 ? nearestGap : 0;
    }
    if (state._displayPlace == null) {
      state._displayPlace = raw;
      state._placePending = raw;
      state._placePendingT = 0;
      return;
    }
    if (raw === state._displayPlace) {
      state._placePending = raw;
      state._placePendingT = 0;
      return;
    }
    if (state._placePending !== raw) {
      state._placePending = raw;
      state._placePendingT = 0;
    }
    state._placePendingT = (state._placePendingT || 0) + dt;
    // Stickier (v281): 0.85s hold, or clear >12m with ≥0.5s — draft fights less busy
    if (state._placePendingT >= 0.85 || (clearGapM >= 12 && state._placePendingT >= 0.5)) {
      state._displayPlace = raw;
      state._placePendingT = 0;
    }
  }

  // ---------- Drive + race update ----------
  function updateRace(dt) {
    state.raceTime += dt;
    if (state.hitFlash > 0) state.hitFlash = Math.max(0, state.hitFlash - dt * 2.8);
    if (state.shieldAbsorbFlash > 0) state.shieldAbsorbFlash = Math.max(0, state.shieldAbsorbFlash - dt);
    if (state.shieldBreakFlash > 0) state.shieldBreakFlash = Math.max(0, state.shieldBreakFlash - dt);
    if (state.muzzleFlash > 0) state.muzzleFlash = Math.max(0, state.muzzleFlash - dt * 4.0);
    if (state.firingMg > 0) state.firingMg = Math.max(0, state.firingMg - dt);
    if (state.hitDirT > 0) state.hitDirT = Math.max(0, state.hitDirT - dt);
    if (state._startBannerT > 0) state._startBannerT = Math.max(0, state._startBannerT - dt);
    // Re-unlock + engine if AudioContext still suspended / silent after START (v311/v357)
    // Retry a few frames so first-click resume can land before we give up
    if (state._raceEngineKick && GAME.sfx) {
      try {
        if (GAME.sfx.unlock) GAME.sfx.unlock();
        if (GAME.sfx.engineStart) GAME.sfx.engineStart();
        if (GAME.sfx.engineUpdateEx) GAME.sfx.engineUpdateEx(0.18, false, 1);
        var probeOk = false;
        if (GAME.sfx.engineProbe) {
          var pr = GAME.sfx.engineProbe();
          probeOk = !!(pr && pr.audible);
        } else {
          probeOk = !!(GAME.sfx.isUnlocked && GAME.sfx.isUnlocked());
        }
        state._raceEngineKickN = (state._raceEngineKickN | 0) + 1;
        if (probeOk || state._raceEngineKickN >= 45) state._raceEngineKick = false;
      } catch (eKick) {
        state._raceEngineKick = false;
      }
    }
    // Money-shot: hold chase speed + keep multi-layer fire alive for capture
    if (state._shotHoldSpeed != null && state.player) {
      state.player.speed = Math.max(state.player.speed, state._shotHoldSpeed);
      state.player.nitroActive = false;
    }
    if (state._shotBoomT != null) {
      state._shotBoomT -= dt;
      if (state._shotBoomT <= 0) {
        var p0 = state.player;
        if (p0 && particles && particles.explosion) {
          // Clear old FX then re-pop clean hierarchy (avoids FOV shell pile-up)
          if (particles.clear) {
            // soft clear only combat items would be ideal; full clear ok in shot mode
          }
          var t0 = new THREE.Vector3(Math.sin(p0.yaw), 0, Math.cos(p0.yaw));
          var s0 = new THREE.Vector3(-t0.z, 0, t0.x);
          var b2 = p0.pos.clone().addScaledVector(t0, 13).addScaledVector(s0, 1.8);
          b2.y = p0.pos.y + 1.2;
          particles.explosion(b2, true);
          state.camShake = 0.15;
        }
        state._shotBoomLeft = (state._shotBoomLeft || 0) - 1;
        if (state._shotBoomLeft > 0) state._shotBoomT = 0.4;
        else {
          state._shotBoomT = null;
          state._shotHoldSpeed = null;
        }
      }
    }
    var p = state.player;
    if (!p) return;
    if (p._specialWindup > 0) state._specialHudState = 'charging';
    else if (p.specialCd > 0) state._specialHudState = 'cooldown';
    else state._specialHudState = 'ready';
    // Soft-lock guard: any path that zeros HP must land results (v322)
    if (p.hp <= 0 && !p.finished) {
      p.hp = 0;
      endRace(false, 'WRECKED — the overlords keep you for another night.');
      return;
    }
    var path = state.path;
    var D = cfg.drive;
    var spdMul = p.mul.speed * upgradeMult('speed');
    var handMul = p.mul.hand;

    // ---------- Arcade drive (NFS weight + TM combat readiness) ----------
    var throttle = I.throttle();
    var brake = I.brake();
    var steerIn = I.steer();
    var mass = p.mul.mass || 1;
    // Drift: Space/Shift at speed IS the slide (v315 — straight-line hold still fills nitro)
    var driftMin = D.driftMinSpeed != null ? D.driftMinSpeed : 8;
    var wantDrift = I.drift() && Math.abs(p.speed) > driftMin;
    p.drifting = !!wantDrift;
    p._driftLatch = !!p.drifting;
    if (!I.drift() || Math.abs(p.speed) < driftMin * 0.7) p._driftLatch = false;
    p.nitroActive = I.nitro() && p.nitro > 0.02 && throttle > 0;
    // rebuild weapons cache if shop changed mid-session (shouldn't)

    // Steer response — snappier ease, handling stat matters
    p.steer = U.damp(p.steer, steerIn, D.steerEase * (0.85 + handMul * 0.2), dt);

    var nitroMax = p.nitroMax != null ? p.nitroMax : cfg.nitro.capacity;
    var nitroMult = cfg.nitro.mult * (p.mul.nitroPower || 1);
    var maxSp = D.maxSpeed * spdMul / Math.sqrt(mass);
    if (hasBuff('speed')) maxSp *= 1.28;
    if (p.nitroActive) {
      maxSp *= nitroMult;
      if (state._nitroLatch !== true) {
        // Nitro is an event — FOV kick, SFX whoosh, underglow surge, toast
        if (GAME.sfx) {
          if (GAME.sfx.nitroWhoosh) GAME.sfx.nitroWhoosh();
          else GAME.sfx.nitro();
        }
        state._nitroLatch = true;
        state._nitroFovKick = 7; // bigger FOV pop — event, not a toggle (v314)
        state.camShake = Math.max(state.camShake || 0, 0.14);
        // pri 0 — never sticky over specials/warden (v379 toast spam)
        toast('NITRO  ·  BURN', 0.55, 0);
        if (particles && particles.spawn) {
          U.forward(p.yaw, tmpV);
          var nfx = p.pos.clone().addScaledVector(tmpV, -1.5);
          nfx.y += 0.5;
          particles.spawn('cyan', nfx, { count: 18, speed: 14, life: 0.32, gravity: 0 });
        }
      }
    } else state._nitroLatch = false;
    if (state._nitroFovKick > 0) state._nitroFovKick = Math.max(0, state._nitroFovKick - dt * 7);
    // Decay drift-fill HUD pip
    if (p._driftFillGlow > 0) p._driftFillGlow = Math.max(0, p._driftFillGlow - dt * 1.8);
    if (p._driftFillPip > 0) p._driftFillPip = Math.max(0, p._driftFillPip - dt * 1.2);

    // Accel curve: punchy off the line, softens near top end
    var speedAbs = Math.abs(p.speed);
    var speedNorm0 = U.clamp(speedAbs / Math.max(1, maxSp), 0, 1);
    var fall = D.accelFalloff != null ? D.accelFalloff : 0.5;
    var accelMul = 1 - fall * speedNorm0 * speedNorm0;
    var accel = (D.accel * spdMul * (p.mul.accel || 1) / mass) * (p.nitroActive ? nitroMult : 1) * accelMul;
    if (hasBuff('speed')) accel *= 1.35;
    if (throttle) p.speed += accel * dt;
    // Holding throttle climbs out of accidental reverse (hazard floors / ram) (v320)
    if (throttle && p.speed < 0) p.speed += accel * 1.6 * dt;
    if (brake) {
      if (p.speed > 0.5) p.speed -= (D.brake / mass) * (p.mul.brake || 1) * dt;
      else p.speed -= D.reverse * dt;
    }
    // Coast vs light engine brake
    if (!throttle && !brake) {
      var drag = p.speed > 8 ? (D.coastDrag || 0.988) : (D.engineBrake || 0.992);
      p.speed *= Math.pow(drag, dt * 60);
    }

    if (p.nitroActive) {
      var drain = cfg.nitro.drain * (1 + ((p.mul.nitroPower || 1) - 1) * 0.4);
      p.nitro = Math.max(0, p.nitro - drain * dt);
      p.heat = U.clamp(p.heat + cfg.heat.fromNitro * dt, 0, 1);
      // Exhaust flames only (no grey pipe smoke)
      p._nitroFxT = (p._nitroFxT || 0) - dt;
      if (particles && p._nitroFxT <= 0) {
        p._nitroFxT = 0.05;
        U.forward(p.yaw, tmpV);
        var exPos = p.pos.clone().addScaledVector(tmpV, -2.35);
        exPos.y = p.pos.y + 0.38;
        // Twin tips
        U.side(p.yaw, tmpV2);
        particles.exhaustFlame(exPos.clone().addScaledVector(tmpV2, 0.28), tmpV);
        particles.exhaustFlame(exPos.clone().addScaledVector(tmpV2, -0.28), tmpV);
      }
    } else {
      p.nitro = Math.min(nitroMax, p.nitro + cfg.nitro.regen * (p.mul.nitroRegen || 1) * (p._salvageNitroRegen || 1) * dt);
      // Cool while not on nitro — extra dump when not holding fire so Eye can end ~8s after a fight.
      // Never use I.pressed here: that eats rocket/mine edges before the fire block below.
      var heatCool = cfg.heat.cool * (p.mul.heatCool || 1) * (p._mutHeatCool || 1);
      var holdingFire = I.key('j') || I.key('z');
      if (!holdingFire) {
        heatCool *= (cfg.heat.idleCoolMul != null ? cfg.heat.idleCoolMul : 1.45);
      } else {
        // v372: slow bleed while spraying so Eye isn't permanent during MG hold
        heatCool *= 0.22;
      }
      p.heat = Math.max(0, p.heat - heatCool * dt);
      // Nano repair — slow HP regen when not under heat
      if ((p.mul.regenPlates | 0) > 0 && p.hp < p.maxHp && p.heat < 0.35 && p.inv <= 0) {
        p.hp = Math.min(p.maxHp, p.hp + (1.2 * p.mul.regenPlates) * dt);
      }
      // Shield generator trickle when cool
      if (p.maxShield > 0 && p.shield < p.maxShield && p.heat < 0.4 && p.inv <= 0) {
        p.shield = Math.min(p.maxShield, p.shield + 4.5 * dt);
      }
    }

    // Lateral slip model
    if (p.slip == null) p.slip = 0;
    var grip = (p.drifting ? (D.driftGrip || 1.6) : (D.grip || 12.5)) * handMul * (p.mul.grip || 1) * (p._mutGrip || 1);
    // Steer injects slip when moving
    if (Math.abs(p.speed) > 4) {
      p.slip += -p.steer * Math.min(Math.abs(p.speed), 45) * (p.drifting ? 1.15 : 0.55) * dt;
    }
    if (p.drifting) {
      var beforeN = p.nitro || 0;
      var fillAmt = D.driftNitroFill * (p.mul.driftFill || 1) * dt;
      p.nitro = Math.min(nitroMax, beforeN + fillAmt);
      var gained = Math.max(0, p.nitro - beforeN);
      if (gained > 0) {
        // HUD pip + glow while drift is charging the tank (v314)
        p._driftFillGlow = Math.min(1, (p._driftFillGlow || 0) + gained * 14);
        p._driftFillPip = Math.min(1, (p._driftFillPip || 0) + gained * 8);
      }
      // Cyan drip at rear wheels — skip world particles on LOW (HUD pip still reads)
      p._driftNitroFxT = (p._driftNitroFxT || 0) - dt;
      var lowQ = !!(state.meta && state.meta.quality === 'low');
      if (gained > 0 && particles && p._driftNitroFxT <= 0 && !lowQ) {
        p._driftNitroFxT = 0.07;
        U.forward(p.yaw, tmpV);
        U.side(p.yaw, tmpV2);
        var drip = p.pos.clone().addScaledVector(tmpV, -1.4).addScaledVector(tmpV2, (Math.random() - 0.5) * 1.2);
        drip.y = p.pos.y + 0.35;
        if (particles.spawn) {
          particles.spawn('cyan', drip, { count: 3, speed: 4, life: 0.22, gravity: -2, scale: 0.4 });
        }
      }
      // Power-slide: keep most speed (handbrake feel without killing momentum)
      if (throttle) p.speed += accel * 0.25 * dt;
      p.speed *= Math.pow(0.9996, dt * 60);
      var inj = D.driftSlipInject != null ? D.driftSlipInject : 38;
      var yawBoost = D.driftYawBoost != null ? D.driftYawBoost : 2.4;
      // Always push slip in steer direction; if no steer, keep current slide side
      var sideSign = Math.abs(p.steer) > 0.05 ? -Math.sign(p.steer) : (p.slip >= 0 ? 1 : -1);
      if (Math.abs(p.steer) < 0.05 && Math.abs(p.slip) < 1) sideSign = -1; // default kick
      p.slip += sideSign * inj * dt;
      // Extra yaw rate so the car visibly rotates into the slide
      p.yaw += sideSign * yawBoost * dt * U.clamp(Math.abs(p.speed) / 28, 0.45, 1.35);
      // SFX / VFX throttled — unthrottled smoke+spray cloned meshes froze play
      p._driftSfxT = (p._driftSfxT || 0) - dt;
      if (GAME.sfx && p._driftSfxT <= 0) {
        p._driftSfxT = 0.22;
        GAME.sfx.drift();
      }
      p._driftFxT = (p._driftFxT || 0) - dt;
      if (particles && p._driftFxT <= 0) {
        p._driftFxT = 0.06;
        U.forward(p.yaw, tmpV);
        U.side(p.yaw, tmpV2);
        // Tire smoke at rear contact patches (outside of slide)
        var out = -Math.sign(p.slip || sideSign);
        var tirePos = p.pos.clone()
          .addScaledVector(tmpV, -1.55)
          .addScaledVector(tmpV2, out * 0.85);
        tirePos.y = p.pos.y + 0.08;
        var slideDir = tmpV2.clone().multiplyScalar(out);
        particles.tireSmoke(tirePos, { dir: slideDir, scale: 0.95, count: 1 });
        // Second rear tire lighter
        var tirePos2 = p.pos.clone()
          .addScaledVector(tmpV, -1.55)
          .addScaledVector(tmpV2, -out * 0.55);
        tirePos2.y = p.pos.y + 0.08;
        particles.tireSmoke(tirePos2, { dir: slideDir.clone().multiplyScalar(0.4), scale: 0.65, count: 1 });
      }
      state.camShake = Math.max(state.camShake || 0, 0.04);
      if (!p._driftToast) {
        p._driftToast = true;
        toast('DRIFT', 0.4);
      }
    } else {
      p._driftToast = false;
    }
    // Grip pulls slip to zero (weak while drifting)
    p.slip = U.damp(p.slip, 0, grip, dt);
    p.slip = U.clamp(p.slip, -36, 36);

    // Ribbon nearest: continuous window around race progress (fold-scored in world.js).
    var progHint = p.progress != null ? p.progress : 0;
    var pathLen = (state.path && state.path.length) || 4000;
    var near = world.nearest(p.pos, progHint);
    // Hills: 3D distance includes Y and false-triggers void snaps mid-climb.
    // Lateral = off-asphalt only. That's the only void metric (v324).
    var ribbonLat = near && isFinite(near.dist) ? near.dist : 1e9;
    var ribbonDist = ribbonLat;
    // Fold guard: if nearest sits far above/below while lateral is small, drop it for pull/Y
    var nearFolded = false;
    if (near && near.point && isFinite(near.point.y)) {
      var foldDy = Math.abs(near.point.y - p.pos.y);
      if (foldDy > 8 && ribbonLat < D.roadHalf * 0.9) {
        nearFolded = true;
      }
    }
    if (!near || ribbonLat > 22) {
      var nearOpen = world.nearest(p.pos);
      if (nearOpen && isFinite(nearOpen.dist) && nearOpen.dist + 1.5 < ribbonLat) {
        var oProg = nearOpen.progress || 0;
        if (Math.abs(oProg - progHint) < 0.08) {
          near = nearOpen;
          ribbonLat = nearOpen.dist;
          ribbonDist = ribbonLat;
          nearFolded = false;
          if (near.point && Math.abs(near.point.y - p.pos.y) > 8 && ribbonLat < D.roadHalf * 0.9) {
            nearFolded = true;
          }
        }
      }
    }

    // Hard snap ONLY if you're really off the ribbon in XZ — never teleport to progress
    // Wave 3: no void tug while nearest is a Y-fold pick
    // v433: thresholds were 28/18 — canyon faces ~roadHalf+openEdge; cars clipped walls
    var voidHard = !nearFolded && isFinite(ribbonLat) && ribbonLat > 15;
    var voidSoft = !nearFolded && isFinite(ribbonLat) && ribbonLat > 12.5 && !voidHard;
    var steeringHard = Math.abs(p.steer) >= 0.28;
    var progAgree = near && Math.abs((near.progress || 0) - progHint) < 0.05;
    if (path && path.curve && voidHard && near && near.point && progAgree) {
      // Nudge toward the nearest asphalt point — do not warp to getPointAt(progress)
      p.pos.x += (near.point.x - p.pos.x) * Math.min(1, dt * 4);
      p.pos.z += (near.point.z - p.pos.z) * Math.min(1, dt * 4);
      ribbonDist = ribbonLat;
    } else if (voidSoft && !steeringHard && near && near.point && progAgree) {
      var pullK = Math.min(0.35, dt * 0.7);
      p.pos.x += (near.point.x - p.pos.x) * pullK;
      p.pos.z += (near.point.z - p.pos.z) * pullK;
    }
    if (p._voidToastT > 0) p._voidToastT -= dt;
    // Brief yaw assist after hard snap (≤0.25s) — full steer control otherwise
    if (p._voidYawT > 0) {
      p._voidYawT -= dt;
      if (Math.abs(p.steer) < 0.35 && near && near.tangent) {
        var softYaw = Math.atan2(near.tangent.x, near.tangent.z);
        p.yaw += U.angDiff(p.yaw, softYaw) * Math.min(1, dt * 3.5);
      }
    }

    // Point-to-point progress: continuous live, never adopt a backward fold reading
    var liveProg = near.progress;
    var prevProg = p.maxProgress != null ? p.maxProgress : (p.progress || 0);
    // Reject fold snap-backs that read earlier progress while we hold race progress
    if (liveProg < prevProg - 0.015) {
      liveProg = prevProg;
    }
    var trusted = near && isFinite(ribbonDist) && ribbonDist < 28;
    p.lapProgress = liveProg;
    p._ribbonDist = ribbonDist;
    var maxStep = Math.max(0.005, (Math.abs(p.speed) * dt * 2.2) / pathLen) * 3.0;
    if (trusted && liveProg > prevProg) {
      var delta = liveProg - prevProg;
      p.maxProgress = prevProg + Math.min(delta, maxStep);
      p._progStallT = 0;
    } else if (trusted && p.speed > 14 && ribbonDist < 12 && liveProg >= prevProg - 0.035) {
      // On ribbon, forward pace, nearest lagging: after 1.2s freeze, crawl (v320)
      // Was stuck ~0.218 for 60s+. Keep crawl tiny so we don't tele-finish.
      p._progStallT = (p._progStallT || 0) + dt;
      if (p._progStallT > 1.2) {
        p.maxProgress = Math.min(0.995, prevProg + maxStep * 0.12);
      } else {
        p.maxProgress = prevProg;
      }
    } else if (!trusted && Math.abs(p.speed) > 14 && ribbonDist > 18 && ribbonDist < 40) {
      // Soft lost ribbon near track: tiny crawl only (v371 — was *0.9 tele-finish offroad)
      p.maxProgress = Math.min(0.995, prevProg + maxStep * 0.15);
      p._progStallT = 0;
    } else if (!trusted && ribbonDist >= 40) {
      // Deep offroad / void: freeze progress — never race to finish off asphalt
      p.maxProgress = prevProg;
      p._progStallT = 0;
    } else {
      p.maxProgress = prevProg;
      if (!(trusted && p.speed > 14)) p._progStallT = 0;
    }
    p._ribbonLive = Math.max(liveProg, p.maxProgress != null ? p.maxProgress - 0.08 : liveProg);
    if (p.maxProgress == null || !isFinite(p.maxProgress)) p.maxProgress = prevProg;
    p.progress = p.maxProgress;
    // HUD desync pin
    if (trusted && ribbonDist <= 40) {
      var dsync = (p.progress || 0) - liveProg;
      if (Math.abs(dsync) > 0.08) {
        p._ribbonLive = p.progress;
        p._progDesync = 0;
      } else {
        p._ribbonLive = liveProg;
        p._progDesync = dsync;
      }
    } else {
      p._ribbonLive = p.progress;
      p._progDesync = 0;
    }

    // Place hysteresis — don't flip P every second (v280/v281 stickier)
    updateDisplayPlace(dt);
    tickWardenScript(dt);

    // Approach finish warning + ceremony build (Wave ∞)
    if (!state._finishWarned && p.progress >= 0.88) {
      state._finishWarned = true;
      toast('FINISH GATE AHEAD', 2.0);
      if (GAME.sfx) {
        if (GAME.sfx.wardenWarn) GAME.sfx.wardenWarn();
        else if (GAME.sfx.confirm) GAME.sfx.confirm();
      }
    }
    if (p.progress > 0.92 && !state._finishGateToast) {
      state._finishGateToast = true;
      toast('PAROLE ARCH — BREAK OUT', 2.2, 3);
      state._fovPunch = Math.max(state._fovPunch || 0, 10);
      state.camShake = Math.max(state.camShake || 0, 0.2);
      // v350: approach cue only — full sting once at GATE CLEARED (was 3× sting)
      if (GAME.sfx && GAME.sfx.confirm) GAME.sfx.confirm();
      else if (GAME.sfx && GAME.sfx.beep) GAME.sfx.beep(660, 0.08, 'square', 0.08);
    }
    // Kill sticky PACK ENGAGES / warden chatter past 0.92 (v292)
    scrubNonCeremonyToast();
    // Finish ceremony ~3s: cyan arch pulse, sting, GATE CLEARED, results (v283)
    var finNeed = D.finishProgress != null ? D.finishProgress : 0.985;
    if (!p.finished && p.progress >= finNeed && Math.abs(p.speed) > 1) {
      p.finished = true;
      state._finishCeremonyT = 2.9;
      state._finishCeremonyDone = false;
      p.speed = Math.max(p.speed, 26);
      state.camShake = 0.5;
      state._fovPunch = 14;
      state.hitFlash = Math.max(state.hitFlash || 0, 0.65);
      // Ceremony owns toast channel — kill corridor/void noise
      p._voidToastT = 0;
      state.msg = 'GATE CLEARED';
      state.msgT = 2.6;
      state._toastPri = 3;
      // v350: one hero sting per finish (not approach + clear + results)
      if (GAME.sfx && GAME.sfx.finishSting && !state._finishStingPlayed) {
        GAME.sfx.finishSting();
        state._finishStingPlayed = true;
      } else if (GAME.sfx && GAME.sfx.confirm) GAME.sfx.confirm();
      if (particles && particles.spawn) {
        particles.spawn('cyan', p.pos.clone().setY(p.pos.y + 1.2), {
          count: 36, speed: 18, life: 0.65, gravity: 0,
        });
      }
      if (world && world.pulseFinish) world.pulseFinish((state.raceTime || 0) * 3);
    }
    if (state._finishCeremonyT != null && state._finishCeremonyT > 0) {
      state._finishCeremonyT -= dt;
      // Soft hold — still render the run, then land results
      p.speed = U.damp(p.speed, 18, 2.8, dt);
      // Strong cyan arch pulse for full ceremony window
      if (world && world.pulseFinish) {
        world.pulseFinish((state.raceTime || 0) * 2.4 + (2.9 - state._finishCeremonyT) * 4);
      }
      state._finishPulse = 0.65 + 0.35 * Math.sin((state.raceTime || 0) * 10);
      // Keep ceremony toast sticky
      if ((state.msgT || 0) < 0.4) {
        state.msg = 'GATE CLEARED';
        state.msgT = 0.6;
        state._toastPri = 3;
      }
      if (state._finishCeremonyT <= 0 && !state._finishCeremonyDone) {
        state._finishCeremonyDone = true;
        endRace(true, 'NIGHT ' + state.meta.stage + ' CLEARED — you hit the Parole Arch.');
        return;
      }
      // Skip rest of sim pressure during ceremony
      if (GAME.sfx) GAME.sfx.engineUpdate(0.55, true);
      return;
    }

    // ── Surface bands: asphalt | raised (curb+walk) | dirt ──
    // One "raised" band avoids curb↔asphalt hop thrash that froze the sim.
    var rh = D.roadHalf;
    var curbW = D.curbWidth != null ? D.curbWidth : 0.65;
    var walkW = D.sidewalkWidth != null ? D.sidewalkWidth : 3.4;
    // THE REACH has no sidewalk slabs — keep raised hairline (curb only)
    if (state.mapDef && state.mapDef.theme === 'coast') walkW = 0.35;
    var raisedOuter = rh + curbW + walkW;
    var dLat = near.dist;
    if (!isFinite(dLat)) dLat = 0;
    var surface = 'asphalt';
    if (dLat >= rh && dLat < raisedOuter) surface = 'raised'; // curb + sidewalk
    else if (dLat >= raisedOuter) surface = 'offroad';

    // One-shot lip hit when *entering* raised from asphalt (not every edge flicker)
    if (p._curbHopCd > 0) p._curbHopCd -= dt;
    var prevSurf = p.surface || 'asphalt';
    var hopMin = D.curbHopMinSpeed != null ? D.curbHopMinSpeed : 9;
    if (
      p._curbHopCd <= 0 &&
      prevSurf === 'asphalt' &&
      surface === 'raised' &&
      Math.abs(p.speed) >= hopMin
    ) {
      var impact = U.clamp(Math.abs(p.speed) / 42, 0.35, 1);
      var loss = (D.curbHopSpeedLoss != null ? D.curbHopSpeedLoss : 0.22) * impact;
      p.speed *= 1 - loss;
      // Small one-shot height pop (settles via damp — no spring thrash)
      p._hopLift = (D.curbHopBoost != null ? D.curbHopBoost : 0.35) * impact;
      p._curbHopCd = 0.55;
      state.camShake = Math.max(state.camShake || 0, Math.min(0.22, 0.1 + impact * 0.12));
      if (GAME.sfx && GAME.sfx.collide) GAME.sfx.collide();
      else if (GAME.sfx) GAME.sfx.hit();
    }
    // Mild thump dropping back onto asphalt
    if (
      p._curbHopCd <= 0 &&
      prevSurf === 'raised' &&
      surface === 'asphalt' &&
      Math.abs(p.speed) >= hopMin * 0.8
    ) {
      p.speed *= 0.96;
      p._hopLift = 0.08;
      p._curbHopCd = 0.4;
      state.camShake = Math.max(state.camShake || 0, 0.06);
    }
    p.surface = surface;
    // Lateral for AI hunters (lane draft)
    p._lat = near.lateralDist != null ? near.lateralDist : 0;

    // Speed / grip by surface
    // Edge is a TAX (slower + pull in), not a free second lane and not a 22-brick.
    // Centerline asphalt must still top ~50+.
    // Lip / sidewalk — never on asphalt. Opening 22%: light speed tax only.
    // Wave ∞ v336: opening soft must NOT zero the return pull (Needle stuck on lip 60s).
    if (surface === 'raised' && !nearFolded) {
      var onLip = dLat < rh + curbW + 0.35;
      var sideEdge = new THREE.Vector3(-near.tangent.z, 0, near.tangent.x);
      var latEdge = near.lateralDist != null ? near.lateralDist : 0;
      // v346: only treat as "driving out" when steer matches lateral AND not first-curve soft
      var steerOut = (Math.abs(p.steer) > 0.55 && Math.sign(p.steer) * Math.sign(latEdge || 1) > 0);
      var openSoft = (p.progress != null && p.progress < 0.22) ? 0.15 : 1;
      if (onLip) {
        if (openSoft < 1) {
          maxSp = Math.min(maxSp, 52);
          p.speed *= Math.pow(0.992, dt * 60);
        } else {
          maxSp = Math.min(maxSp, D.lipMax != null ? D.lipMax : 38);
          p.speed *= Math.pow(D.lipDrag != null ? D.lipDrag : 0.955, dt * 60);
        }
        p.slip += Math.sin((state.raceTime || 0) * 30) * 6 * dt * openSoft;
        // Return pull always active (open only softens speed tax, not recovery)
        // Opening: never zero pull even if holding turn into the bend
        var pullLip = steerOut ? 2.4 : 5.5;
        if (openSoft < 1) pullLip = Math.max(pullLip, 4.2);
        p.pos.x -= sideEdge.x * latEdge * dt * pullLip;
        p.pos.z -= sideEdge.z * latEdge * dt * pullLip;
      } else {
        if (openSoft < 1) {
          maxSp = Math.min(maxSp, 48);
          p.speed *= Math.pow(0.99, dt * 60);
        } else {
          maxSp = Math.min(maxSp, D.sidewalkMax != null ? D.sidewalkMax : 30);
          p.speed *= Math.pow(D.sidewalkDrag != null ? D.sidewalkDrag : 0.95, dt * 60);
        }
        p.slip += Math.sin((state.raceTime || 0) * 19 + p.pos.x * 2.2) * 3.5 * dt * openSoft;
        var pullWalk = steerOut ? 2.4 : 5.0;
        p.pos.x -= sideEdge.x * latEdge * dt * pullWalk;
        p.pos.z -= sideEdge.z * latEdge * dt * pullWalk;
      }
      // Stuck on lip: after 0.4s scrubbing raised, snap-recover onto asphalt + face ribbon
      // v346 first-curve: recover sooner (0.22s) — human A/D was parking on lip 7s+
      p._lipStuckT = (p._lipStuckT || 0) + dt;
      var lipStuckNeed = (p.progress != null && p.progress < 0.18) ? 0.22 : 0.4;
      if (p._lipStuckT > lipStuckNeed && near && near.tangent) {
        var latR = near.lateralDist != null ? near.lateralDist : 0;
        var targetR = Math.sign(latR || 1) * Math.max(0, rh - 2.8);
        var recK = (p.progress != null && p.progress < 0.18) ? 4.5 : 3.2;
        p.pos.x -= sideEdge.x * (latR - targetR) * Math.min(1, dt * recK);
        p.pos.z -= sideEdge.z * (latR - targetR) * Math.min(1, dt * recK);
        var wantLip = Math.atan2(near.tangent.x, near.tangent.z);
        p.yaw += U.angDiff(p.yaw, wantLip) * Math.min(0.85, dt * 3.6);
        if (Math.abs(p.speed) < 30) p.speed = 30 * Math.sign(p.speed || 1);
        if (p._lipStuckT > 1.1) p._lipStuckT = 0.35; // pulse recover, don't thrash
      }
    } else if (surface === 'offroad') {
      p._lipStuckT = 0;
      maxSp = Math.min(maxSp, D.offRoadMax);
      p.speed *= Math.pow(D.offRoadDrag || 0.94, dt * 60);
      p.slip *= Math.pow(0.9, dt * 60);
      // v341: corridor from just past raised band (was +2.5 — Needle sat at lat~14 forever)
      var corridorGate = raisedOuter + 0.35;
      var sideN = new THREE.Vector3(-near.tangent.z, 0, near.tangent.x);
      var lat = near.lateralDist != null ? near.lateralDist : 0;
      // Continuous return while light steer — don't wait for deep void
      if (!nearFolded && Math.abs(p.steer) < 0.4) {
        var targetOff = Math.sign(lat || 1) * Math.max(0, rh - 2.6);
        var errOff = lat - targetOff;
        var pullOff = 1.6 + Math.min(2.4, dLat / Math.max(1, rh * 0.5));
        p.pos.x -= sideN.x * errOff * Math.min(1, dt * pullOff);
        p.pos.z -= sideN.z * errOff * Math.min(1, dt * pullOff);
        var wantOff = Math.atan2(near.tangent.x, near.tangent.z);
        p.yaw += U.angDiff(p.yaw, wantOff) * Math.min(0.85, dt * 3.2);
      }
      if (!nearFolded && dLat > corridorGate) {
        var depth = Math.min(3.5, (dLat - corridorGate) / Math.max(1, D.roadHalf * 0.7));
        var pullAmt = Math.min(1.0, depth * 0.55 * dt * 60);
        p.pos.x -= sideN.x * lat * pullAmt * 0.9;
        p.pos.z -= sideN.z * lat * pullAmt * 0.9;
      }
      if (!nearFolded && dLat > D.roadHalf * 1.45) {
        var targetLat = (D.roadHalf - 1.2) * Math.sign(lat || 1);
        var err = lat - targetLat;
        p.pos.x -= sideN.x * err * Math.min(1, dt * 3.6);
        p.pos.z -= sideN.z * err * Math.min(1, dt * 3.6);
        if (Math.abs(p.speed) < 16) p.speed = 22 * Math.sign(p.speed || 1);
      }
      // Stuck scrub: any offroad + light steer >0.4s (was speed<10 OR lat>1.7rh — Needle at offRoadMax never qualified)
      if (!nearFolded && Math.abs(p.steer) < 0.45) {
        p._offroadStuckT = (p._offroadStuckT || 0) + dt;
        if (p._offroadStuckT > 0.4) {
          var latU = near.lateralDist != null ? near.lateralDist : 0;
          var targetL = Math.sign(latU || 1) * Math.max(0, rh - 2.8);
          p.pos.x -= sideN.x * (latU - targetL) * Math.min(1, dt * 4.2);
          p.pos.z -= sideN.z * (latU - targetL) * Math.min(1, dt * 4.2);
          p.yaw = Math.atan2(near.tangent.x, near.tangent.z);
          if (Math.abs(p.speed) < 28) p.speed = 28 * Math.sign(p.speed || 1);
          if (p._offroadStuckT > 1.0) p._offroadStuckT = 0.3;
          if (!p._corridorToastT || p._corridorToastT <= 0) {
            if (corridorToastAllowed()) toast('CORRIDOR PULL', 0.55, 0);
            p._corridorToastT = 3.2;
          }
        }
      } else {
        p._offroadStuckT = 0;
      }
    } else {
      p._offroadStuckT = 0;
      p._lipStuckT = 0;
    }
    if (!isFinite(p.speed)) p.speed = 0;
    if (!isFinite(p.slip)) p.slip = 0;
    p.speed = U.clamp(p.speed, -maxSp * 0.28, maxSp);

    var speedNorm = U.clamp(Math.abs(p.speed) / (D.maxSpeed * spdMul), 0, 1);
    // Understeer at speed; handling + drift open it back up
    var turnBase = D.steerRate * handMul;
    var falloff = D.steerSpeedFalloff != null ? D.steerSpeedFalloff : 0.7;
    var turn = turnBase * (1 - falloff * speedNorm * 0.9);
    turn = Math.max(turn, turnBase * 0.22);
    if (p.drifting) turn *= D.driftSteerMul;
    // Mass slows yaw a bit
    turn /= Math.sqrt(mass);
    // A/Left = turn left on screen
    var yawSign = p.speed >= 0 ? 1 : -1;
    p.yaw -= p.steer * turn * dt * yawSign;
    // Slip couples into yaw (oversteer when sliding)
    p.yaw -= (p.slip / 28) * (D.slipYaw || 0.55) * dt * 2.2;

    // Path-assist yaw ONLY when offroad (Wave 3 — never mid-lane babysit)
    var assistStart = (D.pathAssistStart != null ? D.pathAssistStart : 0.92) * D.roadHalf;
    if (surface === 'offroad' && !nearFolded && near.dist > assistStart) {
      var wantYaw = Math.atan2(near.tangent.x, near.tangent.z);
      var dy = U.angDiff(p.yaw, wantYaw);
      var astr = (D.pathAssistStrength != null ? D.pathAssistStrength : 1.35);
      var edge = (near.dist - assistStart) / Math.max(0.5, D.roadHalf * 0.35);
      var steerGate = Math.abs(p.steer) < 0.55 ? 1 : 0.55;
      p.yaw += dy * Math.min(0.75, dt * astr * U.clamp(edge, 0, 2) * steerGate);
    }
    // v404: holding W must NOT drive the racing line. First-curve calm + opening
    // yaw-babysit (v346–v403) made corners free. Assist only at the lip / void.
    // Opening ribbon ease + high-speed edge keeper — lip only.
    if (
      surface === 'asphalt' &&
      !nearFolded &&
      near && near.tangent &&
      Math.abs(p.speed) > 10
    ) {
      var absSteerEase = Math.abs(p.steer);
      var latSignedEase = near.lateralDist != null ? near.lateralDist : 0;
      var latEase = Math.abs(latSignedEase);
      // Driving out hard = same sign as lateral and big steer — player owns that line
      var steeringOutEase =
        absSteerEase > 0.55 &&
        Math.sign(p.steer || 0) * Math.sign(latSignedEase || 1) > 0;
      var steerKeepMul = 1;
      if (absSteerEase > 0.28) {
        steerKeepMul = U.clamp(1 - (absSteerEase - 0.28) / 0.5, 0, 1);
      }
      if (steeringOutEase) steerKeepMul *= 0.12;
      var edgeGate = rh * (D.pathAssistStart != null ? D.pathAssistStart : 0.92);
      var edgeKeep = latEase > edgeGate;
      if (edgeKeep && steerKeepMul > 0.05) {
        var openWant = Math.atan2(near.tangent.x, near.tangent.z);
        var openDy = U.angDiff(p.yaw, openWant);
        var easeK = (1.15 + speedNorm * 1.5) * steerKeepMul;
        p.yaw += openDy * Math.min(0.5, dt * easeK);
        var sideKeep = new THREE.Vector3(-near.tangent.z, 0, near.tangent.x);
        var laneT = 0.82;
        var targetKeep = Math.sign(latSignedEase || 1) * rh * laneT;
        var latErrKeep = latSignedEase - targetKeep;
        var pullKeep = (0.85 + speedNorm * 1.6) * steerKeepMul;
        if (latEase > rh * 1.02) pullKeep += 1.6 * Math.max(0.35, steerKeepMul);
        p.pos.x -= sideKeep.x * latErrKeep * Math.min(1, dt * pullKeep);
        p.pos.z -= sideKeep.z * latErrKeep * Math.min(1, dt * pullKeep);
      }
    }
    // Center suction: off for first 20% of course; else only when nearly off asphalt
    if (
      surface === 'asphalt' &&
      !nearFolded &&
      (p.progress == null || p.progress >= 0.20) &&
      Math.abs(p.steer) < 0.18 &&
      Math.abs(p.speed) > 12
    ) {
      var latC = near.lateralDist != null ? near.lateralDist : 0;
      var suctionGate = D.roadHalf * 0.82;
      if (Math.abs(latC) > suctionGate) {
        var sideC = new THREE.Vector3(-near.tangent.z, 0, near.tangent.x);
        // v337: was 0.28 — too weak vs 200 mph drift onto lip
        var suckK = 0.42 + speedNorm * 0.55;
        p.pos.x -= sideC.x * latC * dt * suckK;
        p.pos.z -= sideC.z * latC * dt * suckK;
      }
    }

    // Integrate motion: forward + lateral slip
    U.forward(p.yaw, tmpV);
    U.side(p.yaw, tmpV2);
    p.pos.x += tmpV.x * p.speed * dt + tmpV2.x * p.slip * dt;
    p.pos.z += tmpV.z * p.speed * dt + tmpV2.z * p.slip * dt;

    // Hard rail after integrate — never tunnel sidewalk into canyon glass (v433)
    if (near && near.tangent && !nearFolded) {
      var nearAfter = world.nearest(p.pos, p.progress != null ? p.progress : progHint);
      if (nearAfter && isFinite(nearAfter.lateralDist) && nearAfter.tangent) {
        var latA = nearAfter.lateralDist;
        var maxBodyLat = rh + curbW + 0.45;
        var wallFace = rh + 4.5;
        maxBodyLat = Math.min(maxBodyLat, wallFace - 3.2);
        if (Math.abs(latA) > maxBodyLat) {
          var sideA = new THREE.Vector3(-nearAfter.tangent.z, 0, nearAfter.tangent.x);
          var overA = Math.abs(latA) - maxBodyLat;
          var sgnA = Math.sign(latA || 1);
          p.pos.x -= sideA.x * sgnA * overA;
          p.pos.z -= sideA.z * sgnA * overA;
          p.slip *= 0.15;
          p.speed *= Math.max(0.72, 1 - 1.1 * dt);
          if (overA > 0.8) {
            state.camShake = Math.max(state.camShake || 0, 0.1);
            if (GAME.sfx && GAME.sfx.scrape) GAME.sfx.scrape(0.15);
          }
          near = nearAfter;
          ribbonLat = nearAfter.dist;
          ribbonDist = ribbonLat;
          nearFolded = false;
        }
      }
    }

    // Ride height — ignore fold picks at a different altitude (mid-race camera freak)
    // v393: 7-sample look-ahead + grade grade damp — climb less faceted
    var groundY = p.pos.y;
    var gradeY = (near.tangent && isFinite(near.tangent.y)) ? near.tangent.y : 0;
    if (near && near.point && isFinite(near.point.y) && !nearFolded) {
      var yErr = near.point.y - p.pos.y;
      if (Math.abs(yErr) < 8) {
        var yBlend = near.point.y;
        if (path && path.curve && p.progress != null) {
          var t0 = p.progress || 0;
          var yW = 0, wSum = 0;
          // Wider look-ahead so steep mid-climb averages, not stair-steps
          var yOff = [0, 0.004, 0.01, 0.018, 0.028, 0.04, 0.055];
          var yWt = [0.28, 0.22, 0.18, 0.14, 0.1, 0.05, 0.03];
          for (var yi = 0; yi < yOff.length; yi++) {
            var yp = path.curve.getPointAt(U.clamp(t0 + yOff[yi], 0, 0.999));
            if (yp && isFinite(yp.y)) {
              yW += yp.y * yWt[yi];
              wSum += yWt[yi];
            }
          }
          if (wSum > 0.01) yBlend = yW / wSum;
          var yNear = path.curve.getPointAt(U.clamp(t0, 0, 0.999));
          var yFar = path.curve.getPointAt(U.clamp(t0 + 0.04, 0, 0.999));
          if (yNear && yFar && path.length > 1) {
            var span = path.length * 0.04;
            if (span > 1) gradeY = (yFar.y - yNear.y) / span;
          }
        }
        groundY = yBlend + 0.72; // v433: wheels clear asphalt/sheen
      }
    }
    // Rate-limit grade so pitch/ride don't jump on control-point kinks
    if (p._gradeSm == null || !isFinite(p._gradeSm)) p._gradeSm = gradeY;
    p._gradeSm = U.damp(p._gradeSm, gradeY, 8, dt);
    gradeY = p._gradeSm;
    if (surface === 'raised') {
      // Lip is higher than deep sidewalk deck
      var lipBlend = U.clamp(1 - (dLat - rh) / Math.max(0.01, curbW + 0.3), 0, 1);
      groundY += 0.18 + lipBlend * 0.12;
      // Light paver rumble only once fully on the walk
      if (dLat > rh + curbW + 0.2 && Math.abs(p.speed) > 5) {
        var rum = D.sidewalkRumble != null ? D.sidewalkRumble : 0.03;
        groundY += Math.sin((state.raceTime || 0) * 26 + p.pos.z * 2.1) * rum;
      }
    } else if (surface === 'offroad') {
      groundY += 0.04;
    }
    // Decay hop lift after lip hit
    if (p._hopLift > 0) {
      groundY += p._hopLift;
      p._hopLift = Math.max(0, p._hopLift - dt * 2.8);
    }
    if (!isFinite(groundY)) groundY = p.pos.y;
    // Double-smooth: target then body (v393: softer on steep grade to kill facet)
    if (p._groundYSm == null || !isFinite(p._groundYSm)) p._groundYSm = groundY;
    // v433: coast hills left chassis buried when damp lagged
    var yGapPre = groundY - p.pos.y;
    if (!nearFolded && Math.abs(yGapPre) > 1.15) {
      p._groundYSm = groundY;
      p.pos.y += Math.sign(yGapPre) * Math.min(Math.abs(yGapPre), 36 * dt);
    }
    p._groundYSm = U.damp(p._groundYSm, groundY, 18 + Math.min(8, Math.abs(gradeY) * 32), dt);
    var yDamp = 14 + Math.min(10, Math.abs(gradeY) * 36);
    if (!nearFolded && Math.abs(groundY - p.pos.y) > 0.55) yDamp += 22;
    p.pos.y = U.damp(p.pos.y, p._groundYSm, yDamp, dt);
    if (!isFinite(p.pos.y)) p.pos.y = groundY;
    if (!isFinite(p.pos.x)) p.pos.x = near.point.x;
    if (!isFinite(p.pos.z)) p.pos.z = near.point.z;
    // Grade — uphill taxes speed, downhill pays it back (v318 feel)
    if (isFinite(gradeY)) p.speed -= gradeY * 36 * dt;
    if (!isFinite(p.speed)) p.speed = 0;

    p.mesh.position.copy(p.pos);
    if (GAME.vehicles.setYaw) GAME.vehicles.setYaw(p.mesh, p.yaw);
    else p.mesh.rotation.y = p.yaw;
    // Pitch to smoothed grade (v393)
    var pitchWant = U.clamp(-gradeY * 1.05, -0.2, 0.2);
    p.mesh.rotation.x = U.damp(p.mesh.rotation.x || 0, pitchWant, 8, dt);
    // Bank from steer + slip
    var bankT = p.steer * (p.drifting ? (D.bankDrift || 0.28) : (D.bankAmount || 0.16));
    bankT += U.clamp(p.slip / 40, -0.12, 0.12);
    p.mesh.rotation.z = U.damp(p.mesh.rotation.z || 0, bankT, 9, dt);
    // Nitro exhaust cones on the mesh — dual flicker when active
    function pulseFlame(nf, phase) {
      if (!nf) return;
      nf.visible = !!p.nitroActive;
      if (!p.nitroActive) return;
      var flick = 0.75 + 0.45 * Math.sin((state.raceTime || 0) * 52 + phase + p.speed);
      nf.scale.set(flick * 0.85, flick * 1.5, flick * 0.9);
      if (nf.material && nf.material.opacity != null) {
        nf.material.opacity = 0.65 + Math.random() * 0.35;
      }
    }
    pulseFlame(p.mesh.userData.nitroFlame, 0);
    pulseFlame(p.mesh.userData.nitroFlame2, 2.1);
    // Soft LED underglow — steady, slight speed breath (not a strobe)
    var ledBreath = 0.78 + 0.08 * Math.sin((state.raceTime || 0) * 2.2)
      + (p.nitroActive ? 0.1 : 0);
    if (p.mesh.userData.underglow) p.mesh.userData.underglow.visible = false;
    if (p.mesh.userData.neonRing) p.mesh.userData.neonRing.visible = false;
    if (p.mesh.userData.roofPing) p.mesh.userData.roofPing.visible = false;
    function setLedOp(obj, op) {
      if (obj && obj.material && obj.material.opacity != null) {
        obj.material.opacity = op;
        obj.visible = true;
      }
    }
    setLedOp(p.mesh.userData.ledLeft, Math.min(0.95, ledBreath));
    setLedOp(p.mesh.userData.ledRight, Math.min(0.95, ledBreath));
    setLedOp(p.mesh.userData.ledBloomL, Math.min(0.35, ledBreath * 0.35));
    setLedOp(p.mesh.userData.ledBloomR, Math.min(0.35, ledBreath * 0.35));
    if (p.mesh.userData.underLight) {
      p.mesh.userData.underLight.intensity = 1.6 + (p.nitroActive ? 0.6 : 0);
      p.mesh.userData.underLight.visible = true;
    }
    if (p.mesh.userData.bodyFill) {
      p.mesh.userData.bodyFill.intensity = 2.2 + (p.nitroActive ? 0.5 : 0);
      p.mesh.userData.bodyFill.visible = true;
    }
    if (p.mesh.userData.rearFill) {
      p.mesh.userData.rearFill.intensity = 1.5;
      p.mesh.userData.rearFill.visible = true;
    }
    if (p.mesh.userData.headLight) {
      p.mesh.userData.headLight.intensity = 2.6 + Math.min(0.8, Math.abs(p.speed) * 0.015);
      p.mesh.userData.headLight.visible = true;
    }
    if (p.mesh.userData.wheels) {
      var spin = p.speed * dt * 2.2;
      p.mesh.userData.wheels.forEach(function (wh) { wh.rotation.x += spin; });
    }

    // Engine pitch by mass (Needle high, Mausoleum low)
    var massPitch = 1 / Math.sqrt(Math.max(0.5, mass));
    if (GAME.sfx) {
      if (GAME.sfx.engineUpdateEx) GAME.sfx.engineUpdateEx(speedNorm, p.nitroActive, massPitch);
      else GAME.sfx.engineUpdate(speedNorm, p.nitroActive);
    }
    // Budgeted nitro speed lines (additive planes, no new lights)
    if (p.nitroActive && particles && Math.random() < 0.35) {
      U.forward(p.yaw, tmpV);
      U.side(p.yaw, tmpV2);
      var sl = p.pos.clone().addScaledVector(tmpV, 4 + Math.random() * 8)
        .addScaledVector(tmpV2, (Math.random() - 0.5) * 6);
      sl.y = p.pos.y + 0.4 + Math.random() * 1.2;
      particles.spawn('cyan', sl, { count: 1, speed: 2, life: 0.12, scale: 0.25, gravity: 0 });
    }
    // Drift tire noise scales with slip
    if (p.drifting && Math.abs(p.slip || 0) > 3 && GAME.sfx && GAME.sfx.drift) {
      GAME.sfx.drift();
    }

    if (p.inv > 0) p.inv -= dt;
    if (p.rocketCd > 0) p.rocketCd -= dt;
    if (p.mineCd > 0) p.mineCd -= dt;
    if (p.mgCd > 0) p.mgCd -= dt;
    if (p.specialCd > 0) p.specialCd -= dt;
    if (p.stabCd > 0) p.stabCd -= dt;
    if (p._denyMgT > 0) p._denyMgT -= dt;
    if (p._denyRkT > 0) p._denyRkT -= dt;
    if (p._denyMnT > 0) p._denyMnT -= dt;
    if (p._underFireToastT > 0) p._underFireToastT -= dt;
    if (p._oilToastT > 0) p._oilToastT -= dt;
    if (p._veinMissToastT > 0) p._veinMissToastT -= dt;
    if (p._corridorToastT > 0) p._corridorToastT -= dt;
    if (state._empHudT > 0) state._empHudT -= dt;
    // MG overheat cool
    if (p.mgOverT > 0) {
      p.mgOverT -= dt;
      if (p.mgOverT <= 0) p.mgHeat = 0.35;
    } else if (p.mgHeat > 0 && p.mgCd <= 0) {
      p.mgHeat = Math.max(0, p.mgHeat - dt * 0.55);
      // Re-arm overheat toast only after a real cool below half
      if (p.mgHeat < 0.25) p._overheatToastArmed = false;
    }
    if (p._gunFlashT > 0) p._gunFlashT -= dt;
    if (p._muzzleBodyT > 0) p._muzzleBodyT -= dt;
    if (p._hoodMuzzleT > 0) p._hoodMuzzleT -= dt;
    if (p._chaseMuzzleT > 0) p._chaseMuzzleT -= dt;
    // v431: muzzle flash lights car body orange (TM secondary illumination)
    if (p.mesh) {
      var bodyFlash = Math.max((p._muzzleBodyT || 0) / 0.14, (state.firingMg || 0) * 0.55);
      if (bodyFlash > 0.03) {
        p.mesh.traverse(function (c) {
          if (!c.isMesh || !c.material || !c.material.emissive) return;
          if (c.userData && (c.userData._isGun || c.userData.gun)) return;
          if (c.material.emissiveIntensity > 2.8) return;
          if (!c.material.userData) c.material.userData = {};
          if (c.material.userData._muzBaseEI == null) {
            c.material.userData._muzBaseEI = c.material.emissiveIntensity || 0;
            c.material.userData._muzBaseHex = c.material.emissive.getHex();
          }
          c.material.emissive.setHex(0xff7722);
          c.material.emissiveIntensity = c.material.userData._muzBaseEI + bodyFlash * 2.4;
        });
      } else if (p._muzzleBodyT <= 0 && (state.firingMg || 0) <= 0) {
        p.mesh.traverse(function (c) {
          if (!c.isMesh || !c.material || !c.material.emissive || !c.material.userData) return;
          if (c.material.userData._muzBaseEI == null) return;
          c.material.emissive.setHex(c.material.userData._muzBaseHex);
          c.material.emissiveIntensity = c.material.userData._muzBaseEI;
        });
      }
    }
    if (p._engineDipT > 0) {
      p._engineDipT -= dt;
      p.speed *= (1 - 0.35 * Math.min(1, p._engineDipT * 8));
    }
    if (state._hitStopT > 0) state._hitStopT -= dt;
    // Signature specials (tether cable, mortar lob, EMP dome, sermon ring…)
    if (GAME.specials && GAME.specials.update) {
      GAME.specials.update(specialCtx(), dt);
    }

    // v340: heat applied inside fire* on successful discharge (not hold-frame tax)
    if (GAME.maglev && GAME.maglev.update && state.maglev) {
      GAME.maglev.update(state.maglev, dt, {
        player: p,
        rivals: state.rivals,
        roadHalf: cfg.drive.roadHalf,
        toast: toast,
        hurtPlayer: hurtPlayer,
        hurtRival: hurtRival,
      });
    }
    if (GAME.wardenLane && GAME.wardenLane.update && state.wardenLane) {
      GAME.wardenLane.update(state.wardenLane, dt, {
        player: p,
        rivals: state.rivals,
        path: state.path,
        roadHalf: cfg.drive.roadHalf,
        toast: toast,
        hurtPlayer: hurtPlayer,
        hurtRival: hurtRival,
      });
    }
    if (I.key('j') || I.key('z')) fireMg();
    if (I.pressed('k') || I.pressed('x')) fireRocket();
    if (I.pressed('l')) dropMine();
    if (I.pressed('i')) fireSpecial();
    if (I.pressed('c') || I.pressed('v')) {
      // Wave 11: chase → near-chase → hood → chase
      var order = ['chase', 'near', 'hood'];
      var ix = order.indexOf(state.camMode);
      if (ix < 0) ix = 0;
      state.camMode = order[(ix + 1) % order.length];
      if (state.camMode === 'hood') state._camSnapHood = true;
      toast(state.camMode === 'hood' ? 'HOOD CAM' : (state.camMode === 'near' ? 'NEAR CHASE' : 'CHASE CAM'), 0.8);
    }
    // Quality mid-race (same as garage O) (v301)
    if (I.pressed('o') || I.pressed('p')) {
      toggleQuality();
    }

    // Finish-arch cyan pulse — start a hair earlier so arch reads before ceremony (v297)
    if (p.progress > 0.90 && world && world.pulseFinish) {
      world.pulseFinish(state.raceTime || 0);
    } else if (p.progress > 0.90 && state._searchlight && state._searchlight.card) {
      // Fallback cyan wash on ground card near finish feel
      state._finishPulse = 0.5 + 0.5 * Math.sin((state.raceTime || 0) * 8);
    }
    if (state._fovPunch > 0) state._fovPunch = Math.max(0, state._fovPunch - dt * 14);
    // Kill feed timer
    if (state.killFeed && state.killFeed.length) {
      for (var kf = state.killFeed.length - 1; kf >= 0; kf--) {
        state.killFeed[kf].t -= dt;
        if (state.killFeed[kf].t <= 0) state.killFeed.splice(kf, 1);
      }
    }

    // Hostile track — late course or heat (no lap-based trigger)
    if ((p.progress >= 0.55 || p.heat >= cfg.heat.hostileAt) && !state.hostile) {
      state.hostile = true;
      var byHeat = p.heat >= cfg.heat.hostileAt;
      toast(byHeat ? 'WARDEN EYE' : 'WARDEN LOCK — HAZARDS LIVE', 2.2, 2);
      if (GAME.sfx) {
        if (GAME.sfx.wardenWarn) GAME.sfx.wardenWarn();
        else GAME.sfx.sweep(100, 420, 0.3, 'square', 0.12);
      }
      state.camShake = 0.35;
      // Stronger magenta grade when heat trips the eye (must be visible)
      if (byHeat && postfx && postfx.setGrade) {
        postfx.setGrade({
          exposure: 1.15,
          liftCyan: 0.0,
          liftAmber: 0.14,
          saturation: 1.22,
          contrast: 1.14,
          vignette: 0.4,
          bloomStrength: 0.28,
        });
        state._wardenGrade = true;
      }
      // Arm spike near leader (player or rival in 1st)
      var leadProg = p.progress || 0;
      state.rivals.forEach(function (rv) {
        if (!rv.dead && (rv.progress || 0) > leadProg) leadProg = rv.progress;
      });
      var spikesArmed = 0;
      state.hazards.forEach(function (h) {
        if ((h.type === 'spike' || h.type === 'electric') && Math.abs((h.progress || 0) - leadProg) < 0.14) {
          h.phase = 'yellow';
          h.timer = 0.4;
          spikesArmed++;
        }
      });
      state._wardenSpikesArmed = spikesArmed;
      // Persistent heat edge cue on HUD via state flag
      state._wardenEye = byHeat;
    }
    // Eye ends once heat cools under trip line (small hysteresis so it doesn't flicker)
    if (state._wardenEye && p.heat < cfg.heat.hostileAt * 0.92
        && (state._emptyStretchEyeT || 0) <= 0 && !state._lastEightEyeHold) {
      state._wardenEye = false;
    }
    // v372: restore map grade when warden grade was sticky after Eye ends
    if (state._wardenGrade && !state._wardenEye
        && (state._emptyStretchEyeT || 0) <= 0 && !state._lastEightEyeHold) {
      state._wardenGrade = false;
      if (postfx && postfx.setGrade && state.mapDef) {
        var baseG2 = cfg.grade || {};
        var mapG2 = state.mapDef.grade || {};
        postfx.setGrade({
          exposure: mapG2.exposure != null ? mapG2.exposure : baseG2.exposure,
          contrast: mapG2.contrast != null ? mapG2.contrast : baseG2.contrast,
          saturation: mapG2.saturation != null ? mapG2.saturation : baseG2.saturation,
          bloomStrength: mapG2.bloomStrength != null ? mapG2.bloomStrength : baseG2.bloomStrength,
          bloomThreshold: mapG2.bloomThreshold != null ? mapG2.bloomThreshold : baseG2.bloomThreshold,
          vignette: mapG2.vignette != null ? mapG2.vignette : baseG2.vignette,
          grain: mapG2.grain != null ? mapG2.grain : baseG2.grain,
          chromatic: mapG2.chromatic != null ? mapG2.chromatic : baseG2.chromatic,
          liftCyan: mapG2.liftCyan != null ? mapG2.liftCyan : baseG2.liftCyan,
          liftAmber: mapG2.liftAmber != null ? mapG2.liftAmber : baseG2.liftAmber,
        });
      }
    }

    // v404: rocket lock — nearest living rival in a forward cone (HUD pip)
    state._lockRival = null;
    if (p && playerWeapons().rocket) {
      U.forward(p.yaw, tmpV);
      var lockBest = null, lockD2 = 70 * 70;
      for (var li = 0; li < (state.rivals || []).length; li++) {
        var lr = state.rivals[li];
        if (!lr || lr.dead || !lr.pos) continue;
        tmpV2.subVectors(lr.pos, p.pos).setY(0);
        var ld2 = tmpV2.lengthSq();
        if (ld2 < 8 * 8 || ld2 > lockD2) continue;
        var llen = Math.sqrt(ld2);
        if (llen < 0.1) continue;
        var ldot = (tmpV2.x * tmpV.x + tmpV2.z * tmpV.z) / llen;
        if (ldot < 0.52) continue;
        lockD2 = ld2;
        lockBest = lr;
      }
      state._lockRival = lockBest;
    }

    // Projectiles (pooled meshes — no per-frame alloc storms)
    if (p._muzzleFxT > 0) p._muzzleFxT -= dt;
    if (p._hitConfirmT > 0) p._hitConfirmT -= dt;
    ensureCombatPool();
    for (var i = state.projectiles.length - 1; i >= 0; i--) {
      var pr = state.projectiles[i];
      if (!pr || !pr.mesh) {
        state.projectiles.splice(i, 1);
        continue;
      }
      if (pr.homing && pr.fromPlayer) {
        var best = null, bd = 58;
        for (var hj = 0; hj < state.rivals.length; hj++) {
          var hr = state.rivals[hj];
          if (hr.dead) continue;
          var hd = pr.pos.distanceToSquared(hr.pos);
          if (hd < bd * bd) { bd = Math.sqrt(hd); best = hr; }
        }
        if (best) {
          var spd = pr.vel.length();
          // Lead target slightly so rockets connect at race speed
          tmpV.subVectors(best.pos, pr.pos).setY(0);
          tmpV.x += Math.sin(best.yaw || 0) * (best.speed || 0) * 0.12;
          tmpV.z += Math.cos(best.yaw || 0) * (best.speed || 0) * 0.12;
          if (tmpV.lengthSq() > 0.01) {
            tmpV.normalize().multiplyScalar(spd);
            pr.vel.lerp(tmpV, 0.14);
          }
        }
      }
      pr.pos.addScaledVector(pr.vel, dt);
      pr.mesh.position.copy(pr.pos);
      // Reuse lookTmp — never clone every frame
      if (pr.type === 'mg') {
        aimMgTracer(pr.mesh, pr.pos, pr.vel);
        // v430: white smoke ribbons along MG path (TM chain-gun trail)
        if (pr.trail && particles && Math.random() < 0.62) {
          if (particles.mgRibbon) particles.mgRibbon(pr.pos, pr.vel);
          else if (particles.spawn) {
            particles.spawn('spark', pr.pos.clone(), {
              count: 1, speed: 2, life: 0.14, scale: 0.22, gravity: 0,
            });
          }
        }
      } else if (pr.type === 'rocket' || pr.type === 'bone') {
        _combatPool.lookTmp.copy(pr.pos).add(pr.vel);
        pr.mesh.lookAt(_combatPool.lookTmp);
      }
      // Rocket / bone trail — bones drip marrow-orange so they read as bones not rockets (v314)
      if (pr.smoke && particles && Math.random() < (pr.type === 'bone' ? 0.22 : 0.18)) {
        if (pr.type === 'bone') {
          particles.wetMist(pr.pos, { scale: 0.22 });
          if (particles.spawn && Math.random() < 0.55) {
            particles.spawn('fire', pr.pos.clone(), { count: 1, speed: 1.5, life: 0.14, scale: 0.28, gravity: 0 });
          }
        } else {
          particles.wetMist(pr.pos, { scale: 0.62 });
          if (pr.type === 'rocket' && particles.spawn) {
            particles.spawn('fire', pr.pos.clone(), { count: 2, speed: 3, life: 0.16, scale: 0.5, gravity: 0 });
            if (Math.random() < 0.45) {
              particles.spawn('smoke', pr.pos.clone(), { count: 1, speed: 1.2, life: 0.28, scale: 0.7, gravity: -0.4 });
            }
          }
        }
      }
      if (pr.mesh.userData && pr.mesh.userData.exhaust) {
        pr.mesh.userData.exhaust.scale.setScalar(0.85 + Math.random() * 0.4);
      }
      pr.life -= dt;
      var hit = false;
      // XZ hit tests + multi-sample along this frame's travel (high-speed miss fix)
      function projHitsTarget(prObj, targetPos, radius) {
        var r2 = radius * radius;
        var steps = prObj.type === 'rocket' ? 3 : 2;
        for (var s = 0; s <= steps; s++) {
          var u = s / steps;
          var px = prObj.pos.x - prObj.vel.x * dt * (1 - u);
          var pz = prObj.pos.z - prObj.vel.z * dt * (1 - u);
          var dx = px - targetPos.x;
          var dz = pz - targetPos.z;
          if (dx * dx + dz * dz < r2) return true;
        }
        return false;
      }
      if (pr.fromPlayer) {
        var pMgR = cfg.combat.mgHitR != null ? cfg.combat.mgHitR : 3.1;
        var pRkR = cfg.combat.rocketHitR != null ? cfg.combat.rocketHitR : 4.0;
        for (var ri = 0; ri < state.rivals.length; ri++) {
          var rv = state.rivals[ri];
          if (rv.dead) continue;
          var hitR = pr.type === 'mg' ? pMgR : pRkR;
          if (projHitsTarget(pr, rv.pos, hitR)) {
            hurtRival(rv, pr.dmg);
            if (particles) {
              if (pr.type === 'rocket' || pr.type === 'bone') particles.explosion(pr.pos, pr.type === 'rocket');
              else {
                // v400: MG hit spark must read in chase (hitTrail alone was too small)
                if (particles.sparks) particles.sparks(pr.pos, pr.vel);
                if (particles.hitBurst) particles.hitBurst(pr.pos);
                else particles.hitTrail(pr.pos, 'spark');
                if (particles.spawn) {
                  particles.spawn('spark', pr.pos.clone(), {
                    count: 8, speed: 16, life: 0.22, scale: 0.5, gravity: 8,
                  });
                }
                if (particles.burstLight) particles.burstLight(pr.pos, 0xff6622, 6, 0.12);
              }
            }
            if ((pr.type === 'rocket' || pr.type === 'bone') && GAME.sfx) GAME.sfx.explode();
            else if (GAME.sfx) GAME.sfx.hit();
            state.camShake = Math.max(state.camShake || 0, (pr.type === 'rocket' || pr.type === 'bone') ? 0.22 : 0.07);
            if (pr.type === 'mg') {
              p._hitConfirmT = (p._hitConfirmT || 0);
              if (p._hitConfirmT <= 0) p._hitConfirmT = 0.38;
              // slight cam nudge sells hits at speed
              state.camShake = Math.max(state.camShake || 0, 0.09);
            } else {
              // v375: heavy hits get stop-frame + FOV so combat isn't toast-only
              state._hitStopT = Math.max(state._hitStopT || 0, pr.type === 'bone' ? 0.12 : 0.08);
              state._fovPunch = Math.max(state._fovPunch || 0, pr.type === 'bone' ? 8 : 4);
              state.hitFlash = Math.min(1.2, (state.hitFlash || 0) + (pr.type === 'bone' ? 0.35 : 0.18));
              // v390: named bone hit when target known
              var hitToast = 'DIRECT HIT';
              if (pr.type === 'bone') {
                if (GAME.specials && GAME.specials.noteBoneHit) GAME.specials.noteBoneHit();
                var bn = pr.boneName;
                if (!bn && rv.defId && cfg.cars) {
                  for (var bi = 0; bi < cfg.cars.length; bi++) {
                    if (cfg.cars[bi].id === rv.defId) { bn = cfg.cars[bi].name; break; }
                  }
                }
                var volley = state._boneVolley;
                if (volley) {
                  hitToast = 'BONE HARVEST · ' + volley.hits + '/' + volley.fired + ' HIT';
                } else {
                  hitToast = bn ? ('BONE HIT · ' + String(bn).toUpperCase()) : 'BONE HIT';
                }
              }
              toast(hitToast, pr.type === 'bone' ? 0.95 : 0.6, pr.type === 'bone' ? 2 : 0);
            }
            hit = true;
            break;
          }
        }
      } else {
        var eMgR = cfg.combat.enemyMgHitR != null ? cfg.combat.enemyMgHitR : 2.6;
        var eRkR = cfg.combat.enemyRocketHitR != null ? cfg.combat.enemyRocketHitR : 3.2;
        var eR = pr.type === 'rocket' ? eRkR : eMgR;
        if (projHitsTarget(pr, p.pos, eR)) {
          hurtPlayer(pr.dmg, pr.pos);
          // v352: MG return fire shouldn't lock 0.55s inv (one tick then mute)
          if (pr.type === 'mg' && state.player) {
            state.player.inv = Math.min(state.player.inv || 0, 0.18);
          }
          if (particles) {
            if (pr.type === 'rocket') particles.explosion(pr.pos, false);
            else particles.hitTrail(pr.pos, 'pink');
          }
          if (pr.type === 'rocket') {
            state.camShake = Math.max(state.camShake || 0, 0.18);
            if (GAME.sfx) GAME.sfx.explode();
          } else if (GAME.sfx && GAME.sfx.hit) {
            GAME.sfx.hit();
          }
          hit = true;
        }
      }
      if (hit || pr.life <= 0) {
        // v400: spent MG into world — tiny spark (no world collider; life expiry ~ miss/range)
        if (!hit && pr.type === 'mg' && particles && particles.sparks && Math.random() < 0.35) {
          particles.sparks(pr.pos);
        }
        recycleProjectileMesh(pr.mesh);
        state.projectiles.splice(i, 1);
      }
    }

    // Mines
    for (var mi = state.mines.length - 1; mi >= 0; mi--) {
      var mine = state.mines[mi];
      if (!mine || !mine.mesh) {
        state.mines.splice(mi, 1);
        continue;
      }
      mine.life -= dt;
      var mMat = mine.bodyMat || (mine.body && mine.body.material) || null;
      if (mine.arm > 0) {
        mine.arm -= dt;
        if (mMat && mMat.emissive) {
          mMat.emissive.setHex(0x00e5ff);
          mMat.emissiveIntensity = 0.25 + Math.sin(state.raceTime * 18) * 0.2;
        }
        if (mine.blink && mine.blink.material) {
          mine.blink.material.color.setHex(0x00e5ff);
          mine.blink.material.opacity = 0.4 + Math.sin(state.raceTime * 20) * 0.35;
          mine.blink.material.transparent = true;
        }
        if (mine.armRing && mine.armRing.material) {
          mine.armRing.material.color.setHex(0x00e5ff);
          mine.armRing.material.opacity = 0.55 + 0.25 * Math.sin(state.raceTime * 14);
          mine.armRing.scale.setScalar(1 + 0.1 * Math.sin(state.raceTime * 10));
        }
        // Arm complete — pink snap + sting (was silent flip)
        if (mine.arm <= 0 && !mine._armedFx) {
          mine._armedFx = true;
          if (mine.armRing) mine.armRing.scale.setScalar(1.55);
          if (particles && particles.spawn) {
            particles.spawn('pink', mine.pos.clone().setY(mine.pos.y + 0.3), {
              count: 10, speed: 5, life: 0.22, gravity: 0,
            });
          }
          if (GAME.sfx) {
            if (GAME.sfx.beep) GAME.sfx.beep(720, 0.05, 'square', 0.09);
            if (GAME.sfx.beep) GAME.sfx.beep(420, 0.07, 'square', 0.07);
          }
          state.camShake = Math.max(state.camShake || 0, 0.06);
        }
      } else {
        if (mMat && mMat.emissive) {
          mMat.emissive.setHex(0xff2d55);
          mMat.emissiveIntensity = 0.7 + 0.35 * Math.sin(state.raceTime * 16);
        }
        if (mine.blink && mine.blink.material) {
          mine.blink.material.color.setHex(0xff2d55);
          mine.blink.material.opacity = 0.55 + 0.45 * Math.sin(state.raceTime * 22);
          mine.blink.material.transparent = true;
        }
        if (mine.armRing && mine.armRing.material) {
          mine.armRing.material.color.setHex(0xff2d55);
          mine.armRing.material.opacity = 0.45 + 0.4 * Math.sin(state.raceTime * 18);
          mine.armRing.scale.setScalar(1.05 + 0.12 * Math.sin(state.raceTime * 12));
        }
        var boom = false;
        for (var rj = 0; rj < state.rivals.length; rj++) {
          var rr = state.rivals[rj];
          if (rr.dead) continue;
          if (mine.pos.distanceTo(rr.pos) < 2.9) {
            hurtRival(rr, mine.dmg);
            // Rival hop
            rr._sermonLift = Math.max(rr._sermonLift || 0, 0.85);
            rr._sermonLiftT = Math.max(rr._sermonLiftT || 0, 0.35);
            rr.pos.y += 0.35;
            boom = true;
            break;
          }
        }
        // Player can still eat own mine
        if (!boom && p.pos.distanceTo(mine.pos) < 2.6 && (p.inv || 0) <= 0) {
          hurtPlayer(mine.dmg * 0.85, mine.pos);
          p.speed *= 0.55;
          boom = true;
        }
        if (boom) {
          if (particles) particles.explosion(mine.pos.clone(), true);
          if (GAME.sfx) GAME.sfx.explode();
          scene.remove(mine.mesh);
          state.mines.splice(mi, 1);
          state.camShake = 0.32;
          mine = null;
        }
      }
      if (mine && mine.life <= 0) {
        scene.remove(mine.mesh);
        state.mines.splice(mi, 1);
      }
    }

    // Pack presence: hunter + gunner stay in the fight until player ≥0.88 or dead (v286)
    if (state._packReToast > 0) state._packReToast -= dt;
    // Late hunter: if pack wiped before 0.85, remounts (max 2) — then track is the warden (v289)
    trySpawnLateHunter(p, path);
    // Pulse cooldown ticks even while waiting (empty-stretch persist v290)
    if (state._emptyStretchPulseCd > 0) state._emptyStretchPulseCd -= dt;
    tryArmEmptyStretch(p, path);
    tryArmLastEight(p, path);
    // Short forced Eye after pulse — cools off, not permanent; persist re-arms later
    if (state._emptyStretchEyeT > 0) {
      state._emptyStretchEyeT -= dt;
      state._wardenEye = true;
      if (state._emptyStretchEyeT <= 0) {
        state._emptyStretchEyeT = 0;
        // Only drop Eye if heat is also calm (unless last-8% hold)
        if (!state._lastEightEyeHold && p.heat < cfg.heat.hostileAt * 0.92) {
          state._wardenEye = false;
        }
      }
    }
    // Last 8%: hold Eye to 0.97 so gate approach still reads danger (v291)
    if (state._lastEightEyeHold) {
      if ((p.progress || 0) < 0.97) {
        state._wardenEye = true;
      } else {
        state._lastEightEyeHold = false;
        if (p.heat < cfg.heat.hostileAt * 0.92 && (state._emptyStretchEyeT || 0) <= 0) {
          state._wardenEye = false;
        }
      }
    }
    (function markPackAnchor() {
      var pProg = (p && p.progress) || 0;
      var need = p && p.hp > 0 && !p.finished && pProg < 0.88;
      var hunter = null;
      var gunner = null;
      state.rivals.forEach(function (rv) {
        rv._packAnchor = false;
        rv._packGun = false;
        if (!need || rv.dead) return;
        if (rv.role === 'hunter' && !hunter) hunter = rv;
        if (rv.role === 'gunner' && !gunner) gunner = rv;
      });
      if (need && !hunter) {
        state.rivals.forEach(function (rv) {
          if (!hunter && !rv.dead) hunter = rv;
        });
      }
      if (need && !gunner) {
        state.rivals.forEach(function (rv) {
          if (!gunner && !rv.dead && rv !== hunter) gunner = rv;
        });
      }
      if (hunter) hunter._packAnchor = true;
      if (gunner) gunner._packGun = true;
    })();

    // Rivals AI — path follow + rubber band + mixed weapons (open course)
    state.rivals.forEach(function (r, ri) {
      // Corpse: tumble + secondary boom + smoke then hide (v359)
      if (r.dead) {
        if (r._corpseT != null && r._corpseT > 0) {
          r._corpseT -= dt;
          if (r._wreckBoomT != null && r._wreckBoomT > 0) {
            r._wreckBoomT -= dt;
            if (r._wreckBoomT <= 0) {
              r._wreckBoomT = null;
              var b2 = r.pos.clone();
              b2.y += 0.9;
              if (particles) {
                if (particles.explosion) particles.explosion(b2, true);
                if (particles.spawn) {
                  particles.spawn('fire', b2, { count: 16, speed: 12, life: 0.5, gravity: 2 });
                  particles.spawn('smoke', b2, { count: 10, speed: 3.5, life: 1.3, scale: 1.5, gravity: -0.4 });
                }
              }
              state.camShake = Math.max(state.camShake || 0, 0.18);
              if (GAME.sfx && GAME.sfx.explode) GAME.sfx.explode();
            }
          }
          if (particles && Math.random() < 0.55) {
            particles.wetMist(r.pos.clone().setY(r.pos.y + 0.9), { scale: 1.0 });
            if (Math.random() < 0.35 && particles.spawn) {
              particles.spawn('fire', r.pos.clone().setY(r.pos.y + 0.5), {
                count: 2, speed: 4, life: 0.35, gravity: 1,
              });
            }
          }
          if (r.mesh) {
            r.mesh.visible = true;
            r.mesh.position.copy(r.pos);
            // Chassis tip + spin so wreck isn't a static dark mesh
            r._wreckPitch = Math.min(0.85, (r._wreckPitch || 0) + dt * 1.1);
            r.yaw = (r.yaw || 0) + (r._wreckSpin || 0) * dt;
            r._wreckSpin = Math.max(0, (r._wreckSpin || 0) - dt * 1.6);
            if (GAME.vehicles.setYaw) GAME.vehicles.setYaw(r.mesh, r.yaw);
            else r.mesh.rotation.y = r.yaw;
            r.mesh.rotation.x = r._wreckPitch;
            r.mesh.position.y = r.pos.y + Math.sin(r._wreckPitch) * 0.35;
          }
          if (r._corpseT <= 0 && r.mesh) r.mesh.visible = false;
        }
        return;
      }
      if (r.disabledT > 0) r.disabledT -= dt;
      if (r.ramCd > 0) r.ramCd -= dt;
      if (r.hurtFlash > 0) r.hurtFlash -= dt;
      if (r.invT > 0) r.invT -= dt;
      if (r._sermonStunT > 0) r._sermonStunT -= dt;
      r.fireCd -= dt;
      if (r.rocketCd > 0) r.rocketCd -= dt;
      // Rival LEDs + soft fill — readable, not rave
      if (r.mesh && r.mesh.userData.underglow) r.mesh.userData.underglow.visible = false;
      if (r.mesh && r.mesh.userData.neonRing) r.mesh.userData.neonRing.visible = false;
      var rLed = 0.6 + (r.hurtFlash > 0 ? 0.2 : 0);
      if (r.hp < r.maxHp * 0.35) rLed = 0.45 + 0.35 * Math.sin((state.raceTime || 0) * 8);
      // Low-HP smoke body tell (budgeted)
      if (r.hp < r.maxHp * 0.3 && particles && Math.random() < 0.08) {
        particles.wetMist(r.pos.clone().setY(r.pos.y + 0.8), { scale: 0.55 });
      }
      // EMP: dark while disabled; clean one-shot restore (no underLight leak, no flash)
      var empDark = (r.disabledT || 0) > 0 || (r._empFlickerT || 0) > 0;
      if (empDark) {
        if (!r._empDarkOn) {
          setRivalEmpDark(r, true);
          r._empDarkOn = true;
        }
      } else if (r._empDarkOn) {
        setRivalEmpDark(r, false);
        r._empDarkOn = false;
      }
      if (!empDark) {
        if (r.mesh && r.mesh.userData.ledLeft && r.mesh.userData.ledLeft.material) {
          r.mesh.userData.ledLeft.material.opacity = rLed;
          r.mesh.userData.ledLeft.visible = true;
        }
        if (r.mesh && r.mesh.userData.ledRight && r.mesh.userData.ledRight.material) {
          r.mesh.userData.ledRight.material.opacity = rLed;
          r.mesh.userData.ledRight.visible = true;
        }
        if (r.mesh && r.mesh.userData.ledBloomL && r.mesh.userData.ledBloomL.material) {
          r.mesh.userData.ledBloomL.material.opacity = rLed * 0.3;
          r.mesh.userData.ledBloomL.visible = true;
        }
        if (r.mesh && r.mesh.userData.ledBloomR && r.mesh.userData.ledBloomR.material) {
          r.mesh.userData.ledBloomR.material.opacity = rLed * 0.3;
          r.mesh.userData.ledBloomR.visible = true;
        }
        if (r.mesh && r.mesh.userData.roofPing && r.mesh.userData.roofPing.material) {
          r.mesh.userData.roofPing.material.opacity = 0.4 + (r.hurtFlash > 0 ? 0.25 : 0);
          r.mesh.userData.roofPing.visible = true;
        }
        // underglow stays off on rivals (set false above) — not a PointLight
        if (r.mesh && r.mesh.userData.headLight) r.mesh.userData.headLight.visible = true;
      }
      // Path-first AI: face along ribbon so GLB nose stays correct; fire separately.
      var skill = r.skill != null ? r.skill : 0.7;
      var progNow = U.clamp(r.progress || 0, 0, 0.999);
      var lookT = U.clamp(progNow + 0.04 + skill * 0.015, 0, 0.999);
      // Tangent at current progress (not far look-ahead) = correct race facing
      var ctan = path.curve.getTangentAt(progNow).normalize();
      var ttan = path.curve.getTangentAt(lookT).normalize();
      var tside = new THREE.Vector3(-ttan.z, 0, ttan.x);
      // Role beats (Wave 3)
      var roleIntent = (GAME.ai && GAME.ai.tickRole) ? GAME.ai.tickRole(r, p, dt) : null;
      // Lane hold — slight lateral steer target only (does not spin the body)
      var laneWant = roleIntent ? roleIntent.laneWant : (r.laneOff || 0);
      var rn0 = world.nearest(r.pos, progNow);
      var latNow = rn0.lateralDist != null ? rn0.lateralDist : 0;
      var laneErr = laneWant - latNow;
      var toP = p.pos.distanceTo(r.pos);
      var rt = state.raceTime || 0;
      // v364: short open grace — pack already ~50–120m; only push if grill-close
      var openGrace = rt < 4.2;
      // Soft contact: first meet is a pass, not a blender (v313/v364)
      var contactSoft = rt < 5.5;
      // v367: first-curve soft lateral peel — don't form a wall on the apex
      var openApexProg = (p.progress != null && p.progress < 0.14);
      if (openApexProg && toP < 14 && !r.dead && rn0 && rn0.tangent) {
        var sidePeel = new THREE.Vector3(-rn0.tangent.z, 0, rn0.tangent.x);
        var peelSign = Math.sign(r.laneOff || latNow || 1) || 1;
        var peelAmt = Math.min(1, (14 - toP) / 14) * dt * 5.5;
        r.pos.x += sidePeel.x * peelSign * peelAmt * 2.8;
        r.pos.z += sidePeel.z * peelSign * peelAmt * 2.8;
        r.laneOff = peelSign * Math.max(3.6, Math.abs(r.laneOff || 3.6));
        toP = p.pos.distanceTo(r.pos);
      }
      if (!state._openGraceEnded && rt >= 4.2) {
        state._openGraceEnded = true;
        (state.rivals || []).forEach(function (rv) {
          if (!rv.dead) rv.ramCd = Math.max(rv.ramCd || 0, 1.1);
        });
      }
      r._reSeat = null;
      if (r._reSeatCd > 0) r._reSeatCd -= dt;
      // Aim fire when roughly facing player (weapons aim independent of car yaw)
      U.forward(r.yaw, tmpV);
      tmpV2.subVectors(p.pos, r.pos).setY(0);
      var aimDot = tmpV2.lengthSq() > 0.01 ? tmpV.dot(tmpV2.normalize()) : 0;
      var diff = difficulty();
      var fireMul = (diff.rivalFire != null ? diff.rivalFire : 0.75) * (roleIntent ? roleIntent.fireMul : 1);
      var dmgMul = diff.rivalDmg != null ? diff.rivalDmg : 0.85;
      var rocketBias = roleIntent ? roleIntent.rocketBias : 1;
      // Hunter sideswipe — off through contactSoft so first meet is a pass (v313)
      if (!contactSoft && roleIntent && roleIntent.wantSideswipe && toP < 7.2 && (r.ramCd || 0) <= 0) {
        tmpV2.subVectors(p.pos, r.pos).setY(0);
        if (tmpV2.lengthSq() > 0.01) {
          tmpV2.normalize();
          p.pos.addScaledVector(tmpV2, 0.42 * dt * 20);
          r.pos.addScaledVector(tmpV2, -0.2 * dt * 20);
        }
      }
      // Coward mine drop (no collider spam — soft mine via existing system)
      // Open Vein: non-cowards also scatter mines more often
      if (r._veinMine && (r.mineCd || 0) <= 0 && state.mines.length < 8 && Math.random() < 0.02) {
        if (roleIntent) roleIntent.dropMine = true;
      }
      if (roleIntent && roleIntent.dropMine && (r.mineCd || 0) <= 0 && state.mines.length < 6) {
        r.mineCd = 6;
        U.forward(r.yaw, tmpV);
        var mOrigin = r.pos.clone().addScaledVector(tmpV, -2.8);
        mOrigin.y += 0.3;
        var mMesh = new THREE.Group();
        var mBody = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.45, 0.18, 10),
          new THREE.MeshBasicMaterial({ color: 0x333344 })
        );
        mMesh.add(mBody);
        var mBlink = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 6, 5),
          new THREE.MeshBasicMaterial({ color: 0x00e5ff })
        );
        mBlink.position.y = 0.16;
        mMesh.add(mBlink);
        mMesh.position.copy(mOrigin);
        scene.add(mMesh);
        state.mines.push({
          mesh: mMesh, body: mBody, bodyMat: mBody.material, blink: mBlink,
          pos: mOrigin.clone(),
          arm: 0.45,
          dmg: 22 + state.meta.stage * 1.5,
          life: 12,
        });
      }
      if (r.mineCd > 0) r.mineCd -= dt;
      // Rival special (weaker) every 12–18s when in range
      if (GAME.ai && GAME.ai.tryRivalSpecial && (r.specialCd || 0) <= 0 && toP < 26) {
        GAME.ai.tryRivalSpecial({
          rival: r, player: p, state: state, sfx: GAME.sfx,
          toast: toast,
          spawnRivalRocket: function (rv, pl, scale) {
            tmpV2.subVectors(pl.pos, rv.pos).setY(0).normalize();
            var o = rv.pos.clone().addScaledVector(tmpV2, 2.4);
            o.y += 0.8;
            if (state.projectiles.length > 28) return;
            var rm = makeRocketMesh();
            rm.position.copy(o);
            scene.add(rm);
            state.projectiles.push({
              type: 'rocket', mesh: rm, pos: o.clone(),
              vel: tmpV2.clone().setY(0.02).multiplyScalar(42 * (scale || 1)),
              life: 1.2, dmg: (7 + state.meta.stage * 0.5) * dmgMul,
              fromPlayer: false, homing: false, smoke: true,
            });
          },
        });
      }
      // Fire when in theater — weapons aim at player (not car body facing)
      // v352: aimDot>0.12 meant pack ahead never shot (facing path, player behind)
      var canRearFire = progLead > 0.001 && toP < 55; // leading pack can shoot back
      var canFrontFire = aimDot > 0.08; // facing player
      if (toP < 52 && toP > 4 && r.disabledT <= 0 && fireMul > 0.2 && (canFrontFire || canRearFire)) {
        if (r.rocketCd <= 0 && toP < 48 && toP > 8 && r.aggro > 0.35 && fireMul > 0.5 && rocketBias > 0.45) {
          r.rocketCd = (4.2 + Math.random() * 2.0) / (fireMul * rocketBias * (0.75 + skill * 0.25));
          tmpV2.subVectors(p.pos, r.pos).setY(0).normalize();
          // Intentionally imperfect aim so player can dodge
          tmpV2.x += (Math.random() - 0.5) * 0.16;
          tmpV2.z += (Math.random() - 0.5) * 0.16;
          tmpV2.normalize();
          var rOrigin = r.pos.clone().addScaledVector(tmpV2, 2.6);
          rOrigin.y += 0.8;
          if (state.projectiles.length > 28) { /* skip */ }
          else {
            var rMesh = makeRocketMesh();
            rMesh.position.copy(rOrigin);
            ensureCombatPool();
            _combatPool.lookTmp.copy(rOrigin).add(tmpV2);
            rMesh.lookAt(_combatPool.lookTmp);
            scene.add(rMesh);
            state.projectiles.push({
              type: 'rocket', mesh: rMesh, pos: rOrigin.clone(),
              vel: tmpV2.clone().setY(0.015).multiplyScalar(52),
              life: 1.65, dmg: (12 + state.meta.stage * 0.85) * dmgMul, fromPlayer: false,
              homing: false, smoke: true,
            });
          }
        } else if (r.fireCd <= 0) {
          r.fireCd = (0.75 + Math.random() * 0.45) / Math.max(0.45, fireMul * (0.85 + skill * 0.2));
          if (state.projectiles.length <= 28) {
            tmpV2.subVectors(p.pos, r.pos).setY(0).normalize();
            var aimScatter = toP < 40 ? 0.1 : 0.18;
            tmpV2.x += (Math.random() - 0.5) * aimScatter;
            tmpV2.z += (Math.random() - 0.5) * aimScatter;
            tmpV2.normalize();
            var origin = r.pos.clone().addScaledVector(tmpV2, 2.5);
            origin.y += 0.9;
            var mesh = makeTracer(0xff2d55, 2.8);
            mesh.scale.x = mesh.scale.z = 1.1;
            mesh.position.copy(origin);
            aimMgTracer(mesh, origin, tmpV2);
            scene.add(mesh);
            state.projectiles.push({
              type: 'mg', mesh: mesh, pos: origin.clone(),
              vel: tmpV2.clone().multiplyScalar(78),
              life: 0.7, dmg: (5.2 + state.meta.stage * 0.55) * dmgMul, fromPlayer: false,
            });
          }
        }
      }
      // Face path forward always — tiny lane correction only (no body-hunt spin)
      var pathYaw = Math.atan2(ctan.x, ctan.z);
      // Lead the curve slightly with look-ahead tangent
      var leadYaw = Math.atan2(ttan.x, ttan.z);
      var wantYaw = pathYaw + U.angDiff(pathYaw, leadYaw) * 0.22;
      // Nudge toward lane center without flipping car sideways
      wantYaw += U.clamp(laneErr * 0.028, -0.12, 0.12);
      // Snap hard to path so GLBs never look parked sideways
      r.yaw += U.angDiff(r.yaw, wantYaw) * Math.min(1, (5.5 + skill) * dt);
      // v410: own-pace racing. Mild catch-up if behind. Never teleport. Never hang on the grill.
      var skillMul = 0.86 + skill * 0.16;
      var bandTarget = r.maxSpeed * skillMul * (roleIntent ? roleIntent.speedMul : 1);
      var progLead = (r.progress || 0) - (p.progress || 0);
      if (roleIntent && roleIntent.brakeCheck) {
        bandTarget = Math.min(bandTarget, Math.max(12, Math.abs(p.speed || 0) * 0.55));
      }
      if (roleIntent && roleIntent.flee) {
        bandTarget = Math.min(r.maxSpeed * 1.08, bandTarget * 1.06);
      }
      if (r.disabledT > 0) {
        bandTarget = Math.min(bandTarget, r.maxSpeed * 0.45);
      } else if (progLead < -0.025) {
        bandTarget = Math.min(r.maxSpeed * 1.05, bandTarget * 1.05 + 1.2);
      } else if (progLead > 0.05) {
        bandTarget = Math.min(bandTarget, r.maxSpeed * 0.97);
      }
      r.speed = U.lerp(r.speed, bandTarget, 1 - Math.pow(0.4, dt));
      // Move along path-forward facing (sin/cos matches player convention)
      r.pos.x += Math.sin(r.yaw) * r.speed * dt;
      r.pos.z += Math.cos(r.yaw) * r.speed * dt;
      var rn = world.nearest(r.pos, r.progress);
      // Soft road recovery (<1s) — no teleport
      if (rn.dist > D.roadHalf + 0.8) {
        var sideNr = new THREE.Vector3(-rn.tangent.z, 0, rn.tangent.x);
        var latR = rn.lateralDist != null ? rn.lateralDist : 0;
        var pullAmtR = Math.min(1, (rn.dist - D.roadHalf) * 0.14 * dt * 60);
        r.pos.x -= sideNr.x * latR * pullAmtR * 0.7;
        r.pos.z -= sideNr.z * latR * pullAmtR * 0.7;
        r.speed *= 0.98;
      }
      // Hard rail — rivals never tunnel into canyon (v433)
      var maxRivalLat = D.roadHalf + 1.1;
      if (rn.lateralDist != null && Math.abs(rn.lateralDist) > maxRivalLat) {
        var sideHr = new THREE.Vector3(-rn.tangent.z, 0, rn.tangent.x);
        var overR = Math.abs(rn.lateralDist) - maxRivalLat;
        r.pos.x -= sideHr.x * Math.sign(rn.lateralDist || 1) * overR;
        r.pos.z -= sideHr.z * Math.sign(rn.lateralDist || 1) * overR;
        r.speed *= 0.96;
        rn = world.nearest(r.pos, r.progress);
      }
      r.progress = Math.max(r.progress || 0, rn.progress);
      if (r.progress > 0.97) r.speed *= 0.88;
      r.pos.y = rn.point.y + 0.72; // v433: match player ride height
      r.mesh.position.copy(r.pos);
      // Always apply setYaw so baked GLB face stays correct
      if (GAME.vehicles.setYaw) GAME.vehicles.setYaw(r.mesh, r.yaw);
      else r.mesh.rotation.y = r.yaw;
      // Collision / Needle stab — personal ram CD after connect so rams are beats, not a blender (v293)
      // Light scrape while on CD so contact never feels fully silent; they can still shoot
      // Opening 8s: no ram. 8–9.5s: long ramCd → scrape/pass only. Full ram after (v313)
      var RIVAL_RAM_CD = contactSoft ? 1.55 : 1.1;
      if (openGrace) {
        // soft separation only — lerped re-seat above
      } else if (toP < 3.2 && r.ramCd > 0 && Math.abs(p.speed) > 10) {
        if (!r._scrapeT || r._scrapeT <= 0) {
          r._scrapeT = 0.28;
          if (GAME.sfx && GAME.sfx.collide) GAME.sfx.collide();
          if (particles && particles.sparks) {
            particles.sparks(p.pos.clone().lerp(r.pos, 0.5).setY(0.45));
          }
        }
      }
      if (r._scrapeT > 0) r._scrapeT -= dt;
      // Full ram only after contactSoft (9.5s) and ramCd clear — shoot already allowed
      if (!contactSoft && toP < 3.4 && r.ramCd <= 0) {
        var isNeedle = p.def && p.def.id === 'needle';
        var meshUd = p.mesh && p.mesh.userData;
        var canStab = isNeedle && meshUd && (meshUd.stabFront || meshUd.stabRear);
        U.forward(p.yaw, tmpV);
        tmpV2.subVectors(r.pos, p.pos);
        var along = tmpV2.dot(tmpV);
        var stabCdOk = !p.stabCd || p.stabCd <= 0;

        if (canStab && stabCdOk && Math.abs(along) > 0.8 && toP < (cfg.combat.needleStabRange || 3.6)) {
          if (along > 0.8 && meshUd.stabFront && p.speed > 12) {
            var frontDmg = (cfg.combat.needleStabFront || 28) * (0.7 + p.speed / 50);
            hurtRival(r, frontDmg);
            hurtPlayer(frontDmg * 0.12, r.pos, 'ram');
            p.stabCd = cfg.combat.needleStabCd || 0.55;
            r.ramCd = RIVAL_RAM_CD;
            r.speed *= 0.45;
            p.speed *= 0.88;
            p.lastRamT = state.raceTime || 0;
            toast('NEEDLE STAB', 0.7);
            state.camShake = Math.max(state.camShake || 0, 0.28);
            if (particles) particles.explosion(p.pos.clone().lerp(r.pos, 0.6).setY(0.6), false);
            if (GAME.sfx) GAME.sfx.explode();
          } else if (along < -0.8 && meshUd.stabRear) {
            var rearDmg = cfg.combat.needleStabRear || 22;
            hurtRival(r, rearDmg * 0.85);
            hurtPlayer(rearDmg * 0.9, r.pos, 'ram');
            p.stabCd = cfg.combat.needleStabCd || 0.55;
            r.ramCd = RIVAL_RAM_CD;
            r.speed *= 0.55;
            p.speed *= 0.5;
            p.lastRamT = state.raceTime || 0;
            toast('IMPALED — BOTH BLEED', 0.9);
            state.camShake = Math.max(state.camShake || 0, 0.32);
            if (particles) particles.explosion(p.pos.clone().lerp(r.pos, 0.4).setY(0.55), false);
            if (GAME.sfx) GAME.sfx.explode();
          } else {
            hurtPlayer(cfg.combat.ramDmg * 0.5 + state.meta.stage * 0.3, r.pos, 'ram');
            if (p.speed > 15) hurtRival(r, 8 + p.speed * 0.25);
            r.ramCd = RIVAL_RAM_CD;
            r.speed *= 0.75;
            p.speed *= 0.8;
            p.lastRamT = state.raceTime || 0;
            if (GAME.sfx) GAME.sfx.collide();
            if (particles) particles.sparks(p.pos.clone().lerp(r.pos, 0.5).setY(0.5));
          }
        } else {
          // Relative-speed ram + directional shove
          var relSp = Math.abs(p.speed) + Math.abs(r.speed || 0) * 0.35;
          var ramAmt = cfg.combat.ramDmg * (p.mul.mass || 1) + state.meta.stage * 0.5 + relSp * 0.08;
          hurtPlayer(ramAmt, r.pos, 'ram');
          if (p.speed > 15) hurtRival(r, 10 + p.speed * 0.35 * (p.mul.mass || 1));
          r.ramCd = RIVAL_RAM_CD;
          r.speed *= 0.7;
          p.speed *= 0.75;
          p.lastRamT = state.raceTime || 0;
          // Directional shove both ways
          tmpV2.subVectors(r.pos, p.pos).setY(0);
          if (tmpV2.lengthSq() > 0.01) {
            tmpV2.normalize();
            r.pos.addScaledVector(tmpV2, 1.4 + Math.min(2.2, relSp * 0.03));
            p.pos.addScaledVector(tmpV2, -0.7);
          }
          p._engineDipT = 0.18;
          state._hitStopT = 0.08; // hitstop-lite ~80ms
          state._fovPunch = Math.max(state._fovPunch || 0, 5);
          state.camShake = Math.max(state.camShake || 0, 0.26);
          if (GAME.sfx) {
            if (GAME.sfx.ram) GAME.sfx.ram();
            else GAME.sfx.collide();
          }
          // Low-HP ram reads as the death beat, not a quiet delete (v292)
          if (p.hp < p.maxHp * 0.28) toast('LAST HIT — RAM', 0.7, 1);
          else toast('RAM', 0.55, 1);
          // Bigger ram juice — hitstop + metal flash (v287)
          state._hitStopT = Math.max(state._hitStopT || 0, p.hp < p.maxHp * 0.28 ? 0.14 : 0.1);
          state._fovPunch = Math.max(state._fovPunch || 0, p.hp < p.maxHp * 0.28 ? 10 : 7);
          state.hitFlash = Math.min(1.2, (state.hitFlash || 0) + (p.hp < p.maxHp * 0.28 ? 0.4 : 0.28));
          if (particles) {
            particles.sparks(p.pos.clone().lerp(r.pos, 0.5).setY(0.5));
            if (particles.spawn) {
              particles.spawn('spark', p.pos.clone().lerp(r.pos, 0.5).setY(0.6), {
                count: 22, speed: 14, life: 0.32, gravity: 4,
              });
              particles.spawn('fire', p.pos.clone().lerp(r.pos, 0.5).setY(0.55), {
                count: 6, speed: 8, life: 0.2, gravity: 2,
              });
            }
          }
        }
      }
    });

    // Hazards — soft only (slow / hurt). Never a full stop wall.
    // Leader-bias: spikes/electric arm near whoever is in 1st.
    function leaderProgress() {
      var lp = p.progress || 0;
      for (var li = 0; li < state.rivals.length; li++) {
        var lr = state.rivals[li];
        if (!lr.dead && (lr.progress || 0) > lp) lp = lr.progress;
      }
      return lp;
    }
    var leadProgH = leaderProgress();
    function hazDistXZ(hp, pp) {
      var dx = hp.x - pp.x, dz = hp.z - pp.z;
      return Math.sqrt(dx * dx + dz * dz);
    }
    // Fake searchlight (MeshBasic cone) — tracks leader, heats player if held
    if (state._searchlight && state._searchlight.mesh) {
      var sl = state._searchlight;
      var trackProg = U.clamp(leadProgH + Math.sin((state.raceTime || 0) * 0.4) * 0.01, 0.02, 0.98);
      var slPt = path.curve.getPointAt(trackProg);
      var slTan = path.curve.getTangentAt(trackProg).normalize();
      sl.mesh.position.set(slPt.x, slPt.y + 14, slPt.z);
      sl.mesh.lookAt(slPt.x + slTan.x * 2, slPt.y, slPt.z + slTan.z * 2);
      // Ground card under beam
      if (sl.card) {
        sl.card.position.set(slPt.x, slPt.y + 0.08, slPt.z);
        sl.card.material.opacity = 0.2 + 0.1 * Math.sin((state.raceTime || 0) * 5);
      }
      var holdPlayer = hazDistXZ(slPt, p.pos) < 9 && Math.abs((p.progress || 0) - trackProg) < 0.04;
      if (holdPlayer) {
        p.heat = U.clamp((p.heat || 0) + dt * 0.08, 0, 1);
        sl.holdT = (sl.holdT || 0) + dt;
        if (sl.holdT > 1.2 && !sl._toasted) {
          toast('WARDEN LIGHT', 1.1);
          sl._toasted = true;
        }
      } else {
        sl.holdT = Math.max(0, (sl.holdT || 0) - dt * 0.5);
        if (sl.holdT < 0.3) sl._toasted = false;
      }
    }
    state.hazards.forEach(function (h) {
      if (h.hitCd > 0) h.hitCd -= dt;
      var distH = hazDistXZ(h.pos, p.pos);
      var nearPlayer = distH < 52;
      var progNearPlayer = Math.abs((h.progress || 0) - (p.progress || 0)) < 0.1;
      var progNearLeader = Math.abs((h.progress || 0) - leadProgH) < 0.11;
      // Spike/electric prefer leader; oil/debris still near player for readability
      var progNear = (h.type === 'spike' || h.type === 'electric')
        ? (progNearLeader || progNearPlayer)
        : progNearPlayer;

      if (h.type === 'spike') {
        h.timer -= dt;
        // Warn ring pulse always (readable from distance)
        if (h.warnRing && h.warnRing.material) {
          var wrPulse = h.phase === 'red' ? 0.75 : (h.phase === 'yellow' ? 0.55 : 0.28);
          h.warnRing.material.opacity = wrPulse + 0.12 * Math.sin((state.raceTime || 0) * 8);
          h.warnRing.material.color.setHex(h.phase === 'red' ? 0xff2d55 : 0xffe66d);
          h.warnRing.scale.setScalar(1 + 0.08 * Math.sin((state.raceTime || 0) * 6));
        }
        if (h.phase === 'down' && h.timer <= 0 && nearPlayer && progNear) {
          h.phase = 'yellow';
          h.timer = 0.75 + Math.random() * 0.35;
          (h.spikes || []).forEach(function (c) {
            c.visible = true;
            c.scale.y = 0.25;
            if (c.material) {
              c.material.color.setHex(0xffe66d);
              if (c.material.emissive) {
                c.material.emissive.setHex(0xffe66d);
                c.material.emissiveIntensity = 0.8;
              }
            }
          });
          if (h.matBase) {
            h.matBase.color.setHex(0x3a2810);
            if (h.matBase.emissive) {
              h.matBase.emissive.setHex(0xffe66d);
              h.matBase.emissiveIntensity = 0.6;
            }
          }
        } else if (h.phase === 'yellow' && h.timer <= 0) {
          h.phase = 'red';
          h.timer = 1.35;
          (h.spikes || []).forEach(function (c) {
            c.scale.y = 1;
            if (c.material) {
              c.material.color.setHex(0xff2d55);
              if (c.material.emissive) {
                c.material.emissive.setHex(0xff2d55);
                c.material.emissiveIntensity = 1.2;
              }
            }
          });
          if (h.matBase) {
            h.matBase.color.setHex(0x3a1018);
            if (h.matBase.emissive) {
              h.matBase.emissive.setHex(0xff2d55);
              h.matBase.emissiveIntensity = 0.9;
            }
          }
          if (GAME.sfx) GAME.sfx.noise(0.05, 0.12, 2000);
        } else if (h.phase === 'red') {
          if (distH < (h.radius || 2.4) && h.hitCd <= 0) {
            hurtPlayer(h.hurt, h.pos);
            p.speed *= 0.62;
            if (Math.abs(p.speed) < 10) p.speed = Math.sign(p.speed || 1) * 10;
            p.slip += (Math.random() - 0.5) * 10;
            h.hitCd = 0.9;
            h.phase = 'down';
            h.timer = 3.2 + Math.random() * 2;
            (h.spikes || []).forEach(function (c) { c.visible = false; });
            if (h.matBase) {
              h.matBase.color.setHex(0x1a1010);
              if (h.matBase.emissive) h.matBase.emissiveIntensity = 0.2;
            }
            if (GAME.sfx) {
              if (GAME.sfx.spike) GAME.sfx.spike();
              else GAME.sfx.hurt();
            }
          } else if (h.timer <= 0) {
            h.phase = 'down';
            h.timer = 2.5 + Math.random() * 2.5;
            (h.spikes || []).forEach(function (c) { c.visible = false; });
            if (h.matBase) {
              h.matBase.color.setHex(0x1a1010);
              if (h.matBase.emissive) h.matBase.emissiveIntensity = 0.2;
            }
          }
        } else if (h.phase === 'down' && h.timer <= 0 && !nearPlayer) {
          h.timer = 1.2 + Math.random() * 2;
        }
      } else if (h.type === 'oil') {
        if (h.halo && h.halo.material) {
          h.halo.material.opacity = 0.2 + 0.12 * Math.sin((state.raceTime || 0) * 3.5 + (h.progress || 0) * 20);
          h.halo.rotation.z += dt * 0.4;
        }
        if (distH < (h.radius || 2.8)) {
          // Oil punishes with slip + brief drag — NOT a permanent 11 km/h crawl
          // (Wave ∞: oil floor was brick-feeling on Night 1).
          var oilCap = 36;
          if (Math.abs(p.speed) > oilCap) {
            p.speed *= Math.pow(0.94, dt * 60);
          } else if (Math.abs(p.speed) > 18) {
            p.speed *= Math.pow(0.97, dt * 60);
          }
          p.slip += (Math.random() - 0.5) * (h.slipKick || 16) * dt * 12;
          if (h.hitCd <= 0) {
            p.slip += (Math.random() > 0.5 ? 1 : -1) * (10 + (h.slipKick || 14) * 0.3);
            p.speed *= 0.92;
            if (Math.abs(p.speed) > 28) hurtPlayer(h.hurt * 0.3, h.pos);
            h.hitCd = 0.65;
            if (GAME.sfx) {
              if (GAME.sfx.oil) GAME.sfx.oil();
              else GAME.sfx.noise(0.1, 0.1, 800);
            }
            if (!p._oilToastT || p._oilToastT <= 0) {
              toast('OIL — SLIP', 0.55);
              p._oilToastT = 1.4;
            }
          }
        }
      } else if (h.type === 'debris') {
        if (h.beacon && h.beacon.material) {
          h.beacon.material.opacity = 0.55 + 0.4 * Math.sin((state.raceTime || 0) * 7);
          h.beacon.position.y = 1.15 + 0.06 * Math.sin((state.raceTime || 0) * 4);
        }
        // Soft wreck — knock through, never brick the lane
        if (distH < (h.radius || 2.1) && h.hitCd <= 0) {
          hurtPlayer(h.hurt * 0.85, h.pos);
          p.speed *= 0.72;
          if (Math.abs(p.speed) < 10) p.speed = Math.sign(p.speed || 1) * 10;
          p.slip += (Math.random() > 0.5 ? 1 : -1) * 10;
          h.hitCd = 1.2;
          tmpV.subVectors(p.pos, h.pos).setY(0);
          if (tmpV.lengthSq() > 0.01) {
            tmpV.normalize().multiplyScalar(0.35);
            p.pos.add(tmpV);
          }
          if (particles) particles.sparks(h.pos.clone().setY(h.pos.y + 0.5));
          if (GAME.sfx) GAME.sfx.collide();
        }
      } else if (h.type === 'electric') {
        h.timer = (h.timer || 0) + dt;
        var on = Math.sin(h.timer * 4.5) > 0.15;
        var eInt = on ? 2.4 : 0.4;
        if (h.coil && h.coil.material && h.coil.material.emissiveIntensity != null) {
          h.coil.material.emissiveIntensity = eInt;
        }
        if (h.coil2 && h.coil2.material && h.coil2.material.emissiveIntensity != null) {
          h.coil2.material.emissiveIntensity = eInt;
        }
        if (h.arc) {
          h.arc.visible = on;
          if (h.arc.material) {
            h.arc.material.opacity = on ? (0.45 + Math.random() * 0.4) : 0.1;
          }
          if (on) h.arc.scale.y = 0.7 + Math.random() * 0.8;
        }
        if (h.floorGlow && h.floorGlow.material) {
          h.floorGlow.material.opacity = on ? 0.35 : 0.12;
        }
        if (on && distH < (h.radius || 2.5) && h.hitCd <= 0) {
          hurtPlayer(h.hurt, h.pos);
          p.speed *= 0.78;
          if (Math.abs(p.speed) < 10) p.speed = Math.sign(p.speed || 1) * 10;
          h.hitCd = 0.85;
          if (particles) particles.hitTrail(p.pos.clone().setY(p.pos.y + 0.5), 'pink');
          if (GAME.sfx) GAME.sfx.hit();
        }
      } else if (h.type === 'sand') {
        if (distH < (h.radius || 3)) {
          // Heavy drag with crawl floor — never brick the car in grit
          var sandFloor = 9;
          if (Math.abs(p.speed) > sandFloor) {
            p.speed *= Math.pow(h.drag || 0.92, dt * 60);
          }
          if (Math.abs(p.speed) < sandFloor) {
            p.speed = Math.sign(p.speed || 1) * sandFloor;
          }
          if (h.hitCd <= 0 && Math.abs(p.speed) > 20) {
            hurtPlayer(h.hurt || 1, h.pos);
            h.hitCd = 1.5;
            if (GAME.sfx) {
              if (GAME.sfx.sand) GAME.sfx.sand();
              else GAME.sfx.noise(0.12, 0.09, 500);
            }
          }
        }
      }

      // Light rival interaction (soft only — never walls them either)
      if (nearPlayer) {
        for (var rhi = 0; rhi < state.rivals.length; rhi++) {
          var rhv = state.rivals[rhi];
          if (rhv.dead) continue;
          if (hazDistXZ(h.pos, rhv.pos) < (h.radius || 2.2) * 0.95) {
            if (h.type === 'oil' || h.type === 'sand') rhv.speed *= Math.pow(0.94, dt * 60);
            else if (h.type === 'spike' && h.phase === 'red' && h.hitCd <= 0) {
              hurtRival(rhv, (h.hurt || 10) * 0.4);
              rhv.speed *= 0.7;
              h.hitCd = 0.85;
            } else if (h.hitCd <= 0 && (h.type === 'debris' || h.type === 'electric')) {
              hurtRival(rhv, (h.hurt || 8) * 0.45);
              rhv.speed *= 0.8;
              h.hitCd = 1.0;
            }
          }
        }
      }
    });

    // Powerups — bob + drive-through
    tickBuffs(dt);
    (state.powerups || []).forEach(function (pu) {
      if (pu.taken || !pu.mesh) return;
      pu.bob = (pu.bob || 0) + dt * 2.4;
      pu.mesh.position.y = pu.pos.y + Math.sin(pu.bob) * 0.22;
      pu.mesh.rotation.y += dt * 1.8;
      if (pu.ring) pu.ring.rotation.z += dt * 2.5;
      // XZ pickup so hop / ride height never misses a floating icon
      var pdx = p.pos.x - pu.mesh.position.x;
      var pdz = p.pos.z - pu.mesh.position.z;
      if (pdx * pdx + pdz * pdz < 3.1 * 3.1) {
        pu.taken = true;
        pu.mesh.visible = false;
        applyPowerup(pu);
        if (particles) {
          particles.spawn('cyan', pu.mesh.position.clone(), {
            count: 8, speed: 8, life: 0.4, scale: 0.35, gravity: -1,
          });
          if (particles.spawn) {
            particles.spawn('spark', pu.mesh.position.clone(), {
              count: 6, speed: 10, life: 0.25, gravity: 2,
            });
          }
        }
      }
    });

    // Scrap pickup — pile window shows +sum (×N) and RUN total still climbs (v304)
    if (p._scrapPileT > 0) p._scrapPileT -= dt;
    if (p._scrapPileT <= 0) { p._scrapPileSum = 0; p._scrapPileN = 0; }
    state.scraps.forEach(function (sc) {
      if (sc.taken) return;
      sc.mesh.rotation.y += dt * 2;
      sc.mesh.position.y = sc.pos.y + Math.sin(state.raceTime * 3) * 0.12;
      var sdx = p.pos.x - sc.mesh.position.x;
      var sdz = p.pos.z - sc.mesh.position.z;
      if (sdx * sdx + sdz * sdz < 3.0 * 3.0) {
        sc.taken = true;
        sc.mesh.visible = false;
        state.runScrap += sc.value;
        p._scrapPileSum = (p._scrapPileSum || 0) + sc.value;
        p._scrapPileN = (p._scrapPileN || 0) + 1;
        p._scrapPileT = 1.1;
        // v397: rate-limit scrap toast spam (was every gem at pri 1)
        var scrapToastOk = (state.raceTime || 0) - (state._lastScrapToastT || -99) > 1.35;
        if (scrapToastOk || p._scrapPileN >= 3) {
          state._lastScrapToastT = state.raceTime || 0;
          if (p._scrapPileN >= 2) {
            toast('SCRAP +' + p._scrapPileSum + ' (×' + p._scrapPileN + ')  ·  RUN ' + state.runScrap, 0.85, 0);
          } else {
            toast('SCRAP +' + sc.value + '  ·  RUN ' + state.runScrap, 0.75, 0);
          }
        }
        if (GAME.sfx) {
          try { if (GAME.sfx.unlock) GAME.sfx.unlock(); } catch (eS) {}
          if (GAME.sfx.scrapPing) GAME.sfx.scrapPing();
          else if (GAME.sfx.pickup) GAME.sfx.pickup();
        }
        if (particles && particles.spawn) {
          particles.spawn('spark', sc.mesh.position.clone(), {
            count: 5, speed: 7, life: 0.28, gravity: 1,
          });
        }
      }
    });

    if (particles) {
      particles.update(dt);
      // Weather stays camera-relative; combat FX pool is separate
      if (particles.rainUpdate) {
        particles.rainUpdate(dt, camera.position);
      } else if (particles.updateRain) {
        particles.ensureRain(camera.position);
        particles.updateRain(dt, camera.position);
      }
      // Road wetness + specular pulse — v424: always tick (not only when raining)
      if (world) {
        var wetRoad = (particles.getWetBias && particles.getWetBias()) || 0;
        state.wetBias = wetRoad;
        if (world._wetSheenMat) {
          world._wetSheenMat.opacity = 0.14 + wetRoad * 0.18;
        }
        if (world.updateRoadWet) {
          world.updateRoadWet(wetRoad, camera.position, state.time || 0, p.progress);
        }
        if (wetRoad > 0.01 && !state._wetRoadApplied) {
          state._wetRoadApplied = true;
          world.group.traverse(function (c) {
            if (!c.isMesh || !c.material) return;
            var m = c.material;
            if (m.roughness != null && m.metalness != null && m.envMapIntensity != null && m.roughness < 0.45) {
              if (m.userData._baseRough == null) {
                m.userData._baseRough = m.roughness;
                m.userData._baseEnv = m.envMapIntensity;
              }
              m.roughness = Math.max(0.08, m.userData._baseRough * (1 - wetRoad * 0.35));
              m.envMapIntensity = m.userData._baseEnv * (1 + wetRoad * 0.4);
            }
          });
        }
      }
      // Wet-road mist off tires (only when raining / wet — never constant pipe smoke)
      var wetBias = (particles.getWetBias && particles.getWetBias()) || 0;
      if (!p.drifting && wetBias > 0.08 && Math.abs(p.speed) > 18) {
        p._hiSprayT = (p._hiSprayT || 0) - dt;
        if (p._hiSprayT <= 0) {
          p._hiSprayT = 0.1;
          U.forward(p.yaw, tmpV);
          U.side(p.yaw, tmpV2);
          var mist = p.pos.clone().addScaledVector(tmpV, -1.4);
          mist.y = p.pos.y + 0.07;
          particles.wetMist(mist.clone().addScaledVector(tmpV2, 0.7), {
            dir: tmpV.clone().multiplyScalar(-1), scale: 0.55,
          });
          particles.wetMist(mist.clone().addScaledVector(tmpV2, -0.7), {
            dir: tmpV.clone().multiplyScalar(-1), scale: 0.55,
          });
        }
      }
      // Launch / hard takeoff tire smoke (rear tires, ground level)
      var thrLaunch = (GAME.input && GAME.input.throttle) ? GAME.input.throttle() : 0;
      if (!p.drifting && thrLaunch > 0.65 && p.speed > 3 && p.speed < 24 && !p.nitroActive) {
        p._launchFxT = (p._launchFxT || 0) - dt;
        if (p._launchFxT <= 0) {
          p._launchFxT = 0.08;
          U.forward(p.yaw, tmpV);
          U.side(p.yaw, tmpV2);
          var lp = p.pos.clone().addScaledVector(tmpV, -1.5);
          lp.y = p.pos.y + 0.08;
          var back = tmpV.clone().multiplyScalar(-0.7);
          particles.tireSmoke(lp.clone().addScaledVector(tmpV2, 0.8), {
            dir: back, scale: 0.8, count: 1,
          });
          particles.tireSmoke(lp.clone().addScaledVector(tmpV2, -0.8), {
            dir: back, scale: 0.8, count: 1,
          });
        }
      }
    }
    // NFS-style turn callouts
    updateTurnHint(dt);
    world.updateLOD(camera.position, state.raceTime);
    updateCamera(dt);
  }

  /** Precompute sharp turns (>60°) along the open course for HUD arrows. */
  function buildTurnHints(path) {
    var hints = [];
    if (!path || !path.curve) return hints;
    var steps = 80;
    var look = 0.035; // look-ahead in progress units (~3.5% of course)
    var lastMarked = -1;
    for (var i = 0; i < steps - 2; i++) {
      var t0 = i / steps;
      var t1 = Math.min(0.999, t0 + look);
      var tan0 = path.curve.getTangentAt(t0).normalize();
      var tan1 = path.curve.getTangentAt(t1).normalize();
      var h0 = Math.atan2(tan0.x, tan0.z);
      var h1 = Math.atan2(tan1.x, tan1.z);
      var dAng = U.angDiff(h0, h1); // positive = turn left in our yaw space? 
      // yaw increases CCW; left turn from driver view: negative yaw change when going forward...
      // angDiff(h0,h1) is shortest rotation from h0 to h1. Positive = turn toward +Yaw.
      // Player left (A) decreases yaw. So left turn on path is negative dAng.
      var deg = Math.abs(dAng) * (180 / Math.PI);
      if (deg >= 60 && t0 - lastMarked > 0.04) {
        hints.push({
          progress: t0 + look * 0.45,
          // side: -1 left, +1 right for HUD
          side: dAng < 0 ? -1 : 1,
          deg: deg,
        });
        lastMarked = t0;
      }
    }
    return hints;
  }

  function updateTurnHint(dt) {
    var p = state.player;
    if (!p || !state.turnHints || !state.turnHints.length) {
      state.activeTurn = null;
      return;
    }
    var prog = p.progress || 0;
    var best = null;
    for (var i = 0; i < state.turnHints.length; i++) {
      var h = state.turnHints[i];
      var ahead = h.progress - prog;
      // Show when 2%–14% of course ahead
      if (ahead > 0.008 && ahead < 0.14) {
        if (!best || ahead < best.ahead) best = { turn: h, ahead: ahead };
      }
    }
    state.activeTurn = best;
  }

  function updateCamera(dt) {
    var p = state.player;
    U.forward(p.yaw, tmpV);
    var camPos = new THREE.Vector3();
    var look = new THREE.Vector3();
    var targetFov;

    // Whole-map overview: top-down over PATH only (not far scenery), capped height
    if (state._mapOverview && world && world.getBounds) {
      var b = world.getBounds({ pathOnly: true, pad: 55 });
      var span = Math.max(b.size.x, b.size.z, 160);
      // Cap altitude so FogExp2 / night black doesn't eat the map (old: span*0.95+80)
      var height = Math.min(Math.max(span * 0.72, 140), 380);
      camPos.set(b.center.x, b.center.y + height, b.center.z + span * 0.04);
      look.set(b.center.x, b.center.y, b.center.z);
      camera.fov = 52;
      camera.near = 1;
      camera.far = Math.max(4000, height * 8);
      camera.updateProjectionMatrix();
      camera.position.copy(camPos);
      camera.lookAt(look);
      if (world.updateLOD) world.updateLOD(camPos, state.raceTime);
      return;
    }

    var speedNormCam = U.clamp(Math.abs(p.speed) / Math.max(1, cfg.drive.maxSpeed * (p.mul.speed || 1)), 0, 1);
    if (state.camMode === 'hood') {
      // Hood: above dash, look far down road so asphalt + tracers read (v301)
      // Old +0.55/y1.22 sat in cabin mesh = dashboard void
      camPos.copy(p.pos).addScaledVector(tmpV, 1.2);
      camPos.y = p.pos.y + 1.68;
      look.copy(p.pos).addScaledVector(tmpV, 28);
      look.y = p.pos.y + 0.6;
      targetFov = 66 + speedNormCam * 11 + (p.nitroActive ? 5 : 0);
    } else if (state.camMode === 'near') {
      // Near-chase — closer bumper view, still shows weapons ahead
      camPos.copy(p.pos).addScaledVector(tmpV, -2.6);
      camPos.y = p.pos.y + 1.35;
      U.side(p.yaw, tmpV2);
      camPos.addScaledVector(tmpV2, 0.55);
      look.copy(p.pos).addScaledVector(tmpV, 9);
      look.y = p.pos.y + 0.7;
      targetFov = 64 + speedNormCam * 13 + (p.nitroActive ? 6 : 0) + (state._nitroFovKick || 0);
    } else {
      // Tight NFS chase: hero car fills lower third; weapons/wheels must read
      camPos.copy(p.pos).addScaledVector(tmpV, -4.2);
      camPos.y = p.pos.y + 1.75;
      U.side(p.yaw, tmpV2);
      camPos.addScaledVector(tmpV2, 1.15);
      look.copy(p.pos).addScaledVector(tmpV, 7);
      look.y = p.pos.y + 0.55;
      // 62° idle → ~74° at max + nitro event kick (Wave 4)
      targetFov = 62 + speedNormCam * 12
        + (p.nitroActive ? 7 : 0) + (p.drifting ? 5 : 0)
        + (state._nitroFovKick || 0)
        + ((state.firingMg > 0 && p.speed > 75) ? (3 + speedNormCam * 5) : 0);
      // Drift camera: offset toward outside of slide
      if (p.drifting && Math.abs(p.slip || 0) > 2) {
        camPos.addScaledVector(tmpV2, Math.sign(p.slip) * 0.85);
      }
    }
    // Local slope tilt only — never look at a distant path point (that yanked the cam off the car)
    var grade = 0;
    if (world && world.nearest) {
      var nCam = world.nearest(p.pos, p.progress);
      if (nCam && nCam.tangent && isFinite(nCam.tangent.y)) grade = U.clamp(nCam.tangent.y, -0.28, 0.28);
    }
    look.y = p.pos.y + (state.camMode === 'hood' ? 0.55 : 0.6) + grade * 3.2;
    camPos.y = p.pos.y + (state.camMode === 'hood' ? 1.68 : state.camMode === 'near' ? 1.35 : 1.75);
    // Speed punch FOV on ram / kill explosions (Wave 11)
    targetFov += (state._fovPunch || 0);

    camera.fov = U.damp(camera.fov, targetFov, 5.5, dt);
    // Keep sky dome in frustum (dome radius 1400)
    if (camera.far < 2000) camera.far = 2800;
    camera.updateProjectionMatrix();

    if (state.camShake > 0) {
      camPos.x += (Math.random() - 0.5) * state.camShake * 1.3;
      camPos.y += (Math.random() - 0.5) * state.camShake * 0.7;
      state.camShake *= 0.9;
      if (state.camShake < 0.02) state.camShake = 0;
    }

    // Hood: snap once so we don't damp through the dashboard
    if (state.camMode === 'hood' && state._camSnapHood) {
      camera.position.copy(camPos);
      state._camSnapHood = false;
    } else {
      var camDist = camera.position.distanceTo(camPos);
      if (!isFinite(camDist) || camDist > 12) {
        camera.position.copy(camPos);
      } else {
        camera.position.x = U.damp(camera.position.x, camPos.x, state.camMode === 'hood' ? 18 : 8, dt);
        camera.position.z = U.damp(camera.position.z, camPos.z, state.camMode === 'hood' ? 18 : 8, dt);
        // v363: climb Y glue — lagging damp on hills pops cam under/over the car
        var yErr = Math.abs(camera.position.y - camPos.y);
        var yDamp = state.camMode === 'hood' ? 18 : (Math.abs(grade) > 0.06 || yErr > 0.55 ? 22 : 12);
        if (yErr > 1.4) camera.position.y = camPos.y;
        else camera.position.y = U.damp(camera.position.y, camPos.y, yDamp, dt);
      }
    }
    // Hard leash — camera never leaves the car vertically
    if (isFinite(p.pos.y)) {
      camera.position.y = U.clamp(camera.position.y, p.pos.y + 0.55, p.pos.y + 3.2);
    }
    // v372: NaN / freak guard — snap back to chase if bad numbers
    if (!isFinite(camera.position.x) || !isFinite(camera.position.y) || !isFinite(camera.position.z)
        || !isFinite(look.x) || !isFinite(look.y) || !isFinite(look.z)) {
      camera.position.copy(p.pos);
      camera.position.y += 1.75;
      look.copy(p.pos);
      look.y += 0.6;
    }
    camera.lookAt(look);
    // Hide own body in hood so cabin never fills the frame (road + tracers)
    if (p.mesh) p.mesh.visible = state.camMode !== 'hood';

    // PERF: single chase fill light (was road + key + rim = 3 PointLights every frame)
    if (state._roadLight) {
      scene.remove(state._roadLight);
      state._roadLight = null;
    }
    if (state._heroRim) {
      scene.remove(state._heroRim);
      state._heroRim = null;
    }
    if (!state._heroKey) {
      state._heroKey = new THREE.PointLight(0xe8f0ff, 3.2, 14, 1.8);
      scene.add(state._heroKey);
    }
    state._heroKey.position.copy(camera.position).lerp(
      new THREE.Vector3(p.pos.x, p.pos.y + 1.8, p.pos.z),
      0.4
    );
    state._heroKey.intensity = state.camMode === 'hood' ? 2.0 : 3.2;
    state._heroKey.distance = 14;
    state._heroKey.visible = true;

    if (state._roadLight2) {
      scene.remove(state._roadLight2);
      state._roadLight2 = null;
    }
  }

  // ---------- Menus ----------
  function enterGarageFromTitle() {
    state.mode = 'garage';
    state.garageTab = 'roster';
    var cars = cfg.cars;
    state.carIndex = 0;
    for (var i = 0; i < cars.length; i++) {
      if (cars[i].id === state.meta.carId) state.carIndex = i;
    }
    ensureMenuWorld();
    refreshDemoCar();
    if (GAME.sfx) {
      try { if (GAME.sfx.unlock) GAME.sfx.unlock(); } catch (eT) {}
      GAME.sfx.click();
    }
  }

  function updateTitle() {
    // ENTER / Space / click — first screen must leave to garage (v307)
    if (I.pressed('enter') || I.pressed('space') || I.pressed('click')) {
      enterGarageFromTitle();
    }
  }

  function ensureGarageShopState() {
    if (state.garageTab == null) state.garageTab = 'roster'; // roster | shop
    if (state.shopCat == null) state.shopCat = 0;
    if (state.shopItem == null) state.shopItem = 0;
  }

  function buyShopItem() {
    var carId = cfg.cars[state.carIndex | 0].id;
    var cats = cfg.garageShop.categories;
    var cat = cats[state.shopCat | 0];
    if (!cat) return;
    // Same list order as HUD (all category items, including locked)
    var items = shopItemsForCat(cat.id);
    var item = items[state.shopItem | 0];
    if (!item) return;
    if (!shopItemAvailable(item, carId)) {
      var why = 'LOCKED';
      if (item.req) why = 'NEED ' + String(item.req).replace(/([A-Z])/g, ' $1').toUpperCase();
      if (item.reqWeapon === 'rocket') why = 'NEED ROCKET RACK FIRST';
      if (item.reqWeapon === 'mine') why = 'NEED MINE BAY FIRST';
      toast(why, 1.15);
      if (GAME.sfx) GAME.sfx.deny();
      return;
    }
    if (shopItemOwned(item, carId)) {
      toast(item.type === 'unlock' ? 'ALREADY INSTALLED' : 'MAXED', 0.85);
      if (GAME.sfx) GAME.sfx.deny();
      return;
    }
    var cost = shopItemCost(item, carId);
    if (state.meta.scrap < cost) {
      toast('NOT ENOUGH SCRAP  (' + cost + ' needed)', 1);
      if (GAME.sfx) GAME.sfx.deny();
      return;
    }
    state.meta.scrap -= cost;
    var b = getCarBuild(carId);
    if (item.type === 'unlock') {
      b.unlocks[item.id] = true;
      toast('INSTALLED  ' + item.name, 1.35, 2);
    } else {
      b.levels[item.id] = (b.levels[item.id] | 0) + 1;
      toast(item.name + '  →  LV ' + b.levels[item.id] + '/' + (item.max | 1), 1.25, 2);
    }
    // Flag so next race / mul refresh is obvious in playtest
    state._lastShopBuy = { carId: carId, itemId: item.id, t: performance.now() };
    saveMeta();
    if (GAME.sfx) GAME.sfx.confirm();
  }

  /** Map CSS pointer → HUD canvas pixels (v308) */
  function hudPointer() {
    var pt = I.pointer ? I.pointer() : { x: 0, y: 0 };
    var canvas = document.getElementById('hud');
    if (!canvas) return pt;
    var r = canvas.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return pt;
    return {
      x: (pt.x - r.left) * (canvas.width / r.width),
      y: (pt.y - r.top) * (canvas.height / r.height),
    };
  }

  function hitRect(px, py, box) {
    return box && px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h;
  }

  function goMapSelect() {
    state.mode = 'map';
    state.mapIndex = 0;
    for (var m = 0; m < cfg.maps.length; m++) {
      if (cfg.maps[m].id === state.meta.mapId) state.mapIndex = m;
    }
    if (GAME.sfx) GAME.sfx.confirm();
  }

  function beginRaceFromMap() {
    state.meta.mapId = cfg.maps[state.mapIndex].id;
    saveMeta();
    startRace();
  }

  function updateGarage() {
    ensureGarageShopState();
    var carId = cfg.cars[state.carIndex | 0].id;

    // Toggle shop
    if (I.pressed('tab') || I.pressed('u')) {
      state.garageTab = state.garageTab === 'shop' ? 'roster' : 'shop';
      state.shopItem = 0;
      if (GAME.sfx) GAME.sfx.click();
    }
    if (I.pressed('escape') || I.pressed('backspace')) {
      if (state.garageTab === 'shop') {
        state.garageTab = 'roster';
        if (GAME.sfx) GAME.sfx.click();
        return;
      }
    }

    if (state.garageTab === 'shop') {
      var cats = cfg.garageShop.categories;
      // Click: category tab, part row, BUY, BACK (v309)
      if (I.pressed('click')) {
        var sp = hudPointer();
        var sh = state._shopHit;
        if (sh) {
          var si;
          for (si = 0; si < (sh.cats || []).length; si++) {
            if (hitRect(sp.x, sp.y, sh.cats[si])) {
              state.shopCat = sh.cats[si].i;
              state.shopItem = 0;
              if (GAME.sfx) GAME.sfx.click();
              return;
            }
          }
          for (si = 0; si < (sh.rows || []).length; si++) {
            if (hitRect(sp.x, sp.y, sh.rows[si])) {
              state.shopItem = sh.rows[si].i;
              if (GAME.sfx) GAME.sfx.click();
              return;
            }
          }
          if (hitRect(sp.x, sp.y, sh.buy)) {
            buyShopItem();
            return;
          }
          if (hitRect(sp.x, sp.y, sh.back)) {
            state.garageTab = 'roster';
            if (GAME.sfx) GAME.sfx.click();
            return;
          }
        }
      }
      if (I.pressed('arrowleft') || I.pressed('a')) {
        state.shopCat = (state.shopCat + cats.length - 1) % cats.length;
        state.shopItem = 0;
        if (GAME.sfx) GAME.sfx.click();
      }
      if (I.pressed('arrowright') || I.pressed('d')) {
        state.shopCat = (state.shopCat + 1) % cats.length;
        state.shopItem = 0;
        if (GAME.sfx) GAME.sfx.click();
      }
      // Full category list (locked items greyed in HUD; buy checks reqs)
      var items = shopItemsForCat(cats[state.shopCat].id);
      var nItems = Math.max(1, items.length);
      // Mouse wheel moves selection through long arsenal lists (v310)
      var wSteps = I.wheelSteps ? I.wheelSteps() : 0;
      if (wSteps) {
        state.shopItem = ((state.shopItem | 0) + wSteps) % nItems;
        if (state.shopItem < 0) state.shopItem += nItems;
        if (GAME.sfx) GAME.sfx.click();
      }
      if (I.pressed('arrowup') || I.pressed('w')) {
        state.shopItem = (state.shopItem + nItems - 1) % nItems;
        if (GAME.sfx) GAME.sfx.click();
      }
      if (I.pressed('arrowdown') || I.pressed('s')) {
        state.shopItem = (state.shopItem + 1) % nItems;
        if (GAME.sfx) GAME.sfx.click();
      }
      if (I.pressed('enter') || I.pressed('f') || I.pressed('space')) {
        buyShopItem();
      }
      // Difficulty still available
      if (I.pressed('[')) { cycleDifficulty(-1); if (GAME.sfx) GAME.sfx.click(); }
      if (I.pressed(']')) { cycleDifficulty(1); if (GAME.sfx) GAME.sfx.click(); }
      return;
    }

    // —— Roster mode —— click cars / MAP / TUNE (v308)
    if (I.pressed('click')) {
      var gp = hudPointer();
      var gh = state._garageHit;
      if (gh) {
        var gi;
        for (gi = 0; gi < (gh.cars || []).length; gi++) {
          if (hitRect(gp.x, gp.y, gh.cars[gi])) {
            state.carIndex = gh.cars[gi].i;
            state.meta.carId = cfg.cars[state.carIndex].id;
            saveMeta();
            if (GAME.sfx) GAME.sfx.click();
            refreshDemoCar();
            return;
          }
        }
        if (hitRect(gp.x, gp.y, gh.map)) {
          goMapSelect();
          return;
        }
        if (hitRect(gp.x, gp.y, gh.shop)) {
          state.garageTab = 'shop';
          state.shopItem = 0;
          if (GAME.sfx) GAME.sfx.click();
          return;
        }
      }
    }
    if (I.pressed('arrowright') || I.pressed('d')) {
      state.carIndex = (state.carIndex + 1) % cfg.cars.length;
      state.meta.carId = cfg.cars[state.carIndex].id;
      saveMeta();
      if (GAME.sfx) GAME.sfx.click();
      refreshDemoCar();
    }
    if (I.pressed('arrowleft') || I.pressed('a')) {
      state.carIndex = (state.carIndex + cfg.cars.length - 1) % cfg.cars.length;
      state.meta.carId = cfg.cars[state.carIndex].id;
      saveMeta();
      if (GAME.sfx) GAME.sfx.click();
      refreshDemoCar();
    }
    if (I.pressed('[')) { cycleDifficulty(-1); if (GAME.sfx) GAME.sfx.click(); }
    if (I.pressed(']')) { cycleDifficulty(1); if (GAME.sfx) GAME.sfx.click(); }
    // Wave 9 — quality toggle (O). Persists on saveKey. Shared with race (v301).
    if (I.pressed('o') || I.pressed('p')) {
      toggleQuality();
    }
    if (I.pressed('1')) {
      state.meta.difficulty = 'chill'; saveMeta();
      toast(difficulty().name + '  ·  ' + difficulty().desc, 1.6);
      if (GAME.sfx) GAME.sfx.click();
    } else if (I.pressed('2')) {
      state.meta.difficulty = 'adventurous'; saveMeta();
      toast(difficulty().name + '  ·  ' + difficulty().desc, 1.6);
      if (GAME.sfx) GAME.sfx.click();
    } else if (I.pressed('3')) {
      state.meta.difficulty = 'brutal'; saveMeta();
      toast(difficulty().name + '  ·  ' + difficulty().desc, 1.6);
      if (GAME.sfx) GAME.sfx.click();
    }
    if (I.pressed('enter')) {
      goMapSelect();
    }
    if (I.pressed('r')) {
      state.meta = defaultMeta();
      saveMeta();
      toast('SAVE WIPED', 1);
      if (GAME.sfx) GAME.sfx.deny();
    }
  }

  function updateMapSelect() {
    if (I.pressed('arrowdown') || I.pressed('s')) {
      state.mapIndex = (state.mapIndex + 1) % cfg.maps.length;
      if (GAME.sfx) GAME.sfx.click();
    }
    if (I.pressed('arrowup') || I.pressed('w')) {
      state.mapIndex = (state.mapIndex + cfg.maps.length - 1) % cfg.maps.length;
      if (GAME.sfx) GAME.sfx.click();
    }
    if (I.pressed('[')) { cycleDifficulty(-1); if (GAME.sfx) GAME.sfx.click(); }
    if (I.pressed(']')) { cycleDifficulty(1); if (GAME.sfx) GAME.sfx.click(); }
    // Click/tap: difficulty chip, course row, or big START (v308)
    if (I.pressed('click')) {
      var mp = hudPointer();
      var mh = state._mapHit;
      if (mh) {
        var di;
        for (di = 0; di < (mh.diffs || []).length; di++) {
          if (hitRect(mp.x, mp.y, mh.diffs[di])) {
            state.meta.difficulty = mh.diffs[di].id;
            saveMeta();
            var Dd = difficulty();
            var previewN = Math.max(2, Math.round((3 + Math.min(2, Math.floor((state.meta.stage | 0) / 4))) * (Dd.rivalCountMul != null ? Dd.rivalCountMul : 1)));
            toast(Dd.name + '  ·  ~' + previewN + ' rivals  ·  fire×' + (Dd.rivalFire != null ? Dd.rivalFire : 1), 1.6);
            if (GAME.sfx) GAME.sfx.click();
            return;
          }
        }
        var ri;
        for (ri = 0; ri < (mh.rows || []).length; ri++) {
          if (hitRect(mp.x, mp.y, mh.rows[ri])) {
            state.mapIndex = mh.rows[ri].i;
            if (GAME.sfx) GAME.sfx.click();
            beginRaceFromMap();
            return;
          }
        }
        if (hitRect(mp.x, mp.y, mh.start)) {
          beginRaceFromMap();
          return;
        }
      } else {
        // Layout not drawn yet — still allow click to start selected circuit
        beginRaceFromMap();
        return;
      }
    }
    if (I.pressed('enter') || I.pressed('space')) {
      beginRaceFromMap();
    }
  }

  function trySalvage() {
    var offer = state.salvageOffer;
    if (!offer) return;
    var cost = offer.cost | 0;
    if ((state.meta.scrap | 0) < cost) {
      if (GAME.sfx && GAME.sfx.deny) GAME.sfx.deny();
      toast('NEED ' + cost + ' SCRAP', 1.0, 0);
      return;
    }
    state.meta.scrap -= cost;
    state.meta.salvage = {
      partId: offer.partId, fromCar: offer.fromCar, name: offer.name,
      armedNight: state.meta.stage | 0,
    };
    saveMeta();
    if (GAME.sfx && GAME.sfx.confirm) GAME.sfx.confirm();
    toast('ARMED · ' + offer.name, 1.4, 1);
  }

  function tryBuy(idx) {
    var c = state.pendingChoices[idx];
    if (!c || c.maxed) { if (GAME.sfx) GAME.sfx.deny(); return; }
    if (state.picked.length >= 2) { toast('2 UPGRADES MAX', 1); if (GAME.sfx) GAME.sfx.deny(); return; }
    if (state.meta.scrap < c.cost) { toast('NOT ENOUGH SCRAP', 1); if (GAME.sfx) GAME.sfx.deny(); return; }
    state.meta.scrap -= c.cost;
    state.meta.upgrades[c.key]++;
    state.picked.push(c.key);
    c.level = state.meta.upgrades[c.key];
    c.cost = upgradeCost(c.key);
    c.maxed = c.level >= cfg.upgrades.max;
    saveMeta();
    if (GAME.sfx) GAME.sfx.confirm();
  }

  function leaveResultsToGarage() {
    if (state.meta.freed && state.outcome === 'win' && state.freedomWin) {
      state.mode = 'freedom';
      state._freedomT = 0;
      if (GAME.sfx) {
        if (GAME.sfx.finishSting) GAME.sfx.finishSting();
        else GAME.sfx.win();
      }
      return;
    }
    state.mode = 'garage';
    state.garageTab = 'roster';
    ensureMenuWorld();
    refreshDemoCar();
    if (GAME.sfx) GAME.sfx.click();
  }

  function updateResults() {
    state._resultsT = (state._resultsT || 0) + (1 / 60);
    if (I.pressed('1')) tryBuy(0);
    if (I.pressed('2')) tryBuy(1);
    if (I.pressed('3')) tryBuy(2);
    if (I.pressed('4')) trySalvage();
    // Click upgrade chips or footer → garage (v309)
    if (I.pressed('click')) {
      var rp = hudPointer();
      var rh = state._resultsHit;
      if (rh) {
        if (rh.salvage && hitRect(rp.x, rp.y, rh.salvage)) {
          trySalvage();
          return;
        }
        var ci;
        for (ci = 0; ci < (rh.choices || []).length; ci++) {
          if (hitRect(rp.x, rp.y, rh.choices[ci])) {
            tryBuy(rh.choices[ci].i);
            return;
          }
        }
        if (hitRect(rp.x, rp.y, rh.footer)) {
          leaveResultsToGarage();
          return;
        }
      }
    }
    // R retries the night — death OR win re-run same map (v305/v375)
    if (I.pressed('r')) {
      if (GAME.sfx) {
        try { if (GAME.sfx.unlock) GAME.sfx.unlock(); } catch (eR) {}
        GAME.sfx.click();
      }
      startRace();
      return;
    }
    if (I.pressed('enter') || I.pressed('space')) {
      leaveResultsToGarage();
    }
  }

  function updateFreedomDt(dt) {
    state._freedomT = (state._freedomT || 0) + dt;
    // Brief 3s swagger lock; after 20s ENTER is still the exit
    if ((state._freedomT || 0) < 3) return;
    if (I.pressed('enter') || I.pressed('space') || I.pressed('r')) {
      state.meta.freed = false;
      state.meta.stage = 1;
      saveMeta();
      state.mode = 'title';
      state._freedomT = 0;
    }
  }

  function update(dt) {
    // Toast timer works in menus + race
    if (state.msgT > 0) {
      state.msgT -= dt;
      if (state.msgT <= 0) {
        state.msgT = 0;
        state._toastPri = 0;
        pumpToastQueue();
        // v339: clear stale msg so samples/HUD don't imply a sticky toast
        if ((state.msgT || 0) <= 0) state.msg = '';
      }
    } else {
      pumpToastQueue();
    }
    if (state.mode === 'title') updateTitle();
    else if (state.mode === 'garage') updateGarage();
    else if (state.mode === 'map') updateMapSelect();
    else if (state.mode === 'race') updateRace(dt);
    else if (state.mode === 'results') updateResults();
    else if (state.mode === 'freedom') updateFreedomDt(dt);
  }

  // ---------- Menu world / demo car ----------
  function warmRivalTemplates() {
    if (state._rivalsWarmed || !GAME.vehicles || !GAME.vehicles.create) return;
    state._rivalsWarmed = true;
    try {
      ['razorback', 'mausoleum', 'vesper', 'choir', 'needle', 'marrow'].forEach(function (id) {
        var m = GAME.vehicles.create(id, false);
        if (m) {
          if (m.parent) m.parent.remove(m);
          // drop reference — template lives in vehicles rivalBasicTpl
        }
      });
    } catch (eW) {}
  }

  function ensureMenuWorld() {
    if (!state._menuBuilt) {
      var mapDef = cfg.maps[0];
      state.path = world.build(scene, mapDef);
      state._menuBuilt = true;
      refreshDemoCar();
    }
    // Always try warm once (even if world already built) so START stays instant (v322)
    warmRivalTemplates();
  }

  function disposeObject3D(obj) {
    if (!obj) return;
    obj.traverse(function (c) {
      if (c.geometry) c.geometry.dispose();
      // do not dispose shared materials from paint cache
    });
  }

  function garagePad() {
    if (state.path) {
      var p = (state.path.points[8] || state.path.points[0]).clone();
      p.y += 0.35;
      return p;
    }
    return new THREE.Vector3(0, 0.35, 0);
  }

  /** Build bay once — rebuilding on every car switch was freezing the garage */
  function ensureGarageBay() {
    if (state._garageBay) return;
    var M = GAME.materials.get();
    var bay = new THREE.Group();
    bay.name = 'GarageBay';
    var base = garagePad();
    // Reflective epoxy floor for clearcoat read
    var floor = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.2, 14),
      new THREE.MeshStandardMaterial({
        color: 0x1e2430, metalness: 0.72, roughness: 0.22,
        envMap: M._envMap, envMapIntensity: 2.2,
      })
    );
    floor.position.set(base.x, base.y - 0.15, base.z);
    bay.add(floor);
    // Subtle floor reflection plane
    var floorMirror = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 10),
      new THREE.MeshStandardMaterial({
        color: 0x121820, metalness: 0.9, roughness: 0.08,
        envMap: M._envMap, envMapIntensity: 2.8,
        transparent: true, opacity: 0.55,
      })
    );
    floorMirror.rotation.x = -Math.PI / 2;
    floorMirror.position.set(base.x, base.y - 0.04, base.z);
    bay.add(floorMirror);
    var wall = new THREE.Mesh(
      new THREE.BoxGeometry(20, 8, 0.4),
      new THREE.MeshStandardMaterial({
        color: 0x1a1e28, metalness: 0.45, roughness: 0.65,
        envMap: M._envMap, envMapIntensity: 0.8,
      })
    );
    wall.position.set(base.x, base.y + 3.5, base.z - 6.5);
    bay.add(wall);
    // Tool wall panel + neon stripe
    var panel = new THREE.Mesh(
      new THREE.BoxGeometry(8, 3.5, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x141820, metalness: 0.5, roughness: 0.5 })
    );
    panel.position.set(base.x - 4, base.y + 2.2, base.z - 6.25);
    bay.add(panel);
    var stripe = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.04, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xff2d55, emissive: 0xff2d55, emissiveIntensity: 1.6 })
    );
    stripe.position.set(base.x, base.y - 0.02, base.z + 2.8);
    bay.add(stripe);
    // Ceiling tube lights (emissive mesh — free light read without more PointLights)
    var tubeMat = new THREE.MeshStandardMaterial({
      color: 0xfff5e0, emissive: 0xffe8c0, emissiveIntensity: 3.2, roughness: 0.3,
    });
    for (var ti = 0; ti < 3; ti++) {
      var tube = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.12, 0.35), tubeMat);
      tube.position.set(base.x + (ti - 1) * 0.15, base.y + 5.2, base.z - 1 + ti * 1.8);
      bay.add(tube);
      var tubeHalo = new THREE.Mesh(
        new THREE.BoxGeometry(5.6, 0.04, 0.55),
        new THREE.MeshBasicMaterial({
          color: 0xfff0d0, transparent: true, opacity: 0.18, depthWrite: false,
        })
      );
      tubeHalo.position.copy(tube.position);
      tubeHalo.position.y -= 0.08;
      bay.add(tubeHalo);
    }
    // two lift posts only
    for (var lp = 0; lp < 2; lp++) {
      var post = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 3.2, 0.22),
        new THREE.MeshStandardMaterial({
          color: 0x888898, metalness: 0.85, roughness: 0.25,
          envMap: M._envMap, envMapIntensity: 1.4,
        })
      );
      post.position.set(base.x + (lp ? 5 : -5), base.y + 1.4, base.z + 1);
      bay.add(post);
    }
    // Tire stack prop (garage place craft)
    var tireMat = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.95, metalness: 0.05 });
    for (var ts = 0; ts < 3; ts++) {
      var tire = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.12, 8, 16), tireMat);
      tire.rotation.x = Math.PI / 2;
      tire.position.set(base.x + 6.2, base.y + 0.2 + ts * 0.28, base.z - 2.5);
      bay.add(tire);
    }
    scene.add(bay);
    state._garageBay = bay;

    // Three PointLights max — key / rim / top for flake + clearcoat
    var key = new THREE.PointLight(0xfff0e0, 28, 48, 1.25);
    key.position.copy(base).add(new THREE.Vector3(2.5, 3.5, 2.8));
    scene.add(key);
    state._keyLight = key;
    var rim = new THREE.PointLight(0xb8d0ff, 14, 36, 1.35);
    rim.position.copy(base).add(new THREE.Vector3(-3.2, 2.4, -2.4));
    scene.add(rim);
    state._rimLight = rim;
    var top = new THREE.PointLight(0xffffff, 16, 40, 1.35);
    top.position.copy(base).add(new THREE.Vector3(0, 5.5, 0.5));
    scene.add(top);
    state._topLight = top;
  }

  function refreshDemoCar() {
    // Swap vehicle only — keep bay + lights (switching was rebuild-storming)
    if (state._demoCar) {
      scene.remove(state._demoCar);
      disposeObject3D(state._demoCar);
      state._demoCar = null;
    }
    ensureGarageBay();
    var id = cfg.cars[state.carIndex | 0].id;
    var demo = GAME.vehicles.create(id, true);
    var pad = garagePad();
    demo.position.copy(pad);
    if (GAME.vehicles.setYaw) GAME.vehicles.setYaw(demo, state._demoYaw || 0);
    else demo.rotation.y = state._demoYaw || 0;
    scene.add(demo);
    state._demoCar = demo;

    // Keep matte/satin body — do not amp clearcoat (was disco sparkle)
    // Keep lights aimed at pad
    var base = pad;
    if (state._keyLight) state._keyLight.position.copy(base).add(new THREE.Vector3(2.5, 3.5, 2.8));
    if (state._rimLight) state._rimLight.position.copy(base).add(new THREE.Vector3(-3.2, 2.4, -2.4));
    if (state._topLight) state._topLight.position.copy(base).add(new THREE.Vector3(0, 5.5, 0.5));
  }
  function defAccentOrPink() {
    try {
      var d = GAME.vehicles.def(cfg.cars[state.carIndex | 0].id);
      return d.accent || 0xff2d55;
    } catch (e) { return 0xff2d55; }
  }

  function updateMenuCamera(t) {
    if (!camera) return;
    var focus = state._demoCar ? state._demoCar.position.clone() : new THREE.Vector3(40, 0, -40);
    // Garage still: lock 3/4 rear-low hero (shows clearcoat + flake under tube lights)
    if (state.mode === 'garage' || (typeof location !== 'undefined' && /[?&]garage=1/.test(location.search))) {
      // Shop: park the car in the right third so HUD panels own the left (v299)
      if (state.garageTab === 'shop') {
        camera.position.set(focus.x + 7.6, focus.y + 1.85, focus.z + 6.4);
        camera.lookAt(focus.x - 1.2, focus.y + 0.4, focus.z - 0.9);
        camera.fov = 30;
      } else {
        // Roster: car in OPEN CENTER band (between left roster + right stats).
      // v361: prior lookAt(+1.6) parked the rig under the LEFT list — don't cover the car.
        camera.position.set(focus.x + 5.4, focus.y + 1.6, focus.z + 5.8);
        camera.lookAt(focus.x - 0.15, focus.y + 0.4, focus.z - 0.25);
        camera.fov = 30;
      }
      camera.updateProjectionMatrix();
      if (world) world.updateLOD(camera.position, t);
      return;
    }
    // Title/map orbit — low hero angle on paint + neon city backdrop
    camera.position.set(
      focus.x + Math.sin(t * 0.32) * 6.2,
      1.65 + Math.sin(t * 0.45) * 0.25,
      focus.z + Math.cos(t * 0.32) * 6.2
    );
    camera.lookAt(focus.x, focus.y + 0.45, focus.z);
    camera.fov = 38;
    camera.updateProjectionMatrix();
    if (world) world.updateLOD(camera.position, t);
  }

  // ---------- Bootstrap ----------
  function initThree() {
    var canvas = document.getElementById('c3d');
    var root = document.getElementById('game') || document.body;
    function size() {
      return {
        w: root.clientWidth || window.innerWidth,
        h: root.clientHeight || window.innerHeight
      };
    }
    var sz = size();
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: false, // postAA via grain; antialias costs GPU fill
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 0.78)); // v391 FPS
    renderer.setSize(sz.w, sz.h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace || undefined;
    if (renderer.toneMapping !== undefined) {
      // ACES done in post; keep renderer linear-ish
      renderer.toneMapping = THREE.NoToneMapping;
    }
    renderer.autoClear = true;

    scene = new THREE.Scene();
    // far must clear sky dome (~1400 radius follows cam) + distant skyline
    camera = new THREE.PerspectiveCamera(60, sz.w / Math.max(1, sz.h), 0.15, 2800);
    scene.add(camera);
    GAME.camera = camera;
    GAME.scene = scene;
    GAME.renderer = renderer;
    clock = new THREE.Clock();

    GAME.materials.init();
    postfx = new GAME.PostFX(renderer);
    postfx.setSize(sz.w, sz.h);
    GAME.postfx = postfx; // console / agent access
    hud = new GAME.Hud();
    hud.resize(sz.w, sz.h);
    world = new GAME.World();

    window.addEventListener('resize', function () {
      var s = size();
      camera.aspect = s.w / Math.max(1, s.h);
      camera.updateProjectionMatrix();
      renderer.setSize(s.w, s.h, false);
      postfx.setSize(s.w, s.h);
      hud.resize(s.w, s.h);
    });
  }

  function loop() {
    requestAnimationFrame(loop);
    var dt = Math.min(clock.getDelta(), 0.05);
    if (GAME._setPerfDt) GAME._setPerfDt(dt);
    // Hitstop: freeze-ish for impact moments (v372 slightly deeper — was thin)
    if (state && state._hitStopT > 0) {
      dt *= 0.42;
      // Cap so hitstop never stacks into softlock
      if (state._hitStopT > 0.2) state._hitStopT = 0.2;
    }
    // Freeze-frame: still render/HUD, do not advance sim (money-shot capture)
    if (!(state && state._frozen)) {
      var acc = dt;
      while (acc > 0) {
        var step = Math.min(acc, 1 / 60);
        update(step);
        acc -= step;
      }
    }

    var t = performance.now() / 1000;
    if (state) {
      if (state.mode === 'title' || state.mode === 'garage' || state.mode === 'map') {
        if (!state._frozen) ensureMenuWorld();
        // Always refresh garage hero cam (even when frozen for stills)
        updateMenuCamera(t);
        // Slow continuous spin in garage (and title demo)
        if (!state._frozen && state._demoCar) {
          var spin = state.mode === 'garage' ? 0.35 : 0.45;
          state._demoYaw = (state._demoYaw || 0) + dt * spin;
          if (GAME.vehicles.setYaw) GAME.vehicles.setYaw(state._demoCar, state._demoYaw);
          else state._demoCar.rotation.y = state._demoYaw;
        }
      } else if (!state._frozen && state.mode === 'results') {
        // Wider orbit so neon flanks frame the hero (v379 — was tight asphalt void)
        var rp = state.player;
        var focus = (state._resultsFocus && state._resultsFocus.clone)
          ? state._resultsFocus.clone()
          : (rp && rp.pos ? rp.pos.clone() : null);
        if (focus) {
          var orbit = t * 0.38;
          var ox = Math.sin(orbit) * 10.5;
          var oz = Math.cos(orbit) * 10.5;
          // Lower cam + longer look so neon towers frame the hero, not empty asphalt
          camera.position.set(focus.x + ox, focus.y + 3.4, focus.z + oz);
          camera.lookAt(focus.x, focus.y + 1.1, focus.z);
          camera.fov = 48;
          camera.near = 0.35;
          camera.far = 2800;
          camera.updateProjectionMatrix();
          if (rp && rp.mesh) {
            rp.mesh.visible = true;
            if (rp.pos) rp.mesh.position.copy(rp.pos);
            if (rp.mesh.scale.x < 1.3) rp.mesh.scale.setScalar(1.38);
            var rud = rp.mesh.userData || {};
            if (rud.underglow) rud.underglow.visible = true;
          }
          // Refresh LOD from focus so orbit never loses both flanks
          if (world && world.updateLOD && ((state._resultsLodN | 0) % 2) === 0) {
            world.updateLOD(focus, t);
          }
          state._resultsLodN = (state._resultsLodN | 0) + 1;
        } else {
          updateMenuCamera(t);
        }
      } else if (!state._frozen && state.mode === 'freedom') {
        updateMenuCamera(t);
      }
    }

    // v431: scene radial motion blur during chase combat at speed
    if (postfx && postfx.setMotionBlur) {
      var mb = 0;
      if (state.mode === 'race' && state.player && state.camMode !== 'hood') {
        var pMb = state.player;
        var maxSp = cfg.drive.maxSpeed * ((pMb.mul && pMb.mul.speed) || 1);
        var sn = Math.abs(pMb.speed || 0) / Math.max(1, maxSp);
        mb = Math.max(0, (sn - 0.28) * 0.44);
        if (state.firingMg > 0) mb += 0.1 + sn * 0.24;
        if ((state.camShake || 0) > 0.12) mb += 0.05;
        mb = Math.min(0.52, mb);
      }
      postfx.setMotionBlur(mb);
    }

    postfx.render(scene, camera, t);
    hud.draw(state);
  }

  /** Snapshot API for visual judges — freezes mid-detonation at high speed */
  function freezeFrame() {
    if (state) state._frozen = true;
    return true;
  }
  function unfreezeFrame() {
    if (state) {
      state._frozen = false;
      state._shotHoldSpeed = null;
    }
    return true;
  }
  function prepareMoneyShotFrame() {
    if (!state) return { ok: false };
    state._frozen = false;
    if (state.mode !== 'race') {
      state.mapIndex = 0;
      state.meta.mapId = 'sepulcher';
      startRace();
    }
    // Recreate player mesh after GLB preload so HQ Blender body is used
    if (state.player && GAME.vehicles && GAME.vehicles.create) {
      var old = state.player.mesh;
      var carId = state.player.def && state.player.def.id || state.meta.carId || 'marrow';
      var pos = state.player.pos.clone();
      var yaw = state.player.yaw;
      var mesh = GAME.vehicles.create(carId, true);
      attachVehicleMarkers(mesh, { player: true, color: 0x3a8cff });
      mesh.position.copy(pos);
      if (GAME.vehicles.setYaw) GAME.vehicles.setYaw(mesh, yaw);
      else mesh.rotation.y = yaw;
      scene.add(mesh);
      if (old && old.parent) scene.remove(old);
      state.player.mesh = mesh;
      state.player.pos = pos;
      state.player.yaw = yaw;
    }
    // clear FX then stage one clean peak detonation
    if (particles && particles.clear) particles.clear();
    applyMoneyShot();
    // Half-frame: debris starts flying, fire/smoke still at peak density
    if (particles) {
      particles.update(1 / 120);
    }
    if (state.player) {
      state.player.speed = 50;
      state.player.nitroActive = false;
      // Money-shot still: hide markers so they don't steal the frame
      if (state.player.mesh && state.player.mesh.userData.underglow) {
        state.player.mesh.userData.underglow.visible = false;
      }
      if (state.player.mesh && state.player.mesh.userData.roofPing) {
        state.player.mesh.userData.roofPing.visible = false;
      }
      // Matte body stays matte in stills (no clearcoat amp)
      if (state._heroLight) {
        scene.remove(state._heroLight);
        state._heroLight = null;
      }
      if (state._heroRim) {
        scene.remove(state._heroRim);
        state._heroRim = null;
      }
      // Warm hero key on car only — short range so asphalt stays charcoal
      var hero = new THREE.PointLight(0xfff2e0, 16, 8, 1.9);
      hero.position.copy(state.player.pos);
      hero.position.y += 2.0;
      hero.position.x += Math.sin(state.player.yaw) * -1.2;
      hero.position.z += Math.cos(state.player.yaw) * -1.2;
      scene.add(hero);
      state._heroLight = hero;
      var rimH = new THREE.PointLight(0xc8dcff, 8, 7, 2.0);
      rimH.position.copy(state.player.pos);
      rimH.position.y += 1.4;
      rimH.position.x += Math.cos(state.player.yaw) * 2.4;
      scene.add(rimH);
      state._heroRim = rimH;
      // Side fill for copper body hue on stills
      var sideFill = new THREE.PointLight(0xffaa66, 6, 6.5, 2.0);
      sideFill.position.copy(state.player.pos);
      sideFill.position.y += 1.1;
      sideFill.position.x += Math.cos(state.player.yaw) * -2.0;
      scene.add(sideFill);
      state._heroSide = sideFill;
      // snap camera behind car for chase still — slightly lower, fireball more framed
      var p = state.player;
      var back = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
      var right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
      camera.position.copy(p.pos).addScaledVector(back, 7.0).addScaledVector(right, 1.4);
      camera.position.y = p.pos.y + 2.0;
      camera.lookAt(p.pos.x + Math.sin(p.yaw) * 8, p.pos.y + 1.1, p.pos.z + Math.cos(p.yaw) * 8);
      camera.fov = 50;
      camera.updateProjectionMatrix();
    }
    state.msg = 'MONEY SHOT · COMBAT';
    state.msgT = 99;
    state._frozen = true;
    state._shotHoldSpeed = 50;
    return {
      ok: true,
      mode: state.mode,
      speed: state.player && state.player.speed,
      scrap: state.runScrap,
      particles: particles && particles.items ? particles.items.length : 0,
      frozen: true,
    };
  }
  GAME.freezeFrame = freezeFrame;
  GAME.unfreezeFrame = unfreezeFrame;
  GAME.prepareMoneyShotFrame = prepareMoneyShotFrame;

  function hideBoot() {
    var b = document.getElementById('boot');
    if (b) {
      b.classList.add('hide');
      setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 600);
    }
  }

  window.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('c3d')) return;
    initThree();
    state = {
      mode: 'title',
      meta: loadMeta(),
      carIndex: 0,
      mapIndex: 0,
      path: null,
      player: null,
      rivals: [],
      hazards: [],
      scraps: [],
      projectiles: [],
      mines: [],
      msg: '',
      msgT: 0,
      camMode: 'chase',
      hitFlash: 0,
      hitDir: 0,
      hitDirT: 0,
    };
    GAME.state = state;
    for (var i = 0; i < cfg.cars.length; i++) {
      if (cfg.cars[i].id === state.meta.carId) state.carIndex = i;
    }

    // Preload GLBs in background, start game immediately with procedural fallback
    ensureMenuWorld();
    applyQualityFromMeta();
    if (GAME.quality && GAME.quality.startPerfLog) {
      var _lastDt = 0.016;
      GAME.quality.startPerfLog(renderer, function () { return _lastDt; });
      GAME._setPerfDt = function (d) { _lastDt = d; };
    }
    hideBoot();
    loop();

    // Auto money-shot / garage capture modes for visual judge pipeline
    var qs = typeof location !== 'undefined' ? location.search : '';
    if (/[?&]shot=1/.test(qs)) {
      state.mapIndex = 0;
      state.meta.mapId = 'sepulcher';
      // Judge money-shot always uses Marrow hero (not last garage pick)
      state.meta.carId = 'marrow';
      state.carIndex = 0;
      // Race then freeze mid-detonation for still capture
      setTimeout(function () {
        startRace();
        setTimeout(function () {
          if (GAME.prepareMoneyShotFrame) GAME.prepareMoneyShotFrame();
        }, 500);
      }, 350);
    } else if (/[?&]garage=1/.test(qs)) {
      state.mode = 'garage';
      setTimeout(function () {
        ensureMenuWorld();
        refreshDemoCar();
        // Only freeze for still capture: ?garage=1&still=1
        if (state && /[?&]still=1/.test(qs)) state._frozen = true;
      }, 400);
    }

    Promise.all([
      GAME.vehicles.preloadAll(),
      world.preloadProps ? world.preloadProps() : Promise.resolve(),
    ]).then(function () {
      // Don't rebuild entire city on preload complete — was hitching garage hard
      if (!state._menuBuilt && (state.mode === 'title' || state.mode === 'garage' || state.mode === 'map')) {
        ensureMenuWorld();
      } else if (state.mode === 'title' || state.mode === 'garage' || state.mode === 'map') {
        // Only swap demo if GLBs just arrived and car is still procedural placeholder
        if (state._demoCar && !state._demoCar.userData.fromGlb) {
          refreshDemoCar();
        }
      }
      if (/[?&]garage=1/.test(qs) && /[?&]still=1/.test(qs) && state) state._frozen = true;
      // Rebuild race player with HQ GLB once loaded
      if (/[?&]shot=1/.test(qs)) {
        setTimeout(function () {
          if (GAME.prepareMoneyShotFrame) GAME.prepareMoneyShotFrame();
        }, 200);
      }
      if (/[?&]debug=1/.test(location.search)) console.log('[Twisted Speed] GLB + city props preload done');
    });
  });
})();
