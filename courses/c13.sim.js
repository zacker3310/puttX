/* world 3, course 13, jungle temple at dusk: the same rivers, tunnels and terraces as course 3, but
   every hole has more going on: three-part holes, side tunnels, sliding stone doors and boulders. */
const J13_IDOL = (x, z, r = 0.12) => ({ x, z, r, top: 0.3, look: 'idol' });
const J13_ROCK = (ax, az, bx, bz, period, phase = 0, r = 0.17) => ({ kind: 'slide', ax, az, bx, bz, r, period, phase, look: 'boulder' });
const J13_DOOR = (ax, az, bx, bz, len, ang, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'door' });
const J13_WATER = poly => ({ surf: 'water', poly });
const J13_MUD = poly => ({ surf: 'mud', poly });
registerWorld(13, { holes: [
  /* 1: two stone bridges over the stream, then the temple step up to the cup */
  { par: 3, sol: [], tee: [0, 0.5], cup: [0.5, 6.3], shape: rect(-1, 0, 1, 7),
    zones: [J13_WATER(rect(-1, 2.4, -0.55, 3.0)), J13_WATER(rect(-0.15, 2.4, 0.15, 3.0)), J13_WATER(rect(0.55, 2.4, 1, 3.0))],
    ramps: [{ x0: -0.35, z0: 4.4, x1: 0.35, z1: 5.0, axis: 'z', h0: 0, h1: 0.18 }], tiers: [{ poly: rect(-1, 5.0, 1, 7), h: 0.18 }],
    bumps: [{ x: 0.55, z: 3.8, r: 0.4, h: 0.1 }], posts: [J13_IDOL(-0.1, 5.9)] },
  /* 2: the split shrine: the long left aisle through the mud, or the right one past the pool */
  { par: 3, sol: [], tee: [0, 0.5], cup: [-0.6, 5.8], aim0: 0, shape: rect(-1.2, 0, 1.2, 6.6),
    inner: [[[0, 1.6], [0, 5.0]]],
    zones: [J13_WATER(rect(-1.2, 2.6, -0.45, 3.3)), J13_MUD(rect(0.05, 3.8, 1.2, 4.4))],
    tubes: [{ a: [0.6, 3.0], b: [-0.6, 4.2], dir: 0, keep: 0.5 }],
    posts: [J13_IDOL(0.6, 5.4), J13_IDOL(-0.15, 6.1)], bumps: [{ x: -0.6, z: 1.5, r: 0.45, h: 0.12 }] },
  /* 3: a leaning green, a side ramp up to the shrine, the boulder rolling past the cup */
  { par: 3, sol: [], tee: [0, 0.5], cup: [-0.5, 6.4], shape: rect(-1.1, 0, 1.1, 7.2),
    tiers: [{ poly: rect(-1.1, 0, 1.1, 5.2), h: 0.05, sx: 0.04 }, { poly: rect(-1.1, 5.2, 1.1, 7.2), h: 0.3 }],
    ramps: [{ x0: 0.3, z0: 4.6, x1: 1.0, z1: 5.2, axis: 'z', h0: 0.06, h1: 0.3 }],
    zones: [J13_MUD(rect(-1.1, 2.2, 0.0, 2.8)), J13_MUD(rect(0.3, 3.4, 1.1, 3.9))],
    posts: [J13_IDOL(-0.5, 3.6), J13_IDOL(0.4, 2.0)], movers: [J13_ROCK(-0.75, 5.75, 0.75, 5.75, 2.6)] },
  /* 4: the waterfall: drop through the gap to the middle terrace, round the wall, drop to the cup; or the tunnel */
  { par: 3, sol: [], tee: [0, 0.5], cup: [0.4, 6.9], shape: rect(-1, 0, 1, 7.6),
    tiers: [{ poly: rect(-1, 0, 1, 2.6), h: 0.4 }, { poly: rect(-1, 2.6, 1, 4.6), h: 0.2 }],
    inner: [[[-1, 2.6], [-0.3, 2.6]], [[0.3, 2.6], [1, 2.6]], [[-0.4, 4.6], [1, 4.6]]],
    zones: [J13_WATER(rect(0.3, 2.6, 1, 3.3)), J13_MUD(rect(-1, 3.5, -0.2, 4.0))],
    tubes: [{ a: [0.7, 2.1], b: [0.6, 5.1], dir: 0, keep: 0.5 }],
    posts: [J13_IDOL(-0.3, 6.3), J13_IDOL(0.75, 6.2, 0.11)], bumps: [{ x: -0.5, z: 5.6, r: 0.45, h: 0.14 }] },
  /* 5: two rivers, two bridges, a boulder behind each */
  { par: 3, sol: [], tee: [0, 0.5], cup: [0.3, 6.5], shape: rect(-1, 0, 1, 7.2),
    zones: [J13_WATER(rect(-1, 2.0, 0.2, 2.6)), J13_WATER(rect(0.7, 2.0, 1, 2.6)), J13_WATER(rect(-1, 4.2, -0.7, 4.8)), J13_WATER(rect(-0.2, 4.2, 1, 4.8))],
    movers: [J13_ROCK(-0.6, 3.4, 0.6, 3.4, 2.4), J13_ROCK(0.6, 5.5, -0.6, 5.5, 2.8, 1)], bumps: [{ x: -0.3, z: 1.2, r: 0.4, h: 0.1 }] },
  /* 6: the switchback: up the stair, across the terrace, down the far stair; or the tunnel by the pool */
  { par: 4, sol: [], tee: [0, 0.5], cup: [2.3, 0.8], aim0: 0,
    shape: [[-0.7, 0], [0.7, 0], [0.7, 4.4], [1.7, 4.4], [1.7, 0], [2.9, 0], [2.9, 6], [-0.7, 6]],
    ramps: [{ x0: -0.7, z0: 3.6, x1: 0.7, z1: 4.4, axis: 'z', h0: 0, h1: 0.2 }, { x0: 1.7, z0: 3.2, x1: 2.9, z1: 4.4, axis: 'z', h0: 0, h1: 0.2 }],
    tiers: [{ poly: rect(-0.7, 4.4, 2.9, 6), h: 0.2 }],
    zones: [J13_WATER(rect(0.1, 2.95, 0.7, 3.3)), J13_MUD(rect(0.6, 5.0, 1.5, 6))],
    tubes: [{ a: [0.4, 2.6], b: [2.3, 2.0], dir: 180, keep: 0, add: 0.6 }],
    movers: [J13_ROCK(2.0, 2.65, 2.6, 2.65, 2.2)], posts: [J13_IDOL(1.95, 1.3), J13_IDOL(2.65, 0.4, 0.1)] },
] });
