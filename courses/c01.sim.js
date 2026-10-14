/* course 1, construction yard: conveyor belts, crane arms, dirt, girders, scaffold decks and a boom gate.
   Each hole's `sol` is printed by scripts/solve.cjs; holes-check replays it. */
registerWorld(1, { holes: [
  /* 1: the belt. A cross conveyor shoves the ball toward a dirt pocket short of the cup */
  { par: 2, sol: [[0,0.6,0]], tee: [0, 0.5], cup: [-0.3, 6.6], shape: rect(-0.75, 0, 0.75, 7.4),
    zones: [{ push: [1.6, 0], poly: rect(-0.75, 3, 0.75, 4.2) }, { surf: 'sand', poly: rect(0.2, 4.9, 0.75, 6) }],
    bumps: [{ x: -0.45, z: 2, r: 0.4, h: 0.1 }] },
  /* 2: girder dogleg. Bank off the back girder past a dirt mound in the corner */
  { par: 3, sol: [[24,0.92,0]], tee: [0, 0.5], cup: [-3.4, 3.9], aim0: 0,
    shape: [[-0.7, 0], [0.7, 0], [0.7, 4.6], [-4, 4.6], [-4, 3.2], [-0.7, 3.2]],
    inner: [[[-1.9, 4.6], [-1.9, 4.05]], [[-2.7, 3.2], [-2.7, 3.7]]],
    bumps: [{ x: 0.1, z: 3.95, r: 0.45, h: 0.16 }],
    zones: [{ surf: 'sand', poly: rect(-4, 4.25, -3, 4.6) }] },
  /* 3: crane arm. Time the jib, then crest the dirt mound in front of the cup */
  { par: 2, sol: [[22,0.64,0]], tee: [0, 0.5], cup: [0.35, 6.3], shape: rect(-1.1, 0, 1.1, 7),
    inner: [[[0, 5.75], [0.75, 5.75]]],
    movers: [{ kind: 'spin', x: 0, z: 3.2, len: 0.8, w: 1.3, phase: 0, look: 'crane' }],
    bumps: [{ x: 0.05, z: 5.2, r: 0.45, h: 0.16 }],
    zones: [{ surf: 'sand', poly: rect(-1.1, 5.9, -0.45, 7) }] },
  /* 4: scaffold deck. A narrow plank ramp climbs to the deck; miss it and the deck face bounces you back */
  { par: 3, sol: [[156,0.96,0]], tee: [0, 0.5], cup: [0.55, 6.6], shape: rect(-1, 0, 1, 7.4),
    tiers: [{ poly: rect(-1, 4.6, 1, 7.4), h: 0.25 }],
    ramps: [{ x0: -0.65, z0: 3.3, x1: 0.05, z1: 4.6, axis: 'z', h0: 0, h1: 0.25 }],
    inner: [[[-1, 4.6], [-0.65, 4.6]], [[0.05, 4.6], [1, 4.6]]],
    bumps: [{ x: 0.1, z: 5.8, r: 0.35, h: 0.1 }],
    zones: [{ surf: 'sand', poly: rect(0.15, 7, 1, 7.4) }, { surf: 'sand', poly: rect(-1, 1.6, -0.2, 2.4) }] },
  /* 5: boom gate. A barrier slides across the gap in the girder; an against-you belt guards the cup */
  { par: 3, sol: [[182,0.96,1]], tee: [0, 0.5], cup: [0.4, 6.4], shape: rect(-1, 0, 1, 7.2),
    inner: [[[-1, 3.5], [-0.25, 3.5]], [[0.25, 3.5], [1, 3.5]]],
    movers: [{ kind: 'gate', ax: 0.5, az: 3.5, bx: 0, bz: 3.5, len: 0.26, ang: 90, period: 3.2, look: 'boom' }],
    zones: [{ push: [0, -1.2], poly: rect(-1, 4.4, 1, 5.2) }],
    bumps: [{ x: -0.4, z: 5.9, r: 0.35, h: 0.12 }] },
  /* 6: pipe run (3 parts). Scaffold deck, then a drop or the pipe, then a girder and a crane on the yard */
  { par: 3, sol: [[6,0.72,0]], tee: [0, 0.5], cup: [-0.6, 8], shape: rect(-1.2, 0, 1.2, 9),
    tiers: [{ poly: rect(-1.2, 0, 1.2, 3.6), h: 0.4 }],
    tubes: [{ a: [0.8, 3], b: [-0.85, 5.75], dir: 90 }],
    inner: [[[-1.2, 5.2], [0.3, 5.2]]],
    movers: [{ kind: 'spin', x: 0.15, z: 7, len: 0.6, w: 1.5, phase: 1, look: 'crane' }],
    zones: [{ surf: 'sand', poly: rect(-1.2, 8.5, 1.2, 9) }] },
  /* 7: the haul road (long green). A broad lower apron, a gentle bank up to the top tier, a dirt ridge
     that leans the lag right and a swale short of the cup */
  { par: 3, sol: [[4,0.96,0]], tee: [0, 0.5], cup: [-0.7, 11.8], shape: rect(-1.8, 0, 1.8, 13),
    tiers: [{ poly: rect(-1.8, 0, 1.8, 6), h: 0, sx: -0.01 }, { poly: rect(-1.8, 7.4, 1.8, 13), h: 0.16, sx: 0.01 }],
    ramps: [{ x0: -1.8, z0: 6, x1: 1.8, z1: 7.4, axis: 'z', h0: 0, h1: 0.16 }],
    bumps: [{ x: 1.6, z: 3.5, r: 1.6, h: 0.14 }, { x: -0.6, z: 9.2, r: 1.1, h: -0.07 }, { x: 1.2, z: 11, r: 1.4, h: 0.1 }] },
  /* 8: switchback. Up the left lane, round the top, then down against the belt to the cup */
  { par: 3, sol: [[26,0.88,0],[130,1,0]], tee: [0.8, 0.5], cup: [-0.8, 1], aim0: 0, shape: rect(-1.6, 0, 1.6, 6.4),
    inner: [[[0, 0], [0, 5]]],
    zones: [{ push: [0, 1.1], poly: rect(-1.6, 2, 0, 4) }],
    bumps: [{ x: 0, z: 5.75, r: 0.4, h: 0.14 }] },
  /* 9: twin cranes. A four-arm tower crane, then a single jib turning the other way */
  { par: 3, sol: [[16,0.64,0]], tee: [0, 0.5], cup: [0.5, 7.3], shape: rect(-1.2, 0, 1.2, 8),
    movers: [{ kind: 'spin', x: 0, z: 3, len: 0.7, w: 1.1, phase: 0, blades: 2, look: 'crane' },
             { kind: 'spin', x: -0.1, z: 5.5, len: 0.7, w: -1.4, phase: 0.5, look: 'crane' }],
    zones: [{ surf: 'sand', poly: rect(-1.2, 6.6, -0.3, 8) }] },
  /* 10: scaffold climb (3 parts). Ramp to the first lift, cross the belt that wants you off the edge, ramp to the top deck */
  { par: 4, sol: [[320,1,0],[30,1,0],[12,0.8,0]], tee: [0.6, 0.5], cup: [0.6, 8.3], aim0: -20,
    shape: [[-1.4, 0], [1.4, 0], [1.4, 3.4], [1.4, 6.2], [1.4, 9], [-1.4, 9], [-1.4, 6.2], [-1.4, 3.4]],
    tiers: [{ poly: rect(-1.4, 3.4, 1.4, 6.2), h: 0.22 }, { poly: rect(-1.4, 6.2, 1.4, 9), h: 0.41 }],
    ramps: [{ x0: -1.4, z0: 2.2, x1: -0.6, z1: 3.4, axis: 'z', h0: 0, h1: 0.22 },
            { x0: 0.6, z0: 5, x1: 1.4, z1: 6.2, axis: 'z', h0: 0.22, h1: 0.41 }],
    inner: [[[0.6, 5], [0.6, 6.2]], [[1.4, 7.1], [-0.5, 7.1]], [[-0.6, 3.4], [1.4, 3.4]], [[-1.4, 6.2], [0.6, 6.2]]],
    zones: [{ push: [0, -0.9], poly: rect(-0.6, 3.4, 0.5, 6.2) }],
    bumps: [{ x: -0.95, z: 8.3, r: 0.35, h: 0.12 }] },
  /* 11: the poured slab (long green). One long slab leaning to the right, a low hump to read round and a
     soft dip by the cup */
  { par: 2, sol: [[0,0.68,0]], tee: [0, 0.5], cup: [0.5, 8.8], shape: rect(-1.6, 0, 1.6, 10),
    tiers: [{ poly: rect(-1.6, 0, 1.6, 10), h: 0.05, sx: 0.02 }],
    bumps: [{ x: -0.6, z: 4.5, r: 1.8, h: 0.12 }, { x: 1.1, z: 7.4, r: 1.2, h: -0.06 }] },
  /* 12: gap jump (3 parts, open). Launch off the plank ramp over the trench, or creep round the side plank */
  { crazy: true, par: 3, sol: [[354,1,0]], tee: [0, 0.5], cup: [0, 7.2],
    floors: [rect(-0.8, 0, 0.8, 3.5), rect(0.75, 2.6, 1.35, 5.3), rect(-0.8, 4.3, 0.8, 8)],
    walls: [[[0.8, 2.6], [0.8, 0], [-0.8, 0], [-0.8, 3.5]], [[-0.8, 4.3], [-0.8, 8], [0.8, 8], [0.8, 5.3]]],
    ramps: [{ x0: -0.35, z0: 2.4, x1: 0.35, z1: 3.5, axis: 'z', h0: 0, h1: 0.22 }],
    zones: [{ surf: 'sand', poly: rect(-0.8, 7.6, 0.8, 8) }],
    bumps: [{ x: -0.35, z: 5.6, r: 0.35, h: 0.1 }] },
  /* 13: cement mixer (3 parts). Up the narrow ramp under the crane or the long side ramp, then into the crater */
  { par: 4, sol: [[0,0.84,0]], tee: [0, 0.5], cup: [0.85, 7.6], shape: rect(-1.5, 0, 1.5, 8.5),
    tiers: [{ poly: rect(-1.5, 5, 1.5, 8.5), h: 0.3 }],
    ramps: [{ x0: -0.3, z0: 3.8, x1: 0.3, z1: 5, axis: 'z', h0: 0, h1: 0.3 },
            { x0: -1.5, z0: 2.8, x1: -0.8, z1: 5, axis: 'z', h0: 0, h1: 0.3 }],
    movers: [{ kind: 'spin', x: 0, z: 5.95, len: 0.55, w: 1.6, phase: 0, look: 'crane' }],
    inner: [[[0.3, 7], [1.5, 7]], [[-0.8, 5], [-0.3, 5]], [[0.3, 5], [1.5, 5]]],
    bumps: [{ x: 0.85, z: 7.6, r: 0.5, h: -0.1 }],
    zones: [{ surf: 'sand', poly: rect(0.45, 3.2, 1.5, 5) }, { surf: 'sand', poly: rect(-1.5, 8.1, 1.5, 8.5) }] },
  /* 14: belt yard. Three belts run alternate ways between the girders */
  { par: 3, sol: [[26,0.52,0]], tee: [0, 0.5], cup: [-1, 7.3], shape: rect(-1.8, 0, 1.8, 8),
    inner: [[[-1.8, 3.3], [0.4, 3.3]], [[-0.4, 5.1], [1.8, 5.1]]],
    zones: [{ push: [1.5, 0], poly: rect(-1.8, 2, 1.8, 2.8) }, { push: [-1.5, 0], poly: rect(-1.8, 3.8, 1.8, 4.6) },
            { push: [1.5, 0], poly: rect(-1.8, 5.6, 1.8, 6.4) }, { surf: 'sand', poly: rect(-0.2, 6.8, 0.6, 8) }] },
  /* 15: boom gate climb (3 parts). Ramp to the deck, beat the barrier, then the chute or the pipe to the green */
  { crazy: true, par: 3, sol: [[2,0.96,1]], tee: [0, 0.5], cup: [0.6, 8.7], shape: rect(-1.4, 0, 1.4, 9.6),
    tiers: [{ poly: rect(-1.4, 3.6, 1.4, 6.4), h: 0.35 }],
    ramps: [{ x0: -0.35, z0: 2.4, x1: 0.35, z1: 3.6, axis: 'z', h0: 0, h1: 0.35 }],
    inner: [[[-1.4, 3.6], [-0.35, 3.6]], [[0.35, 3.6], [1.4, 3.6]], [[-1.4, 4.6], [-0.3, 4.6]], [[0.3, 4.6], [1.4, 4.6]], [[-1.4, 6.4], [-0.45, 6.4]], [[0.35, 6.4], [1.4, 6.4]]],
    movers: [{ kind: 'gate', ax: -0.62, az: 4.6, bx: 0, bz: 4.6, len: 0.31, ang: 90, period: 2.8, look: 'boom' }],
    tubes: [{ a: [1, 5.6], b: [1, 7.4], dir: 0 }],
    bumps: [{ x: -0.2, z: 7.8, r: 0.45, h: 0.18 }],
    zones: [{ surf: 'sand', poly: rect(-1.4, 8.9, -0.3, 9.6) }] },
  /* 16: the long pour (long green). An uphill slab over two low dirt ridges, a wide swale, a bunker
     on the right and a crown that kicks a short lag away from the cup */
  { par: 3, sol: [[2,0.88,0]], tee: [0, 0.5], cup: [0.6, 12.4], shape: rect(-1.7, 0, 1.7, 14),
    tiers: [{ poly: rect(-1.7, 0, 1.7, 14), h: 0, sz: 0.012 }],
    bumps: [{ x: -1, z: 5, r: 1.5, h: 0.15 }, { x: 1.2, z: 6.5, r: 1.5, h: 0.12 }, { x: 0, z: 9.5, r: 1.6, h: -0.08 }, { x: -1.2, z: 12, r: 1.2, h: 0.1 }],
    zones: [{ surf: 'sand', poly: rect(-1.7, 8.6, -1.1, 10.4) }] },
  /* 17: the long haul (4 parts, open). Off the deck, along the belt, down the pipe over the trench, to the crane green */
  { crazy: true, par: 3, sol: [[136,0.96,0.5]], tee: [0, 0.5], cup: [-2.2, 9], aim0: 0,
    floors: [rect(-0.7, 0, 0.7, 6), rect(-3.6, 4.6, -0.65, 6), rect(-3.6, 7, -0.8, 10)],
    walls: [[[-0.7, 4.6], [-0.7, 0], [0.7, 0], [0.7, 6], [-2, 6]], [[-0.7, 4.6], [-3.6, 4.6], [-3.6, 6]],
            [[-3.6, 7], [-3.6, 10], [-0.8, 10], [-0.8, 7]]],
    tiers: [{ poly: rect(-0.7, 0, 0.7, 3), h: 0.4 }],
    zones: [{ push: [-1.2, 0], poly: rect(-3, 4.6, -0.7, 6) }, { surf: 'sand', poly: rect(-3.6, 9.6, -0.8, 10) }],
    tubes: [{ a: [-3.15, 5.3], b: [-3.1, 7.5], dir: 80 }],
    movers: [{ kind: 'spin', x: -1.6, z: 8.2, len: 0.45, w: 1.4, phase: 0, look: 'crane' }],
    bumps: [{ x: -2.2, z: 9, r: 0.45, h: -0.08 }] },
  /* 18: topping out (4 parts, open). The belt ramp, the boom gate on the deck, the chute or the pipe, the crane green */
  { crazy: true, par: 5, sol: [[4,0.96,0],[72,0.88,0]], tee: [0, 0.5], cup: [0.4, 9.4], aim0: 0,
    floors: [rect(-1, 0, 1, 3.05), rect(-0.45, 3, 0.45, 4.45), rect(-1.2, 4.4, 3.4, 6), rect(-0.2, 5.99, 3.6, 10.2)],
    walls: [[[-0.45, 3.05], [-1, 3.05], [-1, 0], [1, 0], [1, 3.05], [0.45, 3.05]],
            [[-0.45, 4.4], [-1.2, 4.4], [-1.2, 6], [2, 6]], [[0.45, 4.4], [3.4, 4.4], [3.4, 6], [3.6, 6], [3.6, 10.2], [-0.2, 10.2], [-0.2, 6]],
            [[3, 6], [3.4, 6]], [[1.3, 4.4], [1.3, 4.75]], [[1.3, 5.65], [1.3, 6]]],
    tiers: [{ poly: rect(-1.2, 4.4, 3.4, 6), h: 0.4 }],
    ramps: [{ x0: -0.45, z0: 3.05, x1: 0.45, z1: 4.4, axis: 'z', h0: 0, h1: 0.4 }],
    zones: [{ push: [0, 1.6], poly: rect(-0.45, 3.05, 0.45, 4.4) }],
    movers: [{ kind: 'gate', ax: 1.3, az: 4.85, bx: 1.3, bz: 5.55, len: 0.45, ang: 0, period: 3, look: 'boom' },
             { kind: 'spin', x: 1.7, z: 8, len: 0.55, w: -1.3, phase: 0, look: 'crane' }],
    tubes: [{ a: [2.8, 5.2], b: [3.05, 6.9], dir: -20 }],
    bumps: [{ x: 0.4, z: 9.4, r: 0.5, h: -0.1 }, { x: 0.6, z: 7.4, r: 0.45, h: 0.2 }] },
] });
