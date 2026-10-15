/* world 9, candy factory: conveyor belts (push zones), hard-candy fast floors, sticky taffy (mud),
   gumdrop bumpers (posts with e > 1), lollipop spinners, candy-press gates, a chocolate river
   (water), candy-cane pipes (tubes) and frosting hills. Hard: course 9 of 10. */
const C9_GUM = (x, z, r = 0.13, e = 1.12) => ({ x, z, r, e, look: 'gumdrop' });
const C9_POP = (x, z, len, w, phase = 0, blades = 1) => ({ kind: 'spin', x, z, len, w, phase, blades, look: 'lollipop' });
const C9_PRESS = (ax, az, bx, bz, len, ang, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'press' });
const C9_BELT = (poly, ax, az) => ({ push: [ax, az], poly });
const C9_PIPE = (a, b, dir, keep, add) => ({ a, b, dir, keep, add, color: '#ef7d6d' });
registerWorld(9, { holes: [
  /* 1: a sideways belt across the lane, a taffy back stop */
  { par: 3, sol: [[0,0.44,0]], tee: [0, 0.5], cup: [-0.35, 5.0], shape: rect(-0.8, 0, 0.8, 6.4),
    zones: [C9_BELT(rect(-0.8, 2.4, 0.8, 3.6), 1.8, 0), { surf: 'mud', poly: rect(-0.8, 5.6, 0.8, 6.4) }], posts: [C9_GUM(0.15, 4.5)] },
  /* 2: dogleg left, a slow belt nudges round the bend onto hard candy, a gumdrop and a taffy end guard the cup */
  { par: 2, sol: [[22,0.92,0]], tee: [0, 0.5], cup: [3.7, 3.7], aim0: 10, shape: [[-0.7, 0], [0.7, 0], [0.7, 3], [4.6, 3], [4.6, 4.4], [-0.7, 4.4]],
    zones: [C9_BELT(rect(-0.7, 3, 0.7, 4.4), 0.5, 0), { surf: 'fast', poly: rect(0.7, 3, 3.2, 4.4) }, { surf: 'mud', poly: rect(4.1, 3, 4.6, 4.4) }],
    posts: [C9_GUM(-0.25, 3.9), C9_GUM(3.1, 3.75)] },
  /* 3: hard-candy slab through a gumdrop field */
  { par: 3, sol: [[8,0.92,0]], tee: [0, 0.5], cup: [0.6, 6.3], shape: rect(-1.2, 0, 1.2, 7), inner: [[[0, 5.6], [1.2, 5.6]]],
    zones: [{ surf: 'fast', poly: rect(-1.2, 1.4, 1.2, 7) }],
    posts: [C9_GUM(-0.5, 2.6), C9_GUM(0.4, 3.2), C9_GUM(-0.2, 4.1), C9_GUM(0.75, 4.6), C9_GUM(-0.5, 5.3)] },
  /* 4: long green: the frosting fairway, a wide slab tilted toward the chocolate side, a swale and a low ridge to read */
  { par: 2, sol: [[14,1,0]], tee: [0, 0.5], cup: [1.1, 10.2], shape: rect(-2, 0, 2, 11),
    tiers: [{ poly: rect(-2, 0, 2, 11), h: 0.06, sx: 0.022 }],
    bumps: [{ x: -0.6, z: 4.6, r: 1.8, h: -0.1 }, { x: 1.4, z: 7.2, r: 1.4, h: 0.12 }, { x: -1.2, z: 9.4, r: 1.2, h: 0.08 }] },
  /* 5: the lollipop guards the only bridge over the chocolate */
  { par: 4, sol: [[28,0.56,0]], tee: [0, 0.5], cup: [-0.4, 6.2], shape: rect(-1, 0, 1, 7),
    zones: [{ surf: 'water', poly: rect(-1, 3, 0.2, 3.7) }, { surf: 'water', poly: rect(0.65, 3, 1, 3.7) }],
    movers: [C9_POP(0, 4.8, 0.6, 1.6, 0, 2)] },
  /* 6: up the ramp to the wafer deck, down the candy-cane pipe to the taffy green */
  { par: 3, crazy: true, sol: [[330,0.96,0],[12,0.96,0]], tee: [0, 0.5], cup: [1.6, 8.1], aim0: 0,
    floors: [[[-0.6, 0], [0.6, 0], [0.6, 3], [2.4, 3], [2.4, 4.6], [-0.6, 4.6]], rect(-0.6, 5.7, 2.4, 8.7)],
    walls: [ring([[-0.6, 0], [0.6, 0], [0.6, 3], [2.4, 3], [2.4, 4.6], [-0.6, 4.6]]), ring(rect(-0.6, 5.7, 2.4, 8.7))],
    ramps: [{ x0: -0.6, z0: 1.8, x1: 0.6, z1: 3, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-0.6, 3, 2.4, 4.6), h: 0.3 }],
    zones: [{ surf: 'mud', poly: rect(1.25, 7.4, 1.95, 7.6) }, { surf: 'mud', poly: rect(0.95, 7.4, 1.25, 8.7) }, { surf: 'mud', poly: rect(1.95, 7.4, 2.4, 8.7) }],
    posts: [C9_GUM(0.9, 6.9)],
    tubes: [C9_PIPE([1.9, 3.8], [0.0, 6.3], 0)] },
  /* 7: three candy presses slam across the lane, then a taffy sill */
  { par: 3, sol: [[14,0.92,0]], tee: [0, 0.5], cup: [0.3, 9.2], shape: rect(-1, 0, 1, 10),
    movers: [C9_PRESS(-0.55, 3, 0.55, 3, 0.55, 90, 3), C9_PRESS(0.55, 5.2, -0.55, 5.2, 0.55, 90, 3.4), C9_PRESS(-0.55, 7.4, 0.55, 7.4, 0.55, 90, 2.8, 1)],
    bumps: [{ x: -0.45, z: 8.6, r: 0.4, h: 0.12 }],
    zones: [{ surf: 'mud', poly: rect(-0.15, 8.55, 1, 8.75) }] },
  /* 8: the chocolate river: a thin wafer bridge straight on, or the wide bridge the long way */
  { par: 3, sol: [[204,0.96,0]], tee: [0, 0.5], cup: [0.6, 6.2], shape: rect(-2, 0, 2, 7),
    zones: [{ surf: 'water', poly: rect(-1.3, 3, 0.45, 4) }, { surf: 'water', poly: rect(0.8, 3, 2, 4) }],
    posts: [C9_GUM(0.6, 5.4, 0.14)], bumps: [{ x: -1, z: 5.6, r: 0.6, h: 0.18 }] },
  /* 9: off the high deck, a belt runs left to the ramp up to the cup terrace */
  { par: 3, sol: [[136,0.96,0]], tee: [0, 0.5], cup: [0.3, 6.8], aim0: 0,
    shape: [[-0.7, 0], [0.7, 0], [0.7, 2.4], [3.3, 2.4], [3.3, 7.4], [-0.7, 7.4]],
    tiers: [{ poly: rect(-0.7, 0, 0.7, 2.4), h: 0.35 }, { poly: rect(-0.7, 5.4, 3.3, 7.4), h: 0.25 }],
    ramps: [{ x0: 2.1, z0: 4.2, x1: 3.3, z1: 5.4, axis: 'z', h0: 0, h1: 0.25 }],
    zones: [C9_BELT(rect(-0.7, 2.4, 2.1, 4.2), 1.4, 0)],
    posts: [C9_GUM(1.4, 6.4), C9_GUM(0.8, 5.9)] },
  /* 10: long green: up the broad frosting step to a back tier that falls away left, over a low ridge */
  { par: 2, sol: [[6,0.88,0]], tee: [0, 0.5], cup: [-1.0, 11.6], shape: rect(-2.2, 0, 2.2, 13),
    ramps: [{ x0: -2.2, z0: 5.6, x1: 2.2, z1: 7.4, axis: 'z', h0: 0, h1: 0.16 }],
    tiers: [{ poly: rect(-2.2, 7.4, 2.2, 13), h: 0.16, sx: 0.011 }],
    bumps: [{ x: 1.0, z: 3.0, r: 1.6, h: 0.1 }, { x: 0.4, z: 9.4, r: 1.3, h: 0.09 }, { x: -1.6, z: 3.6, r: 1.2, h: -0.08 }] },
  /* 11: belts in a zig-zag factory floor */
  { par: 2, sol: [[57,0.86,0]], tee: [-1, 0.5], cup: [-0.9, 7.2], aim0: 30, shape: rect(-1.5, 0, 1.5, 8),
    inner: [[[-1.5, 2.5], [0.8, 2.5]], [[-0.8, 5], [1.5, 5]]],
    zones: [C9_BELT(rect(-1.5, 0, 1.5, 2.5), -1.2, 0), C9_BELT(rect(-1.5, 2.5, 1.5, 5), -1.6, 0), C9_BELT(rect(-1.5, 5.6, 1.5, 6.6), 1.5, 0)],
    posts: [C9_GUM(0, 3.7)] },
  /* 12: candy-cane pipes link three pads */
  { par: 3, crazy: true, sol: [[32,0.96,0],[6,0.88,0]], tee: [0, 0.5], cup: [0, 8.6], aim0: 20,
    floors: [rect(-0.8, 0, 0.8, 2.6), rect(1.6, 3.4, 3.6, 6.2), rect(-0.8, 7, 0.8, 9.2)],
    walls: [ring(rect(-0.8, 0, 0.8, 2.6)), ring(rect(1.6, 3.4, 3.6, 6.2)), ring(rect(-0.8, 7, 0.8, 9.2))],
    zones: [{ surf: 'fast', poly: rect(1.6, 3.4, 3.6, 6.2) }, { surf: 'mud', poly: rect(-0.8, 8.0, -0.3, 9.2) }, { surf: 'mud', poly: rect(0.3, 8.0, 0.8, 9.2) }, { surf: 'mud', poly: rect(-0.3, 8.0, 0.3, 8.2) }],
    posts: [C9_GUM(2.4, 4.7), C9_GUM(3.0, 5.3)],
    tubes: [C9_PIPE([0.4, 2.1], [2.0, 3.8], 30), C9_PIPE([3.1, 5.7], [-0.45, 7.35], 0)] },
  /* 13: a hard-candy causeway through the chocolate */
  { par: 3, sol: [[1.5,0.42,0]], tee: [0, 0.5], cup: [0.3, 6.4], shape: rect(-1.5, 0, 1.5, 7),
    zones: [{ surf: 'water', poly: rect(-1.5, 1.6, -0.8, 6) }, { surf: 'water', poly: rect(0.8, 1.6, 1.5, 6) }, { surf: 'fast', poly: rect(-0.8, 1.6, 0.8, 6) }],
    posts: [C9_GUM(0.35, 3, 0.12, 1.1), C9_GUM(-0.05, 4.4, 0.12, 1.1), C9_GUM(0.3, 5.5, 0.11, 1.1)] },
  /* 14: up to the lollipop deck, drop into the crater, through the taffy to the cup */
  { par: 3, sol: [[10,0.92,0]], tee: [0, 0.5], cup: [0.7, 8.0], aim0: 0,
    shape: [[-0.7, 0], [0.7, 0], [0.7, 3], [1.2, 3], [1.2, 8.6], [-1.2, 8.6], [-1.2, 3], [-0.7, 3]],
    ramps: [{ x0: -0.7, z0: 1.8, x1: 0.7, z1: 3, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-1.2, 3, 1.2, 5), h: 0.3 }],
    bumps: [{ x: -0.2, z: 6.0, r: 0.55, h: -0.2 }],
    zones: [{ surf: 'mud', poly: rect(0.35, 7.3, 1.2, 7.5) }, { surf: 'mud', poly: rect(0.15, 7.3, 0.35, 8.6) }],
    movers: [C9_POP(0, 4, 0.5, 1.5, 0, 2)] },
  /* 15: lollipop, press, taffy: the packing line */
  { par: 3, sol: [[14,0.76,0]], tee: [0, 0.5], cup: [0.4, 8.3], shape: rect(-1, 0, 1, 9),
    movers: [C9_POP(0, 2.8, 0.55, -1.7, 0.4, 2), C9_PRESS(-0.55, 5.4, 0.55, 5.4, 0.55, 90, 2.6)],
    zones: [{ surf: 'mud', poly: rect(-1, 4.0, -0.1, 4.4) }, { surf: 'mud', poly: rect(0.05, 7.6, 0.75, 7.8) }, { surf: 'mud', poly: rect(-0.15, 7.6, 0.05, 9) },
      { surf: 'mud', poly: rect(0.75, 7.6, 1, 9) }],
    bumps: [{ x: -0.3, z: 7.6, r: 0.4, h: 0.15 }] },
  /* 16: long green: the caramel double green, a dogleg with a deep swale in the elbow and a back-left shelf */
  { par: 3, sol: [[30.5,0.88,0]], tee: [0, 0.5], cup: [-2.9, 11.0], aim0: 0,
    shape: [[-1.4, 0], [1.4, 0], [1.4, 12.4], [-4.2, 12.4], [-4.2, 8.6], [-1.4, 8.6]],
    tiers: [{ poly: [[-1.4, 0], [1.4, 0], [1.4, 12.4], [-4.2, 12.4], [-4.2, 8.6], [-1.4, 8.6]], h: 0.14, sz: -0.004, sx: 0.015 }],
    bumps: [{ x: -0.2, z: 4.4, r: 2.2, h: 0.14 }, { x: 0.2, z: 9.8, r: 1.3, h: -0.14 }, { x: -2.0, z: 11.6, r: 1.0, h: 0.1 }] },
  /* 17: leap the chocolate river off the wafer ramp, or take the thin bridge, then the gumdrop green */
  { par: 3, crazy: true, sol: [[350,0.84,0]], tee: [0, 0.5], cup: [-1.2, 6.9], aim0: 0, shape: rect(-2, 0, 2, 7.5),
    inner: [[[-2, 3], [-0.6, 3], [-0.6, 2]], [[0.6, 2], [0.6, 3], [1.5, 3]]],
    ramps: [{ x0: -0.6, z0: 2, x1: 0.6, z1: 3, axis: 'z', h0: 0, h1: 0.25 }],
    zones: [{ surf: 'water', poly: rect(-2, 3, 1.5, 4.2) }, { surf: 'mud', poly: rect(-1.55, 6.3, -0.85, 6.5) }, { surf: 'mud', poly: rect(-2, 6.3, -1.55, 7.5) },
      { surf: 'mud', poly: rect(-0.85, 6.3, -0.6, 7.5) }],
    posts: [C9_GUM(-0.5, 5.5), C9_GUM(-1.4, 5.4), C9_GUM(0.4, 5.9)] },
  /* 18: the production line: belt up the ramp, gumdrop maze to the pipe, taffy-guarded cup */
  { par: 5, crazy: true, sol: [[12,0.68,0],[48,0.8,0]], tee: [0, 0.5], cup: [0.4, 11.0], aim0: 0,
    floors: [[[-0.6, 0], [0.6, 0], [0.6, 4.5], [3.4, 4.5], [3.4, 7.5], [-0.6, 7.5]], rect(-0.6, 8.5, 3.4, 11.6)],
    walls: [ring([[-0.6, 0], [0.6, 0], [0.6, 4.5], [3.4, 4.5], [3.4, 7.5], [-0.6, 7.5]]), ring(rect(-0.6, 8.5, 3.4, 11.6))],
    ramps: [{ x0: -0.6, z0: 2, x1: 0.6, z1: 4.5, axis: 'z', h0: 0, h1: 0.45 }],
    tiers: [{ poly: rect(-0.6, 4.5, 3.4, 7.5), h: 0.45 }],
    zones: [C9_BELT(rect(-0.6, 2, 0.6, 4.5), 0, 2.4), C9_BELT(rect(-0.6, 8.5, 3.4, 9.5), 1.2, 0),
      { surf: 'mud', poly: rect(0.05, 10.3, 0.75, 10.5) }, { surf: 'mud', poly: rect(-0.6, 10.3, 0.05, 11.6) }, { surf: 'mud', poly: rect(0.75, 10.3, 0.95, 11.6) }],
    posts: [C9_GUM(0.6, 5.3), C9_GUM(1.4, 5.9), C9_GUM(2.4, 5.2), C9_GUM(0.2, 6.6), C9_GUM(1.2, 6.9), C9_GUM(2.3, 6.5)],
    tubes: [C9_PIPE([3.0, 7.1], [3.0, 8.9], 270)] },
] });
