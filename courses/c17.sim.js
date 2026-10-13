/* world 7, course 17: the castle's east wing at dusk. The same haunted castle as course 7, with
   more going on in every hole: twin drawbridges, staircases of three flights, chained secret
   passages, battlements over the moat and a banister slide that rides itself in.
   Each hole's `sol` is printed by `PUTTX_ONLY=17 node scripts/solve.cjs --hole 17-K`. */
const C17_MILL = (x, z, len, w, phase) => ({ kind: 'spin', x, z, len, w, phase, blades: 2, look: 'windmill' });
const C17_GATE = (ax, az, bx, bz, len, period, phase) => ({ kind: 'gate', ax, az, bx, bz, len, ang: 90, period, phase, look: 'portcullis' });
const C17_GHOST = (ax, az, bx, bz, period, phase) => ({ kind: 'slide', ax, az, bx, bz, r: 0.17, period, phase, look: 'ghost' });
const C17_GARG = (x, z) => ({ x, z, r: 0.12, top: 0.3, look: 'gargoyle' });
const C17_MOAT = poly => ({ surf: 'water', poly });
registerWorld(17, { holes: [
  /* 1: two drawbridges over the moat: the narrow middle one or the wide one by the wall */
  { par: 2, sol: [[21,0.8,0]], tee: [0, 0.5], cup: [-0.35, 5.5], shape: rect(-1, 0, 1, 6.4),
    zones: [C17_MOAT(rect(-1, 2.6, -0.2, 3.3)), C17_MOAT(rect(0.2, 2.6, 0.55, 3.3))],
    posts: [C17_GARG(0, 4.5), C17_GARG(0.5, 4.9)] },
  /* 2: a windmill on the ramp, a terrace, then the portcullis before the cup */
  { par: 3, sol: [[339,0.95,0]], tee: [0, 0.5], cup: [0.35, 7.2], shape: rect(-0.9, 0, 0.9, 8),
    ramps: [{ x0: -0.9, z0: 2.6, x1: 0.9, z1: 3.4, axis: 'z', h0: 0, h1: 0.2 }],
    tiers: [{ poly: rect(-0.9, 3.4, 0.9, 8), h: 0.2 }],
    inner: [[[-0.9, 5.4], [-0.25, 5.4]], [[0.25, 5.4], [0.9, 5.4]]],
    bumps: [{ x: -0.4, z: 6.7, r: 0.4, h: 0.1 }],
    movers: [C17_MILL(0, 1.8, 0.55, 1.6, 0), C17_GATE(0, 5.4, 0.48, 5.4, 0.25, 3, 0)] },
  /* 3: two secret passages under the hall wall, or the long way through the side door past a ghost */
  { par: 3, sol: [[15,0.8,0]], tee: [0, 0.5], cup: [0.5, 6.2], aim0: 10, shape: rect(-1.3, 0, 1.3, 7),
    inner: [[[-0.7, 3.2], [1.3, 3.2]]],
    tubes: [{ a: [0.9, 2.5], b: [0.6, 4.0], dir: 0 }, { a: [0.2, 2.5], b: [-0.8, 0.5], dir: 0 }],
    movers: [C17_GHOST(-0.9, 4.7, 0.6, 4.7, 2.6, 0)] },
  /* 4: the grand staircase: three flights, each ramp on the other side */
  { par: 3, sol: [[324,1,0],[309,0.75,0]], tee: [0.3, 0.5], cup: [0.3, 8.7], shape: rect(-0.9, 0, 0.9, 9.5),
    tiers: [{ poly: rect(-0.9, 2.4, 0.9, 9.5), h: 0.12 }, { poly: rect(-0.9, 4.6, 0.9, 9.5), h: 0.24 }, { poly: rect(-0.9, 6.8, 0.9, 9.5), h: 0.36 }],
    ramps: [{ x0: -0.9, z0: 1.7, x1: -0.3, z1: 2.4, axis: 'z', h0: 0, h1: 0.12 }, { x0: 0.3, z0: 3.9, x1: 0.9, z1: 4.6, axis: 'z', h0: 0.12, h1: 0.24 },
      { x0: -0.9, z0: 6.1, x1: -0.3, z1: 6.8, axis: 'z', h0: 0.24, h1: 0.36 }],
    posts: [C17_GARG(-0.3, 3.5), C17_GARG(0.3, 5.7), C17_GARG(-0.2, 7.9)] },
  /* 5: the ghost gallery round the corner; a secret passage cuts the corner if you find it */
  { par: 3, sol: [[0,0.95,0]], tee: [0, 0.5], cup: [3.3, 5.2], shape: [[-0.8, 0], [0.8, 0], [0.8, 4.4], [4.0, 4.4], [4.0, 6.0], [-0.8, 6.0]],
    bumps: [{ x: -0.15, z: 5.25, r: 0.55, h: 0.3 }],
    tubes: [{ a: [-0.5, 3.0], b: [1.4, 4.75], dir: 75, keep: 0.5, add: 0.2 }],
    movers: [C17_GHOST(1.9, 4.75, 1.9, 5.65, 2.4, 0), C17_GHOST(2.7, 5.65, 2.7, 4.75, 2.0, 0.7)] },
  /* 6: island hopping: bridge, the windmill island, the other bridge */
  { par: 3, sol: [[30,0.6,0],[258,0.85,1.2],[15,0.6,0]], tee: [0, 0.5], cup: [0.6, 7.1], aim0: 15, shape: rect(-1.5, 0, 1.5, 8),
    zones: [C17_MOAT(rect(-1.5, 2.4, 0.9, 3.4)), C17_MOAT(rect(-0.9, 5.0, 1.5, 6.0))],
    posts: [C17_GARG(-0.1, 6.7)],
    movers: [C17_MILL(0, 4.2, 0.5, 1.5, 0)] },
  /* 7: the drop deck: through the portcullis and leap to the crypt green, or take the left passage down */
  { par: 3, sol: [[357,0.9,1.2],[0,0.35,0]], tee: [0, 0.5], cup: [-0.7, 7.3], floors: [rect(-0.9, 0, 0.9, 3.2), rect(-1.4, 4.0, 1.4, 8)],
    tiers: [{ poly: rect(-0.9, 0, 0.9, 3.2), h: 0.35 }],
    walls: [[[-0.25, 3.2], [-0.9, 3.2], [-0.9, 0], [0.9, 0], [0.9, 3.2], [0.25, 3.2]], [[-0.5, 4.0], [-1.4, 4.0], [-1.4, 8], [1.4, 8], [1.4, 4.0], [0.5, 4.0]]],
    tubes: [{ a: [0.6, 2.7], b: [1.0, 4.6], dir: 0 }, { a: [-0.6, 2.7], b: [-0.6, 0.5], dir: 0 }],
    bumps: [{ x: 0.3, z: 5.6, r: 0.5, h: 0.22 }],
    movers: [C17_GATE(0, 3.2, 0.48, 3.2, 0.25, 2.8, 0), C17_MILL(-0.2, 6.4, 0.45, 1.5, 0)] },
  /* 8: the ghost ballroom: two dancers on the polished floor, a ramp each side up to the stage */
  { par: 3, sol: [[15,0.9,0]], tee: [0, 0.5], cup: [0, 8.4], shape: rect(-1.4, 0, 1.4, 9),
    zones: [{ surf: 'fast', poly: rect(-1.4, 1.4, 1.4, 5.0) }],
    tiers: [{ poly: rect(-1.4, 5.6, 1.4, 9), h: 0.2 }],
    ramps: [{ x0: -1.4, z0: 5.0, x1: -0.8, z1: 5.6, axis: 'z', h0: 0, h1: 0.2 }, { x0: 0.8, z0: 5.0, x1: 1.4, z1: 5.6, axis: 'z', h0: 0, h1: 0.2 }],
    inner: [[[-0.8, 5.0], [-0.8, 5.6], [0.8, 5.6], [0.8, 5.0]]],
    posts: [C17_GARG(-0.55, 7.3), C17_GARG(0.55, 7.3)],
    movers: [C17_GHOST(-1.0, 2.6, 1.0, 2.6, 3.0, 0), C17_GHOST(1.0, 4.0, -1.0, 4.0, 2.4, 1.2)] },
  /* 9: the banister slide: up the stair, round the landing, down the banister, round again,
     into the secret passage and out onto the throne-room carpet. A decent putt rides it all the way. */
  { par: 3, auto: true, sol: [[-1,0.792,0]], tee: [0.3, 0.5], cup: [-1.6, 2.4], aim0: 0, shape: rect(-2.0, 0, 0.6, 4.6),
    inner: [[[0, 0], [0, 4.0]], [[-0.6, 0.6], [-0.6, 3.4]], [[-1.2, 0], [-1.2, 4.6]],
      [[0.6, 4.0], [0, 4.6]], [[-0.6, 4.0], [0, 4.6]], [[-0.6, 0], [0, 0.6]], [[-0.6, 0], [-1.2, 0.6]],
      [[-1.2, 3.4], [-1.09, 3.7], [-1.09, 4.6]], [[-0.6, 3.4], [-0.71, 3.7], [-0.71, 4.6]]],
    tiers: [{ poly: rect(-0.6, 2.3, 0.6, 4.6), h: 0.2 }],
    ramps: [{ x0: 0, z0: 1.5, x1: 0.6, z1: 2.3, axis: 'z', h0: 0, h1: 0.2 }, { x0: -0.6, z0: 1.5, x1: 0, z1: 2.3, axis: 'z', h0: 0, h1: 0.2 }],
    zones: [{ push: [-0.9, -0.3], poly: rect(-0.6, 0, 0, 0.9) }, { push: [0, -0.9], poly: rect(-0.6, 0.9, 0, 4.0) }, { push: [0, 0.9], poly: rect(-1.2, 0, -0.6, 3.4) }],
    tubes: [{ a: [-0.9, 4.1], b: [-1.6, 4.0], dir: 180, keep: 0, add: 1.6 }] },
  /* 10: three dungeon rooms: a passage or the side door, a ghost, then the portcullis and the mill */
  { par: 4, sol: [[335.5,1,0]], tee: [0, 0.5], cup: [0.6, 8.9], shape: rect(-1.2, 0, 1.2, 9.6),
    inner: [[[-0.6, 3.2], [1.2, 3.2]], [[-1.2, 6.4], [-0.25, 6.4]], [[0.25, 6.4], [1.2, 6.4]]],
    tubes: [{ a: [0.8, 2.6], b: [0.8, 3.7], dir: 0 }, { a: [0.1, 2.6], b: [-0.7, 0.5], dir: 0 }],
    bumps: [{ x: 0.2, z: 5.6, r: 0.45, h: 0.18 }],
    movers: [C17_GHOST(-0.8, 4.6, 0.8, 4.6, 2.8, 0), C17_GATE(0, 6.4, 0.5, 6.4, 0.25, 2.6, 0), C17_MILL(-0.3, 7.8, 0.5, 1.6, 0)] },
  /* 11: round the tower: up the stair, past the ghost on the landing, down and through the portcullis */
  { par: 3, sol: [[3,0.85,1.2],[24,0.75,0]], tee: [-1.05, 0.5], cup: [1.05, 0.6], aim0: 0, shape: [[-1.6, 0], [-0.5, 0], [-0.5, 3.4], [0.5, 3.4], [0.5, 0], [1.6, 0], [1.6, 4.6], [-1.6, 4.6]],
    tiers: [{ poly: rect(-1.6, 2.3, 1.6, 4.6), h: 0.15 }],
    ramps: [{ x0: -1.6, z0: 1.4, x1: -0.5, z1: 2.3, axis: 'z', h0: 0, h1: 0.15 }, { x0: 0.5, z0: 1.4, x1: 1.6, z1: 2.3, axis: 'z', h0: 0, h1: 0.15 }],
    inner: [[[0.5, 1.2], [0.875, 1.2]], [[1.375, 1.2], [1.6, 1.2]]],
    bumps: [{ x: -1.1, z: 4.1, r: 0.35, h: 0.12 }],
    movers: [C17_GHOST(-0.3, 4.0, 0.3, 4.0, 2.2, 0), C17_GATE(1.125, 1.2, 1.375, 1.2, 0.25, 2.4, 0)] },
  /* 12: graveyard switchbacks: hills in the turns, a ghost in the aisle, a passage from the first corner */
  { par: 4, sol: [[339,0.9,1.2],[153,0.95,0]], tee: [-1.4, 0.5], cup: [1.4, 6.3], shape: rect(-2.1, 0, 2.1, 7),
    inner: [[[-0.7, 0], [-0.7, 5.6]], [[0.7, 7], [0.7, 1.4]]],
    bumps: [{ x: -0.7, z: 6.4, r: 0.45, h: 0.25 }, { x: 0.7, z: 0.6, r: 0.45, h: 0.25 }, { x: 1.4, z: 4.6, r: 0.45, h: -0.22 }],
    tubes: [{ a: [-1.85, 3.0], b: [0, 4.4], dir: 180 }],
    posts: [C17_GARG(1.05, 5.6)],
    movers: [C17_GHOST(-0.35, 2.6, 0.35, 2.6, 2.0, 0)] },
  /* 13: the rampart run: up the windmill ramp onto the battlement and weave the gargoyles, or sneak
     the narrow bridge over the moat below; both meet in the courtyard where a ghost guards the cup */
  { par: 4, crazy: true, sol: [[330,1,0],[6,0.8,0]], tee: [0, 0.5], cup: [0.3, 9.1], shape: rect(-1.4, 0, 1.4, 10),
    ramps: [{ x0: -1.4, z0: 1.8, x1: -0.6, z1: 2.8, axis: 'z', h0: 0, h1: 0.35 }],
    tiers: [{ poly: rect(-1.4, 2.8, -0.6, 7.0), h: 0.35 }],
    inner: [[[-0.6, 1.8], [-0.6, 7.0]]],
    zones: [C17_MOAT(rect(-0.6, 4.0, 1.0, 5.0))],
    bumps: [{ x: -0.6, z: 9.2, r: 0.4, h: 0.12 }],
    posts: [C17_GARG(-1.15, 3.8), C17_GARG(-0.85, 5.3)],
    movers: [C17_MILL(0.4, 2.6, 0.55, 1.5, 0), C17_GHOST(-0.8, 8.0, 0.8, 8.0, 2.6, 0)] },
  /* 14: the secret library: four rooms, eight passages, only four of them go forward */
  { par: 4, crazy: true, sol: [[207,0.9,0],[6,0.1,0],[204,0.95,0],[6,0.5,0]], tee: [0.8, 0.5], cup: [-0.5, 0.7], aim0: 0, shape: rect(-1.6, 0, 1.6, 7.2),
    inner: [[[0, 0], [0, 7.2]], [[-1.6, 3.6], [1.6, 3.6]]],
    tubes: [{ a: [1.2, 3.0], b: [0.8, 4.0], dir: 0 }, { a: [0.35, 3.0], b: [0.35, 0.5], dir: 0 },
      { a: [0.35, 6.7], b: [-0.4, 6.6], dir: 270 }, { a: [1.2, 6.7], b: [1.2, 1.5], dir: 0 },
      { a: [-1.2, 4.1], b: [-1.2, 3.1], dir: 180 }, { a: [-0.4, 4.1], b: [0.8, 4.6], dir: 0 }],
    bumps: [{ x: -1.0, z: 1.9, r: 0.4, h: 0.15 }],
    posts: [C17_GARG(-0.9, 0.9)],
    movers: [C17_GHOST(0.35, 5.4, 1.25, 5.4, 2.4, 0)] },
  /* 15: down the castle steps: each drop guarded by a portcullis or a narrow side door */
  { par: 4, sol: [[21,0.95,1.2],[3,0.8,0]], tee: [0, 0.5], cup: [-0.4, 8.4], shape: rect(-1.3, 0, 1.3, 9.5),
    tiers: [{ poly: rect(-1.3, 0, 1.3, 3), h: 0.45 }, { poly: rect(-1.3, 3, 1.3, 6), h: 0.25, sx: 0.03 }],
    inner: [[[-1.3, 3], [-0.3, 3]], [[0.3, 3], [0.75, 3]], [[-0.75, 6], [0.25, 6]], [[0.75, 6], [1.3, 6]]],
    bumps: [{ x: 0.5, z: 7.6, r: 0.5, h: 0.25 }],
    posts: [C17_GARG(-0.9, 7.4)],
    movers: [C17_GATE(0, 3, -0.6, 3, 0.3, 3, 0), C17_MILL(-0.2, 4.5, 0.5, 1.5, 0), C17_GATE(0.5, 6, 0.89, 6, 0.25, 2.6, 0.5)] },
  /* 16: the grand ballroom: polished floor, two ghost dancers, the stage ramps and the throne dais */
  { par: 4, sol: [[342,0.8,0],[288,0.2,0]], tee: [0, 0.5], cup: [0, 8.4], shape: rect(-1.4, 0, 1.4, 9),
    zones: [{ surf: 'fast', poly: rect(-1.4, 1.4, 1.4, 5.0) }],
    tiers: [{ poly: rect(-1.4, 5.6, 1.4, 9), h: 0.2 }, { poly: rect(-0.6, 7.6, 0.6, 9), h: 0.32 }],
    ramps: [{ x0: -1.4, z0: 5.0, x1: -0.8, z1: 5.6, axis: 'z', h0: 0, h1: 0.2 }, { x0: 0.8, z0: 5.0, x1: 1.4, z1: 5.6, axis: 'z', h0: 0, h1: 0.2 },
      { x0: -0.35, z0: 7.0, x1: 0.35, z1: 7.6, axis: 'z', h0: 0.2, h1: 0.32 }],
    inner: [[[-0.8, 5.0], [-0.8, 5.6], [0.8, 5.6], [0.8, 5.0]]],
    posts: [C17_GARG(-0.95, 6.6), C17_GARG(0.95, 6.6)],
    movers: [C17_GHOST(-1.0, 2.6, 1.0, 2.6, 3.0, 0), C17_GHOST(1.0, 4.0, -1.0, 4.0, 2.4, 1.2)] },
  /* 17: the crypt descent: three floating floors; leap through the portcullis, over the windmill
     deck and down to the crypt, or find the passage that skips the middle */
  { par: 4, crazy: true, sol: [[328,1,0],[28,0.6875,0]], tee: [0, 0.5], cup: [-0.3, 9.0], floors: [rect(-0.8, 0, 0.8, 3.0), rect(-1.4, 3.6, 1.4, 6.4), rect(-1.0, 7.0, 1.0, 10)],
    tiers: [{ poly: rect(-0.8, 0, 0.8, 3.0), h: 0.45 }, { poly: rect(-1.4, 3.6, 1.4, 6.4), h: 0.22 }],
    walls: [[[-0.25, 3.0], [-0.8, 3.0], [-0.8, 0], [0.8, 0], [0.8, 3.0], [0.25, 3.0]],
      [[-0.5, 3.6], [-1.4, 3.6], [-1.4, 6.4], [-0.3, 6.4]], [[0.5, 3.6], [1.4, 3.6], [1.4, 6.4], [0.3, 6.4]],
      [[-0.3, 7.0], [-1.0, 7.0], [-1.0, 10], [1.0, 10], [1.0, 7.0], [0.3, 7.0]]],
    tubes: [{ a: [1.0, 5.9], b: [0.6, 7.5], dir: 0 }, { a: [-1.0, 5.9], b: [-0.5, 0.5], dir: 0 }],
    bumps: [{ x: 0.35, z: 8.4, r: 0.4, h: 0.15 }],
    movers: [C17_GATE(0, 3.0, 0.39, 3.0, 0.25, 2.8, 0), C17_MILL(0, 5.0, 0.5, 1.4, 0)] },
  /* 18: the showpiece: through the gate, up the switchback stair, into the right passage and
     onto the throne dais past a ghost */
  { par: 5, crazy: true, sol: [], tee: [0, 0.5], cup: [0, 9.3], shape: rect(-2.0, 0, 2.0, 10),
    inner: [[[-2.0, 2.6], [-0.3, 2.6]], [[0.3, 2.6], [2.0, 2.6]], [[-2.0, 3.6], [1.0, 3.6]], [[-1.0, 4.6], [2.0, 4.6]], [[-2.0, 5.6], [2.0, 5.6]]],
    tiers: [{ poly: [[1.0, 2.6], [2.0, 2.6], [2.0, 4.6], [0.6, 4.6], [0.6, 3.6], [1.0, 3.6]], h: 0.15 },
      { poly: [[-2.0, 3.6], [-1.0, 3.6], [-1.0, 4.6], [2.0, 4.6], [2.0, 5.6], [-2.0, 5.6]], h: 0.3 },
      { poly: rect(-0.8, 8.4, 0.8, 10), h: 0.15 }],
    ramps: [{ x0: 0.2, z0: 2.6, x1: 1.0, z1: 3.6, axis: 'x', h0: 0, h1: 0.15 }, { x0: -1.0, z0: 3.6, x1: 0.6, z1: 4.6, axis: 'x', h0: 0.3, h1: 0.15 },
      { x0: -0.4, z0: 7.8, x1: 0.4, z1: 8.4, axis: 'z', h0: 0, h1: 0.15 }],
    tubes: [{ a: [1.5, 5.1], b: [1.5, 6.1], dir: 0 }, { a: [-0.2, 5.1], b: [-1.5, 0.5], dir: 0 }],
    posts: [C17_GARG(-0.55, 9.0), C17_GARG(0.55, 9.0)],
    movers: [C17_GATE(0, 2.6, -0.6, 2.6, 0.3, 3, 0), C17_GHOST(-1.4, 7.0, 1.4, 7.0, 3.2, 0)] },
] });
