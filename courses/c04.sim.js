/* world 4, snow peak: ice sheets, ski-slope banks and moguls, avalanche bowls, snowmen, rolling
   snowballs, a ski-lift gate, frozen ponds round open water and drops between terraces. */
const C4_MAN = (x, z, r = 0.16) => ({ x, z, r, top: 0.4, look: 'snowman' });
const C4_BALL = (ax, az, bx, bz, period, phase = 0, r = 0.17) => ({ kind: 'slide', ax, az, bx, bz, r, period, phase, look: 'snowball' });
/* an open-water hole in the ice: a rough n-gon (deterministic, no randomness) */
const C4_POOL = (cx, cz, rx, rz = rx, n = 10) => Array.from({ length: n }, (_, i) => {
  const a = i * 2 * Math.PI / n, k = 1 + 0.08 * Math.cos(3 * a);
  return [+(cx + Math.sin(a) * rx * k).toFixed(3), +(cz + Math.cos(a) * rz * k).toFixed(3)];
});
registerWorld(4, { holes: [
  /* 1. first ice: an ice sheet with a mogul in the middle, the cup on felt beyond */
  { par: 2, sol: [[0,0.48,0]], tee: [0, 0.5], cup: [0, 5.2], shape: rect(-0.7, 0, 0.7, 6.4),
    zones: [{ surf: 'ice', poly: rect(-0.7, 1.4, 0.7, 4.0) }], bumps: [{ x: 0, z: 5.2, r: 0.65, h: 0.12 }] },
  /* 2. mogul field: turn left into a field of moguls, the cup on top of the last one */
  { par: 3, sol: [[5.5,0.8,0],[0,0.86,0]], tee: [0, 0.5], cup: [2.9, 4.7], aim0: 10, shape: [[-0.6, 0], [0.6, 0], [0.6, 3.4], [3.8, 3.4], [3.8, 5.9], [-0.6, 5.9]],
    bumps: [{ x: 0.1, z: 4.9, r: 0.4, h: 0.16 }, { x: 1.0, z: 4.0, r: 0.4, h: 0.18 }, { x: 1.5, z: 5.2, r: 0.42, h: 0.2 }, { x: 2.1, z: 3.95, r: 0.35, h: 0.14 }, { x: 2.9, z: 4.7, r: 0.6, h: 0.1 }] },
  /* 3. ice corner: a dogleg left whose elbow and leg are glare ice */
  { par: 3, sol: [[54,0.92,0]], tee: [0, 0.5], cup: [2.2, 4.7], aim0: 0, shape: [[-0.6, 0], [0.6, 0], [0.6, 4], [3.6, 4], [3.6, 5.4], [-0.6, 5.4]],
    zones: [{ surf: 'water', poly: rect(3.0, 4.0, 3.6, 5.4) }, { surf: 'ice', poly: rect(-0.6, 3.3, 3.0, 5.4) }], bumps: [{ x: 1.2, z: 4.7, r: 0.3, h: 0.1 }] },
  /* 4. the snowfield: a long, open green. A low ridge off the tee, a broad ramp up to the back
     tier, and a swale in front of the cup; read the tilt both ways and lag it close */
  { par: 3, sol: [[12,0.88,0]], tee: [0, 0.5], cup: [0.6, 9.9], shape: rect(-1.6, 0, 1.6, 11),
    tiers: [{ poly: rect(-1.6, 0, 1.6, 5.2), h: 0, sx: 0.012 }, { poly: rect(-1.6, 6.4, 1.6, 11), h: 0.14, sx: -0.012 }],
    ramps: [{ x0: -1.6, z0: 5.2, x1: 1.6, z1: 6.4, axis: 'z', h0: 0, h1: 0.14 }],
    bumps: [{ x: -0.7, z: 3.0, r: 1.2, h: 0.1 }, { x: 0.5, z: 8.2, r: 1.0, h: -0.08 }, { x: -1.0, z: 9.4, r: 1.1, h: 0.08 }] },
  /* 5. half-pipe: steep ski banks either side, snowmen in the gully */
  { par: 3, sol: [[12,0.76,0]], tee: [0, 0.5], cup: [0, 6.2], shape: rect(-1.2, 0, 1.2, 7),
    ramps: [{ x0: 0.6, z0: 0, x1: 1.2, z1: 7, axis: 'x', h0: 0, h1: 0.3 }, { x0: -1.2, z0: 0, x1: -0.6, z1: 7, axis: 'x', h0: 0.3, h1: 0 }],
    posts: [C4_MAN(-0.36, 3.2), C4_MAN(0, 3.2), C4_MAN(0.36, 3.2), C4_MAN(-0.36, 4.8), C4_MAN(0, 4.8), C4_MAN(0.36, 4.8)] },
  /* 6. frozen pond: glare ice round open water, the cup on a snowy island with water behind it */
  { par: 3, sol: [[36,0.52,0]], tee: [0, 0.5], cup: [-0.3, 5.1], shape: rect(-1.4, 0, 1.4, 6.4),
    zones: [{ surf: 'water', poly: C4_POOL(0.05, 3.0, 0.55, 0.5) }, { surf: 'water', poly: C4_POOL(-0.4, 6.0, 0.55, 0.22) }, { surf: 'water', poly: C4_POOL(0.85, 4.5, 0.3, 0.35, 8) },
      { surf: 'ice', poly: rect(-1.4, 1.6, 1.4, 6.4) }], bumps: [{ x: -0.3, z: 5.1, r: 0.6, h: 0.1 }] },
  /* 7. terraces: drop off the tee deck onto an ice shelf, then drop again and come back to the cup */
  { par: 3, sol: [[325,0.8,0]], tee: [0, 0.5], cup: [2.4, 1.1], aim0: 20, shape: [[-0.6, 0], [0.6, 0], [0.6, 3], [1.8, 3], [1.8, 0.4], [3, 0.4], [3, 4.6], [-0.6, 4.6]],
    tiers: [{ poly: rect(-0.6, 0, 0.6, 3), h: 0.4 }, { poly: rect(-0.6, 3, 3, 4.6), h: 0.2 }],
    zones: [{ surf: 'ice', poly: rect(-0.6, 3, 3, 4.6) }], bumps: [{ x: 1.2, z: 3.8, r: 0.3, h: 0.1 }, { x: 2.4, z: 1.1, r: 0.55, h: 0.08 }] },
  /* 8. ski lift: a lift bar sweeps across the gap, then a climb to the summit deck */
  { par: 3, sol: [[42,1,0.5]], tee: [0, 0.5], cup: [0.35, 6.1], shape: rect(-1, 0, 1, 7), inner: [[[-1, 2.8], [-0.3, 2.8]], [[0.3, 2.8], [1, 2.8]]],
    movers: [{ kind: 'gate', ax: -0.44, az: 3.1, bx: 0.44, bz: 3.1, len: 0.35, ang: 90, period: 3.2, phase: 0, look: 'lift' }],
    ramps: [{ x0: -1, z0: 3.8, x1: 1, z1: 4.8, axis: 'z', h0: 0, h1: 0.25 }], tiers: [{ poly: rect(-1, 4.8, 1, 7), h: 0.25 }], posts: [C4_MAN(-0.3, 5.6)] },
  /* 9. avalanche bowl: off the tee deck into an icy bowl, up a narrow ramp to the cup shelf */
  { par: 4, crazy: true, sol: [[24,0.96,0]], tee: [0, 0.5], cup: [-0.6, 7.4], shape: rect(-1.3, 0, 1.3, 8.2),
    tiers: [{ poly: rect(-1.3, 0, 1.3, 2), h: 0.3 }, { poly: rect(-1.3, 6.4, 1.3, 8.2), h: 0.2 }], ramps: [{ x0: -0.4, z0: 5.6, x1: 0.4, z1: 6.4, axis: 'z', h0: 0, h1: 0.2 }],
    bumps: [{ x: 0, z: 4.1, r: 1.0, h: -0.35 }], zones: [{ surf: 'fast', poly: C4_POOL(0, 4.1, 1.1, 1.1, 12) }], posts: [C4_MAN(0.05, 7.3)] },
  /* 10. the fall line: a long green that falls away from the tee and leans left all the way;
     two wide moguls and a swale between them steer the lag toward the back corner */
  { par: 3, sol: [[12,0.84,0]], tee: [0.9, 0.5], cup: [-0.9, 11.2], shape: rect(-1.8, 0, 1.8, 12.2),
    tiers: [{ poly: rect(-1.8, 0, 1.8, 12.2), h: 0.16, sx: 0.014, sz: -0.012 }],
    bumps: [{ x: -0.6, z: 3.6, r: 1.3, h: 0.14 }, { x: 0.9, z: 6.6, r: 1.5, h: 0.12 }, { x: -0.4, z: 8.4, r: 1.6, h: -0.1 }] },
  /* 11. ski jump: fly the gap off the kicker, or creep over the narrow ice bridge */
  { par: 4, crazy: true, sol: [[345.63,0.92,0]], tee: [0, 0.5], cup: [-0.4, 7.3], aim0: 0,
    floors: [rect(-0.7, 0, 1.7, 3.6), rect(1.1, 3.6, 1.5, 4.4), rect(-1.2, 4.4, 1.8, 8.2)],
    walls: [[[-0.7, 3.6], [-0.7, 0], [1.7, 0], [1.7, 3.6], [1.5, 3.6]], [[1.1, 3.6], [0.7, 3.6], [0.7, 1.6]],
      [[1.5, 4.4], [1.8, 4.4], [1.8, 8.2], [-1.2, 8.2], [-1.2, 4.4], [-0.8, 4.4]], [[0.8, 4.4], [1.1, 4.4]]],
    ramps: [{ x0: -0.7, z0: 2.6, x1: 0.7, z1: 3.6, axis: 'z', h0: 0, h1: 0.25 }], zones: [{ surf: 'ice', poly: rect(1.1, 3.6, 1.5, 4.4) }],
    bumps: [{ x: 0.5, z: 5.5, r: 0.35, h: 0.12 }, { x: -0.4, z: 7.3, r: 0.55, h: 0.08 }], posts: [C4_MAN(0.35, 6.6)] },
  /* 12. ice cave: a tube through the snowbank, or the long way round over the ice */
  { par: 3, sol: [[30,1,0]], tee: [0, 0.5], cup: [-0.8, 5.4], aim0: 330, shape: rect(-1.5, 0, 1.5, 6.2), inner: [[[-1.5, 3.2], [1.0, 3.2]]],
    tubes: [{ a: [-1.0, 2.5], b: [-1.0, 4.0], dir: 270 }], posts: [C4_MAN(-0.45, 1.55)],
    zones: [{ surf: 'ice', poly: rect(-1.5, 3.2, 1.5, 6.2) }], bumps: [{ x: -0.8, z: 5.4, r: 0.6, h: 0.1 }] },
  /* 13. ice run: a switchback with banked turns and an ice straight down the middle */
  { par: 4, sol: [[156,0.88,0],[204,0.96,0],[18,0.56,0]], tee: [0, 0.5], cup: [2.4, 5.3], aim0: 0, shape: rect(-0.6, 0, 3, 6.2), inner: [[[0.6, 0], [0.6, 5.0]], [[1.8, 6.2], [1.8, 1.2]]],
    ramps: [{ x0: -0.6, z0: 5.6, x1: 1.8, z1: 6.2, axis: 'z', h0: 0, h1: 0.2 }, { x0: 0.6, z0: 0, x1: 3, z1: 0.6, axis: 'z', h0: 0.2, h1: 0 }],
    zones: [{ surf: 'ice', poly: rect(0.6, 0.6, 1.8, 5.6) }], posts: [C4_MAN(2.1, 3.0), C4_MAN(2.7, 3.9)], bumps: [{ x: 2.4, z: 5.3, r: 0.55, h: 0.1 }] },
  /* 14. pond carry: a sheet of ice full of open water between the tee and the cup */
  { par: 4, sol: [[60,0.6,0],[18,0.52,0]], tee: [-1.2, 0.5], cup: [1.2, 7.2], shape: rect(-2, 0, 2, 8),
    zones: [{ surf: 'water', poly: C4_POOL(-0.4, 3.2, 0.5) }, { surf: 'water', poly: C4_POOL(0.9, 4.3, 0.55) }, { surf: 'water', poly: C4_POOL(-1.0, 5.1, 0.45) },
      { surf: 'water', poly: C4_POOL(0.3, 5.9, 0.35) }, { surf: 'ice', poly: rect(-2, 2, 2, 6.4) }],
    posts: [C4_MAN(0.7, 7.0), C4_MAN(1.55, 6.6)], bumps: [{ x: 1.2, z: 7.2, r: 0.55, h: 0.1 }] },
  /* 15. mogul descent: down a steep slope of moguls into a ring of snowmen */
  { par: 3, sol: [[10,0.8,0]], tee: [0, 0.5], cup: [-0.6, 7.8], shape: rect(-1.2, 0, 1.2, 9),
    tiers: [{ poly: rect(-1.2, 0, 1.2, 1.4), h: 0.4 }], ramps: [{ x0: -1.2, z0: 1.4, x1: 1.2, z1: 5.4, axis: 'z', h0: 0.4, h1: 0 }],
    bumps: [{ x: 0.4, z: 2.4, r: 0.35, h: 0.14 }, { x: -0.5, z: 3.2, r: 0.4, h: 0.16 }, { x: 0.3, z: 4.2, r: 0.4, h: 0.15 }, { x: -0.2, z: 5.0, r: 0.35, h: 0.12 }],
    inner: [[[-1.2, 6.0], [0.5, 6.0]]], posts: [C4_MAN(-0.05, 7.5), C4_MAN(-0.6, 8.45)], movers: [C4_BALL(0.1, 5.6, 0.8, 5.6, 2.8)] },
  /* 16. the big bowl: a long, wide green with an avalanche bowl in the middle and a ridge on the
     right; the cup sits on the flat back tier above a gentle ramp */
  { par: 3, sol: [[0,0.88,0]], tee: [-1.2, 0.5], cup: [1.0, 10.6], shape: rect(-2, 0, 2, 11.6),
    tiers: [{ poly: rect(-2, 0, 2, 8.0), h: 0, sz: 0.008 }, { poly: rect(-2, 9.0, 2, 11.6), h: 0.18 }],
    ramps: [{ x0: -2, z0: 8.0, x1: 2, z1: 9.0, axis: 'z', h0: 0.064, h1: 0.18 }],
    bumps: [{ x: 0, z: 4.6, r: 1.8, h: -0.18 }, { x: 1.2, z: 2.2, r: 1.1, h: 0.12 }, { x: -1.2, z: 7.4, r: 1.0, h: 0.09 }] },
  /* 17. ski lift: ride the narrow lift ramp, beat the bar at the top, drop to the lake */
  { par: 5, crazy: true, sol: [[3.09,0.92,0]], tee: [0, 0.5], cup: [0.6, 8.9], shape: rect(-1.4, 0, 1.4, 10),
    ramps: [{ x0: -0.45, z0: 2.4, x1: 0.45, z1: 4.4, axis: 'z', h0: 0, h1: 0.4 }], tiers: [{ poly: rect(-1.4, 4.4, 1.4, 6.4), h: 0.4 }],
    movers: [{ kind: 'gate', ax: -0.8, az: 4.8, bx: 0.8, bz: 4.8, len: 0.35, ang: 90, period: 3.4, phase: 0, look: 'lift' }],
    zones: [{ surf: 'water', poly: C4_POOL(-0.5, 8.2, 0.45, 0.4) }, { surf: 'ice', poly: rect(-1.4, 6.4, 1.4, 7.6) }],
    posts: [C4_MAN(0.1, 9.3)], bumps: [{ x: 0.6, z: 8.9, r: 0.55, h: 0.08 }] },
  /* 18. the peak: tee off the summit, down the ice chute, across the mogul terrace, drop to the
     ice shelf and drop again to the cup by the lake. Off-floor tiers keep the outline walls level. */
  { par: 5, crazy: true, sol: [[118,0.96,1],[18,0.8,0]], tee: [0, 0.5], cup: [4.3, 1.2], aim0: 0,
    shape: [[-0.7, 0], [0.7, 0], [0.7, 5.2], [1.9, 5.2], [1.9, 4.0], [1.9, 0], [5, 0], [5, 2.6], [3.3, 2.6], [3.3, 4.0], [3.3, 6.8], [-0.7, 6.8]],
    tiers: [{ poly: rect(-1.2, -0.2, 1.3, 2.4), h: 0.9 }, { poly: rect(-1.2, 5.2, 3.8, 7.3), h: 0.55 }, { poly: rect(1.3, 2.6, 3.8, 5.2), h: 0.25 }],
    ramps: [{ x0: -1.2, z0: 2.4, x1: 1.3, z1: 5.2, axis: 'z', h0: 0.9, h1: 0.55 }],
    zones: [{ surf: 'ice', poly: rect(-0.7, 2.4, 0.7, 5.2) }, { surf: 'ice', poly: rect(1.9, 2.6, 3.3, 5.2) }, { surf: 'water', poly: C4_POOL(2.6, 0.9, 0.35, 0.3) }],
    bumps: [{ x: 0.2, z: 6.1, r: 0.3, h: 0.1 }, { x: 4.3, z: 1.2, r: 0.55, h: 0.1 }], posts: [C4_MAN(2.3, 3.6), C4_MAN(2.9, 4.4)],
    movers: [C4_BALL(1.2, 5.56, 1.2, 6.44, 2.4)] },
] });
