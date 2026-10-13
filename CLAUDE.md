# PuttX: notes for Claude Code

Hard one-file 3D mini golf for players around 12: ten courses of 18 holes, a DS-style putter
swing, a pro shop. The shipped `index.html` is **generated** by `npm run build` from:

- `src/shell.html`: CSS and scene markup
- `src/game.js`: the game script (sim, save, audio, render, play, scenes, fx, boot)
- `src/shop.js`: the pro shop (coins, putters, balls), inlined before boot
- `courses/cNN.sim.js` + `courses/cNN.look.js`: one course's holes (sim region) and look (render)
- three.js r170 from `node_modules`

Never hand-edit or Read `index.html` (the three.js line is ~690 KB). Edit the sources and run
`npm run build`; `build-check` fails when `index.html` is stale. `SPEC.md` is the design,
`docs/COURSE_GUIDE.md` the hole format and course brief, `docs/RESEARCH.md` the feature backlog.

## Rules the suites enforce

- Zero words on screen: numerals and symbols only. `aria-label`s are fine.
- No fail states: every hole finishes (the stroke cap, double par, auto-sinks); stars and bests only go up.
- Tap targets at least 64 px rendered at 1024x768 (88 stage px buttons).
- Toybox look: the `--v-*` tokens from vroom, flat shadows, big radii.
- The `// #region sim` block is DOM-free, THREE-free and deterministic (no Math.random, no
  clocks). `tests/sim.cjs` runs it in Node straight from `src/` and `courses/`. Keep it that way.
  The pro shop may change how a swing gesture becomes (angle, power) via `FEEL`, never the sim.
- Every hole: par proven by the solver (`sol`), at most 4% of tee shots ace, nothing stuffed
  into anything (`holes-check`).
- Honour `prefers-reduced-motion` for anything decorative.
- No em dashes anywhere.

## Working here

    npm ci && npx playwright-core install chromium
    npm run build                          # src/ + courses/ + three.js -> index.html
    npm test                               # every suite (builds preview/test.html itself)
    npm run lint                           # ESLint over the assembled game script, 0 findings
    npm run solve -- --course 5 --bot      # prove pars, print sol arrays, measure difficulty
    PUTTX_ONLY=5 node tests/holes-check.cjs  # one course's holes
    npm run shot -- --course 5 [--swing]   # PNGs of every hole in preview/shots/
    python3 -m http.server 4173            # then http://localhost:4173/?hole=1-3 or ?map
