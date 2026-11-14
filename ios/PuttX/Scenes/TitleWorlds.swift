// The title's world of the day: each of the ten worlds in turn gets the loud treatment the volcano has,
// a dramatic sky, its landmark black against it and rim-lit, its own weather, and its own accent on
// the logo's X and the play plate. Today's world is the day's number mod ten, the same for everyone.
import SwiftUI

enum TitleWorld {
    /// 1...10: today's world, or `-titleWorld N` for a screenshot of one
    static var today: Int {
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "-titleWorld"), i + 1 < args.count, let n = Int(args[i + 1]), (1...10).contains(n) { return n }
        let day = Calendar.current.ordinality(of: .day, in: .era, for: Date()) ?? 0
        return day % 10 + 1
    }
    /// the world's accent, hot to deep: the X, the play triangle and the plate's rim and glow
    static func accent(_ w: Int) -> [Color] {
        let hex: [String] = switch w {
        case 1: ["#fff3a8", "#ffd02e", "#f39a12", "#9a5a05"]
        case 2: ["#fff0c8", "#ffb35c", "#e8642a", "#8a2a10"]
        case 3: ["#eaffc8", "#7fe36b", "#2fa34a", "#0f4f25"]
        case 4: ["#ffffff", "#bff2ff", "#4cc3f0", "#145a86"]
        case 5: ["#fff6d0", "#ffd36b", "#e0a030", "#7a4a10"]
        case 7: ["#f6e0ff", "#c88cff", "#8a4dff", "#3a1680"]
        case 8: ["#e0fff6", "#6bffd8", "#2ec2c8", "#0e4f66"]
        case 9: ["#fff0f8", "#ff9ad0", "#ff4fa0", "#8a1050"]
        case 10: ["#fffbe0", "#ffe27a", "#f0b42e", "#8a5a08"]
        default: ["#fff2a8", "#ffb02e", "#ff5a1a", "#b3200f"]
        }
        return hex.map { Color(hex: $0) }
    }
}

struct WorldTitleScene: View {
    let world: Int
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var start = Date()
    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30, paused: reduceMotion)) { tl in
            let t = reduceMotion ? 0 : tl.date.timeIntervalSince(start)
            Canvas { ctx, size in
                if world == 6 { MetalTitlePainter().draw(ctx, size, t) } else { WorldTitlePainter(world: world).draw(ctx, size, t) }
            }
        }
        .accessibilityHidden(true)
    }
}

struct WorldTitlePainter {
    let world: Int
    private func rand(_ i: Int, _ salt: Int) -> Double {
        var x = UInt32(truncatingIfNeeded: i &* 374761393 &+ salt &* 668265263 &+ world &* 2246822519)
        x = (x ^ (x >> 13)) &* 1274126177
        return Double(x ^ (x >> 16)) / Double(UInt32.max)
    }
    private func c(_ hex: String, _ a: Double = 1) -> Color { Color(hex: hex).opacity(a) }
    private func disc(_ ctx: GraphicsContext, _ p: CGPoint, _ r: Double, _ col: Color) { ctx.fill(Path(ellipseIn: CGRect(x: p.x - r, y: p.y - r, width: 2 * r, height: 2 * r)), with: .color(col)) }
    private func glow(_ ctx: GraphicsContext, _ p: CGPoint, _ r: Double, _ col: Color) {
        ctx.fill(Path(ellipseIn: CGRect(x: p.x - r, y: p.y - r, width: 2 * r, height: 2 * r)), with: .radialGradient(Gradient(colors: [col, col.opacity(0)]), center: p, startRadius: 0, endRadius: r))
    }

    // MARK: what each world is made of
    private var sky: [String] {
        switch world {
        case 1: ["#0d1730", "#23365e", "#7a4a6a", "#f07a3a", "#ffc070"]
        case 2: ["#1a0b2a", "#4a1840", "#b8323a", "#ff7a2a", "#ffd08a"]
        case 3: ["#04140f", "#0b3a2e", "#1f6a4a", "#7fae5a", "#e8d88a"]
        case 4: ["#040a1c", "#0b1f45", "#1f4a7a", "#5a8ab8", "#c8e0f0"]
        case 5: ["#030817", "#0a1a3a", "#163a63", "#2f6a8a", "#8ab8c8"]
        case 7: ["#07041a", "#1a0c3a", "#3a1a63", "#6a3a8a", "#b08ac0"]
        case 8: ["#020108", "#0a0620", "#1a0c3a", "#2a1450", "#3a1a5a"]
        case 9: ["#2a0830", "#6a1a5a", "#c8407a", "#ff8aa0", "#ffd8c0"]
        default: ["#06123a", "#163a8a", "#4a7ad0", "#f0a860", "#ffe0a0"]
        }
    }
    private var ink: Color { c(["#0b0f1a", "#1a0810", "#03100a", "#06101e", "#020814", "#0a0614", "#05030c", "#1e0618", "#0a1430"][[1, 2, 3, 4, 5, 7, 8, 9, 10].firstIndex(of: world) ?? 0]) }
    private var rim: Color { TitleWorld.accent(world)[1] }
    private var seaWorld: Bool { world == 5 || world == 3 || world == 9 }

    func draw(_ ctx: GraphicsContext, _ size: CGSize, _ t: Double) {
        let W = size.width, H = size.height, u = H / 700, cx = W / 2, base = H * 0.74
        let s = sky
        ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .linearGradient(
            Gradient(stops: s.enumerated().map { .init(color: c($0.element), location: [0, 0.3, 0.6, 0.88, 1][$0.offset]) }),
            startPoint: .zero, endPoint: CGPoint(x: 0, y: base)))
        let starry = [4, 5, 7, 8].contains(world) ? 70 : world == 1 || world == 2 ? 24 : 0
        for i in 0..<starry {
            let p = CGPoint(x: rand(i, 1) * W, y: rand(i, 2) * base * (world == 8 ? 0.95 : 0.45)), tw = 0.35 + 0.65 * (0.5 + 0.5 * sin(t * (0.8 + rand(i, 3) * 2) + rand(i, 4) * 6))
            disc(ctx, p, (0.7 + rand(i, 5) * 1.6) * u, .white.opacity(tw * 0.85))
        }
        // rays from behind the landmark, turning slowly
        let focus = CGPoint(x: cx, y: base - 200 * u)
        if world != 8 && world != 7 {
            var rays = ctx
            rays.translateBy(x: focus.x, y: focus.y)
            rays.rotate(by: .radians(sin(t * 0.15) * 0.08))
            for i in 0..<9 {
                let a = -Double.pi / 2 + (Double(i) - 4) * 0.27, w = 0.06
                var p = Path(); p.move(to: .zero)
                p.addLine(to: CGPoint(x: cos(a - w) * 1400 * u, y: sin(a - w) * 1400 * u))
                p.addLine(to: CGPoint(x: cos(a + w) * 1400 * u, y: sin(a + w) * 1400 * u)); p.closeSubpath()
                rays.fill(p, with: .color(rim.opacity(0.07)))
            }
        }

        switch world {
        case 1: construction(ctx, W, H, u, cx, base, t)
        case 2: desert(ctx, W, H, u, cx, base, t)
        case 3: jungle(ctx, W, H, u, cx, base, t)
        case 4: snow(ctx, W, H, u, cx, base, t)
        case 5: pirate(ctx, W, H, u, cx, base, t)
        case 7: haunted(ctx, W, H, u, cx, base, t)
        case 8: space(ctx, W, H, u, cx, base, t)
        case 9: candy(ctx, W, H, u, cx, base, t)
        default: sky10(ctx, W, H, u, cx, base, t)
        }

        // the floor: sea that catches the accent in broken glints, or ground with a lit edge
        if world != 8 && world != 10 {
            let r = CGRect(x: 0, y: base, width: W, height: H - base)
            var fl = ctx; fl.clip(to: Path(r))
            if seaWorld {
                fl.fill(Path(r), with: .linearGradient(Gradient(colors: [c(s[3], 0.55), ink]), startPoint: CGPoint(x: 0, y: base), endPoint: CGPoint(x: 0, y: H)))
                fl.fill(Path(r), with: .color(ink.opacity(0.55)))
                for i in 0..<34 {
                    let row = rand(i, 7), y = base + 6 * u + row * row * (H - base), spread = (60 + row * 260) * u
                    let x = cx + (rand(i, 8) - 0.5) * 2 * spread + sin(t * (0.6 + rand(i, 9)) + Double(i)) * 14 * u
                    let w = (18 + rand(i, 10) * 50) * u * (0.4 + row), a = 0.25 + 0.5 * (0.5 + 0.5 * sin(t * 1.7 + Double(i) * 1.3))
                    fl.fill(Path(roundedRect: CGRect(x: x - w / 2, y: y, width: w, height: 3 * u), cornerRadius: 1.5 * u), with: .color(rim.opacity(a * (1 - row * 0.6))))
                }
            } else {
                fl.fill(Path(r), with: .linearGradient(Gradient(colors: [world == 4 ? c("#8aa8c8") : ink.opacity(0.9), ink]), startPoint: CGPoint(x: 0, y: base), endPoint: CGPoint(x: 0, y: H)))
            }
            ctx.fill(Path(CGRect(x: 0, y: base, width: W, height: 3 * u)), with: .color(rim.opacity(0.45)))
        }

        particles(ctx, W, H, u, cx, base, t)
        ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .radialGradient(Gradient(colors: [.clear, .black.opacity(0.55)]), center: CGPoint(x: cx, y: H * 0.45), startRadius: H * 0.45, endRadius: max(W, H) * 0.8))
    }

    /// a skyline of rolling or jagged ridges in one colour
    private func ridge(_ ctx: GraphicsContext, _ W: Double, _ base: Double, _ u: Double, height: Double, jag: Double, seed: Double, _ col: Color) {
        var p = Path(); p.move(to: CGPoint(x: 0, y: base))
        for j in 0...48 {
            let x = W * Double(j) / 48, k = Double(j)
            let y = base - height * u * (0.55 + 0.3 * sin(k * 0.45 + seed) + 0.15 * sin(k * 1.3 + seed * 2)) - (j % 2 == 0 ? jag * u : 0)
            p.addLine(to: CGPoint(x: x, y: y))
        }
        p.addLine(to: CGPoint(x: W, y: base)); p.closeSubpath()
        ctx.fill(p, with: .color(col))
    }
    /// a palm in silhouette
    private func palm(_ ctx: GraphicsContext, _ b: CGPoint, lean: Double, h: Double, u: Double, t: Double) {
        let top = CGPoint(x: b.x + lean * h * 0.6, y: b.y - h)
        var trunk = Path(); trunk.move(to: b); trunk.addQuadCurve(to: top, control: CGPoint(x: b.x + lean * h * 0.05, y: b.y - h * 0.6))
        ctx.stroke(trunk, with: .color(ink), style: StrokeStyle(lineWidth: 13 * u, lineCap: .round))
        for i in 0..<7 {
            let a = -Double.pi / 2 + (Double(i) - 3) * 0.5 + sin(t * 0.9) * 0.06 + lean * 0.3, len = h * (0.42 + 0.06 * Double(i % 2))
            let end = CGPoint(x: top.x + cos(a) * len, y: top.y + sin(a) * len * 0.55 + len * 0.42), mid = CGPoint(x: top.x + cos(a) * len * 0.55, y: top.y + sin(a) * len * 0.6 - 12 * u)
            var f = Path(); f.move(to: top); f.addQuadCurve(to: end, control: CGPoint(x: mid.x, y: mid.y - 16 * u)); f.addQuadCurve(to: top, control: CGPoint(x: mid.x, y: mid.y + 10 * u))
            ctx.fill(f, with: .color(ink))
        }
    }
    /// a pine in silhouette, tiers of triangles
    private func pine(_ ctx: GraphicsContext, _ b: CGPoint, h: Double, u: Double) {
        for k in 0..<4 {
            let y0 = b.y - h * (0.2 + Double(k) * 0.2), w = h * (0.32 - Double(k) * 0.06)
            var p = Path(); p.move(to: CGPoint(x: b.x - w, y: y0)); p.addLine(to: CGPoint(x: b.x, y: y0 - h * 0.34)); p.addLine(to: CGPoint(x: b.x + w, y: y0)); p.closeSubpath()
            ctx.fill(p, with: .color(ink))
        }
        ctx.fill(Path(CGRect(x: b.x - 5 * u, y: b.y - h * 0.22, width: 10 * u, height: h * 0.22)), with: .color(ink))
    }
    /// side banks of land framing the scene
    private func banks(_ ctx: GraphicsContext, _ W: Double, _ H: Double, _ u: Double, _ base: Double, left: Double = 120, right: Double = 60) {
        var l = Path(); l.move(to: CGPoint(x: 0, y: H)); l.addLine(to: CGPoint(x: 0, y: base - left * u))
        l.addCurve(to: CGPoint(x: W * 0.5 - 260 * u, y: base + 40 * u), control1: CGPoint(x: 120 * u, y: base - (left + 20) * u), control2: CGPoint(x: W * 0.5 - 420 * u, y: base + 10 * u))
        l.addLine(to: CGPoint(x: W * 0.5 - 260 * u, y: H)); l.closeSubpath(); ctx.fill(l, with: .color(ink))
        var r = Path(); r.move(to: CGPoint(x: W, y: H)); r.addLine(to: CGPoint(x: W, y: base - right * u))
        r.addCurve(to: CGPoint(x: W - 220 * u, y: base + 30 * u), control1: CGPoint(x: W - 80 * u, y: base - (right + 10) * u), control2: CGPoint(x: W - 160 * u, y: base + 10 * u))
        r.addLine(to: CGPoint(x: W - 220 * u, y: H)); r.closeSubpath(); ctx.fill(r, with: .color(ink))
    }

    // MARK: the worlds
    private func construction(_ ctx: GraphicsContext, _ W: Double, _ H: Double, _ u: Double, _ cx: Double, _ base: Double, _ t: Double) {
        glow(ctx, CGPoint(x: cx, y: base), 420 * u, c("#ff8a3a", 0.35))
        // a skyline of half-built towers, their girder grids lit at the edges
        for i in 0..<9 {
            let x = W * (0.04 + Double(i) * 0.12), w = (60 + rand(i, 31) * 70) * u, h = (90 + rand(i, 32) * 170) * u
            ctx.fill(Path(CGRect(x: x, y: base - h, width: w, height: h)), with: .color(c("#1c2440")))
            var grid = Path()
            var y = base - h; while y < base { grid.move(to: CGPoint(x: x, y: y)); grid.addLine(to: CGPoint(x: x + w, y: y)); y += 22 * u }
            ctx.stroke(grid, with: .color(c("#3a4a70", 0.7)), lineWidth: 2 * u)
        }
        // the tower crane: mast, jib, counter-jib, the hook swinging
        let mx = cx + 70 * u, top = base - 245 * u
        var lattice = Path()
        lattice.addRect(CGRect(x: mx - 12 * u, y: top, width: 24 * u, height: base - top))
        var y = top; while y < base { lattice.move(to: CGPoint(x: mx - 12 * u, y: y)); lattice.addLine(to: CGPoint(x: mx + 12 * u, y: y + 24 * u)); lattice.move(to: CGPoint(x: mx + 12 * u, y: y)); lattice.addLine(to: CGPoint(x: mx - 12 * u, y: y + 24 * u)); y += 24 * u }
        ctx.stroke(lattice, with: .color(ink), lineWidth: 4 * u)
        ctx.fill(Path(CGRect(x: mx - 380 * u, y: top - 6 * u, width: 520 * u, height: 16 * u)), with: .color(ink))
        ctx.fill(Path(CGRect(x: mx + 90 * u, y: top + 10 * u, width: 50 * u, height: 34 * u)), with: .color(ink))
        var cab = Path(); cab.move(to: CGPoint(x: mx, y: top - 70 * u)); cab.addLine(to: CGPoint(x: mx - 380 * u, y: top - 4 * u)); cab.move(to: CGPoint(x: mx, y: top - 70 * u)); cab.addLine(to: CGPoint(x: mx + 140 * u, y: top - 4 * u))
        ctx.stroke(cab, with: .color(ink), lineWidth: 3 * u)
        ctx.fill(Path(CGRect(x: mx - 6 * u, y: top - 70 * u, width: 12 * u, height: 66 * u)), with: .color(ink))
        let sw = sin(t * 0.9) * 0.08, hx = mx - 260 * u, hl = 110 * u, hook = CGPoint(x: hx + sin(sw) * hl, y: top + 10 * u + cos(sw) * hl)
        var line = Path(); line.move(to: CGPoint(x: hx, y: top + 10 * u)); line.addLine(to: hook); ctx.stroke(line, with: .color(ink), lineWidth: 2.5 * u)
        ctx.fill(Path(CGRect(x: hook.x - 70 * u, y: hook.y, width: 140 * u, height: 18 * u)), with: .color(ink))
        ctx.stroke(Path(CGRect(x: mx - 380 * u, y: top - 6 * u, width: 520 * u, height: 16 * u)), with: .color(rim.opacity(0.6)), lineWidth: 1.5 * u)
        let blink = (t * 1.2).truncatingRemainder(dividingBy: 1) < 0.5 ? 1.0 : 0.15
        glow(ctx, CGPoint(x: mx, y: top - 74 * u), 26 * u, c("#ff2a2a", 0.8 * blink)); disc(ctx, CGPoint(x: mx, y: top - 74 * u), 5 * u, c("#ff6a6a", blink))
        banks(ctx, W, H, u, base, left: 40, right: 30)
    }

    private func desert(_ ctx: GraphicsContext, _ W: Double, _ H: Double, _ u: Double, _ cx: Double, _ base: Double, _ t: Double) {
        // a huge low sun, cut by heat bands
        let sun = CGPoint(x: cx, y: base - 120 * u), sr = 190 * u
        glow(ctx, sun, sr * 2, c("#ff9a3a", 0.5))
        var sunCtx = ctx
        sunCtx.clip(to: Path(ellipseIn: CGRect(x: sun.x - sr, y: sun.y - sr, width: 2 * sr, height: 2 * sr)))
        sunCtx.fill(Path(CGRect(x: sun.x - sr, y: sun.y - sr, width: 2 * sr, height: 2 * sr)), with: .linearGradient(Gradient(colors: [c("#ffe08a"), c("#ff6a2a")]), startPoint: CGPoint(x: 0, y: sun.y - sr), endPoint: CGPoint(x: 0, y: sun.y + sr)))
        for k in 0..<6 { let y = sun.y + Double(k) * 26 * u + 10 * u; sunCtx.fill(Path(CGRect(x: sun.x - sr, y: y, width: 2 * sr, height: Double(k + 2) * 2.2 * u)), with: .color(c(sky[2]))) }
        ridge(ctx, W, base, u, height: 70, jag: 0, seed: 1.3, c("#5a1a2a"))
        // the buttes: flat-topped, sheer, rim-lit on the sun side
        for (x0, w, h) in [(cx - 520 * u, 220 * u, 230 * u), (cx - 300 * u, 140 * u, 160 * u), (cx + 230 * u, 260 * u, 260 * u), (cx + 480 * u, 160 * u, 180 * u)] {
            var p = Path(); p.move(to: CGPoint(x: x0, y: base)); p.addLine(to: CGPoint(x: x0 + w * 0.12, y: base - h)); p.addLine(to: CGPoint(x: x0 + w * 0.88, y: base - h)); p.addLine(to: CGPoint(x: x0 + w, y: base)); p.closeSubpath()
            ctx.fill(p, with: .color(ink))
            var e = Path(); e.move(to: CGPoint(x: x0 + w * 0.12, y: base - h)); e.addLine(to: CGPoint(x: x0 + w * 0.88, y: base - h))
            ctx.stroke(e, with: .color(rim.opacity(0.7)), lineWidth: 3 * u)
        }
        // saguaros
        for (x, h) in [(80 * u, 260 * u), (W - 110 * u, 220 * u), (210 * u, 150 * u)] {
            var p = Path()
            p.addRoundedRect(in: CGRect(x: x - 14 * u, y: base - h, width: 28 * u, height: h), cornerSize: CGSize(width: 14 * u, height: 14 * u))
            p.addRoundedRect(in: CGRect(x: x - 58 * u, y: base - h * 0.62, width: 20 * u, height: h * 0.3), cornerSize: CGSize(width: 10 * u, height: 10 * u))
            p.addRect(CGRect(x: x - 58 * u, y: base - h * 0.4, width: 50 * u, height: 18 * u))
            p.addRoundedRect(in: CGRect(x: x + 38 * u, y: base - h * 0.78, width: 20 * u, height: h * 0.34), cornerSize: CGSize(width: 10 * u, height: 10 * u))
            p.addRect(CGRect(x: x + 8 * u, y: base - h * 0.5, width: 50 * u, height: 18 * u))
            ctx.fill(p, with: .color(ink))
        }
    }

    private func jungle(_ ctx: GraphicsContext, _ W: Double, _ H: Double, _ u: Double, _ cx: Double, _ base: Double, _ t: Double) {
        ridge(ctx, W, base, u, height: 120, jag: 0, seed: 0.4, c("#0d3a2a"))
        // the stepped temple: five tiers, a stair, a doorway glowing green
        let tiers = 5
        for k in 0..<tiers {
            let w = (520 - Double(k) * 90) * u, h = 52 * u, y = base - Double(k + 1) * h
            ctx.fill(Path(CGRect(x: cx - w / 2, y: y, width: w, height: h + 1)), with: .color(ink))
            ctx.fill(Path(CGRect(x: cx - w / 2, y: y, width: w, height: 3 * u)), with: .color(rim.opacity(0.45)))
        }
        ctx.fill(Path(CGRect(x: cx - 60 * u, y: base - 330 * u, width: 120 * u, height: 70 * u)), with: .color(ink))
        let pulse = 0.7 + 0.3 * sin(t * 1.8)
        glow(ctx, CGPoint(x: cx, y: base - 296 * u), 140 * u, rim.opacity(0.5 * pulse))
        ctx.fill(Path(roundedRect: CGRect(x: cx - 22 * u, y: base - 318 * u, width: 44 * u, height: 58 * u), cornerRadius: 20 * u), with: .color(TitleWorld.accent(3)[0].opacity(pulse)))
        var stair = Path(); stair.move(to: CGPoint(x: cx - 50 * u, y: base)); stair.addLine(to: CGPoint(x: cx - 26 * u, y: base - 260 * u)); stair.addLine(to: CGPoint(x: cx + 26 * u, y: base - 260 * u)); stair.addLine(to: CGPoint(x: cx + 50 * u, y: base)); stair.closeSubpath()
        ctx.fill(stair, with: .color(c("#0a2a1c")))
        banks(ctx, W, H, u, base)
        palm(ctx, CGPoint(x: 70 * u, y: base - 112 * u), lean: 0.4, h: 330 * u, u: u, t: t)
        palm(ctx, CGPoint(x: 220 * u, y: base - 70 * u), lean: 0.15, h: 240 * u, u: u, t: t + 1.3)
        palm(ctx, CGPoint(x: W - 90 * u, y: base - 52 * u), lean: -0.35, h: 300 * u, u: u, t: t + 2.1)
    }

    private func snow(_ ctx: GraphicsContext, _ W: Double, _ H: Double, _ u: Double, _ cx: Double, _ base: Double, _ t: Double) {
        // the aurora: three ribbons waving across the top
        for k in 0..<3 {
            var p = Path()
            let y0 = base * (0.16 + Double(k) * 0.09)
            p.move(to: CGPoint(x: 0, y: y0))
            for j in 0...30 { let x = W * Double(j) / 30; p.addLine(to: CGPoint(x: x, y: y0 + sin(Double(j) * 0.5 + t * 0.4 + Double(k)) * 30 * u)) }
            ctx.stroke(p, with: .color((k == 1 ? c("#7affc8") : rim).opacity(0.28)), style: StrokeStyle(lineWidth: (40 - Double(k) * 8) * u, lineCap: .round))
            ctx.stroke(p, with: .color(.white.opacity(0.15)), style: StrokeStyle(lineWidth: 4 * u, lineCap: .round))
        }
        // the peaks: jagged, snow caps lit on one face
        for (x0, h, w) in [(cx - 560 * u, 240 * u, 420 * u), (cx - 200 * u, 380 * u, 520 * u), (cx + 280 * u, 300 * u, 460 * u)] {
            let peak = CGPoint(x: x0 + w / 2, y: base - h)
            var m = Path(); m.move(to: CGPoint(x: x0, y: base)); m.addLine(to: peak); m.addLine(to: CGPoint(x: x0 + w, y: base)); m.closeSubpath()
            ctx.fill(m, with: .color(c("#0f2240")))
            var lit = Path(); lit.move(to: peak); lit.addLine(to: CGPoint(x: x0 + w, y: base)); lit.addLine(to: CGPoint(x: peak.x + w * 0.08, y: base)); lit.closeSubpath()
            ctx.fill(lit, with: .color(c("#1c3a63")))
            var cap = Path(); cap.move(to: peak)
            cap.addLine(to: CGPoint(x: peak.x + w * 0.16, y: peak.y + h * 0.3)); cap.addLine(to: CGPoint(x: peak.x + w * 0.06, y: peak.y + h * 0.24)); cap.addLine(to: CGPoint(x: peak.x - w * 0.02, y: peak.y + h * 0.33))
            cap.addLine(to: CGPoint(x: peak.x - w * 0.09, y: peak.y + h * 0.25)); cap.addLine(to: CGPoint(x: peak.x - w * 0.16, y: peak.y + h * 0.3)); cap.closeSubpath()
            ctx.fill(cap, with: .color(c("#e8f4ff")))
        }
        for (x, h) in [(60.0, 230.0), (150, 170), (240, 120), (-70, 210), (-170, 150)] { pine(ctx, CGPoint(x: x > 0 ? x * u : W + x * u, y: base + 6 * u), h: h * u, u: u) }
    }

    private func pirate(_ ctx: GraphicsContext, _ W: Double, _ H: Double, _ u: Double, _ cx: Double, _ base: Double, _ t: Double) {
        let moon = CGPoint(x: cx + 420 * u, y: base - 250 * u)
        glow(ctx, moon, 220 * u, c("#fff1c8", 0.35)); disc(ctx, moon, 62 * u, c("#fff4d8"))
        disc(ctx, CGPoint(x: moon.x - 18 * u, y: moon.y - 10 * u), 12 * u, c("#e8dcc0")); disc(ctx, CGPoint(x: moon.x + 20 * u, y: moon.y + 18 * u), 8 * u, c("#e8dcc0"))
        // the ship, riding the swell: hull, three masts, square sails, a flag
        let bob = sin(t * 0.9) * 5 * u, roll = sin(t * 0.7) * 0.025, sx = cx - 60 * u, sy = base + 6 * u + bob
        var ship = ctx; ship.translateBy(x: sx, y: sy); ship.rotate(by: .radians(roll))
        var hull = Path(); hull.move(to: CGPoint(x: -230 * u, y: -60 * u)); hull.addLine(to: CGPoint(x: 230 * u, y: -60 * u)); hull.addLine(to: CGPoint(x: 280 * u, y: -100 * u))
        hull.addLine(to: CGPoint(x: 190 * u, y: 0)); hull.addLine(to: CGPoint(x: -190 * u, y: 0)); hull.addLine(to: CGPoint(x: -260 * u, y: -90 * u)); hull.closeSubpath()
        ship.fill(hull, with: .color(ink))
        ship.fill(Path(CGRect(x: -260 * u, y: -96 * u, width: 90 * u, height: 36 * u)), with: .color(ink))
        for (mx, mh) in [(-120.0, 230.0), (20, 270), (150, 210)] {
            ship.fill(Path(CGRect(x: mx * u - 4 * u, y: -60 * u - mh * u, width: 8 * u, height: mh * u)), with: .color(ink))
            for k in 0..<2 {
                let sw = (110 - Double(k) * 24) * u, sh = 70 * u, y = -60 * u - mh * u + 40 * u + Double(k) * 96 * u
                var sail = Path(); sail.move(to: CGPoint(x: mx * u - sw / 2, y: y)); sail.addQuadCurve(to: CGPoint(x: mx * u + sw / 2, y: y), control: CGPoint(x: mx * u, y: y - 10 * u))
                sail.addLine(to: CGPoint(x: mx * u + sw / 2 + 6 * u, y: y + sh)); sail.addQuadCurve(to: CGPoint(x: mx * u - sw / 2 - 6 * u, y: y + sh), control: CGPoint(x: mx * u, y: y + sh + 18 * u)); sail.closeSubpath()
                ship.fill(sail, with: .color(c("#101a2c")))
                ship.stroke(sail, with: .color(rim.opacity(0.35)), lineWidth: 1.5 * u)
            }
        }
        var flag = Path(); let fw = sin(t * 3) * 6 * u
        flag.move(to: CGPoint(x: 24 * u, y: -330 * u)); flag.addQuadCurve(to: CGPoint(x: 84 * u, y: -324 * u + fw), control: CGPoint(x: 54 * u, y: -340 * u - fw))
        flag.addLine(to: CGPoint(x: 84 * u, y: -296 * u + fw)); flag.addQuadCurve(to: CGPoint(x: 24 * u, y: -302 * u), control: CGPoint(x: 54 * u, y: -310 * u - fw)); flag.closeSubpath()
        ship.fill(flag, with: .color(ink))
        // lit windows in the stern
        for k in 0..<3 { ship.fill(Path(CGRect(x: -246 * u + Double(k) * 24 * u, y: -86 * u, width: 12 * u, height: 12 * u)), with: .color(rim.opacity(0.85))) }
        banks(ctx, W, H, u, base)
        palm(ctx, CGPoint(x: 70 * u, y: base - 112 * u), lean: 0.45, h: 320 * u, u: u, t: t)
        palm(ctx, CGPoint(x: W - 90 * u, y: base - 52 * u), lean: -0.35, h: 270 * u, u: u, t: t + 2.1)
    }

    private func haunted(_ ctx: GraphicsContext, _ W: Double, _ H: Double, _ u: Double, _ cx: Double, _ base: Double, _ t: Double) {
        let moon = CGPoint(x: cx + 40 * u, y: base - 250 * u)
        glow(ctx, moon, 280 * u, c("#d8c8ff", 0.35)); disc(ctx, moon, 120 * u, c("#efe6ff"))
        disc(ctx, CGPoint(x: moon.x - 50 * u, y: moon.y - 30 * u), 24 * u, c("#dcd0f4")); disc(ctx, CGPoint(x: moon.x + 60 * u, y: moon.y + 40 * u), 16 * u, c("#dcd0f4"))
        ridge(ctx, W, base, u, height: 60, jag: 0, seed: 2.1, c("#1a0e33"))
        // the castle: towers with pointed roofs, battlements, windows flickering
        var castle = Path()
        let towers: [(Double, Double, Double)] = [(-250, 230, 64), (-120, 280, 72), (0, 320, 80), (130, 270, 70), (250, 220, 60)]
        for (x, h, w) in towers {
            castle.addRect(CGRect(x: cx + x * u - w * u / 2, y: base - h * u, width: w * u, height: h * u))
            castle.move(to: CGPoint(x: cx + x * u - w * u * 0.62, y: base - h * u)); castle.addLine(to: CGPoint(x: cx + x * u, y: base - h * u - w * u * 1.3)); castle.addLine(to: CGPoint(x: cx + x * u + w * u * 0.62, y: base - h * u)); castle.closeSubpath()
        }
        castle.addRect(CGRect(x: cx - 300 * u, y: base - 170 * u, width: 600 * u, height: 170 * u))
        for k in 0..<15 { castle.addRect(CGRect(x: cx - 300 * u + Double(k) * 41 * u, y: base - 192 * u, width: 22 * u, height: 22 * u)) }
        ctx.fill(castle, with: .color(ink))
        for (i, (x, h, _)) in towers.enumerated() {
            let f = 0.6 + 0.4 * sin(t * (3 + Double(i)) + Double(i) * 2)
            for k in 0..<2 { ctx.fill(Path(roundedRect: CGRect(x: cx + x * u - 8 * u, y: base - h * u + 50 * u + Double(k) * 80 * u, width: 16 * u, height: 26 * u), cornerRadius: 8 * u), with: .color(c("#ffc85a", f))) }
        }
        ctx.fill(Path(roundedRect: CGRect(x: cx - 34 * u, y: base - 90 * u, width: 68 * u, height: 90 * u), cornerRadius: 34 * u), with: .color(c("#ff9a3a", 0.7)))
        // bats wheeling round the moon
        for i in 0..<7 {
            let a = t * (0.4 + rand(i, 41) * 0.3) + rand(i, 42) * 6, r = (180 + rand(i, 43) * 180) * u
            let p = CGPoint(x: moon.x + cos(a) * r * 1.4, y: moon.y + sin(a) * r * 0.5), flap = sin(t * 14 + Double(i)) * 8 * u, s = (10 + rand(i, 44) * 8) * u
            var b = Path(); b.move(to: CGPoint(x: p.x - s * 1.6, y: p.y - flap)); b.addQuadCurve(to: p, control: CGPoint(x: p.x - s * 0.8, y: p.y + s * 0.5)); b.addQuadCurve(to: CGPoint(x: p.x + s * 1.6, y: p.y - flap), control: CGPoint(x: p.x + s * 0.8, y: p.y + s * 0.5))
            b.addQuadCurve(to: p, control: CGPoint(x: p.x + s * 0.6, y: p.y - s * 0.2)); b.addQuadCurve(to: CGPoint(x: p.x - s * 1.6, y: p.y - flap), control: CGPoint(x: p.x - s * 0.6, y: p.y - s * 0.2))
            ctx.fill(b, with: .color(ink))
        }
        // dead trees on the banks
        banks(ctx, W, H, u, base, left: 90, right: 50)
        for (x, h, dir) in [(110.0, 300.0, 1.0), (-120, 240, -1)] {
            let bx = x > 0 ? x * u : W + x * u, by = base - (x > 0 ? 90 : 40) * u
            var tr = Path(); tr.move(to: CGPoint(x: bx, y: by)); tr.addLine(to: CGPoint(x: bx + dir * 20 * u, y: by - h * u))
            for k in 0..<4 { let y = by - h * u * (0.4 + Double(k) * 0.15), l = (110 - Double(k) * 20) * u, sgn = k % 2 == 0 ? 1.0 : -1.0
                tr.move(to: CGPoint(x: bx + dir * 8 * u * Double(k), y: y)); tr.addQuadCurve(to: CGPoint(x: bx + sgn * l, y: y - l * 0.6), control: CGPoint(x: bx + sgn * l * 0.5, y: y - l * 0.05)) }
            ctx.stroke(tr, with: .color(ink), style: StrokeStyle(lineWidth: 9 * u, lineCap: .round))
        }
    }

    private func space(_ ctx: GraphicsContext, _ W: Double, _ H: Double, _ u: Double, _ cx: Double, _ base: Double, _ t: Double) {
        // a nebula smeared across the void
        for i in 0..<6 {
            let p = CGPoint(x: W * (0.1 + rand(i, 51) * 0.8), y: H * (0.1 + rand(i, 52) * 0.5))
            glow(ctx, p, (180 + rand(i, 53) * 160) * u, (i % 2 == 0 ? c("#ff3df2") : c("#2ef2ff")).opacity(0.12))
        }
        // the ringed planet, huge and low, lit from the side
        let pc = CGPoint(x: cx, y: base - 40 * u), pr = 260 * u
        glow(ctx, pc, pr * 1.5, rim.opacity(0.3))
        var back = Path(); back.addEllipse(in: CGRect(x: pc.x - pr * 1.9, y: pc.y - pr * 0.42, width: pr * 3.8, height: pr * 0.84))
        var ringBack = ctx; ringBack.clip(to: Path(CGRect(x: 0, y: 0, width: W, height: pc.y)))
        ringBack.stroke(back, with: .color(rim.opacity(0.55)), lineWidth: 18 * u)
        ctx.fill(Path(ellipseIn: CGRect(x: pc.x - pr, y: pc.y - pr, width: 2 * pr, height: 2 * pr)), with: .linearGradient(Gradient(colors: [c("#3a2a7a"), c("#120a2a")]), startPoint: CGPoint(x: pc.x + pr, y: pc.y - pr), endPoint: CGPoint(x: pc.x - pr * 0.4, y: pc.y + pr * 0.4)))
        var bands = ctx; bands.clip(to: Path(ellipseIn: CGRect(x: pc.x - pr, y: pc.y - pr, width: 2 * pr, height: 2 * pr)))
        for k in 0..<6 { bands.fill(Path(CGRect(x: pc.x - pr, y: pc.y - pr + Double(k) * pr / 3, width: 2 * pr, height: pr / 9)), with: .color(c("#6a4ab8", 0.18))) }
        var ringFront = ctx; ringFront.clip(to: Path(CGRect(x: 0, y: pc.y, width: W, height: H)))
        ringFront.stroke(back, with: .color(rim.opacity(0.75)), lineWidth: 18 * u)
        ctx.stroke(Path(ellipseIn: CGRect(x: pc.x - pr, y: pc.y - pr, width: 2 * pr, height: 2 * pr)), with: .color(rim.opacity(0.6)), lineWidth: 3 * u)
        // asteroids tumbling past, and a meteor now and then
        for i in 0..<8 {
            let k = (t * (0.012 + rand(i, 61) * 0.02) + rand(i, 62)).truncatingRemainder(dividingBy: 1)
            let p = CGPoint(x: -100 * u + k * (W + 200 * u), y: H * (0.15 + rand(i, 63) * 0.75)), r = (14 + rand(i, 64) * 40) * u
            var rock = Path(); for j in 0..<7 { let a = Double(j) / 7 * 2 * .pi + t * 0.3 * (rand(i, 65) - 0.5); let rr = r * (0.75 + 0.25 * rand(i * 7 + j, 66)); let q = CGPoint(x: p.x + cos(a) * rr, y: p.y + sin(a) * rr); if j == 0 { rock.move(to: q) } else { rock.addLine(to: q) } }
            rock.closeSubpath(); ctx.fill(rock, with: .color(c("#1a1428"))); ctx.stroke(rock, with: .color(rim.opacity(0.4)), lineWidth: 1.5 * u)
        }
        let mk = (t / 4).truncatingRemainder(dividingBy: 1)
        if mk < 0.25 { let a = CGPoint(x: W * (0.2 + mk * 2.4), y: H * (0.08 + mk * 0.8)); var m = Path(); m.move(to: a); m.addLine(to: CGPoint(x: a.x - 120 * u, y: a.y - 50 * u)); ctx.stroke(m, with: .linearGradient(Gradient(colors: [.white, .clear]), startPoint: a, endPoint: CGPoint(x: a.x - 120 * u, y: a.y - 50 * u)), style: StrokeStyle(lineWidth: 3 * u, lineCap: .round)) }
    }

    private func candy(_ ctx: GraphicsContext, _ W: Double, _ H: Double, _ u: Double, _ cx: Double, _ base: Double, _ t: Double) {
        ridge(ctx, W, base, u, height: 70, jag: 0, seed: 0.9, c("#5a1a4a"))
        // the factory: a sawtooth roof, three stacks puffing pink smoke, glowing windows
        let fx = cx - 280 * u, fw = 560 * u, fy = base - 170 * u
        var f = Path(); f.addRect(CGRect(x: fx, y: fy, width: fw, height: 170 * u))
        for k in 0..<5 { let x = fx + Double(k) * fw / 5; f.move(to: CGPoint(x: x, y: fy)); f.addLine(to: CGPoint(x: x + fw / 5, y: fy - 60 * u)); f.addLine(to: CGPoint(x: x + fw / 5, y: fy)); f.closeSubpath() }
        for (k, h) in [(0.18, 190.0), (0.5, 250), (0.8, 170)] { f.addRect(CGRect(x: fx + fw * k - 22 * u, y: fy - h * u, width: 44 * u, height: h * u)) }
        ctx.fill(f, with: .color(ink))
        for (k, h) in [(0.18, 190.0), (0.5, 250), (0.8, 170)] {
            ctx.fill(Path(CGRect(x: fx + fw * k - 22 * u, y: fy - h * u + 20 * u, width: 44 * u, height: 12 * u)), with: .color(rim.opacity(0.7)))
            for i in 0..<6 {
                let q = (t * 0.12 + Double(i) / 6 + k).truncatingRemainder(dividingBy: 1), r = (18 + 50 * q) * u
                disc(ctx, CGPoint(x: fx + fw * k + q * 120 * u + sin(q * 6) * 10 * u, y: fy - h * u - 10 * u - q * 220 * u), r, c("#ffb8d6", 0.45 * (1 - q)))
            }
        }
        for k in 0..<7 { for r in 0..<2 {
            let on = 0.6 + 0.4 * sin(t * 2 + Double(k * 3 + r))
            ctx.fill(Path(roundedRect: CGRect(x: fx + 30 * u + Double(k) * 76 * u, y: fy + 40 * u + Double(r) * 60 * u, width: 40 * u, height: 32 * u), cornerRadius: 6 * u), with: .color(c("#ffd36b", on)))
        } }
        banks(ctx, W, H, u, base)
        // giant lollipops and a candy cane on the banks
        for (x, h, r) in [(90.0, 300.0, 70.0), (220, 200, 48), (-110, 260, 62)] {
            let bx = x > 0 ? x * u : W + x * u, by = base - (x > 0 ? 100 : 40) * u, top = CGPoint(x: bx, y: by - h * u)
            ctx.fill(Path(CGRect(x: bx - 5 * u, y: top.y, width: 10 * u, height: h * u)), with: .color(ink))
            disc(ctx, top, r * u, ink)
            var sp = Path(); for j in 0..<60 { let a = Double(j) * 0.35 + t * 0.6, rr = r * u * Double(j) / 60; let q = CGPoint(x: top.x + cos(a) * rr, y: top.y + sin(a) * rr); if j == 0 { sp.move(to: q) } else { sp.addLine(to: q) } }
            ctx.stroke(sp, with: .color(rim.opacity(0.75)), lineWidth: 5 * u)
        }
    }

    private func sky10(_ ctx: GraphicsContext, _ W: Double, _ H: Double, _ u: Double, _ cx: Double, _ base: Double, _ t: Double) {
        let sun = CGPoint(x: cx, y: base + 20 * u)
        glow(ctx, sun, 520 * u, c("#ffd27a", 0.5))
        // a sea of cloud below, rolling
        for row in 0..<3 {
            for i in 0..<9 {
                let x = (Double(i) / 8 * (W + 300 * u) + t * (6 + Double(row) * 4) * u).truncatingRemainder(dividingBy: W + 300 * u) - 150 * u
                let y = base + Double(row) * 50 * u, r = (70 + rand(i + row * 9, 71) * 60) * u
                disc(ctx, CGPoint(x: x, y: y), r, c(["#f0c8a0", "#d8a8a8", "#a890b8"][row], 0.95))
            }
        }
        ctx.fill(Path(CGRect(x: 0, y: base + 130 * u, width: W, height: H)), with: .color(c("#8a78b0")))
        // the floating island with its golden castle, bobbing, rock roots hanging below
        let bob = sin(t * 0.7) * 8 * u, iy = base - 110 * u + bob
        var isl = Path(); isl.move(to: CGPoint(x: cx - 300 * u, y: iy))
        isl.addLine(to: CGPoint(x: cx + 300 * u, y: iy)); isl.addLine(to: CGPoint(x: cx + 150 * u, y: iy + 90 * u)); isl.addLine(to: CGPoint(x: cx + 30 * u, y: iy + 210 * u)); isl.addLine(to: CGPoint(x: cx - 60 * u, y: iy + 130 * u)); isl.addLine(to: CGPoint(x: cx - 190 * u, y: iy + 80 * u)); isl.closeSubpath()
        ctx.fill(isl, with: .color(ink))
        var castle = Path()
        for (x, h, w) in [(-150.0, 120.0, 46.0), (-70, 170, 54), (0, 215, 62), (80, 160, 52), (160, 112, 42)] {
            castle.addRect(CGRect(x: cx + x * u - w * u / 2, y: iy - h * u, width: w * u, height: h * u))
            castle.move(to: CGPoint(x: cx + x * u - w * u * 0.6, y: iy - h * u)); castle.addLine(to: CGPoint(x: cx + x * u, y: iy - h * u - w * u * 1.2)); castle.addLine(to: CGPoint(x: cx + x * u + w * u * 0.6, y: iy - h * u)); castle.closeSubpath()
        }
        ctx.fill(castle, with: .linearGradient(Gradient(colors: [c("#ffe27a"), c("#b8801a")]), startPoint: CGPoint(x: cx, y: iy - 380 * u), endPoint: CGPoint(x: cx, y: iy)))
        ctx.stroke(castle, with: .color(c("#5a3a08")), lineWidth: 2 * u)
        ctx.fill(Path(CGRect(x: cx - 300 * u, y: iy - 4 * u, width: 600 * u, height: 10 * u)), with: .color(c("#3a8a3a")))
        // little floating rocks either side
        for (x, y, r) in [(160.0, 260.0, 60.0), (-150, 200, 70), (300, 120, 34), (-300, 330, 40)] {
            let p = CGPoint(x: x > 0 ? x * u : W + x * u, y: y * u + sin(t * 0.8 + x) * 6 * u)
            var rk = Path(); rk.move(to: CGPoint(x: p.x - r * u, y: p.y)); rk.addLine(to: CGPoint(x: p.x + r * u, y: p.y)); rk.addLine(to: CGPoint(x: p.x + r * u * 0.2, y: p.y + r * u * 1.3)); rk.closeSubpath()
            ctx.fill(rk, with: .color(ink)); ctx.fill(Path(CGRect(x: p.x - r * u, y: p.y - 5 * u, width: 2 * r * u, height: 7 * u)), with: .color(c("#3a8a3a")))
        }
    }

    /// each world's weather
    private func particles(_ ctx: GraphicsContext, _ W: Double, _ H: Double, _ u: Double, _ cx: Double, _ base: Double, _ t: Double) {
        for i in 0..<50 {
            let life = 6 + rand(i, 20) * 6, k = ((t + rand(i, 21) * life) / life).truncatingRemainder(dividingBy: 1), x0 = rand(i, 22) * W, r = (1.2 + rand(i, 25) * 2.4) * u
            switch world {
            case 4: // snow falling, drifting
                let p = CGPoint(x: x0 + sin(k * 6 + Double(i)) * 30 * u, y: -10 * u + k * (H + 20 * u)); disc(ctx, p, r * 1.3, .white.opacity(0.85))
            case 2: // sand streaming sideways
                let p = CGPoint(x: (x0 + k * W * 1.5).truncatingRemainder(dividingBy: W), y: base - rand(i, 23) * 220 * u); ctx.fill(Path(CGRect(x: p.x, y: p.y, width: 14 * u, height: 1.5 * u)), with: .color(c("#ffd08a", 0.5 * sin(k * .pi))))
            case 3: // fireflies, blinking
                let p = CGPoint(x: x0 + sin(t * 0.5 + Double(i)) * 30 * u, y: base - rand(i, 23) * 300 * u + cos(t * 0.6 + Double(i)) * 20 * u), b = max(0, sin(t * (1 + rand(i, 24)) + Double(i) * 3))
                glow(ctx, p, r * 6, rim.opacity(0.35 * b)); disc(ctx, p, r, TitleWorld.accent(3)[0].opacity(b))
            case 7: // wisps rising
                let p = CGPoint(x: x0 + sin(k * 5 + Double(i)) * 20 * u, y: H - k * H * 0.9); glow(ctx, p, r * 5, rim.opacity(0.3 * sin(k * .pi)))
            case 9: // sprinkles tumbling down
                let p = CGPoint(x: x0, y: -10 * u + k * (H + 20 * u)); var s = ctx; s.translateBy(x: p.x, y: p.y); s.rotate(by: .radians(t * 2 + Double(i)))
                s.fill(Path(roundedRect: CGRect(x: -6 * u, y: -2 * u, width: 12 * u, height: 4 * u), cornerRadius: 2 * u), with: .color(c(["#ff4fa0", "#6bd8ff", "#ffd36b", "#7fe36b"][i % 4])))
            case 10, 5: // golden sparkles / sea spray glitter
                let p = CGPoint(x: x0, y: rand(i, 23) * base); let b = max(0, sin(t * 1.5 + Double(i) * 2.3)); disc(ctx, p, r * 0.8, TitleWorld.accent(world)[0].opacity(b * 0.8))
            case 1: // dust motes in the light
                let p = CGPoint(x: x0 + k * 80 * u, y: base - rand(i, 23) * 300 * u - k * 40 * u); disc(ctx, p, r * 0.8, c("#ffd8a0", 0.4 * sin(k * .pi)))
            default: break
            }
        }
    }
}
