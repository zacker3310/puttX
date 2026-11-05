# PuttX: 25 things premier golf games do that PuttX does not (yet)

Scope and method. I read `SPEC.md` and `docs/RESEARCH.md` first, so none of their 20 items come back here unless there is something materially new. I also checked the current source so I would not suggest things PuttX already has. It already has:
- a hole-intro flyover and a cup cam on the drop
- an ace-only replay (`startReplay` in `src/game.js`)
- camera shake on big landings, and squash on hard hits
- a 0.4 s fading dot trail while the ball rolls
- left-handed mode, the ghost ball, the slope read and the birdie tracker
- three profiles, an end-of-course card of bests, mulligans, lost balls, the daily hole, shot codes, practice and neon night
- an offline service worker and an update button

Effort uses the same scale as RESEARCH.md: S = days, M = 1-2 weeks, L = more than that.

---

## Ranked list

### 1. Bring back the rolling sound, and make it depend on the surface
- **What:** Bring back a rolling sound. Its loudness and brightness follow ball speed, and each surface gets its own colour: soft on felt, brighter on fast, a thin hiss on ice, a crunch on sand, a dull thud on mud. Add a tiny tick on bumps and seams. Right now the roll is deliberately silent: `setRoll` says "the rolling hiss is gone: the ball rolls quietly" (`src/game.js`).
- **Which game:** Walkabout Mini Golf; OK Golf.
- **Source:**
  - Walkabout is praised for its "satisfying sounds and calming music" ([UploadVR](https://www.uploadvr.com/walkabout-mini-golf-review/)).
  - OK Golf for its "satisfying whooshes and thwacks" ([TapSmart](https://www.tapsmart.com/games/review-ok-golf-stylish-simplistic-super-relaxing-golf-game/?amp=1)).
  - Sony's Nicolas Fournel (GDC 2010) names the rolling ball as a sound that is "highly dependent on the game physics", and lists "Friction (scraping / rolling / sliding)" as a model that should "interface with game physics engine" ([slides](https://www.sambuz.com/doc/procedural-audio-for-video-games-are-we-there-yet-ppt-presentation-694942), [GDC Vault](https://www.gdcvault.com/play/1012645/ProceduralAudio-for-Video-Games)).
  - Lee, Depalle and Scavone (DAFx 2010) model rolling as a chain of tiny collisions, each with its own resonances ([DAFx](https://dafx.de/paper-archive/details/DmRVJlUed9QVmNuMujK43g)).
- **Why it matters:** A silent roll reads as a token sliding, not a ball on carpet. Sound is the cheapest realism there is.
- **Zero words:** Pure audio, controlled by the existing sound button.
- **How:** Reuse the looped noise buffer and `rollGain`. Each frame, set gain from speed and the low-pass cutoff from speed and `zoneAt(h, x, z)`. Only the render side reads the sim; the sim is untouched.
- **Effort:** S

### 2. Hit-stop on contact and on the drop
- **What:** Hold the rendered frame for a moment on a clean strike (longer at full power) and when the ball drops in, together with the existing squash. As a suggested start, try 40-80 ms and tune by feel.
- **Which game:** Super Smash Bros. (Sakurai's design rule), applied here to the putt.
- **Source:**
  - Sakurai's "Stop for Big Moments" calls the freeze "vital for really letting the player feel the impact" ([Nintendo Wire](https://nintendowire.com/news/2022/12/12/this-week-in-sakurai-12-5-12-11-fine-tuning-hit-stop-and-cheating-the-system/)).
  - His Famitsu column calls hitstop "more or less a visual effect" and caps its maximum length ([Source Gaming](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/)).
  - See also Jonasson and Purho, "Juice It or Lose It" ([GDC Vault](https://gdcvault.com/play/1016789/Juice-It-or-Lose)).
- **Why it matters:** The DS swing's moment of contact is the heart of the game, and right now it gets only a sound and a follow-through.
- **Zero words:** Motion only.
- **How:** Hold `simAcc` for N ms after `strike()`. The 240 Hz steps are only delayed, so the result is bit-identical.
- **Effort:** S

### 3. One tap from the title to the next unplayed hole
- **What:** A returning player taps five times to putt: play, profile, world, course, hole (`showProfiles` > `showWorlds` > `showWorld` > `showMap` > `goHole`). Add a big "continue" button on the profile card that goes straight to the next unfinished hole. Keep the map for choosing.
- **Which game:** Desert Golfing, which has no menus and starts you on the ball ([Wikipedia](https://en.wikipedia.org/wiki/Desert_Golfing)).
- **Source:**
  - Apple, WWDC17 "Design Tips for Great Games": "being able to start quickly and jump into your game is key" ([Apple](https://developer.apple.com/videos/play/wwdc2017/811)).
  - The HIG says people "sometimes won't wait more than a couple of seconds" ([HIG Launching](https://developer.apple.com/design/human-interface-guidelines/launching)).
- **Why it matters:** Short sessions. Every tap saved is another hole played.
- **Zero words:** A play triangle over the next hole's number and its course icon.
- **Effort:** S

### 4. A full-screen course view, plus home-screen polish
- **What:** The 3D canvas is a 1200x700 box scaled by `min(innerWidth/1200, innerHeight/700)` (`fit()` in `src/game.js`; `#view` is inside `#stage` in `src/shell.html`). At 1024x768 that renders the course at 1024x597 and leaves 171 px (22% of the screen) as brown bars. The fix:
  - Draw the canvas full-window and keep only the HUD on the stage, pinned with `env(safe-area-inset-*)`.
  - Add an icon-only "add to home screen" hint for Safari.
  - Keep the screen awake while a hole is in play.
- **Which game:** Every premium iPad game fills the glass. This item is a platform fix rather than a feature copied from one title.
- **Source:**
  - Safe areas: [WebKit](https://webkit.org/blog/7929/designing-websites-for-iphone-x/).
  - Safari has no `beforeinstallprompt` event; WebKit points to the share-sheet flow instead ([WebKit 193959](https://bugs.webkit.org/show_bug.cgi?id=193959), [WebKit 255716](https://bugs.webkit.org/show_bug.cgi?id=255716)).
  - Wake Lock works in iOS Safari 16.4+, and a secondary source says the home-screen app bug was fixed in iOS 18.4 ([Progressier](https://progressier.com/pwa-capabilities/screen-wake-lock), [WebKit 254545](https://bugs.webkit.org/show_bug.cgi?id=254545)).
- **Why it matters:** It is the biggest "real greens" gain per hour, because more green is on screen.
- **Zero words:** The install hint is three glyphs: share box, arrow, plus square.
- **Effort:** M. Camera framing changes, and the render and ui suites assume 1200x700.

### 5. Distance and rise numerals for the putt
- **What:** While aiming, a chip shows the distance to the cup (for example 4.2) and the rise or fall (an arrow plus centimetres). On a multi-tier hole it measures to the aim ring instead.
- **Which game:** EA Sports PGA Tour.
- **Source:** Its Elevation setting "Shows the elevation to the aim location and the pin on the in-game HUD", and Assisted Aim "accounts for uphill and downhill slopes" ([EA settings](https://www.ea.com/able/resources/ea-sports-pga-tour/ea-sports-pga-tour/pc/gameplay)).
- **Why it matters:** Pace is the hard half of putting. A number lets a 12-year-old build a mental table ("4 m uphill = three-quarter swing") next to the shot readout's power.
- **Zero words:** A ruler glyph, an up or down arrow, and numerals.
- **Effort:** S

### 6. Putt tracer: the whole line the ball took
- **What:** After each putt, a painted line of the full path stays on the green, coloured by speed, until the next stroke. Today's dot trail fades after 0.4 s (`trailDots` in `src/game.js`), so the whole curve is never visible at once.
- **Which game:** Tiger Vision (Tiger Woods PGA Tour on PC), now in Putt Vision.
- **Source:** Putt Vision "implements the early 2000's PC game feature, Tiger Vision, in real life", with "Real-time ball tracking for your putts" ([App Store](https://apps.apple.com/us/app/id1465601144)).
- **Why it matters:** Seeing the bend teaches break better than any readout, and it pairs with the slope read.
- **Zero words:** Graphic only.
- **How:** Record positions on the render side and reuse the aim line's ribbon mesh.
- **Effort:** S

### 7. A "show me" guide ghost from the solver
- **What:** After the player struggles on a hole (for example the second double-par auto-sink), a guide icon appears. Tapping it plays the hole's proven `sol` putts through the existing ghost renderer, and the player can take over at any moment. A hole cleared with help gets a small mark instead of its best star.
- **Which game:** New Super Mario Bros. Wii, Super Guide.
- **Source:**
  - Super Guide appears after the player "failed to pass a level at least eight times" and plays the level with a CPU Luigi. The player can press Plus "at any time to take control again".
  - NSMB U lowers this to five losses, and Galaxy 2 gives a Bronze Star instead ([MarioWiki](https://www.mariowiki.com/Super_Guide)).
- **Why it matters:** Hard holes, no fail states. Every hole already ships a solver-proven par line (CLAUDE.md), so the hint is free and always correct.
- **Zero words:** A ghost-ball icon with a "?".
- **Effort:** S. It depends on the `sol` arrays being re-proven under the new physics.

### 8. A real scorecard: circles, squares, front and back nine
- **What:** The course card shows the best score per hole, marked only by colour classes (`under`, `par` in `showCard`). Use golf's own marks instead: a circle for birdie, a double circle for eagle, a square for bogey, a double square for double bogey. Add 1-9 and 10-18 subtotals, a "this round" row next to "best", and a mini card you can peek at from the HUD.
- **Which game:** Real golf; Walkabout tracks nines.
- **Source:**
  - Scorecard marks ([The Golf News Net](https://thegolfnewsnet.com/ryan_ballengee/2024/02/17/what-circles-squares-golf-scorecard-mean-105507/)).
  - Walkabout's "Executive Course: Complete any front or back 9 course" trophy ([PSFanatic](https://www.psfanatic.com/ps-vr2s-walkabout-mini-golf-trophy-list-includes-a-platinum/)).
- **Why it matters:** The marks are wordless by nature, safe for colour-blind players, and feel like real golf.
- **Zero words:** Symbols and numerals only.
- **Effort:** S-M. It needs a per-round log; today only bests are saved.

### 9. Colour-blind safe signals
- **What:**
  - Tube pairs are matched by rim colour alone (`tubeGroup`: "a pair shares a colour"). Give each pair a shape on mouth and exit (circle, triangle, square, star).
  - Slope arrows get "redder where steeper": keep length as the main cue and use a blue-to-orange ramp.
  - The course card's colour-only cells are fixed by item 8.
- **Which game:** Industry guidelines rather than one title.
- **Source:**
  - "Ensure no essential information is conveyed by a fixed colour alone" ([Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/basic/)); see also [Xbox Accessibility Guideline 103](https://learn.microsoft.com/en-gb/gaming/accessibility/xbox-accessibility-guidelines/103).
  - Colour vision deficiency affects about 1 in 12 males and 1 in 200 females ([Live Science](https://www.livescience.com/health/genetics/why-is-color-blindness-so-much-more-common-in-men-than-in-women)).
- **Why it matters:** In a class of 12-year-olds, a colour-only tube pair stumps roughly one boy in twelve.
- **Zero words:** Shapes.
- **Effort:** S

### 10. Lifetime putting stats
- **What:** A stats page per profile:
  - average against par per course
  - one-putt %
  - three-putt avoidance
  - longest putt holed, in metres
  - balls banked into the cup off a wall
  - aces, and total distance rolled
- **Which game:** PGA Tour broadcasts and stats; EA Sports PGA Tour; Golf+.
- **Source:**
  - PGA Tour player pages list "One-Putt Percentage" and "Longest Putts" ([pgatour.com](https://www.pgatour.com/es/player/34256/Andrew-Putnam/stats)).
  - 3-Putt Avoidance counts three putts or worse ([Golf Monthly](https://www.golfmonthly.com/tour/how-often-do-pga-tour-pros-3-putt)).
  - EA headlined ShotLink data ([National Club Golfer](https://www.nationalclubgolfer.com/tour/19th-hole/ea-sports-pga-tour-review/)).
  - A Golf+ reviewer found its tracked data matched their real stats ([Golfer's Authority](https://golfersauthority.com/golfplus-vr-headset/)).
- **Why it matters:** Numbers that only go up give a reason to replay, and they fit the "bests only go up" rule.
- **Zero words:** An icon per stat, plus numerals and %.
- **Effort:** S-M

### 11. Instant replay of any putt, and a highlight reel
- **What:** A replay button on the done card replays the last putt from the low side camera; today `startReplay` runs only for aces. The course card adds a short reel of the best moments (longest putt holed, biggest bank, ace).
- **Which game:** PGA Tour 2K23.
- **Source:** After a round, "your best moments will be conveniently saved for you to view later" ([VideoGamer](https://www.videogamer.com/news/pga-tour-2k23-how-to-view-saved-shots)).
- **Why it matters:** Kids show each other shots. The deterministic sim means storing only the inputs, which `startReplay` already re-simulates.
- **Zero words:** A replay glyph and a film-strip glyph.
- **Effort:** M

### 12. Shader warm-up, a steady 60 fps, and a graceful 30
- **What:**
  - Compile the next hole's materials during the iris wipe with `renderer.compileAsync` (r170 ships it; checked in `node_modules/three`).
  - Add dynamic resolution: today the pixel ratio is fixed at `min(2, dpr*scale)`; step it down when frames run over 16.7 ms.
  - Make camera smoothing and particles look right at 30 fps.
- **Which game:** Platform polish rather than a feature copied from one title.
- **Source:**
  - `compileAsync` came in three.js [PR #19752](https://github.com/mrdoob/three.js/pull/19752). [MDN](https://developer.mozilla.org/docs/Web/API/KHR_parallel_shader_compile) says the parallel-compile extension removes stalls but not total time.
  - WebKit caps requestAnimationFrame at 30 fps in Low Power Mode on purpose ([WebKit 215745](https://bugs.webkit.org/show_bug.cgi?id=215745)).
- **Why it matters:** A hitch on the first frame of a hole, or after a mover first appears, is the first thing that reads as "not premium".
- **Zero words:** Invisible.
- **Effort:** M

### 13. Scout camera
- **What:** In the overview (the eye), drag to pan, pinch to zoom, and double-tap to fly the camera to a spot and look back at the ball. Tapping the ball returns.
- **Which game:** OK Golf; EA Sports PGA Tour.
- **Source:**
  - OK Golf: "swipe around the screen to rotate the camera, or pinch to zoom"; the reviewer's complaint is that you "can't properly pan the camera at the same time as lining up a shot" ([TapSmart](https://www.tapsmart.com/games/review-ok-golf-stylish-simplistic-super-relaxing-golf-game/?amp=1)).
  - EA's Zoom setting lets "the camera fly up to the target for more precise aim" ([EA](https://www.ea.com/able/resources/ea-sports-pga-tour/ea-sports-pga-tour/pc/gameplay)).
- **Why it matters:** Multi-tier holes hide the cup, and scouting is part of reading a hole.
- **Zero words:** The existing eye button.
- **Effort:** S-M

### 14. Course soundscapes and music
- **What:** Each world gets a synthesized ambient bed: surf and gulls at Pirate Cove, wind at Snow Peak, insects in the Jungle, a hum in Space. Add a quiet music loop grown from the world's jingle that ducks under each putt. Use separate note and speaker toggles.
- **Which game:** OK Golf; Walkabout Mini Golf.
- **Source:**
  - OK Golf has no music, just "a relaxing soundscape of crickets, gentle breezes and ... even the odd coyote" ([TapSmart](https://www.tapsmart.com/games/review-ok-golf-stylish-simplistic-super-relaxing-golf-game/?amp=1)).
  - Walkabout has a full soundtrack "composed by Chris Reyman" ([Mighty Coconut](https://www.mightycoconut.com/wmgsoundtrack)).
- **Why it matters:** Ambience makes ten worlds feel like places, not palettes.
- **Zero words:** Audio, and two icon toggles.
- **Effort:** M

### 15. Real mini golf conveniences: off the rail, and a gimme
- **What:**
  - A ball resting against a wall can be dragged straight out up to one putter head, with no penalty and never closer to the cup.
  - An optional gimme ring: a ball that stops inside it is tapped in for exactly one stroke.
  - Both get logged so ghosts and shot codes replay them. The sim only receives a new start point.
- **Which game:** Real courses; EA Sports PGA Tour.
- **Source:**
  - Players may "move your ball one putter head length when it's resting against an obstacle" ([Golflink](https://www.golflink.com/lifestyle/play-mini-golf)), and some courses allow 6 inches ([Par3nearme](https://par3nearme.com/?p=9604)).
  - EA's Auto Tap-In offers "1 Foot, 2 Feet, 3 Feet, and Off" ([EA](https://www.ea.com/able/resources/ea-sports-pga-tour/ea-sports-pga-tour/pc/gameplay)).
- **Why it matters:** PuttX's putter "hides when there is no room" (SPEC.md), so a ball on the rail forces an awkward stroke. Real courses fix this with a rule.
- **Zero words:** A drag handle with a putter-head-length ring.
- **Effort:** S

### 16. First-time teaching moments, shown once
- **What:** Today the pad hint covers only the first stroke. Extend it:
  - The first time a profile meets each new thing (tube, conveyor, read button, mulligan, ghost), it gets a soft glow and a 2 s demo.
  - After three no-contact gestures, a ghost finger draws the full down-up swing.
- **Which game:** Golf Peaks; Super Mario Bros. World 1-1.
- **Source:**
  - Golf Peaks' "textless tutorial introduces everything you need at a relaxed pace" ([App Store](https://apps.apple.com/app/golf-peaks/id1419542293?uo=4)).
  - Miyamoto built World 1-1 so players "gradually and naturally understand what they're doing" ([Game Developer](https://gamedeveloper.com/design/how-miyamoto-built-i-super-mario-bros-i-legendary-world-1-1)).
- **Why it matters:** It is new against RESEARCH #17, which only covers each course's signature twist. This is the general wordless onboarding layer.
- **Zero words:** Glows, a ghost hand, a demo ball.
- **Effort:** S-M

### 17. A wall of feats and a trophy shelf
- **What:**
  - 20-30 pictogram feats: ace a par 4, bank three walls into the cup, hole a 10 m putt, a course with no wall touched, every lost ball in a world, holing out from a tube exit.
  - A 3D shelf where found gold balls and earned putters sit; tapping one equips it.
- **Which game:** Walkabout Mini Golf.
- **Source:**
  - Walkabout has 20 trophies, including "Snowman: Finish a hole with 8 stokes", "Fore!: Hit the ball out of bounds" and "Mulligan: Undo a shot in practice mode" ([PSFanatic](https://www.psfanatic.com/ps-vr2s-walkabout-mini-golf-trophy-list-includes-a-platinum/); the typo is theirs).
  - Collected lost balls sit on a table at the welcome shack, and you can pick one for a round ([UploadVR](https://www.uploadvr.com/walkabout-mini-golf-review/)).
- **Why it matters:** Feats reward style, not just score, and the shelf makes PuttX's lost balls feel like a collection rather than a counter.
- **Zero words:** Pictograms and n/m numerals.
- **Effort:** M

### 18. A family leaderboard across the three profiles
- **What:** Every hole and course shows a crown on the profile that holds the best score. On the profile screen, a crown-with-arrow badge shows when a sibling has beaten one of your bests since you last played.
- **Which game:** Game Center (Apple Arcade titles).
- **Source:** Game Center encourages play "by notifying players when their friends pass a score" ([Apple GameKit](https://developer.apple.com/documentation/gamekit/encourage-progress-and-competition-with-leaderboards)).
- **Why it matters:** The three saves already exist. This is rivalry with no network.
- **Zero words:** Crowns and profile avatars.
- **Effort:** S

### 19. Spectators that react
- **What:** Three to six themed critters per world (gulls, penguins, monkeys, aliens) stand outside the walls. They watch the ball, lean in near the cup, hop on a sink and droop on a lip-out, while a synthesized crowd swell rises as the ball closes in. They stay still under reduced motion.
- **Which game:** PGA Tour 2K23.
- **Source:** "Fans will react accordingly to all situations, whether minor or significant moments", and "the crowd sounds every bit as authentic as they should" ([CGM](https://cogconnected.com/review/pga-tour-2k23-review/)).
- **Why it matters:** They mirror the player's own reaction to a near miss, and give an offline game a sense of an audience.
- **Zero words:** Animation and sound.
- **Effort:** M. Placement must pass the "nothing stuffed" check.

### 20. A simpler swing option
- **What:** An accessibility toggle swaps the DS gesture for pull-back-and-release, with tempo and path errors off. It is a new `FEEL` reader producing the same (angle, power), so the sim is unchanged, which the CLAUDE.md rule allows.
- **Which game:** Walkabout Mini Golf (Pocket Edition); EA Sports PGA Tour.
- **Source:**
  - Walkabout's iPhone version ships "Touch-to-Putt" and a motion "Grip-to-Putt" ([Mixed News](https://mixed-news.com/en/walkabout-mini-golf-pocket-edition-brings-the-popular-vr-mini-golf-game-to-ios/)).
  - "Ensure controls are as simple as possible, or provide a simpler alternative" ([GAG](https://gameaccessibilityguidelines.com/basic/)).
  - EA offers Putting Difficulty Easy, Normal and Hard ([EA](https://www.ea.com/able/resources/ea-sports-pga-tour/ea-sports-pga-tour/pc/gameplay)).
- **Why it matters:** It covers motor differences and younger siblings.
- **Zero words:** A pad icon with one arrow.
- **Effort:** M

### 21. Pass-and-play done the golf way (details for RESEARCH #11)
- **What:**
  - The lowest score on the last hole tees off first; after that, the ball farthest from the cup plays next.
  - Each player's ball has a colour and a pattern.
  - The camera swoops to whoever is up, and a ball-avatar score strip runs along the top.
  - Catch-up: the double-par cap, plus an optional extra mulligan for the trailing player.
  - Offer a quick nine-hole couch preset.
- **Which game:** Real golf; Golf With Your Friends.
- **Source:**
  - Rules of Golf 6.4: honour on the tee, then farthest from the hole ([USGA](https://www.usga.org/content/usga/home-page/custom-search-pages/rules/2019-golf-rules-and-interpretations/pe-rule-6.html)).
  - GWYF's Couch Mode is "a random level with nine holes", with a Local Quickplay button ([Team17](https://www.team17.com/news/golf-with-your-friends-couch-mode-update-patch-notes)).
- **Why it matters:** The real rules make turn order feel fair with no explanation needed.
- **Zero words:** Avatars, numerals, a crown.
- **Effort:** M, on top of #11.

### 22. Cosmetics with taste: trails, cup bursts, toppers
- **What:** The pro shop adds roll trails, cup-drop celebrations and tiny ball toppers. All cosmetic, at fixed coin prices, with no random packs.
- **Which game:** Golf With Your Friends; Super Stickman Golf 3 (as the warning).
- **Source:**
  - GWYF's cosmetic packs sell hats, a "Stars Trail" and stickers ([Nintendo eShop](https://www.nintendo.com/games/detail/golf-with-your-friends-racing-cosmetics-pack-70050000035190-switch)).
  - Common Sense Media's verdict on Super Stickman Golf 3: "lots of pricey power-ups" ([Common Sense Media](https://www.commonsensemedia.org/app-reviews/super-stickman-golf-3)).
- **Why it matters:** Kids want to express themselves, and cosmetics never touch the sim.
- **Zero words:** Shop cards with prices in numerals.
- **Effort:** M

### 23. Speed run mode
- **What:** Nine holes against a stopwatch, each stroke adding a fixed time penalty, with a best-run ghost. The run always ends on a time, so there is no fail state, and the clock lives outside the sim.
- **Which game:** Golf With Your Friends; Mario Golf: Super Rush.
- **Source:**
  - GWYF Speed Golf scores "based on how quickly you can get the job done", with optional "time penalties for every stroke taken" ([Team17](https://www.team17.com/golf-with-your-friends-speed-golf-mode-out-now/)).
  - Mario Golf: Super Rush's Speed Golf ([MarioWiki](https://www.mariowiki.com/Mario_Golf:_Super_Rush)).
- **Why it matters:** A second way to master the courses.
- **Zero words:** A stopwatch glyph and numerals.
- **Effort:** S-M

### 24. Haptics, where the device has them
- **What:** A pulse on contact scaled by power, a double pulse on a lip-out and a pattern on a sink, through `navigator.vibrate` behind feature detection.
- **Which game:** Walkabout Mini Golf (PS VR2).
- **Source:**
  - Walkabout on PS VR2 gives "satisfying rumbles" on long putts and rebounds ([Push Square](https://pushsquare.com/reviews/psvr2/walkabout-mini-golf)).
  - Safari on iOS does not support the Vibration API in any version ([caniuse](https://caniuse.com/vibration)).
  - The `<input switch>` haptic trick "only works on ios 17.4 to 26.4, as apple patched it in ios 26.5" ([ios-haptics](https://unpkg.com/ios-haptics@3.1.1/README.md)).
  - An iPad Pro reports `supportsHaptics` false ([openradar](https://openradar.appspot.com/FB8953635)).
- **Why it is ranked low:** It does nothing on PuttX's target device, the iPad. It only helps on Android.
- **Zero words:** Touch only.
- **Effort:** S

### 25. A hole maker, with the solver as referee
- **What:** A tile editor (straights, bends, ramps, tubes, windmills). A hole can be saved only once the solver proves its par, and it shares as a code like shot codes do.
- **Which game:** Golf With Your Friends.
- **Source:**
  - GWYF's editor got "Over 150 new Level Editor pieces" and "Undo/Redo" ([Team17](https://www.team17.com/news/golf-with-your-friends-bouncy-castle-update-patch-notes)).
  - GWYF 2 promises an "Enhanced Level Editor 2.0" ([Team17](https://www.team17.com/games/golf-with-your-friends-2)).
- **Why it matters:** Creating holes is the long tail of play, and `solve.cjs` plus `holes-check` already exist to referee them.
- **Zero words:** Tile icons, and a check or a cross from the solver.
- **Effort:** L

---

## Caveats
- I could not find reliable sources for Mini Golf King, Golf Battle or Golf Clash cosmetics and putting aids (only aggregator pages), so they are not cited above.
- The iOS 18.4 Wake Lock fix comes from one secondary source (Progressier). Test it on a device.
- Timings in item 2 (40-80 ms) and thresholds in items 7 and 15 are suggested starting points, not sourced facts.
- The 22% letterbox figure in item 4 is my own arithmetic from `fit()` and the 1200x700 stage at 1024x768.

Files I checked: `/home/user/puttX/src/game.js` (`setRoll`, `fit`, `tubeGroup`, `setRead`, `startReplay`, `showCard`, `showProfiles`, trail code) and `/home/user/puttX/src/shell.html` (the `#stage` and `#view` markup).