/**
 * Keyboard input — held keys + one-frame edges.
 * Pointer: click edge + last CSS-pixel coords for menu hit-tests (v308).
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});
  var keys = {};
  var edge = {};
  var pointer = { x: 0, y: 0 };
  var wheelAccum = 0;

  function norm(e) {
    var k = (e.key || '').toLowerCase();
    if (k === ' ') return 'space';
    return k;
  }

  function setPointer(e) {
    pointer.x = e.clientX != null ? e.clientX : 0;
    pointer.y = e.clientY != null ? e.clientY : 0;
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
  // Primary click/tap as one-frame edge — title / map / garage (v307–v308)
  window.addEventListener('pointerdown', function (e) {
    if (e.button != null && e.button !== 0) return;
    setPointer(e);
    edge.click = true;
  }, { passive: true });
  window.addEventListener('pointermove', setPointer, { passive: true });
  // Mouse wheel steps for shop list (v310)
  window.addEventListener('wheel', function (e) {
    setPointer(e);
    // Normalize: positive = scroll down = next item
    var d = e.deltaY;
    if (e.deltaMode === 1) d *= 16; // lines
    if (e.deltaMode === 2) d *= 48; // pages
    wheelAccum += d;
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('blur', function () {
    keys = {};
    edge = {};
    wheelAccum = 0;
  });

  var I = (GAME.input = {});
  I.key = function (k) { return !!keys[k]; };
  I.pressed = function (k) {
    if (edge[k]) { edge[k] = false; return true; }
    return false;
  };
  I.clearEdges = function () { edge = {}; };
  /** Last pointer in CSS pixels (viewport). Pair with canvas getBoundingClientRect for HUD hits. */
  I.pointer = function () { return { x: pointer.x, y: pointer.y }; };
  /**
   * Consume wheel into discrete steps (±1 per notch-ish). Positive = down/next.
   * Threshold ~40px so trackpads don't fly through the list.
   */
  I.wheelSteps = function () {
    var stepPx = 40;
    var steps = 0;
    if (wheelAccum >= stepPx) {
      steps = Math.floor(wheelAccum / stepPx);
      wheelAccum -= steps * stepPx;
    } else if (wheelAccum <= -stepPx) {
      steps = Math.ceil(wheelAccum / stepPx);
      wheelAccum -= steps * stepPx;
    }
    // Cap per frame so one flick doesn't skip entire arsenal
    if (steps > 3) steps = 3;
    if (steps < -3) steps = -3;
    return steps;
  };
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
