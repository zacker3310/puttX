/* world 8, space station: low gravity (0.427) so slopes and air float, grippy felt so rolls feel
   like Earth. Ramp jumps over the void between floating decks, crater bowls, alien bumpers,
   drifting asteroids, airlock gates, teleporter tubes and an orbiting satellite.
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
  registerWorld(8, { g: 0.427, feltMu: 0.19, holes: [
    /* 1. launch pad: one ramp jump over the void, then round the bulkhead to the cup */
    { par: 3, sol: [[328,0.96,0]], tee: [0, 0.5], cup: [2.85, 5.5],
      floors: [rect(-0.7, 0, 0.7, 3), [[-1.2, 4], [1.2, 4], [1.2, 5], [3.4, 5], [3.4, 6], [-1.2, 6]]],
      walls: [...box(-0.7, 0, 0.7, 3, 'n'), [[3.4, 5], [1.2, 5], [1.2, 4], [-1.2, 4], [-1.2, 6], [3.4, 6]]],
      ramps: [{ x0: -0.7, z0: 2.2, x1: 0.7, z1: 3, axis: 'z', h0: 0, h1: 0.22 }] },
    /* 2. crater deck: bowls swallow a lazy putt, and the open edges drop into space */
    { par: 3, sol: [[316,0.88,0]], tee: [0, 0.5], cup: [3.05, 4.3], floors: [[[-1, 0], [1, 0], [1, 3.6], [3.7, 3.6], [3.7, 5], [-1, 5]]],
      walls: [[[1, 3.6], [1, 0], [-1, 0], [-1, 5], [3.7, 5]]],
      bumps: [{ x: 0.05, z: 2.3, r: 0.55, h: -0.24 }, { x: 0.15, z: 4.2, r: 0.5, h: -0.25 }, { x: 2.05, z: 4.3, r: 0.42, h: -0.24 }],
      posts: [ALIEN(-0.55, 3.4)] },
    /* 3. stepping down: drop deck to deck; turn on the middle deck or fall off its open edge */
    { par: 2, sol: [[12,0.92,0]], tee: [0, 0.5], cup: [2.75, 2.7],
      floors: [rect(-0.6, 0, 0.6, 2.4), rect(-1.2, 2.4, 1.4, 4.6), rect(1.4, 2, 3.4, 6.6)],
      walls: [[[-0.6, 2.4], [-0.6, 0], [0.6, 0], [0.6, 2.4]], [[-1.2, 2.4], [-1.2, 4.6], [1.4, 4.6], [1.4, 6.6]], [[3.4, 2], [1.4, 2], [1.4, 2.4]]],
      tiers: [{ poly: rect(-0.72, -0.12, 0.72, 2.4), h: 0.5 }, { poly: rect(-1.32, 2.4, 1.4, 4.72), h: 0.25 }],
      bumps: [{ x: -0.35, z: 3.6, r: 0.42, h: -0.16 }, { x: 2.3, z: 5.2, r: 0.5, h: -0.2 }] },
    /* 4. asteroid bridge: a rail-less span with rocks drifting across it */
    { par: 3, sol: [[4,0.6,0.5]], tee: [0, 0.5], cup: [0.5, 6.2],
      floors: [rect(-0.9, 0, 0.9, 1.6), rect(-0.5, 1.6, 0.5, 5), rect(-1, 5, 1, 6.9)],
      walls: [[[-0.5, 1.6], [-0.9, 1.6], [-0.9, 0], [0.9, 0], [0.9, 1.6], [0.5, 1.6]], [[-0.5, 5], [-1, 5], [-1, 6.9], [1, 6.9], [1, 5], [0.5, 5]]],
      posts: [ALIEN(0.05, 5.85)],
      movers: [ROCK(-0.85, 2.7, 0.85, 2.7, 2.8, 0, 0.16), ROCK(0.85, 3.9, -0.85, 3.9, 3.4, 0, 0.16)] },
    /* 5. teleporter: jump the gap the long way, or drop into the tube */
    { par: 2, sol: [[330,0.98,0]], tee: [0.3, 0.5], cup: [0.95, 6.05], aim0: -15,
      floors: [rect(-1, 0, 1, 2.6), rect(-1.4, 3.6, 1.4, 6.8)],
      walls: [[[-1, 2.6], [-1, 0], [1, 0], [1, 2.6], [0, 2.6], [0, 1.8]], [[-1.4, 3.6], [-1.4, 6.8], [1.4, 6.8], [1.4, 3.6], [-1.4, 3.6]]],
      inner: [[[0.25, 5.2], [1.4, 5.2]]],
      ramps: [{ x0: -1, z0: 1.8, x1: 0, z1: 2.6, axis: 'z', h0: 0, h1: 0.24 }],
      tubes: [{ a: [0.6, 2.1], b: [-0.95, 4.1], dir: 0 }] },
    /* 6. airlocks: time the doors, jump to the crater deck */
    { par: 4, sol: [[332,1,0.5]], tee: [0, 0.5], cup: [-0.9, 7.6],
      floors: [rect(-0.6, 0, 0.6, 4.6), rect(-1.6, 5.6, 1, 8.4)],
      walls: [...box(-0.6, 0, 0.6, 4.6, 'n'), ...box(-1.6, 5.6, 1, 8.4, 'w')],
      ramps: [{ x0: -0.6, z0: 3.8, x1: 0.6, z1: 4.6, axis: 'z', h0: 0, h1: 0.22 }],
      bumps: [{ x: -0.1, z: 7.0, r: 0.5, h: -0.22 }],
      movers: [LOCK(0, 1.7, 1.25, 1.7, 0.62, 90, 2.6), LOCK(0, 3.0, -1.25, 3.0, 0.62, 90, 3.2, 1.5)] },
    /* 7. satellite: a slow windmill orbit guards the aliens' pocket */
    { par: 3, sol: [[18,0.64,0]], tee: [0, 0.5], cup: [0.75, 5.15],
      shape: [[-0.8, 0], [0.8, 0], [1.6, 1.5], [1.6, 4.6], [0.8, 6], [-0.8, 6], [-1.6, 4.6], [-1.6, 1.5]],
      bumps: [{ x: -0.7, z: 4.7, r: 0.45, h: -0.2 }],
      posts: [ALIEN(0.3, 4.55), ALIEN(1.05, 4.35), ALIEN(0.25, 5.5)],
      movers: [SAT(0, 2.8, 0.72, 1.3, 0, 2)] },
    /* 8. stairway to orbit: two ramp jumps, each deck higher than the last */
    { par: 4, sol: [[346,0.64,0],[78,0.96,0]], tee: [0, 0.5], cup: [2.9, 5.9],
      floors: [rect(-0.6, 0, 0.6, 3), rect(-1, 3.6, 1, 6), rect(1.45, 3.8, 3.6, 6.6)],
      walls: [...box(-0.6, 0, 0.6, 3, 'n'), [[1, 3.6], [0.25, 3.6], [-1, 3.6], [-1, 6], [0.25, 6], [1, 6]], ...box(1.45, 3.8, 3.6, 6.6, 'n')],
      tiers: [DECK(-1, 3.6, 1, 6, 0.2), DECK(1.45, 3.8, 3.6, 6.6, 0.32)],
      ramps: [{ x0: -0.6, z0: 2.2, x1: 0.6, z1: 3, axis: 'z', h0: 0, h1: 0.4 }, { x0: 0.3, z0: 3.6, x1: 1, z1: 6, axis: 'x', h0: 0.2, h1: 0.42 }],
      bumps: [{ x: 2.4, z: 5.2, r: 0.4, h: -0.16 }],
      posts: [ALIEN(2.45, 6.25), ALIEN(3.3, 5.45)] },
    /* 9. tilted greenhouse: the whole deck leans, aliens kick */
    { par: 2, sol: [[8,0.81,0]], tee: [0, 0.5], cup: [3, 5.05],
      shape: [[-0.8, 0], [0.8, 0], [0.8, 4], [3.6, 4], [3.6, 6], [-0.8, 6]],
      tiers: [{ poly: rect(-1, -1, 4, 7), h: 0, sx: -0.06, sz: 0 }],
      bumps: [{ x: 0, z: 5, r: 0.5, h: -0.2 }],
      posts: [ALIEN(1.6, 5.3), ALIEN(2.25, 4.55), ALIEN(1.5, 4.4)] },
    /* 10. tube relay: tee deck, tube, asteroid deck, jump, cup deck */
    { par: 3, sol: [[350,0.88,0],[68,0.64,0]], tee: [0, 0.5], cup: [1.6, 6.4],
      floors: [rect(-0.8, 0, 0.8, 2.4), rect(2, 0, 3.6, 4), rect(1, 4.8, 3.8, 7)],
      walls: [...box(-0.8, 0, 0.8, 2.4), ...box(2, 0, 3.6, 4, 'n'), ...box(1, 4.8, 3.8, 7, 'w')],
      ramps: [{ x0: 2, z0: 3.2, x1: 3.6, z1: 4, axis: 'z', h0: 0, h1: 0.2 }],
      bumps: [{ x: 2.5, z: 6, r: 0.42, h: -0.2 }],
      posts: [ALIEN(-0.1, 1.75), ALIEN(-0.45, 1.3, 1.1), ALIEN(1.95, 6.8)],
      tubes: [{ a: [-0.45, 2.0], b: [2.8, 0.5], dir: 0 }],
      movers: [ROCK(2.4, 2.2, 3.2, 2.2, 2.2, 0, 0.16)] },
    /* 11. the abyss: jump the void through a narrow launch, or ride the long way round */
    { par: 3, crazy: true, sol: [[40,0.96,0],[32,1,0]], tee: [0, 0.5], cup: [-0.55, 6],
      floors: [[[-0.7, 0], [2.6, 0], [2.6, 6.6], [-1.2, 6.6], [-1.2, 4.4], [1.6, 4.4], [1.6, 1.2], [0.7, 1.2], [0.7, 3], [-0.7, 3]]],
      walls: [[[-0.7, 3], [-0.7, 0], [2.6, 0], [2.6, 6.6], [1, 6.6]], [[-1.2, 6.6], [-1.2, 4.4]], [[0.7, 3], [0.7, 1.2], [1.6, 1.2], [1.6, 4.4], [-1.2, 4.4]]],
      inner: [[[-0.7, 2.3], [-0.3, 2.3], [-0.3, 3]], [[0.7, 2.3], [0.3, 2.3], [0.3, 3]]],
      ramps: [{ x0: -0.7, z0: 2.3, x1: 0.7, z1: 3, axis: 'z', h0: 0, h1: 0.24 }],
      bumps: [{ x: 2.1, z: 3, r: 0.5, h: -0.18 }] },
    /* 12. moon dome: the cup sits on top of a hill ringed by aliens; short rolls back, long runs off */
    { par: 2, sol: [[40,0.68,0]], tee: [0, 0.5], cup: [0, 4.6], shape: rect(-1.6, 0, 1.6, 6.6),
      bumps: [{ x: 0, z: 4.6, r: 0.95, h: 0.3 }],
      posts: [ALIEN(0, 3.55), ALIEN(-0.85, 3.95), ALIEN(0.85, 3.95), ALIEN(-1.05, 4.95), ALIEN(1.05, 4.95), ALIEN(-0.5, 5.75), ALIEN(0.5, 5.75)] },
    /* 13. double jump: launch, slip the airlock, then turn and launch off the side ramp */
    { par: 4, crazy: true, sol: [[328,0.84,0],[88,0.92,0]], tee: [0, 0.5], cup: [-2.8, 7.3],
      floors: [rect(-0.6, 0, 0.6, 3), rect(-1, 3.8, 1, 7.2), rect(-3.6, 5.4, -1.6, 8.2)],
      walls: [...box(-0.6, 0, 0.6, 3, 'n'), [[-1, 5.9], [-1, 3.8], [1, 3.8], [1, 7.2], [-1, 7.2]], [[-1.6, 8.2], [-1.6, 5.4], [-3.6, 5.4], [-3.6, 8.2]]],
      ramps: [{ x0: -0.6, z0: 2.2, x1: 0.6, z1: 3, axis: 'z', h0: 0, h1: 0.22 }, { x0: -1, z0: 5.9, x1: -0.3, z1: 7.2, axis: 'x', h0: 0.22, h1: 0 }],
      bumps: [{ x: -2.2, z: 6.4, r: 0.4, h: -0.18 }],
      movers: [LOCK(0, 5.1, 2.05, 5.1, 1, 90, 3.4)] },
    /* 14. satellite ring: a long arm sweeps the track round the open core */
    { par: 4, sol: [[0,0.28,0]], tee: [-2, 0.45], cup: [2, 4.75], aim0: 90,
      floors: [rect(-2.5, 0, 2.5, 0.9), rect(-2.5, 4.3, 2.5, 5.2), rect(-2.5, 0.9, -1.6, 4.3), rect(1.6, 0.9, 2.5, 4.3)],
      walls: [ring([[-2.5, 0], [2.5, 0], [2.5, 5.2], [-2.5, 5.2]])],
      posts: [ALIEN(2.05, 0.45), ALIEN(-2.05, 4.75)],
      movers: [SAT(0, 2.6, 2.28, 0.8, 0, 2)] },
    /* 15. the descent: high deck, crater deck, then tube or drop to the rock garden */
    { par: 4, crazy: true, sol: [[4,0.88,0]], tee: [0, 0.5], cup: [0.5, 8],
      floors: [rect(-0.6, 0, 0.6, 2.4), rect(-1.6, 2.8, 1.6, 5.6), rect(-0.2, 6.4, 3, 8.6)],
      walls: [...box(-0.6, 0, 0.6, 2.4, 'n'), [[0.2, 5.6], [-1.6, 5.6], [-1.6, 2.8], [1.6, 2.8], [1.6, 5.6]], ...box(-0.2, 6.4, 3, 8.6)],
      tiers: [DECK(-0.6, 0, 0.6, 2.4, 0.7), DECK(-1.6, 2.8, 1.6, 5.6, 0.3)],
      bumps: [{ x: -0.6, z: 4.3, r: 0.5, h: -0.2 }, { x: 0.7, z: 3.9, r: 0.45, h: -0.2 }],
      tubes: [{ a: [-1.15, 5.15], b: [2.6, 6.85], dir: 0, keep: 0.5, add: 0.2 }],
      movers: [ROCK(0.25, 7.1, 2.05, 7.1, 2.6)] },
    /* 16. solar wind: a rail-less slab, a crosswind toward the void, rocks drifting through it */
    { par: 2, sol: [[336,0.68,0]], tee: [0, 0.5], cup: [0.35, 7.1],
      floors: [rect(-1.2, 0, 1.2, 7.9)],
      walls: [],
      bumps: [{ x: -0.35, z: 6.1, r: 0.4, h: -0.2 }],
      posts: [ALIEN(0.08, 6.55), ALIEN(0.7, 6.6)],
      zones: [{ push: [1.1, 0], poly: rect(-1.2, 1.5, 1.2, 5.6) }],
      movers: [ROCK(-0.9, 2.6, 0.9, 2.6, 2.8, 0, 0.2), ROCK(0.9, 4.4, -0.9, 4.4, 2.2, 0, 0.2)] },
    /* 17. airlock maze: two doors to time, or thread the rock to the tube */
    { par: 3, sol: [[296,0.88,0],[0,0.24,0]], tee: [0, 0.5], cup: [1.1, 6.3], shape: rect(-1.8, 0, 1.8, 7),
      inner: [[[-1.8, 2.2], [0.9, 2.2]], [[-0.9, 4.4], [1.8, 4.4]]],
      posts: [ALIEN(0.2, 5.6), ALIEN(-0.5, 3.3)],
      tubes: [{ a: [-1.35, 1.6], b: [-1.3, 6.5], dir: 90, keep: 0.6, add: 0.2 }],
      movers: [LOCK(1.35, 2.2, 0.45, 2.2, 0.45, 90, 2.8), LOCK(-1.35, 4.4, -0.45, 4.4, 0.45, 90, 3.3, 2), ROCK(-1.35, 0.55, -1.35, 1.05, 2, 0, 0.15)] },
    /* 18. the grand tour: three jumps, each one turning, between floating decks to the crater cup */
    { par: 5, crazy: true, sol: [[32,1,0],[152.75,0.73,0]], tee: [0, 0.5], cup: [-3, 8.8],
      floors: [rect(-0.6, 0, 0.6, 2.8), rect(-1, 3.6, 1, 6), rect(-3.8, 4.2, -1.6, 6.6), rect(-4.4, 7.4, -1.8, 9.8)],
      walls: [...box(-0.6, 0, 0.6, 2.8, 'n'), [[-1, 4.6], [-1, 3.6], [1, 3.6], [1, 6], [-0.15, 6], [-1, 6]],
        [[-2.6, 6.6], [-2.45, 6.6], [-1.6, 6.6], [-1.6, 4.2], [-3.8, 4.2], [-3.8, 5.65], [-3.8, 6.6]], ring(rect(-4.4, 7.4, -1.8, 9.8))],
      tiers: [DECK(-1, 3.6, 1, 6, 0.1), DECK(-3.8, 4.2, -1.6, 6.6, 0.25), DECK(-4.4, 7.4, -1.8, 9.8, 0.1)],
      ramps: [{ x0: -0.6, z0: 2, x1: 0.6, z1: 2.8, axis: 'z', h0: 0, h1: 0.3 }, { x0: -1, z0: 4.6, x1: -0.3, z1: 6, axis: 'x', h0: 0.42, h1: 0.1 },
        { x0: -3.8, z0: 5.8, x1: -2.6, z1: 6.6, axis: 'z', h0: 0.25, h1: 0.55 }],
      bumps: [{ x: -3, z: 8.8, r: 0.75, h: -0.15 }],
      posts: [ALIEN(0.5, 4.5), ALIEN(-2.2, 5.1)] },
] });
}
