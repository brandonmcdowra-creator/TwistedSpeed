/**
 * Scrap Line — wreckable shoulder freight (v441).
 * MeshBasic + InstancedMesh only. Neon/Sepulcher/city — not coast/REACH.
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
        color: idx % 2 ? 0x00e5ff : 0xff9f1c,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    }
    var cols = [0x3a3530, 0x2a2825, 0x4a4038, 0x352830];
    var ci = KINDS.indexOf(kind);
    return new THREE.MeshBasicMaterial({ color: cols[ci] != null ? cols[ci] : 0x3a3530 });
  }

  function placeMatrix(path, item, pool) {
    if (!path || !path.curve || !item || !pool || !pool.mesh) return;
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
      _tmpQ.multiply(new THREE.Quaternion().setFromAxisAngle(_axisX, Math.PI / 2));
    }
    if (item.kind === 'glow') {
      _tmpQ.setFromAxisAngle(_axisX, -Math.PI / 2);
      _tmpP.y += 0.12;
    } else if (item.kind === 'drum') {
      _tmpP.y += 0.52;
    } else if (item.kind === 'spool') {
      _tmpP.y += 0.28;
    } else {
      _tmpP.y += 0.45;
    }
    var sc = item.scale || 1;
    _tmpS.set(sc, sc, sc);
    _tmpM.compose(_tmpP, _tmpQ, _tmpS);
    pool.mesh.setMatrixAt(item.matrixIndex, _tmpM);
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

  function applyHit(handle, body, isPlayer, ctx, hitPos) {
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

    if (isPlayer && ctx && ctx.hurtPlayer && handle.hitCd <= 0) {
      var cfgSl = (GAME.config && GAME.config.scrapLine) || {};
      var chip = cfgSl.hpChip != null ? cfgSl.hpChip : 3;
      var dmg = chip + Math.floor(Math.random() * 2); // 3–4
      ctx.hurtPlayer(dmg, hitPos, 'scrapLine');
      handle.hitCd = (cfgSl.hitCd != null ? cfgSl.hitCd : 0.55);
    }

    if (ctx && ctx.state) {
      ctx.state.camShake = Math.max(ctx.state.camShake || 0, isPlayer ? 0.14 : 0.08);
    }
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

      var counts = { drum: 0, ballast: 0, spool: 0, crate: 0, glow: 0 };
      placements.forEach(function (p) { counts[p.kind]++; });

      var group = new THREE.Group();
      group.name = 'scrapLine';
      var pools = {};
      var matsOwned = [];

      KINDS.forEach(function (kind) {
        var n = counts[kind] || 0;
        if (n <= 0) return;
        var mat = kindMat(kind, 0);
        matsOwned.push(mat);
        var mesh = new THREE.InstancedMesh(g[kind], mat, n);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        pools[kind] = { mesh: mesh, cap: n, used: 0 };
        group.add(mesh);
      });

      var perKindIdx = { drum: 0, ballast: 0, spool: 0, crate: 0, glow: 0 };
      placements.forEach(function (item) {
        var pool = pools[item.kind];
        if (!pool) return;
        item.matrixIndex = perKindIdx[item.kind]++;
        placeMatrix(path, item, pool);
        pool.mesh.instanceMatrix.needsUpdate = true;
      });

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
          _tmpM.compose(_tmpP, _tmpQ, _tmpS);
          postMesh.setMatrixAt(pi, _tmpM);
          pi++;
        }
        _tmpP.copy(pt);
        _tmpP.y = pt.y + 13.5;
        _tmpQ.setFromAxisAngle(_axisY, yaw);
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
        gantries: gantries,
        hulks: [],
        roadHalf: roadHalf,
        seed: seed,
        hitCd: 0,
        _mats: matsOwned,
        _gantryPosts: postMesh,
        _gantryBeams: beamMesh,
        _lodTick: 0,
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
        item.alive = false;
        markDead(handle, item);
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
        applyHit(handle, body, isPlayer, ctx, hitPos);
        hits++;
      }

      for (var h = 0; h < handle.hulks.length; h++) {
        var hk = handle.hulks[h];
        if (!hk || hk.rival && hk.rival._hulkHidden) continue;
        if (Math.abs(hk.progress - progress) > hitRadT * 1.5) continue;
        if (Math.abs(lat - hk.lat) > 2.8) continue;
        applyHit(handle, body, isPlayer, ctx, hk.pos);
        hits++;
      }

      return hits;
    },

    update: function (handle, dt, ctx) {
      if (!handle) return;
      if (handle.hitCd > 0) handle.hitCd -= dt;

      // Spin glow discs
      var pool = handle.pools && handle.pools.glow;
      if (pool && pool.mesh && ctx && ctx.path) {
        for (var i = 0; i < handle.items.length; i++) {
          var item = handle.items[i];
          if (!item.alive || item.kind !== 'glow') continue;
          item.spin = (item.spin || 0) + dt * 1.2;
          placeMatrix(ctx.path, item, pool);
        }
        pool.mesh.instanceMatrix.needsUpdate = true;
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

      // LOD: zero-scale far instances (>130m from player)
      if (!ctx || !ctx.player || !ctx.player.pos) return;
      handle._lodTick = (handle._lodTick || 0) + 1;
      if (handle._lodTick % 4 !== 0) return;
      var px = ctx.player.pos.x;
      var pz = ctx.player.pos.z;
      var lodR = 130;
      KINDS.forEach(function (kind) {
        var pl = handle.pools[kind];
        if (!pl || !pl.mesh) return;
        for (var j = 0; j < handle.items.length; j++) {
          var it = handle.items[j];
          if (it.kind !== kind) continue;
          if (!it.alive) continue;
          if (!ctx.path || !ctx.path.curve) continue;
          var ptp = ctx.path.curve.getPointAt(it.t);
          var dx = ptp.x - px;
          var dz = ptp.z - pz;
          var far = (dx * dx + dz * dz) > lodR * lodR;
          if (far && !it._lodHidden) {
            pl.mesh.setMatrixAt(it.matrixIndex, _zeroMat);
            it._lodHidden = true;
          } else if (!far && it._lodHidden) {
            it._lodHidden = false;
            placeMatrix(ctx.path, it, pl);
          }
        }
        pl.mesh.instanceMatrix.needsUpdate = true;
      });
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
      var g = geos();
      // Shared geos — do not dispose
      handle.group = null;
      handle.pools = null;
      handle.items = null;
      handle.hulks = null;
    },
  };
})();
