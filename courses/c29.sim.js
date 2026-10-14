/* world 9, course 29: the grand candy works, the world's masterpiece. Layered wafer decks,
   chained candy-cane pipes, conveyor switchbacks and candy presses guarding the drops. */
const C29_GUM = (x, z, r = 0.13, e = 1.12) => ({ x, z, r, e, look: 'gumdrop' });
const C29_POP = (x, z, len, w, phase = 0, blades = 1) => ({ kind: 'spin', x, z, len, w, phase, blades, look: 'lollipop' });
const C29_PRESS = (ax, az, bx, bz, len, ang, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'press' });
const C29_BELT = (poly, ax, az) => ({ push: [ax, az], poly });
const C29_PIPE = (a, b, dir, keep, add) => ({ a, b, dir, keep, add, color: '#ef7d6d' });
const C29_MUD = (x0, z0, x1, z1) => ({ surf: 'mud', poly: rect(x0, z0, x1, z1) });
registerWorld(29, { holes: [
  /* 1: a sideways belt, then the half ramp to the terrace */
  { par: 3, sol: [[4,0.88,0]], tee: [0, 0.5], cup: [-0.3, 6.6], shape: rect(-0.9, 0, 0.9, 7.5),
    zones: [C29_BELT(rect(-0.9, 1.8, 0.9, 2.8), -1.4, 0)],
    ramps: [{ x0: 0, z0: 3.6, x1: 0.9, z1: 4.6, axis: 'z', h0: 0, h1: 0.2 }],
    tiers: [{ poly: rect(-0.9, 4.6, 0.9, 7.5), h: 0.2 }],
    posts: [C29_GUM(0.3, 5.6)] },
  /* 2: two candy-cane pipes chain three pads */
  { par: 3, sol: [[10,0.84,0],[4,0.84,0]], tee: [0, 0.5], cup: [0.7, 8.1], aim0: 0,
    floors: [rect(-0.7, 0, 0.7, 2.6), rect(-2.6, 3.2, -0.6, 5.6), rect(-0.7, 6.2, 1.4, 8.8)],
    walls: [ring(rect(-0.7, 0, 0.7, 2.6)), ring(rect(-2.6, 3.2, -0.6, 5.6)), ring(rect(-0.7, 6.2, 1.4, 8.8))],
    zones: [C29_BELT(rect(-2.6, 3.2, -0.6, 4.2), 0, 0.9), C29_MUD(0.2, 7.5, 1.4, 7.65)],
    posts: [C29_GUM(-1.9, 4.8)],
    tubes: [C29_PIPE([0, 2.1], [-1.6, 3.6], 0), C29_PIPE([-1.2, 5.1], [-0.2, 6.6], 20)] },
  /* 3: up the ramp, past the lollipop on the deck, off the edge to the taffy green */
  { par: 3, sol: [[0,0.84,0]], tee: [0, 0.5], cup: [-0.4, 8.0], shape: rect(-1.1, 0, 1.1, 9),
    ramps: [{ x0: -1.1, z0: 1.2, x1: 1.1, z1: 2.4, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-1.1, 2.4, 1.1, 5.2), h: 0.3 }],
    movers: [C29_POP(0, 3.8, 0.55, 1.5, 0, 2)],
    zones: [C29_MUD(-1.1, 7.3, 0.2, 7.45), C29_MUD(0.2, 7.3, 0.35, 9)] },
  /* 4: long green: the caramel terraces, three broad leaning tiers stepping down to a back swale */
  { par: 3, sol: [[344,0.92,0]], tee: [0, 0.5], cup: [-1.2, 12.8], shape: rect(-2.6, 0, 2.6, 14),
    tiers: [{ poly: rect(-2.6, 0, 2.6, 4.5), h: 0.3, sx: 0.01 }, { poly: rect(-2.6, 6, 2.6, 9), h: 0.15, sx: -0.01 }, { poly: rect(-2.6, 10.5, 2.6, 14), h: 0 }],
    ramps: [{ x0: -2.6, z0: 4.5, x1: 2.6, z1: 6, axis: 'z', h0: 0.3, h1: 0.15 }, { x0: -2.6, z0: 9, x1: 2.6, z1: 10.5, axis: 'z', h0: 0.15, h1: 0 }],
    bumps: [{ x: 1.0, z: 7.5, r: 1.5, h: 0.1 }, { x: -1.0, z: 11.2, r: 1.2, h: -0.07 }] },
  /* 5: the chocolate river: a belt bridge shoves you sideways, or the pipe under; then up to the green */
  { par: 4, crazy: true, sol: [[5.25,0.96,0]], tee: [0, 0.5], cup: [0.5, 8.4], shape: rect(-1.6, 0, 1.6, 9.2),
    zones: [C29_BELT(rect(-0.3, 2.8, 0.3, 4.2), -0.8, 0), { surf: 'water', poly: rect(-1.6, 2.8, 1.6, 4.2) }, C29_MUD(-0.4, 7.7, 1.6, 7.85)],
    ramps: [{ x0: -1.6, z0: 5.2, x1: 1.6, z1: 6.2, axis: 'z', h0: 0, h1: 0.25 }],
    tiers: [{ poly: rect(-1.6, 6.2, 1.6, 9.2), h: 0.25 }],
    posts: [C29_GUM(-0.8, 7.3)],
    tubes: [C29_PIPE([1.1, 2.2], [1.1, 4.7], 340)] },
  /* 6: the conveyor switchback: belt up, belt across the top deck, then down the return lane */
  { par: 3, sol: [[26,0.64,0]], tee: [0, 0.5], cup: [2.4, 1.4], aim0: 0,
    shape: [[-0.4, 0], [0.4, 0], [0.4, 4.4], [2.0, 4.4], [2.0, 0.8], [2.8, 0.8], [2.8, 5.2], [-0.4, 5.2]],
    ramps: [{ x0: -0.4, z0: 1, x1: 0.4, z1: 3, axis: 'z', h0: 0, h1: 0.3 }, { x0: 2.0, z0: 2.4, x1: 2.8, z1: 4.4, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-0.4, 3, 2.8, 5.2), h: 0.3 }],
    zones: [C29_BELT(rect(-0.4, 1, 0.4, 3), 0, 1.8), C29_BELT(rect(0.4, 4.4, 2.0, 5.2), 1.0, 0), C29_MUD(2.0, 1.95, 2.55, 2.1)],
    posts: [C29_GUM(2.6, 3.0)] },
  /* 7: three layers: off the high deck past a press, off the middle deck past another, down to the green */
  { par: 4, sol: [[36,0.83,0],[38,0.68,0]], tee: [0, 0.5], cup: [0.5, 8.6], shape: rect(-1.2, 0, 1.2, 9.4),
    inner: [[[-1.2, 3.2], [0.2, 3.2]], [[-0.2, 6.2], [1.2, 6.2]]],
    tiers: [{ poly: rect(-1.2, 0, 1.2, 3.2), h: 0.44 }, { poly: rect(-1.2, 3.2, 1.2, 6.2), h: 0.22 }],
    movers: [C29_PRESS(0.7, 2.95, 1.45, 2.95, 0.5, 90, 3), C29_PRESS(-0.7, 5.95, -1.45, 5.95, 0.5, 90, 2.6, 1)],
    zones: [C29_BELT(rect(-1.2, 3.2, 1.2, 4.2), 0.8, 0), C29_MUD(-0.3, 7.9, 1.2, 8.05)],
    posts: [C29_GUM(0.4, 5.0), C29_GUM(-0.6, 7.6)] },
  /* 8: the candy mixer cascade: a belt chute up to the pipe bowl, the pipe spins the ball round the wafer deck's
     mixer drain, its plughole pipe drops it to the green and spins it round the second drain, into the cup */
  { par: 4, auto: true, sol: [[0, 0.6, 0]], tee: [0, 0.5], cup: [-0.6, 10.4], aim0: 0,
    floors: [rect(-0.4, 0, 0.4, 4.4), rect(1.0, 4.6, 4.2, 8.0), rect(-2.4, 8.6, 1.2, 12.4)],
    walls: [ring(rect(-0.4, 0, 0.4, 4.4)), ring(rect(1.0, 4.6, 4.2, 8.0)), ring(rect(-2.4, 8.6, 1.2, 12.4))],
    ramps: [{ x0: -0.4, z0: 1, x1: 0.4, z1: 3, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-0.4, 3, 0.4, 4.4), h: 0.3 }, { poly: rect(1.0, 4.6, 4.2, 8.0), h: 0.25 }],
    zones: [C29_BELT(rect(-0.4, 0.8, 0.4, 3.4), 0, 2.0)],
    bumps: [{ x: 0, z: 3.95, r: 0.35, h: -0.08 }],
    drains: [{ x: 2.6, z: 6.3, r: 1.2, depth: 0.3, flat: 0.13 }, { x: -0.6, z: 10.4, r: 1.2, depth: 0.3 }],
    tubes: [C29_PIPE([0, 3.95], [1.35, 7.3], 90, 0, 1.4), C29_PIPE([2.6, 6.3], [0.65, 11.4], 270, 0, 1.4)] },
  /* 9: floating wafers: a belt bridge that shoves you off, or the pipe; then jump the gap or pipe down */
  { par: 4, crazy: true, sol: [[0,0.76,0]], tee: [0, 0.5], cup: [0.4, 9.0], aim0: 0,
    floors: [rect(-0.7, 0, 0.7, 2.4), rect(-0.25, 2.4, 0.25, 4.6), rect(-1.4, 4.6, 1.4, 6.6), rect(-1.4, 7.0, 1.4, 9.6)],
    walls: [[[-0.25, 2.4], [-0.7, 2.4], [-0.7, 0], [0.7, 0], [0.7, 2.4], [0.25, 2.4]],
      [[-0.25, 4.6], [-1.4, 4.6], [-1.4, 6.6], [-0.6, 6.6]], [[0.25, 4.6], [1.4, 4.6], [1.4, 6.6]],
      [[-0.6, 7.0], [-1.4, 7.0], [-1.4, 9.6], [1.4, 9.6], [1.4, 7.0]]],
    tiers: [{ poly: rect(-1.4, 0, 1.4, 6.6), h: 0.35 }],
    zones: [C29_BELT(rect(-0.25, 2.8, 0.25, 4.2), 0.6, 0)],
    posts: [C29_GUM(-0.2, 8.4)],
    tubes: [C29_PIPE([0.4, 1.9], [1.0, 5.0], 0), C29_PIPE([-1.0, 6.1], [-1.0, 7.5], 20)] },
  /* 10: long green: the big dipper, a deep wide swale across the middle and a low ridge by the cup */
  { par: 2, sol: [[0,0.8,0]], tee: [0, 0.5], cup: [-0.6, 10.6], shape: rect(-2.2, 0, 2.2, 12),
    tiers: [{ poly: rect(-2.2, 0, 2.2, 12), h: 0.05, sz: 0.01 }],
    bumps: [{ x: 0, z: 6, r: 2.5, h: -0.18 }, { x: 1.2, z: 9.8, r: 1.0, h: 0.08 }] },
  /* 11: four stages: ramp to the lollipop deck, drop to the belt deck, drop to the taffy green */
  { par: 4, sol: [[350,1,0],[16,0.96,0]], tee: [0, 0.5], cup: [-0.3, 10.2], shape: rect(-1.2, 0, 1.2, 11),
    inner: [[[-0.6, 5.4], [1.2, 5.4]], [[-1.2, 8], [0.6, 8]]],
    ramps: [{ x0: -1.2, z0: 1.2, x1: 1.2, z1: 2.4, axis: 'z', h0: 0, h1: 0.4 }],
    tiers: [{ poly: rect(-1.2, 2.4, 1.2, 5.4), h: 0.4 }, { poly: rect(-1.2, 5.4, 1.2, 8), h: 0.2 }],
    movers: [C29_POP(0, 3.9, 0.5, 1.5, 0, 2)],
    zones: [C29_BELT(rect(-1.2, 5.4, 1.2, 8), 1.0, 0), C29_MUD(-1.2, 9.5, -0.6, 9.65), C29_MUD(0, 9.5, 1.2, 9.65)],
    posts: [C29_GUM(0.2, 6.7), C29_GUM(0.6, 9.0)] },
  /* 12: a tilted hard-candy slab of gumdrops, the pipe down, the crater green */
  { par: 3, sol: [[340,1,0],[16,0.42,0]], tee: [0, 0.5], cup: [0.5, 8.6], shape: rect(-1.4, 0, 1.4, 9.4),
    inner: [[[-1.4, 5], [1.4, 5]]],
    tiers: [{ poly: rect(-1.4, 0, 1.4, 5), h: 0.3, sx: 0.03 }],
    zones: [{ surf: 'fast', poly: rect(-1.4, 1.2, 1.4, 5) }],
    bumps: [{ x: -0.3, z: 7.4, r: 0.5, h: -0.18 }],
    posts: [C29_GUM(0.5, 2.4), C29_GUM(-0.4, 3.0), C29_GUM(0.2, 3.8), C29_GUM(1.0, 4.3), C29_GUM(-1.0, 3.9)],
    tubes: [C29_PIPE([-0.8, 4.5], [-0.8, 5.6], 25)] },
  /* 13: presses guard both drops off the high deck; the pipe takes you down to the lollipop green */
  { par: 4, crazy: true, sol: [[334,1,0],[24,0.88,0]], tee: [0, 0.5], cup: [0.6, 9.2], shape: rect(-1.4, 0, 1.4, 10),
    inner: [[[-0.9, 3], [0.9, 3]], [[-1.4, 6.5], [1.4, 6.5]]],
    tiers: [{ poly: rect(-1.4, 0, 1.4, 3), h: 0.44 }, { poly: rect(-1.4, 3, 1.4, 6.5), h: 0.22 }],
    movers: [C29_PRESS(1.15, 2.8, 1.8, 2.8, 0.25, 90, 2.4), C29_PRESS(-1.15, 2.8, -1.8, 2.8, 0.25, 90, 2.4, 1.6), C29_POP(-0.4, 8.4, 0.45, 1.4, 0, 1)],
    zones: [C29_BELT(rect(-1.4, 3, 1.4, 4.4), 0, 0.6)],
    posts: [C29_GUM(-0.5, 5.0), C29_GUM(0.6, 5.3)],
    tubes: [C29_PIPE([0, 6.0], [0, 7.0], 0)] },
  /* 14: three pipes chain four pads: belt pad, gumdrop pad, the lollipop green */
  { par: 4, sol: [[6,0.666667,0],[30,0.5,0],[330,0.95,1]], tee: [0, 0.5], cup: [-0.6, 9.3], aim0: 20,
    floors: [rect(-0.7, 0, 0.7, 2.4), rect(1.2, 3.0, 3.4, 5.2), rect(1.2, 6.0, 3.4, 8.2), rect(-1.6, 6.0, 0.4, 10.0)],
    walls: [ring(rect(-0.7, 0, 0.7, 2.4)), ring(rect(1.2, 3.0, 3.4, 5.2)), ring(rect(1.2, 6.0, 3.4, 8.2)), ring(rect(-1.6, 6.0, 0.4, 10.0))],
    zones: [C29_BELT(rect(1.2, 3.0, 3.4, 4.0), 0, 0.8), { surf: 'fast', poly: rect(1.2, 6.0, 3.4, 8.2) }],
    posts: [C29_GUM(2.2, 7.0), C29_GUM(2.8, 7.5)],
    movers: [C29_POP(-0.6, 8.0, 0.45, 1.4, 0, 1)],
    tubes: [C29_PIPE([0.3, 1.9], [1.6, 3.4], 30), C29_PIPE([3.0, 4.8], [3.0, 6.4], 330), C29_PIPE([1.6, 7.8], [-0.6, 6.4], 0)] },
  /* 15: long green: the sugar dogleg, a broad green leaning right round a ridge at the corner */
  { par: 3, sol: [[6,0.88,0]], tee: [0, 0.5], cup: [4.4, 10.6], aim0: 0, shape: [[-1.5, 0], [1.5, 0], [1.5, 8.5], [5.5, 8.5], [5.5, 12], [-1.5, 12]],
    tiers: [{ poly: [[-1.5, 0], [1.5, 0], [1.5, 8.5], [5.5, 8.5], [5.5, 12], [-1.5, 12]], h: 0.1, sx: -0.012, sz: 0.006 }],
    bumps: [{ x: 0, z: 10, r: 1.4, h: 0.15 }, { x: 3.5, z: 9.6, r: 1.2, h: -0.08 }] },
  /* 16: the switchback: a belt up, a belt across the top, down the return lane into the pipe, out on the green */
  { par: 4, crazy: true, sol: [[36,0.44,0],[26,1,0]], tee: [0, 0.5], cup: [0.4, 8.7], aim0: 0,
    floors: [[[-0.4, 0], [0.4, 0], [0.4, 4.4], [2.0, 4.4], [2.0, 0.4], [2.8, 0.4], [2.8, 5.2], [-0.4, 5.2]], rect(-0.4, 6.2, 2.8, 9.4)],
    walls: [ring([[-0.4, 0], [0.4, 0], [0.4, 4.4], [2.0, 4.4], [2.0, 0.4], [2.8, 0.4], [2.8, 5.2], [-0.4, 5.2]]), ring(rect(-0.4, 6.2, 2.8, 9.4))],
    ramps: [{ x0: -0.4, z0: 1, x1: 0.4, z1: 3, axis: 'z', h0: 0, h1: 0.4 }, { x0: 2.0, z0: 2.4, x1: 2.8, z1: 4.4, axis: 'z', h0: 0, h1: 0.4 }],
    tiers: [{ poly: rect(-0.4, 3, 2.8, 5.2), h: 0.4 }],
    zones: [C29_BELT(rect(-0.4, 1, 0.4, 3), 0, 2.0), C29_BELT(rect(0.4, 4.4, 2.0, 5.2), 1.2, 0), C29_MUD(-0.4, 8.0, 0.0, 8.15), C29_MUD(0.8, 8.0, 2.8, 8.15)],
    posts: [C29_GUM(1.4, 7.4)],
    tubes: [C29_PIPE([2.4, 0.9], [2.4, 6.6], 330)] },
  /* 17: gumdrop pinball on a tilted hard-candy slab, off the far gap, a belt and the taffy */
  { par: 4, sol: [[14,0.6,0]], tee: [0, 0.5], cup: [-0.8, 8.6], shape: rect(-1.5, 0, 1.5, 9.5),
    inner: [[[-1.5, 4.5], [0.9, 4.5]]],
    tiers: [{ poly: rect(-1.5, 0, 1.5, 4.5), h: 0.3, sx: -0.03 }],
    zones: [{ surf: 'fast', poly: rect(-1.5, 1.2, 1.5, 4.5) }, C29_BELT(rect(-1.5, 5.5, 1.5, 6.5), -0.9, 0), C29_MUD(-1.5, 7.9, -1.2, 9.5), C29_MUD(-0.4, 7.9, 0.0, 9.5)],
    posts: [C29_GUM(-0.2, 2.6), C29_GUM(0.6, 3.4), C29_GUM(-0.9, 3.6), C29_GUM(0.2, 8.0)] },
  /* 18: the grand works: belt up the ramp, the pipe off the deck, the lollipop terrace, a press over the drop, the taffy green */
  { par: 5, crazy: true, sol: [[336,0.83333,0],[126,0.95,1.4],[56,0.96,0]], tee: [0, 0.5], cup: [-0.4, 11.6], aim0: 0,
    floors: [[[-0.6, 0], [0.6, 0], [0.6, 3.5], [3.6, 3.5], [3.6, 6.5], [-0.6, 6.5]], rect(-1.2, 7.4, 3.6, 12.4)],
    walls: [ring([[-0.6, 0], [0.6, 0], [0.6, 3.5], [3.6, 3.5], [3.6, 6.5], [-0.6, 6.5]]), ring(rect(-1.2, 7.4, 3.6, 12.4)),
      [[1.6, 7.4], [1.6, 10.2]], [[2.4, 10.2], [3.6, 10.2]]],
    ramps: [{ x0: -0.6, z0: 1.2, x1: 0.6, z1: 3.5, axis: 'z', h0: 0, h1: 0.44 }],
    tiers: [{ poly: rect(-0.6, 3.5, 3.6, 6.5), h: 0.44 }, { poly: rect(1.6, 7.4, 3.6, 10.2), h: 0.22 }],
    zones: [C29_BELT(rect(-0.6, 1.2, 0.6, 3.5), 0, 2.2), C29_MUD(-1.2, 10.9, -0.7, 11.05), C29_MUD(-0.1, 10.9, 1.6, 11.05)],
    movers: [C29_POP(2.6, 8.6, 0.45, 1.5, 0, 2), C29_PRESS(2.0, 10.0, 2.9, 10.0, 0.4, 90, 2.8)],
    posts: [C29_GUM(1.2, 5.0), C29_GUM(2.2, 5.6), C29_GUM(0.4, 9.0)],
    tubes: [C29_PIPE([3.1, 6.0], [3.1, 7.8], 0)] },
] });
