/* world 8, course 18: the hydroponics ring. Same low gravity and grippy felt as course 8, but
   every hole has more going on: decks stepping down, tube shortcuts beside ramp jumps, asteroid
   bridges into tubes, switchback climbs and airlocks guarding the gaps.
   Wrapped in a block so its helpers stay out of the other courses' way. */
{
  const ALIEN = (x, z, e = 1.25) => ({ x, z, r: 0.14, e, top: 0.3, look: 'alien' });
  const ROCK = (ax, az, bx, bz, period, phase = 0, r = 0.18) => ({ kind: 'slide', ax, az, bx, bz, r, period, phase, look: 'asteroid' });
  const LOCK = (ax, az, bx, bz, len, ang, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'airlock' });
  const SAT = (x, z, len, w, phase = 0, blades = 1) => ({ kind: 'spin', x, z, len, w, phase, blades, look: 'satellite' });
  /* a raised deck: the tier reaches past the floor so walls on its edge stand on one height */
  const DECK = (x0, z0, x1, z1, h, pad = 0.12) => ({ poly: rect(x0 - pad, z0 - pad, x1 + pad, z1 + pad), h });
  /* walls round a rectangle, leaving the named sides open: s (z0), e (x1), n (z1), w (x0) */
  const box = (x0, z0, x1, z1, open = '') => {
    const c = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], k = 'senw', out = [];
    const i0 = [0, 1, 2, 3].find(i => open.includes(k[(i + 3) % 4]));
    if (i0 === undefined) return [ring(c)];
    let cur = null;
    for (let j = 0; j < 4; j++) {
      const i = (i0 + j) % 4;
      if (open.includes(k[i])) { cur = null; continue; }
      if (!cur) { cur = [c[i]]; out.push(cur); }
      cur.push(c[(i + 1) % 4]);
    }
    return out;
  };
  registerWorld(18, { g: 0.427, feltMu: 0.19, holes: [
    /* 1. docking ramp: jump the gap, then round the bulkhead past the alien */
    { par: 3, sol: [[44,0.96,0]], tee: [0, 0.5], cup: [2.75, 5.15],
      floors: [rect(-0.6, 0, 0.6, 2.8), [[-1.2, 3.6], [1.2, 3.6], [1.2, 4.4], [3.4, 4.4], [3.4, 5.8], [-1.2, 5.8]]],
      walls: [...box(-0.6, 0, 0.6, 2.8, 'n'), [[1.2, 3.6], [1.2, 4.4], [3.4, 4.4], [3.4, 5.8], [-1.2, 5.8], [-1.2, 3.6]]],
      ramps: [{ x0: -0.6, z0: 2, x1: 0.6, z1: 2.8, axis: 'z', h0: 0, h1: 0.22 }],
      bumps: [{ x: -0.3, z: 4.8, r: 0.5, h: -0.18 }],
      posts: [ALIEN(1.95, 4.85)] },
    /* 2. crater steps: three drops, deck to deck, each one turning */
    { par: 3, sol: [], tee: [0, 0.5], cup: [1.5, 6.6],
      floors: [rect(-0.6, 0, 0.6, 2.2), rect(-1.4, 2.2, 1.2, 4.4), rect(1.2, 1.6, 3.4, 5), rect(0.4, 5, 3.4, 7.4)],
      walls: [[[-0.6, 2.2], [-0.6, 0], [0.6, 0], [0.6, 2.2]], [[-0.8, 2.2], [-1.4, 2.2], [-1.4, 4.4], [1.1, 4.4]],
        [[1.2, 2.1], [1.2, 1.6], [3.4, 1.6], [3.4, 7.4], [0.4, 7.4], [0.4, 5], [1.3, 5]]],
      tiers: [{ poly: rect(1.2, 1.48, 3.52, 5), h: 0.2 }, { poly: rect(-0.72, -0.12, 0.72, 2.2), h: 0.6 },
        { poly: [[-1.52, 2.08], [-0.72, 2.08], [-0.72, 2.2], [1.2, 2.2], [1.2, 4.52], [-1.52, 4.52]], h: 0.4 }],
      bumps: [{ x: -0.5, z: 3.4, r: 0.45, h: -0.14 }, { x: 2.5, z: 4.2, r: 0.45, h: -0.14 }, { x: 2.4, z: 6.3, r: 0.45, h: -0.16 }],
      posts: [ALIEN(1.15, 5.85)] },
    /* 3. teleporter fork: jump the gap and drop off the side deck, or thread the tube to the green */
    { par: 3, sol: [[322,1,0]], tee: [0.3, 0.5], cup: [2.1, 6.2], aim0: -15,
      floors: [rect(-1, 0, 1, 2.6), rect(-1.6, 3.4, 0.6, 5.6), rect(0.6, 3.8, 3, 7)],
      walls: [[[-1, 2.6], [-1, 0], [1, 0], [1, 2.6], [0, 2.6], [0, 1.8]], [[0.6, 3.8], [0.6, 3.4], [-1.6, 3.4], [-1.6, 5.6], [0.6, 5.6]],
        [[0.6, 5.6], [0.6, 7], [3, 7], [3, 3.8], [0.6, 3.8]]],
      tiers: [DECK(-1.6, 3.4, 0.6, 5.6, 0.12, 0)],
      ramps: [{ x0: -1, z0: 1.8, x1: 0, z1: 2.6, axis: 'z', h0: 0, h1: 0.24 }],
      bumps: [{ x: 1.5, z: 5.2, r: 0.45, h: -0.16 }],
      posts: [ALIEN(1.4, 6.3), ALIEN(2.55, 5.5)],
      tubes: [{ a: [0.55, 2.15], b: [2.55, 4.2], dir: 270 }] },
] });
}
