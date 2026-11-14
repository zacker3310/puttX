// What the player handles on the course, after src/game.js: the ball (its band and mark, a soft
// contact shadow, turning by its own spin), the putter (it draws back with the swing, never into a
// wall, and follows through), the aim line (the ball's real first 1.8 m at half pace, draped over the
// ground, with an arrowhead) and the power ring that fills with the backswing.
import Foundation
import RealityKit
import UIKit
import PuttXCore

@MainActor
final class PlayProps {
    let root = Entity()
    let ball: ModelEntity
    private let shadow: ModelEntity
    private let putter = Entity()
    private let ribbon = ModelEntity()
    private let ring = ModelEntity()
    private var ribbonKey = ""
    private var ringFill = -1.0
    private var lastSimTime: Double?
    /// the hole's gold lost ball, bobbing and turning over a pulsing ring (src/game.js syncLost)
    private let lost = Entity()
    private let gold: ModelEntity
    private let goldRing: ModelEntity
    /// the ghost of your best run, see-through
    private let ghost: ModelEntity
    private var ghostGuide = false
    /// the slope read's arrows, built when it is first turned on
    private var read: ModelEntity?

    static let PUTTER_SCALE: Float = 0.83, BACK_M = 0.36, GAP = 0.006, HEAD_W = 0.17, HEAD_D = 0.052, HEAD_H = 0.042

    init() {
        var m = PhysicallyBasedMaterial()
        if let t = try? TextureResource.generate(from: PlayProps.ballSkin(), options: .init(semantic: .color)) { m.baseColor = .init(tint: .white, texture: .init(t)) }
        m.roughness = 0.45; m.clearcoat = 1.0; m.clearcoatRoughness = 0.07
        ball = ModelEntity(mesh: Gear.sphere(radius: Float(Sim.BALL_R)), materials: [m])

        var gm = PhysicallyBasedMaterial()
        gm.baseColor = .init(tint: UIColor(red: 1, green: 0.79, blue: 0.29, alpha: 1)); gm.metallic = 0.7; gm.roughness = 0.28
        gm.emissiveColor = .init(color: UIColor(red: 0.35, green: 0.23, blue: 0, alpha: 1)); gm.emissiveIntensity = 1
        gold = ModelEntity(mesh: .generateSphere(radius: Float(Sim.BALL_R * 0.9)), materials: [gm])
        var rm = UnlitMaterial(color: UIColor(red: 1, green: 0.91, blue: 0.63, alpha: 1))
        rm.blending = .transparent(opacity: 0.7); rm.faceCulling = .none
        goldRing = ModelEntity(mesh: PlayProps.annulus(inner: Float(Sim.BALL_R * 1.3), outer: Float(Sim.BALL_R * 1.75)), materials: [rm])
        goldRing.position.y = 0.004
        lost.addChild(gold); lost.addChild(goldRing)
        var ghm = UnlitMaterial(color: UIColor(red: 0.75, green: 0.9, blue: 0.96, alpha: 1))
        ghm.blending = .transparent(opacity: 0.45)
        ghost = ModelEntity(mesh: .generateSphere(radius: Float(Sim.BALL_R)), materials: [ghm])

        var sm = UnlitMaterial(color: .black)
        if let t = try? TextureResource.generate(from: PlayProps.softDisc(), options: .init(semantic: .color)) { sm.color = .init(tint: .white, texture: .init(t)) }
        sm.blending = .transparent(opacity: 1.0)
        shadow = ModelEntity(mesh: .generatePlane(width: Float(Sim.BALL_R * 2.5), depth: Float(Sim.BALL_R * 2.5)), materials: [sm])

        // the putter: a blade head with a sight line, the shaft rising from the heel toward the hands
        let metal: (UIColor) -> PhysicallyBasedMaterial = { c in var p = PhysicallyBasedMaterial(); p.baseColor = .init(tint: c); p.roughness = 0.3; p.metallic = 0.85; return p }
        let head = ModelEntity(mesh: .generateBox(size: [Float(PlayProps.HEAD_W), Float(PlayProps.HEAD_H), Float(PlayProps.HEAD_D)], cornerRadius: 0.004), materials: [metal(UIColor(red: 0.79, green: 0.81, blue: 0.84, alpha: 1))])
        head.position = [0, Float(PlayProps.HEAD_H) / 2, -Float(PlayProps.HEAD_D) / 2]
        var white = PhysicallyBasedMaterial(); white.baseColor = .init(tint: .white); white.roughness = 0.5
        let line = ModelEntity(mesh: .generateBox(size: [0.004, 0.002, Float(PlayProps.HEAD_D) * 0.7]), materials: [white])
        line.position = [0, Float(PlayProps.HEAD_H) + 0.001, -Float(PlayProps.HEAD_D) / 2]
        let shaft = Entity()
        shaft.position = [Float(PlayProps.HEAD_W) * 0.36, Float(PlayProps.HEAD_H), -Float(PlayProps.HEAD_D) * 0.5]
        shaft.orientation = simd_quatf(angle: -0.2, axis: [0, 0, 1]) * simd_quatf(angle: 0.12, axis: [1, 0, 0])
        let rod = ModelEntity(mesh: .generateCylinder(height: 0.62, radius: 0.0065), materials: [metal(UIColor(red: 0.85, green: 0.87, blue: 0.89, alpha: 1))])
        rod.position.y = 0.31
        var gripM = PhysicallyBasedMaterial(); gripM.baseColor = .init(tint: UIColor(red: 0.29, green: 0.22, blue: 0.15, alpha: 1)); gripM.roughness = 0.9
        let grip = ModelEntity(mesh: .generateCylinder(height: 0.2, radius: 0.014), materials: [gripM])
        grip.position.y = 0.56
        shaft.addChild(rod); shaft.addChild(grip)
        putter.addChild(head); putter.addChild(line); putter.addChild(shaft)
        putter.scale = SIMD3(repeating: PlayProps.PUTTER_SCALE)

        for e in [ball, shadow, putter, ribbon, ring, lost, ghost] as [Entity] { root.addChild(e) }
    }

    func update(_ play: HolePlay, now: CFTimeInterval) {
        let h = play.hole, b = play.ball
        // the ball, turned by its own spin over the sim time that passed; a resting ball does not turn
        let visible = b.tube == nil && play.phase != .done
        ball.isEnabled = visible
        let simDt = min(0.1, max(0, play.time - (lastSimTime ?? play.time)))
        lastSimTime = play.time
        let w = SIMD3(Float(b.wx), Float(b.wy), Float(b.wz)), wl = simd_length(w)
        if (play.phase == .roll || play.phase == .drift) && wl > 1e-6 {
            ball.orientation = simd_quatf(angle: wl * Float(simDt), axis: w / wl) * ball.orientation
        }
        ball.position = SIMD3(Float(b.x), Float(b.y + Sim.BALL_R), Float(b.z))
        // its shadow: on the ground under it, fading and spreading as it lifts
        let gy = h.groundH(b.x, b.z), up = max(0, b.y - gy)
        shadow.isEnabled = visible && up < 0.4 && hypot(b.x - h.cup.x, b.z - h.cup.z) >= Sim.CUP_R
        shadow.position = SIMD3(Float(b.x), Float(gy + 0.002), Float(b.z))
        shadow.scale = SIMD3(repeating: Float(1 + up * 6))

        ghost.isEnabled = play.ghostVisible
        // the guide is green, your best is sky blue
        let guide = play.ghost?.auto == true
        if guide != ghostGuide, var m = ghost.model?.materials.first as? UnlitMaterial {
            ghostGuide = guide
            m.color.tint = guide ? UIColor(red: 0.62, green: 0.95, blue: 0.63, alpha: 1) : UIColor(red: 0.75, green: 0.9, blue: 0.96, alpha: 1)
            ghost.model?.materials = [m]
        }
        updateRead(play)
        if let g = play.ghost, ghost.isEnabled { ghost.position = SIMD3(Float(g.ball.x), Float(g.ball.y + Sim.BALL_R), Float(g.ball.z)) }
        // the lost ball, until it is found
        if let s = play.lostSpot, !play.lostGot, play.phase != .done {
            lost.isEnabled = true
            let t = Float(play.reduceMotion ? 0 : play.time)
            lost.position = SIMD3(Float(s.x), Float(h.groundH(s.x, s.z)), Float(s.z))
            gold.position.y = Float(Sim.BALL_R * 0.55) + sin(t * 2.4) * 0.01
            gold.orientation = simd_quatf(angle: t * 1.5, axis: [0, 1, 0])
            goldRing.scale = SIMD3(repeating: 1 + (sin(t * 3) + 1) * 0.15)
        } else { lost.isEnabled = false }

        updatePutter(play, now: now)
        updateRibbon(play)
        updateRing(play)
    }

    /// the equipped gear from the pro shop: its putter (head and all) and its ball's skin
    func wear(putter id: String, ball bid: String, tint: String? = nil) {
        if let p = Gear.putter(id) {
            for c in Array(putter.children) { c.removeFromParent() }
            for c in Array(p.children) { putter.addChild(c) }
        }
        if var m = Gear.ballMaterial(bid) {
            if let t = tint, var p = m as? PhysicallyBasedMaterial { p.baseColor.tint = UIColor(Color(hex: t)); m = p }
            ball.model?.materials = [m]
        }
    }

    // MARK: the putter
    /// how far back the head can go before it would touch a wall, a post, a cliff or leave the floor (src/game.js putterRoom)
    static func room(_ h: Hole, _ b: Ball, _ aim: Double) -> Double {
        let a = aim * .pi / 180, ux = sin(a), uz = cos(a), px = cos(a), pz = -sin(a)
        func clear(_ d: Double) -> Bool {
            for dd in [0, HEAD_D] { for w in [-HEAD_W / 2, 0, HEAD_W / 2] {
                let back = Sim.BALL_R + GAP + d + dd, x = b.x - ux * back + px * w, z = b.z - uz * back + pz * w
                if !h.onFloor(x, z) || abs(h.groundH(x, z) - b.y) > 0.05 { return false }
                if h.segs.contains(where: { s in let p = closestOnSeg(s.ax, s.az, s.bx, s.bz, x, z); return hypot(x - p.0, z - p.1) < Sim.WALL_HALF + 0.004 }) { return false }
                if h.data.posts.contains(where: { hypot(x - $0.x, z - $0.z) < $0.r + 0.004 }) { return false }
            } }
            return true
        }
        if !clear(0) { return -1 }
        var d = 0.0
        while d < BACK_M * 1.2 && clear(d + 0.01) { d += 0.01 }
        return d
    }
    private var roomCache: (key: String, room: Double)?
    private func updatePutter(_ play: HolePlay, now: CFTimeInterval) {
        let h = play.hole, b = play.ball
        if let at = play.struckAt, now - at < 0.7, let c = play.contactPose {
            // the follow-through: the head carries on along the old line, then lifts away
            let t = now - at, k = min(1, t / 0.18), lift = max(0, t - 0.3) * 0.8, a = c.aim * .pi / 180
            let dist = min(0.14, (Sim.MIN_V + (Sim.MAX_V - Sim.MIN_V) * (play.lastStroke?.power ?? c.speed)) * 0.05)
            putter.isEnabled = true
            putter.position = SIMD3(Float(c.x + sin(a) * dist * k), Float(c.y + lift), Float(c.z + cos(a) * dist * k))
            return
        }
        guard play.phase == .aim, !play.overview, b.tube == nil else { putter.isEnabled = false; return }
        let key = "\(b.x),\(b.z),\(jsFixed(play.aim, 2))"
        let room = roomCache?.key == key ? roomCache!.room : PlayProps.room(h, b, play.aim)
        roomCache = (key, room)
        putter.isEnabled = room >= 0
        guard room >= 0 else { return }
        let back = play.swing.map { min(room, min(1.15, $0.back / Swing.FULL) * PlayProps.BACK_M) } ?? min(room, 0.004)
        let side = play.swing.map { max(-1.5, min(1.5, $0.side / Swing.FACE_HALF)) * 0.03 } ?? 0
        let a = play.aim * .pi / 180, ux = sin(a), uz = cos(a), px = cos(a), pz = -sin(a)
        let r = Sim.BALL_R + PlayProps.GAP + back, x = b.x - ux * r + px * side, z = b.z - uz * r + pz * side
        putter.position = SIMD3(Float(x), Float(h.groundH(x, z) + 0.002), Float(z))
        putter.orientation = simd_quatf(angle: Float(a), axis: [0, 1, 0])
        play.contactPose = (x, h.groundH(x, z) + 0.002, z, play.aim, play.lastStroke?.power ?? 0.5)
    }

    // MARK: the aim line
    private func updateRibbon(_ play: HolePlay) {
        let show = play.phase == .aim && !play.overview && play.ball.tube == nil
        ribbon.isEnabled = show
        guard show else { return }
        let pts = play.aimPath()
        guard pts.count >= 2 else { ribbon.isEnabled = false; return }
        let key = "\(pts.count),\(pts[0]),\(pts[pts.count - 1])"
        guard key != ribbonKey else { return }
        ribbonKey = key
        let w = 0.012, m = pts.count
        func side(_ i: Int) -> (Double, Double) {
            let a = pts[max(0, i - 1)], c = pts[min(m - 1, i + 1)], dx = c.x - a.x, dz = c.z - a.z, d = max(1e-9, hypot(dx, dz))
            return (dz / d, -dx / d)
        }
        var pos: [SIMD3<Float>] = [], idx: [UInt32] = []
        for i in 0..<m {
            let p = pts[i], (sx, sz) = side(i)
            pos.append(SIMD3(Float(p.x + sx * w), Float(p.y), Float(p.z + sz * w)))
            pos.append(SIMD3(Float(p.x - sx * w), Float(p.y), Float(p.z - sz * w)))
            if i < m - 1 { let k = UInt32(i * 2); idx += [k, k + 1, k + 2, k + 1, k + 3, k + 2] }
        }
        // the arrowhead, along the last heading
        let p = pts[m - 1], (sx, sz) = side(m - 1), ux = -sz, uz = sx, k = UInt32(pos.count)
        pos.append(SIMD3(Float(p.x + sx * w * 3.5), Float(p.y), Float(p.z + sz * w * 3.5)))
        pos.append(SIMD3(Float(p.x - sx * w * 3.5), Float(p.y), Float(p.z - sz * w * 3.5)))
        pos.append(SIMD3(Float(p.x + ux * 0.06), Float(p.y), Float(p.z + uz * 0.06)))
        idx += [k, k + 1, k + 2]
        var d = MeshDescriptor(); d.positions = MeshBuffers.Positions(pos); d.primitives = .triangles(idx)
        var mat = UnlitMaterial(color: UIColor(red: 1, green: 0.99, blue: 0.97, alpha: 1))
        mat.blending = .transparent(opacity: 0.9); mat.faceCulling = .none
        if let mesh = try? MeshResource.generate(from: [d]) { ribbon.model = ModelComponent(mesh: mesh, materials: [mat]) }
    }

    // MARK: the power ring
    private func updateRing(_ play: HolePlay) {
        let pw = play.swing.map { min(1, $0.back / Swing.FULL) } ?? 0
        ring.isEnabled = pw > 0.01 && play.phase == .aim
        guard ring.isEnabled else { ringFill = -1; return }
        let b = play.ball
        ring.position = SIMD3(Float(b.x), Float(b.y + 0.006), Float(b.z))
        guard abs(pw - ringFill) > 0.008 else { return }
        ringFill = pw
        let r0 = Sim.BALL_R * 1.6, r1 = Sim.BALL_R * 2.3, n = max(2, Int(48 * pw)), sweep = max(0.01, pw * .pi * 2)
        var pos: [SIMD3<Float>] = [], idx: [UInt32] = []
        for i in 0...n {
            let a = .pi / 2 + sweep * Double(i) / Double(n)
            pos.append(SIMD3(Float(cos(a) * r0), 0, Float(-sin(a) * r0))); pos.append(SIMD3(Float(cos(a) * r1), 0, Float(-sin(a) * r1)))
            if i < n { let k = UInt32(i * 2); idx += [k, k + 1, k + 2, k + 1, k + 3, k + 2] }
        }
        var d = MeshDescriptor(); d.positions = MeshBuffers.Positions(pos); d.primitives = .triangles(idx)
        var mat = UnlitMaterial(color: pw > 0.85 ? UIColor(red: 0.94, green: 0.49, blue: 0.43, alpha: 1) : UIColor(red: 1, green: 0.84, blue: 0.43, alpha: 1))
        mat.blending = .transparent(opacity: 0.95); mat.faceCulling = .none
        if let mesh = try? MeshResource.generate(from: [d]) { ring.model = ModelComponent(mesh: mesh, materials: [mat]) }
    }

    // MARK: painted with Core Graphics
    /// the default ball (src/game.js ballTexture): cream, a yellow band round the equator, a red mark
    static func ballSkin() -> CGImage {
        let W = 256, H = 128
        let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        ctx.setFillColor(red: 1, green: 0.99, blue: 0.97, alpha: 1); ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
        ctx.setFillColor(red: 1, green: 0.84, blue: 0.43, alpha: 1); ctx.fill(CGRect(x: 0, y: CGFloat(H) * 0.44, width: CGFloat(W), height: CGFloat(H) * 0.12))
        ctx.setFillColor(red: 0.94, green: 0.49, blue: 0.43, alpha: 1); ctx.fillEllipse(in: CGRect(x: 170, y: 22, width: 22, height: 22))
        return ctx.makeImage()!
    }
    /// a soft round shadow, dark in the middle
    static func softDisc() -> CGImage {
        let n = 64
        let ctx = CGContext(data: nil, width: n, height: n, bitsPerComponent: 8, bytesPerRow: n * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        let g = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB)!, colors: [UIColor(white: 0, alpha: 0.55).cgColor, UIColor(white: 0, alpha: 0.25).cgColor, UIColor(white: 0, alpha: 0).cgColor] as CFArray, locations: [0, 0.6, 1])!
        ctx.drawRadialGradient(g, startCenter: CGPoint(x: 32, y: 32), startRadius: 0, endCenter: CGPoint(x: 32, y: 32), endRadius: 32, options: [])
        return ctx.makeImage()!
    }

    /// the slope read (src/game.js setRead): an arrow every 28 cm over the green pointing downhill,
    /// longer and redder where it is steeper; none near the walls or on the flat
    private func updateRead(_ play: HolePlay) {
        if !play.reading { read?.isEnabled = false; return }
        if read == nil {
            let h = play.hole, B = Terrain.bounds(h), step = 0.28
            var pos: [SIMD3<Float>] = [], idx: [UInt32] = [], col: [SIMD4<Float>] = []
            let shape: [SIMD2<Float>] = [[-0.018, -0.06], [0.018, -0.06], [0.018, 0.02], [0.045, 0.02], [0, 0.07], [-0.045, 0.02], [-0.018, 0.02]]
            let tris: [UInt32] = [0, 1, 2, 0, 2, 6, 3, 4, 5]
            var x = B.x0 + step / 2
            while x < B.x1 {
                var z = B.z0 + step / 2
                while z < B.z1 {
                    defer { z += step }
                    guard h.onFloor(x, z), !h.segs.contains(where: { s in let p = closestOnSeg(s.ax, s.az, s.bx, s.bz, x, z); return hypot(x - p.0, z - p.1) < 0.12 }) else { continue }
                    let (gx, gz) = h.groundGrad(x, z), m = hypot(gx, gz)
                    guard m > 0.012 else { continue }
                    let a = Float(atan2(-gx, -gz)), sc = Float(0.7 + min(1.3, m * 6)), y = Float(h.groundH(x, z) + 0.012)
                    let hue = 0.33 - min(0.33, m * 1.6), c = UIColor(hue: hue, saturation: 0.85, brightness: 0.9, alpha: 1)
                    var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, al: CGFloat = 0; c.getRed(&r, green: &g, blue: &b, alpha: &al)
                    let base = UInt32(pos.count)
                    for v in shape {
                        // the shape lies flat, its tip toward +z, turned to point down the slope
                        let px = v.x * sc, pz = v.y * sc
                        pos.append(SIMD3(Float(x) + px * cos(a) + pz * sin(a), y, Float(z) - px * sin(a) + pz * cos(a)))
                        col.append(SIMD4(Float(r), Float(g), Float(b), 1))
                    }
                    idx += tris.map { $0 + base }
                }
                x += step
            }
            guard !pos.isEmpty else { return }
            // one mesh per colour band is plenty: bucket the arrows by hue into a few unlit materials
            var d = MeshDescriptor(); d.positions = MeshBuffers.Positions(pos); d.primitives = .triangles(idx)
            var mats: [UnlitMaterial] = []
            var parts: [MeshDescriptor] = []
            let buckets = 6
            for k in 0..<buckets {
                var bi: [UInt32] = []
                for t in stride(from: 0, to: idx.count, by: 3) {
                    let c = col[Int(idx[t])], hueK = min(buckets - 1, Int((1 - c.x + c.y) / 2 * Float(buckets)))
                    if hueK == k { bi += [idx[t], idx[t + 1], idx[t + 2]] }
                }
                guard !bi.isEmpty else { continue }
                var dd = d; dd.primitives = .triangles(bi); dd.materials = .allFaces(UInt32(mats.count))
                let i = bi[0], c = col[Int(i)]
                var m = UnlitMaterial(color: UIColor(red: CGFloat(c.x), green: CGFloat(c.y), blue: CGFloat(c.z), alpha: 1))
                m.blending = .transparent(opacity: 0.85); m.faceCulling = .none
                mats.append(m); parts.append(dd)
            }
            guard let mesh = try? MeshResource.generate(from: parts) else { return }
            let e = ModelEntity(mesh: mesh, materials: mats)
            root.addChild(e)
            read = e
        }
        read?.isEnabled = true
    }

    /// a flat ring lying on the ground
    static func annulus(inner: Float, outer: Float, segments: Int = 24) -> MeshResource {
        var pos: [SIMD3<Float>] = [], idx: [UInt32] = []
        for i in 0..<segments {
            let a = Float(i) / Float(segments) * 2 * .pi, c = cos(a), s = sin(a)
            pos += [SIMD3(c * inner, 0, s * inner), SIMD3(c * outer, 0, s * outer)]
            let j = UInt32(i * 2), n = UInt32(((i + 1) % segments) * 2)
            idx += [j, n, j + 1, j + 1, n, n + 1]
        }
        var d = MeshDescriptor(); d.positions = MeshBuffers.Positions(pos); d.normals = MeshBuffers.Normals(Array(repeating: SIMD3(0, 1, 0), count: pos.count)); d.primitives = .triangles(idx)
        return (try? MeshResource.generate(from: [d])) ?? .generatePlane(width: outer * 2, depth: outer * 2)
    }
}
