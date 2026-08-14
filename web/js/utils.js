/**
 * Shared math / helpers for Twisted Speed.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});
  var U = (GAME.utils = {});

  U.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.damp = function (a, b, lambda, dt) {
    return U.lerp(a, b, 1 - Math.exp(-lambda * dt));
  };
  U.angDiff = function (a, b) {
    var d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  U.seeded = function (n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  U.hash2 = function (i, j) {
    return U.seeded(i * 12.9898 + j * 78.233);
  };

  U.disposeObject = function (obj) {
    if (!obj) return;
    obj.traverse(function (c) {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        var mats = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach(function (m) {
          if (!m) return;
          if (m.map) m.map.dispose();
          if (m.emissiveMap) m.emissiveMap.dispose();
          m.dispose();
        });
      }
    });
  };

  U.removeAndDispose = function (scene, obj) {
    if (!obj || !scene) return;
    scene.remove(obj);
    U.disposeObject(obj);
  };

  U.forward = function (yaw, out) {
    out = out || new THREE.Vector3();
    return out.set(Math.sin(yaw), 0, Math.cos(yaw));
  };

  U.side = function (yaw, out) {
    out = out || new THREE.Vector3();
    return out.set(Math.cos(yaw), 0, -Math.sin(yaw));
  };
})();
