/* world 3, course 23, the jungle temple's masterpiece: deep inside the temple, layered terraces,
   chained tunnels, switchback stairs, sky bridges and stone doors sliding across the drops. */
const J23_IDOL = (x, z, r = 0.12) => ({ x, z, r, top: 0.3, look: 'idol' });
const J23_ROCK = (ax, az, bx, bz, period, phase = 0, r = 0.15) => ({ kind: 'slide', ax, az, bx, bz, r, period, phase, look: 'boulder' });
const J23_DOOR = (ax, az, bx, bz, len, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang: 90, period, phase, look: 'door' });
const J23_WATER = poly => ({ surf: 'water', poly });
const J23_MUD = poly => ({ surf: 'mud', poly });
registerWorld(23, { holes: [
  /* 1: up the temple step, across the terrace, drop round the lintel to the cup */
  { par: 3, sol: [[352.75,0.93,0]], tee: [0, 0.5], cup: [0, 6.6], shape: [[-1, 0], [1, 0], [1, 2.4], [1, 4.6], [1, 7.4], [-1, 7.4], [-1, 4.6], [-1, 2.4]],
    ramps: [{ x0: -0.3, z0: 1.6, x1: 0.3, z1: 2.4, axis: 'z', h0: 0, h1: 0.25 }], tiers: [{ poly: rect(-1, 2.4, 1, 4.6), h: 0.25 }],
    inner: [[[-0.5, 4.6], [0.5, 4.6]]], zones: [J23_MUD(rect(-1, 3.0, -0.3, 3.6))], posts: [J23_IDOL(0.55, 5.8)] },
  /* 2: two tunnels in a chain, or the plank straight over the gorge */
  { par: 3, sol: [[2,0.92,0]], tee: [0, 0.5], cup: [0.6, 5.2], aim0: 0,
    floors: [rect(-0.8, 0, 0.8, 2.4), rect(-0.2, 2.4, 0.2, 3.2), rect(1.6, 0, 3.2, 2.4), rect(-0.8, 3.2, 3.2, 6.0)],
    walls: [[[-0.2, 2.4], [-0.8, 2.4], [-0.8, 0], [0.8, 0], [0.8, 2.4], [0.2, 2.4]], ring(rect(1.6, 0, 3.2, 2.4)), [[-0.2, 3.2], [-0.8, 3.2], [-0.8, 6], [3.2, 6], [3.2, 3.2], [0.2, 3.2]]],
    tubes: [{ a: [0.5, 2.0], b: [1.9, 0.4], dir: 0, keep: 0.6 }, { a: [2.9, 2.0], b: [2.9, 3.6], dir: 0, keep: 0, add: 0.5 }],
    zones: [J23_WATER(rect(2.2, 0.9, 3.2, 1.3))], posts: [J23_IDOL(1.2, 4.6), J23_IDOL(0.0, 5.5)], bumps: [{ x: 1.9, z: 4.9, r: 0.5, h: 0.15 }] },
  /* 3: the golden lawn, a long green: a leaning top tier, a broad bank down into the bellied middle with its hump, a bank back up to the flat cup tier */
  { par: 3, sol: [[2,1,0]], tee: [0, 0.5], cup: [-0.6, 13.4],
    shape: [[-1.6, 0], [1.6, 0], [1.6, 5], [2.6, 6], [2.6, 10], [1.6, 11], [1.6, 14.4], [-1.6, 14.4], [-1.6, 11], [-0.6, 10], [-0.6, 6], [-1.6, 5]],
    tiers: [{ poly: rect(-1.6, 0, 2.6, 5), h: 0.25, sx: 0.01 }, { poly: rect(-1.6, 5.8, 2.6, 10), h: 0.1, sx: -0.01 }, { poly: rect(-1.6, 10.8, 2.6, 14.4), h: 0.25 }],
    ramps: [{ x0: -1.6, z0: 5, x1: 2.6, z1: 5.8, axis: 'z', h0: 0.25, h1: 0.1 }, { x0: -1.6, z0: 10, x1: 2.6, z1: 10.8, axis: 'z', h0: 0.1, h1: 0.25 }],
    bumps: [{ x: 0.6, z: 2.8, r: 1.3, h: 0.1 }, { x: 1.4, z: 8.0, r: 1.2, h: 0.12 }, { x: 0.6, z: 12.6, r: 0.9, h: -0.06 }] },
  /* 4: the zigzag: up, across the canopy, up the back stair, drop into the cup lane and climb to the shrine */
  { par: 4, sol: [[28,0.92,0],[174,1,0],[0,0.44,0]], tee: [0, 0.5], cup: [2.8, 4.7], aim0: 0,
    shape: [[-0.4, 0], [0.4, 0], [0.4, 4.2], [1.2, 4.2], [1.2, 0], [3.4, 0], [3.4, 3.8], [3.4, 5.4], [-0.4, 5.4]],
    inner: [[[2.2, 0.8], [2.2, 5.4]]],
    ramps: [{ x0: -0.4, z0: 3.4, x1: 0.4, z1: 4.2, axis: 'z', h0: 0, h1: 0.2 }, { x0: 1.2, z0: 3.2, x1: 2.2, z1: 4.2, axis: 'z', h0: 0.4, h1: 0.2 },
      { x0: 2.2, z0: 3.2, x1: 3.4, z1: 3.8, axis: 'z', h0: 0, h1: 0.15 }],
    tiers: [{ poly: rect(-0.4, 4.2, 2.2, 5.4), h: 0.2 }, { poly: rect(1.2, 0, 2.2, 3.2), h: 0.4 }, { poly: rect(2.2, 3.8, 3.4, 5.4), h: 0.15 }],
    zones: [J23_MUD(rect(2.2, 1.6, 2.8, 2.0))], posts: [J23_IDOL(1.7, 1.6), J23_IDOL(3.1, 2.6, 0.1)] },
  /* 5: the waterfall stairs: three drops, each gap on another side */
  { par: 3, sol: [[346,0.96,0],[0,0.84,0]], tee: [0, 0.5], cup: [0.5, 7.8], shape: [[-1, 0], [1, 0], [1, 2.4], [1, 4.4], [1, 6.4], [1, 8.6], [-1, 8.6], [-1, 6.4], [-1, 4.4], [-1, 2.4]],
    tiers: [{ poly: rect(-1, 0, 1, 2.4), h: 0.45 }, { poly: rect(-1, 2.4, 1, 4.4), h: 0.3 }, { poly: rect(-1, 4.4, 1, 6.4), h: 0.15 }],
    inner: [[[-1, 2.4], [0.3, 2.4]], [[0.8, 2.4], [1, 2.4]], [[-1, 4.4], [-0.8, 4.4]], [[-0.3, 4.4], [1, 4.4]], [[-1, 6.4], [-0.25, 6.4]], [[0.25, 6.4], [1, 6.4]]],
    zones: [J23_WATER(rect(0.3, 2.4, 1, 2.9))], posts: [J23_IDOL(-0.4, 1.6), J23_IDOL(-0.55, 5.3), J23_IDOL(0, 7.3)] },
  /* 6: the stone door over the drop, the pool terrace, then down to the cup; or the tunnel */
  { par: 4, sol: [[6,0.6,0.5],[0,0.27,0]], tee: [0, 0.5], cup: [-0.6, 8.0], shape: [[-1.2, 0], [1.2, 0], [1.2, 3], [1.2, 6], [1.2, 9], [-1.2, 9], [-1.2, 6], [-1.2, 3]],
    tiers: [{ poly: rect(-1.2, 0, 1.2, 3), h: 0.4 }, { poly: rect(-1.2, 3, 1.2, 6), h: 0.2 }],
    inner: [[[-1.2, 3], [-0.35, 3]], [[0.35, 3], [1.2, 3]], [[-1.2, 6], [0.6, 6]]],
    movers: [J23_DOOR(-0.6, 3, 0.6, 3, 0.25, 3.0)],
    zones: [J23_WATER(rect(-0.2, 4.2, 1.2, 4.7))], tubes: [{ a: [-0.9, 5.6], b: [-0.2, 8.6], dir: 90, keep: 0, add: 0.45 }],
    posts: [J23_IDOL(0.3, 7.6)], bumps: [{ x: 0.6, z: 8.4, r: 0.4, h: 0.12 }] },
  /* 7: three rooms and two tunnels in a chain, or the long plank over the gorge */
  { par: 4, sol: [[185,0.91,0],[332,0.31,0]], tee: [0, 0.5], cup: [0, 6.6], aim0: 0,
    floors: [rect(-0.8, 0, 0.8, 2.6), rect(-0.6, 2.6, -0.2, 4.6), rect(1.4, 1.0, 3.0, 4.0), rect(-0.8, 4.6, 3.0, 7.4)],
    walls: [[[-0.2, 2.6], [0.8, 2.6], [0.8, 0], [-0.8, 0], [-0.8, 2.6], [-0.6, 2.6]], ring(rect(1.4, 1.0, 3.0, 4.0)), [[-0.6, 4.6], [-0.8, 4.6], [-0.8, 7.4], [3.0, 7.4], [3.0, 4.6], [-0.2, 4.6]]],
    tiers: [{ poly: rect(1.4, 1.0, 3.0, 4.0), h: 0.3 }],
    tubes: [{ a: [0.5, 2.2], b: [1.7, 1.4], dir: 0, keep: 0.5 }, { a: [2.7, 3.6], b: [2.6, 5.0], dir: 0, keep: 0, add: 0.6 }],
    zones: [J23_WATER(rect(2.0, 2.2, 3.0, 2.6)), J23_MUD(rect(1.0, 5.6, 1.8, 6.4))], posts: [J23_IDOL(0.6, 6.2), J23_IDOL(-0.4, 1.4)] },
  /* 8: island hopping: two planks over the gorge, or the tunnel from the first island */
  { par: 3, sol: [[355,0.95,0],[106,0.89,0]], tee: [0, 0.5], cup: [-0.4, 6.9], aim0: 0,
    floors: [rect(-0.6, 0, 0.6, 1.8), rect(-0.2, 1.8, 0.2, 2.8), rect(-1, 2.8, 1, 4.6), rect(0.4, 4.6, 0.8, 5.6), rect(-1, 5.6, 1, 7.6)],
    walls: [[[-0.2, 1.8], [-0.6, 1.8], [-0.6, 0], [0.6, 0], [0.6, 1.8], [0.2, 1.8]], [[-0.2, 2.8], [-1, 2.8], [-1, 4.6], [0.4, 4.6]], [[0.8, 4.6], [1, 4.6], [1, 2.8], [0.2, 2.8]],
      [[0.4, 5.6], [-1, 5.6], [-1, 7.6], [1, 7.6], [1, 5.6], [0.8, 5.6]]],
    tubes: [{ a: [-0.7, 4.2], b: [0.6, 6.0], dir: 0, keep: 0, add: 0.45 }],
    zones: [J23_MUD(rect(-1, 3.2, -0.4, 3.6))], posts: [J23_IDOL(0.1, 3.8), J23_IDOL(0.1, 6.6)] },
  /* 9: the valley lawn, a long green: a broad leaning lawn with a deep swale across the middle and a low ridge off the back left */
  { par: 3, sol: [[6,0.88,0]], tee: [0, 0.5], cup: [0.9, 11.5], shape: rect(-1.8, 0, 1.8, 12.6),
    tiers: [{ poly: rect(-1.8, 0, 1.8, 12.6), h: 0.2, sx: 0.012 }],
    bumps: [{ x: 0.3, z: 6.2, r: 2.2, h: -0.18 }, { x: -1.0, z: 9.6, r: 1.2, h: 0.08 }] },
  /* 10: two stone doors, two drops, a side tunnel round the second door, and a crater cup */
  { par: 4, sol: [[3, 0.8, 2]], tee: [0, 0.5], cup: [0.3, 8.8], shape: [[-1, 0], [1, 0], [1, 3.2], [1, 6.4], [1, 9.6], [-1, 9.6], [-1, 6.4], [-1, 3.2]],
    tiers: [{ poly: rect(-1, 0, 1, 3.2), h: 0.4 }, { poly: rect(-1, 3.2, 1, 6.4), h: 0.2 }],
    inner: [[[-1, 3.2], [-0.3, 3.2]], [[0.3, 3.2], [1, 3.2]], [[-1, 6.4], [0.2, 6.4]], [[0.8, 6.4], [1, 6.4]]],
    movers: [J23_DOOR(-0.55, 3.2, 0.55, 3.2, 0.25, 2.8), J23_DOOR(0.0, 6.4, 0.85, 6.4, 0.25, 3.4, 1)],
    tubes: [{ a: [-0.7, 5.9], b: [-0.6, 7.0], dir: 0, keep: 0.5 }],
    zones: [J23_MUD(rect(-1, 4.4, -0.2, 4.9))], bumps: [{ x: 0.3, z: 8.8, r: 0.4, h: -0.05 }], posts: [J23_IDOL(-0.5, 8.4)] },
  /* 11: the temple steps lawn, a long green: three broad tiers climbing away, each leaning the other way, a mound, a hump and a swale */
  { par: 3, sol: [[352,0.88,0]], tee: [0, 0.5], cup: [-0.5, 10.6], shape: rect(-1.5, 0, 1.5, 11.6),
    tiers: [{ poly: rect(-1.5, 0, 1.5, 3.6), h: 0.03, sx: 0.01 }, { poly: rect(-1.5, 4.3, 1.5, 7.4), h: 0.13, sx: -0.01 }, { poly: rect(-1.5, 8.1, 1.5, 11.6), h: 0.23 }],
    ramps: [{ x0: -1.5, z0: 3.6, x1: 1.5, z1: 4.3, axis: 'z', h0: 0.03, h1: 0.13 }, { x0: -1.5, z0: 7.4, x1: 1.5, z1: 8.1, axis: 'z', h0: 0.13, h1: 0.23 }],
    bumps: [{ x: 0.7, z: 2.0, r: 1.0, h: 0.08 }, { x: -0.6, z: 5.9, r: 1.2, h: 0.1 }, { x: 0.6, z: 9.2, r: 0.8, h: -0.05 }] },
  /* 12: the canopy walk: up the plank ramp, across the treetop deck, up the second ramp back to the cup */
  { par: 4, crazy: true, sol: [[3,0.8,0],[56,0.62,0],[172,0.66,0],[9,0.23,0]], tee: [0, 0.5], cup: [1.6, 0.6], aim0: 0,
    floors: [rect(-0.8, 0, 0.8, 1.6), rect(-0.25, 1.6, 0.25, 3.2), rect(-0.8, 3.2, 2.6, 4.4), rect(1.65, 1.6, 2.15, 3.2), rect(1.2, 0, 2.6, 1.6)],
    walls: [[[-0.25, 1.6], [-0.8, 1.6], [-0.8, 0], [0.8, 0], [0.8, 1.6], [0.25, 1.6]], [[-0.25, 3.2], [-0.8, 3.2], [-0.8, 4.4], [2.6, 4.4], [2.6, 3.2], [2.15, 3.2]], [[1.65, 3.2], [0.25, 3.2]],
      [[1.65, 1.6], [1.2, 1.6], [1.2, 0], [2.6, 0], [2.6, 1.6], [2.15, 1.6]]],
    ramps: [{ x0: -0.25, z0: 1.6, x1: 0.25, z1: 3.2, axis: 'z', h0: 0, h1: 0.2 }, { x0: 1.65, z0: 1.6, x1: 2.15, z1: 3.2, axis: 'z', h0: 0.4, h1: 0.2 }],
    tiers: [{ poly: rect(-0.8, 3.2, 2.6, 4.4), h: 0.2 }, { poly: rect(1.2, 0, 2.6, 1.6), h: 0.4 }],
    posts: [J23_IDOL(1.0, 3.9), J23_IDOL(2.25, 0.9, 0.1)] },
  /* 13: the sealed shrine: wait for the stone door, take the idol's mouth up to the high hall, drop to the cup */
  { par: 4, crazy: true, sol: [[0,0.34,0],[26,0.77,0]], tee: [0, 0.5], cup: [0, 5.6], aim0: 0,
    floors: [[[-1, 0], [1, 0], [1, 2.8], [0.3, 2.8], [0.3, 3.6], [-0.3, 3.6], [-0.3, 2.8], [-1, 2.8]], [[1.8, 0], [3.4, 0], [3.4, 4.0], [3.4, 6.8], [-1, 6.8], [-1, 4.0], [1.8, 4.0]]],
    walls: [ring([[-1, 0], [1, 0], [1, 2.8], [0.3, 2.8], [0.3, 3.6], [-0.3, 3.6], [-0.3, 2.8], [-1, 2.8]]), ring([[1.8, 0], [3.4, 0], [3.4, 4.0], [3.4, 6.8], [-1, 6.8], [-1, 4.0], [1.8, 4.0]]),
      [[1.8, 4.0], [2.3, 4.0]], [[2.9, 4.0], [3.4, 4.0]]],
    tiers: [{ poly: rect(1.8, 0, 3.4, 4.0), h: 0.3 }],
    movers: [J23_DOOR(-0.55, 3.0, 0.55, 3.0, 0.25, 2.6)],
    tubes: [{ a: [0, 3.3], b: [2.6, 0.4], dir: 0, keep: 0.5 }],
    zones: [J23_MUD(rect(1.8, 1.6, 2.4, 2.2))], posts: [J23_IDOL(-0.5, 1.6), J23_IDOL(0.5, 1.6), J23_IDOL(0.8, 5.2), J23_IDOL(-0.5, 6.2)] },
  /* 14: the aqueduct: up the stair, ride the temple conveyor across the top, down the far stair to the cup */
  { par: 4, sol: [[344,0.92,0],[0,0.88,0]], tee: [0, 0.5], cup: [3.0, 0.8], aim0: 0,
    shape: [[-0.5, 0], [0.5, 0], [0.5, 5], [2.5, 5], [2.5, 0], [3.5, 0], [3.5, 6], [-0.5, 6]],
    ramps: [{ x0: -0.5, z0: 3.4, x1: 0.5, z1: 4.2, axis: 'z', h0: 0, h1: 0.2 }, { x0: 2.5, z0: 3.6, x1: 3.5, z1: 5, axis: 'z', h0: 0, h1: 0.2 }],
    tiers: [{ poly: rect(-0.5, 4.2, 0.5, 5), h: 0.2 }, { poly: rect(-0.5, 5, 3.5, 6), h: 0.2 }],
    zones: [{ push: [1.2, 0], poly: rect(0.6, 5.05, 2.4, 5.95) }, J23_WATER(rect(3.1, 2.6, 3.5, 3.0)), J23_MUD(rect(2.5, 1.6, 3.0, 2.0))],
    posts: [J23_IDOL(2.8, 2.4, 0.11), J23_IDOL(0, 2.2)] },
  /* 15: the temple heart: up the stair, past the stone door, down to the pool court, then tunnel or stair to the boulder shrine */
  { par: 5, crazy: true, sol: [[6,1,0],[346,0.16,0],[4,0.52,0]], tee: [0, 0.5], cup: [0, 9.2],
    shape: [[-1.4, 0], [1.4, 0], [1.4, 2.6], [1.4, 5.0], [1.4, 7.4], [1.4, 10], [-1.4, 10], [-1.4, 7.4], [-1.4, 5.0], [-1.4, 2.6]],
    ramps: [{ x0: -0.35, z0: 1.8, x1: 0.35, z1: 2.6, axis: 'z', h0: 0, h1: 0.2 }, { x0: 0.7, z0: 6.6, x1: 1.4, z1: 7.4, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-1.4, 2.6, 1.4, 5.0), h: 0.2 }, { poly: rect(-1.4, 7.4, 1.4, 10), h: 0.3 }],
    inner: [[[-1.4, 5.0], [0.4, 5.0]], [[1.0, 5.0], [1.4, 5.0]], [[-1.4, 7.4], [0.7, 7.4]]],
    movers: [J23_DOOR(0.25, 5.0, 1.15, 5.0, 0.3, 3.0), J23_ROCK(-0.8, 8.4, 0.8, 8.4, 2.6)],
    zones: [J23_WATER(rect(-0.6, 5.8, 0.6, 6.6)), J23_MUD(rect(-1.4, 3.4, -0.4, 4.0))],
    tubes: [{ a: [-1.0, 7.0], b: [-1.0, 8.0], dir: 0, keep: 0.5 }],
    posts: [J23_IDOL(-0.6, 1.4), J23_IDOL(0.6, 1.4), J23_IDOL(-0.8, 9.4), J23_IDOL(0.8, 9.4)] },
  /* 16: the sky bridges: up the plank ramp to the high deck, then the second plank or the tunnel to the far deck */
  { par: 5, crazy: true, sol: [[2,0.98,0],[83,0.69,0]], tee: [0, 0.5], cup: [2.8, 8.0], aim0: 0,
    floors: [rect(-0.8, 0, 0.8, 2.0), rect(-0.25, 2.0, 0.25, 3.6), rect(-1.2, 3.6, 2.8, 5.0), rect(2.0, 5.0, 2.4, 6.6), rect(0.8, 6.6, 3.4, 8.6)],
    walls: [[[-0.25, 2.0], [-0.8, 2.0], [-0.8, 0], [0.8, 0], [0.8, 2.0], [0.25, 2.0]], [[-0.25, 3.6], [-1.2, 3.6], [-1.2, 5.0], [2.0, 5.0]], [[2.4, 5.0], [2.8, 5.0], [2.8, 3.6], [0.25, 3.6]],
      [[2.0, 6.6], [0.8, 6.6], [0.8, 8.6], [3.4, 8.6], [3.4, 6.6], [2.4, 6.6]]],
    ramps: [{ x0: -0.25, z0: 2.0, x1: 0.25, z1: 3.6, axis: 'z', h0: 0, h1: 0.2 }],
    tiers: [{ poly: rect(-1.2, 3.6, 2.8, 5.0), h: 0.2 }, { poly: rect(2.0, 5.0, 2.4, 6.6), h: 0.2 }, { poly: rect(0.8, 6.6, 3.4, 8.6), h: 0.2 }],
    tubes: [{ a: [-0.9, 4.6], b: [1.2, 7.0], dir: 0, keep: 0, add: 0.45 }],
    zones: [J23_MUD(rect(0.6, 3.6, 1.4, 4.4))], posts: [J23_IDOL(2.2, 7.6), J23_IDOL(1.4, 8.1, 0.11)] },
  /* 17: the boulder terraces: three terraces, stairs on alternate sides, a boulder rolling on each of the top two */
  { par: 4, crazy: true, sol: [[42,1,0],[288,0.52,1],[320,0.32,0]], tee: [0, 0.5], cup: [0.5, 8.5],
    shape: [[-1.2, 0], [1.2, 0], [1.2, 2.5], [1.2, 5], [1.2, 7], [1.2, 9.2], [-1.2, 9.2], [-1.2, 7], [-1.2, 5], [-1.2, 2.5]],
    ramps: [{ x0: 0.5, z0: 1.7, x1: 1.2, z1: 2.5, axis: 'z', h0: 0, h1: 0.15 }, { x0: -1.2, z0: 4.3, x1: -0.5, z1: 5, axis: 'z', h0: 0.15, h1: 0.3 },
      { x0: -0.25, z0: 6.4, x1: 0.25, z1: 7, axis: 'z', h0: 0.3, h1: 0.42 }],
    tiers: [{ poly: rect(-1.2, 2.5, 1.2, 5), h: 0.15 }, { poly: rect(-1.2, 5, 1.2, 7), h: 0.3 }, { poly: rect(-1.2, 7, 1.2, 9.2), h: 0.42 }],
    zones: [J23_MUD(rect(-0.2, 3.3, 1.2, 3.9)), J23_MUD(rect(0.5, 5.6, 1.2, 6.3))],
    movers: [J23_ROCK(-0.75, 5.75, 0.75, 5.75, 2.2), J23_ROCK(0.75, 7.75, -0.75, 7.75, 2.6, 1)],
    posts: [J23_IDOL(-0.6, 3.4), J23_IDOL(-0.6, 8.6)], bumps: [{ x: 0.5, z: 8.5, r: 0.45, h: -0.05 }] },
  /* 18: the grand temple run: into the idol's mouth, along the conveyor gallery, into the second idol,
     spat sideways into the first coin-funnel bowl, round and round and down its drain, then spat
     into the second bowl to spiral round again into the cup. Strike it true and watch */
  { par: 4, auto: true, crazy: true, sol: [[0, 0.6, 0]], tee: [0, 0.5], cup: [2.9, 5.9], aim0: 0,
    floors: [rect(-0.3, 0, 0.3, 3.0), rect(0.9, 0, 3.9, 0.6), rect(0.6, 1.2, 4.2, 7.2)],
    walls: [ring(rect(-0.3, 0, 0.3, 3.0)), ring(rect(0.9, 0, 3.9, 0.6)), ring(rect(0.6, 1.2, 4.2, 7.2))],
    tiers: [{ poly: rect(0.9, 0, 3.9, 0.6), h: 0.3 }],
    zones: [{ push: [0.6, 0], poly: rect(1.6, 0.05, 3.2, 0.55) }],
    tubes: [{ a: [0, 2.6], b: [1.2, 0.3], dir: 90, keep: 0, add: 1.2 }, { a: [3.55, 0.3], b: [0.95, 1.6], dir: 10, keep: 0, add: 1.4 },
      { a: [2.0, 2.9], b: [1.85, 4.6], dir: 10, keep: 0, add: 1.4 }],
    drains: [{ x: 2.0, z: 2.9, r: 1.0, depth: 0.3 }, { x: 2.9, z: 5.9, r: 1.0, depth: 0.3 }] },
] });
