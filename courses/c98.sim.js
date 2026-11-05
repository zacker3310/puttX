/* course 98, the Classic: a homage to the original Putt-Putt. Flat green carpet on concrete,
   aluminium bumpboards built for banking, every hole a par 2 with an ace on for a precise line,
   and only the old simple obstacles: low hills and mounds, metal blockers and posts, angled bank
   boards, two short pipes and one small pond. Decorations never come into play. */
registerWorld(98, { holes: [
  /* 1. the first lane: a straight carpet lane with a low hill across the middle */
  { par: 2, sol: [[0,0.68,0]], tee: [0, 0.5], cup: [-0.2, 5.8], shape: rect(-0.55, 0, 0.55, 6.6),
    bumps: [{ x: 0.1, z: 3.4, r: 0.45, h: 0.08 }] },
  /* 2. dogleg left: a bank board across the outside corner turns the ball down the second leg */
  { par: 2, sol: [[0,1,0]], tee: [0, 0.5], cup: [2.9, 4.6], aim0: 0,
    shape: [[-0.6, 0], [0.6, 0], [0.6, 3.9], [3.7, 3.9], [3.7, 5.1], [-0.6, 5.1]],
    inner: [[[-0.6, 4.2], [0.3, 5.1]]] },
  /* 3. the camel: two tall humps in a row and the cup tucked off the crown line */
  { par: 2, sol: [[2,0.68,0]], tee: [0, 0.5], cup: [0.25, 6.1], shape: rect(-0.6, 0, 0.6, 6.9),
    bumps: [{ x: 0, z: 2.6, r: 0.5, h: 0.12 }, { x: 0, z: 4.4, r: 0.5, h: 0.12 }] },
  /* 4. the post field: a wide lane planted with staggered rows of metal posts to thread */
  { par: 2, sol: [[2,0.76,0]], tee: [0, 0.5], cup: [0, 6.2], shape: rect(-0.8, 0, 0.8, 7),
    posts: [{ x: -0.4, z: 2.4, r: 0.05 }, { x: 0, z: 2.4, r: 0.05 }, { x: 0.4, z: 2.4, r: 0.05 }, { x: -0.2, z: 3.2, r: 0.05 }, { x: 0.2, z: 3.2, r: 0.05 },
      { x: -0.4, z: 4, r: 0.05 }, { x: 0, z: 4, r: 0.05 }, { x: 0.4, z: 4, r: 0.05 }, { x: -0.2, z: 4.8, r: 0.05 }, { x: 0.2, z: 4.8, r: 0.05 }] },
  /* 5. the volcano: a cone with a crater on top, and the cup in its shadow */
  { par: 2, sol: [[20,1,0]], tee: [0, 0.5], cup: [-0.42, 5.2], shape: rect(-0.75, 0, 0.75, 6.4),
    bumps: [{ x: 0, z: 4.3, r: 0.45, h: 0.16 }, { x: 0, z: 4.3, r: 0.14, h: -0.05 }] },
  /* 6. the pipe: a wall across the lane and a pipe through it; the pipe comes out wide of the cup
     and a mound by the exit has to turn it in */
  { par: 2, sol: [[4,0.6,0]], tee: [0, 0.5], cup: [0.2, 6.2], aim0: 5, shape: rect(-0.6, 0, 0.6, 7),
    inner: [[[-0.6, 3.6], [0.6, 3.6]]],
    tubes: [{ a: [0.25, 3.25], b: [-0.3, 4], dir: 2 }],
    bumps: [{ x: -0.35, z: 5.3, r: 0.35, h: 0.1 }] },
  /* 7. the split: a centre divider down the middle, a hump beyond it and the cup dead behind */
  { par: 2, sol: [[16,0.92,0]], tee: [0, 0.5], cup: [0, 6.2], shape: rect(-0.65, 0, 0.65, 7),
    inner: [[[0, 2.6], [0, 4.6]]],
    bumps: [{ x: 0, z: 5.3, r: 0.3, h: 0.07 }] },
  /* 8. the mound gate: two mounds with a gap between them */
  { par: 2, sol: [[0,0.68,0]], tee: [0, 0.5], cup: [-0.15, 5.7], shape: rect(-0.7, 0, 0.7, 6.6),
    bumps: [{ x: -0.42, z: 3.4, r: 0.32, h: 0.12 }, { x: 0.42, z: 3.4, r: 0.32, h: 0.12 }] },
  /* 9. banked corners: up one side, round two bank boards at the top, and back down the other */
  { par: 2, sol: [[340,1,0]], tee: [-0.62, 0.5], cup: [0.62, 3.4], aim0: 0, shape: rect(-1.25, 0, 1.25, 6),
    inner: [[[0, 0], [0, 4.6]], [[-1.25, 5], [-0.25, 6]], [[0.25, 6], [1.25, 5]]] },
  /* 10. the Z: the lane steps sideways on a slant, a two-rail bank to find the last leg */
  { par: 2, sol: [[6,0.8,0]], tee: [0, 0.5], cup: [1.8, 5.5], aim0: 15,
    shape: [[-0.6, 0], [0.6, 0], [0.6, 2.2], [2.4, 4.2], [2.4, 6.3], [1.2, 6.3], [1.2, 4.2], [-0.6, 2.2]] },
  /* 11. behind the blocker: the cup hides in a pocket behind a board, so only a bank off the back
      rail aces it */
  { par: 2, sol: [[12,1,0]], tee: [0, 0.5], cup: [0, 5.85], shape: rect(-0.7, 0, 0.7, 6.7),
    inner: [[[-0.3, 5.2], [0.3, 5.2]]] },
  /* 12. the pond: a little pool right of the cup, and a mound that kicks a lazy putt toward it */
  { par: 2, sol: [[4,0.64,0]], tee: [0, 0.5], cup: [0.15, 5.6], shape: rect(-0.75, 0, 0.75, 7),
    zones: [{ surf: 'water', poly: rect(-0.75, 4.4, -0.2, 6.2) }],
    bumps: [{ x: 0.5, z: 4.6, r: 0.35, h: 0.08 }] },
  /* 13. the elbow: the lane bends half right, a mound on the inside of the bend stops anyone
      cutting the corner and a second one waits up the far leg */
  { par: 2, sol: [[24,0.92,0]], tee: [0, 0.5], cup: [-1.5, 5.25], aim0: 350,
    shape: [[-0.6, 0], [0.6, 0], [0.6, 3.8], [-1.52, 5.92], [-2.37, 5.07], [-0.6, 3.3]],
    bumps: [{ x: -0.45, z: 3.6, r: 0.35, h: 0.09 }, { x: -0.8, z: 4.75, r: 0.28, h: 0.07 }] },
  /* 14. the billiard table: a wide box, a blocker in the middle, a bank off the side rail and a
      low mound that only lets the right pace through */
  { par: 2, sol: [[200,0.92,0]], tee: [0.5, 0.5], cup: [-0.55, 4.5], shape: rect(-1, 0, 1, 5.2),
    inner: [[[-0.4, 2.6], [0.6, 2.6]]],
    bumps: [{ x: -0.45, z: 3.7, r: 0.3, h: 0.07 }] },
  /* 15. the sentinels: past a low hill, two posts stand guard in front of the cup */
  { par: 2, sol: [[0,0.92,0]], tee: [0, 0.5], cup: [0, 6], shape: rect(-0.6, 0, 0.6, 6.8),
    posts: [{ x: -0.2, z: 5.55, r: 0.05 }, { x: 0.2, z: 5.55, r: 0.05 }],
    bumps: [{ x: -0.25, z: 3, r: 0.45, h: 0.06 }] },
  /* 16. the double dogleg: left, then up again, with bank boards in both outside corners */
  { par: 2, sol: [[12,1,0]], tee: [0, 0.5], cup: [1.4, 4.2], aim0: 0,
    shape: [[-0.6, 0], [0.6, 0], [0.6, 2], [2, 2], [2, 5], [0.8, 5], [0.8, 3.2], [-0.6, 3.2]],
    inner: [[[-0.6, 2.65], [0.2, 3.2]], [[1.4, 2], [2, 2.6]]] },
  /* 17. the fishbone: angled boards off alternate rails make a slalom; bank off the left rail
     to thread both */
  { par: 2, sol: [[22,0.96,0]], tee: [0, 0.5], cup: [-0.35, 5.9], shape: rect(-0.7, 0, 0.7, 6.8),
    inner: [[[-0.7, 2.4], [0, 2.75]], [[0.7, 4.2], [0, 4.55]]] },
  /* 18. the clubhouse: the long last lane. A hill, a gate of posts, then a wall with a pipe
     straight at the cup or the gap round the end */
  { par: 2, sol: [[0,0.84,0]], tee: [0, 0.5], cup: [-0.2, 9], shape: rect(-0.7, 0, 0.7, 10),
    bumps: [{ x: 0.2, z: 2.5, r: 0.5, h: 0.08 }],
    posts: [{ x: -0.25, z: 4.6, r: 0.06 }, { x: 0.25, z: 4.6, r: 0.06 }],
    inner: [[[-0.7, 6.6], [0.25, 6.6]]],
    tubes: [{ a: [-0.3, 6.25], b: [-0.3, 7.0], dir: 3 }] },
] });
