/* world 4, course 14, snow peak, the back bowls: more intricate than course 4. Terraces that step
   down the mountain, ice caves (tubes) that cut through the snowbanks, ski-lift bars guarding the
   decks, rolling snowballs and a bobsled run that rides itself home. */
const C14_MAN = (x, z, r = 0.16) => ({ x, z, r, top: 0.4, look: 'snowman' });
const C14_BALL = (ax, az, bx, bz, period, phase = 0, r = 0.17) => ({ kind: 'slide', ax, az, bx, bz, r, period, phase, look: 'snowball' });
const C14_LIFT = (ax, az, bx, bz, len, ang, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'lift' });
/* an open-water hole in the ice: a rough n-gon (deterministic, no randomness) */
const C14_POOL = (cx, cz, rx, rz = rx, n = 10) => Array.from({ length: n }, (_, i) => {
  const a = i * 2 * Math.PI / n, k = 1 + 0.08 * Math.cos(3 * a);
  return [+(cx + Math.sin(a) * rx * k).toFixed(3), +(cz + Math.cos(a) * rz * k).toFixed(3)];
});
registerWorld(14, { holes: [
  /* 1. first chair: off the lift deck, down the ramp, over the ice to the cup on a drift */
  { par: 2, sol: [[0,0.76,0]], tee: [0, 0.5], cup: [0, 5.7], shape: rect(-0.7, 0, 0.7, 6.6),
    tiers: [{ poly: rect(-0.7, 0, 0.7, 1.4), h: 0.2 }], ramps: [{ x0: -0.7, z0: 1.4, x1: 0.7, z1: 2.4, axis: 'z', h0: 0.2, h1: 0 }],
    zones: [{ surf: 'ice', poly: rect(-0.7, 2.4, 0.7, 4.4) }], bumps: [{ x: 0, z: 5.7, r: 0.6, h: 0.1 }], posts: [C14_MAN(0.32, 3.4)] },
  /* 2. the back bowl green: a long open green in two broad tiers that lean opposite ways, joined by a
     gentle bank; a low ridge on the front tier and a swale short of the cup */
  { par: 3, sol: [[0,0.84,0]], tee: [0.6, 0.5], cup: [-0.9, 9.4], shape: rect(-2, 0, 2, 10.5),
    tiers: [{ poly: rect(-2, 0, 2, 4.2), h: 0, sx: -0.012 }, { poly: rect(-2, 5.4, 2, 10.5), h: 0.13, sx: 0.012 }],
    ramps: [{ x0: -2, z0: 4.2, x1: 2, z1: 5.4, axis: 'z', h0: 0, h1: 0.13 }],
    bumps: [{ x: 0.9, z: 2.6, r: 1.3, h: 0.12 }, { x: -0.4, z: 7.6, r: 1.2, h: -0.09 }, { x: 1.2, z: 8.8, r: 1.0, h: 0.07 }] },
  /* 3. ice cave: the cave cuts under the snowbank and fires you at the ramp, or go round by the gap */
  { par: 3, sol: [[66,1,0]], tee: [0, 0.5], cup: [-1.0, 5.8], aim0: 330, shape: rect(-1.6, 0, 1.6, 6.6), inner: [[[-1.6, 3.2], [0.9, 3.2]]],
    tubes: [{ a: [-1.0, 2.5], b: [-0.2, 3.7], dir: 330 }], posts: [C14_MAN(-0.4, 1.5)],
    tiers: [{ poly: rect(-1.6, 5.2, 1.6, 6.6), h: 0.2 }], ramps: [{ x0: -1.6, z0: 4.5, x1: 0.2, z1: 5.2, axis: 'z', h0: 0, h1: 0.2 }],
    zones: [{ surf: 'ice', poly: rect(-1.6, 3.2, 1.6, 4.5) }] },
  /* 4. lift line: beat the lift bar through the gap, slip between the snowballs, climb to the deck */
  { par: 3, sol: [[48,0.96,0]], tee: [0, 0.5], cup: [-0.35, 6.9], shape: rect(-1, 0, 1, 7.8), inner: [[[-1, 2.4], [-0.3, 2.4]], [[0.3, 2.4], [1, 2.4]]],
    movers: [C14_LIFT(-0.44, 2.7, 0.44, 2.7, 0.35, 90, 3.0), C14_BALL(-0.6, 4.2, 0.6, 4.2, 2.8, 1)],
    zones: [{ surf: 'fast', poly: rect(-1, 3.0, 1, 5.0) }],
    ramps: [{ x0: -1, z0: 5.0, x1: 1, z1: 5.9, axis: 'z', h0: 0, h1: 0.25 }], tiers: [{ poly: rect(-1, 5.9, 1, 7.8), h: 0.25 }], posts: [C14_MAN(0.3, 6.6)] },
  /* 5. three terraces: drop through the gap in each snow fence, terrace by terrace, to the cup */
  { par: 3, sol: [[348,0.92,0]], tee: [0.6, 0.5], cup: [-0.5, 6.3], shape: rect(-1.2, 0, 1.2, 7.2),
    inner: [[[-1.2, 2.2], [-0.2, 2.2]], [[0.45, 2.2], [1.2, 2.2]], [[-0.4, 4.6], [1.2, 4.6]]],
    tiers: [{ poly: rect(-1.2, 0, 1.2, 2.2), h: 0.4 }, { poly: rect(-1.2, 2.2, 1.2, 4.6), h: 0.2 }],
    zones: [{ surf: 'ice', poly: rect(-1.2, 2.2, 1.2, 4.6) }], bumps: [{ x: 0.6, z: 3.4, r: 0.35, h: 0.1 }, { x: -0.5, z: 6.3, r: 0.6, h: 0.08 }] },
  /* 6. bobsled run: the push-start booster fires you down the chute, round the banked turn at the
     top and along the back straight into the collector drain; its cave spits you sideways into the
     big drain, which spirals you round and down into a second cave, which feeds the cup drain. A
     good putt rides the whole thing in. */
  { par: 3, auto: true, sol: [[0, 0.6, 0]], tee: [0, 0.5], cup: [4.15, 1.9], aim0: 0, shape: rect(-0.5, 0, 5.3, 5.6),
    inner: [[[0.5, 0], [0.5, 4.2], [5.3, 4.2]], [[-0.5, 4.9], [0.2, 5.6]]],
    zones: [{ surf: 'fast', push: [0, 1.2], poly: rect(-0.5, 1.0, 0.5, 3.6) }],
    drains: [{ x: 4.5, z: 4.9, r: 0.8, depth: 0.22, flat: 0.12 }, { x: 1.95, z: 1.9, r: 1.1, depth: 0.3, flat: 0.12 }, { x: 4.15, z: 1.9, r: 1.0, depth: 0.25 }],
    tubes: [{ a: [4.5, 4.9], b: [0.8, 1.9], dir: 40, keep: 0, add: 1.2 }, { a: [1.95, 1.9], b: [4.15, 0.78], dir: 40, keep: 0, add: 1.0 }] },
  /* 7. pond shelf: drop off the deck past the open water, then ride the ramp or the snow cave up to the shelf */
  { par: 3, sol: [[6,0.76,0]], tee: [0, 0.5], cup: [0.6, 6.5], shape: rect(-1.4, 0, 1.4, 7.2),
    tiers: [{ poly: rect(-1.4, 0, 1.4, 2), h: 0.3 }, { poly: rect(-1.4, 5.4, 1.4, 7.2), h: 0.22 }],
    ramps: [{ x0: 0.4, z0: 4.6, x1: 1.4, z1: 5.4, axis: 'z', h0: 0, h1: 0.22 }],
    zones: [{ surf: 'water', poly: C14_POOL(0, 3.3, 0.6, 0.45) }, { surf: 'ice', poly: rect(-1.4, 2, 1.4, 4.6) }],
    tubes: [{ a: [-0.8, 5.0], b: [-0.8, 6.2], dir: 60 }], posts: [C14_MAN(-0.1, 6.9)] },
  /* 8. avalanche bowl: through the icy bowl, then the narrow ramp past the snowball or the wide one round the side */
  { par: 3, sol: [[2.03,0.84,0]], tee: [0, 0.5], cup: [-0.6, 7.4], shape: rect(-1.4, 0, 1.4, 8.2),
    tiers: [{ poly: rect(-1.4, 0, 1.4, 1.8), h: 0.3 }, { poly: rect(-1.4, 6.2, 1.4, 8.2), h: 0.2 }],
    ramps: [{ x0: -0.3, z0: 5.4, x1: 0.3, z1: 6.2, axis: 'z', h0: 0, h1: 0.2 }, { x0: 0.75, z0: 5.4, x1: 1.4, z1: 6.2, axis: 'z', h0: 0, h1: 0.2 }],
    bumps: [{ x: 0, z: 3.9, r: 1.0, h: -0.3 }], zones: [{ surf: 'fast', poly: C14_POOL(0, 3.9, 1.1, 1.1, 12) }],
    movers: [C14_BALL(-0.7, 6.7, 0.7, 6.7, 2.6)], posts: [C14_MAN(0.6, 7.5)] },
  /* 9. lift tower: up the lift ramp and past the bar, or thread the snow cave straight onto the deck; then down to the lake */
  { par: 4, sol: [[4,0.96,0.5]], tee: [0, 0.5], cup: [0.6, 8.4], shape: rect(-1.4, 0, 1.4, 9.2),
    ramps: [{ x0: -0.45, z0: 2.0, x1: 0.45, z1: 3.8, axis: 'z', h0: 0, h1: 0.35 }], tiers: [{ poly: rect(-1.4, 3.8, 1.4, 5.8), h: 0.35 }],
    movers: [C14_LIFT(-0.8, 4.3, 0.8, 4.3, 0.35, 90, 3.2)], tubes: [{ a: [-1.0, 1.4], b: [-0.9, 5.1], dir: 0 }],
    zones: [{ surf: 'water', poly: C14_POOL(-0.6, 7.9, 0.4, 0.35) }, { surf: 'ice', poly: rect(-1.4, 5.8, 1.4, 7.2) }],
    bumps: [{ x: 0.6, z: 8.4, r: 0.5, h: 0.08 }], posts: [C14_MAN(0, 8.7)] },
  /* 10. switchback: up the first run, round the banked turn, down the ice, round again and past the snowball;
     or find the side cave in the first run */
  { par: 4, sol: [[26,1,0]], tee: [0, 0.5], cup: [2.4, 5.4], aim0: 0, shape: rect(-0.6, 0, 3, 6.3), inner: [[[0.6, 0], [0.6, 5.0]], [[1.8, 6.3], [1.8, 1.2]]],
    ramps: [{ x0: -0.6, z0: 5.7, x1: 1.8, z1: 6.3, axis: 'z', h0: 0, h1: 0.2 }, { x0: 0.6, z0: 0, x1: 3, z1: 0.6, axis: 'z', h0: 0.2, h1: 0 }],
    zones: [{ surf: 'ice', poly: rect(0.6, 0.6, 1.8, 5.7) }], tubes: [{ a: [-0.3, 3.6], b: [2.4, 1.0], dir: 0 }],
    movers: [C14_BALL(2.1, 3.4, 2.7, 3.4, 2.4, 0, 0.15)], bumps: [{ x: 2.4, z: 5.4, r: 0.5, h: 0.08 }] },
  /* 11. the long traverse: a broad green that kinks right as it climbs away, leaning hard left the
     whole way; a wide swale in the middle and a ridge on the left catch a careless lag */
  { par: 3, sol: [[12,0.84,0]], tee: [-0.8, 0.5], cup: [1.6, 11.0], aim0: 8, shape: [[-1.8, 0], [1.8, 0], [2.6, 6], [2.6, 12], [-1.0, 12], [-1.8, 6]],
    tiers: [{ poly: [[-1.8, 0], [1.8, 0], [2.6, 6], [2.6, 12], [-1.0, 12], [-1.8, 6]], h: 0.04, sx: 0.016, sz: 0.008 }],
    bumps: [{ x: 0.3, z: 5.6, r: 2.0, h: -0.12 }, { x: 1.8, z: 3.2, r: 1.1, h: 0.14 }, { x: -0.2, z: 9.0, r: 1.2, h: 0.1 }] },
  /* 12. cave network: three chambers; walk the gaps round or take a cave from either chamber to the cup */
  { par: 3, sol: [[198,0.92,0]], tee: [0.4, 0.5], cup: [0.2, 6.4], aim0: 30, shape: rect(-1.6, 0, 1.6, 7.2), inner: [[[-1.6, 2.6], [1.0, 2.6]], [[-1.0, 4.6], [1.6, 4.6]]],
    tubes: [{ a: [-1.0, 1.9], b: [-0.4, 5.3], dir: 20 }, { a: [1.0, 3.9], b: [1.0, 5.3], dir: 340 }],
    zones: [{ surf: 'ice', poly: rect(-1.6, 4.6, 1.6, 7.2) }], bumps: [{ x: 0.2, z: 6.4, r: 0.55, h: 0.1 }], posts: [C14_MAN(-0.5, 6.6), C14_MAN(0.0, 1.5)] },
  /* 13. avalanche terraces: four terraces down the mountain, each snow fence open at a different end */
  { par: 4, crazy: true, sol: [[56.95,0.96,0],[346.6,0.78,1]], tee: [0, 0.5], cup: [0.5, 8.2], shape: rect(-1.4, 0, 1.4, 9),
    inner: [[[-1.4, 1.8], [0.6, 1.8]], [[-0.6, 4.0], [1.4, 4.0]], [[-1.4, 6.2], [-0.3, 6.2]], [[0.3, 6.2], [1.4, 6.2]]],
    tiers: [{ poly: rect(-1.4, 0, 1.4, 1.8), h: 0.42 }, { poly: rect(-1.4, 1.8, 1.4, 4.0), h: 0.28 }, { poly: rect(-1.4, 4.0, 1.4, 6.2), h: 0.14 }],
    zones: [{ surf: 'water', poly: C14_POOL(0.2, 3.0, 0.4, 0.35) }, { surf: 'ice', poly: rect(-1.4, 1.8, 1.4, 4.0) }],
    bumps: [{ x: -0.6, z: 5.0, r: 0.3, h: 0.1 }, { x: 0.5, z: 5.3, r: 0.32, h: 0.12 }, { x: 0.5, z: 8.2, r: 0.5, h: 0.08 }],
    movers: [C14_BALL(-0.8, 7.2, 0.8, 7.2, 2.8)] },
  /* 14. cave chain: three walled chambers up the slope; squeeze through the gap at the end of each snow fence or take
     the caves, and a lift bar guards the middle chamber */
  { par: 4, sol: [[162,1,2],[0,0.04,0]], tee: [0.5, 0.5], cup: [-0.6, 7.6], aim0: 330, shape: rect(-1.4, 0, 1.4, 8.4), inner: [[[-1.4, 2.4], [0.8, 2.4]], [[-0.8, 5.2], [1.4, 5.2]]],
    tubes: [{ a: [-0.9, 1.8], b: [-0.9, 2.9], dir: 0 }, { a: [0.9, 4.6], b: [0.9, 5.7], dir: 330 }],
    movers: [C14_LIFT(-0.8, 3.8, 0.8, 3.8, 0.3, 90, 3.0)],
    zones: [{ surf: 'water', poly: C14_POOL(0.3, 6.8, 0.35) }, { surf: 'ice', poly: rect(-1.4, 5.2, 1.4, 8.4) }], posts: [C14_MAN(-0.2, 1.2), C14_MAN(-1.0, 6.9)] },
  /* 15. half-pipe: off the summit into the banked half-pipe, through the snowmen and the snowball, drop to the lake */
  { par: 4, crazy: true, sol: [[24,0.6,0]], tee: [0, 0.5], cup: [0.4, 7.9], shape: rect(-1.2, 0, 1.2, 8.8),
    tiers: [{ poly: rect(-1.2, 0, 1.2, 1.4), h: 0.42 }, { poly: rect(-1.2, 1.4, 1.2, 6.0), h: 0.2 }],
    ramps: [{ x0: 0.6, z0: 1.4, x1: 1.2, z1: 6.0, axis: 'x', h0: 0.2, h1: 0.42 }, { x0: -1.2, z0: 1.4, x1: -0.6, z1: 6.0, axis: 'x', h0: 0.42, h1: 0.2 }],
    posts: [C14_MAN(-0.3, 2.8), C14_MAN(0.3, 3.8), C14_MAN(-0.2, 4.8), C14_MAN(0.85, 8.3)], movers: [C14_BALL(-0.4, 5.5, 0.4, 5.5, 2.6)],
    zones: [{ surf: 'water', poly: C14_POOL(-0.5, 7.4, 0.35, 0.3) }, { surf: 'ice', poly: rect(-1.2, 6.0, 1.2, 7.0) }] },
  /* 16. the glacier green: three long tiers stepping down the mountain on gentle banks, each tilted
     its own way, and a swale on the last one in front of the cup */
  { par: 3, sol: [[6,1,0]], tee: [0, 0.5], cup: [0.9, 11.2], shape: rect(-1.8, 0, 1.8, 12.2),
    tiers: [{ poly: rect(-1.8, 0, 1.8, 3.8), h: 0.26, sx: 0.01 }, { poly: rect(-1.8, 5.0, 1.8, 7.6), h: 0.13, sx: -0.012 }, { poly: rect(-1.8, 8.8, 1.8, 12.2), h: 0, sx: 0.01 }],
    ramps: [{ x0: -1.8, z0: 3.8, x1: 1.8, z1: 5.0, axis: 'z', h0: 0.26, h1: 0.13 }, { x0: -1.8, z0: 7.6, x1: 1.8, z1: 8.8, axis: 'z', h0: 0.13, h1: 0 }],
    bumps: [{ x: -0.6, z: 2.0, r: 1.1, h: 0.1 }, { x: 0.6, z: 6.3, r: 1.2, h: 0.1 }, { x: 0.1, z: 10.0, r: 1.0, h: -0.08 }] },
  /* 17. lift chain: up the lift ramp past the first bar, up the side ramp past the second, off the top deck to the lake */
  { par: 5, crazy: true, sol: [[350,1,0],[0,0.25,0]], tee: [0, 0.5], cup: [-0.5, 9.6], shape: rect(-1.4, 0, 1.4, 10.4),
    ramps: [{ x0: -0.45, z0: 1.6, x1: 0.45, z1: 3.0, axis: 'z', h0: 0, h1: 0.2 }, { x0: -1.4, z0: 5.2, x1: -0.5, z1: 6.4, axis: 'z', h0: 0.2, h1: 0.42 }],
    tiers: [{ poly: rect(-1.4, 3.0, 1.4, 6.4), h: 0.2 }, { poly: rect(-1.4, 6.4, 1.4, 8.0), h: 0.42 }],
    movers: [C14_LIFT(-0.8, 3.5, 0.8, 3.5, 0.35, 90, 3.0), C14_LIFT(-0.8, 6.9, 0.8, 6.9, 0.35, 90, 2.6, 1.5), C14_BALL(0.0, 8.7, 1.0, 8.7, 2.4)],
    zones: [{ surf: 'ice', poly: rect(-1.4, 6.4, 1.4, 8.0) }, { surf: 'water', poly: C14_POOL(0.6, 9.7, 0.35, 0.3) }], posts: [C14_MAN(0.6, 4.6)] },
  /* 18. the summit run: tee off the summit, down the ice chute, over the mogul terrace, then drop to the lake or take
     the cave down to it; the cup sits by the water past a rolling snowball */
  { par: 5, crazy: true, sol: [[144,0.6,0]], tee: [0, 0.5], cup: [0.6, 10.0], shape: rect(-1.6, 0, 1.6, 11),
    inner: [[[-1.6, 2.6], [-0.5, 4.4]], [[1.6, 2.6], [0.5, 4.4]]],
    tiers: [{ poly: rect(-1.6, 0, 1.6, 1.4), h: 0.42 }, { poly: rect(-1.6, 4.4, 1.6, 7.0), h: 0.22 }],
    ramps: [{ x0: -1.6, z0: 1.4, x1: 1.6, z1: 4.4, axis: 'z', h0: 0.42, h1: 0.22 }],
    zones: [{ surf: 'ice', poly: rect(-1.6, 1.4, 1.6, 4.4) }, { surf: 'water', poly: C14_POOL(-0.6, 10.0, 0.4, 0.35) }],
    bumps: [{ x: 0.5, z: 5.3, r: 0.32, h: 0.12 }, { x: -0.4, z: 6.0, r: 0.3, h: 0.1 }, { x: 0.9, z: 6.4, r: 0.28, h: 0.1 }],
    tubes: [{ a: [-1.1, 6.4], b: [-1.0, 8.4], dir: 45 }], movers: [C14_BALL(0.0, 9.0, 1.2, 9.0, 2.6)], posts: [C14_MAN(1.2, 10.4)] },
] });
