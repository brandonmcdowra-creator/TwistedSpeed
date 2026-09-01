/**
 * Debris wake — ballistic scrap chunks + ground dust (v442 Wreck Wake).
 * MeshBasic + InstancedMesh only. Complements Scrap Line smash juice.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});

  var CHUNK_CAP = 96;
  var DUST_CAP = 64;
  var _tmpM = new THREE.Matrix4();
  var _tmpP = new THREE.Vector3();
  var _tmpQ = new THREE.Quaternion();
  var _tmpS = new THREE.Vector3(1, 1, 1);
  var _tmpC = new THREE.Color();
  var _euler = new THREE.Euler();
  var _zero = new THREE.Matrix4().makeScale(0, 0, 0);

  var CHUNK_COUNTS = { ballast: 9, crate: 8, drum: 7, spool: 6, glow: 4 };

  function makeHandle(scene) {
    var chunkGeo = new THREE.BoxGeometry(0.55, 0.22, 0.4);
    var dustGeo = new THREE.PlaneGeometry(1.4, 1.4);
    var chunkMat = new THREE.MeshBasicMaterial({ color: 0x5a5048 });
    var dustMat = new THREE.MeshBasicMaterial({
      color: 0xc4a882,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });

    var chunkMesh = new THREE.InstancedMesh(chunkGeo, chunkMat, CHUNK_CAP);
    chunkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    chunkMesh.frustumCulled = false;
    if (chunkMesh.instanceColor === undefined && chunkMesh.setColorAt) {
      for (var ci = 0; ci < CHUNK_CAP; ci++) chunkMesh.setColorAt(ci, _tmpC.setHex(0x5a5048));
    }

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

  function writeDust(mesh, idx, pos, scale, alpha) {
    _tmpP.set(pos.x, pos.y, pos.z);
    _tmpQ.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    _tmpS.set(scale, scale, 1);
    _tmpM.compose(_tmpP, _tmpQ, _tmpS);
    mesh.setMatrixAt(idx, _tmpM);
    if (mesh.setColorAt) {
      var a = Math.max(0.05, alpha);
      mesh.setColorAt(idx, _tmpC.setRGB(0.78 * a, 0.66 * a, 0.5 * a));
    }
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
      this.puff(handle, pos, 1.4);
    },

    puff: function (handle, pos, scale0) {
      if (!handle || !pos) return;
      if (handle.low && Math.random() > 0.55) return;
      var idx = allocDust(handle);
      var dpos = pos.clone();
      dpos.y += 0.15;
      handle.dust.push({
        idx: idx,
        pos: dpos,
        scale0: scale0 || 1.2,
        life: 0.9,
        age: 0,
      });
      writeDust(handle.dustMesh, idx, dpos, scale0 || 1.2, 0.7);
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

      // Player dust wake
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
            var behind = ctx.player.pos.clone();
            if (ctx.player.mesh && ctx.player.mesh.getWorldDirection) {
              var fwd = new THREE.Vector3();
              ctx.player.mesh.getWorldDirection(fwd);
              behind.addScaledVector(fwd, -1.8);
            } else {
              behind.z += 1.5;
            }
            behind.y = ctx.player.pos.y;
            this.puff(handle, behind, 1.1 + sn * 0.8);
          }
        }
      }

      // Rival dust (near cam only)
      if (ctx.rivals && ctx.camera) {
        handle.rivalWakeAcc = (handle.rivalWakeAcc || 0) + dt;
        var rInt = handle.low ? rivalWake * 2 : rivalWake;
        if (handle.rivalWakeAcc >= rInt) {
          handle.rivalWakeAcc = 0;
          var cam = ctx.camera.position;
          for (var ri = 0; ri < ctx.rivals.length; ri++) {
            var rv = ctx.rivals[ri];
            if (!rv || rv.dead || !rv.pos) continue;
            var dx = rv.pos.x - cam.x;
            var dz = rv.pos.z - cam.z;
            if (dx * dx + dz * dz > 90 * 90) continue;
            var maxR = 54;
            if (ctx.cfg && ctx.cfg.drive) maxR = ctx.cfg.drive.maxSpeed * ((rv.mul && rv.mul.speed) || 1);
            if (Math.abs(rv.speed || 0) / Math.max(1, maxR) < speedNormGate) continue;
            this.puff(handle, rv.pos, 1.0);
            break; // one rival puff per tick
          }
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
      }
      handle.chunkMesh.instanceMatrix.needsUpdate = true;

      // Integrate dust
      for (var d = handle.dust.length - 1; d >= 0; d--) {
        var du = handle.dust[d];
        du.age += dt;
        if (du.age >= du.life) {
          handle.dustMesh.setMatrixAt(du.idx, _zero);
          handle.dust.splice(d, 1);
          continue;
        }
        var u = du.age / du.life;
        var scD = du.scale0 * (1 + u * 2.6);
        var alpha = (1 - u) * 0.72;
        du.pos.y += dt * 0.15;
        writeDust(handle.dustMesh, du.idx, du.pos, scD, alpha);
      }
      handle.dustMesh.instanceMatrix.needsUpdate = true;
      if (handle.dustMesh.instanceColor) handle.dustMesh.instanceColor.needsUpdate = true;
    },
  };
})();
