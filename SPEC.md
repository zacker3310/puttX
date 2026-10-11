# PuttX

Mini golf for a 3-5 year old, set in vroom's worlds. Browser, single `index.html`, no build
step, no network. Hosted on GitHub Pages at `zacker3310.github.io/puttX`. Quality bar: a
first-party Nintendo putting game on an iPad.

## Design rules (non-negotiable)

Inherited from [[vroom/SPEC|vroom]], amended for golf:

- Zero required reading. Icons, pictures and numerals only. `aria-label`s are fine.
- Real scoring, no fail states. Strokes count against par, but every hole always finishes and
  stars only go up.
- Every tap target is at least 64 px rendered at iPad landscape (1024x768). Portrait asks to rotate.
- Every touch answers instantly with motion and a synthesized sound.
- Toybox look: vroom's `--v-*` tokens, flat `0 6px 0` shadows on chrome, big radii.
- Honour `prefers-reduced-motion` for anything decorative.
- No em dashes anywhere.
- Loop: map -> hole -> putt -> sink -> stars -> next hole -> world card -> next world.

## Architecture

- **One file.** `index.html` holds a `<style>` block, scene markup and the game `<script>`.
- **Three.js, inlined.** One pinned three.js release (MIT, license comment kept), minified, in
  its own `<script>` block ahead of the game script. It is the game's only dependency. No CDN:
  the page works offline and from the home screen.
- **Hand-rolled physics.** No physics library. The ball is a sphere rolling on the hole's
  surface, with wall segments, surface zones and obstacles, stepped at a fixed 240 Hz. Given
  the same putt (angle, power) on the same hole, the result is identical. The tests rely on this.
- **Holes are data.** Each hole is a hand-authored object: tee, cup, wall outline, slope
  patches, surface zones, obstacles and par. The renderer builds meshes from it; physics reads
  the same object. Nothing is seeded.
- **World packs.** Each world registers its holes, palette, props, sky, jingle and physics
  knobs at an anchor comment, the vroom pack pattern. Adding a world means adding a pack.
- **`package.json` is test tooling only** (playwright-core, eslint).

## Scenes

1. **Title.** Big ball, big go button.
2. **Map.** Three world tabs (locked until the previous world's 9th hole is finished), each a
   path of 9 hole buttons. Done = hole number, 1-3 stars, best strokes. Locked = grey + padlock.
3. **Hole.** The 3D course. Top-left: hole number and par as numerals with a flag icon.
   Top-right: stroke count. Home button returns to the map.
4. **Card.** After hole 9: a per-hole strokes row, total against par, stars, confetti. Next
   world button.

## Play

- **Putt.** Drag back from anywhere on screen. An aim arrow points opposite the drag, and a
  ring around the ball fills with drag length (power). Release putts. Drag back to the start
  point cancels. No swing timing.
- **Camera.** A 3/4 view behind the ball frames the ball and cup together while aiming.
  It follows the ball during the roll and settles behind it when it stops.
- **Feel.** Surface friction (felt, ice, sand), slopes that break the ball, walls that bank
  with restitution, moving obstacles, and a cup that captures below a speed threshold and
  lips out above it.
- **Out of bounds.** Cannot happen on walled holes. A ball leaving the course (space gaps)
  pops back to where it was putted from with a boink, plus one stroke.

## Scoring

- Par is 2 to 4 per hole.
- **Stroke cap at par + 3.** If that putt misses, the ball gets a friendly auto-roll into the
  cup and the hole scores par + 3. No retry wall, no "lose" moment.
- **Stars:** 1 for finishing, 2 for par, 3 for under par. Hole in one adds a confetti burst
  and a badge. Best stars and best strokes per hole are kept; they never go down.
- Finishing a world unlocks the next, whatever the score.

## Worlds (v1)

Difficulty climbs through all 27 holes; par gets harder to make, never impossible.

| World | vroom # | Holes teach | Signature |
|---|---|---|---|
| Construction day | 1 | straight shots, walls, bank shots, slopes, a moving crane arm | cones, girders, dirt patches (sand friction) |
| Snow | 5 | ice patches (low friction), snowmen as obstacles, narrower lanes | ice, snowmen, falling flakes |
| Space | 8 | low gravity (vroom's 640), jumps over gaps, crater gravity wells, drifting asteroids | moon felt, starfield, friendly aliens |

## Look and feel

- Vroom's toybox palette under real light: hemisphere light plus a warm sun with soft shadows.
  Chunky, rounded geometry; felt texture generated in-page (no image files).
- Juice: ball trail, squash on wall hits, cup rattle, flag pop, hole-in-one confetti.
- Sound, all synthesized: putt click pitched by power, rolling hiss tracking speed, wall clonk,
  cup rattle, a jingle and ambience per world.
- Performance: 60 fps on an iPad. Pixel ratio capped at 2, one 1024 shadow map.

## Persistence

`localStorage` only: per-hole best strokes and stars, unlocked worlds, sound on/off. Missing or
corrupt data falls back to a fresh save.

## Verification

Playwright suites (vroom's runner pattern) written before the code they cover:

1. **Boot.** Every scene renders; no console errors.
2. **No words.** No visible text nodes other than numerals and symbols.
3. **Tap targets.** Every interactive element is at least 64 px at 1024x768.
4. **Determinism.** The same putt on the same hole produces the same final position and stroke
   count across runs.
5. **Hole bot.** For every hole, a search over putt angle and power proves par is reachable,
   and a worst-case player reaches the cup by the stroke cap.
6. **Lint.** ESLint over the inline game script, zero findings (three.js block excluded).

## Out of scope for v1

Later packs: the other 9 vroom worlds; the **garage** (ball options and other customization);
profiles; save codes and QR; the update gate; multiplayer.
