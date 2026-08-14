/**
 * Minimal GLB loader (meshes + basic materials). No skins/animations.
 * Falls back gracefully — caller uses procedural multiparts when null.
 */
(function () {
  var GAME = (window.GAME = window.GAME || {});
  var cache = {};
  // Bump when hero GLBs are rebuilt so browser+module caches refresh
  var GLB_ASSET_VER = 'fleet139';

  function readU32(dv, o) { return dv.getUint32(o, true); }
  function readF32(dv, o) { return dv.getFloat32(o, true); }

  function parseGLB(buffer) {
    var dv = new DataView(buffer);
    if (readU32(dv, 0) !== 0x46546c67) throw new Error('not glb');
    var json = null, bin = null;
    var offset = 12;
    while (offset + 8 <= buffer.byteLength) {
      var chunkLen = readU32(dv, offset);
      var chunkType = readU32(dv, offset + 4);
      offset += 8;
      if (chunkType === 0x4e4f534a) {
        json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, offset, chunkLen)));
      } else if (chunkType === 0x004e4942) {
        bin = buffer.slice(offset, offset + chunkLen);
      }
      offset += chunkLen;
    }
    if (!json) throw new Error('no json');
    return buildScene(json, bin);
  }

  function accessorData(json, bin, accIndex) {
    var acc = json.accessors[accIndex];
    var view = json.bufferViews[acc.bufferView];
    var byteOffset = (view.byteOffset || 0) + (acc.byteOffset || 0);
    var comp = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type] || 3;
    var count = acc.count;
    var out;
    if (acc.componentType === 5126) {
      out = new Float32Array(bin, byteOffset, count * comp);
    } else if (acc.componentType === 5123) {
      out = new Uint16Array(bin, byteOffset, count * comp);
    } else if (acc.componentType === 5125) {
      out = new Uint32Array(bin, byteOffset, count * comp);
    } else if (acc.componentType === 5121) {
      out = new Uint8Array(bin, byteOffset, count * comp);
    } else {
      out = new Float32Array(count * comp);
    }
    return { array: out, itemSize: comp, count: count };
  }

  function makeMaterial(json, matIndex) {
    var def = (json.materials && json.materials[matIndex]) || {};
    var pbr = def.pbrMetallicRoughness || {};
    var base = pbr.baseColorFactor || [0.7, 0.7, 0.7, 1];
    var emis = def.emissiveFactor || [0, 0, 0];
    var color = new THREE.Color(base[0], base[1], base[2]);
    var emisC = new THREE.Color(emis[0], emis[1], emis[2]);
    var mat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: pbr.metallicFactor != null ? pbr.metallicFactor : 0.5,
      roughness: pbr.roughnessFactor != null ? pbr.roughnessFactor : 0.45,
      emissive: emisC,
      emissiveIntensity: emisC.r + emisC.g + emisC.b > 0.01 ? 1.2 : 0,
      transparent: base[3] < 0.99,
      opacity: base[3],
      side: def.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    });
    return mat;
  }

  function buildMesh(json, bin, meshDef) {
    var group = new THREE.Group();
    (meshDef.primitives || []).forEach(function (prim) {
      var attrs = prim.attributes || {};
      if (attrs.POSITION == null) return;
      var pos = accessorData(json, bin, attrs.POSITION);
      var geo = new THREE.BufferGeometry();
      // Copy so we own the buffer (slice may share)
      var posArr = pos.array instanceof Float32Array
        ? new Float32Array(pos.array)
        : new Float32Array(pos.array);
      geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      if (attrs.NORMAL != null) {
        var n = accessorData(json, bin, attrs.NORMAL);
        geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n.array), 3));
      } else {
        geo.computeVertexNormals();
      }
      if (attrs.TEXCOORD_0 != null) {
        var uv = accessorData(json, bin, attrs.TEXCOORD_0);
        geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv.array), 2));
      }
      if (prim.indices != null) {
        var idx = accessorData(json, bin, prim.indices);
        if (idx.array instanceof Uint32Array) {
          geo.setIndex(new THREE.BufferAttribute(new Uint32Array(idx.array), 1));
        } else {
          geo.setIndex(new THREE.BufferAttribute(new Uint16Array(idx.array), 1));
        }
      }
      var mat = makeMaterial(json, prim.material != null ? prim.material : 0);
      var mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      group.add(mesh);
    });
    return group;
  }

  function buildScene(json, bin) {
    var root = new THREE.Group();
    var nodes = json.nodes || [];
    var meshes = json.meshes || [];

    function applyNode(node, parent) {
      var g = new THREE.Group();
      if (node.translation) g.position.fromArray(node.translation);
      if (node.rotation) g.quaternion.fromArray(node.rotation);
      if (node.scale) g.scale.fromArray(node.scale);
      if (node.matrix) {
        var m = new THREE.Matrix4().fromArray(node.matrix);
        m.decompose(g.position, g.quaternion, g.scale);
      }
      if (node.name) g.name = node.name;
      if (node.mesh != null && meshes[node.mesh]) {
        var meshG = buildMesh(json, bin, meshes[node.mesh]);
        meshG.name = node.name || (meshes[node.mesh].name || '') || meshG.name;
        meshG.traverse(function (ch) {
          if (ch.isMesh) ch.name = node.name || meshes[node.mesh].name || ch.name;
        });
        g.add(meshG);
      }
      (node.children || []).forEach(function (ci) {
        applyNode(nodes[ci], g);
      });
      parent.add(g);
    }

    var sceneIdx = (json.scene != null) ? json.scene : 0;
    var scene = (json.scenes && json.scenes[sceneIdx]) || { nodes: nodes.map(function (_, i) { return i; }) };
    var roots = scene.nodes || [];
    // If no scene nodes, try all top-level
    if (!roots.length) {
      for (var i = 0; i < nodes.length; i++) applyNode(nodes[i], root);
    } else {
      roots.forEach(function (ni) { applyNode(nodes[ni], root); });
    }

    // Normalize: center + scale to ~4.5m long
    var box = new THREE.Box3().setFromObject(root);
    var size = new THREE.Vector3();
    box.getSize(size);
    var center = new THREE.Vector3();
    box.getCenter(center);
    root.position.sub(center);
    root.position.y += size.y * 0.5;
    var longest = Math.max(size.x, size.y, size.z, 0.001);
    var target = 4.6;
    var s = target / longest;
    root.scale.setScalar(s);
    // glTF is Y-up. Do NOT pre-spin here — vehicles.js detectFaceYaw + faceBake
    // put the nose on +Z once, then setYaw only applies race yaw (avoids double-flip).
    root.rotation.y = 0;
    var wrap = new THREE.Group();
    wrap.add(root);
    wrap.userData.fromGlb = true;
    return wrap;
  }

  GAME.glb = {
    load: function (url) {
      // Strip query for logical key, always version for fetch
      var base = url.split('?')[0];
      var key = base + '#' + GLB_ASSET_VER;
      if (cache[key]) return Promise.resolve(cache[key].clone(true));
      var fetchUrl = base + (base.indexOf('?') >= 0 ? '&' : '?') + 'v=' + GLB_ASSET_VER;
      return fetch(fetchUrl)
        .then(function (r) {
          if (!r.ok) throw new Error('glb ' + r.status);
          return r.arrayBuffer();
        })
        .then(function (buf) {
          var scene = parseGLB(buf);
          scene.traverse(function (o) {
            if (o.isMesh && (!o.name || o.name === '') && o.parent && o.parent.name) {
              o.name = o.parent.name;
            }
          });
          cache[key] = scene;
          return scene.clone(true);
        })
        .catch(function (e) {
          console.warn('[glb] load failed', url, e);
          return null;
        });
    },
    preload: function (urls) {
      return Promise.all(urls.map(function (u) {
        return GAME.glb.load(u).then(function (s) { return s; });
      }));
    },
    clearCache: function () { cache = {}; },
  };
})();
