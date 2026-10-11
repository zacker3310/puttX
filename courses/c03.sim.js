/* world 3, jungle temple: rivers and pools with narrow stone bridges, temple tunnels (tubes, some
   of them risky shortcuts), stepped temple tiers with ramps, mud, idol posts and a rolling boulder. */
const J3_IDOL = (x, z, r = 0.13) => ({ x, z, r, top: 0.3, look: 'idol' });
const J3_ROCK = (ax, az, bx, bz, period, phase = 0, r = 0.18) => ({ kind: 'slide', ax, az, bx, bz, r, period, phase, look: 'boulder' });
const J3_WATER = poly => ({ surf: 'water', poly });
const J3_MUD = poly => ({ surf: 'mud', poly });
registerWorld(3, { holes: [
  /* 1: the stream. A stone bridge off to the left, the cup back on the right behind a mound */
  { par: 2, sol: [[2,0.8,0]], tee: [0, 0.5], cup: [-0.25, 5.3], aim0: 4, shape: rect(-0.8, 0, 0.8, 6),
    zones: [J3_WATER(rect(-0.8, 2.6, 0, 3.2)), J3_WATER(rect(0.45, 2.6, 0.8, 3.2))],
    bumps: [{ x: 0.1, z: 4.4, r: 0.45, h: 0.12 }], posts: [J3_IDOL(0.45, 4.9, 0.12)] },
  /* 2: temple steps: a narrow ramp to the first terrace, a side ramp to the second */
  { par: 3, sol: [[8,0.88,0],[42,0.88,0]], tee: [0, 0.5], cup: [-0.45, 6.5], shape: rect(-0.9, 0, 0.9, 7.2),
    ramps: [{ x0: -0.3, z0: 2.2, x1: 0.3, z1: 3.0, axis: 'z', h0: 0, h1: 0.2 }, { x0: 0.35, z0: 4.8, x1: 0.9, z1: 5.5, axis: 'z', h0: 0.2, h1: 0.4 }],
    tiers: [{ poly: rect(-0.9, 3.0, 0.9, 5.5), h: 0.2 }, { poly: rect(-0.9, 5.5, 0.9, 7.2), h: 0.4 }],
    zones: [J3_MUD(rect(-0.9, 3.6, -0.1, 4.6))], posts: [J3_IDOL(0, 6.3)] },
  /* 3: the tunnel. Bank round the dogleg, or thread the temple tunnel by the pool */
  { par: 3, sol: [[338,0.8,0],[24,0.56,0]], tee: [0, 0.5], cup: [3.0, 5.2], aim0: 0, shape: [[-0.6, 0], [0.6, 0], [0.6, 4.4], [3.7, 4.4], [3.7, 6.0], [-0.6, 6.0]],
    zones: [J3_WATER(rect(-0.6, 3.3, -0.1, 4.0))], tubes: [{ a: [-0.35, 2.9], b: [1.5, 5.2], dir: 90, keep: 0, add: 0.55 }],
    posts: [J3_IDOL(2.4, 4.85), J3_IDOL(2.4, 5.55)], bumps: [{ x: 0.05, z: 5.25, r: 0.5, h: 0.25 }] },
  /* 4: mud baths on a leaning green, idols in the way */
  { par: 3, sol: [[6,1,0]], tee: [0, 0.5], cup: [0.55, 5.8], shape: rect(-1.1, 0, 1.1, 6.6),
    tiers: [{ poly: rect(-1.1, 0, 1.1, 6.6), h: 0.05, sx: 0.045 }],
    zones: [J3_MUD(rect(-0.3, 2.4, 1.1, 3.1)), J3_MUD(rect(-1.1, 4.0, 0.2, 4.6))],
    posts: [J3_IDOL(-0.5, 3.3), J3_IDOL(0.6, 4.4), J3_IDOL(0.1, 5.2)], bumps: [{ x: -0.6, z: 5.6, r: 0.5, h: 0.14 }] },
  /* 5: the boulder rolls across the far bank of the river */
  { par: 3, sol: [[0,0.84,0]], tee: [0, 0.5], cup: [0.3, 5.9], shape: rect(-1, 0, 1, 6.6),
    zones: [J3_WATER(rect(-1, 2.6, -0.22, 3.5)), J3_WATER(rect(0.22, 2.6, 1, 3.5))],
    movers: [J3_ROCK(-0.6, 4.4, 0.6, 4.4, 2.6)], bumps: [{ x: -0.5, z: 1.6, r: 0.5, h: 0.12 }] },
  /* 6: the waterfall. Jump the plunge pool off the upper deck, or take the side tunnel down */
  { par: 3, sol: [[356,0.92,0]], tee: [0, 0.5], cup: [0.6, 6.5], shape: rect(-1, 0, 1, 7),
    tiers: [{ poly: rect(-1, 0, 1, 3), h: 0.35 }], inner: [[[-1, 3], [-0.5, 3]], [[0.5, 3], [1, 3]], [[0.15, 5.9], [1, 5.9]]],
    zones: [J3_WATER(rect(-1, 3, 1, 3.7)), J3_MUD(rect(-0.5, 3.7, 0.5, 4.4))], tubes: [{ a: [0.75, 2.6], b: [-0.75, 4.1], dir: 0 }],
    posts: [J3_IDOL(0.45, 5.45), J3_IDOL(-0.4, 6.1)], bumps: [{ x: 0, z: 4.9, r: 0.5, h: 0.16 }] },
  /* 7: switchback. Up the ramp, round the terrace, up the back stair to the cup; or the tunnel by the pool */
  { par: 3, sol: [[8,0.32,0],[108,0.44,0]], tee: [0, 0.5], cup: [2.4, 0.8], aim0: 0,
    shape: [[-0.6, 0], [0.6, 0], [0.6, 4.2], [1.8, 4.2], [1.8, 0], [3.0, 0], [3.0, 5.6], [-0.6, 5.6]],
    ramps: [{ x0: -0.6, z0: 3.2, x1: 0.6, z1: 4.2, axis: 'z', h0: 0, h1: 0.2 }, { x0: 1.8, z0: 2.4, x1: 3.0, z1: 3.4, axis: 'z', h0: 0.4, h1: 0.2 }],
    tiers: [{ poly: [[-0.6, 4.2], [3.0, 4.2], [3.0, 5.6], [-0.6, 5.6]], h: 0.2 }, { poly: rect(1.8, 3.4, 3.0, 4.2), h: 0.2 }, { poly: rect(1.8, 0, 3.0, 2.4), h: 0.4 }],
    zones: [J3_WATER(rect(0.1, 2.75, 0.6, 3.1)), J3_MUD(rect(1.0, 4.6, 1.6, 5.6))],
    tubes: [{ a: [0.38, 2.4], b: [2.4, 1.9], dir: 180, keep: 0, add: 0.6 }], posts: [J3_IDOL(2.0, 1.2), J3_IDOL(2.75, 0.45)] },
  /* 8: the crocodile pool: a skinny causeway straight over, or the long way round the banks */
  { par: 3, sol: [[357,0.84,0]], tee: [0, 0.5], cup: [-0.5, 5.3], shape: rect(-1.4, 0, 1.4, 6),
    zones: [J3_WATER(rect(-0.9, 2.0, -0.2, 4.2)), J3_WATER(rect(0.3, 2.0, 0.9, 4.2))],
    bumps: [{ x: 0, z: 4.6, r: 0.45, h: 0.18 }], posts: [J3_IDOL(-1.0, 4.7)] },
  /* 9: the boulder run: downhill, over the bridge, past two rolling boulders */
  { par: 3, sol: [[4.5,1,1]], tee: [0, 0.5], cup: [0.4, 8.4], shape: rect(-0.9, 0, 0.9, 9),
    tiers: [{ poly: rect(-0.9, 0, 0.9, 9), h: 0.4, sz: -0.04 }],
    zones: [J3_WATER(rect(-0.9, 5, 0.25, 5.5)), J3_WATER(rect(0.65, 5, 0.9, 5.5)), J3_MUD(rect(-0.9, 2.4, 0.3, 2.9))],
    movers: [J3_ROCK(-0.55, 3.7, 0.55, 3.7, 2.2), J3_ROCK(0.55, 6.6, -0.55, 6.6, 3.0)], bumps: [{ x: -0.3, z: 7.6, r: 0.4, h: 0.12 }] },
  /* 10: the idol ring: the cup on a hilltop shrine, idols all round */
  { par: 3, sol: [[0,0.64,0]], tee: [0, 0.5], cup: [0, 4.4], shape: [[-0.6, 0], [0.6, 0], [0.6, 2.2], [1.5, 3.1], [1.5, 5.6], [0.7, 6.4], [-0.7, 6.4], [-1.5, 5.6], [-1.5, 3.1], [-0.6, 2.2]],
    bumps: [{ x: 0, z: 4.4, r: 0.9, h: 0.24 }],
    posts: [J3_IDOL(0.56, 4.08), J3_IDOL(-0.56, 4.08), J3_IDOL(0.4, 4.95), J3_IDOL(-0.4, 4.95)],
    zones: [J3_MUD(rect(-1.5, 3.1, -0.9, 4.2)), J3_MUD(rect(0.9, 4.6, 1.5, 5.6))] },
  /* 11: twin tunnels out of the sealed shrine: the left one to the long green, the right one up by the cup */
  { par: 4, sol: [[58,0.52,0],[8,0.68,0]], tee: [0, 0.5], cup: [2.3, 6.4], aim0: 20,
    floors: [rect(-1, 0, 1, 2), rect(-1, 3, 3, 8)],
    walls: [ring(rect(-1, 0, 1, 2)), [[1, 3], [-1, 3], [-1, 8], [1, 8], [3, 8], [3, 5.5], [3, 3], [1, 3]], [[1, 5.5], [3, 5.5]], [[1, 5.5], [1, 6.6]], [[1, 7.4], [1, 8]]],
    ramps: [{ x0: 0.2, z0: 6.6, x1: 1.0, z1: 7.4, axis: 'x', h0: 0, h1: 0.3 }], tiers: [{ poly: rect(1, 5.5, 3, 8), h: 0.3 }],
    tubes: [{ a: [0.6, 1.5], b: [-0.6, 3.4], dir: 0, keep: 0.5 }, { a: [-0.6, 1.6], b: [1.4, 7.6], dir: 90, keep: 0, add: 0.55 }],
    posts: [J3_IDOL(-0.33, 1.25, 0.11), J3_IDOL(-0.85, 1.05, 0.1)], zones: [J3_MUD(rect(-1, 5, 0.2, 5.8))] },
  /* 12: the rope bridge, or wade the mud ford */
  { par: 3, sol: [[0,0.68,0],[54,0.88,0]], tee: [0, 0.5], cup: [-0.6, 5.6], shape: rect(-1.2, 0, 1.2, 6.4),
    zones: [J3_WATER(rect(-1.2, 2.6, -0.2, 3.7)), J3_WATER(rect(0.22, 2.6, 0.7, 3.7)), J3_MUD(rect(0.7, 2.6, 1.2, 3.7))],
    posts: [J3_IDOL(-0.2, 5.1)], bumps: [{ x: -0.9, z: 4.6, r: 0.5, h: 0.15 }] },
  /* 13: three temple terraces, each ramp on the other side, a boulder guarding the top */
  { par: 4, sol: [[44,1,0],[0,0.52,0]], tee: [0, 0.5], cup: [0.5, 8.4], shape: [[-1.2, 0], [1.2, 0], [1.2, 2.5], [1.2, 5], [1.2, 7], [1.2, 9], [-1.2, 9], [-1.2, 7], [-1.2, 5], [-1.2, 2.5]],
    ramps: [{ x0: 0.5, z0: 1.7, x1: 1.2, z1: 2.5, axis: 'z', h0: 0, h1: 0.15 }, { x0: -1.2, z0: 4.3, x1: -0.5, z1: 5, axis: 'z', h0: 0.15, h1: 0.3 },
      { x0: -0.25, z0: 6.4, x1: 0.25, z1: 7, axis: 'z', h0: 0.3, h1: 0.45 }],
    tiers: [{ poly: rect(-1.2, 2.5, 1.2, 5), h: 0.15 }, { poly: rect(-1.2, 5, 1.2, 7), h: 0.3 }, { poly: rect(-1.2, 7, 1.2, 9), h: 0.45 }],
    zones: [J3_MUD(rect(-0.2, 3.3, 1.2, 3.9)), J3_MUD(rect(0.5, 5.6, 1.2, 6.3))], posts: [J3_IDOL(-0.6, 5.9), J3_IDOL(0.75, 4.6)],
    movers: [J3_ROCK(-0.8, 7.75, 0.8, 7.75, 2.4)], bumps: [{ x: 0.5, z: 8.4, r: 0.45, h: -0.08 }] },
  /* 14: down the river bank: a skinny bridge early, a wide one late behind the boulder */
  { par: 4, sol: [[6,0.88,0],[82,1,0]], tee: [-1.0, 0.6], cup: [1.0, 7.3], shape: rect(-1.6, 0, 1.6, 8),
    zones: [J3_WATER(rect(-0.4, 0, 0.4, 2.6)), J3_WATER(rect(-0.4, 3.0, 0.4, 6.0)), J3_WATER(rect(-0.4, 6.7, 0.4, 8)), J3_MUD(rect(-1.6, 4.2, -0.4, 4.8))],
    movers: [J3_ROCK(0.6, 4.4, 1.25, 4.4, 2.0)], posts: [J3_IDOL(0.75, 6.8, 0.11)], bumps: [{ x: 1.0, z: 2.0, r: 0.5, h: 0.2 }] },
  /* 15: the idol's eye. Drop off the deck, thread the tunnel between the idols, or leap the river */
  { par: 4, sol: [[314,1,0],[0,0.2,0]], tee: [0, 0.5], cup: [-0.5, 7.4], shape: rect(-1, 0, 1, 8.2),
    tiers: [{ poly: rect(-1, 0, 1, 2.5), h: 0.4 }, { poly: rect(-1, 2.5, 1, 4.5), h: 0.2 }],
    inner: [[[-1, 2.5], [-0.35, 2.5]], [[0.35, 2.5], [1, 2.5]], [[-1, 4.5], [0.2, 4.5]]],
    zones: [J3_WATER(rect(-1, 4.5, 1, 5.1)), J3_MUD(rect(0.2, 5.1, 1, 6.0))],
    tubes: [{ a: [0.6, 4.05], b: [-0.6, 5.6], dir: 0, keep: 0.4 }], posts: [J3_IDOL(0.6, 3.6), J3_IDOL(0.25, 3.95), J3_IDOL(-0.1, 6.9)],
    bumps: [{ x: 0.5, z: 6.9, r: 0.5, h: 0.2 }] },
  /* 16: the lost city: over the hill, across the stream, up to the plaza, through the gate tunnel */
  { par: 5, sol: [[348,0.68,0],[34,1,0],[0,0.4,0]], tee: [0, 0.5], cup: [2.6, 1.0], aim0: 0,
    shape: [[-0.8, 0], [0.8, 0], [0.8, 3.6], [0.8, 6.0], [1.8, 6.0], [1.8, 0], [3.4, 0], [3.4, 2.4], [3.4, 7.8], [-0.8, 7.8], [-0.8, 3.6]],
    bumps: [{ x: 0, z: 2.0, r: 0.6, h: 0.35 }],
    ramps: [{ x0: 0.8, z0: 6.0, x1: 1.8, z1: 7.8, axis: 'x', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(1.8, 2.4, 3.4, 7.8), h: 0.3 }],
    inner: [[[1.8, 2.4], [3.4, 2.4]]],
    zones: [J3_WATER(rect(-0.8, 4.4, -0.15, 5.0)), J3_WATER(rect(0.3, 4.4, 0.8, 5.0)), J3_MUD(rect(1.8, 4.0, 2.6, 5.0))],
    tubes: [{ a: [2.6, 3.0], b: [2.6, 2.0], dir: 180, keep: 0, add: 0.5 }],
    posts: [J3_IDOL(3.1, 3.4), J3_IDOL(2.1, 3.4), J3_IDOL(2.15, 0.8)] },
  /* 17: the boulder gauntlet down the temple corridor */
  { par: 4, sol: [[352,0.96,0]], tee: [0, 0.5], cup: [-1.4, 7.6], aim0: 0,
    shape: [[-0.6, 0], [0.6, 0], [0.6, 8.4], [-2.0, 8.4], [-2.0, 6.8], [-0.6, 6.8]],
    zones: [J3_MUD(rect(-0.6, 1.8, -0.15, 2.4)), J3_MUD(rect(0.15, 3.6, 0.6, 4.2)), J3_WATER(rect(-2.0, 6.8, -1.0, 7.1))],
    movers: [J3_ROCK(-0.27, 2.9, 0.27, 2.9, 1.8, 0, 0.16), J3_ROCK(0.27, 4.9, -0.27, 4.9, 2.2, 1, 0.16), J3_ROCK(0, 6.3, 0, 7.9, 2.6, 0, 0.16)],
    bumps: [{ x: -1.4, z: 7.6, r: 0.45, h: -0.1 }] },
  /* 18: the temple. Climb the steps, through the idol's mouth tunnel, then leap the river to the cup */
  { par: 5, sol: [[8,0.76,0],[38,0.64,0],[2,0.56,0]], tee: [0, 0.5], cup: [0.3, 9.4], shape: [[-1.5, 0], [1.5, 0], [1.5, 3], [1.5, 5], [1.5, 6.5], [1.5, 10], [-1.5, 10], [-1.5, 6.5], [-1.5, 5], [-1.5, 3]],
    ramps: [{ x0: -0.35, z0: 2.2, x1: 0.35, z1: 3.0, axis: 'z', h0: 0, h1: 0.2 }, { x0: 0.9, z0: 4.3, x1: 1.5, z1: 5.0, axis: 'z', h0: 0.2, h1: 0.4 },
      { x0: -0.4, z0: 7.4, x1: 0.4, z1: 8.0, axis: 'z', h0: 0, h1: 0.2 }],
    tiers: [{ poly: rect(-1.5, 3, 1.5, 5), h: 0.2 }, { poly: rect(-1.5, 5, 1.5, 6.5), h: 0.4 }],
    inner: [[[-1.5, 6.5], [1.5, 6.5]]],
    zones: [J3_WATER(rect(-1.5, 8.0, 1.1, 8.6)), J3_MUD(rect(-1.5, 3.4, -0.6, 4.4))],
    tubes: [{ a: [0, 6.0], b: [0, 6.9], dir: 0, keep: 0.5, add: 0.3 }],
    posts: [J3_IDOL(-0.3, 5.75, 0.12), J3_IDOL(0.3, 5.75, 0.12), J3_IDOL(-0.6, 9.2, 0.11)] },
] });
