# PuttX: Broadcast

A UI direction for the grown-up PuttX. Modern sports broadcast meets Apple-grade product polish:
dark translucent glass over the live 3D course, crisp system numerals with strong weight contrast,
one vivid accent (Volt), precise geometric line icons, and almost no chrome on the hole itself.
Zero words on screen: every label is an icon, a numeral or a symbol. The wordmark is the one word.

Files in this folder:

- `mockup.html`: every frame at the 1200 x 700 stage, stacked (self-contained, about 3 MB of embedded renders)
- `frame-1.png` .. `frame-9.png` plus `frame-5b/5c/5d`, `frame-6b`, `frame-7b`: the frames rendered
- `icon.svg` (1024 master), `icon-512.png`, `icon-180.png`, `icon-32.png`
- `build.py`, `icons.py` (the icon set as 24-grid SVG), `render.cjs`, and the capture scripts that
  took the backgrounds from the real game: `capture-bg.cjs`, `capture-intro.cjs`, `extract-maps.cjs`
  (the game's own `holeMapSvg` layouts), `extract-shop.cjs` (the game's own `studioShot` renders on a
  dark backdrop), `clean-owner.py` (the owner's screenshot cropped to the stage with the old HUD painted out)

Every background is a real render of the shipped game, not an illustration.

---

## 1. Principles

1. **The course is the hero.** Menus float as glass over the 3D flyover; the hole screen keeps the
   centre of the frame empty. Nothing cream, nothing wooden, no offset "toy" shadows.
2. **One accent, used for meaning.** Volt marks the current thing, the primary action and anything
   earned: the hole number tile, the play button, the selected tab, stars, a winner's total.
   If two things on screen are Volt, one of them is probably wrong.
3. **Numerals do the talking.** Big numbers in heavy weight, their context as a small glyph in a
   lighter tone. Tabular figures everywhere so nothing jitters as values change.
4. **The scorecard's own language.** Birdies ringed in red, bogeys boxed, under par in red, a
   broadcast-style single row of 18. Golfers already read this without words.
5. **Same skeleton everywhere.** Back or home top-left at (24, 24); status chips and the scene's own
   action top-right; the primary action bottom-right; 24 px stage margins; 88 px targets.

---

## 2. Tokens

All values are stage px (the stage is 1200 x 700, scaled to fit). Replace the `--v-*` Toybox tokens
in `src/shell.html` section 1 with these `--b-*` tokens (the mockup uses the same names without the
`b-` prefix).

### 2.1 Colour

| Token | Value | Use |
|---|---|---|
| `--b-bg` | `#0B0D10` | stage background behind every 2D scene; the fallback when blur is unavailable |
| `--b-glass` | `rgba(17, 19, 23, .62)` + `backdrop-filter: blur(24px) saturate(1.6)` | HUD pieces, chips, tiles, cards over the scene |
| `--b-glass-2` | `rgba(12, 14, 18, .82)` + same blur | sheets and modal cards (options, done card, scorecard, shop stage) |
| `--b-fill-1` | `rgba(255,255,255,.06)` | rows and cells inside glass; resting controls inside a sheet |
| `--b-fill-2` | `rgba(255,255,255,.10)` | buttons inside a sheet (close, map, retry); empty bar tracks |
| `--b-fill-3` | `rgba(255,255,255,.16)` | pressed state; toggle track off; double bogey box |
| `--b-line` | `rgba(255,255,255,.10)` | hairlines: glass edge (inset 1 px), table rules, dividers |
| `--b-line-2` | `rgba(255,255,255,.18)` | stronger dividers inside the scorebug; empty slot outlines |
| `--b-fg` | `#FFFFFF` | primary numerals and icons on dark |
| `--b-fg-2` | `rgba(255,255,255,.66)` | secondary numerals (par, totals' denominators), label icons |
| `--b-fg-3` | `rgba(255,255,255,.42)` | tertiary: column headers, locked numerals, inactive icons |
| `--b-fg-4` | `rgba(255,255,255,.24)` | empty stars, dashed guides |
| `--b-volt` | `#D4FF3A` | THE accent: primary buttons, selected states, the hole tile, stars, progress |
| `--b-volt-ink` | `#0B0D10` | everything placed on Volt (icons, numerals, the toggle knob) |
| `--b-volt-14` | `rgba(212,255,58,.14)` | selected card wash, the leader's row |
| `--b-volt-40` | `rgba(212,255,58,.40)` | the dead-on zone in the shot meter |
| `--b-red` | `#FF5A4F` | under par: to-par numbers, birdie rings, eagle discs; a downgrade pip in the shop |
| `--b-gold` / `--b-gold-deep` | `#F4C34D` / `#9E7212` | coins only (an object colour, never an accent) |
| `--b-p1..p4` | `#F4F5F7` `#FFC53D` `#FF6FAE` `#4FC3FF` | the four pass-and-play balls (also `PARTY_BALLS` in `game.js`, so the 3D ball matches) |

**On dark (glass, `--b-bg`):** white at 100 / 66 / 42 / 24 %, Volt, red, gold, player colours.
**On light (Volt, player balls, the white toggle knob):** `--b-volt-ink` only, at 100 % for
numerals and icons, 62 % for secondary meta. Never put white or Volt on Volt.
**Over the 3D scene directly:** nothing. Text always sits on glass. The hole screen adds a top
scrim (`linear-gradient(rgba(0,0,0,.34), transparent)`, 170 px) so the scorebug reads on snow.
Glass at .62 over pure white snow measures about 5:1 for white text, so small numerals pass AA;
everything 24 px and up passes comfortably.

**Neon night:** the HUD does not change colour in neon mode. The glass already sits on black there;
Volt reads as one more neon. (Today's pink/cyan neon styling of buttons is dropped from the DOM;
neon stays a 3D look.)

### 2.2 Type

No web fonts. Two stacks; on Apple devices both resolve to SF Pro, elsewhere to the best local face.

```css
--b-font-d: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter Display", "Inter",
            "Segoe UI Variable Display", "Segoe UI", Roboto, system-ui, sans-serif;
--b-font-t: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter",
            "Segoe UI Variable Text", "Segoe UI", Roboto, system-ui, sans-serif;
```

Every numeral: `font-variant-numeric: tabular-nums`. Display sizes take negative tracking.

| Role | Size / weight / tracking | Where |
|---|---|---|
| Display XL | 112-120 / 800 / -0.05em | done card strokes, scorecard total, hole intro number |
| Display L | 56-64 / 800 / -0.04em | to-par on the done card, world number, carry-on hole |
| Display M | 40-46 / 700-800 / -0.02em | HUD numerals, primary button numerals |
| Title | 28-34 / 700 / -0.02em | chips, tiles, course card numbers, leaderboard totals |
| Body | 22-26 / 600-700 | scorecard cells, card meta |
| Caption | 20 / 600 | denominators (`/54`), column headers, small tallies. Nothing below 20 (11 px on a phone) |

Weight contrast is the hierarchy: the value at 700-800, its context at 600 and 66 % or 42 %.
The wordmark is "putt" in Display 800 white with "X" in Volt, tracking -0.045em, beside the mark.

### 2.3 Radii

`--b-r-xs 10` (tags, small pills) · `--b-r-sm 16` (the hole tile on cards) · `--b-r-md 24`
(88 px buttons, chips, HUD capsules) · `--b-r-lg 28` (course cards, tiles) · `--b-r-xl 36`
(sheets, modal cards) · `999` for pills. Nested radii step down by the padding (a 22 px row inside a
36 px sheet with 14 px of padding reads as concentric).

### 2.4 Elevation

- **e0, inline:** `--b-fill-*`, no shadow. Rows and cells inside glass.
- **e1, floating:** glass + `inset 0 0 0 1px rgba(255,255,255,.10), inset 0 1px 0 rgba(255,255,255,.08), 0 8px 24px rgba(0,0,0,.26)`. HUD, chips, tiles.
- **e2, modal:** glass-2 + `inset 0 0 0 1px rgba(255,255,255,.10), inset 0 1px 0 rgba(255,255,255,.10), 0 28px 72px rgba(0,0,0,.5)`. Sheets and result cards; the scene behind dims with `rgba(5,7,9,.4-.55)`.
- **Primary:** Volt + `inset 0 1px 0 rgba(255,255,255,.45), 0 10px 28px rgba(0,0,0,.3)`. No glows.

### 2.5 Spacing and layout

4 px base; the steps in use are 4, 8, 12, 16, 24, 32, 48. Stage margin 24 on all sides. Gap between
88 px buttons 12 (8 inside a joined capsule, where a hairline divides them instead). Card padding
24-28. Rows in a sheet 88 tall with 16-20 between.

### 2.6 Motion

- Standard easing `cubic-bezier(.2, .8, .2, 1)`; durations 160 (press), 220 (chips, tabs), 280 (sheets, cards), 420 (the hole intro graphic).
- Press: `scale(.96)` and `--b-fill-3`, 120 ms. No translateY "key press".
- Sheets rise 24 px and fade in; cards scale from .96 and fade. No overshoot bounce anywhere (the popIn `cubic-bezier(.3, 1.6, .5, 1)` goes).
- Numbers that change (strokes, coins, pin distance) roll vertically 180 ms.
- Stars fill one by one, 120 ms apart, scale .85 to 1.
- The menu backdrop is the 3D flyover: a slow camera drift, 40-60 s per loop.
- **Reduced motion:** every decorative animation off (`animation: none`); sheets and cards appear
  with a 120 ms opacity fade only; the flyover holds one still frame; numbers swap instantly; the
  iris wipe is skipped (as today).

---

## 3. Components

**Buttons.** 88 x 88, radius 24, icon 32-36 px centred. Three kinds: *glass* (on the scene),
*fill* (`--b-fill-2`, inside a sheet or card), *primary* (Volt, ink icon, often wider with a numeral:
"play 13"). A toggle-able button shows its on state as Volt with ink. Only one primary per view.

**Joined capsules.** Related buttons share one glass capsule split by a 1 px `--b-line-2` hairline
inset 20 px: the scorebug, read + view, aim left + right, the shop tabs.

**Chips** (read-only status). Glass, 64 tall, radius 20, icon 26 + Title numeral + optional
Caption denominator. They are never buttons, so they may be under 88 px.

**Tags.** 32-36 tall pills: "check 18" (finished), "play 13" (next hole, Volt), "+70" coins (gold on
a 16 % gold wash).

**Cards.** Glass e1, radius 28. A course card is a picture (a real render of that course, 260 tall)
over a body: number in Display L, stars `n /54`, a 4 px Volt progress bar, then best round or
holes played. Selected card: 2 px inset Volt ring.

**Sheets.** Glass-2 e2, radius 36, 32 padding, a close button (fill, 88) top-right, a 1 px rule under
the header. Rows are fill-1, radius 22, 88 tall: label icon left in `--b-fg-2`, control right.

**Toggle.** 76 x 46 track; off `--b-fill-3` with a white knob; on Volt with an ink knob. The whole
row is the 88 px target.

**Segmented control.** fill-1 track, segments 88 tall and at least 88 wide; the chosen one is
Volt with ink. Used for swing pad side, players 1-4, shop tabs.

**HUD scorebug.** One glass capsule at (24, 24), 88 tall: course map button | Volt hole tile with
the number in 46/800 ink | par (flag glyph 20 over the numeral 38/700) | hairline | strokes
(putter glyph over the numeral 38/800). The mulligan is its own glass button next to it (undo icon
over the count in 18/700).

**Pin tag.** Glass pill 44 tall, radius 14, a 14 px pointer underneath: Volt flag glyph, distance
in 24/700, and when the cup sits higher or lower a small triangle with the centimetres in
20/600 `--b-fg-2` (pointing down and red when it falls away).

**Swing pad.** A 120 x 360 glass capsule (radius 60): a dashed vertical guide, a 32 px start ring,
a faint double arrow until the first touch. The finger's path draws white for the backswing and
Volt for the stroke (red when it is off line).

**Shot readout.** A 72-tall glass pill centred at the bottom: start-line meter (track `--b-fill-3`,
dead-on zone `--b-volt-40`, a centre tick, the ball marker in Volt / gold / red as today's
green / yellow / red) | hairline | gauge glyph and power in 34/800.

**Stars.** The 24-grid star; earned: filled Volt; not yet: 1.6 px outline at `--b-fg-4`.
**Coins.** A gold disc with an inner ring and a vertical mint mark; only ever beside a number.
**Mulligan tokens.** A white disc with the undo arrow in ink, so it never reads as a coin.
**Locks.** The line lock in `--b-fg-3`; a locked card or tile drops to 38 % glass with its picture
or layout at 34 %. Locked worlds keep their icon visible, dimmed.

**Score marks** (scorecard, done card, hole map, leaderboards):
ace: Volt disc, ink numeral · eagle or better: red disc, white numeral · birdie: 2 px red ring ·
par: plain · bogey: 2 px `--b-fg-3` box (radius 6) · double bogey or worse: `--b-fill-3` filled box.
To par is written `−1` (true minus sign, red), `±0`, `+2` (white).

**Player balls.** A lit sphere in the player's colour with the player number in ink. Every
pass-and-play surface identifies players only this way (and the 3D ball wears the same colour).

**Iconography.** A single line set on a 24 grid, 2 px stroke (2.2 for 24 px renders on Volt),
round caps and joins, no fills except a state, a flag pennant, a putter head, a play triangle.
Sizes in use: 16, 18, 20, 22 (inline with numerals), 26-28 (chips), 32-36 (buttons), 44 (headers).
All icons are in `icons.py`; the ones that replace today's drawings:

| Meaning | Icon | Replaces |
|---|---|---|
| course map (from a hole, a card) | 2 x 2 rounded squares | the house on `homeBtn`, `doneMap`, `cardMap`, `partyMap` |
| home / back | house; left chevron | `worldsHome`, `mapBack`, `worldBack`, `profilesBack`, `shopBack` |
| options | three sliders | the cog on `setBtn` |
| hole / par / strokes | (the Volt tile) / flag / putter | the target, flag and putter chips |
| mulligan | undo arrow | the white swoosh |
| read slope / overview | contours with a ball / eye | `readBtn`, `viewBtn` |
| show me the line (practice) | dotted curve, ball, target ring | `guideBtn` |
| practice | target rings | `practiceBtn` |
| sound / neon / pad side | speaker / moon / a screen with the pad drawn left or right | `soundBtn`, `neonSet`, `handL`, `handR` |
| players / profile | two figures / one figure | `partyBtn` |
| pro shop | bag | the striped shop front |
| hole of the day / streak | calendar / flame | the sun ticket |
| goals: under par / no walls / lost ball | a gull / a wall struck through / a ball with a sparkle | the cartoon bird, bricks, cookie coin |
| birdie / eagle badge | one gull / two gulls (three for an albatross) | the bird illustrations on `doneBadge` |
| worlds 1-10 | cone, sun, leaf, peaks, anchor, volcano, castle, ringed planet, lollipop, cloud | the coloured world emblems |
| Classic / bonus nine | flag on a card / four-point sparkle (Volt) | the Classic card art, the neon star |
| totals | sum sign, drawn as a path | the "1-9 / 10-18" sub-labels stay as numerals |

---

## 4. Scene by scene

### 4.1 Home (`#title`), frame 1

Today: an illustrated day-to-night panorama, a hanging wooden sign, a round green play button, a
gold "hole of the day" ticket. **Now:** the 3D course itself, flown over slowly (the hole intro's
own camera path on the last hole played, looping), darkened on the left by a gradient scrim.

- Top-left: the lockup (the cup-and-ball mark, then the wordmark) in an SVG/text group marked
  `data-logo`, replacing `#titleArt`.
- Top-right: the profile pill (equipped ball, total stars), opens profiles; then the options button
  (`#setBtn` moves here).
- **Carry on** (`#titleGo`, now 456 x 148, Volt): play disc, world icon and number, three course
  dots, the hole number in Display L with its par, and the hole's layout drawn in ink at the right.
- Four tiles, 222 x 112: **Courses** (opens course select; a 10-step progress strip of worlds),
  **Hole of the day** (`#dailyBtn`: calendar, flame and streak, a Volt check once played),
  **Players** (`#partyBtn` moves here: the count, four pips; opens the options sheet scrolled to
  players), **Pro shop** (`#shopBtn`: bag and coin balance).

### 4.2 Options (`#settings`), frame 2

Today: a strip of five buttons in a cream panel inside the worlds scene. **Now:** a modal sheet
(904 x 496) reachable from Home, course select and the hole map's options button, holding:
sound (`#soundBtn`, toggle row), neon night (`#neonSet`, toggle row), swing pad side
(`#handL` / `#handR`, a segmented pair), **players 1-4** (`#partyN1` new, `#partyN2..4` move here
from `#partyPick`; each segment shows its numeral and the ball colours in play), and the three
**profiles** (cards with ball, number and stars; the active one ringed in Volt; an empty slot is a
dashed outline with a plus; long-press a card for the bin, as today). The header repeats the active
profile. `#partyPick` goes away as a popup; `#setClose` becomes the sheet's close button.

### 4.3 Course select (`#worlds` + `#world`), frame 3

Today: ten cream world cards, then a separate world map with three course nodes on a road.
**Now one screen:** the ten worlds as a 2 x 5 rail of glass tiles on the left (icon, number, a 4 px
star bar; done worlds get a Volt check, locked ones dim with a lock), and the chosen world's three
courses as cards on the right, each with a real picture of that course, its stars of 54, a progress
bar and either its best round to par or holes played plus a Volt "play 13". The Classic (`#classicBtn`)
and the bonus nine (`#bonusBtn`) sit as pills in the top bar; stars and coins (`#mapWallet`) and the
shop (`#shopBtn`) top-right. `#worldGrid`, `#worldNodes` and `#trophyBtn` keep their ids (the
tracker opens from the world header). The `#world` scene can stay for the unlock moment, restyled.

### 4.4 Hole map (`#map`), frame 4

Today: numbered wooden discs on a dotted path. **Now:** the course guide. Two rows of nine glass
tiles (120 x 212), each with the hole number, par, the hole's real layout (the game's
`holeMapSvg`, restyled as white line work with the flag in Volt), its stars and its best score in
its scorecard mark. The next hole to play gets a Volt ring and a Volt play disc; locked holes dim
with a lock. Bottom-left a chip with the course to par so far and holes played; bottom-right the
primary "play 13" button. Top: back, course badge (`#mapBadge`: world icon, number, three course
dots), stars, lost balls (`#mapLost`), practice (`#practiceBtn`). `#holePath .node` keeps its class
and ids; `#pathLine` is no longer drawn.

### 4.5 The hole (`#hole`), frames 5, 5b, 5c

Today: cream chips spread along the top, a blue mulligan block, cream buttons down the left, a
big cream slider at the bottom. **Now:** one scorebug top-left (`#homeBtn`, `#hudHole`, `#hudPar`,
`#hudStrokes` laid side by side as a single capsule), the mulligan beside it (`#mulliganBtn`),
read and view as one capsule and aim left / right as another (`#readBtn` + `#viewBtn`,
`#aimL` + `#aimR`), the swing pad as a slim glass capsule on the right (`#swingPad`), the shot
readout as a low pill at the bottom (`#shotPanel`), the pin tag as a small pointer label (`#pinTag`).
`#hudMode` (practice, daily, friend) becomes a 64-tall glass chip top-right with its icon;
`#partyChip` is the player's ball with the turn order as dots (the current player a wide pill).
Left-handed mode mirrors pad and controls exactly as today. Frame 5 is the owner's own screenshot
with the old HUD painted out; frame 5b is the snow course, the brightest scene in the game, mid
pass-and-play.

**Hole intro** (`#holeBanner`, frame 5c): a broadcast hole graphic, 168 tall: the layout drawing,
the hole number on Volt in Display XL, par, and world / course. Replaces the dark pill.

**Replay** (`#replayTag`): a glass pill top-centre with a red record dot, steady (no blinking).

### 4.6 Hole done (`#holeDone`), frame 6

Today: three big gold stars, "1 flag 2", three yellow badges, three cream buttons, a gold sticker.
**Now:** a 580 x 552 glass card: the hole tile and par top-left, coins won as a gold pill
top-right (`#doneCoins`); the strokes in Display XL inside their scorecard mark (a red ring for a
birdie), to par beside it in red with the birdie badge (`#doneBadge`, gulls); three stars at 68; the
three goals (`#doneObj`) as 56 px discs, Volt when met; then map, again, and a wide Volt "play 4".

### 4.7 Scorecard (`#card`), frames 7 and 7b

Today: two cream nines on ruled card stock with handwritten-blue marks. **Now:** a full-stage
glass panel and one broadcast row: label, 1-9, 1-9 total, 10-18, 10-18 total, sum. The par row in
`--b-fg-2`, each player's row in white with marks; nine totals on `--b-fill-1`, the sum on
`--b-fill-2`. Solo: below, the total in Display XL, to par, stars of 54 with birdie and bogey
counts, coins won and lost balls found; a Volt trophy pill top-right when the round is a new best;
map and "next course" (play, world icon, course dots). Pass and play: one row per player
(ball and number as the label), the winner's row washed in Volt with its sum on Volt, and the final
board along the bottom between map and play-again: crown, ball, total, to par.

### 4.8 Pro shop (`#shop`), frame 8

Today: a striped awning, cream cards on a cream ground. **Now:** a dark product page. Top: back,
the three tabs as one segmented capsule (putters, balls, mulligans), and the wallet (coins | tokens).
Left: the stage (`#shopStage`), the live studio render (`#shopView`) on the same `#1D2026` backdrop,
the three stats (contact, tempo, line) as five-segment bars against what you hold (white kept,
Volt gained, red outline lost) and the action (`#shopAction`: Volt "coin 580" to buy; "check" to
equip; an outlined check when equipped; dimmed with a lock when you cannot afford it). Right: the
cards (`#shopGrid .card`), each a studio render (rendered with `studioShot(..., bg = '#1D2026')`
instead of cream) over its price; owned shows a quiet check, equipped a Volt check pill and a Volt
top edge, selected a 2 px Volt ring. The pager is two glass buttons and pill dots.

### 4.9 Profiles (`#profiles`)

Becomes the profiles row of the options sheet; on a first launch with no profile, Home opens the
sheet on it. The scene can stay as a full-screen version of the same three cards for the first run.

### 4.10 Everything else

Tracker (`#tracker`), lost-ball pop (`#lostPop`), update (`#updateBtn`), rotate prompt (`#rotate`):
glass cards and chips in the same system, icons from the set. The iris wipe colour becomes `--b-bg`.

---

## 5. Multiplayer (pass and play)

**Where players are chosen.** In Options: the players row, 1 2 3 4 (frame 2). Home shows the
current count on the Players tile, which opens Options at that row. The count persists in the save
(`progress.players`), so a family can leave it on 3. With 1, everything is solo as today.

**How a round starts.** With 2-4 players, anything that starts play starts a pass-and-play round of
that course from hole 1: Carry on, a course card, or the hole map's play button (the map shows the
player balls beside the button, and the per-hole tiles stay readable but a party always tees off at
hole 1). Party rounds keep today's rules: practice scoring (no stars, coins or bests change), the
starter ball dressed in each player's colour, no mulligans.

**How it plays.**
1. Each hole opens with the hole graphic (frame 5c), then player 1 putts. The scorebug shows the
   hole, par and that player's strokes; `#partyChip` top-right shows whose turn it is (their ball,
   the order as dots, frame 5b).
2. When a player holes out, the pass screen (`#partyPass`, frame 5d) fills the stage: the next
   player's ball, large, in a ring of their colour, and this hole's scores so far along the bottom.
   Tap anywhere (or wait 1.6 s, as today) and they putt.
3. When everyone has holed out, the hole board (`#partyDone`, frame 6b): rank, ball, crown for the
   best, the hole score in its mark, running total and to par. Play goes to the next hole with the
   honour (best score first, ties in the previous order), shown as the ball on the play button.

**How it ends.** After hole 18 the scorecard (frame 7b): every player's row, the winner washed in
Volt, the final board with crown, totals and to par; map, or play the course again with the same
players. Leaving to the map at any point ends the party, as today. Switching back to 1 player in
Options ends nothing mid-round; it applies to the next round.

**Ids.** `#partyBtn` becomes the Home Players tile; `#partyN2..4` (plus a new `#partyN1`) become the
segments in Options, and a click on N2..4 from the hole map context still calls `startParty(n,
mapWorld)`; `#partyPick` and `#partyPickClose` retire. `#partyChip`, `#partyPass`, `#partyDone`,
`#partyRows`, `#partyMap`, `#partyNextBtn`, `#cardPanel.party` keep their ids and roles.
`tests/party-check.cjs` changes from "tap partyBtn on the map, then partyN2" to "open Options, tap
partyN2, then start the course".

---

## 6. App icon, favicon, home screen

`icon.svg`: a graphite plate lit from the top left; the cup seen from above, a black hole with a
lit far wall inside a thick Volt rim; a white ball, faintly dimpled, resting on the lip at the top
right with a soft shadow. At 180 it reads as golf (the dimples, the lip); at 32 and 16 it is still a
Volt ring and a white dot, distinct in a tab strip. It shares its mark with the wordmark lockup.

- `docs/icons/icon.svg`: this file (rx 228 rounded plate, for browsers).
- `apple-touch-icon.png` (180) and `icon-512-maskable.png`: render with the plate full-bleed (drop
  the `rx`; iOS and Android mask it themselves). The artwork already sits inside the 80 % safe
  circle.
- `icon-192.png`, `icon-512.png`: as rendered here.
- `manifest.webmanifest`: `background_color` and `theme_color` become `#0B0D10`; the shell's
  `<meta name="theme-color">` too, and `html, body { background: #0B0D10 }`.

---

## 7. Implementation notes

- Restyle only: section 1 tokens swap; sections 3 onward restyle in place; the illustrated
  `#titleArt` SVG and the shop awning are deleted; icons are inline SVG strings as today (from
  `icons.py`, `currentColor` so state classes recolour them).
- Ids stay. New: `#partyN1`, a wrapper for the scorebug capsule if wanted (or position the four
  existing elements flush and round only the outer corners), `#homeTiles`.
- The 3D course behind menus: today `render()` skips frames when a 2D scene covers the stage. For
  the flyover, keep rendering behind `#title` at a reduced rate (30 fps is plenty), and behind the
  other menus freeze one frame (render once on entry, then stop) so `backdrop-filter` blurs a still
  image. With `prefers-reduced-motion` the title holds one frame too.
- Fallback: where `backdrop-filter` is missing, glass falls back to `rgba(14,16,20,.9)`
  (`@supports not (backdrop-filter: blur(1px))`).
- Studio renders: pass `'#1D2026'` to `studioShot` for thumbs and the view.
- `holeMapSvg` gains a style argument (line colours) so the map tiles, the carry-on tile and the
  intro graphic draw it white, ink or dim.
- The suites' rules all hold: zero letters (the lockup is `data-logo`), every button at least 88
  stage px (`render.cjs` audits the mockup for both), reduced motion honoured, no em dashes.
