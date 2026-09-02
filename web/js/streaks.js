/**
 * Speed streaks — thin additive strips that rush past the chase cam at speed (v451).
 * One InstancedMesh, 48 instances, MeshBasic. Sense-of-speed layer toward the
 * Turbo Sloths "debris flying at the camera" read without a dirty-lens look.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});

  var CAP = 48;
  var _m = new THREE.Matrix4();
  var _x = new THREE.Vector3();
  var _y = new THREE.Vector3();
  var _z = new THREE.Vector3();
  var _fwd = new THREE.Vector3();
  var _right = new THREE.Vector3();
  var _up = new THREE.Vector3(0, 1, 0);
  var _p = new THREE.Vector3();
  var _c = new THREE.Color();
  var _zero = new THREE.Matrix4().makeScale(0, 0, 0);

  function writeStreak(mesh, idx, pos, fwd, camPos, len, alpha) {
    // Long axis along motion; face toward the camera.
    _y.copy(fwd);
    _z.copy(pos).sub(camPos);
    _z.addScaledVector(_y, -_z.dot(_y));
    if (_z.lengthSq() < 1e-6) _z.set(0, 1, 0);
    _z.normalize();
    _x.crossVectors(_y, _z).normalize();
    _m.makeBasis(_x, _y, _z);
    _m.setPosition(pos);
    _m.scale(_p.set(1, len, 1));
    mesh.setMatrixAt(idx, _m);
    var a = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
    _c.setRGB(0.42 * a, 0.5 * a, 0.58 * a);
    mesh.setColorAt(idx, _c);
  }

  GAME.streaks = {
    create: function (scene) {
      if (!scene) return null;
      var geo = new THREE.PlaneGeometry(0.08, 1.0);
      var mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      var mesh = new THREE.InstancedMesh(geo, mat, CAP);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.renderOrder = 5;
      for (var i = 0; i < CAP; i++) {
        mesh.setMatrixAt(i, _zero);
        mesh.setColorAt(i, _c.setRGB(0, 0, 0));
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      scene.add(mesh);
      return { mesh: mesh, geo: geo, mat: mat, items: [], cursor: 0, acc: 0, low: false };
    },

    clear: function (handle, scene) {
      if (!handle) return;
      if (handle.mesh) {
        if (handle.mesh.parent) handle.mesh.parent.remove(handle.mesh);
        else if (scene) scene.remove(handle.mesh);
      }
      if (handle.geo) handle.geo.dispose();
      if (handle.mat) handle.mat.dispose();
      handle.items = null;
    },

    setLow: function (handle, low) {
      if (handle) handle.low = !!low;
    },

    update: function (handle, dt, ctx) {
      if (!handle || !handle.items || !ctx || !ctx.camera || !ctx.player) return;
      var cam = ctx.camera;
      var camPos = cam.position;
      cam.getWorldDirection(_fwd);
      _fwd.normalize();
      _right.crossVectors(_fwd, _up).normalize();
      if (_right.lengthSq() < 1e-6) _right.set(1, 0, 0);

      var maxSp = 54;
      if (ctx.cfg && ctx.cfg.drive) {
        maxSp = ctx.cfg.drive.maxSpeed * ((ctx.player.mul && ctx.player.mul.speed) || 1);
      }
      var sp = Math.abs(ctx.player.speed || 0);
      var sn = sp / Math.max(1, maxSp);
      var gate = 0.52;
      var drive = (sn - gate) / (1 - gate);
      if (ctx.player.nitroActive) drive += 0.35;
      if (drive < 0) drive = 0;
      if (drive > 1) drive = 1;
      var hood = ctx.camMode === 'hood';

      // Emit — rate scales with how far past the gate we are
      if (drive > 0 && !ctx.player.dead) {
        var rate = (handle.low ? 20 : 40) * drive;
        handle.acc += dt * rate;
        while (handle.acc >= 1 && handle.items.length < CAP) {
          handle.acc -= 1;
          var idx = handle.cursor % CAP;
          handle.cursor++;
          for (var k = handle.items.length - 1; k >= 0; k--) {
            if (handle.items[k].idx === idx) handle.items.splice(k, 1);
          }
          // Ring around the view axis, biased off-centre so the hero stays clear
          var ang = Math.random() * Math.PI * 2;
          var rad = (hood ? 1.6 : 2.8) + Math.random() * 4.2;
          var ahead = 14 + Math.random() * 12;
          var pos = new THREE.Vector3().copy(camPos).addScaledVector(_fwd, ahead);
          pos.addScaledVector(_right, Math.cos(ang) * rad);
          pos.addScaledVector(_up, Math.sin(ang) * rad * 0.7 + 1.2);
          if (pos.y < 0.3) pos.y = 0.3 + Math.random() * 0.6;
          handle.items.push({
            idx: idx,
            pos: pos,
            speed: sp * 0.85 + 12,
            len: 1.6 + Math.random() * 2.6 + drive * 2,
            age: 0,
            life: 1.1,
            a: 0.35 + Math.random() * 0.4,
          });
        }
        if (handle.acc > 4) handle.acc = 4;
      } else {
        handle.acc = 0;
      }

      // Integrate — rush toward and past the camera
      for (var i = handle.items.length - 1; i >= 0; i--) {
        var it = handle.items[i];
        it.age += dt;
        it.pos.addScaledVector(_fwd, -it.speed * dt);
        var along = _p.copy(it.pos).sub(camPos).dot(_fwd);
        if (it.age >= it.life || along < 0.8) {
          handle.mesh.setMatrixAt(it.idx, _zero);
          handle.items.splice(i, 1);
          continue;
        }
        var fadeIn = it.age < 0.12 ? it.age / 0.12 : 1;
        var near = along < 4 ? along / 4 : 1;
        var alpha = it.a * fadeIn * near * (0.45 + 0.55 * drive);
        writeStreak(handle.mesh, it.idx, it.pos, _fwd, camPos, it.len, alpha);
      }
      handle.mesh.instanceMatrix.needsUpdate = true;
      if (handle.mesh.instanceColor) handle.mesh.instanceColor.needsUpdate = true;
    },
  };
})();
