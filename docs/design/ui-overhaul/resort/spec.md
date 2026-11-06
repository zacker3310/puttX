# PuttX "Resort": UI overhaul spec

A boutique mid-century resort brand for an adult mini golf game. Warm sand paper, terracotta, sage
and deep ink; travel-poster world art; quiet soft-shadow cards on menus; dark glass over the 3D
course. Grown-up and calm, still playful in its pictograms and posters. Zero words: numerals,
symbols and pictograms only.

Frames (each 1200 x 700, the stage): `frame-1.png` home, `frame-2.png` options drawer,
`frame-3.png` course select, `frame-3b.png` a world's courses, `frame-4.png` hole map,
`frame-4b.png` hole map with four players, `frame-5.png` HUD on the owner's own screenshot,
`frame-5b.png` pass-and-play handoff, `frame-5c.png` hole intro, `frame-6.png` hole done,
`frame-6b.png` pass-and-play hole done, `frame-7.png` scorecard, `frame-7b.png` four-player
scorecard, `frame-8.png` pro shop, `frame-9.png` icon and wordmark. Icon: `icon.svg`,
`icon-512.png`, `icon-180.png`, `icon-32.png`. Source: `mockup.html` (self-contained).

---

## 1. Colour

All tokens replace the `--v-*` Toybox set. Two surfaces: **paper** (menus, cards, sheets) and
**glass** (anything floating over the 3D view).

### Paper (light) surfaces

| token | hex | use |
|---|---|---|
| `--r-paper` | `#F5EDDF` | page background of menu scenes |
| `--r-paper-2` | `#ECE1CD` | wells, segmented tracks, locked cards, empty pips |
| `--r-paper-3` | `#E2D3B9` | dashed outlines, inactive dots |
| `--r-card` | `#FCF8F1` | cards, buttons, sheets, drawer |
| `--r-line` | `rgba(30,42,44,.12)` | 1 px hairline round cards and buttons |
| `--r-line-2` | `rgba(30,42,44,.07)` | table rules, dividers |
| `--r-ink` | `#1E2A2C` | primary numerals and icons; "on" state fill |
| `--r-ink-2` | `#56625F` | secondary numerals (par, totals), lead icons |
| `--r-ink-3` | `#9A9C92` | tertiary only: "/54" denominators, locked numerals. Never the only carrier of meaning |

### Accents (same on light and dark unless a glow is listed)

| token | hex | glow (on dark) | meaning |
|---|---|---|---|
| `--r-terra` | `#C55E3C` | `#E3805C` | the primary action; the pin flag; "next" |
| `--r-terra-deep` | `#9F4629` | | pressed primary; wordmark grips |
| `--r-terra-soft` | `#F4D6C5` | | tint behind world emblems |
| `--r-sage` | `#7E9A7F` | `#A9C6A5` | course art, hole outlines |
| `--r-sage-deep` | `#48674F` | | under par, complete, progress fills |
| `--r-sage-soft` | `#DDE6D6` | | result pill background (under par), seals |
| `--r-sun` | `#E3A83B` | | stars, coins, the best score, the winner |
| `--r-sun-deep` | `#B47B1C` | | coin rim, crazy-hole bolt |
| `--r-sun-soft` | `#F8E5B8` | | coins-won chip, goals met, best row |
| `--r-pool` | `#4E8B95` | `#8CC6CC` | mulligans, upgrades (shop pips) |

Player colours (pass and play; they match the 3D ball tints the game already uses):
`--r-p1 #F7F1E6` (ink numeral), `--r-p2 #E3A83B` (ink numeral), `--r-p3 #C55E3C` (cream numeral),
`--r-p4 #4E8B95` (cream numeral).

### Glass (over the 3D view)

| token | value | use |
|---|---|---|
| `--r-glass` | `rgba(20,27,29,.62)` + `backdrop-filter: blur(16px) saturate(1.35)` | every HUD plate and button |
| `--r-glass-line` | `rgba(255,244,226,.16)` | 1 px inner hairline, dividers inside plates |
| `--r-cream` | `#FBF4E6` | numerals and icons on glass |
| `--r-cream-2` | `rgba(251,244,230,.72)` | secondary icons on glass |
| `--r-scrim` | `rgba(18,24,26,.42)` | behind sheets and result cards (with a 6 to 7 px blur of the scene) |

Legibility rule: text never sits on the 3D scene directly. At 0.62 the glass keeps cream numerals at
about 4.7:1 even over a pure white patch (worst case) and well above 7:1 over typical turf; on a dark
or night scene the plate reads by its hairline and top highlight
(`inset 0 1px 0 rgba(255,255,255,.07)`). Frames 5 (dark, the owner's screenshot), 5b (bright
desert) and 5c (bright sunny green) show the same plates on all three.

Contrast on paper: ink on card about 14:1; ink-2 on card about 6:1; cream on terra about 3.8:1, so
terra buttons carry icons and numerals of 32 px and up only (WCAG large text).

### Night (neon) mode for menus

The 3D neon mode is unchanged. When it is on, menu scenes switch to dusk paper:
`--r-paper #172123`, `--r-paper-2 #1F2C2E`, `--r-card #23302F`, `--r-ink #FBF4E6`,
`--r-ink-2 rgba(251,244,230,.72)`, `--r-line rgba(255,244,226,.12)`; terra lifts to `#D06A47`;
posters drop to `brightness(.9)`. Set it with `#stage.night` overriding the tokens, nothing else.

## 2. Type

No web fonts. One family, numerals only.

```
--r-font: "Avenir Next", "Avenir", "Inter Display", "Inter", -apple-system, "Segoe UI", system-ui, sans-serif;
font-variant-numeric: tabular-nums lining-nums;
font-feature-settings: "tnum" 1, "lnum" 1;
```

Avenir Next ships on every iPad, iPhone and Mac (it is what the owner sees); Inter Display is
what these PNGs rendered with; Android and Windows fall to their system sans. Every numeral is
tabular so scores never jitter as they change.

| step | size / weight | letter-spacing | used for |
|---|---|---|---|
| hero | 132 / 700 | -0.03em | hole intro numeral |
| display | 104 to 128 / 700 | -0.03em | done-card strokes, course numeral in arches |
| title | 76 to 88 / 700 | -0.02em | home hole numeral, scorecard total |
| heading | 40 / 650 | 0 | HUD scoreboard, primary pill numerals, big chips |
| body | 28 to 34 / 650 | 0 | chips, tile numerals, table scores |
| small | 22 to 26 / 650 | 0 | poster tallies, par in tiles, table par row |
| micro | 20 / 700 | 0 | badges (mulligan count, player count, best score) |

Minimum numeral size is 20 stage px (about 11 px on the owner's phone, where the stage scales to
0.56). Weight 650 is Avenir Next Demi Bold; 700 is Bold.

The **wordmark** is drawn as SVG paths, not set in a font, so it is identical everywhere: monoline
lowercase `putt` (15 unit stroke, round caps, the two t's sharing one crossbar) and an `X` made of
two crossed putters in terracotta (10 unit shafts, terra-deep grips, 14 unit blades). It keeps the
`data-logo` attribute.

## 3. Shape, elevation, spacing

Radii: `--r-r-xs 8` (badges), `--r-r-sm 14` (thumbnails), `--r-r-md 22` (88 px buttons, slot
cards, segments), `--r-r-lg 28` (cards, posters, tiles), `--r-r-xl 36` (sheets, result cards,
drawer), pills `999px`. Arch cards: `136px 136px 32px 32px`.

Elevation (soft, warm-neutral, no hard offset shadows anywhere):

```
--r-e1: 0 1px 1px rgba(30,42,44,.06), 0 4px 14px rgba(30,42,44,.08);   /* buttons, tiles, chips on paper */
--r-e2: 0 2px 4px rgba(30,42,44,.06), 0 14px 32px rgba(30,42,44,.12);  /* posters, stage cards */
--r-e3: 0 6px 14px rgba(18,24,26,.12), 0 32px 64px rgba(18,24,26,.30); /* sheets, result cards, home card */
--r-eg: inset 0 0 0 1px var(--r-glass-line), inset 0 1px 0 rgba(255,255,255,.07), 0 10px 28px rgba(0,0,0,.22); /* glass */
```

Primary (terra) buttons add a coloured lift: `0 8px 20px rgba(159,70,41,.32)`.
"On" (ink) segments add `0 6px 14px rgba(30,42,44,.22)`.

Spacing: an 8 grid (4, 8, 12, 16, 24, 32, 48). HUD and menu bars keep the 24 px stage margin and
the 104 px button pitch the game already uses (88 + 16), so existing positions carry over. Home
uses a 48 px margin and anchors its actions to the bottom edge, where thumbs are.

## 4. Components

**Icon button** (`.btn`, 88 x 88): card fill, 1 px line, e1, radius 22, a 40 px icon in ink.
Pressed: `scale(.97)`, shadow to none, 90 ms. **Primary** (`.btn.go`): terra gradient
(`#CF6844` to `#C55E3C`), cream icon; a pill when it carries a numeral (`▶ 12`, `● 260`), a
circle when it is the single action on a card. **On / selected** (`.on`): ink fill, cream icon.
**Glass button** (HUD): glass, cream icon, same 88 x 88 and radius.

**Segmented control** (options, shop tabs): a paper track with 4 px padding, segments 108 x 88,
radius 22; the chosen segment is ink with a cream numeral or icon. Player counts show the numeral
plus one small dot per player in that player's colour.

**Chip** (read-only): 56 tall pill, card fill and line on paper, glass over 3D; 28 px icon, 28 px
numeral, denominators in ink-3 (`25/54`). Chips are never tap targets.

**Card**: card fill, radius 28 to 36, e2 or e3. **Sheet / drawer**: options open as a right-hand
drawer, full height, 648 wide, radius 36 on its left corners, over a 0.38 scrim; rows are 96 tall
on a 108 pitch: a 56 px lead pictogram in a paper circle, then the control; hairline rules
between rows.

**HUD scoreboard**: hole, par and strokes as one glass plate, 80 tall, three segments divided by
the glass hairline: `◎ 18 | ⚑ 5 | putter 1`. The par flag is terra-glow; the other icons
cream-2.

**Stars**: a five-point star with rounded joins, filled sun when earned, paper-2 with a paper-3
edge when not; the done card raises the middle star 10 px.
**Coins**: a sun disc with a darker rim, a fine inner ring and the brand X engraved; numerals sit to
its right. **Locks**: a filled padlock in ink-2 inside a 56 card circle (poster, arch), or bare in
ink-3 (hole tile). **Player discs**: solid player colour, numeral inside, a soft inner edge;
the active player gets an ink ring (handoff) or a sun halo (the big disc).
**Golf marks** (scorecard, hole tiles, leaderboards): one ring under par, two rings two or more
under, one square over, two squares two or more over, nothing at par. Ink, 2 px.
**Progress**: 8 px bars, paper-2 track, sage-deep fill. **Pips** (course state on a poster): 16 px;
sage-deep with a check = complete, terra ring = open, paper-3 ring = locked.
**Badges**: 30 tall pill; terra with cream (player count), cream with ink (mulligan count).

## 5. Iconography

Geometric line pictograms on a 32 unit grid, 2.25 stroke, round caps and joins, drawn from circles,
arcs and 45 degree lines; fills only for status marks (play, flag pennant, lock body, crown, bolt,
bird, flame, sparkle). One colour per icon: ink on paper, cream on glass, with a single accent
where it means something (terra pennant, pool mulligan, sun ruler). Rendered at 40 px in an 88 px
button (2.8 px effective stroke), 28 px in chips, never below 20 px. Each lives once as a
`<symbol>` and is used through `<use>`; colour and fill go on the outer `<svg>` (CSS cannot reach
into a `<use>` tree), which is why `.star` sets `fill` on the element itself.

The set: grid (course map, the HUD's way out), back, play, next, retry, undo (mulligan), eye
(overview), slope (read the green: a hill with arrows falling away both sides), nudge left and
right (a chevron beside the ball dot), sound, mute, pad-left and pad-right (a device with the swing
pad on that side: handedness without a hand), sun, moon, person, people, bag (shop), sliders
(options), folded map (courses), flag (par), cup (hole number), putter (strokes), ruler (distance),
up (rise), lock, check, close, plus, bin, crown, flame (streak), target (practice), trophy
(tracker), ball with lens (lost balls), bolt (crazy hole), bird (under par), wall struck through
(no walls), ball, metronome (tempo), sweet spot, roll, sparkle (rare).

## 6. Motion

Calm and quick; no overshoot bounces (the `popIn` 1.6 back-ease goes).

| what | motion |
|---|---|
| press | `scale(.97)`, 90 ms ease-out |
| cards, posters, tiles enter | fade 0 to 1 and rise 8 px, 220 ms `cubic-bezier(.2,.8,.2,1)`, 30 ms stagger |
| drawer | slide 48 px from the right and fade, 320 ms; scrim fades 200 ms |
| result card | fade and rise 12 px, 260 ms; stars fill one by one, 90 ms apart, scale .85 to 1 |
| hole intro plaque | fade in 200 ms, hold, fade out 300 ms (no scale) |
| handoff disc | the sun halo breathes once (scale 1 to 1.04 and back, 600 ms) |
| scene change | a 180 ms cross-fade through ink replaces the iris wipe |

`prefers-reduced-motion: reduce`: every decorative animation and the cross-fade are off; elements
appear in place; the drawer and cards still fade, at 120 ms or less. Nothing loops (the title
pulse, the update pulse and the replay blink become static).

## 7. App icon and favicon

`icon.svg` (1024): a deep ink field (radial `#2B3B3B` to `#162022`), and through it a tall
mid-century arch (radius 352) opening onto a sunset: peach to terracotta sky, a cream sun with
three cut stripes, a sage hill, a darker green, a white ball, and the pin, an ink pole with a
terracotta pennant standing in front of the sun. A hairline sun-coloured arch frames it, the poster
border. At 180 px it reads as a poster; at 32 px as an arch, a sun, a flag and a ball; at 16 px as a
warm arch in a dark square, still unlike any other tab.

Files to generate with the existing `scripts/render-icons.cjs`: `docs/icons/icon.svg` (this file),
`apple-touch-icon.png` 180 (full bleed, iOS rounds it), `icon-192.png`, `icon-512.png`,
`icon-512-maskable.png` (the same art: the arch, sun and pin sit inside the 80 percent safe circle).
`manifest.webmanifest`: `theme_color #172123`, `background_color #F5EDDF`.
`<meta name="theme-color" content="#172123">`; body (letterbox) background `#121819`.

---

## 8. Scene by scene: what changes from today

Every existing id stays. Moved or new ids are listed.

### Title becomes Home (`#title`), frame 1
- **Today:** an illustrated cartoon panorama (`#titleArt`) over the 3D, a hanging wooden sign, one
  green play pill that leads to profiles, the gold daily ticket.
- **New:** `#titleArt` is removed so the 3D title flyover is the background, under a left-to-right
  ink scrim. Top left: the arch emblem and the wordmark (`data-logo`). Top right: the profile chip
  (glass, 88 tall: the equipped ball with the slot numeral, stars, coins), `#homeProfile`, which
  opens the options drawer. Bottom left, the **carry-on card** (600 x 248, card, e3): the world
  poster thumbnail, world emblem + course numeral, the next hole and its par in large numerals, a
  stars progress bar, and the primary circle `#titleGo` (now: `goHole(nextHoleFor(progress))`,
  the whole card is the button). Under it four glass tiles 138 x 112: courses `#homeCourses`
  (showWorlds), players `#partyBtn` (moved here; a terra badge shows the count when more than 1),
  shop `#homeShop`, options `#setBtn` (moved here). Bottom right: `#dailyBtn` restyled as a card
  ticket with real notches (CSS mask): calendar with the day, the hole, the flame streak and a play
  mark; the whole ticket is one button.
- The carry-on card changes meaning with the player count: with 2 to 4 players it shows hole 1 of
  the current course and the lineup of player discs, and its play button tees off the round
  (frame 2 shows it behind the drawer).

### Profiles (`#profiles`)
- Profiles move into the options drawer (3 slot cards plus erase). The `#profiles` scene stays for
  a first run with no save and for erase confirmation, restyled as three arch cards on paper.
  `#worldsHome` and `#profilesBack` return to Home.

### Options (`#settings`), frame 2
- **Today:** a small cream panel inside `#worlds` with sound, neon, right hand, left hand, close.
- **New:** a right-hand drawer at stage level (moved out of `#worlds`, so Home, the course select
  and the map can all open it). Rows, in this order:
  1. Players: `#partyN1` (new), `#partyN2`, `#partyN3`, `#partyN4` as one segmented control.
  2. Profile: three slot cards (ball, slot numeral, stars) with the current one ringed in terra;
     an empty slot is dashed with a plus; a bin `#profileErase` acts on the ringed slot with the
     existing two-tap arm.
  3. Sound: `#soundBtn` becomes the segmented pair mute / sound.
  4. Hand: `#handL` / `#handR` as pad-left / pad-right pictograms.
  5. Night: day / `#neonSet`.
  Close `#setClose` top right (an X in a card button). Everything applies at once.

### Course select (`#worlds`), frame 3
- **Today:** ten cream cards with cartoon icons; Classic and laser golf pills in the header.
- **New:** ten travel posters (168 x 244) in a 5 x 2 grid: a flat landscape in the world's palette
  (crane, mesa and sun, temple, peaks, cove, volcano, haunted castle, ringed planet, lollipops, sky
  castle), a numeral badge, and a footer with the star tally and three course pips. Locked worlds
  are desaturated with a lock. `#classicBtn` and `#bonusBtn` become the sixth column, past a
  hairline: the Classic as racing-green felt with a brass pin (18), the bonus nine as neon arches on
  ink (9). Header: back, total stars; coins, shop `#shopBtn`, options. The poster art lives in each
  `cNN.look.js` as a new `poster` string beside `icon` (render region only, never the sim).

### A world (`#world`), frame 3b
- **Today:** a winding road with three round nodes and a hopping ball.
- **New:** the world poster drawn full-bleed as the backdrop and three arched course cards (272 x
  420): the course numeral over its window art (course 2 at dusk, course 3 at night), stars with a
  progress bar, the crazy-hole count, and a state: a sage seal (complete), the terra play circle
  (next), or a lock. `#neonBtn` leaves this screen (night is in options); `#trophyBtn` stays.

### Hole map (`#map`), frame 4
- **Today:** eighteen round nodes on a dotted snake.
- **New:** two rows of nine hole cards (108 x 196), front nine over back nine like a scorecard:
  number, par flag, the hole's outline (from the same data as `#holeBannerMap`), three stars, the
  best score in its golf mark, a sun bolt for crazy holes; the next hole is ringed in terra and
  lifted with a small play tab; locked holes are paper-2 with a lock. One primary pill bottom right,
  `#mapPlay` (new): `▶ 12`, the next hole. Header: back, course chip, stars, lost balls
  `#mapLost`; practice `#practiceBtn` and tracker `#trophyBtn` on the right. `#partyBtn` and
  `#partyPick` leave this screen.

### Hole HUD (`#hole`), frames 5 and 5c
- **Today:** cream chips and buttons with offset shadows, a blue mulligan, a cream swing pad.
- **New:** all glass. `#homeBtn` shows the course-map grid. `#hudHole`, `#hudPar`, `#hudStrokes`
  sit edge to edge (left 124, each about 106 wide) as one scoreboard plate; strokes leaves the top
  right, which stays clear for the scene. `#mulliganBtn` at left 458: undo in pool-glow and the
  count badge. `#pinTag`: glass pill, ruler in sun, distance, a hairline, the rise arrow in
  sage-glow (fall in terra-glow). Left column unchanged in position: `#readBtn` (slope),
  `#viewBtn` (eye; on = ink-cream inverted), `#aimL` / `#aimR`. `#shotPanel`: glass pill with a
  start-line meter (track, sage window, centre tick, the dot) and the power numeral. `#swingPad`: a
  glass capsule with a faint rail, the dashed strike line, a cream start ring and the backswing trail
  in sun (forward in sage-glow, off-line in terra-glow). `#hudMode` and `#lostPop` become glass
  chips. Lefty mirroring is unchanged.
- **Hole intro** `#holeBanner` (frame 5c): one dark glass plaque, the hole outline in a cream
  circle, the hole numeral at 132, a hairline, the par flag and numeral. Only the home button and
  the scoreboard show while it is up (the existing `data-intro` rule).
- `#replayTag`: a glass pill with a terra recording dot (no blink under reduced motion).
  `#updateBtn`: a primary circle with the retry arrow (no pulse).

### Hole done (`#holeDone`), frame 6
- **New:** a 540 x 532 card over the blurred, scrimmed scene: hole chip top left, the coins won as a
  sun-soft chip top right (`#doneCoins`, no rotated sticker), three stars, the strokes at 128 beside
  the par and a result pill (bird and `−1` in sage for under par; `#doneBadge` becomes this pill),
  a hairline, the three goals `#doneObj` (bird, wall struck through, ball with lens) as 64 px
  circles, sun-soft when met, then `#doneMap` (grid), `#doneRetry`, and `#doneNext` as a terra pill
  with the next hole's numeral.

### Scorecard (`#card`), frames 7 and 7b
- **New:** a 1080 x 620 card. Each nine is a table with an ink header band (hole numbers, `1-9`,
  `10-18`), a par row on paper, and a row per player; subtotal columns in paper-2; golf marks in
  ink. Solo: the course chip, then the total at 88, the to-par pill, the stars. Four players: a
  label disc per row, the unique best on each hole lit in pale sun, a standings column on the right
  (winner on ink with a crown, then 2, 3, 4 with totals and to-par), and the winner's disc and total
  in the footer. Actions: `#cardMap` (grid), `#cardRetry` (new, rematch, party only), `#cardNext`
  terra pill. The `.sc` cell class keeps its name in the game (the tests read `.sc.me`).

### Pro shop (`#shop`), frame 8
- **Today:** a striped awning, cream cards, yellow equipped state, green and blue pips.
- **New:** no awning. Tabs as a segmented trio of 88 buttons (putter, ball, mulligan), the wallet
  chip (coins | mulligans) top right. Left: the stage card with a warm studio backdrop for
  `#shopView`, three stat rows (sweet spot, tempo, roll) as five 12 px pips (sage-deep owned, pool
  upgrade, terra outline for a downgrade), and `#shopAction` full width: terra `● 260` to buy, ink
  check when equipped, ink-3 with a lock when unaffordable. Right: 5 x 2 item cards (138 x 210),
  studio thumbnail, price with coin; owned shows a sage check; equipped has an ink footer with a
  cream check; the selected card has a terra ring; rare items a sun sparkle; unaffordable prices in
  ink-3. Pager: back and forward buttons and an ink capsule for the current page.

### Overlays not drawn
`#tracker` (birdie tracker) uses the result card (radius 36, e3) with sun-soft, sage-soft,
pool-soft and terra-soft tiles for birdie, eagle, albatross and ace. `#lostPop` is a glass chip.
`#rotate` uses the ink field and a cream device outline.

---

## 9. Multiplayer: pass and play

**Where players are chosen.** In the options drawer, row one: 1, 2, 3, 4 (`#partyN1..4`). Home
has a players tile (`#partyBtn`) that opens the same drawer; when more than one player is set the
tile shows a terra count badge, so the state is never hidden. The count is kept in the save
(`progress.players`, 1 to 4), not in the round.

**How a round starts.** Two ways, both into `startParty(n, course)`:
1. Home: with 2 to 4 players the carry-on card turns into a tee-off card for the current course:
   hole 1, its par and the lineup of discs. Its play button starts the round.
2. Courses, world, course: the hole map shows the lineup pill bottom left (the discs in order)
   and the primary pill becomes `▶ 1` (`#mapPlay`). The hole cards are shown as the route, without
   solo stars or locks (a party plays all eighteen, as today); the people button top right reopens
   the drawer. Practice and the tracker hide.

**How it plays.** Each player putts the hole out on a plain ball tinted their colour (unchanged).
The HUD adds `#partyChip` beside the scoreboard: the active player's disc and running total;
mulligans are off. When a player holes out, `#partyPass` is the handoff card (frame 5b): the hole
and par, the next player's disc at 184 px with a sun halo, and the order row: who has putted (their
score in its golf mark), who is up (ink ring, putter), who waits (faded). It waits for a tap: the
1.6 s auto-advance goes, because the device has to change hands first. When everyone is in,
`#partyDone` (frame 6b) lists this hole's scores in honour order (lowest first, ties keep order),
the best row in sun-soft with a crown, the running totals with to-par; `#partyNextBtn` tees off the
next hole in that order.

**How it ends.** After 18, the four-player scorecard (frame 7b): every score, the unique best on each
hole lit, the standings with the winner crowned. Grid ends the party and returns to the map;
rematch (`#cardRetry`) restarts the same course with the same lineup; the terra pill takes the same
lineup to the next course. As today, a party saves no stars, coins or mulligans. Leaving mid-round
(the HUD grid) ends it.

---

## 10. Implementation notes

- **Tokens first.** Add the `--r-*` tokens and point the old `--v-*` names at them for one pass
  (`--v-surface: var(--r-card)`, `--v-accent-green: var(--r-terra)` for `.go`, and so on), so
  untouched rules pick up the palette; then replace every `box-shadow: 0 Npx 0` offset shadow with
  `--r-e1`/`--r-e2` and every `popIn` with the calm enter.
- **DOM moves are small:** delete `#titleArt` and `#shopAwning`; lift `#settings` to stage level and
  give it the five rows; move `#partyBtn` and `#setBtn` into the Home tiles; replace `#partyPick`
  with the players row; add `#partyN1`, `#homeCourses`, `#homeShop`, `#homeProfile`, `#mapPlay`,
  `#cardRetry`, `#profileErase`. Map nodes (`#holePath .node`) become absolutely placed cards from a
  9 x 2 grid instead of `NODE_POS`.
- **One SVG sprite** (`<symbol>` per icon) at the top of the stage replaces the inline icon copies;
  `game.js` and `shop.js` build markup with a tiny `I(id)` helper.
- **Glass and WebGL:** `backdrop-filter` over the canvas costs GPU time every frame. Keep blur at 16
  px, keep the scoreboard as one plate, and add `@supports not (backdrop-filter: blur(1px))` and a
  `.lowfx` stage class (when frame time runs long) that drop the blur and raise the glass alpha to
  0.78.
- **Tests to update:** `party-check` taps `#partyBtn` on the map and expects `#partyPick` (now: the
  players row in the drawer, then `#mapPlay` or the Home card); `ui-check` taps `#titleGo` and
  expects profiles (now: a hole). Word and target checks pass as drawn: the only letters are in the
  path-drawn wordmark (`data-logo`), and every control is 88 stage px or larger (segments 108 x 88,
  tiles 138 x 112, hole cards 108 x 196). The minus sign in `−1` is U+2212, not a letter.
- **CLAUDE.md** describes the Toybox UI ("`--v-*` tokens from vroom, flat shadows"); it needs the
  new rule: Resort tokens, soft elevation, glass over 3D.
