/* world 5, pirate cove: beach sand, lagoons, drawbridge gates, ship decks with gangplank ramps,
   cannonballs, barrel and anchor posts, the ship's wheel and treasure-cave tubes.
   Each hole's `sol` is printed by `node scripts/solve.cjs --hole 5-N`; holes-check replays it. */
registerWorld(5, (() => {
  const BARREL = (x, z, r = 0.14) => ({ x, z, r, top: 0.26, look: 'barrel' });
  const BUMPER = (x, z) => ({ x, z, r: 0.14, top: 0.26, e: 1.15, look: 'barrel' });
  const ANCHOR = (x, z) => ({ x, z, r: 0.1, top: 0.3, look: 'anchor' });
  const CANNON = (ax, az, bx, bz, period, phase = 0) => ({ kind: 'slide', ax, az, bx, bz, r: 0.15, period, phase, look: 'cannon' });
  const BRIDGE = (ax, az, bx, bz, len, ang, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'bridge' });
  const WHEEL = (x, z, len, w, phase = 0) => ({ kind: 'spin', x, z, len, w, phase, blades: 2, look: 'wheel' });
  const sand = poly => ({ surf: 'sand', poly });
  const lagoon = poly => ({ surf: 'water', poly });
  return { holes: [
    /* 1 beach lane: up the sand, round the corner to the cup */
    { par: 2, tee: [0, 0.5], cup: [-1.7, 5.6], shape: [[-0.8, 0], [0.8, 0], [0.8, 6.4], [-2.4, 6.4], [-2.4, 4.8], [-0.8, 4.8]],
      zones: [sand(rect(-0.8, 1.8, 0.3, 2.6))], bumps: [{ x: -1.0, z: 5.6, r: 0.4, h: 0.12 }] },
    /* 2 drawbridge over the lagoon */
    { par: 3, tee: [0.6, 0.5], cup: [0.7, 5.5], shape: rect(-1.2, 0, 1.2, 6.2),
      zones: [lagoon(rect(-0.5, 2.6, 1.2, 3.6))],
      movers: [BRIDGE(-0.78, 2.35, -0.3, 2.35, 0.2, 90, 3.2)], bumps: [{ x: -0.5, z: 4.6, r: 0.45, h: 0.16 }], posts: [ANCHOR(1.0, 2.0)],
      inner: [[[0.2, 4.9], [1.2, 4.9]]] },
    /* 3 gangplank up to the deck, round the rail, back to the cup by the deck's edge */
    { par: 3, tee: [0, 0.5], cup: [-0.75, 4.35], aim0: 22, shape: rect(-1.4, 0, 1.4, 6.6),
      tiers: [{ poly: rect(-1.4, 3.6, 1.4, 6.6), h: 0.3 }], ramps: [{ x0: 0.5, z0: 2.4, x1: 1.1, z1: 3.6, axis: 'z', h0: 0, h1: 0.3 }],
      inner: [[[0, 3.6], [0, 5.1]], [[1.1, 3.6], [1.4, 3.6]]], posts: [BARREL(-0.7, 5.8)], zones: [sand(rect(-1.4, 1.0, -0.3, 2.4))] },
    /* 4 cannon alley */
    { par: 3, tee: [0, 0.5], cup: [0, 6.4], shape: rect(-1, 0, 1, 7),
      movers: [CANNON(-0.66, 2.6, 0.66, 2.6, 3), CANNON(0.66, 4.6, -0.66, 4.6, 3.6, 1)],
      bumps: [{ x: 0, z: 3.6, r: 0.4, h: 0.12 }], inner: [[[-0.4, 5.75], [0.4, 5.75]]] },
    /* 5 treasure cave: the long way round the rock, or the cave */
    { par: 3, tee: [1.2, 0.5], cup: [-1.2, 0.9], aim0: 0,
      shape: [[-1.8, 0], [-0.6, 0], [-0.6, 4.4], [0.6, 4.4], [0.6, 0], [1.8, 0], [1.8, 6], [-1.8, 6]],
      tubes: [{ a: [1.45, 3.4], b: [-1.2, 5.2], dir: 180 }], bumps: [{ x: 0, z: 5.3, r: 0.5, h: 0.2 }, { x: -1.0, z: 3.4, r: 0.4, h: 0.15 }],
      zones: [sand(rect(0.6, 2.9, 1.1, 3.9)), sand(rect(-1.8, 1.7, -1.05, 2.3)), sand(rect(-1.35, 2.3, -0.6, 2.9))], posts: [BARREL(-1.15, 1.65)] },
    /* 6 the ship's wheel guards the cup */
    { par: 3, tee: [0, 0.5], cup: [0.5, 5.7], shape: rect(-1.2, 0, 1.2, 6.5),
      movers: [WHEEL(0, 3.3, 0.55, 1.5)], posts: [BARREL(-0.55, 5.8)], inner: [[[0, 5.1], [0.75, 5.1]]],
      zones: [sand(rect(-1.2, 4.3, -0.2, 5.3)), sand(rect(0.9, 1.4, 1.2, 2.4))], bumps: [{ x: -0.7, z: 1.8, r: 0.5, h: 0.2 }] },
    /* 7 beach, gangplank, deck with a cannon, then off the stern down to the lagoon green */
    { par: 4, tee: [0, 0.5], cup: [-0.7, 8.4], aim0: 18, shape: [[-1.4, 0], [1.4, 0], [1.4, 3.4], [1.4, 6], [1.4, 9.2], [-1.4, 9.2], [-1.4, 6], [-1.4, 3.4]],
      tiers: [{ poly: rect(-1.4, 3.4, 1.4, 6), h: 0.35 }], ramps: [{ x0: 0.5, z0: 2.2, x1: 1.1, z1: 3.4, axis: 'z', h0: 0, h1: 0.35 }],
      inner: [[[-1.4, 3.4], [0.5, 3.4]], [[1.1, 3.4], [1.4, 3.4]], [[-1.4, 6], [-0.2, 6]]],
      movers: [CANNON(-0.9, 4.7, 0.9, 4.7, 2.6)], zones: [lagoon(rect(0.2, 7.3, 1.4, 9.2))],
      posts: [BARREL(-0.2, 7.9)], bumps: [{ x: -0.6, z: 7.0, r: 0.35, h: 0.12 }] },
    /* 8 dune sea: a pot bunker and big dunes */
    { par: 3, tee: [0, 0.5], cup: [-0.9, 6.4], shape: rect(-1.5, 0, 1.5, 7.2),
      bumps: [{ x: -0.6, z: 3.0, r: 0.45, h: -0.15 }, { x: 0.6, z: 2.4, r: 0.6, h: 0.3 }, { x: -0.3, z: 4.6, r: 0.7, h: 0.32 }, { x: 0.9, z: 5.3, r: 0.5, h: 0.25 }],
      zones: [sand(rect(-1.05, 2.55, -0.15, 3.45)), lagoon(rect(-1.5, 6.85, 0.3, 7.2))], posts: [BARREL(-0.75, 5.75)] },
    /* 9 the fort: two drawbridges over the moat, then the gangplank up to the fort */
    { par: 4, tee: [0, 0.5], cup: [0.9, 8.2], shape: [[-1.6, 0], [1.6, 0], [1.6, 6], [1.6, 9], [-1.6, 9], [-1.6, 6]],
      zones: [lagoon(rect(-1.6, 3, -1.2, 3.8)), lagoon(rect(-0.6, 3, 0.6, 3.8)), lagoon(rect(1.2, 3, 1.6, 3.8))],
      movers: [BRIDGE(-0.9, 2.75, -0.3, 2.75, 0.3, 90, 3), BRIDGE(0.9, 2.75, 0.3, 2.75, 0.3, 90, 3.6, 1.5)],
      tiers: [{ poly: rect(-1.6, 6, 1.6, 9), h: 0.3 }], ramps: [{ x0: -0.3, z0: 4.8, x1: 0.3, z1: 6, axis: 'z', h0: 0, h1: 0.3 }],
      inner: [[[-1.6, 6], [-0.3, 6]], [[0.3, 6], [1.6, 6]]], posts: [BARREL(0.3, 7.6), ANCHOR(-0.8, 7.4)] },
    /* 10 barrel bank: the whole green leans toward the lagoon; barrels bounce */
    { par: 3, tee: [0.3, 0.5], cup: [-0.2, 5.5], shape: rect(-1.5, 0, 1.5, 6.4),
      tiers: [{ poly: rect(-1.6, -0.1, 1.6, 6.5), h: 0.2, sx: 0.08 }],
      zones: [lagoon(rect(-1.5, 2.0, -0.95, 3.8))],
      posts: [BUMPER(0.6, 2.2), BUMPER(-0.4, 3.0), BUMPER(0.4, 3.9), BUMPER(-0.9, 4.3), BUMPER(0.95, 4.6), BARREL(-0.2, 4.8), BARREL(-0.78, 5.25), BARREL(0.38, 5.25)] },
    /* 11 smuggler's caves: zig-zag through the hideout, or find the cave on the dune */
    { par: 4, tee: [0, 0.6], cup: [1.2, 7.4], aim0: 30, shape: rect(-2, 0, 2, 8.4),
      inner: [[[-2, 2.8], [1.2, 2.8]], [[-1.2, 5.6], [2, 5.6]]],
      bumps: [{ x: 1.55, z: 5.05, r: 0.4, h: 0.16 }, { x: 0, z: 4.2, r: 0.5, h: 0.22 }],
      tubes: [{ a: [1.55, 5.05], b: [-1.5, 6.3], dir: 90 }],
      zones: [sand(rect(1.2, 3.3, 2, 4.3)), lagoon(rect(-2, 3.6, -1.3, 4.6)), sand(rect(0, 6.8, 0.6, 8.4))],
      posts: [BARREL(1.2, 6.6)] },
    /* 12 walk the plank or jump the lagoon off the gangplank */
    { par: 4, tee: [0, 0.5], cup: [-0.6, 8.6], shape: [[-1.4, 0], [1.4, 0], [1.4, 4.8], [1.4, 9.4], [-1.4, 9.4], [-1.4, 4.8]],
      ramps: [{ x0: -0.4, z0: 2.4, x1: 0.4, z1: 3.6, axis: 'z', h0: 0, h1: 0.25 }],
      zones: [lagoon(rect(-1.4, 3.6, 1.0, 4.8)), sand(rect(-1.4, 4.8, 1.0, 6.4))],
      bumps: [{ x: 0.4, z: 7.0, r: 0.5, h: 0.25 }], posts: [BARREL(-0.1, 7.8), ANCHOR(1.15, 6.6)] },
    /* 13 crow's nest: two gangplanks to the top deck, where the wheel turns */
    { par: 4, tee: [0, 0.6], cup: [-0.8, 7.35], aim0: 25,
      shape: [[-1.6, 0], [1.6, 0], [1.6, 3], [1.6, 5.6], [1.6, 8], [0, 8], [-1.6, 8], [-1.6, 5.6], [-1.6, 4.4], [-1.6, 3]],
      tiers: [{ poly: rect(-1.7, 3, 1.7, 8.1), h: 0.25 }, { poly: rect(-1.7, 5.6, 0, 8.1), h: 0.5 }],
      ramps: [{ x0: 1.0, z0: 1.8, x1: 1.6, z1: 3, axis: 'z', h0: 0, h1: 0.25 }, { x0: -1.6, z0: 4.4, x1: -1.0, z1: 5.6, axis: 'z', h0: 0.25, h1: 0.5 }],
      inner: [[[-1.6, 3], [1.0, 3]]], movers: [WHEEL(-0.8, 6.4, 0.4, 1.4)],
      posts: [BARREL(0.5, 4.3), BARREL(-0.3, 3.7)], zones: [sand(rect(0.3, 5.0, 1.6, 6.0))] },
    /* 14 cannon deck: dodge the cannonballs, down the gangplank or drop into the sand */
    { par: 4, tee: [0, 0.5], cup: [0.7, 8.1], shape: [[-1.4, 0], [1.4, 0], [1.4, 4.4], [1.4, 9], [-1.4, 9], [-1.4, 4.4]],
      tiers: [{ poly: rect(-1.5, -0.1, 1.5, 4.4), h: 0.35 }],
      ramps: [{ x0: -1.1, z0: 4.4, x1: -0.5, z1: 5.6, axis: 'z', h0: 0.35, h1: 0 }],
      inner: [[[-0.5, 4.4], [0.4, 4.4]]],
      movers: [CANNON(-0.9, 1.8, 0.9, 1.8, 2.4), CANNON(0.9, 3.2, -0.9, 3.2, 3.0, 1)],
      zones: [sand(rect(0.4, 4.4, 1.4, 5.6)), lagoon(rect(-1.4, 6.6, -0.2, 7.6))],
      posts: [ANCHOR(0.2, 7.6), ANCHOR(1.15, 7.4)] },
    /* 15 lagoon islands: drawbridge, then the cave or the plank to the last island */
    { par: 4, tee: [0, 0.5], cup: [0.6, 8.2], shape: [[-2, 0], [2, 0], [2, 4.5], [2, 9], [-2, 9], [-2, 4.5]],
      zones: [lagoon(rect(-2, 2.2, -0.3, 3.4)), lagoon(rect(0.3, 2.2, 2, 3.4)), lagoon(rect(-2, 5.6, 1.6, 6.6))],
      movers: [BRIDGE(0, 2.0, 0.9, 2.0, 0.3, 90, 3.4)],
      tubes: [{ a: [-1.2, 5.0], b: [-1.2, 7.1], dir: 0 }],
      bumps: [{ x: 0.5, z: 4.4, r: 0.5, h: 0.2 }], posts: [BARREL(0.2, 7.5)] },
    /* 16 the shipwreck: up the gangplank onto the listing wreck, through the hull or off the stern */
    { par: 5, tee: [0.8, 0.5], cup: [1.0, 9.1], aim0: 0, shape: [[-1.8, 0], [1.8, 0], [1.8, 3.2], [1.8, 7], [1.8, 10], [-1.8, 10], [-1.8, 7], [-1.8, 3.2]],
      tiers: [{ poly: rect(-1.9, 3.2, 1.9, 7), h: 0.3, sx: 0.06 }],
      ramps: [{ x0: 0.4, z0: 2.0, x1: 1.0, z1: 3.2, axis: 'z', h0: 0, h1: 0.34 }],
      inner: [[[-1.8, 3.2], [0.4, 3.2]], [[1.0, 3.2], [1.8, 3.2]]],
      posts: [BARREL(0.2, 4.5), BARREL(-0.6, 5.3), BARREL(0.9, 5.9), BARREL(-1.3, 6.3)],
      tubes: [{ a: [-1.2, 4.2], b: [-1.2, 8.0], dir: 0 }],
      zones: [lagoon(rect(-0.4, 8.6, 0.4, 10)), sand(rect(-1.8, 1.2, -0.6, 2.2))], bumps: [{ x: 0.3, z: 7.9, r: 0.4, h: 0.14 }] },
    /* 17 skull rock: over the dunes or through the skull's cave to the tilted green */
    { par: 4, tee: [0, 0.5], cup: [0.6, 8.2], shape: rect(-1.8, 0, 1.8, 9),
      tiers: [{ poly: rect(-1.9, 6.5, 1.9, 9.1), h: -0.325, sz: 0.05 }],
      bumps: [{ x: -0.9, z: 3.6, r: 0.6, h: 0.35 }, { x: 0.9, z: 3.6, r: 0.6, h: 0.35 }, { x: 0, z: 2.6, r: 0.35, h: 0.15 }, { x: 0, z: 5.0, r: 0.5, h: 0.2 }],
      tubes: [{ a: [1.4, 1.6], b: [-1.2, 6.0], dir: 30 }],
      zones: [sand(rect(-1.8, 5.2, -0.6, 6.2)), lagoon(rect(-1.8, 7.4, -0.8, 9))], posts: [ANCHOR(1.3, 7.6)] },
    /* 18 board the ship: gangplank up, past the wheel, down the hatch (or walk the plank and jump) to treasure island */
    { par: 5, tee: [0, 0.5], cup: [-0.8, 12.0], aim0: -20,
      shape: [[-2, 0], [2, 0], [2, 4], [2, 8.4], [2, 13], [-2, 13], [-2, 8.4], [-2, 4]],
      tiers: [{ poly: rect(-2.1, 4, 2.1, 8.4), h: 0.4 }, { poly: rect(-0.2, 8.4, 0.2, 9.2), h: 0.4 }],
      ramps: [{ x0: -1.4, z0: 2.6, x1: -0.8, z1: 4, axis: 'z', h0: 0, h1: 0.4 }],
      inner: [[[-2, 4], [-1.4, 4]], [[-0.8, 4], [2, 4]], [[-2, 8.4], [-0.2, 8.4]], [[0.2, 8.4], [2, 8.4]]],
      movers: [WHEEL(0.4, 5.6, 0.5, 1.3), CANNON(-1.5, 7.0, 0.4, 7.0, 2.8)],
      tubes: [{ a: [1.4, 7.6], b: [1.2, 10.6], dir: 0 }],
      zones: [lagoon(rect(-2, 8.4, -0.2, 9.8)), lagoon(rect(0.2, 8.4, 2, 9.8)), lagoon(rect(-0.2, 9.2, 0.2, 9.8)), sand(rect(0.4, 1.4, 2, 2.4))],
      bumps: [{ x: 0.8, z: 0.9, r: 0.5, h: 0.18 }, { x: 0.2, z: 11.4, r: 0.45, h: 0.16 }], posts: [ANCHOR(-0.2, 12.3), BARREL(1.4, 12.2)] },
  ] };
})());
