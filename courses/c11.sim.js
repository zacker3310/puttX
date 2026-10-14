/* course 11, construction yard (late shift): world 1's second course. The same belts, cranes,
   boom gates and scaffold decks as course 1, but most holes chain three or four parts and offer a
   short risky line next to a safe long one. Each hole's `sol` is printed by scripts/solve.cjs. */
/* a walled box whose side walls are split around tier edges, so no single wall spans a tall height change */
function c11Box(x0, z0, x1, z1, cuts) {
  const zs = cuts.flatMap(c => [c - 0.06, c + 0.06]);
  return [[x0, z0], [x1, z0], ...zs.map(z => [x1, z]), [x1, z1], [x0, z1], ...zs.slice().reverse().map(z => [x0, z])];
}
registerWorld(11, { holes: [
  /* 1: two belts. Opposite conveyors shove the ball both ways before the dirt pocket */
  { par: 2, sol: [[4,0.92,0]], tee: [0, 0.5], cup: [0.3, 6.9], shape: rect(-0.8, 0, 0.8, 7.6),
    zones: [{ push: [1.6, 0], poly: rect(-0.8, 2.4, 0.8, 3.2) }, { push: [-1.6, 0], poly: rect(-0.8, 4.2, 0.8, 5) },
            { surf: 'sand', poly: rect(-0.8, 5.6, -0.2, 6.4) }],
    bumps: [{ x: 0.35, z: 1.6, r: 0.35, h: 0.1 }] },
  /* 2: the slab yard (long green). A lower apron, a broad bank up to a top tier that leans left, a dirt
     ridge on each side and a soft swale left of the cup */
  { par: 3, sol: [[0,0.92,0]], tee: [0, 0.5], cup: [-0.4, 11.2], shape: rect(-1.9, 0, 1.9, 12.5),
    tiers: [{ poly: rect(-1.9, 0, 1.9, 5), h: 0, sz: 0.008 }, { poly: rect(-1.9, 6.2, 1.9, 12.5), h: 0.2, sx: -0.012 }],
    ramps: [{ x0: -1.9, z0: 5, x1: 1.9, z1: 6.2, axis: 'z', h0: 0.04, h1: 0.2 }],
    bumps: [{ x: -1.3, z: 3, r: 1.6, h: 0.13 }, { x: 1.4, z: 8.5, r: 1.5, h: 0.15 }, { x: -0.5, z: 10, r: 1, h: -0.06 }] },
  /* 3: boom and jib (3 parts). Beat the barrier, time the crane, then crest the mound */
  { par: 3, sol: [[358,0.8,0]], tee: [0, 0.5], cup: [-0.4, 7.5], shape: rect(-1.1, 0, 1.1, 8.4),
    inner: [[[-1.1, 3], [-0.25, 3]], [[0.25, 3], [1.1, 3]]],
    movers: [{ kind: 'gate', ax: 0.5, az: 3, bx: 0, bz: 3, len: 0.26, ang: 90, period: 3.2, look: 'boom' },
             { kind: 'spin', x: 0, z: 5.2, len: 0.7, w: -1.3, phase: 0.4, look: 'crane' }],
    bumps: [{ x: 0.15, z: 6.6, r: 0.4, h: 0.15 }],
    zones: [{ surf: 'sand', poly: rect(0.45, 7, 1.1, 8.4) }] },
  /* 4: the pipe corner (3 parts). Round the girder dogleg against the belt, or thread the pipe past it */
  { par: 3, sol: [[10,0.68,0],[20,0.96,0]], tee: [0, 0.5], cup: [-3.45, 4.2], aim0: 0,
    shape: [[-0.7, 0], [0.7, 0], [0.7, 5], [-4, 5], [-4, 3.4], [-0.7, 3.4]],
    inner: [[[-2, 5], [-2, 4.5]]],
    zones: [{ push: [1.3, 0], poly: rect(-2.9, 3.4, -2.2, 5) }, { surf: 'sand', poly: rect(-4, 4.65, -3, 5) }],
    tubes: [{ a: [0.35, 2.4], b: [-2.6, 3.75], dir: 0 }],
    bumps: [{ x: 0, z: 4.3, r: 0.45, h: 0.15 }] },
  /* 5: double deck (3 parts). Two plank ramps on opposite sides, then a jib on the top deck */
  { par: 3, sol: [[30,0.96,0]], tee: [0, 0.5], cup: [0.6, 8.3], shape: rect(-1.2, 0, 1.2, 9),
    tiers: [{ poly: rect(-1.2, 3.2, 1.2, 6), h: 0.2 }, { poly: rect(-1.2, 6, 1.2, 9), h: 0.4 }],
    ramps: [{ x0: 0.5, z0: 2, x1: 1.2, z1: 3.2, axis: 'z', h0: 0, h1: 0.2 },
            { x0: -1.2, z0: 4.8, x1: -0.5, z1: 6, axis: 'z', h0: 0.2, h1: 0.4 }],
    inner: [[[-1.2, 3.2], [0.5, 3.2]], [[-0.5, 6], [1.2, 6]]],
    movers: [{ kind: 'spin', x: -0.25, z: 7.3, len: 0.5, w: 1.4, phase: 0, look: 'crane' }],
    bumps: [{ x: 0.3, z: 4.4, r: 0.4, h: 0.12 }] },
  /* 6: the hopper run (auto, 5 parts). Up the plank to the deck belt, round the banked girder, down the
     chute to the pipe, which spits the ball into the first hopper; it spirals down that funnel into a
     second pipe and out into the last hopper, round and round into the cup. A firm straight putt rides it all */
  { par: 4, auto: true, crazy: true, sol: [[0,0.8,0]], tee: [0, 0.5], cup: [-2, 1.6], aim0: 0, shape: [[-6.6, 0], [0.4, 0], [0.4, 7.4], [-3.9, 7.4], [-3.9, 6.6], [-6.6, 6.6]],
    inner: [[[-0.4, 0], [-0.4, 6.6], [-3.9, 6.6]], [[0.4, 6.6], [-0.4, 7.4]], [[-2.4, 6.6], [-2.8, 6.805], [-3.9, 6.805]], [[-2.4, 7.4], [-2.8, 7.195], [-3.9, 7.195]]],
    tiers: [{ poly: rect(-0.4, 3, 0.4, 7.4), h: 0.3 }],
    ramps: [{ x0: -0.4, z0: 1.5, x1: 0.4, z1: 3, axis: 'z', h0: 0, h1: 0.3 },
            { x0: -2.4, z0: 6.6, x1: -0.4, z1: 7.4, axis: 'x', h0: 0, h1: 0.3 }],
    zones: [{ push: [0, 1], poly: rect(-0.4, 3, 0.4, 6.6) }, { push: [-1, 0], poly: rect(-3.9, 6.6, -0.4, 7.4) }],
    tubes: [{ a: [-3.4, 7], b: [-6.3, 3.44], dir: 90, keep: 0, add: 1.3 }, { a: [-4.6, 4.4], b: [-1.04, 3.3], dir: 180, keep: 0, add: 1.3 }],
    drains: [{ x: -4.6, z: 4.4, r: 1.2, depth: 0.3, flat: 0.1 }, { x: -2, z: 1.6, r: 1.2, depth: 0.3 }] },
  /* 7: trench jump (3 parts, open). Launch off the plank over the trench or creep round the side plank, then the jib */
  { par: 3, sol: [[6,1,0]], tee: [0, 0.5], cup: [0.25, 8.3],
    floors: [rect(-0.8, 0, 0.8, 3.5), rect(0.75, 2.6, 1.35, 5.3), rect(-0.8, 4.3, 0.8, 9)],
    walls: [[[0.8, 2.6], [0.8, 0], [-0.8, 0], [-0.8, 3.5]], [[-0.8, 4.3], [-0.8, 9], [0.8, 9], [0.8, 5.3]]],
    ramps: [{ x0: -0.35, z0: 2.4, x1: 0.35, z1: 3.5, axis: 'z', h0: 0, h1: 0.22 }],
    movers: [{ kind: 'spin', x: 0, z: 6.7, len: 0.5, w: 1.5, phase: 0.6, look: 'crane' }],
    zones: [{ surf: 'sand', poly: rect(-0.8, 8.7, 0.8, 9) }],
    bumps: [{ x: -0.35, z: 5.4, r: 0.3, h: 0.1 }] },
  /* 8: switchback (3 parts). Up the feed belt, round the jib at the top, down against the return belt */
  { par: 3, sol: [[354,0.92,0]], tee: [0.8, 0.5], cup: [-0.8, 1.1], aim0: 0, shape: rect(-1.6, 0, 1.6, 7),
    inner: [[[0, 0], [0, 5.4]]],
    movers: [{ kind: 'spin', x: 0, z: 6.25, len: 0.45, w: 1.2, phase: 0, look: 'crane' }],
    zones: [{ push: [0, 0.8], poly: rect(0, 1.5, 1.6, 4) }, { push: [0, 1.1], poly: rect(-1.6, 2.2, 0, 4) },
            { surf: 'sand', poly: rect(-1.6, 4.4, -1, 5.4) }],
    bumps: [{ x: -0.5, z: 0.6, r: 0.3, h: 0.08 }] },
  /* 9: tower drop (3 parts). Off the scaffold, through twin cranes, then up the ramp past the boom */
  { par: 3, crazy: true, sol: [[-1,0.98,1],[140,0.7,0]], tee: [0, 0.5], cup: [0.6, 9.1], shape: rect(-1.3, 0, 1.3, 10),
    tiers: [{ poly: rect(-1.3, 0, 1.3, 3), h: 0.4 }, { poly: rect(-1.3, 7.6, 1.3, 10), h: 0.3 }],
    ramps: [{ x0: -0.4, z0: 6.4, x1: 0.4, z1: 7.6, axis: 'z', h0: 0, h1: 0.3 }],
    inner: [[[-1.3, 7.6], [-0.4, 7.6]], [[0.4, 7.6], [1.3, 7.6]]],
    movers: [{ kind: 'spin', x: 0.35, z: 4.3, len: 0.55, w: 1.2, phase: 0, look: 'crane' },
             { kind: 'spin', x: -0.35, z: 5.6, len: 0.55, w: -1.4, phase: 0.8, look: 'crane' },
             { kind: 'gate', ax: 0.7, az: 7.6, bx: 0, bz: 7.6, len: 0.4, ang: 90, period: 3, look: 'boom' }],
    bumps: [{ x: -0.4, z: 8.8, r: 0.35, h: 0.12 }] },
  /* 10: the spoil heap (long green). Downhill off the top deck, a long bank to a lower green that leans
     right, a wide dirt ridge across the line and a hump short and left of the cup */
  { par: 3, sol: [[4,1,0]], tee: [0, 0.5], cup: [0.9, 11.8], shape: rect(-1.9, 0, 1.9, 13),
    tiers: [{ poly: rect(-1.9, 0, 1.9, 4), h: 0.3 }, { poly: rect(-1.9, 5.5, 1.9, 13), h: 0.12, sx: 0.012 }],
    ramps: [{ x0: -1.9, z0: 4, x1: 1.9, z1: 5.5, axis: 'z', h0: 0.3, h1: 0.12 }],
    bumps: [{ x: 0.8, z: 7.5, r: 2, h: 0.12 }, { x: -1, z: 9.5, r: 1.4, h: 0.1 }] },
  /* 11: scaffold switchback (3 parts). Up the right ramp, across the top, up the middle ramp the wrong way, along the top deck */
  { par: 4, sol: [[356,1,0],[188,1,0],[0,0.43,0],[9,0.52,0]], tee: [1.06, 0.5], cup: [-1.06, 6.1], aim0: 0, shape: rect(-1.6, 0, 1.6, 7),
    inner: [[[0.53, 0], [0.53, 5.6]], [[-0.53, 1.4], [-0.53, 7]]],
    tiers: [{ poly: rect(0.53, 4, 1.6, 7), h: 0.2 }, { poly: rect(-0.53, 5, 0.53, 7), h: 0.2 },
            { poly: rect(-0.53, 0, 0.53, 3), h: 0.4 }, { poly: rect(-1.6, 0, -0.53, 7), h: 0.4 }],
    ramps: [{ x0: 0.53, z0: 2, x1: 1.6, z1: 4, axis: 'z', h0: 0, h1: 0.2 },
            { x0: -0.53, z0: 3, x1: 0.53, z1: 5, axis: 'z', h0: 0.4, h1: 0.2 }],
    zones: [{ surf: 'sand', poly: rect(-1.6, 3, -1.1, 4.2) }],
    bumps: [{ x: -0.95, z: 4.9, r: 0.3, h: 0.08 }] },
  /* 12: the long haul (4 parts, open). Off the deck, along the belt, down the pipe over the trench, to the jib green */
  { par: 3, sol: [[332,0.92,0],[63,1,0],[0,0.2,0]], tee: [0, 0.5], cup: [2.5, 9.2], aim0: 0,
    floors: [rect(-0.7, 0, 0.7, 6), rect(0.65, 4.6, 3.6, 6), rect(0.8, 7, 3.6, 10)],
    walls: [[[0.7, 4.6], [0.7, 0], [-0.7, 0], [-0.7, 6], [2, 6]], [[0.7, 4.6], [3.6, 4.6], [3.6, 6]],
            [[3.6, 7], [3.6, 10], [0.8, 10], [0.8, 7]]],
    tiers: [{ poly: rect(-0.7, 0, 0.7, 3), h: 0.4 }],
    zones: [{ push: [1.2, 0], poly: rect(0.7, 4.6, 3, 6) }, { surf: 'sand', poly: rect(0.8, 9.65, 2, 10) }],
    tubes: [{ a: [3.15, 5.3], b: [3.1, 7.5], dir: 280 }],
    movers: [{ kind: 'spin', x: 1.6, z: 8.3, len: 0.45, w: -1.4, phase: 0, look: 'crane' }],
    bumps: [{ x: 2.5, z: 9.2, r: 0.45, h: -0.08 }, { x: 2.3, z: 7.9, r: 0.3, h: 0.1 }] },
  /* 13: double boom (3 parts). Ramp to the deck, beat the barrier, then the chute or the pipe, across the belt */
  { par: 3, sol: [[2,1,1.5]], tee: [0, 0.5], cup: [0.6, 8.8], shape: rect(-1.4, 0, 1.4, 9.6),
    tiers: [{ poly: rect(-1.4, 3.6, 1.4, 6.4), h: 0.35 }],
    ramps: [{ x0: -0.35, z0: 2.4, x1: 0.35, z1: 3.6, axis: 'z', h0: 0, h1: 0.35 }],
    inner: [[[-1.4, 3.6], [-0.35, 3.6]], [[0.35, 3.6], [1.4, 3.6]], [[-1.4, 4.6], [-0.3, 4.6]], [[0.3, 4.6], [1.4, 4.6]],
            [[-1.4, 6.4], [-0.45, 6.4]], [[0.35, 6.4], [1.4, 6.4]]],
    movers: [{ kind: 'gate', ax: 0.62, az: 4.6, bx: 0, bz: 4.6, len: 0.31, ang: 90, period: 2.6, look: 'boom' }],
    tubes: [{ a: [-1, 5.6], b: [-1, 7.4], dir: 0 }],
    zones: [{ push: [-1.1, 0], poly: rect(-1.4, 7.9, 1.4, 8.3) }, { surf: 'sand', poly: rect(-1.4, 9, -0.4, 9.6) }],
    bumps: [{ x: 0.2, z: 7.4, r: 0.4, h: 0.16 }] },
  /* 14: pipe relay (4 parts). The pipe or the gap into the crane yard, the second pipe or the top gap, then down the belt lane */
  { par: 4, crazy: true, sol: [[352,0.96,0],[106,0.92,0],[51,0.44,0]], tee: [-1, 0.5], cup: [1, 1.4], aim0: 0, shape: rect(-2, 0, 2, 9),
    inner: [[[0, 0], [0, 8.2]], [[-1.4, 4], [0, 4]]],
    movers: [{ kind: 'spin', x: -1, z: 6, len: 0.6, w: 1.3, phase: 0, look: 'crane' }],
    tubes: [{ a: [-0.4, 3.4], b: [-1.2, 8.3], dir: 90 }, { a: [-1.6, 4.6], b: [1, 6.6], dir: 180 }],
    zones: [{ push: [0, 1.2], poly: rect(0, 3.2, 2, 4.2) }, { surf: 'sand', poly: rect(0, 0, 0.6, 2.4) }],
    bumps: [{ x: 1.3, z: 2.6, r: 0.35, h: 0.12 }] },
  /* 15: the back lot (long green). A long dogleg green that leans left, a wide dirt ridge off the tee,
     a swale at the bend and a crown to read past */
  { par: 3, sol: [[0,1,0]], tee: [0, 0.5], cup: [2.2, 12.8], aim0: 0, shape: [[-1.6, 0], [1.6, 0], [1.6, 7], [3.4, 9], [3.4, 14], [-0.6, 14], [-1.6, 9]],
    tiers: [{ poly: rect(-1.6, 0, 3.4, 14), h: 0, sx: 0.01, sz: 0.006 }],
    bumps: [{ x: -0.8, z: 4, r: 1.8, h: 0.16 }, { x: 1.2, z: 9, r: 1.5, h: -0.08 }, { x: 0.4, z: 11.5, r: 1.2, h: 0.1 }] },
  /* 16: skywalk (3 parts, open). Walk the bare plank over the drop, or take the walled catwalk through the dirt */
  { par: 4, crazy: true, sol: [[0,0.86,0]], tee: [0, 0.5], cup: [0.7, 8.4], aim0: 0,
    floors: [rect(-0.8, 0, 0.8, 2.5), rect(-0.3, 2.45, 0.3, 6), rect(-1.2, 5.95, 1.35, 9), rect(0.75, 1.5, 1.35, 6)],
    walls: [[[-0.3, 5.95], [-1.2, 5.95], [-1.2, 9], [1.35, 9], [1.35, 1.5], [0.8, 1.5], [0.8, 0], [-0.8, 0], [-0.8, 2.5], [-0.3, 2.5]],
            [[0.3, 2.5], [0.75, 2.5], [0.75, 5.95], [0.3, 5.95]]],
    zones: [{ push: [0.5, 0], poly: rect(-0.3, 3.2, 0.3, 4.6) }, { surf: 'sand', poly: rect(0.8, 3.2, 1.35, 4.4) }],
    movers: [{ kind: 'spin', x: -0.2, z: 7.4, len: 0.5, w: 1.3, phase: 0, look: 'crane' }],
    bumps: [{ x: 0.7, z: 8.4, r: 0.4, h: -0.06 }] },
  /* 17: deck relay (4 parts). Ramp to the deck, slip the side boom, drop the chute or take the pipe, then the belt pocket */
  { par: 4, crazy: true, sol: [[0,0.92,0],[74,0.64,0],[18,0.92,0]], tee: [-0.8, 0.5], cup: [-0.9, 9.6], aim0: 0, shape: rect(-1.6, 0, 1.6, 10.4),
    tiers: [{ poly: rect(-1.6, 3.2, 1.6, 6.2), h: 0.35 }],
    ramps: [{ x0: -1.2, z0: 2, x1: -0.4, z1: 3.2, axis: 'z', h0: 0, h1: 0.35 }],
    inner: [[[-1.6, 3.2], [-1.2, 3.2]], [[-0.4, 3.2], [1.6, 3.2]], [[0, 3.2], [0, 4.5]], [[0, 5.1], [0, 6.2]],
            [[-1.6, 6.2], [-1.2, 6.2]], [[-0.6, 6.2], [1.6, 6.2]], [[-1.6, 8.6], [0.4, 8.6]]],
    movers: [{ kind: 'gate', ax: 0, az: 4.2, bx: 0, bz: 4.8, len: 0.3, ang: 0, period: 2.8, look: 'boom' }],
    tubes: [{ a: [0.8, 5.6], b: [1, 9.1], dir: 270 }],
    zones: [{ push: [1.2, 0], poly: rect(-1.6, 7, 1.6, 7.8) }, { surf: 'sand', poly: rect(0.2, 9.9, 1.6, 10.4) }],
    bumps: [{ x: 0.5, z: 1.4, r: 0.35, h: 0.1 }] },
  /* 18: topping out (4 parts). Ramp to the crane deck, the boom over the narrow ramp, the top deck and its pocket */
  { par: 5, crazy: true, sol: [[52,0.86,0],[200,0.93,0],[68,1,0],[246,0.34,0]], tee: [-1, 0.5], cup: [-1.2, 10], aim0: 0, shape: c11Box(-2, 0, 2, 11, [3.2, 6.4]),
    tiers: [{ poly: rect(-2, 3.2, 2, 6.4), h: 0.22 }, { poly: rect(-2, 6.4, 2, 11), h: 0.44 }],
    ramps: [{ x0: 1, z0: 2, x1: 2, z1: 3.2, axis: 'z', h0: 0, h1: 0.22 }, { x0: -1.5, z0: 5.2, x1: -0.9, z1: 6.4, axis: 'z', h0: 0.22, h1: 0.44 }],
    inner: [[[-2, 3.2], [1, 3.2]], [[-2, 6.4], [-1.5, 6.4]], [[-0.9, 6.4], [2, 6.4]], [[-2, 8.6], [0.8, 8.6]]],
    movers: [{ kind: 'spin', x: 0.3, z: 4.8, len: 0.5, w: 1.3, phase: 0, look: 'crane' },
             { kind: 'gate', ax: -0.6, az: 6.4, bx: -1.2, bz: 6.4, len: 0.32, ang: 90, period: 3, look: 'boom' }],
    tubes: [{ a: [1.4, 5.8], b: [1.4, 7.4], dir: 0 }],
    zones: [{ push: [1, 0], poly: rect(-2, 2, 0.6, 2.8) }, { surf: 'sand', poly: rect(0.6, 10.5, 2, 11) }],
    bumps: [{ x: -1.2, z: 10, r: 0.45, h: -0.08 }, { x: 0.2, z: 9.6, r: 0.4, h: 0.15 }] },
] });
