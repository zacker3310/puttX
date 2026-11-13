#!/usr/bin/env node
/* export-scene: the iOS course scenery, straight out of the web renderer. It runs the game's own
   buildHoleScene for every hole in headless Chromium and writes what it built, so the look stays
   authored once (courses/cNN.look.js, src/game.js) and the app draws the same course:

     ios/PuttX/Scene/geo/<hash>.bin    each distinct mesh, once for the whole game (positions,
                                       normals, uvs, colours, indices; little-endian)
     ios/PuttX/Scene/tex/<hash>.png    each distinct texture, once (the canvases the web paints)
     ios/PuttX/Scene/holes/<key>.json  a hole: its materials, its static nodes (mesh, material, world
                                       matrix), its movers (unposed; the app poses them from the sim
                                       as updateMovers does), and the parts the app grows itself

   Grown natively, from the same sim data (they are most of the vertices and all of them follow
   groundH): the turf grid, its collar round the cup, the zones, the skirt and the ground plane. For
   those the hole file names the material and the parameters.

   Usage: node scripts/export-scene.cjs [--course 5 | --hole 5-3] [--out dir]
   CHROMIUM=/path/to/chrome when playwright-core's own download is not installed. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { build, ROOT } = require('./build.cjs');

const args = process.argv.slice(2), val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const one = val('--hole'), only = val('--course') ? [Number(val('--course'))] : one ? [Number(one.split('-')[0])] : null;
const OUT = path.resolve(val('--out') || path.join(ROOT, 'ios/PuttX/Scene'));
for (const d of ['geo', 'tex', 'holes']) fs.mkdirSync(path.join(OUT, d), { recursive: true });

const pre = path.join(ROOT, 'preview');
fs.mkdirSync(pre, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript' };
const srv = http.createServer((req, res) => {
  const p = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

/* runs in the page: serialises holeGroup. Meshes and textures come back as content (hashed here in
   Node), everything else as plain JSON. */
function grabHole(key) {
  startHole(key);
  const h = play.hole, warn = [];
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
    return { g: geoOf(o.geometry), m: mats.length === 1 ? mats[0] : mats, x: Array.from(x.elements), shadow: [o.castShadow, o.receiveShadow], order: o.renderOrder || 0 };
  };
  holeGroup.updateMatrixWorld(true);
  const out = { key, static: [], movers: [], native: { zones: [] } };
  /* the parts grown natively: just their materials and parameters */
  const nativeTop = new Set();
  for (const c of holeGroup.children) {
    if (c.name === 'floor') { out.native.floor = matOf(c.material); nativeTop.add(c); }
    else if (c.name === 'collar') { out.native.collar = matOf(c.material); nativeTop.add(c); }
    else if (c.name === 'skirt') { out.native.skirt = { m: matOf(c.material), bottom: c.geometry.boundingBox ? null : null }; nativeTop.add(c); }
    else if (c.isMesh && 'zoneColor' in c.userData) { out.native.zones.push({ m: matOf(c.material), lift: c.geometry.attributes.position.getY(0) - groundH(h, c.geometry.attributes.position.getX(0), c.geometry.attributes.position.getZ(0)) }); nativeTop.add(c); }
    else if (c.isMesh && c.renderOrder === -1 && c.geometry.type === 'PlaneGeometry') { out.native.ground = matOf(c.material); nativeTop.add(c); }
  }
  /* the skirt's bottom: the lowest point of its geometry is the slab's foot (or the ground just under it) */
  const ground = !!out.native.ground;
  out.native.skirt.bottom = ground ? -0.03 : -0.5;
  const moverSet = new Set(moverMeshes);
  for (const c of holeGroup.children) {
    if (nativeTop.has(c) || moverSet.has(c)) continue;
    c.traverseVisible(o => {
      if (o.isInstancedMesh) {
        /* one mesh, many copies: each instance's matrix (within the node) and its tint */
        const n = node(o), im = new THREE.Matrix4(), c = new THREE.Color(), r6 = v => Math.round(v * 1e6) / 1e6;
        n.inst = [];
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, im);
          const e = Array.from(im.elements, r6);
          if (o.instanceColor) { o.getColorAt(i, c); e.push(r6(c.r), r6(c.g), r6(c.b)); }
          n.inst.push(e);
        }
        out.static.push(n);
      } else if (o.isMesh) out.static.push(node(o));
      else if (o.isPoints || o.isLine || o.isSprite) warn.push(o.type + ' skipped');
    });
  }
  for (const mv of moverMeshes) {
    const keep = { p: mv.position.clone(), r: mv.rotation.clone() };
    mv.position.set(0, 0, 0); mv.rotation.set(0, 0, 0); mv.updateMatrixWorld(true);
    const parts = [];
    mv.traverseVisible(o => { if (o.isMesh) parts.push(node(o, mv)); });
    out.movers.push(parts);
    mv.position.copy(keep.p); mv.rotation.copy(keep.r); mv.updateMatrixWorld(true);
  }
  /* the light and air the hole was lit with: the app sets its own sun, sky and fog from these */
  const look = lookOf(holeWorld(h));
  out.env = { sky: look.sky, fog: scene.fog ? { color: lin(scene.fog.color), near: scene.fog.near, far: scene.fog.far } : null,
    sun: { dir: Array.from(sun.position.clone().sub(sun.target.position).normalize().toArray()), color: lin(sun.color), intensity: sun.intensity },
    hemi: { sky: lin(hemi.color), ground: lin(hemi.groundColor), intensity: hemi.intensity }, environmentIntensity: scene.environmentIntensity, night: !!look.night, wallKind: wallKindNow };
  out.mats = mats;
  return { out, geos: Object.fromEntries(geos), texs: Object.fromEntries(texs), warn };
}

const hash = buf => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 20);
function geoBin(g) {
  /* PXG1 | vcount u32 | icount u32 | flags u32 (1 uv, 2 colour, 4 grey colour) | ngroups u32 | pos f32*3 | nor f32*3 | uv f32*2 | col f32*3 | idx u32 | groups u32*3 */
  const v = g.pos.length / 3, grey = g.col && g.col.length === v;
  const flags = (g.uv ? 1 : 0) | (g.col ? 2 : 0) | (grey ? 4 : 0);
  const n = 20 + v * 24 + (g.uv ? v * 8 : 0) + (g.col ? (grey ? v * 4 : v * 12) : 0) + g.idx.length * 4 + g.groups.length * 12;
  const b = Buffer.alloc(n);
  let o = b.write('PXG1', 0, 'ascii');
  o = b.writeUInt32LE(v, o); o = b.writeUInt32LE(g.idx.length, o); o = b.writeUInt32LE(flags, o); o = b.writeUInt32LE(g.groups.length, o);
  for (const a of [g.pos, g.nor, g.uv, g.col]) if (a) for (const x of a) o = b.writeFloatLE(x, o);
  for (const i of g.idx) o = b.writeUInt32LE(i, o);
  for (const gr of g.groups) for (const x of gr) o = b.writeUInt32LE(Number.isFinite(x) ? Math.min(x, 0xffffffff) : 0xffffffff, o);
  return b;
}

srv.listen(0, '127.0.0.1', async () => {
  const pw = require('playwright-core');
  const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM || pw.chromium.executablePath(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const { loadSim } = require('../tests/sim.cjs');
  const S = loadSim();
  const courses = only || S.allCourses();
  const stats = { holes: 0, geoNew: 0, texNew: 0, bytes: 0, warn: new Map() };
  for (const c of courses) {
    const page = `preview/scene-c${c}-${process.pid}.html`;
    fs.writeFileSync(path.join(ROOT, page), build([...new Set([((c - 1) % 10) + 1, c])]));
    const tab = await browser.newPage({ viewport: { width: 1200, height: 700 } });
    tab.on('pageerror', e => console.error(`page c${c}: ${e}`));
    tab.setDefaultTimeout(900000);
    await tab.goto(`http://127.0.0.1:${srv.address().port}/${page}?hole=${c}-1`);
    await tab.waitForFunction(() => window.booted === true);
    const keys = one ? [one] : S.WORLDS[c].holes.map(h => h.key);
    for (const key of keys) {
      const { out, geos, texs, warn } = await tab.evaluate(grabHole, key);
      for (const w of warn) stats.warn.set(w, (stats.warn.get(w) || 0) + 1);
      /* content hashes: the same mesh or texture anywhere in the game is stored once */
      const gmap = {}, tmap = {};
      for (const [id, g] of Object.entries(geos)) {
        const b = geoBin(g), hsh = hash(b), f = path.join(OUT, 'geo', hsh + '.bin');
        if (!fs.existsSync(f)) { fs.writeFileSync(f, b); stats.geoNew++; stats.bytes += b.length; }
        gmap[id] = hsh;
      }
      for (const [id, url] of Object.entries(texs)) {
        const b = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'), hsh = hash(b), f = path.join(OUT, 'tex', hsh + '.png');
        if (!fs.existsSync(f)) { fs.writeFileSync(f, b); stats.texNew++; stats.bytes += b.length; }
        tmap[id] = hsh;
      }
      const fix = n => { n.g = gmap[n.g]; return n; };
      out.static.forEach(fix); out.movers.forEach(p => p.forEach(fix));
      for (const m of out.mats) for (const k of Object.keys(m)) if (m[k] && typeof m[k] === 'object' && 't' in m[k]) m[k].t = tmap[m[k].t];
      const js = JSON.stringify(out);
      fs.writeFileSync(path.join(OUT, 'holes', key + '.json'), js + '\n');
      stats.bytes += js.length; stats.holes++;
      process.stdout.write(`${key} `);
    }
    await tab.close();
    fs.rmSync(path.join(ROOT, page), { force: true });
  }
  console.log(`\n${stats.holes} holes, ${stats.geoNew} new meshes, ${stats.texNew} new textures, ${(stats.bytes / 1048576).toFixed(1)} MB written`);
  for (const [w, n] of stats.warn) console.log(`warning (${n}x): ${w}`);
  await browser.close(); srv.close();
});
