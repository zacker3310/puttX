/* world 5, course 25, pirate cove by moonlight: the masterpiece. The galleon and the smugglers'
   fort stacked in layers: decks over decks, chained treasure-cave tubes, switchback gangplanks and
   drawbridges guarding every drop. Each hole's `sol` is printed by `node scripts/solve.cjs --hole 25-N`. */
registerWorld(25, (() => {
  const BARREL = (x, z, r = 0.14) => ({ x, z, r, top: 0.26, look: 'barrel' });
  const ANCHOR = (x, z) => ({ x, z, r: 0.1, top: 0.3, look: 'anchor' });
  const CANNON = (ax, az, bx, bz, period, phase = 0) => ({ kind: 'slide', ax, az, bx, bz, r: 0.15, period, phase, look: 'cannon' });
  const BRIDGE = (ax, az, bx, bz, len, ang, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'bridge' });
  const WHEEL = (x, z, len, w, phase = 0) => ({ kind: 'spin', x, z, len, w, phase, blades: 2, look: 'wheel' });
  const sand = poly => ({ surf: 'sand', poly });
  const lagoon = poly => ({ surf: 'water', poly });
  return { holes: [
    /* 1 dock steps: up the gangplank to the moonlit dock */
    { par: 2, sol: [[332.5,0.82,0]], tee: [0.3, 0.5], cup: [0.5, 5.4], aim0: 340, shape: rect(-1, 0, 1, 6.4),
      ramps: [{ x0: -1, z0: 2.6, x1: -0.2, z1: 3.6, axis: 'z', h0: 0, h1: 0.2 }], tiers: [{ poly: rect(-1.1, 3.6, 1.1, 6.5), h: 0.2 }],
      inner: [[[-0.2, 3.6], [1, 3.6]]], zones: [sand(rect(0.2, 1.6, 1, 2.4))], bumps: [{ x: -0.4, z: 5.0, r: 0.4, h: 0.1 }] },
    /* 2 twin drawbridges over the moat, then the plank to the deck */
    { par: 3, sol: [[27,0.9,0]], tee: [0, 0.5], cup: [-0.7, 7.2], shape: rect(-1.4, 0, 1.4, 8),
      zones: [lagoon(rect(-0.7, 2.8, 0.7, 3.8))],
      movers: [BRIDGE(-0.98, 2.55, -0.5, 2.55, 0.2, 90, 3.0), BRIDGE(0.98, 2.55, 0.5, 2.55, 0.2, 90, 3.4, 1.4)],
      ramps: [{ x0: -0.4, z0: 4.8, x1: 0.4, z1: 5.8, axis: 'z', h0: 0, h1: 0.25 }], tiers: [{ poly: rect(-1.5, 5.8, 1.5, 8.1), h: 0.25 }],
      inner: [[[-1.4, 5.8], [-0.4, 5.8]], [[0.4, 5.8], [1.4, 5.8]]], bumps: [{ x: 0, z: 1.8, r: 0.45, h: 0.15 }, { x: 0.4, z: 7.0, r: 0.4, h: 0.12 }] },
    /* 3 cave lift: the cave or the plank up to the deck, then off its edge to the green */
    { par: 3, sol: [[27.5,0.77,0],[5,0.95,0]], tee: [0, 0.5], cup: [-0.8, 7.6], shape: rect(-1.6, 0, 1.6, 8.4),
      ramps: [{ x0: -1.6, z0: 2.0, x1: -1.0, z1: 3.2, axis: 'z', h0: 0, h1: 0.35 }], tiers: [{ poly: rect(-1.7, 3.2, 1.7, 5.6), h: 0.35 }],
      inner: [[[-1.0, 3.2], [1.6, 3.2]], [[-1.6, 5.6], [-0.2, 5.6]]],
      tubes: [{ a: [1.0, 2.2], b: [1.0, 4.0], dir: 330 }], movers: [CANNON(-1.0, 4.6, 0.4, 4.6, 2.6)],
      zones: [lagoon(rect(0.4, 7.0, 1.6, 8.4))], bumps: [{ x: 0.2, z: 6.6, r: 0.45, h: 0.14 }], posts: [BARREL(-0.3, 1.8)] },
    /* 4 switchback: two gangplanks, a cannon between them, barrels round the cup */
    { par: 3, sol: [[50,1,0],[10,0.41,0]], tee: [-0.6, 0.5], cup: [0.8, 7.8], aim0: 30, shape: rect(-1.6, 0, 1.6, 8.8),
      ramps: [{ x0: 0.9, z0: 1.6, x1: 1.6, z1: 2.8, axis: 'z', h0: 0, h1: 0.2 }, { x0: -1.6, z0: 4.4, x1: -0.9, z1: 5.6, axis: 'z', h0: 0.2, h1: 0.4 }],
      tiers: [{ poly: rect(-1.7, 2.8, 1.7, 8.9), h: 0.2 }, { poly: rect(-1.7, 5.6, 1.7, 8.9), h: 0.4 }],
      inner: [[[-1.6, 2.8], [0.9, 2.8]], [[-0.9, 5.6], [1.6, 5.6]]],
      movers: [CANNON(-0.6, 4.0, 0.9, 4.0, 2.4)], posts: [BARREL(0.2, 7.4), BARREL(1.2, 7.0), ANCHOR(-1.2, 7.8)],
      zones: [sand(rect(-1.6, 1.2, -0.4, 2.0))] },
    /* 5 the rum barrel run: up the chute, the cave to the top deck, down the long plank, the second cave, over the dune into the bowl */
    { par: 3, auto: true, sol: [[0, 0.8, 0]], tee: [0, 0.5], cup: [-1.65, 7.4], aim0: 0, shape: rect(-2.2, 0, 0.2, 9),
      inner: [[[-0.2, 0], [-0.2, 4.8], [0.2, 4.8]], [[-1.1, 0], [-1.1, 9]], [[-0.4, 9], [-0.4, 0.8], [-1.1, 0.8]]],
      ramps: [{ x0: -0.2, z0: 1.6, x1: 0.2, z1: 3.0, axis: 'z', h0: 0, h1: 0.3 }, { x0: -1.1, z0: 4.2, x1: -0.4, z1: 7.0, axis: 'z', h0: 0, h1: 0.35 }],
      tiers: [{ poly: rect(-0.2, 3.0, 0.2, 4.8), h: 0.3 }, { poly: rect(-1.1, 7.0, -0.4, 9.0), h: 0.35 }],
      tubes: [{ a: [0, 4.3], b: [-0.75, 8.4], dir: 180, keep: 0, add: 1.8 }, { a: [-0.75, 3.4], b: [-1.65, 1.2], dir: 0, keep: 0, add: 2.6 }],
      zones: [lagoon(rect(-0.38, 0.1, -0.22, 8.9)), lagoon(rect(-0.18, 4.9, 0.18, 8.9)), lagoon(rect(-1.08, 0.1, -0.42, 0.7))],
      bumps: [{ x: -1.65, z: 7.4, r: 0.5, h: -0.1 }, { x: -1.65, z: 4.2, r: 0.4, h: 0.08 }] },
    /* 6 gun deck: through the drawbridge off the deck, past the cannon on the green */
    { par: 3, sol: [[318,1,0]], tee: [0, 0.5], cup: [0.6, 7.4], shape: rect(-1.4, 0, 1.4, 8),
      tiers: [{ poly: rect(-1.5, -0.1, 1.5, 3.4), h: 0.35 }],
      inner: [[[-1.4, 3.4], [-0.5, 3.4]], [[0.5, 3.4], [1.4, 3.4]]],
      movers: [BRIDGE(-0.25, 3.15, 0.25, 3.15, 0.25, 90, 2.8), CANNON(-0.9, 5.2, 0.9, 5.2, 2.6)],
      zones: [lagoon(rect(-1.4, 6.4, -0.3, 7.2)), sand(rect(0.5, 3.8, 1.4, 4.4))], posts: [BARREL(-0.7, 1.6), BARREL(0.7, 1.6)], bumps: [{ x: 0.0, z: 6.6, r: 0.4, h: 0.12 }] },
    /* 7 three islands: two rail-less planks with a drawbridge on the second, or the cave */
    { par: 4, sol: [[3,0.9,0],[0,0.1,0]], tee: [0, 0.5], cup: [-0.6, 9.6], aim0: 0,
      floors: [rect(-1.2, 0, 1.2, 2.6), rect(-0.3, 2.5, 0.3, 4.5), rect(-1.4, 4.4, 1.4, 6.8), rect(-1.2, 6.7, -0.6, 8.3), rect(-1.4, 8.2, 1.2, 10.4)],
      walls: [[[-0.3, 2.6], [-1.2, 2.6], [-1.2, 0], [1.2, 0], [1.2, 2.6], [0.3, 2.6]],
        [[-0.3, 4.4], [-1.4, 4.4], [-1.4, 6.8], [-1.2, 6.8]], [[-0.6, 6.8], [1.4, 6.8], [1.4, 4.4], [0.3, 4.4]],
        [[-1.2, 8.2], [-1.4, 8.2], [-1.4, 10.4], [1.2, 10.4], [1.2, 8.2], [-0.6, 8.2]]],
      movers: [BRIDGE(-0.9, 6.3, -0.2, 6.3, 0.2, 90, 3.0)],
      tubes: [{ a: [1.0, 5.6], b: [0.8, 9.0], dir: 270 }],
      bumps: [{ x: -0.2, z: 5.4, r: 0.45, h: 0.15 }], zones: [sand(rect(0.2, 9.6, 1.2, 10.4))], posts: [BARREL(0.6, 1.4)] },
    /* 8 the fort: two gangplanks to the battlements, then the cave or the guarded drop to the cellar green */
    { par: 4, sol: [[150,1,0],[309,0.8,0],[54,0.8,0]], tee: [-0.6, 0.5], cup: [-0.8, 9.4], aim0: 30, shape: rect(-1.6, 0, 1.6, 10.2),
      ramps: [{ x0: 0.9, z0: 1.8, x1: 1.6, z1: 3, axis: 'z', h0: 0, h1: 0.2 }, { x0: -1.6, z0: 4.4, x1: -0.9, z1: 5.6, axis: 'z', h0: 0.2, h1: 0.4 }],
      tiers: [{ poly: rect(-1.7, 3, 1.7, 8.2), h: 0.2 }, { poly: rect(-1.7, 5.6, 1.7, 8.2), h: 0.4 }],
      inner: [[[-1.6, 3], [0.9, 3]], [[-0.9, 5.6], [1.6, 5.6]], [[-1.6, 8.2], [0.4, 8.2]], [[1.2, 8.2], [1.6, 8.2]]],
      movers: [BRIDGE(0.6, 7.95, 1.0, 7.95, 0.2, 90, 2.6)],
      tubes: [{ a: [-1.2, 7.4], b: [0.9, 9.3], dir: 270, keep: 0.5 }],
      posts: [BARREL(-0.2, 4.2), BARREL(0.3, 6.6)], zones: [lagoon(rect(-0.2, 9.8, 0.6, 10.2)), sand(rect(-1.6, 1.4, -0.8, 2.2))], bumps: [{ x: 0.0, z: 9.0, r: 0.35, h: 0.1 }] },
    /* 9 twin wheels and the moat: the beach wheel, the plank, the deck wheel, the drawbridge */
    { par: 3, sol: [[26.5,0.96,0]], tee: [0, 0.5], cup: [0.7, 7.4], shape: rect(-1.4, 0, 1.4, 8.2),
      movers: [WHEEL(0, 2.0, 0.5, 1.4), WHEEL(-0.6, 5.4, 0.45, -1.7), BRIDGE(0.2, 6.55, 0.8, 6.55, 0.2, 90, 3.2)],
      ramps: [{ x0: -0.5, z0: 3, x1: 0.5, z1: 4, axis: 'z', h0: 0, h1: 0.25 }], tiers: [{ poly: rect(-1.5, 4, 1.5, 8.3), h: 0.25 }],
      inner: [[[-1.4, 4], [-0.5, 4]], [[0.5, 4], [1.4, 4]], [[-1.4, 6.8], [0.0, 6.8]]],
      zones: [lagoon(rect(-1.4, 6.9, -0.2, 8.2)), sand(rect(0.7, 4.4, 1.4, 5.2))], bumps: [{ x: 0.9, z: 3.0, r: 0.4, h: 0.15 }] },
    /* 10 smugglers' relay: four chambers, three caves, every gap guarded */
    { par: 4, crazy: true, sol: [], tee: [0, 0.5], cup: [0.9, 8.8], aim0: 30, shape: rect(-1.8, 0, 1.8, 9.6),
      inner: [[[-1.8, 2.4], [1.1, 2.4]], [[-1.1, 4.8], [1.8, 4.8]], [[-1.8, 7.2], [1.1, 7.2]]],
      tubes: [{ a: [-1.2, 1.7], b: [-1.2, 3.2], dir: 90 }, { a: [1.2, 4.1], b: [1.2, 5.6], dir: 270 }, { a: [-1.2, 6.5], b: [-1.2, 8.0], dir: 90 }],
      movers: [CANNON(1.45, 2.0, 1.45, 3.0, 2.4), CANNON(-1.45, 4.4, -1.45, 5.3, 2.8, 1)],
      bumps: [{ x: 0.2, z: 1.4, r: 0.5, h: 0.18 }, { x: 0, z: 3.6, r: 0.5, h: 0.2 }, { x: 0.2, z: 6.0, r: 0.5, h: 0.2 }],
      zones: [lagoon(rect(1.1, 6.6, 1.8, 7.8)), sand(rect(-1.8, 8.6, -0.8, 9.6))], posts: [BARREL(0.0, 8.6)] },
    /* 11 zig-zag rigging: three gangplanks up three decks to the crow's nest */
    { par: 4, sol: [], tee: [0, 0.5], cup: [0.8, 9.8], aim0: 25, shape: rect(-1.6, 0, 1.6, 10.6),
      ramps: [{ x0: 0.9, z0: 1.6, x1: 1.6, z1: 2.8, axis: 'z', h0: 0, h1: 0.14 }, { x0: -1.6, z0: 4.2, x1: -0.9, z1: 5.4, axis: 'z', h0: 0.14, h1: 0.28 },
        { x0: 0.9, z0: 6.8, x1: 1.6, z1: 8.0, axis: 'z', h0: 0.28, h1: 0.42 }],
      tiers: [{ poly: rect(-1.7, 2.8, 1.7, 10.7), h: 0.14 }, { poly: rect(-1.7, 5.4, 1.7, 10.7), h: 0.28 }, { poly: rect(-1.7, 8.0, 1.7, 10.7), h: 0.42 }],
      inner: [[[-1.6, 2.8], [0.9, 2.8]], [[-0.9, 5.4], [1.6, 5.4]], [[-1.6, 8.0], [0.9, 8.0]]],
      movers: [CANNON(-0.9, 3.9, 0.6, 3.9, 2.4), CANNON(0.9, 6.4, -0.6, 6.4, 2.8, 1)],
      posts: [BARREL(-0.4, 9.4), ANCHOR(1.2, 1.0)], zones: [sand(rect(-1.6, 9.8, -0.6, 10.6))], bumps: [{ x: 0.2, z: 9.2, r: 0.35, h: 0.08 }] },
    /* 12 the listing wreck: up the plank, round the wheel, then the hull cave or the guarded stern */
    { par: 4, sol: [[0,1,0],[75,0.85,0]], tee: [0.8, 0.5], cup: [-1.0, 9.2], aim0: 0, shape: rect(-1.8, 0, 1.8, 10),
      ramps: [{ x0: 0.4, z0: 2.0, x1: 1.0, z1: 3.2, axis: 'z', h0: 0, h1: 0.34 }],
      tiers: [{ poly: rect(-1.9, 3.2, 1.9, 7), h: 0.3, sx: 0.06 }],
      inner: [[[-1.8, 3.2], [0.4, 3.2]], [[1.0, 3.2], [1.8, 3.2]], [[-1.8, 7], [-0.5, 7]], [[0.5, 7], [1.8, 7]]],
      movers: [WHEEL(-0.2, 5.0, 0.45, 1.4), BRIDGE(-0.25, 6.75, 0.25, 6.75, 0.25, 90, 2.6)],
      tubes: [{ a: [1.3, 4.0], b: [1.2, 8.2], dir: 0 }],
      posts: [BARREL(-1.2, 4.2), BARREL(1.0, 6.2), BARREL(-1.2, 6.2)],
      zones: [lagoon(rect(-0.4, 8.6, 0.4, 10)), sand(rect(0.6, 1.2, 1.8, 2.0))], bumps: [{ x: -0.2, z: 7.9, r: 0.4, h: 0.14 }] },
    /* 13 the kraken's deck: up the long plank or the cave, between two wheels, through the drawbridge and down */
    { par: 4, crazy: true, sol: [[9,0.95,0],[33,0.9,0]], tee: [0.4, 0.5], cup: [0.3, 8.4], aim0: 0, shape: rect(-1.8, 0, 1.8, 9.2),
      ramps: [{ x0: -1.8, z0: 1.4, x1: -1.2, z1: 5.0, axis: 'z', h0: 0, h1: 0.4 }],
      tiers: [{ poly: rect(-1.2, 3.4, 1.9, 7.0), h: 0.4 }, { poly: rect(-1.9, 5.0, -1.2, 7.0), h: 0.4 }],
      inner: [[[-1.2, 1.4], [-1.2, 3.4], [1.8, 3.4]], [[-1.8, 7.0], [-0.2, 7.0]], [[0.8, 7.0], [1.8, 7.0]]],
      tubes: [{ a: [1.1, 2.4], b: [1.1, 4.0], dir: 0 }],
      movers: [BRIDGE(0.05, 6.75, 0.55, 6.75, 0.25, 90, 3.0), WHEEL(-0.5, 4.9, 0.4, 1.3), WHEEL(0.75, 5.4, 0.4, -1.5)],
      zones: [lagoon(rect(-1.8, 8.4, -0.6, 9.2)), sand(rect(0.6, 0.9, 1.8, 1.5))],
      bumps: [{ x: -0.5, z: 1.6, r: 0.45, h: 0.18 }, { x: 1.2, z: 8.2, r: 0.4, h: 0.12 }], posts: [BARREL(1.5, 6.5)] },
    /* 14 the cascade: two drawbridges off the top deck, the cannon deck, a guarded drop, the vault */
    { par: 4, sol: [[318,0.95,0],[0,0.65,0]], tee: [0, 0.5], cup: [-0.8, 9.4], shape: rect(-1.6, 0, 1.6, 10.2),
      tiers: [{ poly: rect(-1.7, -0.1, 1.7, 3), h: 0.4 }, { poly: rect(-1.7, 3, 1.7, 6.2), h: 0.2 }],
      inner: [[[-1.6, 3], [-1.2, 3]], [[-0.6, 3], [0.6, 3]], [[1.2, 3], [1.6, 3]], [[-1.6, 6.2], [-0.5, 6.2]], [[0.5, 6.2], [1.6, 6.2]]],
      movers: [BRIDGE(-1.15, 2.75, -0.65, 2.75, 0.2, 90, 3.0), BRIDGE(1.15, 2.75, 0.65, 2.75, 0.2, 90, 3.4, 1.5), CANNON(-1.0, 4.4, 1.0, 4.4, 2.4),
        BRIDGE(-0.25, 5.95, 0.25, 5.95, 0.25, 90, 2.8, 0.7)],
      tubes: [{ a: [1.15, 5.6], b: [1.0, 7.4], dir: 0 }],
      zones: [lagoon(rect(0.3, 8.8, 1.6, 10.2)), sand(rect(-1.6, 7.2, -0.6, 7.8))],
      bumps: [{ x: -0.1, z: 8.2, r: 0.4, h: 0.14 }], posts: [BARREL(-0.4, 1.6), ANCHOR(-1.1, 5.4)] },
    /* 15 the rigging: floating decks joined by rail-less planks; the cave skips the middle */
    { par: 4, crazy: true, sol: [[20,0.32,0],[5,0.45,0]], tee: [0, 0.5], cup: [1.0, 9.6], aim0: 0,
      floors: [rect(-1.0, 0, 1.0, 2.4), rect(-0.95, 2.3, -0.45, 4.1), rect(-1.6, 4.0, 0.4, 5.8), rect(0.3, 5.0, 1.6, 5.6), rect(1.0, 5.5, 1.6, 7.6), rect(-0.4, 7.5, 1.8, 10.4)],
      walls: [[[-0.45, 2.4], [1.0, 2.4], [1.0, 0], [-1.0, 0], [-1.0, 2.4], [-0.95, 2.4]],
        [[-0.95, 4.0], [-1.6, 4.0], [-1.6, 5.8], [0.4, 5.8], [0.4, 5.6]], [[0.4, 5.0], [0.4, 4.0], [-0.45, 4.0]],
        [[1.0, 7.5], [-0.4, 7.5], [-0.4, 10.4], [1.8, 10.4], [1.8, 7.5], [1.6, 7.5]]],
      tubes: [{ a: [0.6, 1.8], b: [0.2, 8.4], dir: 90 }],
      zones: [sand(rect(-1.6, 5.2, -0.9, 5.8))], bumps: [{ x: -0.6, z: 5.0, r: 0.4, h: 0.12 }, { x: 1.2, z: 8.6, r: 0.35, h: 0.1 }], posts: [BARREL(-0.4, 1.2)] },
    /* 16 cannon fort: three cannons on the ramparts, a cave out of the powder room, the gate to the green */
    { par: 4, sol: [[228,0.8,0],[6,0.4,0]], tee: [0, 0.5], cup: [0.7, 9.0], shape: rect(-1.6, 0, 1.6, 9.8),
      tiers: [{ poly: rect(-1.7, -0.1, 1.7, 4.6), h: 0.35 }, { poly: rect(-1.7, 4.6, 1.7, 7.2), h: 0.15 }],
      ramps: [{ x0: -1.2, z0: 7.2, x1: -0.5, z1: 8.2, axis: 'z', h0: 0.15, h1: 0 }],
      inner: [[[-1.6, 4.6], [-0.4, 4.6]], [[0.4, 4.6], [1.6, 4.6]], [[-1.6, 7.2], [-1.2, 7.2]], [[-0.5, 7.2], [1.6, 7.2]]],
      movers: [CANNON(-1.0, 1.8, 1.0, 1.8, 2.4), CANNON(1.0, 3.2, -1.0, 3.2, 2.8, 1), CANNON(-1.0, 5.9, 1.0, 5.9, 2.2, 2), BRIDGE(-0.25, 4.35, 0.25, 4.35, 0.15, 90, 2.6)],
      tubes: [{ a: [1.25, 6.6], b: [1.1, 8.0], dir: 0 }],
      zones: [lagoon(rect(-1.6, 8.6, -0.2, 9.4)), sand(rect(0.0, 8.0, 0.6, 8.6))], posts: [ANCHOR(1.3, 9.4)] },
    /* 17 the plank coaster: down the gun-deck chute, through two caves and a switchback into the treasure bowl */
    { par: 4, auto: true, sol: [[0, 0.5, 0]], tee: [0, 0.5], cup: [-1.95, 7.6], aim0: 0, shape: rect(-2.5, 0, 0.3, 9),
      tiers: [{ poly: rect(-0.3, 0, 0.3, 2.0), h: 0.4 }, { poly: rect(-1.4, 7.6, -0.6, 9), h: 0.3 }],
      ramps: [{ x0: -0.3, z0: 2.0, x1: 0.3, z1: 5.2, axis: 'z', h0: 0.4, h1: 0 }, { x0: -1.4, z0: 4.4, x1: -0.6, z1: 7.6, axis: 'z', h0: 0, h1: 0.3 }],
      inner: [[[-0.3, 0], [-0.3, 7.0], [0.3, 7.0]], [[-0.6, 0], [-0.6, 9]], [[-1.4, 9], [-1.4, 0.8], [-0.6, 0.8]]],
      tubes: [{ a: [0, 5.8], b: [-1.0, 8.4], dir: 180, keep: 0, add: 1.8 }, { a: [-1.0, 4.1], b: [-1.95, 1.2], dir: 0, keep: 0, add: 3.0 }],
      zones: [lagoon(rect(-0.58, 0.1, -0.32, 8.9)), lagoon(rect(-0.28, 7.1, 0.28, 8.9)), lagoon(rect(-1.38, 0.1, -0.62, 0.7)), sand(rect(-2.5, 4.4, -1.4, 4.6))],
      bumps: [{ x: -1.95, z: 7.6, r: 0.45, h: -0.1 }, { x: -1.95, z: 3.4, r: 0.4, h: 0.1 }] },
    /* 18 the galleon: gangplank, the main deck's wheel and cannon, the quarterdeck's drawbridge, then walk the plank or the cave to treasure island */
    { par: 5, crazy: true, sol: [], tee: [0, 0.5], cup: [-0.6, 12.0], aim0: -20, shape: rect(-2, 0, 2, 13),
      ramps: [{ x0: -2, z0: 2.4, x1: -1.3, z1: 3.6, axis: 'z', h0: 0, h1: 0.25 }, { x0: 1.3, z0: 6.4, x1: 2, z1: 7.6, axis: 'z', h0: 0.25, h1: 0.44 }],
      tiers: [{ poly: rect(-2.1, 3.6, 2.1, 9), h: 0.25 }, { poly: rect(-2.1, 7.6, 2.1, 9), h: 0.44 }, { poly: rect(-0.2, 9, 0.2, 10), h: 0.44 }],
      inner: [[[-1.3, 3.6], [2, 3.6]], [[-2, 7.6], [1.3, 7.6]], [[-2, 9], [-0.2, 9]], [[0.2, 9], [2, 9]]],
      movers: [WHEEL(0.4, 5.0, 0.5, 1.3), CANNON(-1.5, 6.6, 0.3, 6.6, 2.8), BRIDGE(-0.5, 8.75, 0.5, 8.75, 0.2, 90, 2.8)],
      tubes: [{ a: [-1.5, 8.2], b: [1.2, 10.6], dir: 0 }, { a: [1.6, 1.6], b: [-1.6, 4.4], dir: 90 }],
      zones: [lagoon(rect(-2, 9, -0.2, 10)), lagoon(rect(0.2, 9, 2, 10)), sand(rect(0.2, 2.6, 1.2, 3.4))],
      bumps: [{ x: 0.6, z: 1.6, r: 0.5, h: 0.18 }, { x: 0.3, z: 11.4, r: 0.45, h: 0.16 }], posts: [ANCHOR(-0.2, 12.4), BARREL(1.4, 12.2)] },
  ] };
})());
