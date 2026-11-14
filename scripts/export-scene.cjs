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

   Usage: node scripts/export-scene.cjs [--course 5 | --hole 5-3] [--neon] [--out dir]
   (--neon writes holes/<key>.n.json, the hole under neon night)
   CHROMIUM=/path/to/chrome when playwright-core's own download is not installed. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { build, ROOT } = require('./build.cjs');
const { sceneWriter } = require('./scene-writer.cjs');

const args = process.argv.slice(2), val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const neon = args.includes('--neon');
const one = val('--hole'), only = val('--course') ? val('--course').split(',').map(Number) : one ? [Number(one.split('-')[0])] : null;
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
function grabHole([key, neon]) {
  /* neon night: the same hole as the web dresses it after dark (nightDecor) */
  progress.neon = !!neon;
  startHole(key);
  const h = play.hole, warn = [];
  const { geos, texs, mats, geoOf, texOf, matOf, node, lin } = sceneWriter(warn);
  /* ---- what moves every frame (a look's tick): each animated object as a formula of the time, so
     the app replays it without the web's code. A channel is [c, rate, a1, f1, p1, a2, f2, p2, ...]:
     c + rate * t + sum a * sin(f * t + p) (`relu`: each sine clipped at 0). Checked against the real
     tick below before anything is written. */
  const lk = lookOf(holeWorld(h)), G = holeGroup, H = Math.PI / 2;
  const ticks = new Set([lk.tick]);
  if (lk.tick && /WORLD_LOOK\[10\]/.test(String(lk.tick)) && WORLD_LOOK[10]) ticks.add(WORLD_LOOK[10].tick);
  const uses = n => !!(WORLD_LOOK[n] && WORLD_LOOK[n].tick && ticks.has(WORLD_LOOK[n].tick));
  const A = { objs: new Map(), mats: [], pts: new Map(), weeds: new Set() };
  const ch = (o, k, spec) => { let r = A.objs.get(o); if (!r) A.objs.set(o, r = { ch: {} }); r.ch[k] = spec; return r; };
  const ud = G.userData;
  if (lk.tick) {
    if (ud.j3flies) A.pts.set(ud.j3flies, { k: 'flies' });
    if (ud.snow) A.pts.set(ud.snow, { k: 'snow' });
    if (ud.embers) A.pts.set(ud.embers, { k: 'embers' });
    if (ud.ship) { ch(ud.ship, 'rz', [0, 0, 0.03, 0.9, 0]); ch(ud.ship, 'py', [-0.05, 0, 0.03, 1.3, 0]); }
    for (const f of ud.floats || []) ch(f, 'py', [0, 0, 0.025, 1.6, f.userData.bob]);
    if (ud.embers && ud.crater) A.mats.push({ m: ud.crater.material, p: 'g', ch: [0.38, 0, 0.08, 1.3, 0] });
    if (ud.embers && ud.smoke) ch(ud.smoke, 'ry', [0, 0, 0.05, 0.1, 0]);
    if (ud.embers) for (const m of ud.glow || []) A.mats.push({ m, p: 'ei', ch: [0.5, 0, 0.12, 1.7, 0] });
    if (ud.c7) {
      const d = ud.c7;
      for (const b of d.bats) {
        const u = b.userData.c7;
        ch(b, 'px', [d.cx, 0, u.rad, u.sp, u.a + H]); ch(b, 'pz', [d.cz, 0, u.rad, u.sp, u.a]);
        ch(b, 'py', [u.y, 0, 0.3, 0.7, u.a]); ch(b, 'ry', [-u.a, -u.sp]);
        b.children.forEach(c => { if (c.children[0] && c.children[0].userData.c7Wing) ch(c, 'rz', [0, 0, c.children[0].userData.c7Wing * 0.5, 9, u.a]); });
      }
      for (const o of d.bobs) ch(o, 'py', [0, 0, 0.02, 2.2, o.userData.c7Bob]);
    }
    if (uses(8)) for (const o of G.children) {
      if (o.name === 'stars' && o.isPoints) { A.pts.set(o, { k: 'spin', rate: 0.004 }); ch(o, 'ry', [0, 0.004]); }
      else if (o.name === 'planet') ch(o, 'ry', [0, 0.05]);
      else if (o.name === 'lamp') ch(o, 'ry', [0, 2]);
      else if (o.name === 'drift') {
        ch(o, 'py', [0, 0, 0.06, 0.8, o.userData.bob]);
        const b = o.getObjectByName('beacon');
        if (b) { let r = A.objs.get(b); if (!r) A.objs.set(b, r = { ch: {} }); r.vis = [3, o.userData.bob, -0.4]; }
      }
    }
    for (const d of ud.lolly || []) ch(d, 'ry', [d.rotation.y, 0.6]);
    if (uses(10)) {
      for (const o of G.children) {
        const d = o.userData && o.userData.c10drift;
        if (d) { ch(d.c, 'px', [d.base, 0, 0.6, d.sp * 0.3, d.ph]); ch(d.c, 'py', [d.c.position.y + 0.03 / d.sp * Math.cos(d.ph), 0, -0.03 / d.sp, d.sp, d.ph + H]); }
      }
      for (const f of ud.c10far || []) ch(f.c, 'py', [f.base, 0, 0.25, 0.25, f.a * 3]);
    }
    if (uses(11)) for (const o of G.children) for (const c of o.children) if (c.userData.c11spin) ch(c, 'ry', [c.rotation.y, c.userData.c11spin]);
    for (const b of ud.c30bands || []) { A.mats.push({ m: b.m.material, p: 'op', ch: [0.25, 0, 0.12, 0.4, b.ph] }); ch(b.m, 'rz', [0, 0, 0.08, 0.15, b.ph]); }
    if (uses(98)) for (const o of G.children) if (o.userData.c98sign) for (const c of o.children) if (c.userData.c98flag) ch(c, 'ry', [0, 0, 0.35, 1.7, 0, 0.12, 4.3, 0]);
    if (uses(99)) for (const o of G.children) if (o.userData.c99spin) o.children.forEach((c, i) => { if (c.material && c.material.emissive && i > 0) A.mats.push({ m: c.material, p: 'ei', ch: [0.5, 0, 0.5, 3, -i * 0.6], relu: 1 }); });
    G.traverse(o => { if (o.userData.weed && o.userData.mover) A.weeds.add(o.userData.weed); });
  }
  /* the flagstick: its own rig (no formula), so the app can lift it out of the cup as a ball nears */
  if (typeof flagGroup !== 'undefined' && flagGroup && flagGroup.parent) { let r = A.objs.get(flagGroup); if (!r) A.objs.set(flagGroup, r = { ch: {} }); r.name = 'flag'; }
  /* neon night (tickNight): lasers sweep, the disco ball turns and wheels its spots over the carpet,
     the shapes tumble, and the cup ring and the wall halos breathe on the beat (`beat`: the channel's
     amplitude times exp(-5 x the beat's phase), 118 to the minute) */
  const night = !!G.getObjectByName('neonDrift');
  if (night) {
    for (const p of G.getObjectByName('lasers').children) { const ph = p.userData.phase, sd = p.userData.side; ch(p, 'rx', [0, 0, 0.45, 0.6, ph]); ch(p, 'rz', [-sd * 0.45, 0, -sd * 0.3, 0.42, 0.7 * ph]); }
    const disco = G.getObjectByName('disco'); ch(disco, 'ry', [disco.rotation.y, 0.8]);
    const spots = G.getObjectByName('spots');
    for (const m of spots.children) { let r = A.objs.get(m); if (!r) A.objs.set(m, r = { ch: {} }); r.orbit = [m.userData.a, m.userData.r, spots.position.x, spots.position.z]; }
    for (const o of G.getObjectByName('neonDrift').children) { ch(o, 'rx', [o.rotation.x, o.userData.spin]); ch(o, 'ry', [o.rotation.y, o.userData.spin * 0.7]); }
    const glow = G.getObjectByName('cupGlow'); if (glow) A.mats.push({ m: glow.material, p: 'op', ch: [0.6, 0], beat: 0.4 });
    const walls = G.getObjectByName('walls'), seen = new Set();
    if (walls) for (const c of walls.children) if (c.name === 'halo' && !seen.has(c.material)) { seen.add(c.material); A.mats.push({ m: c.material, p: 'op', ch: [0.1, 0], beat: 0.22 }); }
  }
  const beatK = t => Math.exp(-((t * BPM / 60) % 1) * 5);
  const orbitAt = (o, t) => { const [a0, r, cx, cz] = o, a = a0 + t * 0.35, x = Math.cos(a) * r, z = Math.sin(a) * r; return { x, z, y: groundH(h, cx + x, cz + z) + 0.006, vis: onFloor(h, cx + x, cz + z) }; };
  const chan = (c, t, relu) => { let v = c[0] + c[1] * t; for (let i = 2; i < c.length; i += 3) { const s = Math.sin(c[i + 1] * t + c[i + 2]); v += c[i] * (relu ? Math.max(0, s) : s); } return v; };
  /* the particle drifts, in closed form (the tick integrates them frame by frame) */
  const ptAt = (k, p0, i, t, rate) => {
    let [x, y, z] = p0;
    /* a drift that wraps (snow falls, embers rise): x follows the antiderivative F along y, segment by segment */
    const wrapped = (v, lo, hi, F) => {
      const L = hi - lo, Y = y + v * t;
      const n = v > 0 ? Math.max(0, Math.ceil((Y - hi) / L)) : Math.max(0, Math.ceil((lo - Y) / L)), yy = v > 0 ? Y - n * L : Y + n * L;
      const a = v > 0 ? hi : lo, b = v > 0 ? lo : hi;
      x += n === 0 ? F(yy) - F(y) : F(a) - F(y) + (n - 1) * (F(a) - F(b)) + F(yy) - F(b);
      y = yy;
    };
    if (k === 'flies') { y += 0.12 / 1.3 * (Math.cos(i) - Math.cos(1.3 * t + i)); x += 0.08 / 0.9 * (Math.sin(0.9 * t + 1.7 * i) - Math.sin(1.7 * i)); }
    else if (k === 'snow') wrapped(-0.45, 0.6, 6.6, u => 0.05 / 0.9 * Math.cos(2 * u + i));
    else if (k === 'embers') wrapped(0.25, 0.3, 5, u => -0.03 / (0.25 * 1.7) * Math.cos(1.7 * u + i));
    else if (k === 'spin') { const a = rate * t, c = Math.cos(a), s = Math.sin(a); [x, z] = [x * c + z * s, -x * s + z * c]; }
    return [x, y, z];
  };
  const tickAll = (dt, t) => { if (lk.tick) lk.tick(G, dt, t); if (night) tickNight(dt, t); };
  if (lk.tick || night) {
    tickAll(0, 0);
    /* the pose at t = 0 is what is exported; step the real tick for 3 s and hold every formula to it */
    const snap = []; G.traverse(o => snap.push([o, o.position.clone(), o.rotation.clone(), o.scale.clone(), o.visible, o.quaternion.clone()]));
    const allMats = new Set(); G.traverse(o => { if (o.material) [].concat(o.material).forEach(m => allMats.add(m)); });
    const msnap = [...allMats].map(m => [m, m.color ? m.color.clone() : null, m.opacity, m.emissiveIntensity]);
    const psnap = []; G.traverse(o => { if (o.isPoints) psnap.push([o, Array.from(o.geometry.attributes.position.array)]); });
    const inWeed = o => { for (let a = o; a; a = a.parent) if (A.weeds.has(a)) return true; return false; };
    const dt = 1 / 240, bad = new Set();
    for (let k = 1; k <= 720; k++) {
      const t = k * dt;
      tickAll(dt, t);
      if (k % 240) continue;
      for (const [o, p, r, , vis] of snap) {
        if (inWeed(o)) continue;
        const sp = A.objs.get(o), want = { px: p.x, py: p.y, pz: p.z, rx: r.x, ry: r.y, rz: r.z };
        if (sp) for (const [c, v] of Object.entries(sp.ch)) want[c] = chan(v, t);
        if (sp && sp.orbit) { const q = orbitAt(sp.orbit, t); want.px = q.x; want.py = q.y; want.pz = q.z; }
        const got = { px: o.position.x, py: o.position.y, pz: o.position.z, rx: o.rotation.x, ry: o.rotation.y, rz: o.rotation.z };
        for (const c of Object.keys(want)) if (Math.abs(want[c] - got[c]) > 2e-3) bad.add(`${o.name || o.type} ${c} ${want[c].toFixed(4)} vs ${got[c].toFixed(4)}`);
        const wv = sp && sp.orbit ? orbitAt(sp.orbit, t).vis : sp && sp.vis ? Math.sin(sp.vis[0] * t + sp.vis[1]) > sp.vis[2] : vis;
        if (wv !== o.visible) bad.add(`${o.name || o.type} visible`);
      }
      for (const [m, c, op, ei] of msnap) {
        const want = { g: c && c.g, r: c && c.r, b: c && c.b, op, ei };
        for (const s of A.mats) if (s.m === m) want[s.p] = chan(s.ch, t, s.relu) + (s.beat ? s.beat * beatK(t) : 0);
        const got = { g: m.color && m.color.g, r: m.color && m.color.r, b: m.color && m.color.b, op: m.opacity, ei: m.emissiveIntensity };
        for (const p of Object.keys(want)) if (want[p] !== undefined && Math.abs(want[p] - got[p]) > 2e-3) bad.add(`material ${m.type} ${p} ${(+want[p]).toFixed(4)} vs ${(+got[p]).toFixed(4)}`);
      }
      for (const [o, p0] of psnap) {
        const sp = A.pts.get(o), a = o.geometry.attributes.position; let off = 0;
        for (let i = 0; i < a.count; i++) {
          const w = sp && sp.k !== 'spin' ? ptAt(sp.k, [p0[i * 3], p0[i * 3 + 1], p0[i * 3 + 2]], i, t, sp.rate) : [p0[i * 3], p0[i * 3 + 1], p0[i * 3 + 2]];
          if (Math.abs(w[0] - a.getX(i)) + Math.abs(w[1] - a.getY(i)) + Math.abs(w[2] - a.getZ(i)) > 5e-3) off++;
        }
        /* a flake that wrapped near a checkpoint may sit a hair off; anything more is a wrong formula */
        if (off > a.count * 0.03) bad.add(`points ${o.name || ''} ${off}/${a.count} off`);
      }
    }
    for (const b of bad) warn.push('anim: ' + b);
    /* back to t = 0 */
    for (const [o, p, r, s, vis, q] of snap) { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(s); o.visible = vis; }
    for (const [m, c, op, ei] of msnap) { if (c) m.color.copy(c); m.opacity = op; if (ei !== undefined) m.emissiveIntensity = ei; }
    for (const [o, p0] of psnap) { o.geometry.attributes.position.array.set(p0); o.geometry.attributes.position.needsUpdate = true; }
    G.updateMatrixWorld(true);
  }
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
  const r6 = v => Math.round(v * 1e6) / 1e6, anims = [];
  /* the scenery: static nodes, and each animated object as its own little rig (its parent's frame,
     its pose at t = 0, its formulas, and the meshes it carries, in its own frame) */
  function walk(o, rec) {
    const sp = A.objs.get(o);
    if (!o.visible && !(sp && (sp.vis || sp.orbit))) return;
    if (sp && !o.isPoints) {
      const px = new THREE.Matrix4();
      if (rec) px.copy(rec.o.matrixWorld).invert();
      px.multiply(o.parent.matrixWorld);
      if (o.rotation.order !== 'XYZ') warn.push('anim rotation order ' + o.rotation.order);
      rec = { o, out: { up: rec ? anims.indexOf(rec.out) : -1, px: Array.from(px.elements, r6), b: [...o.position.toArray(), o.rotation.x, o.rotation.y, o.rotation.z, ...o.scale.toArray()].map(r6), ch: sp.ch, vis: sp.vis || null, name: sp.name || null, orbit: sp.orbit || null, parts: [] } };
      anims.push(rec.out);
    }
    if (o.isInstancedMesh) {
      /* one mesh, many copies: each instance's matrix (within the node) and its tint */
      const n = node(o), im = new THREE.Matrix4(), c = new THREE.Color();
      n.inst = [];
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, im);
        const e = Array.from(im.elements, r6);
        if (o.instanceColor) { o.getColorAt(i, c); e.push(r6(c.r), r6(c.g), r6(c.b)); }
        n.inst.push(e);
      }
      if (rec) warn.push('instanced mesh inside an animated object');
      out.static.push(n);
    } else if (o.isMesh) (rec ? rec.out.parts : out.static).push(node(o, rec ? rec.o : undefined));
    else if (o.isPoints) {
      /* particles (fireflies, snow, embers, night skies): their points in hole space, to the mm */
      const P = o.geometry.attributes.position, m = o.material, pts = [], v = new THREE.Vector3();
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); pts.push(Math.round(v.x * 1000) / 1000, Math.round(v.y * 1000) / 1000, Math.round(v.z * 1000) / 1000); }
      const cloud = { pts, color: lin(m.color), size: m.size, opacity: m.opacity, atten: m.sizeAttenuation !== false, name: o.name || (o.parent && o.parent.name) || '' };
      const pa = A.pts.get(o);
      if (pa) {
        const e = o.matrixWorld.elements;
        if (Math.abs(e[0] - 1) + Math.abs(e[5] - 1) + Math.abs(e[10] - 1) + Math.abs(e[1]) + Math.abs(e[2]) + Math.abs(e[4]) + Math.abs(e[6]) + Math.abs(e[8]) + Math.abs(e[9]) > 1e-6) warn.push('animated points turned or scaled');
        cloud.anim = { k: pa.k, rate: pa.rate || 0, off: [e[12], e[13], e[14]] };
      }
      (out.points = out.points || []).push(cloud);
    } else if (o.isLine || o.isSprite) warn.push(o.type + ' skipped');
    for (const c of o.children) walk(c, rec);
  }
  for (const c of holeGroup.children) if (!nativeTop.has(c) && !moverSet.has(c)) walk(c, null);
  if (anims.length) out.anims = anims;
  if (A.mats.length) out.matAnims = A.mats.map(s => ({ m: matOf(s.m), p: s.p, ch: s.ch, relu: s.relu || 0, beat: s.beat || 0 }));
  /* lights the hole adds (the night's lamp over the cup) */
  const lights = [];
  G.traverse(o => { if (o.isPointLight) { o.updateMatrixWorld(true); const v = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld); lights.push({ color: lin(o.color), intensity: o.intensity, distance: o.distance, decay: o.decay, pos: v.toArray() }); } });
  if (lights.length) out.lights = lights;
  for (const mv of moverMeshes) {
    const keep = { p: mv.position.clone(), r: mv.rotation.clone() };
    mv.position.set(0, 0, 0); mv.rotation.set(0, 0, 0); mv.updateMatrixWorld(true);
    const parts = [], inner = mv.userData.weed;
    const within = (o, a) => { for (let p = o; p; p = p.parent) if (p === a) return true; return false; };
    /* something animated riding a mover (c07's ghosts bob inside theirs): its own rig, in the mover's
       frame, carried along as the mover goes */
    const riders = []; mv.traverse(o => { if (o !== mv && A.objs.has(o) && !riders.some(r => within(o, r))) riders.push(o); });
    for (const o of riders) {
      const sp = A.objs.get(o), px = new THREE.Matrix4().copy(mv.matrixWorld).invert().multiply(o.parent.matrixWorld), rp = [];
      o.traverseVisible(q => { if (q.isMesh) rp.push(node(q, o)); });
      (out.anims = out.anims || []).push({ up: -1, mover: out.movers.length, px: Array.from(px.elements, r6), b: [...o.position.toArray(), o.rotation.x, o.rotation.y, o.rotation.z, ...o.scale.toArray()].map(r6), ch: sp.ch, vis: sp.vis || null, name: null, orbit: null, parts: rp });
    }
    mv.traverseVisible(o => { if (o.isMesh && !(inner && within(o, inner)) && !riders.some(r => within(o, r))) parts.push(node(o, mv)); });
    out.movers.push(parts);
    if (inner) {
      /* a tumbleweed: the inner ball rolls (and hops) as the mover travels, as c02's tick turns it */
      const ip = []; inner.traverseVisible(o => { if (o.isMesh) ip.push(node(o, inner)); });
      const x = new THREE.Matrix4().copy(mv.matrixWorld).invert().multiply(inner.matrixWorld);
      (out.weeds = out.weeds || []).push({ i: out.movers.length - 1, x: Array.from(x.elements, r6), r: mv.userData.mover.r, parts: ip });
    }
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
/* meshes are written in the compact PXG2 format (scripts/scene-format.cjs) */
const { encode: geoBin } = require('./scene-format.cjs');

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
    await tab.addScriptTag({ content: sceneWriter.toString() });
    const keys = one ? [one] : S.WORLDS[c].holes.map(h => h.key);
    for (const key of keys) {
      const { out, geos, texs, warn } = await tab.evaluate(grabHole, [key, neon]);
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
      out.static.forEach(fix); out.movers.forEach(p => p.forEach(fix)); (out.anims || []).forEach(a => a.parts.forEach(fix)); (out.weeds || []).forEach(w => w.parts.forEach(fix));
      for (const m of out.mats) for (const k of Object.keys(m)) if (m[k] && typeof m[k] === 'object' && 't' in m[k]) m[k].t = tmap[m[k].t];
      const js = JSON.stringify(out);
      fs.writeFileSync(path.join(OUT, 'holes', key + (neon ? '.n' : '') + '.json'), js + '\n');
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
