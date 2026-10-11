const PLANET_SVG = '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="16" fill="#b7a7e0"/><ellipse cx="32" cy="34" rx="28" ry="8" fill="none" stroke="#ffd66e" stroke-width="5" transform="rotate(-18 32 34)"/><circle cx="26" cy="27" r="3" fill="#8f7dc6"/></svg>';
function alien(p) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(p.r, 24, 16), mat('#74c465', { roughness: 0.4, emissive: 0x1a3a14 })); body.position.y = p.r;
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(p.r * 0.28, 12, 8), mat('#fffdf7', { roughness: 0.3 })); eye.position.set(s * p.r * 0.38, p.r * 1.3, -p.r * 0.75);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(p.r * 0.13, 10, 8), mat('#4a3826')); pupil.position.set(s * p.r * 0.38, p.r * 1.3, -p.r * 0.98);
    g.add(eye, pupil);
  }
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, p.r, 6), mat('#4e9a45')); ant.position.y = p.r * 2.4;
  const bob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), mat('#ffd66e', { emissive: 0x806020 })); bob.position.y = p.r * 2.9;
  body.castShadow = true; g.add(body, ant, bob); return g;
}
function asteroid(m) {
  const g = new THREE.Group(), r = rng32(Math.round(m.ax * 100 + m.az * 10));
  const geo = new THREE.IcosahedronGeometry(m.r, 1), a = geo.attributes.position;
  for (let i = 0; i < a.count; i++) { const k = 0.85 + r() * 0.3; a.setXYZ(i, a.getX(i) * k, a.getY(i) * k, a.getZ(i) * k); }
  geo.computeVertexNormals();
  const s = new THREE.Mesh(geo, mat('#9d93b8', { roughness: 1, flatShading: true })); s.castShadow = true; g.add(s); return g;
}
function moonRock(r) {
  const s = 0.08 + r() * 0.18, m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat('#8f86a8', { roughness: 1, flatShading: true }));
  m.position.y = s * 0.5; m.castShadow = true; const g = new THREE.Group(); g.add(m); return g;
}
WORLD_LOOK[8] = {
  felt: '#6a5f9e', wall: '#ef7d6d', ground: null, fog: false, sky: ['#0b0820', '#2a1f4a'], flag: '#ffd66e', icon: PLANET_SVG,
  jingle: [392, 587, 784, 587, 1175],
  prop: null,
  post: p => p.look === 'alien' ? alien(p) : defaultPost(p, lookOf(8)),
  mover: m => m.look === 'asteroid' ? asteroid(m) : defaultMover(m, lookOf(8)),
  decor(group, h) {
    const n = 900, pos = new Float32Array(n * 3), r = rng32(8);
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(a) * s * 40; pos[i * 3 + 1] = Math.abs(u) * 40 - 6; pos[i * 3 + 2] = Math.sin(a) * s * 40;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfff4e0, size: 0.12, sizeAttenuation: true }));
    group.add(stars); group.userData.stars = stars;
    const pts = h.floors.flat(), r2 = rng32(81);
    for (let i = 0; i < 18; i++) {
      const o = moonRock(r2), base = pts[Math.floor(r2() * pts.length)];
      o.position.set(base[0] + (r2() - 0.5) * 2.5, -0.4 - r2() * 1.5, base[1] + (r2() - 0.5) * 2.5); group.add(o);
    }
  },
};

