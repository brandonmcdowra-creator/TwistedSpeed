/**
 * Fullscreen 2D HUD + menus over the 3D view.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});
  var U;

  function Hud() {
    U = GAME.utils;
    this.canvas = document.getElementById('hud');
    this.ctx = this.canvas.getContext('2d');
    this.w = 0;
    this.h = 0;
  }

  Hud.prototype.resize = function (w, h) {
    if (this.w === w && this.h === h) return;
    this.w = w;
    this.h = h;
    this.canvas.width = w;
    this.canvas.height = h;
  };

  Hud.prototype.clear = function () {
    this.ctx.clearRect(0, 0, this.w, this.h);
  };

  Hud.prototype.panel = function (x, y, w, h, a) {
    var ctx = this.ctx;
    ctx.fillStyle = 'rgba(8,6,14,' + (a != null ? a : 0.72) + ')';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,45,85,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  };

  Hud.prototype.bar = function (x, y, w, h, t, col, bg) {
    var ctx = this.ctx;
    ctx.fillStyle = bg || 'rgba(30,24,40,0.9)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w * U.clamp(t, 0, 1), h);
  };

  Hud.prototype.draw = function (state) {
    this.clear();
    if (!state) return;
    var mode = state.mode;
    if (mode === 'title') this.drawTitle(state);
    else if (mode === 'garage') this.drawGarage(state);
    else if (mode === 'map') this.drawMap(state);
    else if (mode === 'race') this.drawRace(state);
    else if (mode === 'results') this.drawResults(state);
    else if (mode === 'freedom') this.drawFreedom(state);
  };

  Hud.prototype.drawTitle = function (state) {
    var ctx = this.ctx, w = this.w, h = this.h;
    var grd = ctx.createRadialGradient(w/2, h/2, h*0.15, w/2, h/2, h*0.75);
    grd.addColorStop(0, 'rgba(5,4,10,0.15)');
    grd.addColorStop(1, 'rgba(5,4,10,0.55)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff2d55';
    ctx.font = 'bold ' + Math.floor(w * 0.045) + 'px monospace';
    ctx.shadowColor = '#ff2d55';
    ctx.shadowBlur = 24;
    ctx.fillText('TWISTED SPEED', w / 2, h * 0.28);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#00e5ff';
    ctx.font = Math.floor(w * 0.016) + 'px monospace';
    ctx.fillText('NIGHT CIRCUIT  ·  NFS HEAT STREETS × TM BLACK COMBAT', w / 2, h * 0.36);
    ctx.fillStyle = '#f2e9e4';
    ctx.font = Math.floor(w * 0.018) + 'px monospace';
    ctx.fillText('Hunt them. Survive the track. Buy your freedom.', w / 2, h * 0.48);
    ctx.fillStyle = '#ff9f1c';
    ctx.font = Math.floor(w * 0.02) + 'px monospace';
    ctx.fillText('ENTER — CONTINUE', w / 2, h * 0.6);
    ctx.fillStyle = '#8a7a88';
    ctx.font = Math.floor(w * 0.013) + 'px monospace';
    ctx.fillText('WASD drive · SPACE/SHIFT drift · Q nitro · J gun · K rocket · L mine · I special · C camera', w / 2, h * 0.72);
    ctx.fillText('Night ' + state.meta.stage + ' / ' + GAME.config.stageCount + '  ·  Scrap ' + state.meta.scrap, w / 2, h * 0.78);
    ctx.textAlign = 'left';
  };

  Hud.prototype.drawGarage = function (state) {
    if (state.garageTab === 'shop') {
      this.drawGarageShop(state);
      this.drawToast(state);
      return;
    }
    var ctx = this.ctx, w = this.w, h = this.h;
    var cars = GAME.config.cars;
    var sel = state.carIndex | 0;
    var car = cars[sel];
    this.panel(24, 24, Math.min(360, w * 0.28), h - 48, 0.72);
    this.panel(Math.min(400, w * 0.3), 24, Math.min(420, w * 0.34), 280, 0.55);
    ctx.fillStyle = '#ff2d55';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('NEON-SCORCHED GARAGE', 48, 64);
    ctx.fillStyle = '#ff9f1c';
    ctx.font = '14px monospace';
    ctx.fillText('SCRAP ' + state.meta.scrap + '   NIGHT ' + state.meta.stage + '/' + GAME.config.stageCount, 48, 92);
    var diffId = state.meta.difficulty || 'adventurous';
    var diff = (GAME.config.difficulties && GAME.config.difficulties[diffId]) || { name: 'ADVENTUROUS', desc: '' };
    var diffCol = diffId === 'chill' ? '#39ff14' : (diffId === 'brutal' ? '#ff2d55' : '#00e5ff');
    ctx.fillStyle = diffCol;
    ctx.font = 'bold 13px monospace';
    ctx.fillText('DIFFICULTY  ' + diff.name, 48, 112);
    ctx.fillStyle = '#8a7a88';
    ctx.font = '11px monospace';
    ctx.fillText('[ ] or 1/2/3  ·  ' + (diff.desc || ''), 48, 128);

    for (var i = 0; i < cars.length; i++) {
      var y = 145 + i * 52;
      var active = i === sel;
      var bi = (state.meta.builds && state.meta.builds[cars[i].id]) || {};
      var invest = buildInvestment(bi);
      ctx.fillStyle = active ? 'rgba(0,229,255,0.18)' : 'rgba(20,16,28,0.5)';
      ctx.fillRect(48, y, 320, 46);
      ctx.strokeStyle = active ? '#00e5ff' : '#3a3040';
      ctx.strokeRect(48, y, 320, 46);
      ctx.fillStyle = active ? '#00e5ff' : '#f2e9e4';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(cars[i].name, 60, y + 20);
      ctx.fillStyle = '#8a7a88';
      ctx.font = '12px monospace';
      ctx.fillText(cars[i].role + (invest ? '  ·  TUNE ' + invest : ''), 60, y + 38);
    }

    var dx = 400;
    var build = (state.meta.builds && state.meta.builds[car.id]) || { unlocks: {}, levels: {} };
    ctx.fillStyle = '#f2e9e4';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(car.name, dx, 150);
    ctx.fillStyle = '#00e5ff';
    ctx.font = '14px monospace';
    ctx.fillText(car.role, dx, 175);
    ctx.fillStyle = '#8a7a88';
    ctx.fillText('SPECIAL: ' + car.special + ' — ' + car.specialDesc, dx, 200);
    var Ww = GAME.vehicles.weapons ? GAME.vehicles.weapons(car) : {};
    var load = [];
    if (Ww.mg || (build.unlocks && build.unlocks.unlockMg)) load.push(Ww.mgLabel || 'GUN');
    if (Ww.rocket || (build.unlocks && build.unlocks.unlockRocket)) load.push('ROCKET');
    if (Ww.mine || (build.unlocks && build.unlocks.unlockMine)) load.push('MINE');
    if (build.unlocks && build.unlocks.shieldCore) load.push('SHIELD');
    if (!load.length) load.push('MELEE');
    ctx.fillStyle = '#ff9f1c';
    ctx.font = '12px monospace';
    ctx.fillText('LOADOUT: ' + load.join(' · ') + '   MASS ' + (car.mass != null ? car.mass.toFixed(2) : '—'), dx, 220);

    // Stock + tuned effective bars (pips over 5 = gold overflow)
    var eff = effectiveStats(car, build);
    function statBar(label, base, tuned, y) {
      ctx.fillStyle = '#8a7a88';
      ctx.font = '12px monospace';
      ctx.fillText(label, dx, y);
      for (var s = 0; s < 5; s++) {
        var on = s < base;
        var boost = s < tuned && s >= base;
        ctx.fillStyle = boost ? '#ffc857' : (on ? '#ff2d55' : '#2a2030');
        ctx.fillRect(dx + 60 + s * 28, y - 12, 24, 12);
      }
      if (tuned > base) {
        ctx.fillStyle = '#ffc857';
        ctx.font = '11px monospace';
        ctx.fillText('+' + (tuned - base).toFixed(0), dx + 210, y);
      }
    }
    statBar('SPD', car.stats.spd, eff.spd, 255);
    statBar('ARM', car.stats.arm, eff.arm, 285);
    statBar('FIRE', car.stats.fire, eff.fire, 315);
    statBar('HAND', car.stats.hand, eff.hand, 345);

    var u = state.meta.upgrades;
    ctx.fillStyle = '#ff9f1c';
    ctx.font = '13px monospace';
    ctx.fillText('GLOBAL  SPD+' + u.speed + '  ARM+' + u.armor + '  FIRE+' + u.firepower, dx, 380);

    // Big shop CTA
    ctx.fillStyle = 'rgba(255,45,85,0.2)';
    ctx.fillRect(dx, 400, 360, 44);
    ctx.strokeStyle = '#ff2d55';
    ctx.strokeRect(dx, 400, 360, 44);
    ctx.fillStyle = '#ff2d55';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('U / TAB  —  TUNE THIS RIG', dx + 16, 428);

    ctx.fillStyle = '#8a7a88';
    ctx.font = '12px monospace';
    ctx.fillText('Per-car parts · weapons · nitro · armor  (NFS-style bay)', dx, 462);

    ctx.fillStyle = '#f2e9e4';
    ctx.font = '14px monospace';
    ctx.fillText('← → rig   [ ] difficulty   ENTER — race map', 48, h - 60);
    ctx.fillStyle = '#8a7a88';
    ctx.font = '12px monospace';
    ctx.fillText('R wipe save', 48, h - 40);
    this.drawToast(state);
  };

  Hud.prototype.drawToast = function (state) {
    if (!(state.msgT > 0 && state.msg)) return;
    var ctx = this.ctx, w = this.w, h = this.h;
    this.panel(w / 2 - 240, h * 0.08, 480, 36, 0.82);
    ctx.fillStyle = '#00e5ff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(state.msg, w / 2, h * 0.08 + 24);
    ctx.textAlign = 'left';
  };

  function buildInvestment(build) {
    if (!build) return 0;
    var n = 0;
    var L = build.levels || {};
    var Uu = build.unlocks || {};
    for (var k in L) if (Object.prototype.hasOwnProperty.call(L, k)) n += L[k] | 0;
    for (var u in Uu) if (Uu[u]) n += 2;
    return n;
  }

  /** Approximate 1–5 bars from stock + garage levels for roster preview */
  function effectiveStats(car, build) {
    var L = (build && build.levels) || {};
    var Uu = (build && build.unlocks) || {};
    var spd = car.stats.spd + (L.topSpeed | 0) * 0.35 + (L.accel | 0) * 0.2 + (L.nitroPower | 0) * 0.15;
    var arm = car.stats.arm + (L.plates | 0) * 0.4 + (Uu.shieldCore ? 0.8 : 0) + (L.ramGuard | 0) * 0.2;
    var fire = car.stats.fire + (L.mgPower | 0) * 0.35 + (Uu.unlockRocket ? 0.6 : 0) + (Uu.unlockMine ? 0.4 : 0)
      + (L.rocketPower | 0) * 0.25 + (L.minePower | 0) * 0.2;
    var hand = car.stats.hand + (L.agility | 0) * 0.35 + (L.grip | 0) * 0.3 + (L.driftTune | 0) * 0.2;
    return {
      spd: Math.min(8, Math.round(spd * 10) / 10),
      arm: Math.min(8, Math.round(arm * 10) / 10),
      fire: Math.min(8, Math.round(fire * 10) / 10),
      hand: Math.min(8, Math.round(hand * 10) / 10),
    };
  }

  /** Full tuning bay for selected car */
  Hud.prototype.drawGarageShop = function (state) {
    var ctx = this.ctx, w = this.w, h = this.h;
    var car = GAME.config.cars[state.carIndex | 0];
    var carId = car.id;
    var shop = GAME.config.garageShop;
    var cats = shop.categories;
    var catIdx = state.shopCat | 0;
    var cat = cats[catIdx];
    var items = shop.items.filter(function (it) { return it.cat === cat.id; });
    var itemIdx = U.clamp(state.shopItem | 0, 0, Math.max(0, items.length - 1));
    state.shopItem = itemIdx;
    var build = (state.meta.builds && state.meta.builds[carId]) || { levels: {}, unlocks: {} };

    // Dim 3D slightly
    ctx.fillStyle = 'rgba(5,4,10,0.55)';
    ctx.fillRect(0, 0, w, h);

    this.panel(24, 20, w - 48, h - 40, 0.88);
    ctx.fillStyle = '#ff2d55';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('TUNE  ·  ' + car.name, 48, 58);
    ctx.fillStyle = '#ff9f1c';
    ctx.font = '14px monospace';
    ctx.fillText('SCRAP ' + state.meta.scrap + '     ESC — back to roster', 48, 84);

    // Category tabs
    var tw = Math.min(160, (w - 100) / cats.length);
    for (var ci = 0; ci < cats.length; ci++) {
      var cx = 48 + ci * (tw + 8);
      var on = ci === catIdx;
      ctx.fillStyle = on ? 'rgba(255,45,85,0.28)' : 'rgba(20,16,28,0.6)';
      ctx.fillRect(cx, 100, tw, 36);
      ctx.strokeStyle = on ? cats[ci].color : '#3a3040';
      ctx.strokeRect(cx, 100, tw, 36);
      ctx.fillStyle = on ? cats[ci].color : '#8a7a88';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(cats[ci].name, cx + 12, 124);
    }

    // Item list (compact rows so long arsenal catalogs fit)
    var listX = 48, listY = 160, listW = Math.min(520, w * 0.48);
    var maxListH = h - listY - 72;
    var rowH = Math.min(52, Math.max(40, Math.floor(maxListH / Math.max(1, items.length))));
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var y = listY + i * rowH;
      var sel = i === itemIdx;
      var levels = (build.levels && build.levels[it.id]) | 0;
      var unlocked = !!(build.unlocks && build.unlocks[it.id]);
      var maxed = it.type === 'unlock' ? unlocked : levels >= (it.max | 1);
      var cost = it.type === 'unlock' ? (it.cost | 0) : (it.costBase | 0) + levels * (it.costStep | 0);
      // availability
      var locked = false;
      var lockWhy = '';
      if (it.req && !(build.unlocks && build.unlocks[it.req])) {
        locked = true; lockWhy = 'NEED ' + it.req.toUpperCase();
      }
      if (it.reqWeapon === 'rocket') {
        var hasR = !!(car.weapons && car.weapons.rocket) || !!(build.unlocks && build.unlocks.unlockRocket);
        if (!hasR) { locked = true; lockWhy = 'NEED ROCKET RACK'; }
      }
      if (it.reqWeapon === 'mine') {
        var hasM = !!(car.weapons && car.weapons.mine) || !!(build.unlocks && build.unlocks.unlockMine);
        if (!hasM) { locked = true; lockWhy = 'NEED MINE BAY'; }
      }

      ctx.fillStyle = sel ? 'rgba(0,229,255,0.16)' : 'rgba(16,12,22,0.7)';
      ctx.fillRect(listX, y, listW, rowH - 4);
      ctx.strokeStyle = sel ? '#00e5ff' : '#2a2433';
      ctx.strokeRect(listX, y, listW, rowH - 4);

      ctx.fillStyle = locked ? '#555' : (maxed ? '#39ff14' : '#f2e9e4');
      ctx.font = 'bold 14px monospace';
      ctx.fillText(it.name, listX + 12, y + 20);
      ctx.fillStyle = '#8a7a88';
      ctx.font = '11px monospace';
      ctx.fillText(it.desc, listX + 12, y + 38);

      ctx.font = '12px monospace';
      if (locked) {
        ctx.fillStyle = '#ff2d55';
        ctx.fillText(lockWhy, listX + listW - 150, y + 28);
      } else if (maxed) {
        ctx.fillStyle = '#39ff14';
        ctx.fillText(it.type === 'unlock' ? 'OWNED' : 'MAX LV' + levels, listX + listW - 90, y + 28);
      } else {
        ctx.fillStyle = state.meta.scrap >= cost ? '#ffc857' : '#ff2d55';
        var lvStr = it.type === 'unlock' ? 'UNLOCK' : ('LV' + levels + '→' + (levels + 1));
        ctx.fillText(lvStr + '  ' + cost + ' SCRAP', listX + listW - 160, y + 28);
      }
    }

    // Detail / build summary panel
    var detX = listX + listW + 24;
    var detW = w - detX - 48;
    this.panel(detX, 160, detW, h - 220, 0.75);
    var focus = items[itemIdx];
    if (focus) {
      ctx.fillStyle = cat.color || '#00e5ff';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(focus.name, detX + 16, 195);
      ctx.fillStyle = '#f2e9e4';
      ctx.font = '13px monospace';
      wrapText(ctx, focus.desc, detX + 16, 220, detW - 32, 18);
      ctx.fillStyle = '#8a7a88';
      ctx.font = '12px monospace';
      if (focus.type === 'level') {
        ctx.fillText('Level  ' + ((build.levels && build.levels[focus.id]) | 0) + ' / ' + focus.max, detX + 16, 280);
      } else {
        ctx.fillText(build.unlocks && build.unlocks[focus.id] ? 'INSTALLED' : 'NOT INSTALLED', detX + 16, 280);
      }
    }

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('BUILD SUMMARY', detX + 16, 320);
    ctx.fillStyle = '#8a7a88';
    ctx.font = '12px monospace';
    var lines = summarizeBuild(car, build);
    for (var li = 0; li < lines.length; li++) {
      ctx.fillText(lines[li], detX + 16, 345 + li * 18);
    }

    ctx.fillStyle = '#f2e9e4';
    ctx.font = '13px monospace';
    ctx.fillText('← → category   ↑ ↓ part   ENTER/F buy   U/TAB roster', 48, h - 48);
    this.drawToast(state);
  };

  function wrapText(ctx, text, x, y, maxW, lineH) {
    var words = text.split(' ');
    var line = '';
    var yy = y;
    for (var n = 0; n < words.length; n++) {
      var test = line + words[n] + ' ';
      if (ctx.measureText(test).width > maxW && n > 0) {
        ctx.fillText(line, x, yy);
        line = words[n] + ' ';
        yy += lineH;
      } else line = test;
    }
    ctx.fillText(line, x, yy);
  }

  function summarizeBuild(car, build) {
    var L = build.levels || {};
    var Uu = build.unlocks || {};
    var out = [];
    out.push('Stock role: ' + car.role);
    var bits = [];
    if (L.topSpeed) bits.push('TOP+' + L.topSpeed);
    if (L.accel) bits.push('ACC+' + L.accel);
    if (L.nitroCap) bits.push('TANK+' + L.nitroCap);
    if (L.nitroPower) bits.push('BURN+' + L.nitroPower);
    if (L.nitroRegen) bits.push('RECOV+' + L.nitroRegen);
    if (L.agility) bits.push('AGI+' + L.agility);
    if (L.grip) bits.push('GRIP+' + L.grip);
    if (L.driftTune) bits.push('DRIFT+' + L.driftTune);
    if (L.brakeTune) bits.push('BRK+' + L.brakeTune);
    if (L.lighten) bits.push('LIGHT+' + L.lighten);
    if (L.plates) bits.push('PLATE+' + L.plates);
    if (Uu.shieldCore) bits.push('SHIELD' + (L.shieldCap ? ' C' + L.shieldCap : ''));
    if (L.ramGuard) bits.push('RAM+' + L.ramGuard);
    if (L.regenPlates) bits.push('NANO+' + L.regenPlates);
    if (L.heatSink) bits.push('HEAT+' + L.heatSink);
    if (L.mgPower) bits.push('GUN+' + L.mgPower);
    if (L.mgCool) bits.push('FEED+' + L.mgCool);
    if (Uu.unlockRocket) bits.push('ROCKETS');
    if (L.rocketPower) bits.push('WHD+' + L.rocketPower);
    if (L.rocketCool) bits.push('RCD+' + L.rocketCool);
    if (Uu.unlockMine) bits.push('MINES');
    if (L.minePower) bits.push('MINE+' + L.minePower);
    if (L.mineCool) bits.push('MCD+' + L.mineCool);
    if (L.specialCool) bits.push('SPEC+' + L.specialCool);
    if (bits.length) {
      // wrap into multiple lines for long builds
      var line = '';
      for (var bi = 0; bi < bits.length; bi++) {
        var next = (line ? line + ' · ' : '') + bits[bi];
        if (next.length > 42 && line) {
          out.push(line);
          line = bits[bi];
        } else line = next;
      }
      if (line) out.push(line);
    } else {
      out.push('No parts installed yet — spend scrap');
    }
    var weps = [];
    if (car.weapons && car.weapons.mg) weps.push(car.weapons.mgLabel || 'GUN');
    if ((car.weapons && car.weapons.rocket) || Uu.unlockRocket) weps.push('ROCKET');
    if ((car.weapons && car.weapons.mine) || Uu.unlockMine) weps.push('MINE');
    if (Uu.shieldCore) weps.push('SHIELD');
    out.push('Hardpoints: ' + (weps.join(', ') || '—'));
    out.push('Invest: ' + buildInvestment(build) + ' pts on this rig');
    return out;
  }

  Hud.prototype.drawMap = function (state) {
    var ctx = this.ctx, w = this.w, h = this.h;
    var maps = GAME.config.maps;
    var sel = state.mapIndex | 0;
    this.panel(w * 0.15, h * 0.12, w * 0.7, h * 0.76, 0.82);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('SELECT COURSE', w / 2, h * 0.2);
    var diffId = state.meta.difficulty || 'adventurous';
    var diffs = ['chill', 'adventurous', 'brutal'];
    var dw = 140;
    var dx0 = w / 2 - (diffs.length * dw) / 2;
    for (var di = 0; di < diffs.length; di++) {
      var ddef = GAME.config.difficulties[diffs[di]];
      var on = diffs[di] === diffId;
      var bx = dx0 + di * dw;
      ctx.fillStyle = on ? 'rgba(255,45,85,0.25)' : 'rgba(20,16,28,0.5)';
      ctx.fillRect(bx, h * 0.24, dw - 10, 36);
      ctx.strokeStyle = on ? '#ff2d55' : '#3a3040';
      ctx.strokeRect(bx, h * 0.24, dw - 10, 36);
      ctx.fillStyle = on ? '#ff2d55' : '#8a7a88';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(ddef.name, bx + (dw - 10) / 2, h * 0.24 + 24);
    }
    ctx.fillStyle = '#8a7a88';
    ctx.font = '11px monospace';
    ctx.fillText((GAME.config.difficulties[diffId] || {}).desc || '', w / 2, h * 0.24 + 56);

    for (var i = 0; i < maps.length; i++) {
      var y = h * 0.38 + i * 70;
      var active = i === sel;
      ctx.fillStyle = active ? 'rgba(255,45,85,0.2)' : 'rgba(20,16,28,0.4)';
      ctx.fillRect(w * 0.22, y - 30, w * 0.56, 58);
      ctx.strokeStyle = active ? '#ff2d55' : '#3a3040';
      ctx.strokeRect(w * 0.22, y - 30, w * 0.56, 58);
      ctx.fillStyle = active ? '#ff2d55' : '#f2e9e4';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(maps[i].name, w / 2, y);
      ctx.fillStyle = '#8a7a88';
      ctx.font = '12px monospace';
      ctx.fillText(maps[i].desc + '  ·  START → FINISH', w / 2, y + 20);
    }
    ctx.fillStyle = '#ff9f1c';
    ctx.font = '14px monospace';
    ctx.fillText('↑ ↓ course   [ ] difficulty   ENTER — night ' + state.meta.stage, w / 2, h * 0.82);
    ctx.textAlign = 'left';
  };

  Hud.prototype.drawRace = function (state) {
    var ctx = this.ctx, w = this.w, h = this.h;
    var p = state.player;
    if (!p) return;

    if (state.hitFlash > 0) {
      var fa = Math.min(0.45, state.hitFlash * 0.55);
      var g = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.15, w * 0.5, h * 0.5, w * 0.72);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.55, 'rgba(255,20,40,' + (fa * 0.15) + ')');
      g.addColorStop(1, 'rgba(180,0,30,' + fa + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    var hasShieldHud = (p.maxShield > 0) || (p.shield > 0);
    this.panel(16, 16, 200, hasShieldHud ? 74 : 54, 0.7);
    ctx.fillStyle = '#8a7a88';
    ctx.font = '10px monospace';
    ctx.fillText('ARMOR', 24, 32);
    this.bar(24, 38, 180, 8, p.hp / p.maxHp, p.hp / p.maxHp > 0.35 ? '#ff2d55' : '#ff9f1c');
    if (hasShieldHud) {
      ctx.fillStyle = '#00e5ff';
      ctx.fillText('SHIELD', 24, 58);
      this.bar(80, 50, 124, 6, p.maxShield > 0 ? p.shield / p.maxShield : 0, '#00e5ff');
    }

    this.panel(16, h - 100, 150, 84, 0.72);
    ctx.fillStyle = '#8a7a88';
    ctx.font = '10px monospace';
    ctx.fillText('SPEED', 24, h - 80);
    ctx.fillStyle = p.nitroActive ? '#00e5ff' : '#ff2d55';
    ctx.font = 'bold 32px monospace';
    ctx.fillText(String(Math.round(Math.abs(p.speed) * 4.4)), 24, h - 42);
    ctx.fillStyle = '#8a7a88';
    ctx.font = '11px monospace';
    ctx.fillText('km/h', 110, h - 42);

    this.panel(16, h - 160, 150, 52, 0.72);
    ctx.fillStyle = '#8a7a88';
    ctx.font = '9px monospace';
    ctx.fillText('NITRO', 24, h - 142);
    var nMax = p.nitroMax != null ? p.nitroMax : 1;
    this.bar(24, h - 136, 130, 6, p.nitro / nMax, p.nitroActive ? '#00e5ff' : '#4ad4ff');
    ctx.fillStyle = '#8a7a88';
    ctx.fillText('WARDEN', 24, h - 118);
    var heatCol = p.heat > 0.72 ? '#ff2d55' : (p.heat > 0.4 ? '#ff9f1c' : '#39ff14');
    this.bar(24, h - 112, 130, 6, p.heat, heatCol);

    var W = (GAME.vehicles.weapons && p.def) ? (p._wep || GAME.vehicles.weapons(p.def)) : { mg: true, rocket: true, mine: true, mgLabel: 'GUNS', rocketLabel: 'ROCKET', mineLabel: 'MINE' };
    this.panel(w / 2 - 170, h - 56, 340, 40, 0.72);
    ctx.font = '11px monospace';
    function wepCol(has, cd) {
      if (!has) return '#333';
      return cd > 0 ? '#555' : null;
    }
    ctx.fillStyle = wepCol(W.mg, p.mgCd) || '#ffe66d';
    ctx.fillText('J ' + (W.mg ? (W.mgLabel || 'GUNS') : '—'), w / 2 - 155, h - 32);
    ctx.fillStyle = wepCol(W.rocket, p.rocketCd) || '#ff6b35';
    ctx.fillText('K ' + (W.rocket ? (W.rocketLabel || 'ROCKET') : '—'), w / 2 - 70, h - 32);
    ctx.fillStyle = wepCol(W.mine, p.mineCd) || '#00e5ff';
    ctx.fillText('L ' + (W.mine ? (W.mineLabel || 'MINE') : '—'), w / 2 + 30, h - 32);
    ctx.fillStyle = p.specialCd > 0 ? '#555' : '#ff2d88';
    ctx.fillText('I SPEC', w / 2 + 115, h - 32);

    this.panel(w - 200, 16, 184, 86, 0.72);
    ctx.fillStyle = '#ff2d55';
    ctx.font = '12px monospace';
    ctx.fillText('NIGHT ' + state.meta.stage + '/' + GAME.config.stageCount, w - 188, 34);
    var dRace = (GAME.config.difficulties && GAME.config.difficulties[state.meta.difficulty || 'adventurous']) || { name: 'ADVENTUROUS' };
    ctx.fillStyle = (state.meta.difficulty === 'chill') ? '#39ff14' : (state.meta.difficulty === 'brutal' ? '#ff2d55' : '#00e5ff');
    ctx.font = '10px monospace';
    ctx.fillText(dRace.name, w - 188, 48);
    ctx.fillStyle = '#00e5ff';
    ctx.font = '12px monospace';
    ctx.fillText('COURSE', w - 188, 62);
    var prog = p.progress != null ? p.progress : (p.maxProgress || 0);
    this.bar(w - 188, 68, 160, 7, prog, '#00e5ff');
    ctx.fillStyle = '#8a7a88';
    ctx.font = '10px monospace';
    ctx.fillText(Math.round(prog * 100) + '% → FINISH   S' + state.runScrap + ' K' + p.kills, w - 188, 90);

    this.panel(w / 2 - 90, 16, 180, 18, 0.65);
    this.bar(w / 2 - 86, 20, 172, 10, (state.meta.stage - 1) / GAME.config.stageCount, '#00e5ff');
    ctx.fillStyle = '#f2e9e4';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FREEDOM', w / 2, 29);
    ctx.textAlign = 'left';

    // Active temporary race buffs (drive-through pickups — not garage upgrades)
    if (p.buffs) {
      var buffIds = Object.keys(p.buffs);
      if (buffIds.length) {
        var bx = w - 200;
        var by = 112;
        var bh = 18 + buffIds.length * 22;
        this.panel(bx, by, 184, bh, 0.7);
        ctx.fillStyle = '#8a7a88';
        ctx.font = '9px monospace';
        ctx.fillText('BUFFS', bx + 10, by + 14);
        for (var bi = 0; bi < buffIds.length; bi++) {
          var bb = p.buffs[buffIds[bi]];
          if (!bb || bb.t <= 0) continue;
          var rowY = by + 22 + bi * 22;
          var hex = typeof bb.color === 'number'
            ? '#' + ('000000' + bb.color.toString(16)).slice(-6)
            : '#00e5ff';
          ctx.fillStyle = hex;
          ctx.font = 'bold 11px monospace';
          ctx.fillText(bb.label || buffIds[bi].toUpperCase(), bx + 10, rowY + 12);
          var bFrac = bb.max > 0 ? bb.t / bb.max : 0;
          this.bar(bx + 88, rowY + 4, 86, 6, bFrac, hex);
        }
      }
    }

    if (p.drifting) {
      ctx.fillStyle = 'rgba(0,229,255,0.14)';
      ctx.fillRect(0, h * 0.42, w, 36);
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('◆ DRIFT ◆', w / 2, h * 0.42 + 26);
      ctx.textAlign = 'left';
      ctx.font = '12px monospace';
      ctx.fillText('DRIFT', 180, h - 120);
      var slipAmt = Math.min(1, Math.abs(p.slip || 0) / 36);
      this.bar(180, h - 112, 90, 5, slipAmt, '#00e5ff');
    }

    if (state.hostile) {
      ctx.fillStyle = 'rgba(0,229,255,0.12)';
      ctx.fillRect(0, h - 26, w, 26);
      ctx.fillStyle = '#00e5ff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ WARDEN HEAT — TRACK HOSTILE', w / 2, h - 9);
      ctx.textAlign = 'left';
    }

    if (state.msgT > 0 && state.msg) {
      this.panel(w / 2 - 240, 48, 480, 32, 0.75);
      ctx.fillStyle = '#00e5ff';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(state.msg, w / 2, 70);
      ctx.textAlign = 'left';
    }

    if (state._startBannerT > 0) {
      var a = Math.min(1, state._startBannerT / 2.5);
      ctx.fillStyle = 'rgba(255,45,85,' + (0.2 * a) + ')';
      ctx.fillRect(0, h * 0.28, w, 70);
      ctx.fillStyle = 'rgba(255,45,85,' + a + ')';
      ctx.font = 'bold 42px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▶ START', w / 2, h * 0.28 + 48);
      ctx.font = '14px monospace';
      ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
      ctx.fillText('DRIVE TO THE CYAN FINISH GATE', w / 2, h * 0.28 + 68);
      ctx.textAlign = 'left';
    }

    this.drawTurnArrow(state);
    this.drawMinimap(state);
    this.drawRivalHealthBars(state);
  };

  /**
   * World-projected armor bars over damaged rivals (when hurt or low HP).
   */
  Hud.prototype.drawRivalHealthBars = function (state) {
    var cam = GAME.camera;
    if (!cam || !state.rivals || !state.player) return;
    var ctx = this.ctx;
    var w = this.w, h = this.h;
    var tmp = new THREE.Vector3();
    var rivals = state.rivals;
    for (var i = 0; i < rivals.length; i++) {
      var r = rivals[i];
      if (!r || r.dead || !r.mesh || r.hp == null) continue;
      var show = (r.hurtFlash > 0) || (r.hp < r.maxHp * 0.92);
      if (!show) continue;
      // Slightly above car roof
      tmp.set(r.pos.x, r.pos.y + 2.1, r.pos.z);
      tmp.project(cam);
      // Behind camera / off screen
      if (tmp.z > 1) continue;
      var sx = (tmp.x * 0.5 + 0.5) * w;
      var sy = (-tmp.y * 0.5 + 0.5) * h;
      if (sx < -40 || sx > w + 40 || sy < -20 || sy > h + 20) continue;
      // Distance fade (hide far bars)
      var dist = state.player.pos.distanceTo(r.pos);
      if (dist > 85) continue;
      var alpha = dist < 40 ? 0.95 : Math.max(0.25, 1 - (dist - 40) / 45);
      if (r.hurtFlash > 0) alpha = Math.min(1, alpha + 0.15);

      var barW = 52;
      var barH = 5;
      var bx = sx - barW * 0.5;
      var by = sy - 8;
      var ratio = Math.max(0, Math.min(1, r.hp / Math.max(1, r.maxHp)));
      var col = ratio > 0.45 ? '#39ff14' : (ratio > 0.22 ? '#ff9f1c' : '#ff2d55');

      ctx.save();
      ctx.globalAlpha = alpha;
      // plate
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(bx - 2, by - 10, barW + 4, barH + 14);
      // name tick
      ctx.fillStyle = '#c8c0d0';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      var label = (r.defId || 'FOE').toUpperCase();
      if (label.length > 8) label = label.slice(0, 8);
      ctx.fillText(label, sx, by - 2);
      // empty bar
      ctx.fillStyle = 'rgba(40,30,40,0.9)';
      ctx.fillRect(bx, by, barW, barH);
      // fill
      ctx.fillStyle = col;
      ctx.fillRect(bx, by, barW * ratio, barH);
      // shield chip if any
      if (r.shield > 0 && r.maxShield > 0) {
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(bx, by + barH + 1, barW * Math.min(1, r.shield / r.maxShield), 2);
      }
      ctx.restore();
    }
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  };

  Hud.prototype.drawTurnArrow = function (state) {
    var at = state.activeTurn;
    if (!at || !at.turn) return;
    var ctx = this.ctx, w = this.w, h = this.h;
    var side = at.turn.side;
    var ahead = at.ahead;
    var prox = 1 - Math.max(0, Math.min(1, ahead / 0.12));
    var alpha = 0.35 + prox * 0.65;
    var size = 48 + prox * 36;
    var cx = side < 0 ? w * 0.18 : w * 0.82;
    var cy = h * 0.38;
    var deg = Math.round(at.turn.deg);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(cx - size * 0.9, cy - size * 0.85, size * 1.8, size * 1.9);
    ctx.strokeStyle = side < 0 ? '#00e5ff' : '#ff2d55';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - size * 0.9, cy - size * 0.85, size * 1.8, size * 1.9);

    ctx.fillStyle = side < 0 ? '#00e5ff' : '#ff9f1c';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    var dir = side < 0 ? -1 : 1;
    for (var k = 0; k < 3; k++) {
      var oy = cy - size * 0.35 + k * (size * 0.28);
      var s = size * (0.55 - k * 0.06);
      ctx.beginPath();
      if (dir < 0) {
        ctx.moveTo(cx - s * 0.55, oy);
        ctx.lineTo(cx + s * 0.35, oy - s * 0.4);
        ctx.lineTo(cx + s * 0.1, oy);
        ctx.lineTo(cx + s * 0.35, oy + s * 0.4);
      } else {
        ctx.moveTo(cx + s * 0.55, oy);
        ctx.lineTo(cx - s * 0.35, oy - s * 0.4);
        ctx.lineTo(cx - s * 0.1, oy);
        ctx.lineTo(cx - s * 0.35, oy + s * 0.4);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#f2e9e4';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText((side < 0 ? '◀ LEFT' : 'RIGHT ▶'), cx, cy + size * 0.95);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#ffc857';
    ctx.fillText(deg + '°', cx, cy + size * 1.15);
    ctx.fillStyle = '#2a2030';
    ctx.fillRect(cx - 40, cy + size * 1.28, 80, 6);
    ctx.fillStyle = side < 0 ? '#00e5ff' : '#ff2d55';
    ctx.fillRect(cx - 40, cy + size * 1.28, 80 * prox, 6);
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  };

  Hud.prototype.drawMinimap = function (state) {
    var path = (state.world && state.world.path) || state.path;
    if (!path || !path.points || !state.player) return;
    var ctx = this.ctx, w = this.w, h = this.h;
    var size = 150;
    var mx = w - size - 16;
    var my = 112;
    this.panel(mx, my, size, size + 22, 0.82);
    ctx.fillStyle = '#8a7a88';
    ctx.font = '9px monospace';
    ctx.fillText('MAP', mx + 8, my + 12);

    var pts = path.points;
    var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (var i = 0; i < pts.length; i += 2) {
      minX = Math.min(minX, pts[i].x); maxX = Math.max(maxX, pts[i].x);
      minZ = Math.min(minZ, pts[i].z); maxZ = Math.max(maxZ, pts[i].z);
    }
    var span = Math.max(maxX - minX, maxZ - minZ, 40);
    var midX = (minX + maxX) * 0.5, midZ = (minZ + maxZ) * 0.5;
    minX = midX - span * 0.55; maxX = midX + span * 0.55;
    minZ = midZ - span * 0.55; maxZ = midZ + span * 0.55;
    var pad = 14;
    var mapTop = my + 18;
    var mapH = size - 8;
    function tx(x, z) {
      return {
        x: mx + pad + (x - minX) / (maxX - minX || 1) * (size - pad * 2),
        y: mapTop + pad + (1 - (z - minZ) / (maxZ - minZ || 1)) * (mapH - pad * 2),
      };
    }

    ctx.strokeStyle = '#4a4058';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    var step = Math.max(1, Math.floor(pts.length / 100));
    for (var j = 0; j < pts.length; j += step) {
      var t = tx(pts[j].x, pts[j].z);
      if (j === 0) ctx.moveTo(t.x, t.y); else ctx.lineTo(t.x, t.y);
    }
    var te = tx(pts[pts.length - 1].x, pts[pts.length - 1].z);
    ctx.lineTo(te.x, te.y);
    ctx.stroke();
    ctx.strokeStyle = '#ff2d55';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    var ts = tx(pts[0].x, pts[0].z);
    ctx.fillStyle = '#ff2d55';
    ctx.beginPath();
    ctx.arc(ts.x, ts.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 8px monospace';
    ctx.fillText('S', ts.x - 3, ts.y - 7);
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(te.x, te.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('F', te.x - 3, te.y - 7);

    var rivals = state.rivals || [];
    for (var ri = 0; ri < rivals.length; ri++) {
      var r = rivals[ri];
      if (r.dead || !r.pos) continue;
      var rp = tx(r.pos.x, r.pos.z);
      ctx.fillStyle = '#ff2d55';
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, 4, 0, Math.PI * 2);
      ctx.fill();
      if (r.yaw != null) {
        ctx.strokeStyle = '#ff6b7a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(rp.x, rp.y);
        ctx.lineTo(rp.x + Math.sin(r.yaw) * 7, rp.y - Math.cos(r.yaw) * 7);
        ctx.stroke();
      }
    }

    var pp = tx(state.player.pos.x, state.player.pos.z);
    var pyaw = state.player.yaw || 0;
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.moveTo(pp.x + Math.sin(pyaw) * 8, pp.y - Math.cos(pyaw) * 8);
    ctx.lineTo(pp.x + Math.sin(pyaw + 2.5) * 5, pp.y - Math.cos(pyaw + 2.5) * 5);
    ctx.lineTo(pp.x + Math.sin(pyaw - 2.5) * 5, pp.y - Math.cos(pyaw - 2.5) * 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '8px monospace';
    ctx.fillStyle = '#ff9f1c';
    ctx.fillText('YOU', mx + 8, my + size + 14);
    ctx.fillStyle = '#ff2d55';
    ctx.fillText('FOE', mx + 40, my + size + 14);
    ctx.fillStyle = '#ff2d55';
    ctx.fillText('S', mx + 80, my + size + 14);
    ctx.fillStyle = '#00e5ff';
    ctx.fillText('F', mx + 96, my + size + 14);
  };

  Hud.prototype.drawResults = function (state) {
    var ctx = this.ctx, w = this.w, h = this.h;
    this.panel(w * 0.15, h * 0.12, w * 0.7, h * 0.76, 0.85);
    ctx.textAlign = 'center';
    var won = state.outcome === 'win';
    ctx.fillStyle = won ? '#00e5ff' : '#ff2d55';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(won ? (state.freedomWin ? 'FREEDOM WITHIN REACH' : 'NIGHT CLEARED') : 'YOU WRECKED', w / 2, h * 0.22);
    ctx.fillStyle = '#f2e9e4';
    ctx.font = '14px monospace';
    ctx.fillText(state.outcomeReason || '', w / 2, h * 0.28);
    ctx.fillStyle = '#ff9f1c';
    ctx.fillText('SCRAP EARNED +' + state.runScrap + '   TOTAL ' + state.meta.scrap, w / 2, h * 0.34);
    ctx.fillStyle = '#8a7a88';
    ctx.font = '13px monospace';
    ctx.fillText('Quick global boosts (or tune deep in GARAGE with U)', w / 2, h * 0.4);
    var choices = state.pendingChoices || [];
    for (var i = 0; i < choices.length; i++) {
      var c = choices[i];
      var y = h * 0.48 + i * 48;
      ctx.fillStyle = c.maxed ? '#2a2030' : 'rgba(255,45,85,0.15)';
      ctx.fillRect(w * 0.28, y - 20, w * 0.44, 40);
      ctx.strokeStyle = '#ff2d55';
      ctx.strokeRect(w * 0.28, y - 20, w * 0.44, 40);
      ctx.fillStyle = '#f2e9e4';
      ctx.font = '16px monospace';
      ctx.fillText((i + 1) + '  ' + c.label + '  LV' + c.level + (c.maxed ? ' MAX' : '  ' + c.cost + ' scrap'), w / 2, y + 5);
    }
    ctx.fillStyle = '#00e5ff';
    ctx.font = '16px monospace';
    ctx.fillText('ENTER — GARAGE (full tune bay)', w / 2, h * 0.78);
    ctx.textAlign = 'left';
  };

  Hud.prototype.drawFreedom = function (state) {
    var ctx = this.ctx, w = this.w, h = this.h;
    ctx.fillStyle = 'rgba(5,4,10,0.75)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('THE GATE OPENS', w / 2, h * 0.4);
    ctx.fillStyle = '#f2e9e4';
    ctx.font = '16px monospace';
    ctx.fillText('You bought a night of freedom. The overlords will reset the board.', w / 2, h * 0.5);
    ctx.fillStyle = '#ff9f1c';
    ctx.fillText('ENTER — restart the nights', w / 2, h * 0.6);
    ctx.textAlign = 'left';
  };

  GAME.Hud = Hud;
})();
