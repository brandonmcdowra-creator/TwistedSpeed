/**
 * Lightweight 2D helpers for HUD canvas + keyboard (3D scene uses Three.js).
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});
  var E = (GAME.engine = {});

  var keys = {}, edge = {};
  window.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    if (!keys[k]) edge[k] = true;
    keys[k] = true;
    if (k === ' ' || k.indexOf('arrow') === 0) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { keys[(e.key || '').toLowerCase()] = false; });
  E.key = function (k) { return !!keys[k]; };
  E.pressed = function (k) {
    if (edge[k]) { edge[k] = false; return true; }
    return false;
  };
  E.axis = function () {
    return {
      x: (E.key('arrowright') || E.key('d') ? 1 : 0) - (E.key('arrowleft') || E.key('a') ? 1 : 0),
      y: (E.key('arrowdown') || E.key('s') ? 1 : 0) - (E.key('arrowup') || E.key('w') ? 1 : 0),
    };
  };

  E.sfx = GAME.sfx || null;
  E.beep = function (f, d, t) { if (GAME.sfx) GAME.sfx.beep(f, d, t); };
  E.shake = function () { /* HUD can flash; 3D cam shake handled in game */ };

  var shake = 0;
  E.addShake = function (a) { shake = Math.max(shake, a || 0.15); };
  E.consumeShake = function () {
    var s = shake; shake *= 0.88; if (shake < 0.02) shake = 0; return s;
  };
})();
