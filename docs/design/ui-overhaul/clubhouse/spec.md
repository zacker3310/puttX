# PuttX: Clubhouse

A private club's scorecard and a golf broadcast's lower third. Deep club green, ivory scorecard
paper and brass, serif numerals, hairline rules, a crest. Nothing bounces, nothing is cartoon. The
3D course stays exactly as it is; the DOM around it grows up.

Frames (all 1200 x 700, the stage): `frame-1.png` home, `frame-2.png` options, `frame-3.png` course
board, `frame-4.png` hole map, `frame-4b.png` hole map in pass and play, `frame-5a.png` hole intro,
`frame-5.png` HUD on the owner's screenshot, `frame-5b.png` HUD on a bright course in pass and play,
`frame-5c.png` pass the device, `frame-6.png` hole done, `frame-6b.png` pass and play hole result,
`frame-7.png` scorecard, `frame-7b.png` 4 player scorecard, `frame-8.png` pro shop, `frame-9.png`
icon. `icon.svg` with `icon-512.png`, `icon-180.png`, `icon-32.png`. `mockup.html` is self-contained.

Every frame passes the suites' own two checks as rendered: no `\p{L}` text outside `[data-logo]`,
and no button under 88 stage px (`render.cjs` runs both).

---

## 1. Colour

Three surfaces carry everything: **glass** (smoked green, over the 3D view), **paper** (ivory
scorecard stock, for anything you read closely) and **felt** (the deep green room behind menus).
Brass is the only accent. Claret is reserved for under par, the golf convention ("red numbers").

| Token | Hex | Role |
|---|---|---|
| `--green-950` | `#081D15` | stage background, deepest shadow |
| `--green-900` | `#0E2A1F` | header bands, hole column foot, text on brass |
| `--green-800` | `#133628` | medal fill, felt mid |
| `--green-700` | `#1B4532` | primary on paper (`.gbtn`), selected segment |
| `--green-600` | `#24573F` | progress pips, owned state |
| `--green-500` | `#2F6B4E` | hover/pressed lift on green |
| `--ivory-50` | `#FBF8EF` | paper, text on dark |
| `--ivory-100` | `#F5F0E1` | paper alt, segment well |
| `--ivory-200` | `#EAE2CB` | idle icons on felt |
| `--ivory-300` | `#D9CDAB` | paper rules (strong) |
| `--ink-900` | `#17231C` | text on paper |
| `--ink-700` | `#34443A` | icons on paper |
| `--ink-500` | `#66736A` | secondary text on paper (par row, ranks) |
| `--ink-300` | `#A1A794` | locks, disabled (decorative only, 2.3:1) |
| `--brass-200` | `#F2E2B4` | numerals on green buttons, award text |
| `--brass-300` | `#E6CC8C` | icons and highlights on dark |
| `--brass-400` | `#D4B46C` | hairline rules on dark, fills |
| `--brass-500` | `#B8934B` | brass edge, selected outline |
| `--brass-600` | `#93723A` | brass icons on paper (non-text, 4.1:1) |
| `--brass-700` | `#6E5427` | brass shadow, coin rim |
| `--claret-500` | `#A5333F` | under par on paper, score circles |
| `--claret-300` | `#F29086` | under par on dark glass |
| `--rise` / `--fall` | `#9FD7B0` / `#E9A3A0` | pin tag slope arrow, on dark only |
| `--p1..--p4` | `#F3EEE0` `#E0B44E` `#C2434D` `#3E6FA6` | player balls: ivory, gold, red, blue |

Rules, translucent so they sit on any paper tone: `--rule-paper rgba(110,84,39,.22)`,
`--rule-paper-strong .38`; on dark `--rule-dark rgba(230,204,140,.40)`, `--rule-dark-soft .18`.
Scrim behind modal paper: `rgba(5,16,11,.58)` plus a 3 to 7 px blur of what is behind.

**On light (paper):** ink-900 text (15:1), ink-500 secondary (4.6:1), claret-500 under par (6.2:1),
brass-600 for icons only, green-700 for the one primary button.
**On dark (glass, felt, header bands):** ivory-50 text (14:1 on green-900, 10.9:1 on glass),
brass-300 icons and accents (9.8:1), claret-300 under par (6.7:1), rise green (9.4:1).
**On brass:** green-900 only (7.9:1).

Neon night does not change the DOM palette. The glass already reads on a black-light scene;
brass-300 stays the accent. Only the 3D course glows.

## 2. Type

No web fonts. Two system stacks, numerals tabular and lining everywhere
(`font-variant-numeric: lining-nums tabular-nums`).

- **Serif (all numerals that matter):**
  `ui-serif, "New York", "Iowan Old Style", Charter, "Bitstream Charter", "Palatino Linotype", Palatino, Cambria, Caladea, Georgia, "Noto Serif", serif`.
  iPad and iPhone render New York; Macs New York; Windows Cambria; Linux Charter. Georgia sits late
  on purpose: its figures are old style and would bounce in a scorecard.
- **Sans (tiny badges only):** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Inter, system-ui, sans-serif`.
  Used for the mulligan count badge and similar 17 px pills, where a serif gets muddy.

| Step | Size / weight | Use |
|---|---|---|
| Hero | 104 to 112 / 600 | done card strokes, scorecard total |
| Display | 66 / 600, tracking -0.015em | wordmark |
| H1 | 44 to 52 / 600 | HUD strokes, relative to par on cards |
| H2 | 36 to 40 / 600 | hole number in the bug, segments, menu values |
| H3 | 28 to 34 / 600 | chips, leaderboard rows, shop price on the action |
| Body | 22 to 26 / 600 (par rows 500) | scorecard cells, prices |
| Small | 17 to 21 / 600 | totals labels (1–9), course index in a board cell |

Minimum numeral: 16 stage px (14 px on an iPad). Fractions use a dimmed smaller denominator:
`412` at H3 then `/ 1 620` at 21 px, 58% opacity. Thousands take a thin space, never a comma.
The en dash appears only inside the nine labels (`1–9`, `10–18`); there are no em dashes anywhere.

## 3. Shape, elevation, spacing

- **Radii:** 4 (tags), 8 (cells), 12 (hole column, tables), 14 to 18 (buttons and chips), 20
  (cards, sheets), 26+ (pills, the swing pad 30), 50% (balls, coins, medals). This replaces the
  toybox "big radii"; CLAUDE.md's Toybox rule needs rewriting to these tokens.
- **Elevation:** `--e1` (tiles on paper: 1 px line plus 3 px blur), `--e2` (HUD plates and cards
  on felt: 6 and 28 px soft shadows at 22 to 26%), `--e3` (modal paper: 16 and 72 px). No offset
  "chunky" shadows. Glass gets `inset 0 1px 0 rgba(255,255,255,.09)` as a top light.
- **Paper finish:** ivory with an inline SVG `feTurbulence` grain at 7.5% and a soft radial
  falloff; a printed double rule inside the edge (`inset 0 0 0 1px` rule, 7 px paper, `0 0 0 8px`
  rule). Header bands on paper cards are green-900 with the same grain in light, and a 1 px brass
  rule under them.
- **Felt:** green radial (top lit) plus a 7 px vertical pinstripe at 1.6% white and grain.
- **Spacing:** 4 pt base; 8, 12, 16, 24, 32. Screen margin 32 on menus, 24 in the HUD. Gaps
  between HUD plates 12. Rows in sheets 100 tall, separated by a hairline, never boxed.

## 4. Components

**Buttons.** 88 x 88 minimum, radius 18, icon 36.
- `glass`: on the 3D view and felt. Smoked green gradient, 14 px backdrop blur, 1 px brass hairline.
- `brass` (primary on dark): champagne-to-brass gradient, 1 px `#7E6029` edge, green-900 icon.
  One per screen: carry on, tee off, buy, done.
- `gbtn` (primary on paper): green-700 gradient, ivory icon, brass numeral if it carries one
  (the next hole number). One per card.
- `pbtn` (secondary on paper): ivory with a strong rule, ink-700 icon.
- Pressed: translate 1 px, shadow halves, 120 ms. No scale pops.

**Menu row** (home): 456 x 88 glass (the first one 116 tall and brass): a 56 px medal with the
icon, then live data in serif, then a 55% chevron. The data is the label: stars for courses, ball
dots for players, coins and tokens for the shop.

**Chip** (data, not a button): 72 tall glass, icon or star then a serif value then a dimmed
denominator.

**Hole column**: the scorecard idea reduced to one glyph, used everywhere a hole is named: hole
number on a brass tier, par below on green-900 with a flag. On brass buttons it inverts (green top,
translucent ivory foot). HUD bug, done card, intro, home "carry on", daily, tee off.

**Medal**: 40 / 52 / 64 px green disc, double brass ring, brass monoline emblem. Worlds, the
Classic, the bonus nine, menu rows. A lock badge (28 px) sits on its lower right when locked.

**Segmented control**: ivory well with an inner shadow; segments 88+ tall, radius 12; the chosen
one is green-700 with a brass hairline. Players (1 to 4 with ball dots), hand (pad left or right),
shop tabs (on felt the well is green-950 at 55%).

**Toggle**: 96 x 54 track; on is green with a brass knob and a brass check; off is ivory with a
white knob and a grey cross. The whole settings row is the tap target.

**Score marks** (the system's signature): under par circled in claret, two under or better double
circled; over par boxed in ink, two over or worse double boxed; par plain. Used on the map, the
done card (the stroke count sits in a 176 px circle), the party result and both scorecards.

**Stars**: 5 point, brass gradient with a `#7E6029` 1 px edge when earned; unearned are a 1.5 px
outline at 32% of the current colour. Sizes 16 (cells), 20 to 26 (chips), 64 (done card).

**Coins, tokens, lost balls**: coin is a brass ball marker (rim, inner ring, an embossed pin
flag), never a cross. Mulligan token is a green disc with a dashed brass ring and an ivory rewind
arrow. The lost ball is a dimpled brass ball. All three have a 1 px darker drop rim.

**Player balls**: `--p1..--p4` spheres with a specular dot. Numbered (`.nball`, serif numeral in
dark ink) wherever a player is named: options, map chip, scorecard rows, leaderboard, pass card.

**Locks**: monoline padlock, ink-300 on paper, brass on a medal badge. A locked world shows one
badge, not a lock per cell; its course numerals are printed at 28% opacity. Locked hole columns
are washed (`rgba(225,216,192,.45)`) with the lock beside the number.

**Sheets and cards**: paper, radius 20, `--e3`, green header band 88 to 104 tall carrying the
context glyph on the left (gear, hole column, crest plus course medal) and a brass hairline
fading right. Close is the brass check button in the band.

**HUD** (frame 5, 5b): all plates are glass with brass hairlines; nothing in the HUD is paper.
- Top left: home (88), the **bug** (316 x 88): hole column | putter + strokes + par pips (filled
  brass per stroke, claret past par) | card icon + round to par (claret-300 when under). Then the
  mulligan (88) with a brass count pill.
- Pin tag: 52 tall glass pill, ruler-ends icon, metres, a hairline, rise or fall arrow and
  centimetres in `--rise` / `--fall`. It floats over the flag; when the flag is off screen or under
  the top row it parks under the top row (y 128) at the flag's x.
- Left column: guide (when offered), read slope, overview eye, then aim left and right (88 each,
  100 px pitch).
- Bottom centre: the **last shot** lower third (360 x 88): start line track with the strike dot,
  tempo needle on an arc, power in H2 serif.
- Right: the swing pad, 120 x 364, radius 30: a brass contact line (dashed), tick marks every
  10%, a brass putter head on the backswing fill, the ivory ball at the touch point.
- Top right in pass and play: the player chip: the active ball (44) and numeral, a hairline, the
  order as small balls with a brass ring on the active one.

**Lower third** (hole intro, daily): glass with a square top and a 2 px brass rule across the top
edge, like a broadcast graphic: hole column, a brass-outlined minimap, distance and rise, course
medal.

## 5. Iconography

One monoline family on a 32 grid, `stroke-width: 2`, round caps and joins, no fills except where
noted, one colour (`currentColor`). Rendered at 22 to 40 px, so strokes land between 1.4 and 2.5
px. Fills are allowed only for: the play triangle, the flag pennant, the swing-pad block in the
hand icons, the tee silhouette, the guide's ball, the dimple dots. No multi-colour cartoon icons
anywhere in the DOM (coins, tokens and the gold ball are the only illustrated marks).

Set (all in the mockup's sprite): home, back, forward, play, map (folded), players, profile, bag,
gear, calendar, flame, sound, moon, hand, pad left, pad right, flag, putter, ball, rewind
(mulligan), retry, eye, slope, guide, distance, up, lock, star, target (practice), no-wall,
under-par circle, check, close, plus, trophy, tee (honour), share, card (round total), bin, sweet
spot, tempo (metronome), path, token. World emblems in the same weight: 1 cone, 2 saguaro, 3 stepped
temple, 4 snow peak, 5 anchor, 6 volcano, 7 keep, 8 ringed planet, 9 wrapped sweet, 10 crown, 98
windmill (the Classic), 99 bolt (bonus nine).

## 6. Motion

- Sheets: rise 24 px and fade, 240 ms `cubic-bezier(.2,.7,.2,1)`; scrim fades 180 ms.
- Cards (done, party result, scorecard): fade and rise 12 px, 260 ms; stars then fill left to right
  at 120 ms steps with a 1.0 to 1.06 to 1.0 glint, no overshoot. Coins count up over 600 ms.
- Score mark: the circle or box draws on (stroke-dashoffset) in 300 ms after the numeral lands.
- Hole intro lower third: wipes in from the left behind its brass rule (320 ms), holds while the
  camera flies the hole, fades out as the HUD fades in (200 ms).
- Pass card: the two brass rings breathe (opacity .25 to .55, 1.6 s) as the tap hint.
- `prefers-reduced-motion: reduce`: no wipes, rises, glints, draw-ons, breathing or count-ups;
  everything appears at once with at most a 120 ms opacity fade. The title flyover holds a still
  camera. Replace `popIn` everywhere.

---

## 7. Scene by scene: what changes

**App icon and favicon** (`icon.svg`, frame 9). A heater shield crest in brass on a club-green
field with a fine inner brass frame; inside, two crossed putters make the X of puttX, blades down
and out, and the ivory ball rests in the V. At 32 px it reads as green, a gold X and a white dot;
at 180 px the shield and the grips appear. Ship `icon.svg` as the favicon (it is legible at 16 to
32) and render 180, 192, 512 and a 512 maskable (field extended to the edge, crest at 80%).
Manifest: `background_color #0E2A1F`, `theme_color #0E2A1F`; `<meta name="theme-color">` the
same.

**Home** (#title, frame 1). The cartoon sign, sun, moon and hills go. The 3D title flyover runs
full screen (an aerial drift over a course, slow, no cuts), shaded green from the left. Left: the
lockup (shield crest, `putt` in the serif with the crossed-putter X, all inside `[data-logo]`), a
brass hairline, then four rows: **carry on** (brass: play disc, course medal and index, the hole
column of the next hole) is `#titleGo`; **courses** (stars earned / possible) opens the board;
**players** (ball dots and the count) is `#partyBtn` and opens Options at the players block;
**pro shop** (coins, tokens) is `#shopBtn`. Top right: profile medallion (the slot numeral, opens
Options at profiles) and the gear `#setBtn`. Bottom right: the daily hole as a broadcast lower
third `#dailyBtn`: brass calendar block with today's date numeral, the hole's course medal and
hole column, the streak flame and seven day pips, a brass play disc.

**Profiles** (#profiles). Kept as the first run screen (the suites expect it on a fresh install)
but restyled to the Options profile cards at 1.5x on felt. After that, profiles live in Options.

**Options** (#settings / #setPanel, frame 2). One paper sheet, top level (no longer inside
#worlds), opened by the gear from Home, the board and the map, and by the players row and the
profile medallion (each scrolls focus to its block). Header band: gear and the brass check
(`#setClose`). Left: sound (`#soundBtn`), neon night (`#neonSet`), hand (`#handL` / `#handR`
as one segment). Right: **players**, a 1 to 4 segment (`#partyN1` new, `#partyN2..4` kept) with
each count's ball dots, and under it the tee order as numbered balls. Bottom: three profile
cards (`#profileRow`, `.pcard` / `.cont` / `.bin`): crest medallion with the slot numeral, stars,
ten world pips; the active one has a green double ring and a check on the medallion; the bin is an
88 px column at the card's right, first tap turns it claret, second erases.

**Course board** (#worlds / #worldGrid, frame 3). The ten world cards become one tournament board:
ten columns, each a world (header: medal and numeral; three course cells; footer: stars / 162).
A cell shows the course index, stars and an 18 hole progress rule; the course you are on has a
brass inset ring and a small play mark. Course `k` of world `w` is course id `w + 10(k - 1)`.
Locked worlds wash out with a single lock badge. Top bar: home, stars, coins (`#mapWallet`), and
the two extras as wide tiles: the Classic (`#classicBtn`, windmill, 18, stars / 54) and the bonus
nine (`#bonusBtn`, bolt, 9, stars / 27). Tapping a cell goes straight to that course's map.
Tapping a world header opens #world (below).

**World** (#world). Optional in this direction. If kept for the suites (worldNodes, worldBall,
trophyBtn, neonBtn), restyle it as the world's three course plaques on felt, scorecard paper,
with the birdie tracker (`#trophyBtn`, trophy icon) and the moon (`#neonBtn`) in the bar.

**Hole map** (#map / #holePath, frame 4). The course is its own scorecard: two nines on paper,
green hole header, rows for par (flag), best (putter, with score marks) and stars, a totals column
per nine. Each hole column is the tap target (`.node`, 100 x 200+). The next hole is brass; locked
holes are washed with a lock. Bar: back, course medal and index, stars / 54, lost balls / 18
(`#mapLost`), practice target (`#practiceBtn`). Footer: strokes so far against par, and the brass
**tee off** button (hole column plus play disc) for the next open hole. `#partyBtn` leaves the map.

**Hole intro** (#holeBanner, frame 5a). The dark pill becomes a broadcast lower third at the
bottom centre: hole column (18, par 5), a minimap in a brass outline (`#holeBannerMap`), distance
and rise, course medal.

**HUD** (#hole, frames 5 and 5b). See Components. Ids: `#homeBtn`; `#hudHole` / `#hudHoleN` and
`#hudPar` / `#hudParN` fuse into the hole column; `#hudStrokes` / `#hudStrokesN` with pips;
`#hudMode` becomes the bug's third segment (round to par, or the ghost's score on a shot code);
`#mulliganBtn` / `#mulliganN`; `#pinTag`; `#guideBtn`, `#readBtn`, `#viewBtn`, `#aimL`, `#aimR`;
`#shotPanel` / `#shotPower`; `#swingPad`. `#lostPop` is a gold ball chip in the same glass.
`#updateBtn` and `#replayTag` adopt glass. The plates are dark glass so they hold on a sunny sand
course (5b) and on the owner's dark brick hole (5) alike.

**Hole done** (#holeDone, frame 6). Paper card, green band with the hole column and the awards
(coins, token) as brass-ringed pills. Body: the stroke count huge inside its score mark, the
relative score beside it in claret, a hairline, three 64 px stars, three goals as medallions
(under par, no wall, lost ball) brass when earned with a green check. Footer: map, retry, share
(paper), next hole (green, with the brass next hole numeral). `#doneBadge` becomes the relative
score; `#doneObj` the goals.

**Pass and play** (frames 4b, 5b, 5c, 6b). `#partyChip` top right; `#partyPass` a full screen
tap target with the next ball at 220 px, numbered, and a strip of this hole's scores so far;
`#partyDone` a paper leaderboard: rank, numbered ball, the honour tee, this hole's score with its
mark, running strokes, to par; the next hole button carries the ball that has the honour.
Crowns go: the honour is a tee, the winner a trophy.

**Scorecard** (#card, frames 7 and 7b). Paper, full width. Header: crest, course medal and
index, coins earned. Two nines, par row in ink-500, score rows with marks, totals in a washed
column. Solo footer: par, the total at hero size, relative in claret, stars / 54, then map and
next course (green, with the next course's medal). Party: a row per player (numbered ball, the
winner's row washed brass with a trophy), and a leaderboard column at the right with the winner
plaque, map and play again.

**Pro shop** (#shop, frame 8). The awning goes. Felt room; bar: home, the three tabs as one
segment (`#shopTabPutters`, `#shopTabBalls`, `#shopTabMull`), wallet chip (`#shopWallet`). Left:
a paper display case (`#shopStage`): the 3D preview (`#shopView`) on a lit green plinth, three
stat meters (sweet spot, tempo, path; green filled, brass for the gain over what you hold), the
brass buy button with coin and price (`#shopAction`). Right: a 5 x 2 rack (`#shopGrid`) of paper
cards, product shot over a price row; owned shows a green check; equipped is a green price band
with a brass check and a brass edge; the selected card has a brass outline; too dear greys the
price. Pager (`#shopPrev`, `#shopDots`, `#shopNext`) under the rack.

**Everything else.** `#tracker` (birdie tracker) as a paper sheet with the score marks as its
legend; `#rotate` on green-950 with brass strokes; `#wipeEl` a green-950 fade.

---

## 8. Multiplayer: where it lives and how a round runs

1. **Choose players in Options.** The players block in the Options sheet holds a 1 to 4 segment.
   Each count shows its balls (ivory, gold, red, blue) and the sheet shows the tee order as
   numbered balls. Home's **players** row shows the current count as ball dots and opens the
   sheet straight at this block. The count persists with the device settings until changed; 1 is
   solo play.
2. **Pick a course.** Home, courses, any open course on the board. With 2 or more players the
   hole map becomes a fresh card (frame 4b): a row per numbered ball, every hole open, nothing
   locked, no bests or stars. A players chip sits top right (tapping it reopens the sheet). The
   brass tee off button shows the overlapping numbered balls and hole 1; a round always plays
   1 to 18.
3. **Play a hole.** Players putt in the order shown. The HUD's player chip (frame 5b) shows whose
   ball it is; the 3D ball takes that colour. When a player holes out, the **pass card** (frame
   5c) fills the screen with the next ball and numeral; a tap anywhere (or 1.6 s) hands over.
4. **Hole result.** After the last player, the paper leaderboard (frame 6b) ranks this hole: score
   with its mark, running strokes, to par. The best score takes the **honour** (the tee), and putts
   first on the next hole; ties keep the order. The next hole button carries that ball.
5. **End.** After 18, the 4 player scorecard (frame 7b): two nines, a row per player, the winner's
   row in brass with a trophy, a ranked leaderboard beside, map and play again. Nothing is saved:
   no stars, coins or mulligans, as today. Home from the HUD ends the round after a confirm tap.

Ids: `#partyBtn` moves to Home's players row; `#partyPick` becomes the players block inside
`#setPanel` (it keeps `.show` semantics for focus); `#partyN2..4` stay, `#partyN1` is new;
`#partyPickClose` is retired in favour of `#setClose`; the map's tee off button (new `#teeBtn`)
starts the round. `#partyChip`, `#partyPass`, `#partyDone`, `#partyRows`, `#partyMap`,
`#partyNextBtn` keep their roles.
