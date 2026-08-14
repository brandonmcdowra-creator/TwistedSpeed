/**
 * Custom GLSL materials — wet asphalt, clearcoat paint, neon emissives.
 * Pure Three.js ShaderMaterial / MeshPhysicalMaterial helpers (no external deps).
 */
(function (G) {
  'use strict';
  var S = G.shaders = {};

  /** Procedural wet night asphalt with animated rain streaks + environment sheen */
  S.wetAsphalt = function (THREE, opts) {
    opts = opts || {};
    var mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(opts.color || 0x12141a),
      metalness: 0.72,
      roughness: 0.18,
      envMapIntensity: 1.35
    });
    mat.userData.wet = true;
    return mat;
  };

  /** NFS-style multi-layer paint: base + clearcoat via MeshPhysicalMaterial */
  S.carPaint = function (THREE, color, opts) {
    opts = opts || {};
    var c = new THREE.Color(color);
    var mat;
    if (THREE.MeshPhysicalMaterial) {
      mat = new THREE.MeshPhysicalMaterial({
        color: c,
        metalness: opts.metalness != null ? opts.metalness : 0.78,
        roughness: opts.roughness != null ? opts.roughness : 0.22,
        clearcoat: opts.clearcoat != null ? opts.clearcoat : 1.0,
        clearcoatRoughness: opts.clearcoatRoughness != null ? opts.clearcoatRoughness : 0.08,
        envMapIntensity: 1.6,
        reflectivity: 0.9
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: c,
        metalness: 0.85,
        roughness: 0.2,
        envMapIntensity: 1.5
      });
    }
    return mat;
  };

  S.glass = function (THREE, tint) {
    var c = new THREE.Color(tint || 0x1a2838);
    if (THREE.MeshPhysicalMaterial) {
      return new THREE.MeshPhysicalMaterial({
        color: c,
        metalness: 0.05,
        roughness: 0.05,
        transmission: 0.55,
        thickness: 0.4,
        transparent: true,
        opacity: 0.55,
        envMapIntensity: 2.0
      });
    }
    return new THREE.MeshStandardMaterial({
      color: c,
      metalness: 0.1,
      roughness: 0.05,
      transparent: true,
      opacity: 0.45,
      envMapIntensity: 1.8
    });
  };

  S.emissive = function (THREE, color, intensity) {
    var c = new THREE.Color(color);
    intensity = intensity == null ? 2.5 : intensity;
    return new THREE.MeshStandardMaterial({
      color: c,
      emissive: c,
      emissiveIntensity: intensity,
      metalness: 0.2,
      roughness: 0.35
    });
  };

  S.rubber = function (THREE) {
    return new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      metalness: 0.05,
      roughness: 0.92
    });
  };

  S.chrome = function (THREE) {
    return new THREE.MeshStandardMaterial({
      color: 0xc8ccd2,
      metalness: 1.0,
      roughness: 0.12,
      envMapIntensity: 2.2
    });
  };

  /** Full-screen post: ACES-ish tonemap + bloom-lite + vignette + grain */
  S.makePostMaterial = function (THREE, tDiffuse, tBright) {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: tDiffuse },
        tBright: { value: tBright },
        time: { value: 0 },
        exposure: { value: 1.05 },
        bloomStrength: { value: 0.55 },
        vignette: { value: 0.42 },
        grain: { value: 0.035 },
        contrast: { value: 1.12 },
        saturation: { value: 1.15 },
        res: { value: new THREE.Vector2(1, 1) }
      },
      vertexShader: [
        'varying vec2 vUv;',
        'void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D tDiffuse;',
        'uniform sampler2D tBright;',
        'uniform float time,exposure,bloomStrength,vignette,grain,contrast,saturation;',
        'uniform vec2 res;',
        'varying vec2 vUv;',
        'float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
        'vec3 aces(vec3 x){',
        '  const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;',
        '  return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0);',
        '}',
        'void main(){',
        '  vec3 col=texture2D(tDiffuse,vUv).rgb;',
        '  vec3 blm=texture2D(tBright,vUv).rgb;',
        '  col+=blm*bloomStrength;',
        '  col*=exposure;',
        '  col=aces(col);',
        '  col=(col-0.5)*contrast+0.5;',
        '  float l=dot(col,vec3(0.2126,0.7152,0.0722));',
        '  col=mix(vec3(l),col,saturation);',
        '  // cool moon + warm sodium grade',
        '  col*=vec3(0.96,0.98,1.06);',
        '  col+=vec3(0.02,0.01,0.0);',
        '  float d=distance(vUv,vec2(0.5));',
        '  col*=smoothstep(0.95,0.35,d*vignette+d*d);',
        '  float n=hash(vUv*res+fract(time*19.7))*2.0-1.0;',
        '  col+=n*grain;',
        '  gl_FragColor=vec4(col,1.0);',
        '}'
      ].join('\n'),
      depthTest: false,
      depthWrite: false
    });
  };

  S.makeBrightPass = function (THREE, tDiffuse) {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: tDiffuse },
        threshold: { value: 0.72 }
      },
      vertexShader: [
        'varying vec2 vUv;',
        'void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform float threshold; varying vec2 vUv;',
        'void main(){',
        '  vec3 c=texture2D(tDiffuse,vUv).rgb;',
        '  float l=dot(c,vec3(0.2126,0.7152,0.0722));',
        '  float k=max(0.0,l-threshold);',
        '  gl_FragColor=vec4(c*k*1.8,1.0);',
        '}'
      ].join('\n'),
      depthTest: false,
      depthWrite: false
    });
  };

  S.makeBlur = function (THREE, tDiffuse, dir) {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: tDiffuse },
        dir: { value: dir || new THREE.Vector2(1, 0) },
        res: { value: new THREE.Vector2(1, 1) }
      },
      vertexShader: [
        'varying vec2 vUv;',
        'void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform vec2 dir,res; varying vec2 vUv;',
        'void main(){',
        '  vec2 px=dir/res;',
        '  vec3 c=texture2D(tDiffuse,vUv).rgb*0.227027;',
        '  c+=texture2D(tDiffuse,vUv+px*1.384615).rgb*0.316216;',
        '  c+=texture2D(tDiffuse,vUv-px*1.384615).rgb*0.316216;',
        '  c+=texture2D(tDiffuse,vUv+px*3.230769).rgb*0.070270;',
        '  c+=texture2D(tDiffuse,vUv-px*3.230769).rgb*0.070270;',
        '  gl_FragColor=vec4(c,1.0);',
        '}'
      ].join('\n'),
      depthTest: false,
      depthWrite: false
    });
  };
})(window.GAME = window.GAME || {});
