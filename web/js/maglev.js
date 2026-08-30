/**
 * Prison freight maglev — timed crossing.
 * v407: real gap (full road clears), visible motion.
 * v412: dress the same junction (gantry, freight silhouette, wet cue, haze).
 * Hit volumes / wait-red / gap-green logic unchanged.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});

  var CROSS_T = 0.30;
  var SPEED = 12;
  var SPEED_NEAR = 8;
  var CAR_Z = 10;
  var CAR_X = 18;
  var CAR_Y = 5.4;
  var CAR_PITCH = 12;
  var N_CARS = 5;
  var GAP = 52;
  var LOOP = N_CARS * CAR_PITCH + GAP; // 112
  var WAIT = 3.4; // unused; wall duration comes from car0 at u=-6

  function mod(x, m) {
    var r = x % m;
    if (r < 0) r += m;
    return r;
  }

  function wrapHalf(x, m) {
    var r = mod(x, m);
    if (r > m * 0.5) r -= m;
    return r;
  }

  function makeCarMat(i) {
    // Dark prison-container shell (not grey candy cubes)
    return new THREE.MeshBasicMaterial({
      color: i % 2 ? 0x2a2030 : 0x1a2228,
    });
  }

  /** Shared dress geos — budget MeshBasic only, no PointLights. */
  var _geo = null;
  function geos() {
    if (_geo) return _geo;
    _geo = {
      crate: new THREE.BoxGeometry(2.2, 1.8, 2.4),
      crateSm: new THREE.BoxGeometry(1.4, 1.1, 1.5),
      rib: new THREE.BoxGeometry(CAR_X * 0.96, 0.18, 0.35),
      door: new THREE.BoxGeometry(0.35, CAR_Y * 0.72, CAR_Z * 0.88),
      gantryPost: new THREE.BoxGeometry(0.85, 11.5, 0.85),
      gantryBeam: new THREE.BoxGeometry(28, 0.7, 1.2),
      gantryStrip: new THREE.BoxGeometry(27, 0.18, 0.35),
      railDark: new THREE.BoxGeometry(0.7, 0.35, LOOP),
      railEdge: new THREE.BoxGeometry(0.22, 0.12, LOOP),
      sheen: new THREE.PlaneGeometry(22, 28),
      haze: new THREE.PlaneGeometry(40, 22),
      housing: new THREE.BoxGeometry(1.6, 1.1, 1.6),
      arm: new THREE.BoxGeometry(0.28, 0.28, 3.2),
    };
    return _geo;
  }

  function dressFreightCar(body, i) {
    var g = geos();
    var steel = new THREE.MeshBasicMaterial({ color: 0x3a4550 });
    var rust = new THREE.MeshBasicMaterial({ color: 0x5a3428 });
    var warn = new THREE.MeshBasicMaterial({ color: 0xc8a040 });
    // Top ribs
    for (var r = -1; r <= 1; r++) {
      var rib = new THREE.Mesh(g.rib, steel);
      rib.position.set(0, CAR_Y * 0.52, r * 2.6);
      body.add(rib);
    }
    // End doors (visual only — hit uses body AABB)
    var doorL = new THREE.Mesh(g.door, rust);
    doorL.position.set(-CAR_X * 0.52, 0, 0);
    body.add(doorL);
    var doorR = new THREE.Mesh(g.door, steel);
    doorR.position.set(CAR_X * 0.52, 0, 0);
    body.add(doorR);
    // Deck cargo crates
    var c1 = new THREE.Mesh(g.crate, i % 2 ? rust : warn);
    c1.position.set(-3.2, CAR_Y * 0.52 + 0.9, 0.4);
    body.add(c1);
    var c2 = new THREE.Mesh(g.crateSm, steel);
    c2.position.set(2.8, CAR_Y * 0.52 + 0.55, -0.6);
    body.add(c2);
  }

  function addJunctionDress(group, pt, tan, side, roadYaw) {
    var g = geos();
    var steel = new THREE.MeshBasicMaterial({ color: 0x2a3038 });
    var cold = new THREE.MeshBasicMaterial({
      color: 0x00e5ff, transparent: true, opacity: 0.55,
      depthWrite: false,
    });
    var amber = new THREE.MeshBasicMaterial({
      color: 0xffb347, transparent: true, opacity: 0.7,
      depthWrite: false,
    });
    var hazeMat = new THREE.MeshBasicMaterial({
      color: 0x121828, transparent: true, opacity: 0.42,
      depthWrite: false, side: THREE.DoubleSide, fog: true,
    });
    var sheenMat = new THREE.MeshBasicMaterial({
      color: 0x88b8e0, transparent: true, opacity: 0.18,
      depthWrite: false, side: THREE.DoubleSide,
    });
    var crateMatA = new THREE.MeshBasicMaterial({ color: 0x3a2a22 });
    var crateMatB = new THREE.MeshBasicMaterial({ color: 0x2a3540 });

    // Dark rails + thin cyan edge (readable motion, not neon slabs)
    for (var r = -1; r <= 1; r += 2) {
      var rail = new THREE.Mesh(g.railDark, steel);
      rail.position.copy(pt).addScaledVector(tan, r * 7.4);
      rail.position.y = pt.y + 0.18;
      rail.rotation.y = Math.atan2(side.x, side.z);
      group.add(rail);
      var edge = new THREE.Mesh(g.railEdge, cold);
      edge.position.copy(rail.position);
      edge.position.y += 0.22;
      edge.rotation.y = rail.rotation.y;
      group.add(edge);
    }

    // Gantry portal over the road (posts clear of asphalt)
    var gantry = new THREE.Group();
    gantry.name = 'maglevGantry';
    for (var s = -1; s <= 1; s += 2) {
      var post = new THREE.Mesh(g.gantryPost, steel);
      post.position.set(s * 14.5, 5.75, 0);
      gantry.add(post);
    }
    var beam = new THREE.Mesh(g.gantryBeam, steel);
    beam.position.set(0, 11.2, 0);
    gantry.add(beam);
    var strip = new THREE.Mesh(g.gantryStrip, amber);
    strip.position.set(0, 10.7, 0.55);
    gantry.add(strip);
    gantry.position.copy(pt);
    gantry.position.y = pt.y;
    gantry.rotation.y = roadYaw;
    group.add(gantry);

    // Static cargo stacks off-road (never in block radius)
    var offsets = [
      { u: 38, lat: -1, stack: 2 },
      { u: 42, lat: 1, stack: 3 },
      { u: -36, lat: -1, stack: 2 },
      { u: -40, lat: 1, stack: 2 },
      { u: 48, lat: -1, stack: 1 },
      { u: -48, lat: 1, stack: 1 },
    ];
    for (var i = 0; i < offsets.length; i++) {
      var o = offsets[i];
      for (var k = 0; k < o.stack; k++) {
        var crate = new THREE.Mesh(g.crate, (i + k) % 2 ? crateMatA : crateMatB);
        crate.position.copy(pt)
          .addScaledVector(side, o.u)
          .addScaledVector(tan, o.lat * 11.5);
        crate.position.y = pt.y + 0.9 + k * 1.85;
        crate.rotation.y = roadYaw + (i % 2 ? 0.2 : -0.15);
        group.add(crate);
      }
    }

    // Local wet asphalt sheen at crossing
    var sheen = new THREE.Mesh(g.sheen, sheenMat);
    sheen.rotation.x = -Math.PI / 2;
    sheen.position.copy(pt);
    sheen.position.y = pt.y + 0.04;
    sheen.rotation.z = -roadYaw;
    group.add(sheen);

    // Haze cards behind flanks
    for (var h = -1; h <= 1; h += 2) {
      var haze = new THREE.Mesh(g.haze, hazeMat);
      haze.position.copy(pt).addScaledVector(tan, h * 18);
      haze.position.y = pt.y + 8;
      haze.rotation.y = roadYaw + Math.PI / 2;
      group.add(haze);
    }
  }

  GAME.maglev = {
    spawn: function (scene, path, mapDef) {
      if (!scene || !path || !path.curve) return null;
      if (mapDef && mapDef.theme === 'coast') return null;
      var t = CROSS_T;
      var pt = path.curve.getPointAt(t);
      var tan = path.curve.getTangentAt(t).clone().setY(0).normalize();
      if (tan.lengthSq() < 0.01) tan.set(0, 0, 1);
      var side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      var yaw = Math.atan2(side.x, side.z);
      var roadYaw = Math.atan2(tan.x, tan.z);
      var group = new THREE.Group();
      group.name = 'maglev';

      // Deck telegraph (color driven by update — keep big & readable)
      var deckMat = new THREE.MeshBasicMaterial({ color: 0xffe66d, transparent: true, opacity: 0.4 });
      var deck = new THREE.Mesh(new THREE.BoxGeometry(26, 0.08, 22), deckMat);
      deck.position.copy(pt);
      deck.position.y = pt.y + 0.06;
      deck.rotation.y = roadYaw;
      group.add(deck);

      addJunctionDress(group, pt, tan, side, roadYaw);

      var cars = [];
      var stripMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
      var gapGlowMat = new THREE.MeshBasicMaterial({
        color: 0xffe66d, transparent: true, opacity: 0.9,
      });
      for (var i = 0; i < N_CARS; i++) {
        var body = new THREE.Mesh(new THREE.BoxGeometry(CAR_X, CAR_Y, CAR_Z), makeCarMat(i));
        var strip = new THREE.Mesh(new THREE.BoxGeometry(CAR_X * 0.92, 0.22, 0.28), stripMat);
        strip.position.y = CAR_Y * 0.28;
        body.add(strip);
        dressFreightCar(body, i);
        body.rotation.y = yaw;
        group.add(body);
        cars.push({ mesh: body, index: i });
      }

      function pole(sign) {
        var g = new THREE.Group();
        var geo = geos();
        var post = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 9.2, 0.55),
          new THREE.MeshBasicMaterial({ color: 0x2a2430 })
        );
        post.position.y = 4.6;
        g.add(post);
        // Signal housing + arm (dress); sphere stays the state color
        var housing = new THREE.Mesh(geo.housing, new THREE.MeshBasicMaterial({ color: 0x1a1820 }));
        housing.position.y = 8.6;
        g.add(housing);
        var arm = new THREE.Mesh(geo.arm, new THREE.MeshBasicMaterial({ color: 0x3a3540 }));
        arm.position.set(sign * 1.4, 8.4, 0);
        g.add(arm);
        var lamp = new THREE.Mesh(new THREE.SphereGeometry(1.15, 10, 8), gapGlowMat.clone());
        lamp.position.y = 9.2;
        g.add(lamp);
        g.position.copy(pt).addScaledVector(side, sign * 22);
        g.position.y = pt.y;
        group.add(g);
        return lamp;
      }

      scene.add(group);
      return {
        group: group,
        cars: cars,
        deck: deck,
        pt: pt,
        side: side,
        tan: tan,
        t: t,
        phase: 0,
        lamps: [pole(-1), pole(1)],
        synced: false,
        mode: 'run',
        modeT: 0,
        warned: false,
        gapSaid: false,
        hitCd: 0,
      };
    },

    clear: function (ml, scene) {
      if (!ml) return;
      if (ml.group && ml.group.parent) ml.group.parent.remove(ml.group);
      else if (scene && ml.group) scene.remove(ml.group);
    },

    update: function (ml, dt, ctx) {
      if (!ml || !ctx || !ctx.player) return;
      var p = ctx.player;
      var rh = (ctx.roadHalf != null ? ctx.roadHalf : 11.5);
      var prog = p.progress || 0;
      var approaching = prog > ml.t - 0.08 && prog < ml.t + 0.06;
      var spd = SPEED;
      if (approaching && !ml.synced) {
        ml.synced = true;
        ml.mode = 'wall';
        ml.phase = 0;
        if (ctx.toast) ctx.toast('FREIGHT AHEAD — WAIT THE GAP', 2.8, 2);
        ml.warned = true;
      }
      if (ml.mode === 'wall') {
        ml.phase = mod(ml.phase + 8 * dt, CAR_PITCH);
        if (prog > ml.t - 0.028) {
          ml.mode = 'gap';
          ml.phase = 40;
          if (ctx.toast) ctx.toast('GAP — GO', 1.8, 2);
          ml.gapSaid = true;
        }
      } else if (ml.mode === 'gap') {
        ml.phase = 40;
        if (prog > ml.t + 0.05) ml.mode = 'run';
      } else {
        ml.phase = mod(ml.phase + SPEED * dt, LOOP);
      }
      if (ml.hitCd > 0) ml.hitCd -= dt;

      var blocked = false;
      var i, car, u;
      var blockR = rh + CAR_Z * 0.5 + 1.5;
      for (i = 0; i < ml.cars.length; i++) {
        car = ml.cars[i];
        u = wrapHalf(ml.phase + i * CAR_PITCH, LOOP);
        car.u = u;
        car.mesh.position.copy(ml.pt).addScaledVector(ml.side, u);
        car.mesh.position.y = ml.pt.y + CAR_Y * 0.52;
        if (Math.abs(u) < blockR) blocked = true;
      }

      var lampCol = blocked ? 0xff2d55 : 0x39ff14;
      for (i = 0; i < ml.lamps.length; i++) {
        if (ml.lamps[i] && ml.lamps[i].material) {
          ml.lamps[i].material.color.setHex(lampCol);
        }
      }
      if (ml.deck && ml.deck.material) {
        ml.deck.material.color.setHex(blocked ? 0xff2d55 : 0x39ff14);
        ml.deck.material.opacity = blocked ? 0.5 : 0.35;
      }

      var atXing = Math.abs(prog - ml.t) < 0.05;

      function hitBody(body, isPlayer) {
        if (!body || !body.pos || body.dead) return;
        var relx = body.pos.x - ml.pt.x;
        var relz = body.pos.z - ml.pt.z;
        var along = relx * ml.tan.x + relz * ml.tan.z;
        var across = relx * ml.side.x + relz * ml.side.z;
        if (Math.abs(along) > CAR_X * 0.55 + 3) return;
        for (var c = 0; c < ml.cars.length; c++) {
          car = ml.cars[c];
          if (Math.abs(across - car.u) > CAR_Z * 0.55 + 1.2) continue;
          if (isPlayer && ml.hitCd > 0) return;
          if (isPlayer) {
            ml.hitCd = 0.55;
            if (ctx.hurtPlayer) ctx.hurtPlayer(28, car.mesh.position, 'maglev');
            if (ctx.toast) ctx.toast('FREIGHT HIT', 0.9, 2);
            body.speed *= 0.35;
          } else if (ctx.hurtRival) {
            ctx.hurtRival(body, 22);
            body.speed *= 0.4;
          }
          return;
        }
      }
      hitBody(p, true);
      var rivals = ctx.rivals || [];
      for (i = 0; i < rivals.length; i++) hitBody(rivals[i], false);
    },
  };
})();
