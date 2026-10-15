/* world 7, the haunted castle: windmills guarding ramps, portcullis gates, secret-passage tubes
   (only one mouth is the good one), the moat, castle stair tiers, drifting ghosts and gargoyles.
   Each hole's `sol` is printed by `PUTTX_ONLY=7 node scripts/solve.cjs --hole 7-K`. */
const C7_MILL = (x, z, len, w, phase) => ({ kind: 'spin', x, z, len, w, phase, blades: 2, look: 'windmill' });
const C7_GATE = (ax, az, bx, bz, len, ang, period, phase) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'portcullis' });
const C7_GHOST = (ax, az, bx, bz, period, phase) => ({ kind: 'slide', ax, az, bx, bz, r: 0.17, period, phase, look: 'ghost' });
const C7_GARG = (x, z) => ({ x, z, r: 0.12, top: 0.3, look: 'gargoyle' });
const C7_MOAT = poly => ({ surf: 'water', poly });
/* the spectral vortex: a walled round bowl (radius 1.3) over a drain, fed by a straight lane of
   length L on its +x side; a ball spat up the lane from (cx + 0.95, cz - L + 0.4) heading 0
   spirals round and down */
const C7_VORTEX = (cx, cz, L = 3.2) => {
  const R = 1.3, p = [[cx + R, cz]];
  for (let i = 1; i < 24; i++) {
    const a = i / 24 * 2 * Math.PI, x = R * Math.cos(a), z = R * Math.sin(a);
    if (z < 0 && x > 0.6) break;
    p.push([cx + x, cz + z]);
  }
  return p.concat([[cx + 0.6, cz - Math.sqrt(R * R - 0.36)], [cx + 0.6, cz - L], [cx + 1.3, cz - L], [cx + 1.3, cz]]);
};
const C7_DRAIN = (x, z) => ({ x, z, r: 1.3, depth: 0.35 });
registerWorld(7, { holes: [
  /* 1: over the drawbridge; a gargoyle guards the cup */
  { par: 2, sol: [[34,0.72,0]], tee: [0, 0.5], cup: [0, 5.3], shape: rect(-0.9, 0, 0.9, 6),
    zones: [C7_MOAT(rect(-0.9, 2.6, -0.15, 3.4)), C7_MOAT(rect(0.35, 2.6, 0.9, 3.4))],
    posts: [C7_GARG(0.05, 4.4)] },
  /* 2: a windmill guards the ramp up to the keep */
  { par: 3, sol: [[22,0.88,0]], tee: [0, 0.5], cup: [0.3, 5.6], shape: rect(-0.8, 0, 0.8, 6.5),
    ramps: [{ x0: -0.8, z0: 2.7, x1: 0.8, z1: 3.7, axis: 'z', h0: 0, h1: 0.25 }],
    tiers: [{ poly: rect(-0.8, 3.7, 0.8, 6.5), h: 0.25 }],
    movers: [C7_MILL(0, 2.0, 0.55, 1.6, 0)] },
  /* 3: the castle lawn: a long green that falls toward the keep wall, a swale to cross and a
     broad ridge to read before the cup */
  { par: 3, sol: [[0,0.76,0]], tee: [0, 0.5], cup: [-0.9, 10.7], shape: [[-1.6, 0], [1.6, 0], [1.6, 6], [2.2, 8], [2.2, 11.6], [-1.8, 11.6], [-1.8, 6.5], [-1.6, 4]],
    tiers: [{ poly: [[-1.6, 0], [1.6, 0], [1.6, 6], [2.2, 8], [2.2, 11.6], [-1.8, 11.6], [-1.8, 6.5], [-1.6, 4]], h: 0.1, sx: 0.025 }],
    bumps: [{ x: 0.6, z: 4.4, r: 1.5, h: -0.12 }, { x: -0.3, z: 8.0, r: 1.7, h: 0.14 }, { x: 1.3, z: 10.4, r: 1.1, h: 0.08 }] },
  /* 4: three secret passages under the wall; only one comes out by the cup */
  { par: 3, sol: [[44,0.76,0]], tee: [0, 0.5], cup: [-0.3, 5.6], aim0: -14, shape: rect(-1.2, 0, 1.2, 6.5),
    inner: [[[-1.2, 3.2], [1.2, 3.2]]],
    tubes: [{ a: [0.65, 2.5], b: [-0.9, 0.6], dir: 20 }, { a: [0, 2.6], b: [0.85, 5.9], dir: 200 }, { a: [-0.65, 2.5], b: [0.6, 3.7], dir: -20 }] },
  /* 5: zig-zag castle stairs */
  { par: 3, sol: [[324,1,0]], tee: [0.4, 0.5], cup: [-0.3, 6.8], shape: rect(-0.9, 0, 0.9, 7.6),
    tiers: [{ poly: rect(-0.9, 2.5, 0.9, 7.6), h: 0.15 }, { poly: rect(-0.9, 4.6, 0.9, 7.6), h: 0.3 }],
    ramps: [{ x0: -0.9, z0: 1.8, x1: -0.35, z1: 2.5, axis: 'z', h0: 0, h1: 0.15 }, { x0: 0.35, z0: 3.9, x1: 0.9, z1: 4.6, axis: 'z', h0: 0.15, h1: 0.3 }],
    posts: [C7_GARG(-0.45, 3.6), C7_GARG(0.05, 6.15)] },
  /* 6: a ghost drifts across the great hall corner */
  { par: 3, sol: [[2,0.64,0]], tee: [0, 0.5], cup: [3.1, 5.0], shape: [[-0.8, 0], [0.8, 0], [0.8, 4.2], [3.8, 4.2], [3.8, 5.8], [-0.8, 5.8]],
    bumps: [{ x: -0.1, z: 5.0, r: 0.6, h: 0.32 }],
    zones: [{ surf: 'sand', poly: rect(2.6, 4.2, 3.8, 4.6) }, { surf: 'sand', poly: rect(2.6, 5.4, 3.8, 5.8) }],
    movers: [C7_GHOST(1.4, 4.55, 1.4, 5.45, 2.6, 0), C7_GHOST(2.4, 5.45, 2.4, 4.55, 2.0, 0.7)] },
  /* 7: jump the moat off the drawbridge ramp, or tiptoe the narrow side bridge; the courtyard tilts */
  { par: 2, sol: [[6,0.68,0]], tee: [0, 0.5], cup: [0.5, 5.9], shape: rect(-1.4, 0, 1.4, 7),
    ramps: [{ x0: -0.3, z0: 2.3, x1: 0.3, z1: 3.0, axis: 'z', h0: 0, h1: 0.18 }],
    tiers: [{ poly: rect(-1.4, 3.6, 1.4, 7), h: 0.045, sx: 0.03 }],
    zones: [C7_MOAT(rect(-0.95, 3.0, 1.4, 3.6))] },
  /* 8: twin windmills, up the ramp and round the corner */
  { par: 3, sol: [[334,1,0.5]], tee: [0, 0.5], cup: [3.2, 5.5], shape: [[-0.8, 0], [0.8, 0], [0.8, 4.6], [3.8, 4.6], [3.8, 6.4], [-0.8, 6.4]],
    ramps: [{ x0: -0.8, z0: 2.5, x1: 0.8, z1: 3.5, axis: 'z', h0: 0, h1: 0.25 }],
    tiers: [{ poly: [[-0.8, 3.5], [0.8, 3.5], [0.8, 4.6], [3.8, 4.6], [3.8, 6.4], [-0.8, 6.4]], h: 0.25 }],
    movers: [C7_MILL(0, 1.9, 0.55, 1.8, 0), C7_MILL(2.2, 5.5, 0.55, -1.4, 0.5)] },
  /* 9: the bell-tower green: a long two-tier green, a swale on the lower lawn, a step up and a
     ridge on the top tier that breaks the putt toward the tower */
  { par: 3, sol: [[0,1,0]], tee: [0, 0.5], cup: [0.9, 11.7], shape: rect(-1.8, 0, 1.8, 12.8),
    ramps: [{ x0: -1.8, z0: 6.2, x1: 1.8, z1: 7.2, axis: 'z', h0: 0, h1: 0.12 }],
    tiers: [{ poly: rect(-1.8, 7.2, 1.8, 12.8), h: 0.12, sx: -0.012 }],
    bumps: [{ x: 0.7, z: 3.4, r: 1.4, h: -0.1 }, { x: -1.0, z: 2.0, r: 1.0, h: 0.06 }, { x: -0.6, z: 9.6, r: 1.5, h: 0.12 }] },
  /* 10: the drop deck: two secret passages and a daring jump down to the crypt green */
  { par: 3, crazy: true, sol: [[0,0.84,0.5]], tee: [0, 0.5], cup: [-0.7, 7.2], floors: [rect(-1, 0, 1, 3.4), rect(-1.4, 4.2, 1.4, 8)],
    tiers: [{ poly: rect(-1, 0, 1, 3.4), h: 0.35 }],
    walls: [[[-0.2, 3.4], [-1, 3.4], [-1, 0], [1, 0], [1, 3.4], [0.2, 3.4]], [[-0.4, 4.2], [-1.4, 4.2], [-1.4, 8], [1.4, 8], [1.4, 4.2], [0.4, 4.2]]],
    tubes: [{ a: [0.62, 2.9], b: [1.0, 4.7], dir: 0 }, { a: [-0.62, 2.9], b: [-0.7, 0.4], dir: 0 }],
    bumps: [{ x: 0.3, z: 5.5, r: 0.5, h: 0.2 }],
    movers: [C7_MILL(0.1, 6.2, 0.5, 1.5, 0)] },
  /* 11: down the dungeon and back through the portcullis, a ghost on patrol */
  { par: 3, sol: [[342,0.76,2],[4,0.96,0]], tee: [0, 0.5], cup: [2.4, 1.5], aim0: 0, shape: [[-0.7, 0], [0.7, 0], [0.7, 4.1], [1.7, 4.1], [1.7, 0.8], [3.1, 0.8], [3.1, 5.5], [-0.7, 5.5]],
    inner: [[[1.7, 3], [2.15, 3]], [[2.65, 3], [3.1, 3]]],
    bumps: [{ x: -0.1, z: 4.85, r: 0.5, h: 0.2 }],
    movers: [C7_GHOST(1.2, 4.45, 1.2, 5.15, 2.2, 0), C7_GATE(2.4, 3, 2.85, 3, 0.25, 90, 2.8, 0)] },
  /* 12: the ghost ballroom: two dancing ghosts on a polished floor, the cup up on the stage */
  { par: 3, sol: [[26,0.8,0]], tee: [0, 0.5], cup: [0.6, 7.05], shape: rect(-1.3, 0, 1.3, 7.6),
    zones: [{ surf: 'fast', poly: rect(-1.3, 1.5, 1.3, 5.8) }],
    tiers: [{ poly: rect(-1.3, 6.4, 1.3, 7.6), h: 0.15 }],
    ramps: [{ x0: -0.25, z0: 5.8, x1: 0.25, z1: 6.4, axis: 'z', h0: 0, h1: 0.15 }],
    inner: [[[-1.3, 6.4], [-0.25, 6.4], [-0.25, 5.8]], [[1.3, 6.4], [0.25, 6.4], [0.25, 5.8]]],
    posts: [C7_GARG(-0.65, 5.95), C7_GARG(0.65, 5.95), C7_GARG(0.25, 6.8)],
    movers: [C7_GHOST(-0.75, 3.0, 0.75, 3.0, 3.0, 0), C7_GHOST(0.75, 4.5, -0.75, 4.5, 2.4, 1.2)] },
  /* 13: windmill ramp to the rampart, down the narrow drawbridge (or jump the moat), then the tilted courtyard */
  { par: 4, sol: [[332,0.88,0.5],[80,0.4,0]], tee: [0, 0.5], cup: [-0.5, 8.7], shape: rect(-1.2, 0, 1.2, 9.6),
    ramps: [{ x0: -1.2, z0: 2.6, x1: 1.2, z1: 3.6, axis: 'z', h0: 0, h1: 0.3 }, { x0: 0.55, z0: 5.4, x1: 1.05, z1: 6.5, axis: 'z', h0: 0.3, h1: 0.07 }],
    tiers: [{ poly: rect(-1.2, 3.6, 1.2, 5.4), h: 0.3 }, { poly: rect(-1.2, 6.5, 1.2, 9.6), h: 0.2, sz: -0.02 }],
    zones: [C7_MOAT(rect(-1.2, 5.4, 0.55, 6.5)), C7_MOAT(rect(1.05, 5.4, 1.2, 6.5)), C7_MOAT(rect(-1.2, 9.25, 1.2, 9.6))],
    posts: [C7_GARG(-0.1, 8.1), C7_GARG(-0.9, 8.15)],
    movers: [C7_MILL(0, 2.0, 0.6, 1.5, 0), C7_GHOST(-0.85, 7.35, 0.6, 7.35, 2.6, 0)] },
  /* 14: three dungeon rooms joined by secret passages; pick the right mouths */
  { par: 4, crazy: true, sol: [[140,1,0],[56,0.88,1.2],[4,0.88,0]], tee: [0, 0.5], cup: [0.4, 9.4], aim0: 14, floors: [rect(-1, 0, 1, 2.8), rect(-1, 3.6, 1, 6.4), rect(-1, 7.2, 1, 10)],
    walls: [ring(rect(-1, 0, 1, 2.8)), ring(rect(-1, 3.6, 1, 6.4)), ring(rect(-1, 7.2, 1, 10)), [[-1, 5], [-0.25, 5]], [[0.25, 5], [1, 5]]],
    zones: [{ surf: 'sand', poly: rect(-1, 3.6, -0.3, 4.4) }],
    tubes: [{ a: [0.6, 2.35], b: [0.7, 3.95], dir: 0 }, { a: [0, 2.35], b: [-0.7, 0.45], dir: 20 }, { a: [-0.6, 2.35], b: [-0.7, 3.95], dir: 0 },
      { a: [0.6, 6.0], b: [-0.6, 7.5], dir: 0 }, { a: [-0.6, 6.0], b: [0.7, 0.45], dir: -20 }],
    movers: [C7_GATE(0, 5, -0.5, 5, 0.25, 90, 2.6, 0), C7_MILL(0.0, 8.5, 0.5, 1.6, 0)] },
  /* 15: bridge, island and bridge across the moat while ghosts patrol */
  { par: 4, crazy: true, sol: [[164,0.5625,0],[348,0.3125,0],[280,0.5,0],[28,0.4375,0]], tee: [0, 0.5], cup: [0.7, 8.1], aim0: 18, shape: rect(-1.6, 0, 1.6, 9),
    zones: [C7_MOAT(rect(-1.6, 1.8, 0.6, 3.6)), C7_MOAT(rect(1.1, 1.8, 1.6, 3.6)), C7_MOAT(rect(-0.6, 4.8, 1.6, 6.6)), C7_MOAT(rect(-1.6, 4.8, -1.1, 6.6))],
    posts: [C7_GARG(0.15, 7.7), C7_GARG(1.25, 7.5)],
    movers: [C7_GHOST(-1.0, 4.2, 1.0, 4.2, 3.2, 0), C7_GHOST(-0.3, 7.2, 0.9, 7.2, 2.4, 1.5)] },
  /* 16: the graveyard green: a long dogleg green between the tombs, tilted toward the old well
     side, with a burial mound in the bend and a dip before the cup */
  { par: 3, sol: [[0,0.88,0]], tee: [-1.0, 0.5], cup: [1.6, 12.0], shape: [[-2.0, 0], [0.2, 0], [0.2, 5.0], [3.0, 7.5], [3.0, 13.0], [0.0, 13.0], [-2.0, 7.0]],
    tiers: [{ poly: [[-2.0, 0], [0.2, 0], [0.2, 5.0], [3.0, 7.5], [3.0, 13.0], [0.0, 13.0], [-2.0, 7.0]], h: 0.12, sx: -0.02, sz: 0.004 }],
    bumps: [{ x: -0.5, z: 6.2, r: 1.3, h: 0.16 }, { x: 1.3, z: 9.6, r: 1.4, h: -0.1 }, { x: -1.2, z: 2.5, r: 1.0, h: 0.07 }] },
  /* 17: round the tower: up the stairs, along the battlement, through the portcullis */
  { par: 4, sol: [[30,0.68,0],[38,0.96,0]], tee: [-1.1, 0.5], cup: [1.1, 0.6], aim0: 0, shape: [[-1.6, 0], [-0.6, 0], [-0.6, 3.6], [0.6, 3.6], [0.6, 0], [1.6, 0], [1.6, 4.6], [-1.6, 4.6]],
    tiers: [{ poly: rect(-1.6, 2.5, 1.6, 4.6), h: 0.15 }, { poly: rect(0.5, 0, 1.6, 4.6), h: 0.3 }],
    ramps: [{ x0: -1.6, z0: 1.5, x1: -0.6, z1: 2.5, axis: 'z', h0: 0, h1: 0.15 }, { x0: -0.3, z0: 3.6, x1: 0.5, z1: 4.6, axis: 'x', h0: 0.15, h1: 0.3 }],
    inner: [[[0.6, 2], [0.875, 2]], [[1.375, 2], [1.6, 2]]],
    bumps: [{ x: -1.1, z: 4.1, r: 0.35, h: 0.1 }],
    movers: [C7_GATE(1.125, 2, 1.375, 2, 0.25, 90, 2.4, 0)] },
  /* 18: the showpiece: through the gate, up the tower stairs, into the right secret passage, down to the throne room */
  { par: 4, crazy: true, sol: [[0,0.84,1.5],[12,0.84,0]], tee: [0, 0.5], cup: [3.4, 7.3], floors: [rect(-1.2, 0, 1.2, 7), rect(2.0, 3.0, 4.8, 8.0)],
    walls: [ring(rect(-1.2, 0, 1.2, 7)), ring(rect(2.0, 3.0, 4.8, 8.0)), [[-1.2, 2.2], [-0.3, 2.2]], [[0.3, 2.2], [1.2, 2.2]]],
    tiers: [{ poly: rect(-1.2, 3.8, 1.2, 7), h: 0.2 }, { poly: rect(-1.2, 5.4, 1.2, 7), h: 0.4 }, { poly: rect(2.6, 6.4, 4.2, 8.0), h: 0.1 }],
    ramps: [{ x0: -1.2, z0: 3.0, x1: 0, z1: 3.8, axis: 'z', h0: 0, h1: 0.2 }, { x0: 0, z0: 4.6, x1: 1.2, z1: 5.4, axis: 'z', h0: 0.2, h1: 0.4 },
      { x0: 2.9, z0: 5.8, x1: 3.9, z1: 6.4, axis: 'z', h0: 0, h1: 0.1 }],
    tubes: [{ a: [0.7, 6.6], b: [3.4, 3.4], dir: 0 }, { a: [0, 6.6], b: [-0.8, 0.5], dir: 0 }, { a: [-0.7, 6.6], b: [0.8, 2.7], dir: 0 }],
    posts: [C7_GARG(2.65, 6.1), C7_GARG(4.15, 6.1)],
    movers: [C7_GATE(0, 2.2, 0.6, 2.2, 0.3, 90, 3, 0), C7_MILL(0, 5.85, 0.4, 1.7, 0), C7_GHOST(2.4, 5.0, 4.4, 5.0, 3.0, 0)] },
] });
