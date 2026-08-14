/**
 * Combat VFX — sparks, smoke plumes, fireballs, debris, muzzle, rain + ground splashes.
 * Billboard quads + additive cores so explosions read in chase stills.
 * Weather: shared mats/geos, InstancedMesh rain + splash rings, getWetBias().
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});
  var U = null;

  function Particles(scene) {
    U = GAME.utils;
    this.scene = scene;
    this.items = [];
    this.pool = [];
    this.geo = new THREE.PlaneGeometry(1, 1);
    this.sphereGeo = new THREE.SphereGeometry(0.5, 16, 12);
    this.ringGeo = new THREE.RingGeometry(0.4, 1.2, 32);
    this.boxGeo = new THREE.BoxGeometry(0.3, 0.22, 0.35);
    this.icosaGeo = new THREE.IcosahedronGeometry(0.5, 1);
    // Soft radial gradient for fire (kills hard orb edges)
    var sc = document.createElement('canvas');
    sc.width = sc.height = 128;
    var sctx = sc.getContext('2d');
    var sg = sctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    sg.addColorStop(0, 'rgba(255,255,255,1)');
    sg.addColorStop(0.25, 'rgba(255,220,80,0.95)');
    sg.addColorStop(0.55, 'rgba(255,100,20,0.55)');
    sg.addColorStop(0.85, 'rgba(120,20,0,0.15)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = sg;
    sctx.fillRect(0, 0, 128, 128);
    this.softFireTex = new THREE.CanvasTexture(sc);
    this.softFireTex.needsUpdate = true;
    // Soft smoke puff — denser grey core so freeze frames read as volumetric soot mass
    var smc = document.createElement('canvas');
    smc.width = smc.height = 160;
    var smx = smc.getContext('2d');
    var smg = smx.createRadialGradient(80, 80, 0, 80, 80, 80);
    smg.addColorStop(0, 'rgba(120,120,130,0.92)');
    smg.addColorStop(0.22, 'rgba(85,85,95,0.78)');
    smg.addColorStop(0.48, 'rgba(55,55,62,0.5)');
    smg.addColorStop(0.78, 'rgba(30,30,36,0.18)');
    smg.addColorStop(1, 'rgba(0,0,0,0)');
    smx.fillStyle = smg;
    smx.fillRect(0, 0, 160, 160);
    // Soft irregular lobes (breaks perfect balloon sphere)
    for (var lob = 0; lob < 5; lob++) {
      var lx = 50 + Math.random() * 60;
      var ly = 45 + Math.random() * 55;
      var lr = 28 + Math.random() * 30;
      var lg = smx.createRadialGradient(lx, ly, 0, lx, ly, lr);
      lg.addColorStop(0, 'rgba(100,100,110,0.35)');
      lg.addColorStop(1, 'rgba(0,0,0,0)');
      smx.fillStyle = lg;
      smx.fillRect(lx - lr, ly - lr, lr * 2, lr * 2);
    }
    this.softSmokeTex = new THREE.CanvasTexture(smc);
    this.softSmokeTex.needsUpdate = true;

    function softMat(hex, op, additive) {
      return new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        opacity: op != null ? op : 1,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
    }
    this.mats = {
      spark: softMat(0xffc857, 1, true),
      smoke: softMat(0x6a6a80, 0.55, false),
      smokeDark: softMat(0x2a2a34, 0.5, false),
      muzzle: softMat(0xffe66d, 1, true),
      fire: softMat(0xff6b35, 1, true),
      fireCore: softMat(0xffcc66, 0.95, true),
      cyan: softMat(0x00e5ff, 1, true),
      pink: softMat(0xff2d55, 1, true),
      debris: new THREE.MeshBasicMaterial({ color: 0x886644, transparent: true, opacity: 1, depthWrite: false }),
      ring: softMat(0xffaa44, 0.7, true),
    };
    this._cam = null;
  }

  Particles.prototype.setCamera = function (cam) {
    this._cam = cam;
  };

  Particles.prototype._alloc = function (kind) {
    var mesh;
    if (this.pool.length) {
      mesh = this.pool.pop();
      mesh.visible = true;
      mesh.geometry = this.geo;
    } else {
      mesh = new THREE.Mesh(this.geo, this.mats.spark.clone());
      this.scene.add(mesh);
    }
    var base = this.mats[kind] || this.mats.spark;
    if (!mesh.material || mesh.userData.kind !== kind) {
      // Never dispose shared drive-FX mats (tireSmoke / wetMist / flames)
      if (mesh.material && mesh.userData.ownedMat) mesh.material.dispose();
      mesh.material = base.clone();
      mesh.userData.ownedMat = true;
      mesh.userData.kind = kind;
    }
    if (mesh.material.opacity != null) mesh.material.opacity = 1;
    mesh.scale.set(1, 1, 1);
    mesh.rotation.set(0, 0, 0);
    return mesh;
  };

  Particles.prototype._free = function (item) {
    if (item.isLight) {
      this.scene.remove(item.mesh);
      if (item.mesh.dispose) item.mesh.dispose();
      return;
    }
    if (item.noPool) {
      this.scene.remove(item.mesh);
      if (item.mesh.geometry && item.mesh.geometry !== this.geo && item.mesh.geometry !== this.sphereGeo) {
        // keep shared geos
      }
      return;
    }
    item.mesh.visible = false;
    this.pool.push(item.mesh);
  };

  Particles.prototype.spawn = function (kind, pos, opts) {
    opts = opts || {};
    var n = opts.count || 8;
    // Hard cap spawn burst so one frame can't allocate dozens of meshes
    if (n > 8) n = 8;
    if (this.items.length > 140) n = Math.min(n, 2);
    if (this.items.length > 180) return;
    var speed = opts.speed || 6;
    var life = opts.life || 0.5;
    var scale = opts.scale || 1;
    // Sparks/muzzle as tiny spheres — reuse pool mats (cloning every spark froze drift/nitro)
    var useSphere = kind === 'spark' || kind === 'muzzle' || kind === 'pink';
    for (var i = 0; i < n; i++) {
      var mesh;
      if (useSphere) {
        mesh = this._alloc(kind);
        mesh.geometry = this.sphereGeo;
        // shared material instance is fine for additive sparks
        var baseSph = this.mats[kind] || this.mats.spark;
        if (mesh.material !== baseSph) {
          if (mesh.material && mesh.userData.ownedMat) mesh.material.dispose();
          mesh.material = baseSph;
          mesh.userData.ownedMat = false;
          mesh.userData.kind = kind;
        }
      } else {
        mesh = this._alloc(kind);
      }
      mesh.position.copy(pos);
      mesh.scale.setScalar(scale * (0.5 + Math.random() * 0.9));
      var vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.8,
        (Math.random() - 0.5) * speed
      );
      if (opts.dir) vel.addScaledVector(opts.dir, speed * 0.5);
      var s0 = mesh.scale.x;
      this.items.push({
        mesh: mesh,
        vel: vel,
        life: life * (0.65 + Math.random() * 0.45),
        maxLife: life,
        drag: opts.drag != null ? opts.drag : 0.92,
        gravity: opts.gravity != null ? opts.gravity : 4,
        kind: kind,
        billboard: !useSphere,
        baseScale: s0,
        noPool: false,
      });
    }
  };

  Particles.prototype.burstLight = function (pos, color, intensity, life) {
    var L = new THREE.PointLight(color || 0xff6622, intensity || 8, 32, 1.4);
    L.position.copy(pos);
    this.scene.add(L);
    this.items.push({
      mesh: L, vel: new THREE.Vector3(), life: life || 0.25, maxLife: life || 0.25,
      drag: 1, gravity: 0, kind: 'light', isLight: true,
    });
  };

  Particles.prototype._cullIfHeavy = function () {
    // Hard cap — drift/nitro spam used to leave 200+ meshes and freeze play
    var MAX = 100;
    while (this.items.length > MAX) {
      var old = this.items.shift();
      this._free(old);
    }
  };

  Particles.prototype.muzzle = function (pos, dir) {
    // Minimal flash — hold-to-fire must stay cheap
    if (this.items.length > 120) return;
    this.spawn('muzzle', pos, { count: 1, speed: 8, life: 0.07, scale: 0.55, dir: dir, gravity: 0 });
    this.spawn('spark', pos, { count: 1, speed: 10, life: 0.1, scale: 0.22, dir: dir, gravity: 2 });
  };

  Particles.prototype._ensureBoomMats = function () {
    if (this._boomMats) return this._boomMats;
    this._boomMats = {
      core: new THREE.MeshBasicMaterial({
        map: this.softFireTex, color: 0xffee88, transparent: true, opacity: 0.9,
        depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }),
      fire: new THREE.MeshBasicMaterial({
        map: this.softFireTex, color: 0xff6622, transparent: true, opacity: 0.55,
        depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }),
      ring: new THREE.MeshBasicMaterial({
        color: 0xffeeaa, transparent: true, opacity: 0.6,
        depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }),
      ringGeo: new THREE.RingGeometry(0.45, 0.7, 16),
    };
    return this._boomMats;
  };

  Particles.prototype.explosion = function (pos, big) {
    // Shared mats + few meshes — was allocating 15+ materials per rocket hit
    if (this.items.length > 150) {
      this.spawn('spark', pos, { count: 4, speed: 12, life: 0.25, scale: 0.28, gravity: 8 });
      return;
    }
    var B = this._ensureBoomMats();
    var nCore = big ? 2 : 1;
    for (var ci = 0; ci < nCore; ci++) {
      var ball = new THREE.Mesh(this.geo, ci === 0 ? B.core : B.fire);
      ball.position.copy(pos);
      ball.position.y += 0.6 + ci * 0.25;
      var sc = (big ? 1.4 : 0.9) * (1 - ci * 0.25);
      ball.scale.setScalar(sc);
      this.scene.add(ball);
      this.items.push({
        mesh: ball,
        vel: new THREE.Vector3(0, 0.4, 0),
        life: big ? 0.45 : 0.32, maxLife: big ? 0.45 : 0.32,
        drag: 1, gravity: 0,
        kind: 'fireCore', noPool: true, baseScale: sc, grow: 0.35,
        billboard: true, softFade: true,
      });
    }
    var ring = new THREE.Mesh(B.ringGeo, B.ring);
    ring.position.copy(pos);
    ring.position.y = 0.08;
    ring.rotation.x = -Math.PI / 2;
    ring.scale.setScalar(big ? 0.7 : 0.45);
    this.scene.add(ring);
    this.items.push({
      mesh: ring, vel: new THREE.Vector3(), life: 0.28, maxLife: 0.28,
      drag: 1, gravity: 0, kind: 'ring', noPool: true, expand: big ? 8 : 5,
    });
    this.spawn('spark', pos, {
      count: big ? 6 : 4, speed: big ? 14 : 10, life: 0.28, scale: 0.28, gravity: 8,
    });
    this._cullIfHeavy();
  };

  Particles.prototype.update = function (dt) {
    var cam = this._cam || (GAME.camera);
    for (var i = this.items.length - 1; i >= 0; i--) {
      var p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) {
        this._free(p);
        this.items.splice(i, 1);
        continue;
      }
      if (p.isLight) {
        p.mesh.intensity *= 0.88;
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.vel.multiplyScalar(Math.pow(p.drag, dt * 60));
      p.mesh.position.addScaledVector(p.vel, dt);
      var t = p.life / p.maxLife;
      // Soft drive FX use SHARED mats — fade with scale only (never mutate mat.opacity)
      if (p.softFade) {
        var base = p.baseScale || 1;
        var grow = p.grow != null ? p.grow : 1.2;
        var age = 1 - t;
        var fade = Math.max(0.05, t); // shrink out as life ends
        var sc = base * (1 + age * Math.abs(grow) * 0.6) * (grow < 0 ? fade : (0.35 + 0.65 * fade));
        if (p.kind === 'exhaustFlame') {
          p.mesh.scale.set(sc * 0.4, sc * 0.4, sc * 2.0 * fade);
        } else if (p.kind === 'tireSmoke' || p.kind === 'wetMist') {
          p.mesh.scale.set(sc * 1.5, sc * 0.65, 1);
        } else {
          p.mesh.scale.setScalar(sc);
        }
      } else {
        if (p.mesh.material && p.mesh.material.opacity != null && p.mesh.userData.ownedMat) {
          p.mesh.material.opacity = Math.max(0, t * 0.9);
        }
        if (p.expand) {
          var sc2 = p.mesh.scale.x + p.expand * dt;
          p.mesh.scale.set(sc2, sc2, sc2);
        }
        if (p.kind === 'smoke' || p.kind === 'smokeDark') {
          var smokeCap = Math.max(1.8, (p.baseScale || p.mesh.scale.x) * 2.2);
          if (p.mesh.scale.x < smokeCap) p.mesh.scale.multiplyScalar(1 + dt * 0.6);
        }
        if ((p.kind === 'fire' || p.kind === 'fireCore') && !p.expand) {
          var baseF = p.baseScale || 1;
          var growF = p.grow != null ? p.grow : 0.4;
          var ageF = 1 - t;
          var target = baseF * (1 + ageF * growF);
          p.mesh.scale.setScalar(Math.min(target, baseF * (1 + growF)));
        }
      }
      if (p.spin) {
        p.mesh.rotation.x += p.spin.x * dt;
        p.mesh.rotation.y += p.spin.y * dt;
        p.mesh.rotation.z += p.spin.z * dt;
      }
      // Billboard toward camera
      if (p.billboard && cam && p.mesh.lookAt) {
        p.mesh.lookAt(cam.position);
      }
    }
  };

  Particles.prototype.sparks = function (pos, dir) {
    if (this.items.length > 130) return;
    this.spawn('spark', pos, { count: 3, speed: 11, life: 0.22, scale: 0.25, dir: dir, gravity: 10 });
  };

  /**
   * Soft tire smoke (drift / launch) — low, wide billboards with soft texture.
   * NOT exhaust-pipe blobs.
   */
  Particles.prototype.tireSmoke = function (pos, opts) {
    opts = opts || {};
    if (this.items.length > 160) return;
    this._ensureDriveFxMats();
    var n = opts.count != null ? opts.count : 1;
    if (n > 3) n = 3;
    var dir = opts.dir || null;
    for (var i = 0; i < n; i++) {
      var mesh = this._alloc('smoke');
      mesh.geometry = this.geo;
      mesh.material = this._driveFx.tireSmokeMat;
      mesh.userData.ownedMat = false;
      mesh.userData.kind = 'tireSmoke';
      mesh.position.copy(pos);
      mesh.position.x += (Math.random() - 0.5) * 0.25;
      mesh.position.z += (Math.random() - 0.5) * 0.25;
      mesh.position.y = Math.max(mesh.position.y, 0.08);
      var s = (opts.scale || 0.85) * (0.7 + Math.random() * 0.5);
      mesh.scale.set(s * 1.4, s * 0.7, 1); // wide low pancake
      var vel = new THREE.Vector3(
        (Math.random() - 0.5) * 1.8,
        0.8 + Math.random() * 1.4,
        (Math.random() - 0.5) * 1.8
      );
      if (dir) vel.addScaledVector(dir, 2.2 + Math.random());
      this.items.push({
        mesh: mesh, vel: vel,
        life: 0.45 + Math.random() * 0.25, maxLife: 0.55,
        drag: 0.94, gravity: -0.35,
        kind: 'tireSmoke', billboard: true, baseScale: s,
        grow: 1.8, softFade: true,
      });
    }
    this._cullIfHeavy();
  };

  /**
   * Wet-road mist from tires — cool translucent spray, not grey soot.
   */
  Particles.prototype.wetMist = function (pos, opts) {
    opts = opts || {};
    if (this.items.length > 160) return;
    this._ensureDriveFxMats();
    var mesh = this._alloc('smoke');
    mesh.geometry = this.geo;
    mesh.material = this._driveFx.wetMistMat;
    mesh.userData.ownedMat = false;
    mesh.userData.kind = 'wetMist';
    mesh.position.copy(pos);
    mesh.position.y = Math.max(pos.y, 0.06);
    var s = (opts.scale || 0.55) * (0.75 + Math.random() * 0.4);
    mesh.scale.set(s * 1.2, s * 0.55, 1);
    var dir = opts.dir;
    var vel = new THREE.Vector3(
      (Math.random() - 0.5) * 2.5,
      0.4 + Math.random() * 1.2,
      (Math.random() - 0.5) * 2.5
    );
    if (dir) vel.addScaledVector(dir, 3.5);
    this.items.push({
      mesh: mesh, vel: vel,
      life: 0.22 + Math.random() * 0.12, maxLife: 0.3,
      drag: 0.9, gravity: 2.5,
      kind: 'wetMist', billboard: true, baseScale: s,
      grow: 2.2, softFade: true,
    });
  };

  /**
   * Nitro exhaust flames — elongated additive streaks (not smoke).
   */
  Particles.prototype.exhaustFlame = function (pos, dir) {
    if (this.items.length > 160) return;
    this._ensureDriveFxMats();
    var back = dir ? dir.clone().multiplyScalar(-1) : new THREE.Vector3(0, 0, -1);
    back.normalize();
    // Core hot streak
    for (var i = 0; i < 2; i++) {
      var mesh = this._alloc('muzzle');
      mesh.geometry = this.geo;
      mesh.material = i === 0 ? this._driveFx.flameCoreMat : this._driveFx.flameOuterMat;
      mesh.userData.ownedMat = false;
      mesh.userData.kind = 'exhaustFlame';
      mesh.position.copy(pos);
      mesh.position.addScaledVector(back, 0.15 * i);
      mesh.position.x += (Math.random() - 0.5) * 0.12;
      mesh.position.y += (Math.random() - 0.5) * 0.08;
      var s = 0.35 + i * 0.15 + Math.random() * 0.12;
      // Stretch along exhaust axis (will billboard but start elongated)
      mesh.scale.set(s * 0.45, s * 0.45, s * 2.2);
      var vel = back.clone().multiplyScalar(14 + Math.random() * 6);
      vel.y += 0.5 + Math.random() * 1.5;
      this.items.push({
        mesh: mesh, vel: vel,
        life: 0.08 + Math.random() * 0.06, maxLife: 0.12,
        drag: 0.88, gravity: -1,
        kind: 'exhaustFlame', billboard: true, baseScale: s,
        grow: -0.5, softFade: true,
      });
    }
    // Tiny hot sparks (sparks already look good)
    this.spawn('spark', pos, {
      count: 2, speed: 9, life: 0.1, scale: 0.1,
      dir: back, gravity: 2,
    });
  };

  /** Shared soft mats for drive FX (created once). */
  Particles.prototype._ensureDriveFxMats = function () {
    if (this._driveFx) return this._driveFx;
    var soft = this.softSmokeTex || null;
    function softBillboard(hex, op, additive) {
      return new THREE.MeshBasicMaterial({
        map: soft,
        color: hex,
        transparent: true,
        opacity: op,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
    }
    this._driveFx = {
      tireSmokeMat: softBillboard(0xc8c4bc, 0.42, false),
      wetMistMat: softBillboard(0xa8d0e8, 0.38, true),
      flameCoreMat: softBillboard(0xfff0a0, 0.95, true),
      flameOuterMat: softBillboard(0x00e5ff, 0.75, true),
    };
    // Fallback if soft tex missing
    if (!soft) {
      this._driveFx.tireSmokeMat.map = null;
      this._driveFx.wetMistMat.map = null;
      this._driveFx.flameCoreMat.map = null;
      this._driveFx.flameOuterMat.map = null;
    }
    return this._driveFx;
  };

  // Legacy names — route to new FX so old call sites don't make pipe soot
  Particles.prototype.smokeTrail = function (pos) {
    this.tireSmoke(pos, { scale: 0.7, count: 1 });
  };

  Particles.prototype.nitro = function (pos, dir) {
    this.exhaustFlame(pos, dir);
  };

  Particles.prototype.hitTrail = function (pos, color) {
    if (this.items.length > 130) return;
    var kind = color === 'pink' ? 'pink' : 'spark';
    this.spawn(kind, pos, { count: 2, speed: 9, life: 0.18, scale: 0.18, gravity: 3 });
  };

  Particles.prototype.tireSpray = function (pos, dir) {
    // Wet mist language (not grey smoke)
    this.wetMist(pos, { dir: dir, scale: 0.5 });
  };

  // ---------- Weather / environment (camera-relative, pooled, no mat spam) ----------

  Particles.prototype._wxNormTheme = function (theme) {
    var t = (theme || 'city').toString().toLowerCase();
    if (t === 'sepulcher' || t === 'neon' || t === 'downtown') return 'city';
    if (t === 'throat' || t === 'yard' || t === 'factory') return 'industrial';
    if (t === 'freedom' || t === 'coast' || t === 'sea') return 'coastal';
    if (t === 'city' || t === 'industrial' || t === 'coastal') return t;
    return 'city';
  };

  Particles.prototype._wxEnsureShared = function () {
    if (this._wxShared) return this._wxShared;
    // Thin rain needle — shared geo/mat for InstancedMesh
    var rainGeo = new THREE.BoxGeometry(0.014, 1.15, 0.014);
    var rainMat = new THREE.MeshBasicMaterial({
      color: 0xb0c8e0,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    // Soft mist card texture (radial falloff — no hard edges)
    var mc = document.createElement('canvas');
    mc.width = mc.height = 128;
    var mx = mc.getContext('2d');
    var mg = mx.createRadialGradient(64, 64, 4, 64, 64, 62);
    mg.addColorStop(0, 'rgba(200,220,240,0.55)');
    mg.addColorStop(0.45, 'rgba(160,185,210,0.28)');
    mg.addColorStop(1, 'rgba(0,0,0,0)');
    mx.fillStyle = mg;
    mx.fillRect(0, 0, 128, 128);
    var mistTex = new THREE.CanvasTexture(mc);
    mistTex.needsUpdate = true;
    var mistGeo = new THREE.PlaneGeometry(1, 1);
    var mistMat = new THREE.MeshBasicMaterial({
      map: mistTex,
      color: 0xc8d8e8,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });
    // Ember — tiny additive sphere, shared
    var emberGeo = new THREE.SphereGeometry(0.08, 6, 5);
    var emberMat = new THREE.MeshBasicMaterial({
      color: 0xff8833,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    // Ground splash ring — soft radial disc (shared geo/mat, InstancedMesh)
    var sc = document.createElement('canvas');
    sc.width = sc.height = 64;
    var sx = sc.getContext('2d');
    var sg = sx.createRadialGradient(32, 32, 6, 32, 32, 30);
    sg.addColorStop(0, 'rgba(200,220,240,0)');
    sg.addColorStop(0.35, 'rgba(190,215,235,0.15)');
    sg.addColorStop(0.62, 'rgba(210,230,250,0.75)');
    sg.addColorStop(0.82, 'rgba(180,205,230,0.35)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    sx.fillStyle = sg;
    sx.fillRect(0, 0, 64, 64);
    var splashTex = new THREE.CanvasTexture(sc);
    splashTex.needsUpdate = true;
    var splashGeo = new THREE.PlaneGeometry(1, 1);
    var splashMat = new THREE.MeshBasicMaterial({
      map: splashTex,
      color: 0xc8dcf0,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });
    this._wxShared = {
      rainGeo: rainGeo,
      rainMat: rainMat,
      mistGeo: mistGeo,
      mistMat: mistMat,
      mistTex: mistTex,
      emberGeo: emberGeo,
      emberMat: emberMat,
      splashGeo: splashGeo,
      splashMat: splashMat,
      splashTex: splashTex,
      dummy: new THREE.Object3D(),
    };
    return this._wxShared;
  };

  /**
   * Start cinematic weather for map theme.
   * city/industrial → rain (+ embers industrial); coastal → light rain + sea mist.
   * Safe to call repeatedly; rebuilds only when theme changes.
   */
  Particles.prototype.rainStart = function (theme) {
    var t = this._wxNormTheme(theme);
    if (this._wx && this._wx.active && this._wx.theme === t) return;
    this.rainStop();

    var S = this._wxEnsureShared();
    // PERF budgets (was 280/340 + 80 splashes — matrix writes every frame)
    var rainN = 110;
    var mistN = 4;
    var emberN = 0;
    var rainOp = 0.22;
    var rainCol = 0xb0c8e0;
    var wind = 3.2;
    var fallMin = 26;
    var fallSpan = 28;
    var spread = 32;
    var mistOp = 0.16;
    var mistCol = 0xc0d0e0;

    if (t === 'industrial') {
      rainN = 130;
      mistN = 4;
      emberN = 18;
      rainOp = 0.2;
      rainCol = 0xa8a090;
      wind = 2.4;
      fallMin = 24;
      fallSpan = 30;
      spread = 32;
      mistOp = 0.14;
      mistCol = 0xc8b090;
    } else if (t === 'coastal') {
      rainN = 70;
      mistN = 8;
      emberN = 0;
      rainOp = 0.14;
      rainCol = 0xc0d8f0;
      wind = 4.5;
      fallMin = 14;
      fallSpan = 16;
      spread = 36;
      mistOp = 0.22;
      mistCol = 0xa8c8e8;
    }

    if (rainN > 160) rainN = 160;
    if (rainN < 50) rainN = 50;

    var splashN = t === 'coastal' ? 28 : t === 'industrial' ? 36 : 32;
    if (splashN > 40) splashN = 40;
    if (splashN < 20) splashN = 20;

    S.rainMat.color.setHex(rainCol);
    S.rainMat.opacity = rainOp;
    S.mistMat.color.setHex(mistCol);
    S.mistMat.opacity = mistOp;
    S.splashMat.color.setHex(rainCol);
    S.splashMat.opacity = t === 'coastal' ? 0.32 : 0.42;

    var rainIM = new THREE.InstancedMesh(S.rainGeo, S.rainMat, rainN);
    rainIM.frustumCulled = false;
    rainIM.matrixAutoUpdate = false;
    this.scene.add(rainIM);

    var pos = new Float32Array(rainN * 3);
    var spd = new Float32Array(rainN);
    var len = new Float32Array(rainN);
    var i;
    for (i = 0; i < rainN; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = Math.random() * 22;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
      spd[i] = fallMin + Math.random() * fallSpan;
      len[i] = 0.55 + Math.random() * 0.7;
    }

    // Splash rings — flat on ground, expand+fade, spawned on rain recycle
    var splashIM = new THREE.InstancedMesh(S.splashGeo, S.splashMat, splashN);
    splashIM.frustumCulled = false;
    splashIM.matrixAutoUpdate = false;
    this.scene.add(splashIM);
    var sLife = new Float32Array(splashN);
    var sMax = new Float32Array(splashN);
    var sOx = new Float32Array(splashN);
    var sOz = new Float32Array(splashN);
    var sScale0 = new Float32Array(splashN);
    for (i = 0; i < splashN; i++) {
      sLife[i] = 0;
      sMax[i] = 0.22;
      sScale0[i] = 0.35;
    }
    // Hide all slots initially
    var dummy0 = S.dummy;
    dummy0.scale.set(0, 0, 0);
    dummy0.position.set(0, -999, 0);
    dummy0.rotation.set(-Math.PI / 2, 0, 0);
    dummy0.updateMatrix();
    for (i = 0; i < splashN; i++) {
      splashIM.setMatrixAt(i, dummy0.matrix);
    }
    splashIM.instanceMatrix.needsUpdate = true;

    var mist = [];
    for (i = 0; i < mistN; i++) {
      var mm = new THREE.Mesh(S.mistGeo, S.mistMat);
      mm.frustumCulled = false;
      var sc = (t === 'coastal' ? 14 : 10) * (0.75 + Math.random() * 0.6);
      mm.scale.set(sc, sc * (0.45 + Math.random() * 0.25), 1);
      mm.position.set(
        (Math.random() - 0.5) * 28,
        1.2 + Math.random() * 4.5,
        (Math.random() - 0.5) * 28
      );
      this.scene.add(mm);
      mist.push({
        mesh: mm,
        baseY: mm.position.y,
        phase: Math.random() * Math.PI * 2,
        drift: 0.4 + Math.random() * 0.8,
        ox: mm.position.x,
        oz: mm.position.z,
      });
    }

    var emberIM = null;
    var ePos = null;
    var eVel = null;
    if (emberN > 0) {
      emberIM = new THREE.InstancedMesh(S.emberGeo, S.emberMat, emberN);
      emberIM.frustumCulled = false;
      emberIM.matrixAutoUpdate = false;
      this.scene.add(emberIM);
      ePos = new Float32Array(emberN * 3);
      eVel = new Float32Array(emberN * 3);
      for (i = 0; i < emberN; i++) {
        ePos[i * 3] = (Math.random() - 0.5) * 30;
        ePos[i * 3 + 1] = Math.random() * 10;
        ePos[i * 3 + 2] = (Math.random() - 0.5) * 30;
        eVel[i * 3] = (Math.random() - 0.5) * 1.2;
        eVel[i * 3 + 1] = 0.6 + Math.random() * 1.8;
        eVel[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
      }
    }

    this._wx = {
      active: true,
      theme: t,
      rainIM: rainIM,
      rainN: rainN,
      rainOpBase: rainOp,
      splashOpBase: S.splashMat.opacity,
      pos: pos,
      spd: spd,
      len: len,
      wind: wind,
      spread: spread,
      mist: mist,
      emberIM: emberIM,
      emberN: emberN,
      ePos: ePos,
      eVel: eVel,
      splashIM: splashIM,
      splashN: splashN,
      sLife: sLife,
      sMax: sMax,
      sOx: sOx,
      sOz: sOz,
      sScale0: sScale0,
      splashCursor: 0,
      wetBias: 0,
      time: 0,
    };
    // Seed instance matrices once (cam at origin until first update)
    this.rainUpdate(0, { x: 0, y: 4, z: 0 });
  };

  /**
   * Tick weather. camPos = camera or player world position.
   * Positions are stored camera-relative offsets then written as world matrices.
   */
  Particles.prototype.rainUpdate = function (dt, camPos) {
    var wx = this._wx;
    if (!wx || !wx.active || !camPos) return;
    if (dt > 0.05) dt = 0.05;
    wx.time += dt;

    var S = this._wxShared;
    var dummy = S.dummy;
    var cx = camPos.x;
    var cy = camPos.y;
    var cz = camPos.z;
    var half = wx.spread * 0.5;
    var n = wx.rainN;
    var pos = wx.pos;
    var spd = wx.spd;
    var len = wx.len;
    var wind = wx.wind;
    var im = wx.rainIM;
    var i, ix, iy, iz, px, py, pz;

    // Slight opacity pulse on shared rain mat (cinematic wet shimmer)
    if (S.rainMat && wx.rainOpBase != null) {
      S.rainMat.opacity = wx.rainOpBase * (0.88 + Math.sin(wx.time * 2.6) * 0.12);
    }

    // Road wetness bias ramps while raining (0→theme peak over ~2.5s)
    var wetPeak = wx.theme === 'coastal' ? 0.55 : wx.theme === 'industrial' ? 0.88 : 0.78;
    var ramp = wx.time / 2.5;
    if (ramp > 1) ramp = 1;
    wx.wetBias = wetPeak * ramp;

    // Cap splash spawns per frame so heavy rain doesn't thrash the free list
    var splashBudget = 6;
    var sn = wx.splashN || 0;
    var sLife = wx.sLife;
    var sMax = wx.sMax;
    var sOx = wx.sOx;
    var sOz = wx.sOz;
    var sScale0 = wx.sScale0;

    for (i = 0; i < n; i++) {
      ix = i * 3;
      iy = ix + 1;
      iz = ix + 2;
      pos[iy] -= spd[i] * dt;
      pos[ix] -= wind * dt * 0.35;
      // Respawn when below camera (near ground relative to cam) or far off in XZ
      if (pos[iy] < -6) {
        // Ground splash at impact offset (sample — not every drop)
        if (sn > 0 && splashBudget > 0 && Math.random() < 0.28) {
          var si = wx.splashCursor;
          wx.splashCursor = (si + 1) % sn;
          sOx[si] = pos[ix];
          sOz[si] = pos[iz];
          sLife[si] = 0.16 + Math.random() * 0.14;
          sMax[si] = sLife[si];
          sScale0[si] = 0.28 + Math.random() * 0.45;
          splashBudget--;
        }
        pos[ix] = (Math.random() - 0.5) * wx.spread;
        pos[iy] = 8 + Math.random() * 16;
        pos[iz] = (Math.random() - 0.5) * wx.spread;
      } else if (pos[ix] < -half || pos[ix] > half || pos[iz] < -half || pos[iz] > half) {
        pos[ix] = (Math.random() - 0.5) * wx.spread * 0.85;
        pos[iz] = (Math.random() - 0.5) * wx.spread * 0.85;
      }
      px = cx + pos[ix];
      py = cy + pos[iy];
      pz = cz + pos[iz];
      dummy.position.set(px, py, pz);
      // Lean into wind so streaks read as rain not stars
      dummy.rotation.set(0, 0, 0.18);
      dummy.scale.set(1, len[i], 1);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    }
    im.instanceMatrix.needsUpdate = true;

    // Ground splash rings — expand + fade (scale shrinks late life as soft fade proxy)
    if (wx.splashIM && sn > 0) {
      var sim = wx.splashIM;
      // Ground sits ~camY - 4.5..6 in chase; pin rings just above road relative to cam
      var groundY = cy - 5.2;
      if (groundY < 0.04) groundY = 0.04;
      var splashDirty = false;
      var sPulse = wx.splashOpBase != null
        ? wx.splashOpBase * (0.9 + Math.sin(wx.time * 3.1) * 0.1)
        : 0.4;
      if (S.splashMat) S.splashMat.opacity = sPulse;
      for (i = 0; i < sn; i++) {
        if (sLife[i] > 0) {
          sLife[i] -= dt;
          if (sLife[i] <= 0) {
            sLife[i] = 0;
            dummy.position.set(0, -999, 0);
            dummy.scale.set(0, 0, 0);
            dummy.rotation.set(-Math.PI / 2, 0, 0);
          } else {
            var t = 1 - sLife[i] / sMax[i];
            // Expand quickly, ease out; late life scales down slightly to read as fade
            var grow = 1 + t * 2.8;
            var fade = t > 0.55 ? 1 - (t - 0.55) / 0.45 : 1;
            var ss = sScale0[i] * grow * (0.55 + 0.45 * fade);
            dummy.position.set(cx + sOx[i], groundY, cz + sOz[i]);
            dummy.rotation.set(-Math.PI / 2, 0, t * 0.4);
            dummy.scale.set(ss, ss, 1);
          }
          dummy.updateMatrix();
          sim.setMatrixAt(i, dummy.matrix);
          splashDirty = true;
        }
      }
      if (splashDirty) sim.instanceMatrix.needsUpdate = true;
    }

    // Mist cards — slow drift, billboard, recycle near cam
    var mist = wx.mist;
    var cam = this._cam;
    for (i = 0; i < mist.length; i++) {
      var m = mist[i];
      m.phase += dt * m.drift;
      m.ox += Math.sin(m.phase * 0.7) * dt * 0.9;
      m.oz += Math.cos(m.phase * 0.55) * dt * 0.7;
      // Keep within bubble of camera
      var mdx = m.ox;
      var mdz = m.oz;
      if (mdx * mdx + mdz * mdz > 900) {
        m.ox = (Math.random() - 0.5) * 24;
        m.oz = (Math.random() - 0.5) * 24;
      }
      m.mesh.position.set(
        cx + m.ox,
        cy + m.baseY + Math.sin(m.phase) * 0.35,
        cz + m.oz
      );
      if (cam && m.mesh.lookAt) m.mesh.lookAt(cam.position);
    }

    // Industrial embers / floating sparks
    if (wx.emberIM && wx.emberN > 0) {
      var en = wx.emberN;
      var ep = wx.ePos;
      var ev = wx.eVel;
      var eim = wx.emberIM;
      var pulse = 0.75 + Math.sin(wx.time * 3.2) * 0.15;
      for (i = 0; i < en; i++) {
        ix = i * 3;
        iy = ix + 1;
        iz = ix + 2;
        ep[ix] += ev[ix] * dt;
        ep[iy] += ev[iy] * dt;
        ep[iz] += ev[iz] * dt;
        // gentle wander
        ev[ix] += (Math.random() - 0.5) * dt * 1.5;
        ev[iz] += (Math.random() - 0.5) * dt * 1.5;
        if (ep[iy] > 14 || ep[iy] < -1 || ep[ix] * ep[ix] + ep[iz] * ep[iz] > 1000) {
          ep[ix] = (Math.random() - 0.5) * 28;
          ep[iy] = Math.random() * 2;
          ep[iz] = (Math.random() - 0.5) * 28;
          ev[ix] = (Math.random() - 0.5) * 1.2;
          ev[iy] = 0.5 + Math.random() * 1.6;
          ev[iz] = (Math.random() - 0.5) * 1.2;
        }
        var es = 0.55 + (i % 5) * 0.12;
        dummy.position.set(cx + ep[ix], cy + ep[iy] * 0.35 + 1.2, cz + ep[iz]);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(es * pulse);
        dummy.updateMatrix();
        eim.setMatrixAt(i, dummy.matrix);
      }
      eim.instanceMatrix.needsUpdate = true;
    }
  };

  /**
   * Road wetness while raining — 0 (dry / no weather) … 1 (max wet).
   * Ramps up after rainStart; 0 when weather inactive.
   */
  Particles.prototype.getWetBias = function () {
    var wx = this._wx;
    if (!wx || !wx.active) return 0;
    var b = wx.wetBias;
    if (b == null || b < 0) return 0;
    if (b > 1) return 1;
    return b;
  };

  Particles.prototype.rainStop = function () {
    var wx = this._wx;
    if (!wx) return;
    if (wx.rainIM) {
      this.scene.remove(wx.rainIM);
      // geometry/material are shared — do not dispose
      wx.rainIM = null;
    }
    if (wx.splashIM) {
      this.scene.remove(wx.splashIM);
      wx.splashIM = null;
    }
    if (wx.mist) {
      for (var i = 0; i < wx.mist.length; i++) {
        this.scene.remove(wx.mist[i].mesh);
      }
      wx.mist = null;
    }
    if (wx.emberIM) {
      this.scene.remove(wx.emberIM);
      wx.emberIM = null;
    }
    // Reset shared rain opacity base so next start is clean
    if (this._wxShared && this._wxShared.rainMat && wx.rainOpBase != null) {
      this._wxShared.rainMat.opacity = wx.rainOpBase;
    }
    this._wx = null;
    // legacy flags
    this._rain = null;
    this._rainReady = false;
  };

  /** @deprecated prefer rainStart(theme) — kept so old hooks don't crash */
  Particles.prototype.ensureRain = function (camPos, theme) {
    if (this._wx && this._wx.active) return;
    this.rainStart(theme || 'city');
    if (camPos) this.rainUpdate(0, camPos);
  };

  /** @deprecated prefer rainUpdate */
  Particles.prototype.updateRain = function (dt, camPos) {
    this.rainUpdate(dt, camPos);
  };

  Particles.prototype.clear = function () {
    while (this.items.length) {
      this._free(this.items.pop());
    }
    this.rainStop();
  };

  GAME.Particles = Particles;
})();
