/* the scene writer, shared by export-scene and export-gear: runs in the page, turns three.js meshes,
   materials and textures into the plain records the app reads (meshes and textures come back as
   content, hashed in Node) */
function sceneWriter(warn) {
  const geos = new Map(), texs = new Map(), mats = [], matIdx = new Map();
  const f32 = a => Array.from(a, v => Math.fround(v));
  function geoOf(g) {
    if (geos.has(g.uuid)) return g.uuid;
    let geo = g;
    if (!geo.attributes.normal) { geo = geo.clone(); geo.computeVertexNormals(); }
    const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv, C = geo.attributes.color;
    const flat = (attr, n) => { const out = new Array(attr.count * n); for (let i = 0; i < attr.count; i++) for (let k = 0; k < n; k++) out[i * n + k] = attr.getComponent(i, k); return out; };
    const idx = geo.index ? Array.from(geo.index.array) : Array.from({ length: P.count }, (_, i) => i);
    geos.set(g.uuid, { pos: flat(P, 3), nor: flat(N, 3), uv: U ? flat(U, 2) : null, col: C ? flat(C, C.itemSize >= 3 ? 3 : 1) : null, idx, groups: geo.groups.map(gr => [gr.start, gr.count, gr.materialIndex]) });
    return g.uuid;
  }
  function texOf(t) {
    if (!t) return null;
    const img = t.image;
    let url = null;
    if (img && img.getContext) url = img.toDataURL('image/png');
    else if (img && img.width) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); url = c.toDataURL('image/png'); }
    if (!url) { warn.push('texture without an image'); return null; }
    texs.set(t.uuid, url);
    return { t: t.uuid, srgb: t.colorSpace === THREE.SRGBColorSpace, rep: [t.repeat.x, t.repeat.y], off: [t.offset.x, t.offset.y], rot: t.rotation, center: [t.center.x, t.center.y],
      wrap: t.wrapS === THREE.RepeatWrapping ? 'repeat' : t.wrapS === THREE.MirroredRepeatWrapping ? 'mirror' : 'clamp', flipY: t.flipY, aniso: t.anisotropy, flow: (flowTex.find(f => f.t === t) || {}).speed || 0 };
  }
  const lin = c => [c.r, c.g, c.b];
  function matOf(m) {
    if (matIdx.has(m.uuid)) return matIdx.get(m.uuid);
    const o = { type: m.type, color: m.color ? lin(m.color) : [1, 1, 1], opacity: m.opacity, transparent: m.transparent, alphaTest: m.alphaTest,
      side: m.side === THREE.DoubleSide ? 'double' : m.side === THREE.BackSide ? 'back' : 'front', depthWrite: m.depthWrite, vertexColors: !!m.vertexColors,
      map: texOf(m.map), toneMapped: m.toneMapped !== false, polygonOffset: m.polygonOffset ? [m.polygonOffsetFactor, m.polygonOffsetUnits] : null };
    if (m.isMeshStandardMaterial) Object.assign(o, { roughness: m.roughness, metalness: m.metalness, normalMap: texOf(m.normalMap), normalScale: m.normalScale ? [m.normalScale.x, m.normalScale.y] : null,
      roughnessMap: texOf(m.roughnessMap), metalnessMap: texOf(m.metalnessMap), emissive: lin(m.emissive), emissiveIntensity: m.emissiveIntensity, emissiveMap: texOf(m.emissiveMap),
      alphaMap: texOf(m.alphaMap), envMapIntensity: m.envMapIntensity, flatShading: !!m.flatShading });
    if (m.isMeshPhysicalMaterial) Object.assign(o, { sheen: m.sheen, sheenRoughness: m.sheenRoughness, sheenColor: lin(m.sheenColor), clearcoat: m.clearcoat, clearcoatRoughness: m.clearcoatRoughness,
      ior: m.ior, transmission: m.transmission });
    if (m.onBeforeCompile && m.customProgramCacheKey) { const k = m.customProgramCacheKey(); if (k && k !== THREE.Material.prototype.customProgramCacheKey.call(m)) o.shader = k; }
    if (!m.isMeshStandardMaterial && !m.isMeshBasicMaterial) warn.push('material ' + m.type);
    mats.push(o); matIdx.set(m.uuid, mats.length - 1);
    return mats.length - 1;
  }
  const node = (o, root) => {
    const mats = [].concat(o.material).map(matOf);
    const x = new THREE.Matrix4();
    if (root) x.copy(root.matrixWorld).invert().multiply(o.matrixWorld); else x.copy(o.matrixWorld);
    /* to the micrometre: invisible, and half the size */
    return { g: geoOf(o.geometry), m: mats.length === 1 ? mats[0] : mats, x: Array.from(x.elements, v => Math.round(v * 1e6) / 1e6), shadow: [o.castShadow, o.receiveShadow], order: o.renderOrder || 0 };
  };
  return { geos, texs, mats, geoOf, texOf, matOf, node, lin };
}
module.exports = { sceneWriter };
