# Real putting physics for PuttX: model, parameters and tests

## Key numbers

- **Skid.** After the putter strikes it, a ball skids until it rolls. With no starting spin it then rolls at exactly 5/7 of its launch speed, and 2/7 of its kinetic energy is gone [11]. In PuttX today the ball keeps 92% of its speed and almost all its energy, which is not realistic.
- **Felt speed.** PuttX felt (mu 0.0465) works out to a Stimp reading of 12.0 ft, which is a fast tournament green [1][3].
- **Cup capture.** Holmes (1991) found that a dead-centre ball must arrive at 1.626 m/s or less to drop [4]. My rigid 3D rim simulation reproduces this (1.62 to 1.66 m/s). With PuttX's sizes (ball 0.0255 m, cup 0.099 m) it predicts **2.71 m/s** dead centre when the rim restitution is 0. That is higher than today's CAP_V0 of 2.1, and higher than Penner's simple formula (2.39).
- **Walls.** A rolling ball that hits a wall at centre height comes off "flatter" and slower. Head-on it keeps only 27% to 53% of its speed, depending on wall friction, and it hops about 1.4 to 1.7 cm at 2 m/s. A 45 degree shot leaves at about 29 degrees. Today it leaves at 40 degrees (specular).
- **Distance calibration.** Multiply MIN_V and MAX_V by 1.209 (giving 0.339 and 5.162 m/s). Every power then rolls the same distance on flat felt as today (17.6 m at full power), and speeds match today's everywhere past the skid zone.

---

## 1. Putter-ball impact and skid

**Facts**
- Standard putter loft is about 3 degrees. Launch angles of about 2 degrees suit fast greens and 3 to 4 degrees slow ones. The ball launches at roughly 85% of the effective loft [10].
- Quintic's ideal is a launch angle under 1.5 degrees, side spin under 10 rpm, and "zero skid" after 10% to 25% of the total distance, depending on the surface [9].
- Initial roll in Quintic's bands is 15 to 75 rpm [9]. For comparison, true roll at 2 m/s is v/r = 93.7 rad/s, about 895 rpm (my calculation, r = 0.02135 m). So the ball leaves the face spinning at only 2% to 8% of true roll.
- A putter can add at most about 28% of true-roll topspin [10].

**Equations** (sphere, I = 2/5 m r^2, sliding friction mu_s, contact-point slip u = v + w x (-r n))
- While sliding: dv/dt = -mu_s g u_hat. The spin changes so that |u| falls at (7/2) mu_s g. The 7/2 is the sphere's effective-mass factor (Han's "A = 7/2/m" [14]).
- Rolling speed at the end of the skid: v_roll = (5 v0 + 2 r w0)/7, with w0 > 0 for topspin [11].
- Skid distance for w0 = 0: d_s = 12 v0^2 / (49 mu_s g) [11].
- Skid fraction with constant rolling resistance mu_r: f = [12/(49 mu_s)] / [12/(49 mu_s) + 25/(98 mu_r)]. This does not depend on speed.
- On a slope, a skidding ball feels the full g sin(theta), not 5/7 of it. The 5/7 only appears once the ball rolls. A spin state handles this automatically.

**Sliding friction values**
- Billiard ball on cloth: mu_s = 0.2 [11][15].
- Inverting Quintic's 10% to 25% skid fraction for a Stimp 10 green (mu_r = 0.056) gives mu_s of 0.16 to 0.49 (my inversion).
- I found no direct measurement of mu_s on grass or carpet. An IYPT student solution lists 0.23 for carpet, but I could not open the file.
- **Recommendation:** mu_s = 0.25 on felt. That gives a 15.1% skid fraction at every power, inside Quintic's range.

## 2. Rolling resistance, Stimp and slopes

- **Stimpmeter.** A 30-inch V-groove ramp at 20 degrees. The ball leaves it at about 1.83 m/s, and the Stimp number is how far it rolls on level ground [1][2].
- **Penner's model** (summarised by Grober [1]): the resisting force acts at a point a distance rho ahead of the ball's centre, with F_d/(m g) = (5/7)(rho/R) cos(theta).
- So the deceleration is a_r = v_s^2 / (2 d_s). Trajectories depend only on the product of Stimp and slope [1].

| Surface | Stimp (ft) | a_r (m/s^2) | mu_eff = a_r/g |
|---|---|---|---|
| Slow green [3] | 8 | 0.687 | 0.070 |
| Stimp 10 | 10 | 0.549 | 0.056 |
| Fast green [3] | 12 | 0.458 | 0.047 |
| **PuttX felt** | **12.05** | 0.456 | 0.0465 |
| PuttX fast | 22.6 | 0.243 | 0.0248 |
| PuttX ice | 93 | 0.059 | 0.006 |
| Billiard cloth (mu_r 0.01 [11]) | 56 | 0.098 | 0.01 |

The last three columns are computed from the Stimp formula above.

- Synthetic putting turf is sold at Stimp 10 to 13, but those are supplier claims.
- I found no measured value for WMF Beton or Eternit lanes. For context, concrete lanes are 12 m x 1.25 m [20], and felt lanes are 0.90 m wide with borders up to 8 cm and 0.10 m holes [21].
- **Slope.** A rolling ball decelerates at a = (5/7) g sin(theta) downslope + mu_r g cos(theta) against its motion. That is what PuttX does now; keep it.
- **Holding on a slope.** In the rho model a ball at rest stays put if tan(theta) < rho/R = 1.4 mu_r. That is 3.7 degrees on felt. Today's STATIC_MU of 0.1 allows 5.7 degrees.
- **Speed dependence.** Penner and Grober treat mu_r as constant [1]. Keep it constant.

## 3. Cup capture

**Real cup**
- Ball r = 0.021 m, hole R = 0.054 m [4].
- WMF holes may be no wider than 120 mm [19].

**Published results**
- Penner's simple criterion: the ball's centre must fall one ball radius while crossing. That gives v_c = (2R - r) sqrt(g/(2r)) = 1.31 m/s [7]. The source writes sqrt(g/2R), but 1.31 m/s only comes out if that R is the ball radius, so that looks like a typo.
- Holmes: 1.626 m/s [4]. Hurrion credits Holmes with 1.31 m/s [8], which looks like a mix-up with Penner.
- Hogan and Antali (2025) [4]:
  - Below c1(delta) = sqrt(g r / (1 - delta^2/R^2)) the ball rolls over the near edge on the rim instead of flying across the hole.
  - There are two kinds of lip-out: a rim lip-out (the centre stays above the green) and a hole lip-out (the ball dips in, then spins back out). Both come from saddle equilibria on the rim.
  - They did not analyse the ballistic case where the ball strikes the far rim.
- Measured entry speeds in Hurrion's test were 0.23 to 0.71 m/s, aiming 0.30 m past the hole [8].

**My 3D rigid-contact simulation**
- Contact set: the green outside the hole, the rim edge (a torus), the cup wall (a cylinder) and the floor. Impulse contacts with Coulomb friction 0.4.
- Real sizes, dead centre: 1.66 m/s at rim restitution 0, 1.62 at 0.5. Both are within 2% of Holmes.
- **PuttX sizes** (e_rim = 0, 960 Hz):

| delta/R | 0 | 0.2 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.85 | 0.9 | 0.95 | 0.98 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| v_cap (m/s) | 2.71 | 2.54 | 2.28 | 2.11 | 1.93 | 1.68 | 1.29 | 0.94 | 0.71 | 0.51 | 0.33 |
| today's rule | 2.10 | 2.08 | 2.01 | 1.95 | 1.88 | 1.78 | 1.63 | 1.52 | 1.39 | 1.17 | 0.94 |

- Fit: v_cap ≈ 2.71 (1 - (delta/R)^2)^0.75, within about 0.1 m/s.
- c1 (the rim-rolling limit, dead centre) = 0.50 m/s.
- Dimensional check: v_c = sqrt(g r) F(R/r). F(2.53) = 3.55 for real sizes, F(3.88) = 5.4 for PuttX.

**Outcomes when the ball is too fast**
- Dead centre: just above 2.71 m/s the ball rides over the back and dribbles out slowly. At 2.8 m/s it leaves at 0.13 of its entry speed, at 4.27 m/s at 0.54, and at 5.16 m/s at 0.68, always straight ahead.
- Off centre, lip-outs swing the ball 17 to 57 degrees round the cup and keep 55% to 100% of its speed. They happen naturally, with no special rule.
- With e_rim = 0.5 the dead-centre result stops being a single threshold. Between 2.63 and 3.3 m/s the ball pops back toward the player, then some higher speeds drop in again.
- **Recommendation:** e_rim = 0. It matches Holmes and the result has a single threshold, which suits the solver.

**Cup radius as a tuning lever** (dead centre, e_rim 0.5)

| CUP_R (m) | 0.064 | 0.07 | 0.08 | 0.09 | 0.099 |
|---|---|---|---|---|---|
| v_cap (m/s) | 1.77 | 1.91 | 2.16 | 2.42 | 2.64 |

## 4. Walls, posts and movers

**Contact height.** A billiard cushion meets the ball above its centre: sin(theta_c) = h/R - 1 [14]. Mini golf rails are taller than the ball, so the contact is at the ball's equator (theta_c = 0).

**Closed form for a rolling ball hitting a wall at centre height**

Write v_n and v_t for the incoming speed normal to and along the wall, e for the wall's restitution and mu_w for its friction.

1. At the contact point, rolling spin makes the ball's surface slide *downward* at |v_n| and sideways at v_t.
2. Friction impulse: F = min(mu_w (1+e) m |v_n|, (2/7) m s), opposite the slip, where s = sqrt(v_t^2 + v_n^2). The 2/7 is the same sphere factor as Han's code [14] and Biber's slip criterion [17].
3. Hop: v_y = F_y/m. Head-on, with friction that sticks (mu_w (1+e) ≥ 2/7), v_y = (2/7)|v_n|. Height = v_y^2/(2g), which is 1.7 cm at 2 m/s.
4. After the ground skid settles, the normal speed is v_fn = (5 e |v_n| - 2 r w_t')/7, where r w_t' = |v_n| - (5/2) F_y/m. The speed along the wall is v_ft = v_t - (5/7) F_t/m.
5. Head-on results: with no wall friction, v_out = (5e - 2)/7 v, which is **0.271 v** at e = 0.78. With sticking friction, v_out = (5e/7 - 4/49) v, which is **0.476 v**.

A 240 Hz simulation of this impact matched the closed form within 1%.

**By material**

| Rail | e | Head-on keep | 45 deg in: out angle | 45 deg speed kept |
|---|---|---|---|---|
| Steel, stone, concrete | 0.85 | 0.53 | 32.0 | 0.68 |
| Hardwood (estimate) | 0.75 | 0.45 | 27.4 | 0.66 |
| Plastic | 0.70 | 0.42 | 25.0 | 0.65 |
| Rubber | 0.59 | 0.34 | 19.4 | 0.63 |

All rows use mu_w = 0.2.

**Where the inputs come from**
- Golf ball restitution: 0.87 on granite and 0.59 on rubber sheet at 4 m/s [16]; 0.858 on concrete (student drop test) [23].
- The WMF limits balls to an 85 cm bounce from 1 m on concrete, which is e ≤ 0.92 [19].
- Billiard rail with a rolling ball: e = 0.7 [11]. The Mathavan cushion: e = 0.98, friction 0.14 [13]. pooltool defaults: e_c = 0.85, f_c = 0.2 [15].
- I found no measured value for a golf ball on wood.

**Sanity check.** Alciatore measured slow rolling pool balls (different contact height): 40 degrees in gave 25.2 out, and 50 in gave 35.7 out [12]. The e = 0.85, mu_w = 0.2 row tracks his whole 10 to 80 degree series within about 3 degrees.

**Posts and movers**
- Posts use the same impulse with a radial normal.
- Movers use the same impulse on the relative velocity: u = (v - v_surf) + w x r_c, where v_surf = Omega x (p - hub) for spinning arms.
- Bumpers with e > 1 stay a deliberately unphysical toy.

## 5. Landing, sand and water

**Bounce rule.** Use a rigid bounce with restitution e_n and Coulomb friction. The ball slides through the whole bounce if |u_t/v_n| > (7/2) mu (1+e) [17].
- Turf restitution depends on speed [17].
- In over 1,000 bounces measured on a green, even rolling balls usually lift off still slipping [18].

**Ramp jumps.** A ball that leaves a crest while rolling keeps its spin in flight. On flat ground it therefore lands with zero slip and loses only vertical speed. Today the sim strips 5% of horizontal speed on every bounce.

**Backspin checks.** These only happen when the ball has backspin, for example after a wall hop.

**Values**
- Felt or carpet: e = 0.5, the current value. It sits between rubber (0.59) and granite (0.87) [16].
- Sand: no measurement found. PGA 2000's course tools use 0.05 [26], but that is a tuning value.
- Water: a sphere skips only below 18°/sqrt(sigma) [27]. For a golf ball (45.93 g, r = 21.35 mm, so sigma = 1.13) that is 17 degrees. Keep water as a hazard.

## 6. Grain and nap

- Balls roll faster with the grain and slower against it, and grain changes break. Grain lying toward the player looks darker, away from the player lighter [24].
- Stimpson (1937), measuring in inches: 16 against the grain vs 26 with it at Oak Hill. Just after mowing at Oyster Harbors: 27 with the cut vs 21 against it [25].
- Model: mu_r(phi) = mu_r0 (1 - k cos(phi - phi_g)). The Oyster Harbors data gives k ≈ 0.12. Add a lateral push along the grain of k_l mu_r0 g sin(phi - phi_g), with k_l at most 0.05. **k_l is a tuned value, not measured.**
- Tie phi_g to the rendered mow stripes, so the look and the roll agree.

## 7. Ball to ball

There is no golf-ball data. For billiard balls: e_b = 0.94 to 0.95 and mu_b = 0.05 to 0.06 [11][15]. This only matters if hot-seat multiplayer lands.

## 8. Numerics at a fixed 240 Hz

- Store the angular velocity as a 3-vector. The extra cost is about 50 flops per step.
- Find the ground normal from the gradient: n = (-h_x, 1, -h_z) / sqrt(1 + |grad h|^2). The ball's centre sits at h + r/cos(theta).
- The friction step is one closed-form impulse. No iteration is needed.
- Substep 4x within R + 2r of the cup. At 240 Hz the dead-centre capture speed comes out 3% high (2.72 vs 2.63); at 960 Hz it is 0.4% high.
- **Determinism across engines.** ECMAScript does not pin down Math.sin, cos, exp, hypot or pow (and so `**`); only sqrt is exact [28]. So Node (V8) and iPad Safari (WebKit) can differ in the last bits, and shot codes or ghosts could drift on chaotic shots.
  - Use Math.sqrt(x*x + z*z) instead of hypot, sqrt(sqrt(x)) instead of x ** 0.25, and x*x instead of ** 2.
  - Bumps already use Math.exp and movers use sin and cos, so they carry the same risk today.

---

## (a) State vector and per-step algorithm

**State:** p (centre, 3D), v (3D), w (3D), mode ∈ {ground, air, cupZone, tube}, still, hits.

```
impulse(b, n, e, mu, vs = 0):            // walls, posts, movers, cliffs, rim, landings
  rc = -r n;  u = (b.v - vs) + b.w x rc;  un = u.n;  if un >= 0: return 0
  ee = (-un > E_MIN = 0.15) ? e : 0
  Jn = -(1 + ee) un;  ut = u - un n;  s = |ut|
  Jt = s > 0 ? -min(mu Jn, (2/7) s) * ut/s : 0      // per unit mass
  b.v += Jn n + Jt;  b.w += (rc x Jt) * (m / I)     // m/I = 2.5 / r^2
  return -un

stepGround:
  n = normal(h, x, z); c = n.y
  v += (g_vec - (g_vec.n) n + push) dt              // gravity in the tangent plane
  u = v + w x (-r n); u -= (u.n) n
  if (2/7)|u| <= mu_s(surf) g c dt: J = -(2/7) u    // stick: rolling
  else J = -mu_s g c dt * u/|u|                      // skid
  v += J; w += (-r n x J) * 2.5/r^2
  if rolling: scale v_t and the rolling part of w by max(0, |v_t| - mu_r(surf, dir) g c dt)/|v_t|
  decay w.n (spin about the normal)
  p += v dt; walls/posts/movers via impulse(e_mat, mu_w = 0.2); hop (v_y > 0.15 m/s) -> air
  crest or no floor -> air (keep w); water -> oob; tube; within R + 2r of cup -> cupZone
  stop if |v| < STOP_V and tan(theta) < 1.4 mu_r (or SETTLE_T)

stepAir:  v.y -= g dt; p += v dt; collide; on ground contact: impulse(n, e_land, mu_s); |v.n| small -> ground
stepCupZone (4 substeps): gravity; contact with whichever of plane | torus edge | cylinder wall | floor
  applies, using impulse(e_rim = 0, mu = 0.4); sunk when p.y < -r (ball top below the rim)
```

Remove LIP_PULL, HOP_KEEP, LIP_TURN, LIP_KEEP and CAP_CREEP. The physics produces those behaviours itself.

## (b) Parameter table

| Parameter | Real value | PuttX recommendation |
|---|---|---|
| Ball r, cup R | 0.021, 0.054 m [4] | 0.0255, 0.099 (or 0.08 to keep 2.1 m/s capture) |
| I/(m r^2) | 2/5 [4] | 0.4 |
| Stimp exit speed | 1.83 m/s [1] | (for tests) |
| mu_r: felt, fast, ice, sand, mud | greens 0.047 to 0.070 (computed) | 0.0465, 0.0248, 0.006, 0.248, 0.465 (keep) |
| mu_s: felt, fast | cloth 0.2 [11]; greens 0.16 to 0.49 (derived) | 0.25 |
| mu_s: ice, sand, mud | none found | 0.05, 0.5, 0.6 (tuned) |
| Launch spin r w0/v0 | 0.02 to 0.08, max 0.28 [9][10] | 0, constant for every putter |
| Launch angle | 1 to 4 degrees [9][10] | 0 in the sim (visual only) |
| e_wall | 0.59 to 0.87 [16][23] | steel 0.85, wood 0.75, plastic 0.70, rubber 0.59 |
| mu_wall | 0.14 [13], 0.2 [15] | 0.2 |
| e_rim, mu_rim | fitted to 1.626 m/s [4] | 0, 0.4 |
| e_land | turf varies with speed [17] | felt 0.5, sand 0.05 (tuned), ice 0.7 (tuned) |
| Grain k | about 0.12 [25] | 0.05 to 0.12; k_l at most 0.05 (tuned) |

## (c) Predicted behaviours the tests can check

1. **Flat felt:** the rest distance for every power is unchanged within 1%. Full power rolls 17.6 m.
2. **Skid:** with w0 = 0, v_roll = 5/7 v0 within 0.5%. Skid distance is 12 v0^2/(49 mu_s g): 2.66 m at full power, 15.1% of any putt.
3. **Slope:** on a 5% grade, uphill deceleration is 0.805 m/s^2 and downhill 0.106. A resting ball holds at 3.5 degrees and rolls away at 4.0 degrees on felt.
4. **Cup:** dead centre captures up to 2.71 ±0.05 m/s. Use the offset table above. With real sizes the limit is 1.66 ±0.05 (Holmes 1.626). Rim rolling starts below 0.50 m/s.
5. **Wall:** head-on at 2 m/s (e 0.78, mu_w 0.2), the ball comes back at 0.476 v after the skid and hops about 1.4 cm. With mu_w = 0 it comes back at 0.271 v with no hop. At 45 degrees in, it leaves at 28.8 degrees with 0.662 of its speed.
6. **Crest jump:** a rolling ball that lands on flat ground loses less than 1% of its horizontal speed.
7. **Energy:** never rises, except in push zones and on bumpers.
8. **Determinism:** the same result bit for bit twice, and in Node and Chromium alike.

## (d) Gameplay risks and calibration

1. **Distance.** Scale MIN_V and MAX_V by k = sqrt(0.9643/0.6598) = 1.209, giving 0.339 and 5.162 m/s.
   - Speeds are then identical to today's everywhere past the skid zone, because both models obey v^2 = 2 a_r (D - x) there.
   - Inside the first 2.66 m the ball is up to 21% faster, so walls, movers and ramps near the tee feel it.
   - It moves 2.15 cm per step, well under a wall's reach of 7.55 cm, and V_CAP is unchanged.
   - Lowering mu_r instead would need Stimp 18. Reject that.
2. **Banks get deader and flatter.** Bank-shot holes, mirror-angle lines and auto-sink paths all need re-solving.
   - Design lever: give each wall a material, and optionally a contact height using Han's sin(theta) = h/R - 1. At h = 7R/5 a rolling ball rebounds still rolling, with no skid loss. That gives lively "cushion" rails and stays physical.
3. **The cup is more generous dead centre and stricter at the edges.** Averaged over offsets the capture speed is 1.91 vs 1.84 m/s, about 4% more.
   - Removing the 0.25 m pull costs some captures that were nearly in.
   - Re-run the bot. If aces go above 4%, shrink CUP_R to 0.09 or 0.08.
4. **Hops.** e_rim = 0 keeps the result a single threshold.
5. **Cost.** Expect roughly 1.3 to 1.5 times the solver time: the spin math plus 4x substeps near the cup.
6. **Putters.** Launch spin is sim state, so the pro shop's FEEL must not change it.

## Caveats

- I could not open Holmes 1991 or Penner 2002 directly. Their numbers come through [4] and [7].
- Wood restitution and every sand, mud and ice coefficient are estimates. So are k_l and the carpet values.
- Two documentation slips in the repo:
  - SPEC.md says the ball's radius is 0.051, but the code uses 0.0255. 0.051 is the diameter.
  - The comment on SKID_END in src/game.js says the ball sheds 12%, but the value 0.92 means 8%.

## Files

My checking scripts are in a scratch folder during research (not kept in the repo):
- `cup.py`: the 3D rim model
- `scan.py`: speed sweeps over the rim model
- `offc.py`: capture speed by offset
- `wall.py`: wall impacts, simulated and closed form

## Sources

1. Grober, *The Geometry of Putting on a Planar Surface*, Appendix A: https://arxiv.org/abs/1106.1698
2. Stimpmeter: https://en.wikipedia.org/wiki/Stimpmeter
3. Golf.com on Stimp: https://golf.com/instruction/what-is-stimp-stimpmeter-how-work/
4. Hogan and Antali, *Mechanics of the golf lip out*, R. Soc. Open Sci. 2025: https://pmc.ncbi.nlm.nih.gov/articles/PMC12585879/
5. Holmes, Am. J. Phys. 59:129 (1991), as cited in [4] and [6]
6. Rod Cross, Physics of Golf: https://www.physics.sydney.edu.au/~cross/GOLF/GOLF.htm
7. Penner 2002, via a Stan case study: https://discourse.mc-stan.org/uploads/short-url/tfw6u1hU6Xm0usC2I5QUJkulPCl.html
8. Hurrion, golf ball speed at hole entry: https://www.paulhurrion.com/tuition/an-investigation-into-golf-ball-speed-at-hole-entry/
9. Quintic, Ball Roll numbers explained: https://www.quintic.com/downloads/Quintic%20Ball%20Roll%20-%20Numbers%20Explained.pdf
10. Science and Motion, Fundamentals of Putting 4: https://www.scienceandmotion.com/download/docs/fundamentals/The%20Fundamentals%20of%20Putting4.pdf
11. Alciatore, TP B.6: https://billiards.colostate.edu/technical_proofs/new/TP_B-6.pdf (also TP A.6 and B.8 for ball-to-ball)
12. Alciatore, TP B.11: https://billiards.colostate.edu/technical_proofs/new/TP_B-11.pdf
13. Mathavan et al. 2010: https://dspace.lboro.ac.uk/2134/15087
14. Han 2005: https://link.springer.com/article/10.1007/BF02919180 and the pooltool implementation: https://github.com/ekiefl/pooltool/blob/main/pooltool/physics/resolve/ball_cushion/han_2005/model.py
15. pooltool ball parameters: https://github.com/ekiefl/pooltool/blob/main/pooltool/objects/ball/params.py
16. Cross, *Enhancing the bounce of a ball*: https://www.physics.usyd.edu.au/~cross/PUBLICATIONS/48.%20EnhanceBounce.pdf
17. Biber 2022: https://arxiv.org/abs/2208.11685
18. Biber et al. 2023: https://doi.org/10.1007/s12283-023-00442-4
19. International rules 2.1 (2026): https://oemgv.at/uploads/pdf/regelwerk/2.1_InternationaleSpielregeln_2026-01.pdf
20. DMV NormBeton: https://www.minigolfsport.de/pdf/Download/Regelwerk/s11_normungsbestimmungen_beton-2026-01_rot.pdf
21. DMV NormFilz: https://www.minigolfsport.de/pdf/Download/Regelwerk/s13_Normungsbestimmungen_filzgolf-2026-01_rot.pdf
22. Pingvin Suomi 2 KL minigolf ball (37.5 mm, 32 g, 45 cm bounce): https://pingvin-minigolf.de/Minigolfbaelle/Pingvin/Pingvin-Kooperationen/3D-Pingvin-Suomi-2-KL.html
23. Hypertextbook, coefficients of restitution: https://hypertextbook.com/facts/2006/restitution.shtml
24. Ohio State grain study: https://buckeyeturf.osu.edu/news/putting-green-grain-brushing-study
25. Stimpson 1937: https://archive.lib.msu.edu/tic/golfd/article/1937feb40.pdf
26. PGA 2000 surface properties: https://www.zagerdesign.com/golf_design/tutorials/pga2000/lib_properties.htm
27. Hutchings, on Johnson and Reid's ricochet rule: https://www3.eng.cam.ac.uk/~hemh1/dambusters/ricochet_hutchings1.pdf
28. ECMAScript Math functions: https://tc39.es/ecma262/multipage/numbers-and-dates.html