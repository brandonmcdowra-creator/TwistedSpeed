/**
 * Scrap Line — wreckable shoulder freight + non-hit dress (v441/v442).
 * MeshBasic + InstancedMesh only. Neon/Sepulcher/city — not coast/REACH.
 * v442: dress clutter to horizon + knocked props + debris wake hooks.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});
  var U = GAME.utils;

  var MAGLEV_LO = 0.26;
  var MAGLEV_HI = 0.34;
  var WARDEN_LO = 0.38;
  var WARDEN_HI = 0.56;
  var T_MIN = 0.15;
  var T_MAX = 0.90;
  var KINDS = ['drum', 'ballast', 'spool', 'crate', 'glow'];
  var DRESS_KINDS = ['gravel', 'shard', 'scrub', 'hulk', 'hulkStripe'];
  var HULK_LO = 1.135; // × roadHalf — 2.6m box must sit inside deck 11.56–14.76
  var HULK_HI = 1.185;
  // Mirror world._buildSidewalks: deck hugs asphalt edge (gap 0.06, width 3.2, y 0.16; curb 0.34 @ 0.22)
  var DECK_GAP = 0.06;
  var DECK_W = 3.2;
  var DECK_Y = 0.16;
  var CURB_W = 0.34;
  var CURB_Y = 0.22;
  var GLOW_COLORS = [new THREE.Color(0x00e5ff), new THREE.Color(0xff9f1c)];

  var _geo = null;
  var _zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);
  var _tmpM = new THREE.Matrix4();
  var _tmpP = new THREE.Vector3();
  var _tmpQ = new THREE.Quaternion();
  var _tmpS = new THREE.Vector3(1, 1, 1);
  var _tmpSide = new THREE.Vector3();
  var _tmpTan = new THREE.Vector3();
  var _axisX = new THREE.Vector3(1, 0, 0);
  var _axisY = new THREE.Vector3(0, 1, 0);
  var _qSpool = new THREE.Quaternion().setFromAxisAngle(_axisX, Math.PI / 2);
  var _qFlat = new THREE.Quaternion().setFromAxisAngle(_axisX, -Math.PI / 2);
  var _qKnockY = new THREE.Quaternion();

  function geos() {
    if (_geo) return _geo;
    _geo = {
      drum: new THREE.CylinderGeometry(0.55, 0.62, 1.05, 8),
      ballast: new THREE.BoxGeometry(1.35, 0.5, 1.75),
      spool: new THREE.CylinderGeometry(0.42, 0.42, 0.55, 10),
      crate: new THREE.BoxGeometry(1.05, 0.95, 1.05),
      glow: new THREE.RingGeometry(0.32, 0.52, 14),
      gantryPost: new THREE.BoxGeometry(0.75, 14, 0.75),
      gantryBeam: new THREE.BoxGeometry(26, 0.65, 1.15),
      hulk: new THREE.BoxGeometry(2.6, 2.0, 5.5),
      hulkStripe: new THREE.BoxGeometry(2.66, 0.14, 0.9),
      gravel: new THREE.IcosahedronGeometry(0.55, 0),
      shard: new THREE.BoxGeometry(1.35, 0.12, 0.85),
      scrub: new THREE.PlaneGeometry(1.85, 1.85),
    };
    return _geo;
  }

  function mapSeed(stage, mapId) {
    var s = (stage | 0) * 9973;
    var id = mapId || '';
    for (var i = 0; i < id.length; i++) s += id.charCodeAt(i) * (i + 17);
    return s;
  }

  function skipT(t) {
    if (t < T_MIN || t > T_MAX) return true;
    if (t >= MAGLEV_LO && t <= MAGLEV_HI) return true;
    return false;
  }

  function spawnProb(t, density) {
    var p = density != null ? density : 1;
    if (t >= WARDEN_LO && t <= WARDEN_HI) p *= 0.42;
    return p;
  }

  function kindMat(kind, idx) {
    if (kind === 'glow') {
      return new THREE.MeshBasicMaterial({
        color: 0xffffff, // tinted per-instance (cyan / amber)
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    }
    if (kind === 'gravel') {
      return new THREE.MeshBasicMaterial({ color: 0x6a5a48 });
    }
    if (kind === 'hulk') {
      return new THREE.MeshBasicMaterial({ color: 0x3d322c });
    }
    if (kind === 'hulkStripe') {
      return new THREE.MeshBasicMaterial({
        color: 0xff9f1c, transparent: true, opacity: 0.85, depthWrite: false,
      });
    }
    if (kind === 'shard') {
      return new THREE.MeshBasicMaterial({ color: 0x8a7a62 });
    }
    if (kind === 'scrub') {
      return new THREE.MeshBasicMaterial({
        color: 0x3a5548,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
    }
    // Collidable freight — lift a step so it reads against asphalt at night
    if (kind === 'drum') return new THREE.MeshBasicMaterial({ color: 0x5a4838 });
    if (kind === 'ballast') return new THREE.MeshBasicMaterial({ color: 0x4a4038 });
    if (kind === 'spool') return new THREE.MeshBasicMaterial({ color: 0x3a4850 });
    if (kind === 'crate') return new THREE.MeshBasicMaterial({ color: 0x6a5038 });
    var cols = [0x5a5048, 0x4a4540, 0x5a4840, 0x453840];
    var ci = KINDS.indexOf(kind);
    return new THREE.MeshBasicMaterial({ color: cols[ci] != null ? cols[ci] : 0x5a5048 });
  }

  function placeMatrix(path, item, pool, opts) {
    if (!path || !path.curve || !item || !pool || !pool.mesh) return;
    opts = opts || {};
    var pt = path.curve.getPointAt(item.t);
    var tan = path.curve.getTangentAt(item.t);
    _tmpTan.set(tan.x, 0, tan.z);
    if (_tmpTan.lengthSq() < 1e-6) _tmpTan.set(0, 0, 1);
    else _tmpTan.normalize();
    _tmpSide.set(-_tmpTan.z, 0, _tmpTan.x).normalize();
    _tmpP.copy(pt).addScaledVector(_tmpSide, item.lat);
    var yaw = Math.atan2(_tmpTan.x, _tmpTan.z);
    _tmpQ.setFromAxisAngle(_axisY, yaw + (item.spin || 0));
    if (item.kind === 'spool') {
      _tmpQ.multiply(_qSpool);
    }
    _tmpP.y += item.yBase || 0; // sidewalk deck / curb lift (v446)
    if (item.kind === 'glow') {
      _tmpQ.multiply(_qFlat); // keep yaw+spin, then lay flat
      _tmpP.y += 0.12;
    } else if (item.kind === 'drum') {
      _tmpP.y += 0.52;
    } else if (item.kind === 'spool') {
      _tmpP.y += 0.28;
    } else if (item.kind === 'gravel') {
      _tmpP.y += 0.18;
    } else if (item.kind === 'shard') {
      _tmpP.y += 0.09;
    } else if (item.kind === 'scrub') {
      _tmpP.y += 0.55;
    } else if (item.kind === 'hulk') {
      _tmpP.y += 1.0 * (item.scale || 1);
    } else if (item.kind === 'hulkStripe') {
      _tmpP.y += 2.02 * (item.scale || 1);
      _tmpP.addScaledVector(_tmpTan, 1.9 * (item.scale || 1)); // marking near the front face
    } else {
      _tmpP.y += 0.45;
    }

    // Knocked / settled overrides
    if (opts.knock) {
      _tmpP.add(opts.knock.offset);
      _tmpQ.multiply(opts.knock.quat);
    }
    if (opts.settle) {
      _tmpP.y = pt.y + (item.yBase || 0) + 0.12;
    }

    var sc = item.scale || 1;
    if (opts.yScale != null) _tmpS.set(sc, sc * opts.yScale, sc);
    else _tmpS.set(sc, sc, sc);
    _tmpM.compose(_tmpP, _tmpQ, _tmpS);
    pool.mesh.setMatrixAt(item.matrixIndex, _tmpM);

    // Cache static transform for LOD restore (no curve re-eval for ~1000 props)
    if (!opts.knock) {
      if (!item._mat) item._mat = new THREE.Matrix4();
      item._mat.copy(_tmpM);
      item._wx = _tmpP.x;
      item._wz = _tmpP.z;
    }
  }

  function markDead(handle, item) {
    var pool = handle.pools[item.kind];
    if (!pool || !pool.mesh || item.matrixIndex == null) return;
    pool.mesh.setMatrixAt(item.matrixIndex, _zeroMat);
    pool.mesh.instanceMatrix.needsUpdate = true;
  }

  function bodyLat(body, ctx) {
    if (body._lat != null && isFinite(body._lat)) return body._lat;
    if (ctx && ctx.world && body.pos) {
      var near = ctx.world.nearest(body.pos, body.progress || 0);
      if (near && isFinite(near.lateralDist)) return near.lateralDist;
    }
    return 0;
  }

  function speedFloor(body, ctx) {
    var maxSp = body.maxSpeed;
    if (!maxSp && ctx && ctx.cfg) {
      var mul = body.mul || {};
      maxSp = ctx.cfg.drive.maxSpeed * (mul.speed || 1);
    }
    if (!maxSp) maxSp = 54;
    return Math.max(12, maxSp * 0.45);
  }

  function hitDir(body) {
    if (body && body.mesh && body.mesh.getWorldDirection) {
      var d = new THREE.Vector3();
      body.mesh.getWorldDirection(d);
      d.y = 0;
      if (d.lengthSq() > 1e-6) return d.normalize();
    }
    return new THREE.Vector3(0, 0, 1);
  }

  function applyHit(handle, body, isPlayer, ctx, hitPos, kind) {
    var mass = (body.mul && body.mul.mass) || 1;
    var lossFrac = U.clamp(0.22 / mass, 0.08, 0.22);
    body.speed *= (1 - lossFrac);
    var floor = speedFloor(body, ctx);
    if (body.speed < floor) body.speed = floor;

    if (ctx && ctx.particles && hitPos) {
      if (ctx.particles.sparks) ctx.particles.sparks(hitPos.clone().setY(hitPos.y + 0.4));
      if (ctx.particles.spawn && Math.random() < 0.65) {
        ctx.particles.spawn('smoke', hitPos.clone().setY(hitPos.y + 0.3), {
          count: 4, speed: 2.5, life: 0.55, scale: 0.9, gravity: -0.2,
        });
      }
    }

    // v442: debris burst + crunch
    if (ctx && ctx.debris && hitPos && GAME.debris && GAME.debris.burst) {
      GAME.debris.burst(ctx.debris, hitPos, hitDir(body), kind || 'crate');
    }
    if (ctx && ctx.sfx && ctx.sfx.collide) {
      try { ctx.sfx.collide(); } catch (e) {}
    }
    // Ember flash on the hero body (lit materials only; throttled by hitCd)
    if (isPlayer && ctx && ctx.particles && ctx.particles.burstLight && hitPos && handle.hitCd <= 0) {
      ctx.particles.burstLight(hitPos.clone().setY(hitPos.y + 0.8), 0xffa040, 6, 0.12);
    }

    if (isPlayer && ctx && ctx.hurtPlayer && handle.hitCd <= 0) {
      var cfgSl = (GAME.config && GAME.config.scrapLine) || {};
      var chip = cfgSl.hpChip != null ? cfgSl.hpChip : 3;
      var dmg = chip + Math.floor(Math.random() * 2); // 3–4
      ctx.hurtPlayer(dmg, hitPos, 'scrapLine');
      handle.hitCd = (cfgSl.hitCd != null ? cfgSl.hitCd : 0.55);
    }

    if (ctx && ctx.state) {
      ctx.state.camShake = Math.max(ctx.state.camShake || 0, isPlayer ? 0.18 : 0.1);
      if (isPlayer) {
        ctx.state.smashKick = Math.max(ctx.state.smashKick || 0, 0.38);
      }
    }
  }

  function beginKnock(item, body) {
    var dir = hitDir(body);
    var side = new THREE.Vector3(-dir.z, 0, dir.x);
    item.alive = false;
    item.knocked = {
      age: 0,
      life: 0.45,
      offset: new THREE.Vector3(0, 0.2, 0),
      vel: dir.clone().multiplyScalar(2 + Math.random() * 3)
        .addScaledVector(side, (Math.random() - 0.5) * 2.5)
        .add(new THREE.Vector3(0, 4 + Math.random() * 3, 0)),
      spin: (Math.random() - 0.5) * 10,
      quat: new THREE.Quaternion(),
      euler: 0,
    };
  }

  function settleKnock(handle, item) {
    item.knocked = null;
    item.settled = true;
    var pool = handle.pools[item.kind];
    if (!pool) return;
    placeMatrix(handle._path, item, pool, { settle: true, yScale: 0.3 });
    pool.mesh.instanceMatrix.needsUpdate = true;
  }

  GAME.scrapLine = {
    spawn: function (scene, path, mapDef, opts) {
      opts = opts || {};
      if (!scene || !path || !path.curve) return null;
      if (mapDef && mapDef.theme === 'coast') return null;
      var mapId = (mapDef && mapDef.id) || '';
      if (mapId === 'reach' || mapId === 'coast') return null;

      var roadHalf = opts.roadHalf != null ? opts.roadHalf : 11.5;
      var stage = (opts.stage | 0) || 1;
      var cfgSl = (GAME.config && GAME.config.scrapLine) || {};
      var maxInst = cfgSl.maxInstances || 400;
      var density = cfgSl.density != null ? cfgSl.density : 1;
      var clearFrac = cfgSl.clearFrac != null ? cfgSl.clearFrac : 0.44;
      var maxDress = cfgSl.maxDress != null ? cfgSl.maxDress : 1900;
      var dressStep = cfgSl.dressStep != null ? cfgSl.dressStep : 0.0011;
      var seed = mapSeed(stage, mapId);
      var g = geos();

      var placements = [];
      var sideFlip = 1;
      var step = 0.0032;
      var slot = 0;
      for (var t = T_MIN; t <= T_MAX && placements.length < maxInst; t += step) {
        if (skipT(t)) continue;
        var rv = U.seeded(seed + slot * 1.713);
        var prob = spawnProb(t, density);
        if (rv > prob) { slot++; continue; }
        var rv2 = U.seeded(seed + slot * 2.31 + 0.4);
        var latMin = clearFrac * roadHalf;
        var latMag = roadHalf * (0.50 + rv2 * 0.40);
        if (latMag < latMin + 0.25) latMag = latMin + 0.25 + rv * 0.6;
        sideFlip = -sideFlip;
        var kindPick = Math.floor(U.seeded(seed + slot * 5.7) * 5);
        placements.push({
          alive: true,
          t: t,
          lat: sideFlip * latMag,
          kind: KINDS[kindPick],
          spin: (U.seeded(seed + slot * 9.1) - 0.5) * 0.8,
          scale: 0.85 + U.seeded(seed + slot * 3.3) * 0.35,
        });
        slot++;
      }

      // v442 dress layer — non-collidable horizon filler outside hit band
      var dress = [];
      var dSlot = 0;
      var dressSide = 1;
      for (var dt = T_MIN; dt <= T_MAX && dress.length < maxDress; dt += dressStep) {
        if (skipT(dt)) continue;
        // Warden sweep band keeps full dress density but flat kinds only, so the
        // sweep telegraph is never occluded (collidable thinning there is untouched).
        var thin = dt >= WARDEN_LO && dt <= WARDEN_HI;
        var picks = 3;
        for (var p = 0; p < picks && dress.length < maxDress; p++) {
          dressSide = -dressSide;
          // v446: lip + sidewalk deck only (0.94–1.32 × roadHalf). Buildings start at
          // roadHalf + 4.0, so anything wider was buried inside frontage.
          var latMul = 0.94 + U.seeded(seed + dSlot * 4.4) * 0.38;
          var latAbs = roadHalf * latMul;
          var dk = DRESS_KINDS[Math.floor(U.seeded(seed + dSlot * 11.2) * 3)];
          if (thin && dk === 'scrub') dk = 'shard';
          var yBase = 0;
          if (latAbs < roadHalf + DECK_GAP) {
            dk = 'shard'; // on asphalt: flat only — no bush you drive through
          } else if (latAbs < roadHalf + DECK_GAP + CURB_W) {
            yBase = CURB_Y;
          } else if (latAbs < roadHalf + DECK_GAP + DECK_W) {
            yBase = DECK_Y;
          }
          dress.push({
            alive: true,
            t: dt,
            lat: dressSide * latAbs,
            yBase: yBase,
            kind: dk,
            spin: (U.seeded(seed + dSlot * 2.7) - 0.5) * 1.2,
            scale: 1.15 + U.seeded(seed + dSlot * 1.9) * 1.35,
          });
          dSlot++;
        }
      }

      // v449 hero hulks — burnt-out freight on the deck. Skip maglev + warden bands.
      var hulkStep = cfgSl.hulkStep != null ? cfgSl.hulkStep : 0.021;
      var hulkSide = 1;
      var hSlot = 0;
      for (var ht = T_MIN + 0.01; ht <= T_MAX; ht += hulkStep) {
        if (skipT(ht)) continue;
        if (ht >= WARDEN_LO - 0.01 && ht <= WARDEN_HI + 0.01) continue;
        var hj = ht + (U.seeded(seed + hSlot * 3.9) - 0.5) * hulkStep * 0.5;
        if (skipT(hj)) { hSlot++; continue; }
        hulkSide = -hulkSide;
        var hLat = roadHalf * (HULK_LO + U.seeded(seed + hSlot * 6.1) * (HULK_HI - HULK_LO));
        var hScale = 0.8 + U.seeded(seed + hSlot * 8.3) * 0.45;
        var hSpin = (U.seeded(seed + hSlot * 12.7) - 0.5) * 0.5;
        dress.push({ alive: true, t: hj, lat: hulkSide * hLat, yBase: DECK_Y, kind: 'hulk', spin: hSpin, scale: hScale });
        dress.push({ alive: true, t: hj, lat: hulkSide * hLat, yBase: DECK_Y, kind: 'hulkStripe', spin: hSpin, scale: hScale });
        hSlot++;
      }

      var counts = { drum: 0, ballast: 0, spool: 0, crate: 0, glow: 0 };
      placements.forEach(function (it) { counts[it.kind]++; });
      var dressCounts = { gravel: 0, shard: 0, scrub: 0, hulk: 0, hulkStripe: 0 };
      dress.forEach(function (it) { dressCounts[it.kind]++; });

      var group = new THREE.Group();
      group.name = 'scrapLine';
      var pools = {};
      var matsOwned = [];

      function addPool(kind, n) {
        if (n <= 0) return;
        var mat = kindMat(kind, 0);
        matsOwned.push(mat);
        var mesh = new THREE.InstancedMesh(g[kind], mat, n);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.frustumCulled = false;
        pools[kind] = { mesh: mesh, cap: n, used: 0 };
        group.add(mesh);
      }

      KINDS.forEach(function (kind) { addPool(kind, counts[kind] || 0); });
      DRESS_KINDS.forEach(function (kind) { addPool(kind, dressCounts[kind] || 0); });

      var perKindIdx = {
        drum: 0, ballast: 0, spool: 0, crate: 0, glow: 0,
        gravel: 0, shard: 0, scrub: 0, hulk: 0, hulkStripe: 0,
      };
      placements.forEach(function (item) {
        var pool = pools[item.kind];
        if (!pool) return;
        item.matrixIndex = perKindIdx[item.kind]++;
        placeMatrix(path, item, pool);
        pool.mesh.instanceMatrix.needsUpdate = true;
      });
      dress.forEach(function (item) {
        var pool = pools[item.kind];
        if (!pool) return;
        item.matrixIndex = perKindIdx[item.kind]++;
        placeMatrix(path, item, pool);
        pool.mesh.instanceMatrix.needsUpdate = true;
      });
      // Glow discs alternate cyan / amber via instanceColor (mat is white)
      if (pools.glow && pools.glow.mesh.setColorAt) {
        for (var gi = 0; gi < pools.glow.cap; gi++) {
          pools.glow.mesh.setColorAt(gi, GLOW_COLORS[gi % 2]);
        }
        if (pools.glow.mesh.instanceColor) pools.glow.mesh.instanceColor.needsUpdate = true;
      }

      // District gate gantries (overhead freight frames)
      var gantries = [];
      var gantryTs = [0.10, 0.26, 0.66, 0.80];
      var postMat = new THREE.MeshBasicMaterial({ color: 0x2a2430 });
      var beamMat = new THREE.MeshBasicMaterial({ color: 0x3a3540 });
      matsOwned.push(postMat, beamMat);
      var postMesh = new THREE.InstancedMesh(g.gantryPost, postMat, gantryTs.length * 2);
      var beamMesh = new THREE.InstancedMesh(g.gantryBeam, beamMat, gantryTs.length);
      postMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      beamMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(postMesh);
      group.add(beamMesh);
      var pi = 0;
      gantryTs.forEach(function (gt) {
        var pt = path.curve.getPointAt(gt);
        var tan = path.curve.getTangentAt(gt);
        _tmpTan.set(tan.x, 0, tan.z).normalize();
        _tmpSide.set(-_tmpTan.z, 0, _tmpTan.x).normalize();
        var yaw = Math.atan2(_tmpTan.x, _tmpTan.z);
        var span = roadHalf * 1.85;
        for (var s = -1; s <= 1; s += 2) {
          _tmpP.copy(pt).addScaledVector(_tmpSide, s * span);
          _tmpP.y = pt.y + 7;
          _tmpQ.setFromAxisAngle(_axisY, yaw);
          _tmpS.set(1, 1, 1);
          _tmpM.compose(_tmpP, _tmpQ, _tmpS);
          postMesh.setMatrixAt(pi, _tmpM);
          pi++;
        }
        _tmpP.copy(pt);
        _tmpP.y = pt.y + 13.5;
        _tmpQ.setFromAxisAngle(_axisY, yaw);
        _tmpS.set(1, 1, 1);
        _tmpM.compose(_tmpP, _tmpQ, _tmpS);
        beamMesh.setMatrixAt(gantries.length, _tmpM);
        gantries.push({ t: gt, pt: pt.clone() });
      });
      postMesh.instanceMatrix.needsUpdate = true;
      beamMesh.instanceMatrix.needsUpdate = true;

      scene.add(group);

      return {
        group: group,
        pools: pools,
        items: placements,
        dress: dress,
        gantries: gantries,
        hulks: [],
        roadHalf: roadHalf,
        seed: seed,
        hitCd: 0,
        _mats: matsOwned,
        _gantryPosts: postMesh,
        _gantryBeams: beamMesh,
        _lodTick: 0,
        _path: path,
      };
    },

    registerHulk: function (handle, rival) {
      if (!handle || !rival || !rival.mesh) return;
      while (handle.hulks.length >= 6) {
        var old = handle.hulks.shift();
        if (old && old.mesh) old.mesh.visible = false;
        if (old && old.rival) old.rival._hulkHidden = true;
      }
      handle.hulks.push({
        rival: rival,
        mesh: rival.mesh,
        pos: rival.pos.clone(),
        progress: rival.progress || 0,
        lat: rival._lat || 0,
        smokeT: 0.4,
      });
    },

    collide: function (handle, body, isPlayer, ctx) {
      if (!handle || !body) return 0;
      if (body.dead && !isPlayer) return 0;
      if (body.finished) return 0;
      if (isPlayer && body.hp <= 0) return 0;

      var progress = body.progress || 0;
      var lat = bodyLat(body, ctx);
      var hits = 0;
      var hitRadT = 0.012;
      var hitRadLat = 1.75;

      for (var i = 0; i < handle.items.length; i++) {
        var item = handle.items[i];
        if (!item.alive) continue;
        if (Math.abs(item.t - progress) > hitRadT) continue;
        if (Math.abs(lat - item.lat) > hitRadLat) continue;
        beginKnock(item, body);
        var hitPos = body.pos;
        if (ctx && ctx.path && ctx.path.curve) {
          var pt = ctx.path.curve.getPointAt(item.t);
          hitPos = pt.clone();
          _tmpTan.set(
            ctx.path.curve.getTangentAt(item.t).x, 0,
            ctx.path.curve.getTangentAt(item.t).z
          ).normalize();
          _tmpSide.set(-_tmpTan.z, 0, _tmpTan.x);
          hitPos.addScaledVector(_tmpSide, item.lat);
        }
        applyHit(handle, body, isPlayer, ctx, hitPos, item.kind);
        hits++;
      }

      for (var h = 0; h < handle.hulks.length; h++) {
        var hk = handle.hulks[h];
        if (!hk || hk.rival && hk.rival._hulkHidden) continue;
        if (Math.abs(hk.progress - progress) > hitRadT * 1.5) continue;
        if (Math.abs(lat - hk.lat) > 2.8) continue;
        if (isPlayer && handle.hitCd > 0) continue;
        applyHit(handle, body, isPlayer, ctx, hk.pos, 'ballast');
        hits++;
      }

      return hits;
    },

    update: function (handle, dt, ctx) {
      if (!handle) return;
      if (handle.hitCd > 0) handle.hitCd -= dt;
      if (ctx && ctx.path) handle._path = ctx.path;

      // Knocked prop tumble → settle as flattened wreck
      for (var ki = 0; ki < handle.items.length; ki++) {
        var kn = handle.items[ki];
        if (!kn.knocked) continue;
        var k = kn.knocked;
        k.age += dt;
        k.vel.y -= 22 * dt;
        k.offset.x += k.vel.x * dt;
        k.offset.y += k.vel.y * dt;
        k.offset.z += k.vel.z * dt;
        if (k.offset.y < 0) {
          k.offset.y = 0;
          k.vel.y *= -0.25;
          k.vel.x *= 0.7;
          k.vel.z *= 0.7;
        }
        k.euler += k.spin * dt;
        k.quat.setFromAxisAngle(_axisX, k.euler * 0.6);
        _qKnockY.setFromAxisAngle(_axisY, k.euler);
        k.quat.multiply(_qKnockY);
        var poolK = handle.pools[kn.kind];
        if (poolK && ctx && ctx.path) {
          placeMatrix(ctx.path, kn, poolK, { knock: k });
          poolK.mesh.instanceMatrix.needsUpdate = true;
        }
        if (k.age >= k.life) settleKnock(handle, kn);
      }

      // Hulk smoke
      if (handle.hulks && ctx && ctx.particles) {
        for (var hi = 0; hi < handle.hulks.length; hi++) {
          var hull = handle.hulks[hi];
          if (!hull || hull.rival && hull.rival._hulkHidden) continue;
          hull.smokeT = (hull.smokeT || 0) - dt;
          if (hull.smokeT <= 0) {
            hull.smokeT = 0.55 + Math.random() * 0.35;
            if (ctx.particles.spawn) {
              var sp = hull.pos.clone().setY(hull.pos.y + 0.6);
              ctx.particles.spawn('smoke', sp, {
                count: 2, speed: 1.8, life: 0.7, scale: 0.85, gravity: -0.15,
              });
            }
          }
        }
      }

      // LOD: zero-scale far instances
      if (!ctx || !ctx.player || !ctx.player.pos) return;
      handle._lodTick = (handle._lodTick || 0) + 1;
      if (handle._lodTick % 4 !== 0) return;
      var px = ctx.player.pos.x;
      var pz = ctx.player.pos.z;
      // World ≈45m per 0.01 t — prior 130–165m wiped almost all chase-cam clutter.
      var lodHit = 320;
      var lodDress = 480;
      var low = !!(GAME.qualityLevel === 'low');

      function lodList(list, radius) {
        for (var j = 0; j < list.length; j++) {
          var it = list[j];
          if (it.knocked) continue; // keep animating near
          if (!it.alive && !it.settled) continue;
          var pl = handle.pools[it.kind];
          if (!pl || !pl.mesh) continue;
          if (!ctx.path || !ctx.path.curve) continue;
          if (it._wx == null || !it._mat) {
            // Cache miss (shouldn't happen after spawn) — place once to populate
            if (it.settled) placeMatrix(ctx.path, it, pl, { settle: true, yScale: 0.3 });
            else placeMatrix(ctx.path, it, pl);
          }
          var dx = it._wx - px;
          var dz = it._wz - pz;
          var far = (dx * dx + dz * dz) > radius * radius;
          if (low && (it.kind === 'gravel' || it.kind === 'shard' || it.kind === 'scrub')) {
            // Low quality: drop half of small dress via LOD bias (hulks stay — they're the silhouette)
            if ((it.matrixIndex | 0) % 2 === 1) far = true;
          }
          if (far) {
            if (!it._lodHidden) {
              pl.mesh.setMatrixAt(it.matrixIndex, _zeroMat);
              it._lodHidden = true;
              pl.mesh.instanceMatrix.needsUpdate = true;
            }
          } else if (it._lodHidden || handle._lodTick <= 8) {
            // Restore from cached matrix — no curve eval. First ticks always
            // rewrite so an early origin cull can't leave the ribbon empty.
            it._lodHidden = false;
            pl.mesh.setMatrixAt(it.matrixIndex, it._mat);
            pl.mesh.instanceMatrix.needsUpdate = true;
          }
        }
      }

      lodList(handle.items, lodHit);
      if (handle.dress) lodList(handle.dress, lodDress);
    },

    clear: function (handle, scene) {
      if (!handle) return;
      if (handle.group) {
        if (handle.group.parent) handle.group.parent.remove(handle.group);
        else if (scene) scene.remove(handle.group);
      }
      if (handle._mats) {
        handle._mats.forEach(function (m) { if (m && m.dispose) m.dispose(); });
      }
      handle.group = null;
      handle.pools = null;
      handle.items = null;
      handle.dress = null;
      handle.hulks = null;
    },
  };
})();
