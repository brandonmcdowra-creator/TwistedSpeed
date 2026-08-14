/**
 * Keyboard input — held keys + one-frame edges.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});
  var keys = {};
  var edge = {};

  function norm(e) {
    var k = (e.key || '').toLowerCase();
    if (k === ' ') return 'space';
    return k;
  }

  window.addEventListener('keydown', function (e) {
    var k = norm(e);
    if (!keys[k]) edge[k] = true;
    keys[k] = true;
    if (k === 'space' || k.indexOf('arrow') === 0 || k === 'shift') e.preventDefault();
  });
  window.addEventListener('keyup', function (e) {
    keys[norm(e)] = false;
  });
  window.addEventListener('blur', function () {
    keys = {};
    edge = {};
  });

  var I = (GAME.input = {});
  I.key = function (k) { return !!keys[k]; };
  I.pressed = function (k) {
    if (edge[k]) { edge[k] = false; return true; }
    return false;
  };
  I.clearEdges = function () { edge = {}; };
  I.steer = function () {
    var s = 0;
    if (I.key('a') || I.key('arrowleft')) s -= 1;
    if (I.key('d') || I.key('arrowright')) s += 1;
    return s;
  };
  I.throttle = function () {
    return (I.key('w') || I.key('arrowup')) ? 1 : 0;
  };
  I.brake = function () {
    return (I.key('s') || I.key('arrowdown')) ? 1 : 0;
  };
  I.drift = function () {
    // Shift primary; Space also drifts (NFS muscle-memory) — nitro is Q only
    return I.key('shift') || I.key('shiftright') || I.key('space');
  };
  I.nitro = function () {
    return I.key('q') || I.key('e');
  };
})();
