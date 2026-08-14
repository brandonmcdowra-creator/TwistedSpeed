/**
 * Refined thematic vehicles — real car/bike silhouettes first, theme second.
 * No sphere-blobs, no crate stacks. Multiparts with automotive proportions.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});

  // Shared geos (perf — many instances, few allocations)
  var G = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14),
    cone: new THREE.ConeGeometry(0.5, 1, 10),
    sphere: new THREE.SphereGeometry(0.5, 12, 10),
    torus: new THREE.TorusGeometry(0.5, 0.08, 8, 16),
  };

  function mesh(geo, mat, x, y, z, sx, sy, sz, rx, ry, rz) {
    var m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (sx != null) m.scale.set(sx, sy != null ? sy : 1, sz != null ? sz : 1);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function add(g, geo, mat, x, y, z, sx, sy, sz, rx, ry, rz) {
    var m = mesh(geo, mat, x, y, z, sx, sy, sz, rx, ry, rz);
    g.add(m);
    return m;
  }

  function paint(hex, o) {
    o = o || {};
    if (GAME.materials.carPaint) return GAME.materials.carPaint(hex, o);
    var M = GAME.materials.get();
    return new THREE.MeshStandardMaterial({
      color: hex, metalness: o.metalness != null ? o.metalness : 0.22,
      roughness: o.roughness != null ? o.roughness : 0.62,
      envMap: M._envMap, envMapIntensity: 0.5,
    });
  }

  function mats(def) {
    var M = GAME.materials.get();
    return {
      M: M,
      body: paint(def.color, { emissive: 0.006, flake: 0 }),
      accent: new THREE.MeshStandardMaterial({
        color: def.accent, emissive: def.accent, emissiveIntensity: 0.5,
        metalness: 0.28, roughness: 0.52, envMap: M._envMap, envMapIntensity: 0.55,
      }),
      carbon: paint(0x14161c, { metalness: 0.25, roughness: 0.7, emissive: 0.005, flake: 0 }),
      black: new THREE.MeshStandardMaterial({
        color: 0x0c0e12, metalness: 0.3, roughness: 0.65, envMap: M._envMap, envMapIntensity: 0.4,
      }),
      chrome: M.chrome,
      glass: M.glass,
      rubber: new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.96, metalness: 0.05 }),
      bone: new THREE.MeshStandardMaterial({
        color: 0xe4d8c4, metalness: 0.2, roughness: 0.55,
        envMap: M._envMap, envMapIntensity: 1.1, emissive: 0x2a1810, emissiveIntensity: 0.06,
      }),
      iron: new THREE.MeshStandardMaterial({
        color: 0x4a4e58, metalness: 0.88, roughness: 0.38, envMap: M._envMap, envMapIntensity: 2,
      }),
      stone: new THREE.MeshStandardMaterial({
        color: 0x5c5a62, metalness: 0.2, roughness: 0.78, envMap: M._envMap, envMapIntensity: 0.5,
      }),
    };
  }

  /** 4-wheel multiparts with real coupe proportions */
  function addCarWheels(g, m, positions, radius, width) {
    g.userData.wheels = [];
    positions.forEach(function (p) {
      var tire = mesh(G.cyl, m.rubber, p[0], p[1], p[2], radius * 2, width, radius * 2, 0, 0, Math.PI / 2);
      g.add(tire);
      g.userData.wheels.push(tire);
      // rim disc
      g.add(mesh(G.cyl, m.chrome, p[0], p[1], p[2], radius * 1.1, width * 1.05, radius * 1.1, 0, 0, Math.PI / 2));
      // hub
      g.add(mesh(G.cyl, m.black, p[0], p[1], p[2], radius * 0.55, width * 1.15, radius * 0.55, 0, 0, Math.PI / 2));
      // 5 spokes
      for (var s = 0; s < 5; s++) {
        var a = (s / 5) * Math.PI * 2;
        var sp = mesh(G.box, m.chrome, p[0] + (p[0] > 0 ? 0.02 : -0.02), p[1] + Math.sin(a) * radius * 0.35, p[2] + Math.cos(a) * radius * 0.35, 0.06, 0.04, radius * 0.55);
        sp.rotation.x = a;
        g.add(sp);
      }
      // caliper
      g.add(mesh(G.box, m.accent, p[0] * 0.92, p[1] + radius * 0.28, p[2], 0.1, 0.12, 0.16));
    });
  }

  function finish(g, def, isPlayer, m, opts) {
    opts = opts || {};
    var ug = new THREE.Mesh(
      new THREE.PlaneGeometry(opts.ugW || 1.5, opts.ugL || 2.8),
      new THREE.MeshBasicMaterial({
        color: def.accent, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    ug.rotation.x = -Math.PI / 2;
    ug.position.y = 0.02;
    g.add(ug);
    g.userData.underglow = ug;
    if (isPlayer) {
      var L = new THREE.PointLight(0xfff0d0, 1.4, 12, 2);
      L.position.set(0, 0.55, opts.lz || 2.2);
      g.add(L);
      g.userData.headLight = L;
    }
    var flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.6, 8),
      new THREE.MeshStandardMaterial({
        color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 4, transparent: true, opacity: 0.9,
      })
    );
    flame.rotation.x = Math.PI;
    flame.position.set(0, 0.32, opts.fz || -2.35);
    flame.visible = false;
    g.add(flame);
    g.userData.nitroFlame = flame;
    g.userData.def = def;
    g.userData.procedural = true;
    g.userData.hasWeapons = true;
    g.userData.theme = def.id;
    g.userData.isBike = !!opts.bike;
    g.userData.stabFront = !!opts.stabF;
    g.userData.stabRear = !!opts.stabR;
    return g;
  }

  /**
   * Core sports-coupe chassis (NFS-readable). Theme kits hang off this.
   * Returns group already in scene hierarchy for the caller.
   */
  function coupeChassis(g, m, s) {
    s = s || { x: 1, y: 1, z: 1 };
    var x = s.x, y = s.y, z = s.z;
    // Main body belt (long low mass)
    add(g, G.box, m.body, 0, 0.48 * y, 0.05 * z, 1.95 * x, 0.42 * y, 3.7 * z);
    // Lower rocker
    add(g, G.box, m.black, 0, 0.28 * y, 0, 2.05 * x, 0.16 * y, 3.5 * z);
    // Hood
    var hood = add(g, G.box, m.body, 0, 0.72 * y, 1.15 * z, 1.75 * x, 0.14 * y, 1.45 * z);
    hood.rotation.x = 0.07;
    // Cabin step
    add(g, G.box, m.carbon, 0, 0.95 * y, -0.15 * z, 1.55 * x, 0.45 * y, 1.5 * z);
    // Roof
    add(g, G.box, m.black, 0, 1.22 * y, -0.2 * z, 1.35 * x, 0.08 * y, 1.15 * z);
    // Rear deck
    add(g, G.box, m.body, 0, 0.72 * y, -1.45 * z, 1.8 * x, 0.16 * y, 0.95 * z);
    // Fenders (box + slight offset = widebody)
    [[-0.95, 1.2], [0.95, 1.2], [-0.95, -1.15], [0.95, -1.15]].forEach(function (f) {
      add(g, G.box, m.body, f[0] * x, 0.5 * y, f[1] * z, 0.38 * x, 0.38 * y, 0.95 * z);
    });
    // Front bumper + splitter
    add(g, G.box, m.body, 0, 0.38 * y, 2.0 * z, 1.95 * x, 0.28 * y, 0.35 * z);
    add(g, G.box, m.black, 0, 0.18, 2.1 * z, 2.05 * x, 0.06, 0.32 * z);
    // Grille
    add(g, G.box, m.black, 0, 0.42 * y, 2.18 * z, 1.0 * x, 0.18 * y, 0.1 * z);
    for (var i = 0; i < 5; i++) {
      add(g, G.box, m.chrome, (-0.35 + i * 0.175) * x, 0.42 * y, 2.22 * z, 0.05, 0.14 * y, 0.05);
    }
    // Rear bumper + diffuser
    add(g, G.box, m.body, 0, 0.36 * y, -2.0 * z, 1.95 * x, 0.26 * y, 0.32 * z);
    for (var d = 0; d < 5; d++) {
      add(g, G.box, m.black, (-0.45 + d * 0.225) * x, 0.2, -2.15 * z, 0.07, 0.12, 0.18);
    }
    // Exhausts
    add(g, G.cyl, m.chrome, -0.4 * x, 0.24, -2.2 * z, 0.14, 0.2, 0.14, Math.PI / 2, 0, 0);
    add(g, G.cyl, m.chrome, 0.4 * x, 0.24, -2.2 * z, 0.14, 0.2, 0.14, Math.PI / 2, 0, 0);
    // Glass
    var wind = add(g, G.box, m.glass, 0, 1.05 * y, 0.55 * z, 1.4 * x, 0.4 * y, 0.06);
    wind.rotation.x = -0.48;
    var rg = add(g, G.box, m.glass, 0, 1.02 * y, -0.9 * z, 1.35 * x, 0.36 * y, 0.05);
    rg.rotation.x = 0.38;
    add(g, G.box, m.glass, -0.78 * x, 1.05 * y, -0.15 * z, 0.05, 0.32 * y, 1.05 * z);
    add(g, G.box, m.glass, 0.78 * x, 1.05 * y, -0.15 * z, 0.05, 0.32 * y, 1.05 * z);
    // Mirrors
    add(g, G.box, m.black, -1.05 * x, 0.95 * y, 0.5 * z, 0.28, 0.08, 0.14);
    add(g, G.box, m.black, 1.05 * x, 0.95 * y, 0.5 * z, 0.28, 0.08, 0.14);
    // Wing
    add(g, G.box, m.black, 0, 1.28 * y, -1.95 * z, 1.85 * x, 0.06, 0.32);
    add(g, G.box, m.black, -0.7 * x, 1.12 * y, -1.85 * z, 0.07, 0.28, 0.1);
    add(g, G.box, m.black, 0.7 * x, 1.12 * y, -1.85 * z, 0.07, 0.28, 0.1);
    // Headlight bars
    var hl = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xfff0c8, emissiveIntensity: 4.2, metalness: 0.2, roughness: 0.15,
    });
    add(g, G.box, m.black, -0.6 * x, 0.55 * y, 2.12 * z, 0.5, 0.12, 0.1);
    add(g, G.box, m.black, 0.6 * x, 0.55 * y, 2.12 * z, 0.5, 0.12, 0.1);
    add(g, G.box, hl, -0.6 * x, 0.55 * y, 2.18 * z, 0.42, 0.08, 0.06);
    add(g, G.box, hl, 0.6 * x, 0.55 * y, 2.18 * z, 0.42, 0.08, 0.06);
    // Taillights
    var tl = new THREE.MeshStandardMaterial({
      color: 0xff1a2e, emissive: 0xff0820, emissiveIntensity: 3.2, metalness: 0.25, roughness: 0.2,
    });
    add(g, G.box, tl, -0.55 * x, 0.58 * y, -2.15 * z, 0.65, 0.12, 0.08);
    add(g, G.box, tl, 0.55 * x, 0.58 * y, -2.15 * z, 0.65, 0.12, 0.08);
    // Shutlines
    add(g, G.box, m.black, 0, 0.72 * y, 0.45 * z, 1.7 * x, 0.02, 0.03);
    add(g, G.box, m.black, 0, 0.72 * y, -0.75 * z, 1.7 * x, 0.02, 0.03);
    add(g, G.box, m.black, -1.0 * x, 0.55 * y, 0.05, 0.02, 0.28 * y, 1.4 * z);
    add(g, G.box, m.black, 1.0 * x, 0.55 * y, 0.05, 0.02, 0.28 * y, 1.4 * z);

    addCarWheels(g, m, [
      [-1.0 * x, 0.42, 1.3 * z], [1.0 * x, 0.42, 1.3 * z],
      [-1.0 * x, 0.42, -1.25 * z], [1.0 * x, 0.42, -1.25 * z],
    ], 0.44, 0.36);
  }

  // ——— MARROW: muscle coupe + bone armor kit (readable car first) ———
  function buildMarrow(def, isPlayer) {
    var g = new THREE.Group();
    var m = mats(def);
    m.body = paint(0xc45c26, { emissive: 0.03 });
    coupeChassis(g, m, { x: 1.08, y: 0.95, z: 1.05 });
    // Bone armor — structured kit, not random shards
    // Rib panels on doors
    for (var r = 0; r < 5; r++) {
      add(g, G.box, m.bone, -1.08, 0.55, -0.5 + r * 0.28, 0.08, 0.08, 0.22);
      add(g, G.box, m.bone, 1.08, 0.55, -0.5 + r * 0.28, 0.08, 0.08, 0.22);
    }
    // Spine ridge
    for (var s = 0; s < 8; s++) {
      add(g, G.box, m.bone, 0, 0.88, -1.2 + s * 0.32, 0.12, 0.1, 0.2);
    }
    // Skull brow over windshield
    add(g, G.box, m.bone, 0, 1.15, 0.35, 1.2, 0.1, 0.25);
    // Eye-socket lamps already as headlights; bone sockets
    add(g, G.box, m.bone, -0.6, 0.55, 2.08, 0.55, 0.18, 0.12);
    add(g, G.box, m.bone, 0.6, 0.55, 2.08, 0.55, 0.18, 0.12);
    // Dual bone rockets
    add(g, G.cyl, m.bone, -1.05, 0.72, -1.55, 0.2, 0.95, 0.2, Math.PI / 2, 0, 0);
    add(g, G.cyl, m.bone, 1.05, 0.72, -1.55, 0.2, 0.95, 0.2, Math.PI / 2, 0, 0);
    add(g, G.cone, m.accent, -1.05, 0.72, -2.1, 0.22, 0.28, 0.22, -Math.PI / 2, 0, 0);
    add(g, G.cone, m.accent, 1.05, 0.72, -2.1, 0.22, 0.28, 0.22, -Math.PI / 2, 0, 0);
    // Roof MG
    add(g, G.box, m.bone, 0, 1.38, 0.05, 0.45, 0.14, 0.4);
    add(g, G.cyl, m.chrome, -0.1, 1.42, 0.7, 0.08, 1.0, 0.08, Math.PI / 2, 0, 0);
    add(g, G.cyl, m.chrome, 0.1, 1.42, 0.7, 0.08, 1.0, 0.08, Math.PI / 2, 0, 0);
    // Accent stripes
    add(g, G.box, m.accent, -0.5, 0.75, 0.1, 0.12, 0.02, 3.2);
    add(g, G.box, m.accent, 0.5, 0.75, 0.1, 0.12, 0.02, 3.2);
    return finish(g, def, isPlayer, m, {});
  }

  // ——— NEEDLE: real motorcycle + stab points ———
  function buildNeedle(def, isPlayer) {
    var g = new THREE.Group();
    var m = mats(def);
    m.body = paint(0x0a0c12, { metalness: 0.85, roughness: 0.16 });
    // Main frame beam
    add(g, G.box, m.body, 0, 0.55, 0.1, 0.22, 0.18, 2.4);
    // Fuel tank
    add(g, G.box, m.body, 0, 0.78, 0.15, 0.42, 0.32, 0.85);
    add(g, G.box, m.accent, 0, 0.88, 0.15, 0.28, 0.06, 0.7);
    // Seat / tail
    add(g, G.box, m.black, 0, 0.72, -0.7, 0.38, 0.16, 0.9);
    // Front fairing
    add(g, G.box, m.body, 0, 0.7, 1.15, 0.45, 0.4, 0.55);
    // Windshield
    var w = add(g, G.box, m.glass, 0, 0.95, 1.25, 0.4, 0.28, 0.05);
    w.rotation.x = -0.35;
    // Front forks
    add(g, G.box, m.chrome, -0.12, 0.55, 1.35, 0.06, 0.7, 0.06);
    add(g, G.box, m.chrome, 0.12, 0.55, 1.35, 0.06, 0.7, 0.06);
    // Handlebars
    add(g, G.box, m.chrome, 0, 0.95, 1.05, 0.85, 0.05, 0.05);
    add(g, G.sphere, m.accent, -0.42, 0.95, 1.05, 0.12, 0.12, 0.12);
    add(g, G.sphere, m.accent, 0.42, 0.95, 1.05, 0.12, 0.12, 0.12);
    // FRONT STAB SPIKE (reads as needle)
    add(g, G.cone, m.chrome, 0, 0.52, 2.15, 0.22, 1.4, 0.22, -Math.PI / 2, 0, 0);
    add(g, G.cone, m.accent, 0, 0.52, 2.85, 0.1, 0.35, 0.1, -Math.PI / 2, 0, 0);
    add(g, G.box, m.body, 0, 0.52, 1.55, 0.16, 0.14, 0.55);
    // REAR STAB SPIKE
    add(g, G.cone, m.chrome, 0, 0.52, -1.85, 0.18, 1.0, 0.18, Math.PI / 2, 0, 0);
    add(g, G.cone, m.accent, 0, 0.52, -2.4, 0.08, 0.28, 0.08, Math.PI / 2, 0, 0);
    // Side rails
    add(g, G.box, m.accent, -0.28, 0.42, 0, 0.05, 0.05, 1.8);
    add(g, G.box, m.accent, 0.28, 0.42, 0, 0.05, 0.05, 1.8);
    // Headlight
    var hl = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xfff0c8, emissiveIntensity: 4,
    });
    add(g, G.sphere, hl, 0, 0.72, 1.45, 0.22, 0.22, 0.18);
    // Two wheels
    g.userData.wheels = [];
    [[0, 0.4, 1.2, 0.4, 0.2], [0, 0.42, -0.95, 0.46, 0.26]].forEach(function (w) {
      var tire = mesh(G.cyl, m.rubber, w[0], w[1], w[2], w[3] * 2, w[4], w[3] * 2, 0, 0, Math.PI / 2);
      g.add(tire);
      g.userData.wheels.push(tire);
      g.add(mesh(G.cyl, m.chrome, w[0], w[1], w[2], w[3] * 1.15, w[4] * 1.1, w[3] * 1.15, 0, 0, Math.PI / 2));
    });
    // Swingarm
    add(g, G.box, m.black, 0, 0.38, -0.35, 0.12, 0.08, 0.9);
    return finish(g, def, isPlayer, m, { bike: true, stabF: true, stabR: true, ugW: 0.7, ugL: 2.6, lz: 1.6, fz: -1.7 });
  }

  // ——— MAUSOLEUM: armored SUV / hearse proportions ———
  function buildMausoleum(def, isPlayer) {
    var g = new THREE.Group();
    var m = mats(def);
    m.body = paint(0x4a4e55, { metalness: 0.75, roughness: 0.28 });
    // Tall armored body
    add(g, G.box, m.stone, 0, 0.7, 0, 2.15, 0.85, 3.9);
    add(g, G.box, m.iron, 0, 1.25, -0.15, 2.05, 0.55, 3.4);
    // Cabin front
    add(g, G.box, m.iron, 0, 1.15, 1.45, 2.0, 0.7, 1.1);
    // Armor plates (layered, readable)
    for (var p = 0; p < 5; p++) {
      add(g, G.box, m.iron, 0, 0.4 + p * 0.1, -1.4 + p * 0.5, 2.25, 0.07, 0.48);
    }
    for (var s = -1; s <= 1; s += 2) {
      add(g, G.box, m.iron, s * 1.12, 0.85, 0, 0.12, 0.9, 3.5);
      for (var rv = 0; rv < 6; rv++) {
        add(g, G.sphere, m.accent, s * 1.2, 0.55 + (rv % 2) * 0.3, -1.2 + rv * 0.45, 0.08, 0.08, 0.08);
      }
    }
    // Front grille / tomb door
    add(g, G.box, m.iron, 0, 0.65, 2.05, 1.5, 0.55, 0.2);
    for (var gr = 0; gr < 4; gr++) {
      add(g, G.box, m.accent, -0.35 + gr * 0.22, 0.65, 2.15, 0.06, 0.45, 0.06);
    }
    // Pediment
    add(g, G.box, m.stone, 0, 1.55, 1.85, 1.6, 0.25, 0.3);
    add(g, G.cone, m.stone, 0, 1.85, 1.85, 0.5, 0.4, 0.5);
    // Cross ornament
    add(g, G.box, m.accent, 0, 1.75, 1.85, 0.1, 0.4, 0.08);
    add(g, G.box, m.accent, 0, 1.85, 1.85, 0.28, 0.08, 0.08);
    // Mortars
    for (var mi = 0; mi < 3; mi++) {
      add(g, G.cyl, m.iron, -0.4 + mi * 0.4, 1.55, -0.3, 0.26, 0.75, 0.26, -0.45, 0, 0);
    }
    // MG
    add(g, G.box, m.iron, 0, 1.6, 0.55, 0.5, 0.18, 0.45);
    add(g, G.cyl, m.chrome, -0.1, 1.65, 1.15, 0.1, 1.1, 0.1, Math.PI / 2, 0, 0);
    add(g, G.cyl, m.chrome, 0.1, 1.65, 1.15, 0.1, 1.1, 0.1, Math.PI / 2, 0, 0);
    // Glass
    add(g, G.box, m.glass, 0, 1.25, 2.0, 1.6, 0.4, 0.06);
    // Lamps
    var lamp = new THREE.MeshStandardMaterial({
      color: 0xffcc66, emissive: 0xffaa33, emissiveIntensity: 3,
    });
    add(g, G.sphere, lamp, -0.75, 0.7, 2.15, 0.28, 0.28, 0.28);
    add(g, G.sphere, lamp, 0.75, 0.7, 2.15, 0.28, 0.28, 0.28);
    var tl = new THREE.MeshStandardMaterial({
      color: 0xff2200, emissive: 0xff1000, emissiveIntensity: 2.5,
    });
    add(g, G.box, tl, -0.65, 0.7, -2.05, 0.5, 0.14, 0.08);
    add(g, G.box, tl, 0.65, 0.7, -2.05, 0.5, 0.14, 0.08);
    addCarWheels(g, m, [
      [-1.1, 0.48, 1.25], [1.1, 0.48, 1.25],
      [-1.1, 0.48, -1.2], [1.1, 0.48, -1.2],
    ], 0.5, 0.4);
    return finish(g, def, isPlayer, m, { ugW: 1.8, ugL: 3.0, lz: 2.2, fz: -2.4 });
  }

  // ——— VESPER: sleek ghost coupe ———
  function buildVesper(def, isPlayer) {
    var g = new THREE.Group();
    var m = mats(def);
    m.body = paint(0x2a1040, { metalness: 0.82, roughness: 0.14 });
    coupeChassis(g, m, { x: 1.02, y: 0.9, z: 1.08 });
    // Ghost glass panels (translucent overlays)
    var ghost = new THREE.MeshStandardMaterial({
      color: 0x8844aa, metalness: 0.35, roughness: 0.12, transparent: true, opacity: 0.45,
      emissive: 0xff2d55, emissiveIntensity: 0.2, envMap: GAME.materials.get()._envMap, envMapIntensity: 2.5,
    });
    add(g, G.box, ghost, 0, 1.05, -0.1, 1.5, 0.4, 1.4);
    add(g, G.box, ghost, -0.95, 0.7, -0.8, 0.08, 0.35, 1.1);
    add(g, G.box, ghost, 0.95, 0.7, -0.8, 0.08, 0.35, 1.1);
    // Slim weapon rails
    add(g, G.box, m.accent, -1.05, 0.5, 0, 0.08, 0.06, 2.0);
    add(g, G.box, m.accent, 1.05, 0.5, 0, 0.08, 0.06, 2.0);
    return finish(g, def, isPlayer, m, {});
  }

  // ——— CHOIR: panel van with speakers ———
  function buildChoir(def, isPlayer) {
    var g = new THREE.Group();
    var m = mats(def);
    m.body = paint(0xe8e4dc, { metalness: 0.4, roughness: 0.35 });
    // Van body
    add(g, G.box, m.body, 0, 0.95, -0.25, 2.1, 1.35, 3.5);
    // Cab
    add(g, G.box, m.body, 0, 0.7, 1.55, 2.05, 0.75, 1.2);
    add(g, G.box, m.glass, 0, 1.15, 2.1, 1.85, 0.5, 0.08);
    add(g, G.box, m.glass, -1.0, 1.1, 1.55, 0.08, 0.45, 0.85);
    add(g, G.box, m.glass, 1.0, 1.1, 1.55, 0.08, 0.45, 0.85);
    // Hood
    add(g, G.box, m.body, 0, 0.55, 2.0, 1.95, 0.2, 0.55);
    // Speakers
    for (var s = -1; s <= 1; s += 2) {
      add(g, G.cyl, m.black, s * 1.2, 1.0, 0.15, 0.9, 0.4, 0.9, 0, 0, Math.PI / 2);
      add(g, G.torus, m.accent, s * 1.35, 1.0, 0.15, 0.7, 0.7, 0.7, 0, Math.PI / 2, 0);
      add(g, G.cyl, m.black, s * 1.2, 1.0, -0.85, 0.7, 0.32, 0.7, 0, 0, Math.PI / 2);
    }
    for (var i = 0; i < 6; i++) {
      add(g, G.cyl, m.black, -0.7 + (i % 3) * 0.7, 1.7, -0.5 + Math.floor(i / 3) * 0.7, 0.28, 0.12, 0.28);
    }
    // Stripe
    add(g, G.box, m.accent, 0, 0.35, -0.1, 2.15, 0.12, 3.4);
    var hl = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xfff0c8, emissiveIntensity: 3.5,
    });
    add(g, G.box, hl, -0.7, 0.55, 2.25, 0.4, 0.14, 0.08);
    add(g, G.box, hl, 0.7, 0.55, 2.25, 0.4, 0.14, 0.08);
    addCarWheels(g, m, [
      [-1.0, 0.42, 1.3], [1.0, 0.42, 1.3],
      [-1.0, 0.42, -1.25], [1.0, 0.42, -1.25],
    ], 0.45, 0.36);
    return finish(g, def, isPlayer, m, { ugW: 1.6, ugL: 2.8, lz: 2.2, fz: -2.2 });
  }

  function buildRazorback(def, isPlayer) {
    var d = Object.assign({}, def, { color: 0x1a2a14, accent: 0x39ff14 });
    var g = buildMausoleum(d, isPlayer);
    g.userData.theme = 'razorback';
    return g;
  }

  GAME.vehicleBodies = {
    build: function (def, isPlayer) {
      var id = (def && def.id) || 'marrow';
      if (id === 'marrow') return buildMarrow(def, isPlayer);
      if (id === 'needle') return buildNeedle(def, isPlayer);
      if (id === 'mausoleum') return buildMausoleum(def, isPlayer);
      if (id === 'vesper') return buildVesper(def, isPlayer);
      if (id === 'choir') return buildChoir(def, isPlayer);
      if (id === 'razorback') return buildRazorback(def, isPlayer);
      return buildMarrow(def, isPlayer);
    },
  };
})();
