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
   * Flat Y — elevation comes later once lateral clearance is sacred.
   */
  function buildPath() {
    var pts = [];
    function add(x, y, z) { pts.push(new THREE.Vector3(x, y, z)); }

    // Start straight
    add(0, 0, 0);
    add(0, 0, -120);
    add(0, 0, -240);
    // Soft right into a long curve
    add(40, 0, -360);
    add(140, 0, -460);
    add(280, 0, -520);
    add(420, 0, -500);
    add(540, 0, -420);
    // Straight run
    add(620, 0, -300);
    add(660, 0, -160);
    add(660, 0, -20);
    // S-bend (gentle)
    add(620, 0, 100);
    add(520, 0, 200);
    add(400, 0, 260);
    add(280, 0, 300);
    add(180, 0, 380);
    add(140, 0, 500);
    // Climbing arc (visual interest, still flat for now)
    add(160, 0, 640);
    add(260, 0, 760);
    add(400, 0, 840);
    add(560, 0, 880);
    add(700, 0, 860);
    add(820, 0, 780);
    // Final sweep to finish
    add(900, 0, 640);
    add(940, 0, 480);
    add(960, 0, 320);
    add(980, 0, 160);
    add(1000, 0, 0);

    var curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.22);
    var pathLen = curve.getLength();
    // Smooth enough ribbon without exploding mesh count (~240 max)
    var nSamples = Math.max(140, Math.min(240, Math.floor(pathLen / 12)));
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
      var win = Math.max(12, Math.floor(last * 0.08));
      lo = Math.max(0, center - win);
      hi = Math.min(last, center + win);
      for (var i = lo; i <= hi; i++) {
        var d = pos.distanceToSquared(pts[i]);
        if (d < best) { best = d; bi = i; }
      }
      if (best > 80 * 80) {
        best = 1e12;
        lo = 0; hi = last;
      } else {
        lo = Math.max(0, bi - 4);
        hi = Math.min(last, bi + 4);
      }
    } else {
      lo = 0; hi = last;
    }

    if (lo === 0 && hi === last) {
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
    if (!candidates.length) candidates.push(projSeg(0, 1));

    var bestP = candidates[0];
    for (var c = 1; c < candidates.length; c++) {
      if (candidates[c].distSq < bestP.distSq) bestP = candidates[c];
    }

    var tangent = bestP.ab.clone().normalize();
    var progress = last > 0 ? (bestP.i0 + bestP.t) / last : 0;
    if (!closed) progress = U.clamp(progress, 0, 1);
    if (hintProgress != null && isFinite(hintProgress) && !closed) {
      if (progress < hintProgress - 0.04 && bestP.distSq < 25 * 25) {
        progress = Math.max(progress, hintProgress - 0.002);
      }
    }
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
    this.path = buildPath();

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
    // Roadside dress — all placement uses EDGE setbacks + path frame
    this._sidewalkCount = 0;
    this._buildSidewalks();
    this._buildEdgeAmbient(); // glow + soft lights so curb/sidewalk read at night
    this._buildFrontage();
    this._buildNearTowers();
    // First ~10s of drive: dense canyon + landmark (do after base dress)
    this._buildOpeningCorridor();
    this._buildStreetLife(); // shoulder clutter (setback-safe, unlit)
    this._buildBillboards();
    this._buildFarSkyline();
    this._buildLamps();
    this._buildGates();
    // Final safety net: hide anything that still occupies open asphalt
    this._assertDrivelineClear();

    // Start / finish anchors
    var curve = this.path.curve;
    this.startPos = curve.getPointAt(0).clone();
    this.finishPos = curve.getPointAt(1).clone();

    scene.add(this.group);
    if (typeof console !== 'undefined' && console.info) {
      console.info('[World v253 canyon+road+arches]', {
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
    var tan = curve.getTangentAt(t).normalize();
    var side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    var yaw = Math.atan2(tan.x, tan.z);
    return { p: p, tan: tan, side: side, yaw: yaw, t: t };
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
        '  col += uGlowA * band * (0.55 + 0.45 * sin(az * 1.5 + 0.4)) * 0.55;',
        '  col += uGlowB * band * (0.55 + 0.45 * cos(az * 1.3 - 0.8)) * 0.4;',
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
    var col = mapDef.groundColor != null ? mapDef.groundColor : 0x0c0e14;
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(2400, 2400),
      new THREE.MeshBasicMaterial({ color: col })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.15;
    ground.userData.ignoreIntrusion = true;
    ground.userData.lod = 'far';
    this.group.add(ground);
    this.buildings.push(ground);
  };

  // ─── Road (ONLY solid on the driveline) ───────────────────────────────

  /** Shared night asphalt map — blue-grey grit so road ≠ black void */
  World.prototype._roadTextures = function () {
    if (this._roadTex) return this._roadTex;
    var S = 256;
    var c = document.createElement('canvas');
    c.width = c.height = S;
    var ctx = c.getContext('2d');
    // Base: cool charcoal-blue (reads against pure black sky/ground)
    ctx.fillStyle = '#2a3448';
    ctx.fillRect(0, 0, S, S);
    // Slight violet mid wash (Heat wet-night)
    var g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, 'rgba(40, 80, 120, 0.22)');
    g.addColorStop(0.5, 'rgba(60, 40, 90, 0.12)');
    g.addColorStop(1, 'rgba(30, 70, 100, 0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    // Grit / aggregate
    for (var i = 0; i < 4200; i++) {
      var v = 30 + ((i * 17) % 55);
      var cool = (i % 3 === 0) ? 18 : 0;
      ctx.fillStyle = 'rgba(' + (v - 5) + ',' + (v + 4) + ',' + (v + 12 + cool) + ',0.55)';
      ctx.fillRect((i * 47) % S, (i * 91) % S, 1 + (i % 2), 1 + (i % 3));
    }
    // Faint lane-scale wear streaks
    ctx.strokeStyle = 'rgba(180, 200, 230, 0.06)';
    ctx.lineWidth = 2;
    for (var s = 0; s < 8; s++) {
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

  World.prototype._buildRoad = function () {
    var pts = this.path.points;
    var rh = this.roadHalf;
    var closed = !!this.path.closed;
    var segCount = closed ? pts.length : Math.max(0, pts.length - 1);
    var tex = this._roadTextures();

    // Textured asphalt — still MeshBasic (no light tax), but not pure black
    var roadMat = new THREE.MeshBasicMaterial({
      map: tex.albedo,
      color: 0xc8d4e8, // lift midtones so map reads at night
    });
    // Brighter paint + cyan edge so asphalt | paint | curb separate
    var lineY = new THREE.MeshBasicMaterial({ color: 0xffe066 });
    var lineW = new THREE.MeshBasicMaterial({ color: 0xf0f4ff });
    var edgeCyan = new THREE.MeshBasicMaterial({
      color: 0x40e0ff,
      transparent: true,
      opacity: 0.85,
    });
    var wetSheen = new THREE.MeshBasicMaterial({
      color: 0x6088b0,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    var curbMat = new THREE.MeshBasicMaterial({ color: 0xa8b0c0 });

    var roadGeo = new THREE.BoxGeometry(rh * 2, 0.14, 1);
    var curbGeo = new THREE.BoxGeometry(0.58, 0.4, 1);
    var ylineGeo = new THREE.BoxGeometry(0.11, 0.022, 1);
    var dashGeo = new THREE.BoxGeometry(0.1, 0.018, 1);
    var edgeGeo = new THREE.BoxGeometry(0.16, 0.022, 1);
    var sheenGeo = new THREE.BoxGeometry(rh * 1.7, 0.01, 1);
    var chevGeo = new THREE.BoxGeometry(1.8, 0.028, 0.36);

    for (var i = 0; i < segCount; i++) {
      var a = pts[i];
      var b = pts[closed ? ((i + 1) % pts.length) : (i + 1)];
      var mid = a.clone().add(b).multiplyScalar(0.5);
      var dir = new THREE.Vector3().subVectors(b, a);
      var len = dir.length();
      if (len < 0.05) continue;
      dir.normalize();
      var yaw = Math.atan2(dir.x, dir.z);
      var pitch = Math.asin(U.clamp(dir.y, -1, 1));
      var sideN = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      var seg = new THREE.Mesh(roadGeo, roadMat);
      seg.position.copy(mid);
      seg.position.y = mid.y + 0.02;
      seg.rotation.order = 'YXZ';
      seg.rotation.y = yaw;
      seg.rotation.x = -pitch;
      seg.scale.z = len + 0.35;
      seg.userData.isRoadSurface = true;
      this.group.add(seg);

      // Soft wet sheen strip (separates road from black void)
      if (i % 2 === 0) {
        var sheen = new THREE.Mesh(sheenGeo, wetSheen);
        sheen.position.copy(mid);
        sheen.position.y = mid.y + 0.095;
        sheen.rotation.copy(seg.rotation);
        sheen.scale.z = len * 0.9;
        sheen.userData.isRoadSurface = true;
        this.group.add(sheen);
      }

      // Center double-yellow every seg (stronger lane read)
      if (i % 2 === 0) {
        for (var yl = -1; yl <= 1; yl += 2) {
          var yline = new THREE.Mesh(ylineGeo, lineY);
          yline.position.copy(mid).addScaledVector(sideN, yl * 0.14);
          yline.position.y = mid.y + 0.1;
          yline.rotation.copy(seg.rotation);
          yline.scale.z = Math.min(len * 0.6, 3.0);
          yline.userData.isRoadSurface = true;
          this.group.add(yline);
        }
        for (var lane = -1; lane <= 1; lane += 2) {
          var dash = new THREE.Mesh(dashGeo, lineW);
          dash.position.copy(mid).addScaledVector(sideN, lane * (rh * 0.38));
          dash.position.y = mid.y + 0.1;
          dash.rotation.copy(seg.rotation);
          dash.scale.z = Math.min(len * 0.42, 2.2);
          dash.userData.isRoadSurface = true;
          this.group.add(dash);
        }
      }

      // Continuous cyan edge lines (asphalt boundary)
      for (var s = -1; s <= 1; s += 2) {
        var eline = new THREE.Mesh(edgeGeo, edgeCyan);
        eline.position.copy(mid).addScaledVector(sideN, s * (rh - 0.45));
        eline.position.y = mid.y + 0.105;
        eline.rotation.copy(seg.rotation);
        eline.scale.z = len + 0.2;
        eline.userData.isRoadSurface = true;
        this.group.add(eline);
      }

      // Curbs every segment — light concrete band
      for (var s2 = -1; s2 <= 1; s2 += 2) {
        var curb = new THREE.Mesh(curbGeo, curbMat);
        curb.position.copy(mid).addScaledVector(sideN, s2 * (rh + 0.42));
        curb.position.y = mid.y + 0.18;
        curb.rotation.copy(seg.rotation);
        curb.scale.z = len + 0.4;
        curb.userData.lod = 'detail';
        this.group.add(curb);
      }

      if (i % 8 === 0) {
        var chev = new THREE.Mesh(chevGeo, lineY);
        chev.position.copy(mid);
        chev.position.y = mid.y + 0.1;
        chev.rotation.copy(seg.rotation);
        chev.userData.isRoadSurface = true;
        this.group.add(chev);
      }
    }
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
    var pts = this.path.points;
    var closed = !!this.path.closed;
    var segCount = closed ? pts.length : Math.max(0, pts.length - 1);
    var tex = this._sidewalkTextures();

    var walkW = 3.2;
    var slabH = 0.28;
    var curbH = 0.42;
    var curbW = 0.32;
    var halfW = walkW * 0.5;
    var slabW = walkW - curbW;

    // Unlit + map — reads at night without multi-light Standard cost
    var deckMat = new THREE.MeshBasicMaterial({
      map: tex.albedo,
      color: 0xffffff,
      transparent: false,
    });
    var curbMat = new THREE.MeshBasicMaterial({
      color: 0x8a90a0,
    });

    // Unit geos stretched along Z per segment
    var deckGeo = new THREE.BoxGeometry(slabW, slabH, 1);
    var curbGeo = new THREE.BoxGeometry(curbW, curbH, 1);

    var count = 0;
    // Stride 1 (coarser path already) — 2 meshes/side vs old 7–12
    for (var i = 0; i < segCount; i++) {
      var a = pts[i];
      var b = pts[closed ? ((i + 1) % pts.length) : (i + 1)];
      var mid = a.clone().add(b).multiplyScalar(0.5);
      var dir = new THREE.Vector3().subVectors(b, a);
      var len = dir.length();
      if (len < 0.08) continue;
      dir.normalize();
      var yaw = Math.atan2(dir.x, dir.z);
      var pitch = Math.asin(U.clamp(dir.y, -1, 1));
      var sideN = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
      var segLen = len + 0.25;
      var lat = this._lat(EDGE.sidewalk, halfW);

      for (var s = -1; s <= 1; s += 2) {
        var g = new THREE.Group();
        g.name = 'Sidewalk';
        g.userData.isSidewalk = true;
        g.userData.lod = 'building';

        var deck = new THREE.Mesh(deckGeo, deckMat);
        deck.position.set(curbW * 0.5, slabH * 0.5, 0);
        deck.scale.z = segLen;
        deck.userData.isSidewalk = true;
        g.add(deck);

        var curb = new THREE.Mesh(curbGeo, curbMat);
        curb.position.set(-halfW + curbW * 0.5, curbH * 0.5 - 0.02, 0);
        curb.scale.z = segLen + 0.05;
        curb.userData.isSidewalk = true;
        g.add(curb);

        g.position.copy(mid).addScaledVector(sideN, s * lat);
        g.position.y = mid.y + 0.02;
        g.rotation.order = 'YXZ';
        g.rotation.y = yaw;
        g.rotation.x = -pitch;
        g.scale.x = s;

        this.group.add(g);
        this.buildings.push(g);
        count++;
      }
    }
    this._sidewalkCount = count;
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

    // Dense-ish emissive strips — still NO PointLights (reads as wet neon curb)
    var nStrips = Math.max(36, Math.min(90, Math.floor(pathLen / 12)));
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
    var wallMat = new THREE.MeshBasicMaterial({ color: 0x16141f });
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
    var towerMat = new THREE.MeshBasicMaterial({ color: 0x12101c });
    var winMat = new THREE.MeshBasicMaterial({ color: 0xffc878 });
    var awningMat = new THREE.MeshBasicMaterial({ color: 0x100c14 });

    /**
     * Canyon span helper — continuous walls along path progress [tA, tB].
     * dense=true: tall full-detail (opening + finish approach)
     * dense=false: slightly shorter, fewer window bands (mid-course budget)
     */
    var self = this;
    function buildCanyonSpan(tA, tB, nSeg, dense) {
      var wallDepth = dense ? 4.5 : 3.8;
      var wallH = dense ? 11 : 8.5;
      var halfD = wallDepth * 0.5;
      var openEdge = dense ? 2.2 : 2.6;
      var span = Math.max(0.02, tB - tA);
      for (var side = 0; side < 2; side++) {
        var sideSign = side === 0 ? 1 : -1;
        for (var i = 0; i < nSeg; i++) {
          var t0 = tA + (i / nSeg) * span;
          var t1 = tA + ((i + 1) / nSeg) * span;
          var f0 = self._frame(t0);
          var f1 = self._frame(t1);
          var mid = f0.p.clone().add(f1.p).multiplyScalar(0.5);
          var along = f0.p.distanceTo(f1.p) + 0.45;
          var yaw = f0.yaw;
          var lat = self._lat(openEdge, halfD);
          var ni = (i + side * 2 + Math.floor(tA * 20)) % neonMats.length;

          var mass = new THREE.Mesh(
            new THREE.BoxGeometry(wallDepth, wallH, along),
            wallMat
          );
          mass.position.copy(mid).addScaledVector(f0.side, sideSign * lat);
          mass.position.y = mid.y + wallH * 0.48;
          mass.rotation.y = yaw;
          mass.userData.lod = 'building';
          mass.userData.opening = dense;
          self.group.add(mass);
          self.buildings.push(mass);

          var faceLat = self._lat(openEdge, 0.06);
          var glass = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, dense ? 2.4 : 2.0, along * 0.88),
            glassMats[(i + side) % glassMats.length]
          );
          glass.position.copy(mid).addScaledVector(f0.side, sideSign * faceLat);
          glass.position.y = mid.y + 1.5;
          glass.rotation.y = yaw;
          glass.userData.lod = 'building';
          self.group.add(glass);
          self.buildings.push(glass);

          var neon = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.32, along * 0.9),
            neonMats[ni]
          );
          neon.position.copy(mid).addScaledVector(f0.side, sideSign * faceLat);
          neon.position.y = mid.y + 3.3;
          neon.rotation.y = yaw;
          neon.userData.lod = 'detail';
          self.group.add(neon);
          self.buildings.push(neon);

          if (dense || i % 2 === 0) {
            var halo = new THREE.Mesh(
              new THREE.BoxGeometry(0.08, 0.55, along * 0.92),
              haloMats[ni]
            );
            halo.position.copy(neon.position);
            halo.position.addScaledVector(f0.side, -sideSign * 0.08);
            halo.rotation.y = yaw;
            halo.userData.lod = 'detail';
            self.group.add(halo);
          }

          var win1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, dense ? 1.3 : 1.0, along * 0.85),
            winMat
          );
          win1.position.copy(mid).addScaledVector(f0.side, sideSign * faceLat);
          win1.position.y = mid.y + (dense ? 5.8 : 5.0);
          win1.rotation.y = yaw;
          win1.userData.lod = 'window';
          self.group.add(win1);
          self.buildings.push(win1);

          if (dense) {
            var win2 = new THREE.Mesh(
              new THREE.BoxGeometry(0.1, 1.1, along * 0.8),
              glassMats[(i + 1) % glassMats.length]
            );
            win2.position.copy(mid).addScaledVector(f0.side, sideSign * faceLat);
            win2.position.y = mid.y + 8.2;
            win2.rotation.y = yaw;
            win2.userData.lod = 'window';
            self.group.add(win2);
            self.buildings.push(win2);

            var awn = new THREE.Mesh(
              new THREE.BoxGeometry(1.1, 0.1, along * 0.9),
              awningMat
            );
            awn.position.copy(mid).addScaledVector(f0.side, sideSign * (faceLat - 0.55));
            awn.position.y = mid.y + 2.85;
            awn.rotation.y = yaw;
            awn.userData.lod = 'detail';
            self.group.add(awn);
          }
        }
      }
    }

    // Dense open + mid canyon + dense finish approach (full course walls)
    buildCanyonSpan(0.0, 0.16, 40, true);
    buildCanyonSpan(0.16, 0.88, 52, false);
    buildCanyonSpan(0.88, 1.0, 18, true);

    // Landmark towers — open + mid accents + finish approach
    var landmarkTs = [0.035, 0.055, 0.08, 0.11, 0.35, 0.55, 0.75, 0.92, 0.96];
    for (var li = 0; li < landmarkTs.length; li++) {
      var lt = landmarkTs[li];
      var lf = this._frame(lt);
      for (var ls = -1; ls <= 1; ls += 2) {
        var th = 16 + (li % 4) * 4 + U.seeded(li * 3 + ls + 2) * 10;
        var td = 5.5 + (li % 3) * 0.5;
        var ta = 6.5 + (li % 3);
        var tLat = this._lat(EDGE.tower * 0.75, td * 0.5);
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
        wall.position.set(0, 1.8, 0);
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
        g.lookAt(f.p.x, g.position.y, f.p.z);
        g.userData.lod = 'building';
        this.group.add(g);
        this.buildings.push(g);
      }
    }
  };

  // ─── Near towers (mid-rise row, path-aligned) ─────────────────────────

  World.prototype._buildNearTowers = function () {
    var pathLen = this.path.length || 2000;
    var n = Math.max(16, Math.min(32, Math.floor(pathLen / 100)));
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
    var n = 8;
    var ads = [
      { bg: '#0a1020', a: '#ff2d55', b: '#00e5ff', t: 'NIGHT RUN' },
      { bg: '#120810', a: '#ff9f1c', b: '#ff2d88', t: 'HEAT' },
      { bg: '#081218', a: '#a78bfa', b: '#39ff14', t: 'FREEDOM' },
      { bg: '#100a08', a: '#ff6b35', b: '#00e5ff', t: 'WARDEN' },
      { bg: '#0c0814', a: '#f472b6', b: '#ffc857', t: 'TWISTED' },
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
   * Shoulder street life — planters, bollards, parked silhouettes.
   * All setback-safe, MeshBasic only. Gives canyon "alive" without lights.
   */
  World.prototype._buildStreetLife = function () {
    var pathLen = this.path.length || 2000;
    var n = Math.max(16, Math.min(40, Math.floor(pathLen / 70)));
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

    for (var i = 0; i < n; i++) {
      var t = (0.04 + (i + 0.5) / n * 0.92) % 1;
      var f = this._frame(t);
      var sideSign = i % 2 === 0 ? 1 : -1;
      var kind = i % 5; // 0-1 planter, 2 bollard pair, 3-4 parked car

      if (kind <= 1) {
        var latP = this._lat(EDGE.furniture, 0.4);
        var pot = new THREE.Mesh(potGeo, potMat);
        pot.position.copy(f.p).addScaledVector(f.side, sideSign * latP);
        pot.position.y = f.p.y + 0.28;
        pot.userData.lod = 'detail';
        this.group.add(pot);
        this.buildings.push(pot);
        var bush = new THREE.Mesh(bushGeo, bushMat);
        bush.position.copy(pot.position);
        bush.position.y += 0.55;
        bush.userData.lod = 'detail';
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
          this.group.add(bol);
          this.buildings.push(bol);
        }
      } else {
        // Parked car silhouette — shoulder only, never on asphalt
        var latC = this._lat(EDGE.furniture + 0.6, 0.9);
        var yaw = f.yaw + (sideSign > 0 ? -0.08 : 0.08);
        var body = new THREE.Mesh(carGeo, carBodyMats[i % carBodyMats.length]);
        body.position.copy(f.p).addScaledVector(f.side, sideSign * latC);
        body.position.y = f.p.y + 0.45;
        body.rotation.y = yaw;
        body.userData.lod = 'building';
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
        this.group.add(cabin);
        this.buildings.push(cabin);
      }
    }
  };

  // ─── Lamps (outside curb) — dense poles, few real lights ─────────────

  World.prototype._buildLamps = function () {
    var curve = this.path.curve;
    var pathLen = this.path.length || 2000;
    // Visual density every ~40 m alternating sides; real PointLights still pooled
    var n = Math.max(16, Math.min(40, Math.floor(pathLen / 42)));
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
    var glowGeo = new THREE.SphereGeometry(0.65, 6, 4);
    var poolGeo = new THREE.CircleGeometry(3.2, 10);

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
        self.group.add(ped);
        self.buildings.push(ped);

        // Thick post
        var post = new THREE.Mesh(new THREE.BoxGeometry(0.75, postH, 0.75), postMat);
        post.position.copy(p).addScaledVector(side, s * baseX);
        post.position.y = p.y + postH * 0.5 + 0.35;
        post.userData.lod = 'detail';
        self.group.add(post);
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
          self.group.add(wrap);
        }
        // Soft glow column
        var colGlow = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, postH * 0.85, 0.55),
          neonSoft
        );
        colGlow.position.copy(post.position);
        colGlow.userData.lod = 'detail';
        self.group.add(colGlow);
      }

      // Double crossbar (outer + inner neon)
      var barY = p.y + postH + 0.35;
      var bar = new THREE.Mesh(new THREE.BoxGeometry(span, 0.55, 0.55), neonMat);
      bar.position.copy(p);
      bar.position.y = barY;
      bar.rotation.y = yaw;
      bar.userData.lod = 'detail';
      self.group.add(bar);
      self.buildings.push(bar);

      var bar2 = new THREE.Mesh(new THREE.BoxGeometry(span * 0.98, 0.22, 0.22), neonSoft);
      bar2.position.copy(p);
      bar2.position.y = barY - 0.55;
      bar2.rotation.y = yaw;
      bar2.userData.lod = 'detail';
      self.group.add(bar2);

      // Corner cubes on bar ends
      for (var ce = -1; ce <= 1; ce += 2) {
        var corner = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), neonMat);
        corner.position.copy(p).addScaledVector(side, ce * (span * 0.48));
        corner.position.y = barY;
        corner.userData.lod = 'detail';
        self.group.add(corner);
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
      self.group.add(thresh);

      var threshGlow = new THREE.Mesh(
        new THREE.BoxGeometry(rh * 2 - 0.5, 0.02, 2.4),
        neonSoft
      );
      threshGlow.position.copy(p);
      threshGlow.position.y = p.y + 0.11;
      threshGlow.rotation.y = yaw;
      threshGlow.userData.isRoadSurface = true;
      self.group.add(threshGlow);

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
      self.group.add(banner);
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
      self.group.add(back);
      self.buildings.push(back);
    }

    gate(0.025, 'START', 0x00e5ff, true);
    gate(0.975, 'FINISH', 0xff2d55, false);
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
      if (obj.userData && obj.userData.isRoadSurface) return;
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

    var nSamples = Math.min(500, Math.max(160, Math.floor((path.length || 2000) / 8)));
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
    function lodBand(lod, isSidewalk) {
      // Tighter than v244 — still no hard pop at race speed
      if (isSidewalk) return { show: 140, hide: 190 };
      if (lod === 'far') return { show: 320, hide: 400 };
      if (lod === 'detail' || lod === 'window' || lod === 'sign') return { show: 100, hide: 140 };
      return { show: 200, hide: 260 }; // building / frontage / towers
    }

    for (var i = 0; i < this.buildings.length; i++) {
      var b = this.buildings[i];
      if (!b || !b.position) continue;
      if (!b.userData) b.userData = {};
      if (b.userData._hiddenForDriveline) {
        b.visible = false;
        continue;
      }
      var dx = b.position.x - cx, dy = (b.position.y || 0) - cy, dz = b.position.z - cz;
      var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      var lod = b.userData.lod || 'building';
      var band = lodBand(lod, !!b.userData.isSidewalk);
      var on = b.userData._lodOn;
      if (on == null) {
        on = d < band.show;
      } else if (on) {
        if (d > band.hide) on = false;
      } else {
        if (d < band.show) on = true;
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
