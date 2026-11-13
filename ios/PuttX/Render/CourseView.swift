// The 3D hole: a RealityKit view of the course, the ball and the movers, from the web's cameras
// (src/game.js cameraGoal: behind the ball along the aim while aiming, chasing it while it rolls).
// One sky does two jobs, as on the web: it is the backdrop and the image-based light.
import SwiftUI
import RealityKit
import Combine
import PuttXCore

enum CourseRenderer: String { case exported, hand }

struct CourseView: UIViewRepresentable {
    let play: HolePlay
    var renderer: CourseRenderer = .exported

    func makeCoordinator() -> Coordinator { Coordinator(play: play) }

    func makeUIView(context: Context) -> ARView {
        let v = ARView(frame: .zero, cameraMode: .nonAR, automaticallyConfigureSession: false)
        v.renderOptions.insert(.disableMotionBlur)
        v.renderOptions.insert(.disableDepthOfField)
        context.coordinator.attach(v, renderer: renderer)
        return v
    }
    func updateUIView(_ v: ARView, context: Context) {}
    static func dismantleUIView(_ v: ARView, coordinator: Coordinator) { coordinator.detach() }

    @MainActor
    final class Coordinator {
        let play: HolePlay
        private var rig: CourseRig?
        private let camera = PerspectiveCamera()
        private var anchor = AnchorEntity(world: .zero)
        private var tick: Cancellable?
        private var camPos: SIMD3<Float>?, camLook: SIMD3<Float>?
        private var yaw: Double = 0

        init(play: HolePlay) { self.play = play }

        func attach(_ v: ARView, renderer: CourseRenderer) {
            camera.camera.fieldOfViewInDegrees = 40
            camera.camera.near = 0.05
            camera.camera.far = 160
            anchor.addChild(camera)
            v.scene.addAnchor(anchor)
            do {
                let r = renderer == .hand && play.hole.key == "1-1" ? try HandHole.build(play.hole) : try CourseBuilder.exported(play.hole)
                anchor.addChild(r.root)
                rig = r
                if let env = try? Sky.environment(top: r.skyTop, horizon: r.skyHorizon, ground: r.skyGround, sun: r.sunDirection) {
                    v.environment.background = .skybox(env)
                    v.environment.lighting.resource = env
                }
            } catch {
                print("course: \(error)")
            }
            yaw = play.aim * .pi / 180
            update(0, snap: true)
            tick = v.scene.subscribe(to: SceneEvents.Update.self) { [weak self] e in
                MainActor.assumeIsolated { self?.update(e.deltaTime, snap: false) }
            }
        }
        func detach() { tick?.cancel(); tick = nil }

        private func update(_ dt: Double, snap: Bool) {
            guard let rig else { return }
            let h = play.hole, b = play.ball, t = play.time
            // the ball, its centre a radius above its bottom
            rig.ball.isEnabled = b.tube == nil && play.phase != .done
            rig.ball.position = SIMD3(Float(b.x), Float(b.y + Sim.BALL_R), Float(b.z))
            // the movers, posed as updateMovers poses them
            for (e, m) in rig.movers {
                let s = m.state(at: t)
                switch m.kind {
                case .spin:
                    e.position = SIMD3(Float(m.x!), Float(h.groundH(m.x!, m.z!)), Float(m.z!))
                    e.orientation = simd_quatf(angle: Float(s.th), axis: [0, 1, 0])
                case .gate:
                    e.position = SIMD3(Float(s.x), Float(h.groundH(s.x, s.z)), Float(s.z))
                    e.orientation = simd_quatf(angle: Float((m.ang ?? 0) * .pi / 180), axis: [0, 1, 0])
                case .slide:
                    e.position = SIMD3(Float(s.x), Float(h.groundH(s.x, s.z) + (m.r ?? 0)), Float(s.z))
                    e.orientation = simd_quatf(angle: Float(t * 0.8), axis: [0, 1, 0])
                }
            }
            // conveyors flow
            for (e, _, speed) in rig.flows {
                guard var mat = e.model?.materials.first as? PhysicallyBasedMaterial else { continue }
                var tr = mat.textureCoordinateTransform
                tr.offset.y -= Float(dt * 0.4 * min(3, speed))
                mat.textureCoordinateTransform = tr
                e.model?.materials = [mat]
            }
            // the camera
            let goal = cameraGoal()
            if snap || camPos == nil { camPos = goal.pos; camLook = goal.look }
            else {
                let k = Float(1 - exp(-4 * dt))
                camPos = camPos! + (goal.pos - camPos!) * k
                camLook = camLook! + (goal.look - camLook!) * k
            }
            camera.look(at: camLook!, from: camPos!, relativeTo: nil)
        }

        /// src/game.js cameraGoal, aiming and rolling
        private func cameraGoal() -> (pos: SIMD3<Float>, look: SIMD3<Float>) {
            let h = play.hole, b = play.ball
            let aiming = play.phase == .aim || play.phase == .done
            if aiming { yaw = play.aim * .pi / 180 }
            else if hypot(b.vx, b.vz) > 0.5 {
                var d = atan2(b.vx, b.vz) - yaw
                d = atan2(sin(d), cos(d))
                yaw += d * (1 - exp(-2.2 / 60))
            }
            let ux = sin(yaw), uz = cos(yaw)
            var ahead = 2.2
            let cdx = h.cup.x - b.x, cdz = h.cup.z - b.z, cd = hypot(cdx, cdz)
            if cd > 0.05 && (cdx * ux + cdz * uz) / cd > cos(35 * Double.pi / 180) { ahead = cd }
            ahead = min(5.5, max(1.4, ahead))
            let bx = b.tube?.def.b.x ?? b.x, bz = b.tube?.def.b.z ?? b.z
            let by = b.tube.map { h.groundH($0.def.b.x, $0.def.b.z) } ?? b.y
            let back = aiming ? 0.62 + 0.2 * ahead : 1.25, high = aiming ? 0.6 + 0.27 * ahead : 1.0
            var pos = SIMD3(bx - ux * back, by + high, bz - uz * back)
            pos.y = max(pos.y, h.groundH(pos.x, pos.z) + 0.45)
            let f = { (v: SIMD3<Double>) in SIMD3<Float>(Float(v.x), Float(v.y), Float(v.z)) }
            if !aiming { return (f(pos), f(SIMD3(bx, by, bz))) }
            let ty = h.groundH(bx + ux * ahead, bz + uz * ahead) + (ahead == cd ? 0.4 : 0)
            let aBall = atan2(pos.y - by, back), aFar = atan2(pos.y - ty, back + ahead), pitch = aBall * 0.62 + aFar * 0.38
            let look = pos + SIMD3(ux * cos(pitch), -sin(pitch), uz * cos(pitch)) * 3
            return (f(pos), f(look))
        }
    }
}

/// the web's sky (initSky): a gradient from the horizon up to the top and down to the ground, with a
/// warm glow round the sun, drawn as an equirectangular image for RealityKit to light and backdrop with
enum Sky {
    static func environment(top: SIMD3<Double>, horizon: SIMD3<Double>, ground: SIMD3<Double>, sun: SIMD3<Float>) throws -> EnvironmentResource {
        let W = 512, H = 256
        var px = [UInt8](repeating: 255, count: W * H * 4)
        let sd = SIMD3<Double>(Double(sun.x), Double(sun.y), Double(sun.z)), glow = SIMD3<Double>(1, 0.93, 0.8)
        func srgb(_ v: Double) -> UInt8 { let x = max(0, min(1, v)); return UInt8((x <= 0.0031308 ? 12.92 * x : 1.055 * pow(x, 1 / 2.4) - 0.055) * 255 + 0.5) }
        for j in 0..<H {
            let lat = Double.pi / 2 - (Double(j) + 0.5) / Double(H) * Double.pi
            for i in 0..<W {
                let lon = (Double(i) + 0.5) / Double(W) * 2 * Double.pi - Double.pi
                let d = SIMD3(cos(lat) * sin(lon), sin(lat), cos(lat) * cos(lon))
                var c = d.y > 0 ? horizon + (top - horizon) * pow(d.y, 0.5) : horizon + (ground - horizon) * pow(-d.y, 0.3)
                let s = max(0, simd_dot(d, sd))
                c += glow * (pow(s, 8) * 0.25 + pow(s, 64) * 0.6)
                let k = (j * W + i) * 4
                px[k] = srgb(c.x); px[k + 1] = srgb(c.y); px[k + 2] = srgb(c.z)
            }
        }
        let cs = CGColorSpace(name: CGColorSpace.sRGB)!
        let ctx = CGContext(data: &px, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        return try EnvironmentResource.generate(fromEquirectangular: ctx.makeImage()!)
    }
}
