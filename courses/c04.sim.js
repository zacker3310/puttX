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
  { par: 3, sol: [[338,0.96,0],[16,0.56,0]], tee: [0, 0.5], cup: [2.9, 4.7], aim0: 10, shape: [[-0.6, 0], [0.6, 0], [0.6, 3.4], [3.8, 3.4], [3.8, 5.9], [-0.6, 5.9]],
    bumps: [{ x: 0.1, z: 4.9, r: 0.4, h: 0.16 }, { x: 1.0, z: 4.0, r: 0.4, h: 0.18 }, { x: 1.5, z: 5.2, r: 0.42, h: 0.2 }, { x: 2.1, z: 3.95, r: 0.35, h: 0.14 }, { x: 2.9, z: 4.7, r: 0.6, h: 0.1 }] },
  /* 3. ice corner: a dogleg left whose elbow and leg are glare ice */
  { par: 3, sol: [[38,0.92,0]], tee: [0, 0.5], cup: [2.2, 4.7], aim0: 0, shape: [[-0.6, 0], [0.6, 0], [0.6, 4], [3.6, 4], [3.6, 5.4], [-0.6, 5.4]],
    zones: [{ surf: 'water', poly: rect(3.0, 4.0, 3.6, 5.4) }, { surf: 'ice', poly: rect(-0.6, 3.3, 3.0, 5.4) }], bumps: [{ x: 1.2, z: 4.7, r: 0.3, h: 0.1 }] },
  /* 4. snowball alley: two rolling snowballs cross the lane, the cup sits on a snowdrift */
  { par: 3, sol: [[16,0.72,0]], tee: [0, 0.5], cup: [0.15, 5.6], shape: rect(-0.9, 0, 0.9, 6.5),
    movers: [C4_BALL(-0.52, 2.4, 0.52, 2.4, 2.6), C4_BALL(0.52, 3.8, -0.52, 3.8, 3.1, 1)],
    zones: [{ surf: 'ice', poly: rect(-0.9, 1.3, 0.9, 4.5) }], bumps: [{ x: 0.15, z: 5.6, r: 0.62, h: 0.1 }] },
  /* 5. half-pipe: steep ski banks either side, snowmen in the gully */
  { par: 3, sol: [[24,0.88,0]], tee: [0, 0.5], cup: [0, 6.2], shape: rect(-1.2, 0, 1.2, 7),
    ramps: [{ x0: 0.6, z0: 0, x1: 1.2, z1: 7, axis: 'x', h0: 0, h1: 0.3 }, { x0: -1.2, z0: 0, x1: -0.6, z1: 7, axis: 'x', h0: 0.3, h1: 0 }],
    posts: [C4_MAN(-0.36, 3.2), C4_MAN(0, 3.2), C4_MAN(0.36, 3.2), C4_MAN(-0.36, 4.8), C4_MAN(0, 4.8), C4_MAN(0.36, 4.8)] },
  /* 6. frozen pond: glare ice round open water, the cup on a snowy island with water behind it */
  { par: 3, sol: [], tee: [0, 0.5], cup: [-0.3, 5.1], shape: rect(-1.4, 0, 1.4, 6.4),
    zones: [{ surf: 'water', poly: C4_POOL(0.05, 3.0, 0.55, 0.5) }, { surf: 'water', poly: C4_POOL(-0.4, 6.0, 0.55, 0.22) }, { surf: 'water', poly: C4_POOL(0.85, 4.5, 0.3, 0.35, 8) },
      { surf: 'ice', poly: rect(-1.4, 1.6, 1.4, 6.4) }], bumps: [{ x: -0.3, z: 5.1, r: 0.6, h: 0.1 }] },
  /* 7. terraces: drop off the tee deck onto an ice shelf, then drop again and come back to the cup */
  { par: 4, sol: [[326,0.96,0],[0,1,0]], tee: [0, 0.5], cup: [2.4, 1.1], aim0: 20, shape: [[-0.6, 0], [0.6, 0], [0.6, 3], [1.8, 3], [1.8, 0.4], [3, 0.4], [3, 4.6], [-0.6, 4.6]],
    tiers: [{ poly: rect(-0.6, 0, 0.6, 3), h: 0.4 }, { poly: rect(-0.6, 3, 3, 4.6), h: 0.2 }],
    zones: [{ surf: 'ice', poly: rect(-0.6, 3, 3, 4.6) }], bumps: [{ x: 1.2, z: 3.8, r: 0.3, h: 0.1 }, { x: 2.4, z: 1.1, r: 0.55, h: 0.08 }] },
  /* 8. ski lift: a lift bar sweeps across the gap, then a climb to the summit deck */
  { par: 3, sol: [[40,1,1]], tee: [0, 0.5], cup: [0.35, 6.1], shape: rect(-1, 0, 1, 7), inner: [[[-1, 2.8], [-0.3, 2.8]], [[0.3, 2.8], [1, 2.8]]],
    movers: [{ kind: 'gate', ax: -0.44, az: 3.1, bx: 0.44, bz: 3.1, len: 0.35, ang: 90, period: 3.2, phase: 0, look: 'lift' }],
    ramps: [{ x0: -1, z0: 3.8, x1: 1, z1: 4.8, axis: 'z', h0: 0, h1: 0.25 }], tiers: [{ poly: rect(-1, 4.8, 1, 7), h: 0.25 }], posts: [C4_MAN(-0.3, 5.6)] },
  /* 9. avalanche bowl: off the tee deck into an icy bowl, up a narrow ramp to the cup shelf */
  { par: 4, sol: [], tee: [0, 0.5], cup: [-0.75, 7.6], shape: rect(-1.3, 0, 1.3, 8.2),
    tiers: [{ poly: rect(-1.3, 0, 1.3, 2), h: 0.3 }, { poly: rect(-1.3, 6.4, 1.3, 8.2), h: 0.2 }], ramps: [{ x0: 0.45, z0: 5.6, x1: 1.3, z1: 6.4, axis: 'z', h0: 0, h1: 0.2 }],
    inner: [[[-1.3, 7.0], [0.3, 7.0]]], bumps: [{ x: 0, z: 4.1, r: 1.0, h: -0.35 }], zones: [{ surf: 'ice', poly: C4_POOL(0, 4.1, 1.1, 1.1, 12) }], posts: [C4_MAN(0.0, 7.75)] },
  /* 10. slalom: down the ski slope between snowmen, open water past the cup */
  { par: 3, sol: [[54,0.4,0],[0,0.16,0]], tee: [0, 0.5], cup: [-0.2, 6.5], shape: rect(-1, 0, 1, 7.6),
    tiers: [{ poly: rect(-1, 0, 1, 1.2), h: 0.4 }], ramps: [{ x0: -1, z0: 1.2, x1: 1, z1: 5.6, axis: 'z', h0: 0.4, h1: 0 }],
    posts: [C4_MAN(0.4, 2.4), C4_MAN(-0.4, 3.4), C4_MAN(0.35, 4.4)], bumps: [{ x: 0.3, z: 5.9, r: 0.3, h: 0.08 }],
    zones: [{ surf: 'water', poly: rect(-1, 7.1, 1, 7.6) }] },
  /* 11. ski jump: fly the gap off the kicker, or creep over the narrow ice bridge */
  { par: 4, sol: [], tee: [0, 0.5], cup: [-0.4, 7.3], aim0: 0,
    floors: [rect(-0.7, 0, 1.7, 3.6), rect(1.1, 3.6, 1.5, 4.4), rect(-1.2, 4.4, 1.8, 8.2)],
    walls: [[[-0.7, 3.6], [-0.7, 0], [1.7, 0], [1.7, 3.6], [1.5, 3.6]], [[1.1, 3.6], [0.7, 3.6], [0.7, 1.6]],
      [[1.5, 4.4], [1.8, 4.4], [1.8, 8.2], [-1.2, 8.2], [-1.2, 4.4], [-0.8, 4.4]], [[0.8, 4.4], [1.1, 4.4]]],
    ramps: [{ x0: -0.7, z0: 2.6, x1: 0.7, z1: 3.6, axis: 'z', h0: 0, h1: 0.25 }], zones: [{ surf: 'ice', poly: rect(1.1, 3.6, 1.5, 4.4) }],
    inner: [[[-1.2, 6.3], [0.8, 6.3]]], bumps: [{ x: 0.3, z: 5.4, r: 0.35, h: 0.12 }, { x: -0.4, z: 7.3, r: 0.55, h: 0.08 }], posts: [C4_MAN(0.55, 7.6)] },
  /* 12. ice cave: a tube through the snowbank, or the long way round over the ice */
  { par: 3, sol: [], tee: [0, 0.5], cup: [-0.8, 5.4], aim0: 330, shape: rect(-1.5, 0, 1.5, 6.2), inner: [[[-1.5, 3.2], [1.0, 3.2]]],
    tubes: [{ a: [-1.0, 2.5], b: [-1.0, 4.0], dir: 270 }], posts: [C4_MAN(-0.45, 1.55)],
    zones: [{ surf: 'ice', poly: rect(-1.5, 3.2, 1.5, 6.2) }], bumps: [{ x: -0.8, z: 5.4, r: 0.6, h: 0.1 }] },
  /* 13. ice run: a switchback with banked turns and an ice straight down the middle */
  { par: 4, sol: [[344,0.96,0],[162,0.96,0],[10,0.28,0]], tee: [0, 0.5], cup: [2.4, 5.3], aim0: 0, shape: rect(-0.6, 0, 3, 6.2), inner: [[[0.6, 0], [0.6, 5.0]], [[1.8, 6.2], [1.8, 1.2]]],
    ramps: [{ x0: -0.6, z0: 5.6, x1: 1.8, z1: 6.2, axis: 'z', h0: 0, h1: 0.2 }, { x0: 0.6, z0: 0, x1: 3, z1: 0.6, axis: 'z', h0: 0.2, h1: 0 }],
    zones: [{ surf: 'ice', poly: rect(0.6, 0.6, 1.8, 5.6) }], posts: [C4_MAN(2.1, 3.0), C4_MAN(2.7, 3.9)], bumps: [{ x: 2.4, z: 5.3, r: 0.55, h: 0.1 }] },
  /* 14. pond carry: a sheet of ice full of open water between the tee and the cup */
  { par: 4, sol: [[330,0.8,0],[2,0.68,0]], tee: [-1.2, 0.5], cup: [1.2, 7.2], shape: rect(-2, 0, 2, 8),
    zones: [{ surf: 'water', poly: C4_POOL(-0.4, 3.2, 0.5) }, { surf: 'water', poly: C4_POOL(0.9, 4.3, 0.55) }, { surf: 'water', poly: C4_POOL(-1.0, 5.1, 0.45) },
      { surf: 'water', poly: C4_POOL(0.3, 5.9, 0.35) }, { surf: 'ice', poly: rect(-2, 2, 2, 6.4) }],
    posts: [C4_MAN(0.7, 7.0), C4_MAN(1.55, 6.6)], bumps: [{ x: 1.2, z: 7.2, r: 0.55, h: 0.1 }] },
  /* 15. mogul descent: down a steep slope of moguls into a ring of snowmen */
  { par: 4, sol: [], tee: [0, 0.5], cup: [-0.6, 7.8], shape: rect(-1.2, 0, 1.2, 9),
    tiers: [{ poly: rect(-1.2, 0, 1.2, 1.4), h: 0.4 }], ramps: [{ x0: -1.2, z0: 1.4, x1: 1.2, z1: 5.4, axis: 'z', h0: 0.4, h1: 0 }],
    bumps: [{ x: 0.4, z: 2.4, r: 0.35, h: 0.14 }, { x: -0.5, z: 3.2, r: 0.4, h: 0.16 }, { x: 0.3, z: 4.2, r: 0.4, h: 0.15 }, { x: -0.2, z: 5.0, r: 0.35, h: 0.12 }],
    inner: [[[-1.2, 6.0], [0.5, 6.0]]], posts: [C4_MAN(-0.05, 7.5), C4_MAN(-0.6, 8.45)], movers: [C4_BALL(0.1, 5.6, 0.8, 5.6, 2.8)] },
  /* 16. twin bowls: off the deck, round two icy avalanche bowls, past a rolling snowball */
  { par: 4, sol: [], tee: [0, 0.5], cup: [-0.9, 7.2], shape: rect(-1.6, 0, 1.6, 8),
    tiers: [{ poly: rect(-1.6, 0, 1.6, 1.6), h: 0.25 }],
    bumps: [{ x: -0.7, z: 3.2, r: 0.7, h: -0.3 }, { x: 0.7, z: 4.6, r: 0.7, h: -0.3 }, { x: -0.9, z: 7.2, r: 0.55, h: 0.1 }], inner: [[[-1.6, 6.3], [0.2, 6.3]]],
    zones: [{ surf: 'ice', poly: rect(-1.6, 1.6, 1.6, 5.6) }], movers: [C4_BALL(0.45, 5.75, 1.25, 5.75, 3.0)] },
  /* 17. ski lift: ride the narrow lift ramp, beat the bar at the top, drop to the frozen lake and go round */
  { par: 5, sol: [], tee: [-0.6, 0.5], cup: [-0.7, 9.0], aim0: 20, shape: rect(-1.4, 0, 1.4, 10),
    ramps: [{ x0: 0.45, z0: 2.4, x1: 1.25, z1: 4.4, axis: 'z', h0: 0, h1: 0.4 }], tiers: [{ poly: rect(-1.4, 4.4, 1.4, 6.4), h: 0.4 }],
    movers: [{ kind: 'gate', ax: -0.8, az: 4.8, bx: 0.8, bz: 4.8, len: 0.35, ang: 90, period: 3.4, phase: 0, look: 'lift' }],
    inner: [[[-1.4, 7.6], [0.5, 7.6]]],
    zones: [{ surf: 'water', poly: C4_POOL(0.35, 8.95, 0.35, 0.35) }, { surf: 'ice', poly: rect(-1.4, 6.4, 1.4, 7.6) }],
    bumps: [{ x: -0.7, z: 9.0, r: 0.55, h: 0.08 }] },
  /* 18. the peak: tee off the summit, down the ice chute, across the mogul terrace, drop to the
     ice shelf and drop again to the cup by the lake. Off-floor tiers keep the outline walls level. */
  { par: 5, sol: [], tee: [0, 0.5], cup: [4.3, 1.2], aim0: 0,
    shape: [[-0.7, 0], [0.7, 0], [0.7, 5.2], [1.9, 5.2], [1.9, 4.0], [1.9, 0], [5, 0], [5, 2.6], [3.3, 2.6], [3.3, 4.0], [3.3, 6.8], [-0.7, 6.8]],
    tiers: [{ poly: rect(-1.2, -0.2, 1.3, 2.4), h: 0.9 }, { poly: rect(-1.2, 5.2, 3.8, 7.3), h: 0.55 }, { poly: rect(1.3, 2.6, 3.8, 5.2), h: 0.25 }],
    ramps: [{ x0: -1.2, z0: 2.4, x1: 1.3, z1: 5.2, axis: 'z', h0: 0.9, h1: 0.55 }],
    zones: [{ surf: 'ice', poly: rect(-0.7, 2.4, 0.7, 5.2) }, { surf: 'ice', poly: rect(1.9, 2.6, 3.3, 5.2) }, { surf: 'water', poly: C4_POOL(2.6, 0.9, 0.35, 0.3) }],
    bumps: [{ x: 0.2, z: 6.1, r: 0.3, h: 0.1 }, { x: 4.3, z: 1.2, r: 0.55, h: 0.1 }], posts: [C4_MAN(2.3, 3.6), C4_MAN(2.9, 4.4)],
    movers: [C4_BALL(1.2, 5.56, 1.2, 6.44, 2.4)] },
] });
