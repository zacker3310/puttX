# Course authoring guide

PuttX v2 has 10 courses of 18 holes for players around 12. Each course is two files:

- `courses/cNN.sim.js` holds the holes. It is pure data inlined into the deterministic sim region, so no `THREE`, DOM, `Math.random` or clocks.
- `courses/cNN.look.js` sets `WORLD_LOOK[N]`: colours, props, custom post and mover meshes, decor and per-frame `tick`. It may use `THREE`.

`scripts/build.cjs` inlines both into `index.html`. Do not edit `index.html`, `src/` or anything outside your two files.

## Coordinates and units

Units are metres and seconds, and y is up. A hole lies in the x-z plane, and the tee usually sits near z = 0.5 with play heading toward +z.
- **Angles** are degrees, 0 is +z and 90 is +x. On screen, from behind the ball, +x is to the **left**.
- **Ball** radius is 0.051 and **cup** radius is 0.11.
- **Walls** are 0.1 thick (`WALL_HALF` 0.05) and stand 0.15 over the highest ground next to them.
- **Full power** rolls about 14.5 m on felt. Keep holes inside about 14 x 14 m; most are 3-8 m long.
- **Lanes** need to be at least 0.6 m wide between wall centre lines, and choke points at least 0.4 m (the ball is 0.1 wide).

## A hole

```js
registerWorld(N, { g: 1, feltMu: 0.075, holes: [
  { par: 3, sol: [[12.5, 0.62, 0], [181, 0.3, 0]], tee: [0, 0.5], cup: [1.8, 6.2], aim0: 0,
    shape: [[-0.6, 0], [0.6, 0], [0.6, 4], [2.4, 4], [2.4, 7], [-0.6, 7]],      // walled: one floor + its outline wall
    inner: [[[-0.6, 2.5], [0.2, 2.5]]],                                           // extra wall polylines
    tiers: [{ poly: rect(-0.6, 4, 2.4, 7), h: 0.25, sx: 0, sz: 0.02 }],          // raised (optionally tilted) plateau
    ramps: [{ x0: -0.6, z0: 3, x1: 0.6, z1: 4, axis: 'z', h0: 0, h1: 0.25 }],   // rises h0 -> h1 along +axis; beats tiers
    bumps: [{ x: 1.2, z: 5.5, r: 0.5, h: 0.12 }],                                 // gaussian hill (h > 0) or bowl (h < 0)
    zones: [{ surf: 'sand', poly: rect(...) }, { surf: 'water', poly: ... }, { push: [0, 1.2], poly: ... }],
    posts: [{ x, z, r, e?, top?, look? }],                                        // e > 1 is a bumper that adds speed
    movers: [{ kind: 'spin', x, z, len, w, phase, blades?: 2, look? },           // arm(s) through a hub; blades 2 = windmill cross
             { kind: 'slide', ax, az, bx, bz, r, period, phase?, look? },        // disc easing A <-> B
             { kind: 'gate', ax, az, bx, bz, len, ang, period, phase?, look? }], // wall bar of half-length len, heading ang, easing A <-> B
    tubes: [{ a: [x, z], b: [x, z], dir: 90, keep?: 0.7, add?: 0.3 }],         // mouth a swallows the ball, b spits it out heading dir
  },
] });
```

- **Helpers:** use `rect(x0, z0, x1, z1)` and `ring(pts)`.
- **Walled hole:** use `shape`. It is one floor with a closed outline wall.
- **Open hole** (gaps, drop-offs, floating platforms): use `floors: [poly, ...]` and `walls: [polyline, ...]` yourself. A ball that leaves every floor falls, and below y = -1 it is out of bounds: back to where it was putted from, plus one stroke.
- **Height** is the ramp under (x, z), else the last tier containing it, else 0, plus every bump. Tiers can be tilted with `sx`/`sz` (rise per metre in x/z, about the origin).
- **Cliffs:**
  - Ground that rises more than 3 cm under the ball's leading edge is a cliff face, and the ball bounces off it. Going **up** a tier needs a ramp.
  - Going **down** off a tier edge is a real drop, with air time and a landing bounce.
  - Wall off tier edges you don't want the ball to drop from.
- **Crests:** the ball leaves the ground wherever the ground falls away faster than gravity can bend its path, so fast balls get air off hill tops and ramp lips.
- **Surfaces** (rolling friction mu):

  | Surface | mu | Effect |
  |---|---|---|
  | felt | 0.075 | default |
  | fast | 0.04 | |
  | ice | 0.02 | |
  | sand | 0.4 | |
  | mud | 0.75 | |
  | water | | hazard: the ball goes back to where it was putted from, plus one stroke |

- **Push zones** are conveyors and fans: `{ push: [ax, az], poly }` is a constant acceleration in m/s² while the ball rolls on the zone. A push can be combined with `surf`.
- **Tubes:**
  - A rolling ball whose centre comes within 0.12 of mouth `a` vanishes for 0.45 s.
  - It then comes out at `b` heading `dir` at `speed * keep + add` (defaults 0.7 and 0.3).
  - Mouths and exits must sit on flat floor, at least 0.19 from wall lines. The exit needs 0.3 m of clear floor in its direction.
- **Cup** capture:
  - A ball over the cup drops if it is slower than 1.45 m/s times the chord factor `sqrt(1 - (offset/0.11)^2)`. A ball crawling at under 0.22 m/s always drops.
  - A faster dead-centre ball hops out. A faster off-centre ball lips out, deflected more the further off-centre it is.
- **`aim0`** is the opening aim at the tee in degrees. Set it whenever the cup is not the way to go from the tee: blind doglegs, tubes, bank shots.
- **`par`** is 2 to 5. The stroke cap is double par: the ball auto-sinks and the hole scores double par, so there are no fail states.
- **`sol`** is a list of `[angle, power, t0]` from `scripts/solve.cjs`. `holes-check` replays it, so it must sink within par.
- **Course options** on `registerWorld`: `g` is the gravity scale (space is 0.427) and `feltMu` is the felt friction.

## Look file

```js
WORLD_LOOK[N] = {
  felt, wall, ground /* or null for a void */, sky: [top, bottom], fog, flag, icon /* inline SVG, 64x64 viewBox */,
  sand, ice, mud, fast, water /* lava? make it orange */, push, skirt /* side faces of raised floors */, tube,
  jingle: [hz, ...],
  prop(r) { return group },          // scenery outside the course; r() is a seeded random. Placed >= 0.5 m from any floor or wall
  post(p, look) { return group },    // custom mesh for posts with your `look` tag (default: a wall-coloured cylinder)
  mover(m, look) { return group },   // custom mesh for movers; spin: arms along local z, one per blade at i*PI/blades
  decor(group, h) {},                 // anything extra; keep it off the course and out of the camera's way
  tick(group, dt, t) {},              // per frame; honour reducedMotion() for decoration
};
```

Look rules:
- Use vroom's toybox palette (`--v-*` values in `src/shell.html`): chunky, rounded, flat colours.
- The white ball must read at 3:1 or better against your felt and your surfaces.
- Keep geometry low-poly: one shadow light, 60 fps on an iPad.
- Decor must never sit on or float over the playing surface, and must not block the camera behind the tee.

## Design brief: harder, for 12-year-olds

- **Shape of a course:** holes 1-5 are a warm-up that teaches the course's signature mechanic, 6-12 combine it with others, 13-18 are hard, and hole 18 is the showpiece.
- **Multi-part holes:** at least 5 holes per course are crazy 3-4 part holes. That means 3 or 4 distinct sections joined by ramps, drops, tubes or gaps: upper deck, then tube, then lower green, then a guarded cup.
- **Big hills** belong everywhere: bumps up to h 0.35, steep banks, crater cups, tilted greens that need reading.
- **Not a gimme:** at most 4% of tee shots may ace (`holes-check` enforces this). Aces should take a precise bank or a deliberate tube.
- **Difficulty target:** the noisy bot (`--bot`) mean minus par sits around `0.1 + 0.07 * (N - 1)` to `0.5 + 0.08 * (N - 1)` across the course. Course 1 is about par+0.1 to par+0.5; course 10 is about par+0.7 to par+1.2. Individual holes may sit outside the band.
- **Par total** for the 18 holes is between 54 and 70.
- **Risk-reward:** offer a short risky line (narrow ramp, tube, water carry) next to a safe longer line wherever you can.
- **Clean layouts:**
  - Every wall, post, mover, tube and zone sits cleanly; nothing overlaps or pokes through anything.
  - The cup sits on flat ground with clear approach space.
  - Movers never sweep the tee, the cup or a post.
  - `holes-check` enforces most of this; the screenshots catch the rest.

## Workflow (your course only)

Set `CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` for the screenshot tool.

```sh
PUTTX_ONLY=N node scripts/solve.cjs --hole N-7            # prove one hole while designing (fast)
PUTTX_ONLY=N node scripts/solve.cjs --hole N-7 --bot      # how hard is it really
PUTTX_ONLY=N node scripts/solve.cjs --course N --bot      # the whole course at the end (slow)
PUTTX_ONLY=N node tests/holes-check.cjs                   # well formed, nothing stuffed, sol replays, not a gimme
PUTTX_ONLY=N node tests/lint.cjs                          # 0 findings
node scripts/shot.cjs --course N [--hole N-7] [--swing]   # PNGs in preview/shots/cNN/: LOOK at them
```

- Paste each `sol:` line the solver prints into its hole.
- After any change to a hole, re-solve it; the old `sol` is stale.
- The machine has 4 cores shared with 10 other agents. Solve hole by hole while you design, and run the whole-course `--bot` once near the end.
- Never run `npm test` or `npm run build`, never write `index.html`, and never commit; the lead integrates.
