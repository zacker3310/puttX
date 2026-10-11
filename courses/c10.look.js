/* world 10, sky kingdom: grassy floating islands on earthy skirts and rock roots, cloud-white
   walls, golden gates and windmills, clouds drifting far below and a golden castle on the horizon. */
const C10_CROWN_SVG = '<svg viewBox="0 0 64 64"><ellipse cx="32" cy="50" rx="26" ry="8" fill="#fffdf7"/><path d="M10 44 L14 16 L24 30 L32 10 L40 30 L50 16 L54 44 Z" fill="#ffd66e"/><rect x="10" y="40" width="44" height="8" rx="3" fill="#e9b640"/><circle cx="32" cy="27" r="4" fill="#ef7d6d"/><circle cx="14" cy="16" r="3.5" fill="#6fc0df"/><circle cx="50" cy="16" r="3.5" fill="#6fc0df"/><circle cx="32" cy="10" r="3.5" fill="#ef7d6d"/></svg>';
const C10_GOLD = '#ffd66e', C10_CLOUD = '#fffdf7';
/* a puff of low-poly spheres */
function c10Cloud(r, s) {
  const g = new THREE.Group(), m = mat(C10_CLOUD, { roughness: 1, flatShading: true, emissive: 0x6a6f78 }), n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const k = s * (0.5 + r() * 0.5), b = new THREE.Mesh(new THREE.IcosahedronGeometry(k, 1), m);
    b.position.set((i - (n - 1) / 2) * s * 0.75, (r() - 0.5) * s * 0.3, (r() - 0.5) * s * 0.6); b.scale.y = 0.7; g.add(b);
  }
  return g;
}
/* clouds drift far below the islands */
function c10Prop(r) {
  const g = new THREE.Group(), c = c10Cloud(r, 0.3 + r() * 0.35);
  c.position.y = -0.9 - r() * 1.4; g.add(c); g.userData.c10drift = { c, base: c.position.x, sp: 0.2 + r() * 0.3, ph: r() * 6.28 };
  return g;
}
function c10Post(p) {
  if (p.look !== 'cloud') return defaultPost(p, lookOf(10));
  const g = new THREE.Group(), m = mat(C10_CLOUD, { roughness: 1, flatShading: true }), top = p.top || 0.22;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2, b = new THREE.Mesh(new THREE.IcosahedronGeometry(p.r * 0.62, 1), m);
    b.position.set(Math.cos(a) * p.r * 0.4, top * 0.45, Math.sin(a) * p.r * 0.4); b.castShadow = true; g.add(b);
  }
  const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(p.r * 0.6, 1), m); cap.position.y = top * 0.85; cap.castShadow = true; g.add(cap);
  return g;
}
function c10Mover(m) {
  const g = new THREE.Group();
  if (m.kind === 'spin') {
    const cols = ['#ef7d6d', '#6fc0df', '#b7a7e0', '#74c465'];
    for (let i = 0; i < (m.blades || 1); i++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2, 0.1, m.len * 2), mat(cols[i % 4], { roughness: 0.5 }));
      arm.position.y = 0.09; arm.rotation.y = i * Math.PI / (m.blades || 1); arm.castShadow = true; g.add(arm);
      for (const s of [-1, 1]) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(WALL_HALF, WALL_HALF, 0.1, 12), mat(cols[i % 4], { roughness: 0.5 }));
        cap.position.set(Math.sin(arm.rotation.y) * m.len * s, 0.09, Math.cos(arm.rotation.y) * m.len * s); g.add(cap);
      }
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.24, 16), mat(C10_GOLD, { roughness: 0.4, metalness: 0.2 })); hub.position.y = 0.12;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 5), mat(C10_GOLD, { roughness: 0.4, metalness: 0.2 })); tip.position.y = 0.3;
    hub.castShadow = tip.castShadow = true; g.add(hub, tip);
    return g;
  }
  if (m.kind === 'gate') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2, 0.16, m.len * 2), mat(C10_GOLD, { roughness: 0.4, metalness: 0.2 })); bar.position.y = 0.08;
    bar.castShadow = true; g.add(bar);
    for (const s of [-1, 1]) {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), mat('#ef7d6d', { roughness: 0.5 })); knob.position.set(0, 0.17, m.len * s * 0.85); g.add(knob);
    }
    return g;
  }
  return defaultMover(m, lookOf(10));
}
WORLD_LOOK[10] = {
  felt: '#317a3b', wall: C10_CLOUD, ground: null, fog: true, sky: ['#4fa8ec', '#f4fbff'], flag: C10_GOLD, icon: C10_CROWN_SVG,
  ice: '#3f8fbf', fast: '#c0569e', push: '#5b7fd6', sand: '#8a6236', skirt: '#8a6538',
  jingle: [784, 988, 1175, 1568, 1976],
  prop: c10Prop,
  post: c10Post,
  mover: c10Mover,
  decor(group, h) {
    /* rock roots: an upside-down square pyramid under every island wider than a bridge */
    const rock = mat('#6e5233', { roughness: 1, flatShading: true });
    for (const f of h.floors) {
      const xs = f.map(p => p[0]), zs = f.map(p => p[1]), w = Math.max(...xs) - Math.min(...xs), d = Math.max(...zs) - Math.min(...zs);
      if (Math.min(w, d) < 0.7) continue;
      const deep = 0.6 + Math.min(w, d) * 0.5, root = new THREE.Mesh(new THREE.CylinderGeometry(0.7071, 0.06, deep, 4, 1), rock);
      root.rotation.y = Math.PI / 4; root.scale.set(w * 0.96, 1, d * 0.96);
      const wrap = new THREE.Group(); wrap.add(root); wrap.position.set((Math.max(...xs) + Math.min(...xs)) / 2, -0.5 - deep / 2, (Math.max(...zs) + Math.min(...zs)) / 2);
      group.add(wrap);
    }
    /* a golden castle on its own island far beyond the course */
    const pts = h.floors.flat(), cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, z1 = Math.max(...pts.map(p => p[1]));
    const castle = new THREE.Group(), gold = mat(C10_GOLD, { roughness: 0.5, metalness: 0.15 }), roof = mat('#ef7d6d', { roughness: 0.6 });
    const isle = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 0.3, 2.4, 7), rock); isle.position.y = -1.2;
    const lawn = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.12, 7), mat('#3a8a45', { roughness: 1 })); lawn.position.y = 0.06;
    const keep = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 1.4), gold); keep.position.y = 0.8;
    castle.add(isle, lawn, keep);
    for (const [x, z, s] of [[-1, -0.8, 1], [1, -0.8, 1], [-1, 0.8, 0.9], [1, 0.8, 0.9], [0, 0, 1.4]]) {
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 2.2 * s, 10), gold); tw.position.set(x, 1.1 * s, z);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.8, 10), roof); cone.position.set(x, 2.2 * s + 0.4, z);
      castle.add(tw, cone);
    }
    castle.position.set(cx + 7, -0.4, z1 + 14); castle.rotation.y = 0.4;
    group.add(castle);
    /* big soft clouds around the horizon */
    const r = rng32(1010), far = [];
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + r() * 0.4, c = c10Cloud(r, 1 + r() * 0.8);
      c.position.set(cx + Math.sin(a) * (22 + r() * 8), -2.5 + r() * 3, z1 / 2 + Math.cos(a) * (22 + r() * 8));
      group.add(c); far.push({ c, a, base: c.position.y });
    }
    group.userData.c10far = far;
  },
  tick(group, dt, t) {
    if (reducedMotion()) return;
    for (const o of group.children) {
      const d = o.userData && o.userData.c10drift;
      if (d) { d.c.position.x = d.base + Math.sin(t * d.sp * 0.3 + d.ph) * 0.6; d.c.position.y += Math.sin(t * d.sp + d.ph) * dt * 0.03; }
    }
    for (const f of group.userData.c10far || []) f.c.position.y = f.base + Math.sin(t * 0.25 + f.a * 3) * 0.25;
  },
};
