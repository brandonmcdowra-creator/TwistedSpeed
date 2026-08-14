/**
 * Shared materials + procedural textures.
 * NFS wet-night asphalt, dense window atlases, rich neon IBL equirect.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});
  var C = null;
  var pool = null;

  function makeWetAsphaltMaps() {
    var S = 1024;
    var c = document.createElement('canvas');
    c.width = S; c.height = S;
    var ctx = c.getContext('2d');

    // Base wet charcoal with blue-black cast
    var g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#0a0c12');
    g.addColorStop(0.25, '#12161e');
    g.addColorStop(0.55, '#0e1218');
    g.addColorStop(0.8, '#141820');
    g.addColorStop(1, '#0c0e14');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);

    // Aggregate noise
    for (var i = 0; i < 48000; i++) {
      var x = Math.random() * S;
      var y = Math.random() * S;
      var a = 0.015 + Math.random() * 0.05;
      ctx.fillStyle = Math.random() > 0.55
        ? 'rgba(190,210,230,' + a + ')'
        : 'rgba(12,10,18,' + (a * 1.8) + ')';
      ctx.fillRect(x, y, 1 + Math.random() * 2.5, 1 + Math.random() * 2);
    }

    // Expansion joints (longitudinal)
    for (var j = 0; j < 14; j++) {
      var jx = (j / 14) * S + Math.random() * 8;
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1 + Math.random();
      ctx.beginPath();
      ctx.moveTo(jx, 0);
      ctx.lineTo(jx + (Math.random() - 0.5) * 12, S);
      ctx.stroke();
    }

    // Oil streaks / wet specular hints in albedo
    for (var s = 0; s < 80; s++) {
      var sx = Math.random() * S;
      ctx.strokeStyle = 'rgba(140,180,220,' + (0.04 + Math.random() * 0.09) + ')';
      ctx.lineWidth = 2 + Math.random() * 6;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx + (Math.random() - 0.5) * 40, S);
      ctx.stroke();
    }

    // NO neon wash bands in albedo — those freeze as abstract red/cyan road slabs

    // Manhole rings
    for (var mh = 0; mh < 6; mh++) {
      var mx = 80 + Math.random() * (S - 160);
      var my = 80 + Math.random() * (S - 160);
      ctx.strokeStyle = 'rgba(60,70,90,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(mx, my, 18 + Math.random() * 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    var albedo = new THREE.CanvasTexture(c);
    albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
    albedo.repeat.set(4, 28);
    albedo.anisotropy = 8;
    if (THREE.SRGBColorSpace) albedo.colorSpace = THREE.SRGBColorSpace;

    // Roughness map: low roughness = wet mirror patches
    var rc = document.createElement('canvas');
    rc.width = 512; rc.height = 512;
    var rctx = rc.getContext('2d');
    rctx.fillStyle = '#a0a0a0';
    rctx.fillRect(0, 0, 512, 512);
    for (var ri = 0; ri < 200; ri++) {
      var rx = Math.random() * 512, ry = Math.random() * 512;
      var rr = 20 + Math.random() * 80;
      var rg = rctx.createRadialGradient(rx, ry, 0, rx, ry, rr);
      rg.addColorStop(0, 'rgba(30,30,30,0.85)');
      rg.addColorStop(1, 'rgba(160,160,160,0)');
      rctx.fillStyle = rg;
      rctx.fillRect(rx - rr, ry - rr, rr * 2, rr * 2);
    }
    // lane polish strips
    for (var ls = 0; ls < 8; ls++) {
      rctx.fillStyle = 'rgba(40,40,40,0.5)';
      rctx.fillRect(0, ls * 64 + 20, 512, 8 + Math.random() * 10);
    }
    var rough = new THREE.CanvasTexture(rc);
    rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
    rough.repeat.set(4, 28);

    // Normal map (simple height from noise)
    var nc = document.createElement('canvas');
    nc.width = 512; nc.height = 512;
    var nctx = nc.getContext('2d');
    var img = nctx.createImageData(512, 512);
    for (var py = 0; py < 512; py++) {
      for (var px = 0; px < 512; px++) {
        var h1 = (Math.sin(px * 0.15) + Math.cos(py * 0.12)) * 0.5
          + Math.sin(px * 0.4 + py * 0.3) * 0.15
          + (Math.random() - 0.5) * 0.08;
        var nx = 0.5 + h1 * 0.12;
        var ny = 0.5 + Math.sin(px * 0.08 + py * 0.1) * 0.08;
        var i4 = (py * 512 + px) * 4;
        img.data[i4] = Math.floor(nx * 255);
        img.data[i4 + 1] = Math.floor(ny * 255);
        img.data[i4 + 2] = 255;
        img.data[i4 + 3] = 255;
      }
    }
    nctx.putImageData(img, 0, 0);
    var normal = new THREE.CanvasTexture(nc);
    normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
    normal.repeat.set(4, 28);

    return { albedo: albedo, rough: rough, normal: normal };
  }

  function makeWindowEmissiveMap() {
    var c = document.createElement('canvas');
    c.width = 256;
    c.height = 512;
    var ctx = c.getContext('2d');
    // Dark facade base — prevents solid yellow bloom slabs
    ctx.fillStyle = '#0a0810';
    ctx.fillRect(0, 0, 256, 512);
    // mullions
    ctx.fillStyle = '#1a1820';
    for (var mx = 0; mx < 256; mx += 24) ctx.fillRect(mx, 0, 2, 512);
    for (var my = 0; my < 512; my += 22) ctx.fillRect(0, my, 256, 2);

    var cols = 10, rows = 22;
    var cw = 256 / cols, ch = 512 / rows;
    for (var r = 0; r < rows; r++) {
      for (var col = 0; col < cols; col++) {
        // More dark windows so facade is grid of lights, not a yellow wall
        if (Math.random() < 0.42) continue;
        var warm = Math.random() > 0.5;
        var a = 0.35 + Math.random() * 0.4;
        if (Math.random() < 0.06) {
          ctx.fillStyle = Math.random() > 0.5
            ? 'rgba(0,200,255,' + (a * 0.7) + ')'
            : 'rgba(255,45,85,' + (a * 0.65) + ')';
        } else {
          ctx.fillStyle = warm
            ? 'rgba(255,200,120,' + a + ')'
            : 'rgba(160,200,255,' + (a * 0.85) + ')';
        }
        var padX = 5 + Math.random() * 2;
        var padY = 4 + Math.random() * 2;
        ctx.fillRect(col * cw + padX, r * ch + padY, cw - padX * 2, ch - padY * 2);
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeFacadeAlbedo() {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 512;
    var ctx = c.getContext('2d');
    // Mid-grey concrete (black silhouettes fail AAA night stills)
    ctx.fillStyle = '#3a3848';
    ctx.fillRect(0, 0, 256, 512);
    for (var y = 0; y < 512; y += 40) {
      for (var x = 0; x < 256; x += 56) {
        var v = 58 + Math.floor(Math.random() * 36);
        ctx.fillStyle = 'rgb(' + v + ',' + (v - 2) + ',' + (v + 10) + ')';
        ctx.fillRect(x + 1, y + 1, 54, 38);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.strokeRect(x + 1, y + 1, 54, 38);
        // lit interior spill suggestion in some panels
        if (Math.random() > 0.55) {
          ctx.fillStyle = 'rgba(255,200,120,' + (0.08 + Math.random() * 0.12) + ')';
          ctx.fillRect(x + 6, y + 8, 44, 26);
        }
      }
    }
    // dirt streaks
    for (var d = 0; d < 50; d++) {
      ctx.fillStyle = 'rgba(0,0,0,' + (0.04 + Math.random() * 0.1) + ')';
      ctx.fillRect(Math.random() * 256, 0, 2 + Math.random() * 4, 512);
    }
    // subtle cool edge light
    ctx.fillStyle = 'rgba(80,120,180,0.08)';
    ctx.fillRect(0, 0, 8, 512);
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * 8–12 unique facade canvas pairs so neighboring towers don't share the same
   * window grid. Each variant varies mullion spacing, occupancy, dirt, balcony
   * ledges, and mid-height sign bands. Deterministic per-index seed.
   * Returns array of { map, emissiveMap, material }.
   */
  function makeFacadeVariants(envMap) {
    var N = 10;
    var out = [];
    // base concrete tints (cool / warm / blue-grey / dusty / slate …)
    var bases = [
      [58, 56, 72], [62, 58, 54], [48, 54, 68], [70, 66, 60],
      [52, 50, 62], [64, 60, 70], [44, 48, 58], [68, 62, 56],
      [54, 58, 64], [60, 52, 58],
    ];
    function seedR(i, k) {
      var x = Math.sin(i * 127.1 + k * 311.7 + 19.3) * 43758.5453;
      return x - Math.floor(x);
    }
    for (var vi = 0; vi < N; vi++) {
      var cols = 6 + (vi % 5);           // 6–10
      var rows = 14 + ((vi * 3) % 9);    // 14–22
      var mullX = 2 + (vi % 4);          // mullion thickness px
      var mullY = 1 + (vi % 3);
      var darkRate = 0.28 + seedR(vi, 1) * 0.28; // unlit window rate
      var balEvery = 3 + (vi % 4);       // balcony line every N floors
      var signBand = 0.35 + seedR(vi, 2) * 0.35; // mid-height sign strip (0–1 of H)
      var base = bases[vi % bases.length];
      var W = 256, H = 512;
      var cw = W / cols, ch = H / rows;

      // ——— Albedo ———
      var ac = document.createElement('canvas');
      ac.width = W; ac.height = H;
      var actx = ac.getContext('2d');
      actx.fillStyle = 'rgb(' + base[0] + ',' + base[1] + ',' + base[2] + ')';
      actx.fillRect(0, 0, W, H);
      // panel / window grid
      for (var r = 0; r < rows; r++) {
        for (var col = 0; col < cols; col++) {
          var rr = seedR(vi, r * 17 + col * 3);
          var v = base[0] - 8 + Math.floor(rr * 28);
          actx.fillStyle = 'rgb(' + v + ',' + (v - 2 + (vi % 3)) + ',' + (v + 8) + ')';
          actx.fillRect(col * cw + 1, r * ch + 1, cw - 2, ch - 2);
          // interior spill on some panels
          if (rr > 0.48) {
            var sa = 0.06 + seedR(vi, r + col) * 0.12;
            actx.fillStyle = seedR(vi, r * 9 + col) > 0.55
              ? 'rgba(255,200,120,' + sa + ')'
              : 'rgba(140,180,220,' + sa + ')';
            actx.fillRect(col * cw + 4, r * ch + 4, cw - 8, ch - 8);
          }
        }
      }
      // mullions (variable spacing via col/row grid)
      actx.fillStyle = 'rgba(18,16,24,0.85)';
      for (var mx = 0; mx <= cols; mx++) {
        actx.fillRect(Math.floor(mx * cw) - (mullX >> 1), 0, mullX, H);
      }
      for (var my = 0; my <= rows; my++) {
        actx.fillRect(0, Math.floor(my * ch) - (mullY >> 1), W, mullY);
      }
      // balcony ledge lines
      actx.fillStyle = 'rgba(10,10,14,0.55)';
      for (var br = balEvery; br < rows; br += balEvery) {
        var by = Math.floor(br * ch);
        actx.fillRect(0, by - 1, W, 3);
        actx.fillStyle = 'rgba(90,95,110,0.25)';
        actx.fillRect(0, by + 2, W, 1);
        actx.fillStyle = 'rgba(10,10,14,0.55)';
      }
      // mid-height sign band (darker strip + subtle accent)
      var sy0 = Math.floor(signBand * H) - 10;
      actx.fillStyle = 'rgba(8,8,14,0.72)';
      actx.fillRect(0, sy0, W, 20);
      var accent = vi % 3 === 0
        ? 'rgba(255,45,85,0.18)'
        : (vi % 3 === 1 ? 'rgba(0,220,255,0.16)' : 'rgba(255,160,40,0.14)');
      actx.fillStyle = accent;
      actx.fillRect(8, sy0 + 5, W - 16, 10);
      // dirt streaks / weathering
      var dirtN = 30 + (vi % 5) * 8;
      for (var d = 0; d < dirtN; d++) {
        var dx = seedR(vi, d + 40) * W;
        actx.fillStyle = 'rgba(0,0,0,' + (0.03 + seedR(vi, d + 80) * 0.1) + ')';
        actx.fillRect(dx, 0, 1 + seedR(vi, d + 90) * 4, H);
      }
      // edge cool rim
      actx.fillStyle = 'rgba(80,120,180,0.07)';
      actx.fillRect(0, 0, 6, H);

      var albedo = new THREE.CanvasTexture(ac);
      albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
      albedo.anisotropy = 4;
      if (THREE.SRGBColorSpace) albedo.colorSpace = THREE.SRGBColorSpace;

      // ——— Emissive window map (matches grid) ———
      var ec = document.createElement('canvas');
      ec.width = W; ec.height = H;
      var ectx = ec.getContext('2d');
      ectx.fillStyle = '#0a0810';
      ectx.fillRect(0, 0, W, H);
      ectx.fillStyle = '#14121a';
      for (var emx = 0; emx <= cols; emx++) {
        ectx.fillRect(Math.floor(emx * cw) - (mullX >> 1), 0, mullX, H);
      }
      for (var emy = 0; emy <= rows; emy++) {
        ectx.fillRect(0, Math.floor(emy * ch) - (mullY >> 1), W, mullY);
      }
      for (var er = 0; er < rows; er++) {
        for (var ecol = 0; ecol < cols; ecol++) {
          if (seedR(vi, er * 31 + ecol * 7) < darkRate) continue;
          var warm = seedR(vi, er * 5 + ecol) > 0.48;
          var a = 0.32 + seedR(vi, er + ecol * 11) * 0.45;
          if (seedR(vi, er * 13 + ecol) < 0.07) {
            ectx.fillStyle = seedR(vi, ecol) > 0.5
              ? 'rgba(0,200,255,' + (a * 0.7) + ')'
              : 'rgba(255,45,85,' + (a * 0.65) + ')';
          } else {
            ectx.fillStyle = warm
              ? 'rgba(255,200,120,' + a + ')'
              : 'rgba(160,200,255,' + (a * 0.85) + ')';
          }
          var padX = 3 + seedR(vi, er * 2 + ecol) * 3;
          var padY = 2 + seedR(vi, er + ecol * 2) * 3;
          ectx.fillRect(ecol * cw + padX, er * ch + padY, cw - padX * 2, ch - padY * 2);
        }
      }
      // faint sign-band glow
      ectx.fillStyle = accent.replace(/[\d.]+\)$/, '0.22)');
      ectx.fillRect(8, sy0 + 5, W - 16, 10);

      var emissiveMap = new THREE.CanvasTexture(ec);
      emissiveMap.wrapS = emissiveMap.wrapT = THREE.RepeatWrapping;
      if (THREE.SRGBColorSpace) emissiveMap.colorSpace = THREE.SRGBColorSpace;

      // tint multiplier so cool/warm kits still read differently
      var tint = vi % 3 === 0 ? 0xffffff : (vi % 3 === 1 ? 0xf0f6ff : 0xfff4e8);
      var mat = new THREE.MeshStandardMaterial({
        map: albedo,
        color: tint,
        roughness: 0.68 + seedR(vi, 99) * 0.1,
        metalness: 0.16 + seedR(vi, 100) * 0.12,
        emissiveMap: emissiveMap,
        emissive: 0xffffff,
        emissiveIntensity: 1.15 + seedR(vi, 101) * 0.25,
        envMap: envMap || null,
        envMapIntensity: 1.15,
      });
      out.push({ map: albedo, emissiveMap: emissiveMap, material: mat });
    }
    return out;
  }

  function makeNeonSignMap(text, color) {
    var c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    var ctx = c.getContext('2d');
    // dark panel
    var bg = ctx.createLinearGradient(0, 0, 0, 128);
    bg.addColorStop(0, '#0a0812');
    bg.addColorStop(1, '#040308');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 128);
    // LED grid
    ctx.fillStyle = 'rgba(20,18,30,0.8)';
    for (var gy = 8; gy < 120; gy += 4) {
      for (var gx = 8; gx < 504; gx += 4) {
        ctx.fillRect(gx, gy, 2, 2);
      }
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.font = 'bold 52px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, 256, 68);
    // second pass glow
    ctx.shadowBlur = 40;
    ctx.globalAlpha = 0.5;
    ctx.fillText(text, 256, 68);
    ctx.globalAlpha = 1;
    var tex = new THREE.CanvasTexture(c);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Rich night-city equirect for metal/clearcoat IBL — high-contrast so paint shows skyline + neon, not black void */
  function makeCityEnvMap() {
    var W = 1024, H = 512;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');

    // Sky gradient: deep indigo → horizon amber/magenta haze → ground bounce
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#040812');
    sky.addColorStop(0.28, '#0a1630');
    sky.addColorStop(0.48, '#1a2848');
    sky.addColorStop(0.58, '#4a2a38');
    sky.addColorStop(0.68, '#2a1a28');
    sky.addColorStop(0.82, '#141018');
    sky.addColorStop(1, '#06050a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Bright moon + cool rim (readable specular pin on clearcoat)
    ctx.fillStyle = 'rgba(250,252,255,1)';
    ctx.beginPath();
    ctx.arc(W * 0.2, H * 0.16, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,210,255,0.55)';
    ctx.beginPath();
    ctx.arc(W * 0.2, H * 0.16, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,220,255,0.2)';
    ctx.beginPath();
    ctx.arc(W * 0.2, H * 0.16, 90, 0, Math.PI * 2);
    ctx.fill();

    // Dense city skyline with HOT window grids (must read when reflected in paint)
    for (var b = 0; b < 120; b++) {
      var bx = (b / 120) * W;
      var bh = 28 + Math.random() * 90;
      var bw = 5 + Math.random() * 14;
      var by = H * 0.58 - bh;
      ctx.fillStyle = 'rgb(' + (18 + (b % 6)) + ',' + (14 + (b % 4)) + ',' + (28 + (b % 8)) + ')';
      ctx.fillRect(bx, by, bw, bh);
      for (var wy = by + 3; wy < by + bh - 3; wy += 4) {
        for (var wx = bx + 1; wx < bx + bw - 1; wx += 3) {
          if (Math.random() < 0.28) continue;
          var warm = Math.random() > 0.42;
          var a = 0.75 + Math.random() * 0.25;
          ctx.fillStyle = warm
            ? 'rgba(255,200,110,' + a + ')'
            : 'rgba(140,210,255,' + a + ')';
          ctx.fillRect(wx, wy, 2, 3);
        }
      }
      // Bright crown LEDs on taller towers
      if (bh > 70) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,60,100,0.95)' : 'rgba(0,230,255,0.95)';
        ctx.fillRect(bx + 1, by, bw - 2, 3);
      }
    }

    // Vertical tube-light strips (garage/studio language in IBL)
    for (var tl = 0; tl < 18; tl++) {
      var tx = (tl / 18) * W + Math.random() * 8;
      var tg = ctx.createLinearGradient(tx, H * 0.25, tx, H * 0.75);
      tg.addColorStop(0, 'rgba(255,245,220,0)');
      tg.addColorStop(0.5, 'rgba(255,245,220,0.95)');
      tg.addColorStop(1, 'rgba(255,245,220,0)');
      ctx.fillStyle = tg;
      ctx.fillRect(tx, H * 0.25, 3 + Math.random() * 2, H * 0.5);
    }

    // Neon blooms (pink / cyan / amber — full intensity for env paint highlights)
    function neonBlob(x, y, r, col, a) {
      var g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
      g2.addColorStop(0, col.replace('A', String(a)));
      g2.addColorStop(0.35, col.replace('A', String(a * 0.55)));
      g2.addColorStop(1, col.replace('A', '0'));
      ctx.fillStyle = g2;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (var nb = 0; nb < 56; nb++) {
      var nx = Math.random() * W;
      var ny = H * 0.32 + Math.random() * H * 0.38;
      var palette = [
        'rgba(255,45,85,A)',
        'rgba(0,229,255,A)',
        'rgba(255,179,71,A)',
        'rgba(255,45,136,A)',
        'rgba(180,140,255,A)',
      ];
      neonBlob(nx, ny, 22 + Math.random() * 50, palette[nb % palette.length], 0.85 + Math.random() * 0.15);
    }

    // Ground bounce warm strip
    ctx.fillStyle = 'rgba(255,150,70,0.28)';
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
    // Cool wet ground bounce
    ctx.fillStyle = 'rgba(80,140,200,0.12)';
    ctx.fillRect(0, H * 0.88, W, H * 0.12);

    var envMap = new THREE.CanvasTexture(c);
    envMap.mapping = THREE.EquirectangularReflectionMapping;
    envMap.needsUpdate = true;
    if (THREE.SRGBColorSpace) envMap.colorSpace = THREE.SRGBColorSpace;
    return envMap;
  }

  /**
   * World-space microflake + fresnel coat rim — UV-independent so joined GLBs
   * never get wood-grain stretch, but stills show sparkle + coat-vs-base.
   */
  function injectCarPaintFlake(mat, intensity) {
    // intensity 0 = skip shader flake (matte street paint)
    if (intensity != null && intensity <= 0.001) {
      mat.userData.flake = { intensity: 0, scale: 72.0 };
      return mat;
    }
    // Fine sparse microflake (kept optional — default carPaint is matte)
    mat.userData.flake = { intensity: intensity != null ? intensity : 0.35, scale: 72.0 };
    mat.onBeforeCompile = function (shader) {
      var flake = mat.userData.flake || { intensity: 1.2, scale: 52.0 };
      shader.uniforms.uFlakeInt = { value: flake.intensity };
      shader.uniforms.uFlakeScale = { value: flake.scale };
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec3 vFlakeWp;\nvarying vec3 vFlakeN;'
        )
        .replace(
          '#include <project_vertex>',
          [
            'vFlakeWp = (modelMatrix * vec4(transformed, 1.0)).xyz;',
            'vFlakeN = normalize(mat3(modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz) * objectNormal);',
            '#include <project_vertex>',
          ].join('\n')
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          [
            '#include <common>',
            'uniform float uFlakeInt;',
            'uniform float uFlakeScale;',
            'varying vec3 vFlakeWp;',
            'varying vec3 vFlakeN;',
            'float flakeHash(vec3 p){',
            '  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));',
            '  p *= 17.0;',
            '  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));',
            '}',
          ].join('\n')
        )
        .replace(
          // r150: output_fragment; r160+: opaque_fragment
          /#include <(output_fragment|opaque_fragment)>/,
          [
            '{',
            '  vec3 fN = normalize(vFlakeN);',
            '  vec3 fV = normalize(cameraPosition - vFlakeWp);',
            '  float ndv = max(dot(fN, fV), 0.0);',
            '  // Fine sparse microflake — only bright near specular / facing camera',
            '  float h1 = flakeHash(floor(vFlakeWp * uFlakeScale));',
            '  float h2 = flakeHash(floor(vFlakeWp * uFlakeScale * 3.1 + 2.7));',
            '  float h3 = flakeHash(floor(vFlakeWp * uFlakeScale * 7.3 + 5.9));',
            '  float facing = pow(ndv, 4.0);',
            '  // Sparse flake only — dense step thresholds read as star confetti in stills',
            '  float spark = step(0.982, h1) * facing;',
            '  spark += step(0.992, h2) * pow(ndv, 14.0) * 1.2;',
            '  spark += step(0.997, h3) * pow(ndv, 32.0) * 1.6;',
            '  spark *= uFlakeInt;',
            '  // Warm silver microflake (body-tinted) — not cool confetti',
            '  outgoingLight += mix(vec3(1.0, 0.92, 0.82), diffuseColor.rgb, 0.35) * spark * 0.38;',
            '  outgoingLight += diffuseColor.rgb * spark * 0.12;',
            '  // Dual-layer clearcoat rim (coat vs base) — warm night, not magenta',
            '  float coatFres = pow(1.0 - ndv, 2.4);',
            '  outgoingLight += vec3(0.85, 0.78, 0.68) * coatFres * 0.28;',
            '  // Structured env on graze — cool sky + amber city (desaturated magenta)',
            '  vec3 R = reflect(-fV, fN);',
            '  float sky = smoothstep(0.15, 0.85, R.y);',
            '  float horiz = exp(-abs(R.y) * 3.5);',
            '  float bandA = 0.5 + 0.5 * sin(R.x * 9.0 + R.z * 3.0);',
            '  float bandB = 0.5 + 0.5 * sin(R.z * 12.0 - R.x * 2.0);',
            '  vec3 envSynth = mix(vec3(0.03, 0.04, 0.07), vec3(0.14, 0.20, 0.36), sky);',
            '  envSynth += vec3(0.55, 0.22, 0.18) * horiz * 0.22 * bandA;',
            '  envSynth += vec3(0.08, 0.35, 0.55) * horiz * 0.18 * bandB;',
            '  envSynth += vec3(0.75, 0.45, 0.18) * horiz * 0.14 * (1.0 - bandA);',
            '  // Window-grid ticks along horizon ring',
            '  float ticks = step(0.82, fract(atan(R.z, R.x) * 3.183 + R.y * 2.0));',
            '  envSynth += vec3(0.9, 0.72, 0.4) * ticks * horiz * 0.22;',
            '  outgoingLight += envSynth * coatFres * 0.55;',
            '  outgoingLight += envSynth * pow(ndv, 1.8) * 0.14;',
            '  // Hot specular pin (clearcoat top layer)',
            '  float pin = pow(ndv, 48.0);',
            '  outgoingLight += vec3(1.0, 0.96, 0.9) * pin * 0.35;',
            '}',
            '#include <$1>',
          ].join('\n')
        );
    };
    mat.customProgramCacheKey = function () {
      return 'ts_carpaint_flake_v8';
    };
    mat.needsUpdate = true;
    return mat;
  }

  GAME.materials = {
    init: function () {
      C = GAME.config.colors;
      var wet = makeWetAsphaltMaps();
      var winMap = makeWindowEmissiveMap();
      var facadeMap = makeFacadeAlbedo();
      var envMap = makeCityEnvMap();
      var facadeVariants = makeFacadeVariants(envMap);
      // Shared MeshStandardMaterial array for world buildings (neighbors pick different indices)
      var facadeMats = facadeVariants.map(function (v) { return v.material; });

      // Wet night asphalt — charcoal + restrained env (high env painted rainbow slabs)
      // Slightly wetter than matte black; env kept modest so IBL doesn't wash neon rainbow
      var roadOpts = {
        map: wet.albedo,
        color: 0x161c24,
        roughness: 0.32,
        metalness: 0.22,
        envMap: envMap,
        envMapIntensity: 0.48, // was 1.08 — high env = neon rainbow asphalt
        roughnessMap: wet.rough,
        normalMap: wet.normal,
        normalScale: new THREE.Vector2(0.45, 0.45),
      };
      var road = new THREE.MeshStandardMaterial(roadOpts);

      function std(opts) {
        var m = new THREE.MeshStandardMaterial(opts);
        m.envMap = envMap;
        if (m.envMapIntensity == null) m.envMapIntensity = 1.0;
        return m;
      }

      pool = {
        road: road,
        roadLine: new THREE.MeshBasicMaterial({ color: C.lineWhite }),
        roadLineY: new THREE.MeshBasicMaterial({ color: C.lineYellow }),
        // Slight night wet polish on curb concrete (shared mat — no extra draw cost)
        curb: std({
          color: C.curb,
          roughness: 0.52,
          metalness: 0.28,
          envMapIntensity: 0.85,
        }),
        sidewalk: std({ color: C.sidewalk, roughness: 0.82, metalness: 0.1, envMapIntensity: 0.55 }),
        // Unique facade kits — prefer facades[] for per-building assignment
        facades: facadeMats,
        facadeVariants: facadeVariants,
        building: facadeMats[0] || std({
          map: facadeMap, color: 0xffffff, roughness: 0.7, metalness: 0.2,
          emissiveMap: winMap, emissive: 0xffffff, emissiveIntensity: 1.25,
        }),
        buildingCool: facadeMats[1] || std({
          map: facadeMap, color: 0xf0f6ff, roughness: 0.72, metalness: 0.18,
          emissiveMap: winMap, emissive: 0xffffff, emissiveIntensity: 1.2,
        }),
        buildingWarm: facadeMats[2] || std({
          map: facadeMap, color: 0xfff4e8, roughness: 0.7, metalness: 0.15,
          emissiveMap: winMap, emissive: 0xffffff, emissiveIntensity: 1.15,
        }),
        windows: std({
          color: 0x1a1822,
          map: winMap,
          emissive: 0xffffff,
          emissiveMap: winMap,
          emissiveIntensity: 2.55,
          roughness: 0.18,
          metalness: 0.62,
          envMapIntensity: 1.65,
        }),
        windowsFar: std({
          color: 0x1a1820,
          emissive: C.windowWarm,
          emissiveMap: winMap,
          emissiveIntensity: 2.25,
          roughness: 0.35,
        }),
        glassCurtain: std({
          color: 0x2a4868,
          metalness: 0.94,
          roughness: 0.06,
          envMapIntensity: 3.1,
          emissive: 0x204060,
          emissiveIntensity: 0.7,
          emissiveMap: winMap,
        }),
        pole: std({ color: 0x2a2834, metalness: 0.85, roughness: 0.3 }),
        sodiumBulb: new THREE.MeshStandardMaterial({
          color: C.sodium, emissive: C.sodium, emissiveIntensity: 5.2,
          envMap: envMap, envMapIntensity: 0.3,
        }),
        neonPink: new THREE.MeshStandardMaterial({
          color: C.neonPink, emissive: C.neonPink, emissiveIntensity: 4.2,
        }),
        neonCyan: new THREE.MeshStandardMaterial({
          color: C.neonCyan, emissive: C.neonCyan, emissiveIntensity: 4.2,
        }),
        scrap: std({
          color: C.scrap, emissive: C.scrap, emissiveIntensity: 1.2, metalness: 0.75, roughness: 0.25,
        }),
        chrome: std({ color: 0xa8b0bc, metalness: 0.72, roughness: 0.32, envMapIntensity: 0.9 }),
        darkMetal: std({ color: 0x121018, metalness: 0.45, roughness: 0.55, envMapIntensity: 0.55 }),
        glass: std({
          color: 0x6a8aa8, metalness: 0.35, roughness: 0.18, transparent: true, opacity: 0.5,
          envMapIntensity: 1.1, emissive: 0x1a3344, emissiveIntensity: 0.18,
        }),
        ground: std({ color: 0x08060c, roughness: 0.95, metalness: 0.15, envMapIntensity: 0.4 }),
        mountain: std({ color: 0x1a2030, roughness: 0.95, metalness: 0.05, flatShading: true }),
        signs: [
          makeNeonSignMap('WARDEN', '#ff2d55'),
          makeNeonSignMap('SCRAP YARD', '#ff9f1c'),
          makeNeonSignMap('NIGHT RUN', '#00e5ff'),
          makeNeonSignMap('HEAT', '#ff2d88'),
          makeNeonSignMap('DEADLINE', '#39ff14'),
          makeNeonSignMap('SEPULCHER', '#ff6b35'),
          makeNeonSignMap('FREEDOM', '#a78bfa'),
          makeNeonSignMap('TWISTED', '#f472b6'),
        ].map(function (t) {
          return new THREE.MeshStandardMaterial({
            map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 2.2,
            color: 0xffffff, roughness: 0.35, metalness: 0.25, transparent: true,
            envMap: envMap, envMapIntensity: 0.5,
          });
        }),
        _wetMap: wet.albedo,
        _winMap: winMap,
        _envMap: envMap,
        _facadeMap: facadeMap,
      };

      // Apply env to all standard mats in pool
      Object.keys(pool).forEach(function (k) {
        var mat = pool[k];
        if (mat && mat.isMaterial && mat.envMap === undefined) {
          mat.envMap = envMap;
          if (mat.envMapIntensity == null) mat.envMapIntensity = 1.2;
        }
      });
      road.envMap = envMap;
      road.envMapIntensity = 1.08;
      road.roughness = 0.22;
      road.metalness = 0.34;
      return pool;
    },
    get: function () {
      if (!pool) GAME.materials.init();
      return pool;
    },
    envMap: function () {
      if (!pool) GAME.materials.init();
      return pool._envMap || null;
    },
    injectCarPaintFlake: injectCarPaintFlake,
    /**
     * Street paint — matte / satin body by default (neon over rust, not chrome disco).
     * Pass { finish: 'gloss' } or higher clearcoat/flake only for special look-dev.
     */
    carPaint: function (colorHex, opts) {
      opts = opts || {};
      if (!pool) GAME.materials.init();
      var env = pool._envMap;
      var col = new THREE.Color(colorHex);
      var gloss = opts.finish === 'gloss';
      var flakeI = opts.flake != null ? opts.flake : (gloss ? 0.55 : 0);

      var mat;
      if (THREE.MeshPhysicalMaterial) {
        mat = new THREE.MeshPhysicalMaterial({
          color: col,
          metalness: opts.metalness != null ? opts.metalness : (gloss ? 0.55 : 0.22),
          roughness: opts.roughness != null ? opts.roughness : (gloss ? 0.28 : 0.62),
          clearcoat: opts.clearcoat != null ? opts.clearcoat : (gloss ? 0.65 : 0.12),
          clearcoatRoughness: opts.clearcoatRoughness != null ? opts.clearcoatRoughness : (gloss ? 0.12 : 0.45),
          envMap: env,
          envMapIntensity: opts.envMapIntensity != null ? opts.envMapIntensity : (gloss ? 1.4 : 0.55),
          emissive: col,
          emissiveIntensity: opts.emissive != null ? opts.emissive : 0.004,
          sheen: gloss ? 0.25 : 0.08,
          sheenRoughness: 0.55,
          sheenColor: col.clone().offsetHSL(0, 0.02, 0.03),
          reflectivity: gloss ? 0.7 : 0.25,
        });
      } else {
        mat = new THREE.MeshStandardMaterial({
          color: col,
          metalness: gloss ? 0.5 : 0.2,
          roughness: gloss ? 0.3 : 0.65,
          envMap: env,
          envMapIntensity: gloss ? 1.5 : 0.5,
          emissive: col,
          emissiveIntensity: 0.008,
        });
      }
      if (flakeI > 0.001) return injectCarPaintFlake(mat, flakeI);
      mat.userData.flake = { intensity: 0, scale: 72.0 };
      return mat;
    },
  };
})();
