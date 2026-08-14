/**
 * Cinematic post stack: multi-mip bloom + ACES + vignette + grain + CA.
 * Half-float RTs where available to kill banding.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});

  function rtType() {
    // PERF: 8-bit RTs (half-float bloom was a big GPU tax on integrated GPUs)
    return THREE.UnsignedByteType;
  }

  var PostFX = function (renderer) {
    this.renderer = renderer;
    this.enabled = true;
    this.sceneRT = null;
    this.mips = []; // [{bright, blurH, blurV, w, h}]
    // Scenery density spends the budget; keep post moderate so both stay playable
    this.mipCount = 1;
    this.internalScale = 0.62;
    this.quad = null;
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.w = 1;
    this.h = 1;
    this._buildMaterials();
  };

  PostFX.prototype._buildMaterials = function () {
    var grade = GAME.config.grade;

    this.brightMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        threshold: { value: grade.bloomThreshold },
        soft: { value: 0.35 },
      },
      vertexShader: [
        'varying vec2 vUv;',
        'void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform float threshold, soft; varying vec2 vUv;',
        'void main(){',
        '  vec4 c = texture2D(tDiffuse, vUv);',
        '  float l = dot(c.rgb, vec3(0.2126,0.7152,0.0722));',
        '  float peak = max(c.r, max(c.g, c.b));',
        '  float mn = min(c.r, min(c.g, c.b));',
        '  float chroma = peak - mn;',
        '  // luminance knee',
        '  float m = smoothstep(threshold, threshold + soft, l);',
        '  // neon: high peak + chroma passes even at mid-luma',
        '  m = max(m, smoothstep(0.62, 1.15, peak) * smoothstep(0.06, 0.4, chroma));',
        '  // suppress near-neutral asphalt / road wash (low chroma)',
        '  m *= mix(0.28, 1.0, smoothstep(0.03, 0.2, chroma));',
        '  // pure hot whites (headlights, moon) still contribute partially',
        '  m = max(m, smoothstep(1.05, 1.7, peak) * 0.55);',
        '  gl_FragColor = vec4(c.rgb * m, 1.0);',
        '}',
      ].join('\n'),
      depthTest: false,
      depthWrite: false,
    });

    this.blurMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        direction: { value: new THREE.Vector2(1, 0) },
        resolution: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: [
        'varying vec2 vUv;',
        'void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform vec2 direction; uniform vec2 resolution;',
        'varying vec2 vUv;',
        'void main(){',
        '  vec2 px = direction / resolution;',
        '  // 9-tap gaussian-ish',
        '  vec3 c = texture2D(tDiffuse, vUv).rgb * 0.227027;',
        '  c += texture2D(tDiffuse, vUv + px*1.384615).rgb * 0.316216;',
        '  c += texture2D(tDiffuse, vUv - px*1.384615).rgb * 0.316216;',
        '  c += texture2D(tDiffuse, vUv + px*3.230769).rgb * 0.070270;',
        '  c += texture2D(tDiffuse, vUv - px*3.230769).rgb * 0.070270;',
        '  c += texture2D(tDiffuse, vUv + px*5.0).rgb * 0.035;',
        '  c += texture2D(tDiffuse, vUv - px*5.0).rgb * 0.035;',
        '  gl_FragColor = vec4(c, 1.0);',
        '}',
      ].join('\n'),
      depthTest: false,
      depthWrite: false,
    });

    this.downMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: [
        'varying vec2 vUv;',
        'void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform vec2 resolution; varying vec2 vUv;',
        'void main(){',
        '  vec2 px = 1.0 / resolution;',
        '  vec3 c = texture2D(tDiffuse, vUv).rgb * 0.25;',
        '  c += texture2D(tDiffuse, vUv + vec2( px.x,  px.y)).rgb * 0.125;',
        '  c += texture2D(tDiffuse, vUv + vec2(-px.x,  px.y)).rgb * 0.125;',
        '  c += texture2D(tDiffuse, vUv + vec2( px.x, -px.y)).rgb * 0.125;',
        '  c += texture2D(tDiffuse, vUv + vec2(-px.x, -px.y)).rgb * 0.125;',
        '  c += texture2D(tDiffuse, vUv + vec2( px.x, 0.0)).rgb * 0.0625;',
        '  c += texture2D(tDiffuse, vUv + vec2(-px.x, 0.0)).rgb * 0.0625;',
        '  c += texture2D(tDiffuse, vUv + vec2(0.0,  px.y)).rgb * 0.0625;',
        '  c += texture2D(tDiffuse, vUv + vec2(0.0, -px.y)).rgb * 0.0625;',
        '  gl_FragColor = vec4(c, 1.0);',
        '}',
      ].join('\n'),
      depthTest: false,
      depthWrite: false,
    });

    this.compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tBloom0: { value: null },
        tBloom1: { value: null },
        tBloom2: { value: null },
        tBloom3: { value: null },
        exposure: { value: grade.exposure },
        contrast: { value: grade.contrast },
        saturation: { value: grade.saturation },
        bloomStrength: { value: (grade.bloomStrength || 0.16) * 1.15 },
        vignette: { value: grade.vignette },
        grain: { value: grade.grain },
        chromatic: { value: grade.chromatic },
        time: { value: 0 },
        liftCyan: { value: grade.liftCyan },
        liftAmber: { value: grade.liftAmber },
      },
      vertexShader: [
        'varying vec2 vUv;',
        'void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D tScene, tBloom0, tBloom1, tBloom2, tBloom3;',
        'uniform float exposure, contrast, saturation, bloomStrength, vignette, grain, chromatic, time;',
        'uniform float liftCyan, liftAmber;',
        'varying vec2 vUv;',
        'vec3 ACESFilm(vec3 x){',
        '  const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;',
        '  return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);',
        '}',
        'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }',
        'void main(){',
        '  vec2 uv = vUv;',
        '  float ca = chromatic;',
        '  vec2 dir = (uv - 0.5) * ca;',
        '  float r = texture2D(tScene, uv + dir).r;',
        '  float g = texture2D(tScene, uv).g;',
        '  float b = texture2D(tScene, uv - dir).b;',
        '  vec3 col = vec3(r,g,b);',
        '  // Bloom (single-mip path still samples slots — extras may alias mip0)',
        '  vec3 bloom = texture2D(tBloom0, uv).rgb * 0.72;',
        '  bloom += texture2D(tBloom1, uv).rgb * 0.18;',
        '  bloom += texture2D(tBloom2, uv).rgb * 0.06;',
        '  bloom += texture2D(tBloom3, uv).rgb * 0.04;',
        '  // slight chroma boost on bloom only (neon pop without road rainbow)',
        '  float bPeak = max(bloom.r, max(bloom.g, bloom.b));',
        '  float bMin = min(bloom.r, min(bloom.g, bloom.b));',
        '  float bCh = bPeak - bMin;',
        '  bloom = mix(bloom, bloom * vec3(1.05, 1.0, 1.08), smoothstep(0.02, 0.2, bCh));',
        '  col += bloom * bloomStrength;',
        '  col *= exposure;',
        '  // cyan/amber night grade (Heat/Unbound)',
        '  col.b += liftCyan * (1.0 - col.b) * 0.42;',
        '  col.r += liftAmber * col.r * 0.2;',
        '  col.g += liftAmber * 0.1;',
        '  col = (col - 0.5) * contrast + 0.5;',
        '  float luma = dot(col, vec3(0.2126,0.7152,0.0722));',
        '  col = mix(vec3(luma), col, saturation);',
        '  // soft shoulder before ACES to preserve neon',
        '  col = max(col, vec3(0.0));',
        '  col = ACESFilm(col * 0.94);',
        '  // vignette',
        '  vec2 vc = uv * 2.0 - 1.0;',
        '  float vig = 1.0 - dot(vc, vc) * vignette * 0.55;',
        '  col *= clamp(vig, 0.0, 1.0);',
        '  // film grain (dither banding)',
        '  float n = hash(uv * vec2(1920.0,1080.0) + time * 60.0) - 0.5;',
        '  col += n * grain;',
        '  // slight lift blacks so night isn\'t crushed',
        '  col = col * 0.97 + 0.012;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}',
      ].join('\n'),
      depthTest: false,
      depthWrite: false,
    });

    var geo = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geo, this.compositeMat);
    this.scene.add(this.quad);
  };

  PostFX.prototype._makeRT = function (ww, hh, depth) {
    var t = new THREE.WebGLRenderTarget(ww, hh, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: rtType(),
      depthBuffer: !!depth,
      stencilBuffer: false,
    });
    if (t.texture) t.texture.generateMipmaps = false;
    return t;
  };

  PostFX.prototype.setSize = function (w, h) {
    this.w = Math.max(1, w | 0);
    this.h = Math.max(1, h | 0);
    var dpr = Math.min(window.devicePixelRatio || 1, 1.0);
    var scale = this.internalScale != null ? this.internalScale : 0.65;
    var rw = Math.max(1, Math.floor(this.w * dpr * scale));
    var rh = Math.max(1, Math.floor(this.h * dpr * scale));

    if (this.sceneRT) this.sceneRT.dispose();
    this.mips.forEach(function (m) {
      if (m.a) m.a.dispose();
      if (m.b) m.b.dispose();
    });
    this.mips = [];

    this.sceneRT = this._makeRT(rw, rh, true);

    // Bloom at half of already-scaled scene RT
    var mw = Math.max(1, rw >> 1);
    var mh = Math.max(1, rh >> 1);
    for (var i = 0; i < this.mipCount; i++) {
      this.mips.push({
        a: this._makeRT(mw, mh, false),
        b: this._makeRT(mw, mh, false),
        w: mw,
        h: mh,
      });
      mw = Math.max(1, mw >> 1);
      mh = Math.max(1, mh >> 1);
    }
  };

  PostFX.prototype.render = function (scene, camera, time) {
    var r = this.renderer;
    if (!this.enabled || !this.sceneRT || !this.mips.length) {
      r.setRenderTarget(null);
      r.render(scene, camera);
      return;
    }

    // 1) scene
    r.setRenderTarget(this.sceneRT);
    r.clear();
    r.render(scene, camera);

    // 2) bright extract → mip0
    this.quad.material = this.brightMat;
    this.brightMat.uniforms.tDiffuse.value = this.sceneRT.texture;
    r.setRenderTarget(this.mips[0].a);
    r.clear();
    r.render(this.scene, this.cam);

    // 3) blur each mip + downsample chain
    for (var i = 0; i < this.mips.length; i++) {
      var m = this.mips[i];
      // H blur a → b
      this.quad.material = this.blurMat;
      this.blurMat.uniforms.tDiffuse.value = m.a.texture;
      this.blurMat.uniforms.direction.value.set(1, 0);
      this.blurMat.uniforms.resolution.value.set(m.w, m.h);
      r.setRenderTarget(m.b);
      r.clear();
      r.render(this.scene, this.cam);
      // V blur b → a
      this.blurMat.uniforms.tDiffuse.value = m.b.texture;
      this.blurMat.uniforms.direction.value.set(0, 1);
      r.setRenderTarget(m.a);
      r.clear();
      r.render(this.scene, this.cam);

      // downsample to next mip
      if (i + 1 < this.mips.length) {
        var next = this.mips[i + 1];
        this.quad.material = this.downMat;
        this.downMat.uniforms.tDiffuse.value = m.a.texture;
        this.downMat.uniforms.resolution.value.set(m.w, m.h);
        r.setRenderTarget(next.a);
        r.clear();
        r.render(this.scene, this.cam);
      }
    }

    // 4) composite
    this.quad.material = this.compositeMat;
    var u = this.compositeMat.uniforms;
    u.tScene.value = this.sceneRT.texture;
    u.tBloom0.value = this.mips[0].a.texture;
    u.tBloom1.value = this.mips[Math.min(1, this.mips.length - 1)].a.texture;
    u.tBloom2.value = this.mips[Math.min(2, this.mips.length - 1)].a.texture;
    u.tBloom3.value = this.mips[Math.min(3, this.mips.length - 1)].a.texture;
    u.time.value = time || 0;
    r.setRenderTarget(null);
    r.render(this.scene, this.cam);
  };

  PostFX.prototype.setGrade = function (partial) {
    var p = partial || {};
    var u = this.compositeMat.uniforms;
    var keys = [
      'exposure', 'contrast', 'saturation', 'bloomStrength',
      'vignette', 'grain', 'chromatic', 'liftCyan', 'liftAmber',
    ];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (p[k] != null && u[k]) u[k].value = p[k];
    }
    // bloomThreshold lives on bright extract, not composite
    if (p.bloomThreshold != null && this.brightMat && this.brightMat.uniforms.threshold) {
      this.brightMat.uniforms.threshold.value = p.bloomThreshold;
    }
    if (p.bloomSoft != null && this.brightMat && this.brightMat.uniforms.soft) {
      this.brightMat.uniforms.soft.value = p.bloomSoft;
    }
  };

  GAME.PostFX = PostFX;
})();
