/* world 6, volcano: dark basalt walls, ash-green felt, orange lava, a smoky red-orange sky,
   hexagonal basalt columns, rolling boulders, a smoking volcano on the skyline and slow embers. */
const VOLCANO_SVG = '<svg viewBox="0 0 64 64"><circle cx="24" cy="12" r="6" fill="#cfc0a6"/><circle cx="34" cy="8" r="5" fill="#cfc0a6"/>' +
  '<path d="M6 56 L24 22 H40 L58 56 Z" fill="#6e5233"/><path d="M24 22 H40 L37 30 L33 26 L30 34 L27 27 Z" fill="#f0642c"/>' +
  '<rect x="4" y="54" width="56" height="6" rx="3" fill="#4a3826"/></svg>';
function v6Basalt(p) {
  const g = new THREE.Group(), top = p.top || 0.3;
  const col = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r * 1.06, top, 6), mat('#4b4650', { roughness: 0.85, flatShading: true }));
  col.position.y = top / 2; col.castShadow = true;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.96, p.r, 0.03, 6), mat('#6c6672', { roughness: 0.8, flatShading: true }));
  cap.position.y = top + 0.015;
  g.add(col, cap); return g;
}
function v6Rock(r, s, color) {
  const geo = new THREE.DodecahedronGeometry(s, 0), a = geo.attributes.position;
  for (let i = 0; i < a.count; i++) { const k = 0.8 + r() * 0.35; a.setXYZ(i, a.getX(i) * k, a.getY(i) * k * 0.8, a.getZ(i) * k); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(color, { roughness: 1, flatShading: true })); m.castShadow = true; return m;
}
function v6Boulder(m) {
  const g = new THREE.Group(), r = rng32(Math.round(m.ax * 100 + m.az * 10 + 6));
  const geo = new THREE.IcosahedronGeometry(m.r, 1), a = geo.attributes.position;
  for (let i = 0; i < a.count; i++) { const k = 0.88 + r() * 0.2; a.setXYZ(i, a.getX(i) * k, a.getY(i) * k, a.getZ(i) * k); }
  geo.computeVertexNormals();
  const s = new THREE.Mesh(geo, mat('#5a4a44', { roughness: 1, flatShading: true, emissive: 0x3a0e04 })); s.castShadow = true; g.add(s); return g;
}
function v6Prop(r) {
  const g = new THREE.Group(), k = r();
  if (k < 0.55) {
    const s = 0.12 + r() * 0.25, m = v6Rock(r, s, r() < 0.5 ? '#3e3a40' : '#57504f'); m.position.y = s * 0.4; g.add(m);
  } else if (k < 0.8) {
    for (let i = 0; i < 3; i++) { const s = 0.06 + r() * 0.08, m = v6Rock(r, s, '#4b4650'); m.position.set((r() - 0.5) * 0.4, s * 0.4, (r() - 0.5) * 0.4); g.add(m); }
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), new THREE.MeshBasicMaterial({ color: 0xff7a2e, toneMapped: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.01; g.add(glow);
  } else {
    const n = 2 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const hgt = 0.25 + r() * 0.5, c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, hgt, 6), mat('#4b4650', { roughness: 0.85, flatShading: true }));
      c.position.set((i % 2) * 0.19 - 0.1, hgt / 2, Math.floor(i / 2) * 0.17); c.castShadow = true; g.add(c);
    }
  }
  return g;
}
WORLD_LOOK[6] = {
  /* felt and mud are dark enough that the white ball reads at well over 3:1; lava is the water hazard */
  felt: '#43594a', wall: '#625c68', ground: '#2f2729', skirt: '#2c282d', sky: ['#5c2a2a', '#f0a066'], fog: true,
  sand: '#7a6a5c', mud: '#4e3426', water: '#f0642c', ice: '#6fa8c0', fast: '#5d5560', push: '#f08a3c', tube: '#f0642c',
  flag: '#ffd66e', icon: VOLCANO_SVG,
  jingle: [392, 494, 587, 740, 988],
  prop: v6Prop,
  post: p => p.look === 'basalt' ? v6Basalt(p) : defaultPost(p, lookOf(6)),
  mover: m => m.look === 'boulder' ? v6Boulder(m) : defaultMover(m, lookOf(6)),
  decor(group, h) {
    const B = holeBounds(h), far = B.z1 + 22;
    /* the volcano on the skyline, well past the back of the hole */
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 13, 9, 9, 1, true), mat('#4a3c3a', { roughness: 1, flatShading: true }));
    cone.position.set(B.cx, 4.3, far);
    const lava = new THREE.Mesh(new THREE.CircleGeometry(3.1, 9), new THREE.MeshBasicMaterial({ color: 0xff6a24, toneMapped: false }));
    lava.rotation.x = -Math.PI / 2; lava.position.set(B.cx, 8.6, far);
    const smoke = new THREE.Group(), puff = mat('#8a7a76', { roughness: 1, flatShading: true, transparent: true, opacity: 0.75 });
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 + i * 0.35, 0), puff); s.position.set(B.cx + i * 0.9 - 1.5, 10 + i * 1.6, far + i * 0.4); smoke.add(s); }
    group.add(cone, lava, smoke);
    /* embers drifting up around the course */
    const n = 160, pos = new Float32Array(n * 3), r = rng32(66);
    for (let i = 0; i < n; i++) { pos[i * 3] = B.cx + (r() - 0.5) * 18; pos[i * 3 + 1] = r() * 5; pos[i * 3 + 2] = B.cz + (r() - 0.4) * 18; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffa040, size: 0.05, transparent: true, opacity: 0.8, depthWrite: false }));
    group.add(pts); group.userData.embers = pts; group.userData.crater = lava; group.userData.smoke = smoke;
    /* lava pools glow a little */
    const glow = [];
    group.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHexString() === 'f0642c') { o.material.emissive.set('#b8360a'); o.material.emissiveIntensity = 0.55; glow.push(o.material); } });
    group.userData.glow = glow;
  },
  tick(group, dt, t) {
    if (reducedMotion()) return;
    const pts = group.userData.embers, lava = group.userData.crater, smoke = group.userData.smoke;
    if (lava) lava.material.color.setRGB(1, 0.38 + 0.08 * Math.sin(t * 1.3), 0.12);
    if (smoke) smoke.rotation.y = Math.sin(t * 0.1) * 0.05;
    for (const m of group.userData.glow || []) m.emissiveIntensity = 0.5 + 0.12 * Math.sin(t * 1.7);
    if (!pts) return;
    const a = pts.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) { let y = a.getY(i) + dt * 0.25; if (y > 5) y -= 5; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(y * 1.7 + i) * dt * 0.03); }
    a.needsUpdate = true;
  },
};
