/* world 3, jungle temple: mossy stone walls, deep green felt, blue rivers, palms and ferns,
   stone idols, a rolling boulder and a stepped temple on the skyline. */
const J3_LEAF_SVG = '<svg viewBox="0 0 64 64"><path d="M10 54 C10 26 26 10 56 8 C54 38 38 54 10 54 Z" fill="#74c465"/><path d="M10 54 C10 26 26 10 56 8 C54 38 38 54 10 54 Z" fill="none" stroke="#4e9a45" stroke-width="4" stroke-linejoin="round"/><path d="M12 52 L46 18 M24 40 L24 28 M32 32 L42 32 M24 40 L36 40" stroke="#4e9a45" stroke-width="4" stroke-linecap="round"/></svg>';
function j3Palm(r) {
  const g = new THREE.Group(), s = 0.8 + r() * 0.7, bark = mat('#8a6538', { roughness: 0.9 }), leaf = mat('#4e9a45', { roughness: 0.85, side: THREE.DoubleSide });
  let x = 0, y = 0;
  const lean = (r() - 0.5) * 0.5;
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * s, 0.06 * s, 0.24 * s, 8), bark);
    seg.position.set(x, y + 0.12 * s, 0); seg.rotation.z = -lean * 0.4; seg.castShadow = true; g.add(seg);
    y += 0.22 * s; x += lean * 0.06 * s;
  }
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + r() * 0.4, f = new THREE.Mesh(new THREE.ConeGeometry(0.09 * s, 0.6 * s, 4), leaf);
    f.scale.set(1, 1, 0.25); f.position.set(x + Math.sin(a) * 0.26 * s, y - 0.02 * s, Math.cos(a) * 0.26 * s);
    f.rotation.set(Math.cos(a) * 1.9, 0, -Math.sin(a) * 1.9); f.castShadow = true; g.add(f);
  }
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.05 * s, 10, 8), mat('#6e5233')); nut.position.set(x, y - 0.05 * s, 0); g.add(nut);
  return g;
}
function j3Fern(r) {
  const g = new THREE.Group(), s = 0.6 + r() * 0.6, leaf = mat(r() < 0.5 ? '#74c465' : '#438a3b', { roughness: 0.9 });
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2, f = new THREE.Mesh(new THREE.ConeGeometry(0.06 * s, 0.42 * s, 4), leaf);
    f.scale.set(1, 1, 0.3); f.position.set(Math.sin(a) * 0.12 * s, 0.12 * s, Math.cos(a) * 0.12 * s);
    f.rotation.set(Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9); f.castShadow = true; g.add(f);
  }
  return g;
}
function j3Ruin(r) {
  const g = new THREE.Group(), stone = mat('#9aa089', { roughness: 0.95, flatShading: true }), moss = mat('#74c465', { roughness: 1 });
  const n = 1 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const w = 0.22 + r() * 0.18, b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, w * 0.8), stone);
    b.position.set((r() - 0.5) * 0.08, 0.08 + i * 0.16, (r() - 0.5) * 0.08); b.rotation.y = r() * 0.5; b.castShadow = true; g.add(b);
    if (i === n - 1) { const m = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.03, w * 0.7), moss); m.position.set(b.position.x, b.position.y + 0.09, b.position.z); m.rotation.y = b.rotation.y; g.add(m); }
  }
  return g;
}
function j3Idol(p) {
  const g = new THREE.Group(), stone = mat('#a9ad94', { roughness: 0.85 }), dark = mat('#5a4634', { roughness: 0.9 });
  const top = p.top || 0.3;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r * 1.1, top * 0.55, 8), stone); base.position.y = top * 0.275;
  const head = new THREE.Mesh(new THREE.BoxGeometry(p.r * 1.7, top * 0.45, p.r * 1.7), stone); head.position.y = top * 0.775;
  const brow = new THREE.Mesh(new THREE.BoxGeometry(p.r * 1.85, 0.03, p.r * 1.85), mat('#74c465', { roughness: 1 })); brow.position.y = top + 0.012;
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(p.r * 0.9, 0.025, 0.02), dark); mouth.position.set(0, top * 0.66, -p.r * 0.86);
  base.castShadow = head.castShadow = true; g.add(base, head, brow, mouth);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(p.r * 0.38, 0.04, 0.02), mat('#ffd66e', { roughness: 0.4, emissive: 0x6a5010 }));
    eye.position.set(s * p.r * 0.42, top * 0.84, -p.r * 0.86); g.add(eye);
  }
  return g;
}
function j3Boulder(m) {
  const g = new THREE.Group(), r = rng32(Math.round(m.ax * 100 + m.az * 10 + 3));
  const geo = new THREE.IcosahedronGeometry(m.r, 1), a = geo.attributes.position;
  for (let i = 0; i < a.count; i++) { const k = 0.9 + r() * 0.18; a.setXYZ(i, a.getX(i) * k, a.getY(i) * k, a.getZ(i) * k); }
  geo.computeVertexNormals();
  const s = new THREE.Mesh(geo, mat('#8f8a78', { roughness: 1, flatShading: true })); s.castShadow = true; g.add(s);
  const moss = new THREE.Mesh(new THREE.SphereGeometry(m.r * 0.5, 8, 6), mat('#4e9a45', { roughness: 1, flatShading: true }));
  moss.scale.set(1, 0.4, 1); moss.position.y = m.r * 0.82; g.add(moss);
  return g;
}
/* a stepped temple far beyond the far end of the hole, and a few drifting fireflies */
function j3Temple() {
  const g = new THREE.Group(), stone = mat('#9aa089', { roughness: 0.95 }), moss = mat('#5f9a4e', { roughness: 1 });
  for (let i = 0; i < 5; i++) {
    const w = 4.2 - i * 0.75, b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.55, w), i % 2 ? moss : stone);
    b.position.y = 0.275 + i * 0.55; g.add(b);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.05), mat('#3a2c1e')); door.position.set(0, 3.05, -0.33); g.add(door);
  const stair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 3.2), stone); stair.position.set(0, 1.25, -1.6); stair.rotation.x = 0.75; g.add(stair);
  return g;
}
WORLD_LOOK[3] = {
  felt: '#2f6e3a', wall: '#9aa089', ground: '#4a5e2e', sky: ['#8fcfc2', '#f4f0cc'], fog: true, flag: '#ffd66e', icon: J3_LEAF_SVG,
  mud: '#5b4630', water: '#2f86c8', skirt: '#6f6f5c', tube: '#ffd66e', sand: '#8a6236',
  jingle: [392, 523, 659, 587, 784],
  prop: r => { const k = r(); return k < 0.4 ? j3Palm(r) : k < 0.8 ? j3Fern(r) : j3Ruin(r); },
  post: p => p.look === 'idol' ? j3Idol(p) : defaultPost(p, lookOf(3)),
  mover: m => m.look === 'boulder' ? j3Boulder(m) : defaultMover(m, lookOf(3)),
  decor(group, h) {
    const B = holeBounds(h), t = j3Temple();
    t.position.set(B.cx, -0.05, B.z1 + 7); t.rotation.y = Math.PI; group.add(t);
    const n = 40, pos = new Float32Array(n * 3), r = rng32(33);
    for (let i = 0, k = 0; i < n && k < 2000; k++) {
      const x = B.x0 - 3 + r() * (B.x1 - B.x0 + 6), z = B.z0 - 1 + r() * (B.z1 - B.z0 + 4);
      if (x > B.x0 - 0.6 && x < B.x1 + 0.6 && z > B.z0 - 0.6 && z < B.z1 + 0.6) continue;   /* never over the course */
      pos[i * 3] = x; pos[i * 3 + 1] = 0.6 + r() * 1.6; pos[i * 3 + 2] = z; i++;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const flies = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffe9a0, size: 0.05, transparent: true, opacity: 0.8, depthWrite: false }));
    group.add(flies); group.userData.j3flies = flies;
  },
  tick(group, dt, t) {
    const f = group.userData.j3flies; if (!f || reducedMotion()) return;
    const a = f.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) { a.setY(i, a.getY(i) + Math.sin(t * 1.3 + i) * dt * 0.12); a.setX(i, a.getX(i) + Math.cos(t * 0.9 + i * 1.7) * dt * 0.08); }
    a.needsUpdate = true;
  },
};
