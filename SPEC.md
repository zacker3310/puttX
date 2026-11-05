# PuttX v2

Hard 3D mini golf for players around 12. Browser, single generated `index.html`, no network.
Hosted on GitHub Pages at `zacker3310.github.io/puttX`. Quality bar: a first-party Nintendo
putting game on an iPad. v1 (27 gentle holes for a 3-5 year old) is superseded.

## Design rules (non-negotiable)

- Zero required reading. Icons, pictures and numerals only. `aria-label`s are fine.
- Real scoring, no fail states. Strokes count against par, but every hole always finishes
  (double par auto-sinks) and stars and bests only go up.
- Every tap target is at least 64 px rendered at iPad landscape (1024x768).
- Every touch answers instantly with motion and a synthesized sound.
- Toybox UI: vroom's `--v-*` tokens, flat `0 6px 0` shadows, big radii for every button, chip and card.
- Real course: the 3D scene looks like a real mini golf course (turf with fibre and nap, timber,
  stone, brick and steel borders, landscaping, a real cup and flag), all drawn procedurally.
- Honour `prefers-reduced-motion` for anything decorative. No em dashes anywhere.
- Nothing is stuffed into anything: no prop, wall, post, mover, tube, putter, flagstick or aim
  line ever overlaps another or the ball.

## Architecture

- **Sources, one shipped file.** `src/shell.html`, `src/game.js`, `src/shop.js`, `courses/cNN.*.js`
  and three.js r170 are assembled by `scripts/build.cjs` into `index.html`.
- **Hand-rolled deterministic physics**, fixed 240 Hz, in the DOM-free `// #region sim`. The ball is a
  rigid sphere with a spin vector; every contact is an impulse at the contact point with a
  restitution and Coulomb friction (see `docs/research/PHYSICS.md` for the sources):
  - **Ball:** radius 0.0255, moment of inertia 2/5 m r^2.
  - **Strike:** the putter launches the ball with no spin; it slides (about the first 17% of the putt)
    until friction spins it up to a true roll at 5/7 of its launch speed. Launch speeds are set so
    every power rolls as far on felt as v2 did (full power about 17.5 m).
  - **Rolling:** 5/7 g sin(theta) on slopes (full g while sliding); rolling resistance scales with the
    normal force. Felt is about a 12 ft stimp.
  - **Walls, posts, movers:** met at the ball's equator, so a rolling ball keeps its topspin through the
    bounce: it checks as the turf grips again and comes off flatter (about 0.46 of its speed into the
    rail), and a hard knock hops. Movers add their own surface velocity.
  - **Airborne:** crest launch, landings as impulses against the ground normal (a rolling ball keeps its
    spin; each surface has its own bounce), cliff faces on tier steps.
  - **Cup:** a real hole with a rounded lip and a liner. A ball whose centre crosses the lip falls; the
    far lip turns it in or throws it out. Dead centre catches up to about 2.4 to 2.7 m/s, the edge only
    a crawling ball; hot balls hop or lip out, firm ones rattle in. The turf dips 6 mm round the cup.
  - **The border rule:** a ball that stops against a wall or post is placed 12 cm out, square to it
    (the WMF / PPA rule), so the putter always has room.
  - **Surfaces and hazards:** felt, fast, ice, sand and mud (each with rolling, sliding and bounce
    values); water hazards; conveyor/fan push zones.
  - **Obstacles:** posts and bumpers; spinning arms and windmills; sliding discs and gates; tubes.
  - The sim uses `Math.sqrt` instead of `Math.hypot`, so results match across browser engines.
- **Holes are data**, proven by `scripts/solve.cjs` (beam search plus fine refinement), and rated by a noisy bot with human aim and pace error.
- **Courses** register holes and a look (`WORLD_LOOK[n]`). See `docs/COURSE_GUIDE.md`.

## Courses

| # | Course | Signature |
|---|---|---|
| 1 | Construction Yard | conveyors, crane arms, scaffold tiers, boom gates |
| 2 | Desert Canyon | mesas, canyon drop-offs, tilted floors, tumbleweeds |
| 3 | Jungle Temple | rivers and bridges, temple tunnels, stepped tiers |
| 4 | Snow Peak | ice runs, moguls, avalanche bowls, snowmen |
| 5 | Pirate Cove | drawbridges, ship decks, lagoons, cannonballs |
| 6 | Volcano | huge cones, crater cups, lava, lava tubes |
| 7 | Haunted Castle | windmills, portcullis gates, secret passages, moat |
| 8 | Space Station | low-gravity jumps between floating decks, craters, aliens |
| 9 | Candy Factory | conveyors, bumpers, hard candy, taffy, chocolate river |
| 10 | Sky Kingdom | everything, floating islands, the finale |

Two extra courses sit outside the worlds, always open, and unlock nothing:
- **The Classic (98):** the original Putt-Putt kind of course. Flat green carpet, aluminium
  bumpboards, simple geometric blockers, hills and pipes, every hole a par 2 with an ace possible
  but rare.
- **The bonus nine (99):** nine unhinged stunt holes.

Each course has 18 holes, par 2 to 5, at least five 3-4 part holes, and difficulty climbing
through the course and across courses. At most 2% of tee shots ace any hole. Finishing hole 18
unlocks the next course in the same world. The next world opens only when every hole of all three
of this world's courses is finished.

## Play

- **Aim.** Drag the course to turn; arrow buttons nudge 0.25 degrees; the eye toggles an overview.
- **Stroke (DS style).** On the swing pad: touch, pull down (backswing), push up through the
  touch point (contact). The stroke is read like this:
  - **Power** is backswing length / full length.
  - **Tempo** is the putter speed at contact against a pendulum's for that length. Within 7% it changes nothing; past that it adds or takes 22% per doubling.
  - **Path** is the sideways drift of the forward stroke; it starts the ball off line at 40% of its angle.
  - **Strike point** is the sideways offset at contact. Off the sweet spot the ball loses energy quadratically and the face twists.
  - Letting go before contact is no stroke.
- **Putter.** A 3D putter mirrors the stroke, rides the ground, stops short of walls and hides
  when there is no room. The aim line drapes over the ground and stops at walls.
- **Flagstick.** Pulled out and held aside when a ball comes near; the sunk ball rests on the
  cup floor.
- **Readout.** After each putt: path arrow, strike dot, tempo needle and power. The putt's whole line
  stays painted on the green (coloured by pace) until the next putt.
- **Pin tag.** While aiming, a tag over the flag gives the distance to the cup in metres and the rise
  or fall in centimetres.

## Extras

- **Mulligans.** A take-back rewinds the last stroke (ball, count, penalty) for one token. A
  fresh save starts with 5; lost balls, goals, the daily hole and the pro shop add more.
  Practice takes back for free; the daily hole allows none.
- **Lost balls.** One gold ball per hole, resting where some putt from the tee really stops,
  away from the line, the cup and every obstacle. Rolling over it pays a token and 15 coins, once.
- **Goals.** Three per hole on the done card: under par, no wall touched, lost ball found.
  Each first time pays 10 coins; all three pays a token.
- **Daily hole.** The calendar on the title plays one hole picked from the date, the same for
  everyone that day. The first finish of the day pays 25 coins and a token and grows the streak.
- **Shot codes.** The share button on the done card makes a link (`?shot=1-7_12.5~0.62~0_...`).
  Opening it plays that hole with the putts as a pink ghost and their score in the HUD.
- **Practice.** The target on the map: every hole of an open course, free take-backs, nothing saved.
- **Neon night.** A display mode for any course (the moon on a world map, or in settings): black-light
  carpet, neon tube walls, a glowing ball and a lit cup. Saved with the progress.

- **Pass and play.** The three balls on a course map start a round for 2 to 4 players on one device.
  Each plays the hole out in turn with their own ball colour; a scoreboard crowns the best score and
  the honour (who putts first) passes to it. The course ends on a scorecard with a row per player.
  Nothing is saved.
- **Scorecard.** The end of a course shows a real paper scorecard: hole numbers, par and score rows,
  a subtotal per nine, birdies circled and bogeys boxed.
- **The last hole.** The cup on each course's last hole keeps the ball: it rattles away down the return
  pipe and the clubhouse bell rings (three times for an ace).
- **Sound.** Wall knocks sound like the border (aluminium rings, timber tocks, stone clacks), the roll
  is heard and coloured by the surface, and each course has a quiet soundscape (birds, crickets,
  wind, water). Haptics where the device has them.

## Pro shop

Coins from every hole (more for under par and aces). Putters change the look and how forgiving
the stroke is (sweet spot, tempo band, toe loss, twist, path), never the physics. Balls are
cosmetic. Wordless, prices in numerals.

## Persistence

Three profiles, one save each: `puttx.v2` (profile 1, so older saves carry over), `puttx.v2.p2`,
`puttx.v2.p3`; `puttx.slot` remembers the last one played. Each save holds per-hole best and stars, unlocked courses, sound, coins and gear,
mulligan tokens, lost balls found, goal bits per hole, the daily record, ghosts and the neon setting.
Missing or corrupt data falls back to a fresh save. v1 saves are left alone.

## Verification

`npm test` runs every suite. The browser suites run in Chromium at 1024x768 with software WebGL.

| Suite | What it checks |
|---|---|
| build | `index.html` matches the sources |
| boot | the page boots with no network and no words |
| physics | every sim behaviour above |
| round | scoring and unlocks |
| holes | well formed, nothing stuffed, `sol` sinks within par, not a gimme, fuzz |
| play | stroke model, real gestures, putter and aim clipping, pin, live loop matches the sim |
| render | scene, walls, camera and looks |
| ui | flow, no words, tap targets, no overlaps |
| fx | effects |
| audio | sounds |
| save | persistence |
| perf | the iPad budget |
| shop | the pro shop |
| party | pass and play |
| lint | 0 findings |

See `docs/RESEARCH.md` for the next 20 features.
