# PuttX

3D mini golf for a 3 to 5 year old, set in [vroom](https://github.com/zacker3310/vroom)'s worlds:
construction day, snow and space, 9 holes each. One `index.html`, no reading, nothing to lose.
Play at **https://zacker3310.github.io/puttX/**.

## How to play

Drag back anywhere on the course. The arrow shows where the ball goes, the ring shows how hard.
Let go to putt. Sink it in as few putts as you can; the flag and the number next to it are par.

## For grown-ups

- **No fail states.** After par + 3 putts the ball rolls itself in. Stars (1 finish, 2 par,
  3 under par) and best scores only ever go up.
- **Harder as you go.** Construction teaches walls, banks and slopes; snow adds ice and snowmen;
  space adds low gravity, jumps over gaps, craters and drifting asteroids.
- **Quiet mode.** The speaker on the map mutes everything. It sticks.
- **Home screen.** In Safari: Share, then Add to Home Screen. It launches full screen in landscape.
- **Progress** lives in this browser's local storage. Clearing website data resets it.

## Development

See `CLAUDE.md`. `npm ci && npx playwright-core install chromium && npm test`.
Every par is proven by a bot (`npm run solve`) and replayed by the suite.

MIT licence. three.js r170 is inlined under its MIT licence.
