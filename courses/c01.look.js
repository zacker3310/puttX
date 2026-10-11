/* course 1 look: construction yard. Yellow girders, red-and-white boom barriers, rubber belts, dirt,
   cones, girder stacks and toy diggers around the course. Names are c01-prefixed: every course shares one scope. */
const C01_SVG = '<svg viewBox="0 0 64 64"><path d="M32 6 L48 54 H16 Z" fill="#ef7d6d"/><path d="M26 24 H38 L41 33 H23 Z M21 40 H43 L45 46 H19 Z" fill="#fff8ec"/><rect x="10" y="52" width="44" height="7" rx="3" fill="#c95a4c"/></svg>';
const C01 = { red: '#ef7d6d', redDown: '#c95a4c', yellow: '#ffd66e', yellowDown: '#dca63f', cream: '#fff8ec', ink: '#5a4634', inkStrong: '#4a3826', steel: '#cfc0a6' };
function c01Box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, { roughness: 0.6 }));
  m.position.set(x, y, z); m.castShadow = true; return m;
}
function c01Cone() {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 16), mat(C01.red, { roughness: 0.5 })); c.position.y = 0.15;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.04, 16), mat(C01.cream, { roughness: 0.5 })); band.position.y = 0.15;
  const base = c01Box(0.2, 0.025, 0.2, C01.redDown, 0, 0.012, 0);
  c.castShadow = true; g.add(c, band, base); return g;
}
function c01Girders(r) {
  const g = new THREE.Group(), n = 1 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) g.add(c01Box(0.9, 0.08, 0.12, i % 2 ? C01.yellowDown : C01.red, 0, 0.04 + i * 0.08, (i % 2) * 0.05));
  return g;
}
function c01Digger(r) {
  const g = new THREE.Group(), s = 0.8 + r() * 0.4, ink = mat(C01.inkStrong, { roughness: 0.9 });
  for (const z of [-0.13, 0.13]) {
    const track = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12), ink); track.rotation.x = Math.PI / 2; track.scale.set(1, 1, 1);
    const tr = new THREE.Group(); tr.add(track); tr.scale.set(1, 1, 3.4); tr.rotation.y = Math.PI / 2; tr.position.set(0, 0.06, z); g.add(tr);
  }
  g.add(c01Box(0.36, 0.14, 0.3, C01.yellow, 0, 0.19, 0), c01Box(0.16, 0.16, 0.2, C01.yellowDown, -0.08, 0.34, 0.03));
  const win = c01Box(0.01, 0.09, 0.14, '#6fc0df', 0.005, 0.36, 0.03); g.add(win);
  const arm = new THREE.Group();
  arm.add(c01Box(0.34, 0.05, 0.05, C01.yellow, 0.17, 0, 0));
  const fore = new THREE.Group(); fore.position.x = 0.34; fore.rotation.z = -1.1; fore.add(c01Box(0.24, 0.045, 0.045, C01.yellowDown, 0.12, 0, 0));
  fore.add(c01Box(0.08, 0.07, 0.1, C01.ink, 0.25, -0.02, 0));
  arm.add(fore); arm.position.set(0.12, 0.28, -0.08); arm.rotation.z = 0.55; g.add(arm);
  g.scale.setScalar(s); return g;
}
function c01Barrels() {
  const g = new THREE.Group();
  [[0, 0], [0.13, 0.05], [0.04, 0.13]].forEach(([x, z], i) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 14), mat(i % 2 ? C01.red : C01.yellow, { roughness: 0.6 }));
    b.position.set(x, 0.08, z); b.castShadow = true; g.add(b);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.025, 14), mat(C01.cream)); ring.position.set(x, 0.1, z); g.add(ring);
  });
  return g;
}
/* girder column: an I-beam with a red cap plate */
function c01Column(p) {
  const g = new THREE.Group(), h = p.top || 0.22, w = p.r * 1.9;
  g.add(c01Box(w, h, w * 0.22, C01.yellow, 0, h / 2, w * 0.39), c01Box(w, h, w * 0.22, C01.yellow, 0, h / 2, -w * 0.39), c01Box(w * 0.2, h, w * 0.6, C01.yellowDown, 0, h / 2, 0));
  g.add(c01Box(w * 1.1, 0.03, w * 1.1, C01.red, 0, h + 0.015, 0));
  return g;
}
/* crane jib: a yellow truss arm (the collision bar) on a red slewing hub with a little cab */
function c01Crane(m) {
  const g = new THREE.Group(), n = m.blades || 1, L = m.len * 2;
  for (let i = 0; i < n; i++) {
    const arm = new THREE.Group(); arm.rotation.y = i * Math.PI / n;
    arm.add(c01Box(0.1, 0.035, L, C01.yellow, 0, 0.13, 0), c01Box(0.1, 0.035, L, C01.yellow, 0, 0.045, 0));
    const ribs = Math.max(3, Math.round(L / 0.16));
    for (let k = 0; k <= ribs; k++) arm.add(c01Box(0.085, 0.07, 0.025, C01.yellowDown, 0, 0.088, -L / 2 + k * L / ribs));
    arm.add(c01Box(0.11, 0.12, 0.05, C01.red, 0, 0.09, L / 2 - 0.025), c01Box(0.11, 0.12, 0.05, C01.red, 0, 0.09, -L / 2 + 0.025));
    g.add(arm);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.26, 16), mat(C01.red, { roughness: 0.5 })); hub.position.y = 0.13; hub.castShadow = true;
  g.add(hub, c01Box(0.12, 0.1, 0.12, C01.cream, 0, 0.31, 0), c01Box(0.13, 0.03, 0.13, C01.redDown, 0, 0.375, 0));
  return g;
}
/* boom barrier: a red and white striped bar */
function c01Boom(m) {
  const g = new THREE.Group(), L = m.len * 2, n = Math.max(3, Math.round(L / 0.12));
  for (let k = 0; k < n; k++) g.add(c01Box(0.1, 0.14, L / n, k % 2 ? C01.cream : C01.red, 0, 0.08, -L / 2 + (k + 0.5) * L / n));
  g.add(c01Box(0.12, 0.04, L, C01.redDown, 0, 0.165, 0));
  return g;
}
WORLD_LOOK[1] = {
  /* felt and dirt keep the white ball at >= 3:1 (render-check) */
  felt: '#36803a', sand: '#8a6236', wall: C01.yellow, ground: '#c9a476', sky: ['#9fd8ef', '#fff1d6'], flag: C01.red, icon: C01_SVG,
  push: '#5a4634', skirt: '#a8804e', tube: C01.red,
  jingle: [523, 659, 784, 659, 1047],
  prop: r => { const k = r(); return k < 0.4 ? c01Cone() : k < 0.65 ? c01Girders(r) : k < 0.85 ? c01Barrels() : c01Digger(r); },
  post: (p, look) => p.look === 'girder' ? c01Column(p) : defaultPost(p, look),
  mover: (m, look) => m.look === 'crane' ? c01Crane(m) : m.look === 'boom' ? c01Boom(m) : defaultMover(m, look),
};
