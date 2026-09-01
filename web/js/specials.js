/**
 * specials.js — signature specials (Wave 1)
 * GAME.specials = { canFire, fire, update }
 * Each rig: windup → fire → sustain → resolve → ~8s CD.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});
  var THREE = window.THREE;

  var boneGeo = null;
  var boneMat = null;
  var markGeo = null;
  var chargeRingGeo = null;
  var craterGeo = null;
  var domeGeo = null;
  var torusGeo = null;
  var cableGeo = null;

  var probe = { windups: 0, fired: {}, marks: 0, chargeActive: false, boneFired: 0, boneHits: 0 };

  var active = {
    bones: [],
    mortars: [],
    domes: [],
    rings: [],
    tether: null,
    decals: [],
    caltrops: [],
    marks: [],
    charge: null,
    snaps: [],
  };

  var tmp = new THREE.Vector3();
  var tmp2 = new THREE.Vector3();
  var tmp3 = new THREE.Vector3();

  function ensureGeos() {
    if (boneGeo) return;
    // Bone rocket: shaft + two knuckle balls
    boneGeo = new THREE.Group();
    // Shared geos cloned into groups via makeBoneMesh
    markGeo = new THREE.RingGeometry(0.9, 1.35, 28);
    chargeRingGeo = new THREE.RingGeometry(0.35, 0.55, 24);
    craterGeo = new THREE.RingGeometry(0.6, 3.2, 32);
    domeGeo = new THREE.SphereGeometry(1, 20, 14);
    // Choir sermon ring — thicker tube so it isn't a thin reskin of EMP dome
    torusGeo = new THREE.TorusGeometry(1, 0.22, 10, 48);
    // Needle cable — readable harpoon line (was 0.04 hairline)
    cableGeo = new THREE.CylinderGeometry(0.09, 0.07, 1, 6);
    boneMat = {
      shaft: new THREE.MeshBasicMaterial({ color: 0xf0e6d4 }), // ivory
      knuckle: new THREE.MeshBasicMaterial({ color: 0xfff6ea }),
      glow: new THREE.MeshBasicMaterial({
        color: 0xff5a2a, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    };
  }

  function makeBoneMesh() {
    ensureGeos();
    // Readable femur silhouette — ivory shaft + knobs, not a grey rocket (v314)
    var g = new THREE.Group();
    var ivory = boneMat.shaft;
    var knob = boneMat.knuckle;
    var shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.13, 1.35, 7),
      ivory
    );
    shaft.rotation.x = Math.PI / 2;
    g.add(shaft);
    // Head (rounded condyles)
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 6), knob);
    head.position.z = 0.72;
    head.scale.set(1.15, 0.85, 1.0);
    g.add(head);
    var head2 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), knob);
    head2.position.set(0.1, 0.06, 0.78);
    g.add(head2);
    // Tail knobs
    var tail = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 6), knob);
    tail.position.z = -0.7;
    tail.scale.set(1.1, 0.9, 1.0);
    g.add(tail);
    var tail2 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), knob);
    tail2.position.set(-0.09, -0.05, -0.76);
    g.add(tail2);
    // Marrow glow trail tip
    var glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), boneMat.glow);
    glow.position.z = -0.88;
    g.add(glow);
    g.userData.exhaust = glow;
    g.userData.specialBone = true;
    g.scale.setScalar(1.15);
    return g;
  }

  function disposeMesh(mesh) {
    if (!mesh) return;
    if (mesh.parent) mesh.parent.remove(mesh);
    mesh.visible = false;
  }

  function carTint(id, rear) {
    if (id === 'marrow') return 0xff5a2a;
    if (id === 'needle') return rear ? 0xff66aa : 0x00e5ff;
    if (id === 'vesper') return 0xb44dff;
    return 0xff6bb5;
  }

  function disposeCharge() {
    if (!active.charge) return;
    var ch = active.charge;
    if (ch.mesh) {
      disposeMesh(ch.mesh);
      if (ch.mesh.material) {
        try { ch.mesh.material.dispose(); } catch (e) {}
      }
    }
    active.charge = null;
  }

  function disposeMark(mk) {
    if (!mk) return;
    if (mk.mesh) {
      disposeMesh(mk.mesh);
      if (mk.mesh.material) {
        try { mk.mesh.material.dispose(); } catch (e) {}
      }
    }
  }

  function spawnChargeRing(ctx, color) {
    ensureGeos();
    disposeCharge();
    var mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    var mesh = new THREE.Mesh(chargeRingGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    var p = ctx.player;
    mesh.position.copy(p.pos);
    mesh.position.y = p.pos.y + 0.08;
    mesh.scale.setScalar(0.4);
    ctx.scene.add(mesh);
    var windupMax = p._specialWindupMax || p._specialWindup || 0.14;
    active.charge = {
      mesh: mesh,
      life: windupMax,
      maxLife: windupMax,
      phase: 'windup',
      afterLife: 0.12,
    };
    probe.chargeActive = true;
  }

  function kickChargeAfterglow() {
    if (!active.charge || active.charge.phase !== 'windup') return;
    active.charge.phase = 'after';
    active.charge.life = 0.12;
    active.charge.maxLife = 0.12;
  }

  function spawnTargetMark(ctx, rival, color, life, opts) {
    opts = opts || {};
    ensureGeos();
    while (active.marks.length >= 6) {
      var old = active.marks.shift();
      disposeMark(old);
    }
    var mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    var mesh = new THREE.Mesh(markGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    if (rival && rival.pos) {
      mesh.position.copy(rival.pos);
      mesh.position.y = rival.pos.y + 0.1;
    }
    ctx.scene.add(mesh);
    active.marks.push({
      mesh: mesh,
      rival: rival,
      life: life,
      untilDisabled: !!opts.untilDisabled,
    });
    probe.marks++;
  }

  function spawnSnapStub(ctx, fromPos, fwd) {
    ensureGeos();
    var mat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    var mesh = new THREE.Mesh(cableGeo, mat);
    var end = fromPos.clone().addScaledVector(fwd, 3.5);
    var mid = fromPos.clone().lerp(end, 0.5);
    tmp3.subVectors(end, fromPos);
    var len = tmp3.length();
    mesh.position.copy(mid);
    if (len > 0.01) {
      tmp3.multiplyScalar(1 / len);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp3);
    }
    mesh.scale.set(1.2, Math.max(0.08, len), 1.2);
    ctx.scene.add(mesh);
    active.snaps.push({
      mesh: mesh,
      life: 0.35,
      maxLife: 0.35,
    });
  }

  function updateCharge(ctx, dt) {
    var ch = active.charge;
    if (!ch) {
      probe.chargeActive = false;
      return;
    }
    var p = ctx.player;
    probe.chargeActive = true;
    if (ch.phase === 'windup') {
      if (p && p.pos && ch.mesh) {
        ch.mesh.position.x = p.pos.x;
        ch.mesh.position.z = p.pos.z;
        ch.mesh.position.y = p.pos.y + 0.08;
      }
      var wMax = (p && p._specialWindupMax > 0) ? p._specialWindupMax : ch.maxLife;
      var wLeft = (p && p._specialWindup > 0) ? p._specialWindup : 0;
      var t = wMax > 0 ? (1 - wLeft / wMax) : 1;
      var sc = 0.4 + t * 1.2;
      ch.mesh.scale.setScalar(sc);
      if (ch.mesh.material) {
        ch.mesh.material.opacity = 0.55 + 0.35 * t;
      }
    } else if (ch.phase === 'after') {
      ch.life -= dt;
      var tA = 1 - Math.max(0, ch.life) / Math.max(0.01, ch.maxLife);
      var scA = 1.6 + tA * 0.6;
      if (ch.mesh) {
        ch.mesh.scale.setScalar(scA);
        if (ch.mesh.material) {
          ch.mesh.material.opacity = Math.max(0, 0.85 * (1 - tA));
        }
      }
      if (ch.life <= 0) {
        disposeCharge();
        probe.chargeActive = false;
      }
    }
  }

  function updateMarks(ctx, dt) {
    for (var i = active.marks.length - 1; i >= 0; i--) {
      var mk = active.marks[i];
      mk.life -= dt;
      var r = mk.rival;
      if (!r || r.dead || mk.life <= 0 || (mk.untilDisabled && (r.disabledT || 0) <= 0)) {
        disposeMark(mk);
        active.marks.splice(i, 1);
        continue;
      }
      if (r.pos && mk.mesh) {
        mk.mesh.position.x = r.pos.x;
        mk.mesh.position.z = r.pos.z;
        mk.mesh.position.y = r.pos.y + 0.1;
        var pulse = 1 + 0.1 * Math.sin((ctx.state.raceTime || 0) * 12);
        mk.mesh.scale.setScalar(pulse);
      }
    }
  }

  function updateSnaps(ctx, dt) {
    for (var i = active.snaps.length - 1; i >= 0; i--) {
      var sn = active.snaps[i];
      sn.life -= dt;
      if (sn.life <= 0) {
        disposeMesh(sn.mesh);
        if (sn.mesh && sn.mesh.material) {
          try { sn.mesh.material.dispose(); } catch (e) {}
        }
        active.snaps.splice(i, 1);
        continue;
      }
      if (sn.mesh && sn.mesh.material) {
        sn.mesh.material.opacity = 0.85 * (sn.life / (sn.maxLife || 0.35));
      }
    }
  }

  function canFire(player) {
    if (!player || player.hp <= 0 || player.finished) return false;
    if (player.specialCd > 0) return false;
    if (player._specialWindup > 0) return false;
    return true;
  }

  function startCd(ctx, full) {
    var p = ctx.player;
    var base = (ctx.cfg.combat && ctx.cfg.combat.specialCd) || 8;
    if (full === false) {
      p.specialCd = Math.min(2.2, base * 0.28);
    } else {
      p.specialCd = base / (p.mul.specialCool || 1);
    }
    p.specialCdMax = p.specialCd;
  }

  function fireMul(ctx) {
    return (ctx.upgradeMult ? ctx.upgradeMult('firepower') : 1) * ((ctx.player.mul && ctx.player.mul.fire) || 1);
  }

  /** Count live rivals in special theater (v366 fight identity) */
  function packInRange(ctx, maxD) {
    var n = 0;
    var list = ctx.rivals || [];
    var p = ctx.player;
    if (!p) return 0;
    var lim = maxD != null ? maxD : 48;
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (!r || r.dead || !r.pos) continue;
      if (r.pos.distanceTo(p.pos) <= lim) n++;
    }
    return n;
  }

  /** Shared fight juice when a special drops with pack nearby (v366/v372) */
  function juiceSpecialInFight(ctx, nearN) {
    if (!ctx.state) return;
    var n = nearN | 0;
    ctx.state.camShake = Math.max(ctx.state.camShake || 0, n > 0 ? 0.32 : 0.16);
    ctx.state._fovPunch = Math.max(ctx.state._fovPunch || 0, n > 0 ? 8 : 4);
    if (n > 0) {
      ctx.state._hitStopT = Math.max(ctx.state._hitStopT || 0, 0.11);
      ctx.state.hitFlash = Math.min(1.15, (ctx.state.hitFlash || 0) + 0.28);
    }
  }

  /** Nearest live rival ahead-ish for special aim bias */
  function nearestRivalDir(ctx, maxD) {
    var p = ctx.player;
    var list = ctx.rivals || [];
    var best = null;
    var bestD = maxD != null ? maxD : 42;
    forward(ctx, tmp);
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (!r || r.dead || !r.pos) continue;
      var d = r.pos.distanceTo(p.pos);
      if (d < 3 || d > bestD) continue;
      tmp2.subVectors(r.pos, p.pos).setY(0);
      if (tmp2.lengthSq() < 0.01) continue;
      tmp2.normalize();
      // Prefer ahead; allow slight side
      if (tmp2.dot(tmp) < -0.15) continue;
      if (d < bestD) { bestD = d; best = r; }
    }
    if (!best) return null;
    tmp2.subVectors(best.pos, p.pos).setY(0).normalize();
    return tmp2;
  }

  function forward(ctx, out) {
    var U = ctx.U;
    if (U && U.forward) U.forward(ctx.player.yaw, out);
    else {
      out.set(Math.sin(ctx.player.yaw), 0, Math.cos(ctx.player.yaw));
    }
    return out;
  }

  function side(ctx, out) {
    var U = ctx.U;
    if (U && U.side) U.side(ctx.player.yaw, out);
    else {
      out.set(Math.cos(ctx.player.yaw), 0, -Math.sin(ctx.player.yaw));
    }
    return out;
  }

  // ---------- FIRE ENTRY ----------
  function fire(ctx) {
    var p = ctx.player;
    if (!canFire(p)) return false;
    var id = p.def && p.def.id;
    // Windup tell — slightly longer when pack in range so fight read lands (v366)
    var near0 = packInRange(ctx, 50);
    p._specialWindup = near0 > 0 ? 0.2 : 0.14;
    p._specialWindupMax = p._specialWindup;
    p._specialPending = id;
    p._specialCtxReady = true;
    p._specialNearAtFire = near0;
    probe.windups++;
    spawnChargeRing(ctx, carTint(id, false));
    probe.chargeActive = true;
    // charge tell
    ctx.state.camShake = Math.max(ctx.state.camShake || 0, near0 > 0 ? 0.12 : 0.08);
    if (ctx.sfx) {
      if (ctx.sfx.specialWindup) ctx.sfx.specialWindup(id);
      else if (ctx.sfx.beep) ctx.sfx.beep(220, 0.05, 'sine', 0.06);
    }
    if (ctx.particles) {
      forward(ctx, tmp);
      var glowAt = p.pos.clone().addScaledVector(tmp, 1.2);
      glowAt.y += 0.9;
      var col = id === 'vesper' ? 'pink' : (id === 'choir' ? 'cyan' : 'spark');
      ctx.particles.spawn(col, glowAt, { count: near0 > 0 ? 12 : 6, speed: 5, life: 0.2, gravity: 0 });
    }
    return true;
  }

  function executeSpecial(ctx, id) {
    probe.fired[id] = (probe.fired[id] | 0) + 1;
    if (id === 'marrow') fireMarrow(ctx);
    else if (id === 'needle') fireNeedle(ctx);
    else if (id === 'mausoleum') fireMausoleum(ctx);
    else if (id === 'vesper') fireVesper(ctx);
    else if (id === 'choir') fireChoir(ctx);
    else if (id === 'razorback') fireRazorback(ctx);
    else {
      // fallback generic
      startCd(ctx, true);
      if (ctx.toast) ctx.toast('SPECIAL', 0.8);
      if (ctx.sfx && ctx.sfx.special) ctx.sfx.special();
    }
  }

  // ---------- RAZORBACK — Tire Choir (rear caltrop fan — not rockets) ----------
  function fireRazorback(ctx) {
    var p = ctx.player;
    startCd(ctx, true);
    forward(ctx, tmp);
    side(ctx, tmp2);
    // v385: pack 50–120m — detect draft (behind) and lead (ahead)
    var nearN = packInRange(ctx, 70);
    var packAhead = false;
    var packDraft = false;
    var listR = ctx.rivals || [];
    for (var pi = 0; pi < listR.length; pi++) {
      var rr = listR[pi];
      if (!rr || rr.dead || !rr.pos) continue;
      var dR = rr.pos.distanceTo(p.pos);
      if (dR > 90) continue;
      tmp3.subVectors(rr.pos, p.pos).setY(0);
      if (tmp3.lengthSq() < 0.01) continue;
      var along = tmp3.normalize().dot(tmp);
      if (along > 0.15) packAhead = true;
      if (along < -0.1) packDraft = true;
    }
    // Rear trail is identity; front scatter when pack leads (v322/v385)
    active.caltrops = active.caltrops || [];
    function dropCaltrop(along, sideOff, opts) {
      opts = opts || {};
      var o = p.pos.clone()
        .addScaledVector(tmp, along)
        .addScaledVector(tmp2, sideOff);
      o.y = p.pos.y + 0.12;
      var mesh = new THREE.Group();
      var body = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.42, 0),
        new THREE.MeshBasicMaterial({ color: 0x6a8a6a })
      );
      body.rotation.set(0.4, sideOff * 0.3, 0.2);
      mesh.add(body);
      var tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.13, 0.52, 5),
        new THREE.MeshBasicMaterial({ color: 0x39ff14 })
      );
      tip.position.y = 0.28;
      mesh.add(tip);
      var ring = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.85, 16),
        new THREE.MeshBasicMaterial({
          color: 0x39ff14, transparent: true, opacity: 0.9,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      mesh.add(ring);
      mesh.position.copy(o);
      ctx.scene.add(mesh);
      active.caltrops.push({
        mesh: mesh, ring: ring, pos: o.clone(),
        arm: opts.arm != null ? opts.arm : 0.12,
        life: opts.life != null ? opts.life : 11,
        dmg: (opts.dmg != null ? opts.dmg : 12) * fireMul(ctx),
        shredT: opts.shredT != null ? opts.shredT : 3.4,
        speedCap: opts.speedCap != null ? opts.speedCap : 0.32,
        hitR: opts.hitR != null ? opts.hitR : 5.8,
      });
    }
    // Dense rear fan + long trail so draft pack at race speed still runs them (v385)
    for (var i = -3; i <= 3; i++) {
      dropCaltrop(-3.2 - Math.abs(i) * 0.4, i * 1.45);
    }
    for (var row = 0; row < 3; row++) {
      for (var k = -2; k <= 2; k++) {
        dropCaltrop(-7.5 - row * 3.2, k * 1.55 + (row % 2) * 0.4, {
          arm: 0.08 + row * 0.04,
        });
      }
    }
    if (packAhead) {
      for (var j = -2; j <= 2; j++) {
        dropCaltrop(4.0 + Math.abs(j) * 0.45, j * 1.35);
      }
      for (var j2 = -1; j2 <= 1; j2++) {
        dropCaltrop(8.5 + Math.abs(j2) * 0.5, j2 * 1.5);
      }
    }
    juiceSpecialInFight(ctx, nearN > 0 ? nearN : (packDraft || packAhead ? 1 : 0));
    if (ctx.particles) {
      var rearFx = p.pos.clone().addScaledVector(tmp, -3.5);
      rearFx.y += 0.4;
      ctx.particles.spawn('spark', rearFx, { count: 22, speed: 14, life: 0.32, gravity: 3 });
      ctx.particles.spawn('cyan', rearFx, { count: 12, speed: 9, life: 0.26, gravity: 0 });
    }
    if (ctx.sfx && ctx.sfx.specialRazorback) ctx.sfx.specialRazorback();
    else if (ctx.sfx && ctx.sfx.special) ctx.sfx.special();
    if (ctx.toast) {
      var fireMsg = 'TIRE CHOIR';
      if (packAhead && packDraft) fireMsg = 'TIRE CHOIR · SURROUND';
      else if (packAhead) fireMsg = 'TIRE CHOIR · FRONT+REAR';
      else if (packDraft) fireMsg = 'TIRE CHOIR · DRAFT TRAP';
      ctx.toast(fireMsg, 1.25, 2);
    }
    ctx.state._choirShredN = 0;
    ctx.state._choirShredIds = {};
  }

  // ---------- MARROW — Bone Harvest ----------
  function fireMarrow(ctx) {
    var p = ctx.player;
    var scene = ctx.scene;
    var combat = ctx.cfg.combat || {};
    var recentRam = (p.lastRamT != null) && ((ctx.state.raceTime || 0) - p.lastRamT) <= 1.5;
    var boneMul = combat.specialBoneDmgMul != null ? combat.specialBoneDmgMul : 0.72;
    var dmgBase = (combat.rocketDmg || 34) * boneMul * fireMul(ctx);
    if (recentRam) dmgBase *= 1.4; // ram-fed still rewards timing, not a delete
    // v390: pack theater 50–120m — aim/range matches real fight not 44m ghost
    var nearN = packInRange(ctx, 62);
    startCd(ctx, true);
    forward(ctx, tmp);
    side(ctx, tmp2);
    var aimBias = nearestRivalDir(ctx, 58);
    var aimName = null;
    var bestR = null;
    var listM = ctx.rivals || [];
    var bestD = 58;
    for (var mi = 0; mi < listM.length; mi++) {
      var mr = listM[mi];
      if (!mr || mr.dead || !mr.pos) continue;
      var md = mr.pos.distanceTo(p.pos);
      if (md < bestD && md > 3) { bestD = md; bestR = mr; }
    }
    if (bestR && bestR.defId && ctx.cfg && ctx.cfg.cars) {
      for (var mc = 0; mc < ctx.cfg.cars.length; mc++) {
        if (ctx.cfg.cars[mc].id === bestR.defId) {
          aimName = ctx.cfg.cars[mc].name || bestR.defId;
          break;
        }
      }
    }
    if (bestR) {
      spawnTargetMark(ctx, bestR, 0xff5a2a, 2.5);
    }
    probe.boneFired += 3;
    ctx.state._boneVolley = { hits: 0, fired: 3, aimName: aimName };
    for (var i = -1; i <= 1; i++) {
      var o = p.pos.clone().addScaledVector(tmp, 2.5).addScaledVector(tmp2, i * 0.55);
      o.y += 0.8;
      var mesh = makeBoneMesh();
      mesh.position.copy(o);
      scene.add(mesh);
      var dir = tmp.clone().addScaledVector(tmp2, i * 0.22);
      if (aimBias) dir.addScaledVector(aimBias, 0.65);
      dir.normalize();
      var spd = (combat.rocketSpeed || 48) * 1.12;
      var pr = {
        type: 'bone',
        mesh: mesh,
        pos: o.clone(),
        vel: dir.multiplyScalar(spd),
        life: 2.5,
        dmg: dmgBase,
        fromPlayer: true,
        homing: true,
        smoke: true,
        homingStr: nearN > 0 ? 0.22 : 0.13,
        boneName: aimName,
      };
      ctx.state.projectiles.push(pr);
    }
    juiceSpecialInFight(ctx, nearN);
    if (ctx.sfx && ctx.sfx.specialMarrow) ctx.sfx.specialMarrow(recentRam);
    else if (ctx.sfx && ctx.sfx.special) ctx.sfx.special();
    var label = recentRam ? 'BONE HARVEST · RAM-FED' : 'BONE HARVEST';
    // v401: → NAME = aim target (not same-car attribution); · N NEAR stays count
    if (aimName) label += ' → ' + String(aimName).toUpperCase();
    else if (nearN > 0) label += ' · ' + nearN + ' NEAR';
    if (ctx.toast) ctx.toast(label, 1.4, 2);
  }

  // ---------- NEEDLE — Thread the Vein ----------
  function fireNeedle(ctx) {
    var p = ctx.player;
    var best = null;
    var bestAhead = null;
    var bestRear = null;
    var scoreA = 1e9;
    var scoreR = 1e9;
    var rivals = ctx.rivals || [];
    forward(ctx, tmp);
    for (var i = 0; i < rivals.length; i++) {
      var r = rivals[i];
      if (!r || r.dead) continue;
      var d = r.pos.distanceTo(p.pos);
      if (d < 2) continue;
      tmp2.subVectors(r.pos, p.pos).setY(0);
      if (tmp2.lengthSq() < 0.01) continue;
      tmp2.normalize();
      var ahead = tmp2.dot(tmp);
      // v378: pack theater ~50–120m — extend hook range so vein lands in real fight
      if (ahead >= 0.08 && d <= 58) {
        var sa = d - ahead * 10;
        if (sa < scoreA) { scoreA = sa; bestAhead = r; }
      } else if (ahead <= -0.15 && d <= 28) {
        var sr = d + 4;
        if (sr < scoreR) { scoreR = sr; bestRear = r; }
      }
    }
    best = bestAhead || bestRear;
    var isRear = !bestAhead && !!bestRear;

    if (!best) {
      // Miss consolation — leading still has a verb (not silent full-delete)
      startCd(ctx, false); // short CD
      p.nitro = Math.min(p.nitroMax != null ? p.nitroMax : 1, (p.nitro || 0) + 0.12);
      p.speed = (p.speed || 0) + 5;
      p._tetherBoostT = Math.max(p._tetherBoostT || 0, 0.55);
      ctx.state.camShake = Math.max(ctx.state.camShake || 0, 0.08);
      if (ctx.particles) {
        forward(ctx, tmp);
        var mist = p.pos.clone().addScaledVector(tmp, -1.5);
        mist.y += 0.6;
        ctx.particles.spawn('cyan', mist, { count: 8, speed: 6, life: 0.25, gravity: 0 });
      }
      // Toast gated — short miss CD made this spam mid-fight (v278 hunt)
      if (ctx.toast && (!(p._veinMissToastT > 0))) {
        ctx.toast('VEIN MISS · SPEED STEAL', 0.9, 2);
        p._veinMissToastT = 2.4;
      }
      forward(ctx, tmp);
      var stubPos = p.pos.clone();
      stubPos.y += 0.7;
      spawnSnapStub(ctx, stubPos, tmp.clone());
      if (ctx.sfx && ctx.sfx.specialNeedleMiss) ctx.sfx.specialNeedleMiss();
      else if (ctx.sfx && ctx.sfx.deny) ctx.sfx.deny();
      return;
    }
    startCd(ctx, true);
    clearTether(ctx);
    juiceSpecialInFight(ctx, packInRange(ctx, 55));
    // v378: real damage + yank so hit isn't toast-only
    var veinDmg = ((ctx.cfg.combat && ctx.cfg.combat.rocketDmg) || 40) * 0.55 * fireMul(ctx);
    best.invT = 0; // harpoon pierces spawn grace
    best.shield = 0; // vein pierces thin shields for readable hook
    if (ctx.hurtRival) ctx.hurtRival(best, veinDmg);
    else {
      best.hp = Math.max(0, (best.hp || 0) - veinDmg);
      best.hurtFlash = Math.max(best.hurtFlash || 0, 3);
    }
    best.speed *= isRear ? 0.45 : 0.35;
    best.disabledT = Math.max(best.disabledT || 0, isRear ? 0.35 : 0.55);
    // Reel rival toward needle slightly
    tmp3.subVectors(p.pos, best.pos).setY(0);
    if (tmp3.lengthSq() > 0.01) {
      tmp3.normalize();
      best.pos.addScaledVector(tmp3, isRear ? 2.2 : 3.4);
    }
    p.tetherTarget = best;
    p.tetherT = isRear ? 1.5 : 2.2;
    // draft steal / brief nitro
    p.nitro = Math.min(p.nitroMax != null ? p.nitroMax : 1, (p.nitro || 0) + (isRear ? 0.16 : 0.26));
    p._tetherBoostT = isRear ? 1.0 : 1.35;
    p.speed = (p.speed || 0) + (isRear ? 6 : 10);

    ensureGeos();
    var cable = new THREE.Mesh(
      cableGeo,
      new THREE.MeshBasicMaterial({
        color: isRear ? 0xff66aa : 0x00e5ff,
        transparent: true, opacity: 0.98,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    cable.userData.specialCable = true;
    cable.scale.set(1.35, 1, 1.35); // thicker harpoon read
    ctx.scene.add(cable);
    // Harpoon tip spark at rival — cable verb, not a generic boom
    if (ctx.particles) {
      var tip = best.pos.clone();
      tip.y += 0.7;
      ctx.particles.spawn(isRear ? 'pink' : 'cyan', tip, {
        count: 22, speed: 14, life: 0.32, gravity: 1,
      });
      if (ctx.particles.sparks) ctx.particles.sparks(tip);
      if (ctx.particles.spawn) {
        ctx.particles.spawn('spark', tip, { count: 12, speed: 16, life: 0.22, gravity: 2 });
      }
    }
    active.tether = {
      mesh: cable,
      target: best,
      life: isRear ? 1.5 : 2.2,
      humT: 0,
    };
    spawnTargetMark(ctx, best, isRear ? 0xff66aa : 0x00e5ff, isRear ? 1.5 : 2.2);
    ctx.state.camShake = Math.max(ctx.state.camShake || 0, 0.24);
    ctx.state._hitStopT = Math.max(ctx.state._hitStopT || 0, 0.1);
    ctx.state._fovPunch = Math.max(ctx.state._fovPunch || 0, 7);
    ctx.state.hitFlash = Math.min(1.2, (ctx.state.hitFlash || 0) + 0.3);
    if (ctx.sfx && ctx.sfx.specialNeedle) ctx.sfx.specialNeedle();
    else if (ctx.sfx && ctx.sfx.special) ctx.sfx.special();
    var rName = (best.defId || 'RIVAL').toUpperCase();
    if (ctx.toast) {
      ctx.toast(
        isRear ? ('REAR VEIN · YANK ' + rName) : ('THREAD THE VEIN · ' + rName),
        1.35,
        2
      );
    }
  }

  function clearTether(ctx) {
    if (active.tether) {
      disposeMesh(active.tether.mesh);
      if (active.tether.mesh.material) {
        try { active.tether.mesh.material.dispose(); } catch (e) {}
      }
      active.tether = null;
    }
    if (ctx && ctx.player) {
      ctx.player.tetherTarget = null;
      ctx.player.tetherT = 0;
    }
  }

  // ---------- MAUSOLEUM — Last Rites (lobbed mortar) ----------
  function fireMausoleum(ctx) {
    var p = ctx.player;
    var combat = ctx.cfg.combat || {};
    startCd(ctx, true);
    forward(ctx, tmp);
    // v392: pack 50–120m outer — lob aim was 8–32m (always miss theater)
    var impact = null;
    var aimName = null;
    var rivalsAim = ctx.rivals || [];
    var bestD = 1e9;
    var flightGuess = 0.72;
    for (var ai = 0; ai < rivalsAim.length; ai++) {
      var rr = rivalsAim[ai];
      if (!rr || rr.dead || !rr.pos) continue;
      tmp2.subVectors(rr.pos, p.pos).setY(0);
      var dd = tmp2.length();
      if (dd < 10 || dd > 72) continue;
      if (dd < 0.01) continue;
      tmp2.normalize();
      // Allow slight side lob so pack in outer lanes isn't pure-forward only
      if (tmp2.dot(tmp) < 0.08) continue;
      if (dd < bestD) {
        bestD = dd;
        var lead = Math.min(18, Math.max(4, (rr.speed || 22) * flightGuess * 0.9));
        var ry = rr.yaw != null ? rr.yaw : p.yaw;
        tmp3.set(Math.sin(ry), 0, Math.cos(ry));
        impact = rr.pos.clone()
          .addScaledVector(tmp3, lead * 0.75)
          .addScaledVector(tmp, lead * 0.3);
        impact.y = rr.pos.y != null ? rr.pos.y : p.pos.y;
        if (rr.defId && ctx.cfg && ctx.cfg.cars) {
          for (var ac = 0; ac < ctx.cfg.cars.length; ac++) {
            if (ctx.cfg.cars[ac].id === rr.defId) {
              aimName = ctx.cfg.cars[ac].name || rr.defId;
              break;
            }
          }
        }
      }
    }
    if (!impact) {
      var dist = 28 + Math.random() * 8; // default lob into pack band
      impact = p.pos.clone().addScaledVector(tmp, dist);
      impact.y = p.pos.y;
    }

    ensureGeos();
    // Big bright yellow impact mark — readable before crater
    var mark = new THREE.Group();
    var markOuter = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 2.6, 36),
      new THREE.MeshBasicMaterial({
        color: 0xffe66d, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    markOuter.rotation.x = -Math.PI / 2;
    mark.add(markOuter);
    var markInner = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 1.35, 28),
      new THREE.MeshBasicMaterial({
        color: 0xfff0a0, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    markInner.rotation.x = -Math.PI / 2;
    markInner.position.y = 0.02;
    mark.add(markInner);
    var markCore = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 20),
      new THREE.MeshBasicMaterial({
        color: 0xfff6c8, transparent: true, opacity: 0.75,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    markCore.rotation.x = -Math.PI / 2;
    markCore.position.y = 0.03;
    mark.add(markCore);
    mark.position.copy(impact);
    mark.position.y = (impact.y || 0) + 0.08;
    ctx.scene.add(mark);

    // Lobbed shell mesh
    var shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff9f1c })
    );
    var start = p.pos.clone().addScaledVector(tmp, 2.2);
    start.y += 1.4;
    shell.position.copy(start);
    ctx.scene.add(shell);

    // Slightly longer flight so yellow mark reads at pack range
    var flight = 0.7 + Math.random() * 0.1;
    active.mortars.push({
      mesh: shell,
      mark: mark,
      markOuter: markOuter,
      markInner: markInner,
      t0: 0,
      flight: flight,
      start: start.clone(),
      impact: impact.clone(),
      dmg: (combat.specialMortarDmg != null ? combat.specialMortarDmg : 28) * fireMul(ctx),
      slow: 0.42,
      radius: 15.5,
      aimName: aimName,
    });
    if (ctx.particles) {
      ctx.particles.spawn('fire', start.clone(), { count: 12, speed: 7, life: 0.38, gravity: 2 });
      ctx.particles.spawn('spark', start.clone(), { count: 10, speed: 9, life: 0.28, gravity: 3 });
    }
    juiceSpecialInFight(ctx, packInRange(ctx, 70));
    if (ctx.sfx && ctx.sfx.specialMausoleumLob) ctx.sfx.specialMausoleumLob();
    else if (ctx.sfx && ctx.sfx.thump) ctx.sfx.thump(90, 0.15);
    if (ctx.toast) {
      ctx.toast(
        aimName ? ('LAST RITES · ' + String(aimName).toUpperCase()) : 'LAST RITES',
        1.35,
        2
      );
    }
  }

  function resolveMortar(ctx, m) {
    disposeMesh(m.mesh);
    disposeMesh(m.mark);
    if (m.mesh && m.mesh.material) {
      try { m.mesh.material.dispose(); } catch (e) {}
    }
    if (m.mark) {
      m.mark.traverse(function (c) {
        if (c.material) {
          try { c.material.dispose(); } catch (e) {}
        }
      });
    }
    var impact = m.impact;
    var rivals = ctx.rivals || [];
    var hits = 0;
    var hitNames = [];
    for (var i = 0; i < rivals.length; i++) {
      var r = rivals[i];
      if (!r || r.dead) continue;
      if (r.pos.distanceTo(impact) < m.radius) {
        hits++;
        if (ctx.hurtRival) ctx.hurtRival(r, m.dmg);
        r.speed *= m.slow;
        r._aoeSlowT = Math.max(r._aoeSlowT || 0, 2.0);
        if (r.defId && ctx.cfg && ctx.cfg.cars) {
          for (var hn = 0; hn < ctx.cfg.cars.length; hn++) {
            if (ctx.cfg.cars[hn].id === r.defId) {
              hitNames.push(String(ctx.cfg.cars[hn].name || r.defId).toUpperCase());
              break;
            }
          }
        }
      }
    }
    ensureGeos();
    var crater = new THREE.Mesh(
      craterGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff6b35, transparent: true, opacity: 0.78,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    crater.rotation.x = -Math.PI / 2;
    crater.position.copy(impact);
    crater.position.y = (impact.y || 0) + 0.05;
    ctx.scene.add(crater);
    var scorch = new THREE.Mesh(
      new THREE.RingGeometry(2.4, 3.6, 28),
      new THREE.MeshBasicMaterial({
        color: 0xffe66d, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    scorch.rotation.x = -Math.PI / 2;
    scorch.position.copy(impact);
    scorch.position.y = (impact.y || 0) + 0.04;
    ctx.scene.add(scorch);
    active.decals.push({ mesh: crater, life: 4.5 });
    active.decals.push({ mesh: scorch, life: 3.2 });
    if (ctx.particles) {
      if (ctx.particles.explosion) ctx.particles.explosion(impact, true);
      ctx.particles.spawn('fire', impact.clone().setY(impact.y + 0.5), {
        count: 22, speed: 14, life: 0.55, gravity: 2,
      });
      ctx.particles.spawn('smoke', impact.clone().setY(impact.y + 0.8), {
        count: 12, speed: 5, life: 1.2, scale: 1.4, gravity: -0.4,
      });
    }
    if (ctx.sfx && ctx.sfx.specialMausoleumBoom) ctx.sfx.specialMausoleumBoom();
    else if (ctx.sfx && ctx.sfx.explode) ctx.sfx.explode();
    if (ctx.state) {
      ctx.state.camShake = Math.max(ctx.state.camShake || 0, hits > 0 ? 0.38 : 0.22);
      if (hits > 0) {
        ctx.state._hitStopT = Math.max(ctx.state._hitStopT || 0, 0.12);
        ctx.state._fovPunch = Math.max(ctx.state._fovPunch || 0, 8);
        ctx.state.hitFlash = Math.min(1.2, (ctx.state.hitFlash || 0) + 0.35);
      }
    }
    if (ctx.toast) {
      var cMsg = 'CRATER';
      if (hits === 1 && hitNames[0]) cMsg = 'CRATER · ' + hitNames[0];
      else if (hits > 1) cMsg = 'CRATER · ' + hits + ' HIT';
      ctx.toast(cMsg, 1.15, 2);
    }
  }

  // ---------- VESPER — Blackout Kiss ----------
  function fireVesper(ctx) {
    var p = ctx.player;
    startCd(ctx, true);
    ensureGeos();
    var empT = 3.2 + ((ctx.player && ctx.player._mutEmpBonus) || 0);
    var hitN = 0;
    var hitNames = [];
    var dmgMul = fireMul(ctx);
    // Burst dome (readable) + linger ghost so disable stays visible
    var dome = new THREE.Mesh(
      domeGeo,
      new THREE.MeshBasicMaterial({
        color: 0xd070ff, transparent: true, opacity: 0.75,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    dome.position.copy(p.pos);
    dome.position.y += 0.6;
    dome.scale.setScalar(0.2);
    ctx.scene.add(dome);
    active.domes.push({
      mesh: dome,
      life: 0.6,
      maxLife: 0.6,
      maxR: 36,
      origin: p.pos.clone(),
      applied: false,
    });
    // Lingering EMP ring on ground for disable duration (not a new light)
    var linger = new THREE.Mesh(
      new THREE.RingGeometry(2.4, 3.8, 32),
      new THREE.MeshBasicMaterial({
        color: 0xb44dff, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    linger.rotation.x = -Math.PI / 2;
    linger.position.copy(p.pos);
    linger.position.y += 0.12;
    ctx.scene.add(linger);
    active.domes.push({
      mesh: linger,
      life: empT,
      maxLife: empT,
      maxR: 16,
      origin: p.pos.clone(),
      applied: true,
      linger: true,
    });
    var rivals = ctx.rivals || [];
    // v380: local 3D only (pack 50–120m outer) — no 140m along-track ghost EMP
    var cand = [];
    for (var i = 0; i < rivals.length; i++) {
      var r0 = rivals[i];
      if (!r0 || r0.dead || !r0.pos) continue;
      cand.push({ r: r0, d3: r0.pos.distanceTo(p.pos) });
    }
    cand.sort(function (a, b) { return a.d3 - b.d3; });
    var maxHits = 5;
    var burstR = 62;
    for (var ci = 0; ci < cand.length && hitN < maxHits; ci++) {
      var c = cand[ci];
      if (c.d3 > burstR) break;
      var r = c.r;
      r.disabledT = empT;
      r.fireCd = empT;
      r.rocketCd = Math.max(r.rocketCd || 0, empT);
      r._empFlickerT = empT;
      r._empDarkOn = true;
      r.speed *= 0.32;
      // Chip so kiss draws blood (Black-like), shield first
      var chip = 12 * dmgMul;
      if ((r.shield || 0) > 0) {
        var sh = Math.min(r.shield, chip);
        r.shield -= sh;
        chip -= sh;
      }
      if (chip > 0) r.hp = Math.max(0, (r.hp || 0) - chip);
      hitN++;
      var nm = null;
      if (r.defId && typeof window !== 'undefined' && window.GAME) {
        var defR = (window.GAME.vehicles && window.GAME.vehicles.def)
          ? window.GAME.vehicles.def(r.defId)
          : null;
        if (!defR && window.GAME.config && window.GAME.config.cars) {
          for (var di = 0; di < window.GAME.config.cars.length; di++) {
            if (window.GAME.config.cars[di].id === r.defId) { defR = window.GAME.config.cars[di]; break; }
          }
        }
        nm = defR && (defR.name || defR.id);
      }
      if (nm) hitNames.push(String(nm).toUpperCase());
      if (typeof window !== 'undefined' && window.GAME && window.GAME._setRivalEmpDark) {
        window.GAME._setRivalEmpDark(r, true);
      } else if (r.mesh && r.mesh.userData) {
        var ud = r.mesh.userData;
        ['ledLeft', 'ledRight', 'ledBloomL', 'ledBloomR', 'roofPing', 'underglow', 'neonRing', 'headLight'].forEach(function (k) {
          if (ud[k] && ud[k].visible != null) ud[k].visible = false;
        });
      }
      if (ctx.particles) {
        ctx.particles.spawn('pink', r.pos.clone().setY(r.pos.y + 0.8), {
          count: 8, speed: 9, life: 0.3, gravity: 1,
        });
      }
      spawnTargetMark(ctx, r, 0xb44dff, empT, { untilDisabled: true });
    }
    if (active.domes[0]) active.domes[0].maxR = 42;
    juiceSpecialInFight(ctx, hitN > 0 ? hitN : packInRange(ctx, 55));
    // Multi-kiss hitstop bump (v380)
    if (hitN >= 2 && ctx.state) {
      ctx.state._hitStopT = Math.max(ctx.state._hitStopT || 0, 0.14);
      ctx.state._fovPunch = Math.max(ctx.state._fovPunch || 0, 10);
      ctx.state.camShake = Math.max(ctx.state.camShake || 0, 0.4);
    }
    ctx.state.hitFlash = Math.min(1.3, (ctx.state.hitFlash || 0) + (hitN > 0 ? 0.7 : 0.25));
    ctx.state._empHudT = empT;
    ctx.state._empHitN = hitN;
    if (ctx.particles) {
      ctx.particles.spawn('pink', p.pos.clone().setY(p.pos.y + 1), {
        count: hitN > 0 ? 42 : 20, speed: 20, life: 0.5, gravity: 0,
      });
      ctx.particles.spawn('spark', p.pos.clone().setY(p.pos.y + 0.7), {
        count: 16, speed: 14, life: 0.28, gravity: 2,
      });
    }
    if (ctx.sfx && ctx.sfx.specialVesper) ctx.sfx.specialVesper();
    else if (ctx.sfx && ctx.sfx.special) ctx.sfx.special();
    if (ctx.toast) {
      var toastMsg = 'BLACKOUT KISS · NO ONE NEAR';
      if (hitN === 1 && hitNames[0]) toastMsg = 'BLACKOUT KISS · ' + hitNames[0];
      else if (hitN > 1) toastMsg = 'BLACKOUT KISS · ' + hitN + ' DISABLED';
      ctx.toast(toastMsg, 1.5, 2);
    }
  }

  // ---------- CHOIR — Sermon (sonic torus shove — not EMP dome reskin) ----------
  function fireChoir(ctx) {
    var p = ctx.player;
    startCd(ctx, true);
    ensureGeos();
    var ring = new THREE.Mesh(
      torusGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff2d88, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(p.pos);
    ring.position.y += 0.55;
    ring.scale.setScalar(0.15);
    ctx.scene.add(ring);
    // Second magenta halo — sermon reads as a sound ring, not a thin EMP sphere
    var halo = new THREE.Mesh(
      torusGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff9ad4, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.copy(p.pos);
    halo.position.y += 0.35;
    halo.scale.setScalar(0.2);
    ctx.scene.add(halo);
    // v383: pack sits 50–120m outer — ring must reach real fight range
    var ringState = {
      mesh: ring,
      halo: halo,
      t: 0,
      dur: 0.68,
      maxR: 58,
      origin: p.pos.clone(),
      hit: {},
      hitN: 0,
      hitNames: [],
    };
    active.rings.push(ringState);
    if (ctx.particles) {
      // Pink/magenta burst — was cyan (looked like EMP/Needle)
      ctx.particles.spawn('pink', p.pos.clone().setY(p.pos.y + 1), {
        count: 34, speed: 18, life: 0.45, gravity: 0,
      });
      if (ctx.particles.spawn) {
        ctx.particles.spawn('spark', p.pos.clone().setY(p.pos.y + 0.6), {
          count: 16, speed: 12, life: 0.26, gravity: 2,
        });
      }
    }
    // Instant blast covers pack theater 50–120m outer lanes (v383)
    var rivalsNow = ctx.rivals || [];
    for (var bi = 0; bi < rivalsNow.length; bi++) {
      var rb = rivalsNow[bi];
      if (!rb || rb.dead || !rb.pos) continue;
      if (rb.pos.distanceTo(p.pos) <= 58) applySermonHit(ctx, ringState, rb, 58);
    }
    var nearChoir = packInRange(ctx, 60);
    juiceSpecialInFight(ctx, nearChoir > 0 ? nearChoir : ringState.hitN);
    if (ctx.sfx && ctx.sfx.specialChoir) ctx.sfx.specialChoir();
    else if (ctx.sfx && ctx.sfx.special) ctx.sfx.special();
    // Fire toast only if blast missed; hit toast already landed in applySermonHit
    if (ctx.toast && (ringState.hitN | 0) === 0) {
      ctx.toast(nearChoir > 0 ? ('SERMON · ' + nearChoir + ' IN RANGE') : 'SERMON', 1.15, 2);
    }
  }

  function applySermonHit(ctx, ring, r, radius) {
    if (!r || r.dead) return;
    if (!r._uid) r._uid = 'r' + Math.random().toString(36).slice(2, 8);
    if (ring.hit[r._uid]) return;
    var d = r.pos.distanceTo(ring.origin);
    // Thick wavefront so fast pack doesn't slip between rings (v383)
    if (d > radius + 3.2) return;
    ring.hit[r._uid] = true;
    ring.hitN = (ring.hitN | 0) + 1;
    // Name for hit toast
    var nm = null;
    if (r.defId && ctx.cfg && ctx.cfg.cars) {
      for (var ni = 0; ni < ctx.cfg.cars.length; ni++) {
        if (ctx.cfg.cars[ni].id === r.defId) {
          nm = ctx.cfg.cars[ni].name || r.defId;
          break;
        }
      }
    }
    if (nm) {
      ring.hitNames = ring.hitNames || [];
      ring.hitNames.push(String(nm).toUpperCase());
    }
    // v369: shove hit spark so sermon lands are felt, not only toast
    if (ctx.particles) {
      ctx.particles.spawn('pink', r.pos.clone().setY(r.pos.y + 0.7), {
        count: 10, speed: 12, life: 0.26, gravity: 1,
      });
    }
    if (ctx.state) {
      ctx.state.camShake = Math.max(ctx.state.camShake || 0, ring.hitN >= 2 ? 0.28 : 0.16);
      if (ring.hitN === 1) {
        ctx.state._hitStopT = Math.max(ctx.state._hitStopT || 0, 0.1);
        ctx.state._fovPunch = Math.max(ctx.state._fovPunch || 0, 7);
      } else if (ring.hitN >= 2) {
        ctx.state._hitStopT = Math.max(ctx.state._hitStopT || 0, 0.13);
        ctx.state._fovPunch = Math.max(ctx.state._fovPunch || 0, 9);
      }
      // Named land toast (stomps fire toast once)
      if (ctx.toast) {
        if (ring.hitN === 1) {
          ctx.toast(nm ? ('SERMON · ' + String(nm).toUpperCase()) : 'SERMON · SHOVED', 1.4, 2);
        } else if (ring.hitN >= 2) {
          ctx.toast('SERMON · ' + ring.hitN + ' SHOVED', 1.35, 2);
        }
      }
    }

    // Mass from defId when rivals lack r.def (v317)
    var mass = (r.mul && r.mul.mass) || (r.def && r.def.mass) || 1;
    if ((!r.def || r.def.mass == null) && r.defId && ctx.cfg && ctx.cfg.cars) {
      for (var ci = 0; ci < ctx.cfg.cars.length; ci++) {
        if (ctx.cfg.cars[ci].id === r.defId) {
          mass = ctx.cfg.cars[ci].mass || mass;
          break;
        }
      }
    }
    // Impulse inverse to mass — Needle flies, Mausoleum shrugs
    var push = 12 / Math.max(0.45, mass);
    push = Math.min(push, 16);
    tmp.subVectors(r.pos, ring.origin).setY(0);
    if (tmp.lengthSq() < 0.01) tmp.set(1, 0, 0);
    tmp.normalize();
    r.pos.addScaledVector(tmp, push * 0.9);
    // Path-space knock so AI road follow doesn't erase the shove (v317)
    r.progress = Math.max(0.01, (r.progress || 0) - 0.0022 * (push / 8));
    r.laneOff = (r.laneOff || 0) + tmp.x * 0.18 * push;
    r.speed *= 0.22;
    r._sermonStunT = Math.max(r._sermonStunT || 0, 0.85);
    var sermonD = ((ctx.cfg.combat && ctx.cfg.combat.specialSermonDmg) != null
      ? ctx.cfg.combat.specialSermonDmg : 14) * fireMul(ctx);
    // Specials bite shields — half of sermon ignores thin pack plates (v317)
    if (r.shield > 0) r.shield = Math.max(0, r.shield - sermonD * 0.55);
    if (ctx.hurtRival) ctx.hurtRival(r, sermonD);
    // Lift read for everyone; light cars get higher pop
    if (mass < 1.0) {
      var pop = Math.min(1.35, 1.45 / mass * 0.5);
      r._sermonLift = pop;
      r._sermonLiftT = 0.6;
      r.pos.y += pop * 0.4;
    } else {
      r._sermonLift = mass < 1.4 ? 0.6 : 0.35;
      r._sermonLiftT = 0.45;
    }
  }

  // ---------- UPDATE ----------
  function update(ctx, dt) {
    if (!ctx || !ctx.player) return;
    var p = ctx.player;

    // Windup resolve
    if (p._specialWindup > 0) {
      p._specialWindup -= dt;
      if (p._specialWindup <= 0) {
        p._specialWindup = 0;
        kickChargeAfterglow();
        var id = p._specialPending;
        p._specialPending = null;
        if (id) executeSpecial(ctx, id);
      }
    }

    updateCharge(ctx, dt);
    updateMarks(ctx, dt);
    updateSnaps(ctx, dt);

    // Tether boost
    if (p._tetherBoostT > 0) p._tetherBoostT -= dt;

    // Tether cable + yank sustain
    if (p.tetherT > 0) {
      p.tetherT -= dt;
      var tgt = p.tetherTarget;
      if (tgt && !tgt.dead) {
        tgt.speed = Math.min(tgt.speed, 12);
        // gentle pull toward player forward lane
        forward(ctx, tmp);
        tmp2.subVectors(p.pos, tgt.pos).setY(0);
        if (tmp2.lengthSq() > 1) {
          tmp2.normalize();
          tgt.pos.addScaledVector(tmp2, 4.5 * dt);
        }
        if (p._tetherBoostT > 0) {
          p.speed += 3.5 * dt;
        }
      } else {
        p.tetherT = 0;
        p.tetherTarget = null;
      }
      if (p.tetherT <= 0) clearTether(ctx);
    }

    if (active.tether) {
      var th = active.tether;
      th.life -= dt;
      var target = th.target;
      if (!target || target.dead || th.life <= 0 || p.tetherT <= 0) {
        clearTether(ctx);
      } else {
        var a = p.pos.clone();
        a.y += 0.7;
        var b = target.pos.clone();
        b.y += 0.7;
        var mid = a.clone().lerp(b, 0.5);
        tmp3.subVectors(b, a);
        var len = tmp3.length();
        th.mesh.position.copy(mid);
        if (len > 0.01) {
          tmp3.multiplyScalar(1 / len);
          th.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp3);
        }
        // Thicker readable cable cross-section (scale XZ; Y is length)
        th.mesh.scale.set(2.4, Math.max(0.1, len), 2.4);
        if (th.mesh.material) {
          th.mesh.material.opacity = 0.7 + 0.28 * Math.sin((ctx.state.raceTime || 0) * 18);
        }
        th.humT -= dt;
        if (th.humT <= 0 && ctx.sfx && ctx.sfx.specialNeedleHum) {
          ctx.sfx.specialNeedleHum();
          th.humT = 0.22;
        }
      }
    }

    // Mortars (lob arc)
    for (var mi = active.mortars.length - 1; mi >= 0; mi--) {
      var m = active.mortars[mi];
      m.t0 += dt;
      var u = Math.min(1, m.t0 / m.flight);
      // parabolic arc
      tmp.copy(m.start).lerp(m.impact, u);
      tmp.y = m.start.y + Math.sin(u * Math.PI) * 6.5 * (1 - u * 0.15);
      if (m.mesh) m.mesh.position.copy(tmp);
      if (m.mark) {
        var pulse = 1 + 0.16 * Math.sin((ctx.state.raceTime || 0) * 9);
        m.mark.scale.setScalar(pulse);
        // Pulse children opacities — big yellow read at speed
        if (m.markOuter && m.markOuter.material) {
          m.markOuter.material.opacity = 0.7 + 0.28 * Math.sin((ctx.state.raceTime || 0) * 11);
        }
        if (m.markInner && m.markInner.material) {
          m.markInner.material.opacity = 0.65 + 0.3 * Math.sin((ctx.state.raceTime || 0) * 13);
        }
      }
      if (u >= 1) {
        resolveMortar(ctx, m);
        active.mortars.splice(mi, 1);
      }
    }

    // EMP domes + linger rings
    for (var di = active.domes.length - 1; di >= 0; di--) {
      var d = active.domes[di];
      d.life -= dt;
      var t = 1 - Math.max(0, d.life) / Math.max(0.01, d.maxLife);
      if (d.mesh) {
        if (d.linger) {
          // Ground ring: pulse for full disable window
          var pulse = 1 + 0.08 * Math.sin((ctx.state.raceTime || 0) * 10);
          d.mesh.scale.setScalar(pulse);
          if (d.mesh.material) {
            d.mesh.material.opacity = 0.55 * Math.max(0.15, d.life / d.maxLife);
          }
          if (ctx.player && ctx.player.pos) {
            d.mesh.position.x = ctx.player.pos.x;
            d.mesh.position.z = ctx.player.pos.z;
          }
        } else {
          var sc = 0.2 + t * d.maxR;
          d.mesh.scale.setScalar(sc);
          d.mesh.position.x = ctx.player.pos.x;
          d.mesh.position.z = ctx.player.pos.z;
          if (d.mesh.material) d.mesh.material.opacity = 0.7 * (1 - t * 0.9);
        }
      }
      if (d.life <= 0) {
        disposeMesh(d.mesh);
        if (d.mesh && d.mesh.material) {
          try { d.mesh.material.dispose(); } catch (e) {}
        }
        active.domes.splice(di, 1);
      }
    }

    // Rival EMP — lights DIE for full disable (not silent)
    var rivals = ctx.rivals || [];
    for (var ri = 0; ri < rivals.length; ri++) {
      var rv = rivals[ri];
      if (!rv || rv.dead) continue;
      if (rv._empFlickerT > 0) {
        rv._empFlickerT -= dt;
        // Dark applied once by fire/game loop; just tick timer (no per-frame flash)
        if (rv._empFlickerT <= 0) {
          rv._empFlickerT = 0;
          // Restore handled by game loop when disabledT ends (_empDarkOn edge)
        }
      }
      // Sermon lift settle
      if (rv._sermonLiftT > 0) {
        rv._sermonLiftT -= dt;
        var baseY = rv.pos.y; // road-follow usually sets y; nudge only
        if (rv._sermonLiftT > 0.2) {
          rv.pos.y += (rv._sermonLift || 0.4) * dt * 2.2;
          // cap total pop
          // soft cap handled by short timer
        } else {
          rv.pos.y -= (rv._sermonLift || 0.4) * dt * 3.5;
        }
        if (rv._sermonLiftT <= 0) {
          rv._sermonLift = 0;
        }
      }
      if (rv._aoeSlowT > 0) {
        rv._aoeSlowT -= dt;
        rv.speed = Math.min(rv.speed, rv.speed * 0.99);
      }
    }

    // Sermon expanding torus (+ optional halo)
    for (var si = active.rings.length - 1; si >= 0; si--) {
      var ring = active.rings[si];
      ring.t += dt;
      var uR = Math.min(1, ring.t / ring.dur);
      var radius = uR * ring.maxR;
      if (ring.mesh) {
        ring.mesh.scale.setScalar(Math.max(0.15, radius));
        ring.mesh.position.x = ring.origin.x;
        ring.mesh.position.z = ring.origin.z;
        if (ring.mesh.material) ring.mesh.material.opacity = 0.95 * (1 - uR * 0.7);
      }
      if (ring.halo) {
        ring.halo.scale.setScalar(Math.max(0.2, radius * 1.12));
        ring.halo.position.x = ring.origin.x;
        ring.halo.position.z = ring.origin.z;
        if (ring.halo.material) ring.halo.material.opacity = 0.5 * (1 - uR * 0.85);
      }
      for (var rj = 0; rj < rivals.length; rj++) {
        applySermonHit(ctx, ring, rivals[rj], radius);
      }
      if (ring.t >= ring.dur) {
        // Skip resolve toast if per-hit named toast already landed (v383)
        if (!ring._resolvedToast && ctx.toast && (ring.hitN | 0) >= 2 && !(ring.hitNames && ring.hitNames.length)) {
          ctx.toast('SERMON · ' + ring.hitN + ' SHOVED', 0.9, 2);
          ring._resolvedToast = true;
        }
        disposeMesh(ring.mesh);
        if (ring.mesh && ring.mesh.material) {
          try { ring.mesh.material.dispose(); } catch (e) {}
        }
        if (ring.halo) {
          disposeMesh(ring.halo);
          if (ring.halo.material) {
            try { ring.halo.material.dispose(); } catch (e) {}
          }
        }
        active.rings.splice(si, 1);
      }
    }

    // Caltrops (Tire Choir)
    active.caltrops = active.caltrops || [];
    for (var ki = active.caltrops.length - 1; ki >= 0; ki--) {
      var cal = active.caltrops[ki];
      cal.life -= dt;
      if (cal.arm > 0) {
        cal.arm -= dt;
        if (cal.ring && cal.ring.material) {
          // Lime arm warn (not cyan rocket) then hot red when live
          cal.ring.material.color.setHex(0x39ff14);
          cal.ring.material.opacity = 0.55 + 0.3 * Math.sin((ctx.state.raceTime || 0) * 16);
        }
      } else {
        if (cal.ring && cal.ring.material) {
          cal.ring.material.color.setHex(0xff2d55);
          cal.ring.material.opacity = 0.55 + 0.4 * Math.sin((ctx.state.raceTime || 0) * 20);
        }
        // Hit rivals — wide radius so race-speed draft still shreds (v385)
        var hitR = cal.hitR != null ? cal.hitR : 5.5;
        for (var kr = 0; kr < rivals.length; kr++) {
          var cr = rivals[kr];
          if (!cr || cr.dead) continue;
          if (cr.pos.distanceTo(cal.pos) < hitR) {
            if (ctx.hurtRival) ctx.hurtRival(cr, cal.dmg);
            cr._tireShredT = Math.max(cr._tireShredT || 0, cal.shredT);
            cr._tireShredCap = Math.min(cr._tireShredCap != null ? cr._tireShredCap : 1, cal.speedCap);
            cr.speed *= 0.42;
            if (ctx.state) {
              if (!cr._uid) cr._uid = 'r' + Math.random().toString(36).slice(2, 8);
              ctx.state._choirShredIds = ctx.state._choirShredIds || {};
              var firstOnRival = !ctx.state._choirShredIds[cr._uid];
              if (firstOnRival) {
                ctx.state._choirShredIds[cr._uid] = true;
                ctx.state._choirShredN = (ctx.state._choirShredN | 0) + 1;
                var sn = ctx.state._choirShredN;
                var rName = null;
                if (cr.defId && ctx.cfg && ctx.cfg.cars) {
                  for (var cn = 0; cn < ctx.cfg.cars.length; cn++) {
                    if (ctx.cfg.cars[cn].id === cr.defId) {
                      rName = ctx.cfg.cars[cn].name || cr.defId;
                      break;
                    }
                  }
                }
                if (ctx.toast) {
                  if (sn === 1 && rName) {
                    ctx.toast('TIRE CHOIR · ' + String(rName).toUpperCase(), 1.35, 2);
                  } else if (sn === 1) {
                    ctx.toast('TIRE CHOIR · SHRED', 1.2, 2);
                  } else {
                    ctx.toast('TIRE CHOIR · ' + sn + ' SHRED', 1.1, 2);
                  }
                }
                ctx.state.camShake = Math.max(ctx.state.camShake || 0, sn >= 2 ? 0.28 : 0.16);
                ctx.state._hitStopT = Math.max(ctx.state._hitStopT || 0, sn >= 2 ? 0.11 : 0.08);
                ctx.state._fovPunch = Math.max(ctx.state._fovPunch || 0, sn >= 2 ? 7 : 5);
              }
            }
            // pop caltrop
            disposeMesh(cal.mesh);
            active.caltrops.splice(ki, 1);
            cal = null;
            if (ctx.sfx && ctx.sfx.hit) ctx.sfx.hit();
            if (ctx.particles && ctx.particles.spawn) {
              ctx.particles.spawn('spark', cr.pos.clone().setY(cr.pos.y + 0.4), {
                count: 12, speed: 10, life: 0.24, gravity: 2,
              });
            }
            break;
          }
        }
        // Player can hit own caltrops (skill issue)
        if (cal && p.pos.distanceTo(cal.pos) < 2.2 && (p.inv || 0) <= 0) {
          p._tireShredT = Math.max(p._tireShredT || 0, cal.shredT * 0.85);
          p._tireShredCap = cal.speedCap;
          p.speed *= 0.6;
          if (ctx.hurtRival) { /* no-op */ }
          // light self damage via speed only — avoid recursive hurt without hurtPlayer
          if (ctx.state) ctx.state.camShake = Math.max(ctx.state.camShake || 0, 0.12);
          disposeMesh(cal.mesh);
          active.caltrops.splice(ki, 1);
          cal = null;
        }
      }
      if (cal && cal.life <= 0) {
        disposeMesh(cal.mesh);
        active.caltrops.splice(ki, 1);
      }
    }
    // Tire shred speed cap on player
    if (p._tireShredT > 0) {
      p._tireShredT -= dt;
      var cap = (p._tireShredCap != null ? p._tireShredCap : 0.4);
      // soft cap relative to current absolute speed ceiling feel
      if (Math.abs(p.speed) > 22 * cap + 8) p.speed *= 0.92;
    }
    // Tire shred on rivals
    for (var tr = 0; tr < rivals.length; tr++) {
      var trv = rivals[tr];
      if (!trv || trv.dead) continue;
      if (trv._tireShredT > 0) {
        trv._tireShredT -= dt;
        trv.speed = Math.min(trv.speed, (trv.maxSpeed || 40) * (trv._tireShredCap || 0.4));
      }
    }

    // Crater decals fade
    for (var ci = active.decals.length - 1; ci >= 0; ci--) {
      var dec = active.decals[ci];
      dec.life -= dt;
      if (dec.mesh && dec.mesh.material) {
        dec.mesh.material.opacity = Math.max(0, (dec.life / 4) * 0.7);
        dec.mesh.scale.setScalar(1 + (1 - dec.life / 4) * 0.35);
      }
      if (dec.life <= 0) {
        disposeMesh(dec.mesh);
        if (dec.mesh && dec.mesh.material) {
          try { dec.mesh.material.dispose(); } catch (e) {}
        }
        active.decals.splice(ci, 1);
      }
    }
  }

  function resetProbe() {
    probe.windups = 0;
    probe.fired = {};
    probe.marks = 0;
    probe.chargeActive = false;
    probe.boneFired = 0;
    probe.boneHits = 0;
  }

  function noteBoneHit() {
    probe.boneHits++;
    var st = GAME.state;
    if (st && st._boneVolley) st._boneVolley.hits++;
  }

  function reset() {
    // Hard clear FX (new race)
    if (active.tether) {
      disposeMesh(active.tether.mesh);
      active.tether = null;
    }
    active.mortars.forEach(function (m) {
      disposeMesh(m.mesh); disposeMesh(m.mark);
    });
    active.domes.forEach(function (d) { disposeMesh(d.mesh); });
    active.rings.forEach(function (r) { disposeMesh(r.mesh); });
    active.decals.forEach(function (d) { disposeMesh(d.mesh); });
    active.marks.forEach(function (m) { disposeMark(m); });
    disposeCharge();
    active.snaps.forEach(function (s) {
      disposeMesh(s.mesh);
      if (s.mesh && s.mesh.material) {
        try { s.mesh.material.dispose(); } catch (e) {}
      }
    });
    active.mortars = [];
    active.domes = [];
    active.rings = [];
    active.decals = [];
    active.marks = [];
    active.snaps = [];
    (active.caltrops || []).forEach(function (c) { disposeMesh(c.mesh); });
    active.caltrops = [];
    resetProbe();
  }

  GAME.specials = {
    canFire: canFire,
    fire: fire,
    update: update,
    reset: reset,
    resetProbe: resetProbe,
    noteBoneHit: noteBoneHit,
    /** Playtest peek — caltrop count / shred / special probe */
    _debug: function () {
      var windupT = 0;
      if (GAME.state && GAME.state.player) {
        windupT = GAME.state.player._specialWindup || 0;
      }
      return {
        caltrops: (active.caltrops || []).length,
        armed: (active.caltrops || []).filter(function (c) { return c.arm <= 0; }).length,
        probe: probe,
        windupT: windupT,
        marks: active.marks.length,
        chargeActive: !!active.charge,
      };
    },
  };
})();
