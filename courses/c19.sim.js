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
  { par: 3, sol: [[0,1,0]], tee: [0, 0.5], cup: [0.3, 6.3], shape: rect(-0.9, 0, 0.9, 7),
    zones: [C19_BELT(rect(-0.9, 2, 0.9, 3.2), 1.6, 0)],
    ramps: [{ x0: -0.9, z0: 4, x1: 0.9, z1: 5, axis: 'z', h0: 0, h1: 0.2 }],
    tiers: [{ poly: rect(-0.9, 5, 0.9, 7), h: 0.2 }],
    posts: [C19_GUM(-0.3, 5.8)] },
  /* 2: belt deck, candy-cane pipe, taffy green */
  { par: 3, sol: [[39,0.9,0],[54,1,0]], tee: [0, 0.5], cup: [-0.1, 7.1], aim0: 0,
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
  { par: 3, sol: [[339,1,0]], tee: [0, 0.5], cup: [0.4, 7.2], shape: rect(-1, 0, 1, 8),
    ramps: [{ x0: -1, z0: 1.5, x1: 1, z1: 2.7, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-1, 2.7, 1, 5), h: 0.3 }],
    movers: [C19_PRESS(-0.55, 3.9, 0.55, 3.9, 0.55, 90, 3)],
    zones: [C19_MUD(-0.2, 6.6, 1, 6.75)] },
  /* 5: the chocolate river: two thin wafer bridges, a lollipop over the cup */
  { par: 4, sol: [[348,0.89,0]], tee: [0, 0.5], cup: [0, 6.9], shape: rect(-1.8, 0, 1.8, 8),
    zones: [C19_BELT(rect(-1.8, 1.6, 1.8, 2.6), -1.0, 0), { surf: 'water', poly: rect(-1.8, 3.2, -1.0, 4.2) }, { surf: 'water', poly: rect(-0.6, 3.2, 1.0, 4.2) }, { surf: 'water', poly: rect(1.4, 3.2, 1.8, 4.2) }],
    movers: [C19_POP(0, 5.6, 0.5, 1.5, 0, 2)],
    posts: [C19_GUM(-1.1, 5.4), C19_GUM(1.2, 5.6)] },
  /* 6: three pads, two candy-cane pipes, a belt on the middle pad */
  { par: 3, sol: [], tee: [0, 0.5], cup: [0.2, 8.8], aim0: 20,
    floors: [rect(-0.8, 0, 0.8, 2.6), rect(1.4, 3.2, 3.6, 6.0), rect(-0.8, 7, 0.8, 9.4)],
    walls: [ring(rect(-0.8, 0, 0.8, 2.6)), ring(rect(1.4, 3.2, 3.6, 6.0)), ring(rect(-0.8, 7, 0.8, 9.4))],
    zones: [C19_BELT(rect(1.4, 3.2, 3.6, 4.4), 0, 1.0), C19_MUD(-0.8, 8.2, -0.25, 8.35), C19_MUD(0.55, 8.2, 0.8, 9.4)],
    posts: [C19_GUM(2.2, 4.9), C19_GUM(3.0, 4.6)],
    tubes: [C19_PIPE([0.4, 2.1], [1.9, 3.6], 20), C19_PIPE([3.1, 5.5], [-0.4, 7.4], 0)] },
  /* 7: switchback floor: belts fight you through two gaps, a press guards the top row */
  { par: 4, sol: [], tee: [-1, 0.5], cup: [0.6, 8.3], aim0: 30, shape: rect(-1.5, 0, 1.5, 9),
    inner: [[[-1.5, 2.8], [0.8, 2.8]], [[-0.8, 5.8], [1.5, 5.8]]],
    zones: [C19_BELT(rect(-1.5, 0, 1.5, 2.8), -0.9, 0), C19_BELT(rect(-1.5, 2.8, 1.5, 5.8), 1.2, 0)],
    movers: [C19_PRESS(-0.9, 7.1, 0.9, 7.1, 0.65, 90, 3.2)],
    posts: [C19_GUM(0, 4.3), C19_GUM(-0.9, 1.6)] },
  /* 8: the chocolate falls: a hard-candy causeway straight over, or the pipe round the side */
  { par: 4, crazy: true, sol: [], tee: [0, 0.5], cup: [-0.8, 7.8], shape: rect(-2, 0, 2, 9),
    zones: [{ surf: 'fast', poly: rect(-0.25, 3, 0.25, 5) }, { surf: 'water', poly: rect(-2, 3, 2, 5) }, C19_BELT(rect(-2, 5, 2, 6), -1.0, 0)],
    bumps: [{ x: 0.6, z: 7.6, r: 0.5, h: 0.2 }, { x: -0.8, z: 2.0, r: 0.5, h: 0.15 }],
    posts: [C19_GUM(-1.5, 7.0), C19_GUM(-0.2, 8.2)],
    tubes: [C19_PIPE([1.4, 2.4], [1.4, 5.6], 330)] },
  /* 9: the gobstopper run: a belt up the ramp, a belt across the deck, the pipe bowl, the funnel green */
  { par: 3, auto: true, sol: [], tee: [0, 0.5], cup: [1.5, 7.9], aim0: 0,
    floors: [[[-0.4, 0], [0.4, 0], [0.4, 3.6], [3.4, 3.6], [3.4, 4.4], [-0.4, 4.4]], rect(-0.4, 5.4, 3.4, 9.6)],
    walls: [ring([[-0.4, 0], [0.4, 0], [0.4, 3.6], [3.4, 3.6], [3.4, 4.4], [-0.4, 4.4]]), ring(rect(-0.4, 5.4, 3.4, 9.6))],
    ramps: [{ x0: -0.4, z0: 1, x1: 0.4, z1: 3, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-0.4, 3, 3.4, 4.4), h: 0.3 }],
    zones: [C19_BELT(rect(-0.4, 0.8, 0.4, 3.6), 0, 2.4), C19_BELT(rect(-0.4, 3.6, 2.4, 4.4), 1.6, 0)],
    bumps: [{ x: 2.9, z: 4.0, r: 0.35, h: -0.08 }, { x: 1.5, z: 7.9, r: 0.9, h: -0.25 }],
    tubes: [C19_PIPE([2.9, 4.0], [1.5, 5.8], 0, 0.3, 1.3)] },
] });
