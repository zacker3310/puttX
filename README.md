# PuttX

Hard 3D mini golf for 12 year olds: ten courses of 18 holes, from a construction yard to a sky
kingdom, with a real putter stroke and a pro shop. One `index.html`, no reading, works offline.
Play at **https://zacker3310.github.io/puttX/**.

## How to play

- **Aim:** drag the course left or right; the arrow buttons nudge a quarter degree. The eye shows
  the whole hole from above.
- **Putt:** on the swing pad (right), touch, pull down for the backswing and push back up through
  where you touched. Longer backswing, longer putt.
- **Mishits are real:** decelerate and it comes up short, jab and it runs long, drift sideways and
  you push or pull it, strike off the sweet spot and it dies and twists. The readout after each
  putt shows your path, strike point and tempo.
- Coins from every hole buy putters (more forgiving) and balls (pure style) in the pro shop.

## For grown-ups

- **No fail states.** After par + 3 putts the ball rolls itself in. Stars (1 finish, 2 par,
  3 under par) and best scores only ever go up.
- **Hard but fair.** Every par is proven by a solver bot, and a second bot with human-sized aim
  and pace errors measures how hard each hole really is.
- **Quiet mode.** The speaker on the map mutes everything. It sticks.
- **Home screen.** In Safari: Share, then Add to Home Screen. It launches full screen in landscape.
- **Progress** lives in this browser's local storage. Clearing website data resets it.

## Development

See `CLAUDE.md`. `npm ci && npx playwright-core install chromium && npm run build && npm test`.

MIT licence. three.js r170 is inlined under its MIT licence.
