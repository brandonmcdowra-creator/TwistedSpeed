/**
 * Debris wake — ballistic scrap chunks + ground dust (v442 Wreck Wake).
 * MeshBasic + InstancedMesh only. Complements Scrap Line smash juice.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});

  var CHUNK_CAP = 96;
  var DUST_CAP = 96;
  var _axisY = new THREE.Vector3(0, 1, 0);
  var _fwd = new THREE.Vector3();
  var _side = new THREE.Vector3();
  var _emit = new THREE.Vector3();
  var _tmpM = new THREE.Matrix4();
  var _tmpP = new THREE.Vector3();
  var _tmpQ = new THREE.Quaternion();
  var _tmpS = new THREE.Vector3(1, 1, 1);
  var _tmpC = new THREE.Color();
  var _euler = new THREE.Euler();
  var _zero = new THREE.Matrix4().makeScale(0, 0, 0);

  var CHUNK_COUNTS = { ballast: 9, crate: 8, drum: 7, spool: 6, glow: 4 };

  var _dustTex = null;
  function dustTexture() {
    if (_dustTex || typeof document === 'undefined') return _dustTex;
    var S = 64;
    var c = document.createElement('canvas');
    c.width = c.height = S;
    var ctx = c.getContext('2d');
    if (!ctx) return null;
    var g = ctx.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.16)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    _dustTex = new THREE.CanvasTexture(c);
    return _dustTex;
  }

  function makeHandle(scene) {
    var chunkGeo = new THREE.BoxGeometry(0.55, 0.22, 0.4);
    var dustGeo = new THREE.PlaneGeometry(1.4, 1.4);
    var chunkMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // tinted per instance
    // Additive: per-instance colour carries the fade (colour→black = invisible).
    // NormalBlending here drew faded puffs as dark 0.7-opacity smudges.
    var dustMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: dustTexture(),
      transparent: true,
      opacity: 1,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    var chunkMesh = new THREE.InstancedMesh(chunkGeo, chunkMat, CHUNK_CAP);
    chunkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    chunkMesh.frustumCulled = false;
    // instanceColor starts null in r160 — allocate it so per-chunk heat tint works
    for (var ci = 0; ci < CHUNK_CAP; ci++) writeChunkColor(chunkMesh, ci, 0);
    if (chunkMesh.instanceColor) chunkMesh.instanceColor.needsUpdate = true;

    var dustMesh = new THREE.InstancedMesh(dustGeo, dustMat, DUST_CAP);
    dustMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    dustMesh.frustumCulled = false;
    for (var di = 0; di < DUST_CAP; di++) {
      dustMesh.setMatrixAt(di, _zero);
      if (dustMesh.setColorAt) dustMesh.setColorAt(di, _tmpC.setRGB(0.78, 0.66, 0.5));
    }
    dustMesh.instanceMatrix.needsUpdate = true;
    if (dustMesh.instanceColor) dustMesh.instanceColor.needsUpdate = true;

    for (var i = 0; i < CHUNK_CAP; i++) chunkMesh.setMatrixAt(i, _zero);
    chunkMesh.instanceMatrix.needsUpdate = true;

    var group = new THREE.Group();
    group.name = 'debrisWake';
    group.add(chunkMesh);
    group.add(dustMesh);
    scene.add(group);

    return {
      group: group,
      chunkMesh: chunkMesh,
      dustMesh: dustMesh,
      chunkGeo: chunkGeo,
      dustGeo: dustGeo,
      chunkMat: chunkMat,
      dustMat: dustMat,
      chunks: [],
      dust: [],
      chunkCursor: 0,
      dustCursor: 0,
      wakeAcc: 0,
      rivalWakeAcc: 0,
      low: false,
    };
  }

  function writeChunk(mesh, idx, pos, euler, scale) {
    _tmpP.copy(pos);
    _euler.set(euler.x, euler.y, euler.z);
    _tmpQ.setFromEuler(_euler);
    _tmpS.set(scale, scale, scale);
    _tmpM.compose(_tmpP, _tmpQ, _tmpS);
    mesh.setMatrixAt(idx, _tmpM);
  }

  // Dust quads stand upright and yaw to face the chase cam (flat-on-ground read
  // edge-on from a low camera — the v442 wake was invisible at speed).
  function writeDust(mesh, idx, pos, scale, alpha, camYaw) {
    _tmpP.set(pos.x, pos.y, pos.z);
    _tmpQ.setFromAxisAngle(_axisY, camYaw || 0);
    _tmpS.set(scale, scale * 0.7, 1);
    _tmpM.compose(_tmpP, _tmpQ, _tmpS);
    mesh.setMatrixAt(idx, _tmpM);
    if (mesh.setColorAt) {
      var a = alpha < 0 ? 0 : alpha;
      // Night grit — sodium-lit grey, not daylight sand (additive, so keep it modest)
      mesh.setColorAt(idx, _tmpC.setRGB(0.34 * a, 0.29 * a, 0.22 * a));
    }
  }

  // Chunk heat: fresh scrap glows ember-orange at the impact, cools to cold grey.
  function writeChunkColor(mesh, idx, heat) {
    if (!mesh.setColorAt) return;
    var h = heat < 0 ? 0 : heat > 1 ? 1 : heat;
    _tmpC.setRGB(0.35 + 0.65 * h, 0.31 + 0.25 * h, 0.28 - 0.1 * h);
    mesh.setColorAt(idx, _tmpC);
  }

  function allocChunk(handle) {
    var idx = handle.chunkCursor % CHUNK_CAP;
    handle.chunkCursor++;
    // Reuse slot — drop any live chunk occupying it
    for (var i = handle.chunks.length - 1; i >= 0; i--) {
      if (handle.chunks[i].idx === idx) handle.chunks.splice(i, 1);
    }
    return idx;
  }

  function allocDust(handle) {
    var idx = handle.dustCursor % DUST_CAP;
    handle.dustCursor++;
    for (var i = handle.dust.length - 1; i >= 0; i--) {
      if (handle.dust[i].idx === idx) handle.dust.splice(i, 1);
    }
    return idx;
  }

  GAME.debris = {
    create: function (scene) {
      if (!scene) return null;
      return makeHandle(scene);
    },

    clear: function (handle, scene) {
      if (!handle) return;
      if (handle.group) {
        if (handle.group.parent) handle.group.parent.remove(handle.group);
        else if (scene) scene.remove(handle.group);
      }
      if (handle.chunkMat && handle.chunkMat.dispose) handle.chunkMat.dispose();
      if (handle.dustMat && handle.dustMat.dispose) handle.dustMat.dispose();
      if (handle.chunkGeo && handle.chunkGeo.dispose) handle.chunkGeo.dispose();
      if (handle.dustGeo && handle.dustGeo.dispose) handle.dustGeo.dispose();
    },

    setLow: function (handle, low) {
      if (handle) handle.low = !!low;
    },

    /** Burst scrap chunks + one dust puff at smash site. */
    burst: function (handle, pos, dir, kind) {
      if (!handle || !pos) return;
      var n = CHUNK_COUNTS[kind] || 6;
      if (handle.low) n = Math.max(3, Math.floor(n * 0.5));
      // Several props can be struck in one frame (hit window ≈54m); only the first
      // gets the full burst + puff so stacked additive dust can't white out the cam.
      var throttled = (handle.burstCd || 0) > 0;
      if (throttled) n = Math.min(n, 3);
      handle.burstCd = 0.12;
      var base = dir && dir.lengthSq() > 1e-6 ? dir.clone().normalize() : new THREE.Vector3(0, 0, 1);
      var up = new THREE.Vector3(0, 1, 0);
      var side = new THREE.Vector3().crossVectors(up, base).normalize();
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0);

      for (var i = 0; i < n; i++) {
        var idx = allocChunk(handle);
        var speed = 7 + Math.random() * 6;
        var vel = base.clone().multiplyScalar(speed * (0.55 + Math.random() * 0.55));
        vel.addScaledVector(up, 3.5 + Math.random() * 4.5);
        vel.addScaledVector(side, (Math.random() - 0.5) * 6);
        var scale = 0.14 + Math.random() * 0.2;
        var euler = {
          x: Math.random() * Math.PI,
          y: Math.random() * Math.PI,
          z: Math.random() * Math.PI,
        };
        var spin = {
          x: (Math.random() - 0.5) * 14,
          y: (Math.random() - 0.5) * 14,
          z: (Math.random() - 0.5) * 10,
        };
        var cpos = pos.clone();
        cpos.y += 0.4 + Math.random() * 0.5;
        handle.chunks.push({
          idx: idx,
          pos: cpos,
          vel: vel,
          euler: euler,
          spin: spin,
          scale: scale,
          life: 1.1 + Math.random() * 0.5,
          age: 0,
          bounced: false,
          groundY: pos.y + 0.08,
        });
        writeChunk(handle.chunkMesh, idx, cpos, euler, scale);
      }
      handle.chunkMesh.instanceMatrix.needsUpdate = true;
      if (!throttled) this.puff(handle, pos, 1.1);
    },

    puff: function (handle, pos, scale0) {
      if (!handle || !pos) return;
      if (handle.low && Math.random() > 0.55) return;
      var idx = allocDust(handle);
      var dpos = pos.clone();
      dpos.y += 0.35;
      handle.dust.push({
        idx: idx,
        pos: dpos,
        scale0: scale0 || 1.2,
        life: 0.9,
        age: 0,
        drift: (Math.random() - 0.5) * 0.6,
      });
      writeDust(handle.dustMesh, idx, dpos, scale0 || 1.2, 0.7, handle.camYaw);
      handle.dustMesh.instanceMatrix.needsUpdate = true;
      if (handle.dustMesh.instanceColor) handle.dustMesh.instanceColor.needsUpdate = true;
    },

    update: function (handle, dt, ctx) {
      if (!handle) return;
      ctx = ctx || {};
      var cfgD = (GAME.config && GAME.config.debris) || {};
      var playerWake = cfgD.playerWake != null ? cfgD.playerWake : 0.1;
      var rivalWake = cfgD.rivalWake != null ? cfgD.rivalWake : 0.22;
      var speedNormGate = cfgD.speedNormGate != null ? cfgD.speedNormGate : 0.45;

      if (handle.burstCd > 0) handle.burstCd -= dt;

      // Camera yaw for upright dust billboards
      if (ctx.camera) {
        ctx.camera.getWorldDirection(_fwd);
        handle.camYaw = Math.atan2(_fwd.x, _fwd.z) + Math.PI;
      }

      // Player rooster tails — one puff behind each rear wheel
      if (ctx.player && ctx.player.pos && !ctx.player.dead) {
        var maxSp = 54;
        if (ctx.cfg && ctx.cfg.drive) {
          maxSp = ctx.cfg.drive.maxSpeed * ((ctx.player.mul && ctx.player.mul.speed) || 1);
        }
        var sn = Math.abs(ctx.player.speed || 0) / Math.max(1, maxSp);
        if (sn >= speedNormGate) {
          handle.wakeAcc = (handle.wakeAcc || 0) + dt;
          var interval = handle.low ? playerWake * 1.8 : playerWake;
          if (handle.wakeAcc >= interval) {
            handle.wakeAcc = 0;
            if (ctx.player.mesh && ctx.player.mesh.getWorldDirection) {
              ctx.player.mesh.getWorldDirection(_fwd);
              _fwd.y = 0;
              if (_fwd.lengthSq() < 1e-6) _fwd.set(0, 0, 1);
              _fwd.normalize();
            } else {
              _fwd.set(0, 0, -1);
            }
            _side.set(-_fwd.z, 0, _fwd.x);
            var wakeScale = 0.55 + sn * 0.75;
            for (var w = -1; w <= 1; w += 2) {
              _emit.copy(ctx.player.pos).addScaledVector(_fwd, -2.6).addScaledVector(_side, w * 0.85);
              _emit.y = ctx.player.pos.y;
              this.puff(handle, _emit, wakeScale);
            }
          }
        }
      }

      // Rival dust — nearest live rival to camera only
      if (ctx.rivals && ctx.camera) {
        handle.rivalWakeAcc = (handle.rivalWakeAcc || 0) + dt;
        var rInt = handle.low ? rivalWake * 2 : rivalWake;
        if (handle.rivalWakeAcc >= rInt) {
          handle.rivalWakeAcc = 0;
          var cam = ctx.camera.position;
          var best = null;
          var bestD = 90 * 90;
          for (var ri = 0; ri < ctx.rivals.length; ri++) {
            var rv = ctx.rivals[ri];
            if (!rv || rv.dead || !rv.pos) continue;
            var dx = rv.pos.x - cam.x;
            var dz = rv.pos.z - cam.z;
            var d2 = dx * dx + dz * dz;
            if (d2 > bestD) continue;
            var maxR = 54;
            if (ctx.cfg && ctx.cfg.drive) maxR = ctx.cfg.drive.maxSpeed * ((rv.mul && rv.mul.speed) || 1);
            if (Math.abs(rv.speed || 0) / Math.max(1, maxR) < speedNormGate) continue;
            best = rv;
            bestD = d2;
          }
          if (best) this.puff(handle, best.pos, 1.0);
        }
      }

      // Integrate chunks
      var groundBounce = 0.35;
      for (var c = handle.chunks.length - 1; c >= 0; c--) {
        var ch = handle.chunks[c];
        ch.age += dt;
        if (ch.age >= ch.life) {
          handle.chunkMesh.setMatrixAt(ch.idx, _zero);
          handle.chunks.splice(c, 1);
          continue;
        }
        ch.vel.y -= 18 * dt;
        ch.pos.x += ch.vel.x * dt;
        ch.pos.y += ch.vel.y * dt;
        ch.pos.z += ch.vel.z * dt;
        if (!ch.bounced && ch.pos.y <= ch.groundY) {
          ch.pos.y = ch.groundY;
          ch.vel.y = Math.abs(ch.vel.y) * groundBounce;
          ch.vel.x *= 0.6;
          ch.vel.z *= 0.6;
          ch.bounced = true;
        }
        ch.euler.x += ch.spin.x * dt;
        ch.euler.y += ch.spin.y * dt;
        ch.euler.z += ch.spin.z * dt;
        var fade = 1 - ch.age / ch.life;
        var sc = ch.scale * (0.35 + 0.65 * fade);
        writeChunk(handle.chunkMesh, ch.idx, ch.pos, ch.euler, sc);
        writeChunkColor(handle.chunkMesh, ch.idx, 1 - ch.age / 0.45); // ember cools in ~0.45s
      }
      handle.chunkMesh.instanceMatrix.needsUpdate = true;
      if (handle.chunkMesh.instanceColor) handle.chunkMesh.instanceColor.needsUpdate = true;

      // Integrate dust
      var camPos = ctx.camera ? ctx.camera.position : null;
      for (var d = handle.dust.length - 1; d >= 0; d--) {
        var du = handle.dust[d];
        du.age += dt;
        if (du.age >= du.life) {
          handle.dustMesh.setMatrixAt(du.idx, _zero);
          handle.dust.splice(d, 1);
          continue;
        }
        var u = du.age / du.life;
        var scD = du.scale0 * (1 + u * 1.7);
        var alpha = (1 - u) * 0.7;
        // Never let a puff sit as a wall between chase cam and the hero
        if (camPos) {
          var cdx = du.pos.x - camPos.x;
          var cdz = du.pos.z - camPos.z;
          var cd = Math.sqrt(cdx * cdx + cdz * cdz);
          var near = (cd - 6) / 8;
          alpha *= near < 0 ? 0 : near > 1 ? 1 : near;
        }
        du.pos.y += dt * 1.1;
        du.pos.x += du.drift * dt;
        writeDust(handle.dustMesh, du.idx, du.pos, scD, alpha, handle.camYaw);
      }
      handle.dustMesh.instanceMatrix.needsUpdate = true;
      if (handle.dustMesh.instanceColor) handle.dustMesh.instanceColor.needsUpdate = true;
    },
  };
})();
