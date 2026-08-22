/**
 * TWISTED SPEED — Night Circuit
 * Photoreal-leaning Three.js combat racer (weapons × night streets).
 */
(function () {
  'use strict';
  if (typeof THREE === 'undefined') {
    console.error('Three.js failed to load');
    return;
  }
  var G = window.GAME = window.GAME || {};
  var canvas = document.getElementById('c3d');
  var hud = document.getElementById('hud');
  var hctx = hud.getContext('2d');
  var boot = document.getElementById('boot');
  var bootFill = document.getElementById('bootFill');

  // ---------- Renderer ----------
  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (renderer.outputColorSpace !== undefined) renderer.outputColorSpace = THREE.SRGBColorSpace;
  else if (renderer.outputEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
  if (THREE.ACESFilmicToneMapping) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
  }

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07090f);
  scene.fog = new THREE.FogExp2(0x0a0c14, 0.0045);

  var camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.35, 900);
  camera.position.set(0, 4, 10);

  // Lighting — moonlight + sodium bounce
  var hemi = new THREE.HemisphereLight(0x6a7a9a, 0x1a1010, 0.45);
  scene.add(hemi);
  var moon = new THREE.DirectionalLight(0xb8c8e8, 0.85);
  moon.position.set(-40, 80, -20);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.near = 10;
  moon.shadow.camera.far = 220;
  moon.shadow.camera.left = -90;
  moon.shadow.camera.right = 90;
  moon.shadow.camera.top = 90;
  moon.shadow.camera.bottom = -90;
  moon.shadow.bias = -0.00025;
  scene.add(moon);
  var fill = new THREE.DirectionalLight(0xff8844, 0.22);
  fill.position.set(30, 20, 40);
  scene.add(fill);

  // Procedural env map (gradient cube)
  function makeEnvMap() {
    var size = 64;
    var data = new Uint8Array(6 * size * size * 4);
    for (var f = 0; f < 6; f++) {
      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          var i = (f * size * size + y * size + x) * 4;
          var v = y / size;
          // night sky gradient
          data[i] = (12 + v * 18) | 0;
          data[i + 1] = (14 + v * 22) | 0;
          data[i + 2] = (28 + v * 40) | 0;
          data[i + 3] = 255;
        }
      }
    }
    var tex = new THREE.CubeTexture([
      new ImageData(new Uint8ClampedArray(data.buffer, 0, size * size * 4), size, size),
      // fallback: DataTexture cube not trivial without six images — use scene envIntensity only
    ]);
    // Simpler: PMREM from scene not available — set scene.environment via Room-style solid
    return null;
  }

  // ---------- State ----------
  var MODE = { BOOT: 0, TITLE: 1, GARAGE: 2, RACE: 3, RESULTS: 4 };
  var state = {
    mode: MODE.BOOT,
    carId: 'marrow',
    meta: loadMeta(),
    race: null,
    keys: {},
    time: 0,
    camMode: 1, // 0 hood 1 chase 2 aerial
    flash: 0,
    status: ''
  };

  function defaultMeta() {
    return {
      scrap: 40,
      upgrades: { speed: 0, armor: 0, firepower: 0 },
      unlocked: { marrow: true, needle: false, mausoleum: false, vesper: false, razorback: false },
      night: 1,
      wins: 0,
      kills: 0
    };
  }
  function loadMeta() {
    try {
      var m = JSON.parse(localStorage.getItem('twisted-speed-web-v1') || 'null');
      if (!m) return defaultMeta();
      var d = defaultMeta();
      m.upgrades = Object.assign(d.upgrades, m.upgrades || {});
      m.unlocked = Object.assign(d.unlocked, m.unlocked || {});
      return m;
    } catch (e) { return defaultMeta(); }
  }
  function saveMeta() {
    try { localStorage.setItem('twisted-speed-web-v1', JSON.stringify(state.meta)); } catch (e) {}
  }

  // ---------- World ----------
  var pathPts = G.city.buildPath(THREE);
  var city = G.city.build(THREE, scene, pathPts);
  var post = G.postfx.create(THREE, renderer, scene, camera);
  post.resize(window.innerWidth, window.innerHeight);

  // Player + rivals
  var playerRoot = null;
  var rivals = [];
  var projectiles = [];
  var particles = [];
  var mines = [];

  function upgradeMul(k) {
    return 1 + (state.meta.upgrades[k] || 0) * (k === 'speed' ? 0.04 : k === 'armor' ? 0.08 : 0.07);
  }

  function spawnPlayer(cb) {
    var def = G.vehicles.get(state.carId);
    // Apply upgrades
    def = Object.assign({}, def, {
      maxSpeed: def.maxSpeed * upgradeMul('speed'),
      accel: def.accel * upgradeMul('speed'),
      hp: def.hp * upgradeMul('armor'),
      shield: def.shield * upgradeMul('armor'),
      mg: def.mg * upgradeMul('firepower'),
      rocket: def.rocket * upgradeMul('firepower')
    });
    if (playerRoot) scene.remove(playerRoot);
    G.vehicles.tryLoadGLB(THREE, def, function (mesh) {
      playerRoot = mesh;
      playerRoot.userData.def = def;
      playerRoot.userData.isPlayer = true;
      scene.add(playerRoot);
      var p = new THREE.Vector3(), t = new THREE.Vector3();
      G.city.samplePath(pathPts, 0.02, p, t);
      playerRoot.position.copy(p);
      playerRoot.position.y = 0.05;
      playerRoot.userData.pos = p.clone();
      playerRoot.userData.yaw = Math.atan2(t.x, t.z);
      playerRoot.rotation.y = playerRoot.userData.yaw;
      if (cb) cb();
    });
  }

  function spawnRivals(n) {
    rivals.forEach(function (r) { scene.remove(r); });
    rivals = [];
    var ids = ['needle', 'razorback', 'vesper', 'mausoleum'];
    for (var i = 0; i < n; i++) {
      (function (idx) {
        var def = G.vehicles.get(ids[idx % ids.length]);
        var mesh = G.vehicles.buildProcedural(THREE, def);
        mesh.userData.def = def;
        mesh.userData.isRival = true;
        mesh.userData.ai = { along: 0.05 + idx * 0.04, lane: (idx % 2 ? -1 : 1) * (2 + idx * 0.3), fireCd: 0.5 + idx * 0.2 };
        var p = new THREE.Vector3(), t = new THREE.Vector3();
        G.city.samplePath(pathPts, mesh.userData.ai.along, p, t);
        var right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), t).normalize();
        p.addScaledVector(right, mesh.userData.ai.lane);
        mesh.position.copy(p);
        mesh.userData.pos = p.clone();
        mesh.userData.yaw = Math.atan2(t.x, t.z);
        mesh.rotation.y = mesh.userData.yaw;
        mesh.userData.vel = def.maxSpeed * 0.55;
        mesh.userData.hp = def.hp;
        mesh.userData.shield = def.shield;
        mesh.userData.maxHp = def.hp;
        mesh.userData.maxShield = def.shield;
        mesh.userData.alive = true;
        scene.add(mesh);
        rivals.push(mesh);
      })(i);
    }
  }

  // ---------- Combat ----------
  function spawnSpark(pos, color) {
    particles.push({
      p: pos.clone(), v: new THREE.Vector3((Math.random() - 0.5) * 8, 2 + Math.random() * 6, (Math.random() - 0.5) * 8),
      life: 0.25 + Math.random() * 0.2, max: 0.4, color: color || 0xffaa44, size: 0.12
    });
  }
  function spawnExplosion(pos) {
    for (var i = 0; i < 18; i++) spawnSpark(pos, i % 2 ? 0xff4400 : 0xffcc55);
    state.flash = 0.35;
    if (G.sfx && G.sfx.play) G.sfx.play('explode');
  }

  function damageTarget(target, amount, src) {
    if (!target.userData.alive) return;
    var d = target.userData;
    var left = amount;
    if (d.shield > 0) {
      var take = Math.min(d.shield, left);
      d.shield -= take;
      left -= take;
    }
    if (left > 0) d.hp -= left;
    if (d.hp <= 0) {
      d.alive = false;
      d.hp = 0;
      spawnExplosion(target.position);
      if (target.userData.isRival && state.race) {
        state.race.kills++;
        state.race.scrap += 14 + (state.race.kills * 2);
        state.status = 'RIVAL DOWN · +scrap';
        if (G.sfx && G.sfx.play) G.sfx.play('win');
      }
      if (target.userData.isPlayer) endRace(false);
    } else if (G.sfx && G.sfx.play) G.sfx.play('hit');
  }

  function fireMg(from) {
    var d = from.userData;
    var origin = from.position.clone().add(new THREE.Vector3(0, 0.5, 0));
    var dir = new THREE.Vector3(Math.sin(d.yaw || from.rotation.y), 0, Math.cos(d.yaw || from.rotation.y));
    // Ray vs rivals / player
    var targets = from.userData.isPlayer ? rivals : (playerRoot ? [playerRoot] : []);
    var hit = null, hitDist = 90;
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (!t.userData.alive) continue;
      var to = t.position.clone().sub(origin);
      var dist = to.length();
      if (dist > 90 || dist < 1) continue;
      to.normalize();
      if (to.dot(dir) < 0.92) continue;
      if (dist < hitDist) { hitDist = dist; hit = t; }
    }
    if (hit) {
      damageTarget(hit, d.def.mg || 6, from);
      spawnSpark(hit.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
    }
    // tracer particle
    particles.push({
      p: origin.clone(), v: dir.clone().multiplyScalar(120), life: 0.08, max: 0.08, color: 0xffe080, size: 0.08, tracer: true
    });
    state.flash = Math.max(state.flash, 0.04);
  }

  function fireRocket(from) {
    var d = from.userData;
    var yaw = d.yaw || from.rotation.y;
    var dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    var mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 8),
      G.shaders.emissive(THREE, 0xff6622, 3)
    );
    mesh.position.copy(from.position).add(dir.clone().multiplyScalar(2)).add(new THREE.Vector3(0, 0.6, 0));
    scene.add(mesh);
    projectiles.push({
      mesh: mesh, vel: dir.multiplyScalar(72), owner: from, dmg: d.def.rocket || 32, life: 3.5
    });
    if (G.sfx && G.sfx.play) G.sfx.play('confirm');
  }

  function dropMine(from) {
    var yaw = from.userData.yaw || from.rotation.y;
    var back = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    var mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.15, 12),
      G.shaders.emissive(THREE, 0x3de0ff, 1.5)
    );
    mesh.position.copy(from.position).add(back.multiplyScalar(3));
    mesh.position.y = 0.12;
    scene.add(mesh);
    mines.push({ mesh: mesh, owner: from, dmg: 40, arm: 0.55, life: 40 });
  }

  function fireSpecial(from) {
    var d = from.userData;
    if (d.special < 0.99) return;
    d.special = 0;
    var def = d.def;
    if (def.special === 'harvest' || def.special === 'mortar') {
      fireRocket(from); fireRocket(from);
    } else if (def.special === 'emp') {
      rivals.forEach(function (r) {
        if (r.position.distanceTo(from.position) < 18) {
          damageTarget(r, 12, from);
          r.userData.vel *= 0.4;
        }
      });
      spawnExplosion(from.position);
    } else if (def.special === 'harpoon') {
      var best = null, bestD = 60;
      rivals.forEach(function (r) {
        if (!r.userData.alive) return;
        var dist = r.position.distanceTo(from.position);
        if (dist < bestD) { bestD = dist; best = r; }
      });
      if (best) {
        damageTarget(best, 16, from);
        best.userData.vel *= 0.35;
      }
    } else {
      dropMine(from); dropMine(from);
    }
    state.status = (def.name || 'SPECIAL') + ' READY → FIRED';
  }

  // ---------- Race flow ----------
  function startRace() {
    state.mode = MODE.RACE;
    state.race = {
      t: 0, scrap: 0, kills: 0, lap: 0, laps: 5, along: 0.02, finished: false, lastGate: -999
    };
    state.status = 'NIGHT ' + state.meta.night + ' · PAROLE ARCH ×' + 5;
    spawnPlayer(function () {
      spawnRivals(3 + Math.min(2, state.meta.night >> 1));
    });
    if (G.sfx && G.sfx.play) G.sfx.play('confirm');
  }

  function endRace(won) {
    if (state.mode !== MODE.RACE) return;
    state.mode = MODE.RESULTS;
    var r = state.race;
    var bonus = won ? 40 + r.laps * 10 + r.kills * 12 : Math.max(8, r.scrap);
    var total = (won ? bonus + r.scrap : Math.max(bonus, r.scrap)) | 0;
    state.meta.scrap += total;
    if (won) {
      state.meta.wins++;
      state.meta.night = Math.min(13, state.meta.night + 1);
      // Unlock next car occasionally
      var unlockOrder = ['needle', 'razorback', 'vesper', 'mausoleum'];
      for (var i = 0; i < unlockOrder.length; i++) {
        if (!state.meta.unlocked[unlockOrder[i]] && state.meta.wins > i) {
          state.meta.unlocked[unlockOrder[i]] = true;
          state.status = 'UNLOCKED ' + unlockOrder[i].toUpperCase();
          break;
        }
      }
    }
    state.meta.kills += r.kills;
    state.race.result = { won: won, scrap: total, kills: r.kills, time: r.t };
    saveMeta();
  }

  function tryGate() {
    if (!playerRoot || !state.race) return;
    var p = new THREE.Vector3(), t = new THREE.Vector3();
    // Gate near start of loop
    G.city.samplePath(pathPts, 0.01, p, t);
    var dist = playerRoot.position.distanceTo(p);
    if (dist < 12 && state.time - state.race.lastGate > 12) {
      state.race.lastGate = state.time;
      state.race.lap++;
      state.race.scrap += 6 + state.race.lap * 2;
      if (state.race.lap >= state.race.laps) endRace(true);
      else state.status = 'LAP ' + (state.race.lap + 1) + '/' + state.race.laps;
    }
  }

  // ---------- Input ----------
  window.addEventListener('keydown', function (e) {
    state.keys[e.code] = true;
    if (e.code === 'Digit1') state.camMode = 0;
    if (e.code === 'Digit2') state.camMode = 1;
    if (e.code === 'Digit3') state.camMode = 2;
    if (state.mode === MODE.TITLE && (e.code === 'Enter' || e.code === 'Space')) {
      state.mode = MODE.GARAGE;
    } else if (state.mode === MODE.GARAGE) {
      if (e.code === 'Enter') startRace();
      if (e.code === 'ArrowRight' || e.code === 'KeyD') cycleCar(1);
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') cycleCar(-1);
      if (e.code === 'Digit1') tryUpgrade('speed');
      if (e.code === 'Digit2') tryUpgrade('armor');
      if (e.code === 'Digit3') tryUpgrade('firepower');
    } else if (state.mode === MODE.RESULTS && (e.code === 'Enter' || e.code === 'Space')) {
      state.mode = MODE.GARAGE;
    } else if (state.mode === MODE.RACE) {
      if (e.code === 'KeyK') fireRocket(playerRoot);
      if (e.code === 'KeyL') dropMine(playerRoot);
      if (e.code === 'KeyI') fireSpecial(playerRoot);
      if (e.code === 'Escape') endRace(false);
    }
  });
  window.addEventListener('keyup', function (e) { state.keys[e.code] = false; });

  function cycleCar(dir) {
    var ids = G.vehicles.ROSTER.map(function (r) { return r.id; });
    var i = ids.indexOf(state.carId);
    for (var n = 0; n < ids.length; n++) {
      i = (i + dir + ids.length) % ids.length;
      if (state.meta.unlocked[ids[i]]) { state.carId = ids[i]; break; }
    }
    if (G.sfx && G.sfx.play) G.sfx.play('ui_click');
  }
  function tryUpgrade(k) {
    var lvl = state.meta.upgrades[k] || 0;
    var cost = 25 + lvl * 20;
    if (state.meta.scrap >= cost && lvl < 8) {
      state.meta.scrap -= cost;
      state.meta.upgrades[k] = lvl + 1;
      saveMeta();
      if (G.sfx && G.sfx.play) G.sfx.play('confirm');
    } else if (G.sfx && G.sfx.play) G.sfx.play('deny');
  }

  // ---------- AI ----------
  function updateAI(dt) {
    rivals.forEach(function (r) {
      if (!r.userData.alive) {
        r.visible = false;
        return;
      }
      var ai = r.userData.ai;
      ai.along += (r.userData.vel / Math.max(1, city.totalLength)) * dt * 0.35;
      if (ai.along > 1) ai.along -= 1;
      var p = new THREE.Vector3(), t = new THREE.Vector3();
      G.city.samplePath(pathPts, ai.along + 0.02, p, t);
      var right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), t).normalize();
      p.addScaledVector(right, ai.lane);
      // Steer toward point
      var to = p.clone().sub(r.position);
      to.y = 0;
      var wantYaw = Math.atan2(to.x, to.z);
      var dy = wantYaw - r.userData.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      r.userData.yaw += dy * Math.min(1, 2.5 * dt);
      r.userData.vel += (r.userData.def.maxSpeed * 0.72 - r.userData.vel) * dt * 0.8;
      r.position.x += Math.sin(r.userData.yaw) * r.userData.vel * dt;
      r.position.z += Math.cos(r.userData.yaw) * r.userData.vel * dt;
      r.rotation.y = r.userData.yaw;
      // Fire at player
      ai.fireCd -= dt;
      if (playerRoot && ai.fireCd <= 0 && playerRoot.userData.alive) {
        var dist = r.position.distanceTo(playerRoot.position);
        if (dist < 55) {
          fireMg(r);
          if (Math.random() < 0.08) fireRocket(r);
          ai.fireCd = 0.12 + Math.random() * 0.2;
        }
      }
      // Ram damage
      if (playerRoot && playerRoot.userData.alive) {
        var d = r.position.distanceTo(playerRoot.position);
        if (d < 2.8) {
          damageTarget(playerRoot, 8 * dt, r);
          damageTarget(r, 5 * dt, playerRoot);
        }
      }
    });
  }

  // ---------- Update combat world ----------
  function updateProjectiles(dt) {
    for (var i = projectiles.length - 1; i >= 0; i--) {
      var pr = projectiles[i];
      pr.life -= dt;
      pr.mesh.position.addScaledVector(pr.vel, dt);
      var hit = false;
      var targets = pr.owner && pr.owner.userData.isPlayer ? rivals : (playerRoot ? [playerRoot] : []);
      for (var j = 0; j < targets.length; j++) {
        var t = targets[j];
        if (!t.userData.alive) continue;
        if (t.position.distanceTo(pr.mesh.position) < 2.2) {
          damageTarget(t, pr.dmg, pr.owner);
          spawnExplosion(pr.mesh.position);
          hit = true;
          break;
        }
      }
      if (hit || pr.life <= 0) {
        scene.remove(pr.mesh);
        projectiles.splice(i, 1);
      }
    }
    for (var i = mines.length - 1; i >= 0; i--) {
      var m = mines[i];
      m.arm -= dt; m.life -= dt;
      if (m.life <= 0) { scene.remove(m.mesh); mines.splice(i, 1); continue; }
      if (m.arm > 0) continue;
      var targets = rivals.concat(playerRoot ? [playerRoot] : []);
      for (var j = 0; j < targets.length; j++) {
        var t = targets[j];
        if (!t || !t.userData.alive || t === m.owner) continue;
        if (t.position.distanceTo(m.mesh.position) < 3.2) {
          damageTarget(t, m.dmg, m.owner);
          spawnExplosion(m.mesh.position);
          scene.remove(m.mesh);
          mines.splice(i, 1);
          break;
        }
      }
    }
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= dt;
      p.p.addScaledVector(p.v, dt);
      p.v.y -= 12 * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // ---------- Camera ----------
  var camPos = new THREE.Vector3(0, 5, 12);
  var camLook = new THREE.Vector3();
  function updateCamera(dt) {
    if (!playerRoot) return;
    var yaw = playerRoot.userData.yaw || 0;
    var back = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    var want = new THREE.Vector3();
    if (state.camMode === 0) {
      want.copy(playerRoot.position).add(new THREE.Vector3(0, 1.1, 0)).add(back.clone().multiplyScalar(-0.4));
      camLook.copy(playerRoot.position).add(new THREE.Vector3(Math.sin(yaw), 0.6, Math.cos(yaw)).multiplyScalar(20));
    } else if (state.camMode === 2) {
      want.copy(playerRoot.position).add(new THREE.Vector3(0, 28, 0)).add(back.clone().multiplyScalar(8));
      camLook.copy(playerRoot.position);
    } else {
      want.copy(playerRoot.position).add(new THREE.Vector3(0, 3.2, 0)).add(back.clone().multiplyScalar(9.5));
      camLook.copy(playerRoot.position).add(new THREE.Vector3(0, 1.2, 0)).add(back.clone().multiplyScalar(-6));
    }
    camPos.lerp(want, 1 - Math.exp(-6 * dt));
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    if (state.flash > 0) {
      camera.position.x += (Math.random() - 0.5) * state.flash * 0.8;
      camera.position.y += (Math.random() - 0.5) * state.flash * 0.4;
    }
  }

  // ---------- HUD ----------
  function resizeHud() {
    hud.width = window.innerWidth * (window.devicePixelRatio || 1);
    hud.height = window.innerHeight * (window.devicePixelRatio || 1);
    hud.style.width = window.innerWidth + 'px';
    hud.style.height = window.innerHeight + 'px';
    hctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
  }
  function drawBar(x, y, w, h, fill, col, label) {
    hctx.fillStyle = 'rgba(0,0,0,0.55)';
    hctx.fillRect(x, y, w, h);
    hctx.fillStyle = col;
    hctx.fillRect(x, y, w * Math.max(0, Math.min(1, fill)), h);
    hctx.fillStyle = '#fff';
    hctx.font = '11px Segoe UI, sans-serif';
    hctx.fillText(label, x + 4, y + h - 3);
  }
  function drawHUD() {
    var w = window.innerWidth, h = window.innerHeight;
    hctx.clearRect(0, 0, w, h);
    if (state.mode === MODE.TITLE) {
      hctx.fillStyle = 'rgba(5,6,10,0.35)';
      hctx.fillRect(0, 0, w, h);
      hctx.textAlign = 'center';
      hctx.fillStyle = '#f2e9e4';
      hctx.font = 'bold 42px Segoe UI, sans-serif';
      hctx.shadowColor = 'rgba(255,45,85,0.5)';
      hctx.shadowBlur = 24;
      hctx.fillText('TWISTED SPEED', w / 2, h * 0.38);
      hctx.shadowBlur = 0;
      hctx.font = '14px Segoe UI';
      hctx.fillStyle = '#8a9aaa';
      hctx.fillText('NIGHT CIRCUIT  ·  COMBAT RACING', w / 2, h * 0.38 + 36);
      hctx.fillStyle = '#3de0ff';
      hctx.fillText('PRESS ENTER  ·  SURVIVE THE WARDEN', w / 2, h * 0.55);
      return;
    }
    if (state.mode === MODE.GARAGE) {
      hctx.fillStyle = 'rgba(5,6,12,0.55)';
      hctx.fillRect(0, 0, w, h);
      hctx.textAlign = 'left';
      hctx.fillStyle = '#f2e9e4';
      hctx.font = 'bold 28px Segoe UI';
      hctx.fillText('GARAGE', 40, 60);
      hctx.font = '14px Segoe UI';
      hctx.fillStyle = '#8a9aaa';
      hctx.fillText('SCRAP ' + state.meta.scrap + '   NIGHT ' + state.meta.night + '/13   WINS ' + state.meta.wins, 40, 88);
      var def = G.vehicles.get(state.carId);
      hctx.fillStyle = '#3de0ff';
      hctx.font = 'bold 22px Segoe UI';
      hctx.fillText(def.name, 40, 140);
      hctx.fillStyle = '#c8b8b0';
      hctx.font = '14px Segoe UI';
      hctx.fillText(def.blurb, 40, 164);
      hctx.fillText('A/D change car  ·  1 Speed  2 Armor  3 Firepower  ·  ENTER race', 40, h - 40);
      var y = 200;
      ['speed', 'armor', 'firepower'].forEach(function (k, i) {
        var lvl = state.meta.upgrades[k] || 0;
        var cost = 25 + lvl * 20;
        hctx.fillStyle = '#f2e9e4';
        hctx.fillText((i + 1) + '  ' + k.toUpperCase() + '  Lv' + lvl + '  (' + cost + ' scrap)', 40, y + i * 28);
      });
      // roster
      G.vehicles.ROSTER.forEach(function (r, i) {
        var unlocked = state.meta.unlocked[r.id];
        hctx.fillStyle = r.id === state.carId ? '#3de0ff' : (unlocked ? '#a0a8b0' : '#403848');
        hctx.fillText((unlocked ? '● ' : '○ ') + r.name, w - 220, 140 + i * 28);
      });
      return;
    }
    if (state.mode === MODE.RESULTS) {
      var res = state.race && state.race.result;
      hctx.fillStyle = 'rgba(5,6,12,0.7)';
      hctx.fillRect(0, 0, w, h);
      hctx.textAlign = 'center';
      hctx.fillStyle = res && res.won ? '#3de0ff' : '#ff2d55';
      hctx.font = 'bold 36px Segoe UI';
      hctx.fillText(res && res.won ? 'PAROLE ARCH CLEARED' : 'REEL OVER', w / 2, h * 0.4);
      hctx.fillStyle = '#f2e9e4';
      hctx.font = '16px Segoe UI';
      if (res) hctx.fillText('Time ' + res.time.toFixed(1) + 's   Kills ' + res.kills + '   Scrap +' + res.scrap, w / 2, h * 0.48);
      hctx.fillStyle = '#8a9aaa';
      hctx.fillText('ENTER — GARAGE', w / 2, h * 0.58);
      return;
    }
    if (state.mode !== MODE.RACE || !playerRoot) return;
    var d = playerRoot.userData;
    var spd = Math.abs(d.vel || 0) * 3.6;
    drawBar(24, 24, 260, 14, (d.hp || 0) / (d.maxHp || 1), '#c02018', 'HP');
    drawBar(24, 42, 260, 12, (d.shield || 0) / (d.maxShield || 1), '#3de0ff', 'SH');
    drawBar(24, 60, 120, 10, d.nitro || 0, '#40e0f0', 'NOS');
    drawBar(160, 60, 120, 10, d.special || 0, '#a070ff', 'SP');
    hctx.fillStyle = 'rgba(0,0,0,0.45)';
    hctx.fillRect(24, 80, 280, 52);
    hctx.fillStyle = '#f2e9e4';
    hctx.font = '13px Segoe UI';
    hctx.textAlign = 'left';
    var lap = state.race ? ('LAP ' + Math.min(state.race.laps, state.race.lap + 1) + '/' + state.race.laps) : '';
    hctx.fillText(lap + '   ' + spd.toFixed(0) + ' km/h   HEAT ' + ((d.heat || 0) * 100).toFixed(0) + '%', 32, 100);
    hctx.fillText('J MG · K Rocket · L Mine · I Special · 1/2/3 Cam', 32, 120);
    hctx.fillStyle = '#3de0ff';
    hctx.fillText('SCRAP +' + (state.race ? state.race.scrap : 0) + '   KILLS ' + (state.race ? state.race.kills : 0), 32, 140);
    if (state.status) {
      hctx.fillStyle = '#ffb347';
      hctx.fillText(state.status, 32, 164);
    }
    // minimap-ish path
    // particles as 2d sparks
    particles.forEach(function (p) {
      var v = p.p.clone().project(camera);
      if (v.z > 1) return;
      var x = (v.x * 0.5 + 0.5) * w;
      var y = (-v.y * 0.5 + 0.5) * h;
      hctx.fillStyle = '#' + (p.color | 0).toString(16).padStart(6, '0');
      hctx.globalAlpha = Math.max(0, p.life / p.max);
      hctx.fillRect(x, y, 3, 3);
      hctx.globalAlpha = 1;
    });
  }

  // ---------- Loop ----------
  var last = performance.now() / 1000;
  var frames = 0, fpsT = 0, fps = 60;
  function frame(nowMs) {
    var now = nowMs / 1000;
    var dt = Math.min(0.05, now - last);
    last = now;
    state.time += dt;
    state.flash = Math.max(0, state.flash - dt);
    frames++; fpsT += dt;
    if (fpsT >= 0.5) { fps = frames / fpsT; frames = 0; fpsT = 0; }

    if (state.mode === MODE.RACE && playerRoot) {
      var input = {
        throttle: (state.keys['KeyW'] || state.keys['ArrowUp'] ? 1 : 0) + (state.keys['KeyS'] || state.keys['ArrowDown'] ? -1 : 0),
        steer: (state.keys['KeyD'] || state.keys['ArrowRight'] ? 1 : 0) + (state.keys['KeyA'] || state.keys['ArrowLeft'] ? -1 : 0),
        drift: !!(state.keys['ShiftLeft'] || state.keys['ShiftRight']),
        nitro: !!(state.keys['Space'] || state.keys['ControlLeft'])
      };
      G.vehicles.driveStep(playerRoot, input, dt, city);
      if (state.keys['KeyJ']) fireMg(playerRoot);
      state.race.t += dt;
      tryGate();
      updateAI(dt);
      updateProjectiles(dt);
      // keep player near path Y
      playerRoot.position.y = 0.05;
    } else if (state.mode === MODE.GARAGE || state.mode === MODE.TITLE) {
      // Slow orbit cam over city
      var ang = state.time * 0.12;
      camera.position.set(Math.sin(ang) * 55, 28, Math.cos(ang) * 55);
      camera.lookAt(0, 2, 0);
    }

    if (state.mode === MODE.RACE) updateCamera(dt);

    // Rain-ish falling sparks in view (atmosphere)
    if (state.mode === MODE.RACE && Math.random() < 0.3) {
      particles.push({
        p: camera.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 40, 8 + Math.random() * 10, (Math.random() - 0.5) * 40)),
        v: new THREE.Vector3(0, -18, 0),
        life: 0.4, max: 0.4, color: 0x6688aa, size: 0.05
      });
    }

    post.render(state.time, {
      exposure: 1.0 + state.flash * 0.4,
      bloom: 0.62 + state.flash * 0.5,
      bloomThreshold: 0.65
    });
    drawHUD();
    // FPS corner
    hctx.fillStyle = fps < 50 ? '#ff4455' : '#668';
    hctx.font = '11px monospace';
    hctx.textAlign = 'right';
    hctx.fillText(fps.toFixed(0) + ' fps', window.innerWidth - 12, 18);

    requestAnimationFrame(frame);
  }

  // ---------- Boot ----------
  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    post.resize(w, h);
    resizeHud();
  }
  window.addEventListener('resize', onResize);
  resizeHud();

  bootFill.style.width = '30%';
  // Apply env intensity on mats
  setTimeout(function () {
    bootFill.style.width = '70%';
    // soft rain lights
    for (var i = 0; i < 6; i++) {
      var pl = new THREE.PointLight(0x6688cc, 0.35, 40, 2);
      pl.position.set((Math.random() - 0.5) * 200, 12, (Math.random() - 0.5) * 200);
      scene.add(pl);
    }
    bootFill.style.width = '100%';
    setTimeout(function () {
      boot.style.opacity = '0';
      setTimeout(function () { boot.style.display = 'none'; }, 600);
      state.mode = MODE.TITLE;
      if (G.sfx && G.sfx.init) G.sfx.init();
    }, 200);
  }, 100);

  requestAnimationFrame(frame);
})();
