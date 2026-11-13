# PuttX for iOS

A full native port: Swift, SwiftUI for the toybox UI, RealityKit for the course, iPad and iPhone.
Free, no in-app purchases, no ads, no analytics. Core Haptics, Game Center, iCloud saves, game controllers.

## The one rule: JS stays the source of truth for holes

Holes are authored in `courses/cNN.sim.js` and proven by the JS solver. They are not ported by hand.
`scripts/export-ios.cjs` resolves every hole to `ios/PuttXCore/Sources/PuttXCore/Resources/holes.json`
and records golden putts (every hole's `sol` replay plus a fixed fan of 12 shots, each with every
contact) to `ios/PuttXCore/Tests/PuttXCoreTests/Resources/golden.json`.

The Swift sim (`ios/PuttXCore`) is a line-for-line port of `// #region sim` and must match those
putts **to the bit**: same end, same step count, same contacts with the same speeds, same rest spot.
It can, because the JS sim already brings its own fdlibm `sin`/`cos`/`exp` and uses `sqrt`, never
`hypot`. A 1e-10 change to one constant fails hundreds of putts, so the test has teeth.

Changing the physics: change JS, re-prove (`node scripts/resolve.cjs`), re-export, mirror the change
in `Sim.swift` keeping the JS evaluation order, run `swift test`. `npm test` (suite `ios-check`)
fails while the exported JSON is stale; the `ios` workflow runs the parity tests on Apple silicon.

    node scripts/export-ios.cjs                     # after any course, look or physics change
    cd ios/PuttXCore && swift test -c release       # parity, about 2 s
    cd ios && xcodegen && open PuttX.xcodeproj      # the app (brew install xcodegen)

The app takes launch arguments for testing: `-route title|profiles|worlds|world:N|map:N|hole:N-M|card:N`
and `-demo` (a profile with every course played). `ios/scripts/shots.sh` screenshots every scene on an
iPad and an iPhone simulator; CI uploads them as the `shots` artifact.

What else export-ios writes for the app: `ios/PuttX/Resources/looks.json` (each course's palette, as
`lookOf` resolves it), the course icons and UI glyphs as vector SVGs in `ios/PuttX/Assets.xcassets/Art`,
and `play.json` (720 pad gestures scored by the web's `computeStroke`, and `toFixed` cases) for the
stroke tests.

The bundle id is a placeholder (`com.puttx.app` in `ios/project.yml`); set yours and a team before
running on a device.

## Roadmap

| Phase | What | State |
|---|---|---|
| 1 Core | sim, putts, border relief, rounds, progress, catalog, parity tests, CI | done |
| 2 Shell | XcodeGen project, SwiftUI scenes (title, profiles, worlds, world, map, hole, card), one stage scaled for iPad and iPhone, 64 pt targets, no words, CI screenshots | done |
| 3 Play | the DS-style swing ported with `FEEL`, aim, camera rig, a live loop stepping the sim at 240 Hz and drawing at 120 Hz (ProMotion), drift | stroke, aim, putt log, live loop, drift done; camera with phase 4 |
| 4 Course | RealityKit: procedural turf, borders, cup, flag, movers, tubes; then each `cNN.look.js` as a Swift look | |
| 5 Sound | the WebAudio synth on AVAudioEngine source nodes; audio session honours the silent switch | |
| 6 Platform | Core Haptics, Game Center (a board per course, achievements), iCloud key-value saves, GameController | |
| 7 Extras | pro shop, ghosts, daily, the party, the classic and the bonus nine | |
| 8 Ship | icons, launch screen, accessibility, App Store listing (Kids Category: free, no data collected) | |

Notes:
- iCloud merge is conflict-free by design: a best only goes down, stars only go up, unlocked worlds only
  grow, so two devices' saves merge by min / max / union with no "which one wins" prompt.
- Renderer is RealityKit, not SceneKit (deprecated in 2025).
- Minimum iOS 18.
