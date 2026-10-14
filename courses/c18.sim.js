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
    { par: 3, sol: [[48,1,0]], tee: [0, 0.5], cup: [2.75, 5.15],
      floors: [rect(-0.6, 0, 0.6, 2.8), [[-1.2, 3.6], [1.2, 3.6], [1.2, 4.4], [3.4, 4.4], [3.4, 5.8], [-1.2, 5.8]]],
      walls: [...box(-0.6, 0, 0.6, 2.8, 'n'), [[1.2, 3.6], [1.2, 4.4], [3.4, 4.4], [3.4, 5.8], [-1.2, 5.8], [-1.2, 3.6]]],
      ramps: [{ x0: -0.6, z0: 2, x1: 0.6, z1: 2.8, axis: 'z', h0: 0, h1: 0.22 }],
      bumps: [{ x: -0.3, z: 4.8, r: 0.5, h: -0.18 }],
      posts: [ALIEN(1.95, 4.85)] },
    /* 2. crater steps: three drops, deck to deck, each one turning */
    { par: 3, sol: [[210,1,0],[56,0.84,0]], tee: [0, 0.5], cup: [1.5, 6.6],
      floors: [rect(-0.6, 0, 0.6, 2.2), rect(-1.4, 2.2, 1.2, 4.4), rect(1.2, 1.6, 3.4, 5), rect(0.4, 5, 3.4, 7.4)],
      walls: [[[-0.6, 2.2], [-0.6, 0], [0.6, 0], [0.6, 2.2]], [[-0.8, 2.2], [-1.4, 2.2], [-1.4, 4.4], [1.1, 4.4]],
        [[1.2, 2.1], [1.2, 1.6], [3.4, 1.6], [3.4, 7.4], [0.4, 7.4], [0.4, 5], [1.3, 5]]],
      tiers: [{ poly: rect(1.2, 1.48, 3.52, 5), h: 0.2 }, { poly: rect(-0.72, -0.12, 0.72, 2.2), h: 0.6 },
        { poly: [[-1.52, 2.08], [-0.72, 2.08], [-0.72, 2.2], [1.2, 2.2], [1.2, 4.52], [-1.52, 4.52]], h: 0.4 }],
      bumps: [{ x: -0.5, z: 3.4, r: 0.45, h: -0.14 }, { x: 2.5, z: 4.2, r: 0.45, h: -0.14 }, { x: 2.4, z: 6.3, r: 0.45, h: -0.16 }],
      posts: [ALIEN(1.15, 5.85)] },
    /* 3. teleporter fork: jump the gap and drop off the side deck, or thread the tube to the green */
    { par: 3, sol: [[328,0.92,0]], tee: [0.3, 0.5], cup: [2.1, 6.2], aim0: -15,
      floors: [rect(-1, 0, 1, 2.6), rect(-1.6, 3.4, 0.6, 5.6), rect(0.6, 3.8, 3, 7)],
      walls: [[[-1, 2.6], [-1, 0], [1, 0], [1, 2.6], [0, 2.6], [0, 1.8]], [[0.6, 3.8], [0.6, 3.4], [-1.6, 3.4], [-1.6, 5.6], [0.6, 5.6]],
        [[0.6, 5.6], [0.6, 7], [3, 7], [3, 3.8], [0.6, 3.8]]],
      tiers: [DECK(-1.6, 3.4, 0.6, 5.6, 0.12, 0)],
      ramps: [{ x0: -1, z0: 1.8, x1: 0, z1: 2.6, axis: 'z', h0: 0, h1: 0.24 }],
      bumps: [{ x: 1.5, z: 5.2, r: 0.45, h: -0.16 }],
      posts: [ALIEN(1.4, 6.3), ALIEN(2.55, 5.5)],
      tubes: [{ a: [0.55, 2.15], b: [2.55, 4.2], dir: 270 }] },
    /* 4. asteroid bridge: cross the drifting rocks, then the tube is the only way into the crater pocket */
    { par: 3, sol: [[5,1,0],[285,0.93,0]], tee: [0, 0.5], cup: [2.15, 5.55],
      floors: [rect(-0.9, 0, 0.9, 1.6), rect(-0.5, 1.6, 0.5, 4.6), rect(-1.2, 4.6, 1.2, 6.4), rect(1.7, 3, 3.5, 6.6)],
      walls: [[[-0.5, 1.6], [-0.9, 1.6], [-0.9, 0], [0.9, 0], [0.9, 1.6], [0.5, 1.6]], [[-0.5, 4.6], [-1.2, 4.6], [-1.2, 6.4], [1.2, 6.4], [1.2, 4.6], [0.5, 4.6]],
        ring(rect(1.7, 3, 3.5, 6.6))],
      bumps: [{ x: 0.2, z: 5.5, r: 0.45, h: -0.12 }, { x: 2.15, z: 4.4, r: 0.45, h: -0.16 }],
      posts: [ALIEN(2.85, 5.0), ALIEN(-0.45, 5.35, 1.1)],
      tubes: [{ a: [-0.75, 5.95], b: [3.0, 3.45], dir: 0, keep: 0.5 }],
      movers: [ROCK(-0.85, 2.7, 0.85, 2.7, 2.8, 0, 0.16), ROCK(0.85, 3.7, -0.85, 3.7, 3.4, 0, 0.16)] },
    /* 5. the long garden: a long green bending left past a broad ridge, falling away to a hollow by the cup */
    { par: 2, sol: [], tee: [0, 0.5], cup: [-4, 10], aim0: -10,
      shape: [[-1.4, 0], [1.4, 0], [1.8, 4], [1.2, 8], [-0.6, 10.8], [-3, 11.6], [-5, 10.8], [-5.2, 9], [-3.4, 8.2], [-1.6, 6.4], [-1.8, 3]],
      tiers: [{ poly: rect(-6, -1, 2.5, 12.5), h: 0, sx: 0.02, sz: -0.015 }],
      bumps: [{ x: -0.2, z: 6.5, r: 1.5, h: 0.14 }, { x: -2.6, z: 9.6, r: 1, h: -0.1 }, { x: 0.4, z: 2.8, r: 1.2, h: 0.08 }] },
    /* 6. airlock double jump: launch, slip the door, launch off the side ramp, or tube across */
    { par: 4, sol: [[10,1,0],[5,0.36,0]], tee: [0, 0.5], cup: [-2.8, 7.4],
      floors: [rect(-0.6, 0, 0.6, 3), rect(-1, 3.8, 1, 7.2), rect(-3.6, 5.4, -1.6, 8.4)],
      walls: [...box(-0.6, 0, 0.6, 3, 'n'), [[-1, 5.9], [-1, 3.8], [1, 3.8], [1, 7.2], [-1, 7.2]], [[-1.6, 8.4], [-1.6, 5.4], [-3.6, 5.4], [-3.6, 8.4], [-1.6, 8.4]]],
      ramps: [{ x0: -0.6, z0: 2.2, x1: 0.6, z1: 3, axis: 'z', h0: 0, h1: 0.22 }, { x0: -1, z0: 5.9, x1: -0.3, z1: 7.2, axis: 'x', h0: 0.22, h1: 0 }],
      bumps: [{ x: -2.4, z: 6.5, r: 0.4, h: -0.18 }],
      posts: [ALIEN(-2.2, 7.7)],
      tubes: [{ a: [0.65, 4.2], b: [-3.15, 5.85], dir: 20, keep: 0.5, add: 0.2 }],
      movers: [LOCK(0, 5.1, 2.05, 5.1, 1, 90, 3.4)] },
    /* 7. the black hole run: up the chute and off the ramp, land in the gravity well, teleport onto
       the booster rail, then the black hole spins it round and round down into the cup */
    { par: 3, auto: true, crazy: true, sol: [[0,0.8,0]], tee: [0, 0.5], cup: [3.4, 6.4],
      floors: [rect(-0.35, 0, 0.35, 3), rect(-1.1, 3.8, 1.1, 6.8),
        [[2, 0.4], [2.8, 0.4], [2.8, 5], [4, 5], [4.8, 5.8], [4.8, 7], [4, 7.8], [2.8, 7.8], [2, 7]]],
      walls: [...box(-0.35, 0, 0.35, 3, 'n'), ...box(-1.1, 3.8, 1.1, 6.8, 's'),
        ring([[2, 0.4], [2.8, 0.4], [2.8, 5], [4, 5], [4.8, 5.8], [4.8, 7], [4, 7.8], [2.8, 7.8], [2, 7]])],
      ramps: [{ x0: -0.35, z0: 2.3, x1: 0.35, z1: 3, axis: 'z', h0: 0, h1: 0.25 }],
      drains: [{ x: 0, z: 5.5, r: 1, depth: 0.18, flat: 0.125 }, { x: 3.4, z: 6.4, r: 1.7, depth: 0.3 }],
      zones: [{ surf: 'fast', poly: [[2, 5], [4, 5], [4.8, 5.8], [4.8, 7], [4, 7.8], [2.8, 7.8], [2, 7]] }],
      tubes: [{ a: [0, 5.5], b: [2.4, 0.8], dir: 0, keep: 0, add: 2.3 }] },
    /* 8. satellite crater: slip the spinning satellite through the bulkhead, or tube round it */
    { par: 3, sol: [[306,0.64,0]], tee: [0, 0.5], cup: [1, 5.6],
      shape: [[-1, 0], [1, 0], [2, 1.6], [2, 5.4], [1, 7], [-1, 7], [-2, 5.4], [-2, 1.6]],
      inner: [[[-2, 3.6], [-0.4, 3.6]], [[0.4, 3.6], [2, 3.6]]],
      bumps: [{ x: -0.6, z: 5.3, r: 0.45, h: -0.2 }, { x: 1.2, z: 4.5, r: 0.4, h: -0.15 }],
      posts: [ALIEN(0.45, 5.15), ALIEN(1.15, 6.15), ALIEN(-1.2, 1.2)],
      tubes: [{ a: [-1.5, 2.6], b: [-0.95, 6.2], dir: 90 }],
      movers: [SAT(0, 2.2, 0.7, 1.3, 0, 2)] },
    /* 9. switchback climb: up the ramp, hairpin, up again, then drop to the crater green */
    { par: 4, sol: [[335,1,0],[130,0.9285714285714286,0]], tee: [0, 0.4], cup: [3.3, 3.5],
      floors: [rect(-0.5, 0, 0.5, 3), rect(-0.5, 3, 1.9, 4), rect(0.9, 0, 1.9, 3), rect(1.9, 0, 3.9, 1.4), rect(2.3, 1.4, 4.3, 4.6)],
      walls: [[[0.5, 3], [0.5, 0], [-0.5, 0], [-0.5, 4], [1.9, 4], [1.9, 1.4]], [[0.9, 3], [0.9, 0], [3.9, 0], [3.9, 1.4]],
        [[2.3, 1.4], [2.3, 4.6], [4.3, 4.6], [4.3, 1.4], [3.9, 1.4]]],
      tiers: [{ poly: rect(0.78, -0.12, 4.02, 1.52), h: 0.4 }, { poly: rect(-0.62, 2.6, 2.02, 4.12), h: 0.2 }],
      ramps: [{ x0: -0.5, z0: 1, x1: 0.5, z1: 2.6, axis: 'z', h0: 0, h1: 0.2 }, { x0: 0.9, z0: 0.8, x1: 1.9, z1: 2.6, axis: 'z', h0: 0.4, h1: 0.2 }],
      bumps: [{ x: 3.3, z: 3.5, r: 0.8, h: -0.15 }],
      posts: [ALIEN(1.4, 3.5), ALIEN(2.9, 2.3)] },
    /* 10. tube relay: tee deck, tube, asteroid deck, jump, then past the satellite on the cup deck */
    { par: 3, sol: [[345,1,0],[75,0.57,0]], tee: [0, 0.5], cup: [1.6, 6.4],
      floors: [rect(-0.8, 0, 0.8, 2.4), rect(2, 0, 3.6, 4), rect(1, 4.8, 3.8, 7)],
      walls: [...box(-0.8, 0, 0.8, 2.4), ...box(2, 0, 3.6, 4, 'n'), ...box(1, 4.8, 3.8, 7, 's')],
      ramps: [{ x0: 2, z0: 3.2, x1: 3.6, z1: 4, axis: 'z', h0: 0, h1: 0.2 }],
      bumps: [{ x: 1.9, z: 5.6, r: 0.4, h: -0.18 }],
      posts: [ALIEN(-0.1, 1.75), ALIEN(-0.45, 1.3, 1.1), ALIEN(1.3, 6.75)],
      tubes: [{ a: [-0.45, 2.0], b: [2.8, 0.5], dir: 0 }],
      movers: [ROCK(2.4, 2.2, 3.2, 2.2, 2.2, 0, 0.16), SAT(3.05, 6.05, 0.5, 1.1)] },
    /* 11. tilted greenhouse: the whole module leans, the planter sand waits by the bend, aliens kick */
    { par: 3, sol: [[9,0.8333333333333334,0],[3,0.83,0]], tee: [0, 0.5], cup: [3, 5.05],
      shape: [[-0.8, 0], [0.8, 0], [0.8, 4], [3.6, 4], [3.6, 6], [-0.8, 6]],
      inner: [[[1.6, 6], [1.6, 5.2]]],
      tiers: [{ poly: rect(-1, -1, 4, 7), h: 0, sx: -0.06, sz: 0 }],
      bumps: [{ x: 0, z: 5, r: 0.5, h: -0.2 }],
      zones: [{ surf: 'sand', poly: rect(0.8, 4, 1.5, 4.7) }],
      posts: [ALIEN(2.25, 4.55), ALIEN(-0.3, 2.6), ALIEN(2.4, 5.6)] },
    /* 12. the orchard green: a broad ramp up to the back tier, a planter bunker guarding the cup, a hump and a hollow */
    { par: 2, sol: [], tee: [0, 0.5], cup: [0.4, 10.2],
      shape: [[-1.5, 0], [1.5, 0], [2.6, 3], [2.8, 8], [2.2, 11.4], [0, 12.4], [-2.2, 11.4], [-2.8, 8], [-2.6, 3]],
      tiers: [{ poly: rect(-3.2, 6.4, 3.2, 13), h: 0.16 }],
      ramps: [{ x0: -3, z0: 5.2, x1: 3, z1: 6.4, axis: 'z', h0: 0, h1: 0.16 }],
      bumps: [{ x: -1.2, z: 9.2, r: 1.4, h: 0.12 }, { x: 0.6, z: 3, r: 1.6, h: -0.1 }, { x: -1, z: 2.2, r: 1, h: 0.08 }],
      zones: [{ surf: 'sand', poly: [[1.2, 8.6], [2.2, 8.4], [2.4, 9.6], [1.4, 9.8]] }] },
    /* 13. the abyss: jump the void through the narrow launch, or ride the long way round past the airlock */
    { par: 4, crazy: true, sol: [[130,1,0],[50,0.86,0]], tee: [0, 0.5], cup: [-0.55, 6],
      floors: [[[-0.7, 0], [2.6, 0], [2.6, 6.6], [-1.2, 6.6], [-1.2, 4.4], [1.6, 4.4], [1.6, 1.2], [0.7, 1.2], [0.7, 3], [-0.7, 3]]],
      walls: [[[-0.7, 3], [-0.7, 0], [2.6, 0], [2.6, 6.6], [1, 6.6]], [[-1.2, 6.6], [-1.2, 4.4]], [[0.7, 3], [0.7, 1.2], [1.6, 1.2], [1.6, 4.4], [-1.2, 4.4]]],
      inner: [[[-0.7, 2.3], [-0.3, 2.3], [-0.3, 3]], [[0.7, 2.3], [0.3, 2.3], [0.3, 3]]],
      ramps: [{ x0: -0.7, z0: 2.3, x1: 0.7, z1: 3, axis: 'z', h0: 0, h1: 0.24 }],
      bumps: [{ x: 2.1, z: 3, r: 0.5, h: -0.18 }, { x: 0.2, z: 5.5, r: 0.4, h: -0.14 }],
      posts: [ALIEN(-0.95, 5.3)],
      movers: [LOCK(2.1, 4.9, 3.45, 4.9, 0.45, 90, 3)] },
    /* 14. satellite ring: a long arm sweeps the track; a tailwind up the left lane, a headwind down the right */
    { par: 4, sol: [[18,0.2222222222222222,0]], tee: [-2, 0.45], cup: [2, 4.75], aim0: 90,
      floors: [rect(-2.5, 0, 2.5, 0.9), rect(-2.5, 4.3, 2.5, 5.2), rect(-2.5, 0.9, -1.6, 4.3), rect(1.6, 0.9, 2.5, 4.3)],
      walls: [ring([[-2.5, 0], [2.5, 0], [2.5, 5.2], [-2.5, 5.2]])],
      posts: [ALIEN(2.05, 0.45), ALIEN(-2.05, 4.75)],
      zones: [{ push: [0, -0.7], poly: rect(1.6, 1.3, 2.5, 3.7) }, { push: [0, 0.7], poly: rect(-2.5, 1.3, -1.6, 3.7) }],
      movers: [SAT(0, 2.6, 2.28, 0.8, 0, 2)] },
    /* 15. the descent: high deck, crater deck past the airlock, then tube or drop to the rock garden */
    { par: 4, crazy: true, sol: [[9,1,0]], tee: [0, 0.5], cup: [0.5, 8],
      floors: [rect(-0.6, 0, 0.6, 2.4), rect(-1.6, 2.8, 1.6, 5.6), rect(-0.2, 6.4, 3, 8.6)],
      walls: [...box(-0.6, 0, 0.6, 2.4, 'n'), [[0.2, 5.6], [-1.6, 5.6], [-1.6, 2.8], [1.6, 2.8], [1.6, 5.6]], ...box(-0.2, 6.4, 3, 8.6)],
      tiers: [DECK(-0.6, 0, 0.6, 2.4, 0.7), DECK(-1.6, 2.8, 1.6, 5.6, 0.3)],
      bumps: [{ x: -0.6, z: 4.3, r: 0.5, h: -0.2 }, { x: 0.8, z: 3.6, r: 0.4, h: -0.18 }],
      tubes: [{ a: [-1.15, 5.15], b: [2.6, 6.85], dir: 0, keep: 0.5, add: 0.2 }],
      movers: [ROCK(0.25, 7.1, 2.05, 7.1, 2.6), LOCK(0.7, 4.75, 2.1, 4.75, 0.45, 90, 3.2)] },
    /* 16. the vine valley: a long green climbing gently, a valley winding up its middle, the cup on a shelf beside a ridge */
    { par: 2, sol: [], tee: [0, 0.5], cup: [0.9, 11.4],
      shape: [[-1.6, 0], [1.6, 0], [2.2, 2], [2.2, 11], [1.4, 13], [-1.4, 13], [-2.2, 11], [-2.2, 2]],
      tiers: [{ poly: rect(-3, -1, 3, 14), h: 0, sx: -0.02, sz: 0.012 }],
      bumps: [{ x: 1, z: 4, r: 1.4, h: -0.1 }, { x: 0, z: 6.5, r: 1.6, h: -0.12 }, { x: -0.8, z: 9, r: 1.4, h: -0.1 }, { x: 1.2, z: 9.4, r: 1.2, h: 0.12 }] },
    /* 17. airlock maze: three bulkheads, three doors to time, or thread the rock to the tube */
    { par: 4, crazy: true, sol: [[295,0.9285714285714286,0],[0,0.42857142857142855,0]], tee: [0, 0.5], cup: [1.1, 8.4], shape: rect(-1.8, 0, 1.8, 9),
      inner: [[[-1.8, 2.2], [0.9, 2.2]], [[-0.9, 4.4], [1.8, 4.4]], [[-1.8, 6.6], [0.9, 6.6]]],
      posts: [ALIEN(0.2, 5.6), ALIEN(-0.5, 3.3), ALIEN(0.3, 7.8)],
      tubes: [{ a: [-1.35, 1.6], b: [-1.3, 5.2], dir: 90, keep: 0.6, add: 0.2 }],
      movers: [LOCK(1.35, 2.2, 0.45, 2.2, 0.45, 90, 2.8), LOCK(-1.35, 4.4, -0.45, 4.4, 0.45, 90, 3.3, 2), LOCK(1.35, 6.6, 0.45, 6.6, 0.45, 90, 2.6, 1),
        ROCK(-1.35, 0.55, -1.35, 1.05, 2, 0, 0.15)] },
    /* 18. the grand tour: three turning jumps between floating decks, a tube shortcut, then the crater cup */
    { par: 5, crazy: true, sol: [[6,1,0]], tee: [0, 0.5], cup: [-3, 8.8],
      floors: [rect(-0.6, 0, 0.6, 2.8), rect(-1, 3.6, 1, 6), rect(-3.8, 4.2, -1.6, 6.6), rect(-4.4, 7.4, -1.8, 9.8)],
      walls: [...box(-0.6, 0, 0.6, 2.8, 'n'), [[-1, 4.6], [-1, 3.6], [1, 3.6], [1, 6], [-0.15, 6], [-1, 6]],
        [[-2.6, 6.6], [-2.45, 6.6], [-1.6, 6.6], [-1.6, 4.2], [-3.8, 4.2], [-3.8, 5.65], [-3.8, 6.6]], ring(rect(-4.4, 7.4, -1.8, 9.8))],
      tiers: [DECK(-1, 3.6, 1, 6, 0.1), DECK(-3.8, 4.2, -1.6, 6.6, 0.25), DECK(-4.4, 7.4, -1.8, 9.8, 0.1)],
      ramps: [{ x0: -0.6, z0: 2, x1: 0.6, z1: 2.8, axis: 'z', h0: 0, h1: 0.3 }, { x0: -1, z0: 4.6, x1: -0.3, z1: 6, axis: 'x', h0: 0.42, h1: 0.1 },
        { x0: -3.8, z0: 5.8, x1: -2.6, z1: 6.6, axis: 'z', h0: 0.25, h1: 0.55 }],
      bumps: [{ x: -3, z: 8.8, r: 0.75, h: -0.15 }],
      posts: [ALIEN(0.5, 4.5), ALIEN(-2.2, 5.1), ALIEN(-3.65, 9.4)],
      tubes: [{ a: [0.6, 5.55], b: [-2.15, 9.3], dir: 270, keep: 0.4, add: 0.2 }],
      movers: [ROCK(-4.1, 8.1, -2.1, 8.1, 3.2, 0, 0.14)] },
] });
}
