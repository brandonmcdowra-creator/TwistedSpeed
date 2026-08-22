/**
 * Prison freight maglev — greybox timed crossing (v405/v406).
 * Perpendicular consist, visible gap, wait or thread. Do not smash.
 * v406: slower, bigger, crawls while you're in the approach so it isn't a blink.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});

  var CROSS_T = 0.30;
  var SPEED = 7.5;
  var SPEED_NEAR = 3.6;
  var CAR_Z = 11;
  var CAR_X = 20;
  var CAR_Y = 5.6;
  var CAR_PITCH = 12.5;
  var HOLE = 34;
  var SPAN = 90;

  function wrap(u) {
    var w = SPAN * 2;
    while (u > SPAN) u -= w;
    while (u < -SPAN) u += w;
    return u;
  }

  function makeCarMat(i) {
    return new THREE.MeshBasicMaterial({
      color: i % 2 ? 0x5a4068 : 0x304050,
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
        var rail = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, SPAN * 2), railMat);
        rail.position.copy(pt).addScaledVector(tan, r * 7.4);
        rail.position.y = pt.y + 0.1;
        rail.rotation.y = yaw;
        group.add(rail);
      }
      var deck = new THREE.Mesh(
        new THREE.BoxGeometry(26, 0.08, 22),
        new THREE.MeshBasicMaterial({ color: 0xffe66d, transparent: true, opacity: 0.35 })
      );
      deck.position.copy(pt);
      deck.position.y = pt.y + 0.06;
      deck.rotation.y = Math.atan2(tan.x, tan.z);
      group.add(deck);

      var rest = [];
      var u = -62;
      var nCars = 8;
      var holeAfter = { 3: 1 };
      for (var i = 0; i < nCars; i++) {
        rest.push(u);
        u += CAR_PITCH;
        if (holeAfter[i]) u += HOLE;
      }

      var cars = [];
      var stripMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
      var gapGlowMat = new THREE.MeshBasicMaterial({
        color: 0xffe66d, transparent: true, opacity: 0.85,
      });
      for (i = 0; i < nCars; i++) {
        var body = new THREE.Mesh(new THREE.BoxGeometry(CAR_X, CAR_Y, CAR_Z), makeCarMat(i));
        var strip = new THREE.Mesh(new THREE.BoxGeometry(CAR_X * 0.92, 0.18, 0.22), stripMat);
        strip.position.y = CAR_Y * 0.28;
        body.add(strip);
        body.rotation.y = yaw;
        group.add(body);
        cars.push({ mesh: body, rest: rest[i] });
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
      var lampL = pole(-1);
      var lampR = pole(1);

      scene.add(group);
      return {
        group: group,
        cars: cars,
        pt: pt,
        side: side,
        tan: tan,
        t: t,
        u0: 0,
        lamps: [lampL, lampR],
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
      var nearXing = Math.abs((p.progress || 0) - ml.t) < 0.16;
      ml.u0 += (nearXing ? SPEED_NEAR : SPEED) * dt;
      if (ml.u0 > SPAN * 2) ml.u0 -= SPAN * 2;
      if (ml.hitCd > 0) ml.hitCd -= dt;

      var blocked = false;
      var i, car, u, pos;
      for (i = 0; i < ml.cars.length; i++) {
        car = ml.cars[i];
        u = wrap(car.rest + ml.u0);
        pos = ml.pt.clone().addScaledVector(ml.side, u);
        pos.y = ml.pt.y + CAR_Y * 0.52;
        car.mesh.position.copy(pos);
        car.u = u;
        if (Math.abs(u) < rh + 4) blocked = true;
      }

      var lampCol = blocked ? 0xff2d55 : 0x39ff14;
      var lampOp = blocked ? 0.95 : 0.7;
      for (i = 0; i < ml.lamps.length; i++) {
        if (ml.lamps[i] && ml.lamps[i].material) {
          ml.lamps[i].material.color.setHex(lampCol);
          ml.lamps[i].material.opacity = lampOp;
        }
      }

      var prog = p.progress || 0;
      var approaching = prog > ml.t - 0.18 && prog < ml.t - 0.04;
      var atXing = Math.abs(prog - ml.t) < 0.045;
      if (approaching && !ml.warned && ctx.toast) {
        ctx.toast(blocked ? 'FREIGHT AHEAD — WAIT THE GAP' : 'FREIGHT AHEAD — GAP OPEN', 2.8, 2);
        ml.warned = true;
      }
      if (atXing && !blocked && !ml.gapSaid && ctx.toast) {
        ctx.toast('GAP — GO', 1.4, 2);
        ml.gapSaid = true;
      }
      if (prog > ml.t + 0.05) {
        ml.warned = true;
        ml.gapSaid = true;
      }

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
