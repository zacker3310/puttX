/* world 6, course 16: the lava tubes. Same volcano, more going on: decks that drop to lower greens,
   crater mouths that feed tubes to other decks, boulders and basalt gates guarding the drops.
   Crater cups: a cone plus a narrower bowl at one spot leaves a flat floor for the cup. */
const V16_CRATER = (x, z, k = 1) => [{ x, z, r: 1.1 * k, h: 0.32 }, { x, z, r: 0.55 * k, h: -0.2 }];
const V16_LAVA = poly => ({ surf: 'water', poly });
const V16_MUD = poly => ({ surf: 'mud', poly });
const V16_COL = (x, z, r = 0.12) => ({ x, z, r, top: 0.3, look: 'basalt' });
const V16_ROCK = (ax, az, bx, bz, period, phase = 0, r = 0.18) => ({ kind: 'slide', ax, az, bx, bz, r, period, phase, look: 'boulder' });
registerWorld(16, { holes: [
  /* 1: cinder cone, then the crater cup (2 parts) */
  { par: 2, sol: [[4.3,0.78,0]], tee: [0, 0.5], cup: [0.4, 5.8], shape: rect(-1, 0, 1, 7),
    bumps: [{ x: -0.2, z: 3, r: 0.6, h: 0.28 }, ...V16_CRATER(0.4, 5.8, 0.9)],
    zones: [V16_LAVA(rect(-1, 6.75, 1, 7)), V16_MUD(rect(0.35, 2.4, 1, 3.2))] },
  /* 2: off the ash deck through the gap, over the creek bridge (3 parts) */
  { par: 3, sol: [[29.8,0.98,0]], tee: [-0.5, 0.6], cup: [-0.5, 6.6], aim0: 15, shape: rect(-1.2, 0, 1.2, 7.6),
    inner: [[[-1.2, 2.6], [0.3, 2.6]]],
    tiers: [{ poly: rect(-1.3, -0.1, 1.3, 2.6), h: 0.3 }],
    bumps: [...V16_CRATER(-0.5, 6.6, 0.85)],
    zones: [V16_LAVA(rect(-1.2, 4.3, 0.45, 4.9)), V16_MUD(rect(0.45, 5.2, 1.2, 5.7)), V16_LAVA(rect(0.5, 7.2, 1.2, 7.6))] },
  /* 3: crater feeder: the tube behind the wall, or round through the gap (3 parts) */
  { par: 3, sol: [[353.5,0.8,0]], tee: [0, 0.5], cup: [-0.7, 6.6], aim0: 0, shape: rect(-1.4, 0, 1.4, 7.6),
    inner: [[[-0.6, 3.8], [1.4, 3.8]]],
    bumps: [...V16_CRATER(0.6, 2.3, 0.8), ...V16_CRATER(-0.7, 6.6, 0.85)],
    tubes: [{ a: [0.6, 2.3], b: [0.9, 4.4], dir: 330 }],
    zones: [V16_LAVA(rect(-1.4, 2.2, -0.9, 3.3)), V16_MUD(rect(0.3, 5.3, 1.4, 5.9)), V16_LAVA(rect(0.5, 7.2, 1.4, 7.6))] },
  /* 4: up the ramp to the crater shelf (3 parts) */
  { par: 3, sol: [[0,0.76,0],[12.8,0.4,0]], tee: [0, 0.5], cup: [0.3, 6.6], shape: rect(-1.2, 0, 1.2, 7.8),
    ramps: [{ x0: -0.5, z0: 3, x1: 0.5, z1: 4.2, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-1.3, 4.2, 1.3, 7.9), h: 0.3 }],
    inner: [[[-1.2, 4.2], [-0.5, 4.2]], [[0.5, 4.2], [1.2, 4.2]]],
    bumps: [{ x: 0, z: 1.8, r: 0.5, h: 0.2 }, ...V16_CRATER(0.3, 6.6, 0.85)],
    zones: [V16_MUD(rect(-1.2, 4.7, -0.4, 5.3)), V16_LAVA(rect(-1.2, 7.4, 1.2, 7.8))] },
  /* 5: two boulders roll across the bridge to the crater (3 parts) */
  { par: 3, sol: [[357,0.84,0]], tee: [0, 0.5], cup: [-0.4, 7], shape: rect(-1.3, 0, 1.3, 8),
    movers: [V16_ROCK(-0.9, 3, 0.9, 3, 2.4), V16_ROCK(0.9, 4.6, -0.9, 4.6, 2.8, 1)],
    bumps: [...V16_CRATER(-0.4, 7, 0.85)],
    zones: [V16_LAVA(rect(-1.3, 2.4, -1.05, 5.2)), V16_LAVA(rect(1.05, 2.4, 1.3, 5.2)), V16_MUD(rect(0.4, 5.7, 1.3, 6.3)), V16_LAVA(rect(-1.3, 7.75, 1.3, 8))] },
  /* 6: dogleg off the deck: drop down the side chute, past the boulder, into the crater (3 parts) */
  { par: 3, sol: [[28,1,0]], tee: [0, 0.5], cup: [-2.8, 5.2], aim0: 0,
    shape: [[-0.7, 0], [0.7, 0], [0.7, 6], [-3.6, 6], [-3.6, 4.2], [-0.7, 4.2]],
    tiers: [{ poly: rect(-0.8, -0.1, 0.8, 3.4), h: 0.25 }],
    ramps: [{ x0: -0.7, z0: 3.4, x1: 0.7, z1: 4.4, axis: 'z', h0: 0.25, h1: 0 }],
    bumps: [{ x: 0, z: 5.2, r: 0.5, h: 0.25 }, ...V16_CRATER(-2.8, 5.2, 0.8)],
    movers: [V16_ROCK(-1.6, 4.58, -1.6, 5.62, 2.4)],
    zones: [V16_LAVA(rect(-2.3, 5.65, -1.9, 6))] },
  /* 7: basalt columns on the tilted shelf, or the crater tube past them (3 parts) */
  { par: 3, sol: [[4.4,0.74,0]], tee: [0, 0.5], cup: [0.5, 7], aim0: 0, shape: rect(-1.4, 0, 1.4, 8),
    tiers: [{ poly: rect(-1.5, -0.1, 1.5, 8.1), h: 0.1, sx: -0.04, sz: 0.01 }],
    bumps: [...V16_CRATER(-0.8, 1.9, 0.75)],
    tubes: [{ a: [-0.8, 1.9], b: [-0.9, 5.5], dir: 30 }],
    posts: [V16_COL(-0.3, 2.8), V16_COL(0.3, 2.8), V16_COL(0.9, 2.8), V16_COL(0, 3.8), V16_COL(0.6, 3.8), V16_COL(-0.6, 3.8),
      V16_COL(-0.3, 4.8), V16_COL(0.3, 4.8), V16_COL(0.9, 4.8), V16_COL(0.15, 6.3), V16_COL(0.85, 6.3)],
    zones: [V16_LAVA(rect(-1.4, 7.4, 0, 8)), V16_MUD(rect(-1.4, 6, -0.6, 6.7))] },
  /* 8: lava falls: three decks stepping down, a boulder on the middle one (crazy, 3 parts) */
  { par: 4, crazy: true, sol: [[5.6,0.52,0],[318.1,0.74,0]], tee: [0, 0.5], cup: [0.6, 8.4], shape: rect(-1.2, 0, 1.2, 9.2),
    inner: [[[-1.2, 2.8], [0.1, 2.8]], [[0.7, 2.8], [1.2, 2.8]], [[-0.6, 5.8], [1.2, 5.8]]],
    tiers: [{ poly: rect(-1.4, -0.2, 1.4, 2.8), h: 0.44 }, { poly: rect(-1.4, 2.8, 1.4, 5.8), h: 0.22 }],
    movers: [V16_ROCK(-0.8, 4.2, 0.8, 4.2, 2.6)],
    posts: [V16_COL(0.2, 7.8), V16_COL(1.0, 7.8)],
    zones: [V16_LAVA(rect(-1.2, 3.2, -0.6, 3.7)), V16_LAVA(rect(-1.2, 8.8, -0.2, 9.2)), V16_MUD(rect(0.6, 5, 1.2, 5.6))] },
  /* 9: the lava tube express: down the chute, into the crater, out on the far deck and down into the bowl (auto) */
  { par: 3, auto: true, sol: [[0, 0.9, 0]], tee: [0, 0.5], cup: [1.9, 1.2], aim0: 0,
    shape: [[-0.4, 0], [0.4, 0], [0.4, 5.8], [1.5, 5.8], [1.5, 0.2], [2.3, 0.2], [2.3, 6.4], [-0.4, 6.4]],
    tiers: [{ poly: rect(-0.5, -0.1, 0.45, 1.6), h: 0.3 }, { poly: rect(1.45, 4.2, 2.4, 6.5), h: 0.3 }],
    ramps: [{ x0: -0.4, z0: 1.6, x1: 0.4, z1: 3.2, axis: 'z', h0: 0.3, h1: 0 }, { x0: 1.5, z0: 2.4, x1: 2.3, z1: 4.2, axis: 'z', h0: 0, h1: 0.3 }],
    bumps: [{ x: 0, z: 5.2, r: 0.55, h: -0.18 }, { x: 1.9, z: 1.2, r: 0.7, h: -0.18 }],
    tubes: [{ a: [0, 5.2], b: [1.9, 5.3], dir: 180 }] },
  /* 10: two craters on the plateau: the left tube drops by the cup, the right one sends you back (3 parts) */
  { par: 3, sol: [[20.1,0.86,0],[347.5,0.84,0]], tee: [0, 0.5], cup: [-0.6, 8.2], aim0: 0, shape: rect(-1.5, 0, 1.5, 9),
    ramps: [{ x0: -1.5, z0: 1.6, x1: 1.5, z1: 2.6, axis: 'z', h0: 0, h1: 0.24 }],
    tiers: [{ poly: rect(-1.6, 2.6, 1.6, 5.4), h: 0.24 }],
    inner: [[[-1.5, 5.4], [-0.2, 5.4]], [[0.5, 5.4], [1.5, 5.4]]],
    bumps: [...V16_CRATER(0.8, 4, 0.75), ...V16_CRATER(-0.8, 4, 0.75), ...V16_CRATER(-0.6, 8.2, 0.85)],
    tubes: [{ a: [0.8, 4], b: [0.9, 6.6], dir: 330 }, { a: [-0.8, 4], b: [-1, 0.6], dir: 20 }],
    zones: [V16_LAVA(rect(-1.5, 6.6, -0.4, 7.1)), V16_LAVA(rect(0.4, 8.7, 1.5, 9))] },
  /* 11: switchback up the flank: three legs, two ramps, a basalt gate on the top leg (3 parts) */
  { par: 4, sol: [[30.3,0.64,0],[298.3,0.84,0],[86.4,0.84,0]], tee: [0, 0.5], cup: [1.2, 7.3], shape: rect(-1.8, 0, 1.8, 8.2),
    inner: [[[-1.8, 2.7], [1, 2.7]], [[-1, 5.4], [1.8, 5.4]]],
    tiers: [{ poly: rect(-1.9, 2.7, 1.9, 5.4), h: 0.2 }, { poly: rect(-1.9, 5.4, 1.9, 8.3), h: 0.4 }],
    ramps: [{ x0: 1, z0: 2.2, x1: 1.8, z1: 3.2, axis: 'z', h0: 0, h1: 0.2 }, { x0: -1.8, z0: 4.9, x1: -1, z1: 5.9, axis: 'z', h0: 0.2, h1: 0.4 }],
    movers: [{ kind: 'gate', ax: -0.2, az: 7.2, bx: -0.2, bz: 6.4, len: 0.35, ang: 0, period: 3, look: 'basalt' }],
    bumps: [{ x: 0, z: 4, r: 0.5, h: 0.22 }],
    zones: [V16_LAVA(rect(-1.8, 0, -1.2, 1.2)), V16_MUD(rect(-0.6, 2.75, -0.2, 5.35)), V16_LAVA(rect(0.4, 7.85, 1.8, 8.2))] },
  /* 12: island crater: a narrow causeway straight over the moat, or the long bridge round (3 parts) */
  { par: 3, sol: [[0,0.76,0]], tee: [0, 0.5], cup: [0, 6.6], shape: rect(-2, 0, 2, 8.6),
    bumps: [...V16_CRATER(0, 6.6, 0.9)],
    zones: [V16_LAVA(rect(-2, 3.8, -0.3, 4.6)), V16_LAVA(rect(0.3, 3.8, 1.3, 4.6)), V16_LAVA(rect(-2, 4.6, -1.3, 8.6)),
      V16_LAVA(rect(1.3, 4.6, 2, 8.6)), V16_MUD(rect(-1.3, 7.8, 1.3, 8.6))] },
  /* 13: lava jumps: two kickers over two rivers to the crater green (crazy, 3 parts) */
  { par: 4, crazy: true, sol: [[18,0.96,0],[358.2,0.8,0]], tee: [0, 0.5], cup: [-0.3, 9], shape: rect(-1.1, 0, 1.1, 10),
    ramps: [{ x0: -1.1, z0: 2.2, x1: 1.1, z1: 3.2, axis: 'z', h0: 0, h1: 0.22 }, { x0: -0.2, z0: 5.6, x1: 0.6, z1: 6.6, axis: 'z', h0: 0, h1: 0.2 }],
    bumps: [...V16_CRATER(-0.3, 9, 0.9)],
    movers: [V16_ROCK(-0.74, 4.9, 0.74, 4.9, 2.4)],
    zones: [V16_LAVA(rect(-1.1, 3.2, 1.1, 4.2)), V16_LAVA(rect(-1.1, 6.6, 1.1, 7.4)), V16_MUD(rect(-1.1, 5.4, -0.4, 6))] },
  /* 14: the spinning basalt arm on the tilted green, then a ramp to the cup shelf (3 parts) */
  { par: 3, sol: [[22.3,1,0]], tee: [0, 0.5], cup: [0.4, 7.4], shape: rect(-1.4, 0, 1.4, 8.4),
    tiers: [{ poly: rect(-1.5, -0.1, 1.5, 5.4), h: 0, sx: 0.04 }, { poly: rect(-1.5, 6.2, 1.5, 8.5), h: 0.25 }],
    ramps: [{ x0: -0.4, z0: 5.4, x1: 1.4, z1: 6.2, axis: 'z', h0: 0, h1: 0.25 }],
    inner: [[[-1.4, 6.2], [-0.4, 6.2]]],
    movers: [{ kind: 'spin', x: 0, z: 3.2, len: 0.75, w: 1.2, phase: 0, look: 'basalt' }],
    bumps: [...V16_CRATER(0.4, 7.4, 0.85)],
    zones: [V16_LAVA(rect(-1.4, 4.4, -0.6, 4.9)), V16_LAVA(rect(-1.4, 8.1, 1.4, 8.4))] },
  /* 15: the gated drop: a sliding basalt gate guards the gap off the deck (crazy, 3 parts) */
  { par: 4, crazy: true, sol: [[356,0.84,0]], tee: [0, 0.5], cup: [0.8, 8], shape: rect(-1.4, 0, 1.4, 9),
    tiers: [{ poly: rect(-1.5, -0.1, 1.5, 4), h: 0.4 }],
    inner: [[[-1.4, 4], [-0.45, 4]], [[0.45, 4], [1.4, 4]]],
    movers: [{ kind: 'gate', ax: -0.84, az: 3.6, bx: 0.84, bz: 3.6, len: 0.3, ang: 90, period: 3.4, look: 'basalt' }],
    bumps: [{ x: -0.5, z: 5.8, r: 0.5, h: 0.25 }, ...V16_CRATER(0.8, 8, 0.85)],
    zones: [V16_LAVA(rect(-1.4, 6.6, -0.2, 7.1)), V16_MUD(rect(0.6, 5, 1.4, 5.6)), V16_LAVA(rect(-1.4, 8.7, 0, 9))] },
  /* 16: chained tubes: crater to the upper deck, crater to the cup green, or the long way down the ramps (crazy, 4 parts) */
  { par: 4, crazy: true, sol: [[299.4,0.84,0],[80.2,0.4,0],[192,0.44,0]], tee: [0, 0.5], cup: [2.6, 1.2], aim0: 0,
    shape: [[-0.8, 0], [0.8, 0], [0.8, 4.4], [1.8, 4.4], [1.8, 0], [3.4, 0], [3.4, 7], [-0.8, 7]],
    tiers: [{ poly: rect(-0.9, 4.4, 3.5, 7.1), h: 0.35 }],
    ramps: [{ x0: -0.8, z0: 3.2, x1: 0.8, z1: 4.4, axis: 'z', h0: 0, h1: 0.35 }, { x0: 1.8, z0: 3.4, x1: 3.4, z1: 4.4, axis: 'z', h0: 0, h1: 0.35 }],
    bumps: [...V16_CRATER(0, 1.8, 0.7), ...V16_CRATER(1.2, 6, 0.7), ...V16_CRATER(2.6, 1.2, 0.85)],
    tubes: [{ a: [0, 1.8], b: [-0.3, 5.6], dir: 60 }, { a: [1.2, 6], b: [2.9, 3], dir: 180 }],
    posts: [V16_COL(2.2, 2.4)],
    zones: [V16_LAVA(rect(1.8, 4.4, 2.2, 5)), V16_LAVA(rect(3, 6.2, 3.4, 7)), V16_MUD(rect(-0.8, 6.6, 0.4, 7))] },
  /* 17: crater moat: ramp onto the island over the lava, or the crater tube from the beach (3 parts) */
  { par: 4, sol: [[49.4,0.58,0],[345.4,0.7,0]], tee: [0, 0.5], cup: [-0.4, 6.6], shape: rect(-2, 0, 2, 9),
    ramps: [{ x0: 0.5, z0: 3.7, x1: 1.1, z1: 4.5, axis: 'z', h0: 0, h1: 0.25 }],
    tiers: [{ poly: rect(-1.2, 4.5, 1.2, 7.6), h: 0.25 }],
    bumps: [...V16_CRATER(-0.4, 6.6, 0.85), ...V16_CRATER(-1.5, 2, 0.7)],
    tubes: [{ a: [-1.5, 2], b: [0.6, 5.1], dir: 340 }],
    movers: [V16_ROCK(-0.9, 2.9, 0.9, 2.9, 2.6)],
    zones: [V16_LAVA(rect(-2, 3.7, 0.5, 4.45)), V16_LAVA(rect(1.1, 3.7, 2, 4.45)), V16_LAVA(rect(-2, 4.45, -1.25, 9)), V16_LAVA(rect(1.25, 4.45, 2, 9)), V16_LAVA(rect(-1.25, 7.65, 1.25, 9))] },
  /* 18: the vent: boulder run, ramp to the ledge, the gated drop into the summit crater, or the tube (crazy, 4 parts) */
  { par: 5, crazy: true, sol: [[0,0.36,0],[19.1,0.92,0],[288.3,1,0]], tee: [0, 0.5], cup: [0.6, 9.6], aim0: 0,
    shape: [[-0.8, 0], [0.8, 0], [0.8, 4], [3, 4], [3, 10.8], [-0.8, 10.8]],
    inner: [[[-0.8, 6.8], [1.5, 6.8]], [[2.25, 6.8], [3, 6.8]]],
    ramps: [{ x0: -0.8, z0: 3, x1: 0.8, z1: 4.2, axis: 'z', h0: 0, h1: 0.36 }],
    tiers: [{ poly: rect(-1, 4.2, 3.2, 6.8), h: 0.36 }, { poly: rect(-1, 6.8, 3.2, 11), h: 0.15 }],
    movers: [V16_ROCK(-0.45, 1.8, 0.45, 1.8, 2.2), { kind: 'gate', ax: 1.55, az: 6.4, bx: 2.75, bz: 6.4, len: 0.25, ang: 90, period: 3.2, look: 'basalt' }],
    bumps: [...V16_CRATER(0.6, 9.6, 0.9), ...V16_CRATER(0.3, 5.5, 0.7)],
    tubes: [{ a: [0.3, 5.5], b: [2.4, 10.2], dir: 230 }],
    zones: [V16_LAVA(rect(1.2, 4.2, 3, 4.7)), V16_LAVA(rect(-0.8, 7.4, 0.2, 7.9)), V16_LAVA(rect(1.6, 8.4, 3, 8.9)), V16_MUD(rect(-0.8, 10.4, 1.2, 10.8))] },
] });
