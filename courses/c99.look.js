/* the bonus nine, a neon stunt park at dusk: violet felt, candy-pink walls with chrome caps, cyan
   glare ice, striped stunt ramps and traffic pylons, chrome barrels and floodlight masts, and a
   giant chrome loop-the-loop far off the course. Course 99 sits outside the worlds, so this look
   sets every hook itself and inherits nothing it does not want. */
const C99_ICON = '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#3d2f8f"/><circle cx="32" cy="32" r="17" fill="none" stroke="#ff5fa2" stroke-width="6"/><circle cx="32" cy="32" r="17" fill="none" stroke="#2ef2ff" stroke-width="2" stroke-dasharray="6 6"/><path d="M14 46 L50 46 L50 38 Z" fill="#ffd66e"/><circle cx="32" cy="15" r="4" fill="#fffdf7"/></svg>';
const C99_NEON = ['#ff5fa2', '#2ef2ff', '#b6ff2e', '#ffd66e', '#a98bff'];
const c99Glow = (color, k = 0.9) => mat(color, { emissive: color, emissiveIntensity: k, roughness: 0.4 });
const c99Chrome = () => mat('#e4ebf5', { metalness: 0.35, roughness: 0.22 });
/* scenery, all low and chunky: a striped traffic pylon, a chrome barrel with a neon band, a
   little stunt kicker, a floodlight mast */
function c99Prop(r) {
  const g = new THREE.Group(), k = r(), neon = C99_NEON[Math.floor(r() * C99_NEON.length)];
  if (k < 0.3) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.36, 12), mat('#ff8a3d', { roughness: 0.6 })); cone.position.y = 0.2; cone.castShadow = true;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.06, 12), mat('#fffdf7')); band.position.y = 0.2;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.3), mat('#2a2050')); foot.position.y = 0.02;
    g.add(cone, band, foot);
  } else if (k < 0.55) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.36, 18), c99Chrome()); barrel.position.y = 0.18; barrel.castShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.025, 8, 24), c99Glow(neon)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.24;
    g.add(barrel, ring);
  } else if (k < 0.8) {
    /* a striped stunt kicker: a wedge with candy stripes */
    const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.6, 0), new THREE.Vector2(0.6, 0.22)]);
    const wedge = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.36, bevelEnabled: false }), mat('#ffd66e', { roughness: 0.6 }));
    wedge.position.set(-0.3, 0, -0.18); wedge.castShadow = true; g.add(wedge);
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.37), mat('#ff5fa2'));
      const u = 0.12 + i * 0.17; s.position.set(-0.3 + u, u * 0.22 / 0.6 + 0.008, 0); s.rotation.z = Math.atan2(0.22, 0.6); g.add(s);
    }
  } else {
    /* a floodlight mast: slim chrome pole, a glowing head */
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.3, 8), c99Chrome()); pole.position.y = 0.65; pole.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.1), c99Glow('#fff4c2', 1.2)); head.position.y = 1.32;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.06, 12), mat('#2a2050')); base.position.y = 0.03;
    g.add(pole, head, base);
  }
  return g;
}
/* bumpers: a chrome drum with a glowing candy ring */
function c99Post(p) {
  const g = new THREE.Group(), top = p.top || 0.22;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, top, 24), c99Chrome()); drum.position.y = top / 2; drum.castShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(p.r, 0.03, 10, 28), c99Glow(p.e > 1 ? '#ff5fa2' : '#2ef2ff')); ring.rotation.x = Math.PI / 2; ring.position.y = top * 0.6;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.6, p.r * 0.6, 0.03, 20), c99Glow('#ffd66e', 0.6)); cap.position.y = top + 0.015;
  g.add(drum, ring, cap);
  return g;
}
function c99Mover(m, look) {
  const g = new THREE.Group();
  if (m.kind === 'spin') {
    /* a stunt fan: chrome blades with neon tips round a candy hub */
    for (let i = 0; i < (m.blades || 1); i++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2, 0.1, m.len * 2), c99Chrome());
      arm.position.y = 0.09; arm.rotation.y = i * Math.PI / (m.blades || 1); arm.castShadow = true; g.add(arm);
      for (const s of [-1, 1]) {
        const tip = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2 + 0.01, 0.11, 0.08), c99Glow('#2ef2ff'));
        tip.position.set(Math.sin(i * Math.PI / (m.blades || 1)) * s * (m.len - 0.04), 0.09, Math.cos(i * Math.PI / (m.blades || 1)) * s * (m.len - 0.04));
        tip.rotation.y = i * Math.PI / (m.blades || 1); g.add(tip);
      }
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.26, 20), mat('#ff5fa2', { roughness: 0.4 })); hub.position.y = 0.13; hub.castShadow = true; g.add(hub);
  } else if (m.kind === 'gate') {
    /* a chrome boom with a glowing stripe and candy end caps, along local z */
    const bar = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2, 0.16, m.len * 2), c99Chrome()); bar.position.y = 0.08; bar.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2 + 0.01, 0.04, m.len * 2 - 0.04), c99Glow('#b6ff2e')); stripe.position.y = 0.12;
    g.add(bar, stripe);
    for (const s of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(WALL_HALF, WALL_HALF, 0.16, 14), mat('#ff5fa2', { roughness: 0.4 })); cap.position.set(0, 0.08, s * m.len); g.add(cap);
    }
  } else {
    /* the patrolling puck: a fat candy disc with a glowing rim */
    const puck = new THREE.Mesh(new THREE.CylinderGeometry(m.r, m.r, 0.12, 24), mat('#ffd66e', { roughness: 0.5 })); puck.position.y = 0.06; puck.castShadow = true;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(m.r, 0.022, 8, 28), c99Glow('#ff5fa2')); rim.rotation.x = Math.PI / 2; rim.position.y = 0.1;
    g.add(puck, rim);
  }
  return g;
}
WORLD_LOOK[99] = {
  /* the white ball reads at 10:1 on the violet felt, 3.5:1 on the cyan ice, 4:1 on the sand */
  felt: '#3d2f8f', wall: '#ff5fa2', ground: '#1d1440', sky: ['#2a1660', '#ff9a6b'], fog: true, flag: '#b6ff2e', icon: C99_ICON,
  sand: '#b86a2a', ice: '#2a8fbf', mud: '#5a3b2a', fast: '#6b3fd0', water: '#2a4dff', push: '#d13b7a', skirt: '#4a2380', tube: '#ffd66e',
  jingle: [659, 831, 988, 1319, 1661],
  prop: c99Prop,
  post: c99Post,
  mover: c99Mover,
  decor(group, h) {
    /* tidy the scenery: nothing tall near the course, nothing in the camera's line behind the tee */
    const t = h.aim0 !== undefined ? h.aim0 * Math.PI / 180 : Math.atan2(h.cup[0] - h.tee[0], h.cup[1] - h.tee[1]), ux = Math.sin(t), uz = Math.cos(t);
    const edges = h.segs.slice();
    for (const f of h.floors) f.forEach((p, i) => { const q = f[(i + 1) % f.length]; edges.push([p[0], p[1], q[0], q[1]]); });
    const gap = (x, z) => Math.min(...edges.map(s => { const c = closestOnSeg(s[0], s[1], s[2], s[3], x, z); return Math.hypot(x - c[0], z - c[1]); }));
    for (const o of group.children.slice()) {
      if (!o.userData.prop) continue;
      const x = o.position.x, z = o.position.z, along = (x - h.tee[0]) * ux + (z - h.tee[1]) * uz, lat = Math.abs((x - h.tee[0]) * uz - (z - h.tee[1]) * ux);
      const tall = o.children.some(c => c.position.y > 0.6);
      if ((tall && gap(x, z) < 1.4) || (along > -4 && along < 0.6 && lat < 1.6)) { group.remove(o); disposeGroup(o); }
    }
    /* the giant chrome loop-the-loop, far beyond the cup, with neon ribs */
    const B = holeBounds(h), loop = new THREE.Group();
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.16, 12, 48), c99Chrome()); hoop.position.y = 2.3; hoop.castShadow = true; loop.add(hoop);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6, rib = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), c99Glow(C99_NEON[i % C99_NEON.length]));
      rib.position.set(Math.sin(a) * 2.2, 2.3 + Math.cos(a) * 2.2, 0); loop.add(rib);
    }
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 1.2), mat('#2a2050')); leg.position.set(s * 1.2, 0.15, 0); loop.add(leg); }
    const far = Math.max(B.x1 - B.x0, B.z1 - B.z0) / 2 + 6;
    loop.position.set(B.cx + ux * far, 0, B.cz + uz * far); loop.rotation.y = t + Math.PI / 2;
    loop.userData.c99spin = true; group.add(loop);
  },
  tick(group, dt, t) {
    if (reducedMotion()) return;
    /* the neon ribs chase round the loop */
    for (const o of group.children) if (o.userData.c99spin) o.children.forEach((c, i) => { if (c.material && c.material.emissive && i > 0) c.material.emissiveIntensity = 0.5 + 0.5 * Math.max(0, Math.sin(t * 3 - i * 0.6)); });
  },
};
