/* world 9, candy factory: conveyor belts (push zones), hard-candy fast floors, sticky taffy (mud),
   gumdrop bumpers (posts with e > 1), lollipop spinners, candy-press gates, a chocolate river
   (water), candy-cane pipes (tubes) and frosting hills. Hard: course 9 of 10. */
const C9_GUM = (x, z, r = 0.13, e = 1.12) => ({ x, z, r, e, look: 'gumdrop' });
const C9_POP = (x, z, len, w, phase = 0, blades = 1) => ({ kind: 'spin', x, z, len, w, phase, blades, look: 'lollipop' });
const C9_PRESS = (ax, az, bx, bz, len, ang, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'press' });
const C9_BELT = (poly, ax, az) => ({ push: [ax, az], poly });
const C9_PIPE = (a, b, dir, keep, add) => ({ a, b, dir, keep, add, color: '#ef7d6d' });
registerWorld(9, { holes: [
  /* 1: a sideways belt across the lane */
  { par: 3, sol: [[0, 0.8, 0]], tee: [0, 0.5], cup: [-0.35, 5.6], shape: rect(-0.8, 0, 0.8, 6.4),
    zones: [C9_BELT(rect(-0.8, 2.4, 0.8, 3.6), 1.8, 0)], posts: [C9_GUM(0.15, 4.5)] },
  /* 2: dogleg left, a belt carries round the bend onto hard candy */
  { par: 2, sol: [[26, 0.84, 0]], tee: [0, 0.5], cup: [4.0, 3.7], aim0: 10, shape: [[-0.7, 0], [0.7, 0], [0.7, 3], [4.6, 3], [4.6, 4.4], [-0.7, 4.4]],
    zones: [C9_BELT(rect(-0.7, 3, 0.7, 4.4), 1.6, 0), { surf: 'fast', poly: rect(0.7, 3, 3.2, 4.4) }],
    posts: [C9_GUM(-0.25, 3.9)] },
  /* 3: hard-candy slab through a gumdrop field */
  { par: 3, sol: [[12, 1, 0]], tee: [0, 0.5], cup: [0.6, 6.3], shape: rect(-1.2, 0, 1.2, 7), inner: [[[0, 5.6], [1.2, 5.6]]],
    zones: [{ surf: 'fast', poly: rect(-1.2, 1.4, 1.2, 7) }],
    posts: [C9_GUM(-0.5, 2.6), C9_GUM(0.4, 3.2), C9_GUM(-0.2, 4.1), C9_GUM(0.75, 4.6), C9_GUM(-0.5, 5.3)] },
  /* 4: over the frosting hill into a taffy-lined cup */
  { par: 3, sol: [[0, 0.6, 0]], tee: [0, 0.5], cup: [0, 5.6], shape: rect(-1, 0, 1, 6.5),
    bumps: [{ x: 0, z: 3, r: 0.7, h: 0.32 }],
    zones: [{ surf: 'mud', poly: rect(-1, 4.9, -0.25, 6.5) }, { surf: 'mud', poly: rect(0.25, 4.9, 1, 6.5) }, { surf: 'mud', poly: rect(-0.25, 6.1, 0.25, 6.5) }] },
  /* 5: the lollipop guards the only bridge over the chocolate */
  { par: 4, sol: [[27.5, 0.59, 1]], tee: [0, 0.5], cup: [-0.4, 6.2], shape: rect(-1, 0, 1, 7),
    zones: [{ surf: 'water', poly: rect(-1, 3, 0.2, 3.7) }, { surf: 'water', poly: rect(0.65, 3, 1, 3.7) }],
    movers: [C9_POP(0, 4.8, 0.6, 1.6, 0, 2)] },
  /* 6: up the ramp to the wafer deck, down the candy-cane pipe to the taffy green */
  { par: 3, sol: [], tee: [0, 0.5], cup: [1.6, 8.1], aim0: 0,
    floors: [[[-0.6, 0], [0.6, 0], [0.6, 3], [2.4, 3], [2.4, 4.6], [-0.6, 4.6]], rect(-0.6, 5.7, 2.4, 8.7)],
    walls: [ring([[-0.6, 0], [0.6, 0], [0.6, 3], [2.4, 3], [2.4, 4.6], [-0.6, 4.6]]), ring(rect(-0.6, 5.7, 2.4, 8.7))],
    ramps: [{ x0: -0.6, z0: 1.8, x1: 0.6, z1: 3, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-0.6, 3, 2.4, 4.6), h: 0.3 }],
    zones: [{ surf: 'mud', poly: rect(1.25, 7.4, 1.95, 7.6) }, { surf: 'mud', poly: rect(0.95, 7.4, 1.25, 8.7) }, { surf: 'mud', poly: rect(1.95, 7.4, 2.4, 8.7) }],
    posts: [C9_GUM(0.9, 6.9)],
    tubes: [C9_PIPE([1.9, 3.8], [0.0, 6.3], 0)] },
  /* 7: two candy presses slam across the lane */
  { par: 2, sol: [[12, 0.9, 0]], tee: [0, 0.5], cup: [0.3, 7.2], shape: rect(-1, 0, 1, 8),
    movers: [C9_PRESS(-0.55, 3, 0.55, 3, 0.55, 90, 3), C9_PRESS(0.55, 5, -0.55, 5, 0.55, 90, 3.4)],
    bumps: [{ x: -0.4, z: 6.3, r: 0.4, h: 0.12 }] },
  /* 8: the chocolate river: a thin wafer bridge straight on, or the wide bridge the long way */
  { par: 2, sol: [[328, 0.88, 0]], tee: [0, 0.5], cup: [0.6, 6.2], shape: rect(-2, 0, 2, 7),
    zones: [{ surf: 'water', poly: rect(-1.3, 3, 0.45, 4) }, { surf: 'water', poly: rect(0.8, 3, 2, 4) }],
    posts: [C9_GUM(0.6, 5.4, 0.14)], bumps: [{ x: -1, z: 5.6, r: 0.6, h: 0.18 }] },
  /* 9: off the high deck, a belt runs left to the ramp up to the cup terrace */
  { par: 3, sol: [[321, 0.65, 0], [66, 0.75, 0]], tee: [0, 0.5], cup: [0.3, 6.8], aim0: 0,
    shape: [[-0.7, 0], [0.7, 0], [0.7, 2.4], [3.3, 2.4], [3.3, 7.4], [-0.7, 7.4]],
    tiers: [{ poly: rect(-0.7, 0, 0.7, 2.4), h: 0.35 }, { poly: rect(-0.7, 5.4, 3.3, 7.4), h: 0.25 }],
    ramps: [{ x0: 2.1, z0: 4.2, x1: 3.3, z1: 5.4, axis: 'z', h0: 0, h1: 0.25 }],
    zones: [C9_BELT(rect(-0.7, 2.4, 2.1, 4.2), 1.4, 0)],
    posts: [C9_GUM(1.4, 6.4), C9_GUM(0.8, 5.9)] },
  /* 10: frosting hills, a sugar crater, and a cup tucked behind the big hill */
  { par: 2, sol: [[9, 0.8, 0]], tee: [0, 0.5], cup: [0.6, 6.3], shape: rect(-1.5, 0, 1.5, 7.2),
    bumps: [{ x: -0.6, z: 2.4, r: 0.6, h: 0.3 }, { x: 0.7, z: 3.0, r: 0.55, h: 0.3 }, { x: 0.35, z: 4.9, r: 0.6, h: 0.35 },
      { x: -0.6, z: 5.6, r: 0.5, h: -0.22 }, { x: 1.1, z: 6.9, r: 0.4, h: 0.15 }] },
  /* 11: belts in a zig-zag factory floor */
  { par: 2, sol: [[51, 1, 0], [72, 0.7, 0]], tee: [-1, 0.5], cup: [-0.9, 7.2], aim0: 30, shape: rect(-1.5, 0, 1.5, 8),
    inner: [[[-1.5, 2.5], [0.8, 2.5]], [[-0.8, 5], [1.5, 5]]],
    zones: [C9_BELT(rect(-1.5, 0, 1.5, 2.5), -1.2, 0), C9_BELT(rect(-1.5, 2.5, 1.5, 5), -1.6, 0), C9_BELT(rect(-1.5, 5.6, 1.5, 6.6), 1.5, 0)],
    posts: [C9_GUM(0, 3.7)] },
  /* 12: candy-cane pipes link three pads */
  { par: 4, sol: [], tee: [0, 0.5], cup: [0, 8.6], aim0: 20,
    floors: [rect(-0.8, 0, 0.8, 2.6), rect(1.6, 3.4, 3.6, 6.2), rect(-0.8, 7, 0.8, 9.2)],
    walls: [ring(rect(-0.8, 0, 0.8, 2.6)), ring(rect(1.6, 3.4, 3.6, 6.2)), ring(rect(-0.8, 7, 0.8, 9.2))],
    zones: [{ surf: 'fast', poly: rect(1.6, 3.4, 3.6, 6.2) }, { surf: 'mud', poly: rect(-0.8, 8.0, -0.3, 9.2) }, { surf: 'mud', poly: rect(0.3, 8.0, 0.8, 9.2) }, { surf: 'mud', poly: rect(-0.3, 8.0, 0.3, 8.2) }],
    posts: [C9_GUM(2.4, 4.7), C9_GUM(3.0, 5.3)],
    tubes: [C9_PIPE([0.4, 2.1], [2.0, 3.8], 30), C9_PIPE([3.1, 5.7], [-0.45, 7.35], 0)] },
  /* 13: a hard-candy causeway through the chocolate */
  { par: 3, sol: [], tee: [0, 0.5], cup: [0.3, 6.4], shape: rect(-1.5, 0, 1.5, 7),
    zones: [{ surf: 'water', poly: rect(-1.5, 1.6, -0.8, 6) }, { surf: 'water', poly: rect(0.8, 1.6, 1.5, 6) }, { surf: 'fast', poly: rect(-0.8, 1.6, 0.8, 6) }],
    posts: [C9_GUM(0.35, 3, 0.12, 1.1), C9_GUM(-0.05, 4.4, 0.12, 1.1), C9_GUM(0.3, 5.5, 0.11, 1.1)] },
  /* 14: up to the lollipop deck, drop into the crater, through the taffy to the cup */
  { par: 4, sol: [], tee: [0, 0.5], cup: [0.7, 7.9], aim0: 0,
    shape: [[-0.7, 0], [0.7, 0], [0.7, 3], [1.2, 3], [1.2, 8.6], [-1.2, 8.6], [-1.2, 3], [-0.7, 3]],
    ramps: [{ x0: -0.7, z0: 1.8, x1: 0.7, z1: 3, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-1.2, 3, 1.2, 5), h: 0.3 }],
    bumps: [{ x: -0.2, z: 6.0, r: 0.55, h: -0.2 }],
    zones: [{ surf: 'mud', poly: rect(-0.1, 7.1, 1.2, 7.4) }],
    movers: [C9_POP(0, 4, 0.5, 1.5, 0, 2)] },
  /* 15: lollipop, press, taffy: the packing line */
  { par: 4, sol: [], tee: [0, 0.5], cup: [0.4, 8.3], shape: rect(-1, 0, 1, 9),
    movers: [C9_POP(0, 2.8, 0.55, -1.7, 0.4, 2), C9_PRESS(-0.55, 5.4, 0.55, 5.4, 0.55, 90, 2.6)],
    zones: [{ surf: 'mud', poly: rect(-1, 4.0, -0.1, 4.4) }, { surf: 'mud', poly: rect(0.1, 6.6, 1, 7.0) }],
    bumps: [{ x: -0.3, z: 7.6, r: 0.4, h: 0.15 }] },
  /* 16: a tilted hard-candy slab with gumdrops */
  { par: 3, sol: [[6, 0.85, 0]], tee: [0, 0.5], cup: [-0.8, 6.2], shape: rect(-1.5, 0, 1.5, 7),
    tiers: [{ poly: rect(-1.5, 0, 1.5, 7), h: 0.08, sx: 0.04 }],
    zones: [{ surf: 'fast', poly: rect(-1.5, 1.5, 1.5, 7) }],
    posts: [C9_GUM(-0.3, 3, 0.13, 1.18), C9_GUM(-1.0, 4.4, 0.13, 1.18), C9_GUM(0.4, 4.6, 0.13, 1.18), C9_GUM(-0.4, 5.4, 0.13, 1.18)] },
  /* 17: leap the chocolate river off the wafer ramp, or take the thin bridge, then the gumdrop green */
  { par: 3, sol: [[345, 0.95, 0]], tee: [0, 0.5], cup: [-1.2, 6.9], aim0: 0, shape: rect(-2, 0, 2, 7.5),
    inner: [[[-2, 3], [-0.6, 3], [-0.6, 2]], [[0.6, 2], [0.6, 3], [1.5, 3]]],
    ramps: [{ x0: -0.6, z0: 2, x1: 0.6, z1: 3, axis: 'z', h0: 0, h1: 0.25 }],
    zones: [{ surf: 'water', poly: rect(-2, 3, 1.5, 4.2) }, { surf: 'mud', poly: rect(-1.55, 6.3, -0.85, 6.5) }, { surf: 'mud', poly: rect(-2, 6.3, -1.55, 7.5) },
      { surf: 'mud', poly: rect(-0.85, 6.3, -0.6, 7.5) }],
    posts: [C9_GUM(-0.5, 5.5), C9_GUM(-1.4, 5.4), C9_GUM(0.4, 5.9)] },
  /* 18: the production line: belt up the ramp, gumdrop maze, pipe drop, taffy-guarded cup */
  { par: 5, sol: [], tee: [0, 0.5], cup: [0.6, 10.8], aim0: 0,
    floors: [[[-0.6, 0], [0.6, 0], [0.6, 4.5], [3.4, 4.5], [3.4, 7.5], [-0.6, 7.5]], rect(-0.6, 8.5, 3.4, 11.6)],
    walls: [ring([[-0.6, 0], [0.6, 0], [0.6, 4.5], [3.4, 4.5], [3.4, 7.5], [-0.6, 7.5]]), ring(rect(-0.6, 8.5, 3.4, 11.6))],
    ramps: [{ x0: -0.6, z0: 2, x1: 0.6, z1: 4.5, axis: 'z', h0: 0, h1: 0.45 }],
    tiers: [{ poly: rect(-0.6, 4.5, 3.4, 7.5), h: 0.45 }],
    zones: [C9_BELT(rect(-0.6, 2, 0.6, 4.5), 0, 2.4), { surf: 'mud', poly: rect(-0.6, 10.0, 1.3, 10.3) }, { surf: 'mud', poly: rect(1.3, 10.0, 1.6, 11.6) }],
    posts: [C9_GUM(0.6, 5.3), C9_GUM(1.4, 5.9), C9_GUM(2.3, 5.3), C9_GUM(0.2, 6.6), C9_GUM(1.2, 6.9), C9_GUM(2.2, 6.6)],
    tubes: [C9_PIPE([3.0, 7.1], [3.0, 8.9], 270)] },
] });
