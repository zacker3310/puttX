/* world 7, the haunted castle: windmills guarding ramps, portcullis gates, secret-passage tubes
   (only one mouth is the good one), the moat, castle stair tiers, drifting ghosts and gargoyles.
   Each hole's `sol` is printed by `PUTTX_ONLY=7 node scripts/solve.cjs --hole 7-K`. */
const C7_MILL = (x, z, len, w, phase) => ({ kind: 'spin', x, z, len, w, phase, blades: 2, look: 'windmill' });
const C7_GATE = (ax, az, bx, bz, len, ang, period, phase) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'portcullis' });
const C7_GHOST = (ax, az, bx, bz, period, phase) => ({ kind: 'slide', ax, az, bx, bz, r: 0.17, period, phase, look: 'ghost' });
const C7_GARG = (x, z) => ({ x, z, r: 0.12, top: 0.3, look: 'gargoyle' });
const C7_MOAT = poly => ({ surf: 'water', poly });
registerWorld(7, { holes: [
  /* 1: over the drawbridge; a gargoyle guards the cup */
  { par: 2, sol: [[34,0.84,0]], tee: [0, 0.5], cup: [0, 5.3], shape: rect(-0.9, 0, 0.9, 6),
    zones: [C7_MOAT(rect(-0.9, 2.6, -0.15, 3.4)), C7_MOAT(rect(0.35, 2.6, 0.9, 3.4))],
    posts: [C7_GARG(0.05, 4.4)] },
  /* 2: a windmill guards the ramp up to the keep */
  { par: 3, sol: [[312,0.96,0]], tee: [0, 0.5], cup: [0.3, 5.6], shape: rect(-0.8, 0, 0.8, 6.5),
    ramps: [{ x0: -0.8, z0: 2.7, x1: 0.8, z1: 3.7, axis: 'z', h0: 0, h1: 0.25 }],
    tiers: [{ poly: rect(-0.8, 3.7, 0.8, 6.5), h: 0.25 }],
    movers: [C7_MILL(0, 2.0, 0.55, 1.6, 0)] },
  /* 3: the portcullis rises and falls in the castle door */
  { par: 2, sol: [[42,0.76,0]], tee: [0, 0.5], cup: [-0.45, 5.2], shape: rect(-1, 0, 1, 6),
    inner: [[[-1, 3], [-0.3, 3]], [[0.3, 3], [1, 3]]],
    bumps: [{ x: 0.1, z: 4.3, r: 0.5, h: 0.15 }],
    movers: [C7_GATE(0, 3, 0.47, 3, 0.3, 90, 3, 0)] },
  /* 4: three secret passages under the wall; only one comes out by the cup */
  { par: 3, sol: [[136,0.96,0],[56,0.56,0]], tee: [0, 0.5], cup: [-0.3, 5.6], aim0: -14, shape: rect(-1.2, 0, 1.2, 6.5),
    inner: [[[-1.2, 3.2], [1.2, 3.2]]],
    tubes: [{ a: [0.65, 2.5], b: [-0.9, 0.6], dir: 20 }, { a: [0, 2.6], b: [0.85, 5.9], dir: 200 }, { a: [-0.65, 2.5], b: [0.6, 3.7], dir: -20 }] },
  /* 5: zig-zag castle stairs */
  { par: 3, sol: [[320,1,0],[8,0.38,0]], tee: [0.4, 0.5], cup: [-0.3, 6.8], shape: rect(-0.9, 0, 0.9, 7.6),
    tiers: [{ poly: rect(-0.9, 2.5, 0.9, 7.6), h: 0.15 }, { poly: rect(-0.9, 4.6, 0.9, 7.6), h: 0.3 }],
    ramps: [{ x0: -0.9, z0: 1.8, x1: -0.35, z1: 2.5, axis: 'z', h0: 0, h1: 0.15 }, { x0: 0.35, z0: 3.9, x1: 0.9, z1: 4.6, axis: 'z', h0: 0.15, h1: 0.3 }],
    posts: [C7_GARG(-0.45, 3.6), C7_GARG(0.05, 6.15)] },
  /* 6: a ghost drifts across the great hall corner */
  { par: 3, sol: [[18,0.8,0]], tee: [0, 0.5], cup: [3.1, 5.0], shape: [[-0.8, 0], [0.8, 0], [0.8, 4.2], [3.8, 4.2], [3.8, 5.8], [-0.8, 5.8]],
    bumps: [{ x: -0.1, z: 5.0, r: 0.6, h: 0.32 }],
    zones: [{ surf: 'sand', poly: rect(2.6, 4.2, 3.8, 4.6) }, { surf: 'sand', poly: rect(2.6, 5.4, 3.8, 5.8) }],
    movers: [C7_GHOST(1.4, 4.55, 1.4, 5.45, 2.6, 0), C7_GHOST(2.4, 5.45, 2.4, 4.55, 2.0, 0.7)] },
  /* 7: jump the moat off the drawbridge ramp, or tiptoe the narrow side bridge; the courtyard tilts */
  { par: 2, sol: [[6,0.76,0]], tee: [0, 0.5], cup: [0.5, 5.9], shape: rect(-1.4, 0, 1.4, 7),
    ramps: [{ x0: -0.3, z0: 2.3, x1: 0.3, z1: 3.0, axis: 'z', h0: 0, h1: 0.18 }],
    tiers: [{ poly: rect(-1.4, 3.6, 1.4, 7), h: 0.045, sx: 0.03 }],
    zones: [C7_MOAT(rect(-0.95, 3.0, 1.4, 3.6))] },
  /* 8: twin windmills, up the ramp and round the corner */
  { par: 3, sol: [[332,1,0],[24,0.5,1.2]], tee: [0, 0.5], cup: [3.2, 5.5], shape: [[-0.8, 0], [0.8, 0], [0.8, 4.6], [3.8, 4.6], [3.8, 6.4], [-0.8, 6.4]],
    ramps: [{ x0: -0.8, z0: 2.5, x1: 0.8, z1: 3.5, axis: 'z', h0: 0, h1: 0.25 }],
    tiers: [{ poly: [[-0.8, 3.5], [0.8, 3.5], [0.8, 4.6], [3.8, 4.6], [3.8, 6.4], [-0.8, 6.4]], h: 0.25 }],
    movers: [C7_MILL(0, 1.9, 0.55, 1.8, 0), C7_MILL(2.2, 5.5, 0.55, -1.4, 0.5)] },
  /* 9: over the big hill, past the gargoyles, onto the bell-tower mound */
  { par: 2, sol: [[40,0.875,0]], tee: [0, 0.5], cup: [0.2, 6.0], shape: rect(-1.3, 0, 1.3, 7.5),
    bumps: [{ x: 0, z: 3.0, r: 0.75, h: 0.34 }, { x: 0.2, z: 6.0, r: 0.6, h: 0.13 }],
    zones: [C7_MOAT(rect(-1.3, 7.0, 1.3, 7.5))],
    posts: [C7_GARG(0.6, 5.2), C7_GARG(-0.35, 5.25)] },
  /* 10: the drop deck: two secret passages and a daring jump down to the crypt green */
  { par: 3, sol: [[2,0.84,0]], tee: [0, 0.5], cup: [-0.7, 7.2], floors: [rect(-1, 0, 1, 3.4), rect(-1.4, 4.2, 1.4, 8)],
    tiers: [{ poly: rect(-1, 0, 1, 3.4), h: 0.35 }],
    walls: [[[-0.2, 3.4], [-1, 3.4], [-1, 0], [1, 0], [1, 3.4], [0.2, 3.4]], [[-0.4, 4.2], [-1.4, 4.2], [-1.4, 8], [1.4, 8], [1.4, 4.2], [0.4, 4.2]]],
    tubes: [{ a: [0.62, 2.9], b: [1.0, 4.7], dir: 0 }, { a: [-0.62, 2.9], b: [-0.7, 0.4], dir: 0 }],
    bumps: [{ x: 0.3, z: 5.5, r: 0.5, h: 0.2 }],
    movers: [C7_MILL(0.1, 6.2, 0.5, 1.5, 0)] },
  /* 11: down the dungeon and back through the portcullis, a ghost on patrol */
  { par: 3, sol: [[332,0.9375,0],[12,1,0]], tee: [0, 0.5], cup: [2.4, 1.5], aim0: 0, shape: [[-0.7, 0], [0.7, 0], [0.7, 4.1], [1.7, 4.1], [1.7, 0.8], [3.1, 0.8], [3.1, 5.5], [-0.7, 5.5]],
    inner: [[[1.7, 3], [2.15, 3]], [[2.65, 3], [3.1, 3]]],
    bumps: [{ x: -0.1, z: 4.85, r: 0.5, h: 0.2 }],
    movers: [C7_GHOST(1.2, 4.45, 1.2, 5.15, 2.2, 0), C7_GATE(2.4, 3, 2.85, 3, 0.25, 90, 2.8, 0)] },
  /* 12: the ghost ballroom: two dancing ghosts on a polished floor, the cup up on the stage */
  { par: 3, sol: [[180,0.9,0],[4,0.95,0]], tee: [0, 0.5], cup: [0.6, 7.05], shape: rect(-1.3, 0, 1.3, 7.6),
    zones: [{ surf: 'fast', poly: rect(-1.3, 1.5, 1.3, 5.8) }],
    tiers: [{ poly: rect(-1.3, 6.4, 1.3, 7.6), h: 0.15 }],
    ramps: [{ x0: -0.25, z0: 5.8, x1: 0.25, z1: 6.4, axis: 'z', h0: 0, h1: 0.15 }],
    inner: [[[-1.3, 6.4], [-0.25, 6.4], [-0.25, 5.8]], [[1.3, 6.4], [0.25, 6.4], [0.25, 5.8]]],
    posts: [C7_GARG(-0.65, 5.95), C7_GARG(0.65, 5.95), C7_GARG(0.25, 6.8)],
    movers: [C7_GHOST(-0.75, 3.0, 0.75, 3.0, 3.0, 0), C7_GHOST(0.75, 4.5, -0.75, 4.5, 2.4, 1.2)] },
  /* 13: windmill ramp to the rampart, down the narrow drawbridge (or jump the moat), then the tilted courtyard */
  { par: 4, sol: [[322,0.92,0],[72,0.48,0]], tee: [0, 0.5], cup: [-0.5, 8.7], shape: rect(-1.2, 0, 1.2, 9.6),
    ramps: [{ x0: -1.2, z0: 2.6, x1: 1.2, z1: 3.6, axis: 'z', h0: 0, h1: 0.3 }, { x0: 0.55, z0: 5.4, x1: 1.05, z1: 6.5, axis: 'z', h0: 0.3, h1: 0.07 }],
    tiers: [{ poly: rect(-1.2, 3.6, 1.2, 5.4), h: 0.3 }, { poly: rect(-1.2, 6.5, 1.2, 9.6), h: 0.2, sz: -0.02 }],
    zones: [C7_MOAT(rect(-1.2, 5.4, 0.55, 6.5)), C7_MOAT(rect(1.05, 5.4, 1.2, 6.5)), C7_MOAT(rect(-1.2, 9.25, 1.2, 9.6))],
    posts: [C7_GARG(-0.1, 8.1), C7_GARG(-0.9, 8.15)],
    movers: [C7_MILL(0, 2.0, 0.6, 1.5, 0), C7_GHOST(-0.85, 7.35, 0.6, 7.35, 2.6, 0)] },
  /* 14: three dungeon rooms joined by secret passages; pick the right mouths */
  { par: 4, sol: [[140,1,0],[56,0.88,1.2],[4,0.88,0]], tee: [0, 0.5], cup: [0.4, 9.4], aim0: 14, floors: [rect(-1, 0, 1, 2.8), rect(-1, 3.6, 1, 6.4), rect(-1, 7.2, 1, 10)],
    walls: [ring(rect(-1, 0, 1, 2.8)), ring(rect(-1, 3.6, 1, 6.4)), ring(rect(-1, 7.2, 1, 10)), [[-1, 5], [-0.25, 5]], [[0.25, 5], [1, 5]]],
    zones: [{ surf: 'sand', poly: rect(-1, 3.6, -0.3, 4.4) }],
    tubes: [{ a: [0.6, 2.35], b: [0.7, 3.95], dir: 0 }, { a: [0, 2.35], b: [-0.7, 0.45], dir: 20 }, { a: [-0.6, 2.35], b: [-0.7, 3.95], dir: 0 },
      { a: [0.6, 6.0], b: [-0.6, 7.5], dir: 0 }, { a: [-0.6, 6.0], b: [0.7, 0.45], dir: -20 }],
    movers: [C7_GATE(0, 5, -0.5, 5, 0.25, 90, 2.6, 0), C7_MILL(0.0, 8.5, 0.5, 1.6, 0)] },
  /* 15: bridge, island and bridge across the moat while ghosts patrol */
  { par: 4, sol: [[164,0.5625,0],[348,0.3125,0],[280,0.5,0],[28,0.4375,0]], tee: [0, 0.5], cup: [0.7, 8.1], aim0: 18, shape: rect(-1.6, 0, 1.6, 9),
    zones: [C7_MOAT(rect(-1.6, 1.8, 0.6, 3.6)), C7_MOAT(rect(1.1, 1.8, 1.6, 3.6)), C7_MOAT(rect(-0.6, 4.8, 1.6, 6.6)), C7_MOAT(rect(-1.6, 4.8, -1.1, 6.6))],
    posts: [C7_GARG(0.15, 7.7), C7_GARG(1.25, 7.5)],
    movers: [C7_GHOST(-1.0, 4.2, 1.0, 4.2, 3.2, 0), C7_GHOST(-0.3, 7.2, 0.9, 7.2, 2.4, 1.5)] },
  /* 16: graveyard switchbacks: hills in the turns, a ghost in the middle aisle, the old well before the cup */
  { par: 4, sol: [[340,1,0],[204,1,0],[8,0.75,0]], tee: [-1.4, 0.5], cup: [1.4, 6.3], shape: rect(-2.1, 0, 2.1, 7),
    inner: [[[-0.7, 0], [-0.7, 5.6]], [[0.7, 7], [0.7, 1.4]]],
    bumps: [{ x: -0.7, z: 6.4, r: 0.45, h: 0.25 }, { x: 0.7, z: 0.6, r: 0.45, h: 0.25 }, { x: 1.4, z: 4.6, r: 0.45, h: -0.22 }],
    posts: [C7_GARG(1.05, 5.6)],
    movers: [C7_GHOST(-0.35, 3.5, 0.35, 3.5, 2.0, 0)] },
  /* 17: round the tower: up the stairs, along the battlement, through the portcullis */
  { par: 4, sol: [[4,0.7,0],[36,1,0]], tee: [-1.1, 0.5], cup: [1.1, 0.6], aim0: 0, shape: [[-1.6, 0], [-0.6, 0], [-0.6, 3.6], [0.6, 3.6], [0.6, 0], [1.6, 0], [1.6, 4.6], [-1.6, 4.6]],
    tiers: [{ poly: rect(-1.6, 2.5, 1.6, 4.6), h: 0.15 }, { poly: rect(0.5, 0, 1.6, 4.6), h: 0.3 }],
    ramps: [{ x0: -1.6, z0: 1.5, x1: -0.6, z1: 2.5, axis: 'z', h0: 0, h1: 0.15 }, { x0: -0.3, z0: 3.6, x1: 0.5, z1: 4.6, axis: 'x', h0: 0.15, h1: 0.3 }],
    inner: [[[0.6, 2], [0.875, 2]], [[1.375, 2], [1.6, 2]]],
    bumps: [{ x: -1.1, z: 4.1, r: 0.35, h: 0.1 }],
    movers: [C7_GATE(1.125, 2, 1.375, 2, 0.25, 90, 2.4, 0)] },
  /* 18: the showpiece: through the gate, up the tower stairs, into the right secret passage, down to the throne room */
  { par: 4, sol: [[0,0.6,1.2],[20,1,1.2]], tee: [0, 0.5], cup: [3.4, 7.3], floors: [rect(-1.2, 0, 1.2, 7), rect(2.0, 3.0, 4.8, 8.0)],
    walls: [ring(rect(-1.2, 0, 1.2, 7)), ring(rect(2.0, 3.0, 4.8, 8.0)), [[-1.2, 2.2], [-0.3, 2.2]], [[0.3, 2.2], [1.2, 2.2]]],
    tiers: [{ poly: rect(-1.2, 3.8, 1.2, 7), h: 0.2 }, { poly: rect(-1.2, 5.4, 1.2, 7), h: 0.4 }, { poly: rect(2.6, 6.4, 4.2, 8.0), h: 0.1 }],
    ramps: [{ x0: -1.2, z0: 3.0, x1: 0, z1: 3.8, axis: 'z', h0: 0, h1: 0.2 }, { x0: 0, z0: 4.6, x1: 1.2, z1: 5.4, axis: 'z', h0: 0.2, h1: 0.4 },
      { x0: 2.9, z0: 5.8, x1: 3.9, z1: 6.4, axis: 'z', h0: 0, h1: 0.1 }],
    tubes: [{ a: [0.7, 6.6], b: [3.4, 3.4], dir: 0 }, { a: [0, 6.6], b: [-0.8, 0.5], dir: 0 }, { a: [-0.7, 6.6], b: [0.8, 2.7], dir: 0 }],
    posts: [C7_GARG(2.65, 6.1), C7_GARG(4.15, 6.1)],
    movers: [C7_GATE(0, 2.2, 0.6, 2.2, 0.3, 90, 3, 0), C7_MILL(0, 5.85, 0.4, 1.7, 0), C7_GHOST(2.4, 5.0, 4.4, 5.0, 3.0, 0)] },
] });
