# PuttX genre research: 20 things to build next (harder, 12-year-old version)

Scope: the list leaves out what is already being built: 10 courses x 18 holes, multi-tier holes, hills, ramps, tubes, moving obstacles, the DS-style swing with mishits, and the pro shop for putters and balls. The list is ranked by how much each item deepens the putting skill and makes the game stickier, weighed against effort. Effort: S = days, M = 1-2 weeks, L = more than that.

A point that shapes several items: PuttX's `#region sim` is deterministic (240 Hz, no Math.random, no clocks). That makes replays, ghosts, seeded dailies and shareable challenge codes almost free, because a shot is fully described by its inputs.

---

## Ranked list

### 1. Personal-best ghost ball
- **What:** On replay, a translucent ghost ball plays back your best run of the hole stroke by stroke. Save only the swing inputs per stroke and re-simulate them.
- **From:** Racing-game ghosts. Walkabout reviewers say the core loop is replaying courses "in an attempt to better your previous score" ([CGM review](https://cogconnected.com/review/walkabout-mini-golf-review/)).
- **Why it fits:** It shows a 12-year-old the line and pace that worked, so they learn by copying themselves. The deterministic sim makes it exact and cheap to store.
- **Effort:** S
- **No words:** Ghost ball, stroke numerals and a best-score number. A ghost icon toggles it.

### 2. Shot readout after every putt (path, face, tempo)
- **What:** After each swing, a small glyph panel shows swing path (arrow), face/contact offset (dot on a ball silhouette) and tempo (a bar with a sweet-spot band). It turns the mishit system from "random" into "learnable".
- **From:** Touch Golf: Birdie Challenge, where stroke length sets power, a diagonal stroke adds spin and slow strokes go weak ([Nintendo UK](https://www.nintendo.co.uk/Games/Nintendo-DS/Nintendo-Touch-Golf-Birdie-Challenge-272123.html/), [Multiplayer.it](https://multiplayer.it/recensioni/nintendo-touch-golf-birdie-challenge.html), [Cubed3](https://www.cubed3.com/games/reviews/nintendo-ds/nintendo-touch-golf-birdie-challenge)). Wii Sports Resort, where the club-face angle produces slice or hook ([Family Gamer](https://gamepeople.co.uk/familyguide_wii_wiisports2.htm)).
- **Why it fits:** Harder swing mechanics only feel fair if the player can see why a shot went wrong. This feedback is what turns frustration into practice.
- **Effort:** S
- **No words:** Arrows, a dot on a circle, a coloured band and a tick or cross icon.

### 3. Intentional spin from contact point
- **What:** Before swinging, let players nudge the strike point on a ball widget. A high strike gives topspin (rolls out further and climbs ramps), a low strike gives backspin (checks up after drops and landings), and a side strike curls the ball on flat ground. Off-centre mishits reuse the same model, so on-purpose spin and accidental spin come from one system.
- **From:** Kirby's Dream Course spin panel, with top or back spin on fly shots and side spin on rolls ([GameSpot review](https://www.gamespot.com/kirbys-dream-course/reviews/kirbys-dream-course-review-6178085/), [Almar's guide](https://almarsguides.com/retro/walkthroughs/snes/games/KirbysDreamCourse/)). Super Stickman Golf 3, where spin works mid-flight and off walls and ceilings ([Noodlecake](https://noodlecake.com/super-stickman-golf-3-2/), [Pocket Gamer](https://www.pocketgamer.com/super-stickman-golf/review)). The Touch Golf diagonal stroke.
- **Why it fits:** It adds a second skill axis beyond aim and power, and it matters most on the airborne ramps and multi-tier drops already planned.
- **Effort:** M (spin state in the sim, then spin-dependent friction and bounce)
- **No words:** A ball widget with a draggable dot. Spin shows as a rotating stripe on the ball.

### 4. Three stars per hole with different objectives
- **What:** Each hole has three medals: finish at par or better, ace or eagle it, and a hole-specific trick (hit the bonus target, take the secret tube, or finish without touching a wall). Stars gate course unlocks and pay coins.
- **From:** Mini Golf King's Tour Challenge, which awards stars over 50+ holes ([App Store](https://apps.apple.com/US/app/id1262262200)). Golf Peaks and What The Golf? challenge levels ([NWR](https://nintendoworldreport.com/review/53773)).
- **Why it fits:** One hole gets three reasons to replay it, and the trick star teaches routes that experts find.
- **Effort:** S
- **No words:** Star icons, each with an objective glyph (target, tube, crossed-out wall, "1").

### 5. Hidden lost balls on every hole
- **What:** Each hole hides one collectible ball that you can only reach with a deliberate off-route shot, such as a ledge, a tube exit or behind a moving gate. Collecting a full course's set unlocks a commemorative putter or ball skin in the pro shop.
- **From:** Walkabout Mini Golf has 250+ hidden collectible balls and a hard-mode "Foxhunt" that rewards a commemorative putter ([Steam](https://store.steampowered.com/app/1408230), [Guild Order wiki](https://guildorder.com/games/walkabout/wiki/foxhunts-and-lost-balls)).
- **Why it fits:** Exploration gives 12-year-olds bragging rights, and it feeds the pro shop without raising grind prices.
- **Effort:** M (180 placements, plus a solver check that each one is reachable)
- **No words:** A ball-silhouette counter per course (for example 7/18) and a sparkle on pickup.

### 6. Hard ("night") remix of every course
- **What:** Beating a course unlocks a remix with the same theme and night lighting, where every hole is modified and some are fully redesigned (moved cups, extra walls, faster obstacles).
- **From:** Walkabout's Hard mode: "every hole has been modified, and sometimes completely redesigned" ([Steam](https://store.steampowered.com/app/1408230/Walkabout_Mini_Golf_VR), [UploadVR review](https://www.uploadvr.com/walkabout-mini-golf-review/)). PopStroke's harder Red and easier Black courses ([Golf Monthly](https://www.golfmonthly.com/news/tiger-woods-unveils-two-new-putting-courses)).
- **Why it fits:** It doubles content using existing assets, and it lets the base courses stay approachable while experts get a real test.
- **Effort:** L (180 more hole variants, each solver-proven)
- **No words:** A moon icon on the course card, with the same star and number UI.

### 7. Bonus targets and fairies mid-hole
- **What:** Optional floating or wall targets on the route. Hitting one during a roll pays coins or a stroke credit, and some are sensors in tubes.
- **From:** Zany Golf fairies give 1-5 bonus strokes ([Wikipedia](https://en.wikipedia.org/wiki/Zany_Golf)). Puttshack's Trackaball awards bonus points for targets such as Supertubes ([Blooloop](https://blooloop.com/play/in-depth/puttshack/), [Dallas Observer](https://www.dallasobserver.com/arts-culture/puttshack-the-mini-golf-game-of-the-future-is-in-addison-18006437/)).
- **Why it fits:** It creates risk and reward: the safe line sinks the putt, while the greedy line clips a target and still has to finish.
- **Effort:** M
- **No words:** Coin or star burst icons and a +N numeral pop.

### 8. Slope-reading grid and arrows
- **What:** Holding a "read" button overlays a grid or flow arrows on the green, with arrow size showing steepness. Make it limited (for example one read per hole, or a pro-shop "caddie" item) so reading slope by eye stays a skill.
- **From:** Mario Golf Advance Tour's slope arrows ([GameSpot user review](https://www.gamespot.com/mario-golf-advance-tour/user-reviews/2200-100657/)), Toadstool Tour's putting grid ([OSFTW](https://www.osftw.com/reviews/215/mario-golf-toadstool-tour)), and the series' arrows sized by severity ([Giant Bomb](https://www.giantbomb.com/games/3030-29972/)).
- **Why it fits:** Big hills make break the core skill, and a scarce read button adds a decision about when to use it.
- **Effort:** M (sample the heightfield and draw instanced arrows)
- **No words:** An eye icon button. The overlay is pure graphics.

### 9. Seeded daily challenge, offline
- **What:** The date picks a hole plus a modifier (one stroke only, closest-to-pin, a mirror hole or low friction) from a deterministic hash. Your score for the day is kept, and a streak counter rewards coming back.
- **From:** Golf Battle daily missions filling a chest ([Miniclip support](https://support.miniclip.com/hc/en-us/articles/360017509897-What-are-the-Daily-Challenges-in-Golf-Battle)) and the "Lucky Shot" one-putt closest-to-hole challenge ([App Store story](https://apps.apple.com/ca/ipad/story/id1438087433)).
- **Why it fits:** It is a habit loop with no server. Two kids playing on the same day get the same challenge, so they can compare at school.
- **Effort:** S-M (the date read stays outside the sim and only seeds the setup)
- **No words:** A calendar icon, a flame plus numeral for the streak, and a modifier glyph.

### 10. Hole-in-one challenge mode
- **What:** A ladder of holes where only an ace counts. You retry instantly, and each cleared rung pays out.
- **From:** Mini Golf King's Hole-in-One Challenge ([AppSpy](https://www.appspy.com/preferred/bluehole-pnixs-mini-golf-king-receives-a-new-update/), [App Store](https://apps.apple.com/US/app/id1262262200)). Putt-Putt's rule that a hole-in-one is always possible with skill ([Wikipedia](https://en.wikipedia.org/wiki/Putt-Putt_Fun_Center)).
- **Why it fits:** It is pure skill reps in short sessions, the "one more try" loop.
- **Effort:** S (reuse existing holes, with a solver check that an ace exists)
- **No words:** A "1" in a flag icon and a rung ladder of numbered dots.

### 11. Pass-and-play hot seat for 2-4 players
- **What:** Local turns on one device with ball colours per player, a per-hole winner crown and an end scorecard. There is an optional handicap of extra mulligans for the weaker player.
- **From:** Golf With Your Friends' party and custom modes ([Tuni Playlab review](https://www.tuni.fi/playlab/par-for-the-course-golf-with-your-friends-review/)). Walkabout's 8-player rooms ([Steam](https://store.steampowered.com/app/1408230/Walkabout_Mini_Golf_VR)), here adapted to offline.
- **Why it fits:** It is the offline social feature that works with siblings and friends on the couch.
- **Effort:** M
- **No words:** Coloured ball avatars, numbers and a crown icon.

### 12. Party power-ups in hot-seat play
- **What:** Opt-in items, collected from bonus targets, that you play on an opponent's next shot: sticky patch, square ball, freeze, or a mirrored aim line.
- **From:** Golf With Your Friends' honey, square ball and freeze power-ups ([EGM](https://egmnow.com/?p=23148), [Team17](https://www.team17.com/golf-with-your-friends-l-sports-update/)). Mario Golf: Super Rush special shots such as Luigi's ice patch, which can be switched off ([Game Informer](https://gameinformer.com/review/mario-golf-super-rush/mario-golf-super-rush-review-teed-for-speed)).
- **Why it fits:** Chaos for groups, with the solo game kept pure. It is off by default.
- **Effort:** M
- **No words:** Icon cards (honey drop, cube, snowflake).

### 13. Mulligan tokens
- **What:** Earnable, limited do-overs that rewind the last stroke. Each course run gets a few, and they are banned in daily and ace modes.
- **From:** Walkabout added "penalty-free do-overs for mis-hit shots", with the host choosing how many ([UploadVR](https://www.uploadvr.com/walkabout-mini-golf-adds-mulligans-hand-tracking-a-new-dlc-course-today/)).
- **Why it fits:** Holes get much harder, and mulligans stop one mishit from ruining a 4-part hole. The deterministic sim makes the rewind trivial.
- **Effort:** S
- **No words:** A rewind arrow icon with a count numeral.

### 14. Stroke-budget gauntlet run
- **What:** Play a full course on one shared stroke pool. Strokes saved under par carry over, and quick putts earn extra strokes. When the pool hits zero the run ends on the scorecard with your number of holes reached. It is a score, not a fail screen.
- **From:** Zany Golf: "unused shots are carried over from previous holes and extra strokes are awarded for putting within a time limit or by hitting a fairy" ([Wikipedia](https://en.wikipedia.org/wiki/Zany_Golf)).
- **Why it fits:** It puts tension across 18 holes and makes every saved stroke matter. Check it against the "no fail states" rule; framed as "how far did you get" it still always ends on a result.
- **Effort:** S-M
- **No words:** A stroke-pool numeral and a hole-progress dot track.

### 15. Secret routes and a hidden bonus hole
- **What:** Some holes hide a shortcut, such as a timed shot into a hidden passage or a wall that opens. Finishing a course under a total target unlocks a 19th "mystery" hole.
- **From:** Zany Golf's Mystery hole, reached under 26 strokes or by timing a shot into a secret passage on hole 9 ([Wikipedia](https://en.wikipedia.org/wiki/Zany_Golf), [The Greatest Games](https://greatestgames.substack.com/p/the-classic-pc-gaming-era-1977-1989-79d)).
- **Why it fits:** Secrets spread by word of mouth among 12-year-olds, and it rewards mastery with new content.
- **Effort:** M
- **No words:** A "?" flag icon and a "19" hole number.

### 16. Tap-to-trigger hole gadgets while the ball rolls
- **What:** Some obstacles respond to taps mid-roll: bounce a platform, close a gate, or fire a booster pad. Timing becomes part of the shot.
- **From:** Zany Golf's hamburger hole, where repeated clicks make the burger bounce so you can sink the putt ([Wikipedia](https://en.wikipedia.org/wiki/Zany_Golf)). Kirby's Dream Course booster button, pressed on landing or wall contact ([GameSpot](https://www.gamespot.com/kirbys-dream-course/reviews/kirbys-dream-course-review-6178085/)).
- **Why it fits:** It adds a dexterity layer after the putt. Taps go into the sim as timestamped inputs, so it stays deterministic.
- **Effort:** M
- **No words:** The gadget glows and pulses when it is tappable.

### 17. One signature physics twist per course
- **What:** Each of the 10 themes gets one rule unique to it: low gravity (space), ice with no friction, magnets, sticky mud, conveyor turf, wind fans or water skipping. It is introduced gently on hole 1 and remixed by hole 18.
- **From:** What The Golf?, where "every next set of levels is a surprise" and each level changes the physics ([Klardendum](https://klardendum.com/review/in-love-with-what-the-golf/), [NWR preview](https://nintendoworldreport.com/preview/51577)). Kirby's Dream Course water bouncing ([TASVideos](https://tasvideos.org/Forum/Topics/10070)). Super Stickman's anti-gravity and sticky walls ([Noodlecake](https://www.noodlecake.com/?p=3985)).
- **Why it fits:** Courses then differ in skill, not just in looks. Each one has a mechanic to master.
- **Effort:** M per mechanic (sim surface types)
- **No words:** The mechanic is introduced by an icon on the course card and a silent demo ghost on hole 1.

### 18. Practice green and free-roam explore
- **What:** A no-score sandbox where you can drop the ball anywhere on any unlocked hole and repeat a shot from the same spot. It is ideal for practising the swing and spin.
- **From:** Walkabout's driving range and practice green ([Steam](https://store.steampowered.com/app/1408230/Walkabout_Mini_Golf_VR)). Golf With Your Friends' Explore mode with no time or shot limit ([Nintendo eShop](https://ec.nintendo.com/apps/01006FB00EBE0000/US)).
- **Why it fits:** A harder swing needs a place to drill it without stakes.
- **Effort:** S
- **No words:** A target or flag icon with a loop-arrow repeat button.

### 19. Near-miss and ace juice
- **What:** Lip-outs (the ball circles the rim and spins out) plus a short slow-motion camera when the ball is close to the cup at low speed. On an ace, a replay camera re-runs the shot from a cinematic angle. Brief camera shake on big drops. Decorative effects follow `prefers-reduced-motion`.
- **From:** General game-feel guidance: zoom and slow motion at critical moments and controlled screen shake ([UAL game-juice note](https://23037202.myblog.arts.ac.uk/?p=202)). Super Stickman's crowd-pleasing replays ([Pocket Gamer](https://www.pocketgamer.com/super-stickman-golf/review)).
- **Why it fits:** Near-misses drive "one more go", and determinism makes free replays possible from stored inputs.
- **Effort:** M (the rim physics belongs in the sim, the camera in render)
- **No words:** Purely visual and audio.

### 20. Shareable shot and challenge codes
- **What:** Encode a hole id plus your swing inputs into a short symbol/number code or QR code. A friend enters it and watches your exact shot as a ghost, then tries to beat it.
- **From:** Golf Battle's challenge-a-friend and Lucky Shot loops ([Miniclip support](https://support.miniclip.com/hc/en-us/articles/360017509897-What-are-the-Daily-Challenges-in-Golf-Battle)). Puttshack and PopStroke leaderboards ([Golf Channel](https://www.golfchannel.com/news/tiger-woods-enters-partnership-putting-course-company), [InsideHook](https://www.insidehook.com/culture-texas/tiger-woods-designed-putting-experience-houston-popstroke/amp)). The determinism makes this possible without servers.
- **Why it fits:** It gives social competition with no accounts or network, which suits a kid audience.
- **Effort:** M
- **No words:** A QR code or symbol string, and a camera or keypad icon.

---

## Hole design patterns for crazy 3-4 part holes

1. **Volcano feeder (risk-reward split).** From the tee, the direct line is a long putt across a narrow causeway onto a small lower green ringed by hazards. The alternative is to putt up a cone-shaped mound close to the tee into a crater cup, where a pipe drops the ball out onto the lower green near the hole. Geometry: tee on tier A; a cone mound (radius about 1.5 m, rim height about 0.6 m) with a cup at its apex; a pipe from the apex exits on tier B about 1 m from the cup; and a narrow causeway from A to B as the risky direct route. ([Golf Course Architecture: Hainan volcano par 3](https://www.golfcoursearchitecture.net/content/noodle-bowl-for-new-chinese-course))
2. **Multi-cup drop deck (choose the right hole).** The upper tier has 3 cups side by side. Each cup feeds a tube to a different spot on the lower tier: one beside the flag, one behind a bumper and one into a sand or slow zone. Geometry: an upper rectangular deck with three holes spaced about 0.5 m apart, angled tubes to exits on the lower deck at varied distances from the cup, and walls on the lower deck that make the bad exits genuinely bad. Courses often send the ball through tunnels and pipes between levels ([This Old House](https://www.thisoldhouse.com/?p=70223), [Dubizzle](https://www.dubizzle.com/blog/property/building-mini-golf-course/)).
3. **Timed windmill or gate into a ramp.** Spinning blades block the entrance to a ramp up to tier 2. Going through the blades is shortest, and a longer bank route around the side is open all the time. Geometry: a 4-blade rotor across a 0.3 m mouth, a ramp behind it rising 0.5 m, and an alternate bank wall at 45 degrees around the windmill base. "Players can use the windmill... by bouncing the ball off its blades... if they time the shot well" ([Miniature golf course obstacles](https://course.rjuuc.edu.np/read/miniature-golf-course-obstacles.html), [WOW Entertainment](https://thevendry.com/pro/10316/wow-entertainment-inc./service/551/authentic-mini-golf)).
4. **Putt-Putt bank geometry (ace always possible).** A dogleg or zig-zag lane with straight rails, where one exact two-cushion bank line reaches the cup. Geometry: an L or Z lane 0.9 m wide with hard, square rails and the cup placed so that the bank line obeys angle in equals angle out. Use it as the last part of a multi-part hole so experts can still ace it. ([Wikipedia: Putt-Putt Fun Center](https://en.wikipedia.org/wiki/Putt-Putt_Fun_Center))
5. **Contoured punchbowl or ridge green (PopStroke style).** The final tier is a real green with no walls inside it: a ridge splits it into two tiers, a bunker guards the short side, and the cup is placed near the ridge crest. The player must read break and pace instead of banking. Geometry: a heightfield green about 4 x 3 m with a 0.15 m ridge, one shallow bunker (a slow surface) and a 1-2% background tilt. ([Golf Monthly](https://www.golfmonthly.com/news/tiger-woods-unveils-two-new-putting-courses), [InsideHook](https://www.insidehook.com/culture-texas/tiger-woods-designed-putting-experience-houston-popstroke/amp))
6. **Loop-de-loop exit.** A banked half-pipe loop needs a minimum entry speed. Too slow and the ball falls back to the start of the section, which is a pace test. Geometry: an entry ramp, then a vertical loop of radius r that needs entry speed of at least sqrt(5gr) in the sim, then an exit onto a lower tier ([This Old House](https://www.thisoldhouse.com/?p=70223)).

**Pacing rule from real courses:** early holes use gentle slopes and straightforward shots, and later holes add tricky obstacles. Every hole should have at least one obstacle that blocks the direct path, plus at least one turn ([Genesis design challenge PDF](https://genesisinvitational.com/wp-content/uploads/sites/19/2021/01/Design_challenge_singleweek_Golf_engv3pdf.pdf)).

## Caveats
- Ball attributes and wind in Golf Clash were not documented in any reliable source, so they are not used here.
- The Wii Sports Resort, Clubhouse Games 51 and Putt-Putt mobile searches turned up little specific mechanic detail.
- Item 14 (stroke-budget gauntlet) sits close to the "no fail states" rule in CLAUDE.md. It needs a product decision.
- Item 9 needs the date read kept outside `#region sim`. It should only seed hole and modifier selection.
