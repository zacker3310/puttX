# Real mini golf for PuttX: rules, course systems, obstacles, materials and customs

**Scope.** This is a catalogue of real-world mini golf, putt-putt, crazy golf, adventure golf and minigolf sport features that PuttX could implement. Each entry gives what it is, the source, how it fits PuttX with no words on screen and no fail states, the sim impact, and the effort.

**Method.** I read the primary rulebooks: the WMF international sport rules 2.3 (Dutch translation, 2025), the WMF system rules for each lane system (German DMV versions dated 01/2026, the English 2014 miniaturegolf text and the Dutch 2018 concrete text), the PPA 2024 abridged rule book, and the BMGA 2026 competition rules and equipment guide. I also read posted rules from public courses, builder and supplier catalogues, coverage of venues, and physics demonstrations. Translations from German and Dutch are mine. **Derived** marks my own arithmetic from a cited number. **Inference** marks a design suggestion with no source behind it.

**Legend.**
- Sim impact:
  - **none**: render, UI, audio or save only.
  - **new deterministic element**: new data, a rule or an input that the sim, replays, shot codes, ghosts and the solver must all reproduce. Existing motion does not change.
  - **changes physics**: alters how the ball moves today, so holes need re-solving.
- Effort: S = days, M = 1 to 2 weeks, L = more.
- **TOP** marks the ten items I rate highest for realism and premium feel.

**Not repeated from docs/RESEARCH.md.** That file already covers ghosts, the shot readout, spin, three stars, lost balls, night remixes, bonus targets, the slope read, the daily hole, the ace ladder, hot seat, power-ups, mulligans, the gauntlet, secret routes, tap gadgets, per-course physics twists, practice, near-miss juice and share codes. It also has the volcano, multi-cup, windmill, bank-shot, punchbowl and loop hole patterns. Where an item below touches one of those, it says what is new.

---

## The ten highest-value items

| Rank | Item | IDs | Why it matters |
|---|---|---|---|
| 1 | Real turf and greens: fibre, nap sheen, seams, wear, fringe and rough collars, with green speed as support | M1, M3 (M2 supports) | This is the owner's "real greens" ask. Most of the surface is turf, so this is the largest visual lever. |
| 2 | Real course hardware: cups with metal rims, numbered flags, rubber tee mats with a tee spot, ball-shaped hole markers, tee signs with number, par and a layout picture | M9, M10, M11, M12 | These are what make a course read as real mini golf at a glance, and all of it is numerals and symbols. |
| 3 | Border materials matched in look, bounce and sound: aluminium bumpboards, steel rails, timber sleepers, brick, fibreglass rock | M5, A4 | Every hole has borders. Matching each material's look and sound sells it. |
| 4 | Landscaping, water and lighting: brick paths, rockwork, palms, waterfalls, streams, pole lights at dusk | M6, M7, M8 | This is what separates a premium adventure course from a bare lane. |
| 5 | Relief from walls and obstacles: the real 20 cm rule, with the line-of-sight limit | R2 | It is a real rule, it fixes the ugliest lie in the game, and it can only help the player. |
| 6 | Real water and out-of-bounds relief: drop where the ball went in or out, or replay | R3, R4 | Kinder and more realistic than always returning to the last spot. |
| 7 | A paper scorecard: holes 1 to 9 and 10 to 18 subtotals, circles and squares, struck-out mulligans | S1, S2, S4 | The scorecard is the most recognisable mini golf object, and its notation is already wordless. |
| 8 | Last-hole traditions: hole 18 swallows the ball, a bonus 19th target, ace tickets, the bell | O23, G10, G11, A9 | These are the rituals players remember. All are wordless and none can fail. |
| 9 | Material sound pack: putter click by ball and putter, metal-cup ping vs plastic plop, roll texture by surface, water ambience | A1 to A7 | Sound gives physical feel more cheaply than anything else. |
| 10 | Standard obstacle pack with real geometry and correct physics: loop (2.7R), jump into a net, volcano craters, hole in a slope, turntable, pendulum, plus a classic Putt-Putt course and a WMF sport course | O2, O4, O14, O18, O19, O22, C1, C2 | It brings in the real sport's canon with real numbers, and it fixes the loop threshold in RESEARCH.md. |

**Quick win just outside the ten:** tee placement anywhere on the mat (R1).

---

## 1. Rules and customs

| ID | Feature | What real courses do | Fit in PuttX (no words, no fail) | Sim | Effort |
|---|---|---|---|---|---|
| R1 | Tee anywhere on the mat | The first stroke is placed on and played from the tee mat ([PPA][ppa], playing rule 1). Every WMF lane has a marked tee area ([WMF 2.5][wmf]). In adventure golf, a ball that rolls back behind the tee line may be placed anywhere in the tee area ([NormAdv 8][s14]). Concrete tee mark: a 30 cm circle centred between the borders, with an 8 cm centre spot 40 cm from the start of the lane ([NormBeton 5][s11]). Felt tee plate: 1.30 to 1.50 m long and 0.20 m wide ([NormFilz 1][s13]). | Before the first putt, the player drags the ball along a drawn rubber mat. The mat outline is the only cue. | New deterministic element. The tee offset becomes a stroke input that shot codes, ghosts and `sol` carry. `holes-check` must test the 4% ace gate across the whole mat. | S-M |
| R2 **TOP** | Relief from walls and obstacles | **WMF:** a ball near the border may be placed by hand at 90 degrees to it, up to 20 cm away. Near an obstacle the limit is 20 cm on Eternit ("kort" in the Dutch text), 50 cm on felt and 30 cm on MOS ([WMF 8.8][wmf]). Relief lines are painted 20 cm from the border in every target circle ([NormMiniatur 7][s12], [NormBeton 6][s11], [NormFilz 9][s13]).<br>**BMGA:** 20 cm from a boundary, 30 cm from an obstacle, at 90 degrees, and the move may not create a line of sight to the hole that did not exist ([BMGA 3.1.13][bmga]).<br>**Adventure:** with no clear line, the ball goes on the line from the hole centre through the ball ([NormAdv 10(3)][s14]).<br>**PPA:** perpendicular from a bumpboard up to the prescribed distance. From an obstacle the ball never moves toward the cup, and it is mirrored if needed ([PPA][ppa], rule interpretations 1 and 2).<br>**Casual courses:** one putter-head length, free ([Rosfjord][rosf]), or 20 cm ([NZMGF][nz]). | When the ball stops against a wall, a dotted relief line and a hollow ball appear 20 cm out (scaled). One tap takes the relief. Today the putter hides when there is no room; relief replaces that awkward lie with the real rule. It only ever helps the player. | New deterministic element (a placement between strokes, recorded in shot codes and ghosts) | S-M |
| R3 **TOP** | Water hazard relief | **PPA:** the ball is placed at the point where it entered the water, away from the cup, plus one stroke ([PPA][ppa], interpretation 8).<br>**WMF adventure:** water, gravel and sand are "risk areas". The player either plays on from inside, or replays from the spot of the last stroke ([NormAdv 11][s14]).<br>"Ball in water" signs are a stock course item ([Wittek signs][wit-signs]). | After a splash, two icon buttons appear: a ball on the bank where it went in, or a rewind arrow to the last spot. Both add the stroke, as today. | New deterministic element (the choice and the drop point) | S |
| R4 **TOP** | Out of bounds | **PPA:**<br>- The ball is placed where it left, plus one stroke.<br>- A ball that leaves and comes back by itself plays on.<br>- A ball out of the open end of a hole goes back to the tee mat with no penalty ([PPA][ppa], interpretations 4 and 10).<br>**WMF:** after the border line, a ball that leaves the lane is placed at its exit point ([WMF 8.8][wmf]). The BMGA adds no penalty ([BMGA 3.1.14][bmga]).<br>**Adventure golf:** there is never a penalty for leaving the lane, but a lane rule can force a replay where leaving would be a shortcut ([NormAdv 9, 10(5)][s14]). Felt lane 4 has exactly that anti-exploit rule ([NormFilz][s13]).<br>**Casual courses:** exit point plus one ([Rosfjord][rosf]); exit point with no penalty ([NZMGF][nz]). | A per-hole `exit: 'point' \| 'replay'` flag. The default is point; holes that are prone to shortcuts keep replay. There is no new fail state. | New deterministic element | S |
| R5 | Border line | A red line marks how far the tee shot must travel. A ball that fails to cross it is played again from the tee. A ball that crosses it and then rolls back is stopped, and play continues from where it crossed ([WMF 2.7 and 8.8][wmf]). | The rule has two halves:<br>- The kind half fits the default game: a ball rolling back down an uphill lane stops at the red line instead of returning to the tee.<br>- The strict half (replay from the tee) belongs only in an opt-in sport mode.<br>The line itself is a symbol. | New deterministic element (a segment that stops a ball crossing it backwards) | S-M |
| R6 | Stroke cap | **WMF:** after 6 strokes the lane scores 7 ([WMF 9.1][wmf], [BMGA 3.3.1][bmga]).<br>**Casual courses:** at most 7 ([Rosfjord][rosf], [NZMGF][nz]), or 6 per hole ([Fairfax][fairfax]). A "6 Stroke Maximum" sign is a stock item ([Wittek signs][wit-signs]). | Keep double par as the default. Sport mode uses 6-then-7, shown as a "7" with a stop glyph on the tee sign. | none | S |
| R7 | Holed means at rest in the cup | A ball that drops in and bounces out is not holed ([BMGA 3.1.17][bmga]). A ball is holed when it rests in the target and cannot leave by itself ([WMF 8.13][wmf]). | This matches PuttX's hop. It is a check for the physics overhaul's 3D rim. | changes physics (only through the rim work) | - |
| R8 | The 10-second lip hang | Rules of Golf 13.3: after a reasonable time to reach the hole, a ball overhanging the lip has 10 more seconds to drop. The rule was added in 1964 ([USGA rule 13][usga13], [NCGA][ncga]). | A ball balanced on the lip gets a short, fixed wait while the sim keeps running, and either drops or stays. The camera holds its breath; that decoration honours reduced motion. | changes physics (lip equilibrium in the new rim model) | S-M |
| R9 | Honours and playing order | **PPA:** the first-listed player has the honour on hole 1. After that, the winner of the previous hole putts first, and each player putts out before the next starts ([PPA][ppa], playing rules 2 and 3).<br>**Casual courses:** the youngest tees off first, then the lowest score on the last hole ([Tricycle][tricycle]).<br>**BMGA:** the order holds for the whole round ([BMGA 3.2.7][bmga]). | What is new beyond RESEARCH #11: the crown ball tees off first on the next hole. There is no age data, so use profile order on hole 1. | none | S |
| R10 | One practice putt | One practice putt on the first hole of a round, not counted ([BMGA 3.1.9][bmga]). Otherwise WMF bans practice strokes and test rolls during play ([WMF 8.19][wmf]). | One free, dashed-outline ball on hole 1 of a course run. It resets, and nothing is saved. | none (re-runs the sim and discards the result) | S |
| R11 | Match play, concessions, sudden death | **PPA:** in medal play every putt is holed; in match play putts may be conceded. A tied match goes to sudden death ([PPA][ppa], rules 3 and 16).<br>**BMGA:** playoffs start at hole 1 ([BMGA 3.3.3][bmga]). | Match play against a friend or a ghost:<br>- Holes won show as a numeral with an arrow (for example +2).<br>- A tap-in within one putter length can be conceded with a thumbs-up icon.<br>- A tie plays one sudden-death hole. | none | S |
| R12 | Doubles and teams | Doubles play alternate strokes, and the order swaps each hole ([BMGA 5.2.2-5.2.3][bmga]). A team match counts the best three of four scores ([BMGA 5.3.6][bmga]). | Two-colour teams in hot seat. The ball colour shows whose turn it is. | none | S |
| R13 | Shotgun start | Groups can start on any hole and wrap around in order ([BMGA 3.2.1][bmga]). | Start a course run from any open hole on the map, with the card wrapping around. | none | S |
| R14 | Group size and pace | **Casual courses:** 4 per group, 6 strokes, slower groups let faster groups play through ([Fairfax][fairfax]); up to 5 per group ([Rosfjord][rosf]). A hole is played only after the group ahead has left it ([BMGA 3.2.3][bmga]).<br>**Shot clocks:** PPA allows 20 s to tee off ([PPA][ppa], rule 10), WMF 70 s for the first stroke and 60 s for each later one ([WMF 11.3][wmf]), BMGA 45 s ([BMGA 3.1.6][bmga]). | Cap hot seat at 4. **Reject shot clocks** for this audience: they add pressure and no skill. G6 borrows the "group ahead" custom as ambience. | none | - |
| R15 | Mark and lift | A coin behind the ball, in line with the cup, marks it ([PPA][ppa], rule 8). WMF requires a mark before cleaning ([WMF 8.14][wmf]). | Only in the all-balls round (G1): a ball in someone's line is lifted and shown as a coin. | New deterministic element (only in G1) | S |

---

## 2. Course types and standard lanes

### 2.1 Systems

| ID | Course type | Facts | Fit in PuttX | Sim | Effort |
|---|---|---|---|---|---|
| C1 **TOP** (part of 10) | Putt-Putt classic | Putt-Putt was founded in 1954 in Fayetteville, NC by Don Clayton as "no-frills, all-skills" ([Wikipedia][wiki-pp]):<br>- **Surface:** smooth concrete covered with short-nap outdoor carpet.<br>- **Borders:** 2x4 inch extruded aluminium, built for accurate banking. The PPA calls them "bumpboards" ([PPA][ppa]).<br>- **Holes:** every hole is par 2 and an ace is always possible, drawn from more than 100 copyrighted designs.<br>- **Obstacles:** only small hills, metal blockers, pipes and, rarely, water. Decorations never come into play. | A bonus "Classic" course: 18 par-2 bank-shot holes on green carpet with silver rails, and props only off the lanes. An ace being possible is not the same as likely, so the 4% gate still holds. | none (unless rails get their own restitution, M5) | M-L |
| C2 **TOP** (part of 10) | WMF Eternit ("miniaturegolf") | Lanes are 6.25 m x 0.90 m, with a 1.40 m target circle ([NormMiniatur][s12]).<br>A course uses 18 of the 30 standard lanes (28 in the 2014 text), in any order, within +/-2%, and some lanes may be mirrored ([NormMiniatur][s12], [WMF 2.5 English][wmf25en]).<br>The material is "a thin concrete material" ([Ham and Egger][hae]), also called Eternite or Europabana ([Wikipedia][wiki-mg]).<br>Ascona (1954) was built to Paul Bongni's norms. The world record is 18 strokes for 18 holes, and over a thousand players have reached it on Eternit ([Wikipedia][wiki-mg]). | A "Sport" course built from the exact standard lanes (2.2), with the red border line and white 20 cm relief lines as symbols, and sport scoring (R6). A round of 18 is the perfect score. | New deterministic elements (net target, loop: section 3) | L |
| C3 | WMF concrete (Beton) | Lanes are 12.00 m x 1.25 m, with a 2.50 m target circle. Every course has the same 18 lanes in the same order ([NormBeton][s11]). The base is concrete with metal rail borders ([Ham and Egger][hae]). The lane names are in 2.2. | A long-lag course on long, straight-railed lanes. | none | L |
| C4 | WMF felt (Filz, Swedish felt) | **Lanes:** 6 to 16 m (18 m with a target field), 0.90 m wide, borders at most 8 cm wide, slopes 0.30 to 1.60 m high. A course uses 18 of 32 lanes ([NormFilz][s13]).<br>**Targets and tee:** the target field is 1.80 or 2.40 m, the hole is 10 cm and sits at least 30 cm from any border, gate obstacles are 5 to 9 cm high, and the tee plate is 1.30-1.50 x 0.20 m ([NormFilz][s13]).<br>**History:** the felt sits on a wooden base ([Ham and Egger][hae]). It has been common in Scandinavia and the UK since the mid-1960s and plays in the wet ([Wikipedia][wiki-mg]). | Long, gated lanes up big slopes. "Felt" is already PuttX's default surface name. | none | L |
| C5 | WMF adventure / MOS | **Lanes:** 3 to 40 m long and at least 1.00 m wide, with a 0.10 to 0.12 m hole. The tee area must be marked but can be any size ([NormAdv 1-2][s14]).<br>**Borders and obstacles:** borders must be durable, smooth and predictable, and obstacles must be fixed with no moving parts. Risk areas (water, gravel, sand) may move, as flowing water does. Borders can be raised or flat "golf rough" ([NormAdv 5-9][s14]).<br>**Relief:** 20 cm from a border and 30 cm from an obstacle, with no penalty ever for leaving the lane ([NormAdv 10][s14]).<br>**Scope:** MOS covers adventure, crazy and golf-style courses ([Ham and Egger][hae]). | PuttX's themed courses are already MOS-like. Adopt NormAdv's fairness rules as house rules: predictable borders, relief, and no penalty for leaving the lane where that cannot be exploited. | rule elements per R2 to R4 | - |
| C6 | Crazy golf (seaside) | "Crazy golf" is mainly a UK term; the US equivalent is "goofy golf" ([Ham and Egger][hae]). The World Crazy Golf Championships have been held at Hastings since 2003, with a windmill, waterwheel, obelisk, lighthouse, ramps and bunkers ([Wikipedia WCGC][wiki-wcgc]). Moving obstacles belong to crazy golf; WMF bans moving parts on the ball's correct path ([WMF 2.6][wmf]). | A seaside-pier look for a course: lighthouse, waterwheel, bathing huts. | none | M (look) |
| C7 | Canadian mini-putt | Standardised, named par-2 holes ([Wikipedia Défi mini-putt][wiki-defi]):<br>- Le billard: a bank-shot rectangle.<br>- La rivière: a ramp over a river.<br>- Le chameau: two steep hills.<br>- Les laurentides: three steep hills.<br>- L'équerre: a curved metal bracket into the hole.<br>- La soucoupe: a circular saucer.<br>- Les sentinelles: two upright pipes guarding the hole.<br>- L'escalier: a concrete staircase.<br>- Le plateau: an incline about 2 ft high. | A compact bonus nine. | none | M |
| C8 | Putting course | **History:** Old Tom Morris's Himalayas at St Andrews (1867) and Thistle Dhu at Pinehurst (1916). Modern putting courses have 18 or 36 holes of 25 to 80 ft ([Wikipedia][wiki-mg]).<br>**PopStroke:** synthetic turf with undulations, fairways, bunkers and rough, at real green speeds. Its Red course has strong contours and hard pins; its Black course is softer ([InsideHook][insidehook], [Golf Monthly][golfmonthly]). | New beyond RESEARCH (long greens, punchbowl, remix): holes with no walls, bounded by rough (M3), as a whole putting-course world. | changes physics only through the rough surface (M3) | M-L |

### 2.2 Standard lane catalogue (WMF), with geometry

**Eternit / miniaturegolf.**
- **Sources:** English names from the [WMF 2.5 English text][wmf25en]; lanes 29 and 30, and the 2026 numbers, from [NormMiniatur 2026][s12].
- **Course:** 18 of the 30 lanes. Each lane is 6.25 x 0.90 m with a 1.40 m target circle.

1. **Pyramids.** Relief 20 cm radially from the pyramid apex.
2. **Loop ("Salto").** It starts 200 to 300 cm from the lane start, with a passage 15 to 22 cm wide. The loop is passed if the ball crosses the entrance and exit correctly, even if it jumps the loop itself.
3. **Sloped circle with kidney.** Go through the tunnel as a straight stroke, or around it. The passage is 15 to 22 cm in the middle and 8 to 13 cm at the border.
4. **Double waves.** The border line is just after the second crest.
5. **Flat loop.** A horizontal loop channel. The ball must run the whole channel without jumping its raised side rolls.
6. **Bridge.** The border line is just after the crest.
7. **Jump with net.** A ski jump launches the ball into a net ring 50 cm across. The ring's lower edge is 70 to 80 cm above the tee, and the obstacle ends 250 cm from the start. The target is the inside of the net.
8. **Straight lane with target window.** A window 10 to 15 cm wide, ending 500 cm from the start.
9. **Pipe.** Diameter 4.5 to 6.5 cm, ending 500 cm from the start. The ball must go through the pipe only.
10. **Sticks.** Pass between the sticks, not over them.
11. **Labyrinth.** Four entrances 12 to 20 cm wide. Only the second from the right leads to the target.
12. **Truncated cones.**
13. **Double wedges.** A bowl entrance 12 to 25 cm wide. The target is inside the bowl, which may hold sand or gravel.
14. **Passages.** Each passage has its own border line after its last crest.
15. **Middle hill.** A ball at rest on the hill may be moved 20 cm back, parallel to the border.
16. **Volcano.** 15 to 20 cm wide, with a slot 7.5 to 9.5 cm long. The target is the hole, and in one version also the whole plateau.
17. **"V" obstacle.** The target zone is inside the V.
18. **Angle.** The obstacle is 40 to 60 cm long.
19. **Lightning.**
20. **Straight lane.** Optional arrow variant: 120 to 125 x 125 to 140 cm.
21. **Sloped circle.**
22. **Plateau.** The ramp entrance is 12 to 25 cm wide, the plateau's rear edge is 0.8 to 1.7 cm high, and the plateau centre is 500 to 600 cm from the start.
23. **Wedge**, with or without a target window. The window is 10 to 25 cm.
24. **Sloped lane.**
25. **Sloped circle with V.**
26. **Straight lane with jump.** The border line is at the end of the ramp.
27. **Rhombus.** Side passages 10 to 15 cm.
28. **Straight lane with target hill.** The hill is 5 to 15 cm high and 40 to 60 cm across.
29. **Half angle.** The lane bends 20 to 30 degrees. The long border is 500 cm, the stick is 20 to 40 cm and the angle iron is 50 to 100 cm.
30. **Celle sticks.** The first obstacle has three gates 8 to 12 cm wide, 200 to 240 cm from the start. The second has two gates 15 to 25 cm wide, at 460 to 480 cm.

**Concrete.**
- **Sources:** Dutch names from the [WMF 2.4 Dutch text][wmf24nl]; English renderings are mine. Rules from [NormBeton][s11].
- **Course:** the same 18 lanes, always in this order.

1. **Straight lane.** The border line is 50 cm from the tee centre.
2. **Four stones.** A 7 cm relief zone around each stone.
3. **Rabbit hole.**
4. **Castle.**
5. **Cycle track** (a banked turn). Relief 20 cm from the slope.
6. **Straight jump.** The ball must fly a bunker; touching the bunker replays the stroke.
7. **Longshot.** Lofted clubs are allowed and the ball may be teed up. The course is defined by boundary posts on a hill about 50 cm high, with protective nets behind the target circle.
8. **Pudding** (a cone). Relief 20 cm from its base.
9. **Open elbow.**
10. **Three hills.** The ball must touch the lane between the hills.
11. **Banana.**
12. **Beam.**
13. **Swing.**
14. **Zigzag.**
15. **Chicken run.** A plateau with a tunnel. There is a secondary tee 30 cm past the tunnel, used when the ball crosses the structure the wrong way. A ball resting on the plateau may also be played from that tee.
16. **Elbow.**
17. **Narrowing.**
18. **Run-up.** An incline into a collecting box. A ball that rolls back is replayed from the tee.

**Felt.**
- **Sources:** names follow the [OSM proposal][osm]; rules from [NormFilz][s13].
- **Course:** 18 of these 32 lanes. Lane lengths are 6 to 18 m.

1. **Single gate.**
2. **Double gate.**
3. **Boxes.** 3 to 5 boxes, evenly spaced, with 50 cm relief.
4. **German ledge.** A target incline 20 to 60 cm high and at least 100 cm long. Leaving over the border repeats the stroke.
5. **Optical illusion.** Always four obstacles. The first is 13 to 25 cm wide.
6. **Middle hole in slope, or money box.** An incline of at least 200 cm, with an obstacle 0 to 2 cm behind the hole.
7. **Mailbox.** A slot 4.5 to 9 cm wide and side gates 15 to 20 cm. The player chooses between two targets: the ace box, or a side gate and the slot.
8. **Gentleman.** A ball that stops on top of the inner arc goes back to the tee.
9. **Örkelljunga.** A bridge 10 to 35 cm high.
10. **Angle.**
11. **Special angle.** 90 and 45 degree corners.
12. **Middle hill.** 30 to 60 cm high and 100 to 200 cm long.
13. **Side gates.**
14. **Cradle.**
15. **Fishbone.** 3 to 5 obstacles, with at least 150 cm between tips.
16. **Channel.** At least 50 cm long.
17. **Side hole in slope.**
18. **Bridge.** 80 to 250 cm long and 10 to 30 cm high, with a roof or gate at the border line.
19. **Hill with gate.**
20. **Lightning.** Passage 13 to 18 cm.
21. **Ditch.** An incline 30 to 60 cm high. Touching the ditch replays the stroke.
22. **Inclined hill with gate.** The lane bends 15 to 30 degrees, and the hill's two sides differ in height by 5 to 20 cm.
23. **Ace box.** A ball that fails to stay in the box goes back to the tee.
24. **Swedish ledge.** A step 10 to 20 cm high.
25. **Cross.** Wings 150 to 300 cm long.
26. **Möllberg cradle.** A trough at least 15 cm long. The rear edge is at least 1 cm higher than the front, and the lowest point at least 2 cm below the front edge.
27. **Vertical hole in slope.**
28. **Horseshoe.**
29. **Twin gates.**
30. **Stationary scales.**
31. **Middle green.**
32. **Passage.**

**Lane markings** ([WMF 2.2][wmf]). A red border line, black dashed helping lines and black relief lines. All are symbols, so they suit a game with no words and explain relief visually.

---

## 3. Obstacles

How each works physically, and how PuttX's primitives can model it. PuttX's primitives are the heightfield (tiers, ramps, bumps, drains), walls, posts, the spin/slide/gate movers, tubes, surface and push zones, and crest launch with cliff faces.

| ID | Obstacle | How it works (sources) | Model in PuttX, and fit | Sim | Effort |
|---|---|---|---|---|---|
| O1 | Windmill and waterwheel | **Windmill:** blades turn across a mouth in the base, so timing beats power. It is a classic crazy-golf hazard ([Wikipedia][wiki-mg]). Holey Moley's "Dutch Courage" sends players through a small windmill between two big fast ones, toward a hole on a slope ([Wikipedia Holey Moley][wiki-hm]).<br>**Waterwheel:** listed at Hastings ([Wikipedia WCGC][wiki-wcgc]). | Spin movers exist. What is new:<br>- A real windmill house with the mouth under the blades.<br>- An exit chute to a lower green (the "pipe shot", O13).<br>- A waterwheel as a spin mover with paddles over a channel. | none | S |
| O2 **TOP** (10) | Vertical loop | **Spec:** Eternit lane 2 has a passage 15 to 22 cm wide, starting 200 to 300 cm along ([NormMiniatur][s12]).<br>**Physics:** a ball rolling without slipping needs to start 2.7R above the bottom of the loop, against 2.5R for a sliding block. Rotation holds 2/7 of the kinetic energy ([UMD demo][umd], [MTU demo][mtu], [UCI demo][uci], [Nagoya science museum][nagoya]).<br>**Derived:** the entry speed must satisfy v² ≥ (27/7) g (R - r), plus rolling losses. This is lower than the √(5gR) in RESEARCH.md pattern 6, which is the sliding-block value. For R = 0.15 m, v ≥ 2.4 m/s, inside PuttX's 4.27 m/s full putt.<br>**Build:** a real course can be made from two buckets ([This Old House][toh]). | **Model:** a heightfield cannot overhang, so add a scripted "loop" element:<br>- 1D motion along the arc, with g sin(φ) and rolling resistance.<br>- When the normal force (v²/R' - g cos φ) drops below zero, the ball goes ballistic and falls back to the entry ramp.<br>**Fit:** a slow ball simply rolls back out. That is not a fail. | New deterministic element | M |
| O3 | Flat loop and banked turn | A horizontal loop channel with raised side rolls the ball must not jump (Eternit lane 5, [NormMiniatur][s12]). Concrete lane 5 is a "cycle track" banked turn with relief 20 cm from the slope ([WMF 2.4 NL][wmf24nl], [NormBeton][s11]). Designers recommend "curves, loops, and banked corners" ([Mini Golf Creations][mgc]). | A "bank" heightfield primitive that tilts the cross-section along a polyline (inference), plus curved walls. Today ramps are axis-aligned and tiers are planar, so a curved bank needs a new height function. The physics is unchanged. | New deterministic element (geometry only) | M |
| O4 **TOP** (10) | Volcano and crater holes | **Spec:** Eternit lane 16 is 15 to 20 cm wide with a 7.5 to 9.5 cm slot ([NormMiniatur][s12]).<br>**Holey Moley:** on "Mt. Holey Moley", players putt up a volcano into one of several crevasse holes, and the smaller holes give better positions ([Wikipedia Holey Moley][wiki-hm]).<br>**Derived:** climbing a height h needs v² ≥ (10/7) g h, by the same 2/7 rotational share as O2. | New beyond RESEARCH pattern 1: several crater mouths of different sizes. Each is a tube to a different lower-green exit, so smaller mouths mean better lies. A ball that is too fast overflies the crater and rolls down the far side. Neither case is a fail. | none (bumps, drains and tubes exist) | S-M |
| O5 | Pyramids and stones | **Pyramids:** Eternit lane 1, with relief 20 cm radially from the apex ([NormMiniatur][s12]).<br>**Stones:** concrete "Four stones", with a 7 cm relief zone ([NormBeton][s11]). Loose stones have their positions painted on the lane ([NormBeton][s11]). | Square posts made from four wall segments, or steep heightfield pyramids whose faces act as cliffs. | none | S |
| O6 | Hills and waves | **Shapes:** double waves, truncated cones and middle hill on Eternit ([NormMiniatur][s12]); three hills on concrete ([NormBeton][s11]); middle hill 30 to 60 cm high on felt ([NormFilz][s13]).<br>**Rules:** on concrete lane 10 the ball must touch the lane between the hills ([NormBeton][s11]). The Canadian holes Le chameau and Les laurentides use two and three steep hills ([Défi mini-putt][wiki-defi]). | Bumps and ramps exist. A per-hole "no fly" check could turn an airborne pass over a valley into a replay, but only in sport mode. | none (or a new deterministic rule in sport mode) | S |
| O7 | Bridges | **Felt:** a bridge 80 to 250 cm long and 10 to 30 cm high, with a roof or gate at the border line ([NormFilz][s13]); Örkelljunga, 10 to 35 cm high ([NormFilz][s13]).<br>**Eternit:** a bridge with its border line after the crest ([NormMiniatur][s12]).<br>**Adventure courses:** bridges over streams are common ([Harris][harris-feat]). | A narrow raised tier with ramps, over water or drop-offs. A path passing under a bridge needs two levels, which a tube can stand in for. | none | S-M |
| O8 | Pipes, tunnels and hollow logs | **Spec:** the Eternit pipe is 4.5 to 6.5 cm in diameter and is the only way through ([NormMiniatur][s12]). A ball that stops inside a pipe is placed 20 cm from its exit ([BMGA 3.1.16][bmga]).<br>**History:** Tom Thumb courses had hollow logs ([Time archive][time], [Clifton Hill][clifton]). | Tubes exist. What is new: transparent pipe segments that show the ball rolling inside (render only), and a hollow-log mesh. | none | S |
| O9 | Castle and drawbridge | **Castles:** a concrete lane is named "Castle" ([WMF 2.4 NL][wmf24nl]). Lomma revived animated trick hazards in 1955 ([Wikipedia][wiki-mg]).<br>**Drawbridges:** Holey Moley's "Dragon's Breath" is putted under a drawbridge ([Wikipedia Holey Moley][wiki-hm]). A maker's course raises and lowers a drawbridge over a lake at set intervals ([Fab Academy][fab]). A 1978 patent covers a pivoting mini golf obstacle ([US4148490A][pat-pivot]). | Pirate Cove's drawbridges are slide-in gates today (c05.sim.js). New: a real drawbridge whose angle is a deterministic function of t:<br>- When down, it is a ramp floor over the moat.<br>- When up, it is a wall face.<br>A ball that lands in the moat gets the R3 relief. | New deterministic element (new mover kind) | M |
| O10 | Water: ponds, streams, waterfalls | **Builders:** waterfalls of natural boulders or carved gunite, holes under waterfalls, and "jump shots" over a stream ([Harris][harris-feat]). A 200 ft waterfall and a cave on one course ([Big Cedar][bigcedar]). Streams with cascades, plunge pools and eddies ([Water Shapes][watershapes]).<br>**Rules:** flowing water counts as a risk area that may move ([NormAdv 6][s14]).<br>**Balls:** floating balls are sold ([Wittek balls][wit-balls], [Miniature Golf Store][mgs-all]). | A stream is a water zone plus a push zone. A floating ball drifts deterministically to a grate at the end of the stream, then gets R3 relief. A waterfall over a lane is a visual curtain (render only). | New deterministic element (drift path) | M |
| O11 | Sand traps, real and optical | **Real bunkers:** PopStroke has them ([InsideHook][insidehook]). Concrete lane 6 must be flown over a bunker ([NormBeton][s11]).<br>**Optical bunkers:** "Optical bunkers and water", areas only coloured differently from the turf, are not hazards ([NormAdv 10(4)][s14]). | Sand exists (mu 0.4). Add optical hazards, which are cosmetic zones that play as felt. They are realistic and kind. | none | S |
| O12 | Split paths and choice targets | **Labyrinth:** four entrances, only one of which leads in ([NormMiniatur][s12]).<br>**Mailbox:** pick the ace box or a side gate plus the slot ([NormFilz][s13]).<br>**Kidney:** through the tunnel or around it ([NormMiniatur][s12]).<br>**Crevasses:** Mt. Holey Moley's choice of crevasses ([Wikipedia Holey Moley][wiki-hm]). | Walls and tubes. False entrances end in a wall, so the ball just comes back out. | none | S per hole |
| O13 | Multi-level drops and ball returns | "Pipe shots": the ball enters a pipe and exits on a lower level ([Harris][harris-feat]). Some courses return balls through pressurised-air tubes ([Wikipedia][wiki-mg]). | Tubes exist. New: a visible drop pipe and an air-return whoosh (A6). | none | S |
| O14 **TOP** (10) | Rotating platforms and turntables | **Holey Moley:** on "Sweet Spot", players tee off from a fast-spinning platform toward a slower one that holds the hole ([Wikipedia Holey Moley][wiki-hm]).<br>**Real course:** a hole on a turning wheel with several openings, where the smaller openings are nearer the cup ([Re:Build][rebuild]). | **Model:** a new "turntable" zone. The floor velocity is ω × (p - c), and friction acts on the ball's velocity relative to the floor, so the ball appears to curve. It is a deterministic function of t.<br>**Fit:** no fail; the ball just lands somewhere else. | changes physics (a new surface motion) | M |
| O15 | Kickers, bumpers and flippers | The PPA names borders "bumpboards" and recognises ADA bumpboards ([PPA][ppa]). Holey Moley's "Parcade" uses pinball flippers ([Wikipedia Holey Moley][wiki-hm]). | Posts with e > 1 exist. Flippers are RESEARCH #16 (tap gadgets). | none | - |
| O16 | Elevated greens, ledges and plateaus | **Eternit plateau:** see 2.2 ([NormMiniatur][s12]).<br>**Felt ledges:** the German ledge has a target incline 20 to 60 cm high; the Swedish ledge is a 10 to 20 cm step ([NormFilz][s13]).<br>**Concrete chicken run:** a plateau with a secondary tee ([NormBeton][s11]).<br>**Canadian:** Le plateau, about 2 ft ([Défi mini-putt][wiki-defi]). | Tiers and ramps exist. New: "secondary tee" spots on awkward plateaus, marked as a white disc that the ball may be moved to. | New deterministic element | S |
| O17 | Ditch, stream and bunker jumps | **Felt ditch:** an incline 30 to 60 cm high, and the ball must not touch the ditch ([NormFilz][s13]).<br>**Concrete:** a straight jump over a bunker ([NormBeton][s11]).<br>**Elsewhere:** a stream jump ([Harris][harris-feat]); La rivière ([Défi mini-putt][wiki-defi]). Holey Moley's "Surf or Turf" sends the ball up a concave ramp onto an island green ([Wikipedia Holey Moley][wiki-hm]). | Crest launch plus water or sand zones already does this. A miss is a splash with R3 relief. | none | S |
| O18 **TOP** (10) | Jump into a net | Eternit lane 7: a ski jump into a 50 cm net ring whose lower edge is 70 to 80 cm above the tee, with the obstacle ending 250 cm along. The target is the inside of the net ([NormMiniatur][s12]). | A ramp launch, then a 3D target. If the ball crosses the ring plane within its radius, it counts as holed and the net mesh catches it. A miss lands beyond and plays on. | New deterministic element | M |
| O19 **TOP** (10) | Hole in a slope (mailbox, money box) | Felt lanes:<br>- A middle hole in a slope of at least 200 cm, with an obstacle 0 to 2 cm behind the hole.<br>- A money-box slot.<br>- A side hole and a vertical hole in a slope.<br>- A mailbox slot 4.5 to 9 cm wide.<br>([NormFilz][s13]) | A cup or slot capture zone on a ramp. Too fast and the ball skips over; too slow and it rolls back. Capture is already speed-based, so this needs a cup on sloped ground; COURSE_GUIDE wants cups on flat spots today. | changes physics (cup capture on slopes) | S-M |
| O20 | Ace box | The box behind the obstacle is the target. A ball that fails to stay in goes back to the tee ([NormFilz 23][s13]). | A capture zone. For no fail, a miss plays on from where it stops. | New deterministic element | S |
| O21 | Gates, sticks, boxes and fishbone | **Felt:** single, double, side and twin gates; boxes; fishbone ([NormFilz][s13]).<br>**Eternit:** sticks and Celle sticks ([NormMiniatur][s12]).<br>**Felt gate height:** 5 to 9 cm ([NormFilz][s13]). | Walls and posts. | none | S per hole |
| O22 **TOP** (10) | Swinging and rolling hazards | Holey Moley has swinging rubber ducks ("Putter Ducky"), rolling logs on rails ("Log Roll") and rotating buns ([Wikipedia Holey Moley][wiki-hm]). | New "swing" mover: a pendulum bob on a deterministic arc, like slide but along a circle. Rolling logs are slide movers with a cylinder look. | New deterministic element (a new mover kind) | S-M |
| O23 **TOP** (8) | The hole that swallows the ball | Hole 18 (or a bonus 19th) often has a drain or trap door that sends the ball to a lockbox. A US classic is a clown's face where a bell rings and a discount ticket is awarded ([Wikipedia][wiki-mg]). | On hole 18 of every course, the sunk ball drops into a pipe and clatters away to a clubhouse box (A6). That ends the round visually. The bell and tickets are G10 and G11. | none | S |
| O24 | Wishing well, lighthouse, obelisk and statues | These are named classic hazards: windmills, castles, wishing wells, tunnels and revolving statuary ([Wikipedia][wiki-mg]); obelisk and lighthouse at Hastings ([Wikipedia WCGC][wiki-wcgc]). Their mechanics are not documented in what I found. | Use them as post or tube shells. A wishing well is a tube mouth with a stone ring. | none | S |

---

## 4. Materials and the look of real courses

| ID | Feature | Facts | Fit in PuttX | Sim | Effort |
|---|---|---|---|---|---|
| M1 **TOP** (1) | Turf and carpet | **Fibres:** nylon is described as rolling truer than polypropylene, with less wobble ([SYNLawn][synlawn], a nylon seller). Pile: 10 to 12 mm nylon for fast greens and 15 to 18 mm PE/PP blends for balanced roll, with silica sand infill controlling speed ([Mighty Grass][mighty]).<br>**Putt-Putt:** short-nap outdoor carpet on smooth concrete ([Wikipedia][wiki-pp]).<br>**Colours:** outdoor carpet comes in reds, browns and greens ([Creators][creators]); tee turf comes in red, green, black and blue ([Wittek tee pads][wit-tee]).<br>**Course design:** a design patent uses short dense tufts on greens and taller, looser tufts on fairways ([US5203566][pat-turf]). | Render a fibre normal map, view-dependent sheen (nap), faint seams between carpet pieces, lighter wear paths near the tee and the cup (inference), glued edges along the borders, and occasional red or blue carpet per course. All of this fits one shadow light. | none | M |
| M2 | Green speed as a real number | A Stimpmeter rolls the ball onto the green at 1.83 m/s. Regular-play greens read 8, 10 and 12 ft for slow, medium and fast; U.S. Open greens read 10 to 14 ft ([Wikipedia Stimpmeter][stimp]). Synthetic greens read 8 to 12 ([Mighty Grass][mighty]). Household carpets read from about 9 to over 20 ([Golf Digest][owen]).<br>**Derived:** PuttX felt (mu 0.075 x 0.62 = 0.0465) gives d = v²/(2 mu g) = 3.67 m, about 12 ft, ignoring the skid phase. | Tune each course's `feltMu` to a stated stimp, and show a small gauge glyph with the numeral on the tee sign. | changes physics if values are retuned | S |
| M3 **TOP** (1) | Fringe and golf rough | WMF adventure golf has raised or flat "golf rough" borders. A ball leaving over raised rough is placed on its crest ([NormAdv 9-10][s14]). PopStroke has fairways and rough ([InsideHook][insidehook]). | A "rough" surface (longer, slower turf) as a collar around greens. It lets holes have no walls without being harsh, because the rough stops the ball instead of it falling off. | New deterministic element (a new surface mu) | S |
| M4 | Lane systems as material kits | Eternit is "a thin concrete material"; concrete lanes have metal rails; felt lanes sit on wood ([Ham and Egger][hae]). Adventure courses are a concrete base with timber boards and sleepers ([CPR][cpr]), and builders also offer interlocking modular panels ([AGS][ags]). | One kit per system: grey fibre-cement lanes with steel tube borders, concrete with rails, felt with wooden borders. | none | M |
| M5 **TOP** (3) | Border materials | Putt-Putt uses 2x4 inch extruded aluminium for banking ([Wikipedia][wiki-pp]). Walls are made of concrete, metal or fibreglass ([Wikipedia][wiki-mg]). Courses use timber boards and sleepers ([CPR][cpr]), and GFRC rockwork is used for theming ([Themed Concepts][themed]). In adventure golf, a brick or stone border that the ball touches on top and rolls back off stays in play, and borders must be smooth and predictable ([NormAdv 5, 9][s14]). | A per-wall `mat` tag (alu, steel, timber, brick, rock, fibreglass) drives the mesh, the hit sound (A4) and a small restitution table. I found no measured restitution for golf balls on these materials, so tune by feel. Keep rock borders predictable, as WMF asks. | changes physics (per-wall restitution) | M |
| M6 **TOP** (4) | Landscaping | **Builders:** red brick paths, rock landscaping and palm trees ([Harris][harris]); greenery, pathways and themed plantings ([David Theming Works][dtw]); artificial rocks, logs, fibreglass animal sculptures and GFRC entry arches ([Natureworks][nw-theme]).<br>**Design advice:** the entrance should set the mood ([Mini Golf Creations][mgc]). | Prop sets per course: brick paths between holes, river-rock beds, palms or pines, flower beds, and an entry arch on the map. They are low-poly and kept off the playing surface. | none | M-L |
| M7 **TOP** (4) | Water rendering | Waterfalls, ponds and streams are built into hole design ([AGS][ags], [Harris][harris-feat]); cascades and plunge pools ([Water Shapes][watershapes]). | Animated normal-mapped water with foam at falls, and a splash and ripple ring on entry. Decorative motion honours reduced motion. | none | M |
| M8 **TOP** (4) | Lighting | **Night play:** one course lit 6 holes with 15 poles and 88 LED fixtures ([KTAR][ktar]). A lighting case study targets 30 fc maximum and 5 fc minimum ([Commercial LED][cled]). Evening lighting creates atmosphere ([Mini Golf Creations][mgc]).<br>**Indoor glow courses:** UV-A blacklight with fluorescent paint and balls ([Natureworks glow][nw-glow], [City Golf][citygolf]). | A dusk look: one sun as the shadow light, with pole lamps as emissive heads plus baked light-pool decals on the turf, and string lights as emissive dots. The neon mode gains UV murals and fluorescent obstacle paint. | none | M |
| M9 **TOP** (2) | Cups | **Regulation:** 4.25 in (108 mm) across and 4 to 6 in deep ([dimensions.com][dims]).<br>**Mini golf:** cups are sold in plastic or aluminium, 4 in or 6 in deep ([Wittek cups][wit-cups]). The WMF adventure hole is 10 to 12 cm ([NormAdv][s14]) and the felt hole 10 cm ([NormFilz][s13]). Hybrid cups keep an aluminium bottom for the "traditional sound" ([Golfdom][golfdom]).<br>**Derived:** PuttX's cup is 198 mm against a 51 mm ball, a ratio of 3.9. Real ratios run from about 2.3 to 3.2, and regulation is 108 / 42.7 = 2.5. | Render a white liner, a metal rim ring, a ferrule socket and a dark soil cut. Whether to shrink the cup toward a real ratio is a difficulty decision for the physics overhaul. | none (render) / changes physics (if resized) | S |
| M10 **TOP** (2) | Flags and flagsticks | Numbered flags come in sets of nine (1-9 and 10-18) in blue, red, yellow or white; checkered and tube-lock flags also exist ([Miniature Golf Store flags][mgs-flags], [all products][mgs-all]). Flags are 400-denier ([Wittek flags][wit-flags]). | Each flag shows its hole numeral, coloured per course set, with checkered flags on crazy holes. | none | S |
| M11 **TOP** (2) | Tee mats | The tee mat is part of the playing surface ([PPA][ppa], interpretation 6). Rubber tee-off pads come pre-drilled, including a 24x36 in jumbo, alongside coloured turf squares ([Wittek tee pads][wit-tee]). WMF tee marks are given in R1. At Puttshack, players set the ball on a black marker and play starts when the lights turn green ([Cronkite News][cronkite]). | A black rubber mat with a moulded tee spot (and R1 placement). Optionally, a light ring that turns green when the stroke is armed. | none | S |
| M12 **TOP** (2) | Signs | **Hole markers:** ball-shaped number signs 14 cm across ([Natureworks][nw-sign]).<br>**Tee signs:** in real golf they show the hole number, par and a picture of the hole ([OnDeck][ondeck]).<br>**Stock signs:** "6 Stroke Maximum" and "Ball in water" ([Wittek signs][wit-signs]). | Each tee gets a tee sign with the hole numeral, a par flag glyph with its numeral, a layout pictogram (a top-down hole outline, already computable) and an optional stimp gauge (M2). A ball-shaped marker post beside each tee. No words. | none | S |
| M13 | Putters | Junior plastic putters are 19 in long, in blue, red or green; black-light putters also exist ([Wittek putters][wit-putt], [Miniature Golf Store][mgs-all]). Minigolf putters use a rubber face for pace control ([BMGA equipment][bmgaeq]). WMF limits the face to 40 cm² ([WMF 3.3][wmf]). | A rubber-faced putter in the pro shop as a FEEL item (a tighter power band). This sits inside the rule that the shop changes FEEL, never the sim. | none | S |
| M14 | Balls | **Casual balls:** two-piece, in dozens of colours, plus floaters and novelty and black-light balls ([Wittek balls][wit-balls], [Miniature Golf Store][mgs-all]).<br>**Sport balls:** 37 to 43 mm, and must not bounce above 85 cm when dropped 1 m onto concrete at 25 C ([WMF 4.2][wmf]). Heating, cooling and thermometers are allowed ([WMF 13.2][wmf]).<br>**Ball bags:** BMGA's starter bag is a dead ball (0 to 1 cm bounce), a medium (10 to 25 cm), a high (50+ cm) and a "Klicker", and players switch balls per hole ([BMGA equipment][bmgaeq]).<br>**Derived:** bounce restitution √(h/H) runs from about 0.1 to 0.92. | Balls are cosmetic today. A "sport bag" of balls with different bounce would change the sim, so it needs a product decision. If wanted, show bounce as dot icons. | changes physics (if adopted) | M-L |
| M15 | Theming props | Fibreglass animals, artificial rock and logs ([Natureworks][nw-theme]); GFRC rockwork ([Themed Concepts][themed]); gnomes and hollow logs from 1920s Tom Thumb courses ([Clifton Hill][clifton]). | Per-course prop libraries. A retro "1930 Tom Thumb" look for a bonus course: gnomes, logs and simple pipes. | none | M |

---

## 5. Scorecards

| ID | Feature | Facts | Fit in PuttX | Sim | Effort |
|---|---|---|---|---|---|
| S1 **TOP** (7) | Layout | **PPA cards:** totals for the first nine, the second nine and the grand total, with the course and round numbers and signatures ([PPA][ppa], rule 13).<br>**WMF cards:** fields for round and tournament totals, penalties, initials per round and final signatures ([WMF 10][wmf]).<br>**Common layout:** columns per hole and rows per player (template sites; weak sources). | A paper card in the done and course card scenes:<br>- A par row (flag glyph).<br>- One row per player (ball-colour dot).<br>- A Σ column after hole 9, after hole 18, and for the total. Use Σ glyphs, because OUT/IN are words.<br>- An animated golf-pencil stroke as each number appears.<br>The current `showCard` cells already split into under/par classes. | none | S |
| S2 **TOP** (7) | Circles and squares | Golf notation: birdie is a circle, eagle a double circle, bogey a square, double bogey a double square, par unmarked. Apps differ beyond that ([The Golf News Net][gnn]). | Wordless already. Add shaded marks for aces. | none | S |
| S3 | Who keeps score | **PPA:** each player keeps score for the whole group ([PPA][ppa], rule 13).<br>**BMGA:** players score in rotation (the third keeps the first's score, and so on), each stroke is written straight after the hole, and changes are crossed out so they stay legible ([BMGA 3.3.5-3.3.8][bmga]).<br>**WMF:** waterproof pens only, no pencils ([WMF 10.1][wmf]). Casual courses hand out golf pencils (the [Wittek mini golf][wit-mg] category list, [Miniature Golf Store][mgs-all]). | In hot seat, each row is "signed" with the player's ball stamp at the end. | none | S |
| S4 **TOP** (7) | Struck-out mulligans | Corrections are crossed out legibly, with the correct score beside them ([BMGA 3.3.8][bmga]). | A take-back shows the old number struck through with the new one beside it. Honest and charming. | none | S |
| S5 | Shareable card image | Flight Club gives players action replays ([Blooloop][blooloop-fc]); the PPA staples a group's cards together ([PPA][ppa]). | Render the card to a canvas PNG for the share sheet. No network. | none | S-M |

---

## 6. Group play, venues and glow

| ID | Feature | Facts | Fit in PuttX | Sim | Effort |
|---|---|---|---|---|---|
| G1 | The "crazy crazy" round | In the WCGC final round:<br>- Each player has a different-coloured ball, and all tee off in turn.<br>- After that, the player furthest from the hole plays next.<br>- Hitting another ball is allowed, and a displaced ball is played from where it stops.<br>([BMGA 4.3.2-4.3.5][bmga]) | New beyond RESEARCH #11 and #12: every ball stays on the hole at once, with the furthest away playing next. Knocks are legal and never a fail. | changes physics (deterministic ball-to-ball collisions) | M-L |
| G2 | Points mode (Puttshack) | **Scoring:** the highest score wins. Points come from the stroke count, hole-in-one bonuses and per-hole bonuses, and hazard traps can deduct earned points ([Cronkite News][cronkite], [Blooloop][blooloop-ps]).<br>**Ritual:** the green-lit Supertube "almost guarantees" an ace, the ball goes on a black marker, lights turn green to start, and screens above each hole show scores ([Cronkite News][cronkite]).<br>**Tech:** Trackaball puts the scoring in the ball ([Blooloop][blooloop-ps]). | New beyond RESEARCH #7 (targets): inverted points scoring as a mode, with an in-world score screen over each hole and the start lights. For no fail, hazards cost no points; they only forfeit a bonus. | none (scores read sim events) | S-M |
| G3 | Reactive courses (Puttery) | The ball keeps score and triggers light and sound ([Dallas Innovates][dallasinn]). | Rails, signs and cups light up and chime as the ball passes, driven by sim hit events. Decoration honours reduced motion. | none | S |
| G4 | Highlight reel (Flight Club) | Camera-tracked automatic scoring ([Washingtonian][washingtonian]), and a games library with action replays ([Blooloop][blooloop-fc]). | New beyond RESEARCH #19 (the ace replay): a 20-second end-of-round reel of the best putt, the longest putt and any ace, re-simulated from stored inputs. | none | M |
| G5 | Nine-hole rounds | Swingers runs two nine-hole crazy courses ([Time Out][timeout-sw]), with caddies serving on the course ([Time Out NY][timeout-ny]). One reviewer lists rails, jumps and loop-de-loops there ([A Couple of Putts][acop-sw]). Puttshack and Puttery use nine-hole courses ([Cronkite News][cronkite], [Dallas Innovates][dallasinn]). | A "front nine" or "back nine" quick round option on the map. | none | S |
| G6 | Ambient groups | Groups wait for the group ahead to leave the hole, and slower groups let faster ones play through ([BMGA 3.2.3][bmga], [Fairfax][fairfax]). | Distant figures play other holes as background life (render only). They pause when reduced motion is set. | none | M |
| G7 | Glow courses | Indoor UV-A blacklight with fluorescent paint, obstacles and balls ([Natureworks glow][nw-glow], [City Golf][citygolf]). | Neon mode exists. Enhance it with fluorescent splatter on obstacles and UV murals (M8). | none | S |
| G8 | Venue apps and leaderboards | PopStroke: app scoring and a giant leaderboard ([InsideHook][insidehook]). | Already covered by local bests and shot codes. No network. | none | - |

---

## 7. Sounds and ambience

PuttX synthesises all audio, so every item below is a synth recipe keyed by material.

| ID | Feature | Facts | Fit in PuttX | Sim | Effort |
|---|---|---|---|---|---|
| A1 **TOP** (9) | Putter click | In putting, spectral peaks at 2 to 4 kHz trended with ball compression, while 0 to 2 kHz content depended more on putter type and impact point. Players heard the highest-peak ball as sharpest, loudest and hardest ([Barrass et al., Loughborough][barrass]). | Map the shop ball to the 2 to 4 kHz peak, and the putter plus the strike offset (already measured for the readout) to the low band. The rubber-face putter (M13) clicks duller. | none | S |
| A2 **TOP** (9) | Cup drop by material | Metal cups give the prized "ping". Soft-metal and plastic cups give a "kerplunk" or "plop", and plastic cups lack the metallic sound many golfers want ([US6767289][pat-cup1], [US5351950][pat-cup2]). An aluminium bottom keeps the "traditional sound" ([Golfdom][golfdom]). A cup bell has even been patented ([US6726575][pat-bell]). | A per-course cup material tag picks a bright ping or a soft plop for the existing `plunk`. | none | S |
| A3 **TOP** (9) | Rim rattle | Pro libraries carry "Hit Cup Rattle" and "Hit Putt in Cup" as distinct effects ([Sound Ideas][soundideas]). | Drive the existing `rattle` from rim contacts in the new 3D rim model. | none | S |
| A4 **TOP** (3, 9) | Border hits by material | No measured source found (inference): aluminium rings, timber thunks, brick and stone clack, fibreglass rock is dull. | Pick by the M5 `mat` tag. | none | S |
| A5 **TOP** (9) | Rolling texture | No measured source found (inference): carpet hisses, felt is near silent, concrete and Eternit rumble, wooden bridges drum, steel rails ring. | A continuous rolling synth: noise through a filter whose cutoff and level follow speed, with a recipe per surface. | none | M |
| A6 | Pipes and ball returns | Pressurised-air ball returns exist ([Wikipedia][wiki-mg]). | Rumble in tubes with an echo tail, an air-return whoosh, and a box clatter on hole 18 (O23). | none | S |
| A7 **TOP** (9) | Water and ambience | Water noise works as "a natural sound barrier from other people on the course" ([Harris][harris-feat]). Walkabout is praised for "satisfying sounds and calming music" ([UploadVR][uploadvr]). | Per-course ambient beds (waterfall, birds, surf, wind), quiet under the putt. | none | S |
| A8 | Windmill and machinery | Inference: creak and a motor hum. | A spin mover drives a hum whose pitch follows its period. | none | S |
| A9 **TOP** (8) | Ace bell and tickets | The clown-face target rings a bell and gives a ticket ([Wikipedia][wiki-mg]). On Putt-Putt courses an ace earns a ticket, three tickets usually earn a free game, and the player's ball is swapped for an orange one so it cannot earn another ticket that round ([Wikipedia Putt-Putt][wiki-pp]). | A brass bell on every ace. G10 tickets clink into a strip. | none | S |

**G10 (TOP 8): ace tickets.** Each ace prints a ticket into a strip on the map, and three tickets give a mulligan token ([Wikipedia Putt-Putt][wiki-pp]). A nod to the orange-ball custom: the ball wears an orange ring for the rest of that course run. Sim impact: none. Effort: S.

**G11 (TOP 8): bonus 19th hole.** One attempt per round at a mark that wins a free round ([Treetop Golf][treetop]); a 19th hole that gives a free game for an ace ([Wikipedia][wiki-mg]); the "Lucky Last Hole" ([Ham and Egger][hae]). After hole 18, PuttX offers one shot at a clown-mouth or target hole:
- A hit pays a token.
- A miss costs nothing and is not scored, so it is not a fail.

Sim impact: none (it reuses a hole). Effort: S.

---

## 8. Physics notes for the overhaul (task 4)

1. **Loop threshold.** For a rolling ball the condition is v² ≥ (27/7) g (R - r) at the bottom. It comes from the measured 2.7R drop height ([UMD][umd], [MTU][mtu], [UCI][uci]), and is the derived value from O2. RESEARCH.md pattern 6 uses √(5gR), which is the sliding-block value, so correct the doc when the loop is built.
2. **Climbing.** A rolling ball needs v² ≥ (10/7) g h to rise h, ignoring rolling resistance (2/7 of the kinetic energy is rotational, per [UMD][umd]). This is useful for volcano and ramp tuning.
3. **Green speed.** PuttX felt is about stimp 12 (derived, M2), the top of regular-play greens ([Stimpmeter][stimp]). Fast is fine, but check that "fast" (mu 0.0248) and "ice" read as intended.
4. **Cushions.** Topspin and sidespin change both rebound speed and angle off a cushion, and the rigid-cushion assumption holds up to about 2.5 m/s ([Mathavan et al.][mathavan]). This is relevant to replacing the fixed WALL_E 0.78 and WALL_SLIP 0.94 now that a spin state exists.
5. **Cup to ball ratio.** It is 3.9 in PuttX against about 2.5 at regulation (derived, M9). Any change moves the difficulty of every hole.
6. **Ball bounce standards.** WMF limits bounce to 85 cm from 1 m (derived restitution of at most 0.92). Dead sport balls bounce 0 to 1 cm ([WMF 4.2][wmf], [BMGA equipment][bmgaeq]). PuttX's landing BOUNCE_E 0.5 sits between, which suits a "lively golf ball on carpet".
7. **WMF fairness principle.** Obstacles are fixed, have no moving parts on the correct path, and have "a calculable effect" ([WMF 2.6][wmf]). Moving parts are allowed only in risk areas ([NormAdv 6][s14]). Crazy holes can keep their movers, but long greens and any sport course should follow this principle.

---

## 9. Gaps and caveats

- **Restitution and rolling sounds:** I found no measured restitution of golf balls on timber, brick or aluminium, and no measured rolling sounds per surface. A4, A5 and M5 values are tuning by feel.
- **Concrete lane names:** these are my renderings of the Dutch 2018 text. The OSM proposal says concrete lanes have no official names.
- **PPA relief distance:** the abridged PPA book says "prescribed distance" without a number. The full unabridged book should have it.
- **Puttshack scoring:** values per stroke count vary between reports, so I give no table.
- **Doc drift:** docs/COURSE_GUIDE.md still lists ball radius 0.051, cup radius 0.11 and a capture speed of 1.45 m/s. src/game.js has BALL_R 0.0255 and CUP_R 0.099.
- **Determinism:** R1, R2, R3, R4, R5, O16 and O20 add between-stroke placements or choices. They must enter shot codes (`?shot=`), ghosts, `sol` and `holes-check`. Like the daily seed, nothing in them may read a clock.
- **No fail states:** G2 hazards should not subtract points, and R5's replay-from-tee half belongs only in an opt-in sport mode.

## Sources

[ppa]: https://www.proputters.org/_files/ugd/6f2c71_c16d825d61c8453e80582e770da1aeeb.pdf
[wmf]: https://minigolfbond.nl/.cm4all/uproc.php/0/Officieel/Sportreglementen/internationale%20sportregels%202.3%202025.pdf?cdp=a
[wmf25en]: https://www.godeidrettsanlegg.no/sites/default/files/bilder/Banemaal_minigolf.pdf
[wmf24nl]: https://minigolfbond.nl/.cm4all/uproc.php/0/Officieel/Sportreglementen/Minigolfregels%202.4%20Beton%202018.pdf?cdp=a
[s11]: https://www.minigolfsport.de/pdf/Download/Regelwerk/s11_normungsbestimmungen_beton-2026-01_rot.pdf
[s12]: https://www.minigolfsport.de/pdf/Download/Regelwerk/s12_normungsbestimmungen_miniaturgolf-2026-01_rot.pdf
[s13]: https://www.minigolfsport.de/pdf/Download/Regelwerk/s13_Normungsbestimmungen_filzgolf-2026-01_rot.pdf
[s14]: https://www.minigolfsport.de/pdf/Download/Regelwerk/s14_normungsbestimmungen_adventure_2026-01_neu.pdf
[bmga]: https://bmga.online/wp/wp-content/uploads/2026/01/BMGA-Competition-Rules-January-2026-Update.pdf
[bmgaeq]: https://bmga.online/equipment-guide/
[nz]: https://www.nzminigolf.com/rules
[rosf]: https://rosfjord.no/en/minigolf-park/course-rules/
[fairfax]: https://www.fairfaxcounty.gov/parks/rules/Miniature-Golf
[tricycle]: https://www.wearetricycle.co.uk/pages/what-are-the-rules-of-mini-golf
[osm]: https://wiki.openstreetmap.org/wiki/Proposal:Miniature_Golf_features
[hae]: https://hamandeggerfiles.blogspot.com/2020/06/definitions-of-minigolf.html
[wiki-mg]: https://en.wikipedia.org/wiki/Miniature_golf
[wiki-pp]: https://en.wikipedia.org/wiki/Putt-Putt_Fun_Center
[wiki-defi]: https://en.wikipedia.org/wiki/D%C3%A9fi_mini-putt
[wiki-hm]: https://en.wikipedia.org/wiki/Holey_Moley
[wiki-wcgc]: https://en.wikipedia.org/wiki/World_Crazy_Golf_Championships
[harris-feat]: https://www.harrisminigolf.com/fun-challenges-and-features-to-add-to-your-mini-golf-course/
[harris]: https://www.harrisminigolf.com/
[ags]: https://www.agsgolfandsports.com/mini-golf-course-construction/
[dtw]: https://www.davidthemingworks.com/EN/mini-golf_design_and_construction.html
[bigcedar]: https://bigcedar.com/golf/cliffhangers-golf-course/
[watershapes]: https://watershapes.com/great-lengths/
[mgc]: https://minigolfcreations.com/psychology-of-mini-golf/
[themed]: https://issuu.com/themedconcepts/docs/2014_themed_concepts_catalog_web
[nw-theme]: https://natureworks.com.au/minigolf-theming/
[nw-glow]: https://natureworks.com.au/products/minigolf-theming/mini-golf-theming-examples/glow-in-the-dark-mini-golf/
[nw-sign]: https://natureworks.com.au/products/minigolf-theming/minigolf-signage-decor/mini-golf-ball-with-number-140cm/
[citygolf]: https://citygolf.se/products/blacklight-golf/
[ktar]: https://ktar.com/arizona-news/minidunes-golf-course-in-maricopa-adds-led-lights-for-nighttime-playing
[cled]: https://commercialledlights.com/blog/case-studies/mini-golf-course-area-lighting-case-study/
[cpr]: https://www.cpr-resurfacing.co.uk/loch-lomond-shores-mini-golf-course/
[wit-cups]: https://www.wittekgolf.com/mini-golf/mini-golf-cups
[wit-tee]: https://www.wittekgolf.com/mini-golf/mini-golf-tee-pads
[wit-putt]: https://www.wittekgolf.com/mini-golf/mini-golf-putters
[wit-mg]: https://www.wittekgolf.com/mini-golf
[wit-balls]: https://www.wittekgolf.com/mini-golf/mini-golf-balls
[wit-signs]: https://www.wittekgolf.com/mini-golf/mini-golf-signs
[wit-flags]: https://www.wittekgolf.com/mini-golf/mini-golf-flags
[mgs-flags]: https://www.miniaturegolfstore.com/products/flags-numbered/2610615000002043710
[mgs-all]: https://www.miniaturegolfstore.com/collections/all-products/2610615000000110250
[dims]: https://www.dimensions.com/element/golf-hole-golf-cup
[golfdom]: https://www.golfdom.com/standard-golf-hybrid-st2000-cup-and-smart-fit-pro-ferrule/
[pat-cup1]: https://patents.google.com/patent/US6767289
[pat-cup2]: https://patents.google.com/patent/US5351950
[pat-bell]: https://patents.google.com/patent/US6726575
[pat-turf]: https://patents.justia.com/patent/5203566
[pat-pivot]: https://patents.google.com/patent/US4148490A
[barrass]: https://repository.lboro.ac.uk/articles/journal_contribution/Assessment_of_the_impact_sound_in_golf_putting/9564332
[soundideas]: https://www.sound-ideas.com/Product/2441/Golf-Sound-Effects
[uploadvr]: https://www.uploadvr.com/walkabout-mini-golf-review/
[blooloop-ps]: https://blooloop.com/play/in-depth/puttshack/
[cronkite]: https://cronkitenews.azpbs.org/2023/06/16/puttshack-scottsdale-high-tech-mini-golf-experience/
[insidehook]: https://www.insidehook.com/culture-texas/tiger-woods-designed-putting-experience-houston-popstroke/amp
[golfmonthly]: https://www.golfmonthly.com/news/tiger-woods-unveils-two-new-putting-courses
[timeout-sw]: https://www.timeout.com/london/things-to-do/swingers-west-end
[timeout-ny]: https://www.timeout.com/newyork/news/a-crazy-london-golf-club-is-opening-in-nyc-041222
[acop-sw]: https://acoupleofputts.com/2025/01/31/swingers-city-london/
[dallasinn]: https://dallasinnovates.com/first-look-drive-shack-opens-its-debut-puttery-location-friday-at-grandscape-in-the-colony/
[blooloop-fc]: https://blooloop.com/play/in-depth/flight-club-electric-shuffle/
[washingtonian]: https://washingtonian.com/?p=1711176
[stimp]: https://en.wikipedia.org/wiki/Stimpmeter
[owen]: https://www.golfdigest.com/story/man-about-golf-david-owen
[mighty]: https://www.mightygrass.com/products-category/golf
[synlawn]: https://www.synlawngolf.com/the-nylon-advantage/
[creators]: https://www.creators.com/read/heres-how/03/16/use-outdoor-carpeting-on-your-patio-and-deck
[umd]: https://lecdem.physics.umd.edu/d/d1/d1-53.html
[mtu]: https://www.phy.mtu.edu/phydemo/1m40_20_html.htm
[uci]: https://www.physics.uci.edu/~demos/entries/1M40.20.html
[nagoya]: https://www.ncsm.city.nagoya.jp/cgi-bin/en/exhibition_guide/exhibit.cgi?id=S205
[mathavan]: https://dspace.lboro.ac.uk/2134/15087
[usga13]: https://usga.org/content/usga/home-page/custom-search-pages/rules/2019-golf-rules-and-interpretations/pe-rule-13.html
[ncga]: https://blog.ncga.org/rules-of-golf-101-my-ball-is-overhanging-the-hole
[gnn]: https://thegolfnewsnet.com/ryan_ballengee/2024/02/17/what-circles-squares-golf-scorecard-mean-105507/
[ondeck]: https://www.ondecksports.com/Deluxe-Custom-Tee-Sign-with-Hole-Layout
[treetop]: https://adventuregolf.com/explore/bonus-19th-hole
[fab]: https://fabacademy.org/2025/labs/charlotte/students/jenna-chebaro/final%20project/1-concept/
[rebuild]: https://dapr.rebuildmanufacturing.com/?p=7994
[toh]: https://www.thisoldhouse.com/yards/how-to-build-a-miniature-golf-course
[time]: https://time.com/archive/6745353/business-tom-thumb-from-tennessee
[clifton]: https://www.cliftonhill.com/falls_blog/crazy-evolution-mini-golf/