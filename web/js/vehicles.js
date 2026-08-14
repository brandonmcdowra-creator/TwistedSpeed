/**
 * Vehicles â€” GLB when present, sculpted multiparts fallback (not box stacks).
 * Clearcoat paint + real underglow lights + readable silhouettes.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});
  var glbCache = {};

  function carDef(id) {
    var cars = GAME.config.cars;
    for (var i = 0; i < cars.length; i++) if (cars[i].id === id) return cars[i];
    return cars[0];
  }

  function addMesh(g, geo, mat, x, y, z, sx, sy, sz, rx, ry, rz) {
    var m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (sx != null) m.scale.set(sx, sy != null ? sy : 1, sz != null ? sz : 1);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  }

  /**
   * Thematic multiparts — dispatches to vehicle_bodies.js by def.id
   * (Marrow bones, Needle stab-bike, Mausoleum armor, etc.)
   */
  function procedural(def, isPlayer) {
    if (GAME.vehicleBodies && GAME.vehicleBodies.build) {
      return GAME.vehicleBodies.build(def, isPlayer);
    }
    // Minimal fallback if theme module missing
    var M = GAME.materials.get();
    var g = new THREE.Group();
    var color = def.color;
    var accent = def.accent;
    var bodyMat = GAME.materials.carPaint
      ? GAME.materials.carPaint(color, { emissive: isPlayer ? 0.012 : 0.006, flake: 0 })
      : new THREE.MeshStandardMaterial({
          color: color, metalness: 0.22, roughness: 0.62,
          emissive: color, emissiveIntensity: isPlayer ? 0.012 : 0.006,
          envMap: M._envMap, envMapIntensity: 0.5,
        });
    var accentMat = new THREE.MeshStandardMaterial({
      color: accent, emissive: accent, emissiveIntensity: 0.55,
      metalness: 0.3, roughness: 0.5, envMap: M._envMap, envMapIntensity: 0.55,
    });
    var rubber = new THREE.MeshStandardMaterial({
      color: 0x0a0a0c, roughness: 0.96, metalness: 0.04,
    });
    var rimMat = M.chrome;
    var carbon = GAME.materials.carPaint
      ? GAME.materials.carPaint(0x14161c, { emissive: 0.01, metalness: 0.7, roughness: 0.32 })
      : new THREE.MeshStandardMaterial({
          color: 0x14161c, metalness: 0.7, roughness: 0.32,
          envMap: M._envMap, envMapIntensity: 1.6,
        });
    var blackTrim = new THREE.MeshStandardMaterial({
      color: 0x0c0e12, metalness: 0.5, roughness: 0.45, envMap: M._envMap, envMapIntensity: 0.8,
    });

    // Proportions: low · wide · long (NFS street coupe)
    var sY = def.id === 'mausoleum' ? 1.12 : (def.id === 'choir' ? 1.18 : 0.94);
    var sX = def.id === 'mausoleum' ? 1.2 : (def.id === 'needle' ? 0.9 : 1.1);
    var sZ = def.id === 'needle' ? 1.2 : (def.id === 'choir' ? 1.06 : 1.06);
    if (def.id === 'vesper') { sY = 0.9; sX = 1.06; sZ = 1.1; }

    // === CURVED body volumes (spheres/capsules — continuous coupe, not box stack) ===
    // Main hull — elongated sphere = continuous paint surface
    var hull = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), bodyMat);
    hull.scale.set(1.05 * sX, 0.36 * sY, 2.05 * sZ);
    hull.position.set(0, 0.52 * sY, 0.05);
    hull.castShadow = true; hull.receiveShadow = true;
    g.add(hull);
    // Lower rocker ellipse (extra width at belt)
    var rocker = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), bodyMat);
    rocker.scale.set(1.15 * sX, 0.28 * sY, 1.95 * sZ);
    rocker.position.set(0, 0.38 * sY, 0.02);
    rocker.castShadow = true;
    g.add(rocker);
    // Hood nose — scaled sphere tapering forward
    var nose = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16), bodyMat);
    nose.scale.set(0.88 * sX, 0.26 * sY, 0.95 * sZ);
    nose.position.set(0, 0.58 * sY, 1.35 * sZ);
    nose.castShadow = true;
    g.add(nose);
    // Hood center bulge
    var scoop = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), blackTrim);
    scoop.scale.set(0.28 * sX, 0.08, 0.55 * sZ);
    scoop.position.set(0, 0.78 * sY, 1.2 * sZ);
    g.add(scoop);
    // Rear haunches (fastback mass)
    var haunch = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16), bodyMat);
    haunch.scale.set(0.95 * sX, 0.32 * sY, 0.75 * sZ);
    haunch.position.set(0, 0.62 * sY, -1.35 * sZ);
    haunch.castShadow = true;
    g.add(haunch);
    // Wheel-arch fenders — spheres + half-torus arches (continuous body language)
    var fenderZs = [1.25 * sZ, -1.2 * sZ];
    for (var fi = 0; fi < 2; fi++) {
      for (var side = -1; side <= 1; side += 2) {
        var fend = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), bodyMat);
        fend.scale.set(0.38 * sX, 0.4 * sY, 0.55 * sZ);
        fend.position.set(side * 0.95 * sX, 0.48 * sY, fenderZs[fi]);
        fend.castShadow = true;
        g.add(fend);
        // Arch lip
        var arch = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 20, Math.PI), blackTrim);
        arch.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        arch.rotation.y = Math.PI / 2;
        arch.position.set(side * 1.05 * sX, 0.44, fenderZs[fi]);
        g.add(arch);
      }
    }
    // Front bumper — rounded capsule if available, else sphere
    var bumperGeo = THREE.CapsuleGeometry
      ? new THREE.CapsuleGeometry(0.22, 1.6 * sX, 6, 12)
      : new THREE.SphereGeometry(1, 16, 12);
    var fBump = new THREE.Mesh(bumperGeo, bodyMat);
    if (!THREE.CapsuleGeometry) fBump.scale.set(1.05 * sX, 0.22 * sY, 0.28);
    else { fBump.rotation.z = Math.PI / 2; fBump.scale.set(1, 1, 0.9); }
    fBump.position.set(0, 0.36 * sY, 2.05 * sZ);
    fBump.castShadow = true;
    g.add(fBump);
    // Front splitter (thin plate under nose)
    addMesh(g, new THREE.BoxGeometry(2.15 * sX, 0.05, 0.32), blackTrim, 0, 0.16, 2.12 * sZ);
    // Grille recess
    addMesh(g, new THREE.BoxGeometry(0.95 * sX, 0.18, 0.08), blackTrim, 0, 0.4 * sY, 2.22 * sZ);
    for (var gb = 0; gb < 5; gb++) {
      addMesh(g, new THREE.BoxGeometry(0.04, 0.14, 0.04), rimMat, (-0.36 + gb * 0.18) * sX, 0.4 * sY, 2.26 * sZ);
    }
    // Rear bumper rounded
    var rBump = new THREE.Mesh(
      THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.2, 1.55 * sX, 6, 12) : new THREE.SphereGeometry(1, 14, 12),
      bodyMat
    );
    if (THREE.CapsuleGeometry) rBump.rotation.z = Math.PI / 2;
    else rBump.scale.set(1.0 * sX, 0.2 * sY, 0.26);
    rBump.position.set(0, 0.34 * sY, -2.0 * sZ);
    g.add(rBump);
    // Diffuser fins
    for (var df = 0; df < 5; df++) {
      addMesh(g, new THREE.BoxGeometry(0.07, 0.12, 0.18), blackTrim, (-0.48 + df * 0.24) * sX, 0.2, -2.18 * sZ);
    }
    // Twin exhaust
    addMesh(g, new THREE.CylinderGeometry(0.08, 0.09, 0.22, 10), rimMat, -0.38 * sX, 0.24, -2.22 * sZ).rotation.x = Math.PI / 2;
    addMesh(g, new THREE.CylinderGeometry(0.08, 0.09, 0.22, 10), rimMat, 0.38 * sX, 0.24, -2.22 * sZ).rotation.x = Math.PI / 2;
    // Side skirts (thin curved-ish via scaled sphere)
    var skirt = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), blackTrim);
    skirt.scale.set(1.18 * sX, 0.1, 1.75 * sZ);
    skirt.position.set(0, 0.2, 0);
    g.add(skirt);

    // === Cabin bubble + glass (continuous canopy) ===
    var cabin = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16), carbon);
    cabin.scale.set(0.72 * sX, 0.4 * sY, 0.8 * sZ);
    cabin.position.set(0, 0.98 * sY, -0.12 * sZ);
    cabin.castShadow = true;
    g.add(cabin);
    // Windshield — curved panel via scaled sphere slice look
    var wind = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), M.glass);
    wind.scale.set(0.7 * sX, 0.38 * sY, 0.55 * sZ);
    wind.position.set(0, 0.95 * sY, 0.35 * sZ);
    wind.rotation.x = -0.35;
    g.add(wind);
    var rearGlass = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), M.glass);
    rearGlass.scale.set(0.68 * sX, 0.32 * sY, 0.45 * sZ);
    rearGlass.position.set(0, 0.95 * sY, -0.75 * sZ);
    rearGlass.rotation.x = 0.45;
    g.add(rearGlass);
    // Side glass
    addMesh(g, new THREE.SphereGeometry(0.5, 12, 10), M.glass, -0.72 * sX, 0.98 * sY, -0.1 * sZ, 0.35, 0.55, 0.9);
    addMesh(g, new THREE.SphereGeometry(0.5, 12, 10), M.glass, 0.72 * sX, 0.98 * sY, -0.1 * sZ, 0.35, 0.55, 0.9);
    // Mirrors
    addMesh(g, new THREE.SphereGeometry(0.12, 10, 8), blackTrim, -1.05 * sX, 0.95 * sY, 0.45 * sZ, 1.4, 0.7, 1.0);
    addMesh(g, new THREE.SphereGeometry(0.12, 10, 8), blackTrim, 1.05 * sX, 0.95 * sY, 0.45 * sZ, 1.4, 0.7, 1.0);

    // === Big rear wing (NFS money-shot) ===
    var wing = new THREE.Mesh(new THREE.BoxGeometry(1.9 * sX, 0.06, 0.36), blackTrim);
    wing.position.set(0, 1.32 * sY, -1.9 * sZ);
    wing.castShadow = true;
    g.add(wing);
    addMesh(g, new THREE.BoxGeometry(0.07, 0.3, 0.1), blackTrim, -0.72 * sX, 1.15 * sY, -1.8 * sZ);
    addMesh(g, new THREE.BoxGeometry(0.07, 0.3, 0.1), blackTrim, 0.72 * sX, 1.15 * sY, -1.8 * sZ);

    // Accent racing stripes (follow curved hull)
    addMesh(g, new THREE.BoxGeometry(0.12, 0.02, 3.2 * sZ), accentMat, -0.4 * sX, 0.78 * sY, 0.05);
    addMesh(g, new THREE.BoxGeometry(0.12, 0.02, 3.2 * sZ), accentMat, 0.4 * sX, 0.78 * sY, 0.05);

    // === LED headlights (bright white â€” NFS Heat language) ===
    var hlMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xfff0c8, emissiveIntensity: 4.5,
      metalness: 0.15, roughness: 0.12, envMap: M._envMap, envMapIntensity: 1.2,
    });
    // Horizontal LED bar housings
    addMesh(g, new THREE.BoxGeometry(0.55, 0.12, 0.1), blackTrim, -0.62 * sX, 0.55 * sY, 2.18 * sZ);
    addMesh(g, new THREE.BoxGeometry(0.55, 0.12, 0.1), blackTrim, 0.62 * sX, 0.55 * sY, 2.18 * sZ);
    var hlL = addMesh(g, new THREE.BoxGeometry(0.48, 0.08, 0.06), hlMat, -0.62 * sX, 0.55 * sY, 2.24 * sZ);
    var hlR = addMesh(g, new THREE.BoxGeometry(0.48, 0.08, 0.06), hlMat, 0.62 * sX, 0.55 * sY, 2.24 * sZ);
    g.userData.headlights = [hlL, hlR];
    // Fog lamps
    addMesh(g, new THREE.CylinderGeometry(0.08, 0.08, 0.06, 10), hlMat, -0.75 * sX, 0.32, 2.2 * sZ).rotation.x = Math.PI / 2;
    addMesh(g, new THREE.CylinderGeometry(0.08, 0.08, 0.06, 10), hlMat, 0.75 * sX, 0.32, 2.2 * sZ).rotation.x = Math.PI / 2;

    // === Taillights (ring / bar LED red) ===
    var tlMat = new THREE.MeshStandardMaterial({
      color: 0xff1a2e, emissive: 0xff0820, emissiveIntensity: 3.5,
      metalness: 0.25, roughness: 0.18, transparent: true, opacity: 0.95,
    });
    addMesh(g, new THREE.BoxGeometry(0.7, 0.14, 0.08), tlMat, -0.55 * sX, 0.58 * sY, -2.18 * sZ);
    addMesh(g, new THREE.BoxGeometry(0.7, 0.14, 0.08), tlMat, 0.55 * sX, 0.58 * sY, -2.18 * sZ);
    addMesh(g, new THREE.BoxGeometry(0.45, 0.05, 0.04), tlMat, 0, 1.15 * sY, -0.95 * sZ);

    // === Multi-spoke wheels + calipers ===
    var tireGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.38, 22);
    tireGeo.rotateZ(Math.PI / 2);
    var rimHub = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 14);
    rimHub.rotateZ(Math.PI / 2);
    var positions = [
      [-1.05 * sX, 0.44, 1.35 * sZ], [1.05 * sX, 0.44, 1.35 * sZ],
      [-1.05 * sX, 0.44, -1.3 * sZ], [1.05 * sX, 0.44, -1.3 * sZ],
    ];
    var caliperMat = new THREE.MeshStandardMaterial({
      color: accent, metalness: 0.55, roughness: 0.35, emissive: accent, emissiveIntensity: 0.2,
      envMap: M._envMap, envMapIntensity: 1.0,
    });
    g.userData.wheels = [];
    for (var w = 0; w < 4; w++) {
      var tire = new THREE.Mesh(tireGeo, rubber);
      tire.position.set(positions[w][0], positions[w][1], positions[w][2]);
      tire.castShadow = true;
      g.add(tire);
      g.userData.wheels.push(tire);
      var hub = new THREE.Mesh(rimHub, rimMat);
      hub.position.copy(tire.position);
      g.add(hub);
      for (var sp = 0; sp < 6; sp++) {
        var spoke = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.035, 0.3), rimMat);
        var ang = (sp / 6) * Math.PI * 2;
        spoke.position.copy(tire.position);
        spoke.position.y += Math.sin(ang) * 0.16;
        spoke.position.z += Math.cos(ang) * 0.16;
        spoke.position.x += positions[w][0] > 0 ? 0.04 : -0.04;
        spoke.rotation.x = ang;
        spoke.rotation.z = Math.PI / 2;
        g.add(spoke);
      }
      var outerRim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 6, 18), rimMat);
      outerRim.rotation.y = Math.PI / 2;
      outerRim.position.copy(tire.position);
      g.add(outerRim);
      var cal = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.18), caliperMat);
      cal.position.copy(tire.position);
      cal.position.y += 0.14;
      g.add(cal);
    }

    // === Combat weapons by vehicle type ===
    attachWeapons(g, def, isPlayer, sX, sY, sZ, M, bodyMat, accentMat, blackTrim, rimMat);

    // Placeholder underglow (hidden — game attaches rocker LEDs)
    var ugMat = new THREE.MeshBasicMaterial({
      color: accent, transparent: true, opacity: 0.01,
      depthWrite: false, side: THREE.DoubleSide, visible: false,
    });
    var ug = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), ugMat);
    ug.visible = false;
    ug.rotation.x = -Math.PI / 2;
    ug.position.y = 0.02;
    g.add(ug);
    g.userData.underglow = ug;
    if (isPlayer) {
      var hL = new THREE.PointLight(0xfff0d0, 2.2, 14, 2.0);
      hL.position.set(0, 0.5, 2.4);
      g.add(hL);
      g.userData.headLight = hL;
    }
    // Dual nitro exhaust flames (additive — not grey smoke)
    var flameMat = new THREE.MeshBasicMaterial({
      color: 0x66f0ff, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    var flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.85, 8, 1, true), flameMat);
    flame.rotation.x = Math.PI;
    flame.position.set(0.22, 0.32, -2.4 * sZ);
    flame.visible = false;
    g.add(flame);
    var flame2 = flame.clone();
    flame2.position.x = -0.22;
    flame2.visible = false;
    g.add(flame2);
    g.userData.nitroFlame = flame;
    g.userData.nitroFlame2 = flame2;
    g.userData.def = def;
    g.userData.procedural = true;
    g.userData.hasWeapons = true;
    if (def.id === 'needle') {
      g.userData.stabFront = true;
      g.userData.stabRear = true;
    }
    return g;
  }

  /** Per-rig combat kit â€” rockets / MG / mortar / EMP pods by id */
  function attachWeapons(g, def, isPlayer, sX, sY, sZ, M, bodyMat, accentMat, blackTrim, rimMat) {
    if (!isPlayer && def.id !== 'razorback') return;
    var id = def.id;
    // Dual side rocket pods (most rigs)
    if (id === 'marrow' || id === 'razorback' || id === 'vesper') {
      for (var ri = 0; ri < 2; ri++) {
        var sx = (ri === 0 ? -1 : 1) * 1.12 * sX;
        addMesh(g, new THREE.BoxGeometry(0.28, 0.24, 0.85), blackTrim, sx, 0.7 * sY, -1.5 * sZ);
        addMesh(g, new THREE.CylinderGeometry(0.09, 0.1, 0.95, 10), rimMat, sx, 0.7 * sY, -1.55 * sZ).rotation.x = Math.PI / 2;
        addMesh(g, new THREE.CylinderGeometry(0.1, 0.11, 0.1, 8), accentMat, sx, 0.7 * sY, -2.05 * sZ).rotation.x = Math.PI / 2;
      }
    }
    // Roof MG (brawler / armored)
    if (id === 'marrow' || id === 'mausoleum' || id === 'razorback') {
      addMesh(g, new THREE.BoxGeometry(0.5, 0.18, 0.45), blackTrim, 0, 1.38 * sY, 0.1);
      for (var gi = 0; gi < 2; gi++) {
        var gx = gi === 0 ? -0.12 : 0.12;
        addMesh(g, new THREE.CylinderGeometry(0.04, 0.05, 1.1, 8), rimMat, gx, 1.42 * sY, 0.7).rotation.x = Math.PI / 2;
      }
    }
    // Needle â€” nose spike / harpoon rail
    if (id === 'needle') {
      addMesh(g, new THREE.BoxGeometry(0.35, 0.18, 1.2), bodyMat, 0, 0.48, 2.5 * sZ);
      addMesh(g, new THREE.ConeGeometry(0.12, 0.9, 8), rimMat, 0, 0.48, 3.15 * sZ).rotation.x = -Math.PI / 2;
      addMesh(g, new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8), rimMat, 0, 1.2 * sY, 0.3).rotation.x = Math.PI / 2;
    }
    // Mausoleum â€” roof mortar tubes
    if (id === 'mausoleum') {
      for (var mi = 0; mi < 3; mi++) {
        addMesh(g, new THREE.CylinderGeometry(0.12, 0.14, 0.7, 10), blackTrim, (-0.4 + mi * 0.4) * sX, 1.45 * sY, -0.3).rotation.x = -0.4;
      }
      addMesh(g, new THREE.BoxGeometry(1.4 * sX, 0.15, 0.6), blackTrim, 0, 1.35 * sY, -0.2);
    }
    // Choir â€” side sonic cannons
    if (id === 'choir') {
      for (var ci = 0; ci < 2; ci++) {
        var cx = (ci === 0 ? -1 : 1) * 1.15 * sX;
        addMesh(g, new THREE.CylinderGeometry(0.22, 0.28, 0.5, 12), blackTrim, cx, 0.85 * sY, 0.2).rotation.z = Math.PI / 2;
        addMesh(g, new THREE.CylinderGeometry(0.18, 0.18, 0.15, 12), accentMat, cx + (ci === 0 ? -0.2 : 0.2), 0.85 * sY, 0.2).rotation.z = Math.PI / 2;
      }
      addMesh(g, new THREE.BoxGeometry(1.9 * sX, 0.9 * sY, 1.8 * sZ), bodyMat, 0, 1.15 * sY, -0.4);
    }
    // Vesper â€” slim side rails only (stealth)
    if (id === 'vesper') {
      addMesh(g, new THREE.BoxGeometry(0.12, 0.08, 2.2 * sZ), accentMat, -1.08 * sX, 0.55, 0);
      addMesh(g, new THREE.BoxGeometry(0.12, 0.08, 2.2 * sZ), accentMat, 1.08 * sX, 0.55, 0);
    }
  }

  /**
   * Game forward is +Z (yaw 0 → move +Z). Detect which way the mesh nose points
   * from part names / lights, then store faceYaw so setYaw() keeps it every frame.
   */
  function avg(arr) {
    if (!arr.length) return 0;
    var s = 0;
    for (var i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }

  function detectFaceYaw(root, defId) {
    // Absolute bake so nose points +Z (glb.js no longer pre-spins Math.PI).
    // Playtest v139: all good except Needle (was 0) → flip to π.
    var force = {
      marrow: Math.PI,
      needle: Math.PI,
      mausoleum: 0,
      vesper: 0,
      choir: Math.PI,
      razorback: Math.PI
    };
    if (Object.prototype.hasOwnProperty.call(force, defId)) return force[defId];

    root.updateMatrixWorld(true);
    var frontZ = [];
    var rearZ = [];
    var headZ = [];
    var tailZ = [];
    root.traverse(function (c) {
      if (!c.isMesh) return;
      var n = ((c.name || '') + ' ' + (c.material && c.material.name ? c.material.name : '')).toLowerCase();
      var wp = new THREE.Vector3();
      c.getWorldPosition(wp);
      var z = wp.z;
      // Explicit front markers (Sketchfab names often truncate: FrontLigh, HeadLigh…)
      if (/headlight|headligh|head_l|head_r|front.?ligh|grille|grill|hood|nose|spikef|spike_f|spikemountf|spike_mount_f|\bram\b|saw$|brow|number.?plate|license/.test(n)
          && !/tail|rear|spoiler|brake|mortar/.test(n)) {
        frontZ.push(z);
        if (/headlight|headligh|front.?ligh|head_l|head_r/.test(n)) headZ.push(z);
      }
      // Explicit rear markers — don't treat roof mortar/kit as "rear of body" alone
      if (/taillight|tailight|tail_light|tailligh|brakelight|brakeligh|brake.?ligh|rear.?ligh|stop.?ligh|spoiler|exhaust|speakerwall|speaker_wall|spiker[^a-z]|spike_r|spikemountr|rocket.?tip|trunk|boot/.test(n)
          && !/front|headlight|headligh/.test(n)) {
        rearZ.push(z);
        if (/taillight|tailligh|tailight|brakelight|brakeligh|rear.?ligh|stop/.test(n)) tailZ.push(z);
      }
      // Emissive color hints when names are garbage (Sketchfab)
      if (c.material && c.material.emissive && c.material.emissiveIntensity > 1.2) {
        var em = c.material.emissive;
        var r = em.r != null ? em.r : 0, g = em.g != null ? em.g : 0, b = em.b != null ? em.b : 0;
        if (r > 0.6 && g < 0.35 && b < 0.35) tailZ.push(z); // red stop lights
        if (r > 0.7 && g > 0.6 && b > 0.4 && c.material.emissiveIntensity > 2) headZ.push(z); // warm HL
      }
    });

    // 1) Headlights alone — MUST sit on +Z (game forward). Strongest rule.
    //    (Don't pair with tail when both are at body centroid / same Z)
    if (headZ.length) {
      return avg(headZ) < 0.05 ? Math.PI : 0;
    }
    // 2) Headlights vs taillights when clearly separated
    if (headZ.length && tailZ.length && Math.abs(avg(headZ) - avg(tailZ)) > 0.35) {
      return avg(headZ) < avg(tailZ) ? Math.PI : 0;
    }
    // 3) Any front vs rear markers when separated
    if (frontZ.length && rearZ.length && Math.abs(avg(frontZ) - avg(rearZ)) > 0.35) {
      return avg(frontZ) < avg(rearZ) ? Math.PI : 0;
    }
    // 4) Only front markers — must sit on +Z
    if (frontZ.length) return avg(frontZ) < 0.05 ? Math.PI : 0;
    // 5) Only rear / tail markers — must sit on −Z
    if (tailZ.length) return avg(tailZ) > -0.05 ? Math.PI : 0;
    if (rearZ.length) return avg(rearZ) > -0.05 ? Math.PI : 0;

    return 0;
  }

  /** @deprecated body start marker removed â€” old box stack replaced by NFS coupe above */
  function decorateGlb(root, def, isPlayer) {
    root.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(root);
    var size = box.getSize(new THREE.Vector3());
    // Scale targets — cars ~4.6–5.2m; Needle ~2.9m play scale
    var horiz = Math.max(size.x, size.z);
    var isBike = def.id === 'needle';
    var targetLen = isBike ? 2.9 : (def.id === 'mausoleum' || def.id === 'choir' || def.id === 'razorback' ? 5.0 : 4.6);
    var minOk = isBike ? 2.55 : 3.2;
    var maxOk = isBike ? 3.5 : 9;
    if (horiz > 0.01 && (horiz < minOk || horiz > maxOk)) {
      root.scale.multiplyScalar(targetLen / horiz);
      root.updateMatrixWorld(true);
      box.setFromObject(root);
      size = box.getSize(new THREE.Vector3());
    }
    // Only force axis fix if model is clearly Z-up tall (old exports)
    if (size.y > size.z * 1.35 && size.y > size.x * 1.35) {
      root.rotation.x = -Math.PI / 2;
      root.updateMatrixWorld(true);
      box.setFromObject(root);
    }
    var center = box.getCenter(new THREE.Vector3());
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= box.min.y;
    // Re-center then detect facing (baked into faceBake group later)
    root.updateMatrixWorld(true);
    var faceYaw = detectFaceYaw(root, def.id);
    root.userData.faceYaw = faceYaw;

    var env = GAME.materials.envMap && GAME.materials.envMap();
    // Matte / satin body — readable color at night without sparkle confetti
    var paintOpts = {
      emissive: 0.006,
      metalness: 0.2,
      roughness: 0.64,
      envMapIntensity: 0.5,
      clearcoat: 0.1,
      clearcoatRoughness: 0.5,
      flake: 0,
    };
    // Vesper: lift body so violet reads in night (still satin, not chrome)
    if (def.id === 'vesper') {
      paintOpts.emissive = 0.055;
      paintOpts.metalness = 0.28;
      paintOpts.roughness = 0.48;
      paintOpts.envMapIntensity = 0.85;
      paintOpts.clearcoat = 0.2;
      paintOpts.clearcoatRoughness = 0.35;
    }
    var paint = GAME.materials.carPaint
      ? GAME.materials.carPaint(def.color, paintOpts)
      : null;
    var glassPaint = GAME.materials.get().glass;
    var chromePaint = GAME.materials.get().chrome;
    var darkPaint = GAME.materials.get().darkMetal;
    var bonePaint = new THREE.MeshStandardMaterial({
      color: 0xc4b8a4, metalness: 0.12, roughness: 0.72,
      envMap: env, envMapIntensity: 0.45, emissive: 0x1a1008, emissiveIntensity: 0.04,
    });
    var metalMatte = new THREE.MeshStandardMaterial({
      color: 0x8a9098, metalness: 0.55, roughness: 0.42,
      envMap: env, envMapIntensity: 0.7,
    });
    root.traverse(function (c) {
      if (c.isMesh && c.geometry) {
        // Keep Blender smart UVs when present — only invent UV if missing
        if (!c.geometry.attributes.uv || c.userData.forceCylUV) {
          c.geometry.computeBoundingBox();
          var bb = c.geometry.boundingBox;
          var pos = c.geometry.attributes.position;
          var uvs = new Float32Array(pos.count * 2);
          var len = Math.max(0.001, bb.max.z - bb.min.z);
          for (var i = 0; i < pos.count; i++) {
            var px = pos.getX(i);
            var py = pos.getY(i);
            var pz = pos.getZ(i);
            uvs[i * 2] = Math.atan2(py, px) / (Math.PI * 2) + 0.5;
            uvs[i * 2 + 1] = (pz - bb.min.z) / len;
          }
          c.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        }
        c.geometry.computeVertexNormals();
      }
      if (c.isMesh && c.material) {
        var name = ((c.name || '') + ' ' + (c.material.name || '')).toLowerCase();
        var mat;
        // Classify parts by Blender object/material names (marrow_Body, Glass, Bone, HL…)
        if (/glass|window|windshield|windscreen|canopy/.test(name)) {
          mat = glassPaint.clone ? glassPaint.clone() : glassPaint;
        } else if (/bone|rib|spine|spinous|brow|skull/.test(name)) {
          mat = bonePaint.clone ? bonePaint.clone() : bonePaint;
        } else if (/spike|blade|barb|harpoon|lance|shaft|tip|needle_edge|needle_blade/.test(name)) {
          mat = metalMatte.clone ? metalMatte.clone() : metalMatte;
        } else if (/chrome|rim|exhaust|grille|spoke|hub|disc|gun|barrel|metal|crome/.test(name)) {
          mat = (chromePaint.clone ? chromePaint.clone() : chromePaint);
          if (mat.metalness != null) mat.metalness = Math.min(mat.metalness, 0.7);
          if (mat.roughness != null) mat.roughness = Math.max(mat.roughness || 0, 0.35);
          if (mat.envMapIntensity != null) mat.envMapIntensity = Math.min(mat.envMapIntensity || 1, 0.85);
        } else if (/wheel|tire|tyre|rubber/.test(name)) {
          mat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.95, metalness: 0.05 });
        } else if (/_tl|tail|taillight|stop/.test(name)) {
          mat = new THREE.MeshStandardMaterial({
            color: 0xff2244, emissive: 0xff1030, emissiveIntensity: 2.0, metalness: 0.25, roughness: 0.4,
          });
        } else if (/_hl|headlight|head_l|head_r|lamp|roof_l/.test(name) || /marrow_hl/.test(name)) {
          mat = new THREE.MeshStandardMaterial({
            color: 0xfff5e0, emissive: 0xffe0a0, emissiveIntensity: 2.8, metalness: 0.15, roughness: 0.35,
          });
        } else if (/dark|carbon|cabin|roof|spoiler|skirt|bumper|splitter|diffuser|wing|scoop|vent|mount/.test(name)) {
          mat = darkPaint.clone ? darkPaint.clone() : darkPaint;
          if (mat.roughness != null) mat.roughness = Math.max(mat.roughness || 0, 0.55);
          if (mat.envMapIntensity != null) mat.envMapIntensity = Math.min(mat.envMapIntensity || 1, 0.6);
        } else if (/rocket|caliper|accent|stripe|core|marrow_core/.test(name) && /rocket|caliper|accent|stripe|core/.test(name)) {
          mat = new THREE.MeshStandardMaterial({
            color: def.accent, emissive: def.accent, emissiveIntensity: 0.45,
            metalness: 0.25, roughness: 0.55, envMap: env, envMapIntensity: 0.5,
          });
        } else if (paint && (/body|paint|hood|fender|paint|shoulder|haunch|nose|deck|cowl|chassis|skinned|needle_body|marrow_body|marrow_paint/.test(name))) {
          mat = paint.clone ? paint.clone() : paint;
        } else if (paint && def.id === 'marrow') {
          mat = paint.clone ? paint.clone() : paint;
        } else if (c.material && c.material.isMaterial) {
          // Soften authored Sketchfab materials (often hyper-metal)
          mat = c.material.clone ? c.material.clone() : c.material;
          if (mat.metalness != null && mat.metalness > 0.35) mat.metalness = 0.28;
          if (mat.roughness != null && mat.roughness < 0.45) mat.roughness = 0.58;
          if (mat.envMapIntensity != null) mat.envMapIntensity = Math.min(mat.envMapIntensity || 1, 0.65);
          if (mat.clearcoat != null) { mat.clearcoat = Math.min(mat.clearcoat, 0.15); }
          if (mat.clearcoatRoughness != null) mat.clearcoatRoughness = Math.max(mat.clearcoatRoughness || 0, 0.4);
        } else {
          mat = c.material.clone();
          if (mat.color) mat.color.set(def.color);
          if (env) { mat.envMap = env; mat.envMapIntensity = 0.5; }
          mat.metalness = 0.22;
          mat.roughness = 0.62;
        }
        // Force paint on near-black body meshes
        if (mat.color && mat.color.r + mat.color.g + mat.color.b < 0.12 && paint && !/tire|rubber|dark|carbon/.test(name)) {
          mat = paint.clone ? paint.clone() : paint;
        }
        c.material = mat;
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });

    var ugMat = new THREE.MeshBasicMaterial({
      color: def.accent, transparent: true, opacity: 0.01,
      depthWrite: false, side: THREE.DoubleSide,
    });
    var ug = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), ugMat);
    ug.visible = false;
    ug.rotation.x = -Math.PI / 2;
    root.add(ug);
    root.userData.underglow = ug;
    if (isPlayer) {
      var bodyFill = new THREE.PointLight(0xe8f0ff, 2.2, 9, 1.9);
      bodyFill.position.set(0, 1.45, -0.3);
      root.add(bodyFill);
      root.userData.bodyFill = bodyFill;
      var hL2 = new THREE.PointLight(0xfff0d0, 2.2, 13, 2.0);
      hL2.position.set(0, 0.5, 2.4);
      root.add(hL2);
      root.userData.headLight = hL2;
    }

    var flameMatG = new THREE.MeshBasicMaterial({
      color: 0x66f0ff, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    var flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.8, 8, 1, true), flameMatG);
    flame.rotation.x = Math.PI;
    flame.position.set(0.22, 0.32, -2.35);
    flame.visible = false;
    root.add(flame);
    var flame2 = flame.clone();
    flame2.position.x = -0.22;
    flame2.visible = false;
    root.add(flame2);
    root.userData.nitroFlame = flame;
    root.userData.nitroFlame2 = flame2;
    root.userData.wheels = [];
    root.userData.def = def;
    // Needle stab combat flags (game.js rams use these)
    if (def.id === 'needle') {
      root.userData.stabFront = true;
      root.userData.stabRear = true;
    }

    // Bake face correction into a child group so race code can set rotation.y = yaw only
    bakeFaceYaw(root, faceYaw);
    if (typeof location !== 'undefined' && /[?&]faceAudit=1/.test(location.search)) {
      console.info('[faceAudit]', def.id, 'baked', faceYaw, 'rad');
    }
    return root;
  }

  /**
   * Permanently rotate all visual content so nose is +Z; clear faceYaw so setYaw
   * is pure race yaw (fixes reverse-drive when code assigned mesh.rotation.y = yaw).
   */
  function bakeFaceYaw(root, faceYaw) {
    faceYaw = faceYaw || 0;
    root.userData.faceYawBaked = faceYaw;
    if (Math.abs(faceYaw) < 0.0001) {
      root.userData.faceYaw = 0;
      return;
    }
    var pivot = new THREE.Group();
    pivot.name = 'faceBake';
    var kids = root.children.slice();
    for (var i = 0; i < kids.length; i++) {
      pivot.add(kids[i]);
    }
    pivot.rotation.y = faceYaw;
    root.add(pivot);
    root.userData.faceYaw = 0;
  }

  /** Extra combat kit for GLB path only — procedural already has weapons. */
  function attachCombatKit(root, def, isPlayer) {
    if (!isPlayer) return root;
    if (root.userData.hasWeapons || root.userData.procedural) return root;
    var M = GAME.materials.get();
    var gunMat = M.chrome;
    var dark = M.darkMetal;
    var needsWheels = !(root.userData.wheels && root.userData.wheels.length >= 4);
    if (needsWheels) {
      var rubber = new THREE.MeshStandardMaterial({
        color: 0x0a0a0c, roughness: 0.96, metalness: 0.02, envMap: M._envMap, envMapIntensity: 0.2,
      });
      var rim = new THREE.MeshStandardMaterial({
        color: 0xb8c0cc, metalness: 0.92, roughness: 0.18,
        envMap: M._envMap, envMapIntensity: 1.8,
      });
      var tireGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.36, 18);
      tireGeo.rotateZ(Math.PI / 2);
      var rimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.38, 14);
      rimGeo.rotateZ(Math.PI / 2);
      var wpos = [[-1.05, 0.48, 1.4], [1.05, 0.48, 1.4], [-1.05, 0.48, -1.35], [1.05, 0.48, -1.35]];
      root.userData.wheels = root.userData.wheels || [];
      for (var w = 0; w < 4; w++) {
        var tire = new THREE.Mesh(tireGeo, rubber);
        tire.position.set(wpos[w][0], wpos[w][1], wpos[w][2]);
        root.add(tire);
        var r = new THREE.Mesh(rimGeo, rim);
        r.position.copy(tire.position);
        root.add(r);
        root.userData.wheels.push(tire);
      }
    }

    // Low-profile roof MG â€” large turret box was reading as blocky toy roof in stills
    if (!root.userData.procedural) {
      var turret = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.48), dark);
      turret.position.set(0, 1.42, 0.15);
      root.add(turret);
      for (var i = 0; i < 2; i++) {
        var x = i === 0 ? -0.14 : 0.14;
        var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.05, 10), gunMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(x, 1.48, 0.75);
        root.add(barrel);
        var tip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.06, 0.1, 8),
          new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffaa33, emissiveIntensity: 2.2 })
        );
        tip.rotation.x = Math.PI / 2;
        tip.position.set(x, 1.48, 1.3);
        root.add(tip);
      }
    }
    // Side rocket tubes â€” tighter to body (less outrigger box language)
    for (var ri = 0; ri < 2; ri++) {
      var sx = ri === 0 ? -1.02 : 1.02;
      var rack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.7), dark);
      rack.position.set(sx, 0.72, -1.35);
      root.add(rack);
      var tube = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.85, 10), gunMat);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(sx, 0.72, -1.45);
      root.add(tube);
      var tipR = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.1, 0.1, 8),
        new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffaa33, emissiveIntensity: 2.0 })
      );
      tipR.rotation.x = Math.PI / 2;
      tipR.position.set(sx, 0.72, -1.9);
      root.add(tipR);
    }
    // Thin side skirts only (full armor plates hid body paint + made crate silhouette)
    for (var s = 0; s < 2; s++) {
      var side = s === 0 ? -1 : 1;
      var plate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 2.0), dark);
      plate.position.set(side * 1.05, 0.42, 0);
      root.add(plate);
    }

    // Multi-spoke rims + caliper pops (NFS still language) when wheels exist
    var spokeMat = new THREE.MeshStandardMaterial({
      color: 0xd0d8e8, metalness: 0.95, roughness: 0.12,
      envMap: M._envMap, envMapIntensity: 2.2,
    });
    var caliperMat = new THREE.MeshStandardMaterial({
      color: 0xff2d55, metalness: 0.4, roughness: 0.35, emissive: 0xff2d55, emissiveIntensity: 0.15,
    });
    var wpos2 = [[-1.05, 0.48, 1.4], [1.05, 0.48, 1.4], [-1.05, 0.48, -1.35], [1.05, 0.48, -1.35]];
    for (var wi = 0; wi < 4; wi++) {
      var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 12), spokeMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(wpos2[wi][0], wpos2[wi][1], wpos2[wi][2]);
      root.add(hub);
      for (var sp = 0; sp < 5; sp++) {
        var spoke = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.32), spokeMat);
        var ang = (sp / 5) * Math.PI * 2;
        spoke.position.set(
          wpos2[wi][0] + (wpos2[wi][0] > 0 ? 0.08 : -0.08),
          wpos2[wi][1] + Math.sin(ang) * 0.18,
          wpos2[wi][2] + Math.cos(ang) * 0.18
        );
        spoke.rotation.x = ang;
        root.add(spoke);
      }
      var cal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.16), caliperMat);
      cal.position.set(wpos2[wi][0] * 0.92, wpos2[wi][1] + 0.12, wpos2[wi][2]);
      root.add(cal);
    }

    // Paint shutlines â€” hairline only (thick boxes read as crate edges)
    var shutMat = new THREE.MeshStandardMaterial({
      color: 0x050508, metalness: 0.15, roughness: 0.9, envMap: M._envMap, envMapIntensity: 0.2,
    });
    var doorLineL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.32, 1.25), shutMat);
    doorLineL.position.set(-1.01, 0.7, 0.05);
    root.add(doorLineL);
    var doorLineR = doorLineL.clone();
    doorLineR.position.x = 1.01;
    root.add(doorLineR);
    var hoodLine = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.012, 0.014), shutMat);
    hoodLine.position.set(0, 0.96, 0.5);
    root.add(hoodLine);

    return root;
  }

  /** Apply race yaw. Face correction is baked into faceBake child (preferred). */
  function setVehicleYaw(mesh, yaw) {
    if (!mesh) return;
    // faceYaw only if not baked (legacy / procedural edge cases)
    mesh.rotation.y = yaw + (mesh.userData.faceYaw || 0);
  }

  GAME.vehicles = {
    setYaw: setVehicleYaw,

    preloadAll: function () {
      // Drop stale multiparts/old GLB clones when assets rebuild
      glbCache = {};
      if (GAME.glb.clearCache) GAME.glb.clearCache();
      var urls = GAME.config.cars.map(function (c) { return c.model; });
      if (GAME.config.models && GAME.config.models.razorback) {
        urls.push(GAME.config.models.razorback);
      }
      return Promise.all(urls.map(function (url) {
        return GAME.glb.load(url).then(function (scene) {
          if (scene) glbCache[url] = scene;
          return scene;
        });
      }));
    },

    create: function (carId, isPlayer) {
      var def = carDef(carId || 'marrow');
      if (carId === 'razorback') {
        def = {
          id: 'razorback', name: 'RAZORBACK', color: 0x39ff14, accent: 0x39ff14,
          stats: { spd: 4, arm: 2, fire: 3, hand: 3 }, mass: 0.95,
          model: GAME.config.models.razorback,
        };
      }
      var url = def.model;
      // Hero path: Blender GLB when preloaded (Marrow HQ loft). ?proc=1 forces multiparts.
      var forceProc = typeof location !== 'undefined' && /[?&]proc=1/.test(location.search);
      var template = !forceProc && glbCache[url];
      if (template) {
        var g = decorateGlb(template.clone(true), def, isPlayer);
        // Authored GLBs (Marrow, Vesper Kenney baseline, etc.) already include kit — no double stack
        g.userData.fromGlb = true;
        g.userData.theme = def.id;
        if (def.id === 'needle') {
          g.userData.stabFront = true;
          g.userData.stabRear = true;
        }
        return g;
      }
      // Fallback multiparts (or forced with ?proc=1)
      return procedural(def, isPlayer);
    },

    createAsync: function (carId, isPlayer) {
      var def = carDef(carId || 'marrow');
      var url = def.model;
      if (glbCache[url]) return Promise.resolve(GAME.vehicles.create(carId, isPlayer));
      return GAME.glb.load(url).then(function (scene) {
        if (scene) glbCache[url] = scene;
        return GAME.vehicles.create(carId, isPlayer);
      });
    },

    def: carDef,

    statsMul: function (def) {
      var s = def.stats || { spd: 3, arm: 3, fire: 3, hand: 3 };
      // Wider spread so light rigs feel fragile and heavies feel tanky
      // arm 1→~0.55 HP, arm 5→~1.4 HP; fire 1→~0.5 dmg, fire 5→~1.45 dmg
      return {
        speed: 0.72 + s.spd * 0.085,
        armor: 0.4 + s.arm * 0.2,
        fire: 0.35 + s.fire * 0.22,
        hand: 0.7 + s.hand * 0.09,
        mass: def.mass || 1,
      };
    },

    /** Stock hardpoints + per-weapon mul (null-safe). */
    weapons: function (def) {
      var w = (def && def.weapons) || {};
      return {
        mg: w.mg !== false,
        rocket: !!w.rocket,
        mine: !!w.mine,
        mgLabel: w.mgLabel || 'GUNS',
        rocketLabel: w.rocketLabel || 'ROCKET',
        mineLabel: w.mineLabel || 'MINE',
        mgDmgMul: w.mgDmgMul != null ? w.mgDmgMul : 1,
        mgRateMul: w.mgRateMul != null ? w.mgRateMul : 1,
        rocketDmgMul: w.rocketDmgMul != null ? w.rocketDmgMul : 1,
        rocketRateMul: w.rocketRateMul != null ? w.rocketRateMul : 1,
        mineDmgMul: w.mineDmgMul != null ? w.mineDmgMul : 1,
        mineRateMul: w.mineRateMul != null ? w.mineRateMul : 1,
      };
    },
  };
})();
