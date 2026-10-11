# Tasks

Plan: [[.buildloop/current-plan|current plan]]. Spec: [[SPEC]].

## Phase 1: Engine

- [ ] T1.1: Scaffold, test harness, page shell, three.js r170 inlined
  - `index.html`
  - `scripts/vendor-three.cjs`
  - `tests/run-all.cjs`
  - `tests/boot-check.cjs`
  - Verification: `npm test -- --only boot-check` 7/7 and `npm run lint` 0 findings
- [ ] T1.2: Deterministic ball physics: walls, slopes, surfaces, cup, ramps, air
  - `index.html`
  - `tests/physics-check.cjs`
  - Verification: `npm test -- --only physics-check` 13/13
- [ ] T1.3: Posts, bumpers, spinning arms, sliders
  - `index.html`
  - `tests/physics-check.cjs`
  - Verification: `npm test -- --only physics-check` 23/23
- [ ] T1.4: Rounds, par+3 cap, worlds registry, progress and save
  - `index.html`
  - `tests/round-check.cjs`
  - `tests/save-check.cjs`
  - Verification: `npm test -- --only round-check,save-check` 17/17 and 7/7

## Phase 2: Construction day, playable end to end

- [ ] T2.1: Hole bot and construction day's 9 proven holes
  - `scripts/solve.cjs`
  - `tests/holes-check.cjs`
  - Verification: `npm run solve -- --world 1` all ok and `npm test -- --only holes-check` 29/29
- [ ] T2.2: three.js hole renderer, aim camera, construction look
  - `index.html`
  - `tests/render-check.cjs`
  - Verification: `npm test -- --only render-check` 10/10
- [ ] T2.3: Synthesized audio
  - `index.html`
  - `tests/audio-check.cjs`
  - Verification: `npm test -- --only audio-check` 5/5
- [ ] T2.4: Drag to putt, fixed-step live loop, HUD, drift, cap auto-sink, hole result
  - `index.html`
  - `tests/play-check.cjs`
  - Verification: `npm test -- --only play-check` 15/15
- [ ] T2.5: Orbiting title, world map, world card, speaker toggle
  - `index.html`
  - `tests/ui-check.cjs`
  - Verification: `npm test` all suites ok, `ui-check` 17/17

## Phase 3: Juice and worlds

- [ ] T3.1: Trail, squash, flag pop, confetti, reduced motion
  - `index.html`
  - `tests/fx-check.cjs`
  - Verification: `npm test -- --only fx-check` 7/7
- [ ] T3.2: Snow world: 9 proven holes, ice, snowmen, snowballs, snowfall
  - `index.html`
  - `tests/render-check.cjs`
  - Verification: `npm run solve -- --world 5` all ok and `npm test` all suites ok
- [ ] T3.3: Space world: 9 proven holes, ramps over gaps, craters, aliens, asteroids
  - `index.html`
  - `package.json`
  - Verification: `npm run solve -- --world 8` all ok and `npm test` all suites ok with 27 holes

## Phase 4: Ship

- [ ] T4.1: Home-screen install, icons, CI workflow, perf guard, README
  - `manifest.webmanifest`
  - `.github/workflows/test.yml`
  - `tests/perf-check.cjs`
  - Verification: `npm run lint` 0 findings and `npm test` all suites ok
- [ ] T4.2: Publish to GitHub Pages (needs Zac's go-ahead)
  - `README.md`
  - Verification: live URL serves the page and `boot-check,ui-check` pass against it
