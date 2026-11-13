// A hole in play: the round, the hole clock, and the ball, stepped at the sim's fixed 240 Hz from a
// display link (120 Hz on ProMotion). It runs PuttRun, the exact code the parity tests hold to JS, so a
// putt here ends exactly where the solver says it does. Movers keep turning while the player aims; one
// that shoves a resting ball starts a drift (no stroke), as on the web.
import SwiftUI
import QuartzCore
import PuttXCore

@MainActor @Observable
final class HolePlay {
    enum Phase: Equatable { case aim, roll, drift, done }

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

    init(hole: Hole, look: CourseLook) {
        self.hole = hole; self.look = look
        round = Round(hole)
        ball = Ball(hole, hole.tee.x, hole.tee.z)
        aim = hole.data.aim0 ?? atan2(hole.cup.x - hole.tee.x, hole.cup.z - hole.tee.z) * 180 / .pi
    }

    func start() {
        guard link == nil else { return }
        link = DisplayLink { [weak self] dt in self?.tick(dt) }
    }
    func stop() { link?.invalidate(); link = nil }

    /// the putter meets the ball: the stroke turns the aim and sets the power
    func strike(_ s: Stroke) {
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
        time = jsFixed(time, 6)
        from = round.at
        log.append([a, p, time])
        run = PuttRun(hole, from: from, angle: a, power: p, t0: time)
        hitsHeard = 0
        phase = .roll
    }

    private func tick(_ dt0: Double) {
        var dt = min(dt0, 0.1)
        ambience(dt)
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
            if var r = run {
                let end = r.step()
                run = r; time = r.t; ball = r.ball
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
            case .wall, .post: once(.wall) { SFX.clonk(h.v, wall: wallKind); Haptics.knock(h.v) }
            case .bump, .mover: once(.bump) { SFX.boing(h.v); Haptics.knock(h.v) }
            case .lip: SFX.lip(); Haptics.knock(1)
            case .rattle: once(.rattle) { SFX.rattle(min(1, h.v)) }
            case .land: once(.land) { SFX.land(h.v) }
            case .splash: SFX.splash()
            case .tubeIn: SFX.tube()
            case .tubeOut: SFX.tubeOut()
            }
        }
        hitsHeard = hits.count
    }

    /// the course's quiet soundscape: birds by day, crickets by night, now and then
    @ObservationIgnored var birds = 0.6, crickets = 0.0
    private func ambience(_ dt: Double) {
        ambientNext -= dt
        guard ambientNext <= 0 else { return }
        ambientNext = 0.6 + Double.random(in: 0..<2.4)
        SFX.ambientCall(birds: birds, crickets: crickets)
    }

    private func finish(_ r: PuttRun) {
        guard let res = r.raw else { return }
        lastOutcome = phase == .drift ? round.resolveDrift(res, from: from) : round.resolvePutt(res, from: from)
        run = nil
        Synth.shared.roll(speed: 0, surface: "felt")
        switch lastOutcome {
        case .sunk?:
            SFX.cup(); Haptics.cup()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.18) { SFX.plunk() }
            if round.score == 1 { DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { SFX.fanfare() } }
            let ace = round.score == 1
            if lastOfCourse { DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { SFX.bell(ace: ace) } }
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
