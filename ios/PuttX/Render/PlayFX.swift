// Game feel, from src/game.js section 8 (FX): the ball's fading trail, its squash on hard hits, dust
// and splash puffs, the camera's shake on a heavy landing, confetti, the ring that runs out from the
// cup when a ball drops, and the flagstick that eases out of the cup and aside as a ball comes near,
// then pops and spins on a make. Decoration only: all of it still under reduced motion.
import Foundation
import RealityKit
import UIKit
import SwiftUI
import PuttXCore

@MainActor
final class PlayFX {
    let root = Entity()
    private struct Bit { let e: ModelEntity; var life = 0.0, max = 1.0; var v = SIMD3<Float>(0, 0, 0); var spin = SIMD3<Float>(0, 0, 0) }
    private var trail: [Bit] = [], confetti: [Bit] = [], puffs: [Bit] = []
    private let ring: ModelEntity
    private var ringT = -1.0
    private var trailClock = 0.0, trailNext = 0.0
    private var squash = 0.0
    private(set) var shake = 0.0
    private var pin = 0.0, sunkT = -1.0
    private weak var flag: Entity?
    private var flagBase = SIMD3<Float>(0, 0, 0)
    private let calm = UIAccessibility.isReduceMotionEnabled
    private static let colors: [UIColor] = ["#ef7d6d", "#ffd66e", "#74c465", "#6fc0df", "#fff8ec"].map { UIColor(SwiftUI.Color(hex: $0)) }

    /// neon night: a longer trail, each dot its own neon
    private let night: Bool
    private var trailN = 0
    private static let neon: [UIColor] = ["#ff3df2", "#2ef2ff", "#b6ff2e", "#ffb02e", "#8b5cff"].map { UIColor(SwiftUI.Color(hex: $0)) }

    init(flag: Entity?, night: Bool = false) {
        self.flag = flag; self.night = night
        if let f = flag { flagBase = f.position }
        func unlit(_ c: UIColor, _ o: Float = 1) -> UnlitMaterial { var m = UnlitMaterial(color: c); m.blending = .transparent(opacity: .init(floatLiteral: o)); m.faceCulling = .none; return m }
        let dot = MeshResource.generateSphere(radius: Float(Sim.BALL_R * 0.55))
        for _ in 0..<30 { let e = ModelEntity(mesh: dot, materials: [unlit(UIColor(red: 1, green: 0.99, blue: 0.97, alpha: 1), 0)]); e.isEnabled = false; trail.append(Bit(e: e)); root.addChild(e) }
        let paper = MeshResource.generatePlane(width: 0.045, height: 0.028)
        for i in 0..<140 { let e = ModelEntity(mesh: paper, materials: [unlit(PlayFX.colors[i % 5])]); e.isEnabled = false; confetti.append(Bit(e: e)); root.addChild(e) }
        let blob = MeshResource.generateSphere(radius: 0.02)
        for _ in 0..<40 { let e = ModelEntity(mesh: blob, materials: [unlit(.white, 0)]); e.isEnabled = false; puffs.append(Bit(e: e)); root.addChild(e) }
        ring = ModelEntity(mesh: PlayProps.annulus(inner: 0.9, outer: 1, segments: 48), materials: [unlit(UIColor(red: 1, green: 0.95, blue: 0.77, alpha: 1), 0.9)])
        ring.isEnabled = false
        root.addChild(ring)
    }

    func update(_ play: HolePlay, dt: Double, ball: ModelEntity, cameraRight: SIMD3<Float>, skirt: String) {
        let h = play.hole, b = play.ball
        for e in play.fx { fire(e, play: play, skirt: skirt) }
        play.fx.removeAll()
        // the trail: a dot every 30 ms while rolling, each fading over 0.4 s
        trailClock += dt
        let rolling = play.phase == .roll || play.phase == .drift || play.phase == .replay
        if !calm && rolling && b.tube == nil && trailClock >= trailNext && hypot(b.vx, b.vz) > 0.3, let i = trail.firstIndex(where: { !$0.e.isEnabled }) ?? trail.indices.first {
            trailNext = trailClock + 0.03
            trail[i].life = night ? 0.8 : 0.4; trail[i].e.isEnabled = true
            if night, var m = trail[i].e.model?.materials.first as? UnlitMaterial { m.color.tint = PlayFX.neon[trailN % 5]; trailN += 1; trail[i].e.model?.materials = [m] }
            trail[i].e.position = SIMD3(Float(b.x), Float(b.y + Sim.BALL_R * 0.6), Float(b.z))
        }
        for i in trail.indices where trail[i].e.isEnabled {
            trail[i].life -= dt
            if trail[i].life <= 0 || calm { trail[i].e.isEnabled = false; continue }
            let L = night ? 0.8 : 0.4, k = trail[i].life / L
            opacity(trail[i].e, Float(k * (night ? 0.9 : 0.55))); trail[i].e.scale = SIMD3(repeating: Float((0.4 + k * 0.6) * (night ? 1.6 : 1)))
        }
        // squash on hard hits
        let s = calm ? 0 : squash
        ball.scale = SIMD3(Float(1 + 0.22 * s), Float(1 - 0.28 * s), Float(1 + 0.22 * s))
        squash = s * exp(-14 * dt)
        shake *= exp(-9 * dt)
        // puffs
        for i in puffs.indices where puffs[i].e.isEnabled {
            puffs[i].life -= dt
            if puffs[i].life <= 0 { puffs[i].e.isEnabled = false; continue }
            puffs[i].v.y -= Float(3.5 * dt); puffs[i].e.position += puffs[i].v * Float(dt)
            let k = puffs[i].life / puffs[i].max
            opacity(puffs[i].e, Float(k * 0.8)); puffs[i].e.scale = SIMD3(repeating: Float(1.6 - k * 0.8))
        }
        // confetti
        for i in confetti.indices where confetti[i].e.isEnabled {
            confetti[i].life -= dt
            if confetti[i].life <= 0 { confetti[i].e.isEnabled = false; continue }
            confetti[i].v.y -= Float(4 * dt); confetti[i].v *= Float(exp(-1.2 * dt))
            confetti[i].e.position += confetti[i].v * Float(dt)
            let w = confetti[i].spin * Float(dt)
            confetti[i].e.orientation = simd_quatf(angle: w.x, axis: [1, 0, 0]) * simd_quatf(angle: w.y, axis: [0, 1, 0]) * simd_quatf(angle: w.z, axis: [0, 0, 1]) * confetti[i].e.orientation
        }
        // the sink ring runs out from the cup and fades
        if ringT >= 0 {
            ringT += dt
            let k = min(1, ringT / 0.55)
            ring.scale = SIMD3(repeating: Float(Sim.CUP_R * (1.1 + k * 3.2)))
            opacity(ring, Float(0.9 * (1 - k)))
            if k >= 1 { ringT = -1; ring.isEnabled = false }
        }
        // the flagstick
        if let f = flag {
            let near = hypot(b.x - h.cup.x, b.z - h.cup.z)
            let want: Double = switch play.phase {
            case .sinking, .auto, .done, .replay: 1
            case .roll, .drift: b.tube == nil && near < 1.2 ? 1 : 0
            case .aim: near < 0.72 ? 1 : 0
            }
            pin += (want - pin) * (calm ? 1 : 1 - exp(-8 * dt))
            if play.phase == .sinking && !calm { sunkT = sunkT < 0 ? 0 : sunkT + dt } else if play.phase != .done { sunkT = -1 }
            let t = sunkT, pop = t >= 0 && t < 0.9 ? sin(t / 0.9 * .pi) * 0.2 : 0
            let side = simd_normalize(SIMD3(cameraRight.x, 0, cameraRight.z) + SIMD3(1e-6, 0, 0))
            f.position = flagBase + SIMD3(side.x * Float(0.32 * pin), Float(0.14 * pin + pop), side.z * Float(0.32 * pin))
            let spin = t >= 0 && t < 0.9 ? Float(t / 0.9 * 2 * .pi) : 0
            f.orientation = simd_quatf(angle: spin, axis: [0, 1, 0]) * simd_quatf(angle: Float(-0.25 * pin) * (side.x >= 0 ? 1 : -1), axis: [0, 0, 1])
        }
    }

    private func fire(_ e: HolePlay.Fx, play: HolePlay, skirt: String) {
        switch e {
        case .squash: squash = 1
        case .shake(let v): if !calm { shake = max(shake, v) }
        case .sinkRing:
            guard !calm else { return }
            let h = play.hole
            ring.position = SIMD3(Float(h.cup.x), Float(h.groundH(h.cup.x, h.cup.z) + 0.006), Float(h.cup.z))
            ringT = 0; ring.isEnabled = true
        case .burst(let at, let n):
            guard !calm else { return }
            for i in 0..<min(n, confetti.count) {
                let a = Double.random(in: 0..<(2 * .pi)), s = 1.2 + Double.random(in: 0..<1.8)
                confetti[i].e.position = SIMD3(Float(at.x), Float(at.y), Float(at.z)); confetti[i].e.isEnabled = true
                confetti[i].life = 2.2 + Double.random(in: 0..<0.6)
                confetti[i].v = SIMD3(Float(cos(a) * s * 0.6), Float(2.2 + Double.random(in: 0..<1.8)), Float(sin(a) * s * 0.6))
                confetti[i].spin = SIMD3(Float.random(in: 0..<12), Float.random(in: 0..<12), Float.random(in: 0..<12))
            }
        case .puff(let kind, let at, let n):
            guard !calm else { return }
            // dust takes the course's own earth, lightened; water is water
            let col = kind == "water" ? UIColor(red: 0.62, green: 0.85, blue: 0.94, alpha: 1) : PlayFX.mix(skirt, "#fff8ec", 0.55)
            var k = 0
            for i in puffs.indices where !puffs[i].e.isEnabled && k < n {
                let a = Double.random(in: 0..<(2 * .pi)), sp = kind == "water" ? 0.6 + Double.random(in: 0..<0.8) : 0.25 + Double.random(in: 0..<0.35)
                puffs[i].e.position = SIMD3(Float(at.x), Float(at.y + 0.02), Float(at.z)); puffs[i].e.isEnabled = true
                if var m = puffs[i].e.model?.materials.first as? UnlitMaterial { m.color.tint = col; puffs[i].e.model?.materials = [m] }
                puffs[i].life = 0.5 + Double.random(in: 0..<0.3); puffs[i].max = puffs[i].life
                puffs[i].v = SIMD3(Float(cos(a) * sp), Float((kind == "water" ? 1.6 : 0.5) + Double.random(in: 0..<0.6)), Float(sin(a) * sp))
                k += 1
            }
        }
    }

    private func opacity(_ e: ModelEntity, _ o: Float) {
        guard var m = e.model?.materials.first as? UnlitMaterial else { return }
        m.blending = .transparent(opacity: .init(floatLiteral: max(0, min(1, o))))
        e.model?.materials = [m]
    }
    static func mix(_ a: String, _ b: String, _ k: CGFloat) -> UIColor {
        var r1: CGFloat = 0, g1: CGFloat = 0, b1: CGFloat = 0, r2: CGFloat = 0, g2: CGFloat = 0, b2: CGFloat = 0, x: CGFloat = 0
        UIColor(SwiftUI.Color(hex: a)).getRed(&r1, green: &g1, blue: &b1, alpha: &x)
        UIColor(SwiftUI.Color(hex: b)).getRed(&r2, green: &g2, blue: &b2, alpha: &x)
        return UIColor(red: r1 + (r2 - r1) * k, green: g1 + (g2 - g1) * k, blue: b1 + (b2 - b1) * k, alpha: 1)
    }
}
