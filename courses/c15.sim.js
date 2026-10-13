/* world 5, course 15, pirate cove at sunset: the smugglers' side of the cove. More going on per
   hole: chained treasure-cave tubes, switchback gangplanks, drawbridges over drops, cannon decks.
   Each hole's `sol` is printed by `node scripts/solve.cjs --hole 15-N`; holes-check replays it. */
registerWorld(15, (() => {
  const BARREL = (x, z, r = 0.14) => ({ x, z, r, top: 0.26, look: 'barrel' });
  const BUMPER = (x, z) => ({ x, z, r: 0.14, top: 0.26, e: 1.15, look: 'barrel' });
  const ANCHOR = (x, z) => ({ x, z, r: 0.1, top: 0.3, look: 'anchor' });
  const CANNON = (ax, az, bx, bz, period, phase = 0) => ({ kind: 'slide', ax, az, bx, bz, r: 0.15, period, phase, look: 'cannon' });
  const BRIDGE = (ax, az, bx, bz, len, ang, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'bridge' });
  const WHEEL = (x, z, len, w, phase = 0) => ({ kind: 'spin', x, z, len, w, phase, blades: 2, look: 'wheel' });
  const sand = poly => ({ surf: 'sand', poly });
  const lagoon = poly => ({ surf: 'water', poly });
  return { holes: [
    /* 1 shore lane: round the corner, or the cave in the far corner */
    { par: 2, sol: [[10,1,0]], tee: [0, 0.5], cup: [1.9, 5.4], aim0: 0,
      shape: [[-0.8, 0], [0.8, 0], [0.8, 4.2], [2.6, 4.2], [2.6, 6.2], [-0.8, 6.2]],
      zones: [sand(rect(-0.8, 2.0, 0.1, 2.8))], bumps: [{ x: 0.9, z: 5.3, r: 0.45, h: 0.14 }],
      tubes: [{ a: [-0.45, 5.6], b: [2.25, 4.6], dir: 0 }], posts: [BARREL(1.3, 4.6)] },
    /* 2 drawbridge, then the gangplank up to the deck */
    { par: 3, sol: [[324,0.83,0.5]], tee: [0.6, 0.5], cup: [-0.6, 6.9], shape: rect(-1.2, 0, 1.2, 7.6),
      zones: [lagoon(rect(-0.5, 2.6, 1.2, 3.4))], movers: [BRIDGE(-0.78, 2.35, -0.3, 2.35, 0.2, 90, 3.2)],
      ramps: [{ x0: 0.0, z0: 4.4, x1: 1.2, z1: 5.4, axis: 'z', h0: 0, h1: 0.25 }], tiers: [{ poly: rect(-1.3, 5.4, 1.3, 7.7), h: 0.25 }],
      inner: [[[-1.2, 5.4], [0.0, 5.4]]], bumps: [{ x: 0.6, z: 6.7, r: 0.4, h: 0.12 }, { x: -0.6, z: 4.0, r: 0.45, h: 0.15 }], posts: [ANCHOR(0.9, 1.8)] },
    /* 3 cave relay: three chambers, two caves */
    { par: 3, sol: [[24,0.8,0],[38,0.44,0]], tee: [0, 0.5], cup: [-0.7, 6.3], aim0: 30, shape: rect(-1.6, 0, 1.6, 7),
      inner: [[[-1.6, 2.6], [1.0, 2.6]], [[-1.0, 4.8], [1.6, 4.8]]],
      tubes: [{ a: [-1.0, 1.8], b: [-1.0, 3.3], dir: 90 }, { a: [1.0, 4.0], b: [1.0, 5.6], dir: 270 }],
      bumps: [{ x: 0.3, z: 1.6, r: 0.5, h: 0.18 }, { x: 0, z: 3.7, r: 0.5, h: 0.2 }],
      zones: [sand(rect(1.0, 2.2, 1.6, 3.0))], posts: [BARREL(0.2, 6.0)] },
    /* 4 cannon deck: up the plank, dodge the cannonball, off the end to the green */
    { par: 3, sol: [[357,0.82,1.2]], tee: [0, 0.5], cup: [-0.6, 7.8], shape: rect(-1.2, 0, 1.2, 8.6),
      ramps: [{ x0: -0.4, z0: 1.8, x1: 0.4, z1: 3, axis: 'z', h0: 0, h1: 0.3 }], tiers: [{ poly: rect(-1.3, 3, 1.3, 6), h: 0.3 }],
      inner: [[[-1.2, 3], [-0.4, 3]], [[0.4, 3], [1.2, 3]], [[-1.2, 6], [0.2, 6]]],
      movers: [CANNON(-0.8, 4.5, 0.8, 4.5, 2.6)], zones: [lagoon(rect(0.5, 7.6, 1.2, 8.6))],
      bumps: [{ x: 0.3, z: 7.0, r: 0.4, h: 0.12 }], posts: [BARREL(-0.8, 1.4)] },
    /* 5 wheel bay: through the ship's wheel onto the listing green, or the cave round it */
    { par: 3, sol: [[9,0.6,0]], tee: [0, 0.5], cup: [0.6, 6.0], shape: rect(-1.4, 0, 1.4, 6.8),
      tiers: [{ poly: rect(-1.5, -0.1, 1.5, 6.9), h: 0.2, sx: 0.06 }],
      inner: [[[-1.4, 3.2], [-0.8, 3.2]], [[0.8, 3.2], [1.4, 3.2]]], movers: [WHEEL(0, 3.2, 0.55, 1.5)],
      tubes: [{ a: [-1.0, 1.7], b: [1.0, 4.1], dir: 0 }],
      zones: [sand(rect(-1.4, 4.6, -0.3, 5.4))], posts: [BARREL(-0.2, 6.2)] },
    /* 6 jump the lagoon off the plank, or walk the sandy shore round it */
    { par: 3, sol: [[0,1,0]], tee: [0, 0.5], cup: [-0.4, 7.3], shape: rect(-1.2, 0, 1.2, 8),
      ramps: [{ x0: -0.4, z0: 2.2, x1: 0.4, z1: 3.4, axis: 'z', h0: 0, h1: 0.25 }],
      zones: [lagoon(rect(-0.6, 3.4, 1.2, 4.4)), sand(rect(-1.2, 3.4, -0.6, 4.4)), sand(rect(0.3, 5.0, 1.2, 5.8))],
      bumps: [{ x: 0.4, z: 6.4, r: 0.45, h: 0.2 }], posts: [BARREL(0.1, 7.6), ANCHOR(-0.9, 2.0)] },
    /* 7 fort switchback: up one gangplank, across, up the other; or the cave to the battlements */
    { par: 4, sol: [[54,0.6,0],[207,1,0],[6,0.9,0]], tee: [-0.6, 0.5], cup: [0.8, 7.6], aim0: 30, shape: rect(-1.6, 0, 1.6, 8.4),
      ramps: [{ x0: 0.9, z0: 1.8, x1: 1.6, z1: 3, axis: 'z', h0: 0, h1: 0.2 }, { x0: -1.6, z0: 4.4, x1: -0.9, z1: 5.6, axis: 'z', h0: 0.2, h1: 0.4 }],
      tiers: [{ poly: rect(-1.7, 3, 1.7, 8.5), h: 0.2 }, { poly: rect(-1.7, 5.6, 1.7, 8.5), h: 0.4 }],
      inner: [[[-1.6, 3], [0.9, 3]], [[-0.9, 5.6], [1.6, 5.6]]],
      tubes: [{ a: [1.15, 4.9], b: [-1.15, 6.4], dir: 90 }],
      posts: [BARREL(-0.2, 4.2), BARREL(0.2, 7.0)], zones: [sand(rect(-1.6, 1.4, -0.6, 2.2))], bumps: [{ x: 0.6, z: 1.2, r: 0.4, h: 0.15 }] },
    /* 8 the gangplank express: up the chute, through the treasure cave, down the long plank, into the bowl */
    { par: 3, auto: true, sol: [[0, 0.8, 0]], tee: [0, 0.5], cup: [-1.25, 2.4], aim0: 0, shape: rect(-1.6, 0, 0.4, 8),
      inner: [[[-0.2, 0], [-0.2, 4.8], [0.2, 4.8], [0.2, 0]], [[-0.9, 0], [-0.9, 7.0]]],
      ramps: [{ x0: -0.2, z0: 1.6, x1: 0.2, z1: 3.0, axis: 'z', h0: 0, h1: 0.3 }, { x0: -1.6, z0: 3.6, x1: -0.9, z1: 6.4, axis: 'z', h0: 0, h1: 0.35 }],
      tiers: [{ poly: rect(-0.2, 3.0, 0.2, 4.8), h: 0.3 }, { poly: rect(-1.6, 6.4, 0.4, 8.0), h: 0.35 }],
      tubes: [{ a: [0, 4.3], b: [-1.25, 7.3], dir: 180, keep: 0, add: 1.8 }],
      zones: [lagoon(rect(-0.8, 0.1, -0.3, 6.3))],
      bumps: [{ x: -1.25, z: 2.4, r: 0.5, h: -0.1 }] },
    /* 9 twin wheels: past the beach wheel, up the plank, past the deck wheel */
    { par: 3, sol: [[26.5,0.96,0]], tee: [0, 0.5], cup: [0.6, 7.2], shape: rect(-1.4, 0, 1.4, 8),
      movers: [WHEEL(0, 2.0, 0.5, 1.4), WHEEL(-0.5, 5.6, 0.45, -1.7)],
      ramps: [{ x0: -0.5, z0: 3, x1: 0.5, z1: 4, axis: 'z', h0: 0, h1: 0.25 }], tiers: [{ poly: rect(-1.5, 4, 1.5, 8.1), h: 0.25 }],
      inner: [[[-1.4, 4], [-0.5, 4]], [[0.5, 4], [1.4, 4]]],
      zones: [lagoon(rect(-1.4, 6.6, -0.4, 8)), sand(rect(0.7, 4.6, 1.4, 5.4))], bumps: [{ x: 0.9, z: 3.0, r: 0.4, h: 0.15 }] },
    /* 10 barrel pinball on a listing deck, with a cave out of the corner */
    { par: 3, sol: [[0,0.95,0]], tee: [-0.3, 0.5], cup: [0.3, 6.0], shape: rect(-1.6, 0, 1.6, 7),
      tiers: [{ poly: rect(-1.7, -0.1, 1.7, 7.1), h: 0.2, sx: -0.06 }],
      posts: [BUMPER(-0.6, 2.2), BUMPER(0.4, 2.9), BUMPER(-0.3, 3.8), BUMPER(0.9, 4.2), BUMPER(-0.9, 4.8), BARREL(0.3, 5.0), BARREL(-0.2, 5.6), BARREL(0.85, 5.6)],
      tubes: [{ a: [-1.25, 3.4], b: [1.2, 6.3], dir: 270 }], zones: [lagoon(rect(1.1, 2.0, 1.6, 3.6))] },
    /* 11 crow's nest: three decks, a cannon on the middle one, a cave up to the top */
    { par: 4, sol: [[15,0.7,0],[0,0.05,0]], tee: [0, 0.5], cup: [0.7, 8.8], aim0: 20, shape: rect(-1.4, 0, 1.4, 9.6),
      ramps: [{ x0: 0.6, z0: 2.6, x1: 1.4, z1: 3.8, axis: 'z', h0: 0, h1: 0.2 }, { x0: -1.4, z0: 6.2, x1: -0.6, z1: 7.4, axis: 'z', h0: 0.2, h1: 0.4 }],
      tiers: [{ poly: rect(-1.5, 3.8, 1.5, 9.7), h: 0.2 }, { poly: rect(-1.5, 7.4, 1.5, 9.7), h: 0.4 }],
      inner: [[[-1.4, 3.8], [0.6, 3.8]], [[-0.6, 7.4], [1.4, 7.4]]],
      movers: [CANNON(-0.9, 5.0, 0.9, 5.0, 2.8)], tubes: [{ a: [1.0, 6.7], b: [-0.9, 8.3], dir: 90 }],
      zones: [sand(rect(-1.4, 1.2, -0.3, 2.0))], posts: [BARREL(0.0, 8.7)], bumps: [{ x: 0, z: 6.4, r: 0.35, h: 0.1 }] },
    /* 12 three islands: walk the planks (no rails!) or take the cave from the middle island */
    { par: 4, sol: [[357,0.9,0],[0,0.1,0]], tee: [0, 0.5], cup: [0.6, 9.6], aim0: 0,
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
    { par: 4, crazy: true, sol: [[22.5,0.73,0],[90,0.64,0]], tee: [0, 0.5], cup: [-0.8, 8.6], shape: rect(-1.6, 0, 1.6, 9.4),
      tiers: [{ poly: rect(-1.7, -0.1, 1.7, 3), h: 0.4 }, { poly: rect(-1.7, 3, 1.7, 6.2), h: 0.2 }],
      inner: [[[-1.6, 3], [-1.2, 3]], [[-0.6, 3], [0.6, 3]], [[1.2, 3], [1.6, 3]], [[-1.6, 6.2], [-0.4, 6.2]], [[0.4, 6.2], [1.6, 6.2]]],
      movers: [BRIDGE(-1.15, 2.75, -0.65, 2.75, 0.2, 90, 3.0), BRIDGE(1.15, 2.75, 0.65, 2.75, 0.2, 90, 3.4, 1.5), CANNON(-1.0, 4.4, 1.0, 4.4, 2.4)],
      tubes: [{ a: [1.15, 5.6], b: [1.0, 7.0], dir: 0 }],
      zones: [lagoon(rect(0.3, 8.0, 1.6, 9.4)), sand(rect(-1.6, 6.8, -0.6, 7.4))],
      bumps: [{ x: -0.1, z: 7.6, r: 0.4, h: 0.14 }], posts: [BARREL(-0.4, 1.6), ANCHOR(-1.1, 5.4)] },
    /* 16 the shipwreck: up the plank onto the listing wreck, past the wheel, then the hull cave or off the stern */
    { par: 4, crazy: true, sol: [[357,1,0],[105,0.7,0]], tee: [0.8, 0.5], cup: [1.0, 9.2], aim0: 0, shape: rect(-1.8, 0, 1.8, 10),
      ramps: [{ x0: 0.4, z0: 2.0, x1: 1.0, z1: 3.2, axis: 'z', h0: 0, h1: 0.34 }],
      tiers: [{ poly: rect(-1.9, 3.2, 1.9, 7), h: 0.3, sx: 0.06 }],
      inner: [[[-1.8, 3.2], [0.4, 3.2]], [[1.0, 3.2], [1.8, 3.2]], [[-1.8, 7], [-0.6, 7]], [[0.6, 7], [1.8, 7]]],
      movers: [WHEEL(0.2, 5.3, 0.45, 1.4)],
      tubes: [{ a: [-1.3, 4.2], b: [-1.2, 8.2], dir: 0 }],
      posts: [BARREL(1.3, 4.4), BARREL(-0.9, 6.3), BARREL(1.3, 6.3)],
      zones: [lagoon(rect(-0.4, 8.6, 0.4, 10)), sand(rect(-1.8, 1.2, -0.6, 2.2))], bumps: [{ x: 0.3, z: 7.9, r: 0.4, h: 0.14 }] },
    /* 17 skull rock: over the dunes past the wheel, or the skull's cave to the sunken green */
    { par: 3, sol: [[210,0.95,0]], tee: [0, 0.5], cup: [-0.6, 8.2], shape: rect(-1.8, 0, 1.8, 9),
      tiers: [{ poly: rect(-1.9, 6.5, 1.9, 9.1), h: -0.325, sz: 0.05 }],
      bumps: [{ x: -0.9, z: 3.4, r: 0.6, h: 0.35 }, { x: 0.9, z: 3.4, r: 0.6, h: 0.35 }, { x: 0, z: 2.4, r: 0.35, h: 0.15 }],
      movers: [WHEEL(0, 5.2, 0.5, 1.2)],
      tubes: [{ a: [-1.4, 1.6], b: [1.2, 6.0], dir: 330 }],
      zones: [sand(rect(0.6, 4.6, 1.8, 5.4)), lagoon(rect(0.8, 7.4, 1.8, 9))], posts: [ANCHOR(-1.3, 7.6)] },
    /* 18 board the galleon: gangplank, the main deck's wheel and cannon, the quarterdeck, then walk the plank or the cave to treasure island */
    { par: 5, crazy: true, sol: [], tee: [0, 0.5], cup: [-0.6, 12.0], aim0: -20, shape: rect(-2, 0, 2, 13),
      ramps: [{ x0: -2, z0: 2.4, x1: -1.3, z1: 3.6, axis: 'z', h0: 0, h1: 0.25 }, { x0: 1.3, z0: 6.4, x1: 2, z1: 7.6, axis: 'z', h0: 0.25, h1: 0.44 }],
      tiers: [{ poly: rect(-2.1, 3.6, 2.1, 9), h: 0.25 }, { poly: rect(-2.1, 7.6, 2.1, 9), h: 0.44 }, { poly: rect(-0.2, 9, 0.2, 10), h: 0.44 }],
      inner: [[[-1.3, 3.6], [2, 3.6]], [[-2, 7.6], [1.3, 7.6]], [[-2, 9], [-0.2, 9]], [[0.2, 9], [2, 9]]],
      movers: [WHEEL(0.4, 5.0, 0.5, 1.3), CANNON(-1.5, 6.6, 0.3, 6.6, 2.8)],
      tubes: [{ a: [-1.4, 8.3], b: [1.2, 10.6], dir: 0 }],
      zones: [lagoon(rect(-2, 9, -0.2, 10)), lagoon(rect(0.2, 9, 2, 10)), sand(rect(0.4, 1.4, 2, 2.2))],
      bumps: [{ x: 0.8, z: 0.9, r: 0.5, h: 0.18 }, { x: 0.3, z: 11.4, r: 0.45, h: 0.16 }], posts: [ANCHOR(-0.2, 12.4), BARREL(1.4, 12.2)] },
  ] };
})());
