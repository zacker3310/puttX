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

Also from the web, so the app never re-authors what the web already draws:

- `scripts/export-scene.cjs` runs the web's own `buildHoleScene` for every hole in headless Chromium and
  writes the scenery (`ios/PuttX/Scene`: content-hashed meshes, textures, a deflated manifest per hole).
  Anything a course look's `tick` moves becomes a rig with a formula per channel, checked against the
  real tick for 3 s before it is written; the flagstick is a named rig the game poses. Then
  `node scripts/pack-scene.cjs`. `scripts/check-scene.cjs` holds a rebuilt frame to the web's pixels.
- `scripts/export-gear.cjs` builds every pro shop putter and ball with `src/shop.js`'s builders, plus
  each card's studio picture.
- `scripts/export-ui.cjs` rasterises the title illustration's layers.
- `export-ios` also writes `shop.json` (stock and coin table) and golden values for the extras (lost-ball
  spots, daily keys) and the shop (coins per finish, every putter's feel), held bit-exact by `swift test`.

The bundle id is a placeholder (`com.puttx.app` in `ios/project.yml`); set yours and a team before
running on a device.

## Roadmap

| Phase | What | State |
|---|---|---|
| 1 Core | sim, putts, border relief, rounds, progress, catalog, parity tests, CI | done |
| 2 Shell | XcodeGen project, SwiftUI scenes, one stage scaled for iPad and iPhone, 64 pt targets, no words, CI screenshots | done |
| 3 Play | the DS-style swing with `FEEL`, aim, cameras, a 240 Hz live loop, drift, hit-stop, slow motion, the drop | done |
| 4 Course | RealityKit: exported scenery with its animation, native turf and terrain, sky, fog, the flagstick | done; neon night still to come |
| 5 Sound | the WebAudio synth on AVAudioEngine; haptics | done |
| 6 Platform | Game Center, iCloud key-value saves (lossless merge), GameController | done; needs App Store Connect ids |
| 7 Extras | mulligans, lost balls, goals, daily hole, ghosts, ace replay, FX, pro shop, pass and play | done; practice, guide, slope read and shot codes to come |
| 8 Ship | icons, launch screen, accessibility, App Store listing (Kids Category: free, no data collected) | |

Notes:
- iCloud merge is conflict-free by design: a best only goes down, stars only go up, unlocked worlds only
  grow, so two devices' saves merge by min / max / union with no "which one wins" prompt.
- Renderer is RealityKit, not SceneKit (deprecated in 2025).
- Minimum iOS 18.
