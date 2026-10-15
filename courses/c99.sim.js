/* the bonus nine: a neon stunt park at dusk. Gravity wells, tube roulette, gate gauntlets, ice
   switchbacks, ten-part stunt runs and a Rube Goldberg ride, for players who asked for unhinged. */
/* an arc of points round (cx, cz), from heading a0 to a1 in degrees (0 is +z, 90 is +x) */
const C99_ARC = (cx, cz, r, a0, a1, n = 12) => Array.from({ length: n + 1 }, (_, i) => {
  const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
  return [+(cx + r * Math.sin(a)).toFixed(3), +(cz + r * Math.cos(a)).toFixed(3)];
});
const C99_PEN = (cx, cz, r, n = 24) => C99_ARC(cx, cz, r, 0, 360, n).slice(0, n);
registerWorld(99, { holes: [
  /* 1. gravity well: a huge funnel round the cup, ringed by an event horizon wall open only at the back;
     orbit the well and fall in through the gap */
  { par: 3, sol: [[4,0.8,0]], tee: [0, 0.5], cup: [0, 5.4],
    shape: [[-0.7, 0], [0.7, 0], ...C99_ARC(0, 5.4, 2.5, 163.7, -163.7, 20)],
    drains: [{ x: 0, z: 5.4, r: 2.3, depth: 0.35 }],
    inner: [C99_ARC(0, 5.4, 0.5, 20, 340, 12)] },
  /* 2. tube roulette: five mouths in five bays at the back of the court; four throw you back to the
     start, one (the gold one, second from the left) shoots you up onto the high green */
  { par: 3, sol: [[8,0.48,0],[0,0.24,0]], tee: [0, 0.5], cup: [3.4, 5.3], aim0: 7,
    floors: [rect(-1.6, 0, 1.6, 5), rect(2.4, 1.8, 4.4, 6.2)],
    walls: [ring(rect(-1.6, 0, 1.6, 5)), ring(rect(2.4, 1.8, 4.4, 6.2)),
      [[-0.96, 3.7], [-0.96, 5]], [[-0.32, 3.7], [-0.32, 5]], [[0.32, 3.7], [0.32, 5]], [[0.96, 3.7], [0.96, 5]]],
    tiers: [{ poly: rect(2.3, 1.7, 4.5, 6.3), h: 0.3 }],
    zones: [{ surf: 'sand', poly: rect(-1.6, 1.4, -0.9, 2.6) }],
    bumps: [{ x: 3.4, z: 3.8, r: 0.5, h: 0.08 }],
    tubes: [{ a: [-1.28, 4.6], b: [1.2, 0.5], dir: 0, keep: 0, add: 0.8, color: '#ef7d6d' },
      { a: [-0.64, 4.6], b: [-1.25, 1.0], dir: 0, keep: 0, add: 1.6, color: '#ef7d6d' },
      { a: [0, 4.6], b: [-1.2, 0.4], dir: 30, keep: 0, add: 0.7, color: '#ef7d6d' },
      { a: [0.64, 4.6], b: [3.4, 2.2], dir: 0, keep: 0, add: 1.2, color: '#ffd66e' },
      { a: [1.28, 4.6], b: [0.6, 0.45], dir: 330, keep: 0, add: 1.0, color: '#ef7d6d' }] },
  /* 3. gate gauntlet: a long neon alley of six sliding gates, each on its own beat, then the
     windmill at the end; read the rhythm or bounce home */
  { par: 4, crazy: true, sol: [[354,0.8,0.5]], tee: [0, 0.5], cup: [0.35, 13.2],
    shape: rect(-0.9, 0, 0.9, 14),
    zones: [{ surf: 'fast', poly: rect(-0.9, 2.0, 0.9, 10.2) }],
    bumps: [{ x: 0.35, z: 13.2, r: 0.4, h: -0.06 }],
    movers: [{ kind: 'gate', ax: -0.35, az: 2.6, bx: 0.35, bz: 2.6, len: 0.35, ang: 90, period: 2.2, phase: 0, look: 'gate' },
      { kind: 'gate', ax: 0.35, az: 4.0, bx: -0.35, bz: 4.0, len: 0.35, ang: 90, period: 1.8, phase: 1.5, look: 'gate' },
      { kind: 'gate', ax: -0.35, az: 5.4, bx: 0.35, bz: 5.4, len: 0.35, ang: 90, period: 2.6, phase: 3.0, look: 'gate' },
      { kind: 'gate', ax: 0.35, az: 6.8, bx: -0.35, bz: 6.8, len: 0.35, ang: 90, period: 1.6, phase: 0.7, look: 'gate' },
      { kind: 'gate', ax: -0.35, az: 8.2, bx: 0.35, bz: 8.2, len: 0.35, ang: 90, period: 2.0, phase: 2.2, look: 'gate' },
      { kind: 'gate', ax: 0.35, az: 9.6, bx: -0.35, bz: 9.6, len: 0.35, ang: 90, period: 2.4, phase: 4.0, look: 'gate' },
      { kind: 'spin', x: 0, z: 11.5, len: 0.4, w: 1.6, phase: 0, blades: 2, look: 'windmill' }] },
  /* 4. the ice serpent (long ice): four 10 m lanes of glare ice joined by chamfered hairpins, a
     half-pipe on the way back down and a mogul run on the way back up; the lightest touch
     travels forever, so find the pace that lands you on the felt at the end */
  { par: 5, crazy: true, sol: [[16,1,0],[44,1,0]], tee: [0, 0.6], cup: [3.6, 2.4], aim0: 0,
    shape: rect(-0.6, 0, 4.2, 12),
    inner: [[[0.6, 0], [0.6, 10.6]], [[1.8, 1.4], [1.8, 12]], [[3.0, 0], [3.0, 10.6]],
      [[-0.6, 11.3], [-0.1, 12]], [[1.1, 12], [1.8, 11.3]], [[1.8, 11.3], [2.5, 12]], [[3.5, 12], [4.2, 11.3]],
      [[0.6, 0.7], [1.1, 0]], [[2.5, 0], [3.0, 0.7]]],
    zones: [{ surf: 'ice', poly: rect(-0.6, 1.6, 3.0, 12) }, { surf: 'ice', poly: rect(3.0, 4.2, 4.2, 12) }, { surf: 'ice', poly: rect(0.6, 0, 3.0, 1.6) },
      { surf: 'sand', poly: rect(3.0, 0, 4.2, 0.7) }],
    ramps: [{ x0: 0.6, z0: 2.5, x1: 0.95, z1: 9.5, axis: 'x', h0: 0.15, h1: 0 }, { x0: 1.45, z0: 2.5, x1: 1.8, z1: 9.5, axis: 'x', h0: 0, h1: 0.15 }],
    bumps: [{ x: 2.4, z: 3.5, r: 0.45, h: 0.1 }, { x: 2.4, z: 5.6, r: 0.45, h: 0.1 }, { x: 2.4, z: 7.7, r: 0.45, h: 0.1 }, { x: 3.6, z: 2.4, r: 0.4, h: -0.05 }] },
  /* 5. (auto) the contraption: up the neon ramp into the gold tube, along the high rail and down
     its two cascade drops into the blue tube, round the first whirlwind and down its eye into the
     red tube, boosted up the conveyor, off the kicker over the gap and round and round the big
     whirlwind into the cup. Nine stages, one putt */
  { par: 4, auto: true, sol: [[0, 0.8, 0]], tee: [0, 0.5], cup: [0.2, 10.4], aim0: 0,
    floors: [rect(-0.3, 0, 0.3, 4.0), rect(1.2, 0.7, 5.4, 1.3), C99_PEN(3.2, 5.6, 1.36), rect(-1.3, 4.5, -0.7, 8.6), C99_PEN(0.2, 10.4, 1.64)],
    walls: [ring(rect(-0.3, 0, 0.3, 4.0)), ring([[1.2, 0.7], [2.65, 0.7], [3.95, 0.7], [5.4, 0.7], [5.4, 1.3], [3.95, 1.3], [2.65, 1.3], [1.2, 1.3]]), ring(C99_PEN(3.2, 5.6, 1.36)),
      [[-0.7, 8.5], [-0.7, 4.5], [-1.3, 4.5], [-1.3, 8.5]], C99_ARC(0.2, 10.4, 1.64, 250, 565, 24)],
    tiers: [{ poly: rect(-0.4, 3.4, 0.4, 4.1), h: 0.3 }, { poly: [[1.1, 0.6], [2.6, 0.6], [2.6, 1.4], [1.1, 1.4]], h: 1.0 }, { poly: rect(2.6, 0.6, 4.0, 1.4), h: 0.65 },
      { poly: [[4.0, 0.6], [5.5, 0.6], [5.5, 1.4], [4.0, 1.4]], h: 0.3 }, { poly: C99_PEN(3.2, 5.6, 1.46), h: 0.45 }, { poly: rect(-1.4, 4.4, -0.6, 8.6), h: 0.5 },
      { poly: C99_PEN(0.2, 10.4, 1.74), h: 0.1 }],
    ramps: [{ x0: -0.4, z0: 1.4, x1: 0.4, z1: 3.4, axis: 'z', h0: 0, h1: 0.3 }, { x0: -1.4, z0: 8.2, x1: -0.6, z1: 8.6, axis: 'z', h0: 0.5, h1: 0.62 }],
    zones: [{ surf: 'fast', poly: rect(-0.3, 1.4, 0.3, 3.4) }, { surf: 'fast', poly: rect(1.2, 0.7, 5.4, 1.3) }, { surf: 'fast', push: [0, 1.2], poly: rect(-1.3, 5.2, -0.7, 8.0) }],
    drains: [{ x: 3.2, z: 5.6, r: 1.2, depth: 0.3, flat: 0.14 }, { x: 0.2, z: 10.4, r: 1.5, depth: 0.35 }],
    tubes: [{ a: [0, 3.7], b: [1.5, 1.0], dir: 90, keep: 0, add: 2.5, color: '#ffd66e' },
      { a: [5.1, 1.0], b: [4.33, 5.6], dir: 330, keep: 0, add: 1.8, color: '#6fc0df' },
      { a: [3.2, 5.6], b: [-1.0, 4.85], dir: 0, keep: 0, add: 1.0, color: '#ef7d6d' }] },
  /* 6. stunt run (ten parts): 1 the neon ramp, 2 the windmill deck, 3 the drop, 4 the ice chute,
     5 the crosswind fan, 6 the whirlwind, 7 the red tube out of its eye, 8 the sliding gate,
     9 the kicker over the gap, 10 the crater green with its patrolling puck */
  { par: 5, crazy: true, sol: [[4,0.9,0],[177,0.8,0]], tee: [0, 0.5], cup: [3.3, 4.3], aim0: 0,
    floors: [rect(-0.7, 0, 0.7, 2.0), rect(-0.5, 2.0, 0.5, 3.0), rect(-1.0, 3.0, 1.0, 5.0), rect(-0.5, 5.0, 0.5, 10.1), C99_PEN(0, 11.2, 1.3),
      rect(1.9, 9.6, 4.1, 12.0), rect(2.7, 7.0, 3.3, 9.6), rect(2.0, 3.0, 4.0, 6.4)],
    walls: [[[-0.5, 2.0], [-0.7, 2.0], [-0.7, 0], [0.7, 0], [0.7, 2.0], [0.5, 2.0]], [[-0.5, 2.0], [-0.5, 3.0], [-1.0, 3.0], [-1.0, 5.0], [-0.5, 5.0]],
      [[0.5, 2.0], [0.5, 3.0], [1.0, 3.0], [1.0, 5.0], [0.5, 5.0]], [[-0.5, 5.0], [-0.5, 10.03]], [[0.5, 5.0], [0.5, 10.03]],
      C99_ARC(0, 11.2, 1.3, 202.6, 517.4, 24), [[2.7, 9.6], [1.9, 9.6], [1.9, 12.0], [4.1, 12.0], [4.1, 9.6], [3.3, 9.6]],
      [[2.7, 9.6], [2.7, 7.0]], [[3.3, 9.6], [3.3, 7.0]], [[2.0, 6.4], [2.0, 3.0], [4.0, 3.0], [4.0, 6.4]]],
    tiers: [{ poly: rect(-1.1, 2.95, 1.1, 5.0), h: 0.25 }, { poly: rect(1.9, 2.9, 4.1, 6.4), h: -0.3 }],
    ramps: [{ x0: -0.5, z0: 2.0, x1: 0.5, z1: 3.0, axis: 'z', h0: 0, h1: 0.25 }, { x0: 2.7, z0: 7.0, x1: 3.3, z1: 7.5, axis: 'z', h0: 0.14, h1: 0 }],
    zones: [{ surf: 'ice', poly: rect(-0.5, 5.0, 0.5, 6.5) }, { surf: 'ice', push: [0.9, 0], poly: rect(-0.5, 6.5, 0.5, 8.5) }, { surf: 'ice', poly: rect(-0.5, 8.5, 0.5, 10.1) },
      { surf: 'sand', poly: rect(2.0, 5.4, 2.7, 6.4) }, { surf: 'sand', poly: rect(3.6, 3.0, 4.0, 3.8) }],
    drains: [{ x: 0, z: 11.2, r: 1.2, depth: 0.3, flat: 0.1 }],
    bumps: [{ x: 3.3, z: 4.3, r: 0.45, h: 0.1 }, { x: 3.3, z: 4.3, r: 0.22, h: -0.05 }],
    movers: [{ kind: 'spin', x: -0.35, z: 4.0, len: 0.3, w: 1.8, phase: 0, blades: 2, look: 'windmill' },
      { kind: 'gate', ax: 2.45, az: 9.95, bx: 3.55, bz: 9.95, len: 0.22, ang: 90, period: 2.4, look: 'gate' },
      { kind: 'slide', ax: 2.5, az: 5.0, bx: 3.7, bz: 5.0, r: 0.13, period: 3.2, look: 'puck' }],
    tubes: [{ a: [0, 11.2], b: [3.0, 11.6], dir: 180, keep: 0, add: 0.6, color: '#ef7d6d' }] },
  /* 7. drain maze (ten parts): 1 the chute, 2 the sand strip, 3 the zigzag maze whose three pit
     whirlwinds swallow you back to the start, 4 the gold tube out, 5 the conveyor ramp, 6 the
     windmill deck, 7 the ice bridge with its puck, 8 the drop into the whirlwind, 9 the eye tube,
     10 the crater green in a mud moat */
  { par: 6, crazy: true, sol: [[320,0.8,0],[295,0.55,0],[0,0.15,0],[0,0.7,0]], tee: [0, 0.5], cup: [2.8, 18.4], aim0: 0,
    floors: [rect(-0.6, 0, 0.6, 2.4), rect(-1.5, 2.4, 1.5, 8.4), rect(-0.5, 9.0, 0.5, 11.8), rect(-1.2, 11.8, 1.2, 13.4), rect(-0.3, 13.4, 0.3, 16.3),
      C99_PEN(0, 17.5, 1.3), rect(1.8, 15.6, 3.8, 19.4)],
    walls: [[[-0.6, 2.4], [-0.6, 0], [0.6, 0], [0.6, 2.4]], [[-0.6, 2.4], [-1.5, 2.4], [-1.5, 8.4], [1.5, 8.4], [1.5, 2.4], [0.6, 2.4]],
      [[-1.5, 4.2], [0.9, 4.2]], [[-0.9, 6.2], [1.5, 6.2]],
      [[-0.5, 11.8], [-0.5, 9.0], [0.5, 9.0], [0.5, 11.8]], [[-0.5, 11.8], [-1.2, 11.8], [-1.2, 13.4], [-0.3, 13.4], [-0.3, 16.24]],
      [[0.5, 11.8], [1.2, 11.8], [1.2, 13.4], [0.3, 13.4], [0.3, 16.24]], C99_ARC(0, 17.5, 1.3, 194, 526, 24), ring(rect(1.8, 15.6, 3.8, 19.4))],
    tiers: [{ poly: rect(-0.7, -0.1, 0.7, 1.6), h: 0.3 }, { poly: rect(-1.3, 11.7, 1.3, 13.4), h: 0.3 }, { poly: rect(-0.4, 13.4, 0.4, 16.2), h: 0.3 }],
    ramps: [{ x0: -0.6, z0: 1.6, x1: 0.6, z1: 2.4, axis: 'z', h0: 0.3, h1: 0 }, { x0: -0.6, z0: 9.8, x1: 0.6, z1: 11.8, axis: 'z', h0: 0, h1: 0.3 }],
    zones: [{ surf: 'sand', poly: rect(-1.5, 2.6, 1.5, 3.0) }, { surf: 'fast', push: [0, 1.4], poly: rect(-0.5, 9.8, 0.5, 11.8) },
      { surf: 'ice', poly: rect(-0.3, 13.4, 0.3, 16.2) }, { surf: 'mud', poly: rect(1.8, 16.6, 3.8, 17.6) }, { surf: 'mud', poly: rect(1.8, 19.2, 3.8, 19.4) },
      { surf: 'mud', poly: rect(1.8, 17.6, 2.3, 19.2) }, { surf: 'mud', poly: rect(3.3, 17.6, 3.8, 19.2) }],
    drains: [{ x: -0.85, z: 3.4, r: 0.55, depth: 0.12, flat: 0.1 }, { x: 0.1, z: 5.2, r: 0.6, depth: 0.12, flat: 0.1 }, { x: -0.5, z: 7.4, r: 0.55, depth: 0.12, flat: 0.1 }, { x: 0, z: 17.5, r: 1.2, depth: 0.3, flat: 0.1 }],
    bumps: [{ x: 2.8, z: 18.4, r: 0.35, h: -0.05 }],
    movers: [{ kind: 'spin', x: 0, z: 12.6, len: 0.4, w: 1.7, phase: 0, blades: 2, look: 'windmill' },
      { kind: 'slide', ax: 0, az: 13.9, bx: 0, bz: 15.7, r: 0.1, period: 2.6, look: 'puck' }],
    tubes: [{ a: [-0.85, 3.4], b: [0.35, 0.9], dir: 180, keep: 0, add: 0.4, color: '#ef7d6d' }, { a: [0.1, 5.2], b: [-0.35, 0.9], dir: 180, keep: 0, add: 0.4, color: '#ef7d6d' }, { a: [-0.5, 7.4], b: [0.35, 0.9], dir: 180, keep: 0, add: 0.4, color: '#ef7d6d' },
      { a: [1.0, 7.8], b: [0, 9.4], dir: 0, keep: 0, add: 1.0, color: '#ffd66e' },
      { a: [0, 17.5], b: [2.8, 15.95], dir: 0, keep: 0, add: 1.0, color: '#b6ff2e' }] },
  /* 8. the big air (ten parts): 1 the bumper slalom, 2 the first ramp, 3 the puck deck, 4 the
     crosswind ramp, 5 the gate, 6 the kicker, 7 the jump over the gap, 8 the ice funnel, 9 the
     tube, 10 the whirlwind with the cup in its eye */
  { par: 5, crazy: true, sol: [[356,1,1],[54,0.84,0]], tee: [0, 0.5], cup: [3.6, 12.5], aim0: 0,
    floors: [rect(-1.2, 0, 1.2, 4.0), rect(-0.4, 4.0, 0.4, 5.2), rect(-1.2, 5.2, 1.2, 7.4), rect(-0.4, 7.4, 0.4, 8.8), rect(-1.4, 8.8, 1.4, 10.4),
      rect(-1.6, 11.1, 1.6, 14.4), C99_PEN(3.6, 12.5, 1.5)],
    walls: [[[-0.4, 4.0], [-1.2, 4.0], [-1.2, 0], [1.2, 0], [1.2, 4.0], [0.4, 4.0]], [[-0.4, 4.0], [-0.4, 5.2], [-1.2, 5.2], [-1.2, 7.4], [-0.4, 7.4], [-0.4, 8.8], [-1.4, 8.8], [-1.4, 10.4], [-0.4, 10.4]],
      [[0.4, 4.0], [0.4, 5.2], [1.2, 5.2], [1.2, 7.4], [0.4, 7.4], [0.4, 8.8], [1.4, 8.8], [1.4, 10.4], [0.4, 10.4]],
      [[-1.6, 11.1], [-1.6, 14.4], [1.6, 14.4], [1.6, 11.1]], [[-1.6, 12.9], [-0.35, 14.4]], [[1.6, 12.9], [0.35, 14.4]], ring(C99_PEN(3.6, 12.5, 1.5))],
    tiers: [{ poly: rect(-0.5, 7.3, 0.5, 8.8), h: 0.3 }, { poly: rect(-1.3, 5.1, 1.3, 7.4), h: 0.3 }, { poly: rect(-1.5, 8.7, 1.5, 10.5), h: 0.6 }, { poly: rect(-1.7, 11.1, 1.7, 14.5), h: 0.1 }, { poly: C99_PEN(3.6, 12.5, 1.6), h: 0 }],
    ramps: [{ x0: -0.4, z0: 4.0, x1: 0.4, z1: 5.2, axis: 'z', h0: 0, h1: 0.3 }, { x0: -0.4, z0: 7.4, x1: 0.4, z1: 8.8, axis: 'z', h0: 0.3, h1: 0.6 },
      { x0: -0.4, z0: 10.0, x1: 0.4, z1: 10.4, axis: 'z', h0: 0.6, h1: 0.7 }],
    zones: [{ surf: 'fast', poly: rect(-1.2, 0.9, 1.2, 4.0) }, { push: [0.8, 0], poly: rect(-0.4, 7.6, 0.4, 8.6) }, { surf: 'ice', poly: rect(-1.6, 11.1, 1.6, 14.4) }],
    posts: [{ x: -0.5, z: 2.0, r: 0.12, e: 1.25, look: 'bumper' }, { x: 0.5, z: 2.0, r: 0.12, e: 1.25, look: 'bumper' }, { x: 0, z: 2.9, r: 0.12, e: 1.25, look: 'bumper' }],
    drains: [{ x: 3.6, z: 12.5, r: 1.4, depth: 0.35 }],
    movers: [{ kind: 'slide', ax: -0.8, az: 6.3, bx: 0.8, bz: 6.3, r: 0.13, period: 2.8, look: 'puck' },
      { kind: 'gate', ax: -0.7, az: 9.5, bx: 0.7, bz: 9.5, len: 0.3, ang: 90, period: 2.6, look: 'gate' }],
    tubes: [{ a: [0, 14.05], b: [4.85, 12.5], dir: 180, keep: 0, add: 2.0, color: '#b6ff2e' }] },
  /* 9. the ice odyssey (long ice): a 60 m spiral of glare ice wound eight times round the felt
     island in the middle; a half-pipe up the first straight, a kicker jump along the top, moguls
     down the far side, banked hairpins and chamfered corners all the way in. Every touch on the
     ice travels for ever, so play it in stages and let the walls turn you */
  { par: 6, crazy: true, sol: [[356,1,0],[168,0.95,0],[212,0.95,0]], tee: [0, 0.6], cup: [4.4, 5.2], aim0: 0,
    shape: rect(-0.7, 0, 9.1, 9.8),
    inner: [[[0.7, 0], [0.7, 8.4], [7.7, 8.4], [7.7, 1.4], [2.1, 1.4], [2.1, 7.0], [6.3, 7.0], [6.3, 2.8], [3.5, 2.8]],
      [[-0.7, 9.1], [0, 9.8]], [[8.4, 9.8], [9.1, 9.1]], [[9.1, 0.7], [8.4, 0]], [[1.4, 0], [0.7, 0.7]],
      [[0.7, 7.7], [1.4, 8.4]], [[7.0, 8.4], [7.7, 7.7]], [[7.7, 2.1], [7.0, 1.4]], [[2.8, 1.4], [2.1, 2.1]]],
    zones: [{ surf: 'sand', poly: rect(-0.7, 0, 0.7, 0.2) }, { surf: 'sand', poly: rect(2.1, 6.4, 6.3, 7.0) }, { surf: 'ice', poly: rect(-0.7, 1.3, 0.7, 9.8) },
      { surf: 'ice', poly: rect(0.7, 0, 9.1, 2.8) }, { surf: 'ice', poly: rect(0.7, 7.0, 9.1, 9.8) }, { surf: 'ice', poly: rect(0.7, 2.8, 2.1, 7.0) }, { surf: 'ice', poly: rect(6.3, 2.8, 9.1, 7.0) }],
    ramps: [{ x0: -0.7, z0: 2.4, x1: -0.3, z1: 6.6, axis: 'x', h0: 0.14, h1: 0 }, { x0: 0.3, z0: 2.4, x1: 0.7, z1: 6.6, axis: 'x', h0: 0, h1: 0.14 },
      { x0: 3.4, z0: 8.4, x1: 3.9, z1: 9.8, axis: 'x', h0: 0, h1: 0.1 }],
    bumps: [{ x: -0.7, z: 9.8, r: 0.8, h: 0.25 }, { x: 9.1, z: 9.8, r: 0.8, h: 0.25 }, { x: 9.1, z: 0, r: 0.8, h: 0.25 }, { x: 7.7, z: 8.4, r: 0.7, h: 0.2 },
      { x: 8.4, z: 6.4, r: 0.45, h: 0.08 }, { x: 8.4, z: 4.9, r: 0.45, h: 0.08 }, { x: 8.4, z: 3.4, r: 0.45, h: 0.08 },
      { x: 4.4, z: 5.2, r: 0.45, h: -0.05 }, { x: 4.2, z: 4.2, r: 1.0, h: 0.06 }] },
] });
