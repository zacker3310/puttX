# Tasks

Spec: [[SPEC]]. v1 (T1-T4) shipped 27 holes for a 3-5 year old; v2 retargets 12 year olds.

## v2: harder, real putter, ten courses

- [x] V2.1: Sources split into `src/` and `courses/`; `scripts/build.cjs` assembles `index.html`; build-check
- [x] V2.2: Physics v2: smaller ball, crest launch, exact slopes, skid, chord cup capture, bounces, cliffs, tiers, ramps, tubes, water, push zones, windmills, gates
- [x] V2.3: DS-style putter swing pad, 3D putter, draped aim line, pin pulled, overview camera, shot readout
- [x] V2.4: Solver with refinement and noisy-bot difficulty; holes-check on workers with overlap rules and the not-a-gimme gate
- [x] V2.5: Courses 1-10, 18 holes each (`courses/cNN.*.js`)
- [x] V2.6: Pro shop: coins, putters (stroke forgiveness), balls (`src/shop.js`, `tests/shop-check.cjs`)
- [x] V2.7: Publish to GitHub Pages from main
- [x] V2.8: Mulligan tokens, lost balls, three goals per hole, daily hole, shot codes, practice, night remixes (`tests/extras-check.cjs`, `tests/night-check.cjs`)

## Next

The ranked 20 in `docs/RESEARCH.md`: ghost ball, shot readout extensions, intentional spin, three-objective stars, lost balls, night remixes, and more.
