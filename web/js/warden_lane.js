/**
 * Warden Lane Sweep — living Neon hazard (v434).
 * Soft lateral search cone after maglev (~38–56% progress).
 * Telegraph → bite → clear. Never walls the whole ribbon.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});

  var T0 = 0.38;
  var T1 = 0.56;
  var CYCLE = 3.2;

  function latOf(body, pt, side) {
    if (!body || !body.pos || !pt || !side) return 0;
    return (body.pos.x - pt.x) * side.x + (body.pos.z - pt.z) * side.z;
  }

  GAME.wardenLane = {
    spawn: function (scene, path, mapDef) {
      if (!scene || !path || !path.curve) return null;
      if (mapDef && mapDef.theme === 'coast') return null;

      var tMid = 0.47;
      var pt = path.curve.getPointAt(tMid);
      var tan = path.curve.getTangentAt(tMid).clone().setY(0);
      if (tan.lengthSq() < 1e-6) tan.set(0, 0, 1);
      else tan.normalize();
      var side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      var yaw = Math.atan2(tan.x, tan.z);

      var group = new THREE.Group();
      group.name = 'wardenLaneSweep';

      var warn = new THREE.Mesh(
        new THREE.RingGeometry(1.6, 3.4, 28),
        new THREE.MeshBasicMaterial({
          color: 0xffe66d,
          transparent: true,
          opacity: 0.0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        })
      );
      warn.rotation.x = -Math.PI / 2;
      group.add(warn);

      var card = new THREE.Mesh(
        new THREE.CircleGeometry(3.1, 24),
        new THREE.MeshBasicMaterial({
          color: 0xffe8a0,
          transparent: true,
          opacity: 0.12,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        })
      );
      card.rotation.x = -Math.PI / 2;
      group.add(card);

      var beam = new THREE.Mesh(
        new THREE.ConeGeometry(3.4, 11, 16, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xffe8a0,
          transparent: true,
          opacity: 0.08,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        })
      );
      beam.rotation.x = Math.PI;
      beam.position.y = 6.2;
      group.add(beam);

      group.position.copy(pt);
      group.position.y = pt.y + 0.06;
      group.rotation.y = yaw;
      scene.add(group);

      return {
        group: group,
        warn: warn,
        card: card,
        beam: beam,
        pt: pt.clone(),
        tan: tan,
        side: side,
        tMid: tMid,
        phase: 0,
        hot: false,
        hitCd: 0,
        toasted: false,
        active: false,
      };
    },

    clear: function (wl, scene) {
      if (!wl) return;
      if (wl.group && wl.group.parent) wl.group.parent.remove(wl.group);
      else if (scene && wl.group) scene.remove(wl.group);
    },

    update: function (wl, dt, ctx) {
      if (!wl || !ctx || !ctx.player) return;
      var p = ctx.player;
      var prog = p.progress || 0;
      var rh = ctx.roadHalf != null ? ctx.roadHalf : 11.5;
      var inBand = prog >= T0 && prog <= T1;
      wl.phase = (wl.phase || 0) + dt;
      if (wl.hitCd > 0) wl.hitCd -= dt;

      if (!inBand) {
        wl.active = false;
        wl.group.visible = false;
        wl.toasted = false;
        return;
      }
      wl.group.visible = true;
      wl.active = true;

      if (!wl.toasted) {
        wl.toasted = true;
        if (ctx.toast) ctx.toast('WARDEN SWEEP — CLEAR THE LANE', 2.2, 2);
        if (GAME.sfx && GAME.sfx.wardenWarn) GAME.sfx.wardenWarn();
      }

      // Slide across the ribbon; hot only on outer thirds half the cycle
      var sweep = Math.sin(wl.phase * ((Math.PI * 2) / CYCLE));
      var lat = sweep * (rh * 0.78);
      var cycle01 = (wl.phase % CYCLE) / CYCLE;
      var telegraph = cycle01 > 0.55 && cycle01 < 0.72;
      var biting = cycle01 >= 0.72 && cycle01 < 0.92;
      wl.hot = biting;

      var anchorT = wl.tMid + (prog - wl.tMid) * 0.35;
      anchorT = Math.max(T0, Math.min(T1, anchorT));
      if (ctx.path && ctx.path.curve) {
        var npt = ctx.path.curve.getPointAt(anchorT);
        var ntan = ctx.path.curve.getTangentAt(anchorT).clone().setY(0);
        if (ntan.lengthSq() > 1e-6) ntan.normalize();
        else ntan.copy(wl.tan);
        var nside = new THREE.Vector3(-ntan.z, 0, ntan.x).normalize();
        wl.pt.copy(npt);
        wl.tan.copy(ntan);
        wl.side.copy(nside);
        wl.group.position.set(
          npt.x + nside.x * lat,
          npt.y + 0.07,
          npt.z + nside.z * lat
        );
        wl.group.rotation.y = Math.atan2(ntan.x, ntan.z);
      } else {
        wl.group.position.set(
          wl.pt.x + wl.side.x * lat,
          wl.pt.y + 0.07,
          wl.pt.z + wl.side.z * lat
        );
      }

      var warnOp = telegraph ? 0.55 + 0.2 * Math.sin(wl.phase * 14) : (biting ? 0.2 : 0.05);
      var cardOp = biting ? 0.32 : (telegraph ? 0.18 : 0.1);
      var beamOp = biting ? 0.16 : 0.07;
      if (wl.warn && wl.warn.material) {
        wl.warn.material.opacity = warnOp;
        wl.warn.material.color.setHex(biting ? 0xff2d55 : 0xffe66d);
        wl.warn.scale.setScalar(biting ? 1.15 : 1);
      }
      if (wl.card && wl.card.material) {
        wl.card.material.opacity = cardOp;
        wl.card.material.color.setHex(biting ? 0xff6b6b : 0xffe8a0);
      }
      if (wl.beam && wl.beam.material) {
        wl.beam.material.opacity = beamOp;
        wl.beam.material.color.setHex(biting ? 0xff2d55 : 0xffe8a0);
      }

      if (!biting || wl.hitCd > 0) return;

      function tryHit(body, isPlayer) {
        if (!body || !body.pos || body.dead) return;
        if (Math.abs((body.progress || prog) - anchorT) > 0.035) return;
        var bLat = latOf(body, wl.pt, wl.side);
        if (Math.abs(bLat - lat) > 3.4) return;
        if (isPlayer) {
          wl.hitCd = 0.85;
          if (ctx.hurtPlayer) ctx.hurtPlayer(10, wl.group.position, 'wardenLane');
          body.speed *= 0.78;
          if (Math.abs(body.speed) < 12) body.speed = Math.sign(body.speed || 1) * 12;
          body.slip = (body.slip || 0) + (lat > 0 ? -6 : 6);
          if (ctx.toast) ctx.toast('WARDEN SWEEP', 0.85, 2);
          if (GAME.sfx && GAME.sfx.wardenWarn) GAME.sfx.wardenWarn();
        } else if (ctx.hurtRival) {
          ctx.hurtRival(body, 8);
          body.speed *= 0.85;
        }
      }

      tryHit(p, true);
      var rivals = ctx.rivals || [];
      for (var r = 0; r < rivals.length; r++) tryHit(rivals[r], false);
    },
  };
})();
