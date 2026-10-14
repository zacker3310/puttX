/* world 5, course 15, pirate cove at sunset: the smugglers' side of the cove. More going on per
   hole: chained treasure-cave tubes, switchback gangplanks, drawbridges over drops, cannon decks.
   Each hole's `sol` is printed by `node scripts/solve.cjs --hole 15-N`; holes-check replays it. */
registerWorld(15, (() => {
  const BARREL = (x, z, r = 0.14) => ({ x, z, r, top: 0.26, look: 'barrel' });
  const ANCHOR = (x, z) => ({ x, z, r: 0.1, top: 0.3, look: 'anchor' });
  const CANNON = (ax, az, bx, bz, period, phase = 0) => ({ kind: 'slide', ax, az, bx, bz, r: 0.15, period, phase, look: 'cannon' });
  const BRIDGE = (ax, az, bx, bz, len, ang, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'bridge' });
  const WHEEL = (x, z, len, w, phase = 0) => ({ kind: 'spin', x, z, len, w, phase, blades: 2, look: 'wheel' });
  const sand = poly => ({ surf: 'sand', poly });
  const lagoon = poly => ({ surf: 'water', poly });
  /* points on a circle, from angle a0 to a1 in degrees (0 is +z, 90 is +x), for round whirlpool walls */
  const arc = (cx, cz, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + Math.sin(a) * r, cz + Math.cos(a) * r]; });
  return { holes: [
    /* 1 shore lane: round the corner, or the cave in the far corner */
    { par: 2, sol: [[22,0.76,0]], tee: [0, 0.5], cup: [1.9, 5.4], aim0: 0,
      shape: [[-0.8, 0], [0.8, 0], [0.8, 4.2], [2.6, 4.2], [2.6, 6.2], [-0.8, 6.2]],
      zones: [sand(rect(-0.8, 2.0, 0.1, 2.8))], bumps: [{ x: 0.9, z: 5.3, r: 0.45, h: 0.14 }],
      tubes: [{ a: [-0.45, 5.6], b: [2.25, 4.6], dir: 0 }], posts: [BARREL(1.3, 4.6)] },
    /* 2 drawbridge, then the gangplank up to the deck */
    { par: 3, sol: [[324,0.88,0.5]], tee: [0.6, 0.5], cup: [-0.6, 6.9], shape: rect(-1.2, 0, 1.2, 7.6),
      zones: [lagoon(rect(-0.5, 2.6, 1.2, 3.4))], movers: [BRIDGE(-0.78, 2.35, -0.3, 2.35, 0.2, 90, 3.2)],
      ramps: [{ x0: 0.0, z0: 4.4, x1: 1.2, z1: 5.4, axis: 'z', h0: 0, h1: 0.25 }], tiers: [{ poly: rect(-1.3, 5.4, 1.3, 7.7), h: 0.25 }],
      inner: [[[-1.2, 5.4], [0.0, 5.4]]], bumps: [{ x: 0.6, z: 6.7, r: 0.4, h: 0.12 }, { x: -0.6, z: 4.0, r: 0.45, h: 0.15 }], posts: [ANCHOR(0.9, 1.8)] },
    /* 3 cave relay: three chambers, two caves */
    { par: 3, sol: [[28,0.96,0],[0,0.12,0]], tee: [0, 0.5], cup: [-0.7, 6.3], aim0: 30, shape: rect(-1.6, 0, 1.6, 7),
      inner: [[[-1.6, 2.6], [1.0, 2.6]], [[-1.0, 4.8], [1.6, 4.8]]],
      tubes: [{ a: [-1.0, 1.8], b: [-1.0, 3.3], dir: 90 }, { a: [1.0, 4.0], b: [1.0, 5.6], dir: 270 }],
      bumps: [{ x: 0.3, z: 1.6, r: 0.5, h: 0.18 }, { x: 0, z: 3.7, r: 0.5, h: 0.2 }],
      zones: [sand(rect(1.0, 2.2, 1.6, 3.0))], posts: [BARREL(0.2, 6.0)] },
    /* 4 cannon deck: up the plank, dodge the cannonball, off the end to the green */
    { par: 3, sol: [[176,0.92,0.5]], tee: [0, 0.5], cup: [-0.6, 7.8], shape: rect(-1.2, 0, 1.2, 8.6),
      ramps: [{ x0: -0.4, z0: 1.8, x1: 0.4, z1: 3, axis: 'z', h0: 0, h1: 0.3 }], tiers: [{ poly: rect(-1.3, 3, 1.3, 6), h: 0.3 }],
      inner: [[[-1.2, 3], [-0.4, 3]], [[0.4, 3], [1.2, 3]], [[-1.2, 6], [0.2, 6]]],
      movers: [CANNON(-0.8, 4.5, 0.8, 4.5, 2.6)], zones: [lagoon(rect(0.5, 7.6, 1.2, 8.6))],
      bumps: [{ x: 0.3, z: 7.0, r: 0.4, h: 0.12 }], posts: [BARREL(-0.8, 1.4)] },
    /* 5 wheel bay: through the ship's wheel onto the listing green, or the cave round it */
    { par: 3, sol: [[2,0.76,0]], tee: [0, 0.5], cup: [0.6, 6.0], shape: rect(-1.4, 0, 1.4, 6.8),
      tiers: [{ poly: rect(-1.5, -0.1, 1.5, 6.9), h: 0.2, sx: 0.06 }],
      inner: [[[-1.4, 3.2], [-0.8, 3.2]], [[0.8, 3.2], [1.4, 3.2]]], movers: [WHEEL(0, 3.2, 0.55, 1.5)],
      tubes: [{ a: [-1.0, 1.7], b: [1.0, 4.1], dir: 0 }],
      zones: [sand(rect(-1.4, 4.6, -0.3, 5.4))], posts: [BARREL(-0.2, 6.2)] },
    /* 6 the long shore green: 11 m up a green that climbs gently and leans toward the lagoon, across a ridge and a swale */
    { par: 3, sol: [[0,0.92,0]], tee: [0, 0.5], cup: [1.0, 10.4], shape: rect(-2, 0, 2, 11.4),
      tiers: [{ poly: rect(-2.1, -0.1, 2.1, 11.5), h: 0, sx: -0.02, sz: 0.01 }],
      bumps: [{ x: 0.9, z: 3.8, r: 1.4, h: 0.12 }, { x: -0.6, z: 6.2, r: 1.8, h: 0.15 }, { x: 1.2, z: 8.2, r: 1.1, h: -0.1 }, { x: -1.2, z: 10.2, r: 0.9, h: 0.07 }],
      zones: [sand(rect(-2, 1.6, -1.3, 2.8)), lagoon(rect(1.5, 5.0, 2, 6.8))], posts: [ANCHOR(-1.6, 8.4)] },
    /* 7 fort switchback: up one gangplank, across, up the other; or the cave to the battlements */
    { par: 4, sol: [[242,0.76,0],[210,0.92,0]], tee: [-0.6, 0.5], cup: [0.8, 7.6], aim0: 30, shape: rect(-1.6, 0, 1.6, 8.4),
      ramps: [{ x0: 0.9, z0: 1.8, x1: 1.6, z1: 3, axis: 'z', h0: 0, h1: 0.2 }, { x0: -1.6, z0: 4.4, x1: -0.9, z1: 5.6, axis: 'z', h0: 0.2, h1: 0.4 }],
      tiers: [{ poly: rect(-1.7, 3, 1.7, 8.5), h: 0.2 }, { poly: rect(-1.7, 5.6, 1.7, 8.5), h: 0.4 }],
      inner: [[[-1.6, 3], [0.9, 3]], [[-0.9, 5.6], [1.6, 5.6]]],
      tubes: [{ a: [1.15, 4.9], b: [-1.15, 6.4], dir: 90 }],
      posts: [BARREL(-0.2, 4.2), BARREL(0.2, 7.0)], zones: [sand(rect(-1.6, 1.4, -0.6, 2.2))], bumps: [{ x: 0.6, z: 1.2, r: 0.4, h: 0.15 }] },
    /* 8 the gangplank express: up the gangplank, round the banked corner on the deck, off the edge into the
       little whirlpool, down the cave at its eye, and out into the big whirlpool that spins it round into the cup */
    { par: 3, auto: true, sol: [[0, 0.92, 0]], tee: [0, 0.5], cup: [-1.85, 2.6], aim0: 0,
      floors: [rect(-0.35, 0, 0.35, 6.8), rect(-1.55, 6.2, -0.35, 6.8), arc(-2.4, 6.5, 0.95, 0, 360, 24), rect(-3.3, 0, -0.35, 5.3)],
      walls: [[[-0.35, 0], [0.35, 0], [0.35, 6.1], [-0.35, 6.8], [-1.5, 6.8], ...arc(-2.4, 6.5, 0.949, 72, -252, 16), [-1.5, 6.2], [-0.35, 6.2], [-0.35, 0],
        [-3.3, 0], [-3.3, 5.3], [-0.35, 5.3]]],
      ramps: [{ x0: -0.35, z0: 1.4, x1: 0.35, z1: 3.0, axis: 'z', h0: 0, h1: 0.3 }],
      tiers: [{ poly: rect(-0.4, 3.0, 0.4, 6.85), h: 0.3 }, { poly: rect(-1.5, 6.15, -0.3, 6.85), h: 0.3 }],
      drains: [{ x: -2.4, z: 6.5, r: 1.1, depth: 0.3 }, { x: -1.85, z: 2.6, r: 1.3, depth: 0.35 }],
      tubes: [{ a: [-2.4, 6.5], b: [-1.85, 1.2], dir: 46, keep: 0, add: 1.4 }] },
    /* 9 twin wheels: past the beach wheel, up the plank, past the deck wheel */
    { par: 3, sol: [[210,1,0]], tee: [0, 0.5], cup: [0.6, 7.2], shape: rect(-1.4, 0, 1.4, 8),
      movers: [WHEEL(0, 2.0, 0.5, 1.4), WHEEL(-0.5, 5.6, 0.45, -1.7)],
      ramps: [{ x0: -0.5, z0: 3, x1: 0.5, z1: 4, axis: 'z', h0: 0, h1: 0.25 }], tiers: [{ poly: rect(-1.5, 4, 1.5, 8.1), h: 0.25 }],
      inner: [[[-1.4, 4], [-0.5, 4]], [[0.5, 4], [1.4, 4]]],
      zones: [lagoon(rect(-1.4, 6.6, -0.4, 8)), sand(rect(0.7, 4.6, 1.4, 5.4))], bumps: [{ x: 0.9, z: 3.0, r: 0.4, h: 0.15 }] },
    /* 10 the two-tier green: 12 m, down a broad step from the fort lawn to a lower green that rolls away round a hollow */
    { par: 3, sol: [[6,1,0]], tee: [-0.8, 0.5], cup: [1.1, 11.2], shape: rect(-2, 0, 2, 12.2),
      tiers: [{ poly: rect(-2.1, -0.1, 2.1, 5.2), h: 0.15, sx: 0 }, { poly: rect(-2.1, 6.4, 2.1, 12.3), h: 0.064, sz: -0.01 }],
      ramps: [{ x0: -2, z0: 5.2, x1: 2, z1: 6.4, axis: 'z', h0: 0.15, h1: 0 }],
      bumps: [{ x: -0.5, z: 2.8, r: 1.3, h: 0.1 }, { x: 0.4, z: 8.6, r: 1.5, h: -0.12 }, { x: -1.0, z: 10.6, r: 1.1, h: 0.12 }],
      zones: [sand(rect(1.2, 2.0, 2, 3.4)), sand(rect(-2, 7.6, -1.4, 8.8))], posts: [BARREL(1.6, 7.4)] },
    /* 11 crow's nest: three decks, a cannon on the middle one, a cave up to the top */
    { par: 4, sol: [[15,0.56,0],[350,0.04,0]], tee: [0, 0.5], cup: [0.7, 8.8], aim0: 20, shape: rect(-1.4, 0, 1.4, 9.6),
      ramps: [{ x0: 0.6, z0: 2.6, x1: 1.4, z1: 3.8, axis: 'z', h0: 0, h1: 0.2 }, { x0: -1.4, z0: 6.2, x1: -0.6, z1: 7.4, axis: 'z', h0: 0.2, h1: 0.4 }],
      tiers: [{ poly: rect(-1.5, 3.8, 1.5, 9.7), h: 0.2 }, { poly: rect(-1.5, 7.4, 1.5, 9.7), h: 0.4 }],
      inner: [[[-1.4, 3.8], [0.6, 3.8]], [[-0.6, 7.4], [1.4, 7.4]]],
      movers: [CANNON(-0.9, 5.0, 0.9, 5.0, 2.8)], tubes: [{ a: [1.0, 6.7], b: [-0.9, 8.3], dir: 90 }],
      zones: [sand(rect(-1.4, 1.2, -0.3, 2.0))], posts: [BARREL(0.0, 8.7)], bumps: [{ x: 0, z: 6.4, r: 0.35, h: 0.1 }] },
    /* 12 three islands: walk the planks (no rails!) or take the cave from the middle island */
    { par: 4, sol: [[357,0.76,0],[350,0.08,0]], tee: [0, 0.5], cup: [0.6, 9.6], aim0: 0,
      floors: [rect(-1.2, 0, 1.2, 2.6), rect(-0.3, 2.5, 0.3, 4.5), rect(-1.4, 4.4, 1.4, 6.8), rect(0.6, 6.7, 1.2, 8.3), rect(-1.2, 8.2, 1.4, 10.4)],
      walls: [[[-0.3, 2.6], [-1.2, 2.6], [-1.2, 0], [1.2, 0], [1.2, 2.6], [0.3, 2.6]],
        [[-0.3, 4.4], [-1.4, 4.4], [-1.4, 6.8], [0.6, 6.8]], [[1.2, 6.8], [1.4, 6.8], [1.4, 4.4], [0.3, 4.4]],
        [[0.6, 8.2], [-1.2, 8.2], [-1.2, 10.4], [1.4, 10.4], [1.4, 8.2], [1.2, 8.2]]],
      tubes: [{ a: [-1.0, 5.6], b: [-0.8, 9.0], dir: 90 }],
      bumps: [{ x: 0.2, z: 5.6, r: 0.45, h: 0.15 }], zones: [sand(rect(-1.2, 9.6, -0.2, 10.4))], posts: [BARREL(-0.6, 1.4)] },
    /* 13 the hold: the long gangplank or the cave up to the top deck, then past the drawbridge and down */
    { par: 4, crazy: true, sol: [[9,0.95,0],[57,0.8,0]], tee: [0.4, 0.5], cup: [0.3, 8.3], aim0: 0, shape: rect(-1.8, 0, 1.8, 9.2),
      ramps: [{ x0: -1.8, z0: 1.4, x1: -1.2, z1: 5.0, axis: 'z', h0: 0, h1: 0.4 }],
      tiers: [{ poly: rect(-1.2, 3.4, 1.9, 7.0), h: 0.4 }, { poly: rect(-1.9, 5.0, -1.2, 7.0), h: 0.4 }],
      inner: [[[-1.2, 1.4], [-1.2, 3.4], [1.8, 3.4]], [[-1.8, 7.0], [-0.2, 7.0]], [[0.8, 7.0], [1.8, 7.0]]],
      tubes: [{ a: [1.1, 2.4], b: [1.1, 4.0], dir: 0 }],
      movers: [BRIDGE(0.05, 6.75, 0.55, 6.75, 0.25, 90, 3.0), WHEEL(-0.3, 4.9, 0.45, 1.3)],
      zones: [lagoon(rect(-1.8, 8.4, -0.6, 9.2)), sand(rect(0.6, 0.9, 1.8, 1.5))],
      bumps: [{ x: -0.5, z: 1.6, r: 0.45, h: 0.18 }, { x: 1.2, z: 8.2, r: 0.4, h: 0.12 }], posts: [BARREL(1.3, 6.2)] },
    /* 14 cannon gauntlet: start on the gun deck, down the plank or off the side, past the wheel */
    { par: 4, sol: [[15,0.85,0]], tee: [0, 0.5], cup: [0.7, 8.3], shape: rect(-1.4, 0, 1.4, 9),
      tiers: [{ poly: rect(-1.5, -0.1, 1.5, 4.4), h: 0.35 }],
      ramps: [{ x0: -1.1, z0: 4.4, x1: -0.5, z1: 5.6, axis: 'z', h0: 0.35, h1: 0 }],
      inner: [[[-0.5, 4.4], [0.4, 4.4]], [[-1.4, 4.4], [-1.1, 4.4]]],
      movers: [CANNON(-0.9, 1.8, 0.9, 1.8, 2.4), CANNON(0.9, 3.2, -0.9, 3.2, 3.0, 1), WHEEL(-0.5, 7.9, 0.4, 1.3)],
      zones: [sand(rect(0.4, 4.4, 1.4, 5.6)), lagoon(rect(-1.4, 6.4, -0.2, 7.0))],
      posts: [ANCHOR(0.3, 6.6), ANCHOR(1.15, 7.2)] },
    /* 15 treasure vault: through a drawbridge off the top deck, across the cannon deck, down to the vault */
    { par: 4, crazy: true, sol: [[24.5,0.6,0],[89,0.52,0]], tee: [0, 0.5], cup: [-0.8, 8.6], shape: rect(-1.6, 0, 1.6, 9.4),
      tiers: [{ poly: rect(-1.7, -0.1, 1.7, 3), h: 0.4 }, { poly: rect(-1.7, 3, 1.7, 6.2), h: 0.2 }],
      inner: [[[-1.6, 3], [-1.2, 3]], [[-0.6, 3], [0.6, 3]], [[1.2, 3], [1.6, 3]], [[-1.6, 6.2], [-0.4, 6.2]], [[0.4, 6.2], [1.6, 6.2]]],
      movers: [BRIDGE(-1.15, 2.75, -0.65, 2.75, 0.2, 90, 3.0), BRIDGE(1.15, 2.75, 0.65, 2.75, 0.2, 90, 3.4, 1.5), CANNON(-1.0, 4.4, 1.0, 4.4, 2.4)],
      tubes: [{ a: [1.15, 5.6], b: [1.0, 7.0], dir: 0 }],
      zones: [lagoon(rect(0.3, 8.0, 1.6, 9.4)), sand(rect(-1.6, 6.8, -0.6, 7.4))],
      bumps: [{ x: -0.1, z: 7.6, r: 0.4, h: 0.14 }], posts: [BARREL(-0.4, 1.6), ANCHOR(-1.1, 5.4)] },
    /* 16 the shipwreck: up the plank onto the listing wreck, past the wheel, then the hull cave or off the stern */
    { par: 4, crazy: true, sol: [[1,0.96,0],[90,0.44,0]], tee: [0.8, 0.5], cup: [1.0, 9.2], aim0: 0, shape: rect(-1.8, 0, 1.8, 10),
      ramps: [{ x0: 0.4, z0: 2.0, x1: 1.0, z1: 3.2, axis: 'z', h0: 0, h1: 0.34 }],
      tiers: [{ poly: rect(-1.9, 3.2, 1.9, 7), h: 0.3, sx: 0.06 }],
      inner: [[[-1.8, 3.2], [0.4, 3.2]], [[1.0, 3.2], [1.8, 3.2]], [[-1.8, 7], [-0.6, 7]], [[0.6, 7], [1.8, 7]]],
      movers: [WHEEL(0.2, 5.3, 0.45, 1.4)],
      tubes: [{ a: [-1.3, 4.2], b: [-1.2, 8.2], dir: 0 }],
      posts: [BARREL(1.3, 4.4), BARREL(-0.9, 6.3), BARREL(1.3, 6.3)],
      zones: [lagoon(rect(-0.4, 8.6, 0.4, 10)), sand(rect(-1.8, 1.2, -0.6, 2.2))], bumps: [{ x: 0.3, z: 7.9, r: 0.4, h: 0.14 }] },
    /* 17 the skull rock green: 13 m past the skull's shadow, over two long ridges to a cup tucked behind a hollow */
    { par: 3, sol: [[0,0.88,0]], tee: [0.8, 0.5], cup: [-0.9, 12.3], shape: rect(-2.2, 0, 2.2, 13.3),
      tiers: [{ poly: rect(-2.3, -0.1, 2.3, 13.4), h: 0, sx: 0.022 }],
      bumps: [{ x: -0.8, z: 3.6, r: 2.0, h: 0.16 }, { x: 1.0, z: 7.4, r: 2.2, h: 0.14 }, { x: -0.6, z: 10.4, r: 1.2, h: -0.12 }, { x: 1.2, z: 11.6, r: 0.9, h: 0.06 }],
      zones: [sand(rect(1.4, 4.4, 2.2, 5.6)), lagoon(rect(-2.2, 7.6, -1.6, 9.4))], posts: [ANCHOR(1.8, 1.4)] },
    /* 18 board the galleon: gangplank, the main deck's wheel and cannon, the quarterdeck, then walk the plank or the cave to treasure island */
    { par: 5, crazy: true, sol: [[324,0.9,0],[39,0.9,0],[45,0.8,0]], tee: [0, 0.5], cup: [-0.6, 12.0], aim0: -20, shape: rect(-2, 0, 2, 13),
      ramps: [{ x0: -2, z0: 2.4, x1: -1.3, z1: 3.6, axis: 'z', h0: 0, h1: 0.25 }, { x0: 1.3, z0: 6.4, x1: 2, z1: 7.6, axis: 'z', h0: 0.25, h1: 0.44 }],
      tiers: [{ poly: rect(-2.1, 3.6, 2.1, 9), h: 0.25 }, { poly: rect(-2.1, 7.6, 2.1, 9), h: 0.44 }, { poly: rect(-0.2, 9, 0.2, 10), h: 0.44 }],
      inner: [[[-1.3, 3.6], [2, 3.6]], [[-2, 7.6], [1.3, 7.6]], [[-2, 9], [-0.2, 9]], [[0.2, 9], [2, 9]]],
      movers: [WHEEL(0.4, 5.0, 0.5, 1.3), CANNON(-1.5, 6.6, 0.3, 6.6, 2.8)],
      tubes: [{ a: [-1.4, 8.3], b: [1.2, 10.6], dir: 0 }],
      zones: [lagoon(rect(-2, 9, -0.2, 10)), lagoon(rect(0.2, 9, 2, 10)), sand(rect(0.4, 1.4, 2, 2.2))],
      bumps: [{ x: 0.8, z: 0.9, r: 0.5, h: 0.18 }, { x: 0.3, z: 11.4, r: 0.45, h: 0.16 }], posts: [ANCHOR(-0.2, 12.4), BARREL(1.4, 12.2)] },
  ] };
})());
