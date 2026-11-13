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
    /// the finished hole's record, once it is banked
    var record: HoleRecord?

    @ObservationIgnored private var run: PuttRun?
    @ObservationIgnored private var from = Vec2(0, 0)
    @ObservationIgnored private var acc = 0.0
    @ObservationIgnored private var link: DisplayLink?
    @ObservationIgnored var onFinish: ((Int) -> Void)?

    init(hole: Hole, look: CourseLook) {
        self.hole = hole; self.look = look
        round = Round(hole)
        ball = Ball(hole, hole.tee.x, hole.tee.z)
    }

    func start() {
        guard link == nil else { return }
        link = DisplayLink { [weak self] dt in self?.tick(dt) }
    }
    func stop() { link?.invalidate(); link = nil }

    /// strike: angle in degrees (0 = +z), power 0...1
    func putt(angle: Double, power: Double) {
        guard phase == .aim else { return }
        from = round.at
        run = PuttRun(hole, from: from, angle: angle, power: power, t0: time)
        phase = .roll
    }

    private func tick(_ dt: Double) {
        acc += min(dt, 0.1)   // a long hitch never fast-forwards a putt
        var steps = 0
        while acc >= Sim.SIM_DT && steps < 64 {
            acc -= Sim.SIM_DT; steps += 1
            if var r = run {
                let end = r.step()
                run = r; time = r.t; ball = r.ball
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
    }

    private func finish(_ r: PuttRun) {
        guard let res = r.raw else { return }
        lastOutcome = phase == .drift ? round.resolveDrift(res, from: from) : round.resolvePutt(res, from: from)
        run = nil
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
