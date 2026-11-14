// A hole in play: the round, the hole clock, and the ball, stepped at the sim's fixed 240 Hz from a
// display link (120 Hz on ProMotion). It runs PuttRun, the exact code the parity tests hold to JS, so a
// putt here ends exactly where the solver says it does. Movers keep turning while the player aims; one
// that shoves a resting ball starts a drift (no stroke), as on the web.
import SwiftUI
import QuartzCore
import PuttXCore

@MainActor @Observable
final class HolePlay {
    /// aim, then the putt (roll, or drift when a mover shoves a resting ball); a holed ball sinks (a
    /// ball at the stroke cap is rolled in first), then the hole is done
    enum Phase: Equatable { case aim, roll, drift, auto, sinking, replay, done }

    let hole: Hole
    let look: CourseLook
    private(set) var round: Round
    private(set) var phase: Phase = .aim
    /// the hole clock: where the movers are
    private(set) var time = 0.0
    /// the ball now (bottom of the ball at y); nil while it is inside a tube
    private(set) var ball: Ball
    private(set) var lastOutcome: PuttOutcome?
    /// where the putter points, in degrees (0 = +z); the course drag and the aim buttons turn it
    var aim: Double
    /// the last stroke, for the pad's trace and the shot readout
    private(set) var lastStroke: Stroke?
    /// every putt as logged (angle, power, hole time), rounded as the web rounds them: replays, ghosts
    /// and shared shots roll from exactly this
    private(set) var log: [[Double]] = []
    /// the finished hole's record, once it is banked
    var record: HoleRecord?
    /// the swing pad's live gesture: how far back the finger has pulled (stage px) and how far to the
    /// side of the touch (stage px), for the putter and the power ring; nil when nobody is swinging
    var swing: (back: Double, side: Double)?
    /// the whole hole from above instead of the aim view
    var overview = false
    /// when the putter met the ball (the follow-through), in display time
    private(set) var struckAt: CFTimeInterval?
    /// the putter's pose at contact, for the follow-through
    @ObservationIgnored var contactPose: (x: Double, y: Double, z: Double, aim: Double, speed: Double)?
    /// the 3D view publishes where the cup is on screen (points) for the distance tag; nil when off screen
    var pinOnScreen: CGPoint?

    // MARK: the extras (src/game.js 6c)
    /// the hole of the day: its date (no mulligans on it)
    var daily: String?
    /// a border or post touched by a putt this hole (the clean goal)
    private(set) var touched = false
    /// the ghost: your best run of this hole, stroke for stroke. When you strike putt k it strikes its
    /// putt k from where its own ball lies, on the same physics (src/game.js 6b)
    struct Ghost { var log: [[Double]]; var k = 0; var ball: Ball; var live = false; var t = 0.0; var done = false; var from: Vec2?; var auto = false; var wait = 0.0 }
    private(set) var ghost: Ghost?
    func setGhost(_ log: [[Double]]?) {
        guard let log, !log.isEmpty, log.allSatisfy({ $0.count == 3 && $0.allSatisfy(\.isFinite) }) else { ghost = nil; return }
        ghost = Ghost(log: log, ball: Ball(hole, hole.tee.x, hole.tee.z))
    }
    private func ghostPutt(_ k: Int) {
        guard var g = ghost, k < g.log.count, !g.done else { return }
        let e = g.log[k]
        g.from = Vec2(g.ball.x, g.ball.z)
        var b = Ball(hole, g.ball.x, g.ball.z); b.launch(e[0], e[1])
        g.ball = b; g.t = e[2]; g.live = true; g.k = k + 1
        ghost = g
    }
    private func stepGhost() {
        // the guide plays its whole line by itself, with a breath between putts
        if var g = ghost, g.auto, !g.live, !g.done, g.k < g.log.count {
            g.wait -= Sim.SIM_DT; ghost = g
            if g.wait <= 0 { ghostPutt(g.k) }
            return
        }
        guard var g = ghost, g.live else { return }
        let end = hole.step(&g.ball, g.t); g.t += Sim.SIM_DT; g.ball.hits.removeAll(keepingCapacity: true)
        if let end {
            g.live = false; g.wait = 0.6
            if end == .sunk { g.done = true }
            if end == .oob { let f = g.from ?? Vec2(g.ball.x, g.ball.z); g.ball = Ball(hole, f.x, f.z) }
            else if end == .stop { let r = hole.restSpot(g.ball.x, g.ball.z); g.ball = Ball(hole, r.x, r.z) }
        }
        ghost = g
    }
    /// whether the ghost shows: after its first putt, out of tubes, until it has dropped
    var ghostVisible: Bool { guard let g = ghost else { return false }; return g.k > 0 && g.ball.tube == nil && !(g.done && !g.live) }

    /// the last putt, to take back with a mulligan token
    private struct Undo { let round: Round; let aim: Double; let touched: Bool; let logCount: Int; let ghost: Ghost? }
    @ObservationIgnored private var undo: Undo?
    private(set) var canTakeBack = false
    /// the hole's gold lost ball: where it lies (nil: none, or not looked for yet) and whether it is found
    private(set) var lostSpot: Vec2?
    private(set) var lostSearched = false
    var lostGot = false
    /// the lost ball was just picked up (the HUD's pop)
    private(set) var lostPop = false
    @ObservationIgnored var onLost: (() -> Void)?
    /// what the effects layer should show (PlayFX drains it each frame)
    enum Fx { case squash, puff(kind: String, at: SIMD3<Double>, n: Int), shake(Double), sinkRing, burst(at: SIMD3<Double>, n: Int) }
    @ObservationIgnored var fx: [Fx] = []
    /// the ace replay: the same putt again from a low angle beside its line, at 70% speed; a tap skips
    @ObservationIgnored private var wantReplay = false
    struct Replay { var ball: Ball; var t: Double; var acc = 0.0; var done = false; var end = 0.0; let side: Double }
    private(set) var replay: Replay?
    private func startReplay() {
        guard let e = log.first else { return }
        var b = Ball(hole, hole.tee.x, hole.tee.z); b.launch(e[0], e[1])
        replay = Replay(ball: b, t: e[2], side: Bool.random() ? 1 : -1)
        ball = b; hitsHeard = 0
        phase = .replay
    }
    private func stepReplay(_ dt: Double) {
        guard var r = replay else { return }
        r.acc += dt * 0.7
        while r.acc >= Sim.SIM_DT && !r.done {
            r.acc -= Sim.SIM_DT
            if hole.step(&r.ball, r.t) != nil { r.done = true }
            r.t += Sim.SIM_DT
        }
        hear(r.ball.hits)
        if r.done {
            r.end += dt
            let k = min(1, r.end / 0.22), dx = r.ball.x - hole.cup.x, dz = r.ball.z - hole.cup.z, d = max(1e-9, hypot(dx, dz)), rr = Sim.CUP_R - Sim.BALL_R - 0.006
            let rx = hole.cup.x - dx / d * rr * 0.6, rz = hole.cup.z - dz / d * rr * 0.6
            r.ball.x += (rx - r.ball.x) * k; r.ball.z += (rz - r.ball.z) * k
            r.ball.y = hole.groundH(hole.cup.x, hole.cup.z) - (Sim.CUP_SINK - 0.004) * k * k
        }
        replay = r; ball = r.ball
        if r.done && r.end > 0.9 { endReplay() }
    }
    /// any tap ends the replay
    func endReplay() {
        guard phase == .replay else { return }
        replay = nil
        phase = .done
        onFinish?(round.score ?? Scoring.cap(hole))
    }
    /// the goals met at the finish (bits), and which were new
    var goals: (all: Int, fresh: Int)?
    /// practice: nothing counts, mulligans are free, and the guide can show the proven line
    var practice = false
    var canGuide: Bool { practice && !party && phase == .aim && intro == nil && !hole.data.sol.isEmpty }
    /// show me: a green ghost plays the hole's proven line (its par, by the solver) from the tee
    func showGuide() {
        guard canGuide else { return }
        ghost = Ghost(log: hole.data.sol.map { [$0[0], $0[1], $0.count > 2 ? $0[2] : 0] }, ball: Ball(hole, hole.tee.x, hole.tee.z), auto: true)
        ghostPutt(0)
        SFX.tubeOut()
    }
    /// the putt tracer: the last putt's whole line, painted on the green until the next (x, y, z, speed;
    /// nil where a tube broke it). `traced` counts each finished line, for the view to redraw
    @ObservationIgnored private(set) var trace: [SIMD4<Double>?] = []
    private(set) var traced = 0
    private(set) var traceShown = false
    private func recordTrace() {
        let b = ball
        if b.tube != nil { if let l = trace.last, l != nil { trace.append(nil) }; return }
        let p = SIMD4(b.x, b.y, b.z, hypot(b.vx, b.vz))
        if let l = trace.last { if let l, hypot(b.x - l.x, b.z - l.z) <= 0.025 { return } }
        trace.append(p)
    }
    /// the slope read: arrows over the green pointing downhill
    var reading = false
    /// pass and play: no mulligans; the ball wears the player's colour
    var party = false
    var ballTint: String?
    /// the equipped putter and ball
    var gear = (putter: "p1", ball: "b1")
    /// coins the finish paid (finish, under par, ace, first clear, goals, the daily hole)
    var coinsWon = 0

    @ObservationIgnored private var run: PuttRun?
    @ObservationIgnored private var from = Vec2(0, 0)
    @ObservationIgnored private var acc = 0.0
    @ObservationIgnored private var link: DisplayLink?
    @ObservationIgnored var onFinish: ((Int) -> Void)?
    /// what the borders are made of (steel rails ring, timber tocks, stone clacks)
    @ObservationIgnored var wallKind = "wood"
    /// the last hole of a course rings the clubhouse bell
    @ObservationIgnored var lastOfCourse = false
    /// game feel (pacing only; the putt's start time is fixed, so results are the same to the bit):
    /// the hit-stop at contact, slow motion as a slow ball closes on the cup
    @ObservationIgnored private var hold = 0.0
    @ObservationIgnored private var slow = 1.0
    @ObservationIgnored private var hitsHeard = 0
    @ObservationIgnored private var lastHitSound: [HitKind: Double] = [:]
    @ObservationIgnored private var ambientNext = 1.0
    @ObservationIgnored var reduceMotion = false
    /// the drop into the cup (src/game.js startSink and stepSink): a few centimetres of its own physics,
    /// relative to the cup, after the result is already settled
    private struct Sink { var x, z, y, vx, vz, vy: Double; var walls = 0; var floor = false; var below: Bool; var swallowT = 0.0; var gone = false }
    @ObservationIgnored private var sink: Sink?
    @ObservationIgnored private var sinkT = 0.0
    @ObservationIgnored private var autoFrom: Vec2?
    @ObservationIgnored private var autoT = 0.0

    init(hole: Hole, look: CourseLook) {
        self.hole = hole; self.look = look
        round = Round(hole)
        ball = Ball(hole, hole.tee.x, hole.tee.z)
        aim = hole.data.aim0 ?? atan2(hole.cup.x - hole.tee.x, hole.cup.z - hole.tee.z) * 180 / .pi
    }

    /// the hole introduces itself: seconds into the flight from over the cup back to the tee, or nil
    private(set) var intro: Double?
    static let introLength = 2.4
    /// the tee sign (hole, par, map) shows while the hole introduces itself
    private(set) var banner = true
    func skipIntro() { intro = nil; banner = false }

    func start() {
        // the lost ball: where some putt from the tee really stops (about 40 ms of sim), off the main thread
        if !lostGot && !lostSearched {
            let h = hole
            Task.detached(priority: .utility) {
                let spot = LostBall.spot(h)
                await MainActor.run { [weak self] in self?.lostSpot = spot; self?.lostSearched = true }
            }
        }
        if !reduceMotion && intro == nil && round.strokes == 0 { intro = 0 }
        if reduceMotion { DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) { [weak self] in self?.banner = false } }
        guard link == nil else { return }
        link = DisplayLink { [weak self] dt in self?.tick(dt) }
    }
    func stop() { link?.invalidate(); link = nil }

    /// the putter meets the ball: the stroke turns the aim and sets the power
    func strike(_ s: Stroke) {
        skipIntro()
        lastStroke = s
        struckAt = CACurrentMediaTime()
        swing = nil
        overview = false
        if !reduceMotion { hold = s.clean ? 0.045 + 0.04 * s.power : 0.03 }
        SFX.putt(s.power, clean: s.clean)
        Haptics.strike(s.power, clean: s.clean)
        putt(angle: aim + s.turn, power: s.power)
    }

    /// the line the ball would start on: a half-power putt from here through the real physics, sampled
    /// every 2 cm for 1.8 m (src/game.js aimPath). It bends with slopes and banks off walls.
    @ObservationIgnored private var aimCache: (key: String, pts: [SIMD3<Double>])?
    func aimPath() -> [SIMD3<Double>] {
        let moving = !hole.data.movers.isEmpty
        let key = "\(ball.x),\(ball.z),\(jsFixed(aim, 3)),\(moving ? Int((time * 8).rounded(.down)) : 0)"
        if let c = aimCache, c.key == key { return c.pts }
        var s = Ball(hole, ball.x, ball.z)
        s.launch(aim, 0.5)
        var pts: [SIMD3<Double>] = [], t = time, went = 0.0, next = Sim.BALL_R * 3, px = s.x, pz = s.z
        for _ in 0..<2400 {
            let end = hole.step(&s, t); t += Sim.SIM_DT
            if s.tube != nil { break }
            went += hypot(s.x - px, s.z - pz); px = s.x; pz = s.z
            if went >= next { pts.append(SIMD3(s.x, (s.air ? s.y : hole.groundH(s.x, s.z)) + 0.012, s.z)); next += 0.02 }
            if end != nil || went >= 1.8 || (!s.air && hypot(s.vx, s.vz) < 0.3) { break }
        }
        aimCache = (key, pts)
        return pts
    }
    /// a putt at (angle degrees, power 0...1), logged and played exactly as the web's beginPutt does
    func putt(angle: Double, power: Double) {
        guard phase == .aim else { return }
        let a = jsFixed(angle, 3), p = jsFixed(power, 4)
        undo = Undo(round: round, aim: aim, touched: touched, logCount: log.count, ghost: ghost)
        canTakeBack = false
        time = jsFixed(time, 6)
        from = round.at
        log.append([a, p, time])
        run = PuttRun(hole, from: from, angle: a, power: p, t0: time)
        if ghost?.auto != true { ghostPutt(log.count - 1) }
        trace = []; traceShown = false; recordTrace()
        hitsHeard = 0
        phase = .roll
    }

    private func tick(_ dt0: Double) {
        var dt = min(dt0, 0.1)
        ambience(dt)
        if let t = intro { intro = t + dt < HolePlay.introLength ? t + dt : nil; if intro == nil { banner = false } }
        if phase == .replay { time += dt; stepReplay(dt); return }
        if phase == .auto || phase == .sinking {
            time += dt   // the movers keep turning
            if phase == .auto { stepAuto(dt) } else { stepSink(dt) }
            return
        }
        // the hit-stop: the world holds for a beat at contact
        if hold > 0 { hold -= dt; return }
        // a slow ball closing on the cup plays in slow motion
        let near = (phase == .roll || phase == .drift) && ball.tube == nil && hypot(ball.x - hole.cup.x, ball.z - hole.cup.z) < 0.35 && hypot(ball.vx, ball.vz) < 1.2
        slow += ((near && !reduceMotion ? 0.7 : 1) - slow) * min(1, dt * 8)
        dt *= slow
        acc += dt   // a long hitch never fast-forwards a putt
        var steps = 0
        while acc >= Sim.SIM_DT && steps < 64 {
            acc -= Sim.SIM_DT; steps += 1
            stepGhost()
            if var r = run {
                let end = r.step()
                run = r; time = r.t; ball = r.ball
                recordTrace()
                hear(r.ball.hits)
                if end != nil { finish(r); return }
            } else {
                if phase == .aim && !hole.data.movers.isEmpty && hole.moverTouch(ball, time) {
                    from = round.at
                    run = PuttRun(drift: hole, at: from, t0: time)
                    phase = .drift
                    continue
                }
                time += Sim.SIM_DT
            }
        }
        pickUpLost()
        // the roll, heard: it follows the ball's speed and what it rolls on
        if phase == .roll || phase == .drift {
            Synth.shared.roll(speed: ball.air || ball.tube != nil ? 0 : hypot(ball.vx, ball.vz), surface: hole.zoneAt(ball.x, ball.z)?.surf?.rawValue ?? "felt")
        }
    }

    /// sounds (and touches) for what the ball hit since the last step. A ball riding a wall logs a hit
    /// every step, so grazes stay silent and each kind sounds at most every 60 ms (src/game.js drainHits)
    private func hear(_ hits: [Hit]) {
        guard hitsHeard < hits.count else { return }
        for h in hits[hitsHeard...] {
            func once(_ kind: HitKind, _ play: () -> Void) {
                guard h.v >= 0.3, time - (lastHitSound[kind] ?? -1) >= 0.06 else { return }
                lastHitSound[kind] = time; play()
            }
            switch h.kind {
            case .wall, .post:
                if phase == .roll { touched = true }
                once(.wall) { SFX.clonk(h.v, wall: wallKind); Haptics.knock(h.v) }
                if h.v > 0.8 { fx.append(.squash) }
            case .bump, .mover: once(.bump) { SFX.boing(h.v); Haptics.knock(h.v) }; if h.v > 0.8 { fx.append(.squash) }
            case .lip: SFX.lip(); Haptics.knock(1)
            case .rattle: once(.rattle) { SFX.rattle(min(1, h.v)) }
            case .land:
                once(.land) { SFX.land(h.v) }
                if h.v > 0.8 { fx.append(.squash); fx.append(.puff(kind: "dust", at: ballAt, n: min(14, Int(4 + h.v * 4)))) }
                if h.v > 1.6 { fx.append(.shake(min(1, h.v / 4))) }
            case .splash: SFX.splash(); fx.append(.puff(kind: "water", at: ballAt, n: 22))
            case .tubeIn: SFX.tube()
            case .tubeOut: SFX.tubeOut(); fx.append(.puff(kind: "dust", at: ballAt, n: 8))
            }
        }
        hitsHeard = hits.count
    }

    private var ballAt: SIMD3<Double> { SIMD3(ball.x, ball.y, ball.z) }

    /// the course's quiet soundscape: birds by day, crickets by night, now and then
    @ObservationIgnored var birds = 0.6
    @ObservationIgnored var crickets = 0.0
    private func ambience(_ dt: Double) {
        ambientNext -= dt
        guard ambientNext <= 0 else { return }
        ambientNext = 0.6 + Double.random(in: 0..<2.4)
        SFX.ambientCall(birds: birds, crickets: crickets)
    }

    private func finish(_ r: PuttRun) {
        guard let res = r.raw else { return }
        lastOutcome = phase == .drift ? round.resolveDrift(res, from: from) : round.resolvePutt(res, from: from)
        if res.end != .sunk && trace.compactMap({ $0 }).count >= 3 { traced += 1; traceShown = true }
        run = nil
        Synth.shared.roll(speed: 0, surface: "felt")
        switch lastOutcome {
        case .sunk?:
            SFX.cup(); Haptics.cup()
            if round.score == 1 {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { SFX.fanfare() }
                fx.append(.burst(at: SIMD3(hole.cup.x, hole.groundH(hole.cup.x, hole.cup.z) + 0.1, hole.cup.z), n: 120))
                wantReplay = !reduceMotion && log.count == 1 && !party
            }
            if lastOfCourse { let ace = round.score == 1; DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { SFX.bell(ace: ace) } }
            startSink(vx: r.ball.vx, vz: r.ball.vz)
            return
        case .auto?:
            // the stroke cap: the ball rolls itself in, from where it stopped (or where it was struck from)
            autoFrom = res.end == .oob ? from : Vec2(res.x, res.z)
            autoT = 0
            phase = .auto
            return
        case .oob?: SFX.boink()
        default: break
        }
        if round.done {
            phase = .done
            ball = Ball(hole, hole.cup.x, hole.cup.z)
            onFinish?(round.score ?? Scoring.cap(hole))
        } else {
            phase = .aim
            ball = Ball(hole, round.at.x, round.at.z)
            canTakeBack = undo != nil && round.strokes > 0 && daily == nil && !party
        }
    }

    /// whether the lost ball counts as found at the finish: picked up, or the hole has none
    func lostDone() -> Bool {
        if lostGot { return true }
        if !lostSearched { lostSpot = LostBall.spot(hole); lostSearched = true }
        return lostSpot == nil
    }
    /// roll over the gold ball to keep it (src/game.js stepLost)
    private func pickUpLost() {
        guard !lostGot, let s = lostSpot, phase == .roll || phase == .drift, ball.tube == nil, !ball.air,
              hypot(ball.x - s.x, ball.z - s.z) < LostBall.radius else { return }
        lostGot = true
        lostPop = true
        SFX.coin(); DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) { SFX.star(2) }
        Haptics.knock(1)
        onLost?()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) { [weak self] in self?.lostPop = false }
    }
    /// the mulligan: the last putt taken back (ball, count, penalty, aim) for a token
    func takeBack() {
        guard phase == .aim, canTakeBack, let u = undo else { return }
        round = u.round; aim = u.aim; touched = u.touched; ghost = u.ghost
        if log.count > u.logCount { log.removeLast(log.count - u.logCount) }
        ball = Ball(hole, round.at.x, round.at.z)
        undo = nil; canTakeBack = false
        lastStroke = nil
        SFX.tubeOut()
    }

    // MARK: into the cup
    /// where the ball came into the cup from, for the drop camera
    private(set) var sinkFrom: Vec2?
    private func startSink(vx: Double, vz: Double) {
        sinkFrom = Vec2(ball.x - vx, ball.z - vz)
        let cy = hole.groundH(hole.cup.x, hole.cup.z), s = hypot(vx, vz), k = s > 1.4 ? 1.4 / s : 1
        let y = min(0, ball.y - cy), vy = phase == .roll || phase == .drift ? min(0, ball.vy) : 0
        sink = Sink(x: ball.x - hole.cup.x, z: ball.z - hole.cup.z, y: y, vx: vx * k, vz: vz * k, vy: vy, below: y < -Sim.BALL_R * 0.5)
        sinkT = 0
        phase = .sinking
    }
    private func stepSink(_ dt: Double) {
        guard var k = sink else { return }
        let lim = Sim.CUP_R - Sim.BALL_R - 0.003, floorY = -(Sim.CUP_SINK - 0.004), R = Sim.BALL_R
        let n = max(1, Int((dt / Sim.SIM_DT).rounded())), d = dt / Double(n)
        for _ in 0..<n {
            k.vy -= Sim.G * d; k.x += k.vx * d; k.z += k.vz * d; k.y += k.vy * d
            var r = hypot(k.x, k.z)
            // over the lip: it rides the rim's edge and tips in, pulled inward by the tilt
            let e = Sim.CUP_R - r
            if e < R && r > 1e-6 && !k.below {
                let lipY = -(R - max(0, R * R - pow(max(0, e), 2)).squareRoot())
                if k.y < lipY { k.y = lipY; k.vy = max(k.vy, 0) * 0.5 + (lipY - k.y) }
                let pull = Sim.G * 0.6 * min(1, max(0, e) / R + 0.25)
                k.vx -= k.x / r * pull * d; k.vz -= k.z / r * pull * d
                if k.y <= lipY + 1e-6 { k.vy = min(k.vy, -0.05) }
            }
            r = hypot(k.x, k.z)
            // below the rim the liner holds it; at the rim it can ride to the far lip but never back out
            let wall = k.y < -R * 0.9 ? lim : Sim.CUP_R - 0.004
            if r > wall {
                let nx = k.x / r, nz = k.z / r, vn = k.vx * nx + k.vz * nz
                if vn > 0 {
                    k.vx -= 1.5 * vn * nx; k.vz -= 1.5 * vn * nz; k.vx *= 0.9; k.vz *= 0.9
                    if vn > 0.15 && k.walls < 3 { k.walls += 1; SFX.rattle(min(1, vn)) }
                }
                k.x = nx * wall; k.z = nz * wall
            }
            // the last hole keeps your ball: down the drain and away to the clubhouse
            if lastOfCourse && k.floor {
                k.swallowT += d
                if k.swallowT > 0.35 {
                    if !k.gone { k.gone = true; SFX.tube() }
                    k.vy -= Sim.G * d * 0.5; k.y += k.vy * d * 0.5
                    continue
                }
            }
            if k.y < floorY {
                k.y = floorY
                if k.vy < -0.3 {
                    if !k.floor {
                        k.floor = true; SFX.plunk(); Haptics.knock(2)
                        fx.append(.sinkRing); fx.append(.shake(0.18))
                        fx.append(.burst(at: SIMD3(hole.cup.x, hole.groundH(hole.cup.x, hole.cup.z) + 0.04, hole.cup.z), n: 45))
                    }
                    k.vy = -k.vy * 0.32
                } else { k.vy = 0 }
                k.vx *= 1 - min(1, 4 * d); k.vz *= 1 - min(1, 4 * d)
            }
        }
        sink = k
        let cy = hole.groundH(hole.cup.x, hole.cup.z)
        var b = Ball(hole, hole.cup.x + k.x, hole.cup.z + k.z)
        b.y = cy + k.y; b.vx = k.vx; b.vz = k.vz; b.vy = k.vy
        ball = b
        sinkT += dt
        if sinkT > 1.45 || (k.gone && k.y < floorY - 0.12) {
            sink = nil
            if wantReplay { wantReplay = false; startReplay(); return }
            phase = .done
            onFinish?(round.score ?? Scoring.cap(hole))
        }
    }
    /// the stroke cap: an eased glide with a little hop into the cup
    private func stepAuto(_ dt: Double) {
        guard let f = autoFrom else { return }
        autoT += dt
        let t = min(1, autoT / 0.9), e = t * t * (3 - 2 * t)
        let x = f.x + (hole.cup.x - f.x) * e, z = f.z + (hole.cup.z - f.z) * e
        var b = Ball(hole, x, z)
        b.y = hole.groundH(x, z) + sin(t * .pi) * 0.12
        ball = b
        if t >= 1 {
            SFX.cup()
            let d = max(1e-9, hypot(hole.cup.x - f.x, hole.cup.z - f.z))
            if lastOfCourse { DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { SFX.bell(ace: false) } }
            phase = .roll   // so the sink carries the ball's fall in
            startSink(vx: (hole.cup.x - f.x) / d * 0.5, vz: (hole.cup.z - f.z) / d * 0.5)
        }
    }
}

/// CADisplayLink as a closure, asking for the panel's top rate.
@MainActor
final class DisplayLink: NSObject {
    private var link: CADisplayLink?
    private let tick: (Double) -> Void
    private var last: CFTimeInterval = 0

    init(_ tick: @escaping (Double) -> Void) {
        self.tick = tick
        super.init()
        let l = CADisplayLink(target: self, selector: #selector(fire(_:)))
        l.preferredFrameRateRange = CAFrameRateRange(minimum: 60, maximum: 120, preferred: 120)
        l.add(to: .main, forMode: .common)
        link = l
    }
    @objc private func fire(_ l: CADisplayLink) {
        let now = l.targetTimestamp
        if last > 0 { tick(now - last) }
        last = now
    }
    func invalidate() { link?.invalidate(); link = nil }
}
