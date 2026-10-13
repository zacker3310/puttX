/* world 4, course 24, snow peak, the summit circuit: the world's masterpiece. Stacked terraces and
   switchback stairs, chained ice caves, lift bars guarding every drop, sinkholes with caves at the
   bottom and a grand bobsled run that rides itself all the way home. */
const C24_MAN = (x, z, r = 0.16) => ({ x, z, r, top: 0.4, look: 'snowman' });
const C24_BALL = (ax, az, bx, bz, period, phase = 0, r = 0.16) => ({ kind: 'slide', ax, az, bx, bz, r, period, phase, look: 'snowball' });
const C24_LIFT = (ax, az, bx, bz, len, ang, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'lift' });
/* an open-water hole in the ice: a rough n-gon (deterministic, no randomness) */
const C24_POOL = (cx, cz, rx, rz = rx, n = 10) => Array.from({ length: n }, (_, i) => {
  const a = i * 2 * Math.PI / n, k = 1 + 0.08 * Math.cos(3 * a);
  return [+(cx + Math.sin(a) * rx * k).toFixed(3), +(cz + Math.cos(a) * rz * k).toFixed(3)];
});
registerWorld(24, { holes: [
  /* 1. gondola deck: off the deck, over the ice past the snowball, up the ramp to the cup shelf */
  { par: 3, sol: [[4,1,0]], tee: [0, 0.5], cup: [0.4, 6.7], shape: rect(-1, 0, 1, 7.6),
    tiers: [{ poly: rect(-1, 0, 1, 1.6), h: 0.3 }, { poly: rect(-1, 5.0, 1, 7.6), h: 0.22 }],
    ramps: [{ x0: -1, z0: 4.2, x1: 1, z1: 5.0, axis: 'z', h0: 0, h1: 0.22 }],
    zones: [{ surf: 'ice', poly: rect(-1, 1.6, 1, 4.2) }], movers: [C24_BALL(-0.55, 3.0, 0.55, 3.0, 2.8)], posts: [C24_MAN(-0.3, 6.3)] },
  /* 2. switchback stair: up the first ramp through the fence, across, up the second ramp to the top terrace */
  { par: 3, sol: [[44,0.64,0],[310,1,0]], tee: [-0.6, 0.5], cup: [0.6, 5.8], aim0: 20, shape: rect(-1.4, 0, 1.4, 6.6),
    inner: [[[-1.4, 2.2], [0.6, 2.2]], [[-0.6, 4.4], [1.4, 4.4]]],
    tiers: [{ poly: rect(-1.4, 2.2, 1.4, 4.4), h: 0.2 }, { poly: rect(-1.4, 4.4, 1.4, 6.6), h: 0.4 }],
    ramps: [{ x0: 0.6, z0: 1.6, x1: 1.4, z1: 2.8, axis: 'z', h0: 0, h1: 0.2 }, { x0: -1.4, z0: 3.8, x1: -0.6, z1: 5.0, axis: 'z', h0: 0.2, h1: 0.4 }],
    bumps: [{ x: 0.6, z: 5.8, r: 0.5, h: 0.06 }], posts: [C24_MAN(0, 3.3)] },
  /* 3. cave relay: the first cave fires you across the middle chamber into the second; the lift bar decides */
  { par: 3, sol: [[30,0.68,0],[0,0.44,0]], tee: [0, 0.5], cup: [0.4, 6.3], aim0: 50, shape: rect(-1.6, 0, 1.6, 7.2), inner: [[[-1.6, 2.4], [1.6, 2.4]], [[-1.6, 4.8], [1.6, 4.8]]],
    tubes: [{ a: [0.9, 1.9], b: [-0.9, 3.0], dir: 90 }, { a: [0.9, 3.0], b: [-0.9, 5.4], dir: 45 }],
    movers: [C24_LIFT(0, 3.0, 0, 4.0, 0.3, 0, 2.8)], zones: [{ surf: 'ice', poly: rect(-1.6, 4.8, 1.6, 7.2) }],
    bumps: [{ x: 0.4, z: 6.3, r: 0.5, h: 0.08 }], posts: [C24_MAN(-0.2, 6.6), C24_MAN(-0.3, 1.4)] },
  /* 4. drop gates: the deck's snow fence has two gaps and a lift bar sliding across them; drop to the lake */
  { par: 3, sol: [[154,1,0.5]], tee: [0, 0.5], cup: [-0.5, 5.8], shape: rect(-1.4, 0, 1.4, 6.8),
    inner: [[[-1.4, 3.0], [-0.9, 3.0]], [[-0.3, 3.0], [0.3, 3.0]], [[0.9, 3.0], [1.4, 3.0]]],
    tiers: [{ poly: rect(-1.4, 0, 1.4, 3.0), h: 0.35 }], movers: [C24_LIFT(-0.6, 2.75, 0.6, 2.75, 0.3, 90, 3.0)],
    zones: [{ surf: 'water', poly: C24_POOL(0.5, 5.0, 0.4, 0.35) }, { surf: 'ice', poly: rect(-1.4, 3.0, 1.4, 4.4) }],
    bumps: [{ x: -0.5, z: 5.8, r: 0.5, h: 0.08 }], posts: [C24_MAN(0.3, 6.2)] },
  /* 5. sinkhole lift: roll into the sinkhole and its cave lifts you to the high shelf; drop off the shelf to the cup */
  { par: 3, sol: [[335,1,0],[100,1,0]], tee: [0, 0.5], cup: [0.9, 2.0], aim0: 0, shape: rect(-1.4, 0, 1.4, 6.6), inner: [[[0.2, 0], [0.2, 3.4]]],
    tiers: [{ poly: rect(-1.4, 4.6, 1.4, 6.6), h: 0.3 }], ramps: [{ x0: -1.4, z0: 3.8, x1: -0.4, z1: 4.6, axis: 'z', h0: 0, h1: 0.3 }],
    bumps: [{ x: -0.6, z: 2.6, r: 0.6, h: -0.25 }, { x: 0.9, z: 2.0, r: 0.5, h: 0.06 }], tubes: [{ a: [-0.6, 2.6], b: [-0.4, 5.6], dir: 90 }],
    zones: [{ surf: 'ice', poly: rect(-1.4, 4.6, 1.4, 6.6) }], posts: [C24_MAN(0.9, 5.6)] },
  /* 6. lift tower: up the lift ramp past the first bar or the cave onto the deck, then through the fence gap past the second bar, down to the lake */
  { par: 4, sol: [[0,0.917,0],[20,1,0]], tee: [0, 0.5], cup: [-0.6, 8.6], shape: rect(-1.4, 0, 1.4, 9.4), inner: [[[-1.4, 6.0], [-0.3, 6.0]], [[0.3, 6.0], [1.4, 6.0]]],
    ramps: [{ x0: -0.45, z0: 2.0, x1: 0.45, z1: 3.6, axis: 'z', h0: 0, h1: 0.3 }], tiers: [{ poly: rect(-1.4, 3.6, 1.4, 6.0), h: 0.3 }],
    movers: [C24_LIFT(-0.8, 4.0, 0.8, 4.0, 0.35, 90, 3.2), C24_LIFT(-0.5, 5.75, 0.5, 5.75, 0.25, 90, 2.6, 1)], tubes: [{ a: [1.0, 1.4], b: [0.9, 4.9], dir: 330 }],
    zones: [{ surf: 'water', poly: C24_POOL(0.5, 8.0, 0.4, 0.35) }, { surf: 'ice', poly: rect(-1.4, 6.0, 1.4, 7.4) }],
    bumps: [{ x: -0.6, z: 8.6, r: 0.5, h: 0.08 }], posts: [C24_MAN(0.1, 9.0)] },
  /* 7. terraced switchback: up the first run, across the top, down the icy second run, across the bottom and up the third run past the snowball */
  { par: 4, crazy: true, sol: [], tee: [0, 0.5], cup: [2.4, 5.7], aim0: 0, shape: rect(-0.6, 0, 3, 6.6), inner: [[[0.6, 0], [0.6, 5.4]], [[1.8, 6.6], [1.8, 1.2]]],
    ramps: [{ x0: -0.6, z0: 1.4, x1: 0.6, z1: 4.0, axis: 'z', h0: 0, h1: 0.3 }, { x0: 0.6, z0: 1.2, x1: 1.8, z1: 4.0, axis: 'z', h0: 0.1, h1: 0.3 }, { x0: 1.8, z0: 1.2, x1: 3, z1: 2.0, axis: 'z', h0: 0.1, h1: 0.2 }],
    tiers: [{ poly: rect(-0.6, 4.0, 1.8, 6.6), h: 0.3 }, { poly: rect(0.6, 0, 3, 1.2), h: 0.1 }, { poly: rect(1.8, 2.0, 3, 6.6), h: 0.2 }],
    zones: [{ surf: 'ice', poly: rect(0.6, 1.2, 1.8, 4.0) }], movers: [C24_BALL(2.06, 3.6, 2.74, 3.6, 2.4, 0, 0.14)], bumps: [{ x: 2.4, z: 5.7, r: 0.5, h: 0.06 }] },
  /* 8. crevasse: cross one of the two ice bridges over the crevasse, then up the narrow ramp to the cup shelf */
  { par: 3, sol: [[345,0.917,0]], tee: [0, 0.5], cup: [0.6, 7.0], aim0: 0,
    floors: [rect(-0.8, 0, 0.8, 3.0), rect(-0.8, 3.0, -0.4, 4.2), rect(0.4, 3.0, 0.8, 4.2), rect(-1.2, 4.2, 1.2, 7.8)],
    walls: [[[-0.8, 4.2], [-0.8, 0], [0.8, 0], [0.8, 4.2]], [[-0.8, 4.2], [-1.2, 4.2], [-1.2, 7.8], [1.2, 7.8], [1.2, 4.2], [0.8, 4.2]]],
    tiers: [{ poly: rect(-1.2, 6.2, 1.2, 7.8), h: 0.2 }], ramps: [{ x0: -0.3, z0: 5.6, x1: 0.3, z1: 6.2, axis: 'z', h0: 0, h1: 0.2 }],
    zones: [{ surf: 'ice', poly: rect(-0.8, 3.0, -0.4, 4.2) }, { surf: 'ice', poly: rect(0.4, 3.0, 0.8, 4.2) }],
    bumps: [{ x: 0.6, z: 5.0, r: 0.3, h: 0.1 }], posts: [C24_MAN(-0.5, 7.2)] },
  /* 9. the grand bobsled: four runs and three caves, down, back, up and out into the funnel bowl. A good putt rides it all. */
  { par: 4, auto: true, sol: [[0, 0.85, 0]], tee: [0, 0.5], cup: [4.2, 4.2], aim0: 0, shape: rect(-0.5, 0, 5.6, 6.0),
    inner: [[[0.5, 0], [0.5, 6.0]], [[1.5, 0], [1.5, 6.0]], [[2.5, 0], [2.5, 6.0]]],
    tiers: [{ poly: rect(-0.5, 0, 0.5, 1.2), h: 0.42 }, { poly: rect(-0.5, 4.2, 0.5, 6.0), h: 0.22 }, { poly: rect(0.5, 4.4, 1.5, 6.0), h: 0.22 }, { poly: rect(1.5, 4.4, 2.5, 6.0), h: 0.2 }],
    ramps: [{ x0: -0.5, z0: 1.2, x1: 0.5, z1: 4.2, axis: 'z', h0: 0.42, h1: 0.22 }, { x0: 0.5, z0: 1.8, x1: 1.5, z1: 4.4, axis: 'z', h0: 0, h1: 0.22 },
      { x0: 1.5, z0: 1.4, x1: 2.5, z1: 4.4, axis: 'z', h0: 0, h1: 0.2 }],
    zones: [{ surf: 'ice', poly: rect(-0.5, 4.2, 0.5, 6.0) }, { surf: 'ice', poly: rect(0.5, 0, 1.5, 1.8) }],
    tubes: [{ a: [0, 4.5], b: [1.0, 5.3], dir: 180, keep: 0, add: 1.6 }, { a: [1.0, 1.2], b: [2.0, 0.6], dir: 0, keep: 0, add: 3.4 },
      { a: [2.0, 5.2], b: [4.2, 0.6], dir: 0, keep: 0, add: 2.3 }],
    bumps: [{ x: 4.2, z: 4.2, r: 0.8, h: -0.2 }], posts: [C24_MAN(3.2, 2.4), C24_MAN(5.2, 2.4)] },
  /* 10. gate terraces: four terraces, each snow fence open at one gap; lift bars slide across the top two */
  { par: 4, sol: [], tee: [0, 0.5], cup: [0.4, 8.8], shape: rect(-1.4, 0, 1.4, 9.6),
    inner: [[[-1.4, 2.6], [-0.3, 2.6]], [[0.3, 2.6], [1.4, 2.6]], [[-1.4, 5.2], [0.5, 5.2]], [[1.1, 5.2], [1.4, 5.2]], [[-1.4, 7.6], [-1.1, 7.6]], [[-0.5, 7.6], [1.4, 7.6]]],
    tiers: [{ poly: rect(-1.4, 0, 1.4, 2.6), h: 0.42 }, { poly: rect(-1.4, 2.6, 1.4, 5.2), h: 0.28 }, { poly: rect(-1.4, 5.2, 1.4, 7.6), h: 0.14 }],
    movers: [C24_LIFT(-0.5, 2.35, 0.5, 2.35, 0.3, 90, 2.8), C24_LIFT(0.2, 4.95, 0.8, 4.95, 0.3, 90, 2.4, 1)],
    zones: [{ surf: 'ice', poly: rect(-1.4, 2.6, 1.4, 5.2) }, { surf: 'water', poly: C24_POOL(-0.3, 6.4, 0.35, 0.3) }],
    bumps: [{ x: 0.6, z: 6.6, r: 0.3, h: 0.1 }, { x: 0.4, z: 8.8, r: 0.5, h: 0.06 }], posts: [C24_MAN(-0.4, 8.9)] },
  /* 11. ski jump: fly the gap off the kicker or creep over the ice bridge, dodge the snowball, climb to the cup shelf */
  { par: 4, sol: [], tee: [0, 0.5], cup: [-0.5, 7.7], aim0: 0,
    floors: [rect(-0.7, 0, 1.7, 3.6), rect(1.1, 3.6, 1.5, 4.4), rect(-1.2, 4.4, 1.8, 8.4)],
    walls: [[[-0.7, 3.6], [-0.7, 0], [1.7, 0], [1.7, 3.6], [1.5, 3.6]], [[1.1, 3.6], [0.7, 3.6], [0.7, 1.6]],
      [[1.5, 4.4], [1.8, 4.4], [1.8, 8.4], [-1.2, 8.4], [-1.2, 4.4], [-0.8, 4.4]], [[0.8, 4.4], [1.1, 4.4]]],
    ramps: [{ x0: -0.7, z0: 2.6, x1: 0.7, z1: 3.6, axis: 'z', h0: 0, h1: 0.25 }, { x0: -1.2, z0: 6.2, x1: 1.8, z1: 6.9, axis: 'z', h0: 0, h1: 0.2 }],
    tiers: [{ poly: rect(-1.2, 6.9, 1.8, 8.4), h: 0.2 }], zones: [{ surf: 'ice', poly: rect(1.1, 3.6, 1.5, 4.4) }],
    movers: [C24_BALL(-0.6, 5.6, 1.2, 5.6, 3.0)], bumps: [{ x: 0.3, z: 4.9, r: 0.25, h: 0.08 }], posts: [C24_MAN(0.4, 7.7)] },
  /* 12. twin chutes: the icy chute past the open water or the mogul chute, onto the terrace, then through the gated fence to the cup */
  { par: 4, sol: [[295,0.667,2],[150,0.84,0]], tee: [0, 0.5], cup: [-0.5, 8.4], shape: rect(-1.4, 0, 1.4, 9.2),
    inner: [[[0, 1.6], [0, 5.6]], [[-1.4, 7.0], [-0.3, 7.0]], [[0.3, 7.0], [1.4, 7.0]]],
    tiers: [{ poly: rect(-1.4, 0, 1.4, 1.4), h: 0.42 }, { poly: rect(-1.4, 5.6, 1.4, 7.0), h: 0.14 }],
    ramps: [{ x0: -1.4, z0: 1.4, x1: 1.4, z1: 5.6, axis: 'z', h0: 0.42, h1: 0.14 }],
    zones: [{ surf: 'water', poly: C24_POOL(-0.7, 3.6, 0.3, 0.35) }, { surf: 'ice', poly: rect(-1.4, 1.4, 0, 5.6) }],
    bumps: [{ x: 0.5, z: 2.6, r: 0.3, h: 0.12 }, { x: 0.9, z: 3.6, r: 0.3, h: 0.12 }, { x: 0.4, z: 4.6, r: 0.3, h: 0.12 }],
    movers: [C24_LIFT(-0.5, 6.75, 0.5, 6.75, 0.25, 90, 2.6)], posts: [C24_MAN(0.4, 8.6)] },
  /* 13. avalanche chain: four terraces, a fence on each edge; or the summit cave that skips straight to the third */
  { par: 4, crazy: true, sol: [], tee: [0, 0.5], cup: [0.5, 8.2], shape: rect(-1.4, 0, 1.4, 9),
    inner: [[[-1.4, 1.8], [0.6, 1.8]], [[-0.6, 4.0], [1.4, 4.0]], [[-1.4, 6.2], [-0.3, 6.2]], [[0.3, 6.2], [1.4, 6.2]]],
    tiers: [{ poly: rect(-1.4, 0, 1.4, 1.8), h: 0.42 }, { poly: rect(-1.4, 1.8, 1.4, 4.0), h: 0.28 }, { poly: rect(-1.4, 4.0, 1.4, 6.2), h: 0.14 }],
    tubes: [{ a: [-1.0, 1.2], b: [-1.0, 4.6], dir: 60 }],
    zones: [{ surf: 'water', poly: C24_POOL(0.2, 3.0, 0.4, 0.35) }, { surf: 'ice', poly: rect(-1.4, 1.8, 1.4, 4.0) }],
    bumps: [{ x: -0.1, z: 5.2, r: 0.3, h: 0.1 }, { x: 0.8, z: 5.3, r: 0.3, h: 0.12 }, { x: 0.5, z: 8.2, r: 0.5, h: 0.06 }],
    movers: [C24_BALL(-0.8, 7.2, 0.8, 7.2, 2.8), C24_LIFT(0.75, 1.55, 1.0, 1.55, 0.2, 90, 2.2)] },
  /* 14. sinkholes: three icy sinkholes with a cave at the bottom of each; one to the cup shelf, two back up the hill */
  { par: 4, sol: [], tee: [0, 0.5], cup: [0.6, 7.6], shape: rect(-1.6, 0, 1.6, 8.4),
    tiers: [{ poly: rect(-1.6, 0, 1.6, 1.6), h: 0.25 }, { poly: rect(-1.6, 6.4, 1.6, 8.4), h: 0.2 }],
    ramps: [{ x0: 0.9, z0: 5.8, x1: 1.6, z1: 6.4, axis: 'z', h0: 0, h1: 0.2 }],
    bumps: [{ x: -0.8, z: 3.0, r: 0.6, h: -0.25 }, { x: 0.7, z: 3.4, r: 0.6, h: -0.25 }, { x: -0.3, z: 4.9, r: 0.6, h: -0.25 }],
    tubes: [{ a: [-0.3, 4.9], b: [-1.0, 7.0], dir: 90 }, { a: [-0.8, 3.0], b: [-1.2, 1.0], dir: 90 }, { a: [0.7, 3.4], b: [1.2, 1.0], dir: 270 }],
    zones: [{ surf: 'ice', poly: rect(-1.6, 1.6, 1.6, 5.8) }], posts: [C24_MAN(1.1, 8.0)] },
  /* 15. lift chain: three decks up the mountain, a lift bar at the top of every ramp, then off the summit deck to the lake */
  { par: 5, crazy: true, sol: [], tee: [0, 0.5], cup: [0.5, 11.0], shape: rect(-1.4, 0, 1.4, 11.8),
    ramps: [{ x0: -0.45, z0: 1.4, x1: 0.45, z1: 2.6, axis: 'z', h0: 0, h1: 0.14 }, { x0: 0.5, z0: 4.4, x1: 1.4, z1: 5.4, axis: 'z', h0: 0.14, h1: 0.28 },
      { x0: -1.4, z0: 7.0, x1: -0.5, z1: 8.0, axis: 'z', h0: 0.28, h1: 0.42 }],
    tiers: [{ poly: rect(-1.4, 2.6, 1.4, 5.4), h: 0.14 }, { poly: rect(-1.4, 5.4, 1.4, 8.0), h: 0.28 }, { poly: rect(-1.4, 8.0, 1.4, 9.4), h: 0.42 }],
    movers: [C24_LIFT(-0.8, 3.0, 0.8, 3.0, 0.35, 90, 3.0), C24_LIFT(-0.8, 5.8, 0.8, 5.8, 0.35, 90, 2.6, 1), C24_LIFT(-0.8, 8.4, 0.8, 8.4, 0.35, 90, 2.8, 2)],
    zones: [{ surf: 'ice', poly: rect(-1.4, 8.0, 1.4, 9.4) }, { surf: 'water', poly: C24_POOL(-0.5, 10.6, 0.35, 0.3) }],
    bumps: [{ x: 0.5, z: 11.0, r: 0.4, h: 0.05 }], posts: [C24_MAN(-0.6, 4.0), C24_MAN(0.6, 7.0)] },
  /* 16. snowball gauntlet: up the ramp between two snowballs, along the ice deck, drop past the third to the cup */
  { par: 4, sol: [], tee: [0, 0.5], cup: [0.5, 8.6], shape: rect(-1.2, 0, 1.2, 9.4),
    ramps: [{ x0: -1.2, z0: 1.6, x1: 1.2, z1: 3.0, axis: 'z', h0: 0, h1: 0.3 }], tiers: [{ poly: rect(-1.2, 3.0, 1.2, 6.4), h: 0.3 }],
    inner: [[[-1.2, 6.4], [-0.4, 6.4]], [[0.3, 6.4], [1.2, 6.4]]],
    movers: [C24_BALL(-0.8, 2.2, 0.8, 2.2, 2.6), C24_BALL(0.8, 4.2, -0.8, 4.2, 3.0, 1), C24_BALL(-0.7, 7.6, 0.7, 7.6, 2.4, 2)],
    zones: [{ surf: 'ice', poly: rect(-1.2, 3.0, 1.2, 6.4) }], posts: [C24_MAN(0.6, 5.4), C24_MAN(-0.5, 8.8)] },
  /* 17. cave maze: four chambers; walk the gaps round or chain the caves through the middle */
  { par: 4, crazy: true, sol: [[45,1,0],[40,0.833,0]], tee: [0, 0.5], cup: [-0.9, 8.0], aim0: 0, shape: rect(-1.6, 0, 1.6, 9.0),
    inner: [[[-1.6, 2.4], [1.0, 2.4]], [[-1.0, 4.6], [1.6, 4.6]], [[-1.6, 6.8], [1.0, 6.8]]],
    tubes: [{ a: [-0.9, 1.8], b: [0.9, 3.0], dir: 0 }, { a: [0.0, 4.0], b: [-0.9, 5.2], dir: 90 }, { a: [0.9, 6.2], b: [0.9, 7.4], dir: 270 }],
    tiers: [{ poly: rect(-1.6, 6.8, 1.6, 9.0), h: 0.15 }], ramps: [{ x0: 1.0, z0: 6.2, x1: 1.6, z1: 7.4, axis: 'z', h0: 0, h1: 0.15 }],
    zones: [{ surf: 'ice', poly: rect(-1.6, 2.4, 1.6, 4.6) }], posts: [C24_MAN(0.3, 1.2), C24_MAN(-0.2, 8.4)], movers: [C24_BALL(-0.4, 5.8, 0.6, 5.8, 2.6)] },
  /* 18. the peak: off the summit, down the ice funnel, over the moguls, through the gated fence or the cave to the lake, and the cup past the snowball */
  { par: 5, crazy: true, sol: [], tee: [0, 0.5], cup: [0.6, 10.6], shape: rect(-1.6, 0, 1.6, 11.6),
    inner: [[[-1.6, 2.6], [-0.5, 4.4]], [[1.6, 2.6], [0.5, 4.4]], [[-1.6, 7.4], [-0.3, 7.4]], [[0.3, 7.4], [1.6, 7.4]]],
    tiers: [{ poly: rect(-1.6, 0, 1.6, 1.4), h: 0.42 }, { poly: rect(-1.6, 4.4, 1.6, 7.4), h: 0.22 }],
    ramps: [{ x0: -1.6, z0: 1.4, x1: 1.6, z1: 4.4, axis: 'z', h0: 0.42, h1: 0.22 }],
    zones: [{ surf: 'ice', poly: rect(-1.6, 1.4, 1.6, 4.4) }, { surf: 'water', poly: C24_POOL(-0.6, 10.4, 0.4, 0.35) }],
    bumps: [{ x: 0.6, z: 5.3, r: 0.3, h: 0.12 }, { x: -0.5, z: 5.9, r: 0.3, h: 0.1 }, { x: 0.3, z: 6.5, r: 0.25, h: 0.1 }],
    tubes: [{ a: [-1.1, 6.6], b: [-1.0, 8.4], dir: 45 }], movers: [C24_LIFT(-0.5, 7.15, 0.5, 7.15, 0.25, 90, 2.6), C24_BALL(0.0, 9.4, 1.2, 9.4, 2.6)],
    posts: [C24_MAN(1.2, 10.9)] },
] });
