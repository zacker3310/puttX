/* world 5, pirate cove: plank walls, a turquoise lagoon all round, sand islands with palms,
   floating barrels, a friendly skull flag, barrel and anchor posts, cannonball, drawbridge and
   ship's-wheel movers, and the pirate ship anchored off the course. */
WORLD_LOOK[5] = (() => {
  const SKULL = '<svg viewBox="0 0 64 64"><path d="M14 28 C14 14 22 7 32 7 C42 7 50 14 50 28 C50 35 46 39 44 41 V49 H20 V41 C18 39 14 35 14 28 Z" fill="#fff8ec"/>' +
    '<path d="M14 24 C16 11 24 6 32 6 C40 6 48 11 50 24 Z" fill="#ef7d6d"/><circle cx="45" cy="15" r="4" fill="#fff8ec"/>' +
    '<circle cx="24.5" cy="31" r="6" fill="#4a3826"/><circle cx="39.5" cy="31" r="6" fill="#4a3826"/><circle cx="26" cy="29.5" r="2" fill="#fff8ec"/><circle cx="41" cy="29.5" r="2" fill="#fff8ec"/>' +
    '<path d="M30 38 L32 34 L34 38 Z" fill="#4a3826"/><path d="M25 44 V49 M30 44 V49 M34 44 V49 M39 44 V49" stroke="#cfc0a6" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M8 54 L56 60 M8 60 L56 54" stroke="#c9a476" stroke-width="5" stroke-linecap="round"/></svg>';
  const WOOD = '#b98a52', WOOD_DARK = '#8a6538', IRON = '#4a4a55';
  const shade = o => { o.castShadow = true; return o; };
  function barrel(r, hgt) {
    const g = new THREE.Group();
    const body = shade(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r * 0.92, hgt, 16), mat(WOOD, { roughness: 0.7 })));
    const belly = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hgt * 0.5, 16), mat(WOOD, { roughness: 0.7 }));
    body.position.y = belly.position.y = hgt / 2; g.add(body, belly);
    for (const k of [0.16, 0.84]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.97, r * 0.97, hgt * 0.08, 16), mat(IRON, { roughness: 0.5 }));
      band.position.y = hgt * k; g.add(band);
    }
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.01, 16), mat(WOOD_DARK)); lid.position.y = hgt + 0.002; g.add(lid);
    return g;
  }
  function anchor(p) {
    const g = new THREE.Group(), iron = mat(IRON, { roughness: 0.45, metalness: 0.3 }), top = p.top || 0.3;
    const base = shade(new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r * 1.1, 0.07, 18), mat(WOOD_DARK)));
    base.position.y = 0.035;
    const shaft = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, top - 0.06, 8), iron)); shaft.position.y = 0.06 + (top - 0.06) / 2;
    const bar = shade(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.024, 0.024), iron)); bar.position.y = top - 0.05;
    const ring = shade(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 6, 14), iron)); ring.position.y = top + 0.02;
    const arms = shade(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 6, 16, Math.PI), iron)); arms.rotation.z = Math.PI; arms.position.y = 0.155;
    g.add(base, shaft, bar, ring, arms);
    for (const s of [-1, 1]) { const tip = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.05, 4), iron); tip.position.set(s * 0.075, 0.165, 0); g.add(tip); }
    return g;
  }
  function cannonball(m) {
    const g = new THREE.Group();
    const s = shade(new THREE.Mesh(new THREE.SphereGeometry(m.r, 22, 14), mat('#3b3b46', { roughness: 0.35, metalness: 0.35 })));
    const glint = new THREE.Mesh(new THREE.SphereGeometry(m.r * 0.22, 10, 8), mat('#8f8fa0', { roughness: 0.3 })); glint.position.set(m.r * 0.45, m.r * 0.6, -m.r * 0.4);
    g.add(s, glint); return g;
  }
  function drawbridge(m) {
    const g = new THREE.Group(), L = m.len * 2;
    const bar = shade(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, L), mat(WOOD, { roughness: 0.7 }))); bar.position.y = 0.08; g.add(bar);
    for (let i = 1; i < Math.round(L / 0.1); i++) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.104, 0.164, 0.008), mat(WOOD_DARK)); seam.position.set(0, 0.08, -L / 2 + i * L / Math.round(L / 0.1)); g.add(seam);
    }
    for (const s of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.106, 0.03, 0.03), mat(IRON)); strap.position.set(0, 0.17, s * (L / 2 - 0.05));
      const chain = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.007, 6, 12), mat(IRON)); chain.position.set(0, 0.2, s * (L / 2 - 0.05)); chain.rotation.y = Math.PI / 2;
      g.add(strap, chain);
    }
    return g;
  }
  function shipWheel(m) {
    const g = new THREE.Group(), wood = mat(WOOD, { roughness: 0.6 }), dark = mat(WOOD_DARK, { roughness: 0.6 });
    for (let i = 0; i < 2; i++) {
      const spoke = shade(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, m.len * 2), wood)); spoke.position.y = 0.07; spoke.rotation.y = i * Math.PI / 2; g.add(spoke);
      for (const s of [-1, 1]) {
        const knob = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.2, 10), dark));
        knob.position.set(i ? s * m.len : 0, 0.12, i ? 0 : s * m.len); g.add(knob);
      }
    }
    const rim = shade(new THREE.Mesh(new THREE.TorusGeometry(m.len * 0.62, 0.025, 8, 28), dark)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.17; g.add(rim);
    const hub = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.22, 16), mat('#ffd66e', { roughness: 0.4, metalness: 0.3 }))); hub.position.y = 0.11; g.add(hub);
    return g;
  }
  function palm(r) {
    const g = new THREE.Group(), s = 0.8 + r() * 0.5, lean = (r() - 0.5) * 0.5;
    const trunk = mat('#a8804e', { roughness: 0.9 });
    let y = 0, x = 0;
    for (let i = 0; i < 5; i++) {
      const seg = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.045 * s, 0.06 * s, 0.24 * s, 8), trunk));
      x += lean * 0.06 * i * s; seg.position.set(x, y + 0.12 * s, 0); seg.rotation.z = -lean * 0.3; g.add(seg); y += 0.22 * s;
    }
    const leaf = mat('#4e9a45', { roughness: 0.8, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const fr = shade(new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.02, 0.14 * s), leaf));
      const a = i * Math.PI / 3;
      fr.position.set(x + Math.cos(a) * 0.22 * s, y - 0.02, Math.sin(a) * 0.22 * s); fr.rotation.y = -a; fr.rotation.z = -0.35; g.add(fr);
    }
    for (let i = 0; i < 3; i++) { const nut = new THREE.Mesh(new THREE.SphereGeometry(0.04 * s, 8, 6), mat('#6e5233')); nut.position.set(x + Math.cos(i * 2.1) * 0.05, y - 0.06, Math.sin(i * 2.1) * 0.05); g.add(nut); }
    return g;
  }
  function chest() {
    const g = new THREE.Group();
    const box = shade(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.2), mat('#a8804e'))); box.position.y = 0.08;
    const lid = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 12, 1, false, 0, Math.PI), mat('#8a6538'))); lid.rotation.z = Math.PI / 2; lid.position.y = 0.16;
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.02), mat('#ffd66e', { metalness: 0.4, roughness: 0.4 })); lock.position.set(0, 0.15, 0.105);
    const gold = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 6), mat('#ffd66e', { metalness: 0.4, roughness: 0.4, emissive: 0x403010 })); gold.position.set(0.17, 0.02, 0.14); gold.scale.y = 0.4;
    g.add(box, lid, lock, gold); return g;
  }
  function island(r) {
    const g = new THREE.Group(), rad = 0.35 + r() * 0.35;
    const sandy = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.15, 0.1, 20), mat('#f1d79c', { roughness: 1 })); sandy.position.y = 0.02; sandy.receiveShadow = true; g.add(sandy);
    const k = r();
    const top = k < 0.6 ? palm(r) : k < 0.8 ? chest() : barrel(0.12, 0.24);
    top.position.y = 0.07; g.add(top);
    return g;
  }
  function floater(r) {
    const g = new THREE.Group(), b = barrel(0.11, 0.24); b.rotation.z = Math.PI / 2; b.position.set(0.12, 0.06, 0); g.add(b);
    g.userData.bob = r() * 6; return g;
  }
  function ship() {
    const g = new THREE.Group(), hull = mat('#8a6538', { roughness: 0.7 });
    const body = shade(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 3.2), hull)); body.position.y = 0.2;
    const bow = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.55, 0.9, 4, 1), hull)); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 1, 0.45); bow.position.set(0, 0.2, 2.05);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.08, 3.22), mat('#ffd66e')); stripe.position.y = 0.36;
    const cabin = shade(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.8), mat('#a8804e'))); cabin.position.set(0, 0.65, -1.1);
    const mast = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 8), mat('#6e5233'))); mast.position.y = 1.7;
    const sail = shade(new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 0.04), mat('#fff8ec', { roughness: 0.9 }))); sail.position.set(0, 1.9, 0.08);
    const skull = new THREE.Mesh(new THREE.CircleGeometry(0.22, 18), mat('#4a3826')); skull.position.set(0, 1.95, 0.105);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.28), mat('#4a3826', { side: THREE.DoubleSide })); flag.position.set(0, 3.0, 0.25);
    g.add(body, bow, stripe, cabin, mast, sail, skull, flag);
    for (const s of [-1, 1]) for (const z of [-0.2, 0.6]) {
      const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 10), mat(IRON)); gun.rotation.z = Math.PI / 2; gun.position.set(s * 0.6, 0.25, z); g.add(gun);
    }
    return g;
  }
  return {
    /* felt and sand are dark enough that the white ball reads at 3:1 against them */
    felt: '#2e7a5c', wall: '#c9a476', ground: '#55c3c6', sky: ['#7fd0e6', '#fff1d6'], flag: '#4a3826', icon: SKULL,
    sand: '#a37440', water: '#2aa7b8', skirt: '#8a6538', mud: '#5b4630', ice: '#2f7ea6', fast: '#3f5f86', push: '#e9a23b',
    jingle: [392, 523, 659, 523, 784],
    prop: r => r() < 0.75 ? island(r) : floater(r),
    post: (p, look) => p.look === 'barrel' ? barrel(p.r, p.top || 0.26) : p.look === 'anchor' ? anchor(p) : defaultPost(p, look),
    mover: (m, look) => m.look === 'cannon' ? cannonball(m) : m.look === 'bridge' ? drawbridge(m) : m.look === 'wheel' ? shipWheel(m) : defaultMover(m, look),
    decor(group, h) {
      const B = holeBounds(h), s = ship();
      s.position.set(B.x1 + 3.2, -0.05, B.z1 + 2.2); s.rotation.y = 0.5; group.add(s); group.userData.ship = s;
      const floats = [];
      group.traverse(o => { if (o.userData.bob !== undefined) floats.push(o); });
      group.userData.floats = floats;
    },
    tick(group, dt, t) {
      if (reducedMotion()) return;
      const s = group.userData.ship;
      if (s) { s.rotation.z = Math.sin(t * 0.9) * 0.03; s.position.y = -0.05 + Math.sin(t * 1.3) * 0.03; }
      for (const f of group.userData.floats || []) f.position.y = Math.sin(t * 1.6 + f.userData.bob) * 0.025;
    },
  };
})();
