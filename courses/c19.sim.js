/* world 9, course 19: the candy factory's night shift. More intricate than course 9: split lanes,
   belts that hand the ball from deck to deck, candy-cane pipes, candy presses over drops. */
const C19_GUM = (x, z, r = 0.13, e = 1.12) => ({ x, z, r, e, look: 'gumdrop' });
const C19_POP = (x, z, len, w, phase = 0, blades = 1) => ({ kind: 'spin', x, z, len, w, phase, blades, look: 'lollipop' });
const C19_PRESS = (ax, az, bx, bz, len, ang, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'press' });
const C19_BELT = (poly, ax, az, surf) => (surf ? { surf, push: [ax, az], poly } : { push: [ax, az], poly });
const C19_PIPE = (a, b, dir, keep, add) => ({ a, b, dir, keep, add, color: '#ef7d6d' });
const C19_MUD = (x0, z0, x1, z1) => ({ surf: 'mud', poly: rect(x0, z0, x1, z1) });
registerWorld(19, { holes: [
  /* 1: a sideways belt, then up the wafer ramp to the cup terrace */
  { par: 3, sol: [[0,0.75,0]], tee: [0, 0.5], cup: [0.3, 6.3], shape: rect(-0.9, 0, 0.9, 7),
    zones: [C19_BELT(rect(-0.9, 2, 0.9, 3.2), 1.6, 0)],
    ramps: [{ x0: -0.9, z0: 4, x1: 0.9, z1: 5, axis: 'z', h0: 0, h1: 0.2 }],
    tiers: [{ poly: rect(-0.9, 5, 0.9, 7), h: 0.2 }],
    posts: [C19_GUM(-0.3, 5.8)] },
  /* 2: belt deck, candy-cane pipe, taffy green */
  { par: 3, sol: [[6,0.64,0],[60,1,0]], tee: [0, 0.5], cup: [-0.1, 7.1], aim0: 0,
    floors: [[[-0.6, 0], [0.6, 0], [0.6, 2.6], [2.8, 2.6], [2.8, 3.8], [-0.6, 3.8]], rect(-0.6, 4.8, 2.0, 7.8)],
    walls: [ring([[-0.6, 0], [0.6, 0], [0.6, 2.6], [2.8, 2.6], [2.8, 3.8], [-0.6, 3.8]]), ring(rect(-0.6, 4.8, 2.0, 7.8))],
    zones: [C19_BELT(rect(-0.6, 2.6, 2.8, 3.8), 1.4, 0), C19_MUD(-0.6, 6.5, -0.45, 7.8), C19_MUD(0.25, 6.5, 0.6, 7.8)],
    posts: [C19_GUM(0.9, 6.2)],
    tubes: [C19_PIPE([2.3, 3.2], [1.5, 5.3], 330)] },
  /* 3: two lanes: the belt lane races, the felt lane has a lollipop; both meet on the frosting green */
  { par: 3, sol: [[3,0.3,0]], tee: [0, 0.5], cup: [-0.6, 7.2], shape: rect(-1.4, 0, 1.4, 8),
    inner: [[[0, 2], [0, 5.5]]],
    movers: [C19_POP(-0.7, 3.8, 0.45, 1.6, 0, 2)],
    bumps: [{ x: 0.6, z: 6.7, r: 0.45, h: 0.16 }],
    zones: [C19_BELT(rect(0, 2, 1.4, 5.5), 0, 1.2), C19_MUD(-1.4, 6.55, -0.2, 6.7)],
    posts: [C19_GUM(-0.1, 6.2)] },
  /* 4: up to the wafer deck, past the candy press, off the deck edge to the green below */
  { par: 3, sol: [[339.75,1,1]], tee: [0, 0.5], cup: [0.4, 7.2], shape: rect(-1, 0, 1, 8),
    ramps: [{ x0: -1, z0: 1.5, x1: 1, z1: 2.7, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-1, 2.7, 1, 5), h: 0.3 }],
    movers: [C19_PRESS(-0.55, 3.9, 0.55, 3.9, 0.55, 90, 3)],
    zones: [C19_MUD(-0.2, 6.6, 1, 6.75)] },
  /* 5: the chocolate river: two thin wafer bridges, a lollipop over the cup */
  { par: 4, sol: [[349,0.916667,0]], tee: [0, 0.5], cup: [0, 6.9], shape: rect(-1.8, 0, 1.8, 8),
    zones: [C19_BELT(rect(-1.8, 1.6, 1.8, 2.6), -1.0, 0), { surf: 'water', poly: rect(-1.8, 3.2, -1.0, 4.2) }, { surf: 'water', poly: rect(-0.6, 3.2, 1.0, 4.2) }, { surf: 'water', poly: rect(1.4, 3.2, 1.8, 4.2) }],
    movers: [C19_POP(0, 5.6, 0.5, 1.5, 0, 2)],
    posts: [C19_GUM(-1.1, 5.4), C19_GUM(1.2, 5.6)] },
  /* 6: three pads, two candy-cane pipes, a belt on the middle pad */
  { par: 3, sol: [[10,0.833333,0],[4,0.93,0]], tee: [0, 0.5], cup: [0.2, 8.8], aim0: 20,
    floors: [rect(-0.8, 0, 0.8, 2.6), rect(1.4, 3.2, 3.6, 6.0), rect(-0.8, 7, 0.8, 9.4)],
    walls: [ring(rect(-0.8, 0, 0.8, 2.6)), ring(rect(1.4, 3.2, 3.6, 6.0)), ring(rect(-0.8, 7, 0.8, 9.4))],
    zones: [C19_BELT(rect(1.4, 3.2, 3.6, 4.4), 0, 1.0), C19_MUD(-0.8, 8.2, -0.25, 8.35), C19_MUD(0.55, 8.2, 0.8, 9.4)],
    posts: [C19_GUM(2.2, 4.9), C19_GUM(3.0, 4.6)],
    tubes: [C19_PIPE([0.4, 2.1], [1.9, 3.6], 20), C19_PIPE([3.1, 5.5], [-0.4, 7.4], 0)] },
  /* 7: switchback floor: belts fight you through two gaps, a press guards the top row */
  { par: 4, sol: [[48,0.833333,0],[234.25,1,0]], tee: [-1, 0.5], cup: [0.6, 8.3], aim0: 30, shape: rect(-1.5, 0, 1.5, 9),
    inner: [[[-1.5, 2.8], [0.8, 2.8]], [[-0.8, 5.8], [1.5, 5.8]]],
    zones: [C19_BELT(rect(-1.5, 0, 1.5, 2.8), -0.9, 0), C19_BELT(rect(-1.5, 2.8, 1.5, 5.8), 1.2, 0)],
    movers: [C19_PRESS(-0.9, 7.1, 0.9, 7.1, 0.65, 90, 3.2)],
    posts: [C19_GUM(0, 4.3), C19_GUM(-0.9, 1.6)] },
  /* 8: the chocolate falls: a hard-candy causeway straight over, or the pipe round the side */
  { par: 4, crazy: true, sol: [[0,0.65,0]], tee: [0, 0.5], cup: [-0.8, 7.8], shape: rect(-2, 0, 2, 9),
    zones: [{ surf: 'fast', poly: rect(-0.25, 3, 0.25, 5) }, { surf: 'water', poly: rect(-2, 3, 2, 5) }, C19_BELT(rect(-2, 5, 2, 6), -1.0, 0)],
    bumps: [{ x: 0.6, z: 7.6, r: 0.5, h: 0.2 }, { x: -0.8, z: 2.0, r: 0.5, h: 0.15 }],
    posts: [C19_GUM(-1.5, 7.0), C19_GUM(-0.2, 8.2)],
    tubes: [C19_PIPE([1.4, 2.4], [1.4, 5.6], 330)] },
  /* 9: the gobstopper run: a belt up the ramp, a belt across the deck, the pipe bowl, the funnel green */
  { par: 3, auto: true, sol: [[0,0.6,0]], tee: [0, 0.5], cup: [1.5, 7.9], aim0: 0,
    floors: [[[-0.4, 0], [0.4, 0], [0.4, 3.6], [3.4, 3.6], [3.4, 4.4], [-0.4, 4.4]], rect(-0.4, 5.4, 3.4, 9.6)],
    walls: [ring([[-0.4, 0], [0.4, 0], [0.4, 3.6], [3.4, 3.6], [3.4, 4.4], [-0.4, 4.4]]), ring(rect(-0.4, 5.4, 3.4, 9.6))],
    ramps: [{ x0: -0.4, z0: 1, x1: 0.4, z1: 3, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-0.4, 3, 3.4, 4.4), h: 0.3 }],
    zones: [C19_BELT(rect(-0.4, 0.8, 0.4, 3.6), 0, 2.4), C19_BELT(rect(-0.4, 3.6, 2.4, 4.4), 1.6, 0)],
    bumps: [{ x: 2.9, z: 4.0, r: 0.35, h: -0.08 }, { x: 1.5, z: 7.9, r: 0.9, h: -0.25 }],
    tubes: [C19_PIPE([2.9, 4.0], [1.5, 5.8], 0, 0.3, 1.3)] },
  /* 10: up to the hard-candy deck, through the gumdrops, then the pipe or the drop to the taffy green */
  { par: 3, sol: [[9,1,0],[0,0.29,0]], tee: [0, 0.5], cup: [0.4, 8.3], shape: rect(-1.2, 0, 1.2, 9),
    inner: [[[-0.6, 5.4], [1.2, 5.4]]],
    ramps: [{ x0: -1.2, z0: 1.2, x1: 1.2, z1: 2.4, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-1.2, 2.4, 1.2, 5.4), h: 0.3 }],
    zones: [{ surf: 'fast', poly: rect(-1.2, 2.4, 1.2, 5.4) }, C19_MUD(-0.3, 7.6, 1.2, 7.75)],
    posts: [C19_GUM(-0.4, 3.4), C19_GUM(0.35, 3.9), C19_GUM(-0.9, 4.5)],
    tubes: [C19_PIPE([0.7, 4.9], [-0.6, 6.0], 15)] },
  /* 11: a candy press slams across the only gap off the high deck; a belt below drags toward the taffy */
  { par: 3, crazy: true, sol: [[354,0.571429,0]], tee: [0, 0.5], cup: [-0.4, 7.6], shape: rect(-1, 0, 1, 8.5),
    inner: [[[-1, 3.5], [-0.35, 3.5]], [[0.35, 3.5], [1, 3.5]]],
    tiers: [{ poly: rect(-1, 0, 1, 3.5), h: 0.4 }],
    movers: [C19_PRESS(-0.7, 3.3, 0.7, 3.3, 0.35, 90, 2.6)],
    zones: [C19_BELT(rect(-1, 4.6, 1, 5.6), 0.9, 0), C19_MUD(-1, 6.9, -0.7, 8.5), C19_MUD(-0.1, 6.9, 0.25, 8.5)],
    bumps: [{ x: 0.5, z: 7.4, r: 0.4, h: 0.14 }] },
  /* 12: a tilted hard-candy slab, a lollipop and a gumdrop wall */
  { par: 3, sol: [[328,0.79,0]], tee: [0, 0.5], cup: [-0.7, 7.2], shape: rect(-1.5, 0, 1.5, 8),
    tiers: [{ poly: rect(-1.5, 0, 1.5, 8), h: 0.1, sx: 0.035 }],
    zones: [{ surf: 'fast', poly: rect(-1.5, 1.5, 1.5, 6.4) }],
    movers: [C19_POP(0.4, 3.4, 0.5, 1.4, 0, 2)],
    posts: [C19_GUM(-0.9, 5.4), C19_GUM(-0.1, 5.6), C19_GUM(0.8, 5.5), C19_GUM(-0.5, 2.6)] },
  /* 13: over the chocolate on a wafer or a hard-candy bridge, up the half ramp, past the lollipop */
  { par: 3, sol: [[339,0.99,0]], tee: [0, 0.5], cup: [0.6, 8.2], shape: rect(-1.4, 0, 1.4, 9),
    zones: [{ surf: 'fast', poly: rect(0.6, 2.6, 1.0, 3.6) }, { surf: 'water', poly: rect(-0.5, 2.6, 0.6, 3.6) }, { surf: 'water', poly: rect(1.0, 2.6, 1.4, 3.6) },
      { surf: 'water', poly: rect(-1.4, 2.6, -1.2, 3.6) }],
    ramps: [{ x0: -1.4, z0: 4.6, x1: 0, z1: 5.6, axis: 'z', h0: 0, h1: 0.25 }],
    tiers: [{ poly: rect(-1.4, 5.6, 1.4, 9), h: 0.25 }],
    movers: [C19_POP(0.1, 7.0, 0.45, 1.6, 0, 1)] },
  /* 14: a belt up the half ramp, two presses on the deck, then the drop or the pipe to the green */
  { par: 4, crazy: true, sol: [[326,0.888571,0]], tee: [0, 0.5], cup: [0, 9.0], shape: rect(-1.2, 0, 1.2, 10),
    inner: [[[-1.2, 6], [0.2, 6]]],
    ramps: [{ x0: -1.2, z0: 1, x1: -0.2, z1: 3, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-1.2, 3, 1.2, 6), h: 0.3 }],
    zones: [C19_BELT(rect(-1.2, 1, -0.2, 3), 0, 1.6), C19_MUD(-0.6, 8.3, 0.6, 8.45)],
    movers: [C19_PRESS(-0.8, 4.0, 0.8, 4.0, 0.45, 90, 3), C19_PRESS(0.8, 5.0, -0.8, 5.0, 0.45, 90, 2.6)],
    posts: [C19_GUM(0.8, 7.2), C19_GUM(-0.7, 7.6)],
    tubes: [C19_PIPE([-0.7, 5.6], [-0.7, 6.6], 0)] },
  /* 15: frosting hills, a crater, and a gumdrop gate in front of the cup */
  { par: 3, sol: [[320,1,0]], tee: [0, 0.5], cup: [-0.5, 7.0], shape: rect(-1.4, 0, 1.4, 8),
    bumps: [{ x: 0.6, z: 2.6, r: 0.6, h: 0.3 }, { x: -0.7, z: 3.4, r: 0.55, h: 0.28 }, { x: 0.5, z: 4.9, r: 0.5, h: -0.2 }],
    posts: [C19_GUM(-0.9, 6.2), C19_GUM(-0.1, 6.3), C19_GUM(0.6, 6.8)] },
  /* 16: floating wafers: the thin bridge or the pipe to the middle deck, then jump the gap or pipe down */
  { par: 4, crazy: true, sol: [[358.5,0.88,0]], tee: [0, 0.5], cup: [-0.4, 8.9], aim0: 0,
    floors: [rect(-0.7, 0, 0.7, 2.5), rect(-0.2, 2.5, 0.2, 4.5), rect(-1.2, 4.5, 1.2, 6.5), rect(-1.2, 7.0, 1.2, 9.6)],
    walls: [[[-0.2, 2.5], [-0.7, 2.5], [-0.7, 0], [0.7, 0], [0.7, 2.5], [0.2, 2.5]],
      [[0.2, 4.5], [1.2, 4.5], [1.2, 6.5], [0.4, 6.5]], [[-0.2, 4.5], [-1.2, 4.5], [-1.2, 6.5]],
      [[0.4, 7.0], [1.2, 7.0], [1.2, 9.6], [-1.2, 9.6], [-1.2, 7.0]]],
    tiers: [{ poly: rect(-1.2, 0, 1.2, 6.5), h: 0.3 }],
    posts: [C19_GUM(0.6, 8.3)],
    tubes: [C19_PIPE([-0.35, 1.9], [-0.8, 5.0], 0), C19_PIPE([0.85, 6.0], [0.8, 7.5], 340)] },
  /* 17: taffy terraces: two drops through gaps on alternate sides */
  { par: 3, sol: [[27,0.64,0],[294,0.785714,0],[276,0.79,0]], tee: [0, 0.5], cup: [0.6, 8.3], shape: rect(-1.2, 0, 1.2, 9),
    inner: [[[-1.2, 3], [0.4, 3]], [[-0.4, 6], [1.2, 6]]],
    tiers: [{ poly: rect(-1.2, 0, 1.2, 3), h: 0.4 }, { poly: rect(-1.2, 3, 1.2, 6), h: 0.2 }],
    zones: [C19_BELT(rect(-1.2, 3, 1.2, 6), 0.7, 0), C19_MUD(-0.2, 7.6, 1.2, 7.75)],
    posts: [C19_GUM(-0.3, 4.4), C19_GUM(-0.6, 8.0)] },
  /* 18: the production line: a belt up the ramp, a press across the deck, the pipe to the taffy green */
  { par: 5, crazy: true, sol: [[330,0.714286,0],[6,0.57,0]], tee: [0, 0.5], cup: [0.4, 9.8], aim0: 0,
    floors: [[[-0.6, 0], [0.6, 0], [0.6, 4], [3.4, 4], [3.4, 7], [-0.6, 7]], rect(-0.6, 8, 3.4, 10.6)],
    walls: [ring([[-0.6, 0], [0.6, 0], [0.6, 4], [3.4, 4], [3.4, 7], [-0.6, 7]]), ring(rect(-0.6, 8, 3.4, 10.6))],
    ramps: [{ x0: -0.6, z0: 1.5, x1: 0.6, z1: 4, axis: 'z', h0: 0, h1: 0.45 }],
    tiers: [{ poly: rect(-0.6, 4, 3.4, 7), h: 0.45 }],
    zones: [C19_BELT(rect(-0.6, 1.5, 0.6, 4), 0, 2.2), C19_BELT(rect(1.6, 8, 3.4, 9.2), -1.0, 0),
      C19_MUD(-0.1, 9.1, 0.9, 9.25), C19_MUD(-0.6, 9.1, -0.1, 10.6), C19_MUD(0.9, 9.1, 1.05, 10.6)],
    movers: [C19_PRESS(1.5, 4.95, 1.5, 6.05, 0.5, 0, 3)],
    posts: [C19_GUM(2.5, 5.0), C19_GUM(2.6, 6.3), C19_GUM(0.7, 6.2)],
    tubes: [C19_PIPE([3.0, 6.5], [3.0, 8.5], 270)] },
] });
