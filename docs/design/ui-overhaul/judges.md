# UI overhaul: the judges' notes

Three judges scored the three directions independently from their specs and rendered frames.
total = polish x3 + coherence x2 + legibility x1.5 + multiplayer + icon + feasibility x1.5 (each 0 to 10).
Combined: clubhouse 251.0, broadcast 235.5, resort 218.8.


## Senior product designer at a premium games studio

Winner: **clubhouse**

### clubhouse: 84.0 (polish 8.5, coherence 9, legibility 8.5, multiplayer 9, icon 7.5, feasibility 7.5)

Strengths: The most clearly adult and golf-native of the three, and it looks like a paid premium game. Serif tabular numerals (New York / Charter) on ivory scorecard paper, deep club green and one brass accent read as a private club, not a toy. The system is tight: one 'hole column' glyph (number on brass over par on green) names a hole everywhere (HUD bug, done card, intro lower third, carry-on, daily, tee off), and golf score marks (claret circles under par, ink boxes over) run through the map, done card, party board and both scorecards. Frame 4 makes the hole map a real two-nines scorecard with par, best and stars rows, which is legible and needs no words. The HUD (frames 5, 5a, 5b) holds on the owner's dark brick hole, a bright sand course and a sunny green: near-opaque smoked green plates with brass hairlines, and the bug fuses hole, par, strokes with pips, and round-to-par into one plate. Multiplayer is the most completely drawn of the three: a 1 to 4 segment with ball dots and the tee order in the Options sheet (frame 2), a Home players row with ball dots, a fresh party scorecard map with a tee-off button that carries the balls (4b), a HUD player chip (5b), a pass card (5c), a hole leaderboard with the honour tee (6b) and a 4-player card with a ranked column and winner plaque (7b). Nothing is clipped or colliding in any frame. Its cost is mostly restyling, with no new illustrated art.

Weaknesses: Brass gradients on big slabs (the carry-on row, the 260 buy button, the options check) lean toward 2012 skeuomorphism; flatten them to two stops or the look will date. The swing pad (a ruler with ticks and a brass slider) reads as an audio fader, not a putting stroke. The scorecard hole map drops each hole's shape, so it is accurate but dry. The type floor of 16 stage px (17 to 21 for '/ 1 620', board course indices, '1-9') shrinks to about 9 px on the owner's phone at 0.56 scale, too small. The crest icon is a generic 'club shield' idea: at 32 px the putter grips and the shield frame turn to mush, leaving green with a gold X and a dot. The course board's empty footers on locked worlds look unfinished. Going from a board cell straight to the map skips #world, which breaks ui-check's worlds to world to map walk. party-check needs rewriting because #partyN2 now only sets the count and #teeBtn starts the round. CLAUDE.md's Toybox rule must be rewritten. Glass blur over live WebGL needs the opaque fallback.

### broadcast: 77.8 (polish 8, coherence 8.5, legibility 7.5, multiplayer 8, icon 8.5, feasibility 6)

Strengths: The slickest 'modern Apple sports app' look: dark glass, SF numerals with strong weight contrast, and one vivid accent. The course select (frame 3) is the best single screen across all three directions: a 2 x 5 world rail plus real renders of each course with stars, a progress bar and 'play 13'. The hole map (frame 4) draws every hole's real layout from holeMapSvg with stars and the best score in its mark, which is both useful and beautiful. The HUD is the most stripped back: one scorebug with a Volt hole tile, joined capsules for read+view and aim L/R, a slim pad that draws the finger's path, and a pin tag with a pointer to the flag. The single-row broadcast scorecard (7, 7b) reads instantly. The icon (a Volt cup rim and a white ball on graphite) is the strongest at 16 to 32 px and distinct in a tab strip. The spec is thoughtful on engineering: freeze one frame behind menus, @supports fallback, a 20 px numeral floor, and PARTY_BALLS matched to the DOM.

Weaknesses: Volt breaks its own 'one accent' rule. Frame 6 has a Volt hole tile, three Volt stars, two Volt goal discs and a Volt primary, and frame 2 has three Volt fills. Volt on black reads as a fitness tracker or esports, not golf, so it could pass for any app's skin. Visible defects: in frame 7b the fourth leaderboard card butts against the retry button with no gutter, while the others have 12 px. In frame 8 the shop renders are badly framed, with putter heads cut off at the card edges and shafts running out of frame. The birdie 'gull' badge in frame 6 reads as a frowning eyebrow. Home (frame 1) is lopsided, with icon-only tiles that carry little data and a dead lower-left. Legibility over snow (5b): blur at 0.62 turns the glass mid-grey, white icons lose contrast, and the swing pad becomes a light-grey slab. On the dark hole (5) the pad nearly disappears. In multiplayer, a persisted count makes 'carry on' silently start a party from hole 1, and the party map is not drawn. It is the most expensive to build: the 3D scene behind every menu, a cached render per course, merging #worlds and #world, many blurred panes over WebGL, and a dark re-render of the shop thumbnails.

### resort: 72.5 (polish 7, coherence 7.5, legibility 7.5, multiplayer 8.5, icon 7, feasibility 6.5)

Strengths: A warm, calm, carefully made brand: sand paper, terracotta primary, sage for under par, soft shadows, and a carry-on card and notched daily ticket on Home that are genuinely lovely. Its multiplayer thinking is the most humane. Players sit first in the options drawer. Home's carry-on card turns live into a tee-off card with the player lineup (visible behind the drawer in frame 2), and the players tile shows a terra count badge, so a saved count of 4 is never hidden. The handoff (5b) waits for a tap because the device has to change hands, and shows who has putted (score with mark), who is up and who waits. A rematch is offered on the party scorecard. The 4-player card lights the unique best on each hole. The wordmark is drawn as paths, so it is identical on every platform. A .lowfx class drops the blur when frame time runs long. Menus need no live 3D behind them, which is cheaper on GPU.

Weaknesses: It reads as a boutique lifestyle or casual game, still close to the kid lane the owner asked to leave, not 'substantially more for adults'. The monoline rounded 'putt' wordmark looks default and juvenile. The flat travel posters clash with the realistic 3D course and mean ten new illustrations, plus dusk and night variants per course. The hole-map thumbnails (frame 4) are repeated stand-in shapes, not real layouts. In the HUD (frame 5) the mulligan '787' badge sits on top of the pin tag. In 4b every hole but 1 is faded and looks locked, though a party plays all 18. To-par values in 6b and the ranks in 7b's standings are pale ink-3, at low contrast, with the ranks oddly placed on the right. Its 'bright desert' legibility claim is shown only behind a blurred handoff card, so the HUD over a bright scene is not proven. The icon is a beautiful poster at 180, but at 32 px it is an orange glow in a dark square, and the flag and ball vanish. Less golf-specific, and the arch runs off the bottom edge. Light menus against a dark HUD make the biggest jump between surfaces.

### Ideas to graft onto the winner

Graft onto Clubhouse:

From Broadcast:
1. Real hole layouts on the map. Keep the two-nines scorecard but add a layout row under the green hole-number header: holeMapSvg with a new style argument, drawn as brass or ink line work on paper, flag in claret. This brings back the visual identity the bare table lacks, and the same thumbnail goes into the carry-on row and the intro lower third.
2. Course renders on the board. Keep the 10x3 tournament board, and when a cell is focused show a preview strip or the #world plaques with that course's cached studioShot-style render, falling back to holeMapSvg. Keep #world reachable from the world header so ui-check's walk survives.
3. Joined capsules in the HUD's left column. Read plus view become one capsule and aim L plus R another, split by a brass hairline. Four or five loose 88 px plates become two.
4. The swing pad as a capsule that draws the finger's path: ivory backswing, brass stroke, claret when off line. Drop the fader ticks and slider block.
5. A top scrim behind the HUD row (rgba(0,0,0,.34) fading to transparent over 170 px) for snow and bright scenes, and a 14 px pointer on the pin tag down to the flag.
6. The 20 stage px numeral floor (about 11 px on the owner's phone). Raise Clubhouse's 16 to 21 px Small step to at least 20 and check the board indices, the '/ 1 620' denominators and the '1-9' labels.
7. The rendering plan: Home flyover at about 30 fps, one frozen frame behind the other menus, so backdrop-filter blurs a still image. Plus the @supports fallback to opaque green at about 90%.
8. Favicon discipline from the Volt cup. Ship a separate 16 to 32 px mark: drop the shield outline and grips, thicken the brass X, enlarge the ivory ball, green rounded square. Keep the full crest for 180 and up.
9. Changing values roll vertically over 180 ms (strokes, coins, pin distance). Press is scale .96 in place of a 1 px translate.
10. A 'lost' state in the shop stat meters: kept green, gained brass, lost as a claret outline. Shop thumbnails are real studio renders framed so head and shaft sit fully inside the card, unlike Broadcast's cropped ones.

From Resort:
1. The handoff waits for a tap, with no 1.6 s auto-advance, because the device has to change hands. The order strip shows who has putted (score in its mark), who is up (ring and putter) and who waits (faded).
2. Home shows the party state live. With 2 to 4 players the brass carry-on row turns into a tee-off for the current course: hole 1, par and the overlapping numbered balls. The players row gets a visible count badge, so a saved count of 4 is never forgotten. Choosing a course from the board still opens the 4b party scorecard with #teeBtn.
3. The wordmark drawn as SVG paths under data-logo. Clubhouse's serif 'putt' would otherwise render as New York, Cambria or Charter depending on platform.
4. A .lowfx stage class that drops blur and raises glass opacity when frame time runs long, on top of the @supports fallback.
5. On the 4-player scorecard, wash the unique best score on each hole in pale brass. Add a rematch button (#cardRetry) beside map and next course.
6. One SVG sprite of <symbol>s with a tiny I(id) helper in game.js and shop.js, so the 2 px monoline family stays consistent everywhere.

Fixes Clubhouse must make anyway:
- Flatten the brass gradients on the large slabs to two stops.
- Fill the empty footers of locked board columns with a dimmed '/ 162'.
- Move PARTY_BALLS to #F3EEE0, #E0B44E, #C2434D, #3E6FA6.
- Lift #settings to stage level.
- Rewrite party-check: Options, #partyN2, a course, #teeBtn.
- Rewrite the Toybox rule in CLAUDE.md to the Clubhouse tokens.

## Accessibility and legibility specialist

Winner: **clubhouse**

### clubhouse: 83.5 (polish 8.5, coherence 9, legibility 8.5, multiplayer 8.5, icon 7.5, feasibility 7.5)

Strengths: Clubhouse looks the most professional and the most clearly golf for an older player. Green, ivory and brass with tabular serif numerals reads as a real club, not a toy. One glyph, the hole column (number on brass over par on green), runs through every screen: home carry-on, HUD bug, intro, done card, tee off and daily. The hole map is a real scorecard (two nines, par, best and stars rows, totals). Score marks are coded by shape as well as colour (claret circle under par, ink box over), so they survive colour blindness, and the frame 7 and 7b arithmetic is correct. Its HUD glass is the strongest on the 3D scene. I measured white on its plates at 8.6 to 11.7:1 over the bright sand course (5b), against 5.9:1 for Broadcast's neutral glass on snow. The swing pad stays findable on the owner's dark hole because of the brass ticks, putter head and green tint. The others are near invisible there. Every home row pairs its icon with live data (stars, ball dots, coins), which beats a bare icon when there are no words. Multiplayer is fully mocked (4b, 5b, 5c, 6b, 7b). Options holds a 1 to 4 segment with ball dots and the tee order. With players set, the map becomes a blank party scorecard with a row per ball, and the tee-off button carries the lineup. The honour tee and trophy replace the crowns. It is the cheapest to build: no new illustration art, a 10x3 board instead of world art, the map is a DOM table, and all ids are kept.

Weaknesses: The favicon is busy. At 32 px the thin shield outline and inner frame break up, leaving a green square, a gold X and a dot, and 16 px will be mush. Its smallest numeral is 16 stage px, about 9 px on a phone; that is too small. Green glass over green turf matches in hue, so plates separate less on a bright green hole (5a) than neutral glass would. The pass card auto-advances after 1.6 s even though the device is changing hands. The spec never says what Carry on does when players is 2 or more. The HUD bug's third segment (round to par, under a roughly 14 px card glyph) is ambiguous and only exists in a course run. The 'putt' wordmark is live serif text, so it changes across New York, Cambria and Charter. Paper grain and felt pinstripe could read as skeuomorphic if they are not kept faint. The p4 blue ball with a dark numeral is about 2.9:1 at small sizes. Locked world numerals are at 28%. The brass check as the sheet's close button mixes 'done' with 'close'.

### broadcast: 76.5 (polish 8, coherence 8.5, legibility 7.5, multiplayer 7, icon 9, feasibility 5.5)

Strengths: Broadcast has the cleanest, most modern HUD: one score bar, joined capsules (read with view, aim left with right) and the centre kept clear. The hole intro (5c) works like a real TV graphic. The course guide (frame 4) uses each hole's real holeMapSvg layout, and the course cards use real renders of each course. These are the most premium moments in any direction and they are truthful to the data. Its rules are strict and help legibility: one top scrim (rgba(0,0,0,.34), 170 px) behind the HUD for snow, a 20 stage px floor on every caption, a true minus sign and ±0, and a fallback glass of rgba(14,16,20,.9) where blur is missing. The 4-player scorecard as one broadcast row with a Σ drawn as a path is compact and correct. The icon is the best of the three at small sizes: a Volt ring and a white dot stay distinct at 32 and 16 px, and the dimples carry 'golf' at 180. The count persists in the save (progress.players), and changing it mid-round touches nothing.

Weaknesses: Neon lime Volt reads as sporty and youthful (fitness app), not as polish for older players. The done card breaks the spec's own 'two Volt things is wrong' rule: tile, three stars, two goals and the play button are all Volt. On the owner's dark hole the swing pad is almost invisible: I sampled the pad at (25,20,21) against the scene at (28,20,18), so only a hairline shows it. HUD context glyphs (par flag, putter) are about 14 px. The mulligan count is 18 px at 66% white. On snow the glass turns mid grey, so 66% secondary text drops to about 3:1. The birdie gull reads as a frown, and the swing-pad side row uses a vertical double arrow that does not say 'hand'. The home tiles are mostly empty, and the courses tile has no number. Shop thumbnails are cropped at the card edges. Multiplayer is the weakest of the three. Carry on, a course card or map play silently start a party from hole 1. Neither the party home nor the party map is mocked, so the main question (how does it start) is told in prose, not shown. It is the costliest to build: the 3D scene behind every menu (live for Home, a frozen frame elsewhere), cached per-course renders, many blurred panels on older iPads, and the worlds and world scenes merged into one.

### resort: 72.5 (polish 7.5, coherence 7.5, legibility 7, multiplayer 9, icon 6.5, feasibility 6)

Strengths: Resort is warm, calm and well crafted. Its multiplayer is the clearest of the three. Players is row one of the options drawer. Home's players tile shows a terra count badge, so a forgotten count of 4 is never hidden. The carry-on card itself becomes a tee-off card (hole 1 plus the lineup of discs), so it is obvious what Play does. The map shows a lineup pill and play 1. The handoff waits for a tap, which is right when a device changes hands, and shows the order row with each finished score in its mark. The scorecard adds a rematch with the same lineup. Its options use two-state segments (mute/sound, sun/moon, pad-left/pad-right) that show both states as icons. Without words that is clearer than a toggle that relies on the row icon. The 4-player card lights each hole's unique best. The wordmark is drawn as SVG paths, so it is identical on every platform. The .lowfx class (drop the blur and raise the alpha when frames run long) is a sound perf fallback. The hole intro plaque reads well on bright green.

Weaknesses: The pastel posters and arch cards lean casual (Alto or Apple Arcade), not professional. That is the opposite of the owner's 'for adults and older players' brief. The hole-map outlines are placeholders that repeat every nine holes (1 = 10, 2 = 11 and so on), not real data. In the frame 5 HUD the mulligan's '787' badge runs into the pin tag. ink-3 (#9A9C92, about 2.7:1 on card) carries meaningful data: to-par in the party standings (6b) and every '/54'. The party map (4b) fades all 17 holes so they look locked. The aim icons are faint, and the swing pad is near invisible on the dark hole (the same problem as Broadcast). The home tiles are bare icons with no data. At 32 px the icon collapses to a peach arch with the flag and ball gone, and it reads as 'sunset', not golf. At 180 the arch is clipped by the bottom edge. It is the most new art to build: 10 posters plus course-window variants, a second dusk theme for menus, and Avenir Next only on Apple devices.

### Ideas to graft onto the winner

Graft these onto Clubhouse.

From Broadcast:
(1) Draw each hole's real holeMapSvg layout, ink on paper, about 60 px, at the top of every hole column on the scorecard map. Draw the same layout in the tee-off button and in the intro lower third's minimap. This is truthful, wordless wayfinding, and it is the best idea in any direction.
(2) Add the top HUD scrim (linear-gradient rgba(0,0,0,.34) to transparent, 170 px), so the green glass also separates on bright green turf and snow.
(3) Use the opaque fallback, the green-900 at about 90% alpha that the Clubhouse risks already allow for, under @supports not (backdrop-filter). Use Broadcast's render policy: live at about 30 fps behind Home, one frozen frame behind the other menus, a still frame under reduced motion.
(4) Raise Clubhouse's minimum numeral from 16 to 20 stage px (about 11 px on a phone). Use Broadcast's caption floor for denominators, badges and the order balls.
(5) Use the swing-pad trail colours: ivory for the backswing, brass for the stroke, claret-300 when off line. Use joined capsules for read with view and aim left with right, to calm the left column.
(6) Use a single strong small-size mark, taken from Broadcast's icon discipline. Ship a separate favicon-32 and favicon-16 SVG: a filled brass shield on green, a thick crossed-putter X, the ivory ball, no inner frame, no dimples, no thin outline. Keep the full crest at 180 and 512.
(7) Persist progress.players, and let a count change apply only to the next round.

From Resort:
(8) Make the pass card wait for a tap (drop the 1.6 s auto-advance) and show the order row with each finished score in its mark.
(9) When players is 2 or more, turn Home's brass carry-on row into the tee-off row: hole 1 of the current course plus the overlapping numbered balls. Give the players row a count badge so a lingering 4 is never hidden. Party semantics are then visible where the player taps.
(10) Replace the sound and neon toggles with two-state segments (mute/sound, sun/moon) inside Clubhouse's ivory well, so both states show as icons.
(11) Add a rematch on the party scorecard (#cardRetry, same lineup) beside map and play again.
(12) Give each hole's unique best on the 4-player card a pale brass wash.
(13) Draw the serif 'putt' plus the crossed-putter X as SVG paths under data-logo, so the lockup is identical on Apple, Windows and Android.
(14) Add the .lowfx stage class that drops the blur when frame time runs long.
(15) Use a single SVG sprite with an I(id) helper for the monoline set.

Clubhouse fixes to make while grafting: define what Carry on does in party mode (item 9 covers it); hide the HUD's round-to-par segment outside course runs, or show the glyph larger; and use an ivory numeral on the blue p4 ball.

## The engineer who must build it in this codebase

Winner: **clubhouse**

### clubhouse: 83.5 (polish 9, coherence 9, legibility 8, multiplayer 8.5, icon 7.5, feasibility 7)

Strengths: Best fit for the brief: it looks like a real premium golf product for older players, not a restyled kids' game. The craft is the highest of the three. The hole map as a two-nine scorecard (frame 4) and the 10x3 tournament board (frame 3) are elegant, aligned and dense without clutter. Golf-literate score marks (claret circle under par, ink box over par, double for two or more) run through the map, the done card, the party leaderboard and both scorecards. One recurring glyph, the hole column (hole number on brass over par on green), ties the HUD bug, the intro lower third, the done card, the Home carry-on, the daily hole and the tee-off button together. The HUD on the owner's dark screenshot reads well: the brass hole tile pops, strokes have par pips, and round-to-par sits in the bug. Multiplayer is fully mocked (4b, 5b, 5c, 6b, 7b) and the honour tee idea is clever. Feasibility is the best of the three: the menus sit on opaque CSS felt and paper, so no 3D renders behind menus except the Home flyover. Shop thumbs stay studioShot on a light ground, close to today. #partyPick survives as the players block with .show semantics, so party-check line 23 still passes and only the start step moves to the new #teeBtn. Every frame has zero letters and no control under 88 px (verified).

Weaknesses: 1. The favicon is weak at 16 to 32 px: the shield outline and inner frame turn to mush, leaving a green square with a faint gold X. 2. The green-tinted smoked glass gives less separation over green turf than neutral smoke, and it has no top scrim for snow or sand. 3. The round-to-par segment uses a tiny table icon that nobody will decode. 4. The board's 17 to 21 px course labels and the map's 16 px stars shrink to 9 to 12 px on a phone (stage scale 0.56). 5. The wordmark is set in ui-serif, so it changes across New York, Cambria and Noto Serif, and Georgia's old-style figures are a fallback risk. 6. The shop cards are idealised vector putters; real studioShot renders will not look like the mockup. 7. Home 'carry on' is undefined when players is 2 or more (does it still show hole 7?). 8. Pass card auto-advances after 1.6 s even though the device has to change hands. 9. Paper grain, felt pinstripe and double rules risk looking fusty if overdone. 10. #settings must lift out of #worlds, #world must be kept and restyled for ui-check line 90 and extras-check, and CLAUDE.md's Toybox rule must be rewritten.

### broadcast: 81.2 (polish 8.5, coherence 9, legibility 8.5, multiplayer 7, icon 9, feasibility 6)

Strengths: The most modern, Apple-grade look. It uses neutral dark glass, heavy tabular SF numerals with weight contrast, and one disciplined accent (Volt), applied the same way on every screen. The neutral glass sits well over all ten world palettes, including candy and space. The HUD is the cleanest: one scorebug with a Volt hole tile, joined capsules for read+view and aim L+R, a slim swing pad, and a pin tag with a pointer caret. It adds a top scrim for snow. The hole map is the most informative of the three: real hole layouts from the game's own holeMapSvg, plus number, par, stars and best in its score mark. The course select uses real course renders. The hole intro graphic (frame 5c) is a strong broadcast moment. The icon is the best at small sizes: a Volt ring and a white dot are unmistakable in a tab strip at 16 and 32 px, and at 180 px it reads as a cup and ball. Every frame passes the zero-words check and has no control under 88 px (one 116x64 tap hint on the full-screen pass card).

Weaknesses: 1. Visible defects: in 7b the 4th leaderboard card runs under the Volt replay button, and in the shop the studio renders crop putter heads and shafts at the tile edges. 2. Players tied on 63 are ranked 2 and 3. 3. The Home 'Courses' tile has no numeral, only an icon and a progress strip. 4. The next-course button (play, anchor, three dots) is ambiguous. 5. On the bright snow scene (5b) the .62 glass goes muddy grey. 6. Volt reads 'fitness app' more than golf, and all world colour is stripped from the DOM. 7. The multiplayer flow has a contradiction: 'anything that starts play starts a party from hole 1', yet the Volt carry-on card still advertises hole 6. 8. The party hole map is never mocked, and the compatibility hack has partyN2 call startParty only when it comes from the map. 9. It is the most expensive to build. The look depends on 3D behind every menu (a freeze-frame per scene), needs per-course renders with caching, and merges #worlds and #world into one screen, which breaks the ui-check flow (worldGrid click expects currentScene 'world', and card next expects 'world'). 10. It adds holeMapSvg style arguments, re-renders the dark shop, and puts the most backdrop-filter surface over live WebGL.

### resort: 73.8 (polish 7.5, coherence 7.5, legibility 7.5, multiplayer 9, icon 7, feasibility 6)

Strengths: The multiplayer story is the most complete and the best thought through. Players come first in the options drawer, and Home shows a count badge. The carry-on card turns into a tee-off card with the player lineup when 2 or more players are set. The party map (4b) shows a lineup pill and play 1. The handoff card waits for a tap because the device must change hands, and it shows who has putted (with their mark), who is up and who waits. The scorecard has a rematch (#cardRetry) and lights the unique best on each hole. Keeping the #world scene keeps more of today's test flow. The wordmark is drawn as SVG paths, so it is identical on every platform. It adds a .lowfx no-blur fallback and merges the scoreboard into one plate to limit blur regions. The pro shop (frame 8) is clean and honest about real renders. The icon is a beautiful poster at 180 px.

Weaknesses: 1. It reads boutique and whimsical rather than professional: travel posters, arch windows, a notched ticket. 2. The sand-and-cream paper menus look like a refinement of today's cream toybox, not the overhaul the owner asked for. 3. Visible defects: the 787 mulligan badge collides with the pin tag on the owner's screenshot (frame 5), and the course numerals on the arch art in 3b are cream on peach and barely legible. 4. Under par is sage green, against golf's red-numbers convention. 5. In the party hole board the to-par values are small pale grey and there are no rank numerals. 6. The map's hole outlines are placeholders: holes 10 to 18 repeat 1 to 9, so the frame overstates what real data gives. 7. It needs a large new art budget: 10 poster illustrations in each cNN.look.js plus dusk and night window variants. 8. The menus need a second night-token palette. 9. #titleGo changes meaning, which breaks ui-check. 10. The icon loses the flag and ball at 32 px and is a warm blob at 16 px. 11. Avenir Next exists only on Apple devices.

### Ideas to graft onto the winner

Graft these onto Clubhouse, roughly in order of value:

1. FAVICON (from broadcast). Keep the shield crest for the 180, 192 and 512 home-screen sizes. Ship a separate small-size mark for icon.svg and the 16 to 32 px favicon: no shield outline and no inner frame, the crossed-putter X at about twice the stroke, a larger ivory ball, a solid green-900 field. This copies Broadcast's lesson: one bold shape plus a white dot. Check it next to the 180 in a tab strip at 16 px.

2. REAL HOLE LAYOUTS ON THE MAP (from broadcast and resort). Add a fourth 'shape' row to each hole column of the scorecard map. It is drawn by holeMapSvg with a new style argument (brass lines on paper, a claret flag), from the same data as #holeBannerMap. Do not hand-draw it. Reuse the same drawing in the Home carry-on row and the daily lower third.

3. HUD LEGIBILITY (from broadcast):
   a) a top scrim on #hole (linear-gradient(rgba(0,0,0,.34), transparent), 170 px) so plates hold on snow and sand;
   b) neutral-leaning smoke glass (green-950 at about .72) instead of a green tint that blends into turf;
   c) a 14 px pointer caret under #pinTag pointing at the flag;
   d) joined capsules for #readBtn + #viewBtn and #aimL + #aimR, split by a hairline, to cut the five separate left-column plates;
   e) replace the cryptic table icon in the bug's round-to-par segment with Broadcast's Σ glyph (also use Σ for the total column header);
   f) a rule that no numeral is under 20 stage px (Broadcast's), which fixes the 16 to 17 px board labels and stars on phones.

4. MULTIPLAYER (from resort):
   a) when players is 2 or more, the Home carry-on row (#titleGo) becomes a tee-off row: the course medal, hole 1, and the overlapping numbered balls; it calls startParty(n, course);
   b) #partyPass waits for a tap (drop the 1.6 s auto-advance) and shows the order strip: who has putted with their score mark, who is up with a putter glyph, who waits faded;
   c) the 4-player scorecard lights the unique best on each hole in a pale brass wash;
   d) show rank numerals and tied ranks as equal (avoid Broadcast's 63/63 ranked 2 and 3).

5. WORDMARK AS PATHS (from resort). Draw 'putt' plus the crossed-putter X as SVG paths under [data-logo], so the lockup is identical on iOS, Windows and Android. This also removes the Georgia old-style figure risk from the logo. Keep ui-serif for numerals only.

6. PERFORMANCE FALLBACKS (from resort and broadcast):
   - @supports not (backdrop-filter: blur(1px)) and a .lowfx stage class (set when frame time runs long) that drop the blur and raise glass alpha to about .85;
   - cap the blur at 14 to 16 px and keep the bug as one plate;
   - render the Home flyover at about 30 fps and hold one still frame under prefers-reduced-motion;
   - re-run perf-check.

7. SHOP HONESTY (from broadcast and resort). Mock and build the rack with real studioShot renders and an explicit bg argument (ivory #F5F0E1 for cards, green plinth for #shopView), and invalidate cached thumbs. Frame them so heads and shafts never touch the card edge (Broadcast's cropping is the cautionary example).

8. SCORE MARKS (from broadcast). Add a distinct ace mark (a filled brass disc with a green-900 numeral) so a hole-in-one stands apart from a birdie circle. Use a true U+2212 minus and keep ±0.

Keep Clubhouse's own test-friendly choices:
- #partyBtn on Home opening Options with #partyPick (.show) as the players block, so party-check changes only its last step (tap partyN2, then #teeBtn);
- keep #world restyled as three course plaques, for ui-check line 90 and extras-check;
- keep #profiles as the first-run scene for save-check.

Do not graft Broadcast's live 3D behind every menu, or its merged worlds/world screen. Both cost the most and break the most tests for little gain over opaque felt.
