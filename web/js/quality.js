/**
 * quality.js — LOW / HIGH toggle (Wave 9)
 * Persist via meta.quality on saveKey. Apply at boot + mid-garage.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});

  function apply(level, ctx) {
    var q = (level === 'low') ? 'low' : 'high';
    var renderer = ctx.renderer || GAME.renderer;
    var postfx = ctx.postfx || GAME.postfx;
    var particles = ctx.particles || (GAME.state && GAME.state.particles);
    var world = ctx.world || (GAME.state && GAME.state.world);

    if (renderer) {
      var dpr = q === 'low'
        ? Math.min(window.devicePixelRatio || 1, 0.7)
        : Math.min(window.devicePixelRatio || 1, 0.78); // v391: after cards 19 FOV mass
      renderer.setPixelRatio(dpr);
    }
    if (postfx) {
      if (q === 'low') {
        postfx.enabled = true;
        postfx.mipCount = 0;
        postfx.internalScale = 0.4;
        if (postfx.setGrade) {
          postfx.setGrade({
            bloomStrength: 0.02,
            grain: 0.02,
            chromatic: 0,
            vignette: 0.22,
          });
        }
        // Soft-disable bloom path
        if (postfx.composeMat && postfx.composeMat.uniforms && postfx.composeMat.uniforms.bloomStrength) {
          postfx.composeMat.uniforms.bloomStrength.value = 0.02;
        }
      } else {
        postfx.enabled = true;
        postfx.mipCount = 0; // v376: bloom mips were FPS tax; single-pass grade
        postfx.internalScale = 0.32; // v391: cards/peeks FOV tax
        var baseG = (GAME.config && GAME.config.grade) || {};
        if (postfx.setGrade) {
          postfx.setGrade({
            bloomStrength: baseG.bloomStrength != null ? baseG.bloomStrength : 0.18,
            grain: baseG.grain != null ? baseG.grain : 0.03,
            chromatic: baseG.chromatic != null ? baseG.chromatic : 0.0015,
            vignette: baseG.vignette != null ? baseG.vignette : 0.28,
          });
        }
      }
      if (postfx.setSize && renderer) {
        var el = renderer.domElement;
        postfx.setSize(el.clientWidth || window.innerWidth, el.clientHeight || window.innerHeight);
      }
    }
    if (particles) {
      if (q === 'low') {
        if (particles.rainStop) particles.rainStop();
        particles._qualityNoRain = true;
      } else {
        particles._qualityNoRain = false;
      }
    }
    if (world && world.setDensity) {
      world.setDensity(q === 'low' ? 'medium' : 'full');
    } else if (world) {
      world._qualityLow = q === 'low';
    }
    GAME.qualityLevel = q;
    return q;
  }

  function toggle(ctx) {
    var cur = GAME.qualityLevel || 'high';
    return apply(cur === 'high' ? 'low' : 'high', ctx || {});
  }

  // ?perf=1 — log renderer.info + dt every 2s
  function startPerfLog(renderer, getDt) {
    if (typeof location === 'undefined' || !/[?&]perf=1/.test(location.search)) return;
    if (GAME._perfTimer) return;
    GAME._perfTimer = setInterval(function () {
      try {
        var info = renderer && renderer.info && renderer.info.render;
        var dt = getDt ? getDt() : 0;
        console.log('[perf]', {
          fps: dt > 0 ? Math.round(1 / dt) : null,
          dt: Math.round(dt * 1000) / 1000,
          calls: info && info.calls,
          triangles: info && info.triangles,
          quality: GAME.qualityLevel || 'high',
        });
      } catch (e) {}
    }, 2000);
  }

  GAME.quality = {
    apply: apply,
    toggle: toggle,
    startPerfLog: startPerfLog,
  };
})();
