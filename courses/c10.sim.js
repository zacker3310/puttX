/* world 10, sky kingdom (the finale): floating islands at different heights joined by ramps,
   rainbow bridges and jumps (falling off is out of bounds), wind fans, cloud-ice, windmills,
   gates, teleport tubes, crater cups on hilltops and tilted greens. */
/* a tier poly padded past its island's edge, so walls on that edge stand on the island's height both sides */
const C10_PAD = (x0, z0, x1, z1) => rect(x0 - 0.1, z0 - 0.1, x1 + 0.1, z1 + 0.1);
/* a round pen of n wall corners (a sky whirlwind's rim), and an arc of points from heading a0 to a1 (degrees, 0 is +z) */
const C10_PEN = (cx, cz, r, n = 24) => Array.from({ length: n }, (_, i) => [+(cx + r * Math.sin(i * 2 * Math.PI / n)).toFixed(3), +(cz + r * Math.cos(i * 2 * Math.PI / n)).toFixed(3)]);
const C10_ARC = (cx, cz, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [+(cx + r * Math.sin(a)).toFixed(3), +(cz + r * Math.cos(a)).toFixed(3)]; });
registerWorld(10, { holes: [
  /* 1. sky steps: a narrow ramp bridge up to the cup island; overcook it and you fly off the back */
  { par: 2, sol: [[2,0.76,0]], tee: [0, 0.6], cup: [0.55, 5.4],
    floors: [rect(-0.8, 0, 0.8, 2.4), rect(-0.3, 2.4, 0.3, 3.6), rect(-1.2, 3.6, 1.2, 6.4)],
    walls: [[[-0.3, 2.4], [-0.8, 2.4], [-0.8, 0], [0.8, 0], [0.8, 2.4], [0.3, 2.4]]],
    ramps: [{ x0: -0.3, z0: 2.4, x1: 0.3, z1: 3.6, axis: 'z', h0: 0, h1: 0.3 }],
    tiers: [{ poly: rect(-1.2, 3.6, 1.2, 6.4), h: 0.3 }],
    bumps: [{ x: 0.55, z: 5.4, r: 0.4, h: -0.05 }, { x: 0.1, z: 4.6, r: 0.4, h: 0.1 }] },
  /* 2. rainbow fan: a narrow fast bridge with a crosswind fan; aim into the wind */
  { par: 3, sol: [[10,0.64,0],[40,0.4,0]], tee: [0, 0.6], cup: [-0.4, 6.6],
    floors: [rect(-0.7, 0, 0.7, 1.6), rect(-0.25, 1.6, 0.25, 5.2), rect(-1, 5.2, 1, 7.4)],
    walls: [[[-0.25, 1.6], [-0.7, 1.6], [-0.7, 0], [0.7, 0], [0.7, 1.6], [0.25, 1.6]], [[1, 6.2], [1, 7.4], [-1, 7.4], [-1, 6.6]]],
    zones: [{ surf: 'fast', push: [1.4, 0], poly: rect(-0.25, 2.6, 0.25, 4.2) }, { surf: 'fast', poly: rect(-0.25, 1.6, 0.25, 2.6) }, { surf: 'fast', poly: rect(-0.25, 4.2, 0.25, 5.2) }] },
  /* 3. sky jump: a kicker off the high tee island over the gap, or the long rainbow round the side */
  { par: 2, sol: [[10.25,0.91,0]], tee: [0, 0.6], cup: [-0.45, 6.75], inner: [[[-0.9, 5.7], [0.15, 5.7]]],
    floors: [rect(-0.7, 0, 0.7, 2.6), rect(-0.9, 3.6, 0.9, 7.4), [[0.7, 0.9], [1.6, 0.9], [1.6, 5], [0.9, 5], [0.9, 4.4], [1.1, 4.4], [1.1, 1.5], [0.7, 1.5]]],
    walls: [[[-0.7, 2.6], [-0.7, 0], [0.7, 0], [0.7, 0.9], [1.6, 0.9], [1.6, 5], [0.9, 5]], [[0.7, 1.5], [0.7, 2.6]], [[-0.9, 3.6], [-0.9, 7.4], [0.9, 7.4], [0.9, 5]]],
    tiers: [{ poly: rect(-0.7, 0, 0.7, 2.6), h: 0.3 }, { poly: [[0.7, 0.9], [1.6, 0.9], [1.6, 5], [1.1, 5], [1.1, 1.5], [0.7, 1.5]], h: 0.3 }],
    ramps: [{ x0: -0.7, z0: 2.1, x1: 0.7, z1: 2.6, axis: 'z', h0: 0.3, h1: 0.42 }, { x0: 1.1, z0: 3.4, x1: 1.6, z1: 5, axis: 'z', h0: 0.3, h1: 0 }],
    zones: [{ surf: 'fast', poly: [[1.1, 1.5], [1.6, 1.5], [1.6, 3.4], [1.1, 3.4]] }],
    bumps: [{ x: -0.45, z: 6.75, r: 0.6, h: 0.16 }, { x: -0.45, z: 6.75, r: 0.26, h: -0.07 }] },
  /* 4. cloud meadow (long green): a 12 m sky green with a false front, a swale on the left and a
     ridge on the right; lag it up the slope and read the drift toward the cup on the back shelf */
  { par: 3, sol: [[6,0.96,0]], tee: [0, 0.6], cup: [-0.9, 10.6], aim0: 0,
    shape: [[-0.8, 0], [0.8, 0], [1.6, 1.5], [2.4, 4], [2.6, 7], [2.2, 10], [1.4, 12.4], [-0.6, 12.8], [-2, 11.2], [-2.4, 8], [-2.2, 4.5], [-1.6, 1.5]],
    tiers: [{ poly: rect(-3, -1, 3, 14), h: 0, sx: 0.012, sz: 0.03 }, { poly: rect(-3, 5.5, 3, 14), h: 0.143, sx: 0.012, sz: 0.004 }],
    bumps: [{ x: 1.2, z: 8, r: 1.6, h: 0.12 }, { x: -1, z: 3.5, r: 1.5, h: -0.08 }, { x: 1.4, z: 2.5, r: 1.2, h: 0.08 }] },
  /* 5. windmill neck: a cloud windmill guards a bare neck, then a sliding gate guards the cup */
  { par: 3, sol: [[324,0.68,2],[10,0.6,0]], tee: [0, 0.6], cup: [0, 5.9], aim0: 0,
    floors: [rect(-0.8, 0, 0.8, 2.5), rect(-0.35, 2.5, 0.35, 3.7), rect(-1.2, 3.7, 1.2, 6.6)],
    walls: [[[-0.35, 2.5], [-0.8, 2.5], [-0.8, 0], [0.8, 0], [0.8, 2.5], [0.35, 2.5]], [[-1.2, 6.6], [1.2, 6.6]]],
    movers: [{ kind: 'spin', x: 0, z: 3.1, len: 0.32, w: 1.6, phase: 0, blades: 2, look: 'windmill' },
      { kind: 'gate', ax: -0.7, az: 5.0, bx: 0.7, bz: 5.0, len: 0.35, ang: 90, period: 3.2, look: 'gate' }] },
  /* 6. tube isles: the safe tube to the high island and down its ramp, or the bare rainbow straight
     across; the tilted cup green drains toward an open edge */
  { par: 2, sol: [[10,1,0]], tee: [0, 0.6], cup: [1.5, 7.4],
    floors: [rect(-0.8, 0, 0.8, 2.2), rect(-0.2, 2.2, 0.2, 5.4), rect(1.8, 2.4, 3.4, 5.4), rect(-1.2, 5.4, 3.4, 8)],
    walls: [[[-0.2, 2.2], [-0.8, 2.2], [-0.8, 0], [0.8, 0], [0.8, 2.2], [0.2, 2.2]],
      [[1.8, 4.8], [1.8, 2.4], [3.4, 2.4], [3.4, 4.8]], [[-1.2, 7.4], [-1.2, 8], [3.4, 8], [3.4, 5.4]]],
    tiers: [{ poly: rect(1.8, 2.4, 3.4, 5.4), h: 0.35 }, { poly: rect(-1.2, 5.4, 3.4, 8), h: 0, sx: 0.05 }],
    ramps: [{ x0: 1.8, z0: 4.6, x1: 3.4, z1: 5.4, axis: 'z', h0: 0.35, h1: 0.2 }],
    zones: [{ surf: 'fast', poly: rect(-0.2, 2.2, 0.2, 5.4) }],
    tubes: [{ a: [0.45, 1.7], b: [2.6, 2.9], dir: 0 }] },
  /* 7. gale steps: two ramp bridges up two islands while a fan blows across the middle one */
  { par: 3, sol: [[178,0.8,0],[24,1,0]], tee: [-0.2, 0.6], cup: [0.6, 7.6],
    floors: [rect(-0.8, 0, 0.8, 2), rect(-0.6, 2, 0, 3), rect(-1.4, 3, 1.4, 5), rect(0.6, 5, 1.2, 6), rect(-1, 6, 1.4, 8.4)],
    walls: [[[-0.6, 2], [-0.8, 2], [-0.8, 0], [0.8, 0], [0.8, 2], [0, 2]], [[-1, 6.6], [-1, 8.4], [1.4, 8.4], [1.4, 6.8]]],
    ramps: [{ x0: -0.6, z0: 2, x1: 0, z1: 3, axis: 'z', h0: 0, h1: 0.25 }, { x0: 0.6, z0: 5, x1: 1.2, z1: 6, axis: 'z', h0: 0.25, h1: 0.5 }],
    tiers: [{ poly: C10_PAD(-1.4, 3, 1.4, 5), h: 0.25 }, { poly: C10_PAD(-1, 6, 1.4, 8.4), h: 0.5 }],
    zones: [{ push: [-1.5, 0], poly: rect(-1.4, 3.4, 1.4, 4.7) }],
    bumps: [{ x: -0.2, z: 7.1, r: 0.45, h: 0.12 }] },
  /* 8. rainbow terrace (long green): a 9 m kidney green in two tiers joined by a broad bank; the
     whole green leans right, a swale waits at the front and a low hump guards the top tier */
  { par: 2, sol: [[0,1,0]], tee: [0, 0.6], cup: [0.8, 8.4],
    shape: [[-1, 0], [1, 0], [1.8, 2], [2, 5], [2.2, 8], [1.5, 9.6], [0, 9.9], [-1.6, 9.2], [-2, 6.5], [-1.4, 4.5], [-1.8, 2]],
    tiers: [{ poly: rect(-3, -1, 3, 4), h: 0, sx: -0.015 }, { poly: rect(-3, 4, 3, 5.5), h: -0.32, sx: -0.015, sz: 0.08 }, { poly: rect(-3, 5.5, 3, 11), h: 0.175, sx: -0.015, sz: -0.01 }],
    bumps: [{ x: 1.1, z: 2.2, r: 1.1, h: -0.07 }, { x: -0.9, z: 7.6, r: 1.3, h: 0.1 }] },
  /* 9. twin tubes: the walled high tee has no way out but two tubes; gold lands by the windmill
     on the cup island, blue on a side island with a ramp bridge down */
  { crazy: true, par: 3, sol: [[222,0.85,0],[15,0.95,0]], tee: [0, 0.5], cup: [-0.4, 6.4], aim0: 20,
    floors: [rect(-1, 0, 1, 1.8), rect(-1.2, 3.6, 1.2, 7.2), rect(-3.2, 1, -1.8, 5), rect(-1.8, 4.1, -1.2, 4.8)],
    walls: [ring(rect(-1, 0, 1, 1.8)), [[-1.8, 4.1], [-1.8, 1], [-3.2, 1], [-3.2, 5], [-1.8, 5], [-1.8, 4.8]], [[-1.2, 6.2], [-1.2, 7.2], [1.2, 7.2], [1.2, 6.4]]],
    tiers: [{ poly: C10_PAD(-1, 0, 1, 1.8), h: 0.4 }, { poly: C10_PAD(-3.2, 1, -1.8, 5), h: 0.25 }],
    ramps: [{ x0: -1.8, z0: 4.1, x1: -1.2, z1: 4.8, axis: 'x', h0: 0.25, h1: 0 }],
    bumps: [{ x: -0.4, z: 6.4, r: 0.6, h: 0.18 }, { x: -0.4, z: 6.4, r: 0.24, h: -0.07 }],
    movers: [{ kind: 'spin', x: 0.55, z: 5.0, len: 0.34, w: -1.7, phase: 0.3, blades: 2, look: 'windmill' }],
    tubes: [{ a: [0.55, 1.3], b: [0.7, 3.95], dir: 0, color: '#ffd66e' }, { a: [-0.55, 1.3], b: [-2.5, 1.4], dir: 0, color: '#6fc0df' }] },
  /* 10. crown crater: the cup in a crater on top of a big hill, ringed by cloud-ice that slides you off */
  { par: 3, sol: [[0,0.9,0]], tee: [0, 0.6], cup: [0, 6],
    floors: [rect(-0.7, 0, 0.7, 2), rect(-0.3, 2, 0.3, 3.4), ring([[-1.6, 3.4], [1.6, 3.4], [2.1, 4.6], [2.1, 7.4], [1.6, 8.4], [-1.6, 8.4], [-2.1, 7.4], [-2.1, 4.6]]).slice(0, 8)],
    walls: [[[-0.3, 2], [-0.7, 2], [-0.7, 0], [0.7, 0], [0.7, 2], [0.3, 2]], [[-1.6, 8.4], [1.6, 8.4]]],
    ramps: [{ x0: -0.3, z0: 2, x1: 0.3, z1: 3.4, axis: 'z', h0: 0.2, h1: 0 }],
    tiers: [{ poly: rect(-0.8, -0.1, 0.8, 2), h: 0.2 }],
    zones: [{ surf: 'ice', poly: rect(-2.1, 3.4, 2.1, 5.1) }, { surf: 'ice', poly: rect(-2.1, 6.9, 2.1, 8.4) }, { surf: 'ice', poly: rect(-2.1, 5.1, -0.9, 6.9) }, { surf: 'ice', poly: rect(0.9, 5.1, 2.1, 6.9) }],
    bumps: [{ x: 0, z: 6, r: 1.1, h: 0.35 }, { x: 0, z: 6, r: 0.32, h: -0.07 }] },
  /* 11. gatehouse: a golden gate sweeps the bare bridge, a tilted court drains to the tube, and
     cloud bumpers guard the cup on the high keep (or climb the side ramp) */
  { par: 4, sol: [[357,0.7,0],[15,0.5,0]], tee: [0, 0.6], cup: [0.55, 8.4],
    floors: [rect(-0.7, 0, 0.7, 2.2), rect(-0.3, 2.2, 0.3, 4.2), rect(-1.4, 4.2, 1.4, 6), rect(0.6, 6, 1.1, 7), rect(-1, 7, 1.2, 9)],
    walls: [[[-0.3, 2.2], [-0.7, 2.2], [-0.7, 0], [0.7, 0], [0.7, 2.2], [0.3, 2.2]], [[0.6, 6], [-1.4, 6], [-1.4, 4.2], [-0.3, 4.2]],
      [[-1, 8.2], [-1, 9], [1.2, 9], [1.2, 7.8]]],
    tiers: [{ poly: rect(-1.4, 4.2, 1.4, 6), h: 0.1, sx: 0.06 }, { poly: C10_PAD(-1, 7, 1.2, 9), h: 0.4 }],
    ramps: [{ x0: -0.3, z0: 3.6, x1: 0.3, z1: 4.2, axis: 'z', h0: 0, h1: 0.12 }, { x0: 0.6, z0: 6, x1: 1.1, z1: 7, axis: 'z', h0: 0.15, h1: 0.4 }],
    posts: [{ x: 0.1, z: 8.2, r: 0.13, look: 'cloud' }, { x: 0.85, z: 7.85, r: 0.13, look: 'cloud' }],
    movers: [{ kind: 'gate', ax: -0.62, az: 3.2, bx: 0.62, bz: 3.2, len: 0.3, ang: 90, period: 2.6, look: 'gate' }],
    tubes: [{ a: [-0.95, 5.5], b: [-0.4, 7.35], dir: 0 }] },
  /* 12. cloud hopper: four islands stepping down over gaps; too soft and you drop between them */
  { par: 2, sol: [[356,1,0],[0,0.28,0]], tee: [0, 0.6], cup: [0.65, 8.05],
    floors: [rect(-0.7, 0, 0.7, 2), rect(-0.9, 2.3, 0.9, 4), rect(-0.9, 4.3, 0.9, 6), rect(-1.2, 6.3, 1.2, 8.6)],
    walls: [[[-0.7, 2], [-0.7, 0], [0.7, 0], [0.7, 2]], [[-1.2, 7.6], [-1.2, 8.6], [1.2, 8.6], [1.2, 7.3], [0, 7.3]]],
    tiers: [{ poly: C10_PAD(-0.7, 0, 0.7, 2), h: 0.6 }, { poly: rect(-0.9, 2.3, 0.9, 4), h: 0.4 }, { poly: rect(-0.9, 4.3, 0.9, 6), h: 0.2 }],
    zones: [{ push: [1.3, 0], poly: rect(-0.9, 4.3, 0.9, 6) }],
    bumps: [{ x: 0.3, z: 3.1, r: 0.35, h: 0.08 }, { x: 0.65, z: 8.05, r: 0.3, h: -0.05 }] },
  /* 13. thunder run: up a diagonal rainbow into a headwind, past a windmill on the high island,
     then off the kicker down onto a tilted crater green */
  { crazy: true, par: 4, sol: [[212,0.92,0],[158,0.96,0],[260,0.96,0]], tee: [0, 0.6], cup: [0.3, 8.6], aim0: 30,
    floors: [rect(-0.8, 0, 0.8, 2), [[-0.25, 2], [0.25, 2], [1.85, 4.4], [1.35, 4.4]], rect(0.6, 4.4, 2.6, 6.2), rect(-0.6, 7, 2.8, 9.4)],
    walls: [[[-0.25, 2], [-0.8, 2], [-0.8, 0], [0.8, 0], [0.8, 2], [0.25, 2]], [[-0.6, 9.4], [2.8, 9.4], [2.8, 8.4]]],
    ramps: [{ x0: -0.25, z0: 2, x1: 1.85, z1: 4.4, axis: 'z', h0: 0, h1: 0.3 }, { x0: 1.2, z0: 5.7, x1: 2, z1: 6.2, axis: 'z', h0: 0.3, h1: 0.42 }],
    tiers: [{ poly: rect(0.6, 4.4, 2.6, 6.2), h: 0.3 }, { poly: C10_PAD(-0.6, 7, 2.8, 9.4), h: 0.15, sx: -0.05 }],
    zones: [{ surf: 'fast', push: [-0.5, -0.75], poly: [[-0.25, 2], [0.25, 2], [1.85, 4.4], [1.35, 4.4]] }],
    movers: [{ kind: 'spin', x: 1.6, z: 5.05, len: 0.42, w: 1.5, phase: 0, blades: 2, look: 'windmill' }] },
  /* 14. ice palace: two golden gates sweep a bare cloud-ice island; the cup hides in the palace */
  { par: 3, sol: [[6,0.9,2]], tee: [0, 0.6], cup: [0.1, 7.35],
    floors: [rect(-0.7, 0, 0.7, 2), rect(-0.35, 2, 0.35, 3), rect(-1.6, 3, 1.6, 8.2)],
    walls: [[[-0.35, 2], [-0.7, 2], [-0.7, 0], [0.7, 0], [0.7, 2], [0.35, 2]], [[0.9, 7.9], [-0.6, 7.9], [-0.6, 6.8], [0.9, 6.8]]],
    tiers: [{ poly: C10_PAD(-0.7, 0, 0.7, 2), h: 0.35 }],
    ramps: [{ x0: -0.35, z0: 2, x1: 0.35, z1: 3, axis: 'z', h0: 0.35, h1: 0 }],
    zones: [{ surf: 'ice', poly: rect(-1.6, 3, 1.6, 8.2) }],
    posts: [{ x: 1.25, z: 7.05, r: 0.1, look: 'cloud' }],
    bumps: [{ x: 0.1, z: 7.35, r: 0.32, h: -0.05 }],
    movers: [{ kind: 'gate', ax: -1.05, az: 4.4, bx: 1.05, bz: 4.4, len: 0.45, ang: 90, period: 3, look: 'gate' },
      { kind: 'gate', ax: 1.05, az: 5.6, bx: -1.05, bz: 5.6, len: 0.45, ang: 90, period: 2.4, phase: 1, look: 'gate' }] },
  /* 15. sky links (long green): a 14 m sweeping green that falls left to right over a broad ridge
     and a swale; the cup sits on a soft crown at the back */
  { par: 3, sol: [[4,0.96,0]], tee: [0, 0.6], cup: [1.2, 12.2], aim0: 5,
    shape: [[-0.9, 0], [0.9, 0], [1.8, 3], [2.8, 6], [3.2, 9], [2.8, 12], [1.6, 14], [-0.2, 14.2], [-1.2, 12.5], [-1, 9.5], [-1.8, 6.5], [-2, 3]],
    tiers: [{ poly: rect(-3, -1, 4, 15), h: 0, sx: -0.02, sz: 0.008 }],
    bumps: [{ x: 0.2, z: 6.5, r: 2.2, h: 0.15 }, { x: 1.8, z: 9.5, r: 1.5, h: -0.1 }, { x: 1.2, z: 12.2, r: 1.2, h: 0.06 }, { x: -0.6, z: 3, r: 1.4, h: -0.06 }] },
  /* 16. rainbow relay: three bare rainbows between three tiny islands, each with its own crosswind */
  { par: 4, sol: [[180,0.9,0],[69,0.4,0],[0,0.8,0]], tee: [0, 0.6], cup: [3.3, 8.2],
    floors: [rect(-0.7, 0, 0.7, 1.8), rect(-0.25, 1.8, 0.25, 3.6), rect(-0.6, 3.6, 0.6, 4.6), rect(0.6, 3.85, 2.6, 4.35), rect(2.6, 3.4, 3.6, 5.2),
      rect(2.85, 5.2, 3.35, 7.2), rect(2.0, 7.2, 4.4, 9)],
    walls: [[[-0.25, 1.8], [-0.7, 1.8], [-0.7, 0], [0.7, 0], [0.7, 1.8], [0.25, 1.8]], [[0.6, 4.6], [-0.6, 4.6], [-0.6, 3.6]],
      [[2.6, 3.4], [3.6, 3.4], [3.6, 5.2]], [[2.0, 8.2], [2.0, 9], [4.4, 9], [4.4, 7.8]]],
    tiers: [{ poly: C10_PAD(-0.6, 3.6, 0.6, 4.6), h: 0.15 }, { poly: rect(0.6, 3.85, 2.6, 4.35), h: 0.15 }, { poly: C10_PAD(2.6, 3.4, 3.6, 5.2), h: 0.15 }],
    ramps: [{ x0: -0.25, z0: 1.8, x1: 0.25, z1: 3.6, axis: 'z', h0: 0, h1: 0.15 }, { x0: 2.85, z0: 5.2, x1: 3.35, z1: 7.2, axis: 'z', h0: 0.15, h1: 0 }],
    zones: [{ surf: 'fast', push: [0.9, 0], poly: rect(-0.25, 2.2, 0.25, 3.3) }, { surf: 'fast', poly: rect(-0.25, 1.8, 0.25, 2.2) }, { surf: 'fast', poly: rect(-0.25, 3.3, 0.25, 3.6) },
      { surf: 'fast', push: [0, -0.9], poly: rect(1.0, 3.85, 2.2, 4.35) }, { surf: 'fast', poly: rect(0.6, 3.85, 1.0, 4.35) }, { surf: 'fast', poly: rect(2.2, 3.85, 2.6, 4.35) },
      { surf: 'fast', push: [-0.9, 0], poly: rect(2.85, 5.6, 3.35, 6.8) }, { surf: 'fast', poly: rect(2.85, 5.2, 3.35, 5.6) }, { surf: 'fast', poly: rect(2.85, 6.8, 3.35, 7.2) }],
    bumps: [{ x: 3.3, z: 8.2, r: 0.35, h: -0.05 }] },
  /* 17. sky locks: two gates lock the bare neck; then the windmill-guarded tube, or the kicker jump, to the fan-swept cup island */
  { crazy: true, par: 4, sol: [[180,0.85,2],[72,0.25,0]], tee: [0, 0.6], cup: [0.6, 8.3],
    floors: [rect(-0.7, 0, 0.7, 2), rect(-0.3, 2, 0.3, 4), rect(-1.3, 4, 1.3, 6), rect(-1.4, 6.8, 1.4, 9)],
    walls: [[[-0.3, 2], [-0.7, 2], [-0.7, 0], [0.7, 0], [0.7, 2], [0.3, 2]], [[1.4, 8.4], [1.4, 9], [-1.4, 9], [-1.4, 6.8]]],
    ramps: [{ x0: -1.0, z0: 5.6, x1: -0.2, z1: 6, axis: 'z', h0: 0, h1: 0.12 }],
    zones: [{ push: [1.2, 0], poly: rect(-1.4, 7.3, 1.4, 7.8) }],
    bumps: [{ x: 0.6, z: 8.3, r: 0.35, h: -0.05 }],
    movers: [{ kind: 'gate', ax: -0.62, az: 2.7, bx: 0.62, bz: 2.7, len: 0.3, ang: 90, period: 2.2, look: 'gate' },
      { kind: 'gate', ax: -0.62, az: 3.4, bx: 0.62, bz: 3.4, len: 0.3, ang: 90, period: 2.2, phase: 3.14159, look: 'gate' },
      { kind: 'spin', x: 0.5, z: 4.85, len: 0.3, w: 2, phase: 0, blades: 2, look: 'windmill' }],
    tubes: [{ a: [0.5, 5.6], b: [-0.8, 7.0], dir: 25 }] },
  /* 18. the crown kingdom: tube or windy rainbow to the windmill isle, off the kicker onto the
     cloud-ice court past the golden gate, then up the royal ramp to the crater cup on the crown */
  { crazy: true, par: 5, sol: [[212,1,0],[237,0.86,2]], tee: [0, 0.6], cup: [0.3, 11.8],
    floors: [rect(-0.8, 0, 0.8, 2.2), rect(-0.22, 2.2, 0.22, 4.6), rect(-1.4, 4.6, 1.4, 6.6), rect(-1.6, 7.6, 1.6, 10), rect(-0.35, 10, 0.35, 11), rect(-1, 11, 1, 12.6)],
    /* the finale is hard, not hopeless: railed rainbow, walled windmill isle (only the kicker open), walled ice court, railed crown ramp */
    walls: [[[-0.26, 2.2], [-0.8, 2.2], [-0.8, 0], [0.8, 0], [0.8, 2.2], [0.26, 2.2]],
      [[-0.26, 2.2], [-0.26, 4.6], [-1.4, 4.6], [-1.4, 6.6], [-0.5, 6.6]], [[0.26, 2.2], [0.26, 4.6], [1.4, 4.6], [1.4, 6.6], [0.5, 6.6]],
      [[-1.6, 7.6], [-1.6, 10], [-0.28, 10], [-0.28, 11], [-1, 11], [-1, 12.6], [1, 12.6], [1, 11], [0.28, 11], [0.28, 10], [1.6, 10], [1.6, 7.6]]],
    tiers: [{ poly: rect(-1.4, 4.6, 1.4, 6.6), h: 0.3 }, { poly: rect(-1.6, 7.6, 1.6, 10), h: 0.1 }, { poly: C10_PAD(-1, 11, 1, 12.6), h: 0.45 }],
    ramps: [{ x0: -0.22, z0: 2.2, x1: 0.22, z1: 4.6, axis: 'z', h0: 0, h1: 0.3 }, { x0: -0.5, z0: 6.2, x1: 0.5, z1: 6.6, axis: 'z', h0: 0.3, h1: 0.4 },
      { x0: -0.35, z0: 10, x1: 0.35, z1: 11, axis: 'z', h0: 0.1, h1: 0.45 }],
    zones: [{ surf: 'fast', push: [-1.1, 0], poly: rect(-0.22, 3, 0.22, 3.9) }, { surf: 'fast', poly: rect(-0.22, 2.2, 0.22, 3) }, { surf: 'fast', poly: rect(-0.22, 3.9, 0.22, 4.6) },
      { surf: 'ice', poly: rect(-1.6, 7.6, 1.6, 10) }],
    bumps: [{ x: 0.3, z: 11.8, r: 0.5, h: 0.12 }, { x: 0.3, z: 11.8, r: 0.24, h: -0.05 }],
    movers: [{ kind: 'spin', x: -0.5, z: 5.5, len: 0.36, w: 1.7, phase: 0, blades: 2, look: 'windmill' },
      { kind: 'gate', ax: -0.95, az: 8.9, bx: 0.95, bz: 8.9, len: 0.4, ang: 90, period: 2.8, look: 'gate' }],
    tubes: [{ a: [0.5, 1.7], b: [0.8, 4.95], dir: 0 }] },
] });
