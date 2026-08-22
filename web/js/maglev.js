/**
 * Prison freight maglev — greybox timed crossing.
 * v407: real gap (full road clears), visible motion, gap scheduled ~3.5s after you arrive.
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
    return new THREE.MeshBasicMaterial({
      color: i % 2 ? 0x6a4878 : 0x3a5060,
    });
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
      var group = new THREE.Group();
      group.name = 'maglev';

      var railMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.7 });
      for (var r = -1; r <= 1; r += 2) {
        var rail = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, LOOP), railMat);
        rail.position.copy(pt).addScaledVector(tan, r * 7.4);
        rail.position.y = pt.y + 0.1;
        rail.rotation.y = yaw;
        group.add(rail);
      }
      var deckMat = new THREE.MeshBasicMaterial({ color: 0xffe66d, transparent: true, opacity: 0.4 });
      var deck = new THREE.Mesh(new THREE.BoxGeometry(26, 0.08, 22), deckMat);
      deck.position.copy(pt);
      deck.position.y = pt.y + 0.06;
      deck.rotation.y = Math.atan2(tan.x, tan.z);
      group.add(deck);

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
        body.rotation.y = yaw;
        group.add(body);
        cars.push({ mesh: body, index: i });
      }

      function pole(sign) {
        var g = new THREE.Group();
        var post = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 9.2, 0.55),
          new THREE.MeshBasicMaterial({ color: 0x2a2430 })
        );
        post.position.y = 4.6;
        g.add(post);
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
