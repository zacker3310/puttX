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

## v3: real physics, real course, real mini golf

- [x] V3.1: Rigid-ball physics with spin: slide then roll, rails that check and hop, a real cup with a rounded lip, the border relief rule (`docs/research/PHYSICS.md`)
- [x] V3.2: `scripts/resolve.cjs`: re-prove every hole after a physics change and write the sols back
- [x] V3.3: Realistic course: procedural turf with nap and stripes, baked contact shadow, material borders, landscaping, sky lighting, numbered flags, cup ferrule, tee mats, hole markers
- [x] V3.4: Pass and play for 2 to 4 (`tests/party-check.cjs`), the paper scorecard, the last-hole bell and ball return
- [x] V3.5: Sound: borders by material, the roll by surface, course soundscapes, haptics; putt tracer, pin tag, hit-stop, colour-blind tube shapes
- Research behind v3: `docs/research/` (physics, real mini golf, premier apps)

## Next

- **UI overhaul (paused):** multiplayer into the options, a polished UI for older players, a new app
  icon and favicon. The design round is done (Clubhouse won); see `docs/UI_OVERHAUL.md` to pick it up.

The ranked 20 in `docs/RESEARCH.md`: ghost ball, shot readout extensions, intentional spin, three-objective stars, lost balls, night remixes, and more.
