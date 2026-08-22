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
    var t = performance.now() / 1000;
    var pulse = 0.55 + 0.45 * Math.sin(t * 2.4);
    // Soft vignette — sell Night Circuit, not a debug dump (v307)
    var grd = ctx.createRadialGradient(w / 2, h * 0.36, h * 0.06, w / 2, h / 2, h * 0.85);
    grd.addColorStop(0, 'rgba(40,12,28,' + (0.1 + pulse * 0.08) + ')');
    grd.addColorStop(0.5, 'rgba(5,4,10,0.22)');
    grd.addColorStop(1, 'rgba(5,4,10,0.58)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    // Wordmark
    ctx.fillStyle = '#ff2d55';
    ctx.font = 'bold ' + Math.floor(w * 0.052) + 'px monospace';
    ctx.shadowColor = '#ff2d55';
    ctx.shadowBlur = 20 + pulse * 14;
    ctx.fillText('TWISTED SPEED', w / 2, h * 0.28);
    ctx.shadowBlur = 0;
    // Series line — large, cyan
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold ' + Math.floor(w * 0.022) + 'px monospace';
    ctx.fillText('NIGHT CIRCUIT', w / 2, h * 0.36);
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold ' + Math.floor(w * 0.016) + 'px monospace';
    ctx.fillText('BUILD 399', w / 2, h * 0.395);
    ctx.fillStyle = '#8a7a88';
    ctx.font = Math.floor(w * 0.014) + 'px monospace';
    ctx.fillText('PAROLE COMBAT RACING', w / 2, h * 0.435);
    // Tagline — readable on 1080p
    ctx.fillStyle = '#f2e9e4';
    ctx.font = 'bold ' + Math.floor(Math.max(16, w * 0.02)) + 'px monospace';
    ctx.fillText('WIN FREEDOM. OR BECOME THE HIGHLIGHT REEL.', w / 2, h * 0.5);
    // CTA — keyboard or click
    ctx.fillStyle = '#ff9f1c';
    ctx.font = 'bold ' + Math.floor(w * 0.022) + 'px monospace';
    ctx.shadowColor = 'rgba(255,159,28,0.45)';
    ctx.shadowBlur = 8 + pulse * 10;
    ctx.fillText('ENTER / CLICK  —  GARAGE', w / 2, h * 0.6);
    ctx.shadowBlur = 0;
    // One-line controls (full map lives in race HUD)
    ctx.fillStyle = '#7a6a78';
    ctx.font = Math.floor(w * 0.012) + 'px monospace';
    ctx.fillText('WASD drive · Space drift · Q nitro · J guns · K rockets', w / 2, h * 0.7);
    ctx.fillStyle = '#5a4a58';
    ctx.font = Math.floor(w * 0.011) + 'px monospace';
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
    // DIRECTOR LOCK: roster LEFT, rotating car CENTER (clear), stats/details RIGHT
    // v361: slightly narrower side panels so 3D car has a real clear band
    var pad = 24;
    var leftW = Math.min(248, Math.floor(w * 0.22));
    var rightW = Math.min(340, Math.floor(w * 0.28));
    var rx = w - pad - rightW;
    this.panel(pad, pad, leftW, h - pad * 2, 0.72);
    ctx.fillStyle = '#ff2d55';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('GARAGE', pad + 14, pad + 30);
    ctx.fillStyle = '#8a7a88';
    ctx.font = '11px monospace';
    ctx.fillText('Pick a sentenced rig.', pad + 14, pad + 50);
    ctx.fillStyle = '#ff9f1c';
    ctx.font = '11px monospace';
    ctx.fillText('SCRAP ' + state.meta.scrap + '  ·  N' + state.meta.stage, pad + 14, pad + 70);

    var rowStart = pad + 88;
    var rowBudget = h - rowStart - 72;
    var rowH = Math.max(38, Math.min(50, Math.floor(rowBudget / Math.max(6, cars.length))));
    var rowW = leftW - 28;
    var carHits = [];
    for (var i = 0; i < cars.length; i++) {
      var y = rowStart + i * rowH;
      if (y + rowH > h - 60) break;
      var active = i === sel;
      carHits.push({ i: i, x: pad + 14, y: y, w: rowW, h: rowH - 6 });
      ctx.fillStyle = active ? 'rgba(0,229,255,0.18)' : 'rgba(20,16,28,0.4)';
      ctx.fillRect(pad + 14, y, rowW, rowH - 6);
      ctx.strokeStyle = active ? '#00e5ff' : 'rgba(58,48,64,0.7)';
      ctx.lineWidth = active ? 2 : 1;
      ctx.strokeRect(pad + 14, y, rowW, rowH - 6);
      ctx.lineWidth = 1;
      ctx.fillStyle = '#' + (cars[i].accent != null ? cars[i].accent.toString(16).padStart(6, '0') : 'ff2d55');
      ctx.fillRect(pad + 14, y, 5, rowH - 6);
      ctx.fillStyle = active ? '#00e5ff' : '#f2e9e4';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(cars[i].name, pad + 26, y + 17);
      ctx.fillStyle = active ? '#a898a0' : '#6a5a68';
      ctx.font = '10px monospace';
      ctx.fillText(cars[i].special || cars[i].role, pad + 26, y + 32);
    }

    // Details + stats — RIGHT of the spinning vehicle (center stays clear)
    this.panel(rx, pad, rightW, h - pad * 2 - 72, 0.78);
    var tx = rx + 20;
    ctx.fillStyle = '#f2e9e4';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(car.name, tx, pad + 44);
    ctx.fillStyle = '#00e5ff';
    ctx.font = '13px monospace';
    ctx.fillText(car.role, tx, pad + 68);
    ctx.fillStyle = '#c8b8c0';
    ctx.font = '12px monospace';
    var flavor = car.flavor || (car.special + ' is the sentence.');
    var maxCh = 36;
    if (flavor.length > maxCh) {
      var cut = flavor.lastIndexOf(' ', maxCh);
      if (cut < 14) cut = maxCh;
      ctx.fillText(flavor.slice(0, cut), tx, pad + 96);
      ctx.fillText(flavor.slice(cut).trim(), tx, pad + 114);
    } else {
      ctx.fillText(flavor, tx, pad + 96);
    }
    ctx.fillStyle = '#ff9f1c';
    ctx.font = '12px monospace';
    ctx.fillText('SPECIAL', tx, pad + 144);
    ctx.fillStyle = '#f2e9e4';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(car.special || '—', tx, pad + 164);
    ctx.fillStyle = '#a898a0';
    ctx.font = '12px monospace';
    ctx.fillText(car.specialDesc || '', tx, pad + 184);

    var Wep = car.weapons || {};
    var kit = [];
    if (Wep.mg) kit.push(Wep.mgLabel || 'MG');
    if (Wep.rocket) kit.push(Wep.rocketLabel || 'ROCKET');
    if (Wep.mine) kit.push(Wep.mineLabel || 'MINE');
    ctx.fillStyle = '#8a7a88';
    ctx.font = '11px monospace';
    ctx.fillText('KIT  ' + (kit.length ? kit.join(' · ') : '—'), tx, pad + 208);

    var build = (state.meta.builds && state.meta.builds[car.id]) || { levels: {}, unlocks: {} };
    var st = effectiveStats(car, build);
    var barW = rightW - 48;
    var rows = [
      { k: 'SPD', v: st.spd, c: '#00e5ff' },
      { k: 'ARM', v: st.arm, c: '#ff2d55' },
      { k: 'FIRE', v: st.fire, c: '#ff9f1c' },
      { k: 'HAND', v: st.hand, c: '#39ff14' },
    ];
    var sy = pad + 232;
    for (var si = 0; si < rows.length; si++) {
      var row = rows[si];
      var yy = sy + si * 36;
      ctx.fillStyle = '#8a7a88';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(row.k, tx, yy);
      this.bar(tx + 48, yy - 11, barW - 72, 12, U.clamp(row.v / 5, 0, 1), row.c);
      ctx.fillStyle = '#f2e9e4';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(String(row.v), tx + barW - 16, yy);
    }

    var goY = h - pad - 52;
    var goW = Math.floor((rightW - 12) * 0.62);
    var goX = rx;
    ctx.fillStyle = 'rgba(255,159,28,0.22)';
    ctx.fillRect(goX, goY, goW, 48);
    ctx.strokeStyle = '#ff9f1c';
    ctx.strokeRect(goX, goY, goW, 48);
    ctx.fillStyle = '#ff9f1c';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('ENTER  —  MAP', goX + 16, goY + 30);

    var shopX = goX + goW + 10;
    var shopW = rightW - goW - 10;
    ctx.fillStyle = 'rgba(255,45,85,0.12)';
    ctx.fillRect(shopX, goY, shopW, 48);
    ctx.strokeStyle = 'rgba(255,45,85,0.45)';
    ctx.strokeRect(shopX, goY, shopW, 48);
    ctx.fillStyle = '#ff2d55';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('U  TUNE', shopX + 18, goY + 30);

    ctx.fillStyle = '#5a4a58';
    ctx.font = '11px monospace';
    ctx.fillText('← → click rig   ·   [ ] difficulty   ·   O quality', pad + 14, h - 18);

    state._garageHit = {
      cars: carHits,
      map: { x: goX, y: goY, w: goW, h: 48 },
      shop: { x: shopX, y: goY, w: shopW, h: 48 },
    };
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

  /** Full tuning bay for selected car — click rows + BUY (v309) */
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

    // Heavy dim left/center so shop text wins over 3D car
    ctx.fillStyle = 'rgba(5,4,10,0.72)';
    ctx.fillRect(0, 0, w, h);
    var clearX = Math.floor(w * 0.72);
    var fade = ctx.createLinearGradient(clearX - 80, 0, w, 0);
    fade.addColorStop(0, 'rgba(5,4,10,0.72)');
    fade.addColorStop(0.45, 'rgba(5,4,10,0.35)');
    fade.addColorStop(1, 'rgba(5,4,10,0.12)');
    ctx.fillStyle = fade;
    ctx.fillRect(clearX - 80, 0, w - (clearX - 80), h);

    var shopW = Math.min(w - 48, Math.floor(w * 0.70));
    this.panel(20, 16, shopW, h - 32, 0.92);
    ctx.fillStyle = '#ff2d55';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('TUNE  ·  ' + car.name, 40, 52);
    ctx.fillStyle = '#ff9f1c';
    ctx.font = '14px monospace';
    ctx.fillText('SCRAP ' + state.meta.scrap + '     ESC / click BACK — roster', 40, 78);

    // Category tabs (clickable)
    var tw = Math.min(150, (shopW - 60) / cats.length);
    var catHits = [];
    for (var ci = 0; ci < cats.length; ci++) {
      var cx = 40 + ci * (tw + 8);
      var on = ci === catIdx;
      catHits.push({ i: ci, x: cx, y: 96, w: tw, h: 34 });
      ctx.fillStyle = on ? 'rgba(255,45,85,0.28)' : 'rgba(20,16,28,0.6)';
      ctx.fillRect(cx, 96, tw, 34);
      ctx.strokeStyle = on ? cats[ci].color : '#3a3040';
      ctx.strokeRect(cx, 96, tw, 34);
      ctx.fillStyle = on ? cats[ci].color : '#8a7a88';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(cats[ci].name, cx + 10, 118);
    }

    // Item list — scroll selection into view
    var listX = 40, listY = 148, listW = Math.min(480, Math.floor(shopW * 0.58));
    var maxListH = h - listY - 120;
    var rowH = Math.min(52, Math.max(36, Math.floor(maxListH / Math.min(8, Math.max(1, items.length)))));
    var visibleN = Math.max(1, Math.floor(maxListH / rowH));
    var scroll = 0;
    if (items.length > visibleN) {
      scroll = Math.max(0, Math.min(itemIdx - (visibleN - 2), items.length - visibleN));
    }
    var rowHits = [];
    for (var i = scroll; i < items.length && i < scroll + visibleN; i++) {
      var it = items[i];
      var y = listY + (i - scroll) * rowH;
      var sel = i === itemIdx;
      rowHits.push({ i: i, x: listX, y: y, w: listW, h: rowH - 4 });
      var levels = (build.levels && build.levels[it.id]) | 0;
      var unlocked = !!(build.unlocks && build.unlocks[it.id]);
      var maxed = it.type === 'unlock' ? unlocked : levels >= (it.max | 1);
      var cost = it.type === 'unlock' ? (it.cost | 0) : (it.costBase | 0) + levels * (it.costStep | 0);
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

    // Detail + BUY
    var detX = listX + listW + 16;
    var detW = Math.max(160, shopW - (detX - 20) - 16);
    this.panel(detX, 148, detW, h - 220, 0.82);
    var focus = items[itemIdx];
    var buyCost = 0;
    var canBuy = false;
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
        buyCost = (focus.costBase | 0) + ((build.levels && build.levels[focus.id]) | 0) * (focus.costStep | 0);
        canBuy = ((build.levels && build.levels[focus.id]) | 0) < (focus.max | 1);
      } else {
        var owned = !!(build.unlocks && build.unlocks[focus.id]);
        ctx.fillText(owned ? 'INSTALLED' : 'NOT INSTALLED', detX + 16, 280);
        buyCost = focus.cost | 0;
        canBuy = !owned;
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

    // BUY + BACK hitboxes
    var buyX = detX + 12, buyY = h - 118, buyW = Math.min(detW - 24, 220), buyH = 48;
    ctx.fillStyle = canBuy && state.meta.scrap >= buyCost ? 'rgba(255,159,28,0.3)' : 'rgba(40,32,48,0.6)';
    ctx.fillRect(buyX, buyY, buyW, buyH);
    ctx.strokeStyle = canBuy ? '#ff9f1c' : '#3a3040';
    ctx.lineWidth = 2;
    ctx.strokeRect(buyX, buyY, buyW, buyH);
    ctx.lineWidth = 1;
    ctx.fillStyle = canBuy && state.meta.scrap >= buyCost ? '#ff9f1c' : '#6a5a68';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(canBuy ? ('BUY  ·  ' + buyCost + ' SCRAP') : 'BUY', buyX + 16, buyY + 30);

    var backX = 40, backY = h - 70, backW = 160, backH = 36;
    ctx.fillStyle = 'rgba(0,229,255,0.12)';
    ctx.fillRect(backX, backY, backW, backH);
    ctx.strokeStyle = '#00e5ff';
    ctx.strokeRect(backX, backY, backW, backH);
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('← ROSTER', backX + 28, backY + 24);

    ctx.fillStyle = '#6a5a68';
    ctx.font = '12px monospace';
    ctx.fillText('Wheel list  ·  click part  ·  BUY / ENTER  ·  tabs bay', 220, h - 48);

    state._shopHit = {
      cats: catHits,
      rows: rowHits,
      buy: { x: buyX, y: buyY, w: buyW, h: buyH },
      back: { x: backX, y: backY, w: backW, h: backH },
    };
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
    this.panel(w * 0.15, h * 0.1, w * 0.7, h * 0.8, 0.82);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('SELECT COURSE', w / 2, h * 0.18);
    ctx.fillStyle = '#8a7a88';
    ctx.font = '13px monospace';
    ctx.fillText('Night Circuit — one road. Finish or farm scrap.', w / 2, h * 0.225);

    var diffId = state.meta.difficulty || 'adventurous';
    var diffs = ['chill', 'adventurous', 'brutal'];
    var dw = 160;
    var dx0 = w / 2 - (diffs.length * dw) / 2;
    var diffHits = [];
    var diffY = h * 0.255;
    var diffH = 48;
    for (var di = 0; di < diffs.length; di++) {
      var ddef = GAME.config.difficulties[diffs[di]];
      var on = diffs[di] === diffId;
      var bx = dx0 + di * dw;
      var drect = { id: diffs[di], x: bx, y: diffY, w: dw - 12, h: diffH };
      diffHits.push(drect);
      var dcol = diffs[di] === 'chill' ? '#39ff14' : (diffs[di] === 'brutal' ? '#ff2d55' : '#00e5ff');
      ctx.fillStyle = on ? 'rgba(255,45,85,0.28)' : 'rgba(20,16,28,0.55)';
      ctx.fillRect(drect.x, drect.y, drect.w, drect.h);
      ctx.strokeStyle = on ? dcol : '#3a3040';
      ctx.lineWidth = on ? 2.5 : 1;
      ctx.strokeRect(drect.x, drect.y, drect.w, drect.h);
      ctx.lineWidth = 1;
      ctx.fillStyle = on ? dcol : '#8a7a88';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(ddef.name, bx + (dw - 12) / 2, diffY + 22);
      ctx.fillStyle = on ? '#c8b8c0' : '#5a4a58';
      ctx.font = '10px monospace';
      var rMul = ddef.rivalCountMul != null ? ddef.rivalCountMul : 1;
      ctx.fillText('×' + rMul.toFixed(2) + ' pack', bx + (dw - 12) / 2, diffY + 38);
    }
    ctx.fillStyle = '#8a7a88';
    ctx.font = '12px monospace';
    ctx.fillText((GAME.config.difficulties[diffId] || {}).desc || '', w / 2, diffY + diffH + 18);
    ctx.fillStyle = '#5a4a58';
    ctx.font = '11px monospace';
    ctx.fillText('Click difficulty — sticks for next race', w / 2, diffY + diffH + 34);

    // Circuit rows (Gate C: one map) — clickable
    var rowHits = [];
    for (var i = 0; i < maps.length; i++) {
      var y = h * 0.46 + i * 76;
      var rx = w * 0.22, ry = y - 30, rw = w * 0.56, rh = 64;
      rowHits.push({ i: i, x: rx, y: ry, w: rw, h: rh });
      var active = i === sel;
      ctx.fillStyle = active ? 'rgba(255,45,85,0.22)' : 'rgba(20,16,28,0.45)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = active ? '#ff2d55' : '#3a3040';
      ctx.lineWidth = active ? 2 : 1;
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.lineWidth = 1;
      ctx.fillStyle = active ? '#ff2d55' : '#f2e9e4';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(maps[i].name, w / 2, y);
      ctx.fillStyle = '#8a7a88';
      ctx.font = '12px monospace';
      ctx.fillText(maps[i].desc + '  ·  START → FINISH', w / 2, y + 22);
    }

    // Big START hitbox
    var sx = w * 0.3, sy = h * 0.72, sw = w * 0.4, sh = 56;
    ctx.fillStyle = 'rgba(255,159,28,0.28)';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = '#ff9f1c';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ff9f1c';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('START NIGHT ' + state.meta.stage + '  ·  CLICK / ENTER', w / 2, sy + 36);

    ctx.fillStyle = '#5a4a58';
    ctx.font = '11px monospace';
    ctx.fillText('Click course or START  ·  [ ] difficulty', w / 2, h * 0.86);
    ctx.textAlign = 'left';

    state._mapHit = {
      rows: rowHits,
      diffs: diffHits,
      start: { x: sx, y: sy, w: sw, h: sh },
    };
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
    // Hood MG muzzle — body hidden so world flash alone can vanish (v302)
    if (state.camMode === 'hood' && p._hoodMuzzleT > 0) {
      var hm = Math.min(1, p._hoodMuzzleT / 0.08);
      var mx = w * 0.5, my = h * 0.58;
      var mg = ctx.createRadialGradient(mx, my, 4, mx, my, w * 0.22);
      mg.addColorStop(0, 'rgba(255,246,180,' + (0.85 * hm) + ')');
      mg.addColorStop(0.35, 'rgba(255,180,40,' + (0.45 * hm) + ')');
      mg.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = mg;
      ctx.fillRect(mx - w * 0.22, my - w * 0.18, w * 0.44, w * 0.36);
    }

    // Armor + run scrap — high contrast for first-minute read (v303)
    var hasShieldHud = (p.maxShield > 0) || (p.shield > 0);
    this.panel(16, 16, 228, hasShieldHud ? 92 : 72, 0.88);
    ctx.fillStyle = '#f2e9e4';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('ARMOR', 24, 32);
    ctx.fillStyle = p.hp / p.maxHp > 0.35 ? '#ff2d55' : '#ff9f1c';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(Math.round(p.hp) + '/' + Math.round(p.maxHp), 88, 32);
    this.bar(24, 40, 200, 12, p.hp / p.maxHp, p.hp / p.maxHp > 0.35 ? '#ff2d55' : '#ff9f1c');
    if (hasShieldHud) {
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('SHIELD', 24, 66);
      this.bar(80, 58, 144, 8, p.maxShield > 0 ? p.shield / p.maxShield : 0, '#00e5ff');
    }
    ctx.fillStyle = '#ffc857';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('SCRAP ' + (state.runScrap | 0), 24, hasShieldHud ? 86 : 64);

    this.panel(16, h - 100, 160, 84, 0.82);
    ctx.fillStyle = '#c8b8c0';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('SPEED', 24, h - 80);
    ctx.fillStyle = p.nitroActive ? '#00e5ff' : '#ff4d6a';
    ctx.font = 'bold 34px monospace';
    // World units used to display as km/h (*4.4). Director lock: MPH.
    ctx.fillText(String(Math.round(Math.abs(p.speed) * 4.4 * 0.621371)), 24, h - 42);
    ctx.fillStyle = '#a09098';
    ctx.font = '12px monospace';
    ctx.fillText('mph', 118, h - 42);

    // Nitro tank — thicker + drift-fill pip so first-minute charge reads (v314)
    this.panel(16, h - 168, 168, 60, 0.82);
    var nMax = p.nitroMax != null ? p.nitroMax : 1;
    var nFrac = nMax > 0 ? U.clamp(p.nitro / nMax, 0, 1) : 0;
    var driftGlow = p._driftFillGlow || 0;
    var fillPip = p._driftFillPip || 0;
    ctx.fillStyle = p.nitroActive ? '#00e5ff' : (driftGlow > 0.05 ? '#7af0ff' : '#8a7a88');
    ctx.font = 'bold 11px monospace';
    ctx.fillText(p.nitroActive ? 'NITRO BURN' : (p.drifting && fillPip > 0.05 ? 'NITRO · DRIFT FILL' : 'NITRO'), 24, h - 148);
    // Main bar
    this.bar(24, h - 140, 140, 12, nFrac, p.nitroActive ? '#00e5ff' : '#4ad4ff');
    // Cyan drip pip on the leading edge while drift is charging
    if (fillPip > 0.04 || driftGlow > 0.04) {
      var pipX = 24 + 140 * nFrac;
      ctx.fillStyle = 'rgba(0,229,255,' + (0.45 + 0.55 * Math.min(1, fillPip + driftGlow)) + ')';
      ctx.beginPath();
      ctx.arc(pipX, h - 134, 5 + fillPip * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('+' + Math.round(fillPip * 12), pipX + 8, h - 130);
    }
    // Segment ticks so level change is obvious
    ctx.strokeStyle = 'rgba(5,4,10,0.55)';
    ctx.lineWidth = 1;
    for (var nt = 1; nt < 4; nt++) {
      var tx = 24 + (140 * nt) / 4;
      ctx.beginPath();
      ctx.moveTo(tx, h - 140);
      ctx.lineTo(tx, h - 128);
      ctx.stroke();
    }
    ctx.fillStyle = (state._wardenEye || p.heat > 0.72) ? '#ff2d55' : '#8a7a88';
    ctx.font = (state._wardenEye || p.heat > 0.72) ? 'bold 9px monospace' : '9px monospace';
    ctx.fillText((state._wardenEye || p.heat > 0.72) ? 'WARDEN EYE' : 'WARDEN', 24, h - 116);
    var heatCol = p.heat > 0.72 ? '#ff2d55' : (p.heat > 0.4 ? '#ff9f1c' : '#39ff14');
    this.bar(24, h - 110, 140, 6, p.heat, heatCol);
    if (state._wardenEye || p.heat > 0.72) {
      ctx.strokeStyle = '#ff2d55';
      ctx.lineWidth = 2;
      ctx.strokeRect(22, h - 116, 134, 12);
      ctx.lineWidth = 1;
    }

    var W = (GAME.vehicles.weapons && p.def) ? (p._wep || GAME.vehicles.weapons(p.def)) : { mg: true, rocket: true, mine: true, mgLabel: 'GUNS', rocketLabel: 'ROCKET', mineLabel: 'MINE' };
    // Denser panel so rain / dual-mutator grade doesn't wash weapon + special text
    this.panel(w / 2 - 175, h - 58, 350, 44, 0.88);
    ctx.font = 'bold 11px monospace';
    function wepCol(has, cd) {
      if (!has) return '#444';
      return cd > 0 ? '#6a6070' : null;
    }
    // MG overheat: red lockout on the J chip (toast only fires once at onset) (v316)
    if (W.mg && (p.mgOverT > 0)) ctx.fillStyle = '#ff2d55';
    else ctx.fillStyle = wepCol(W.mg, p.mgCd) || '#ffe66d';
    ctx.fillText('J ' + (W.mg ? ((p.mgOverT > 0) ? 'OVERHEAT' : (W.mgLabel || 'GUNS')) : '—'), w / 2 - 160, h - 32);
    ctx.fillStyle = wepCol(W.rocket, p.rocketCd) || '#ff8a4a';
    ctx.fillText('K ' + (W.rocket ? (W.rocketLabel || 'ROCKET') : '—'), w / 2 - 72, h - 32);
    ctx.fillStyle = wepCol(W.mine, p.mineCd) || '#4af0ff';
    ctx.fillText('L ' + (W.mine ? (W.mineLabel || 'MINE') : '—'), w / 2 + 28, h - 32);
    // Special: name + ready/CD — high contrast; ready pulse so I-key isn't missed (v294/v303)
    var specName = (p.def && p.def.special) ? String(p.def.special) : 'SPECIAL';
    if (p.def && p.def.id === 'needle') specName = 'VEIN';
    else if (p.def && p.def.id === 'choir') specName = 'SERMON';
    else if (p.def && p.def.id === 'mausoleum') specName = 'RITES';
    else if (p.def && p.def.id === 'vesper') specName = 'EMP';
    else if (p.def && p.def.id === 'razorback') specName = 'TIRES';
    else if (p.def && p.def.id === 'marrow') specName = 'BONES';
    else if (specName.length > 12) specName = specName.slice(0, 11) + '…';
    var specReady = !(p.specialCd > 0) && !(p._specialWindup > 0);
    // v366: brighter pulse when pack is in special theater
    var packNear = false;
    if (specReady && state.rivals) {
      for (var rni = 0; rni < state.rivals.length; rni++) {
        var rn = state.rivals[rni];
        if (rn && !rn.dead && rn.pos && p.pos && rn.pos.distanceTo(p.pos) < 48) {
          packNear = true;
          break;
        }
      }
    }
    var specPulse = specReady
      ? (packNear ? (0.75 + 0.25 * Math.sin((state.raceTime || 0) * 10)) : (0.7 + 0.3 * Math.sin((state.raceTime || 0) * 7)))
      : 1;
    // Ready chip behind special so it reads on rain/grade
    if (specReady) {
      ctx.fillStyle = packNear
        ? 'rgba(255,45,85,' + (0.35 + 0.15 * Math.sin((state.raceTime || 0) * 10)) + ')'
        : 'rgba(255,45,130,' + (0.22 + 0.12 * Math.sin((state.raceTime || 0) * 7)) + ')';
      ctx.fillRect(w / 2 + 88, h - 48, 92, 28);
    }
    ctx.fillStyle = specReady ? (packNear ? '#ffd0a8' : '#ff6bb5') : '#d0c0c8';
    ctx.font = specReady ? 'bold 13px monospace' : 'bold 11px monospace';
    ctx.globalAlpha = specPulse;
    if (specReady) {
      ctx.fillText('I ' + specName + (packNear ? '!' : ''), w / 2 + 96, h - 30);
    } else {
      var scd = Math.max(0, p.specialCd || 0);
      ctx.fillStyle = '#c8b0b8';
      ctx.fillText('READY IN ' + scd.toFixed(1) + 's', w / 2 + 78, h - 30);
    }
    ctx.globalAlpha = 1;

    // Place — larger, high-contrast chip (v303 first-minute)
    var place = state._displayPlace != null ? state._displayPlace : 1;
    var aliveR = state._aliveCount != null ? state._aliveCount : 1;
    if (aliveR < 1) {
      aliveR = 1;
      (state.rivals || []).forEach(function (r) { if (!r.dead) aliveR++; });
    }
    this.panel(w / 2 - 64, 48, 128, 44, 0.88);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('PLACE', w / 2, 62);
    ctx.fillStyle = '#f2e9e4';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('P' + place + '/' + aliveR, w / 2, 84);
    ctx.textAlign = 'left';

    // EMP banner — full 3s disable must read on dim Night 2 (v281)
    if (state._empHudT > 0) {
      var empLeft = state._empHudT;
      var empHits = state._empHitN | 0;
      this.panel(w / 2 - 120, 92, 240, 28, 0.88);
      ctx.fillStyle = '#d070ff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        'EMP ' + empLeft.toFixed(1) + 's' + (empHits ? (' · ' + empHits + ' DARK') : ''),
        w / 2,
        111
      );
      ctx.textAlign = 'left';
      // purple edge flash
      ctx.strokeStyle = 'rgba(180,77,255,' + (0.35 + 0.35 * Math.sin((state.raceTime || 0) * 12)) + ')';
      ctx.lineWidth = 2;
      ctx.strokeRect(w / 2 - 120, 92, 240, 28);
      ctx.lineWidth = 1;
    }

    // Kill feed — left of minimap so it doesn't cover place/map (v304/v359)
    if (state.killFeed && state.killFeed.length) {
      var feedX = w - 178;
      var feedY0 = 100;
      for (var ki = 0; ki < state.killFeed.length; ki++) {
        var kf = state.killFeed[ki];
        var fade = Math.max(0.25, Math.min(1, kf.t / 0.55));
        var fresh = ki === 0 && (kf.t || 0) > 2.4;
        ctx.globalAlpha = fade;
        // Chip behind each line so rain/grade doesn't wash multi-kills
        var tw = Math.min(248, 14 + (kf.text ? kf.text.length : 8) * 7.4);
        var chipH = fresh ? 24 : 20;
        ctx.fillStyle = fresh
          ? 'rgba(40,8,18,' + (0.88 * fade) + ')'
          : 'rgba(8,6,14,' + (0.74 * fade) + ')';
        ctx.fillRect(feedX - tw - 8, feedY0 + ki * 24 - 14, tw + 12, chipH);
        if (fresh) {
          ctx.strokeStyle = 'rgba(255,77,106,' + (0.7 * fade) + ')';
          ctx.strokeRect(feedX - tw - 8, feedY0 + ki * 24 - 14, tw + 12, chipH);
        }
        ctx.fillStyle = fresh ? '#ffd0a8' : (ki === 0 ? '#ff4d6a' : '#ff2d55');
        ctx.font = fresh ? 'bold 14px monospace' : (ki === 0 ? 'bold 13px monospace' : '12px monospace');
        ctx.textAlign = 'right';
        ctx.fillText(kf.text, feedX, feedY0 + ki * 24);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      }
    }

    // Top-right race card: one clean chip row (dual mutators used to fight difficulty line)
    var muts = state.mutators || [];
    var chipH = muts.length > 1 ? 102 : 90;
    this.panel(w - 200, 16, 184, chipH, 0.72);
    var dRace = (GAME.config.difficulties && GAME.config.difficulties[state.meta.difficulty || 'adventurous']) || { name: 'ADVENTUROUS' };
    ctx.fillStyle = '#8a7a88';
    ctx.font = '10px monospace';
    ctx.fillText('NIGHT ' + state.meta.stage + '/' + GAME.config.stageCount, w - 188, 32);
    ctx.fillStyle = (state.meta.difficulty === 'chill') ? '#39ff14' : (state.meta.difficulty === 'brutal' ? '#ff2d55' : '#00e5ff');
    ctx.font = '9px monospace';
    ctx.fillText(dRace.name, w - 100, 32);
    // Mutator chips — single row, never stacked over difficulty
    var chipY = 42;
    if (muts.length) {
      var chipX = w - 188;
      for (var mi = 0; mi < muts.length && mi < 2; mi++) {
        var mName = muts[mi].name || '';
        if (mName.length > 14) mName = mName.slice(0, 13) + '…';
        var mW = Math.min(86, 10 + mName.length * 6.2);
        ctx.fillStyle = mi === 0 ? 'rgba(255,45,85,0.35)' : 'rgba(255,159,28,0.32)';
        ctx.fillRect(chipX, chipY - 10, mW, 14);
        ctx.strokeStyle = mi === 0 ? '#ff2d55' : '#ff9f1c';
        ctx.strokeRect(chipX, chipY - 10, mW, 14);
        ctx.fillStyle = mi === 0 ? '#ff8fa3' : '#ffc857';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(mName, chipX + 4, chipY);
        chipX += mW + 6;
      }
      chipY = 58;
    } else {
      chipY = 48;
    }
    ctx.fillStyle = '#00e5ff';
    ctx.font = '11px monospace';
    ctx.fillText('COURSE', w - 188, chipY);
    var prog = p.progress != null ? p.progress : (p.maxProgress || 0);
    this.bar(w - 188, chipY + 6, 160, 7, prog, '#00e5ff');
    ctx.fillStyle = '#8a7a88';
    ctx.font = '10px monospace';
    ctx.fillText(Math.round(prog * 100) + '% → FINISH   S' + state.runScrap + ' K' + p.kills, w - 188, chipY + 28);

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
      ctx.fillText('◆ DRIFT · FILLING NITRO ◆', w / 2, h * 0.42 + 26);
      ctx.textAlign = 'left';
      ctx.font = '12px monospace';
      ctx.fillText('SLIP', 190, h - 152);
      var slipAmt = Math.min(1, Math.abs(p.slip || 0) / 36);
      this.bar(190, h - 146, 90, 6, slipAmt, '#00e5ff');
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
      // Compact banner — less center-screen blackout in first seconds (v301)
      var a = Math.min(1, state._startBannerT / 2.5);
      var by = h * 0.18;
      ctx.fillStyle = 'rgba(255,45,85,' + (0.16 * a) + ')';
      ctx.fillRect(w * 0.2, by, w * 0.6, 52);
      ctx.strokeStyle = 'rgba(255,45,85,' + (0.55 * a) + ')';
      ctx.strokeRect(w * 0.2, by, w * 0.6, 52);
      ctx.fillStyle = 'rgba(255,45,85,' + a + ')';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▶ START', w / 2, by + 28);
      ctx.font = '12px monospace';
      ctx.fillStyle = 'rgba(242,233,228,' + a + ')';
      ctx.fillText('W throttle · I special · C cam · O quality', w / 2, by + 44);
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
    // Slightly smaller, lower — clears place chip + race card (v304)
    var size = 128;
    var mx = w - size - 16;
    var my = 148;
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
    var won = state.outcome === 'win';
    // Upper band only — leave lower ~42% free for wreck orbit + neon flanks (v379)
    ctx.fillStyle = 'rgba(5,4,10,0.22)';
    ctx.fillRect(0, 0, w, h * 0.54);
    var vg = ctx.createLinearGradient(0, h * 0.46, 0, h * 0.64);
    vg.addColorStop(0, 'rgba(5,4,10,0.22)');
    vg.addColorStop(1, 'rgba(5,4,10,0)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, h * 0.46, w, h * 0.18);

    var panelH = h * 0.48;
    this.panel(w * 0.12, h * 0.03, w * 0.76, panelH, 0.88);
    ctx.textAlign = 'center';
    if (won) {
      var landPulse = 0.1 + 0.06 * Math.sin(performance.now() / 180);
      ctx.fillStyle = 'rgba(0,229,255,' + landPulse + ')';
      ctx.fillRect(w * 0.12, h * 0.03, w * 0.76, panelH);
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(state.freedomWin ? 'PAROLE WITHIN REACH' : 'GATE CLEARED', w / 2, h * 0.085);
      ctx.fillStyle = '#8ad4e8';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(state.freedomWin ? 'LADDER COMPLETE' : 'NIGHT CLEARED', w / 2, h * 0.115);
    } else {
      ctx.fillStyle = '#ff2d55';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('THE WARDEN KEPT YOU', w / 2, h * 0.085);
    }
    // Rig identity so empty elims/specials still read as a car story (v379)
    var carDef = (state.player && state.player.def) || null;
    if (!carDef && state.meta && state.meta.carId && GAME.config && GAME.config.cars) {
      for (var ci0 = 0; ci0 < GAME.config.cars.length; ci0++) {
        if (GAME.config.cars[ci0].id === state.meta.carId) { carDef = GAME.config.cars[ci0]; break; }
      }
    }
    if (carDef) {
      ctx.fillStyle = '#ff9f1c';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(
        String(carDef.name || '').toUpperCase() + '  ·  ' + String(carDef.special || carDef.role || '').toUpperCase(),
        w / 2, h * 0.14
      );
    }
    ctx.fillStyle = '#c8b8c0';
    ctx.font = '12px monospace';
    ctx.fillText(
      state.outcomeReason || (won ? 'Finish paid. Scrap is yours.' : 'THE WARDEN KEPT YOU — scrap still drops.'),
      w / 2, h * 0.165
    );

    var place = state.finishPlace != null ? state.finishPlace : (won ? 1 : '—');
    var elims = (state.runKills != null ? state.runKills : 0) | 0;
    if (state.player && state.player.kills != null) elims = state.player.kills | 0;
    var dmg = Math.round(state.damageTaken || 0);
    var specs = state.specialsLanded || 0;
    var scrap = state.runScrap || 0;
    ctx.fillStyle = '#8a7a88';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('RUN REPORT', w / 2, h * 0.195);
    ctx.fillStyle = '#f2e9e4';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(
      'PLACE  ' + place + '    ELIMS  ' + elims + '    SCRAP  +' + scrap,
      w / 2, h * 0.222
    );
    ctx.fillStyle = '#a09098';
    ctx.font = '11px monospace';
    ctx.fillText('DMG  ' + dmg + '    SPECIALS  ' + specs + '    BANK  ' + (state.meta.scrap | 0), w / 2, h * 0.248);
    if (state.partsRoll && state.partsRoll.length) {
      ctx.fillStyle = '#39ff14';
      ctx.font = '11px monospace';
      ctx.fillText('PARTS · ' + state.partsRoll.join(' · '), w / 2, h * 0.272);
    }

    ctx.fillStyle = '#6a5a68';
    ctx.font = '11px monospace';
    ctx.fillText(
      'Click chip to buy  ·  R retry night  ·  ENTER garage',
      w / 2, h * 0.288
    );

    // Large upgrade chips in a row — easy 1080p click targets (v310)
    var choices = state.pendingChoices || [];
    var choiceHits = [];
    var nCh = Math.max(1, choices.length);
    var chipGap = 12;
    var chipW = Math.min(200, (w * 0.72 - chipGap * (nCh - 1)) / nCh);
    var chipH = 64;
    var rowW = nCh * chipW + (nCh - 1) * chipGap;
    var chipX0 = (w - rowW) / 2;
    var chipY = h * 0.305;
    ctx.textAlign = 'center';
    for (var i = 0; i < choices.length; i++) {
      var c = choices[i];
      var cx = chipX0 + i * (chipW + chipGap);
      choiceHits.push({ i: i, x: cx, y: chipY, w: chipW, h: chipH });
      ctx.fillStyle = c.maxed ? 'rgba(30,24,40,0.9)' : 'rgba(255,45,85,0.28)';
      ctx.fillRect(cx, chipY, chipW, chipH);
      ctx.strokeStyle = c.maxed ? '#3a3040' : '#ff2d55';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(cx, chipY, chipW, chipH);
      ctx.lineWidth = 1;
      ctx.fillStyle = c.maxed ? '#5a4a58' : '#ff2d55';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(String(i + 1), cx + chipW / 2, chipY + 22);
      ctx.fillStyle = '#f2e9e4';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(c.label, cx + chipW / 2, chipY + 40);
      ctx.fillStyle = c.maxed ? '#6a5a68' : '#ffc857';
      ctx.font = '12px monospace';
      ctx.fillText(c.maxed ? 'MAX' : (c.cost + ' SCRAP'), cx + chipW / 2, chipY + 56);
    }
    ctx.textAlign = 'center';

    // Mutator strip — freedom win still fills the band so panel isn't hollow (v379)
    var mutY = h * 0.45;
    if (state.nextMutators && state.nextMutators.length) {
      ctx.fillStyle = 'rgba(255,159,28,0.14)';
      ctx.fillRect(w * 0.22, mutY - 18, w * 0.56, 44);
      ctx.strokeStyle = '#ff9f1c';
      ctx.strokeRect(w * 0.22, mutY - 18, w * 0.56, 44);
      ctx.fillStyle = '#ff9f1c';
      ctx.font = 'bold 13px monospace';
      var nm = state.nextMutators.map(function (m) { return m.name; }).join(' + ');
      var nextLabel = state._nextMutPreview
        ? ('IF YOU CLEAR N' + (state.meta.stage | 0) + ' · ' + nm)
        : ('NEXT NIGHT · ' + nm);
      ctx.fillText(nextLabel, w / 2, mutY);
      ctx.fillStyle = '#c8b8c0';
      ctx.font = '11px monospace';
      ctx.fillText(state.nextMutators[0].desc || '', w / 2, mutY + 16);
    } else if (state.freedomWin) {
      ctx.fillStyle = 'rgba(0,229,255,0.12)';
      ctx.fillRect(w * 0.22, mutY - 18, w * 0.56, 44);
      ctx.strokeStyle = '#00e5ff';
      ctx.strokeRect(w * 0.22, mutY - 18, w * 0.56, 44);
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('PAROLE BOARD RESET', w / 2, mutY);
      ctx.fillStyle = '#8ad4e8';
      ctx.font = '11px monospace';
      ctx.fillText('R restarts Night 1  ·  ENTER garage', w / 2, mutY + 16);
    }

    // Footer always shows R retry (win + lose) — lock v375/v379
    var footY = h * 0.92;
    ctx.fillStyle = 'rgba(5,4,10,0.55)';
    ctx.fillRect(w * 0.2, footY - 18, w * 0.6, 36);
    ctx.fillStyle = '#00e5ff';
    ctx.font = '14px monospace';
    ctx.fillText('ENTER / CLICK — GARAGE    R — RETRY NIGHT', w / 2, footY + 4);
    ctx.textAlign = 'left';

    state._resultsHit = {
      choices: choiceHits,
      footer: { x: w * 0.2, y: footY - 18, w: w * 0.6, h: 36 },
    };
  };

  Hud.prototype.drawFreedom = function (state) {
    var ctx = this.ctx, w = this.w, h = this.h;
    var t = (state._freedomT != null ? state._freedomT : 0);
    var pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
    // Swagger canvas — cyan freedom wash, not a paragraph
    var g = ctx.createRadialGradient(w/2, h*0.45, 20, w/2, h/2, h*0.7);
    g.addColorStop(0, 'rgba(0,229,255,' + (0.18 + pulse * 0.12) + ')');
    g.addColorStop(0.5, 'rgba(5,4,10,0.55)');
    g.addColorStop(1, 'rgba(5,4,10,0.88)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Arch silhouette bars
    ctx.fillStyle = 'rgba(0,229,255,' + (0.25 + pulse * 0.35) + ')';
    ctx.fillRect(w * 0.22, h * 0.22, 8, h * 0.4);
    ctx.fillRect(w * 0.78 - 8, h * 0.22, 8, h * 0.4);
    ctx.fillRect(w * 0.22, h * 0.22, w * 0.56, 10);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 40px monospace';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 20 + pulse * 20;
    ctx.fillText('PAROLE ARCH', w / 2, h * 0.38);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f2e9e4';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('YOU FINISHED THE LADDER', w / 2, h * 0.48);
    ctx.fillStyle = '#ff9f1c';
    ctx.font = '14px monospace';
    ctx.fillText('Scrap ' + state.meta.scrap + '  ·  Nights won ' + (state.meta.totalWins || 0), w / 2, h * 0.54);
    // Timed swagger beats (visual only — ~20s scene)
    var beat = '';
    if (t < 4) beat = 'Broadcast cuts to static. Your rig is the last shape on the ribbon.';
    else if (t < 9) beat = 'The warden light fails. Cyan eats the canyon.';
    else if (t < 15) beat = 'They will reset the board. Tonight, you are off the books.';
    else beat = 'ENTER — take the scrap and restart the nights';
    ctx.fillStyle = '#c8b8c0';
    ctx.font = '13px monospace';
    ctx.fillText(beat, w / 2, h * 0.62);
    // Progress bar for swagger timer
    var dur = 20;
    ctx.fillStyle = '#2a2030';
    ctx.fillRect(w * 0.3, h * 0.72, w * 0.4, 6);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(w * 0.3, h * 0.72, w * 0.4 * Math.min(1, t / dur), 6);
    ctx.fillStyle = '#8a7a88';
    ctx.font = '11px monospace';
    ctx.fillText(t >= dur ? 'ENTER / R — TITLE' : Math.ceil(dur - t) + 's swagger', w / 2, h * 0.78);
    ctx.textAlign = 'left';
  };

  GAME.Hud = Hud;
})();
