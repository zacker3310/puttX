// A menu's living backdrop, painted from a course's look: its sky, a sun (or a moon and stars on a dark
// world), drifting clouds, the world's emblem floating far off, three ranges of rolling hills sliding
// past at their own speeds, and mown turf in front. One Canvas at 30 fps; still under reduced motion.
import SwiftUI

struct WorldScene: View {
    let look: CourseLook
    /// where the near turf meets the hills, as a share of the height
    var horizon: CGFloat = 0.64
    /// a smaller, calmer version for a card
    var compact = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var start = Date()

    var body: some View {
        TimelineView(.animation(minimumInterval: compact ? 1.0 / 15 : 1.0 / 30, paused: reduceMotion)) { tl in
            let t = reduceMotion ? 0 : tl.date.timeIntervalSince(start)
            Canvas { ctx, size in WorldPainter(look: look, horizon: horizon, compact: compact).draw(ctx, size, t) }
        }
        .accessibilityHidden(true)
    }
}

/// the drawing itself, so a card and a full screen share every line of it
struct WorldPainter {
    let look: CourseLook
    let horizon: CGFloat
    let compact: Bool

    private func rgb(_ hex: String) -> SIMD3<Double> {
        let v = UInt64(hex.dropFirst(hex.hasPrefix("#") ? 1 : 0), radix: 16) ?? 0
        return SIMD3(Double((v >> 16) & 0xff), Double((v >> 8) & 0xff), Double(v & 0xff)) / 255
    }
    private func color(_ c: SIMD3<Double>, _ a: Double = 1) -> Color { Color(.sRGB, red: c.x, green: c.y, blue: c.z, opacity: a) }
    private func mix(_ a: SIMD3<Double>, _ b: SIMD3<Double>, _ k: Double) -> SIMD3<Double> { a + (b - a) * k }
    /// a fixed scatter: the same spots every frame and every launch
    private func rand(_ i: Int, _ salt: Int) -> Double {
        var x = UInt32(truncatingIfNeeded: i &* 374761393 &+ salt &* 668265263 &+ look.course &* 2246822519)
        x = (x ^ (x >> 13)) &* 1274126177
        return Double(x ^ (x >> 16)) / Double(UInt32.max)
    }

    func draw(_ ctx: GraphicsContext, _ size: CGSize, _ t: Double) {
        let W = size.width, H = size.height, u = H / 700   // one stage px at this height
        let top = rgb(look.sky[0]), low = rgb(look.sky.count > 1 ? look.sky[1] : look.sky[0])
        let felt = rgb(look.felt), ground = rgb(look.ground ?? look.skirt)
        let lum: Double = 0.2126 * top.x + 0.7152 * top.y + 0.0722 * top.z
        let dark = lum < 0.3
        let hy = H * horizon

        // the sky
        ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .linearGradient(Gradient(colors: [color(top), color(low)]), startPoint: .zero, endPoint: CGPoint(x: 0, y: hy)))

        // a sun with a slow turning ring of rays, or a moon over twinkling stars
        let sun = CGPoint(x: W * 0.82, y: H * (compact ? 0.2 : 0.17)), sr = (compact ? 34 : 46) * u
        if dark {
            for i in 0..<(compact ? 14 : 46) {
                let p = CGPoint(x: rand(i, 1) * W, y: rand(i, 2) * hy * 0.85), tw = 0.45 + 0.55 * (0.5 + 0.5 * sin(t * (1.2 + rand(i, 3) * 2) + rand(i, 4) * 6))
                let r = (1.2 + rand(i, 5) * 2.2) * u
                ctx.fill(Path(ellipseIn: CGRect(x: p.x - r, y: p.y - r, width: 2 * r, height: 2 * r)), with: .color(.white.opacity(tw)))
            }
            ctx.fill(Path(ellipseIn: CGRect(x: sun.x - sr * 2, y: sun.y - sr * 2, width: sr * 4, height: sr * 4)), with: .radialGradient(Gradient(colors: [.white.opacity(0.25), .white.opacity(0)]), center: sun, startRadius: 0, endRadius: sr * 2))
            var moon = Path(ellipseIn: CGRect(x: sun.x - sr, y: sun.y - sr, width: 2 * sr, height: 2 * sr))
            moon = moon.subtracting(Path(ellipseIn: CGRect(x: sun.x - sr * 0.45, y: sun.y - sr * 1.25, width: 2 * sr, height: 2 * sr)))
            ctx.fill(moon, with: .color(Color(hex: "#fff4c8")))
        } else {
            ctx.fill(Path(ellipseIn: CGRect(x: sun.x - sr * 3, y: sun.y - sr * 3, width: sr * 6, height: sr * 6)), with: .radialGradient(Gradient(colors: [Color(hex: "#fff3b0").opacity(0.7), Color(hex: "#fff3b0").opacity(0)]), center: sun, startRadius: sr * 0.8, endRadius: sr * 3))
            var rays = ctx
            rays.translateBy(x: sun.x, y: sun.y); rays.rotate(by: .radians(t * 0.25))
            for i in 0..<10 {
                let a = Double(i) / 10 * 2 * .pi, r0 = sr * 1.25, r1 = sr * 1.7
                var p = Path()
                p.move(to: CGPoint(x: cos(a) * r0, y: sin(a) * r0)); p.addLine(to: CGPoint(x: cos(a) * r1, y: sin(a) * r1))
                rays.stroke(p, with: .color(Color(hex: "#ffd66e")), style: StrokeStyle(lineWidth: 7 * u, lineCap: .round))
            }
            ctx.fill(Path(ellipseIn: CGRect(x: sun.x - sr, y: sun.y - sr, width: 2 * sr, height: 2 * sr)), with: .color(Color(hex: "#ffd66e")))
            ctx.fill(Path(ellipseIn: CGRect(x: sun.x - sr * 0.55, y: sun.y - sr * 0.6, width: sr * 0.7, height: sr * 0.45)), with: .color(.white.opacity(0.45)))
        }

        // clouds drifting right, wrapping round
        for i in 0..<(compact ? 2 : 5) {
            let s = (0.6 + rand(i, 11) * 0.7) * u * (compact ? 0.8 : 1), span = W + 260 * s
            let x = (rand(i, 12) * span + t * (6 + rand(i, 13) * 10) * u).truncatingRemainder(dividingBy: span) - 130 * s
            let y = hy * (0.12 + rand(i, 14) * 0.38)
            var cloud = Path()
            for (dx, dy, r) in [(0.0, 0.0, 34.0), (40, -16, 40), (82, -4, 30), (-34, 6, 24), (110, 10, 22)] {
                cloud.addEllipse(in: CGRect(x: x + dx * s - r * s, y: y + dy * s - r * s, width: 2 * r * s, height: 2 * r * s))
            }
            ctx.fill(cloud, with: .color(.white.opacity(dark ? 0.12 : 0.85)))
        }

        // the world's emblem, far off between the clouds and the hills, bobbing
        if let icon = look.icon {
            let img = ctx.resolve(Image(icon))
            for i in 0..<(compact ? 0 : 2) {
                let d = (110 + rand(i, 21) * 50) * u, bob = sin(t * 0.8 + Double(i) * 2.1) * 8 * u
                let x = W * (i == 0 ? 0.08 + rand(i, 22) * 0.1 : 0.5 + rand(i, 22) * 0.12), y = hy * 0.42 - d / 2 + bob
                var c = ctx
                c.opacity = dark ? 0.35 : 0.3
                c.draw(img, in: CGRect(x: x, y: y, width: d, height: d))
            }
        }

        // three ranges of hills: far and hazy and slow, near and rich and quicker
        let ranges: [(mix: Double, base: Double, amp: Double, freq: Double, speed: Double, haze: Double)] = [
            (0.35, 0.80, 70, 1.6, 4, 0.55), (0.65, 0.90, 52, 2.4, 9, 0.25), (1.0, 0.99, 34, 3.4, 16, 0)]
        for (k, r) in ranges.enumerated() {
            let base = k == 2 ? felt * 0.9 + ground * 0.1 : mix(ground, felt, 0.5)
            let c = mix(mix(low, base, r.mix), low, r.haze)
            var p = Path()
            p.move(to: CGPoint(x: 0, y: H))
            let off = t * r.speed * u, steps = 48
            for j in 0...steps {
                let x = W * Double(j) / Double(steps), xx = (x + off) / W * 2 * .pi
                let y = hy * r.base - r.amp * u * (0.6 * sin(xx * r.freq / 2 + Double(k) * 1.7) + 0.4 * sin(xx * r.freq + Double(k) * 0.6)) - (compact ? 0 : 10 * u)
                p.addLine(to: CGPoint(x: x, y: y))
            }
            p.addLine(to: CGPoint(x: W, y: H)); p.closeSubpath()
            ctx.fill(p, with: .color(color(c)))
        }

        // the near turf, mown in stripes, its top edge catching the light
        let turf = Path(CGRect(x: 0, y: hy, width: W, height: H - hy))
        ctx.fill(turf, with: .color(color(felt)))
        var stripes = ctx
        stripes.clip(to: turf)
        let sw = 70 * u, shift = (t * 10 * u).truncatingRemainder(dividingBy: sw * 2)
        var x = -H - sw * 2 + shift
        while x < W + sw {
            var p = Path()
            p.move(to: CGPoint(x: x, y: H)); p.addLine(to: CGPoint(x: x + sw, y: H))
            p.addLine(to: CGPoint(x: x + sw + (H - hy) * 0.6, y: hy)); p.addLine(to: CGPoint(x: x + (H - hy) * 0.6, y: hy)); p.closeSubpath()
            stripes.fill(p, with: .color(.white.opacity(0.07)))
            x += sw * 2
        }
        ctx.fill(Path(CGRect(x: 0, y: hy, width: W, height: 4 * u)), with: .color(.white.opacity(0.18)))
    }
}

/// a glossy face: a soft highlight across the top of a toy, as if lit from above
struct Gloss<S: Shape>: View {
    let shape: S
    var body: some View {
        shape.fill(LinearGradient(stops: [.init(color: .white.opacity(0.42), location: 0), .init(color: .white.opacity(0.08), location: 0.48), .init(color: .clear, location: 0.5)],
                                  startPoint: .top, endPoint: .bottom))
            .allowsHitTesting(false)
    }
}
