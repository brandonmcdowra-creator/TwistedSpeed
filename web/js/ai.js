/**
 * ai.js — rival role beats (Wave 3)
 * Roles: hunter | gunner | blocker | coward
 * Rubber-band via tools/behavior — not magic +40% top speed.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});
  var ROLES = ['hunter', 'gunner', 'blocker', 'coward'];

  function assignRole(index, defId) {
    // First three pack slots always get distinct verbs so they don't clone-draft
    if (index === 0) return 'hunter';
    if (index === 1) return 'gunner';
    if (index === 2) return 'blocker';
    // Spares: light frames tend coward/hunter; tanks gunner/blocker
    if (defId === 'needle' || defId === 'vesper') {
      return index % 2 === 0 ? 'coward' : 'hunter';
    }
    if (defId === 'mausoleum') return 'blocker';
    if (defId === 'choir') return 'gunner';
    return ROLES[index % ROLES.length];
  }

  /**
   * Per-frame role intent. Mutates r lightly; returns modifiers for game loop.
   * @returns {{ laneWant, speedMul, fireMul, rocketBias, wantSideswipe, brakeCheck, flee, dropMine }}
   */
  function tickRole(r, player, dt) {
    var role = r.role || 'gunner';
    var toP = r.pos.distanceTo(player.pos);
    var progLead = (r.progress || 0) - (player.progress || 0);
    var out = {
      laneWant: r.laneOff || 0,
      speedMul: 1,
      fireMul: 1,
      rocketBias: 1,
      wantSideswipe: false,
      brakeCheck: false,
      flee: false,
      dropMine: false,
    };

    // Coward: flee under 30% HP
    if (role === 'coward' || (r.hp < r.maxHp * 0.3 && role !== 'hunter')) {
      if (r.hp < r.maxHp * 0.3) {
        out.flee = true;
        out.speedMul = 1.08;
        out.fireMul = 0.35;
        out.rocketBias = 0.2;
        // Off-line escape
        out.laneWant = (r.laneOff || 0) >= 0 ? (r.laneOff || 0) + 2.4 : (r.laneOff || 0) - 2.4;
        out.dropMine = toP < 18 && toP > 4 && Math.random() < 0.012;
        r._cowardMode = true;
      }
    }

    var pProg = player.progress || 0;
    var pAlive = (player.hp || 0) > 0 && !player.finished;
    var needFight = pAlive && pProg < 0.88;
    // v367: first-curve opening — keep pack off the apex (outer flanks only)
    var openApex = pProg < 0.14;

    function indexSign(rv) {
      return (rv.laneOff || 0) >= 0 ? 1 : -1;
    }
    function outerLane(rv, mag) {
      var s = indexSign(rv) || 1;
      return s * (mag != null ? mag : 3.8);
    }

    if (role === 'hunter' && !out.flee) {
      // Aggressive closer — prefer player's lateral, sideswipe hard
      var pLat = player._lat != null ? player._lat : 0;
      if (openApex) {
        // Don't mirror player onto center during first bend
        out.laneWant = outerLane(r, 4.0);
        out.speedMul = 1.02;
        out.wantSideswipe = false;
      } else if (progLead < 0.02) {
        out.laneWant = pLat + Math.sin((r._aiT || 0) * 2.2) * 1.4;
        out.speedMul = 1.06;
      }
      // Sideswipe when beside (wider window for combat) — off during open apex
      if (!openApex && toP < 18 && Math.abs(progLead) < 0.06) {
        out.wantSideswipe = true;
        out.laneWant = pLat + (Math.sin((r._aiT || 0) * 4) > 0 ? 2.6 : -2.6);
        out.speedMul = 1.04;
      }
      out.fireMul = 1.05;
      out.rocketBias = 0.85;
      // Presence: stay in the fight (tools, not +40% top speed)
      if (needFight && !openApex) {
        if (progLead > 0.05 || (r.progress || 0) > 0.88) {
          out.gateCamp = true;
          out.speedMul = 0.5;
          out.wantSideswipe = toP < 16;
          out.fireMul = 1.25;
          out.rocketBias = 1.15;
          out.laneWant = pLat;
        }
        if (toP > 26 || ((r.progress || 0) > 0.88 && pProg < 0.85)) {
          out.reengage = true;
        }
      }
    }

    if (role === 'gunner' && !out.flee) {
      // Outer lane shooter — stays near enough to have a cone
      var pLatG = player._lat != null ? player._lat : 0;
      out.laneWant = openApex ? outerLane(r, 4.2) : (pLatG + 3.2 * (indexSign(r) || 1));
      out.speedMul = 0.98;
      out.fireMul = 1.75;
      out.rocketBias = 1.75;
      if (needFight) {
        if (toP > 30) out.reengage = true;
        if (progLead > 0.06) out.speedMul = 0.72;
        if (toP < 28) {
          out.fireMul = 2.0;
          out.rocketBias = 1.9;
        }
      }
    }

    if (role === 'blocker' && !out.flee) {
      // Park the racing line when leading — but NOT on first-curve apex (v367)
      out.laneWant = openApex ? outerLane(r, 3.6) : 0;
      if (progLead > -0.03) {
        out.brakeCheck = !openApex && toP < 22 && (player.speed || 0) > (r.speed || 0) * 0.8;
        if (out.brakeCheck) out.speedMul = 0.55;
        else out.speedMul = openApex ? 0.95 : 0.9;
      } else {
        out.speedMul = 1.02;
      }
      out.fireMul = 0.85;
      out.rocketBias = 0.65;
      if (needFight && toP > 36) out.reengage = true;
    }

    r._aiT = (r._aiT || 0) + dt;
    // Special ready timer (weaker rival specials)
    if (r.specialCd == null) r.specialCd = 8 + Math.random() * 6;
    if (r.specialCd > 0) r.specialCd -= dt;

    return out;
  }

  /** Skip rival special toasts while player special/wreck owns the channel (v317/v397) */
  function rivalSpecialToast(ctx, text, dur) {
    if (!ctx.toast) return;
    var st = ctx.state;
    var msg = st && st.msg;
    if (msg && (st.msgT || 0) > 0.15) {
      if (/BONE HARVEST|THREAD THE VEIN|REAR VEIN|VEIN MISS|SERMON|LAST RITES|CRATER|BLACKOUT KISS|TIRE CHOIR|WRECKED|DOUBLE WRECK|TRIPLE WRECK|\bELIM\b/i.test(msg)) {
        return;
      }
    }
    // Rate-limit BONE SHOT / EMP chatter (v397 toast spam)
    var now = st && st.raceTime != null ? st.raceTime : 0;
    if (st && now - (st._lastRivalSpecToastT || -99) < 2.4) return;
    if (st) st._lastRivalSpecToastT = now;
    ctx.toast(text, dur != null ? Math.min(dur, 0.55) : 0.5, 0);
  }

  /** Weaker rival special effects — no full player kit */
  function tryRivalSpecial(ctx) {
    var r = ctx.rival;
    var p = ctx.player;
    if (!r || r.dead || (r.disabledT || 0) > 0) return false;
    if ((r.specialCd || 0) > 0) return false;
    var toP = r.pos.distanceTo(p.pos);
    if (toP > 28 || toP < 4) return false;
    var id = r.defId || (r.def && r.def.id) || '';
    r.specialCd = 14 + Math.random() * 4; // 12–18s class

    if (id === 'vesper' || r.role === 'gunner') {
      // Mini EMP — short disable
      if (toP < 22) {
        p.mgCd = Math.max(p.mgCd || 0, 1.2);
        p.rocketCd = Math.max(p.rocketCd || 0, 1.2);
        rivalSpecialToast(ctx, 'EMP HIT', 0.7);
        if (ctx.sfx && ctx.sfx.specialVesper) ctx.sfx.specialVesper();
        else if (ctx.sfx && ctx.sfx.special) ctx.sfx.special();
        if (ctx.state) ctx.state.hitFlash = Math.min(1, (ctx.state.hitFlash || 0) + 0.25);
        return true;
      }
    }
    if (id === 'choir' || r.role === 'blocker') {
      // Mini shove
      var THREE = window.THREE;
      var push = new THREE.Vector3().subVectors(p.pos, r.pos).setY(0);
      if (push.lengthSq() > 0.01) {
        push.normalize();
        p.pos.addScaledVector(push, 3.5);
        p.speed *= 0.7;
      }
      rivalSpecialToast(ctx, 'SONIC HIT', 0.6);
      if (ctx.sfx && ctx.sfx.specialChoir) ctx.sfx.specialChoir();
      return true;
    }
    if (id === 'marrow' || r.role === 'hunter') {
      // Single weak bone rocket toward player
      if (ctx.spawnRivalRocket) {
        ctx.spawnRivalRocket(r, p, 0.65);
        rivalSpecialToast(ctx, 'BONE SHOT', 0.55);
        return true;
      }
    }
    if (id === 'needle') {
      // Brief speed steal on player
      p.speed *= 0.75;
      r.speed = Math.min(r.maxSpeed * 1.05, r.speed + 5);
      rivalSpecialToast(ctx, 'HOOKED', 0.55);
      if (ctx.sfx && ctx.sfx.specialNeedle) ctx.sfx.specialNeedle();
      return true;
    }
    // Default: aggro burst
    r.aggro = Math.min(1.2, (r.aggro || 0.5) + 0.25);
    return false;
  }

  GAME.ai = {
    roles: ROLES,
    assignRole: assignRole,
    tickRole: tickRole,
    tryRivalSpecial: tryRivalSpecial,
  };
})();
