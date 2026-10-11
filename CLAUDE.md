# PuttX: notes for Claude Code

One-file 3D mini golf for a 3-5 year old, set in vroom's worlds. `index.html` holds the CSS, the
scene markup, three.js r170 (`<script id="three">`, written by `npm run vendor`) and, after it,
the game script (`<script id="game">`). Never hand-edit or Read the three block:
it is one ~690 KB line. Grep `index.html` with offsets instead. `SPEC.md` is the design,
`TASKS.md` the queue, `.buildloop/current-plan.md` the plan.

## Rules the suites enforce

- Zero words on screen: numerals and symbols only. `aria-label`s are fine.
- No fail states: every hole finishes (the stroke cap, par + 3, auto-sinks); stars and bests only go up.
- Tap targets at least 64 px rendered at 1024x768 (88 stage px buttons).
- Toybox look: the `--v-*` tokens from vroom, flat shadows, big radii.
- The `// #region sim` block is DOM-free, THREE-free and deterministic (no Math.random, no
  clocks). `tests/sim.cjs` runs it in Node. Keep it that way.
- Honour `prefers-reduced-motion` for anything decorative.
- No em dashes anywhere.

## Working here

    npm ci && npx playwright-core install chromium
    npm test                       # every suite; serves the repo on a free port
    npm run lint                   # ESLint over the game script, must be 0 findings
    npm run solve -- --world 5     # prove pars and print sol arrays for a world
    npm run vendor                 # re-inline three.js after changing its version
    python3 -m http.server 4173    # then http://localhost:4173/?hole=1-3 or ?map
