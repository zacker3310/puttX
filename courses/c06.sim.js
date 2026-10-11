/* world 6, volcano: cinder cones and crater cups, lava rivers and pools (water hazards drawn
   as lava), sticky volcanic mud, lava-tube tunnels, basalt columns and rolling boulders.
   Crater cups: a cone plus a narrower bowl at the same spot leaves a flat floor for the cup.
   Volcano feeders: a direct risky line, or a climb into a crater whose tube drops out near the cup. */
const V6_CRATER = (x, z, k = 1) => [{ x, z, r: 1.1 * k, h: 0.32 }, { x, z, r: 0.55 * k, h: -0.2 }];
const V6_LAVA = poly => ({ surf: 'water', poly });
const V6_MUD = poly => ({ surf: 'mud', poly });
const V6_COL = (x, z, r = 0.12) => ({ x, z, r, top: 0.3, look: 'basalt' });
const V6_ROCK = (ax, az, bx, bz, period, phase = 0, r = 0.18) => ({ kind: 'slide', ax, az, bx, bz, r, period, phase, look: 'boulder' });
registerWorld(6, { holes: [
  /* 1: a cinder cone square in the line */
  { par: 2, sol: [[40,0.84,0]], tee: [0, 0.5], cup: [0.3, 5.4], shape: rect(-1, 0, 1, 6.4),
    bumps: [{ x: 0.1, z: 3, r: 0.65, h: 0.3 }, { x: 0.6, z: 4.4, r: 0.35, h: 0.15 }], zones: [V6_LAVA(rect(-1, 6.1, 1, 6.4))] },
  /* 2: lava creek with one bridge */
  { par: 3, sol: [[28.5,0.97,0]], tee: [0, 0.5], cup: [-0.6, 6.2], shape: rect(-1.2, 0, 1.2, 7.2),
    zones: [V6_LAVA(rect(-1.2, 3, 0.55, 3.7)), V6_MUD(rect(0.55, 3.7, 1.2, 4.2))],
    bumps: [{ x: -0.1, z: 5.1, r: 0.45, h: 0.18 }] },
  /* 3: first crater cup, lava behind it */
  { par: 3, sol: [[46,0.8,0],[82,0.44,0]], tee: [0, 0.5], cup: [2.2, 4.8], aim0: 0, shape: [[-0.7, 0], [0.7, 0], [0.7, 3.2], [3.6, 3.2], [3.6, 6.4], [-0.7, 6.4]],
    bumps: V6_CRATER(2.2, 4.8, 0.9), zones: [V6_LAVA(rect(3.2, 3.2, 3.6, 6.4)), V6_LAVA(rect(0.7, 3.2, 1.3, 3.7)), V6_LAVA(rect(1.3, 6, 3.2, 6.4))] },
  /* 4: volcano feeder intro: the gap on the right, or the crater tube on the left */
  { par: 3, sol: [[338,0.96,0],[50,0.76,0]], tee: [0, 0.5], cup: [-0.8, 6.2], aim0: 0, shape: rect(-1.4, 0, 1.4, 7.4),
    inner: [[[-1.4, 3.6], [0.75, 3.6]]],
    bumps: V6_CRATER(-0.6, 2.1, 0.8), tubes: [{ a: [-0.6, 2.1], b: [-0.1, 4.2], dir: 0 }],
    zones: [V6_LAVA(rect(0.3, 4.7, 1.4, 5.4)), V6_MUD(rect(-0.6, 4.9, 0.3, 5.5))] },
  /* 5: tilted mud flats */
  { par: 3, sol: [[8,0.84,0]], tee: [0, 0.5], cup: [-0.4, 6.6], shape: rect(-1.3, 0, 1.3, 7.5),
    tiers: [{ poly: rect(-1.4, -0.1, 1.4, 7.6), h: 0.1, sx: 0.06 }],
    zones: [V6_LAVA(rect(-1.3, 1.5, -1.1, 7.5)), V6_MUD(rect(-1.1, 2.4, 0.2, 3)), V6_MUD(rect(-0.2, 4.4, 1.3, 5))],
    bumps: [{ x: 0.6, z: 3.7, r: 0.5, h: 0.25 }] },
  /* 6: dogleg right past a rolling boulder */
  { par: 3, sol: [[28,0.84,0]], tee: [0, 0.5], cup: [-3, 4.8], shape: [[-0.7, 0], [0.7, 0], [0.7, 5.6], [-3.6, 5.6], [-3.6, 4], [-0.7, 4]],
    bumps: [{ x: 0, z: 4.8, r: 0.5, h: 0.25 }], movers: [V6_ROCK(-1.8, 4.35, -1.8, 5.25, 2.4)],
    zones: [V6_LAVA(rect(-2.4, 5.1, -2.1, 5.6))] },
  /* 7: a field of basalt columns on a tilted green */
  { par: 3, sol: [[26,0.72,0],[0,0.08,0]], tee: [0, 0.5], cup: [0.5, 6.5], shape: rect(-1.4, 0, 1.4, 7.5),
    tiers: [{ poly: rect(-1.5, -0.1, 1.5, 7.6), h: 0.1, sx: -0.04, sz: 0.01 }],
    posts: [V6_COL(-0.9, 2.6), V6_COL(-0.3, 2.6), V6_COL(0.3, 2.6), V6_COL(0.9, 2.6), V6_COL(-0.6, 3.6), V6_COL(0, 3.6), V6_COL(0.6, 3.6),
      V6_COL(-0.9, 4.6), V6_COL(-0.3, 4.6), V6_COL(0.3, 4.6), V6_COL(0.9, 4.6), V6_COL(0.15, 5.9), V6_COL(0.85, 5.9)],
    zones: [V6_LAVA(rect(-1.4, 6.9, 0, 7.5)), V6_MUD(rect(-1.4, 5.3, -0.6, 6.2))] },
  /* 8: lava falls: three decks stepping down through two gaps (crazy, 3 parts) */
  { par: 4, sol: [[38,1,0],[10,0.88,0]], tee: [0, 0.5], cup: [0.6, 8.2], shape: [[-1.2, 0], [1.2, 0], [1.2, 2.8], [1.2, 5.6], [1.2, 9], [-1.2, 9], [-1.2, 5.6], [-1.2, 2.8]],
    inner: [[[-1.2, 2.8], [0.1, 2.8]], [[0.7, 2.8], [1.2, 2.8]], [[-0.6, 5.6], [1.2, 5.6]]],
    tiers: [{ poly: rect(-1.4, -0.2, 1.4, 2.8), h: 0.42 }, { poly: rect(-1.4, 2.8, 1.4, 5.6), h: 0.2 }],
    posts: [V6_COL(0.2, 7.6), V6_COL(1.0, 7.6)],
    zones: [V6_LAVA(rect(0.2, 4.2, 1.2, 4.8)), V6_LAVA(rect(-1.2, 8.6, -0.2, 9)), V6_MUD(rect(-1.2, 3.6, -0.5, 4.4))] },
  /* 9: volcano feeder: skirt the lava round the cone, or climb into the crater tube */
  { par: 3, sol: [[356,0.98,0]], tee: [0, 0.5], cup: [-0.9, 7], aim0: 0, shape: rect(-1.6, 0, 1.6, 8),
    bumps: V6_CRATER(0, 3.8, 1.2), tubes: [{ a: [0, 3.8], b: [1.05, 6.6], dir: 270 }], posts: [V6_COL(-0.25, 6.3), V6_COL(-0.6, 6.1)],
    zones: [V6_LAVA(rect(-1.6, 2.5, -1.15, 5.5)), V6_LAVA(rect(1.15, 2.5, 1.6, 5.5)), V6_LAVA(rect(-1.6, 7.6, 1.6, 8)), V6_MUD(rect(0, 6.35, 0.75, 6.85))] },
  /* 10: twin cones and a crater cup behind the saddle */
  { par: 3, sol: [[6,0.68,0]], tee: [0, 0.5], cup: [-0.7, 6.2], shape: rect(-1.5, 0, 1.5, 7.5),
    bumps: [{ x: -0.6, z: 3.5, r: 0.55, h: 0.33 }, { x: 0.6, z: 3.5, r: 0.55, h: 0.33 }, ...V6_CRATER(-0.7, 6.2, 0.85)], posts: [V6_COL(-0.4, 5)],
    zones: [V6_LAVA(rect(-1.5, 7.1, 1.5, 7.5)), V6_MUD(rect(-1.5, 4.6, -0.9, 5.4)), V6_MUD(rect(0.9, 4.6, 1.5, 5.4))] },
  /* 11: lava tube ride: ramp to a plateau, then the crater tube or a drop over the lava (crazy, 3 parts) */
  { par: 4, sol: [[348,1,0],[22,0.84,0]], tee: [0, 0.5], cup: [2, 8.9], aim0: 0,
    shape: [[-0.7, 0], [0.7, 0], [0.7, 3], [0.7, 4.2], [2.6, 4.2], [2.6, 6.2], [2.6, 9.5], [-0.7, 9.5], [-0.7, 6.2], [-0.7, 3]],
    ramps: [{ x0: -0.7, z0: 3, x1: 0.7, z1: 4.2, axis: 'z', h0: 0, h1: 0.35 }],
    tiers: [{ poly: rect(-0.9, 4.2, 2.8, 6.2), h: 0.35 }],
    bumps: V6_CRATER(1.5, 5.2, 0.7), tubes: [{ a: [1.5, 5.2], b: [-0.2, 8.4], dir: 75 }], posts: [V6_COL(1.4, 8.2), V6_COL(0.9, 7.7)],
    zones: [V6_LAVA(rect(-0.7, 6.5, 2.6, 6.9))] },
  /* 12: lava delta: two rivers, two bridges, a cone between */
  { par: 3, sol: [[28,0.8,0],[288,1,0]], tee: [0, 0.5], cup: [0.8, 7], shape: rect(-1.5, 0, 1.5, 8),
    bumps: [{ x: 0, z: 4.05, r: 0.5, h: 0.3 }],
    zones: [V6_LAVA(rect(-1.5, 2.6, 0.6, 3.1)), V6_LAVA(rect(-0.6, 5, 1.5, 5.5)), V6_MUD(rect(0.6, 3.1, 1.5, 3.5)), V6_MUD(rect(-1.5, 5.5, -0.6, 5.9))] },
  /* 13: lava jumps: two kickers over two lava rivers to a crater green (crazy, 3 parts) */
  { par: 4, sol: [[340,0.88,0],[310,0.96,0]], tee: [0, 0.5], cup: [0.3, 8.9], shape: rect(-1, 0, 1, 10),
    ramps: [{ x0: -1, z0: 2.3, x1: 1, z1: 3.3, axis: 'z', h0: 0, h1: 0.22 }, { x0: -0.4, z0: 5.6, x1: 0.4, z1: 6.6, axis: 'z', h0: 0, h1: 0.2 }],
    bumps: V6_CRATER(0.3, 8.9, 0.9),
    zones: [V6_LAVA(rect(-1, 3.3, 1, 4.3)), V6_LAVA(rect(-1, 6.6, 1, 7.4))] },
  /* 14: switchback up the flank: three legs, two ramps, ash and lava */
  { par: 4, sol: [[42,1,0],[288,0.8,0]], tee: [0, 0.5], cup: [1.2, 7.2], shape: [[-1.8, 0], [1.8, 0], [1.8, 2.7], [1.8, 5.3], [1.8, 8], [-1.8, 8], [-1.8, 5.3], [-1.8, 2.7]],
    inner: [[[-1.8, 2.7], [1, 2.7]], [[-1, 5.3], [1.8, 5.3]]],
    tiers: [{ poly: rect(-1.9, 2.7, 1.9, 5.3), h: 0.2 }, { poly: rect(-1.9, 5.3, 1.9, 8.1), h: 0.4 }],
    ramps: [{ x0: 1, z0: 2.2, x1: 1.8, z1: 3.2, axis: 'z', h0: 0, h1: 0.2 }, { x0: -1.8, z0: 4.8, x1: -1, z1: 5.8, axis: 'z', h0: 0.2, h1: 0.4 }],
    posts: [V6_COL(0.4, 6.6)],
    zones: [{ surf: 'sand', poly: rect(-0.4, 2.75, 0, 5.25) }, V6_LAVA(rect(-1.8, 0, -1.2, 1.2)), V6_LAVA(rect(0.2, 7.6, 1.8, 8))] },
  /* 15: boulder slope: two boulders roll across an uphill green */
  { par: 3, sol: [[20,0.88,0]], tee: [0, 0.5], cup: [-0.5, 7], shape: rect(-1.4, 0, 1.4, 8),
    tiers: [{ poly: rect(-1.5, -0.1, 1.5, 8.1), h: 0, sz: 0.035 }],
    movers: [V6_ROCK(-1, 3.2, 1, 3.2, 2.6), V6_ROCK(1, 5.2, -1, 5.2, 3.1, 1)],
    bumps: [{ x: 0.6, z: 6.4, r: 0.45, h: 0.2 }],
    zones: [V6_LAVA(rect(-1.4, 7.6, 1.4, 8))] },
  /* 16: tube maze: ramp to the deck, then the crater tube or the drop, then the cup plateau (crazy, 4 parts) */
  { par: 5, sol: [[336,0.76,0],[74,0.76,0],[72,0.84,0]], tee: [0, 0.5], cup: [2.9, 0.7], aim0: 0,
    shape: [[-0.7, 0], [0.7, 0], [0.7, 2], [0.7, 3.2], [2.2, 3.2], [2.2, 2.4], [2.2, 1.4], [2.2, 0], [3.6, 0], [3.6, 1.4], [3.6, 2.4], [3.6, 3.2], [3.6, 5], [-0.7, 5], [-0.7, 3.2], [-0.7, 2]],
    ramps: [{ x0: -0.7, z0: 2, x1: 0.7, z1: 3.2, axis: 'z', h0: 0, h1: 0.38 }, { x0: 2.2, z0: 1.4, x1: 3.6, z1: 2.4, axis: 'z', h0: 0.2, h1: 0 }],
    tiers: [{ poly: rect(-0.9, 3.2, 3.8, 5.2), h: 0.38 }, { poly: rect(2, -0.2, 3.8, 1.4), h: 0.2 }],
    bumps: V6_CRATER(1.6, 4.2, 0.65), tubes: [{ a: [1.6, 4.2], b: [3.1, 2.9], dir: 180 }],
    posts: [V6_COL(2.6, 1.1)],
    zones: [V6_LAVA(rect(2.2, 2.4, 2.6, 3.2)), V6_LAVA(rect(3.2, 3.6, 3.6, 5))] },
  /* 17: crater moat: a narrow ramp over the lava moat to the island crater (crazy, 3 parts) */
  { par: 4, sol: [[44,0.84,0],[2,0.44,0]], tee: [0, 0.5], cup: [-0.4, 6.5], shape: rect(-2, 0, 2, 9),
    ramps: [{ x0: 0.5, z0: 3.7, x1: 1.1, z1: 4.5, axis: 'z', h0: 0, h1: 0.25 }],
    tiers: [{ poly: rect(-1.2, 4.5, 1.2, 7.5), h: 0.25 }],
    bumps: [...V6_CRATER(-0.4, 6.5, 0.85), ...V6_CRATER(-1.5, 2, 0.7)], tubes: [{ a: [-1.5, 2], b: [0.6, 5.1], dir: 340 }], posts: [V6_COL(0.1, 5.8)],
    zones: [V6_LAVA(rect(-2, 3.7, 0.5, 4.5)), V6_LAVA(rect(1.1, 3.7, 2, 4.5)), V6_LAVA(rect(-2, 4.5, -1.2, 9)), V6_LAVA(rect(1.2, 4.5, 2, 9)), V6_LAVA(rect(-1.2, 7.5, 1.2, 9))] },
  /* 18: the summit: boulder run, two ledges up the cone and the summit crater, or the tube (crazy, 4 parts) */
  { par: 5, sol: [[350,0.96,0],[86,0.84,0]], tee: [0, 0.5], cup: [0.3, 9.3], aim0: 0,
    shape: [[-0.8, 0], [0.8, 0], [0.8, 4], [0.8, 5], [3, 5], [3, 5.1], [3, 6.5], [3, 6.6], [3, 7.6], [3, 10.6], [-0.8, 10.6], [-0.8, 7.6], [-0.8, 6.6], [-0.8, 6.5], [-0.8, 5.1], [-0.8, 5], [-0.8, 4]],
    inner: [[[-0.8, 6.6], [1.6, 6.6]], [[1.6, 5], [1.6, 6.05]]],
    ramps: [{ x0: -0.8, z0: 4, x1: 0.8, z1: 5, axis: 'z', h0: 0, h1: 0.3 }, { x0: 1.6, z0: 6.6, x1: 3, z1: 7.6, axis: 'z', h0: 0.3, h1: 0.6 }],
    tiers: [{ poly: rect(-1, 5, 3.2, 6.6), h: 0.3 }, { poly: rect(-1, 6.6, 3.2, 10.8), h: 0.6 }],
    bumps: [...V6_CRATER(0.3, 9.3, 0.9), ...V6_CRATER(0, 5.8, 0.7)], tubes: [{ a: [0, 5.8], b: [2.2, 9.9], dir: 200 }],
    movers: [V6_ROCK(-0.4, 2.5, 0.4, 2.5, 2.2)],
    zones: [V6_LAVA(rect(-0.8, 6.15, 0.3, 6.6)), V6_LAVA(rect(2.3, 5, 3, 5.6)), V6_LAVA(rect(-0.8, 7.6, 0.4, 8.1)), V6_LAVA(rect(-0.8, 10.2, 3, 10.6))] },
] });
