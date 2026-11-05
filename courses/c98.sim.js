/* course 98, the Classic: a homage to the original Putt-Putt. Flat green carpet on concrete,
   aluminium bumpboards built for banking, every hole a par 2 with an ace on for a precise line,
   and only the old simple obstacles: low hills and mounds, metal blockers and posts, angled bank
   boards, two short pipes and one small pond. Decorations never come into play. */
registerWorld(98, { holes: [
  /* 1. the first lane: a straight carpet lane with a low hill across the middle */
  { par: 2, tee: [0, 0.5], cup: [-0.2, 5.8], shape: rect(-0.55, 0, 0.55, 6.6),
    bumps: [{ x: 0.1, z: 3.4, r: 0.45, h: 0.08 }] },
] });
