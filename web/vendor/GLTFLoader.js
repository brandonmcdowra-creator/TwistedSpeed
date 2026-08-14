/**
 * Minimal GLTFLoader for Three r160+ (non-module). Supports basic GLB meshes + materials.
 * Subset of three/examples GLTFLoader — enough for our roster car exports.
 */
(function () {
  'use strict';
  if (typeof THREE === 'undefined') return;

  function GLTFLoader(manager) {
    this.manager = manager || THREE.DefaultLoadingManager;
  }

  GLTFLoader.prototype.load = function (url, onLoad, onProgress, onError) {
    var scope = this;
    var loader = new THREE.FileLoader(this.manager);
    loader.setResponseType('arraybuffer');
    loader.load(url, function (data) {
      try {
        onLoad(scope.parse(data));
      } catch (e) {
        if (onError) onError(e);
        else console.error(e);
      }
    }, onProgress, onError);
  };

  GLTFLoader.prototype.parse = function (data) {
    var header = new DataView(data, 0, 12);
    var magic = header.getUint32(0, true);
    if (magic !== 0x46546C67) throw new Error('Not a GLB');
    var version = header.getUint32(4, true);
    var length = header.getUint32(8, true);
    var json = null;
    var bin = null;
    var offset = 12;
    while (offset < length) {
      var chunkLen = new DataView(data, offset, 8).getUint32(0, true);
      var chunkType = new DataView(data, offset, 8).getUint32(4, true);
      offset += 8;
      if (chunkType === 0x4E4F534A) {
        var dec = new TextDecoder('utf-8');
        json = JSON.parse(dec.decode(new Uint8Array(data, offset, chunkLen)));
      } else if (chunkType === 0x004E4942) {
        bin = data.slice(offset, offset + chunkLen);
      }
      offset += chunkLen;
    }
    if (!json) throw new Error('GLB missing JSON');
    return buildScene(json, bin);
  };

  function getAccessor(json, bin, index) {
    var acc = json.accessors[index];
    var view = json.bufferViews[acc.bufferView];
    var start = (view.byteOffset || 0) + (acc.byteOffset || 0);
    var compType = acc.componentType;
    var typeMap = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
    var nComp = typeMap[acc.type] || 3;
    var count = acc.count;
    var ArrayCtor = Uint8Array;
    if (compType === 5126) ArrayCtor = Float32Array;
    else if (compType === 5123) ArrayCtor = Uint16Array;
    else if (compType === 5125) ArrayCtor = Uint32Array;
    else if (compType === 5121) ArrayCtor = Uint8Array;
    var bytesPer = ArrayCtor.BYTES_PER_ELEMENT;
    // stride
    var stride = view.byteStride || (nComp * bytesPer);
    if (stride === nComp * bytesPer) {
      return new ArrayCtor(bin, start, count * nComp);
    }
    // interleaved
    var out = new ArrayCtor(count * nComp);
    var src = new DataView(bin, start);
    for (var i = 0; i < count; i++) {
      for (var c = 0; c < nComp; c++) {
        var o = i * stride + c * bytesPer;
        if (compType === 5126) out[i * nComp + c] = src.getFloat32(o, true);
        else if (compType === 5123) out[i * nComp + c] = src.getUint16(o, true);
        else if (compType === 5125) out[i * nComp + c] = src.getUint32(o, true);
        else out[i * nComp + c] = src.getUint8(o);
      }
    }
    return out;
  }

  function matFromGltf(json, m) {
    if (!m) return new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5, roughness: 0.4 });
    var color = 0xffffff;
    if (m.pbrMetallicRoughness && m.pbrMetallicRoughness.baseColorFactor) {
      var f = m.pbrMetallicRoughness.baseColorFactor;
      color = new THREE.Color(f[0], f[1], f[2]);
    }
    var metal = m.pbrMetallicRoughness ? (m.pbrMetallicRoughness.metallicFactor != null ? m.pbrMetallicRoughness.metallicFactor : 0.5) : 0.5;
    var rough = m.pbrMetallicRoughness ? (m.pbrMetallicRoughness.roughnessFactor != null ? m.pbrMetallicRoughness.roughnessFactor : 0.4) : 0.4;
    var mat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: metal,
      roughness: rough
    });
    if (m.emissiveFactor) {
      mat.emissive = new THREE.Color(m.emissiveFactor[0], m.emissiveFactor[1], m.emissiveFactor[2]);
      mat.emissiveIntensity = 1.5;
    }
    if (m.alphaMode === 'BLEND') {
      mat.transparent = true;
      mat.opacity = m.pbrMetallicRoughness && m.pbrMetallicRoughness.baseColorFactor ? m.pbrMetallicRoughness.baseColorFactor[3] : 0.5;
    }
    return mat;
  }

  function buildScene(json, bin) {
    var materials = (json.materials || []).map(function (m) { return matFromGltf(json, m); });
    var root = new THREE.Group();
    var nodes = json.nodes || [];
    var meshes = json.meshes || [];

    function buildNode(nodeIndex, parent) {
      var node = nodes[nodeIndex];
      var obj = new THREE.Group();
      obj.name = node.name || ('node_' + nodeIndex);
      if (node.translation) obj.position.fromArray(node.translation);
      if (node.rotation) obj.quaternion.fromArray(node.rotation);
      if (node.scale) obj.scale.fromArray(node.scale);
      if (node.matrix) {
        var m = new THREE.Matrix4().fromArray(node.matrix);
        obj.applyMatrix4(m);
      }
      if (node.mesh != null) {
        var meshDef = meshes[node.mesh];
        (meshDef.primitives || []).forEach(function (prim, pi) {
          var geo = new THREE.BufferGeometry();
          if (prim.attributes.POSITION != null) {
            var pos = getAccessor(json, bin, prim.attributes.POSITION);
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          }
          if (prim.attributes.NORMAL != null) {
            var nor = getAccessor(json, bin, prim.attributes.NORMAL);
            geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
          } else {
            geo.computeVertexNormals();
          }
          if (prim.attributes.TEXCOORD_0 != null) {
            var uv = getAccessor(json, bin, prim.attributes.TEXCOORD_0);
            geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
          }
          if (prim.indices != null) {
            var idx = getAccessor(json, bin, prim.indices);
            geo.setIndex(new THREE.BufferAttribute(idx, 1));
          }
          var mat = materials[prim.material != null ? prim.material : 0] || materials[0] || new THREE.MeshStandardMaterial({ color: 0x888888 });
          var mesh = new THREE.Mesh(geo, mat.clone ? mat.clone() : mat);
          mesh.name = (meshDef.name || 'mesh') + '_' + pi;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          obj.add(mesh);
        });
      }
      parent.add(obj);
      (node.children || []).forEach(function (c) { buildNode(c, obj); });
      return obj;
    }

    var sceneDef = (json.scenes && json.scenes[json.scene || 0]) || { nodes: nodes.map(function (_, i) { return i; }) };
    var sceneRoot = new THREE.Group();
    sceneRoot.name = 'Scene';
    (sceneDef.nodes || []).forEach(function (ni) { buildNode(ni, sceneRoot); });
    return { scene: sceneRoot, scenes: [sceneRoot] };
  }

  THREE.GLTFLoader = GLTFLoader;
})();
