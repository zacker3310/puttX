const FLAKE_SVG = '<svg viewBox="0 0 64 64"><g stroke="#6fc0df" stroke-width="5" stroke-linecap="round"><path d="M32 6 V58 M9 19 L55 45 M9 45 L55 19"/><path d="M24 10 L32 17 L40 10 M24 54 L32 47 L40 54"/></g></svg>';
function snowman(p) {
  const g = new THREE.Group(), white = mat('#fffdf7', { roughness: 0.9 });
  const base = new THREE.Mesh(new THREE.SphereGeometry(p.r, 24, 16), white); base.position.y = p.r * 0.9;
  const head = new THREE.Mesh(new THREE.SphereGeometry(p.r * 0.65, 24, 16), white); head.position.y = p.r * 2.3;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 12), mat('#ef7d6d')); nose.position.set(0, p.r * 2.3, -p.r * 0.7); nose.rotation.x = -Math.PI / 2;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.45, p.r * 0.45, p.r * 0.5, 20), mat('#5a4634')); hat.position.y = p.r * 2.95;
  base.castShadow = head.castShadow = hat.castShadow = true;
  g.add(base, head, nose, hat); return g;
}
function pine(r) {
  const g = new THREE.Group(), s = 0.7 + r() * 0.8;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.06 * s, 0.25 * s, 8), mat('#6e5233')); trunk.position.y = 0.12 * s;
  const tree = new THREE.Mesh(new THREE.ConeGeometry(0.32 * s, 0.9 * s, 10), mat('#4e9a45', { roughness: 0.9 })); tree.position.y = 0.65 * s;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.16 * s, 0.3 * s, 10), mat('#fffdf7')); cap.position.y = 0.98 * s;
  tree.castShadow = true; g.add(trunk, tree, cap); return g;
}
WORLD_LOOK[4] = {
  felt: '#3a7593', wall: '#6fc0df', ground: '#fffdf7', sky: ['#bcd9ea', '#f4f8fa'], ice: '#2f7ea6', flag: '#ef7d6d', icon: FLAKE_SVG,
  jingle: [659, 784, 988, 1175, 1319],
  prop: r => r() < 0.75 ? pine(r) : snowman({ r: 0.14 + r() * 0.08 }),
  post: p => p.look === 'snowman' ? snowman(p) : defaultPost(p, lookOf(4)),
  mover: m => defaultMover(m, lookOf(4)),
  decor(group) {
    const n = 500, pos = new Float32Array(n * 3), r = rng32(5);
    for (let i = 0; i < n; i++) { pos[i * 3] = (r() - 0.5) * 16; pos[i * 3 + 1] = r() * 6; pos[i * 3 + 2] = (r() - 0.3) * 16; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, transparent: true, opacity: 0.85, depthWrite: false }));
    group.add(pts); group.userData.snow = pts;
  },
  tick(group, dt) {
    const pts = group.userData.snow; if (!pts || reducedMotion()) return;
    const a = pts.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) { let y = a.getY(i) - dt * 0.5; if (y < 0) y += 6; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(y * 2 + i) * dt * 0.05); }
    a.needsUpdate = true;
  },
};

