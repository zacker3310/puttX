/* world 4, snow peak: pine-green lanes on deep snow, blue glare ice, snowmen with scarves,
   lumpy rolling snowballs, a red ski-lift bar, far white peaks and gentle snowfall. */
const C4_FLAKE_SVG = '<svg viewBox="0 0 64 64"><path d="M6 52 L24 22 L32 32 L40 16 L58 52 Z" fill="#6fc0df"/><path d="M19 30 L24 22 L28 27 L24 30 Z M36 23 L40 16 L45 25 L40 23 Z" fill="#fffdf7"/><g stroke="#fffdf7" stroke-width="3" stroke-linecap="round"><path d="M32 40 V52 M27 43 L37 49 M27 49 L37 43"/></g></svg>';
const C4_SNOW = '#fffdf7';
function c4Snowman(p) {
  const g = new THREE.Group(), white = mat(C4_SNOW, { roughness: 0.9 }), coal = mat('#3a2c1e');
  const r = p.r, base = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), white); base.position.y = r * 0.92;
  const mid = new THREE.Mesh(new THREE.SphereGeometry(r * 0.74, 20, 14), white); mid.position.y = r * 2.15;
  const head = new THREE.Mesh(new THREE.SphereGeometry(r * 0.54, 20, 14), white); head.position.y = r * 3.1;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(r * 0.13, r * 0.6, 10), mat('#ef7d6d')); nose.position.set(0, r * 3.1, -r * 0.75); nose.rotation.x = -Math.PI / 2;
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(r * 0.56, r * 0.13, 8, 20), mat('#ef7d6d', { roughness: 0.7 })); scarf.rotation.x = Math.PI / 2; scarf.position.y = r * 2.68;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.6, r * 0.08, 18), coal); brim.position.y = r * 3.55;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.38, r * 0.4, r * 0.55, 18), coal); hat.position.y = r * 3.85;
  g.add(base, mid, head, nose, scarf, brim, hat);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(r * 0.08, 8, 6), coal); e.position.set(sx * r * 0.2, r * 3.22, -r * 0.47); g.add(e); }
  for (const y of [1.95, 2.3]) { const b = new THREE.Mesh(new THREE.SphereGeometry(r * 0.08, 8, 6), coal); b.position.set(0, r * y, -r * 0.72); g.add(b); }
  base.castShadow = mid.castShadow = head.castShadow = hat.castShadow = true;
  return g;
}
function c4Pine(r) {
  const g = new THREE.Group(), s = 0.85 + r() * 0.4, green = mat('#4e9a45', { roughness: 0.9, flatShading: true }), snow = mat(C4_SNOW, { roughness: 0.9, flatShading: true });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 0.25 * s, 8), mat('#6e5233')); trunk.position.y = 0.12 * s; g.add(trunk);
  [[0.36, 0.5, 0.45], [0.28, 0.42, 0.75], [0.18, 0.34, 1.02]].forEach(([rad, ht, y]) => {
    const t = new THREE.Mesh(new THREE.ConeGeometry(rad * s, ht * s, 8), green); t.position.y = y * s; t.castShadow = true; g.add(t);
    const c = new THREE.Mesh(new THREE.ConeGeometry(rad * s * 0.55, ht * s * 0.4, 8), snow); c.position.y = (y + ht * 0.32) * s; g.add(c);
  });
  return g;
}
function c4Drift(r) {
  const g = new THREE.Group(), white = mat(C4_SNOW, { roughness: 1, flatShading: true });
  for (let i = 0, n = 2 + Math.floor(r() * 3); i < n; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18 + r() * 0.14, 1), white);
    m.scale.y = 0.45; m.position.set((r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4); g.add(m);
  }
  return g;
}
function c4Snowball(m) {
  const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.IcosahedronGeometry(m.r, 2), mat(C4_SNOW, { roughness: 0.85, flatShading: true })); s.castShadow = true; g.add(s);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3, lump = new THREE.Mesh(new THREE.IcosahedronGeometry(m.r * 0.32, 0), mat('#eef6fa', { roughness: 0.9, flatShading: true }));
    lump.position.set(Math.sin(a) * m.r * 0.85, Math.cos(i * 2.1) * m.r * 0.5, Math.cos(a) * m.r * 0.85); g.add(lump);
  }
  return g;
}
/* the lift bar: a red padded bar with a yellow seat cushion on top and rounded end caps, along local z */
function c4Lift(m) {
  const g = new THREE.Group(), red = mat('#ef7d6d', { roughness: 0.5 });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2, 0.16, m.len * 2), red); bar.position.y = 0.08; bar.castShadow = true;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2 + 0.02, 0.04, m.len * 2 - 0.06), mat('#ffd66e', { roughness: 0.6 })); seat.position.y = 0.18; seat.castShadow = true;
  g.add(bar, seat);
  for (const sz of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(WALL_HALF, WALL_HALF, 0.16, 14), red); cap.position.set(0, 0.08, sz * m.len); g.add(cap);
  }
  return g;
}
/* scatterProps only keeps props 0.5 m off the walls and never checks them against each other, so
   tidy them: drop any prop whose footprint reaches within reach of a wall or floor edge (tall ones
   need more room so their crowns never hang over the course), any that overlaps a kept prop, and
   any standing in the aim camera's line behind the tee. */
function c4Tidy(group, h, make) {
  const t = h.aim0 !== undefined ? h.aim0 * Math.PI / 180 : Math.atan2(h.cup[0] - h.tee[0], h.cup[1] - h.tee[1]), ux = Math.sin(t), uz = Math.cos(t);
  const edges = h.segs.slice();
  for (const f of h.floors) f.forEach((p, i) => { const q = f[(i + 1) % f.length]; edges.push([p[0], p[1], q[0], q[1]]); });
  const kept = [], box = new THREE.Box3();
  const fits = o => {
    o.updateMatrixWorld(true); box.setFromObject(o);
    const x = o.position.x, z = o.position.z, rad = Math.max(box.max.x - x, x - box.min.x, box.max.z - z, z - box.min.z), tall = box.max.y > 0.5;
    const d = onFloor(h, x, z) ? 0 : Math.min(...edges.map(s => { const c = closestOnSeg(s[0], s[1], s[2], s[3], x, z); return Math.hypot(x - c[0], z - c[1]); }));
    const along = (x - h.tee[0]) * ux + (z - h.tee[1]) * uz, lat = Math.abs((x - h.tee[0]) * uz - (z - h.tee[1]) * ux);
    if (d < rad + (tall ? 0.45 : 0.12) || kept.some(k => Math.hypot(k.x - x, k.z - z) < k.rad + rad + 0.06)
      || (box.max.y > 0.12 && along > -3.6 && along < 0.4 && lat < 1.2 + rad)) return false;
    kept.push({ x, z, rad }); return true;
  };
  for (const o of group.children.slice()) if (o.userData.prop && !fits(o)) { group.remove(o); disposeGroup(o); }
  /* top the scenery back up to an even density with the same rules */
  const B = holeBounds(h), r = rng32(44 + h.key.length * 7 + Math.round(B.x1 * 13 + B.z1 * 29));
  for (let tries = 0; kept.length < 20 && tries < 300; tries++) {
    const o = make(r); o.position.set(B.x0 - 3 + r() * (B.x1 - B.x0 + 6), 0, B.z0 - 3 + r() * (B.z1 - B.z0 + 6)); o.rotation.y = r() * Math.PI * 2;
    if (fits(o)) group.add(o); else disposeGroup(o);
  }
}
/* the grid-built zone meshes step along a round pool's edge, so trim every round zone (open water,
   ice pans) with a smooth snow rim that follows the ground just above it */
function c4Rims(group, h) {
  const white = mat(C4_SNOW, { roughness: 0.9 }), W = 0.04;
  for (const zn of h.zones) {
    const poly = zn.poly; if (poly.length <= 4) continue;
    const pts = [];
    poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length], n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.04)); for (let k = 0; k < n; k++) pts.push([p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n]); });
    const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length, cz = poly.reduce((a, p) => a + p[1], 0) / poly.length, pos = [], idx = [];
    pts.forEach(([x, z], i) => {
      const d = Math.hypot(x - cx, z - cz) || 1, ox = (x - cx) / d * W, oz = (z - cz) / d * W;
      for (const [px, pz] of [[x - ox, z - oz], [x + ox, z + oz]]) pos.push(px, onFloor(h, px, pz) ? groundH(h, px, pz) + 0.008 : groundH(h, x, z) + 0.008, pz);
      const a = i * 2, b = ((i + 1) % pts.length) * 2; idx.push(a, b, a + 1, a + 1, b, b + 1);
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, white); m.receiveShadow = true; m.material.side = THREE.DoubleSide; group.add(m);
  }
}
WORLD_LOOK[4] = {
  felt: '#3c7f35', wall: '#6fc0df', ground: C4_SNOW, sky: ['#9fcde6', '#f4f8fa'], fog: true, flag: '#ef7d6d', icon: C4_FLAKE_SVG,
  ice: '#4a94b5', water: '#24507e', skirt: '#d5e6ef', jingle: [659, 784, 988, 1175, 1319],
  prop: r => { const k = r(), o = k < 0.6 ? c4Pine(r) : k < 0.8 ? c4Drift(r) : c4Snowman({ r: 0.14 + r() * 0.03 }); o.userData.prop = true; return o; },
  post: (p, look) => p.look === 'snowman' ? c4Snowman(p) : defaultPost(p, look),
  mover: (m, look) => m.look === 'snowball' ? c4Snowball(m) : m.look === 'lift' ? c4Lift(m) : defaultMover(m, look),
  decor(group, h) {
    c4Tidy(group, h, lookOf(4).prop); c4Rims(group, h);
    /* far peaks in a ring, well beyond the props and the camera */
    const pts = h.floors.flat(), cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const rock = mat('#b9d3e2', { roughness: 1, flatShading: true }), cap = mat(C4_SNOW, { roughness: 1, flatShading: true }), r = rng32(44);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + r() * 0.3, d = 30 + r() * 8, ht = 7 + r() * 7, rad = 5 + r() * 4;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(rad, ht, 7), rock); peak.position.set(cx + Math.sin(a) * d, ht / 2 - 0.05, cz + Math.cos(a) * d);
      const top = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.42, ht * 0.42, 7), cap); top.position.set(0, ht * 0.3, 0); peak.add(top);
      group.add(peak);
    }
    const n = 450, pos = new Float32Array(n * 3), rs = rng32(5);
    for (let i = 0; i < n; i++) { pos[i * 3] = cx + (rs() - 0.5) * 18; pos[i * 3 + 1] = 0.6 + rs() * 6; pos[i * 3 + 2] = cz + (rs() - 0.5) * 18; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const flakes = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.8, depthWrite: false }));
    group.add(flakes); group.userData.snow = flakes;
  },
  tick(group, dt) {
    const pts = group.userData.snow; if (!pts || reducedMotion()) return;
    const a = pts.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) { let y = a.getY(i) - dt * 0.45; if (y < 0.6) y += 6; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(y * 2 + i) * dt * 0.05); }
    a.needsUpdate = true;
  },
};
