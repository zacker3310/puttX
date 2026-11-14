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
        private let props = PlayProps()
        private var fx: PlayFX?
        private weak var view: ARView?
        private let camera = PerspectiveCamera()
        private var anchor = AnchorEntity(world: .zero)
        private var tick: Cancellable?
        private var camPos: SIMD3<Float>?, camLook: SIMD3<Float>?
        private var yaw: Double = 0
        /// this frame's length, for the chase camera's turn (the same at 60 or 120 Hz)
        private var frameDt = 1.0 / 60

        init(play: HolePlay) { self.play = play }

        func attach(_ v: ARView, renderer: CourseRenderer) {
            camera.camera.fieldOfViewInDegrees = 40
            camera.camera.near = 0.05
            camera.camera.far = 160
            anchor.addChild(camera)
            v.scene.addAnchor(anchor)
            do {
                let r = renderer == .hand && play.hole.key == "1-1" ? try HandHole.build(play.hole) : try CourseBuilder.exported(play.hole, night: play.night)
                anchor.addChild(r.root)
                props.wear(putter: play.gear.putter, ball: play.gear.ball, tint: play.ballTint)
                anchor.addChild(props.root)
                if r.night { props.glow() }
                let f = PlayFX(flag: r.anim.named("flag"), night: r.night)
                anchor.addChild(f.root)
                fx = f
                rig = r
                view = v
                // the sky, once it is made: the backdrop and the image-based light
                v.environment.background = .color(UIColor(red: 0.62, green: 0.85, blue: 0.94, alpha: 1))
                let img = Sky.image(top: r.skyTop, horizon: r.skyHorizon, ground: r.skyGround, sun: r.sunDirection)
                Task { @MainActor [weak v] in
                    guard let env = try? await EnvironmentResource(equirectangular: img), let v else { return }
                    v.environment.background = .skybox(env)
                    v.environment.lighting.resource = env
                }
            } catch {
                print("course: \(error)")
            }
            yaw = play.aim * .pi / 180
            play.driveFromRenderer()
            update(0, snap: true)
            tick = v.scene.subscribe(to: SceneEvents.Update.self) { [weak self] e in
                MainActor.assumeIsolated { self?.update(e.deltaTime, snap: false) }
            }
        }
        func detach() { tick?.cancel(); tick = nil }

        private func update(_ dt: Double, snap: Bool) {
            guard let rig else { return }
            // the hole steps here, on the frame it is drawn in
            if !snap { play.renderTick(dt) }
            let h = play.hole, t = play.time
            // the ball, the putter, the aim line and the power ring
            props.update(play, now: CACurrentMediaTime())
            let right = camera.transform.matrix.columns.0
            fx?.update(play, dt: dt, ball: props.ball, cameraRight: SIMD3(right.x, right.y, right.z), skirt: play.look.skirt)
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
            // the scenery's own life: bats, ships, snow, embers, beacons
            if !play.reduceMotion && !rig.anim.isEmpty { rig.anim.update(t) }
            // conveyors flow
            frameDt = max(1.0 / 240, min(0.1, dt))
            for (e, _, speed) in rig.flows where !play.reduceMotion {
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
                let k = Float(1 - exp(-(play.intro != nil ? 12 : 4) * dt))
                camPos = camPos! + (goal.pos - camPos!) * k
                camLook = camLook! + (goal.look - camLook!) * k
            }
            // a heavy landing shakes the camera a little
            let sh = Float(fx?.shake ?? 0), tt = Float(play.time)
            let jolt = sh > 0.01 ? SIMD3(sin(tt * 90) * 0.03 * sh, cos(tt * 77) * 0.02 * sh, 0) : .zero
            camera.look(at: camLook! + jolt, from: camPos! + jolt, relativeTo: nil)
            // the ground's fog is measured from the camera
            if let g = rig.ground, var m = g.model?.materials.first as? CustomMaterial {
                let c = camPos!
                if abs(m.custom.value.y - c.x) > 0.01 || abs(m.custom.value.z - c.z) > 0.01 {
                    m.custom.value.y = c.x; m.custom.value.z = c.z
                    g.model?.materials = [m]
                }
            }
            publishPin()
        }

        /// where the cup is on screen, for the distance tag: just above the cup, and only while aiming
        private func publishPin() {
            let h = play.hole
            guard play.phase == .aim, !play.overview, let v = view else { if play.pinOnScreen != nil { play.pinOnScreen = nil }; return }
            let world = SIMD3(Float(h.cup.x), Float(h.groundH(h.cup.x, h.cup.z) + 0.12), Float(h.cup.z))
            // behind the camera projects nowhere useful
            let toCup = world - camera.position(relativeTo: nil), fwd = -camera.transform.matrix.columns.2
            guard simd_dot(toCup, SIMD3(fwd.x, fwd.y, fwd.z)) > 0, var p = v.project(world) else { play.pinOnScreen = nil; return }
            p.x = max(v.bounds.width * 0.11, min(v.bounds.width * 0.8, p.x))
            p.y = max(v.bounds.height * 0.22, p.y)
            if let o = play.pinOnScreen, abs(o.x - p.x) < 0.5, abs(o.y - p.y) < 0.5 { return }
            play.pinOnScreen = p
        }

        /// src/game.js cameraGoal, aiming and rolling
        private func cameraGoal() -> (pos: SIMD3<Float>, look: SIMD3<Float>) {
            let h = play.hole
            // the introduction: from high over the cup, through the overview, down to the aim view
            if let t = play.intro {
                let u = min(1, t / HolePlay.introLength), e = u * u * (3 - 2 * u), B = Terrain.bounds(h), ext = max(B.x1 - B.x0, B.z1 - B.z0) / 2
                let cy = Float(h.groundH(h.cup.x, h.cup.z))
                let from = (SIMD3(Float(h.cup.x + 1.2), cy + Float(2.6 + ext * 0.35), Float(h.cup.z + 1.6)), SIMD3(Float(h.cup.x), cy, Float(h.cup.z)))
                let mid = overviewGoal(h)
                let aim = aimGoal(), to = (aim.pos, aim.look)
                let (a, c, k) = e < 0.5 ? (from, mid, e * 2) : (mid, to, e * 2 - 1)
                let kk = Float(k * k * (3 - 2 * k))
                return (a.0 + (c.0 - a.0) * kk, a.1 + (c.1 - a.1) * kk)
            }
            if play.overview { return overviewGoal(h) }
            // the ace replay: low, beside the ball's path, looking across it
            if play.phase == .replay, let r = play.replay {
                let b = r.ball, v = hypot(b.vx, b.vz), ux = v > 0.05 ? b.vx / v : 0, uz = v > 0.05 ? b.vz / v : 1
                let x = b.x - uz * 0.9 * r.side - ux * 0.5, z = b.z + ux * 0.9 * r.side - uz * 0.5
                return (SIMD3(Float(x), Float(max(b.y, h.groundH(x, z)) + 0.35), Float(z)), SIMD3(Float(b.x), Float(b.y + 0.05), Float(b.z)))
            }
            return aimGoal()
        }
        private func overviewGoal(_ h: Hole) -> (SIMD3<Float>, SIMD3<Float>) {
            let B = Terrain.bounds(h), hi = max(B.x1 - B.x0, (B.z1 - B.z0) * 1.7) * 0.75 + 2
            return (SIMD3(Float(B.cx), Float(hi), Float(B.cz - hi * 0.3)), SIMD3(Float(B.cx), 0, Float(B.cz)))
        }
        private func aimGoal() -> (pos: SIMD3<Float>, look: SIMD3<Float>) {
            let h = play.hole, b = play.ball
            if play.overview {
                // the whole hole from above, a little behind the tee
                let B = Terrain.bounds(h), hi = max(B.x1 - B.x0, (B.z1 - B.z0) * 1.7) * 0.75 + 2
                return (SIMD3(Float(B.cx), Float(hi), Float(B.cz - hi * 0.3)), SIMD3(Float(B.cx), 0, Float(B.cz)))
            }
            // the drop: swoop in low over the lip and look down into the cup
            if play.phase == .sinking && !play.reduceMotion, let f = play.sinkFrom {
                let dx = h.cup.x - f.x, dz = h.cup.z - f.z, d = max(1e-6, hypot(dx, dz)), cy = h.groundH(h.cup.x, h.cup.z)
                return (SIMD3(Float(h.cup.x - dx / d * 0.42), Float(cy + 0.36), Float(h.cup.z - dz / d * 0.42)), SIMD3(Float(h.cup.x), Float(cy - 0.08), Float(h.cup.z)))
            }
            let aiming = play.phase == .aim
            if aiming { yaw = play.aim * .pi / 180 }
            else if hypot(b.vx, b.vz) > 0.5 {
                var d = atan2(b.vx, b.vz) - yaw
                d = atan2(sin(d), cos(d))
                yaw += d * (1 - exp(-2.2 * frameDt))
            }
            let ux = sin(yaw), uz = cos(yaw)
            var ahead = 2.2
            let cdx = h.cup.x - b.x, cdz = h.cup.z - b.z, cd = hypot(cdx, cdz)
            if cd > 0.05 && (cdx * ux + cdz * uz) / cd > cos(35 * Double.pi / 180) { ahead = cd }
            ahead = min(5.5, max(1.4, ahead))
            let d = play.drawBall
            let bx = b.tube?.def.b.x ?? d.x, bz = b.tube?.def.b.z ?? d.z
            let by = b.tube.map { h.groundH($0.def.b.x, $0.def.b.z) } ?? d.y
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
    static func image(top: SIMD3<Double>, horizon: SIMD3<Double>, ground: SIMD3<Double>, sun: SIMD3<Float>) -> CGImage {
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
        // the pixels are copied into the image's own provider, so nothing points at the array afterwards
        let provider = CGDataProvider(data: Data(px) as CFData)!
        return CGImage(width: W, height: H, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: W * 4, space: cs,
                       bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue), provider: provider, decode: nil, shouldInterpolate: true, intent: .defaultIntent)!
    }
}
