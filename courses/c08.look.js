/* world 8, space station: a starfield void, a ringed planet, floating rock chunks and beacons
   round the decks, green aliens (bumpers), tumbling asteroids, airlock doors with housings,
   a solar-panel satellite. Wrapped in a block so its helpers stay out of the other courses' way. */
{
  const PLANET_SVG = '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="16" fill="#b7a7e0"/><ellipse cx="32" cy="34" rx="28" ry="8" fill="none" stroke="#ffd66e" stroke-width="5" transform="rotate(-18 32 34)"/><circle cx="26" cy="27" r="3" fill="#8f7dc6"/></svg>';
  const ALIEN_COLORS = ['#74c465', '#6fc0df', '#f29ac0'];
  const alien = p => {
    const g = new THREE.Group(), col = ALIEN_COLORS[Math.abs(Math.round(p.x * 7 + p.z * 3)) % ALIEN_COLORS.length];
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(p.r, p.r * 0.5, 6, 16), mat(col, { roughness: 0.45 }));
    body.position.y = p.r * 1.25; body.castShadow = true;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(p.r * 0.42, 16, 12), mat('#fffdf7', { roughness: 0.3 }));
    eye.position.set(0, p.r * 1.7, -p.r * 0.72);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(p.r * 0.2, 10, 8), mat('#2a1f4a'));
    pupil.position.set(0, p.r * 1.7, -p.r * 1.08);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, p.r * 0.9, 6), mat('#4a3826'));
    ant.position.y = p.r * 2.85;
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mat('#ffd66e', { emissive: 0x806020 }));
    bob.position.y = p.r * 3.3; bob.name = 'bob';
    g.add(body, eye, pupil, ant, bob); g.name = 'alien'; return g;
  };
  const asteroid = m => {
    const g = new THREE.Group(), r = rng32(Math.round(m.ax * 100 + m.az * 10) + 3);
    const geo = new THREE.IcosahedronGeometry(m.r, 1), a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) { const k = 0.85 + r() * 0.3; a.setXYZ(i, a.getX(i) * k, a.getY(i) * k, a.getZ(i) * k); }
    geo.computeVertexNormals();
    const s = new THREE.Mesh(geo, mat('#9d93b8', { roughness: 1, flatShading: true })); s.castShadow = true;
    const crater = new THREE.Mesh(new THREE.SphereGeometry(m.r * 0.3, 8, 6), mat('#7a7096', { roughness: 1, flatShading: true }));
    crater.position.set(m.r * 0.55, m.r * 0.5, m.r * 0.2); g.add(s, crater); return g;
  };
  /* the airlock door: hazard-striped bar of half-length len along local z */
  const airlock = m => {
    const g = new THREE.Group(), n = Math.max(2, Math.round(m.len * 2 / 0.2));
    for (let i = 0; i < n; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2 - 0.006, 0.14, m.len * 2 / n), mat(i % 2 ? '#4f8fb8' : '#ffd66e', { roughness: 0.5 }));
      seg.position.set(0, 0.07, -m.len + (i + 0.5) * m.len * 2 / n); seg.castShadow = true; g.add(seg);
    }
    return g;
  };
  /* the satellite: a gold hub, solar-panel arms along local z (one per blade at i*PI/blades) */
  const satellite = m => {
    const g = new THREE.Group(), n = m.blades || 1;
    for (let i = 0; i < n; i++) {
      const arm = new THREE.Group(); arm.rotation.y = i * Math.PI / n;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2, 0.05, m.len * 2 - 0.2), mat('#3f5f86', { roughness: 0.35, metalness: 0.2 }));
      panel.position.y = 0.1; panel.castShadow = true;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, m.len * 2), mat('#d9dde3', { roughness: 0.4 })); rib.position.y = 0.1;
      arm.add(panel, rib); g.add(arm);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.26, 12), mat('#ffd66e', { roughness: 0.35, metalness: 0.3 }));
    hub.position.y = 0.13; hub.castShadow = true;
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#fffdf7', { roughness: 0.5, side: THREE.DoubleSide }));
    dish.position.y = 0.3; dish.rotation.x = Math.PI;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), mat('#ef7d6d', { emissive: 0x802020 })); tip.position.y = 0.36;
    g.add(hub, dish, tip); return g;
  };
  /* scenery round the decks: rock chunks and beacons floating below deck height */
  const prop = r => {
    const g = new THREE.Group(), y = -0.35 - r() * 0.9;
    if (r() < 0.75) {
      const s = 0.08 + r() * 0.2, m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat(r() < 0.5 ? '#8f86a8' : '#6a5f9e', { roughness: 1, flatShading: true }));
      m.position.y = y; m.rotation.set(r() * 3, r() * 3, 0); g.add(m);
    } else {
      const buoy = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), mat('#d9dde3', { roughness: 0.5 }));
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd66e }));
      buoy.position.y = y; light.position.y = y + 0.11; light.name = 'beacon'; g.add(buoy, light);
    }
    g.userData.bob = r() * 6.28; g.userData.size = g.children[0].geometry.parameters.radius || 0.1; g.name = 'drift'; return g;
  };
  WORLD_LOOK[8] = {
    /* white ball against this felt and the push zones stays above 3:1 */
    felt: '#5e5394', wall: '#ef7d6d', ground: null, fog: false, sky: ['#0b0820', '#2a1f4a'], flag: '#ffd66e', icon: PLANET_SVG,
    skirt: '#3b3366', push: '#4f8fb8', tube: '#6fc0df',
    jingle: [392, 587, 784, 587, 1175],
    prop,
    post: p => p.look === 'alien' ? alien(p) : defaultPost(p, lookOf(8)),
    mover: m => m.look === 'asteroid' ? asteroid(m) : m.look === 'airlock' ? airlock(m) : m.look === 'satellite' ? satellite(m) : defaultMover(m, lookOf(8)),
    decor(group, h) {
      const n = 900, pos = new Float32Array(n * 3), r = rng32(8), B = holeBounds(h);
      for (let i = 0; i < n; i++) {
        const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        pos[i * 3] = B.cx + Math.cos(a) * s * 45; pos[i * 3 + 1] = u * 45; pos[i * 3 + 2] = B.cz + Math.sin(a) * s * 45;
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfff4e0, size: 0.16, sizeAttenuation: true }));
      stars.name = 'stars'; group.add(stars);
      /* a ringed planet low over the far end of the hole */
      const planet = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(3.2, 32, 20), mat('#b7a7e0', { roughness: 0.9 }));
      const band = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.35, 6, 64), mat('#ffd66e', { roughness: 0.6 }));
      band.rotation.x = Math.PI / 2.3; planet.add(ball, band);
      planet.position.set(B.cx - 10, -2, B.z1 + 22); planet.name = 'planet'; group.add(planet);
      /* launch lights float off both ends of every ramp lip, so the jumps read from the tee */
      for (const rp of h.ramps) {
        const h0 = rp.h0 || 0, h1 = rp.h1 !== undefined ? rp.h1 : rp.h, up = h1 >= h0, top = Math.max(h0, h1);
        const ends = rp.axis === 'x' ? [[up ? rp.x1 : rp.x0, rp.z0 - 0.28], [up ? rp.x1 : rp.x0, rp.z1 + 0.28]] : [[rp.x0 - 0.28, up ? rp.z1 : rp.z0], [rp.x1 + 0.28, up ? rp.z1 : rp.z0]];
        for (const [x, z] of ends) {
          if (onFloor(h, x, z)) continue;
          const light = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), new THREE.MeshBasicMaterial({ color: 0xffd66e }));
          light.position.set(x, top + 0.12, z); light.name = 'lamp'; group.add(light);
        }
      }
      /* airlock housings: wherever a door slides into a wall or off the deck, a hull block swallows it,
         so no door ever pokes through a wall or hangs over space */
      for (const m of h.movers) {
        if (m.look !== 'airlock') continue;
        const a = (m.ang || 0) * Math.PI / 180, ux = Math.sin(a), uz = Math.cos(a);
        const ta = m.ax * ux + m.az * uz, tb = m.bx * ux + m.bz * uz, t0 = Math.min(ta, tb) - m.len, t1 = Math.max(ta, tb) + m.len;
        const ox = m.ax - ta * ux, oz = m.az - ta * uz, runs = [];
        let cur = null;
        for (let t = t0; t <= t1 + 1e-6; t += 0.01) {
          const x = ox + t * ux, z = oz + t * uz;
          const hidden = !onFloor(h, x, z) || h.segs.some(sg => { const c = closestOnSeg(sg[0], sg[1], sg[2], sg[3], x, z); return Math.hypot(x - c[0], z - c[1]) < WALL_HALF; });
          if (hidden) { if (!cur) runs.push(cur = [t, t]); else cur[1] = t; } else cur = null;
        }
        for (const [s0, s1] of runs) {
          if (s1 - s0 < 0.12) continue;
          const len = s1 - s0 + 0.02, mid = (s0 + s1) / 2, x = ox + mid * ux, z = oz + mid * uz;
          const y = Math.max(groundH(h, ox + s0 * ux, oz + s0 * uz), groundH(h, ox + s1 * ux, oz + s1 * uz));
          const hs = new THREE.Group(); hs.position.set(x, y, z); hs.rotation.y = a;
          const body = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.24, len), mat('#ef7d6d', { roughness: 0.55 })); body.position.y = 0.09; body.castShadow = true;
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.04, len + 0.004), mat('#ffd66e', { roughness: 0.5 })); stripe.position.y = 0.196;
          hs.add(body, stripe); group.add(hs);
        }
      }
      /* scenery hygiene: rocks and beacons never touch, and none floats in the camera's way behind the tee */
      const aim = (h.aim0 !== undefined ? h.aim0 : Math.atan2(h.cup[0] - h.tee[0], h.cup[1] - h.tee[1]) * 180 / Math.PI) * Math.PI / 180;
      const dx = Math.sin(aim), dz = Math.cos(aim), kept = [];
      for (const o of group.children.filter(c => c.name === 'drift')) {
        const px = o.position.x - h.tee[0], pz = o.position.z - h.tee[1], back = -(px * dx + pz * dz), side = Math.abs(px * dz - pz * dx);
        const clash = kept.some(k => Math.hypot(k.position.x - o.position.x, k.position.z - o.position.z) < k.userData.size + o.userData.size + 0.15);
        if (clash || (back > -1.5 && back < 5.5 && side < 1.9 + Math.max(0, back) * 0.4)) group.remove(o); else kept.push(o);
      }
    },
    tick(group, dt, t) {
      if (reducedMotion()) return;
      for (const o of group.children) {
        if (o.name === 'stars') o.rotation.y = t * 0.004;
        else if (o.name === 'planet') o.rotation.y = t * 0.05;
        else if (o.name === 'lamp') o.rotation.y = t * 2;
        else if (o.name === 'drift') {
          o.position.y = Math.sin(t * 0.8 + o.userData.bob) * 0.06;
          const b = o.getObjectByName('beacon'); if (b) b.visible = Math.sin(t * 3 + o.userData.bob) > -0.4;
        }
      }
    },
  };
}
