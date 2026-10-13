/* world 7, the haunted castle: a purple night, mossy felt, lavender stone, glowing pumpkins and
   lanterns, gargoyle posts, turnstile windmills, iron portcullis gates and friendly ghosts.
   Bats circle overhead and the ghosts bob (both still under reduced motion). */
const C7_ICON = '<svg viewBox="0 0 64 64"><circle cx="46" cy="16" r="10" fill="#ffd66e"/><circle cx="51" cy="12" r="8" fill="#2a2152"/>' +
  '<path d="M8 58 V30 H12 V25 H16 V30 H20 V25 H24 V30 H28 V40 H36 V30 H40 V25 H44 V30 H48 V25 H52 V30 H56 V58 Z" fill="#a39cb5"/>' +
  '<path d="M27 58 V49 a5 5 0 0 1 10 0 V58 Z" fill="#4a3826"/><rect x="15" y="36" width="5" height="7" rx="2" fill="#ffd66e"/><rect x="44" y="36" width="5" height="7" rx="2" fill="#ffd66e"/></svg>';
const C7_STONE = '#a39cb5', C7_DARK = '#2a2152', C7_GLOW = '#ffd66e', C7_PUMPKIN = '#f28c38';
const c7Glow = (color, k = 1) => mat(color, { emissive: color, emissiveIntensity: k, roughness: 0.6 });
function c7Pumpkin(r) {
  const g = new THREE.Group(), s = 0.11 + r() * 0.06;
  const body = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 12), mat(C7_PUMPKIN, { roughness: 0.6, emissive: 0x5a2400 }));
  body.scale.y = 0.75; body.position.y = s * 0.75; body.castShadow = true;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.022, 0.06, 8), mat('#4e9a45')); stem.position.y = s * 1.5 + 0.02;
  g.add(body, stem);
  /* the face is cut flush into the skin: flat triangle eyes and a three-piece grin that follows the curve */
  const glow = c7Glow(C7_GLOW, 1.4), skin = (x, y) => -Math.sqrt(Math.max(0, s * s * (1 - ((y - s * 0.75) / (s * 0.75)) ** 2) - x * x));
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.18, s * 0.18, 0.02, 3), glow);
    eye.rotation.set(-Math.PI / 2, 0, 0); eye.position.set(sx * s * 0.35, s * 0.95, skin(sx * s * 0.35, s * 0.95) + 0.004); g.add(eye);
  }
  for (const gx of [-0.27, 0, 0.27]) {
    const x = gx * s, gy = s * (gx ? 0.5 : 0.45), z = skin(x, gy);
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(s * 0.27, s * 0.13, 0.02), glow); tooth.position.set(x, gy, z + 0.004);
    tooth.rotation.y = -Math.atan2(x, -z); g.add(tooth);
  }
  return g;
}
function c7Lantern(r) {
  const g = new THREE.Group(), hgt = 0.5 + r() * 0.25;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, hgt, 8), mat('#4a3826')); pole.position.y = hgt / 2; pole.castShadow = true;
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.12), c7Glow(C7_GLOW, 1.6)); lamp.position.y = hgt + 0.07;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.08, 4), mat('#4a3826')); cap.position.y = hgt + 0.18; cap.rotation.y = Math.PI / 4;
  g.add(pole, lamp, cap); return g;
}
function c7Grave(r) {
  const g = new THREE.Group(), w = 0.16 + r() * 0.08, hgt = 0.22 + r() * 0.1;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, 0.06), mat(C7_STONE, { roughness: 0.9 })); slab.position.y = hgt / 2; slab.castShadow = true;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.06, 16), mat(C7_STONE, { roughness: 0.9 }));
  top.rotation.x = Math.PI / 2; top.position.y = hgt;
  g.add(slab, top); g.rotation.z = (r() - 0.5) * 0.2; return g;
}
/* a cheeky stone gargoyle crouched on a pedestal */
function c7Gargoyle(p) {
  const g = new THREE.Group(), r = p.r, stone = mat(C7_STONE, { roughness: 0.85 }), dark = mat('#7d7596', { roughness: 0.85 });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, 0.16, 16), dark); ped.position.y = 0.08; ped.castShadow = true;
  const body = new THREE.Mesh(new THREE.SphereGeometry(r * 0.8, 16, 12), stone); body.position.y = 0.16 + r * 0.7; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 16, 12), stone); head.position.set(0, 0.16 + r * 1.55, -r * 0.2); head.castShadow = true;
  g.add(ped, body, head);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.02, r * 0.9, r * 0.9), dark); wing.position.set(s * r * 0.85, 0.16 + r * 1.05, r * 0.2); wing.rotation.z = s * 0.5;
    const horn = new THREE.Mesh(new THREE.ConeGeometry(r * 0.13, r * 0.4, 8), dark); horn.position.set(s * r * 0.3, 0.16 + r * 2.05, -r * 0.2); horn.rotation.z = -s * 0.3;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(r * 0.1, 8, 6), c7Glow(C7_GLOW, 1.5)); eye.position.set(s * r * 0.2, 0.16 + r * 1.6, -r * 0.7);
    g.add(wing, horn, eye);
  }
  return g;
}
/* windmill: a little round tower turning two crossed sails at ball height */
function c7Windmill(m) {
  const g = new THREE.Group(), wood = mat('#a8804e', { roughness: 0.6 }), red = mat('#ef7d6d', { roughness: 0.5 });
  for (let i = 0; i < 2; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2, 0.1, m.len * 2), wood); arm.position.y = 0.09; arm.rotation.y = i * Math.PI / 2; arm.castShadow = true;
    for (const s of [-1, 1]) {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2 + 0.01, 0.105, 0.12), red); tip.position.set(0, 0, s * (m.len - 0.06)); arm.add(tip);
    }
    g.add(arm);
  }
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.34, 16), mat(C7_STONE, { roughness: 0.8 })); tower.position.y = 0.17; tower.castShadow = true;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.18, 16), mat('#8f7dc6', { roughness: 0.6 })); roof.position.y = 0.43; roof.castShadow = true;
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.2), c7Glow(C7_GLOW, 1.3)); win.position.y = 0.24;
  g.add(tower, roof, win); return g;
}
/* portcullis: an iron grate whose spikes stand proud of the castle wall */
function c7Portcullis(m) {
  const g = new THREE.Group(), iron = mat('#4a4560', { roughness: 0.5, metalness: 0.4 }), L = m.len * 2;
  for (const y of [0.05, 0.27]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, L), iron); rail.position.y = y; rail.castShadow = true; g.add(rail); }
  const n = Math.max(3, Math.round(L / 0.08));
  for (let i = 0; i <= n; i++) {
    const z = -L / 2 + L * i / n, rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 6), iron); rod.position.set(0, 0.16, z);
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 6), mat(C7_GLOW, { roughness: 0.4, metalness: 0.3 })); spike.position.set(0, 0.34, z);
    g.add(rod, spike);
  }
  return g;
}
/* a friendly ghost: dome head, wavy skirt, big eyes; its body bobs inside the mover group */
function c7Ghost(m) {
  const g = new THREE.Group(), body = new THREE.Group(), white = mat('#f4f1ff', { roughness: 0.5, emissive: 0x3a3060, transparent: true, opacity: 0.92 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(m.r, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), white); head.position.y = m.r * 0.35;
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(m.r, m.r * 1.15, m.r * 1.2, 20, 1, true), white); skirt.position.y = -m.r * 0.25;
  head.castShadow = skirt.castShadow = true;
  body.add(head, skirt);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(m.r * 0.16, 10, 8), mat(C7_DARK, { roughness: 0.4 })); eye.position.set(s * m.r * 0.35, m.r * 0.6, -m.r * 0.85); eye.scale.z = 0.5;
    body.add(eye);
  }
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(m.r * 0.12, 10, 8), mat(C7_DARK)); mouth.position.set(0, m.r * 0.25, -m.r * 0.97); mouth.scale.set(1, 1.3, 0.4);
  body.add(mouth); body.userData.c7Bob = m.ax * 3 + m.az;
  g.add(body); return g;
}
function c7Bat() {
  const g = new THREE.Group(), black = mat('#1a1530', { roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), black); g.add(body);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.01, 0.12), black); w.position.x = s * 0.13; w.userData.c7Wing = s;
    const pivot = new THREE.Group(); pivot.add(w); g.add(pivot);
  }
  return g;
}
/* scenery hygiene: props never touch each other, and none stands in the camera's way behind the tee */
function c7Tidy(group, h) {
  const a = (h.aim0 !== undefined ? h.aim0 : Math.atan2(h.cup[0] - h.tee[0], h.cup[1] - h.tee[1]) * 180 / Math.PI) * Math.PI / 180;
  const dx = Math.sin(a), dz = Math.cos(a), kept = [];
  for (const o of group.children.filter(c => c.userData.c7R)) {
    const px = o.position.x - h.tee[0], pz = o.position.z - h.tee[1], back = -(px * dx + pz * dz), side = Math.abs(px * dz - pz * dx);
    const clash = kept.some(k => Math.hypot(k.position.x - o.position.x, k.position.z - o.position.z) < k.userData.c7R + o.userData.c7R + 0.15);
    if (clash || (back > -1.5 && back < 5.5 && side < 1.9 + Math.max(0, back) * 0.4)) group.remove(o); else kept.push(o);
  }
}
/* gatehouse: where a portcullis slides into the castle wall, a stone tower hides the bars */
function c7Gatehouses(group, h) {
  const stone = mat(C7_STONE, { roughness: 0.85 }), cap = mat('#8f88a3', { roughness: 0.85 });
  for (const m of h.movers) {
    if (m.look !== 'portcullis') continue;
    const a = (m.ang || 0) * Math.PI / 180, ux = Math.sin(a), uz = Math.cos(a);
    const ta = m.ax * ux + m.az * uz, tb = m.bx * ux + m.bz * uz, t0 = Math.min(ta, tb) - m.len, t1 = Math.max(ta, tb) + m.len;
    const ox = m.ax - ta * ux, oz = m.az - ta * uz, runs = [];
    let cur = null;
    for (let t = t0; t <= t1 + 1e-6; t += 0.01) {
      const x = ox + t * ux, z = oz + t * uz;
      const onWall = h.segs.some(s => { const c = closestOnSeg(s[0], s[1], s[2], s[3], x, z); return Math.hypot(x - c[0], z - c[1]) < 0.01; });
      if (onWall) { if (!cur) runs.push(cur = [t, t]); else cur[1] = t; } else cur = null;
    }
    for (const [s0, s1] of runs) {
      if (s1 - s0 < 0.08) continue;
      const len = s1 - s0 + 0.04, mid = (s0 + s1) / 2, x = ox + mid * ux, z = oz + mid * uz, y = groundH(h, x, z);
      const tower = new THREE.Group(); tower.position.set(x, y, z); tower.rotation.y = a;
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.42, len), stone); body.position.y = 0.21; body.castShadow = true; tower.add(body);
      const n = Math.max(2, Math.round(len / 0.12));
      for (let i = 0; i < n; i++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, len / n * 0.55), cap);
        c.position.set(0, 0.455, -len / 2 + (i + 0.5) * len / n); tower.add(c);
      }
      group.add(tower);
    }
  }
}
WORLD_LOOK[7] = {
  /* mossy felt and dark moat keep the white ball well above 3:1 */
  felt: '#3f7350', wall: C7_STONE, ground: '#3b3556', sky: ['#1a1747', '#5a3486'], fog: true, skirt: '#5e5670',
  sand: '#8a6a4a', fast: '#6a4f8f', water: '#2d6f8f', flag: C7_PUMPKIN, icon: C7_ICON,
  jingle: [392, 466, 587, 698, 784],
  prop: r => {
    const k = r(), o = k < 0.5 ? c7Pumpkin(r) : k < 0.78 ? c7Lantern(r) : c7Grave(r);
    o.userData.c7R = k < 0.5 ? 0.2 : k < 0.78 ? 0.12 : 0.16; return o;
  },
  post: p => p.look === 'gargoyle' ? c7Gargoyle(p) : defaultPost(p, lookOf(7)),
  mover: m => m.look === 'windmill' ? c7Windmill(m) : m.look === 'portcullis' ? c7Portcullis(m) : m.look === 'ghost' ? c7Ghost(m) : defaultMover(m, lookOf(7)),
  decor(group, h) {
    const B = holeBounds(h), r = rng32(77);
    c7Tidy(group, h); c7Gatehouses(group, h);
    /* the moon and stars */
    const moon = new THREE.Mesh(new THREE.SphereGeometry(2.2, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff1c4', fog: false }));
    moon.position.set(B.cx + 16, 15, B.cz + 34); group.add(moon);
    const n = 600, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = 0.15 + r() * 0.85, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      pos[i * 3] = B.cx + Math.cos(a) * s * 50; pos[i * 3 + 1] = u * 50; pos[i * 3 + 2] = B.cz + Math.sin(a) * s * 50;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    group.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfff4e0, size: 0.15, fog: false })));
    /* the castle on the far side of the course */
    const keep = new THREE.Group(), wallM = mat('#4a3f6b', { roughness: 1 }), roofM = mat('#2a2152', { roughness: 1 }), winM = c7Glow(C7_GLOW, 1.2);
    for (const [x, w, hgt] of [[-6, 2, 4], [-3, 1.4, 6.5], [0, 4, 3.5], [0, 1.8, 7.5], [3, 1.4, 6], [6, 2, 4.5]]) {
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, hgt, 12), wallM); tw.position.set(x, hgt / 2, 0);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(w / 2 + 0.25, w * 0.9, 12), roofM); cone.position.set(x, hgt + w * 0.45, 0);
      keep.add(tw, cone);
      for (let k = 0; k < 2; k++) { const wn = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.1), winM); wn.position.set(x + (k - 0.5) * w * 0.35, hgt * (0.45 + k * 0.25), -w / 2); keep.add(wn); }
    }
    keep.position.set(B.cx, -0.03, B.z1 + 9); group.add(keep);
    /* hole 17 winds round a tower: stand it in the middle of the U */
    if (h.key === '7-17') {
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.55, 16), mat(C7_STONE, { roughness: 0.85 })); tw.position.set(0, 0.275, 1.75); tw.castShadow = true;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.42, 16), mat('#8f7dc6', { roughness: 0.6 })); roof.position.set(0, 0.76, 1.75); roof.castShadow = true;
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.05), mat('#4a3826')); door.position.set(0, 0.13, 1.75 - 0.39);
      const wn = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.05), winM); wn.position.set(0, 0.42, 1.75 - 0.36);
      group.add(tw, roof, door, wn);
    }
    /* bats circling high over the hole */
    const bats = [];
    for (let i = 0; i < 5; i++) {
      const b = c7Bat(); b.userData.c7 = { a: r() * Math.PI * 2, rad: B.ext + 2.5 + r() * 2, y: 3 + r() * 1.5, sp: 0.25 + r() * 0.2 };
      group.add(b); bats.push(b);
    }
    const bobs = []; group.traverse(o => { if (o.userData.c7Bob !== undefined) bobs.push(o); });
    group.userData.c7 = { bats, bobs, cx: B.cx, cz: B.cz };
    this.tick(group, 0, 0, true);
  },
  tick(group, dt, t, force) {
    const d = group.userData.c7; if (!d || (!force && reducedMotion())) return;
    for (const b of d.bats) {
      const u = b.userData.c7, a = u.a + t * u.sp;
      b.position.set(d.cx + Math.cos(a) * u.rad, u.y + Math.sin(t * 0.7 + u.a) * 0.3, d.cz + Math.sin(a) * u.rad);
      b.rotation.y = -a;
      const flap = Math.sin(t * 9 + u.a) * 0.5;
      b.children.forEach(c => { if (c.children[0] && c.children[0].userData.c7Wing) c.rotation.z = c.children[0].userData.c7Wing * flap; });
    }
    for (const o of d.bobs) o.position.y = Math.sin(t * 2.2 + o.userData.c7Bob) * 0.02;
  },
};
