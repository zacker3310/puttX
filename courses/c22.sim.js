/* course 22, the canyon masterpiece: the world 2 desert at its most intricate. Stacked terraces, chained
   mine shafts, switchback ramps, gates guarding the drops, twin dust devils, three-river floods and island
   hops, and a mine railway finale that rides itself into the cup.
   Each hole's `sol` is printed by `PUTTX_ONLY=22 node scripts/solve.cjs --hole 22-K`. */
const C22_CACTUS = (x, z, r = 0.09) => ({ x, z, r, top: 0.34, look: 'cactus' });
const C22_ROCK = (x, z, r = 0.14) => ({ x, z, r, top: 0.2, look: 'rock' });
const C22_WEED = (ax, az, bx, bz, period, phase = 0, r = 0.15) => ({ kind: 'slide', ax, az, bx, bz, r, period, phase, look: 'weed' });
const C22_GATE = (ax, az, bx, bz, len, ang, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase });
const C22_DEVIL = (cx, cz, s, k) => [
  { push: [k, 0], poly: [[cx - s, cz + s], [cx + s, cz + s], [cx, cz]] }, { push: [0, -k], poly: [[cx + s, cz + s], [cx + s, cz - s], [cx, cz]] },
  { push: [-k, 0], poly: [[cx + s, cz - s], [cx - s, cz - s], [cx, cz]] }, { push: [0, k], poly: [[cx - s, cz - s], [cx - s, cz + s], [cx, cz]] }];
registerWorld(22, { holes: [
  /* 1. the narrow ramp straight up, or the wide one on the right; the cup hides behind a rock spur */
  { par: 2, sol: [[335,1,0]], tee: [0, 0.5], cup: [0.5, 5.4], shape: rect(-1, 0, 1, 6),
    inner: [[[1, 4.6], [0, 4.6]]],
    ramps: [{ x0: -0.3, z0: 2.4, x1: 0.3, z1: 3.4, axis: 'z', h0: 0, h1: 0.25 }, { x0: -1.1, z0: 2.4, x1: -0.6, z1: 3.4, axis: 'z', h0: 0, h1: 0.25 }],
    tiers: [{ poly: rect(-1.1, 3.4, 1.1, 6.1), h: 0.25 }],
    posts: [C22_CACTUS(-0.45, 4.5), C22_ROCK(0.6, 1.5)] },
  /* 2. up onto the mesa, through the sliding gate, down to the leaning green */
  { par: 3, sol: [[0,1,0]], tee: [0, 0.5], cup: [-0.6, 7.6], shape: rect(-1.5, 0, 1.5, 8.5),
    inner: [[[-1.5, 5], [-0.5, 5]], [[0.3, 5], [1.5, 5]]],
    ramps: [{ x0: -1.6, z0: 1.4, x1: 1.6, z1: 2.4, axis: 'z', h0: 0, h1: 0.35 }],
    tiers: [{ poly: rect(-1.6, 2.4, 1.6, 5), h: 0.35 }, { poly: rect(-1.6, 5, 1.6, 8.6), h: 0.05, sx: 0.03 }],
    bumps: [{ x: 0.6, z: 6.3, r: 0.4, h: 0.15 }],
    zones: [{ surf: 'sand', poly: rect(0.6, 7.6, 1.5, 8.5) }],
    movers: [C22_GATE(-0.65, 5, 0.45, 5, 0.3, 90, 2.6)],
    posts: [C22_CACTUS(0.2, 7.5), C22_CACTUS(-0.7, 3.4)] },
  /* 3. over the dunes, then left up the long ramp to the shelf green */
  { par: 3, sol: [[180,1,0],[60,0.714,0]], tee: [0, 0.5], cup: [2.6, 6.6], aim0: 20,
    shape: [[-0.7, 0], [0.7, 0], [0.7, 4.2], [3.2, 4.2], [3.2, 7.4], [-0.7, 7.4]],
    inner: [[[-0.7, 6.0], [0.0, 6.0]]],
    ramps: [{ x0: 0.7, z0: 4.1, x1: 1.7, z1: 7.5, axis: 'x', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(1.7, 4.1, 3.3, 7.5), h: 0.3 }],
    bumps: [{ x: -0.2, z: 2.0, r: 0.5, h: 0.25 }, { x: 0.3, z: 3.4, r: 0.45, h: 0.22 }, { x: -0.1, z: 5.2, r: 0.4, h: 0.18 }],
    zones: [{ surf: 'sand', poly: rect(-0.7, 6.4, -0.1, 7.4) }],
    posts: [C22_CACTUS(2.3, 5.2), C22_ROCK(2.9, 7.05, 0.12)] },
  /* 4. long green: the snake. Thirteen metres of canyon floor that kinks left then right, leaning left all the
     way, a ridge on the inside of the first bend and a swale short of the cup */
  { par: 3, sol: [[0,0.8,0]], tee: [0, 0.5], cup: [-0.6, 11.8], aim0: 10,
    shape: [[-1.2, 0], [1.2, 0], [1.2, 4], [2.8, 6.5], [2.8, 9], [0.6, 13], [-1.8, 13], [-1.8, 10], [-0.2, 7.5], [-1.2, 4]],
    tiers: [{ poly: rect(-1.9, -0.1, 2.9, 13.1), h: 0.1, sz: 0.01, sx: -0.012 }],
    bumps: [{ x: 1.6, z: 8.0, r: 1.4, h: 0.14 }, { x: -0.5, z: 3.0, r: 1.2, h: -0.07 }, { x: -0.3, z: 10.3, r: 1.0, h: -0.06 }],
    zones: [{ surf: 'sand', poly: rect(0.0, 12.4, 0.9, 13) }],
    posts: [C22_CACTUS(1.0, 1.4), C22_ROCK(-1.4, 12.5, 0.12)] },
  /* 5. three decks down: drop through the left gap, cross the middle deck past the tumbleweed, drop through
     the right gap; or dive into the shaft on the top deck */
  { par: 3, sol: [[36,0.96,1.5]], tee: [0, 0.5], cup: [0, 8.2], shape: rect(-1.5, 0, 1.5, 9),
    inner: [[[-1.5, 3], [0.6, 3]], [[-0.6, 6], [1.5, 6]]],
    tiers: [{ poly: rect(-1.6, -0.1, 1.6, 3), h: 0.42 }, { poly: rect(-1.6, 3, 1.6, 6), h: 0.22 }, { poly: rect(-1.6, 6, 1.6, 9.1), h: 0.02 }],
    tubes: [{ a: [-0.9, 2.3], b: [0.9, 6.6], dir: 0, keep: 0.5, add: 0.3 }],
    zones: [{ surf: 'sand', poly: rect(-1.5, 8.4, -0.7, 9) }],
    movers: [C22_WEED(-1.0, 4.5, 1.0, 4.5, 2.4)],
    posts: [C22_CACTUS(0.5, 7.6), C22_CACTUS(-0.4, 7.4), C22_ROCK(0.9, 1.4)] },
  /* 6. the staircase down: three lanes, each a step below the last */
  { par: 4, sol: [[15,0.75,0],[350,0.75,0],[275,0.9375,0],[0,0.375,0]], tee: [2.0, 0.5], cup: [0, 6.4], aim0: 0,
    shape: rect(-0.5, 0, 2.5, 7.2),
    inner: [[[1.5, 0], [1.5, 6]], [[0.5, 1.2], [0.5, 7.2]]],
    ramps: [{ x0: 1.5, z0: 4.8, x1: 2.6, z1: 6, axis: 'z', h0: 0.6, h1: 0.4 }, { x0: 0.5, z0: 2.4, x1: 1.5, z1: 3.6, axis: 'z', h0: 0.2, h1: 0.4 },
      { x0: -0.6, z0: 1.2, x1: 0.5, z1: 2.4, axis: 'z', h0: 0.2, h1: 0 }],
    tiers: [{ poly: rect(1.5, -0.1, 2.6, 4.8), h: 0.6 }, { poly: rect(0.5, 6, 2.6, 7.3), h: 0.4 }, { poly: rect(0.5, 3.6, 1.5, 6), h: 0.4 },
      { poly: rect(0.5, -0.1, 1.5, 2.4), h: 0.2 }, { poly: rect(-0.6, -0.1, 0.5, 1.2), h: 0.2 }],
    zones: [{ surf: 'sand', poly: rect(-0.5, 4.2, 0.0, 4.9) }],
    movers: [C22_WEED(1.0, 4.4, 1.0, 5.4, 2.2, 0, 0.12)],
    posts: [C22_CACTUS(0.2, 5.6), C22_CACTUS(2.0, 3.0)] },
  /* 7. the kicker over the flood or the plank, past the windmill, up to the mesa */
  { par: 3, sol: [[20.75,0.96,0]], tee: [0, 0.5], cup: [-0.6, 8.4], shape: rect(-1.4, 0, 1.4, 9),
    ramps: [{ x0: -0.4, z0: 2.2, x1: 0.4, z1: 3.0, axis: 'z', h0: 0, h1: 0.22 }, { x0: -1.5, z0: 6.5, x1: 1.5, z1: 7.3, axis: 'z', h0: 0, h1: 0.25 }],
    tiers: [{ poly: rect(-1.5, 7.3, 1.5, 9.1), h: 0.25 }],
    zones: [{ surf: 'fast', poly: rect(-0.4, 2.2, 0.4, 3.0) }, { surf: 'water', poly: rect(-1.4, 3.1, 0.9, 3.9) }, { surf: 'fast', poly: rect(0.9, 3.0, 1.4, 4.0) },
      { surf: 'sand', poly: rect(0.5, 8.6, 1.4, 9) }],
    movers: [{ kind: 'spin', x: 0, z: 5.2, len: 0.55, w: 1.4, phase: 0 }],
    posts: [C22_CACTUS(0.3, 8.3), C22_CACTUS(-1.0, 1.6)] },
  /* 8. tumbleweed alley: three weeds across the canyon, then the narrow bridge or the wide ramp to the mesa */
  { par: 3, sol: [[18.75,0.99,0]], tee: [0, 0.5], cup: [-0.8, 8.2], shape: rect(-1.6, 0, 1.6, 9),
    ramps: [{ x0: -0.17, z0: 5, x1: 0.17, z1: 6, axis: 'z', h0: 0, h1: 0.3 }, { x0: 0.9, z0: 4.6, x1: 1.7, z1: 6, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-1.7, 6, 1.7, 9.1), h: 0.3 }],
    zones: [{ surf: 'sand', poly: rect(-1.6, 4.2, -0.4, 5.4) }],
    movers: [C22_WEED(-1.1, 1.8, 1.1, 1.8, 2.0), C22_WEED(1.1, 2.9, -1.1, 2.9, 2.4, 0.7), C22_WEED(-1.1, 4.0, 1.1, 4.0, 2.8, 1.4)],
    posts: [C22_CACTUS(-0.45, 7.4), C22_CACTUS(-1.25, 7.5), C22_ROCK(0.7, 7.8)] },
  /* 9. the two sluice gates: down deck by deck, a gate guarding each drop, then round the spur */
  { par: 4, crazy: true, sol: [[40,0.875,1.5],[-0.25,0.9675,0]], tee: [0, 0.5], cup: [0.8, 10.3], shape: rect(-1.6, 0, 1.6, 11),
    inner: [[[-1.6, 3.5], [0.125, 3.5]], [[0.875, 3.5], [1.6, 3.5]], [[-1.6, 7], [-0.875, 7]], [[-0.125, 7], [1.6, 7]], [[1.6, 9.4], [0.2, 9.4]]],
    tiers: [{ poly: rect(-1.7, -0.1, 1.7, 3.5), h: 0.4 }, { poly: rect(-1.7, 3.5, 1.7, 7), h: 0.2 }, { poly: rect(-1.7, 7, 1.7, 11.1), h: 0.03, sx: 0.015 }],
    bumps: [{ x: -0.6, z: 8.6, r: 0.45, h: 0.18 }],
    zones: [{ surf: 'sand', poly: rect(-1.6, 10.3, -0.6, 11) }],
    movers: [C22_GATE(0.375, 3.5, 0.625, 3.5, 0.25, 90, 2.4), C22_GATE(-0.625, 7, -0.375, 7, 0.25, 90, 2.8, 0.9), C22_WEED(-1.0, 5.2, 1.0, 5.2, 2.6)],
    posts: [C22_CACTUS(-0.8, 2.2), C22_CACTUS(-0.2, 10.4)] },
  /* 10. long green: the three shelves. Up a broad step to a middle shelf with a big low dune, then a step back
     down to the cup shelf: the putt has to climb, crest and die */
  { par: 3, sol: [[0,0.8,0]], tee: [0, 0.5], cup: [1.3, 10.8],
    shape: [[-1.4, 0], [1.4, 0], [2.4, 3], [2.4, 12], [-2.4, 12], [-2.4, 3]],
    ramps: [{ x0: -2.5, z0: 4, x1: 2.5, z1: 5, axis: 'z', h0: 0.06, h1: 0.2 }, { x0: -2.5, z0: 8, x1: 2.5, z1: 9, axis: 'z', h0: 0.2, h1: 0.1 }],
    tiers: [{ poly: rect(-2.5, -0.1, 2.5, 4), h: 0, sz: 0.015 }, { poly: rect(-2.5, 5, 2.5, 8), h: 0.2 }, { poly: rect(-2.5, 9, 2.5, 12.1), h: 0.1, sx: -0.008 }],
    bumps: [{ x: -1.0, z: 6.5, r: 1.5, h: 0.15 }, { x: 1.2, z: 2.5, r: 1.3, h: -0.08 }],
    zones: [{ surf: 'sand', poly: rect(-2.4, 11.2, -1.2, 12) }],
    posts: [C22_CACTUS(2.0, 6.4), C22_ROCK(-2.0, 3.2, 0.12)] },
  /* 11. three rivers: the plank, the island shaft or kicker, the far plank, then the green */
  { par: 4, sol: [[10,0.8125,0],[40,0.625,0]], tee: [0, 0.5], cup: [-0.6, 10.2], shape: rect(-1.6, 0, 1.6, 11),
    ramps: [{ x0: -0.35, z0: 1.7, x1: 0.35, z1: 2.5, axis: 'z', h0: 0, h1: 0.2 }, { x0: -0.3, z0: 4.7, x1: 0.3, z1: 5.5, axis: 'z', h0: 0, h1: 0.2 }],
    tubes: [{ a: [1.0, 5.0], b: [1.0, 6.9], dir: 0, keep: 0.5, add: 0.3 }],
    zones: [{ surf: 'fast', poly: rect(-0.35, 1.7, 0.35, 2.5) }, { surf: 'fast', poly: rect(-0.3, 4.7, 0.3, 5.5) },
      { surf: 'water', poly: rect(-1.1, 2.6, 1.6, 3.3) }, { surf: 'fast', poly: rect(-1.6, 2.5, -1.1, 3.4) },
      { surf: 'water', poly: rect(-1.6, 5.6, 1.6, 6.3) }, { surf: 'water', poly: rect(-1.6, 8.4, 1.1, 9.0) }, { surf: 'fast', poly: rect(1.1, 8.3, 1.6, 9.1) }],
    movers: [C22_WEED(-1.1, 4.2, 0.7, 4.2, 2.2), C22_WEED(-1.1, 7.6, 0.4, 7.6, 2.4, 1)],
    posts: [C22_CACTUS(0.9, 1.4), C22_CACTUS(0.3, 10.0), C22_ROCK(-1.2, 4.9, 0.12)] },
  /* 12. twin dust devils spinning opposite ways down the canyon, then up the ramp to the mesa */
  { par: 4, crazy: true, sol: [[340,1,0]], tee: [0, 0.5], cup: [0.6, 9.1], shape: rect(-1.4, 0, 1.4, 10),
    ramps: [{ x0: -1.5, z0: 7, x1: 0.2, z1: 7.8, axis: 'z', h0: 0, h1: 0.25 }],
    tiers: [{ poly: rect(-1.5, 7.8, 1.5, 10.1), h: 0.25 }],
    zones: [...C22_DEVIL(0, 3.0, 0.85, 1.6), ...C22_DEVIL(0, 5.4, 0.85, -1.6), { surf: 'sand', poly: rect(0.5, 6.6, 1.4, 7.4) }],
    posts: [C22_CACTUS(1.1, 1.6), C22_CACTUS(-1.1, 1.6), C22_CACTUS(-0.2, 9.3), C22_ROCK(1.05, 9.6, 0.12)] },
  /* 13. island hop: kick over the first gap, kick over the second, then the shaft or a long carry to the green */
  { par: 4, crazy: true, sol: [[0,0.9375,1.5],[300,0.9375,0],[13.75,0.9,0]], tee: [0, 0.5], cup: [0.5, 11.6],
    floors: [rect(-0.7, 0, 0.7, 3.0), rect(-1.0, 3.8, 1.0, 6.0), rect(-1.0, 6.8, 1.0, 9.0), rect(-1.2, 9.8, 1.4, 12.4)],
    walls: [[[-0.7, 3.0], [-0.7, 0], [0.7, 0], [0.7, 3.0]], [[-1.0, 3.8], [-1.0, 6.0]], [[1.0, 3.8], [1.0, 6.0]], [[-1.0, 6.8], [-1.0, 9.0]], [[1.0, 6.8], [1.0, 9.0]],
      [[-1.2, 9.8], [-1.2, 12.4], [1.4, 12.4], [1.4, 9.8]]],
    ramps: [{ x0: -0.35, z0: 2.2, x1: 0.35, z1: 3.0, axis: 'z', h0: 0, h1: 0.2 }, { x0: -0.3, z0: 5.2, x1: 0.3, z1: 6.0, axis: 'z', h0: 0, h1: 0.2 },
      { x0: 0.2, z0: 8.2, x1: 0.8, z1: 9.0, axis: 'z', h0: 0, h1: 0.2 }],
    tubes: [{ a: [-0.5, 8.4], b: [-0.5, 10.4], dir: 15, keep: 0.5, add: 0.3 }],
    zones: [{ surf: 'sand', poly: rect(-1.2, 11.8, -0.3, 12.4) }],
    movers: [C22_WEED(-0.6, 4.6, 0.6, 4.6, 2.2, 0, 0.12)],
    posts: [C22_CACTUS(-0.2, 11.2), C22_CACTUS(1.1, 10.8)] },
  /* 14. the switchback mesa: up the lane, round the top, down the leaning mesa, then through the gated gap
     into the low canyon; or the shaft from the first lane */
  { par: 4, sol: [[20,0.8125,1.5],[230,0.6875,0]], tee: [0, 0.5], cup: [-4.2, 6.6], aim0: 0,
    shape: [[-0.8, 0], [0.8, 0], [0.8, 7.6], [-3.4, 7.6], [-5.0, 7.6], [-5.0, 0], [-3.4, 0], [-3.4, 1], [-1.8, 1], [-1.8, 6], [-0.8, 6]],
    inner: [[[-3.4, 2.0], [-3.4, 7.6]]],
    ramps: [{ x0: -1.8, z0: 6, x1: -0.8, z1: 7.7, axis: 'x', h0: 0.3, h1: 0 }],
    tiers: [{ poly: rect(-3.4, 0.9, -1.8, 7.7), h: 0.164, sz: 0.02 }],
    bumps: [{ x: -0.2, z: 3.0, r: 0.45, h: 0.2 }, { x: -4.4, z: 4.0, r: 0.45, h: 0.18 }],
    tubes: [{ a: [0.3, 4.6], b: [-2.6, 5.2], dir: 180, keep: 0.5, add: 0.3 }],
    zones: [{ surf: 'sand', poly: rect(-5.0, 1.2, -4.3, 2.0) }],
    movers: [C22_GATE(-3.4, 0.9, -3.4, 2.1, 0.3, 0, 2.6), C22_WEED(-2.2, 3.6, -3.0, 3.6, 2.4)],
    posts: [C22_CACTUS(0.45, 5.6), C22_CACTUS(-4.7, 5.8), C22_CACTUS(-2.6, 6.8)] },
  /* 15. four terraces: drop right, through the gate on the left, drop right again, round the spur */
  { par: 4, crazy: true, sol: [[320,1,1.5],[30,0.9375,0]], tee: [0, 0.5], cup: [0.5, 9.2],
    shape: [[-1.4, 0], [1.4, 0], [1.4, 6.2], [1.4, 10], [-1.4, 10], [-1.4, 6.2]],
    inner: [[[-0.6, 2.6], [1.4, 2.6]], [[-1.4, 5], [0.45, 5]], [[1.0, 5], [1.4, 5]], [[-0.5, 7.4], [1.4, 7.4]], [[1.4, 8.4], [0.2, 8.4]]],
    tiers: [{ poly: rect(-1.5, -0.1, 1.5, 2.6), h: 0.45 }, { poly: rect(-1.5, 2.6, 1.5, 5), h: 0.3 }, { poly: rect(-1.5, 5, 1.5, 7.4), h: 0.15 }],
    zones: [{ surf: 'sand', poly: rect(-1.4, 9.3, -0.6, 10) }],
    movers: [C22_WEED(-1.0, 3.8, 1.0, 3.8, 2.4), C22_GATE(0.35, 5, 0.95, 5, 0.25, 90, 2.2), C22_WEED(1.0, 6.3, -1.0, 6.3, 2.6, 1.1)],
    posts: [C22_CACTUS(0.5, 1.6), C22_CACTUS(-0.9, 8.6), C22_CACTUS(-0.1, 9.6)] },
  /* 16. long green: the dogleg. Up the long lane and round the corner to the left, a ridge on the corner and the
     whole green leaning back toward the tee; the lag has to turn the corner off the far wall or die at it */
  { par: 3, sol: [[0,0.8,0]], tee: [0.2, 0.5], cup: [4.9, 9.0], aim0: 0,
    shape: [[-1.0, 0], [1.4, 0], [1.4, 7.5], [6.0, 7.5], [6.0, 10.5], [-1.0, 10.5]],
    tiers: [{ poly: rect(-1.1, -0.1, 6.1, 10.6), h: 0.1, sz: 0.01, sx: 0.006 }],
    bumps: [{ x: 0.2, z: 9.0, r: 1.2, h: 0.12 }, { x: 0.2, z: 4.0, r: 1.3, h: -0.07 }, { x: 3.2, z: 9.6, r: 1.0, h: 0.07 }],
    zones: [{ surf: 'sand', poly: rect(5.2, 9.8, 6.0, 10.5) }],
    posts: [C22_CACTUS(-0.6, 6.0), C22_CACTUS(2.4, 7.9)] },
  /* 17. the grand chain: high deck, the shaft or the ramp to the mid mesa, the second shaft or the gated drop
     to the dunes, the plank over the flood, up to the summit green */
  { par: 5, crazy: true, sol: [[335,1,1.5],[320,0.4375,0],[270,0.625,0],[0,0.5625,0]], tee: [0, 0.5], cup: [-0.6, 12.3],
    shape: [[-0.8, 0], [0.8, 0], [0.8, 3.5], [2, 3.5], [2, 13], [-2, 13], [-2, 3.5], [-0.8, 3.5]],
    inner: [[[-2, 6.3], [0.1, 6.3]], [[0.9, 6.3], [2, 6.3]]],
    ramps: [{ x0: -0.9, z0: 2.5, x1: 0.9, z1: 3.5, axis: 'z', h0: 0.45, h1: 0.25 }, { x0: -2.1, z0: 10.2, x1: 0.2, z1: 11, axis: 'z', h0: 0.05, h1: 0.3 }],
    tiers: [{ poly: rect(-0.9, -0.1, 0.9, 2.5), h: 0.45 }, { poly: rect(-2.1, 3.5, 2.1, 6.3), h: 0.25 }, { poly: rect(-2.1, 6.3, 2.1, 10.2), h: 0.05 },
      { poly: rect(-2.1, 11, 2.1, 13.1), h: 0.3 }],
    bumps: [{ x: 0.9, z: 7.4, r: 0.4, h: 0.18 }],
    tubes: [{ a: [-0.4, 1.8], b: [-1.4, 4.4], dir: 0, keep: 0.5, add: 0.3 }, { a: [-1.5, 5.7], b: [-1.4, 7.2], dir: 10, keep: 0.5, add: 0.35 }],
    zones: [{ surf: 'water', poly: rect(-2, 8.6, 1.2, 9.3) }, { surf: 'fast', poly: rect(1.2, 8.5, 2, 9.4) }, { surf: 'sand', poly: rect(0.8, 11, 2, 11.6) }],
    movers: [C22_WEED(-1.0, 4.9, 1.4, 4.9, 2.8), C22_GATE(0.35, 6.3, 1.25, 6.3, 0.3, 90, 2.8)],
    posts: [C22_CACTUS(0.2, 12.0), C22_CACTUS(1.3, 12.5), C22_ROCK(-0.9, 7.9, 0.13)] },
  /* 18. the canyon express: off the summit deck down the fast chute, two corner boards, down the rail into the
     first shaft, along the ice flume into the second shaft, spat into the first coin-funnel drain that spins
     it down into a third shaft at its heart, which fires it into the second drain to spiral round into the cup.
     A firm straight putt rides it all the way. */
  { par: 4, auto: true, crazy: true, sol: [[0, 0.85, 0]], tee: [0, 0.5], cup: [1.3, 6.35], aim0: 0,
    shape: [[0.4, 0], [-0.4, 0], [-0.4, 3.5], [-3.4, 3.5], [-3.4, 9.4], [2.6, 9.4], [2.6, 4.3], [0.4, 4.3], [0.4, 3.5], [0.4, 3.0]],
    inner: [[[0.4, 3.5], [-0.4, 4.3]], [[-2.6, 3.5], [-3.4, 4.3]], [[0.4, 4.3], [-2.6, 4.3], [-2.6, 8.4]], [[-3.4, 8.4], [2.6, 8.4]],
      [[-2.6, 7.4], [-2.8, 7.85]], [[-3.4, 7.4], [-3.2, 7.85]], [[1.7, 8.4], [2.15, 8.7]], [[1.7, 9.4], [2.15, 9.1]]],
    ramps: [{ x0: -0.5, z0: 2, x1: 0.5, z1: 3.3, axis: 'z', h0: 1.0, h1: 0.8 }, { x0: -2.6, z0: 3.4, x1: -0.4, z1: 4.4, axis: 'x', h0: 0.42, h1: 0.74 },
      { x0: -3.5, z0: 4.4, x1: -2.5, z1: 7.75, axis: 'z', h0: 0.39, h1: 0.06 }],
    tiers: [{ poly: rect(-2.6, 4.1, 2.7, 8.4), h: 0.35 }, { poly: rect(-0.5, -0.1, 0.5, 2), h: 1.0 }, { poly: rect(-0.5, 3.3, 0.5, 4.4), h: 0.76, sx: 0.05 },
      { poly: rect(-3.5, 3.4, -2.5, 4.4), h: 0.654, sz: -0.06 }, { poly: rect(-3.5, 7.75, -2.5, 8.4), h: 0.06 },
      { poly: rect(-3.5, 8.4, 2.7, 9.5), h: 0.3 }],
    drains: [{ x: -1.25, z: 6.35, r: 1.1, depth: 0.28, flat: 0.16 }, { x: 1.3, z: 6.35, r: 1.1, depth: 0.28 }],
    tubes: [{ a: [-3.0, 8.0], b: [-2.9, 8.9], dir: 90, keep: 0.3, add: 1.4 }, { a: [2.3, 8.9], b: [-0.7, 7.4], dir: 250, keep: 0, add: 0.7 },
      { a: [-1.25, 6.35], b: [0.75, 5.3], dir: 70, keep: 0, add: 1.0 }],
    zones: [{ surf: 'fast', poly: rect(-0.4, 2, 0.4, 3.3) }, { surf: 'ice', poly: rect(-3.4, 8.4, 2.6, 9.4) }],
    posts: [C22_CACTUS(-2.25, 4.65), C22_ROCK(2.2, 8.0, 0.13)] },
] });
