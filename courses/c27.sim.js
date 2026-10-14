/* world 7, course 27: the haunted castle's masterpiece, the keep at midnight. Layered terraces,
   switchback stairs, chains of secret passages, portcullis gates over every drop, and a spiral
   chute that carries a good putt through two passages into the cup.
   Each hole's `sol` is printed by `PUTTX_ONLY=27 node scripts/solve.cjs --hole 27-K`. */
const C27_MILL = (x, z, len, w, phase) => ({ kind: 'spin', x, z, len, w, phase, blades: 2, look: 'windmill' });
const C27_GATE = (ax, az, bx, bz, len, ang, period, phase) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'portcullis' });
const C27_GHOST = (ax, az, bx, bz, period, phase) => ({ kind: 'slide', ax, az, bx, bz, r: 0.17, period, phase, look: 'ghost' });
const C27_GARG = (x, z) => ({ x, z, r: 0.12, top: 0.3, look: 'gargoyle' });
const C27_MOAT = poly => ({ surf: 'water', poly });
registerWorld(27, { holes: [
  /* 1: the barbican: the portcullis in the middle or the narrow postern door by the wall */
  { par: 2, sol: [[0,0.6,0]], tee: [0, 0.5], cup: [-0.3, 5.3], shape: rect(-1.1, 0, 1.1, 6.2),
    inner: [[[-1.1, 3], [-0.3, 3]], [[0.3, 3], [0.7, 3]]],
    bumps: [{ x: 0, z: 1.8, r: 0.4, h: 0.1 }],
    posts: [C27_GARG(0.35, 4.6)],
    movers: [C27_GATE(0, 3, -0.6, 3, 0.3, 90, 3, 0)] },
  /* 2: the keep green: a long lower lawn with a swale, a step up to a top tier that falls back
     toward you, a ridge across it and the cup on the flat behind */
  { par: 3, sol: [[6,0.92,0]], tee: [0, 0.5], cup: [0.7, 11.8], shape: rect(-1.8, 0, 1.8, 12.8),
    ramps: [{ x0: -1.8, z0: 5.0, x1: 1.8, z1: 6.0, axis: 'z', h0: 0, h1: 0.14 }],
    tiers: [{ poly: rect(-1.8, 6.0, 1.8, 12.8), h: 0.2, sz: -0.01 }],
    bumps: [{ x: -0.6, z: 2.8, r: 1.3, h: -0.09 }, { x: 0.9, z: 1.8, r: 0.9, h: 0.06 }, { x: -0.3, z: 9.0, r: 1.5, h: 0.13 }] },
  /* 3: the first switchback stair: across, up, back and up again to the cup */
  { par: 3, sol: [[62,1,0]], tee: [-1.1, 0.5], cup: [-1.1, 4.2], aim0: 90, shape: rect(-1.6, 0, 1.6, 5),
    inner: [[[-1.6, 2.5], [0.6, 2.5]]],
    tiers: [{ poly: rect(0.6, 0, 1.6, 5), h: 0.15 }, { poly: rect(-1.6, 2.5, -0.2, 5), h: 0.3 }],
    ramps: [{ x0: -0.4, z0: 0, x1: 0.6, z1: 2.5, axis: 'x', h0: 0, h1: 0.15 }, { x0: -0.2, z0: 2.5, x1: 0.6, z1: 5, axis: 'x', h0: 0.3, h1: 0.15 }],
    posts: [C27_GARG(1.1, 1.9)],
    movers: [C27_MILL(-0.75, 1.4, 0.45, 1.5, 0)] },
  /* 4: island hopping: the bridge, the windmill island, then the ghost on the far bridge */
  { par: 3, sol: [[28,0.5625,0],[83.25,0.99,1.4]], tee: [0, 0.5], cup: [0.6, 7.1], aim0: 15, shape: rect(-1.5, 0, 1.5, 8),
    zones: [C27_MOAT(rect(-1.5, 2.4, 0.9, 3.4)), C27_MOAT(rect(-0.9, 5.0, 1.5, 6.0)), { surf: 'sand', poly: rect(-1.5, 3.4, -0.9, 4.0) }],
    posts: [C27_GARG(-0.1, 6.7)],
    movers: [C27_MILL(0, 4.2, 0.5, 1.5, 0), C27_GHOST(-1.2, 4.6, -1.2, 6.4, 2.4, 0)] },
  /* 5: three cellars in a row: a chain of passages, a pair of mouths where only one goes on */
  { par: 3, sol: [[0,0.8,0],[69,0.65,0]], tee: [1.2, 0.5], cup: [-1.2, 4.2], aim0: 0, shape: rect(-1.8, 0, 1.8, 5),
    inner: [[[-0.6, 0], [-0.6, 5]], [[0.6, 0], [0.6, 5]]],
    tubes: [{ a: [1.2, 4.4], b: [0, 4.4], dir: 180 }, { a: [1.55, 3.4], b: [1.2, 1.2], dir: 0 },
      { a: [0.25, 0.6], b: [-1.2, 0.6], dir: 0 }, { a: [-0.25, 0.6], b: [0.95, 1.2], dir: 0 }],
    bumps: [{ x: 0, z: 2.4, r: 0.35, h: 0.12 }, { x: -1.3, z: 2.6, r: 0.35, h: 0.15 }],
    posts: [C27_GARG(-0.95, 3.5)] },
  /* 6: down the terraces: each drop has a portcullis and a narrow side door, a ghost in between */
  { par: 3, sol: [[356,1,0]], tee: [0, 0.5], cup: [0.4, 8.4], shape: rect(-1.3, 0, 1.3, 9.5),
    tiers: [{ poly: rect(-1.3, 0, 1.3, 3), h: 0.45 }, { poly: rect(-1.3, 3, 1.3, 6), h: 0.25, sx: -0.03 }],
    inner: [[[-0.75, 3], [-0.3, 3]], [[0.3, 3], [1.3, 3]], [[-1.3, 6], [-0.75, 6]], [[-0.25, 6], [0.75, 6]]],
    bumps: [{ x: -0.5, z: 7.6, r: 0.5, h: 0.25 }],
    posts: [C27_GARG(0.9, 7.4)],
    movers: [C27_GATE(0, 3, 0.6, 3, 0.3, 90, 3, 0), C27_GHOST(-0.8, 4.5, 0.8, 4.5, 2.6, 0), C27_GATE(-0.5, 6, -0.89, 6, 0.25, 90, 2.6, 0.5)] },
  /* 7: the tower spiral: up the stair, up the landing ramp, then through the portcullis and drop to the cup */
  { par: 4, crazy: true, sol: [[4,0.75,0],[40.25,1,0]], tee: [-1.2, 0.5], cup: [1.2, 0.7], aim0: 0, shape: [[-1.8, 0], [-0.6, 0], [-0.6, 3.6], [0.6, 3.6], [0.6, 0], [1.8, 0], [1.8, 4.8], [-1.8, 4.8]],
    tiers: [{ poly: [[-1.8, 2.4], [-0.6, 2.4], [-0.6, 3.6], [-0.4, 3.6], [-0.4, 4.8], [-1.8, 4.8]], h: 0.15 },
      { poly: [[0.4, 3.6], [0.4, 4.8], [1.8, 4.8], [1.8, 2.2], [0.6, 2.2], [0.6, 3.6]], h: 0.3 }],
    ramps: [{ x0: -1.8, z0: 1.6, x1: -0.6, z1: 2.4, axis: 'z', h0: 0, h1: 0.15 }, { x0: -0.4, z0: 3.6, x1: 0.4, z1: 4.8, axis: 'x', h0: 0.15, h1: 0.3 }],
    inner: [[[0.6, 2.2], [0.95, 2.2]], [[1.45, 2.2], [1.8, 2.2]]],
    bumps: [{ x: -1.3, z: 4.25, r: 0.3, h: 0.1 }],
    movers: [C27_GATE(1.2, 2.2, 1.65, 2.2, 0.25, 90, 2.4, 0)] },
  /* 8: the vortex crypt: up the tower stair, round the landing, off the battlement edge onto the
     ghost wind, into the secret passage, then three spectral vortices in a row, each one's drain
     dropping into the passage to the next, the last spinning the ball into the cup. */
  { par: 4, auto: true, sol: [[1.5,0.95,0]], tee: [0.4, 0.5], cup: [-8.6, 3.3], aim0: 0,
    floors: [rect(-0.8, 0, 0.8, 4.6), C7_VORTEX(-2.6, 3.3), C7_VORTEX(-5.6, 3.3), C7_VORTEX(-8.6, 3.3)],
    walls: [ring(rect(-0.8, 0, 0.8, 4.6)), ring(C7_VORTEX(-2.6, 3.3)), ring(C7_VORTEX(-5.6, 3.3)), ring(C7_VORTEX(-8.6, 3.3)), [[0, 0], [0, 3.8]],
      [[0.8, 4.0], [0.4, 4.6]], [[-0.8, 4.0], [-0.4, 4.6]], [[-0.8, 1.3], [-0.6, 0.6], [-0.6, 0]], [[0, 1.3], [-0.2, 0.6], [-0.2, 0]]],
    tiers: [{ poly: rect(0, 2.7, 0.8, 4.6), h: 0.4 }, { poly: rect(-0.8, 3.1, 0, 4.6), h: 0.4 }],
    ramps: [{ x0: 0, z0: 1.3, x1: 0.8, z1: 2.7, axis: 'z', h0: 0, h1: 0.4 }],
    zones: [{ push: [0, -0.9], poly: rect(-0.8, 0, 0, 3.1) }],
    drains: [C7_DRAIN(-2.6, 3.3), C7_DRAIN(-5.6, 3.3), C7_DRAIN(-8.6, 3.3)],
    tubes: [{ a: [-0.4, 0.35], b: [-1.65, 0.5], dir: 0, keep: 0, add: 1.5 }, { a: [-2.6, 3.3], b: [-4.65, 0.5], dir: 0, keep: 0, add: 1.5 },
      { a: [-5.6, 3.3], b: [-7.65, 0.5], dir: 0, keep: 0, add: 2.0 }] },
  /* 9: the grand switchback: three flights of the stair, then the portcullis on the top landing */
  { par: 4, sol: [[80,0.8125,0],[240,1,0]], tee: [-1.5, 0.6], cup: [1.4, 3.0], aim0: 90, shape: rect(-2, 0, 2, 3.6),
    inner: [[[-2, 1.2], [0.8, 1.2]], [[-0.8, 2.4], [2, 2.4]], [[0.5, 2.4], [0.5, 2.7]]],
    tiers: [{ poly: rect(0.8, 0, 2, 2.4), h: 0.15 }, { poly: [[-2, 1.2], [-0.8, 1.2], [-0.8, 2.4], [2, 2.4], [2, 3.6], [-2, 3.6]], h: 0.3 }],
    ramps: [{ x0: -0.4, z0: 0, x1: 0.8, z1: 1.2, axis: 'x', h0: 0, h1: 0.15 }, { x0: -0.8, z0: 1.2, x1: 0.8, z1: 2.4, axis: 'x', h0: 0.3, h1: 0.15 }],
    movers: [C27_GHOST(-1.4, 1.6, -1.4, 3.2, 2.6, 0), C27_GATE(0.5, 3.0, 0.5, 3.6, 0.3, 0, 2.6, 0)] },
  /* 10: the gatehouse leap: three floating floors; a portcullis guards each drop, a passage skips one */
  { par: 4, sol: [[4,0.9375,0],[64,0.875,0]], tee: [0, 0.5], cup: [-0.4, 9.4], floors: [rect(-0.9, 0, 0.9, 3.0), rect(-1.5, 3.6, 1.5, 6.6), rect(-1.2, 7.2, 1.2, 10.2)],
    tiers: [{ poly: rect(-0.9, 0, 0.9, 3.0), h: 0.45 }, { poly: rect(-1.5, 3.6, 1.5, 6.6), h: 0.25 }],
    walls: [[[-0.25, 3], [-0.9, 3], [-0.9, 0], [0.9, 0], [0.9, 3], [0.25, 3]],
      [[-0.5, 3.6], [-1.5, 3.6], [-1.5, 6.6], [0.5, 6.6]], [[0.5, 3.6], [1.5, 3.6], [1.5, 6.6], [1.0, 6.6]],
      [[0.4, 7.2], [-1.2, 7.2], [-1.2, 10.2], [1.2, 10.2], [1.2, 7.2], [1.1, 7.2]]],
    tubes: [{ a: [-1.1, 6.1], b: [-0.6, 7.7], dir: 0 }],
    bumps: [{ x: 0.6, z: 9.2, r: 0.35, h: 0.15 }],
    movers: [C27_GATE(0, 3, -0.49, 3, 0.25, 90, 2.8, 0), C27_GHOST(-1.0, 5.0, 1.0, 5.0, 2.8, 0), C27_GATE(0.75, 6.6, 0.25, 6.6, 0.25, 90, 2.6, 0.6),
      C27_MILL(-0.1, 8.4, 0.45, 1.5, 0)] },
  /* 11: the throne stage: the polished floor and its dancers, the stage ramps, the portcullis, the dais */
  { par: 4, crazy: true, sol: [[16,1,0],[4,0.125,0]], tee: [0, 0.5], cup: [0, 8.4], shape: rect(-1.4, 0, 1.4, 9),
    zones: [{ surf: 'fast', poly: rect(-1.4, 1.4, 1.4, 5.0) }],
    tiers: [{ poly: rect(-1.4, 5.6, 1.4, 9), h: 0.2 }, { poly: rect(-0.6, 7.6, 0.6, 9), h: 0.32 }],
    ramps: [{ x0: -1.4, z0: 5.0, x1: -0.8, z1: 5.6, axis: 'z', h0: 0, h1: 0.2 }, { x0: 0.8, z0: 5.0, x1: 1.4, z1: 5.6, axis: 'z', h0: 0, h1: 0.2 },
      { x0: -0.35, z0: 7.0, x1: 0.35, z1: 7.6, axis: 'z', h0: 0.2, h1: 0.32 }],
    inner: [[[-0.8, 5.0], [-0.8, 5.6], [0.8, 5.6], [0.8, 5.0]], [[-1.4, 6.8], [-0.35, 6.8]], [[0.35, 6.8], [1.4, 6.8]]],
    tubes: [{ a: [1.1, 4.6], b: [-1.0, 7.4], dir: 0 }],
    posts: [C27_GARG(-0.95, 8.1), C27_GARG(0.95, 8.1)],
    movers: [C27_GHOST(-1.0, 2.6, 1.0, 2.6, 3.0, 0), C27_GHOST(0.7, 4.0, -1.0, 4.0, 2.4, 1.2), C27_GATE(0, 6.8, 0.7, 6.8, 0.35, 90, 3, 0)] },
  /* 12: the secret library: four rooms, six passages, a sloping reading room and a ghost librarian */
  { par: 4, crazy: true, sol: [[153,0.9,0],[213,1,0],[180,0.9,0],[12,0.9,0]], tee: [-0.8, 0.5], cup: [0.5, 0.7], aim0: 0, shape: rect(-1.6, 0, 1.6, 7.2),
    inner: [[[0, 0], [0, 7.2]], [[-1.6, 3.6], [1.6, 3.6]]],
    tiers: [{ poly: rect(0, 3.6, 1.6, 7.2), h: 0.3, sz: -0.04 }],
    zones: [{ surf: 'sand', poly: rect(-1.6, 6.0, -0.8, 7.2) }],
    tubes: [{ a: [-1.2, 3.0], b: [-0.8, 4.0], dir: 0 }, { a: [-0.35, 3.0], b: [-0.35, 0.5], dir: 0 },
      { a: [-0.35, 6.7], b: [0.4, 6.6], dir: 90 }, { a: [-1.2, 6.7], b: [-1.2, 1.5], dir: 0 },
      { a: [1.2, 4.1], b: [1.2, 3.1], dir: 180 }, { a: [0.4, 4.1], b: [-0.8, 4.6], dir: 0 }],
    bumps: [{ x: 1.0, z: 1.9, r: 0.4, h: 0.15 }],
    posts: [C27_GARG(0.9, 0.9)],
    movers: [C27_GHOST(-0.35, 5.4, -1.25, 5.4, 2.4, 0)] },
  /* 13: the rampart green: a long dogleg green under the battlements, falling away to the right,
     with a saddle between two mounds at the turn */
  { par: 3, sol: [[14,0.84,0]], tee: [1.0, 0.5], cup: [-1.9, 11.4], shape: [[0, 0], [2.2, 0], [2.2, 6.5], [0.5, 12.6], [-3.0, 12.6], [-3.0, 9.0], [0, 5.5]],
    tiers: [{ poly: [[0, 0], [2.2, 0], [2.2, 6.5], [0.5, 12.6], [-3.0, 12.6], [-3.0, 9.0], [0, 5.5]], h: 0.15, sx: 0.025 }],
    bumps: [{ x: 0.2, z: 7.6, r: 1.0, h: 0.15 }, { x: 1.8, z: 9.0, r: 1.0, h: 0.12 }, { x: 1.2, z: 3.0, r: 1.2, h: -0.08 }, { x: -1.0, z: 10.6, r: 1.1, h: 0.07 }] },
  /* 14: graveyard switchbacks to the raised crypt row: hills in the turns, a passage from the first corner */
  { par: 4, sol: [[45,0.85,0],[174,1,0],[0,0.15,0]], tee: [-1.4, 0.5], cup: [1.4, 6.3], shape: rect(-2.1, 0, 2.1, 7),
    inner: [[[-0.7, 0], [-0.7, 5.6]], [[0.7, 7], [0.7, 1.4]]],
    tiers: [{ poly: rect(0.7, 2.2, 2.1, 7), h: 0.15 }],
    ramps: [{ x0: 0.7, z0: 1.4, x1: 2.1, z1: 2.2, axis: 'z', h0: 0, h1: 0.15 }],
    bumps: [{ x: -0.7, z: 6.4, r: 0.45, h: 0.25 }, { x: 0.7, z: 0.6, r: 0.45, h: 0.25 }, { x: 1.4, z: 4.6, r: 0.45, h: -0.22 }],
    tubes: [{ a: [-1.85, 3.0], b: [0, 4.4], dir: 180 }],
    posts: [C27_GARG(1.05, 5.6)],
    movers: [C27_GHOST(-0.35, 2.6, 0.35, 2.6, 2.0, 0)] },
  /* 15: the crypt descent: four floating floors, a portcullis on the first drop, passages to skip ahead */
  { par: 4, sol: [[328,1,0],[0,0.5625,0]], tee: [0, 0.5], cup: [-0.3, 9.7], floors: [rect(-0.7, 0, 0.7, 2.6), rect(-1.2, 2.9, 1.2, 5.1), rect(-1.2, 5.4, 1.2, 7.6), rect(-1.0, 7.9, 1.0, 10.5)],
    tiers: [{ poly: rect(-0.7, 0, 0.7, 2.6), h: 0.45 }, { poly: rect(-1.2, 2.9, 1.2, 5.1), h: 0.3 }, { poly: rect(-1.2, 5.4, 1.2, 7.6), h: 0.15 }],
    walls: [[[-0.25, 2.6], [-0.7, 2.6], [-0.7, 0], [0.7, 0], [0.7, 2.6], [0.25, 2.6]],
      [[-0.5, 2.9], [-1.2, 2.9], [-1.2, 5.1], [0.3, 5.1]], [[0.5, 2.9], [1.2, 2.9], [1.2, 5.1], [0.9, 5.1]],
      [[0.1, 5.4], [-1.2, 5.4], [-1.2, 7.6], [-0.9, 7.6]], [[1.1, 5.4], [1.2, 5.4], [1.2, 7.6], [-0.3, 7.6]],
      [[-1.0, 7.9], [-1.0, 10.5], [1.0, 10.5], [1.0, 7.9], [-0.2, 7.9]]],
    tubes: [{ a: [-0.8, 4.6], b: [-0.6, 5.9], dir: 0 }, { a: [0.8, 7.1], b: [0.5, 8.4], dir: 0 }],
    movers: [C27_GATE(0, 2.6, 0.45, 2.6, 0.25, 90, 2.8, 0), C27_MILL(-0.2, 6.5, 0.4, 1.5, 0)] },
  /* 16: the twin towers: up the stair to the near tower, through the passage to the far one,
     then drop through the portcullis to the courtyard; or jump down and take the long way */
  { par: 4, crazy: true, sol: [[332,1,0],[40,0.6875,0]], tee: [0, 0.5], cup: [-0.6, 8.7], shape: rect(-1.6, 0, 1.6, 9.5),
    tiers: [{ poly: rect(-1.6, 2.0, -0.4, 5.0), h: 0.3 }, { poly: rect(0.4, 4.0, 1.6, 7.0), h: 0.45 }],
    ramps: [{ x0: -1.6, z0: 1.2, x1: -0.4, z1: 2.0, axis: 'z', h0: 0, h1: 0.3 }],
    inner: [[[0.4, 7.0], [0.75, 7.0]], [[1.25, 7.0], [1.6, 7.0]]],
    zones: [C27_MOAT(rect(-0.4, 3.0, 0.4, 6.0))],
    tubes: [{ a: [-1.0, 4.5], b: [1.0, 4.5], dir: 0 }],
    movers: [C27_GATE(1.0, 7.0, 1.5, 7.0, 0.25, 90, 2.6, 0), C27_GHOST(-1.2, 7.9, 0.2, 7.9, 2.8, 0)] },
  /* 17: the moat-side green: the longest lag in the castle, a swale running across it on the
     diagonal, a back tier and a mound guarding the left of the cup */
  { par: 3, sol: [[18,1,0]], tee: [0, 0.5], cup: [-0.9, 13.6], shape: rect(-2.0, 0, 2.0, 14.6),
    ramps: [{ x0: -2.0, z0: 9.6, x1: 2.0, z1: 10.6, axis: 'z', h0: 0, h1: 0.12 }],
    tiers: [{ poly: rect(-2.0, 10.6, 2.0, 14.6), h: 0.12 }],
    bumps: [{ x: 1.2, z: 3.6, r: 1.2, h: -0.08 }, { x: 0, z: 5.6, r: 1.2, h: -0.08 }, { x: -1.2, z: 7.6, r: 1.2, h: -0.08 },
      { x: -1.9, z: 12.6, r: 1.0, h: 0.14 }, { x: 1.4, z: 12.0, r: 1.2, h: 0.08 }] },
  /* 18: the showpiece: the gate, the switchback stair, the right passage into the gallery and the
     next passage on to the throne room, past a ghost and up onto the dais */
  { par: 5, crazy: true, sol: [[296,1,0],[276,0.9375,0],[4,0.5,0],[163,0.94,0]], tee: [0, 0.5], cup: [0, 9.3], shape: rect(-2.0, 0, 2.0, 10),
    inner: [[[-2.0, 2.6], [-0.3, 2.6]], [[0.3, 2.6], [2.0, 2.6]], [[-2.0, 3.6], [1.0, 3.6]], [[-1.0, 4.6], [2.0, 4.6]], [[-2.0, 5.6], [2.0, 5.6]],
      [[1.2, 5.6], [1.2, 8.0], [2.0, 8.0]]],
    tiers: [{ poly: [[1.0, 2.6], [2.0, 2.6], [2.0, 4.6], [0.6, 4.6], [0.6, 3.6], [1.0, 3.6]], h: 0.15 },
      { poly: [[-2.0, 3.6], [-1.0, 3.6], [-1.0, 4.6], [2.0, 4.6], [2.0, 5.6], [-2.0, 5.6]], h: 0.3 },
      { poly: rect(-0.8, 8.4, 0.8, 10), h: 0.15 }],
    ramps: [{ x0: 0.2, z0: 2.6, x1: 1.0, z1: 3.6, axis: 'x', h0: 0, h1: 0.15 }, { x0: -1.0, z0: 3.6, x1: 0.6, z1: 4.6, axis: 'x', h0: 0.3, h1: 0.15 },
      { x0: -0.4, z0: 7.8, x1: 0.4, z1: 8.4, axis: 'z', h0: 0, h1: 0.15 }],
    tubes: [{ a: [1.5, 5.1], b: [1.6, 6.0], dir: 0, keep: 0, add: 1.6 }, { a: [1.6, 7.0], b: [-1.4, 6.2], dir: 0, keep: 0.5, add: 0.3 },
      { a: [-0.2, 5.1], b: [-1.5, 0.5], dir: 0 }],
    posts: [C27_GARG(-0.55, 9.0), C27_GARG(0.55, 9.0)],
    movers: [C27_GATE(0, 2.6, -0.6, 2.6, 0.3, 90, 3, 0), C27_GHOST(-1.4, 7.2, 0.8, 7.2, 3.2, 0)] },
] });
