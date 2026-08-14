/**
 * engine.js — the reusable, genre-neutral core. You KEEP this; you build in game.js.
 * Fixed-timestep loop, input, an asset loader that NEVER renders nothing, WebAudio SFX,
 * and screenshake. drawSprite() draws a colored box when art is missing, so a
 * not-yet-generated asset can never produce a blank screen. (Canvas shells only.)
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});
  var E = (GAME.engine = {});

  // ---------- Input ----------
  // keys = held; edge = one-shot press queue (survives keydown+keyup before the next frame)
  var keys = {}, edge = {};
  window.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    if (!keys[k]) edge[k] = true;
    keys[k] = true;
    // prevent page scroll on arrows/space during play
    if (k === ' ' || k.indexOf('arrow') === 0) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { keys[(e.key || '').toLowerCase()] = false; });
  E.key = function (k) { return !!keys[k]; };
  E.axis = function () {
    return {
      x: (E.key('arrowright') || E.key('d') ? 1 : 0) - (E.key('arrowleft') || E.key('a') ? 1 : 0),
      y: (E.key('arrowdown') || E.key('s') ? 1 : 0) - (E.key('arrowup') || E.key('w') ? 1 : 0),
    };
  };
  E.pressed = function (k) {
    if (edge[k]) { edge[k] = false; return true; }
    return false;
  };

  // ---------- Assets (placeholder fallback = never render nothing) ----------
  var images = {};
  E.loadImage = function (name, src) {
    var img = new Image();
    img.onload = function () { images[name] = img; };
    img.onerror = function () { images[name] = null; };
    img.src = src;
  };
  E.hasImage = function (name) { return !!images[name]; };
  E.drawSprite = function (ctx, name, x, y, w, h, color, label) {
    var img = images[name];
    if (img) { ctx.drawImage(img, x, y, w, h); return; }
    ctx.fillStyle = color || '#8899aa';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (label) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.font = '8px monospace'; ctx.fillText(String(label), x + 2, y + 9); }
  };

  // ---------- SFX (synthesized — audio works with zero files; see FI-AUDIO.md) ----------
  // The vocabulary + autoplay unlock live in js/sfx.js (GAME.sfx): presets
  // click/confirm/deny/hit/pickup/hurt/win/lose, primitives beep/sweep/noise/
  // thump/jingle. E.sfx is a shortcut; E.beep stays for back-compat.
  E.sfx = GAME.sfx || null;
  E.beep = function (freq, dur, type) { if (GAME.sfx) GAME.sfx.beep(freq, dur, type); };

  // ---------- Screenshake ----------
  var shake = 0;
  E.shake = function (amt) { shake = Math.max(shake, amt || 4); };
  function shakeOffset() {
    if (shake <= 0) return { x: 0, y: 0 };
    shake *= 0.85; if (shake < 0.3) shake = 0;
    return { x: (Math.random() * 2 - 1) * shake, y: (Math.random() * 2 - 1) * shake };
  }

  // ---------- Fixed-timestep loop ----------
  E.run = function (update, render) {
    var canvas = document.getElementById('game');
    var ctx = canvas.getContext('2d');
    var cfg = GAME.config;
    canvas.width = cfg.width; canvas.height = cfg.height;
    canvas.style.width = cfg.width * cfg.scale + 'px';
    canvas.style.height = cfg.height * cfg.scale + 'px';
    ctx.imageSmoothingEnabled = false;
    var FIXED = 1000 / 60, acc = 0, last = performance.now();
    function frame(now) {
      var elapsed = Math.min(now - last, 250);
      last = now; acc += elapsed;
      while (acc >= FIXED) { update(FIXED / 1000); acc -= FIXED; }
      var o = shakeOffset();
      ctx.save();
      ctx.translate(Math.round(o.x), Math.round(o.y));
      render(ctx);
      ctx.restore();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };
})();
