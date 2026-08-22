/**
 * Night city world builder — dense neon canyon streets, industrial, highway.
 * Materials shared; geometry instanced where possible. No z-fighting (layer offsets).
 */
(function (G) {
  'use strict';
  var City = G.city = {};

  function mulberry32(a) {
    return function () {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  City.buildPath = function (THREE) {
    var pts = [];
    function a(x, y, z) { pts.push(new THREE.Vector3(x, y, z)); }
    // Long closed-ish urban circuit (meters)
    a(0, 0, 0); a(0, 0, -80); a(40, 0, -160); a(120, 0, -220);
    a(220, 0, -240); a(320, 0, -200); a(380, 0, -100); a(400, 0, 20);
    a(360, 0, 140); a(280, 0, 220); a(160, 0, 260); a(40, 0, 240);
    a(-60, 0, 180); a(-100, 0, 80); a(-80, 0, -20); a(-30, 0, -60); a(0, 0, 0);
    return pts;
  };

  City.samplePath = function (pts, t, outPos, outTan) {
    // t in [0,1] along polyline
    var lens = [0], total = 0;
    for (var i = 1; i < pts.length; i++) {
      total += pts[i].distanceTo(pts[i - 1]);
      lens.push(total);
    }
    if (total < 1e-3) {
      outPos.copy(pts[0]); outTan.set(0, 0, -1); return total;
    }
    var d = ((t % 1) + 1) % 1 * total;
    var j = 1;
    while (j < lens.length && lens[j] < d) j++;
    j = Math.min(j, pts.length - 1);
    var seg0 = lens[j - 1], seg1 = lens[j];
    var u = (d - seg0) / Math.max(1e-4, seg1 - seg0);
    outPos.lerpVectors(pts[j - 1], pts[j], u);
    outTan.subVectors(pts[j], pts[j - 1]).normalize();
    if (outTan.lengthSq() < 1e-6) outTan.set(0, 0, -1);
    return total;
  };

  City.build = function (THREE, scene, pathPts) {
    var group = new THREE.Group();
    group.name = 'CityWorld';
    scene.add(group);

    var mats = {
      asphalt: G.shaders.wetAsphalt(THREE),
      curb: new THREE.MeshStandardMaterial({ color: 0x2a2c34, metalness: 0.25, roughness: 0.55 }),
      sidewalk: new THREE.MeshStandardMaterial({ color: 0x1e1f26, metalness: 0.15, roughness: 0.7 }),
      buildA: new THREE.MeshStandardMaterial({ color: 0x1a1c24, metalness: 0.35, roughness: 0.55 }),
      buildB: new THREE.MeshStandardMaterial({ color: 0x221c1c, metalness: 0.3, roughness: 0.6 }),
      buildC: new THREE.MeshStandardMaterial({ color: 0x161a22, metalness: 0.4, roughness: 0.45 }),
      glassWin: G.shaders.emissive(THREE, 0xffb06a, 1.4),
      glassCool: G.shaders.emissive(THREE, 0x6ab0ff, 1.2),
      neonPink: G.shaders.emissive(THREE, 0xff2d6a, 3.2),
      neonCyan: G.shaders.emissive(THREE, 0x3de0ff, 3.0),
      neonAmber: G.shaders.emissive(THREE, 0xffb347, 2.8),
      sodium: G.shaders.emissive(THREE, 0xffa040, 2.0)
    };

    var roadHalf = 9.5;
    var step = 6.5;
    var totalLen = 0;
    for (var i = 1; i < pathPts.length; i++) totalLen += pathPts[i].distanceTo(pathPts[i - 1]);
    var nSeg = Math.max(8, Math.ceil(totalLen / step));
    var pos = new THREE.Vector3(), tan = new THREE.Vector3(), right = new THREE.Vector3();
    var up = new THREE.Vector3(0, 1, 0);
    var rnd = mulberry32(42);

    // Shared geometries
    var roadGeo = new THREE.BoxGeometry(1, 1, 1);
    var winGeo = new THREE.BoxGeometry(1, 1, 1);
    var cylGeo = new THREE.CylinderGeometry(0.08, 0.1, 1, 8);

    for (var s = 0; s < nSeg; s++) {
      var t0 = s / nSeg, t1 = (s + 1) / nSeg;
      var mid = (t0 + t1) * 0.5;
      City.samplePath(pathPts, mid, pos, tan);
      right.crossVectors(up, tan).normalize();
      var segLen = Math.max(1.2, totalLen / nSeg + 0.4);

      // Road slab — slight Y offset by segment to kill z-fight with curb
      var road = new THREE.Mesh(roadGeo, mats.asphalt);
      road.position.copy(pos);
      road.position.y = -0.12 + (s % 3) * 0.0004;
      road.scale.set(roadHalf * 2, 0.28, segLen + 0.15);
      road.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
      road.receiveShadow = true;
      group.add(road);

      // Lane dash
      if (s % 2 === 0) {
        var dash = new THREE.Mesh(roadGeo, mats.neonAmber);
        dash.position.copy(pos).addScaledVector(up, 0.03);
        dash.scale.set(0.14, 0.02, 2.0);
        dash.quaternion.copy(road.quaternion);
        group.add(dash);
      }

      // Curbs / sidewalks (visual)
      for (var side = -1; side <= 1; side += 2) {
        var curb = new THREE.Mesh(roadGeo, mats.curb);
        curb.position.copy(pos).addScaledVector(right, side * (roadHalf - 0.15));
        curb.position.y = 0.05;
        curb.scale.set(0.35, 0.22, segLen);
        curb.quaternion.copy(road.quaternion);
        group.add(curb);

        var walk = new THREE.Mesh(roadGeo, mats.sidewalk);
        walk.position.copy(pos).addScaledVector(right, side * (roadHalf + 2.2));
        walk.position.y = -0.05;
        walk.scale.set(3.6, 0.18, segLen);
        walk.quaternion.copy(road.quaternion);
        group.add(walk);
      }

      // Buildings both sides
      if (s % 1 === 0) {
        for (var side = -1; side <= 1; side += 2) {
          var bh = 18 + rnd() * 42;
          var bw = 8 + rnd() * 10;
          var bd = 10 + rnd() * 12;
          var dist = roadHalf + 9 + rnd() * 10;
          var bmat = [mats.buildA, mats.buildB, mats.buildC][(s + (side > 0 ? 1 : 0)) % 3];
          var bpos = pos.clone().addScaledVector(right, side * dist).addScaledVector(up, bh * 0.5);
          var building = new THREE.Mesh(roadGeo, bmat);
          building.position.copy(bpos);
          building.scale.set(bw, bh, bd);
          building.quaternion.copy(road.quaternion);
          building.castShadow = true;
          building.receiveShadow = true;
          group.add(building);

          // Window grid — sparse emissive
          var floors = Math.max(3, Math.floor(bh / 3.2));
          var cols = Math.max(2, Math.floor(bd / 2.6));
          for (var f = 0; f < floors; f++) {
            for (var c = 0; c < cols; c++) {
              if (rnd() < 0.32) continue;
              var win = new THREE.Mesh(winGeo, rnd() > 0.7 ? mats.glassCool : mats.glassWin);
              var fy = -bh * 0.5 + 1.2 + f * (bh / floors);
              var fz = -bd * 0.35 + c * (bd * 0.7 / Math.max(1, cols - 1));
              win.position.copy(bpos).addScaledVector(right, side * (bw * 0.51)).addScaledVector(up, fy).addScaledVector(tan, fz);
              win.scale.set(0.08, bh / floors * 0.4, bd / cols * 0.32);
              win.quaternion.copy(road.quaternion);
              group.add(win);
            }
          }

          // Neon strip on tall towers
          if (bh > 28 && rnd() > 0.4) {
            var neon = new THREE.Mesh(roadGeo, [mats.neonPink, mats.neonCyan, mats.neonAmber][s % 3]);
            neon.position.copy(bpos).addScaledVector(right, side * (bw * 0.52)).addScaledVector(up, bh * 0.1);
            neon.scale.set(0.14, bh * 0.5, bd * 0.65);
            neon.quaternion.copy(road.quaternion);
            group.add(neon);
          }
        }
      }

      // Street lamps
      if (s % 2 === 0) {
        for (var side = -1; side <= 1; side += 2) {
          var pole = new THREE.Mesh(cylGeo, mats.curb);
          pole.position.copy(pos).addScaledVector(right, side * (roadHalf + 3.2));
          pole.position.y = 3.2;
          pole.scale.set(1, 6.4, 1);
          group.add(pole);
          var bulb = new THREE.Mesh(winGeo, mats.sodium);
          bulb.position.copy(pole.position);
          bulb.position.y = 6.4;
          bulb.scale.set(0.35, 0.2, 0.55);
          group.add(bulb);
          if (s % 4 === 0) {
            var light = new THREE.PointLight(0xffa040, 1.6, 28, 2);
            light.position.copy(bulb.position);
            light.castShadow = false;
            group.add(light);
          }
        }
      }
    }

    // Ground plane far field (slightly below road)
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(2400, 2400),
      new THREE.MeshStandardMaterial({ color: 0x08090c, metalness: 0.1, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.4;
    ground.receiveShadow = true;
    group.add(ground);

    // Ambient traffic lights (billboards)
    for (var b = 0; b < 12; b++) {
      City.samplePath(pathPts, (b + 0.5) / 12, pos, tan);
      right.crossVectors(up, tan).normalize();
      var side = b % 2 === 0 ? -1 : 1;
      var board = new THREE.Mesh(roadGeo, [mats.neonPink, mats.neonCyan, mats.neonAmber][b % 3]);
      board.position.copy(pos).addScaledVector(right, side * (roadHalf + 12)).addScaledVector(up, 11);
      board.scale.set(8, 4.2, 0.35);
      board.lookAt(pos.clone().add(up.clone().multiplyScalar(11)));
      group.add(board);
      var pl = new THREE.PointLight(board.material.color, 4.5, 36, 2);
      pl.position.copy(board.position);
      group.add(pl);
    }

    return {
      group: group,
      pathPts: pathPts,
      roadHalf: roadHalf,
      totalLength: totalLen,
      mats: mats
    };
  };
})(window.GAME = window.GAME || {});
