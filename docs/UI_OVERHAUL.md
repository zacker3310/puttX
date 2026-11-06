# UI overhaul: where it stands and how to pick it back up

Paused on 2026-11-06 at the owner's request, after the design round and before any UI code changed.
Nothing in `src/` has been restyled yet; the live game still has the toybox UI.

## What the owner asked for

> The multiplayer options need to be at the options or something. Also this game is now substantially
> more leaning for adults and players that are older why don't you go ahead and overhaul the app icon,
> favicon, Home Screen menu and all the options and hole screens and pages now to be more polished and
> professional!

So, three things:

1. **Multiplayer moves into the options.** Pass and play (2 to 4 players) is started today from a button
   on a course's map (`#partyBtn` opens `#partyPick` with `#partyN2` to `#partyN4`).
2. **A polished, professional UI for older players** on every scene and overlay: home, options,
   profiles, course select, map, hole HUD, hole banner, done card, scorecard, party screens, shop.
3. **A new app icon and favicon.**

Shipped already from the same session (PR #2): the tumbleweed rebuilt as a real twig tangle, and the
laser golf (bonus nine) and Classic buttons centred.

## Where the design round got to

Three designers each mocked up every screen and the icon in one direction; three judges (a premium
games product designer, an accessibility specialist, the engineer who has to build it) scored them
independently from the rendered frames. Everything is saved in `docs/design/ui-overhaul/`:

| Direction | Score | Files |
| --- | --- | --- |
| **Clubhouse** (winner, unanimous): deep club green, ivory scorecard paper, brass accent, claret for under par, serif tabular numerals, monoline icons, a crest icon | 251.0 | `clubhouse/spec.md`, `clubhouse/icon.svg`, `clubhouse/frame-*.jpg` |
| Broadcast: dark glass over the 3D, SF numerals, one volt accent | 235.5 | `broadcast/spec.md`, `broadcast/icon.svg`, `broadcast/contact-sheet.jpg` |
| Resort: sand, terracotta and sage, travel posters | 218.8 | `resort/spec.md`, `resort/icon.svg`, `resort/contact-sheet.jpg` |

`judges.md` holds every judge's scores, strengths, weaknesses and the ideas to graft. The Clubhouse
frames: 1 home, 2 options sheet, 3 course board, 4 and 4b hole map (solo and party), 5 to 5c hole HUD
and intro, 6 and 6b done card, 7 and 7b scorecard (solo and 4 players), 8 shop, 9 icon.

**Not done:** the synthesis step, which merges the judges' grafts into Clubhouse and writes one final
spec. It was stopped before it wrote anything.

## The grafts all three judges agreed on

Apply these to the Clubhouse spec (details and the rest are in `judges.md`):

1. **Favicon:** keep the full crest for 180, 192 and 512 px, and ship a separate small mark for 16 to
   32 px: no shield outline or inner frame, a thick crossed-putter X, a larger ivory ball, a solid
   green field. Check it in a tab strip at 16 px.
2. **Real hole layouts:** draw each hole's `holeMapSvg` layout (ink or brass line work on paper, a
   claret flag) at the head of every hole column on the map, in the home carry-on row and in the hole
   intro. Reuse the existing data, never hand-draw it.
3. **HUD legibility:** a top scrim on `#hole` (`linear-gradient(rgba(0,0,0,.34), transparent)` over
   170 px); neutral smoke glass rather than a green tint; a pointer under `#pinTag`; join `#readBtn` with
   `#viewBtn` and `#aimL` with `#aimR` into two capsules; no numeral under 20 stage px.
4. **Multiplayer:** players are the first row of the options sheet (a 1 to 4 segment: `#partyN1` new,
   `#partyN2` to `#partyN4` kept); `#partyBtn` moves to home with a visible count badge; with 2 or more
   players home's carry-on row becomes a tee-off row for the current course (`startParty(n, course)`);
   `#partyPass` waits for a tap and shows who has putted, who is up and who waits; the 4-player
   scorecard washes each hole's unique best in pale brass and offers a rematch.
5. **The wordmark as SVG paths** under `[data-logo]`, so the lockup is identical on every platform.
6. Flatten the brass gradients on large slabs to two stops; a `@supports not (backdrop-filter)`
   fallback and a `.lowfx` class that drops the blur when frames run long; one SVG sprite of `<symbol>`s
   with a small helper so the icon family stays consistent.

## How to pick it back up

1. **Look first.** Read `docs/design/ui-overhaul/clubhouse/spec.md` and `judges.md`, and look at the
   Clubhouse frames. Capture the current screens to compare against:
   `node scripts/ui-shots.cjs preview/ui-before` (22 PNGs: every scene at iPad and phone sizes).
2. **Write the final spec**: Clubhouse plus the grafts above, as `docs/design/ui-overhaul/final-spec.md`.
   Exact tokens (hex, font stacks, sizes, radii, shadows, spacing), then every scene and overlay in
   `src/shell.html` with its restyle and any DOM change, keeping element ids (the suites click them).
   Finalise `icon.svg` and the small favicon mark next to it.
3. **Build it**, in this order so the game stays playable at every commit:
   - tokens and base components in `src/shell.html` (replace the `--v-*` toybox tokens);
   - home menu and options sheet, with multiplayer moved in (`src/game.js`: `showTitle`,
     `renderTitleStrip`, the party module; `#partyBtn` and `#partyPick`);
   - course select, world, map and scorecard (`showWorlds`, `showWorld`, `showMap`, `showCard`);
   - hole HUD, banner, done card, party chip, pass and scoreboard;
   - shop (`src/shop.js`);
   - icons: `docs/icons/icon.svg` plus the favicon mark, re-rendered with `node scripts/render-icons.cjs`
     (teach it the separate small mark), the `<link rel="icon">` in `src/shell.html`, and
     `manifest.webmanifest` colours.
4. **Update the rules and tests:** `CLAUDE.md` says "Toybox UI: the `--v-*` tokens from vroom"; rewrite
   it to the new system. `tests/party-check.cjs` starts a party from the map's `#partyBtn`; rewrite it
   to go through the options. Check `tests/ui-check.cjs` (tap sizes, overlaps), `tests/save-check.cjs`
   and `tests/extras-check.cjs` for selectors that moved.
5. **Review and ship:** `node scripts/ui-shots.cjs preview/ui-after` and compare; a visual QA pass over
   every screen (legibility over bright and night courses, tap targets, reduced motion, no words);
   then `npm run lint`, `npm test`, `npm run build`, a PR and the merge.

## Constraints that still hold

- **Zero words on screen**: numerals and symbols only (`aria-label`s are fine; the logo is the one
  exception). The suites check it. The owner has not asked to drop it; ask before adding text labels.
- Tap targets at least 88 stage px (the stage is 1200 x 700, scaled to fit).
- One offline file: system font stacks and inline SVG only, no web fonts or external assets.
- Honour `prefers-reduced-motion` for anything decorative. No em dashes anywhere.
- The 3D course and the sim are not part of this work.

## Open question for the owner

Words on screen. The design round kept the zero-words rule. For an older audience, text labels on the
menus may read as more professional; it is the owner's call, and the suites would need to change.
