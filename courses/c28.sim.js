/* world 8, course 28: the reactor spire, the world's masterpiece. Floating decks at layered
   heights, chained teleporter tubes, switchback ramps and airlock gates guarding the jumps,
   each hole a little more intricate than the last. Same low gravity and grippy felt as course 8.
   Wrapped in a block so its helpers stay out of the other courses' way. */
{
  const ALIEN = (x, z, e = 1.25) => ({ x, z, r: 0.14, e, top: 0.3, look: 'alien' });
  const ROCK = (ax, az, bx, bz, period, phase = 0, r = 0.18) => ({ kind: 'slide', ax, az, bx, bz, r, period, phase, look: 'asteroid' });
  const LOCK = (ax, az, bx, bz, len, ang, period, phase = 0) => ({ kind: 'gate', ax, az, bx, bz, len, ang, period, phase, look: 'airlock' });
  const SAT = (x, z, len, w, phase = 0, blades = 1) => ({ kind: 'spin', x, z, len, w, phase, blades, look: 'satellite' });
  /* a raised deck: the tier reaches past the floor so walls on its edge stand on one height */
  const DECK = (x0, z0, x1, z1, h, pad = 0.12) => ({ poly: rect(x0 - pad, z0 - pad, x1 + pad, z1 + pad), h });
  /* walls round a rectangle, leaving the named sides open: s (z0), e (x1), n (z1), w (x0) */
  const box = (x0, z0, x1, z1, open = '') => {
    const c = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], k = 'senw', out = [];
    const i0 = [0, 1, 2, 3].find(i => open.includes(k[(i + 3) % 4]));
    if (i0 === undefined) return [ring(c)];
    let cur = null;
    for (let j = 0; j < 4; j++) {
      const i = (i0 + j) % 4;
      if (open.includes(k[i])) { cur = null; continue; }
      if (!cur) { cur = [c[i]]; out.push(cur); }
      cur.push(c[(i + 1) % 4]);
    }
    return out;
  };
  registerWorld(28, { g: 0.427, feltMu: 0.19, holes: [
    /* 1. first hop: the tube is the only way off the tee deck */
    { par: 2, sol: [[0,0.6428571428571429,0],[45,0.42857142857142855,0]], tee: [0, 0.5], cup: [2.3, 2.75],
      floors: [rect(-0.8, 0, 0.8, 2.6), rect(1.6, 0, 3.8, 3.4)],
      walls: [ring(rect(-0.8, 0, 0.8, 2.6)), ring(rect(1.6, 0, 3.8, 3.4))],
      bumps: [{ x: 2.3, z: 2.75, r: 0.45, h: -0.12 }],
      posts: [ALIEN(3.0, 1.9)],
      tubes: [{ a: [0, 2.1], b: [3.3, 0.45], dir: 0, keep: 0.6, add: 0.2 }] },
    /* 2. jump then tube: launch to the middle deck, then teleport to the green */
    { par: 3, sol: [[335,1,0]], tee: [0, 0.5], cup: [-2.7, 5.4],
      floors: [rect(-0.6, 0, 0.6, 3), rect(-1.2, 3.8, 1.2, 5.8), rect(-3.6, 3, -1.8, 6.2)],
      walls: [...box(-0.6, 0, 0.6, 3, 'n'), ...box(-1.2, 3.8, 1.2, 5.8, 's'), ring(rect(-3.6, 3, -1.8, 6.2))],
      tiers: [DECK(-1.2, 3.8, 1.2, 5.8, 0.1)],
      ramps: [{ x0: -0.6, z0: 2.2, x1: 0.6, z1: 3, axis: 'z', h0: 0, h1: 0.22 }],
      bumps: [{ x: 0, z: 4.9, r: 0.45, h: -0.12 }],
      posts: [ALIEN(-2.2, 4.6), ALIEN(-3.2, 4.4)],
      tubes: [{ a: [0.75, 5.35], b: [-2.7, 3.45], dir: 0, keep: 0.5, add: 0.2 }] },
    /* 3. tube chain: one teleporter spits you straight into the next */
    { par: 3, sol: [[0,0.7142857142857143,0],[5,0.2857142857142857,0]], tee: [0, 0.5], cup: [0.8, 4.7],
      floors: [rect(-0.8, 0, 0.8, 2.2), rect(1.8, 0, 3.4, 2.4), rect(0, 3.2, 3.4, 5.6)],
      walls: [ring(rect(-0.8, 0, 0.8, 2.2)), ring(rect(1.8, 0, 3.4, 2.4)), ring(rect(0, 3.2, 3.4, 5.6))],
      inner: [[[1.6, 3.2], [1.6, 4.2]]],
      bumps: [{ x: 0.8, z: 4.7, r: 0.5, h: -0.12 }],
      posts: [ALIEN(1.9, 5.0)],
      tubes: [{ a: [0, 1.75], b: [2.6, 0.45], dir: 0 }, { a: [2.6, 1.95], b: [3.0, 3.6], dir: 270, keep: 0.5 }] },
    /* 4. switchback descent: down the ramp, round the hairpin, down again to the green */
    { par: 3, sol: [[335,1,0],[135,0.8571428571428571,0]], tee: [0, 0.5], cup: [2.8, 0.4],
      shape: [[-0.5, 0], [0.5, 0], [0.5, 3.4], [1, 3.4], [1, -0.6], [3.6, -0.6], [3.6, 1.6], [2, 1.6], [2, 4.4], [-0.5, 4.4]],
      tiers: [{ poly: rect(-0.6, -0.1, 0.6, 1.2), h: 0.4 }, { poly: rect(-0.6, 3, 2.1, 4.5), h: 0.2 }],
      ramps: [{ x0: -0.5, z0: 1.2, x1: 0.5, z1: 3, axis: 'z', h0: 0.4, h1: 0.2 }, { x0: 1, z0: 1.6, x1: 2, z1: 3.4, axis: 'z', h0: 0, h1: 0.2 }],
      bumps: [{ x: 2.8, z: 0.4, r: 0.5, h: -0.12 }],
      posts: [ALIEN(1.5, 0.1), ALIEN(0.75, 3.9)] },
    /* 5. airlocks guard the jump: time two doors, launch to the crater deck, drop to the green */
    { par: 4, sol: [[10,0.9285714285714286,1.2]], tee: [0, 0.5], cup: [-0.6, 9.2],
      floors: [rect(-0.6, 0, 0.6, 4.6), rect(-1.6, 5.6, 1, 8.2), rect(-1.6, 8.2, 0.4, 10)],
      walls: [...box(-0.6, 0, 0.6, 4.6, 'n'), [[-1.6, 8.2], [-1.6, 5.6]], [[1, 5.6], [1, 8.2], [0.4, 8.2], [0.4, 10], [-1.6, 10], [-1.6, 8.2]]],
      tiers: [DECK(-1.6, 5.6, 1, 8.2, 0.25, 0)],
      ramps: [{ x0: -0.6, z0: 3.8, x1: 0.6, z1: 4.6, axis: 'z', h0: 0, h1: 0.4 }],
      bumps: [{ x: -0.3, z: 6.9, r: 0.5, h: -0.18 }, { x: -0.6, z: 9.2, r: 0.5, h: -0.1 }],
      movers: [LOCK(0, 1.7, 1.25, 1.7, 0.62, 90, 2.6), LOCK(0, 3.0, -1.25, 3.0, 0.62, 90, 3.2, 1.5)] },
    /* 6. the orbital elevator: chute to the tube, out onto the high booster rail, off the lip into the crater bucket */
    { par: 4, auto: true, crazy: true, sol: [[0,0.6,0]], tee: [0, 0.5], cup: [1.6, 8.2],
      floors: [rect(-0.3, 0, 0.3, 3.2), rect(1.2, 2.4, 2, 6.4), rect(0.6, 6.9, 2.6, 9.2)],
      walls: [ring(rect(-0.3, 0, 0.3, 3.2)), [[1.2, 6.4], [1.2, 2.4], [2, 2.4], [2, 6.4]], [[0.6, 6.9], [0.6, 9.2], [2.6, 9.2], [2.6, 6.9]]],
      tiers: [{ poly: rect(1.08, 2.28, 2.12, 6.52), h: 0.45 }],
      bumps: [{ x: 1.6, z: 8.2, r: 0.9, h: -0.3 }],
      posts: [ALIEN(0.95, 7.35), ALIEN(2.25, 7.35), ALIEN(0.95, 8.85), ALIEN(2.25, 8.85)],
      zones: [{ push: [0, 1.1], poly: rect(1.2, 3.2, 2, 6.2) }],
      tubes: [{ a: [0, 2.8], b: [1.6, 2.8], dir: 0, keep: 0.2, add: 1.2 }] },
    /* 7. three decks down: drop, slip the airlock, drop again past the drifting rock */
    { par: 4, sol: [[55,1,0],[55,1,0]], tee: [0, 0.5], cup: [1.5, 6.6],
      floors: [rect(-0.6, 0, 0.6, 2.2), rect(-1.4, 2.2, 1.2, 4.4), rect(1.2, 1.6, 3.4, 5), rect(0.4, 5, 3.4, 7.4)],
      walls: [[[-0.6, 2.2], [-0.6, 0], [0.6, 0], [0.6, 2.2]], [[-0.8, 2.2], [-1.4, 2.2], [-1.4, 4.4], [1.1, 4.4]],
        [[1.2, 2.1], [1.2, 1.6], [3.4, 1.6], [3.4, 7.4], [0.4, 7.4], [0.4, 5], [1.3, 5]]],
      tiers: [{ poly: rect(1.2, 1.48, 3.52, 5), h: 0.2 }, { poly: rect(-0.72, -0.12, 0.72, 2.2), h: 0.6 },
        { poly: [[-1.52, 2.08], [-0.72, 2.08], [-0.72, 2.2], [1.2, 2.2], [1.2, 4.52], [-1.52, 4.52]], h: 0.4 }],
      bumps: [{ x: -0.5, z: 3.4, r: 0.45, h: -0.14 }, { x: 2.4, z: 6.3, r: 0.45, h: -0.16 }],
      posts: [ALIEN(1.15, 5.85)],
      movers: [LOCK(-0.2, 3.3, -0.2, 5.6, 0.5, 0, 3), ROCK(1.75, 4.3, 3.05, 4.3, 2.6)] },
    /* 8. satellite relay: tube in, dodge the spinning satellite to the second tube, out to the green */
    { par: 3, sol: [[40,1,1.2],[15,0.9285714285714286,0]], tee: [0, 0.5], cup: [1.6, 5.6],
      floors: [rect(-0.8, 0, 0.8, 2.2), rect(1.6, 0, 4, 3), rect(-1, 3.8, 2.4, 6.4)],
      walls: [ring(rect(-0.8, 0, 0.8, 2.2)), ring(rect(1.6, 0, 4, 3)), ring(rect(-1, 3.8, 2.4, 6.4))],
      bumps: [{ x: 1.6, z: 5.6, r: 0.45, h: -0.12 }],
      posts: [ALIEN(0.7, 5.0), ALIEN(-0.4, 1.4)],
      tubes: [{ a: [0.4, 1.8], b: [2, 0.4], dir: 45 }, { a: [3.55, 2.55], b: [-0.5, 4.3], dir: 0, keep: 0.5 }],
      movers: [SAT(2.8, 1.6, 0.55, 1.2)] },
    /* 9. jump, teleport up, drop: tee deck, landing deck, the high reactor deck, then off its edge to the green */
    { par: 4, sol: [[335,1,1.2],[0,1,0]], tee: [0, 0.5], cup: [3.2, 7.4],
      floors: [rect(-0.6, 0, 0.6, 3), rect(-1.2, 3.8, 1.2, 5.8), rect(2.2, 3, 4, 6), rect(1.6, 6, 4.4, 8)],
      walls: [...box(-0.6, 0, 0.6, 3, 'n'), ...box(-1.2, 3.8, 1.2, 5.8, 's'), ...box(2.2, 3, 4, 6, 'n'), [[2.1, 6], [1.6, 6], [1.6, 8], [4.4, 8], [4.4, 6], [4.1, 6]]],
      tiers: [DECK(-1.2, 3.8, 1.2, 5.8, 0.1), { poly: rect(2.08, 2.88, 4.12, 6), h: 0.4 }],
      ramps: [{ x0: -0.6, z0: 2.2, x1: 0.6, z1: 3, axis: 'z', h0: 0, h1: 0.22 }],
      bumps: [{ x: 3.4, z: 4.2, r: 0.4, h: -0.12 }, { x: 2.3, z: 6.8, r: 0.4, h: -0.15 }],
      posts: [ALIEN(3.6, 7.1), ALIEN(-0.7, 5.3)],
      tubes: [{ a: [0.75, 5.35], b: [3.1, 3.45], dir: 0, keep: 0.5, add: 0.2 }],
      movers: [ROCK(2.6, 4.9, 3.6, 4.9, 2.4)] },
    /* 10. the switchback climb: up the ramp, dodge the rock across the hairpin, up again, then drop to the crater green */
    { par: 4, crazy: true, sol: [[335,1,0],[130,0.9285714285714286,0]], tee: [0, 0.4], cup: [3.3, 3.5],
      floors: [rect(-0.5, 0, 0.5, 3), rect(-0.5, 3, 1.9, 4), rect(0.9, 0, 1.9, 3), rect(1.9, 0, 3.9, 1.4), rect(2.3, 1.4, 4.3, 4.6)],
      walls: [[[0.5, 3], [0.5, 0], [-0.5, 0], [-0.5, 4], [1.9, 4], [1.9, 1.4]], [[0.9, 3], [0.9, 0], [3.9, 0], [3.9, 1.4]],
        [[2.3, 1.4], [2.3, 4.6], [4.3, 4.6], [4.3, 1.4], [3.9, 1.4]]],
      tiers: [{ poly: rect(0.78, -0.12, 4.02, 1.52), h: 0.4 }, { poly: rect(-0.62, 2.6, 2.02, 4.12), h: 0.2 }],
      ramps: [{ x0: -0.5, z0: 1, x1: 0.5, z1: 2.6, axis: 'z', h0: 0, h1: 0.2 }, { x0: 0.9, z0: 0.8, x1: 1.9, z1: 2.6, axis: 'z', h0: 0.4, h1: 0.2 }],
      bumps: [{ x: 3.3, z: 3.5, r: 0.8, h: -0.15 }],
      posts: [ALIEN(2.9, 2.3), ALIEN(3.75, 2.6)],
      movers: [ROCK(-0.1, 3.5, 1.5, 3.5, 2.8, 0, 0.15)] },
    /* 11. solar wind relay: a crosswind span, a ramp jump, then the tube drops you by the green */
    { par: 4, sol: [[10,0.7142857142857143,0],[50,0.6428571428571429,0]], tee: [0, 0.5], cup: [3.1, 6.6],
      floors: [rect(-0.8, 0, 0.8, 1.6), rect(-0.6, 1.6, 0.6, 4.4), rect(-1.4, 5.2, 1.4, 7.4), rect(2.2, 4.6, 4, 7.6)],
      walls: [[[-0.6, 1.6], [-0.8, 1.6], [-0.8, 0], [0.8, 0], [0.8, 1.6], [0.6, 1.6]], ...box(-1.4, 5.2, 1.4, 7.4, 's'), ring(rect(2.2, 4.6, 4, 7.6))],
      ramps: [{ x0: -0.6, z0: 3.7, x1: 0.6, z1: 4.4, axis: 'z', h0: 0, h1: 0.22 }],
      bumps: [{ x: -0.3, z: 6.2, r: 0.5, h: -0.16 }, { x: 3.1, z: 6.6, r: 0.4, h: -0.1 }],
      posts: [ALIEN(0.5, 6.4), ALIEN(2.6, 6.1)],
      zones: [{ push: [-0.9, 0], poly: rect(-0.6, 1.8, 0.6, 3.6) }],
      tubes: [{ a: [0.95, 6.95], b: [3.55, 5.05], dir: 0, keep: 0.5, add: 0.2 }],
      movers: [ROCK(2.6, 5.8, 3.6, 5.8, 2.4, 0, 0.14)] },
    /* 12. tube roulette: two teleporters off the tee, one to the launch deck, one to a second tube */
    { par: 3, sol: [[20,1,0],[25,0.2857142857142857,0]], tee: [0, 0.5], cup: [0, 5.4],
      floors: [rect(-1, 0, 1, 2.4), rect(-3.6, 0, -2, 3.2), rect(2, 0, 3.6, 3.2), rect(-3.6, 4, 3.6, 6.4)],
      walls: [ring(rect(-1, 0, 1, 2.4)), ...box(-3.6, 0, -2, 3.2, 'n'), ring(rect(2, 0, 3.6, 3.2)), [[-3.6, 4], [-3.6, 6.4], [3.6, 6.4], [3.6, 4], [-2, 4]]],
      inner: [[[0, 1.2], [0, 2.4]]],
      ramps: [{ x0: -3.6, z0: 2.4, x1: -2, z1: 3.2, axis: 'z', h0: 0, h1: 0.22 }],
      bumps: [{ x: 0, z: 5.4, r: 0.5, h: -0.12 }, { x: -2.2, z: 5.2, r: 0.5, h: -0.15 }],
      posts: [ALIEN(-0.7, 5.0), ALIEN(0.7, 5.0), ALIEN(0, 6.0), ALIEN(1.8, 5.3)],
      tubes: [{ a: [-0.55, 1.95], b: [-2.8, 0.45], dir: 0 }, { a: [0.55, 1.95], b: [2.8, 0.45], dir: 0, keep: 0.6 }, { a: [2.8, 2.75], b: [2.9, 4.45], dir: 270, keep: 0.5 }] },
    /* 13. guarded double jump: an airlock before each launch, the second off the side ramp */
    { par: 4, crazy: true, sol: [[20,0.9285714285714286,1.2],[80,1,0]], tee: [0, 0.5], cup: [-2.8, 7.4],
      floors: [rect(-0.6, 0, 0.6, 3), rect(-1, 3.8, 1, 7.2), rect(-3.6, 5.4, -1.6, 8.4)],
      walls: [...box(-0.6, 0, 0.6, 3, 'n'), [[-1, 5.9], [-1, 3.8], [1, 3.8], [1, 7.2], [-1, 7.2]], [[-1.6, 8.4], [-1.6, 5.4], [-3.6, 5.4], [-3.6, 8.4], [-1.6, 8.4]]],
      ramps: [{ x0: -0.6, z0: 2.2, x1: 0.6, z1: 3, axis: 'z', h0: 0, h1: 0.22 }, { x0: -1, z0: 5.9, x1: -0.3, z1: 7.2, axis: 'x', h0: 0.22, h1: 0 }],
      bumps: [{ x: -2.4, z: 6.5, r: 0.4, h: -0.18 }],
      posts: [ALIEN(-2.2, 7.8), ALIEN(0.55, 6.6)],
      movers: [LOCK(0, 1.5, 1.25, 1.5, 0.62, 90, 2.6), LOCK(0, 5.1, 2.05, 5.1, 1, 90, 3.4)] },
    /* 14. reactor descent: high deck, crater deck, tube or drop to the rock garden, then jump to the green */
    { par: 4, sol: [[345,0.9285714285714286,1.2]], tee: [0, 0.5], cup: [4.8, 8.4],
      floors: [rect(-0.6, 0, 0.6, 2.4), rect(-1.6, 2.8, 1.6, 5.6), rect(-0.2, 6.4, 3, 8.6), rect(3.6, 6.4, 5.6, 9.4)],
      walls: [...box(-0.6, 0, 0.6, 2.4, 'n'), [[0.2, 5.6], [-1.6, 5.6], [-1.6, 2.8], [1.6, 2.8], [1.6, 5.6]], [[3, 7.4], [3, 6.4], [-0.2, 6.4], [-0.2, 8.6], [3, 8.6]],
        ...box(3.6, 6.4, 5.6, 9.4, 'w')],
      tiers: [DECK(-0.6, 0, 0.6, 2.4, 0.7), DECK(-1.6, 2.8, 1.6, 5.6, 0.3), DECK(3.6, 6.4, 5.6, 9.4, 0.1)],
      ramps: [{ x0: 2.2, z0: 7.4, x1: 3, z1: 8.6, axis: 'x', h0: 0, h1: 0.22 }],
      bumps: [{ x: -0.6, z: 4.3, r: 0.5, h: -0.2 }, { x: 0.7, z: 3.9, r: 0.45, h: -0.2 }, { x: 4.4, z: 7.6, r: 0.45, h: -0.15 }],
      posts: [ALIEN(5.1, 7.4)],
      tubes: [{ a: [-1.15, 5.15], b: [1.6, 6.85], dir: 0, keep: 0.5, add: 0.2 }],
      movers: [ROCK(0.25, 7.6, 1.85, 7.6, 2.6, 0, 0.15)] },
    /* 15. the tube ladder: slip the airlock to the first tube, dodge the satellite to the second, launch to the green */
    { par: 4, crazy: true, sol: [[0,0.9285714285714286,1.2],[140,0.9285714285714286,0]], tee: [0, 0.4], cup: [4.5, 5.6],
      floors: [rect(-0.4, 0, 0.4, 3), rect(1.4, 0, 3, 2.6), rect(3.6, 0, 5.4, 3.4), rect(3.2, 4.2, 5.8, 6.6)],
      walls: [ring(rect(-0.4, 0, 0.4, 3)), ring(rect(1.4, 0, 3, 2.6)), ...box(3.6, 0, 5.4, 3.4, 'n'), ...box(3.2, 4.2, 5.8, 6.6, 's')],
      tiers: [DECK(3.6, 0, 5.4, 3.4, 0.3), DECK(3.2, 4.2, 5.8, 6.6, 0.1, 0)],
      ramps: [{ x0: 3.6, z0: 2.6, x1: 5.4, z1: 3.4, axis: 'z', h0: 0.3, h1: 0.5 }],
      bumps: [{ x: 4.5, z: 5.6, r: 0.45, h: -0.12 }],
      posts: [ALIEN(3.9, 5.9), ALIEN(5.1, 5.3)],
      tubes: [{ a: [0, 2.6], b: [2.2, 0.45], dir: 0 }, { a: [2.2, 2.2], b: [4.5, 0.45], dir: 0, keep: 0.6 }],
      movers: [LOCK(0, 1.8, 1.0, 1.8, 0.45, 90, 2.8), SAT(2.2, 1.35, 0.4, 1.4)] },
    /* 16. airlock gauntlet: jump past the door at the lip, cross the asteroid bridge, then the tube or the long drop */
    { par: 4, sol: [[355,0.7857142857142857,1.2],[10,0.7857142857142857,0]], tee: [0, 0.5], cup: [2.6, 8.6],
      floors: [rect(-0.6, 0, 0.6, 3), rect(-1.4, 3.6, 1.4, 5.2), rect(-0.4, 5.2, 0.4, 7.6), rect(-1.2, 7.6, 3.4, 9.6)],
      walls: [...box(-0.6, 0, 0.6, 3, 'n'), [[-0.4, 5.2], [-1.4, 5.2], [-1.4, 3.6]], [[1.4, 3.6], [1.4, 5.2], [0.4, 5.2]],
        [[-0.4, 7.6], [-1.2, 7.6], [-1.2, 9.6], [3.4, 9.6], [3.4, 7.6], [0.4, 7.6]]],
      ramps: [{ x0: -0.6, z0: 2.2, x1: 0.6, z1: 3, axis: 'z', h0: 0, h1: 0.22 }],
      bumps: [{ x: 1.6, z: 8.5, r: 0.45, h: -0.14 }],
      posts: [ALIEN(-0.7, 9.0), ALIEN(2.1, 9.15)],
      tubes: [{ a: [1.0, 4.8], b: [-0.75, 8.1], dir: 90, keep: 0.5, add: 0.2 }],
      movers: [LOCK(-1.9, 3.9, 1.9, 3.9, 0.5, 90, 3.4), ROCK(-0.75, 6.4, 0.75, 6.4, 2.6, 0, 0.14)] },
    /* 17. the stack: four rooms each a step higher, a ramp through every bulkhead, an airlock on the middle one, or the tube past the rock */
    { par: 4, sol: [[309.2,0.5,0],[48,0.45,0]], tee: [0, 0.5], cup: [-1.0, 8.2], shape: rect(-1.8, 0, 1.8, 9),
      inner: [[[-1.8, 2.2], [0.8, 2.2]], [[-0.8, 4.4], [1.8, 4.4]], [[-1.8, 6.6], [0.8, 6.6]]],
      tiers: [{ poly: rect(-1.8, 2.6, 1.8, 4.8), h: 0.12 }, { poly: rect(-1.8, 4.8, 1.8, 7), h: 0.24 }, { poly: rect(-1.8, 7, 1.8, 9), h: 0.36 }],
      ramps: [{ x0: 0.8, z0: 1.8, x1: 1.8, z1: 2.6, axis: 'z', h0: 0, h1: 0.12 }, { x0: -1.8, z0: 4, x1: -0.8, z1: 4.8, axis: 'z', h0: 0.12, h1: 0.24 },
        { x0: 0.8, z0: 6.2, x1: 1.8, z1: 7, axis: 'z', h0: 0.24, h1: 0.36 }],
      bumps: [{ x: -1.0, z: 8.2, r: 0.45, h: -0.1 }],
      posts: [ALIEN(-0.3, 3.3), ALIEN(0.6, 5.6), ALIEN(0, 8.0)],
      tubes: [{ a: [-1.35, 1.6], b: [-1.3, 5.6], dir: 90, keep: 0.6, add: 0.2 }],
      movers: [LOCK(-1.35, 4.4, -0.45, 4.4, 0.45, 90, 3.3, 2), ROCK(-1.35, 0.55, -1.35, 1.05, 2, 0, 0.15)] },
    /* 18. the reactor tour: the guarded launch, three turning jumps between floating decks, a tube shortcut, the crater cup */
    { par: 5, crazy: true, sol: [[5,1,1.2]], tee: [0, 0.5], cup: [-3, 8.8],
      floors: [rect(-0.6, 0, 0.6, 2.8), rect(-1, 3.6, 1, 6), rect(-3.8, 4.2, -1.6, 6.6), rect(-4.4, 7.4, -1.8, 9.8)],
      walls: [...box(-0.6, 0, 0.6, 2.8, 'n'), [[-1, 4.6], [-1, 3.6], [1, 3.6], [1, 6], [-0.15, 6], [-1, 6]],
        [[-2.6, 6.6], [-2.45, 6.6], [-1.6, 6.6], [-1.6, 4.2], [-3.8, 4.2], [-3.8, 5.65], [-3.8, 6.6]], ring(rect(-4.4, 7.4, -1.8, 9.8))],
      tiers: [DECK(-1, 3.6, 1, 6, 0.1), DECK(-3.8, 4.2, -1.6, 6.6, 0.25), DECK(-4.4, 7.4, -1.8, 9.8, 0.1)],
      ramps: [{ x0: -0.6, z0: 2, x1: 0.6, z1: 2.8, axis: 'z', h0: 0, h1: 0.3 }, { x0: -1, z0: 4.6, x1: -0.3, z1: 6, axis: 'x', h0: 0.42, h1: 0.1 },
        { x0: -3.8, z0: 5.8, x1: -2.6, z1: 6.6, axis: 'z', h0: 0.25, h1: 0.55 }],
      bumps: [{ x: -3, z: 8.8, r: 0.75, h: -0.15 }],
      posts: [ALIEN(0.5, 4.5), ALIEN(-2.2, 5.1), ALIEN(-3.65, 9.4)],
      tubes: [{ a: [0.6, 5.55], b: [-2.15, 9.3], dir: 270, keep: 0.4, add: 0.2 }],
      movers: [LOCK(0, 1.3, 1.25, 1.3, 0.62, 90, 2.8), ROCK(-4.1, 8.1, -2.1, 8.1, 3.2, 0, 0.14)] },
] });
}
