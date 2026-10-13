/* world 9, candy factory: berry felt, mint walls, blue hard candy, caramel taffy, a chocolate
   river, belts, gumdrop bumpers, lollipop spinners, chocolate-bar presses, candy-cane pipes.
   Wrapped in a block so its helpers stay out of the other courses' way. */
{
  const LOLLY_SVG = '<svg viewBox="0 0 64 64"><rect x="29" y="30" width="6" height="30" rx="3" fill="#fff8ec"/><circle cx="32" cy="24" r="20" fill="#f29ac0"/>' +
    '<path d="M32 24 m0 -4 a4 4 0 1 1 -4 4 a8 8 0 1 1 8 8 a12 12 0 1 1 -12 -12" fill="none" stroke="#fff8ec" stroke-width="4" stroke-linecap="round"/></svg>';
  const CANDY = ['#f29ac0', '#6fc0df', '#ffd66e', '#74c465', '#b7a7e0', '#ef7d6d'];
  const pick = (x, z) => CANDY[Math.abs(Math.round(x * 7 + z * 13)) % CANDY.length];
  /* a swirl lollipop face */
  const swirlTex = (a, b) => canvasTex(128, 128, x => {
    x.fillStyle = a; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = b; x.lineWidth = 9; x.lineCap = 'round'; x.beginPath();
    for (let t = 0; t < 22; t += 0.1) { const r = t * 2.8; x.lineTo(64 + Math.cos(t) * r, 64 + Math.sin(t) * r); }
    x.stroke();
  });
  /* red and white stripes around a stick or cane */
  const stripeTex = (a, b, n) => {
    const t = canvasTex(64, 64, x => {
      x.fillStyle = a; x.fillRect(0, 0, 64, 64); x.fillStyle = b;
      for (let i = -1; i < 3; i++) { x.beginPath(); x.moveTo(i * 32, 64); x.lineTo(i * 32 + 16, 64); x.lineTo(i * 32 + 48, 0); x.lineTo(i * 32 + 32, 0); x.fill(); }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, n); return t;
  };
  const lollipop = (s, col) => {
    const g = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 1.1 * s, 8), mat('#fff8ec', { roughness: 0.5 }));
    stick.position.y = 0.55 * s;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * s, 0.32 * s, 0.1 * s, 28), [
      mat(col, { roughness: 0.35 }), mat('#ffffff', { map: swirlTex(col, '#fff8ec'), roughness: 0.35 }), mat('#ffffff', { map: swirlTex(col, '#fff8ec'), roughness: 0.35 })]);
    disc.rotation.x = Math.PI / 2; disc.position.y = 1.35 * s; disc.name = 'lollyDisc';
    stick.castShadow = disc.castShadow = true; g.add(stick, disc); return g;
  };
  const gumdrop = (r, col, top = 0.22) => {
    const g = new THREE.Group(), m = mat(col, { roughness: 0.75 }), h = Math.max(0.04, top - r * 0.8);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, h, 20), m); base.position.y = h / 2;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.8, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m); cap.position.y = h;
    base.castShadow = cap.castShadow = true; g.add(base, cap);
    /* sugar sparkles */
    const sug = mat('#fffdf7', { roughness: 0.4 });
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + 0.3, s = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.018), sug);
      s.position.set(Math.cos(a) * r * 0.55, h + r * 0.5, Math.sin(a) * r * 0.55); g.add(s);
    }
    return g;
  };
  const candyCane = s => {
    const g = new THREE.Group(), m = mat('#ffffff', { map: stripeTex('#fff8ec', '#ef7d6d', 6), roughness: 0.45 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 1.2 * s, 12), m); shaft.position.y = 0.6 * s;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.16 * s, 0.05 * s, 10, 20, Math.PI), mat('#ffffff', { map: stripeTex('#fff8ec', '#ef7d6d', 2), roughness: 0.45 }));
    hook.position.set(0.16 * s, 1.2 * s, 0); shaft.castShadow = hook.castShadow = true; g.add(shaft, hook); return g;
  };
  /* three prop kinds at one shared scale each, so the scenery reads as one set */
  const prop = r => {
    const k = r(), col = CANDY[Math.floor(r() * CANDY.length)], g = k < 0.35 ? lollipop(0.8, col)
      : k < 0.75 ? gumdrop(0.22, col, 0.4) : candyCane(0.75);
    g.userData.c9rad = k < 0.35 ? 0.3 : k < 0.75 ? 0.24 : 0.3;
    g.name = 'c9prop'; return g;
  };
  /* gumdrop bumper */
  const post = p => p.look === 'gumdrop' ? gumdrop(p.r, pick(p.x, p.z), p.top || 0.22) : defaultPost(p, lookOf(9));
  /* lollipop spinner: striped sticks along local z, one per blade, a swirl lollipop on the hub */
  const spinner = m => {
    const g = new THREE.Group(), n = m.blades || 1;
    for (let i = 0; i < n; i++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2, 0.09, m.len * 2), mat('#ffffff', { map: stripeTex('#fff8ec', '#f29ac0', Math.round(m.len * 8)), roughness: 0.45 }));
      arm.position.y = 0.08; arm.rotation.y = i * Math.PI / n; arm.castShadow = true; g.add(arm);
    }
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), mat('#fff8ec', { roughness: 0.5 })); stick.position.y = 0.2;
    const col = pick(m.x, m.z);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 24), [mat(col, { roughness: 0.35 }), mat('#ffffff', { map: swirlTex(col, '#fff8ec'), roughness: 0.35 }), mat(col, { roughness: 0.35 })]);
    disc.position.y = 0.37; disc.castShadow = stick.castShadow = true; g.add(stick, disc); return g;
  };
  /* candy press: a chocolate bar of half-length len along local z, scored into squares */
  const press = m => {
    const g = new THREE.Group(), n = Math.max(2, Math.round(m.len * 2 / 0.18));
    for (let i = 0; i < n; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2.2, 0.17, m.len * 2 / n - 0.012), mat(i % 2 ? '#6e3f24' : '#7d4a2b', { roughness: 0.55 }));
      seg.position.set(0, 0.085, -m.len + (i + 0.5) * m.len * 2 / n); seg.castShadow = true; g.add(seg);
    }
    const icing = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, m.len * 2 - 0.04), mat('#f29ac0', { roughness: 0.5 }));
    icing.position.y = 0.18; g.add(icing);
    return g;
  };
  const mover = m => m.look === 'lollipop' ? spinner(m) : m.look === 'press' ? press(m) : defaultMover(m, lookOf(9));
  WORLD_LOOK[9] = {
    /* white ball against this felt and the candy surfaces stays above 3:1 */
    felt: '#a8487a', wall: '#8fe0c8', ground: '#ffd9e8', sky: ['#ffb8d6', '#fff4e0'], flag: '#6fc0df', icon: LOLLY_SVG,
    fast: '#3d6fc4', mud: '#9a5e2c', water: '#5a3420', push: '#7a5aa8', skirt: '#d87aa8', sand: '#c98a4a',
    jingle: [784, 988, 1175, 1568, 1319, 1568],
    prop,
    post,
    mover,
    decor(group, h) {
      /* open holes stand in a chocolate pool: a ball that falls off a deck sinks into it */
      if (h.open) {
        const B = holeBounds(h), pad = 0.35;
        const pool = new THREE.Mesh(new THREE.PlaneGeometry(B.x1 - B.x0 + pad * 2, B.z1 - B.z0 + pad * 2), mat('#5a3420', { roughness: 0.2, metalness: 0.1 }));
        pool.rotation.x = -Math.PI / 2; pool.position.set(B.cx, -0.02, B.cz); pool.receiveShadow = true; group.add(pool);
        /* no scenery standing in the chocolate */
        for (const o of group.children.filter(c => c.name === 'c9prop')) {
          if (o.position.x > B.x0 - pad - 0.4 && o.position.x < B.x1 + pad + 0.4 && o.position.z > B.z0 - pad - 0.4 && o.position.z < B.z1 + pad + 0.4) { group.remove(o); disposeGroup(o); }
        }
      }
      /* tidy the scenery: no prop touching another, none hugging the course, none behind the tee in the camera's way */
      {
        const a0 = (h.aim0 || 0) * Math.PI / 180, fx = Math.sin(a0), fz = Math.cos(a0), kept = [];
        const nearCourse = (x, z, d) => h.segs.some(s => { const q = closestOnSeg(s[0], s[1], s[2], s[3], x, z); return Math.hypot(x - q[0], z - q[1]) < d; })
          || h.floors.some(f => inPoly(f, x, z) || f.some((p, i) => { const q2 = f[(i + 1) % f.length], c = closestOnSeg(p[0], p[1], q2[0], q2[1], x, z); return Math.hypot(x - c[0], z - c[1]) < d; }));
        for (const o of group.children.filter(c => c.name === 'c9prop')) {
          const x = o.position.x, z = o.position.z, rad = o.userData.c9rad || 0.3, dx = x - h.tee[0], dz = z - h.tee[1];
          const along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
          const clash = kept.some(k => Math.hypot(k.position.x - x, k.position.z - z) < rad + (k.userData.c9rad || 0.3) + 0.2);
          if (clash || nearCourse(x, z, rad + 0.45) || (along < 0.5 && along > -4.5 && side < 2.2)) { group.remove(o); disposeGroup(o); } else kept.push(o);
        }
      }
      /* a press that slides through a side wall parks inside a chocolate housing */
      for (const m of h.movers) {
        if (m.look !== 'press') continue;
        const a = (m.ang || 0) * Math.PI / 180, dx = Math.sin(a) * m.len, dz = Math.cos(a) * m.len;
        for (const [px, pz] of [[m.ax, m.az], [m.bx, m.bz]]) for (const s of [-1, 1]) {
          const ex = px + s * dx, ez = pz + s * dz;
          if (onFloor(h, ex, ez)) continue;
          const box = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.34), mat('#5a3420', { roughness: 0.5 }));
          box.position.set(ex, groundH(h, ex - s * dx * 0.3, ez - s * dz * 0.3) + 0.13, ez); box.rotation.y = a; box.castShadow = true;
          const cap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.36), mat('#f29ac0', { roughness: 0.5 }));
          cap.position.y = 0.14; box.add(cap); group.add(box);
        }
      }
      /* the lollipop discs in the props turn slowly */
      group.traverse(o => { if (o.name === 'lollyDisc') group.userData.lolly = (group.userData.lolly || []).concat(o); });
    },
    tick(group, dt) {
      if (reducedMotion() || !group.userData.lolly) return;
      for (const d of group.userData.lolly) d.rotation.y += dt * 0.6;
    },
  };
}
