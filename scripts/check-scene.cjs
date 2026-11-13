#!/usr/bin/env node
/* check-scene: is the exported scenery the scenery? For each hole it renders the game's own aim view,
   then swaps everything export-scene wrote (the static nodes and the movers) for meshes rebuilt only
   from the exported files, renders again from the same camera, and compares the two frames. A
   faithful export differs by nothing but rounding.
   Usage: node scripts/check-scene.cjs --course 1 [--hole 1-3] [--dir ios/PuttX/Scene] [--shots dir] */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { build, ROOT } = require('./build.cjs');

const args = process.argv.slice(2), val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const one = val('--hole'), course = Number(val('--course') || (one || '').split('-')[0]);
const DIR = path.resolve(val('--dir') || path.join(ROOT, 'ios/PuttX/Scene')), SHOTS = val('--shots');
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(path.join(ROOT, 'preview'), { recursive: true });
const page = `preview/check-c${course}-${process.pid}.html`;
fs.writeFileSync(path.join(ROOT, page), build([...new Set([((course - 1) % 10) + 1, course])]));
/* the page reads plain floats (PXG1); whatever is on disk is decoded here and served that way */
const { decode } = require('./scene-format.cjs');
function asPXG1(buf) {
  const g = decode(buf), v = g.pos.length / 3, flags = (g.uv ? 1 : 0) | (g.col ? 2 : 0) | (g.col && g.col.length === v ? 4 : 0);
  const out = Buffer.alloc(20 + 4 * (g.pos.length + g.nor.length + (g.uv ? g.uv.length : 0) + (g.col ? g.col.length : 0) + g.idx.length) + g.groups.length * 12);
  let o = out.write('PXG1', 0, 'ascii');
  for (const x of [v, g.idx.length, flags, g.groups.length]) o = out.writeUInt32LE(x, o);
  for (const a of [g.pos, g.nor, g.uv, g.col]) if (a) for (const x of a) o = out.writeFloatLE(x, o);
  for (const i of g.idx) o = out.writeUInt32LE(i, o);
  for (const gr of g.groups) for (const x of gr) o = out.writeUInt32LE(Number.isFinite(x) ? x : 0xffffffff, o);
  return out;
}
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let p = u.startsWith('/scene/') ? path.join(DIR, u.slice(7)) : path.normalize(path.join(ROOT, u));
  /* a deflated hole file is served plain */
  if (u.startsWith('/scene/holes/') && !fs.existsSync(p) && fs.existsSync(p + '.z')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(require('zlib').inflateRawSync(fs.readFileSync(p + '.z')));
  }
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  if (u.startsWith('/scene/geo/')) { res.writeHead(200, { 'Content-Type': 'application/octet-stream' }); return res.end(asPXG1(fs.readFileSync(p))); }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

/* in the page: rebuild a hole's exported nodes from the files alone */
async function rebuild(key) {
  const hole = await (await fetch(`/scene/holes/${key}.json`)).json();
  const geoCache = {}, texCache = {};
  async function geo(hsh) {
    if (geoCache[hsh]) return geoCache[hsh];
    const b = await (await fetch(`/scene/geo/${hsh}.bin`)).arrayBuffer(), dv = new DataView(b);
    const v = dv.getUint32(4, true), ni = dv.getUint32(8, true), flags = dv.getUint32(12, true), ng = dv.getUint32(16, true);
    let o = 20;
    const take = n => { const a = new Float32Array(b.slice(o, o + n * 4)); o += n * 4; return a; };
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(take(v * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(take(v * 3), 3));
    if (flags & 1) g.setAttribute('uv', new THREE.BufferAttribute(take(v * 2), 2));
    if (flags & 2) { if (flags & 4) { const k = take(v), c = new Float32Array(v * 3); for (let i = 0; i < v; i++) c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = k[i]; g.setAttribute('color', new THREE.BufferAttribute(c, 3)); } else g.setAttribute('color', new THREE.BufferAttribute(take(v * 3), 3)); }
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(b.slice(o, o + ni * 4)), 1)); o += ni * 4;
    for (let i = 0; i < ng; i++) { const s = dv.getUint32(o, true), c = dv.getUint32(o + 4, true), m = dv.getUint32(o + 8, true); o += 12; g.addGroup(s, c === 0xffffffff ? Infinity : c, m); }
    return (geoCache[hsh] = g);
  }
  async function tex(t) {
    if (!t) return null;
    if (!texCache[t.t]) { const img = new Image(); img.src = `/scene/tex/${t.t}.png`; await img.decode(); texCache[t.t] = img; }
    const x = new THREE.Texture(texCache[t.t]); x.needsUpdate = true;
    if (t.srgb) x.colorSpace = THREE.SRGBColorSpace;
    x.wrapS = x.wrapT = t.wrap === 'repeat' ? THREE.RepeatWrapping : t.wrap === 'mirror' ? THREE.MirroredRepeatWrapping : THREE.ClampToEdgeWrapping;
    x.repeat.set(...t.rep); x.offset.set(...t.off); x.rotation = t.rot; x.center.set(...t.center); x.flipY = t.flipY; x.anisotropy = t.aniso || 1;
    return x;
  }
  const mats = await Promise.all(hole.mats.map(async m => {
    const T = m.type === 'MeshPhysicalMaterial' ? THREE.MeshPhysicalMaterial : m.type === 'MeshBasicMaterial' ? THREE.MeshBasicMaterial : THREE.MeshStandardMaterial;
    const o = { color: new THREE.Color(...m.color), opacity: m.opacity, transparent: m.transparent, alphaTest: m.alphaTest, depthWrite: m.depthWrite, vertexColors: m.vertexColors, map: await tex(m.map), toneMapped: m.toneMapped,
      side: m.side === 'double' ? THREE.DoubleSide : m.side === 'back' ? THREE.BackSide : THREE.FrontSide };
    if (T !== THREE.MeshBasicMaterial) Object.assign(o, { roughness: m.roughness, metalness: m.metalness, normalMap: await tex(m.normalMap), roughnessMap: await tex(m.roughnessMap), metalnessMap: await tex(m.metalnessMap),
      emissive: new THREE.Color(...m.emissive), emissiveIntensity: m.emissiveIntensity, emissiveMap: await tex(m.emissiveMap), alphaMap: await tex(m.alphaMap), envMapIntensity: m.envMapIntensity, flatShading: m.flatShading });
    if (m.normalScale) o.normalScale = new THREE.Vector2(...m.normalScale);
    if (m.polygonOffset) Object.assign(o, { polygonOffset: true, polygonOffsetFactor: m.polygonOffset[0], polygonOffsetUnits: m.polygonOffset[1] });
    if (T === THREE.MeshPhysicalMaterial) Object.assign(o, { sheen: m.sheen, sheenRoughness: m.sheenRoughness, sheenColor: new THREE.Color(...m.sheenColor), clearcoat: m.clearcoat, clearcoatRoughness: m.clearcoatRoughness, ior: m.ior, transmission: m.transmission });
    return new T(o);
  }));
  const mk = async n => {
    const mat = Array.isArray(n.m) ? n.m.map(i => mats[i]) : mats[n.m];
    const mesh = n.inst ? new THREE.InstancedMesh(await geo(n.g), mat, n.inst.length) : new THREE.Mesh(await geo(n.g), mat);
    if (n.inst) n.inst.forEach((e, i) => { mesh.setMatrixAt(i, new THREE.Matrix4().fromArray(e)); if (e.length > 16) mesh.setColorAt(i, new THREE.Color(e[16], e[17], e[18])); }); mesh.matrixAutoUpdate = false; mesh.matrix.fromArray(n.x); mesh.castShadow = n.shadow[0]; mesh.receiveShadow = n.shadow[1]; mesh.renderOrder = n.order; return mesh; };
  const g = new THREE.Group();
  for (const n of hole.static) g.add(await mk(n));
  /* particle clouds, as the web draws them */
  for (const c of hole.points || []) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(c.pts, 3));
    g.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: new THREE.Color(...c.color), size: c.size, sizeAttenuation: c.atten, transparent: c.opacity < 1, opacity: c.opacity, depthWrite: c.opacity >= 1 })));
  }
  /* the animated objects, at their t = 0 pose */
  const rigs = [];
  for (const a of hole.anims || []) {
    const p = new THREE.Group(); p.matrixAutoUpdate = false; p.matrix.fromArray(a.px);
    (a.up >= 0 ? rigs[a.up] : g).add(p);
    const o = new THREE.Group(), c = k => a.ch[k] ? a.ch[k][0] + a.ch[k].slice(2).reduce((s, v, i, l) => i % 3 ? s : s + v * Math.sin(l[i + 2]), 0) : null;
    o.position.set(c('px') ?? a.b[0], c('py') ?? a.b[1], c('pz') ?? a.b[2]); o.rotation.set(c('rx') ?? a.b[3], c('ry') ?? a.b[4], c('rz') ?? a.b[5]); o.scale.set(a.b[6], a.b[7], a.b[8]);
    if (a.vis) o.visible = Math.sin(a.vis[1]) > a.vis[2];
    for (const n of a.parts) o.add(await mk(n));
    p.add(o); rigs.push(o);
  }
  const movers = [];
  for (const [i, parts] of hole.movers.entries()) {
    const m = new THREE.Group(); for (const n of parts) m.add(await mk(n));
    for (const w of (hole.weeds || []).filter(w => w.i === i)) { const inner = new THREE.Group(); inner.matrixAutoUpdate = false; inner.matrix.fromArray(w.x); for (const n of w.parts) inner.add(await mk(n)); m.add(inner); }
    movers.push(m); g.add(m);
  }
  return { g, movers, counts: { static: hole.static.length, movers: hole.movers.length } };
}

srv.listen(0, '127.0.0.1', async () => {
  const pw = require('playwright-core');
  const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM || pw.chromium.executablePath(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const tab = await browser.newPage({ viewport: { width: 1200, height: 700 } });
  tab.on('pageerror', e => console.error('page: ' + e));
  tab.setDefaultTimeout(900000);
  await tab.goto(`http://127.0.0.1:${srv.address().port}/${page}?hole=${course}-1`);
  await tab.waitForFunction(() => window.booted === true);
  await tab.addScriptTag({ content: `window.__rebuild = ${rebuild.toString()};` });
  const keys = one ? [one] : await tab.evaluate(c => WORLDS[c].holes.map(h => h.key), course);
  let worst = 0;
  for (const key of keys) {
    const r = await tab.evaluate(async key => {
      /* freeze the game's own loop: nothing may move between the two frames */
      loopPaused = true;
      startHole(key); play.intro = null; snapCamera();
      /* the scenery's own animation, at t = 0 (what export-scene wrote) */
      const lk = lookOf(holeWorld(play.hole)); if (lk.tick) lk.tick(holeGroup, 0, 0);
      const t = play.time, flows = flowTex.map(f => f.t.offset.clone());
      let pose = () => {};
      const frame = () => { play.time = t; flowTex.forEach((f, i) => f.t.offset.copy(flows[i])); updateMovers(t); pose(); renderFrame(0); const c = renderer.domElement, x = document.createElement('canvas'); x.width = c.width; x.height = c.height; x.getContext('2d').drawImage(c, 0, 0); return x; };
      const a = frame();
      /* swap: hide what was exported, show what the files rebuild */
      const { g, movers, counts } = await window.__rebuild(key);
      const exported = new Set(), keep = [];
      for (const c of holeGroup.children) if (!['floor', 'collar', 'skirt'].includes(c.name) && !('zoneColor' in c.userData) && !(c.renderOrder === -1 && c.geometry && c.geometry.type === 'PlaneGeometry')) exported.add(c);
      for (const c of exported) { keep.push([c, c.visible]); c.visible = false; }
      /* the rebuilt movers stand where the game's stand, at the same instant */
      pose = () => moverMeshes.forEach((m, i) => { movers[i].position.copy(m.position); movers[i].rotation.copy(m.rotation); });
      holeGroup.add(g);
      const b = frame();
      holeGroup.remove(g); for (const [c, v] of keep) c.visible = v;
      loopPaused = false;
      const da = a.getContext('2d').getImageData(0, 0, a.width, a.height).data, db = b.getContext('2d').getImageData(0, 0, b.width, b.height).data;
      let off = 0, sum = 0;
      for (let i = 0; i < da.length; i += 4) { const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]); sum += d; if (d > 24) off++; }
      return { counts, offPct: 100 * off / (da.length / 4), meanDiff: sum / (da.length / 4) / 3, a: a.toDataURL('image/png'), b: b.toDataURL('image/png') };
    }, key);
    worst = Math.max(worst, r.offPct);
    console.log(`${key}: ${r.counts.static} nodes, ${r.counts.movers} movers; ${r.offPct.toFixed(3)}% of pixels differ, mean ${r.meanDiff.toFixed(3)}`);
    if (SHOTS) for (const [n, u] of [['web', r.a], ['rebuilt', r.b]]) fs.writeFileSync(path.join(SHOTS, `${key}-${n}.png`), Buffer.from(u.slice(22), 'base64'));
  }
  console.log(`worst: ${worst.toFixed(3)}% of pixels differ`);
  await browser.close(); srv.close(); fs.rmSync(path.join(ROOT, page), { force: true });
  process.exit(worst > 0.5 ? 1 : 0);
});
