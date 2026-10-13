/* course 2 look, desert canyon: every hole stands on a striped sandstone mesa over a canyon floor,
   saguaro and boulder posts, rolling tumbleweeds, buttes on an orange horizon. */
const C2_SUN_SVG = '<svg viewBox="0 0 64 64"><g stroke="#f0a43a" stroke-width="5" stroke-linecap="round"><path d="M32 4 V12 M32 52 V60 M4 32 H12 M52 32 H60 M12 12 L18 18 M46 46 L52 52 M12 52 L18 46 M46 18 L52 12"/></g><circle cx="32" cy="32" r="14" fill="#ffd66e" stroke="#f0a43a" stroke-width="3"/></svg>';
const C2_CANYON_Y = -2.2;
const C2_STRATA = ['#c8693e', '#d9824f', '#b9583a', '#e09a62'];
function c2Saguaro(r, top, green = '#4e9a45') {
  const g = new THREE.Group(), m = mat(green, { roughness: 0.75 }), hgt = Math.max(top, r * 2.4);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, hgt, 14), m); trunk.position.y = hgt / 2;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), m); cap.position.y = hgt;
  trunk.castShadow = cap.castShadow = true; g.add(trunk, cap);
  /* two short arms up high, clear of a rolling ball */
  for (const [s, y0] of [[1, 0.55], [-1, 0.7]]) {
    const ar = r * 0.55, out = new THREE.Mesh(new THREE.CylinderGeometry(ar, ar, r * 0.9, 10), m);
    out.rotation.z = Math.PI / 2; out.position.set(s * r * 1.35, hgt * y0, 0);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(ar, ar, hgt * 0.32, 10), m); up.position.set(s * r * 1.75, hgt * y0 + hgt * 0.16, 0);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(ar, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), m); tip.position.set(s * r * 1.75, hgt * y0 + hgt * 0.32, 0);
    out.castShadow = up.castShadow = true; g.add(out, up, tip);
  }
  const flower = new THREE.Mesh(new THREE.SphereGeometry(r * 0.35, 8, 6), mat('#ef7d6d')); flower.position.y = hgt + r * 0.7; g.add(flower);
  return g;
}
function c2Boulder(r, seed, color = '#c8693e') {
  const geo = new THREE.DodecahedronGeometry(r, 0), a = geo.attributes.position, rr = rng32(seed);
  for (let i = 0; i < a.count; i++) { const k = 0.88 + rr() * 0.2; a.setXYZ(i, a.getX(i) * k, a.getY(i) * k * 0.75, a.getZ(i) * k); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(color, { roughness: 1, flatShading: true })); m.position.y = r * 0.6; m.castShadow = true;
  const g = new THREE.Group(); g.add(m); return g;
}
function c2Tumbleweed(m) {
  const g = new THREE.Group(), inner = new THREE.Group(), rr = rng32(Math.round(m.ax * 97 + m.az * 13) + 5);
  const twig = mat('#b8935a', { roughness: 1 });
  for (let i = 0; i < 7; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(m.r * (0.75 + rr() * 0.25), 0.012, 4, 14), twig);
    ring.rotation.set(rr() * Math.PI, rr() * Math.PI, rr() * Math.PI); ring.castShadow = true; inner.add(ring);
  }
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(m.r * 0.55, 0), mat('#a07a46', { roughness: 1, flatShading: true }));
  inner.add(core); g.add(inner); g.userData.weed = inner; return g;
}
function c2Butte(r, w, hgt) {
  /* a flat-topped sandstone tower in strata, rising from the canyon floor */
  const g = new THREE.Group(), n = C2_STRATA.length;
  for (let i = 0; i < n; i++) {
    const k = 1 - i * 0.07, s = new THREE.Mesh(new THREE.CylinderGeometry(w * k * 0.96, w * k, hgt / n, 7), mat(C2_STRATA[(i + Math.floor(r() * 4)) % n], { roughness: 1, flatShading: true }));
    s.position.y = C2_CANYON_Y + hgt / n * (i + 0.5); g.add(s);
  }
  return g;
}
/* scenery tidy: scatterProps only spaces prop centres from the course, so drop any prop whose footprint
   would touch a mesa side or another prop */
function c2Tidy(group, h) {
  const edges = h.segs.slice();
  for (const f of h.floors) f.forEach((p, i) => { const q = f[(i + 1) % f.length]; edges.push([p[0], p[1], q[0], q[1]]); });
  const kept = [];
  for (const o of group.children.slice()) {
    const r = o.userData.c2r;
    if (r === undefined) continue;
    const x = o.position.x, z = o.position.z;
    const nearEdge = edges.some(s => { const c = closestOnSeg(s[0], s[1], s[2], s[3], x, z); return Math.hypot(x - c[0], z - c[1]) < r + 0.12; });
    const nearProp = kept.some(k => Math.hypot(x - k.position.x, z - k.position.z) < r + k.userData.c2r + 0.1);
    /* and nothing tall in the aim camera's frame round the tee */
    const nearTee = Math.hypot(x - h.tee[0], z - h.tee[1]) < 2.4;
    if (nearEdge || nearProp || nearTee) { group.remove(o); disposeGroup(o); } else kept.push(o);
  }
}
WORLD_LOOK[2] = {
  felt: '#4b7a3a', wall: '#f0b878', ground: null, fog: true, sky: ['#e8763c', '#ffd49a'], flag: '#6fc0df', icon: C2_SUN_SVG,
  sand: '#a86d38', water: '#2f86c8', fast: '#8a5a32', skirt: '#c8693e', tube: '#6e5233', push: '#e9a23b',
  jingle: [440, 554, 659, 831, 880],
  prop(r) {
    const g = new THREE.Group(), k = r();
    const o = k < 0.5 ? c2Saguaro(0.06 + r() * 0.04, 0.45 + r() * 0.4, r() < 0.5 ? '#4e9a45' : '#438a3b')
      : k < 0.85 ? c2Boulder(0.18 + r() * 0.25, Math.floor(r() * 1e6), C2_STRATA[Math.floor(r() * 4)]) : c2Butte(r, 0.3 + r() * 0.25, 0.9 + r() * 0.6);
    if (k < 0.85) o.position.y = C2_CANYON_Y;
    /* footprint radius, for c2Tidy: saguaro arms reach about 2.3 trunk radii, a butte's base is its widest stratum */
    g.userData.c2r = k < 0.5 ? o.children[0].geometry.parameters.radiusTop * 2.4 : k < 0.85 ? o.children[0].geometry.parameters.radius * 1.1 : o.children[0].geometry.parameters.radiusBottom;
    g.add(o); return g;
  },
  post(p, look) {
    const g = new THREE.Group();
    if (p.look === 'cactus') g.add(c2Saguaro(p.r, p.top || 0.34));
    else if (p.look === 'rock') g.add(c2Boulder(p.r * 1.05, Math.round(p.x * 100 + p.z * 7) + 11));
    else return defaultPost(p, look);
    return g;
  },
  mover: (m, look) => m.look === 'weed' ? c2Tumbleweed(m) : defaultMover(m, look),
  decor(group, h) {
    c2Tidy(group, h);
    const B = holeBounds(h);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(70, 40), mat('#d99a5f', { roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(B.cx, C2_CANYON_Y, B.cz); floor.receiveShadow = true; group.add(floor);
    /* each playing floor stands on its own mesa: striped sandstone from the skirt down to the canyon */
    const top = -0.47, bands = C2_STRATA.length, band = (top - C2_CANYON_Y) / bands;
    for (const f of h.floors) {
      const shape = new THREE.Shape(f.map(([x, z]) => new THREE.Vector2(x, -z)));
      for (let i = 0; i < bands; i++) {
        const geo = new THREE.ExtrudeGeometry(shape, { depth: band + 0.01, bevelEnabled: false });
        const m = new THREE.Mesh(geo, mat(C2_STRATA[i], { roughness: 1 }));
        m.rotation.x = -Math.PI / 2; m.position.y = C2_CANYON_Y + band * i; m.receiveShadow = m.castShadow = true; group.add(m);
      }
    }
    /* buttes on the horizon, well clear of the camera behind the tee */
    const r = rng32(2002);
    for (let i = 0; i < 9; i++) {
      const a = -1.2 + r() * 2.4, d = 16 + r() * 12, b = c2Butte(r, 1 + r() * 1.6, 3 + r() * 3.5);
      b.position.set(B.cx + Math.sin(a) * d, 0, B.cz + Math.cos(a) * d); group.add(b);
    }
    const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(3.2, 32), new THREE.MeshBasicMaterial({ color: '#fff1c4', fog: false }));
    sunDisc.position.set(B.cx - 14, 13, B.cz + 48); sunDisc.lookAt(B.cx, 0, B.cz); group.add(sunDisc);
  },
  tick(group, dt) {
    if (reducedMotion()) return;
    group.traverse(o => {
      const m = o.userData.mover, inner = o.userData.weed;
      if (!m || !inner) return;
      const s = moverState(m, play.time), v = Math.hypot(s.vx, s.vz);
      if (v < 1e-4) return;
      /* roll about the axis across the direction of travel, undoing the parent's slow yaw */
      const ax = new THREE.Vector3(s.vz / v, 0, -s.vx / v).applyAxisAngle(new THREE.Vector3(0, 1, 0), -o.rotation.y);
      inner.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(ax, v * dt / m.r));
    });
  },
};
