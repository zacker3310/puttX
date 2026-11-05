/* course 98 look: the Classic. Green outdoor carpet on concrete, silver aluminium bumpboards, a
   mown lawn round the lanes with a concrete gravel strip, lamp posts with round globes, park
   benches, low hedges and flower planters, and a little clubhouse sign beyond each green with the
   hole's numeral and a putter-and-ball emblem. A warm summer evening. Course 98 sits outside the
   worlds, so this look stands alone and sets everything it needs; DEFAULT_LOOK fills the rest.
   Names are c98-prefixed: every course shares one scope. */
const C98_ICON = '<svg viewBox="0 0 64 64"><path d="M21 6 H43 L57 60 H7 Z" fill="#c9ced6"/><path d="M24.5 9 H39.5 L51.5 57 H12.5 Z" fill="#2e7d43"/><ellipse cx="32" cy="18" rx="4.5" ry="2.2" fill="#1d150e"/><path d="M32 18 V3" stroke="#fffdf7" stroke-width="2.4" stroke-linecap="round"/><path d="M33.2 3 L45 7.5 L33.2 12 Z" fill="#ef7d6d"/><circle cx="30" cy="48" r="5" fill="#fffdf7"/></svg>';
const C98 = { alu: '#d9dde3', aluDark: '#9aa3ad', iron: '#2f3b33', globe: '#fff1cf', hedge: '#4f7f3b', hedgeDark: '#3d6a2e', wood: '#c9a476', woodDark: '#8a6538',
  cream: '#fff8ec', green: '#2e7d43', red: '#ef7d6d', yellow: '#ffd66e', concrete: '#b9b2a4', soil: '#5b4630', ink: '#1d150e', ball: '#fffdf7' };
const c98Metal = (color, o) => mat(color, Object.assign({ metalness: 0.6, roughness: 0.32 }, o));
function c98Box(w, h, d, m, x, y, z) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m);
  b.position.set(x, y, z); b.castShadow = true; return b;
}
function c98Cyl(r0, r1, h, m, x, y, z, seg = 12) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), typeof m === 'string' ? mat(m) : m);
  c.position.set(x, y, z); c.castShadow = true; return c;
}
/* a park lamp: a black iron pole on a fluted foot, a collar, and a round milk-glass globe */
function c98Lamp() {
  const g = new THREE.Group(), iron = mat(C98.iron, { roughness: 0.55, metalness: 0.3 });
  g.add(c98Cyl(0.08, 0.1, 0.1, iron, 0, 0.05, 0), c98Cyl(0.026, 0.032, 1.5, iron, 0, 0.85, 0), c98Cyl(0.06, 0.04, 0.06, iron, 0, 1.62, 0));
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat(C98.globe, { emissive: C98.globe, emissiveIntensity: 0.55, roughness: 0.3 }));
  globe.position.y = 1.76; g.add(globe, c98Cyl(0.03, 0.03, 0.03, iron, 0, 1.89, 0));
  g.userData.c98r = 0.14; g.userData.c98tall = true; return g;
}
/* a park bench: three slats to sit on, two for the back, iron ends */
function c98Bench() {
  const g = new THREE.Group(), wood = mat(C98.wood, { roughness: 0.75 }), iron = mat(C98.iron, { roughness: 0.55, metalness: 0.3 });
  for (const z of [-0.08, 0, 0.08]) g.add(c98Box(0.9, 0.025, 0.07, wood, 0, 0.24, z));
  for (const y of [0.34, 0.44]) { const s = c98Box(0.9, 0.07, 0.022, wood, 0, y, -0.14); s.rotation.x = -0.18; g.add(s); }
  for (const x of [-0.38, 0.38]) g.add(c98Box(0.04, 0.24, 0.26, iron, x, 0.12, 0), c98Box(0.04, 0.26, 0.04, iron, x, 0.37, -0.15));
  g.userData.c98r = 0.5; return g;
}
/* a low clipped hedge: a long rounded block with a lumpy top */
function c98Hedge(r) {
  const g = new THREE.Group(), L = 0.7 + r() * 0.7, leaf = mat(C98.hedge, { roughness: 0.95 });
  g.add(c98Box(L, 0.26, 0.34, mat(C98.hedgeDark, { roughness: 0.95 }), 0, 0.13, 0));
  const n = Math.max(2, Math.round(L / 0.3));
  for (let i = 0; i < n; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), leaf); s.position.set(-L / 2 + 0.17 + i * (L - 0.34) / (n - 1), 0.24, 0); s.scale.y = 0.75; s.castShadow = true; g.add(s); }
  g.userData.c98r = L / 2 + 0.12; return g;
}
/* a square concrete planter of red and yellow flowers */
function c98Planter(r) {
  const g = new THREE.Group();
  g.add(c98Box(0.42, 0.24, 0.42, C98.concrete, 0, 0.12, 0), c98Box(0.36, 0.02, 0.36, C98.soil, 0, 0.245, 0));
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(i % 2 ? C98.red : C98.yellow, { roughness: 0.7 }));
    f.position.set((r() - 0.5) * 0.26, 0.29 + r() * 0.04, (r() - 0.5) * 0.26); g.add(f);
  }
  g.userData.c98r = 0.3; return g;
}
const c98Prop = r => { const k = r(); return k < 0.28 ? c98Lamp() : k < 0.48 ? c98Bench() : k < 0.8 ? c98Hedge(r) : c98Planter(r); };
/* metal blocker posts: brushed aluminium with a domed cap and a dark foot ring */
function c98Post(p) {
  const g = new THREE.Group(), top = p.top || 0.2;
  g.add(c98Cyl(p.r, p.r, top, c98Metal(C98.alu), 0, top / 2, 0, 20), c98Cyl(p.r * 1.25, p.r * 1.3, 0.02, c98Metal(C98.aluDark), 0, 0.01, 0, 20));
  const cap = new THREE.Mesh(new THREE.SphereGeometry(p.r, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), c98Metal(C98.alu)); cap.position.y = top; g.add(cap);
  return g;
}
/* the clubhouse sign: a cream board on two iron posts with the hole's numeral in a green disc and a
   putter-and-ball emblem, a red pennant on top. Numerals and symbols only, no letters */
function c98SignCanvas(n) {
  return cachedCanvas('c98sign:' + n, 512, 256, (x, w, h) => {
    x.fillStyle = C98.cream; x.fillRect(0, 0, w, h);
    x.strokeStyle = C98.green; x.lineWidth = 14; x.strokeRect(10, 10, w - 20, h - 20);
    x.fillStyle = C98.green; x.beginPath(); x.arc(134, 128, 92, 0, Math.PI * 2); x.fill();
    x.fillStyle = C98.cream; x.font = '900 128px ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(String(n), 134, 136);
    /* the emblem: a putter leaning over a ball beside a flag in a cup */
    x.save(); x.translate(330, 128); x.rotate(-0.45);
    x.fillStyle = C98.aluDark; x.fillRect(-7, -96, 14, 150);
    x.fillStyle = C98.ink; x.fillRect(-9, -104, 18, 34);
    x.fillStyle = C98.aluDark; x.fillRect(-40, 50, 64, 22);
    x.restore();
    x.fillStyle = C98.ball; x.strokeStyle = C98.aluDark; x.lineWidth = 4; x.beginPath(); x.arc(392, 190, 20, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = C98.ink; x.beginPath(); x.ellipse(452, 206, 26, 9, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = C98.ink; x.lineWidth = 5; x.beginPath(); x.moveTo(452, 204); x.lineTo(452, 66); x.stroke();
    x.fillStyle = C98.red; x.beginPath(); x.moveTo(455, 66); x.lineTo(492, 82); x.lineTo(455, 98); x.closePath(); x.fill();
  });
}
function c98Sign(n) {
  const g = new THREE.Group(), iron = mat(C98.iron, { roughness: 0.55, metalness: 0.3 });
  for (const x of [-0.42, 0.42]) g.add(c98Cyl(0.03, 0.035, 1.05, iron, x, 0.525, 0));
  const face = mat('#ffffff', { map: texOf(c98SignCanvas(n)), roughness: 0.7 }), plain = mat(C98.cream, { roughness: 0.7 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.05), [plain, plain, plain, plain, face, plain]);
  board.position.y = 0.95; board.castShadow = true; g.add(board, c98Box(1.16, 0.05, 0.08, C98.green, 0, 1.245, 0));
  g.add(c98Cyl(0.012, 0.012, 0.36, iron, 0.5, 1.45, 0, 8));
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(-0.2, -0.06); s.lineTo(0, -0.12); s.closePath();
  const pennant = new THREE.Mesh(new THREE.ShapeGeometry(s), mat(C98.red, { roughness: 0.6, side: THREE.DoubleSide }));
  pennant.position.set(0.5, 1.62, 0); pennant.userData.c98flag = true; g.add(pennant);
  g.userData.c98sign = true; return g;
}
/* scenery tidy: scatterProps spaces prop centres only, so drop any prop whose footprint would reach
   the gravel strip round the lanes or touch another prop, anything in the aim camera's view behind
   the tee, and lamp posts close to the lanes. Then the clubhouse sign goes up past the far end of the hole */
function c98Decor(group, h) {
  const edges = h.segs.slice();
  for (const f of h.floors) f.forEach((p, i) => { const q = f[(i + 1) % f.length]; edges.push([p[0], p[1], q[0], q[1]]); });
  const gap = (x, z) => Math.min(...edges.map(s => { const c = closestOnSeg(s[0], s[1], s[2], s[3], x, z); return Math.hypot(x - c[0], z - c[1]); }));
  const t = h.aim0 !== undefined ? h.aim0 * Math.PI / 180 : Math.atan2(h.cup[0] - h.tee[0], h.cup[1] - h.tee[1]), ux = Math.sin(t), uz = Math.cos(t);
  const kept = [];
  for (const o of group.children.slice()) {
    const r = o.userData.c98r;
    if (r === undefined) continue;
    const x = o.position.x, z = o.position.z, along = (x - h.tee[0]) * ux + (z - h.tee[1]) * uz, lat = Math.abs((x - h.tee[0]) * uz - (z - h.tee[1]) * ux);
    const tall = o.userData.c98tall, bad = gap(x, z) < r + (tall ? 0.9 : 0.4) || (along > -4.5 && along < 0.8 && lat < 1.8) || (tall && along > -4.5 && along < 3.5 && lat < 2.6)
      || kept.some(k => Math.hypot(x - k.position.x, z - k.position.z) < r + k.userData.c98r + 0.1);
    if (bad) { group.remove(o); disposeGroup(o); } else kept.push(o);
  }
  /* the sign stands past the far end of the hole, square to the line from the tee, facing back */
  const B = holeBounds(h), dx = B.cx - h.tee[0], dz = B.cz - h.tee[1], d = Math.hypot(dx, dz) || 1, vx = dx / d, vz = dz / d;
  const reach = Math.max(...h.floors.flat().map(([x, z]) => (x - h.tee[0]) * vx + (z - h.tee[1]) * vz));
  const n = Number(h.key.split('-')[1]), sign = c98Sign(n);
  let k = reach + 1.1;
  while (gap(h.tee[0] + vx * k, h.tee[1] + vz * k) < 0.95 && k < reach + 6) k += 0.3;
  sign.position.set(h.tee[0] + vx * k, 0, h.tee[1] + vz * k); sign.rotation.y = Math.atan2(-vx, -vz);
  for (const o of kept) if (Math.hypot(o.position.x - sign.position.x, o.position.z - sign.position.z) < o.userData.c98r + 0.8) { group.remove(o); disposeGroup(o); }
  group.add(sign);
}
WORLD_LOOK[98] = {
  /* the white ball reads at about 5:1 on the carpet and 3.5:1 on the pond */
  felt: '#2e7d43', wall: '#c9ced6', wallKind: 'steel', ground: '#8fa36b', edging: ['rock', '#b9b2a4'], skirt: '#b9b2a4',
  sky: ['#6fa3d4', '#ffd6a0'], fog: true, flag: C98.red, icon: C98_ICON, water: '#3a8fc8', tube: '#d9dde3',
  jingle: [392, 523, 659, 784, 659, 1047],
  prop: c98Prop,
  post: c98Post,
  decor: c98Decor,
  tick(group, dt, t) {
    if (reducedMotion()) return;
    /* the pennant on the clubhouse sign stirs in the evening breeze */
    for (const o of group.children) if (o.userData.c98sign) for (const c of o.children) if (c.userData.c98flag) c.rotation.y = 0.35 * Math.sin(t * 1.7) + 0.12 * Math.sin(t * 4.3);
  },
};
