/**
 * Twisted Speed — WORLD (clean foundation + roadside dress)
 *
 * v200: scorched earth — clear asphalt ribbon only
 * v210: intentional roadside dress with SACRED SETBACK rules
 * v247: perf kill (few PointLights, MeshBasic scenery, shared geos)
 * v248: dense scenery AGAIN under the cheap rules (see below)
 *
 * ── Scenery + performance contract ──────────────────────────────────
 * DO:
 *  · MeshBasic + bright/neon colors (fake lighting — free at night)
 *  · Additive glow discs/strips instead of PointLights
 *  · Shared geometries (scale along path) + LOD hide far
 *  · Density near the ribbon; cards for far skyline
 * DON'T reintroduce:
 *  · Dozens of PointLights (each multiplies cost on any Standard mesh)
 *  · MeshStandard on every prop (save Standard for hero car only)
 *  · 6–12 meshes per sidewalk slab
 *  · Full-screen FBM sky / half-float 3-mip post at 100% res
 *
 * Sacred setback: nearest solid face = roadHalf + edgeClear + halfDepth.
 * Path-aligned placement only (no world-axis boxes cutting curves).
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});
  var U, C, M;

  /**
   * Sacred clearances (metres from asphalt edge → inner face of prop).
   * Asphalt spans [-roadHalf, +roadHalf]. Nothing solid inside.
   */
  var EDGE = {
    curb: 0.2,
    sidewalk: 0.6,
    lamp: 2.4,
    furniture: 2.8,
    frontage: 4.0,   // shop face
    tower: 7.0,      // mid-rise face
    billboard: 10.0,
    farSkyline: 55.0,
  };

  /**
   * Single clean point-to-point highway.
   * Wide sweeps, no self-overlap, ~2.2 km arcade length.
   * v328: first corner FLAT (y≈0 through ~0.14), then soft climb ≤26m — no 50m kink.
   */
  function buildPath() {
    var pts = [];
    function add(x, y, z) { pts.push(new THREE.Vector3(x, y, z)); }

    // v409: gentle highway hills (~7 m), not the 25 m faceted climb.
    // First corner + maglev (~0.30) stay flat. Then roll, dip, roll, home.
    add(0, 0, 0);
    add(0, 0, -180);
    add(0, 0, -360);
    add(10, 0, -500);
    add(50, 0, -620);
    add(130, 0, -720);
    add(250, 0, -780);
    add(340, 0, -795);
    add(400, 0, -800);
    add(460, 0, -795);   // maglev plateau
    add(510, 0.4, -785);
    add(560, 1.0, -765);
    add(610, 1.8, -720);
    add(660, 2.8, -660);
    add(700, 3.8, -600);
    add(730, 4.8, -540);
    add(755, 5.6, -480);
    add(775, 6.4, -420);
    add(790, 7.0, -340);  // crest 1
    add(800, 6.6, -260);
    add(800, 5.8, -180);
    add(795, 4.6, -100);
    add(790, 3.4, -20);
    add(680, 2.4, 140);
    add(560, 1.8, 260);   // dip
    add(480, 2.0, 290);
    add(400, 2.6, 320);
    add(330, 3.4, 360);
    add(260, 4.2, 400);
    add(210, 5.0, 470);
    add(170, 5.6, 540);
    add(160, 6.0, 610);   // crest 2
    add(175, 5.6, 680);
    add(240, 4.8, 740);
    add(300, 4.0, 800);
    add(380, 3.2, 840);
    add(460, 2.4, 880);
    add(540, 1.8, 900);
    add(620, 1.4, 900);
    add(700, 1.0, 870);
    add(780, 0.7, 840);
    add(900, 0.4, 720);
    add(960, 0.2, 560);
    add(990, 0.1, 380);
    add(1005, 0, 180);
    add(1010, 0, 0);

    // Low tension = highway-smooth; denser samples keep nearestOnPath honest
    var curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.06);
    var pathLen = curve.getLength();
    var nSamples = Math.max(320, Math.min(440, Math.floor(pathLen / 5.5)));
    var dense = curve.getSpacedPoints(nSamples);
    return {
      curve: curve,
      points: dense,
      raw: pts,
      theme: 'city',
      closed: false,
      length: pathLen,
    };
  }

  /**
   * THE REACH — coastal dusk. Longer straights, gentler Y, wide horizon.
   * Not a neon canyon clone.
   */
  function buildPathCoast() {
    var pts = [];
    function add(x, y, z) { pts.push(new THREE.Vector3(x, y, z)); }

    add(0, 0, 0);
    add(0, 0, -200);
    add(0, 0, -420);
    add(40, 0, -620);   // soft right, flat
    add(160, 1, -780);
    add(340, 2, -880);
    add(560, 4, -900);
    add(760, 6, -820);
    add(900, 8, -640);
    add(960, 6, -420);
    add(940, 4, -200);
    add(820, 3, -20);
    add(640, 5, 120);
    add(440, 8, 200);
    add(260, 10, 320);
    add(160, 8, 480);
    add(180, 6, 660);
    add(320, 4, 820);
    add(520, 3, 920);
    add(720, 2, 960);
    add(900, 1, 900);
    add(1020, 1, 740);
    add(1080, 0, 520);
    add(1100, 0, 280);
    add(1110, 0, 40);

    var curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2);
    var pathLen = curve.getLength();
    // v353: denser coast samples for first-curve + climb smoothness
    var nSamples = Math.max(240, Math.min(320, Math.floor(pathLen / 8)));
    var dense = curve.getSpacedPoints(nSamples);
    return {
      curve: curve,
      points: dense,
      raw: pts,
      theme: 'coast',
      closed: false,
      length: pathLen,
    };
  }

  /**
   * Nearest point on path. Optional hintProgress keeps search local on folds.
   */
  function nearestOnPath(pos, path, hintProgress) {
    var pts = path.points;
    var closed = !!path.closed;
    var last = pts.length - 1;
    if (last < 1) {
      return {
        i: 0, t: 0, point: pts[0].clone(), dist: pos.distanceTo(pts[0]),
        tangent: new THREE.Vector3(0, 0, 1), progress: 0,
        lateral: new THREE.Vector3(), lateralDist: 0,
      };
    }

    var best = 1e12, bi = 0;
    var lo, hi;
    if (hintProgress != null && isFinite(hintProgress)) {
      var hiHint = U.clamp(hintProgress, 0, 1);
      var center = Math.floor(hiHint * last);
      // Tight back / long forward so high speed doesn't leave the search window (v284)
      var winBack = Math.max(3, Math.floor(last * 0.015));
      var winFwd = Math.max(48, Math.floor(last * 0.28));
      lo = Math.max(0, center - winBack);
      hi = Math.min(last, center + winFwd);
      for (var i = lo; i <= hi; i++) {
        var d = pos.distanceToSquared(pts[i]);
        if (d < best) { best = d; bi = i; }
      }
      if (best > 55 * 55) {
        // Expand forward; never open full path behind hint (fold steal)
        best = 1e12;
        lo = Math.max(0, center - Math.max(2, Math.floor(last * 0.01)));
        hi = Math.min(last, center + Math.max(48, Math.floor(last * 0.22)));
        for (var i2 = lo; i2 <= hi; i2++) {
          var dW = pos.distanceToSquared(pts[i2]);
          if (dW < best) { best = dW; bi = i2; }
        }
        if (best > 100 * 100) {
          // Last resort: search only from hint-back 3% → finish (not whole path)
          best = 1e12;
          lo = Math.max(0, Math.floor((hiHint - 0.03) * last));
          hi = last;
          for (var i3 = lo; i3 <= hi; i3 += 1) {
            var d3 = pos.distanceToSquared(pts[i3]);
            if (d3 < best) { best = d3; bi = i3; }
          }
        }
        lo = Math.max(0, bi - 3);
        hi = Math.min(last, bi + 6);
      } else {
        lo = Math.max(0, bi - 3);
        hi = Math.min(last, bi + 6);
      }
    } else {
      lo = 0; hi = last;
    }

    if (lo === 0 && hi === last && (hintProgress == null || !isFinite(hintProgress))) {
      for (var k = 0; k <= last; k += 2) {
        var d0 = pos.distanceToSquared(pts[k]);
        if (d0 < best) { best = d0; bi = k; }
      }
      lo = Math.max(0, bi - 6);
      hi = Math.min(last, bi + 6);
    }
    for (var j = lo; j <= hi; j++) {
      var d2 = pos.distanceToSquared(pts[j]);
      if (d2 < best) { best = d2; bi = j; }
    }

    function projSeg(i0, i1) {
      var a = pts[i0], b = pts[i1];
      var ab = new THREE.Vector3().subVectors(b, a);
      var ap = new THREE.Vector3().subVectors(pos, a);
      var abLenSq = ab.lengthSq() || 1;
      var t = U.clamp(ap.dot(ab) / abLenSq, 0, 1);
      var closest = a.clone().add(ab.clone().multiplyScalar(t));
      var distSq = pos.distanceToSquared(closest);
      return { i0: i0, t: t, closest: closest, distSq: distSq, ab: ab };
    }

    var candidates = [];
    if (bi > 0) candidates.push(projSeg(bi - 1, bi));
    if (bi < last) candidates.push(projSeg(bi, bi + 1));
    if (bi > 1) candidates.push(projSeg(bi - 2, bi - 1));
    if (bi < last - 1) candidates.push(projSeg(bi + 1, bi + 2));
    if (!candidates.length) candidates.push(projSeg(0, 1));

    // Fold-aware pick: drop clear backward snaps when a continuous segment exists
    var hint = (hintProgress != null && isFinite(hintProgress)) ? hintProgress : null;
    function cProgress(cand) {
      return last > 0 ? (cand.i0 + cand.t) / last : 0;
    }
    if (hint != null) {
      var goodCont = null;
      for (var gc = 0; gc < candidates.length; gc++) {
        var gProg = cProgress(candidates[gc]);
        if (gProg >= hint - 0.025 && candidates[gc].distSq < 28 * 28) {
          if (!goodCont || candidates[gc].distSq < goodCont.distSq) goodCont = candidates[gc];
        }
      }
      if (goodCont) {
        candidates = candidates.filter(function (cand) {
          return cProgress(cand) >= hint - 0.03;
        });
        if (!candidates.length) candidates = [goodCont];
      }
    }
    var bestP = candidates[0];
    var bestScore = 1e30;
    for (var c = 0; c < candidates.length; c++) {
      var cand = candidates[c];
      var cProg = cProgress(cand);
      var score = cand.distSq;
      if (hint != null) {
        if (cProg < hint - 0.018) score += 12000 + (hint - cProg) * 40000;
        var dHint = cProg - hint;
        score += dHint * dHint * 220;
      }
      if (score < bestScore) {
        bestScore = score;
        bestP = cand;
      }
    }

    var tangent = bestP.ab.clone().normalize();
    var progress = last > 0 ? (bestP.i0 + bestP.t) / last : 0;
    if (!closed) progress = U.clamp(progress, 0, 1);
    // No progress inflation. Fold continuity is via scored candidates (v280).
    var sideN = new THREE.Vector3(-tangent.z, 0, tangent.x);
    var latVec = new THREE.Vector3().subVectors(pos, bestP.closest);
    var lateral = latVec.dot(sideN);
    var latDist = Math.abs(lateral);
    return {
      i: bestP.i0, t: bestP.t, point: bestP.closest,
      dist: latDist,
      dist3d: Math.sqrt(bestP.distSq),
      tangent: tangent, progress: progress,
      lateral: latVec, lateralDist: lateral,
    };
  }

  function World() {
    U = GAME.utils;
    C = GAME.config.colors;
    M = GAME.materials.get();
    this.group = new THREE.Group();
    this.buildings = [];
    this.lamps = [];
    this.path = null;
    this.roadHalf = GAME.config.drive.roadHalf;
    this.theme = 'city';
    this.startPos = null;
    this.finishPos = null;
    this._overviewMode = false;
    this._skyMat = null;
    this._sanitizeStats = { pushed: 0, hidden: 0, rayKilled: 0, note: 'clean-world-v200' };
  }

  World.prototype.clear = function (scene) {
    if (this.group.parent) scene.remove(this.group);
    while (this.group.children.length) {
      this.group.remove(this.group.children[0]);
    }
    this.buildings = [];
    this.lamps = [];
    this.path = null;
    this._skyMat = null;
    this._skyMesh = null;
    this._cloudCards = null;
    this._swTex = null; // rebuild paver maps next build
    this._roadTex = null;
    this._horizonCards = null;
    this._qualityExtras = null;
    this.startPos = null;
    this.finishPos = null;
  };

  World.prototype.preloadProps = function () {
    // No scenery GLBs in the clean foundation
    return Promise.resolve();
  };

  // ─── Build ───────────────────────────────────────────────────────────

  World.prototype.build = function (scene, mapDef) {
    this.clear(scene);
    M = GAME.materials.get();
    mapDef = mapDef || {};
    this.mapDef = mapDef;
    this.theme = mapDef.theme || 'city';
    this.roadHalf = GAME.config.drive.roadHalf;
    this._qualityExtras = [];
    this._horizonCards = [];
    this.path = (this.theme === 'coast') ? buildPathCoast() : buildPath();

    // Lighting / fog from map def (game also sets some of these)
    if (scene) {
      scene.background = new THREE.Color(mapDef.bg != null ? mapDef.bg : 0x050810);
      scene.fog = new THREE.FogExp2(
        mapDef.fogColor != null ? mapDef.fogColor : 0x0a1220,
        mapDef.fogDensity != null ? mapDef.fogDensity : 0.0032
      );
    }

    this._buildSky();
    this._buildGround(mapDef);
    this._buildRoad();
    this._sidewalkCount = 0;
    // Coast: no sidewalk slabs (raised band caused chase hop / lip tax on open flats)
    if (this.theme !== 'coast') this._buildSidewalks();
    this._buildEdgeAmbient();
    if (this.theme === 'coast') {
      // THE REACH — water + stacks, no neon canyon
      this._buildCoastDress();
      this._buildLamps();
      this._buildGates();
    } else {
      this._buildFrontage();
      this._buildNearTowers();
      this._buildOpeningCorridor();
      this._buildStreetLife();
      this._buildBillboards();
      this._buildFarSkyline();
      this._buildDepthRings();
      this._buildHorizonSkyline();
      this._buildLamps();
      this._buildGates();
    }
    // Final safety net: hide anything that still occupies open asphalt
    this._assertDrivelineClear();

    // Start / finish anchors
    var curve = this.path.curve;
    this.startPos = curve.getPointAt(0).clone();
    this.finishPos = curve.getPointAt(1).clone();

    scene.add(this.group);
    if (typeof console !== 'undefined' && console.info) {
      console.info('[World v332 theme=' + this.theme + ']', {
        pathLen: Math.round(this.path.length),
        roadHalf: this.roadHalf,
        sidewalks: this._sidewalkCount,
        buildings: this.buildings.length,
        lamps: this.lamps.length,
        children: this.group.children.length,
        assert: this._sanitizeStats,
      });
    }
    return this.path;
  };

  /** Path frame at progress t ∈ [0,1]. */
  World.prototype._frame = function (t) {
    var curve = this.path.curve;
    t = U.clamp(t, 0, 1);
    var p = curve.getPointAt(t);
    var tan = curve.getTangentAt(t);
    if (!tan || tan.lengthSq() < 1e-10) tan = new THREE.Vector3(0, 0, 1);
    else tan.normalize();
    // Horizontal side only — never tilts into the asphalt on hills
    var side = new THREE.Vector3(-tan.z, 0, tan.x);
    if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
    else side.normalize();
    var yaw = Math.atan2(tan.x, tan.z);
    var pitch = Math.asin(U.clamp(tan.y, -1, 1));
    if (!isFinite(pitch)) pitch = 0;
    return { p: p, tan: tan, side: side, yaw: yaw, pitch: pitch, t: t };
  };

  /**
   * Lateral distance from path center to prop center.
   * edgeClear = gap from asphalt edge to prop’s road-facing face.
   * halfDepth = half the prop size into the city (local X).
   */
  World.prototype._lat = function (edgeClear, halfDepth) {
    return this.roadHalf + edgeClear + halfDepth;
  };

  // ─── Sky: moon, night clouds, stars, horizon glow ────────────────────

  World.prototype._buildSky = function () {
    // Large dome follows camera each frame so the course never outruns it
    // Radius kept under camera.far (race cam ~2800) with margin
    // PERF: low-seg dome + cheap sky (no multi-octave FBM clouds — was full-screen tax)
    var skyGeo = new THREE.SphereGeometry(1200, 24, 14);
    var skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uTop: { value: new THREE.Color(0x03050e) },
        uMid: { value: new THREE.Color(0x0a1024) },
        uHor: { value: new THREE.Color(0x1c1020) },
        uGlowA: { value: new THREE.Color(0x3a1840) },
        uGlowB: { value: new THREE.Color(0x102838) },
        uMoonCol: { value: new THREE.Color(0xf2f6ff) },
        uMoonDir: { value: new THREE.Vector3(0.2, 0.65, 0.5).normalize() },
        uStarAmt: { value: 0.3 },
      },
      vertexShader: [
        'varying vec3 vDir;',
        'void main(){',
        '  vDir = normalize(position);',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform float uTime, uStarAmt;',
        'uniform vec3 uTop, uMid, uHor, uGlowA, uGlowB, uMoonCol, uMoonDir;',
        'varying vec3 vDir;',
        'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
        'void main(){',
        '  vec3 d = normalize(vDir);',
        '  float elev = d.y;',
        '  vec3 col = mix(uHor, uMid, smoothstep(-0.05, 0.35, elev));',
        '  col = mix(col, uTop, smoothstep(0.2, 0.85, elev));',
        '  float band = exp(-pow((elev - 0.02) * 5.5, 2.0));',
        '  float az = atan(d.x, d.z);',
        '  col += uGlowA * band * (0.75 + 0.45 * sin(az * 1.5 + 0.4)) * 0.88;',
        '  col += uGlowB * band * (0.75 + 0.45 * cos(az * 1.3 - 0.8)) * 0.72;',
        '  if (elev > 0.15) {',
        '    vec2 sp = d.xz / max(elev + 0.2, 0.08);',
        '    float s1 = hash(floor(sp * 12.0));',
        '    float star = step(0.996, s1);',
        '    float tw = 0.8 + 0.2 * sin(uTime * 1.2 + s1 * 20.0);',
        '    col += vec3(0.92, 0.95, 1.0) * star * tw * 0.55 * uStarAmt;',
        '  }',
        '  vec3 mDir = normalize(uMoonDir);',
        '  float md = max(dot(d, mDir), 0.0);',
        '  float disc = smoothstep(0.988, 0.996, md);',
        '  float limb = smoothstep(0.975, 0.988, md);',
        '  col += uMoonCol * disc * 0.9;',
        '  col += uMoonCol * limb * 0.25;',
        '  col += uMoonCol * pow(md, 22.0) * 0.28;',
        '  col *= 0.92 + 0.08 * smoothstep(-0.6, 0.2, elev);',
        '  gl_FragColor = vec4(col, 1.0);',
        '}',
      ].join('\n'),
    });
    var sky = new THREE.Mesh(skyGeo, skyMat);
    sky.name = 'NightSky';
    sky.frustumCulled = false;
    sky.userData.ignoreIntrusion = true;
    sky.userData.lod = 'far';
    sky.renderOrder = -100;
    this._skyMat = skyMat;
    this._skyMesh = sky;
    this.group.add(sky);

    // Cloud billboards skipped for perf (shader gradient is enough)
    this._cloudCards = [];
  };

  /**
   * Soft translucent cloud cards high above / behind skyline — subtle parallax.
   */
  World.prototype._buildSkyCloudCards = function () {
    var pathMid = this.path.curve
      ? this.path.curve.getPointAt(0.5)
      : new THREE.Vector3();
    // Procedural soft cloud texture
    var c = document.createElement('canvas');
    c.width = c.height = 256;
    var ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    for (var i = 0; i < 7; i++) {
      var cx = 40 + Math.random() * 176;
      var cy = 80 + Math.random() * 100;
      var r = 35 + Math.random() * 55;
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(200,210,235,0.55)');
      g.addColorStop(0.45, 'rgba(140,150,190,0.22)');
      g.addColorStop(1, 'rgba(80,90,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    var tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    var mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this._cloudCards = [];
    for (var k = 0; k < 8; k++) {
      var ang = (k / 8) * Math.PI * 2 + 0.3;
      var rad = 220 + (k % 3) * 40;
      var card = new THREE.Mesh(
        new THREE.PlaneGeometry(90 + (k % 3) * 30, 28 + (k % 2) * 10),
        mat
      );
      card.position.set(
        pathMid.x + Math.sin(ang) * rad,
        55 + (k % 4) * 12,
        pathMid.z + Math.cos(ang) * rad
      );
      card.lookAt(pathMid.x, card.position.y * 0.4, pathMid.z);
      card.userData.ignoreIntrusion = true;
      card.userData.lod = 'far';
      card.userData._cloudPhase = k * 1.7;
      card.userData._cloudBaseY = card.position.y;
      card.userData._cloudAng = ang;
      card.userData._cloudRad = rad;
      this.group.add(card);
      this._cloudCards.push(card);
    }
  };

  // ─── Ground ──────────────────────────────────────────────────────────

  World.prototype._buildGround = function (mapDef) {
    // Slightly lifted void floor so slight off-line looks aren’t pure black
    // Center on path mid (coast ribbon is not at world origin)
    var col = mapDef.groundColor != null ? mapDef.groundColor : 0x12161f;
    var gMid = (this.path && this.path.curve)
      ? this.path.curve.getPointAt(0.5)
      : new THREE.Vector3();
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(4200, 4200),
      new THREE.MeshBasicMaterial({ color: col })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(gMid.x, -0.15, gMid.z);
    ground.userData.ignoreIntrusion = true;
    ground.userData.lod = 'far';
    this.group.add(ground);
    this.buildings.push(ground);
    // Cheap horizon haze cards (MeshBasic quads) — fill FOV when looking off ribbon
    // Not colliders; not lights. Skip if low quality later via traverse.
    var isCoast = mapDef && mapDef.theme === 'coast';
    var hazeMat = new THREE.MeshBasicMaterial({
      color: isCoast ? 0x3a2838 : 0x1a2438,
      transparent: true,
      opacity: isCoast ? 0.62 : 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
    var hazeMid = gMid;
    for (var hi = 0; hi < 8; hi++) {
      var ang = (hi / 8) * Math.PI * 2;
      var hx = hazeMid.x + Math.sin(ang) * 170;
      var hz = hazeMid.z + Math.cos(ang) * 170;
      var haze = new THREE.Mesh(new THREE.PlaneGeometry(200, 64), hazeMat);
      haze.position.set(hx, 16, hz);
      haze.lookAt(hazeMid.x, 10, hazeMid.z);
      haze.userData.ignoreIntrusion = true;
      haze.userData.lod = 'far';
      this.group.add(haze);
      this.buildings.push(haze);
    }
  };

  // ─── Road (ONLY solid on the driveline) ───────────────────────────────

  /** Shared night asphalt map — lighter blue-grey so hood FOV ≠ black slab (Wave ∞) */
  World.prototype._roadTextures = function () {
    if (this._roadTex) return this._roadTex;
    var S = 256;
    var c = document.createElement('canvas');
    c.width = c.height = S;
    var ctx = c.getContext('2d');
    // Base: lifted cool blue-grey (was too dark under hood FOV)
    ctx.fillStyle = '#3a4a62';
    ctx.fillRect(0, 0, S, S);
    // Wet-night wash — more cyan mid so MeshBasic reads
    var g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, 'rgba(70, 120, 170, 0.28)');
    g.addColorStop(0.5, 'rgba(90, 70, 130, 0.16)');
    g.addColorStop(1, 'rgba(55, 100, 140, 0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    // Speckled highlight grit (fake wet aggregate)
    for (var i = 0; i < 4800; i++) {
      var v = 48 + ((i * 17) % 70);
      var cool = (i % 3 === 0) ? 22 : 0;
      ctx.fillStyle = 'rgba(' + (v + 8) + ',' + (v + 14) + ',' + (v + 22 + cool) + ',0.5)';
      ctx.fillRect((i * 47) % S, (i * 91) % S, 1 + (i % 2), 1 + (i % 3));
    }
    // Wear streaks — brighter so longitudinal motion reads
    ctx.strokeStyle = 'rgba(210, 225, 255, 0.1)';
    ctx.lineWidth = 2;
    for (var s = 0; s < 10; s++) {
      ctx.beginPath();
      ctx.moveTo((s * 31) % S, 0);
      ctx.lineTo((s * 31 + 40) % S, S);
      ctx.stroke();
    }
    var albedo = new THREE.CanvasTexture(c);
    albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
    albedo.repeat.set(2.5, 8);
    albedo.needsUpdate = true;
    this._roadTex = { albedo: albedo };
    return this._roadTex;
  };

  /**
   * Path-following strip (left/right rails). One continuous asphalt surface —
   * no box seams / pitch cracks on hills (Wave 1B).
   */
  World.prototype._ribbonGeo = function (halfW, yOff, uvAlongScale) {
    var pts = this.path.points;
    var n = pts.length;
    if (n < 2) return null;
    var pos = new Float32Array(n * 2 * 3);
    var uv = new Float32Array(n * 2 * 2);
    var idx = new Uint32Array((n - 1) * 6);
    var along = 0;
    var prev = pts[0];
    for (var i = 0; i < n; i++) {
      var a = pts[i];
      var b = pts[Math.min(i + 1, n - 1)];
      var dir = new THREE.Vector3().subVectors(b, a);
      if (i === n - 1) dir.subVectors(a, pts[i - 1]);
      if (dir.lengthSq() < 1e-10) dir.set(0, 0, 1);
      else dir.normalize();
      var side = new THREE.Vector3(-dir.z, 0, dir.x);
      if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
      else side.normalize();
      if (i > 0) along += a.distanceTo(prev);
      prev = a;
      var y = a.y + yOff;
      var li = i * 2;
      var ri = li + 1;
      pos[li * 3] = a.x - side.x * halfW;
      pos[li * 3 + 1] = y;
      pos[li * 3 + 2] = a.z - side.z * halfW;
      pos[ri * 3] = a.x + side.x * halfW;
      pos[ri * 3 + 1] = y;
      pos[ri * 3 + 2] = a.z + side.z * halfW;
      var v = along * (uvAlongScale != null ? uvAlongScale : 0.08);
      uv[li * 2] = 0;
      uv[li * 2 + 1] = v;
      uv[ri * 2] = 1;
      uv[ri * 2 + 1] = v;
      if (i < n - 1) {
        var base = i * 6;
        idx[base] = li;
        idx[base + 1] = ri;
        idx[base + 2] = li + 2;
        idx[base + 3] = ri;
        idx[base + 4] = ri + 2;
        idx[base + 5] = li + 2;
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    return geo;
  };

  /** Path-following strip between two signed laterals (side = left-of-forward). */
  World.prototype._flankRibbonGeo = function (latA, latB, yOff, uvAlongScale) {
    var pts = this.path.points;
    var n = pts.length;
    if (n < 2) return null;
    var pos = new Float32Array(n * 2 * 3);
    var uv = new Float32Array(n * 2 * 2);
    var idx = new Uint32Array((n - 1) * 6);
    var along = 0;
    var prev = pts[0];
    for (var i = 0; i < n; i++) {
      var a = pts[i];
      var b = pts[Math.min(i + 1, n - 1)];
      var dir = new THREE.Vector3().subVectors(b, a);
      if (i === n - 1) dir.subVectors(a, pts[i - 1]);
      if (dir.lengthSq() < 1e-10) dir.set(0, 0, 1);
      else dir.normalize();
      var side = new THREE.Vector3(-dir.z, 0, dir.x);
      if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
      else side.normalize();
      if (i > 0) along += a.distanceTo(prev);
      prev = a;
      var y = a.y + yOff;
      var li = i * 2;
      var ri = li + 1;
      pos[li * 3] = a.x + side.x * latA;
      pos[li * 3 + 1] = y;
      pos[li * 3 + 2] = a.z + side.z * latA;
      pos[ri * 3] = a.x + side.x * latB;
      pos[ri * 3 + 1] = y;
      pos[ri * 3 + 2] = a.z + side.z * latB;
      var v = along * (uvAlongScale != null ? uvAlongScale : 0.08);
      uv[li * 2] = 0;
      uv[li * 2 + 1] = v;
      uv[ri * 2] = 1;
      uv[ri * 2 + 1] = v;
      if (i < n - 1) {
        var base = i * 6;
        idx[base] = li;
        idx[base + 1] = ri;
        idx[base + 2] = li + 2;
        idx[base + 3] = ri;
        idx[base + 4] = ri + 2;
        idx[base + 5] = li + 2;
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    return geo;
  };

  World.prototype._buildRoad = function () {
    var pts = this.path.points;
    var rh = this.roadHalf;
    var closed = !!this.path.closed;
    var segCount = closed ? pts.length : Math.max(0, pts.length - 1);
    var tex = this._roadTextures();

    // Continuous asphalt ribbon (preferred over pitched boxes)
    var roadMat = new THREE.MeshBasicMaterial({
      map: tex.albedo,
      color: 0xdce6f5,
      side: THREE.DoubleSide,
    });
    var roadGeo = this._ribbonGeo(rh, 0.02, 0.07);
    if (roadGeo) {
      var roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.userData.isRoadSurface = true;
      roadMesh.frustumCulled = false;
      this.group.add(roadMesh);
    }

    var wetSheen = new THREE.MeshBasicMaterial({
      // v414 Gauntlet C: stronger Heat-night wet read (still MeshBasic fake)
      color: 0xa8d4f0,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    var sheenGeo = this._ribbonGeo(rh * 0.92, 0.04, 0.055);
    if (sheenGeo) {
      var sheenMesh = new THREE.Mesh(sheenGeo, wetSheen);
      sheenMesh.userData.isRoadSurface = true;
      sheenMesh.frustumCulled = false;
      this.group.add(sheenMesh);
    }
    // Second hotter sheen band (center lane) — neon mirror cue without SSR
    var wetHot = new THREE.MeshBasicMaterial({
      color: 0xff6a9a,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    var hotGeo = this._ribbonGeo(rh * 0.35, 0.055, 0.05);
    if (hotGeo) {
      var hotMesh = new THREE.Mesh(hotGeo, wetHot);
      hotMesh.userData.isRoadSurface = true;
      hotMesh.frustumCulled = false;
      this.group.add(hotMesh);
    }
    // Sparse neon reflection cards on asphalt (fake SSR patches)
    var patchMatC = new THREE.MeshBasicMaterial({
      color: 0x00e5ff, transparent: true, opacity: 0.22,
      depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    var patchMatM = new THREE.MeshBasicMaterial({
      color: 0xff2d55, transparent: true, opacity: 0.18,
      depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    var patchGeo = new THREE.PlaneGeometry(4.5, 9);
    var patchN = Math.min(28, Math.floor(segCount / 8));
    for (var pi = 0; pi < patchN; pi++) {
      var pt = (pi + 0.35) / patchN;
      if (!closed) pt = Math.min(0.97, pt);
      var f = this._frame(pt);
      var patch = new THREE.Mesh(patchGeo, pi % 2 ? patchMatC : patchMatM);
      patch.rotation.x = -Math.PI / 2;
      patch.position.copy(f.p).addScaledVector(f.side, ((pi % 3) - 1) * (rh * 0.35));
      patch.position.y = f.p.y + 0.06;
      patch.rotation.z = -f.yaw;
      patch.userData.isRoadSurface = true;
      patch.userData.ignoreIntrusion = true;
      patch.frustumCulled = true;
      this.group.add(patch);
    }

    var lineY = new THREE.MeshBasicMaterial({ color: 0xffe066, side: THREE.DoubleSide });
    var edgeCyan = new THREE.MeshBasicMaterial({
      color: 0x50f0ff,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });
    var curbMat = new THREE.MeshBasicMaterial({ color: 0xb8c0d0 });
    var curbGeo = new THREE.BoxGeometry(0.58, 0.4, 1);
    var ylineGeo = new THREE.BoxGeometry(0.11, 0.022, 1);
    var dashGeo = new THREE.BoxGeometry(0.1, 0.018, 1);
    var edgeGeo = new THREE.BoxGeometry(0.16, 0.022, 1);
    var chevGeo = new THREE.BoxGeometry(1.8, 0.028, 0.36);
    var lineW = new THREE.MeshBasicMaterial({ color: 0xf0f4ff });

    // Cyan edge rails as continuous ribbons
    var edgeHalf = 0.09;
    var edgeOff = rh - 0.45;
    // Build edge strips manually (offset rails)
    function edgeRail(self, latSign) {
      var n = pts.length;
      if (n < 2) return;
      var pos = new Float32Array(n * 2 * 3);
      var idx = new Uint32Array((n - 1) * 6);
      for (var i = 0; i < n; i++) {
        var a = pts[i];
        var b = pts[Math.min(i + 1, n - 1)];
        var dir = new THREE.Vector3().subVectors(b, a);
        if (i === n - 1) dir.subVectors(a, pts[i - 1]);
        if (dir.lengthSq() < 1e-10) dir.set(0, 0, 1);
        else dir.normalize();
        var side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
        var cx = a.x + side.x * latSign * edgeOff;
        var cz = a.z + side.z * latSign * edgeOff;
        var y = a.y + 0.07;
        var li = i * 2;
        pos[li * 3] = cx - side.x * edgeHalf;
        pos[li * 3 + 1] = y;
        pos[li * 3 + 2] = cz - side.z * edgeHalf;
        pos[li * 3 + 3] = cx + side.x * edgeHalf;
        pos[li * 3 + 4] = y;
        pos[li * 3 + 5] = cz + side.z * edgeHalf;
        if (i < n - 1) {
          var base = i * 6;
          idx[base] = li;
          idx[base + 1] = li + 1;
          idx[base + 2] = li + 2;
          idx[base + 3] = li + 1;
          idx[base + 4] = li + 3;
          idx[base + 5] = li + 2;
        }
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      var mesh = new THREE.Mesh(geo, edgeCyan);
      mesh.userData.isRoadSurface = true;
      mesh.frustumCulled = false;
      self.group.add(mesh);
    }
    edgeRail(this, 1);
    edgeRail(this, -1);

    // Paint + curb: overlapped boxes (same transform as ribbon samples)
    for (var i = 0; i < segCount; i++) {
      var a = pts[i];
      var b = pts[closed ? ((i + 1) % pts.length) : (i + 1)];
      var mid = a.clone().add(b).multiplyScalar(0.5);
      var dir = new THREE.Vector3().subVectors(b, a);
      var len = dir.length();
      if (!isFinite(len) || len < 0.05) continue;
      dir.normalize();
      var yaw = Math.atan2(dir.x, dir.z);
      var pitch = Math.asin(U.clamp(dir.y, -1, 1));
      if (!isFinite(pitch)) pitch = 0;
      var sideN = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
      var rot = { order: 'YXZ', y: yaw, x: -pitch };

      // Center double-yellow
      if (i % 2 === 0) {
        for (var yl = -1; yl <= 1; yl += 2) {
          var yline = new THREE.Mesh(ylineGeo, lineY);
          yline.position.copy(mid).addScaledVector(sideN, yl * 0.14);
          yline.position.y = mid.y + 0.08;
          yline.rotation.order = 'YXZ';
          yline.rotation.y = yaw;
          yline.rotation.x = -pitch;
          yline.scale.z = Math.min(len * 0.7, 4.0);
          yline.userData.isRoadSurface = true;
          this.group.add(yline);
        }
        for (var lane = -1; lane <= 1; lane += 2) {
          var dash = new THREE.Mesh(dashGeo, lineW);
          dash.position.copy(mid).addScaledVector(sideN, lane * (rh * 0.38));
          dash.position.y = mid.y + 0.08;
          dash.rotation.order = 'YXZ';
          dash.rotation.y = yaw;
          dash.rotation.x = -pitch;
          dash.scale.z = Math.min(len * 0.42, 2.2);
          dash.userData.isRoadSurface = true;
          this.group.add(dash);
        }
      }

      // Center chevrons only here — curbs are continuous ribbons (v347, no hill stairs)
      if (i % 10 === 0) {
        var chev = new THREE.Mesh(chevGeo, lineY);
        chev.position.copy(mid);
        chev.position.y = mid.y + 0.08;
        chev.rotation.order = 'YXZ';
        chev.rotation.y = yaw;
        chev.rotation.x = -pitch;
        chev.userData.isRoadSurface = true;
        this.group.add(chev);
      }
    }

    // Continuous curb ribbons (both sides) — box curbs stair-stepped on climb
    function curbRail(self, sideSign) {
      var half = 0.32;
      var geo = self._ribbonGeo(half, 0.16, 0.09);
      if (!geo) return;
      // Offset whole ribbon laterally by rebuilding positions
      var posAttr = geo.getAttribute('position');
      var nV = posAttr.count;
      var ptsR = self.path.points;
      var alongR = 0;
      var prevR = ptsR[0];
      for (var vi = 0; vi < ptsR.length; vi++) {
        var aR = ptsR[vi];
        var bR = ptsR[Math.min(vi + 1, ptsR.length - 1)];
        var dirR = new THREE.Vector3().subVectors(bR, aR);
        if (vi === ptsR.length - 1) dirR.subVectors(aR, ptsR[vi - 1]);
        if (dirR.lengthSq() < 1e-10) dirR.set(0, 0, 1);
        else dirR.normalize();
        var sideR = new THREE.Vector3(-dirR.z, 0, dirR.x);
        if (sideR.lengthSq() < 1e-8) sideR.set(1, 0, 0);
        else sideR.normalize();
        var latR = rh + 0.42;
        var cx = aR.x + sideR.x * sideSign * latR;
        var cz = aR.z + sideR.z * sideSign * latR;
        var cy = aR.y + 0.16;
        var li = vi * 2;
        var ri = li + 1;
        posAttr.setXYZ(li, cx - sideR.x * half, cy, cz - sideR.z * half);
        posAttr.setXYZ(ri, cx + sideR.x * half, cy, cz + sideR.z * half);
      }
      posAttr.needsUpdate = true;
      geo.computeVertexNormals();
      var mesh = new THREE.Mesh(geo, curbMat);
      mesh.userData.lod = 'detail';
      mesh.frustumCulled = false;
      self.group.add(mesh);
    }
    curbRail(this, 1);
    curbRail(this, -1);
  };

  /**
   * Procedural concrete paver maps (albedo + normal + rough). Shared once.
   * Grid of 2×4 ft-ish tiles, grout lines, grit noise — night-readable.
   */
  World.prototype._sidewalkTextures = function () {
    if (this._swTex) return this._swTex;

    function noise(ctx, w, h, alpha) {
      var img = ctx.getImageData(0, 0, w, h);
      var d = img.data;
      for (var i = 0; i < d.length; i += 4) {
        var n = (Math.random() - 0.5) * alpha;
        d[i] = Math.max(0, Math.min(255, d[i] + n));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
      }
      ctx.putImageData(img, 0, 0);
    }

    var S = 512;
    // ── Albedo: high-contrast night-readable concrete pavers ──
    var ac = document.createElement('canvas');
    ac.width = S; ac.height = S;
    var actx = ac.getContext('2d');
    // Dark grout base first
    actx.fillStyle = '#12151c';
    actx.fillRect(0, 0, S, S);

    var tileX = 3;
    var tileY = 5;
    var tw = S / tileX;
    var th = S / tileY;
    var grout = 8; // thick grout so it reads at distance
    for (var ty = 0; ty < tileY; ty++) {
      for (var tx = 0; tx < tileX; tx++) {
        // Bright concrete tiles (must read under night lighting)
        var v = 105 + ((tx * 17 + ty * 31) % 28);
        var warm = (tx + ty) % 3 === 0 ? 14 : 0;
        var cool = (tx + ty) % 3 === 1 ? 10 : 0;
        actx.fillStyle = 'rgb(' + (v + warm) + ',' + (v + 4) + ',' + (v + 12 + cool) + ')';
        actx.fillRect(tx * tw + grout, ty * th + grout, tw - grout * 2, th - grout * 2);
        // Bevel highlight top-left
        actx.fillStyle = 'rgba(220,230,245,0.22)';
        actx.fillRect(tx * tw + grout, ty * th + grout, tw - grout * 2, 5);
        actx.fillRect(tx * tw + grout, ty * th + grout, 5, th - grout * 2);
        // Bevel shadow bottom-right
        actx.fillStyle = 'rgba(10,12,18,0.28)';
        actx.fillRect(tx * tw + grout, ty * th + th - grout - 5, tw - grout * 2, 5);
        actx.fillRect(tx * tw + tw - grout - 5, ty * th + grout, 5, th - grout * 2);
        // Speckle
        actx.fillStyle = 'rgba(255,255,255,0.06)';
        for (var sp = 0; sp < 12; sp++) {
          actx.fillRect(
            tx * tw + grout + Math.random() * (tw - grout * 2),
            ty * th + grout + Math.random() * (th - grout * 2),
            2, 2
          );
        }
      }
    }
    noise(actx, S, S, 22);

    // Dirt streaks
    actx.strokeStyle = 'rgba(40,45,55,0.2)';
    actx.lineWidth = 2;
    for (var st = 0; st < 20; st++) {
      actx.beginPath();
      actx.moveTo(Math.random() * S, Math.random() * S);
      actx.lineTo(Math.random() * S, Math.random() * S);
      actx.stroke();
    }

    var albedo = new THREE.CanvasTexture(ac);
    albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
    albedo.anisotropy = 4;
    if (albedo.colorSpace !== undefined) albedo.colorSpace = THREE.SRGBColorSpace;
    else if (albedo.encoding !== undefined) albedo.encoding = THREE.sRGBEncoding;

    // ── Normal: fake height for tiles (grout recessed) ──
    var nc = document.createElement('canvas');
    nc.width = S; nc.height = S;
    var nctx = nc.getContext('2d');
    nctx.fillStyle = '#8080ff'; // flat normal
    nctx.fillRect(0, 0, S, S);
    // Grout = push down (more blue-down in cheap encoding: darker blue channel hack)
    // Proper-ish: paint height then sobel-lite via edge contrast
    nctx.fillStyle = '#7070e8';
    for (var ngx = 0; ngx <= tileX; ngx++) {
      nctx.fillRect(ngx * tw - 2, 0, 4, S);
    }
    for (var ngy = 0; ngy <= tileY; ngy++) {
      nctx.fillRect(0, ngy * th - 2, S, 4);
    }
    // Tile bevel: light top-left / dark bottom-right rim
    for (var nty = 0; nty < tileY; nty++) {
      for (var ntx = 0; ntx < tileX; ntx++) {
        var x0 = ntx * tw + grout;
        var y0 = nty * th + grout;
        var ww = tw - grout * 2;
        var hh = th - grout * 2;
        nctx.fillStyle = '#a0a0ff';
        nctx.fillRect(x0, y0, ww, 3);
        nctx.fillRect(x0, y0, 3, hh);
        nctx.fillStyle = '#6060d0';
        nctx.fillRect(x0, y0 + hh - 3, ww, 3);
        nctx.fillRect(x0 + ww - 3, y0, 3, hh);
      }
    }
    var normal = new THREE.CanvasTexture(nc);
    normal.wrapS = normal.wrapT = THREE.RepeatWrapping;

    // ── Roughness: grout rougher, tile tops smoother ──
    var rc = document.createElement('canvas');
    rc.width = S; rc.height = S;
    var rctx = rc.getContext('2d');
    rctx.fillStyle = '#b0b0b0';
    rctx.fillRect(0, 0, S, S);
    rctx.fillStyle = '#e0e0e0';
    for (var rgx = 0; rgx <= tileX; rgx++) rctx.fillRect(rgx * tw - 2, 0, 4, S);
    for (var rgy = 0; rgy <= tileY; rgy++) rctx.fillRect(0, rgy * th - 2, S, 4);
    noise(rctx, S, S, 25);
    var rough = new THREE.CanvasTexture(rc);
    rough.wrapS = rough.wrapT = THREE.RepeatWrapping;

    this._swTex = { albedo: albedo, normal: normal, rough: rough, tileX: tileX, tileY: tileY };
    return this._swTex;
  };

  // ─── Sidewalks — cheap 2-mesh corridor (perf: was ~5600 meshes) ───────

  World.prototype._buildSidewalks = function () {
    var tex = this._sidewalkTextures();
    var rh = this.roadHalf;
    var walkW = 3.2;
    var curbW = 0.34;
    var gap = 0.06;
    var innerL = rh + gap;
    var outerL = rh + gap + walkW;
    var curbOuter = innerL + curbW;

    var deckMat = new THREE.MeshBasicMaterial({
      map: tex.albedo,
      color: 0xffffff,
      side: THREE.DoubleSide,
    });
    var curbMat = new THREE.MeshBasicMaterial({
      color: 0x9aa0b0,
      side: THREE.DoubleSide,
    });

    function addStrip(self, a, b, y, mat, name) {
      var geo = self._flankRibbonGeo(a, b, y, 0.12);
      if (!geo) return;
      var mesh = new THREE.Mesh(geo, mat);
      mesh.name = name;
      mesh.userData.isSidewalk = true;
      mesh.userData.lod = 'building';
      mesh.frustumCulled = false;
      self.group.add(mesh);
      self.buildings.push(mesh);
    }

    // Left (+side) and right (−side) decks hug the asphalt edge
    addStrip(this, innerL, outerL, 0.16, deckMat, 'walkL');
    addStrip(this, -outerL, -innerL, 0.16, deckMat, 'walkR');
    addStrip(this, innerL, curbOuter, 0.22, curbMat, 'curbL');
    addStrip(this, -curbOuter, -innerL, 0.22, curbMat, 'curbR');
    this._sidewalkCount = 4;
  };

  World.prototype._buildEdgeAmbient = function () {
    var curve = this.path.curve;
    var rh = this.roadHalf;
    var pathLen = this.path.length || 2000;

    // Emissive ribbon materials (cheap MeshBasic — no light math)
    var edgeGlowMat = new THREE.MeshBasicMaterial({
      color: 0x88c8ff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    var walkGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffc878,
      transparent: true,
      opacity: 0.14, // light wash only — let paver texture read through
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    // Shared strip geos (scale.z per strip)
    var edgeGeo = new THREE.BoxGeometry(0.22, 0.03, 1);
    var glowGeo = new THREE.BoxGeometry(2.0, 0.02, 1);

    // Emissive curb strips — still NO PointLights (v362 fewer strips for FPS)
    var nStrips = Math.max(28, Math.min(56, Math.floor(pathLen / 18)));
    for (var i = 0; i < nStrips; i++) {
      var t = (i + 0.5) / nStrips;
      var f = this._frame(t);
      var stripLen = (pathLen / nStrips) * 0.88;

      for (var s = -1; s <= 1; s += 2) {
        var edgeLine = new THREE.Mesh(edgeGeo, edgeGlowMat);
        edgeLine.position.copy(f.p).addScaledVector(f.side, s * (rh - 0.35));
        edgeLine.position.y = f.p.y + 0.11;
        edgeLine.rotation.y = f.yaw;
        edgeLine.scale.z = stripLen;
        edgeLine.userData.isRoadSurface = true;
        edgeLine.userData.lod = 'detail';
        this.group.add(edgeLine);
        this.buildings.push(edgeLine);

        var walkGlow = new THREE.Mesh(glowGeo, walkGlowMat);
        var walkLat = this._lat(EDGE.sidewalk, 1.1);
        walkGlow.position.copy(f.p).addScaledVector(f.side, s * walkLat);
        walkGlow.position.y = f.p.y + 0.28;
        walkGlow.rotation.y = f.yaw;
        walkGlow.scale.z = stripLen * 0.9;
        walkGlow.userData.lod = 'detail';
        walkGlow.userData.isSidewalk = true;
        this.group.add(walkGlow);
        this.buildings.push(walkGlow);
      }
    }
  };

  /**
   * Opening 10 seconds — densest canyon mass for first ~12% of path.
   * Cold-start composition: walls in FOV, readable neon, no black void.
   * Cheap MeshBasic only (perf contract).
   */
  World.prototype._buildOpeningCorridor = function () {
    // v339: was 0x16141f — read as pure void in chase; lift so wall face is structure
    var wallMat = new THREE.MeshBasicMaterial({ color: 0x222030 });
    var glassMats = [
      new THREE.MeshBasicMaterial({ color: 0xffd090 }),
      new THREE.MeshBasicMaterial({ color: 0x90d8ff }),
      new THREE.MeshBasicMaterial({ color: 0xff90b8 }),
      new THREE.MeshBasicMaterial({ color: 0xd0a8ff }),
    ];
    var neonCols = [0xff2d55, 0x00e5ff, 0xff9f1c, 0xa78bfa, 0x39ff14];
    var neonMats = neonCols.map(function (c) {
      return new THREE.MeshBasicMaterial({ color: c });
    });
    var haloMats = neonCols.map(function (c) {
      return new THREE.MeshBasicMaterial({
        color: c, transparent: true, opacity: 0.4,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
    });
    var towerMat = new THREE.MeshBasicMaterial({ color: 0x1a1624 });
    var winMat = new THREE.MeshBasicMaterial({ color: 0xffc878 });
    var awningMat = new THREE.MeshBasicMaterial({ color: 0x100c14 });
    var crownMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, fog: false });
    var crownMag = new THREE.MeshBasicMaterial({ color: 0xff2d55, fog: false });

    /**
     * Canyon span helper — continuous walls along path progress [tA, tB].
     * dense=true: tall full-detail (opening + finish approach)
     * dense=false: slightly shorter, fewer window bands (mid-course budget)
     */
    var self = this;
    function buildCanyonSpan(tA, tB, nSeg, dense) {
      var wallDepth = dense ? 4.5 : 3.5;
      var halfD = wallDepth * 0.5;
      // v402: mid walls pushed out — chase +1.15 right offset was near-clipping giant faces
      var openEdge = dense ? 2.2 : 3.6;
      var span = Math.max(0.02, tB - tA);
      for (var side = 0; side < 2; side++) {
        var sideSign = side === 0 ? 1 : -1;
        for (var i = 0; i < nSeg; i++) {
          var t0 = tA + (i / nSeg) * span;
          var t1 = tA + ((i + 1) / nSeg) * span;
          var f0 = self._frame(t0);
          var f1 = self._frame(t1);
          var fm = self._frame((t0 + t1) * 0.5);
          var along = Math.min(14, f0.p.distanceTo(f1.p) + 0.7);
          var yaw = fm.yaw;
          var pitch = fm.pitch || 0;
          var lat = self._lat(openEdge, halfD);
          var ni = (i + side * 2 + Math.floor(tA * 20)) % neonMats.length;
          var wallH = dense ? 11 : (8.0 + 3.6 * Math.abs(Math.sin(t0 * Math.PI * 4)));

          var mass = new THREE.Mesh(
            new THREE.BoxGeometry(wallDepth, wallH, along),
            wallMat
          );
          mass.position.copy(fm.p).addScaledVector(fm.side, sideSign * lat);
          mass.position.y = fm.p.y + wallH * 0.48;
          mass.rotation.order = 'YXZ';
          mass.rotation.y = yaw;
          mass.rotation.x = -pitch;
          mass.userData.lod = 'building';
          mass.userData.opening = dense;
          // Climb band: keep wall face in LOD so mid-climb isn't a missing flank
          if (!dense && t0 >= 0.22 && t0 <= 0.42) mass.userData.noLod = true;
          self.group.add(mass);
          self.buildings.push(mass);

          // Neon crown on wall top — reads over black sky from chase (v339)
          // v402 mid: fewer magenta crowns (was every 2nd → pink slab bloom)
          if (dense || i % 3 === 0) {
            var crown = new THREE.Mesh(
              new THREE.BoxGeometry(wallDepth + 0.3, 0.45, along * 0.95),
              (i + side) % 2 ? crownMat : crownMag
            );
            crown.position.copy(mass.position);
            crown.position.y = fm.p.y + wallH + 0.15;
            crown.rotation.order = 'YXZ';
            crown.rotation.y = yaw;
            crown.rotation.x = -pitch;
            crown.userData.lod = 'detail';
            crown.userData.ignoreIntrusion = true;
            self.group.add(crown);
            self.buildings.push(crown);
          }

          var faceLat = self._lat(openEdge, 0.06);
          // v402: mid canyon skip hot-pink glass (index 2) — bloom-washed near faces
          var gi = (i + side) % glassMats.length;
          if (!dense && gi === 2) gi = 1;
          var glass = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, dense ? 2.4 : 2.0, along * 0.88),
            glassMats[gi]
          );
          glass.position.copy(fm.p).addScaledVector(fm.side, sideSign * faceLat);
          glass.position.y = fm.p.y + 1.5;
          glass.rotation.order = 'YXZ';
          glass.rotation.y = yaw;
          glass.rotation.x = -pitch;
          glass.userData.lod = 'building';
          if (!dense && t0 >= 0.22 && t0 <= 0.42) glass.userData.noLod = true;
          self.group.add(glass);
          self.buildings.push(glass);

          // Prefer cyan/amber neon on mid faces (skip raw magenta wash)
          var neonI = ni;
          if (!dense && neonCols[neonI] === 0xff2d55) neonI = (neonI + 1) % neonMats.length;
          var neon = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.32, along * 0.9),
            neonMats[neonI]
          );
          neon.position.copy(fm.p).addScaledVector(fm.side, sideSign * faceLat);
          neon.position.y = fm.p.y + 3.3;
          neon.rotation.order = 'YXZ';
          neon.rotation.y = yaw;
          neon.rotation.x = -pitch;
          neon.userData.lod = 'detail';
          self.group.add(neon);
          self.buildings.push(neon);

          if (dense || i % 3 === 0) {
            var halo = new THREE.Mesh(
              new THREE.BoxGeometry(0.08, 0.55, along * 0.92),
              haloMats[neonI]
            );
            halo.position.copy(neon.position);
            halo.position.addScaledVector(fm.side, -sideSign * 0.08);
            halo.rotation.order = 'YXZ';
            halo.rotation.y = yaw;
            halo.rotation.x = -pitch;
            halo.userData.lod = 'detail';
            self.group.add(halo);
          }

          var win1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, dense ? 1.3 : 1.0, along * 0.85),
            winMat
          );
          win1.position.copy(fm.p).addScaledVector(fm.side, sideSign * faceLat);
          win1.position.y = fm.p.y + (dense ? 5.8 : 5.0);
          win1.rotation.order = 'YXZ';
          win1.rotation.y = yaw;
          win1.rotation.x = -pitch;
          win1.userData.lod = 'window';
          self.group.add(win1);
          self.buildings.push(win1);

          // v362: second window + awning every other dense seg (FPS)
          if (dense && (i % 2 === 0)) {
            var win2 = new THREE.Mesh(
              new THREE.BoxGeometry(0.1, 1.1, along * 0.8),
              glassMats[(i + 1) % glassMats.length]
            );
            win2.position.copy(fm.p).addScaledVector(fm.side, sideSign * faceLat);
            win2.position.y = fm.p.y + 8.2;
            win2.rotation.order = 'YXZ';
            win2.rotation.y = yaw;
            win2.rotation.x = -pitch;
            win2.userData.lod = 'window';
            self.group.add(win2);
            self.buildings.push(win2);

            var awn = new THREE.Mesh(
              new THREE.BoxGeometry(1.1, 0.1, along * 0.9),
              awningMat
            );
            awn.position.copy(fm.p).addScaledVector(fm.side, sideSign * (faceLat - 0.55));
            awn.position.y = fm.p.y + 2.85;
            awn.rotation.order = 'YXZ';
            awn.rotation.y = yaw;
            awn.rotation.x = -pitch;
            awn.userData.lod = 'detail';
            self.group.add(awn);
          }
        }
      }
    }

    var pathLen = this.path.length || 2000;
    function segsFor(tA, tB, meters) {
      var len = pathLen * Math.max(0.02, tB - tA);
      return Math.max(8, Math.ceil(len / meters));
    }
    buildCanyonSpan(0.0, 0.16, segsFor(0.0, 0.16, 12), true);
    buildCanyonSpan(0.16, 0.22, segsFor(0.16, 0.22, 12), false);
    buildCanyonSpan(0.22, 0.42, segsFor(0.22, 0.42, 13), false);
    buildCanyonSpan(0.42, 0.88, segsFor(0.42, 0.88, 13), false);
    buildCanyonSpan(0.88, 1.0, segsFor(0.88, 1.0, 12), true);

    // Landmark towers — open + finish (mid cut for FPS)
    // v339/v373 early both sides; v376 drop mid landmarks
    var landmarkTs = [0.03, 0.07, 0.12, 0.20, 0.92];
    for (var li = 0; li < landmarkTs.length; li++) {
      var lt = landmarkTs[li];
      var lf = this._frame(lt);
      for (var ls = -1; ls <= 1; ls += 2) {
        var earlyLeft = lt < 0.16 && ls < 0;
        var th = (earlyLeft ? 28 : 16) + (li % 4) * 5 + U.seeded(li * 3 + ls + 2) * 12;
        var td = 5.5 + (li % 3) * 0.5;
        var ta = 6.5 + (li % 3);
        var tLat = this._lat(EDGE.tower * (earlyLeft ? 0.55 : 0.75), td * 0.5);
        var base = lf.p.clone().addScaledVector(lf.side, ls * tLat);

        var shaft = new THREE.Mesh(
          new THREE.BoxGeometry(td, th, ta),
          towerMat
        );
        shaft.position.copy(base);
        shaft.position.y = lf.p.y + th * 0.5;
        shaft.rotation.y = lf.yaw;
        shaft.userData.lod = 'building';
        shaft.userData.opening = lt < 0.15;
        this.group.add(shaft);
        this.buildings.push(shaft);

        var faceLatT = this._lat(EDGE.tower * 0.75, 0.08);
        var grid = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, th * 0.7, ta * 0.85),
          winMat
        );
        grid.position.copy(lf.p).addScaledVector(lf.side, ls * faceLatT);
        grid.position.y = lf.p.y + th * 0.45;
        grid.rotation.y = lf.yaw;
        grid.userData.lod = 'window';
        this.group.add(grid);
        this.buildings.push(grid);

        var blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, th * 0.55, 0.2),
          neonMats[li % neonMats.length]
        );
        blade.position.copy(base).addScaledVector(lf.side, -ls * (td * 0.45));
        blade.position.y = lf.p.y + th * 0.4;
        blade.userData.lod = 'detail';
        this.group.add(blade);
        this.buildings.push(blade);
      }
    }

    // Extra bright edge glow only in opening (cyan paint lines already exist)
    var rh = this.roadHalf;
    var openGlow = new THREE.MeshBasicMaterial({
      color: 0x00e5ff, transparent: true, opacity: 0.45,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    var openWarm = new THREE.MeshBasicMaterial({
      color: 0xffb060, transparent: true, opacity: 0.2,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    for (var oi = 0; oi < 24; oi++) {
      var ot = (oi + 0.5) / 24 * 0.12;
      var of = this._frame(ot);
      for (var os = -1; os <= 1; os += 2) {
        var line = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.04, 8),
          openGlow
        );
        line.position.copy(of.p).addScaledVector(of.side, os * (rh - 0.4));
        line.position.y = of.p.y + 0.12;
        line.rotation.y = of.yaw;
        line.userData.isRoadSurface = true;
        line.userData.lod = 'detail';
        this.group.add(line);

        var wash = new THREE.Mesh(
          new THREE.BoxGeometry(2.4, 0.03, 7),
          openWarm
        );
        wash.position.copy(of.p).addScaledVector(of.side, os * this._lat(EDGE.sidewalk, 1.0));
        wash.position.y = of.p.y + 0.3;
        wash.rotation.y = of.yaw;
        wash.userData.lod = 'detail';
        this.group.add(wash);
      }
    }
  };

  // ─── Continuous storefront ribbon (both sides) ───────────────────────

  World.prototype._buildFrontage = function () {
    var pathLen = this.path.length || 2000;
    // Denser shops — still MeshBasic only (cheap at night)
    var step = 10;
    var n = Math.floor(pathLen / step);
    n = Math.max(24, Math.min(n, 90));

    var wallMat = new THREE.MeshBasicMaterial({ color: 0x1e1c2a });
    var glassMats = [
      new THREE.MeshBasicMaterial({ color: 0xffc878 }),
      new THREE.MeshBasicMaterial({ color: 0x88d0ff }),
      new THREE.MeshBasicMaterial({ color: 0xff88aa }),
      new THREE.MeshBasicMaterial({ color: 0xc8a0ff }),
    ];
    var awningMat = new THREE.MeshBasicMaterial({ color: 0x141018 });
    var doorMat = new THREE.MeshBasicMaterial({ color: 0x0c0a12 });
    var neonCols = [0xff2d55, 0x00e5ff, 0xff9f1c, 0xa78bfa, 0x39ff14, 0xff6b9d];
    var neonMats = neonCols.map(function (c) {
      return new THREE.MeshBasicMaterial({ color: c });
    });
    // Soft additive neon halo (reads as bloom without post cost per mesh)
    var haloMats = neonCols.map(function (c) {
      return new THREE.MeshBasicMaterial({
        color: c, transparent: true, opacity: 0.35,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
    });

    var depth = 2.8;
    var halfD = depth * 0.5;
    var edgeClear = EDGE.frontage;
    var wallGeo = new THREE.BoxGeometry(1, 3.6, depth);
    var glassGeo = new THREE.BoxGeometry(1, 1.75, 0.08);
    var neonGeo = new THREE.BoxGeometry(1, 0.28, 0.08);
    var haloGeo = new THREE.BoxGeometry(1, 0.55, 0.05);
    var awnGeo = new THREE.BoxGeometry(1, 0.08, 1.05);
    var doorGeo = new THREE.BoxGeometry(0.9, 2.0, 0.08);
    var pillarGeo = new THREE.BoxGeometry(0.22, 3.5, 0.22);

    for (var side = 0; side < 2; side++) {
      var sideSign = side === 0 ? 1 : -1;
      for (var ui = 0; ui < n; ui++) {
        var t = ((ui + 0.5) / n + (U.seeded(ui * 2.7 + side * 11) - 0.5) * 0.002 + 1) % 1;
        var f = this._frame(t);
        var unitW = 7.5 + U.seeded(ui * 3.1 + side * 7) * 4.0;
        var lat = this._lat(edgeClear, halfD);
        var ni = (ui + side * 3) % neonMats.length;
        var gi = (ui + side) % glassMats.length;

        var g = new THREE.Group();

        var wall = new THREE.Mesh(wallGeo, wallMat);
        wall.scale.x = unitW;
        var hMul = 0.88 + U.seeded(ui * 5.1 + side * 9) * 0.7;
        wall.scale.y = hMul;
        wall.position.set(0, 1.8 * hMul, 0);
        g.add(wall);

        var glass = new THREE.Mesh(glassGeo, glassMats[gi]);
        glass.scale.x = unitW * 0.86;
        glass.position.set(0, 1.35, -halfD - 0.05);
        g.add(glass);

        // Door recess (break up flat glass wall)
        if (ui % 2 === 0) {
          var door = new THREE.Mesh(doorGeo, doorMat);
          door.position.set(unitW * 0.28, 1.0, -halfD - 0.06);
          g.add(door);
        }

        var neon = new THREE.Mesh(neonGeo, neonMats[ni]);
        neon.scale.x = unitW * 0.9;
        neon.position.set(0, 3.2, -halfD - 0.08);
        g.add(neon);

        var halo = new THREE.Mesh(haloGeo, haloMats[ni]);
        halo.scale.x = unitW * 0.95;
        halo.position.set(0, 3.2, -halfD - 0.12);
        g.add(halo);

        var awn = new THREE.Mesh(awnGeo, awningMat);
        awn.scale.x = unitW * 0.95;
        awn.position.set(0, 2.35, -halfD - 0.55);
        g.add(awn);

        // Thin pillars at bay edges (canyon rhythm)
        var pilL = new THREE.Mesh(pillarGeo, wallMat);
        pilL.position.set(-unitW * 0.48, 1.75, -halfD + 0.15);
        g.add(pilL);
        var pilR = new THREE.Mesh(pillarGeo, wallMat);
        pilR.position.set(unitW * 0.48, 1.75, -halfD + 0.15);
        g.add(pilR);

        // Occasional vertical blade sign
        if (ui % 3 === 0) {
          var blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 2.2, 0.55),
            neonMats[(ni + 2) % neonMats.length]
          );
          blade.position.set(unitW * 0.42, 2.4, -halfD - 0.4);
          g.add(blade);
        }

        g.position.copy(f.p).addScaledVector(f.side, sideSign * lat);
        g.position.y = f.p.y;
        g.rotation.order = 'YXZ';
        g.rotation.y = Math.atan2(sideSign * f.side.x, sideSign * f.side.z);
        g.rotation.x = 0;
        g.rotation.z = 0;
        g.userData.lod = 'building';
        this.group.add(g);
        this.buildings.push(g);
      }
    }
  };

  // ─── Near towers (mid-rise row, path-aligned) ─────────────────────────

  World.prototype._buildNearTowers = function () {
    var pathLen = this.path.length || 2000;
    // v376: fewer mid towers (FPS after both-flank mass)
    var n = Math.max(12, Math.min(22, Math.floor(pathLen / 140)));
    // Unlit facades — night city reads from emissive-tint colors, not PBR lights
    var facadePool = [
      new THREE.MeshBasicMaterial({ color: 0x1c1830 }),
      new THREE.MeshBasicMaterial({ color: 0x141c28 }),
      new THREE.MeshBasicMaterial({ color: 0x221820 }),
      new THREE.MeshBasicMaterial({ color: 0x181428 }),
    ];
    var glassMat = new THREE.MeshBasicMaterial({ color: 0x5a88b0 });
    var winLitMat = new THREE.MeshBasicMaterial({ color: 0xffc878 });
    var neonA = new THREE.MeshBasicMaterial({ color: 0xff2d55 });
    var neonB = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

    for (var bi = 0; bi < n; bi++) {
      var t = ((bi + 0.35) / n + U.seeded(bi * 3.1) * 0.01) % 1;
      var f = this._frame(t);
      var sideSign = bi % 2 === 0 ? 1 : -1;
      var ring = bi % 3; // 0 near, 1 mid, 2 farther

      var h = 14 + U.seeded(bi * 2.2) * 32 + ring * 8;
      var depth = 5.5 + U.seeded(bi * 1.3) * 5; // into city
      var along = 6 + U.seeded(bi * 4.1) * 7;   // along road
      var halfD = depth * 0.5;
      var edgeClear = EDGE.tower + ring * 8;
      var lat = this._lat(edgeClear, halfD);

      var base = f.p.clone().addScaledVector(f.side, sideSign * lat);
      var plinthH = 2.4;
      var shaftH = h * 0.72;

      var plinth = new THREE.Mesh(
        new THREE.BoxGeometry(depth * 1.08, plinthH, along * 1.08),
        facadePool[(bi + 1) % facadePool.length]
      );
      plinth.position.copy(base);
      plinth.position.y = f.p.y + plinthH * 0.5;
      plinth.rotation.y = f.yaw;
      plinth.userData.lod = 'building';
      this.group.add(plinth);
      this.buildings.push(plinth);

      var shaft = new THREE.Mesh(
        new THREE.BoxGeometry(depth, shaftH, along),
        bi % 4 === 0 ? glassMat : facadePool[(bi * 3 + ring) % facadePool.length]
      );
      shaft.position.copy(base);
      shaft.position.y = f.p.y + plinthH + shaftH * 0.5;
      shaft.rotation.y = f.yaw;
      shaft.userData.lod = 'building';
      this.group.add(shaft);
      this.buildings.push(shaft);

      // 1–2 lit window bands per tower (not per-floor spam)
      var faceLat = this._lat(edgeClear, 0.08);
      var bands = 1 + (bi % 2);
      for (var fl = 0; fl < bands; fl++) {
        var curtain = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, shaftH * 0.22, along * 0.82),
          fl % 2 === 0 ? winLitMat : glassMat
        );
        curtain.position.copy(f.p).addScaledVector(f.side, sideSign * faceLat);
        curtain.position.y = f.p.y + plinthH + shaftH * (0.35 + fl * 0.35);
        curtain.rotation.y = f.yaw;
        curtain.userData.lod = 'window';
        this.group.add(curtain);
        this.buildings.push(curtain);
      }

      // Neon belt on face
      if (ring === 0 && bi % 2 === 0) {
        var belt = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.22, along * 0.8),
          bi % 4 === 0 ? neonA : neonB
        );
        belt.position.copy(f.p).addScaledVector(f.side, sideSign * (faceLat + 0.12));
        belt.position.y = f.p.y + 4.2;
        belt.rotation.y = f.yaw;
        belt.userData.lod = 'detail';
        this.group.add(belt);
        this.buildings.push(belt);
      }
    }
  };

  // ─── Billboards (sparse, well set back) ───────────────────────────────

  World.prototype._buildBillboards = function () {
    // Never in opening FOV — giant blue/ad slabs ruined cold start
    var n = 5; // v376 FPS
    // Original parole-board copy — short so it reads at speed (v297)
    var ads = [
      { bg: '#0a1020', a: '#ff2d55', b: '#00e5ff', t: 'PAROLE' },
      { bg: '#120810', a: '#ff9f1c', b: '#ff2d88', t: 'LAPS' },
      { bg: '#081218', a: '#a78bfa', b: '#39ff14', t: 'SCRAP' },
      { bg: '#100a08', a: '#ff6b35', b: '#00e5ff', t: 'WARDEN' },
      { bg: '#0c0814', a: '#f472b6', b: '#ffc857', t: 'FINISH' },
    ];

    function makeAdTex(ad) {
      var c = document.createElement('canvas');
      c.width = 512; c.height = 768;
      var ctx = c.getContext('2d');
      ctx.fillStyle = ad.bg;
      ctx.fillRect(0, 0, 512, 768);
      var grd = ctx.createLinearGradient(0, 0, 512, 768);
      grd.addColorStop(0, ad.a);
      grd.addColorStop(1, ad.b);
      ctx.fillStyle = grd;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, 0, 512, 768);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#f2e9e4';
      ctx.font = 'bold 64px monospace, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ad.t, 256, 380);
      ctx.strokeStyle = ad.a;
      ctx.lineWidth = 8;
      ctx.strokeRect(24, 24, 464, 720);
      var tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    }

    var poleMat = new THREE.MeshBasicMaterial({ color: 0x2a2834 });
    // Smaller boards, deeper setback — no half-FOV blue walls
    var boardW = 5.5;
    var boardH = 8;
    var halfD = 0.15;

    for (var i = 0; i < n; i++) {
      // Skip first 15% of course (opening corridor owns that FOV)
      var t = 0.16 + (i / Math.max(1, n - 1)) * 0.72;
      var f = this._frame(t);
      var sideSign = i % 2 === 0 ? 1 : -1;
      var lat = this._lat(EDGE.billboard + 4, halfD);

      var pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 8, 6),
        poleMat
      );
      pole.position.copy(f.p).addScaledVector(f.side, sideSign * lat);
      pole.position.y = f.p.y + 4;
      pole.userData.lod = 'sign';
      this.group.add(pole);
      this.buildings.push(pole);

      var tex = makeAdTex(ads[i % ads.length]);
      var board = new THREE.Mesh(
        new THREE.PlaneGeometry(boardW, boardH),
        new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide, transparent: false })
      );
      board.position.copy(pole.position);
      board.position.y = f.p.y + 9;
      // Face path (readable from road), not a sky-filling flat
      board.lookAt(f.p.x, board.position.y, f.p.z);
      board.userData.lod = 'sign';
      this.group.add(board);
      this.buildings.push(board);
    }
  };

  // ─── Far skyline (NEVER near the road) ────────────────────────────────

  World.prototype._buildFarSkyline = function () {
    var path = this.path;
    var curve = path.curve;
    var mid = curve.getPointAt(0.5);
    var start = curve.getPointAt(0);
    var rh = this.roadHalf;
    // Hard setback from asphalt edge — towers must clear this lateral distance
    var minLat = rh + EDGE.farSkyline;
    // Unlit far cards — dark silhouettes (no solid bright blue window walls)
    var mats = [
      new THREE.MeshBasicMaterial({ color: 0x12101c }),
      new THREE.MeshBasicMaterial({ color: 0x0e1420 }),
      new THREE.MeshBasicMaterial({ color: 0x161018 }),
    ];
    // Tiny warm dots, not a full-face blue/orange slab
    var winMat = new THREE.MeshBasicMaterial({ color: 0x3a3048 });

    var placed = 0;
    var attempts = 0;
    var maxAttempts = 140;
    while (placed < 26 && attempts < maxAttempts) {
      attempts++;
      var i = attempts;
      var ang = (i / maxAttempts) * Math.PI * 2 + U.seeded(i * 2.1) * 0.4;
      var r = 220 + U.seeded(i * 3.7) * 140; // farther — less FOV fill at spawn
      var px = mid.x + Math.sin(ang) * r;
      var pz = mid.z + Math.cos(ang) * r;
      var candidate = new THREE.Vector3(px, 0, pz);
      var near = nearestOnPath(candidate, path);
      if (!near || near.dist < minLat) continue;
      // Keep huge cards out of start camera cone
      if (candidate.distanceTo(start) < 220) continue;

      var h = 22 + U.seeded(i * 1.3) * 50;
      var w = 5 + U.seeded(i * 4.2) * 8;
      var d = 5 + U.seeded(i * 5.1) * 7;
      var foot = Math.max(w, d) * 0.55;
      if (near.dist - foot < minLat) continue;

      var tower = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        mats[placed % mats.length]
      );
      tower.position.set(px, h * 0.45, pz);
      tower.userData.lod = 'far';
      this.group.add(tower);
      this.buildings.push(tower);

      // Sparse warm speck face only (not giant solid blue plane)
      if (placed % 3 === 0) {
        var face = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.5, h * 0.35, 0.08),
          winMat
        );
        face.position.copy(tower.position);
        var toMid = new THREE.Vector3(mid.x - px, 0, mid.z - pz).normalize();
        face.position.addScaledVector(toMid, d * 0.5 + 0.05);
        face.position.y += h * 0.08;
        var faceNear = nearestOnPath(face.position, path);
        if (faceNear && faceNear.dist >= minLat - 5) {
          face.lookAt(mid.x, face.position.y, mid.z);
          face.userData.lod = 'far';
          this.group.add(face);
          this.buildings.push(face);
        }
      }
      placed++;
    }

    // Extra cheap silhouettes as one InstancedMesh (depth without draw-call spam)
    var extraN = 18;
    var extraGeo = new THREE.BoxGeometry(1, 1, 1);
    var extraMat = new THREE.MeshBasicMaterial({ color: 0x0c1018 });
    var extra = new THREE.InstancedMesh(extraGeo, extraMat, extraN);
    extra.userData.lod = 'far';
    extra.userData.noLod = true;
    extra.userData.ignoreIntrusion = true;
    var dummyX = new THREE.Object3D();
    var got = 0;
    for (var xi = 0; xi < extraN * 3 && got < extraN; xi++) {
      var xang = (xi / (extraN * 3)) * Math.PI * 2;
      var xr = 280 + U.seeded(xi * 8.2) * 160;
      var xpx = mid.x + Math.sin(xang) * xr;
      var xpz = mid.z + Math.cos(xang) * xr;
      var xc = new THREE.Vector3(xpx, 0, xpz);
      var xn = nearestOnPath(xc, path);
      if (!xn || xn.dist < minLat + 20) continue;
      if (xc.distanceTo(start) < 240) continue;
      var xh = 28 + U.seeded(xi * 2.4) * 70;
      dummyX.position.set(xpx, xh * 0.42, xpz);
      dummyX.rotation.set(0, xang, 0);
      dummyX.scale.set(7 + (xi % 5), xh, 8 + (xi % 4));
      dummyX.updateMatrix();
      extra.setMatrixAt(got, dummyX.matrix);
      got++;
    }
    extra.count = got;
    extra.instanceMatrix.needsUpdate = true;
    extra.frustumCulled = false;
    this.group.add(extra);
    this.buildings.push(extra);

    // Soft horizon glow discs (atmosphere only)
    for (var g = 0; g < 4; g++) {
      var gang = (g / 4) * Math.PI * 2;
      var glow = new THREE.Mesh(
        new THREE.CircleGeometry(40 + g * 8, 16),
        new THREE.MeshBasicMaterial({
          color: g % 2 ? 0xff2d55 : 0x00e5ff,
          transparent: true,
          opacity: 0.06,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        })
      );
      glow.position.set(
        mid.x + Math.sin(gang) * 240,
        4,
        mid.z + Math.cos(gang) * 240
      );
      glow.rotation.x = -Math.PI / 2;
      glow.userData.lod = 'far';
      this.group.add(glow);
    }
  };

  /**
   * Painted city skyline — tall cards JUST behind canyon so chase cam clears
   * the 11m wall. Fog disabled on cards (Wave 2: density ate them).
   */
  World.prototype._buildHorizonSkyline = function () {
    var c = document.createElement('canvas');
    c.width = 1024;
    c.height = 256;
    var ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 1024, 256);
    var i, x, bw, bh, base;
    // Jagged building mass — darker silhouette with cyan/magenta belts
    ctx.fillStyle = '#14101c';
    x = 0;
    while (x < 1024) {
      bw = 18 + ((x * 17) % 40);
      bh = 90 + ((x * 31) % 150);
      base = 256 - bh;
      ctx.fillRect(x, base, bw - 2, bh);
      x += bw;
    }
    ctx.fillStyle = '#1a1424';
    x = 8;
    while (x < 1024) {
      bw = 12 + ((x * 13) % 28);
      bh = 130 + ((x * 23) % 110);
      ctx.fillRect(x, 256 - bh, bw - 1, bh);
      x += bw + 6;
    }
    for (i = 0; i < 520; i++) {
      var wx = (i * 47) % 1024;
      var wy = 30 + (i * 91) % 210;
      ctx.fillStyle = (i % 7 === 0) ? '#00e5ff' : (i % 5 === 0) ? '#ff2d55' : '#ffc878';
      ctx.globalAlpha = 0.4 + (i % 4) * 0.12;
      ctx.fillRect(wx, wy, 2, 3);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff2d55';
    ctx.globalAlpha = 0.7;
    ctx.fillRect(0, 168, 1024, 4);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(0, 196, 1024, 3);
    ctx.globalAlpha = 1;
    var tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    tex.minFilter = THREE.LinearFilter;
    var mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false, // must clear FogExp2 or cards vanish in chase
    });
    this._horizonCards = [];
    // Chase ~1.75m, wall 11m @ ~16–20m. Cards just behind canyon, both sides.
    // v388 mid-climb both; v394: drop late alternate cards (FPS) — early+mid only
    var pairN = 5; // both flanks 0.02→~0.30 (Neon lock)
    var midBoth = 3; // both flanks through climb 0.30→~0.52
    var n = pairN + midBoth; // 8 slots · no late far cards
    for (i = 0; i < n; i++) {
      var t;
      if (i < pairN) {
        t = 0.02 + (i / Math.max(1, pairN - 1)) * 0.28;
      } else {
        t = 0.32 + ((i - pairN) / Math.max(1, midBoth - 1)) * 0.20;
      }
      var f = this._frame(t);
      var sides = [-1, 1];
      for (var si = 0; si < sides.length; si++) {
        var side = sides[si];
        var lat = this._lat(EDGE.tower + (i < pairN ? 7 : 9) + (i % 3) * 2, 2);
        var cardH = (i < pairN ? 118 : 100) + (i % 4) * 6;
        var cardW = (i < pairN ? 72 : 62) + (i % 3) * 8;
        var card = new THREE.Mesh(new THREE.PlaneGeometry(cardW, cardH), mat);
        card.position.copy(f.p).addScaledVector(f.side, side * lat);
        card.position.y = f.p.y + cardH * 0.48;
        card.lookAt(f.p.x, card.position.y, f.p.z);
        card.userData.lod = 'far';
        card.userData.noLod = i < pairN + 2;
        card.userData.ignoreIntrusion = true;
        card.userData.horizonCard = true;
        card.frustumCulled = i >= pairN + 2;
        this.group.add(card);
        this.buildings.push(card);
        this._horizonCards.push(card);
      }
    }
    // v373 peeks; v376 trim; v388 extend into climb for left FOV
    var peekMat = new THREE.MeshBasicMaterial({ color: 0x16121c, fog: false });
    var peekCapC = new THREE.MeshBasicMaterial({ color: 0x00e5ff, fog: false });
    var peekCapM = new THREE.MeshBasicMaterial({ color: 0xff2d55, fog: false });
    for (var pi = 0; pi < 7; pi++) {
      var pt = 0.04 + pi * 0.07; // 0.04–0.46 both flanks through climb entry
      var pf = this._frame(pt);
      for (var ps = -1; ps <= 1; ps += 2) {
        var ph = 54 + (pi % 3) * 10;
        // Closer peeks so camera yaw into curves still sees mass
        var plat = this._lat(EDGE.tower + 2.5 + (pi % 2) * 0.8, 2.5);
        var peek = new THREE.Mesh(new THREE.BoxGeometry(10, ph, 16), peekMat);
        peek.position.copy(pf.p).addScaledVector(pf.side, ps * plat);
        peek.position.y = pf.p.y + ph * 0.42;
        peek.rotation.order = 'YXZ';
        peek.rotation.y = pf.yaw;
        peek.userData.lod = 'far';
        peek.userData.noLod = pi < 4; // v391: mid peeks LOD (early still always-on)
        peek.userData.ignoreIntrusion = true;
        peek.userData.qualityExtra = true;
        peek.userData.horizonCard = true;
        peek.frustumCulled = pi >= 4;
        this.group.add(peek);
        this.buildings.push(peek);
        if (!this._qualityExtras) this._qualityExtras = [];
        this._qualityExtras.push(peek);
        if (pi % 2 === 0) {
          var pcap = new THREE.Mesh(new THREE.BoxGeometry(11, 0.65, 18), (pi + ps) % 2 ? peekCapC : peekCapM);
          pcap.position.copy(peek.position);
          pcap.position.y += ph * 0.48;
          pcap.rotation.order = 'YXZ';
          pcap.rotation.y = pf.yaw;
          pcap.userData.lod = 'far';
          pcap.userData.noLod = pi < 4;
          pcap.userData.ignoreIntrusion = true;
          pcap.userData.qualityExtra = true;
          pcap.frustumCulled = pi >= 4;
          this.group.add(pcap);
          this.buildings.push(pcap);
          this._qualityExtras.push(pcap);
        }
      }
    }
    // v398: thin late both-side peeks — mid-late FOV after late cards cut (v394)
    for (var lateI = 0; lateI < 3; lateI++) {
      var lateT = 0.58 + lateI * 0.12; // 0.58 / 0.70 / 0.82
      var lateF = this._frame(lateT);
      for (var lps = -1; lps <= 1; lps += 2) {
        var lateH = 48 + lateI * 6;
        var lateLat = this._lat(EDGE.tower + 6 + lateI, 2.5);
        var latePeek = new THREE.Mesh(new THREE.BoxGeometry(9, lateH, 14), peekMat);
        latePeek.position.copy(lateF.p).addScaledVector(lateF.side, lps * lateLat);
        latePeek.position.y = lateF.p.y + lateH * 0.42;
        latePeek.rotation.order = 'YXZ';
        latePeek.rotation.y = lateF.yaw;
        latePeek.userData.lod = 'far';
        latePeek.userData.noLod = false;
        latePeek.userData.ignoreIntrusion = true;
        latePeek.userData.qualityExtra = true;
        latePeek.userData.horizonCard = true;
        latePeek.frustumCulled = true;
        this.group.add(latePeek);
        this.buildings.push(latePeek);
        this._qualityExtras.push(latePeek);
      }
    }
    // v402: mid-climb left FOV — chase right-offset left a black void past the wall
    for (var mc = 0; mc < 2; mc++) {
      var mct = 0.28 + mc * 0.08; // 0.28 / 0.36
      var mcf = this._frame(mct);
      var mch = 72 + mc * 8;
      var mclat = this._lat(EDGE.tower + 3.2 + mc, 2.5);
      var mcpeek = new THREE.Mesh(new THREE.BoxGeometry(11, mch, 18), peekMat);
      mcpeek.position.copy(mcf.p).addScaledVector(mcf.side, -1 * mclat);
      mcpeek.position.y = mcf.p.y + mch * 0.45;
      mcpeek.rotation.order = 'YXZ';
      mcpeek.rotation.y = mcf.yaw;
      mcpeek.userData.lod = 'far';
      mcpeek.userData.noLod = true;
      mcpeek.userData.ignoreIntrusion = true;
      mcpeek.userData.qualityExtra = true;
      mcpeek.userData.horizonCard = true;
      mcpeek.frustumCulled = false;
      this.group.add(mcpeek);
      this.buildings.push(mcpeek);
      this._qualityExtras.push(mcpeek);
      var mccap = new THREE.Mesh(
        new THREE.BoxGeometry(12, 0.7, 20),
        mc % 2 ? peekCapC : peekCapM
      );
      mccap.position.copy(mcpeek.position);
      mccap.position.y += mch * 0.48;
      mccap.rotation.order = 'YXZ';
      mccap.rotation.y = mcf.yaw;
      mccap.userData.lod = 'far';
      mccap.userData.noLod = true;
      mccap.userData.ignoreIntrusion = true;
      mccap.userData.qualityExtra = true;
      mccap.frustumCulled = false;
      this.group.add(mccap);
      this.buildings.push(mccap);
      this._qualityExtras.push(mccap);
    }
    // v388: first right-curve leaves screen-left black — dense always-on outer peeks
    for (var li = 0; li < 4; li++) {
      var lt = 0.09 + li * 0.055; // 0.09–0.255 into first bend
      var lf = this._frame(lt);
      // Outer = negative path side on this opening right sweep
      var lside = -1;
      var lh = 62 + li * 6;
      var llat = this._lat(EDGE.tower + 1.8, 2);
      var lpeek = new THREE.Mesh(new THREE.BoxGeometry(12, lh, 20), peekMat);
      lpeek.position.copy(lf.p).addScaledVector(lf.side, lside * llat);
      lpeek.position.y = lf.p.y + lh * 0.42;
      lpeek.rotation.order = 'YXZ';
      lpeek.rotation.y = lf.yaw;
      lpeek.userData.lod = 'far';
      lpeek.userData.noLod = true;
      lpeek.userData.ignoreIntrusion = true;
      lpeek.userData.qualityExtra = true;
      lpeek.userData.horizonCard = true;
      lpeek.frustumCulled = false;
      this.group.add(lpeek);
      this.buildings.push(lpeek);
      this._qualityExtras.push(lpeek);
      var lcap = new THREE.Mesh(new THREE.BoxGeometry(13, 0.7, 22), li % 2 ? peekCapC : peekCapM);
      lcap.position.copy(lpeek.position);
      lcap.position.y += lh * 0.48;
      lcap.rotation.order = 'YXZ';
      lcap.rotation.y = lf.yaw;
      lcap.userData.lod = 'far';
      lcap.userData.noLod = true;
      lcap.userData.ignoreIntrusion = true;
      lcap.userData.qualityExtra = true;
      lcap.frustumCulled = false;
      this.group.add(lcap);
      this.buildings.push(lcap);
      this._qualityExtras.push(lcap);
    }

    // v413 Gauntlet Piece A — nameable over-wall mass both flanks (Heat night density)
    // Late skyline cards (cut in v394 for FPS) — thin pair only, LOD far
    var lateCardTs = [0.58, 0.72];
    for (var lci = 0; lci < lateCardTs.length; lci++) {
      var lcf = this._frame(lateCardTs[lci]);
      for (var lcsi = 0; lcsi < 2; lcsi++) {
        var lcside = lcsi === 0 ? -1 : 1;
        var lclat = this._lat(EDGE.tower + 10 + lci * 2, 2.5);
        var lcH = 88 + lci * 8;
        var lcW = 54 + lci * 6;
        var lcard = new THREE.Mesh(new THREE.PlaneGeometry(lcW, lcH), mat);
        lcard.position.copy(lcf.p).addScaledVector(lcf.side, lcside * lclat);
        lcard.position.y = lcf.p.y + lcH * 0.5;
        lcard.lookAt(lcf.p.x, lcard.position.y, lcf.p.z);
        lcard.userData.lod = 'far';
        lcard.userData.noLod = false;
        lcard.userData.ignoreIntrusion = true;
        lcard.userData.horizonCard = true;
        lcard.userData.qualityExtra = true;
        lcard.frustumCulled = true;
        this.group.add(lcard);
        this.buildings.push(lcard);
        this._horizonCards.push(lcard);
        this._qualityExtras.push(lcard);
      }
    }
    // Mid-climb RIGHT peeks (left already densified v402) — both flanks nameable
    for (var mr = 0; mr < 2; mr++) {
      var mrt = 0.30 + mr * 0.08;
      var mrf = this._frame(mrt);
      var mrh = 68 + mr * 8;
      var mrlat = this._lat(EDGE.tower + 3.4 + mr, 2.5);
      var mrpeek = new THREE.Mesh(new THREE.BoxGeometry(11, mrh, 18), peekMat);
      mrpeek.position.copy(mrf.p).addScaledVector(mrf.side, 1 * mrlat);
      mrpeek.position.y = mrf.p.y + mrh * 0.45;
      mrpeek.rotation.order = 'YXZ';
      mrpeek.rotation.y = mrf.yaw;
      mrpeek.userData.lod = 'far';
      mrpeek.userData.noLod = true;
      mrpeek.userData.ignoreIntrusion = true;
      mrpeek.userData.qualityExtra = true;
      mrpeek.userData.horizonCard = true;
      mrpeek.frustumCulled = false;
      this.group.add(mrpeek);
      this.buildings.push(mrpeek);
      this._qualityExtras.push(mrpeek);
      var mrcap = new THREE.Mesh(
        new THREE.BoxGeometry(12, 0.7, 20),
        mr % 2 ? peekCapM : peekCapC
      );
      mrcap.position.copy(mrpeek.position);
      mrcap.position.y += mrh * 0.48;
      mrcap.rotation.order = 'YXZ';
      mrcap.rotation.y = mrf.yaw;
      mrcap.userData.lod = 'far';
      mrcap.userData.noLod = true;
      mrcap.userData.ignoreIntrusion = true;
      mrcap.userData.qualityExtra = true;
      mrcap.frustumCulled = false;
      this.group.add(mrcap);
      this.buildings.push(mrcap);
      this._qualityExtras.push(mrcap);
    }
    // Blade neon signs — short tall fins over lip, both shoulders (nameable)
    var bladeMatC = new THREE.MeshBasicMaterial({
      color: 0x00e5ff, transparent: true, opacity: 0.85, fog: false, depthWrite: false,
    });
    var bladeMatM = new THREE.MeshBasicMaterial({
      color: 0xff2d55, transparent: true, opacity: 0.85, fog: false, depthWrite: false,
    });
    var bladeTs = [0.06, 0.14, 0.22, 0.34, 0.42, 0.62];
    for (var bi = 0; bi < bladeTs.length; bi++) {
      var bf = this._frame(bladeTs[bi]);
      for (var bs = -1; bs <= 1; bs += 2) {
        var blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 14 + (bi % 3) * 3, 3.2),
          (bi + bs) % 2 ? bladeMatC : bladeMatM
        );
        var blat = this._lat(EDGE.tower + 0.6, 1.5);
        blade.position.copy(bf.p).addScaledVector(bf.side, bs * blat);
        blade.position.y = bf.p.y + 16;
        blade.rotation.order = 'YXZ';
        blade.rotation.y = bf.yaw;
        blade.userData.lod = 'far';
        blade.userData.noLod = bi < 3;
        blade.userData.ignoreIntrusion = true;
        blade.userData.qualityExtra = true;
        blade.frustumCulled = bi >= 3;
        this.group.add(blade);
        this.buildings.push(blade);
        this._qualityExtras.push(blade);
      }
    }
  };

  /**
   * Mid-distance city mass — one InstancedMesh draw (horizontal depth).
   * Sits outside tower setback. Not on the driveline.
   */
  World.prototype._buildDepthRings = function () {
    var n = 20; // v362: was 32
    var geo = new THREE.BoxGeometry(1, 1, 1);
    var mat = new THREE.MeshBasicMaterial({ color: 0x12161e });
    var inst = new THREE.InstancedMesh(geo, mat, n);
    inst.userData.lod = 'far';
    inst.userData.noLod = false;
    inst.userData.ignoreIntrusion = true;
    var dummy = new THREE.Object3D();
    var placed = 0;
    for (var i = 0; i < n; i++) {
      var t = (0.06 + (i + 0.4) / n * 0.88) % 1;
      var f = this._frame(t);
      var side = i % 2 === 0 ? 1 : -1;
      var ring = 1 + (i % 3);
      var h = 10 + (i % 6) * 4 + ring * 5;
      var along = 7 + (i % 4) * 2;
      var depth = 6 + ring * 2;
      var lat = this._lat(EDGE.tower + 12 + ring * 11, depth * 0.5);
      dummy.position.copy(f.p).addScaledVector(f.side, side * lat);
      dummy.position.y = f.p.y + h * 0.45;
      dummy.rotation.set(0, f.yaw, 0);
      dummy.scale.set(depth, h, along);
      dummy.updateMatrix();
      inst.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    inst.count = placed;
    inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = true;
    this.group.add(inst);
    this.buildings.push(inst);

    // HUGE ridges + AHEAD skyline spikes so chase vanishing-point shows city mass
    // v339: denser LEFT early ridges — port chase was black void past the wall
    var ridgeMat = new THREE.MeshBasicMaterial({ color: 0x1c1828, fog: false });
    var neonCap = new THREE.MeshBasicMaterial({ color: 0x00e5ff, fog: false });
    var magCap = new THREE.MeshBasicMaterial({ color: 0xff2d55, fog: false });
    // v373 denser early ridges; v376 drop one far + caps every other (FPS)
    var ridgeTs = [0.04, 0.08, 0.13, 0.18, 0.26, 0.42, 0.65];
    for (var ri = 0; ri < ridgeTs.length; ri++) {
      var rf = this._frame(ridgeTs[ri]);
      var rSides = ri < 4 ? [-1, 1] : [ri % 2 === 0 ? 1 : -1];
      for (var rsi = 0; rsi < rSides.length; rsi++) {
      var rside = rSides[rsi];
      var rhgt = 80 + (ri % 4) * 12;
      var rlat = this._lat(EDGE.tower + 7 + (ri % 2) * 2, 5);
      var ridge = new THREE.Mesh(new THREE.BoxGeometry(15, rhgt, 28), ridgeMat);
      ridge.position.copy(rf.p).addScaledVector(rf.side, rside * rlat);
      ridge.position.y = rf.p.y + rhgt * 0.42;
      ridge.rotation.order = 'YXZ';
      ridge.rotation.y = rf.yaw;
      ridge.rotation.x = -(rf.pitch || 0);
      ridge.userData.lod = 'far';
      ridge.userData.noLod = ri < 4; // early both-flank mass always; far LODs
      ridge.userData.ignoreIntrusion = true;
      ridge.userData.qualityExtra = true;
      ridge.frustumCulled = ri >= 4;
      this.group.add(ridge);
      this.buildings.push(ridge);
      if (!this._qualityExtras) this._qualityExtras = [];
      this._qualityExtras.push(ridge);
      // Neon crown only early ridges (v376 FPS)
      if (ri < 4 && rsi === 0) {
        var capMat = ri % 2 ? neonCap : magCap;
        var cap = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.9, 32.4), capMat);
        cap.position.copy(ridge.position);
        cap.position.y += rhgt * 0.48;
        cap.rotation.order = 'YXZ';
        cap.rotation.y = rf.yaw;
        cap.rotation.x = -(rf.pitch || 0);
        cap.userData.lod = 'far';
        cap.userData.noLod = true;
        cap.userData.ignoreIntrusion = true;
        cap.userData.qualityExtra = true;
        cap.frustumCulled = false;
        this.group.add(cap);
        this.buildings.push(cap);
        this._qualityExtras.push(cap);
      }
      } // rsi paired sides
    } // ri ridgeTs
    // Far-ahead towers (both sides) — sit past wall top so they read in the vanishing point
    var spikeMat = new THREE.MeshBasicMaterial({ color: 0x14101c, fog: false });
    var beltMat = new THREE.MeshBasicMaterial({ color: 0xff2d55, fog: false });
    // v362: two far spikes (was 3+)
    var spikeTs = [0.28, 0.55];
    for (var si = 0; si < spikeTs.length; si++) {
      var sf = this._frame(spikeTs[si]);
      for (var ss = -1; ss <= 1; ss += 2) {
        var sh = 90 + (si % 3) * 16;
        var slat = this._lat(EDGE.tower + 14, 6);
        var spike = new THREE.Mesh(new THREE.BoxGeometry(14, sh, 14), spikeMat);
        spike.position.copy(sf.p).addScaledVector(sf.side, ss * slat);
        spike.position.y = sf.p.y + sh * 0.5;
        spike.userData.lod = 'far';
        spike.userData.noLod = false;
        spike.userData.ignoreIntrusion = true;
        spike.frustumCulled = true;
        this.group.add(spike);
        this.buildings.push(spike);
        var belt = new THREE.Mesh(new THREE.BoxGeometry(14.4, 1.2, 14.4), si % 2 ? neonCap : beltMat);
        belt.position.copy(spike.position);
        belt.position.y += sh * 0.22;
        belt.userData.lod = 'far';
        belt.userData.noLod = false;
        belt.userData.ignoreIntrusion = true;
        belt.frustumCulled = true;
        this.group.add(belt);
        this.buildings.push(belt);
      }
    }
  };

  /**
   * THE REACH coastal dress — water, salt flats, sea stacks, lighthouse.
   * MeshBasic only. Wave 5: denser near-horizon mass so chase isn't a black slab.
   */
  World.prototype._buildCoastDress = function () {
    var mid = this.path.curve.getPointAt(0.45);
    this._qualityExtras = this._qualityExtras || [];
    function trackExtra(self, o) {
      self._qualityExtras.push(o);
      o.userData.qualityExtra = true;
    }

    // Ocean — path-following strips so water is always beside the ribbon
    // v353: brighter teal so chase reads "sea" not black void
    var waterMat = new THREE.MeshBasicMaterial({
      color: 0x3a7088,
      transparent: true,
      opacity: 0.97,
      fog: true,
    });
    for (var wi = 0; wi < 14; wi++) {
      var wt = 0.03 + wi * 0.07;
      if (wt > 0.97) break;
      var wf = this._frame(wt);
      var water = new THREE.Mesh(new THREE.PlaneGeometry(260, 180), waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.copy(wf.p).addScaledVector(wf.side, -this._lat(EDGE.tower + 18, 45));
      water.position.y = -0.25;
      water.userData.ignoreIntrusion = true;
      water.userData.lod = 'far';
      water.userData.noLod = true;
      this.group.add(water);
      this.buildings.push(water);
    }

    // Sand shelf — continuous strip ocean-side
    var sandMat = new THREE.MeshBasicMaterial({ color: 0x4a3e2a, fog: true });
    for (var si0 = 0; si0 < 14; si0++) {
      var st0 = 0.03 + si0 * 0.07;
      if (st0 > 0.97) break;
      var sf0 = this._frame(st0);
      var sand = new THREE.Mesh(new THREE.PlaneGeometry(48, 90), sandMat);
      sand.rotation.x = -Math.PI / 2;
      sand.position.copy(sf0.p).addScaledVector(sf0.side, -this._lat(EDGE.tower + 4, 12));
      sand.position.y = -0.08;
      sand.userData.ignoreIntrusion = true;
      sand.userData.lod = 'far';
      sand.userData.noLod = true;
      this.group.add(sand);
      this.buildings.push(sand);
    }

    // Inland dirt shelf — path-following so land side isn't pure void (v338)
    var dirtMat = new THREE.MeshBasicMaterial({ color: 0x2c2418, fog: true });
    for (var di0 = 0; di0 < 16; di0++) {
      var dt0 = 0.03 + di0 * 0.06;
      if (dt0 > 0.97) break;
      var df0 = this._frame(dt0);
      var dirt = new THREE.Mesh(new THREE.PlaneGeometry(70, 110), dirtMat);
      dirt.rotation.x = -Math.PI / 2;
      dirt.position.copy(df0.p).addScaledVector(df0.side, this._lat(EDGE.tower + 6, 18));
      dirt.position.y = -0.06;
      dirt.userData.ignoreIntrusion = true;
      dirt.userData.lod = 'far';
      dirt.userData.noLod = true;
      this.group.add(dirt);
      this.buildings.push(dirt);
    }

    // Dusk horizon cards — v353: rolling cliffs / mesa, NOT city tower rects
    var hc = document.createElement('canvas');
    hc.width = 1024;
    hc.height = 256;
    var hctx = hc.getContext('2d');
    // Sky wash into dusk
    var skyGrad = hctx.createLinearGradient(0, 0, 0, 256);
    skyGrad.addColorStop(0, '#1a1020');
    skyGrad.addColorStop(0.55, '#2a1828');
    skyGrad.addColorStop(1, '#3a2820');
    hctx.fillStyle = skyGrad;
    hctx.fillRect(0, 0, 1024, 256);
    // Broad ridge silhouette (mountain/mesa slopes, not skyscrapers)
    function ridgePoly(color, baseY, peaks) {
      hctx.fillStyle = color;
      hctx.beginPath();
      hctx.moveTo(0, 256);
      hctx.lineTo(0, baseY);
      for (var pi = 0; pi < peaks.length; pi++) {
        hctx.lineTo(peaks[pi][0], peaks[pi][1]);
      }
      hctx.lineTo(1024, baseY + 20);
      hctx.lineTo(1024, 256);
      hctx.closePath();
      hctx.fill();
    }
    ridgePoly('#1e1814', 200, [
      [80, 170], [160, 130], [240, 155], [340, 100], [420, 140],
      [520, 90], [620, 145], [720, 110], [820, 150], [920, 120], [1024, 160]
    ]);
    ridgePoly('#2a2018', 210, [
      [0, 190], [120, 150], [220, 175], [300, 125], [400, 160],
      [500, 115], [600, 165], [700, 130], [800, 170], [900, 140], [1024, 180]
    ]);
    // Warm dusk belts (amber only — no cyan city neon)
    hctx.fillStyle = '#ff8a50';
    hctx.globalAlpha = 0.55;
    hctx.fillRect(0, 175, 1024, 5);
    hctx.fillStyle = '#ffc878';
    hctx.fillRect(0, 200, 1024, 3);
    hctx.globalAlpha = 0.25;
    hctx.fillStyle = '#ff6a30';
    hctx.fillRect(0, 140, 1024, 8);
    hctx.globalAlpha = 1;
    var htex = new THREE.CanvasTexture(hc);
    htex.needsUpdate = true;
    var hmat = new THREE.MeshBasicMaterial({
      map: htex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    this._horizonCards = this._horizonCards || [];
    // v353: wide low cards (ridge panoramas) — tall 88–150 cards read as skyscrapers
    for (var ci = 0; ci < 16; ci++) {
      var ct = 0.04 + (ci / 16) * 0.9;
      var cf = this._frame(ct);
      var cside = ci % 3 === 0 ? -1 : 1; // mostly inland, some ocean
      var clat = this._lat(EDGE.tower + 16 + (ci % 3) * 5, 4);
      var ch = 36 + (ci % 4) * 8; // low ridge
      var cw = 90 + (ci % 3) * 20; // wide
      var card = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), hmat);
      card.position.copy(cf.p).addScaledVector(cf.side, cside * clat);
      card.position.y = cf.p.y + ch * 0.42;
      card.lookAt(cf.p.x, card.position.y, cf.p.z);
      card.userData.horizonCard = true;
      card.userData.ignoreIntrusion = true;
      card.userData.lod = 'far';
      card.userData.noLod = true;
      card.frustumCulled = false;
      this.group.add(card);
      this.buildings.push(card);
      this._horizonCards.push(card);
    }

    // Inland cliff ridges — solid MeshBasic mass (chase must name something on land)
    // v353: low wide mesas (not tall tower boxes that read as city)
    var cliffMat = new THREE.MeshBasicMaterial({ color: 0x3a2a22, fog: false });
    var amberBelt = new THREE.MeshBasicMaterial({ color: 0xff8a50, fog: false });
    var cliffTs = [0.08, 0.14, 0.20, 0.28, 0.36, 0.46, 0.56, 0.66, 0.76, 0.86];
    for (var cri = 0; cri < cliffTs.length; cri++) {
      var crf = this._frame(cliffTs[cri]);
      var crh = 18 + (cri % 4) * 6; // was 48–96 tower-tall
      var crW = 28 + (cri % 3) * 10;
      var crD = 40 + (cri % 2) * 12;
      var crlat = this._lat(EDGE.tower + 12, 8);
      var cliff = new THREE.Mesh(new THREE.BoxGeometry(crW, crh, crD), cliffMat);
      cliff.position.copy(crf.p).addScaledVector(crf.side, crlat);
      cliff.position.y = crf.p.y + crh * 0.38;
      cliff.rotation.order = 'YXZ';
      cliff.rotation.y = crf.yaw + (cri % 3 - 1) * 0.15;
      cliff.rotation.x = -(crf.pitch || 0) * 0.5;
      cliff.userData.lod = 'far';
      cliff.userData.noLod = true;
      cliff.userData.ignoreIntrusion = true;
      cliff.frustumCulled = false;
      this.group.add(cliff);
      this.buildings.push(cliff);
      trackExtra(this, cliff);
      var belt = new THREE.Mesh(new THREE.BoxGeometry(crW + 0.8, 0.9, crD + 0.8), amberBelt);
      belt.position.copy(cliff.position);
      belt.position.y += crh * 0.42;
      belt.rotation.copy(cliff.rotation);
      belt.userData.lod = 'far';
      belt.userData.noLod = true;
      belt.userData.ignoreIntrusion = true;
      belt.frustumCulled = false;
      this.group.add(belt);
      this.buildings.push(belt);
      trackExtra(this, belt);
    }

    // Warm dusk haze — path-following (not a mid-map ring that misses chase FOV)
    var hazeMat = new THREE.MeshBasicMaterial({
      color: 0x5a3040,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    for (var hi = 0; hi < 12; hi++) {
      var ht = 0.06 + hi * 0.075;
      if (ht > 0.94) break;
      var hf = this._frame(ht);
      var hside = hi % 2 === 0 ? 1 : -1;
      var haze = new THREE.Mesh(new THREE.PlaneGeometry(140, 70), hazeMat);
      haze.position.copy(hf.p).addScaledVector(hf.side, hside * this._lat(EDGE.tower + 28, 10));
      haze.position.y = hf.p.y + 28;
      haze.lookAt(hf.p.x, haze.position.y * 0.5, hf.p.z);
      haze.userData.ignoreIntrusion = true;
      haze.userData.lod = 'far';
      haze.userData.noLod = true;
      this.group.add(haze);
      this.buildings.push(haze);
      trackExtra(this, haze);
    }

    // Sea stacks — ocean side mostly; stubby rock, not tower spires (v353)
    var n = 36;
    var rockGeo = new THREE.BoxGeometry(1, 1, 1);
    var rockMat = new THREE.MeshBasicMaterial({ color: 0x3a342e, fog: false });
    var rocks = new THREE.InstancedMesh(rockGeo, rockMat, n);
    rocks.userData.lod = 'far';
    rocks.userData.noLod = true;
    rocks.userData.ignoreIntrusion = true;
    rocks.frustumCulled = false;
    var dummy = new THREE.Object3D();
    var placed = 0;
    for (var i = 0; i < n; i++) {
      var t = 0.04 + (i / n) * 0.9;
      var f = this._frame(t);
      var side = (i % 5 === 0) ? 1 : -1; // mostly ocean (−)
      var lat = this._lat(EDGE.tower + 14 + (i % 4) * 5, 5);
      var h = 8 + (i % 5) * 4; // shorter
      var w = 6 + (i % 4) * 3; // wider
      dummy.position.copy(f.p).addScaledVector(f.side, side * lat);
      dummy.position.y = f.p.y + h * 0.4;
      dummy.rotation.set(0, f.yaw + (i % 3) * 0.4, 0);
      dummy.scale.set(w, h, w * 0.85);
      dummy.updateMatrix();
      rocks.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    rocks.count = placed;
    rocks.instanceMatrix.needsUpdate = true;
    this.group.add(rocks);
    this.buildings.push(rocks);
    trackExtra(this, rocks);

    // Inland silos — farm grain elevators, not skyline (v353: shorter)
    var siloGeo = new THREE.CylinderGeometry(2.2, 2.4, 1, 8);
    var siloMat = new THREE.MeshBasicMaterial({ color: 0x5a4a38, fog: false });
    var silos = new THREE.InstancedMesh(siloGeo, siloMat, 14);
    silos.userData.lod = 'far';
    silos.userData.noLod = true;
    silos.userData.ignoreIntrusion = true;
    silos.frustumCulled = false;
    var sp = 0;
    for (var si = 0; si < 14; si++) {
      var st = 0.08 + si * 0.06;
      if (st > 0.92) break;
      var sf = this._frame(st);
      var slat = this._lat(EDGE.billboard + 6 + (si % 3) * 4, 3);
      var sh = 9 + (si % 4) * 3;
      dummy.position.copy(sf.p).addScaledVector(sf.side, slat);
      dummy.position.y = sf.p.y + sh * 0.5;
      dummy.rotation.set(0, sf.yaw, 0);
      dummy.scale.set(1.35, sh, 1.35);
      dummy.updateMatrix();
      silos.setMatrixAt(sp, dummy.matrix);
      sp++;
    }
    silos.count = sp;
    silos.instanceMatrix.needsUpdate = true;
    this.group.add(silos);
    this.buildings.push(silos);
    trackExtra(this, silos);

    // Lighthouse — keep always (landmark, not density fluff)
    var lf = this._frame(0.38);
    var lightLat = this._lat(EDGE.tower + 20, 4);
    var base = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 4.0, 8, 10),
      new THREE.MeshBasicMaterial({ color: 0xd0c8b8, fog: false })
    );
    base.position.copy(lf.p).addScaledVector(lf.side, -lightLat);
    base.position.y = lf.p.y + 4;
    base.userData.ignoreIntrusion = true;
    base.userData.lod = 'far';
    base.userData.noLod = true;
    this.group.add(base);
    this.buildings.push(base);
    var shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.4, 32, 10),
      new THREE.MeshBasicMaterial({ color: 0xf0e8d8, fog: false })
    );
    shaft.position.copy(base.position);
    shaft.position.y += 18;
    shaft.userData.ignoreIntrusion = true;
    shaft.userData.lod = 'far';
    shaft.userData.noLod = true;
    this.group.add(shaft);
    this.buildings.push(shaft);
    var lantern = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 4.5, 5.5),
      new THREE.MeshBasicMaterial({ color: 0xffc878, fog: false })
    );
    lantern.position.copy(shaft.position);
    lantern.position.y += 18;
    lantern.userData.ignoreIntrusion = true;
    lantern.userData.lod = 'far';
    lantern.userData.noLod = true;
    this.group.add(lantern);
    this.buildings.push(lantern);
    var glow = new THREE.Mesh(
      new THREE.CircleGeometry(22, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffaa55,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
      })
    );
    glow.position.copy(lantern.position);
    glow.position.y += 1;
    glow.userData.ignoreIntrusion = true;
    glow.userData.lod = 'far';
    glow.userData.noLod = true;
    this.group.add(glow);

    // Dunes along ocean edge
    var duneMat = new THREE.MeshBasicMaterial({ color: 0x3a3220, fog: false });
    for (var di = 0; di < 16; di++) {
      var dt = 0.05 + di * 0.055;
      if (dt > 0.95) break;
      var df = this._frame(dt);
      var dune = new THREE.Mesh(new THREE.BoxGeometry(20, 4.5, 44), duneMat);
      dune.position.copy(df.p).addScaledVector(df.side, -this._lat(EDGE.tower + 5, 8));
      dune.position.y = df.p.y + 1.5;
      dune.rotation.y = df.yaw;
      dune.userData.ignoreIntrusion = true;
      dune.userData.lod = 'far';
      this.group.add(dune);
      this.buildings.push(dune);
      trackExtra(this, dune);
    }
  };

  /**
   * Shoulder street life — planters, bollards, parked silhouettes.
   * All setback-safe, MeshBasic only. Gives canyon "alive" without lights.
   */
  World.prototype._buildStreetLife = function () {
    var pathLen = this.path.length || 2000;
    // v415 Gauntlet: denser both-flank street life (MeshBasic; critic density gap)
    var n = Math.max(18, Math.min(40, Math.floor(pathLen / 55)));
    var potMat = new THREE.MeshBasicMaterial({ color: 0x2a2430 });
    var bushMat = new THREE.MeshBasicMaterial({ color: 0x1a4030 });
    var bollardMat = new THREE.MeshBasicMaterial({ color: 0xc8a040 });
    var carBodyMats = [
      new THREE.MeshBasicMaterial({ color: 0x1a2030 }),
      new THREE.MeshBasicMaterial({ color: 0x2a1820 }),
      new THREE.MeshBasicMaterial({ color: 0x182828 }),
      new THREE.MeshBasicMaterial({ color: 0x201828 }),
    ];
    var potGeo = new THREE.CylinderGeometry(0.35, 0.42, 0.55, 6);
    var bushGeo = new THREE.SphereGeometry(0.48, 6, 4);
    var bollardGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.85, 6);
    var carGeo = new THREE.BoxGeometry(1.7, 0.85, 3.6);
    var cabinGeo = new THREE.BoxGeometry(1.5, 0.55, 1.6);
    var coneGeo = new THREE.ConeGeometry(0.28, 0.7, 6);
    var coneMat = new THREE.MeshBasicMaterial({ color: 0xff6a20 });
    var binGeo = new THREE.BoxGeometry(0.55, 0.9, 0.55);
    var binMat = new THREE.MeshBasicMaterial({ color: 0x3a4550 });

    for (var i = 0; i < n; i++) {
      var t = (0.03 + (i + 0.5) / n * 0.94) % 1;
      var f = this._frame(t);
      // Both flanks every prop (was one side) — Heat density gap
      for (var ss = 0; ss < 2; ss++) {
        var sideSign = ss === 0 ? 1 : -1;
        var kind = (i + ss) % 6;

        if (kind <= 1) {
          var latP = this._lat(EDGE.furniture, 0.4);
          var pot = new THREE.Mesh(potGeo, potMat);
          pot.position.copy(f.p).addScaledVector(f.side, sideSign * latP);
          pot.position.y = f.p.y + 0.28;
          pot.userData.lod = 'detail';
          pot.userData.qualityExtra = true;
          this.group.add(pot);
          this.buildings.push(pot);
          var bush = new THREE.Mesh(bushGeo, bushMat);
          bush.position.copy(pot.position);
          bush.position.y += 0.55;
          bush.userData.lod = 'detail';
          bush.userData.qualityExtra = true;
          this.group.add(bush);
          this.buildings.push(bush);
        } else if (kind === 2) {
          var latB = this._lat(EDGE.furniture, 0.15);
          var tanB = this.path.curve.getTangentAt(t).normalize();
          for (var b = 0; b < 2; b++) {
            var bol = new THREE.Mesh(bollardGeo, bollardMat);
            bol.position.copy(f.p)
              .addScaledVector(f.side, sideSign * latB)
              .addScaledVector(tanB, (b - 0.5) * 1.4);
            bol.position.y = f.p.y + 0.42;
            bol.userData.lod = 'detail';
            bol.userData.qualityExtra = true;
            this.group.add(bol);
            this.buildings.push(bol);
          }
        } else if (kind === 3) {
          var latCone = this._lat(EDGE.furniture - 0.2, 0.2);
          var cone = new THREE.Mesh(coneGeo, coneMat);
          cone.position.copy(f.p).addScaledVector(f.side, sideSign * latCone);
          cone.position.y = f.p.y + 0.35;
          cone.userData.lod = 'detail';
          cone.userData.qualityExtra = true;
          this.group.add(cone);
          this.buildings.push(cone);
          var bin = new THREE.Mesh(binGeo, binMat);
          bin.position.copy(cone.position).addScaledVector(f.side, sideSign * 0.9);
          bin.position.y = f.p.y + 0.45;
          bin.userData.lod = 'detail';
          bin.userData.qualityExtra = true;
          this.group.add(bin);
          this.buildings.push(bin);
        } else {
          var latC = this._lat(EDGE.furniture + 0.6, 0.9);
          var yaw = f.yaw + (sideSign > 0 ? -0.08 : 0.08);
          var body = new THREE.Mesh(carGeo, carBodyMats[i % carBodyMats.length]);
          body.position.copy(f.p).addScaledVector(f.side, sideSign * latC);
          body.position.y = f.p.y + 0.45;
          body.rotation.y = yaw;
          body.userData.lod = 'building';
          body.userData.qualityExtra = true;
          this.group.add(body);
          this.buildings.push(body);
          var cabin = new THREE.Mesh(cabinGeo, carBodyMats[(i + 1) % carBodyMats.length]);
          cabin.position.copy(body.position);
          cabin.position.y += 0.55;
          cabin.position.addScaledVector(
            new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)),
            -0.2
          );
          cabin.rotation.y = yaw;
          cabin.userData.lod = 'building';
          cabin.userData.qualityExtra = true;
          this.group.add(cabin);
          this.buildings.push(cabin);
        }
      }
    }
  };

  /**
   * v416: soft haze cards on both flanks — kill black void without new lights.
   */
  World.prototype._buildFlankHaze = function () {
    if (this.theme === 'coast') return;
    var hazeMat = new THREE.MeshBasicMaterial({
      color: 0x1a2438, transparent: true, opacity: 0.38,
      depthWrite: false, side: THREE.DoubleSide, fog: true,
    });
    var hazeGeo = new THREE.PlaneGeometry(48, 28);
    var n = 14;
    for (var i = 0; i < n; i++) {
      var t = 0.05 + (i / n) * 0.9;
      var f = this._frame(t);
      for (var s = -1; s <= 1; s += 2) {
        var haze = new THREE.Mesh(hazeGeo, hazeMat);
        var lat = this._lat(EDGE.tower + 14 + (i % 3) * 3, 3);
        haze.position.copy(f.p).addScaledVector(f.side, s * lat);
        haze.position.y = f.p.y + 10;
        haze.lookAt(f.p.x, haze.position.y, f.p.z);
        haze.userData.lod = 'far';
        haze.userData.ignoreIntrusion = true;
        haze.userData.qualityExtra = true;
        haze.frustumCulled = true;
        this.group.add(haze);
        this.buildings.push(haze);
        if (!this._qualityExtras) this._qualityExtras = [];
        this._qualityExtras.push(haze);
      }
    }
  };

  // ─── Lamps (outside curb) — dense poles, few real lights ─────────────

  World.prototype._buildLamps = function () {
    var curve = this.path.curve;
    var pathLen = this.path.length || 2000;
    // Visual density every ~28 m; real PointLights still pooled ≤3
    var n = Math.max(24, Math.min(52, Math.floor(pathLen / 28)));
    var poleMat = M.pole || new THREE.MeshBasicMaterial({ color: 0x2a2834 });
    var headMat = new THREE.MeshBasicMaterial({ color: 0xffcc88 });
    var glowMat = new THREE.MeshBasicMaterial({
      color: 0xffb060,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    var poolMat = new THREE.MeshBasicMaterial({
      color: 0xffa060,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    var poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 6.5, 5);
    var headGeo = new THREE.BoxGeometry(0.5, 0.12, 0.35);
    var glowGeo = new THREE.SphereGeometry(0.85, 6, 4);
    var poolGeo = new THREE.CircleGeometry(4.0, 10);

    // Pool of 3 reusable PointLights (nearest lamps only)
    this._lampLightPool = this._lampLightPool || [];
    while (this._lampLightPool.length < 3) {
      var pl = new THREE.PointLight(0xffb060, 0, 28, 1.7);
      pl.visible = false;
      this.group.add(pl);
      this._lampLightPool.push(pl);
    }

    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n;
      var p = curve.getPointAt(t);
      var tan = curve.getTangentAt(t).normalize();
      var side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      var s = i % 2 === 0 ? 1 : -1;
      var lat = this._lat(EDGE.lamp, 0.1);

      var pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.copy(p).addScaledVector(side, s * lat);
      pole.position.y = p.y + 3.25;
      pole.userData.lod = 'detail';
      this.group.add(pole);
      this.buildings.push(pole);

      var head = new THREE.Mesh(headGeo, headMat);
      head.position.copy(pole.position);
      head.position.y += 3.3;
      head.position.addScaledVector(side, -s * 0.35);
      head.rotation.y = Math.atan2(-s * side.x, -s * side.z);
      this.group.add(head);

      // Fake glow blob + ground pool (cheap "light" without PointLight per pole)
      var glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(head.position);
      this.group.add(glow);

      var pool = new THREE.Mesh(poolGeo, poolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.copy(p).addScaledVector(side, s * (lat - 0.8));
      pool.position.y = p.y + 0.12;
      pool.userData.lod = 'detail';
      this.group.add(pool);
      this.buildings.push(pool);

      this.lamps.push({
        group: pole,
        light: null,
        headPos: head.position.clone(),
        t: t,
        baseI: 3.8,
      });
    }
  };

  // ─── Start / finish gates (posts outside lanes, banner high) ─────────

  World.prototype._buildGates = function () {
    var curve = this.path.curve;
    var rh = this.roadHalf;
    var self = this;

    function gate(t, label, col, faceBack) {
      // faceBack=true → banner faces lower path % (START toward spawn)
      var p = curve.getPointAt(t);
      var tan = curve.getTangentAt(t).normalize();
      var side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      var yaw = Math.atan2(tan.x, tan.z);
      var postH = 9.2;
      var isFinishGate = /FINISH/i.test(label || '');
      var isStartGate = /START/i.test(label || '');
      var gateGrp = new THREE.Group();
      gateGrp.userData.gate = true;
      if (isFinishGate) gateGrp.userData.isFinish = true;
      if (isStartGate) gateGrp.userData.isStart = true;
      function tagGate(obj) {
        obj.userData.gate = true;
        if (isFinishGate) obj.userData.isFinish = true;
        if (isStartGate) obj.userData.isStart = true;
        gateGrp.add(obj);
      }
      var postMat = new THREE.MeshBasicMaterial({ color: 0x12141c });
      var neonMat = new THREE.MeshBasicMaterial({ color: col });
      var neonSoft = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: 0.45,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      var baseMat = new THREE.MeshBasicMaterial({ color: 0x1a1e28 });
      var hex = '#' + new THREE.Color(col).getHexString();
      var span = rh * 2 + 5.5;

      for (var s = -1; s <= 1; s += 2) {
        var baseX = rh + 2.0;
        // Pedestal
        var ped = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 1.4), baseMat);
        ped.position.copy(p).addScaledVector(side, s * baseX);
        ped.position.y = p.y + 0.35;
        ped.userData.lod = 'detail';
        tagGate(ped);
        self.buildings.push(ped);

        // Thick post
        var post = new THREE.Mesh(new THREE.BoxGeometry(0.75, postH, 0.75), postMat);
        post.position.copy(p).addScaledVector(side, s * baseX);
        post.position.y = p.y + postH * 0.5 + 0.35;
        post.userData.lod = 'detail';
        tagGate(post);
        self.buildings.push(post);

        // Neon verticals (inner + outer)
        for (var nv = 0; nv < 2; nv++) {
          var wrap = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, postH * 0.92, 0.14),
            neonMat
          );
          wrap.position.copy(post.position);
          wrap.position.addScaledVector(side, -s * (0.42 + nv * 0.08));
          wrap.position.x += (nv ? 0.12 : -0.12) * Math.cos(yaw);
          wrap.userData.lod = 'detail';
          tagGate(wrap);
        }
        // Soft glow column
        var colGlow = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, postH * 0.85, 0.55),
          neonSoft
        );
        colGlow.position.copy(post.position);
        colGlow.userData.lod = 'detail';
        tagGate(colGlow);
      }

      // Double crossbar (outer + inner neon)
      var barY = p.y + postH + 0.35;
      var bar = new THREE.Mesh(new THREE.BoxGeometry(span, 0.55, 0.55), neonMat);
      bar.position.copy(p);
      bar.position.y = barY;
      bar.rotation.y = yaw;
      bar.userData.lod = 'detail';
      tagGate(bar);
      self.buildings.push(bar);

      var bar2 = new THREE.Mesh(new THREE.BoxGeometry(span * 0.98, 0.22, 0.22), neonSoft);
      bar2.position.copy(p);
      bar2.position.y = barY - 0.55;
      bar2.rotation.y = yaw;
      bar2.userData.lod = 'detail';
      tagGate(bar2);

      // Corner cubes on bar ends
      for (var ce = -1; ce <= 1; ce += 2) {
        var corner = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), neonMat);
        corner.position.copy(p).addScaledVector(side, ce * (span * 0.48));
        corner.position.y = barY;
        corner.userData.lod = 'detail';
        tagGate(corner);
      }

      // Ground threshold strip across road (drive over — flat paint, no block)
      var thresh = new THREE.Mesh(
        new THREE.BoxGeometry(rh * 2 - 0.8, 0.04, 1.2),
        neonMat
      );
      thresh.position.copy(p);
      thresh.position.y = p.y + 0.12;
      thresh.rotation.y = yaw;
      thresh.userData.isRoadSurface = true;
      thresh.userData.lod = 'detail';
      tagGate(thresh);

      var threshGlow = new THREE.Mesh(
        new THREE.BoxGeometry(rh * 2 - 0.5, 0.02, 2.4),
        neonSoft
      );
      threshGlow.position.copy(p);
      threshGlow.position.y = p.y + 0.11;
      threshGlow.rotation.y = yaw;
      threshGlow.userData.isRoadSurface = true;
      tagGate(threshGlow);

      // Crisp banner
      var canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 256;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#05060c';
      ctx.fillRect(0, 0, 1024, 256);
      ctx.strokeStyle = hex;
      ctx.lineWidth = 12;
      ctx.strokeRect(14, 14, 996, 228);
      ctx.fillStyle = hex;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(22, 22, 980, 212);
      ctx.globalAlpha = 1;
      // Subtitle strip
      ctx.font = 'bold 28px monospace, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = hex;
      ctx.globalAlpha = 0.7;
      ctx.fillText(faceBack ? 'NEON CIRCUIT' : 'ESCAPE', 512, 48);
      ctx.globalAlpha = 1;
      ctx.font = 'bold 118px monospace, Consolas, "Courier New", monospace';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = hex;
      ctx.shadowBlur = 28;
      ctx.fillText(label, 512, 150);
      ctx.shadowBlur = 0;
      var tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      tex.flipY = true;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      var banner = new THREE.Mesh(
        new THREE.PlaneGeometry(span - 1.2, 3.0),
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          side: THREE.FrontSide,
          depthWrite: false,
        })
      );
      banner.position.copy(p);
      banner.position.y = barY - 2.0;
      banner.rotation.y = faceBack ? yaw + Math.PI : yaw;
      banner.userData.lod = 'sign';
      tagGate(banner);
      self.buildings.push(banner);

      var back = new THREE.Mesh(
        new THREE.BoxGeometry(span - 0.8, 3.3, 0.18),
        new THREE.MeshBasicMaterial({ color: 0x080a12 })
      );
      back.position.copy(banner.position);
      back.rotation.y = banner.rotation.y;
      var faceN = new THREE.Vector3(Math.sin(banner.rotation.y), 0, Math.cos(banner.rotation.y));
      back.position.addScaledVector(faceN, -0.14);
      back.userData.lod = 'sign';
      tagGate(back);
      self.buildings.push(back);

      self.group.add(gateGrp);
      if (isFinishGate) {
        self._finishGate = gateGrp;
        self._finishGateMats = [];
        gateGrp.traverse(function (o) {
          if (o.isMesh && o.material) {
            var mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach(function (m) {
              if (m && self._finishGateMats.indexOf(m) < 0) self._finishGateMats.push(m);
            });
          }
        });
      }
    }

    gate(0.025, 'START', 0x00e5ff, true);
    gate(0.975, 'FINISH', 0xff2d55, false);

    // Original parole strip ads — side of road only, never driveline (v297 copy pass)
    if (this.path && this.path.curve) {
      var ads = [
        'PAROLE PAID IN LAPS',
        'WARDEN SEES LEADERS',
        'SCRAP BUYS TOMORROW',
        'FINISH OR BECOME FOOTAGE',
        'NIGHT OWES YOU NOTHING',
      ];
      for (var ai = 0; ai < ads.length; ai++) {
        var at = 0.16 + ai * 0.15;
        if (at > 0.88) break;
        var ap = this.path.curve.getPointAt(at);
        var atan = this.path.curve.getTangentAt(at).normalize();
        var aside = new THREE.Vector3(-atan.z, 0, atan.x);
        var apos = ap.clone().addScaledVector(aside, (this.roadHalf || 11) + 6.5 * (ai % 2 ? 1 : -1));
        apos.y = ap.y + 3.2;
        var ac = document.createElement('canvas');
        ac.width = 512; ac.height = 128;
        var ax = ac.getContext('2d');
        ax.fillStyle = '#0a0810';
        ax.fillRect(0, 0, 512, 128);
        ax.strokeStyle = ai % 2 ? '#ff2d55' : '#00e5ff';
        ax.lineWidth = 5;
        ax.strokeRect(6, 6, 500, 116);
        ax.fillStyle = '#1a1020';
        ax.fillRect(12, 12, 488, 104);
        ax.fillStyle = '#ff2d55';
        ax.font = 'bold 26px monospace';
        ax.textAlign = 'center';
        ax.fillText(ads[ai], 256, 58);
        ax.fillStyle = '#8a7a88';
        ax.font = 'bold 14px monospace';
        ax.fillText('NIGHT CIRCUIT · OVERLORD MEDIA', 256, 96);
        var atex = new THREE.CanvasTexture(ac);
        atex.needsUpdate = true;
        var board = new THREE.Mesh(
          new THREE.PlaneGeometry(8.2, 2.05),
          new THREE.MeshBasicMaterial({ map: atex, transparent: true, side: THREE.DoubleSide, depthWrite: false })
        );
        board.position.copy(apos);
        board.lookAt(ap.x, apos.y, ap.z);
        board.userData.lod = 'sign';
        board.userData.paroleAd = true;
        this.group.add(board);
        this.buildings.push(board);
      }
    }
  };

  /** Cyan pulse on whole FINISH arch group when player nears gate (v284) */
  World.prototype.pulseFinish = function (t) {
    if (!this.group) return;
    var pulse = 0.55 + 0.45 * Math.sin((t || 0) * 7);
    var cyanPulse = 0.5 + 0.5 * Math.sin((t || 0) * 9);
    var bright = 0.55 + cyanPulse * 0.45;
    // Prefer tagged finish gate group (whole arch)
    var root = this._finishGate || this.group;
    var wholeArch = !!this._finishGate;
    root.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      if (!wholeArch && !(o.userData && (o.userData.isFinish || o.userData.gate))) return;
      var mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(function (m) {
        if (!m) return;
        if (m.map) {
          m.transparent = true;
          m.opacity = 0.75 + pulse * 0.25;
        }
        if (m.color && !m.map) {
          // Neon bars/posts/threshold → cyan pulse
          m.color.setRGB(0.15 + cyanPulse * 0.35, 0.8 + cyanPulse * 0.2, 1.0);
          if (m.opacity != null) {
            m.transparent = true;
            m.opacity = bright;
          }
        }
      });
    });
  };

  /**
   * Safety net after dress: hide any solid whose volume still occupies
   * open asphalt in the driving height band. Road paint / flat decals kept.
   */
  World.prototype._assertDrivelineClear = function () {
    var path = this.path;
    var rh = this.roadHalf || 11.5;
    var clearR = rh - 0.35;
    if (!path || !path.curve) return;
    var hidden = 0;
    var curve = path.curve;
    var self = this;
    this.group.updateMatrixWorld(true);

    var probes = [];
    this.group.traverse(function (obj) {
      if (!obj.isMesh || !obj.visible || !obj.geometry) return;
      if (obj.isInstancedMesh) return;
      if (obj.userData && (obj.userData.isRoadSurface || obj.userData.noLod || obj.userData.ignoreIntrusion)) return;
      var box = new THREE.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      var size = box.getSize(new THREE.Vector3());
      if (size.y < 0.35) return;
      if (size.x > 100 || size.z > 100) return;
      // Additive light volumes
      var mat = obj.material;
      if (mat && mat.transparent && mat.opacity < 0.3 &&
          mat.blending === THREE.AdditiveBlending) return;
      probes.push({ obj: obj, box: box });
    });

    var nSamples = Math.min(180, Math.max(80, Math.floor((path.length || 2000) / 16)));
    var laterals = [0, -clearR * 0.5, clearR * 0.5, -clearR * 0.88, clearR * 0.88];
    var origin = new THREE.Vector3();
    var killed = {};

    for (var si = 0; si < nSamples; si++) {
      var t = si / Math.max(nSamples - 1, 1);
      var p = curve.getPointAt(t);
      var tan = curve.getTangentAt(t).normalize();
      var side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      for (var li = 0; li < laterals.length; li++) {
        origin.copy(p).addScaledVector(side, laterals[li]);
        origin.y = p.y + 0.65;
        for (var mi = 0; mi < probes.length; mi++) {
          var pr = probes[mi];
          if (killed[pr.obj.id]) continue;
          if (pr.box.max.y < p.y + 0.25) continue;
          if (pr.box.min.y > p.y + 6.0) continue; // drive-under OK
          if (pr.box.containsPoint(origin)) {
            killed[pr.obj.id] = true;
            var target = pr.obj;
            if (target.parent && target.parent.isGroup && target.parent !== self.group) {
              target = target.parent;
            }
            target.visible = false;
            target.traverse(function (ch) {
              ch.visible = false;
              if (!ch.userData) ch.userData = {};
              ch.userData._hiddenForDriveline = true;
            });
            hidden++;
          }
        }
      }
    }

    this._sanitizeStats = { pushed: 0, hidden: hidden, rayKilled: 0, note: 'assert-v210' };
    if (typeof console !== 'undefined' && console.info) {
      console.info('[assertDrivelineClear]', this._sanitizeStats);
    }
  };

  // ─── Runtime API ─────────────────────────────────────────────────────

  World.prototype.setDensity = function (level) {
    var low = level === 'medium' || level === 'low';
    this._qualityLow = low;
    var cards = this._horizonCards || [];
    for (var i = 0; i < cards.length; i++) {
      if (cards[i]) cards[i].visible = !low;
    }
    // Wave 5: hide tagged extras on LOW (city ridges + coast stacks/haze)
    var extras = this._qualityExtras || [];
    for (var j = 0; j < extras.length; j++) {
      if (extras[j]) extras[j].visible = !low;
    }
    // Belt-and-suspenders: any mesh flagged qualityExtra / horizonCard
    if (this.group) {
      this.group.traverse(function (o) {
        if (!o || !o.userData) return;
        if (o.userData.horizonCard || o.userData.qualityExtra) {
          o.visible = !low;
        }
      });
    }
  };

  World.prototype.nearest = function (pos, hintProgress) {
    if (!this.path) return null;
    return nearestOnPath(pos, this.path, hintProgress);
  };

  World.prototype.updateLOD = function (camPos, time) {
    var t = time != null ? time : (performance.now() * 0.001);
    // Sky always follows camera + animates clouds/stars
    if (this._skyMesh && camPos) {
      this._skyMesh.position.set(camPos.x, camPos.y, camPos.z);
    }
    if (this._skyMat && this._skyMat.uniforms) {
      if (this._skyMat.uniforms.uTime) this._skyMat.uniforms.uTime.value = t;
      // Pin moon to upper-right of current view so it's always in chase FOV
      // (world-fixed moon was often behind the car on this course)
      var cam = (typeof GAME !== 'undefined' && GAME.camera) ? GAME.camera : null;
      if (cam && this._skyMat.uniforms.uMoonDir) {
        if (!this._moonTmpF) {
          this._moonTmpF = new THREE.Vector3();
          this._moonTmpR = new THREE.Vector3();
          this._moonTmpU = new THREE.Vector3();
        }
        cam.getWorldDirection(this._moonTmpF);
        this._moonTmpU.set(0, 1, 0);
        this._moonTmpR.crossVectors(this._moonTmpF, this._moonTmpU).normalize();
        // re-orthogonalize up
        this._moonTmpU.crossVectors(this._moonTmpR, this._moonTmpF).normalize();
        // Upper-center of chase FOV (high, slightly right) — hard to miss
        this._moonTmpF.multiplyScalar(0.55)
          .addScaledVector(this._moonTmpU, 0.78)
          .addScaledVector(this._moonTmpR, 0.22)
          .normalize();
        this._skyMat.uniforms.uMoonDir.value.copy(this._moonTmpF);
      }
    }
    // Drift cloud cards slowly around path mid
    if (this._cloudCards && this._cloudCards.length) {
      var mid = this.path && this.path.curve
        ? this.path.curve.getPointAt(0.5)
        : new THREE.Vector3();
      for (var ci = 0; ci < this._cloudCards.length; ci++) {
        var card = this._cloudCards[ci];
        if (!card || !card.userData) continue;
        var ang = card.userData._cloudAng + t * 0.008 * (ci % 2 ? 1 : -1);
        var rad = card.userData._cloudRad;
        card.position.x = mid.x + Math.sin(ang) * rad;
        card.position.z = mid.z + Math.cos(ang) * rad;
        card.position.y = card.userData._cloudBaseY + Math.sin(t * 0.15 + card.userData._cloudPhase) * 3;
        card.lookAt(mid.x, card.position.y * 0.5, mid.z);
      }
    }

    if (this._overviewMode) {
      this.showAllLayers();
      return;
    }
    var cx = camPos.x, cy = camPos.y, cz = camPos.z;

    // LOD with hysteresis — wider ranges + show/hide gap kills hard pop-in.
    // (Not a PC issue: old cutoffs were 95/180/320 with instant visible=false.)
    // showDist = turn ON when closer; hideDist = turn OFF when farther.
    // v391: tighter non-results bands after cards 19 FOV mass
    // v379: results orbit expands bands so hero frame isn't asphalt void
    var resultsPad = !!this._resultsLodBoost;
    function lodBand(lod, isSidewalk) {
      if (resultsPad) {
        if (isSidewalk) return { show: 110, hide: 140 };
        if (lod === 'far') return { show: 240, hide: 300 };
        if (lod === 'detail' || lod === 'window' || lod === 'sign') return { show: 80, hide: 110 };
        return { show: 160, hide: 210 };
      }
      if (isSidewalk) return { show: 62, hide: 88 };
      if (lod === 'far') return { show: 145, hide: 195 };
      if (lod === 'detail' || lod === 'window' || lod === 'sign') return { show: 40, hide: 60 };
      return { show: 88, hide: 120 }; // building / frontage / towers
    }

    this._lodTick = ((this._lodTick | 0) + 1) % (resultsPad ? 1 : 3);
    var parity = this._lodTick;
    for (var i = 0; i < this.buildings.length; i++) {
      // Stagger: update 1/3 of list per frame (full scan on results pad)
      if (!resultsPad && (i % 3) !== parity) continue;
      var b = this.buildings[i];
      if (!b || !b.position) continue;
      if (!b.userData) b.userData = {};
      if (b.userData._hiddenForDriveline) {
        b.visible = false;
        continue;
      }
      if (b.userData.noLod) continue;
      var dx = b.position.x - cx, dy = (b.position.y || 0) - cy, dz = b.position.z - cz;
      // Avoid sqrt — compare squared distances
      var d2 = dx * dx + dy * dy + dz * dz;
      var lod = b.userData.lod || 'building';
      var band = lodBand(lod, !!b.userData.isSidewalk);
      var show2 = band.show * band.show;
      var hide2 = band.hide * band.hide;
      var on = b.userData._lodOn;
      if (on == null) {
        on = d2 < show2;
      } else if (on) {
        if (d2 > hide2) on = false;
      } else {
        if (d2 < show2) on = true;
      }
      b.userData._lodOn = on;
      b.visible = on;
    }

    // At most 2 real street PointLights — pick nearest lamp heads
    var pool = this._lampLightPool || [];
    if (pool.length && this.lamps.length) {
      var best = [];
      for (var j = 0; j < this.lamps.length; j++) {
        var L = this.lamps[j];
        var gp = (L.headPos) || (L.group && L.group.position);
        if (!gp) continue;
        var lx = gp.x - cx, lz = gp.z - cz;
        var d2 = lx * lx + lz * lz;
        if (d2 > 90 * 90) continue;
        best.push({ d2: d2, pos: gp, baseI: L.baseI || 3.6 });
      }
      best.sort(function (a, b) { return a.d2 - b.d2; });
      for (var pi = 0; pi < pool.length; pi++) {
        var light = pool[pi];
        if (pi < best.length) {
          light.visible = true;
          light.intensity = best[pi].baseI * (best[pi].d2 > 55 * 55 ? 0.55 : 1);
          light.position.copy(best[pi].pos);
        } else {
          light.visible = false;
          light.intensity = 0;
        }
      }
    }
  };

  World.prototype.showAllLayers = function () {
    for (var i = 0; i < this.buildings.length; i++) {
      if (this.buildings[i]) this.buildings[i].visible = true;
    }
    for (var j = 0; j < this.lamps.length; j++) {
      var L = this.lamps[j];
      if (L.group) L.group.visible = true;
      if (L.light) {
        L.light.visible = true;
        L.light.intensity = L.baseI > 0 ? L.baseI * 0.6 : 0;
      }
    }
  };

  World.prototype.getBounds = function (opts) {
    opts = opts || {};
    var pathOnly = opts.pathOnly !== false;
    var pad = opts.pad != null ? opts.pad : (pathOnly ? 45 : 20);
    var box = new THREE.Box3();
    var empty = true;
    if (this.path && this.path.points) {
      for (var i = 0; i < this.path.points.length; i++) {
        box.expandByPoint(this.path.points[i]);
        empty = false;
      }
    }
    if (!pathOnly) {
      for (var j = 0; j < this.buildings.length; j++) {
        var b = this.buildings[j];
        if (b && b.position) {
          box.expandByPoint(b.position);
          empty = false;
        }
      }
    }
    if (empty) {
      box.set(new THREE.Vector3(-100, -5, -100), new THREE.Vector3(100, 50, 100));
    } else if (pad > 0) {
      box.expandByScalar(pad);
    }
    var size = new THREE.Vector3();
    var center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    return { box: box, size: size, center: center, pathOnly: pathOnly };
  };

  World.prototype.layerReport = function () {
    var counts = { none: 0, detail: 0, window: 0, sign: 0, building: 0, mid: 0, far: 0, other: 0 };
    var intrusions = [];
    var rh = this.roadHalf || 11.5;
    var path = this.path;
    for (var i = 0; i < this.buildings.length; i++) {
      var b = this.buildings[i];
      if (!b) continue;
      var lod = (b.userData && b.userData.lod) || 'none';
      if (counts[lod] != null) counts[lod]++;
      else counts.other++;
      if (!path || !b.position) continue;
      if (b.userData && (b.userData.ignoreIntrusion || b.userData.isRoadSurface)) continue;
      if (b.position.y > 6) continue; // high banners OK
      var near = nearestOnPath(b.position, path);
      if (!near) continue;
      if (near.dist < rh - 0.75 && b.position.y < near.point.y + 5) {
        intrusions.push({
          lod: lod,
          dist: Math.round(near.dist * 10) / 10,
          name: b.name || lod,
          x: Math.round(b.position.x),
          z: Math.round(b.position.z),
          y: Math.round(b.position.y),
        });
      }
    }
    intrusions.sort(function (a, b) { return a.dist - b.dist; });
    var report = {
      theme: this.theme,
      version: 'edge-v211',
      pathLen: path && path.length ? Math.round(path.length) : 0,
      sidewalks: this._sidewalkCount || 0,
      buildingList: this.buildings.length,
      lamps: this.lamps ? this.lamps.length : 0,
      lodCounts: counts,
      intrusionCount: intrusions.length,
      worstIntrusions: intrusions.slice(0, 15),
    };
    console.info('[World.layerReport]', report);
    return report;
  };

  GAME.World = World;
  GAME.nearestOnPath = nearestOnPath;
})();
