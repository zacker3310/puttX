// The title, loud: a volcano island at dusk, lava glowing in the crater, palms black against a red sky,
// embers rising, the sea glinting below; the logo in chrome and molten orange, cut out in black and
// pushed out in 3D; play on a riveted gunmetal plate. Cartoon shapes, heavy-metal finish.
import SwiftUI

/// the scene behind the title, drawn in stage px (1200 x 700) scaled to the screen's height
struct MetalTitleScene: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var start = Date()
    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30, paused: reduceMotion)) { tl in
            let t = reduceMotion ? 0 : tl.date.timeIntervalSince(start)
            Canvas { ctx, size in MetalTitlePainter().draw(ctx, size, t) }
        }
        .accessibilityHidden(true)
    }
}

struct MetalTitlePainter {
    private func rand(_ i: Int, _ salt: Int) -> Double {
        var x = UInt32(truncatingIfNeeded: i &* 374761393 &+ salt &* 668265263 &+ 1442695041)
        x = (x ^ (x >> 13)) &* 1274126177
        return Double(x ^ (x >> 16)) / Double(UInt32.max)
    }

    func draw(_ ctx: GraphicsContext, _ size: CGSize, _ t: Double) {
        let W = size.width, H = size.height, u = H / 700, cx = W / 2
        let sea = H * 0.74

        // the sky: night overhead burning down to a red-orange horizon
        ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .linearGradient(
            Gradient(stops: [.init(color: Color(hex: "#12081f"), location: 0), .init(color: Color(hex: "#3a1240"), location: 0.32),
                             .init(color: Color(hex: "#9b2338"), location: 0.6), .init(color: Color(hex: "#ff6a1f"), location: 0.92), .init(color: Color(hex: "#ffb347"), location: 1)]),
            startPoint: .zero, endPoint: CGPoint(x: 0, y: sea)))
        // a few hard stars up top
        for i in 0..<40 {
            let p = CGPoint(x: rand(i, 1) * W, y: rand(i, 2) * sea * 0.38), tw = 0.35 + 0.65 * (0.5 + 0.5 * sin(t * (0.8 + rand(i, 3) * 2) + rand(i, 4) * 6))
            let r = (0.8 + rand(i, 5) * 1.6) * u
            ctx.fill(Path(ellipseIn: CGRect(x: p.x - r, y: p.y - r, width: 2 * r, height: 2 * r)), with: .color(.white.opacity(tw * 0.8)))
        }
        // god rays fanning from behind the volcano, turning slowly
        let vx = cx, vtop = sea - 175 * u
        var rays = ctx
        rays.translateBy(x: vx, y: vtop + 20 * u)
        rays.rotate(by: .radians(sin(t * 0.15) * 0.08))
        for i in 0..<9 {
            let a = -Double.pi / 2 + (Double(i) - 4) * 0.27, w = 0.06
            var p = Path()
            p.move(to: .zero)
            p.addLine(to: CGPoint(x: cos(a - w) * 1400 * u, y: sin(a - w) * 1400 * u))
            p.addLine(to: CGPoint(x: cos(a + w) * 1400 * u, y: sin(a + w) * 1400 * u))
            p.closeSubpath()
            rays.fill(p, with: .color(Color(hex: "#ffb36b").opacity(0.07)))
        }

        // far islands, hazy purple
        var far = Path()
        far.move(to: CGPoint(x: 0, y: sea))
        for j in 0...40 {
            let x = W * Double(j) / 40, y = sea - (34 + 26 * sin(Double(j) * 0.7) + 20 * sin(Double(j) * 1.9 + 1)) * u * (j < 6 || j > 34 ? 1.4 : 0.6)
            far.addLine(to: CGPoint(x: x, y: y))
        }
        far.addLine(to: CGPoint(x: W, y: sea)); far.closeSubpath()
        ctx.fill(far, with: .color(Color(hex: "#4a1a45")))

        // the volcano: a black cone, its rim lit from the crater, lava running down one flank
        var cone = Path()
        cone.move(to: CGPoint(x: vx - 300 * u, y: sea))
        cone.addCurve(to: CGPoint(x: vx - 52 * u, y: vtop), control1: CGPoint(x: vx - 190 * u, y: sea - 60 * u), control2: CGPoint(x: vx - 90 * u, y: vtop + 90 * u))
        cone.addLine(to: CGPoint(x: vx + 48 * u, y: vtop + 4 * u))
        cone.addCurve(to: CGPoint(x: vx + 360 * u, y: sea), control1: CGPoint(x: vx + 100 * u, y: vtop + 110 * u), control2: CGPoint(x: vx + 220 * u, y: sea - 50 * u))
        cone.closeSubpath()
        ctx.fill(cone, with: .linearGradient(Gradient(colors: [Color(hex: "#3b1424"), Color(hex: "#1a0a14")]), startPoint: CGPoint(x: vx, y: vtop), endPoint: CGPoint(x: vx, y: sea)))
        let glow = 0.75 + 0.25 * sin(t * 2.3)
        ctx.fill(Path(ellipseIn: CGRect(x: vx - 160 * u, y: vtop - 110 * u, width: 320 * u, height: 220 * u)),
                 with: .radialGradient(Gradient(colors: [Color(hex: "#ff8a2a").opacity(0.55 * glow), .clear]), center: CGPoint(x: vx, y: vtop), startRadius: 0, endRadius: 160 * u))
        var lava = Path()
        lava.move(to: CGPoint(x: vx - 30 * u, y: vtop + 2 * u))
        lava.addCurve(to: CGPoint(x: vx + 40 * u, y: vtop + 150 * u), control1: CGPoint(x: vx - 10 * u, y: vtop + 50 * u), control2: CGPoint(x: vx + 50 * u, y: vtop + 90 * u))
        lava.addCurve(to: CGPoint(x: vx + 10 * u, y: vtop + 250 * u), control1: CGPoint(x: vx + 30 * u, y: vtop + 190 * u), control2: CGPoint(x: vx - 5 * u, y: vtop + 210 * u))
        ctx.stroke(lava, with: .color(Color(hex: "#ff5a1a").opacity(0.9)), style: StrokeStyle(lineWidth: 10 * u, lineCap: .round))
        ctx.stroke(lava, with: .color(Color(hex: "#ffd36b").opacity(0.8 * glow)), style: StrokeStyle(lineWidth: 3.5 * u, lineCap: .round))
        ctx.fill(Path(ellipseIn: CGRect(x: vx - 50 * u, y: vtop - 8 * u, width: 100 * u, height: 18 * u)), with: .color(Color(hex: "#ffb347")))
        // smoke rolling up and away
        for i in 0..<7 {
            let k = (t * 0.06 + Double(i) / 7).truncatingRemainder(dividingBy: 1)
            let r = (30 + 90 * k) * u, p = CGPoint(x: vx - 20 * u - k * 260 * u + sin(k * 6 + Double(i)) * 20 * u, y: vtop - 30 * u - k * 300 * u)
            ctx.fill(Path(ellipseIn: CGRect(x: p.x - r, y: p.y - r, width: 2 * r, height: 2 * r)), with: .color(Color(hex: "#2a1020").opacity(0.5 * (1 - k))))
        }

        // the near island, black, with palms leaning out over the water
        var land = Path()
        land.move(to: CGPoint(x: 0, y: H))
        land.addLine(to: CGPoint(x: 0, y: sea - 120 * u))
        land.addCurve(to: CGPoint(x: cx - 260 * u, y: sea + 40 * u), control1: CGPoint(x: 120 * u, y: sea - 140 * u), control2: CGPoint(x: cx - 420 * u, y: sea + 10 * u))
        land.addLine(to: CGPoint(x: cx - 260 * u, y: H)); land.closeSubpath()
        ctx.fill(land, with: .color(Color(hex: "#12060e")))
        palm(ctx, CGPoint(x: 70 * u, y: sea - 112 * u), lean: 0.45, h: 330 * u, u: u, t: t)
        palm(ctx, CGPoint(x: 210 * u, y: sea - 70 * u), lean: 0.2, h: 250 * u, u: u, t: t + 1.3)
        var right = Path()
        right.move(to: CGPoint(x: W, y: H))
        right.addLine(to: CGPoint(x: W, y: sea - 60 * u))
        right.addCurve(to: CGPoint(x: W - 220 * u, y: sea + 30 * u), control1: CGPoint(x: W - 80 * u, y: sea - 70 * u), control2: CGPoint(x: W - 160 * u, y: sea + 10 * u))
        right.addLine(to: CGPoint(x: W - 220 * u, y: H)); right.closeSubpath()
        ctx.fill(right, with: .color(Color(hex: "#12060e")))
        palm(ctx, CGPoint(x: W - 90 * u, y: sea - 52 * u), lean: -0.35, h: 280 * u, u: u, t: t + 2.1)

        // the sea: dark, the sky's fire laid across it in broken glints
        var water = ctx
        let seaRect = CGRect(x: 0, y: sea, width: W, height: H - sea)
        water.clip(to: Path(seaRect))
        water.fill(Path(seaRect), with: .linearGradient(Gradient(colors: [Color(hex: "#5a1a2e"), Color(hex: "#14081a")]), startPoint: CGPoint(x: 0, y: sea), endPoint: CGPoint(x: 0, y: H)))
        for i in 0..<34 {
            let row = rand(i, 7), y = sea + 6 * u + row * row * (H - sea), spread = (60 + row * 260) * u
            let x = vx + (rand(i, 8) - 0.5) * 2 * spread + sin(t * (0.6 + rand(i, 9)) + Double(i)) * 14 * u
            let w = (18 + rand(i, 10) * 50) * u * (0.4 + row), a = 0.25 + 0.5 * (0.5 + 0.5 * sin(t * 1.7 + Double(i) * 1.3))
            water.fill(Path(roundedRect: CGRect(x: x - w / 2, y: y, width: w, height: 3 * u), cornerRadius: 1.5 * u), with: .color(Color(hex: "#ffb347").opacity(a * (1 - row * 0.6))))
        }
        // the island's own reflection, darkening the water at the shore
        ctx.fill(Path(CGRect(x: 0, y: sea, width: W, height: 3 * u)), with: .color(Color(hex: "#ffb347").opacity(0.35)))

        // embers rising off the crater and drifting over everything
        for i in 0..<46 {
            let life = 6 + rand(i, 20) * 6, k = ((t + rand(i, 21) * life) / life).truncatingRemainder(dividingBy: 1)
            let x = vx + (rand(i, 22) - 0.5) * 300 * u - k * (200 + rand(i, 23) * 600) * u + sin(k * 9 + Double(i)) * 18 * u
            let y = vtop + 20 * u - k * (vtop + 80 * u) + rand(i, 24) * 200 * u
            let r = (1.4 + rand(i, 25) * 2.6) * u, a = sin(k * .pi)
            ctx.fill(Path(ellipseIn: CGRect(x: x - r * 3, y: y - r * 3, width: r * 6, height: r * 6)), with: .color(Color(hex: "#ff7a1a").opacity(0.18 * a)))
            ctx.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r)), with: .color(Color(hex: "#ffd36b").opacity(0.9 * a)))
        }
        // a vignette pulling the eye to the middle
        ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .radialGradient(Gradient(colors: [.clear, .black.opacity(0.55)]), center: CGPoint(x: cx, y: H * 0.45), startRadius: H * 0.45, endRadius: max(W, H) * 0.8))
    }

    /// a palm in silhouette: a curved trunk and fronds that sway
    private func palm(_ ctx: GraphicsContext, _ base: CGPoint, lean: Double, h: Double, u: Double, t: Double) {
        let top = CGPoint(x: base.x + lean * h * 0.6, y: base.y - h)
        var trunk = Path()
        trunk.move(to: base)
        trunk.addQuadCurve(to: top, control: CGPoint(x: base.x + lean * h * 0.05, y: base.y - h * 0.6))
        ctx.stroke(trunk, with: .color(Color(hex: "#12060e")), style: StrokeStyle(lineWidth: 13 * u, lineCap: .round))
        let sway = sin(t * 0.9) * 0.06
        for i in 0..<7 {
            let a = -Double.pi / 2 + (Double(i) - 3) * 0.5 + sway + lean * 0.3, len = h * (0.42 + 0.06 * Double(i % 2))
            let end = CGPoint(x: top.x + cos(a) * len, y: top.y + sin(a) * len * 0.55 + len * 0.42)
            let mid = CGPoint(x: top.x + cos(a) * len * 0.55, y: top.y + sin(a) * len * 0.6 - 12 * u)
            var f = Path()
            f.move(to: top)
            f.addQuadCurve(to: end, control: CGPoint(x: mid.x, y: mid.y - 16 * u))
            f.addQuadCurve(to: top, control: CGPoint(x: mid.x, y: mid.y + 10 * u))
            ctx.fill(f, with: .color(Color(hex: "#12060e")))
        }
    }
}

/// the logo: chrome letters and a molten X, cut out in black, pushed out in 3D, tilted for attitude
struct MetalLogo: View {
    @Environment(\.stage) private var st
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shine = false
    private func word(_ s: String) -> Text { Text(verbatim: s).font(.system(size: st.s(156), weight: .black, design: .default).width(.expanded).italic()) }
    private func layers(_ s: String, fill: LinearGradient, depth: Color) -> some View {
        ZStack {
            // the extrusion, stepping down and right into the dark
            ForEach((1...14).reversed(), id: \.self) { i in word(s).foregroundStyle(depth).offset(x: st.s(Double(i) * 0.7), y: st.s(Double(i) * 1.1)) }
            // the cut-out outline
            ForEach(0..<12, id: \.self) { i in
                let a = Double(i) / 12 * 2 * .pi
                word(s).foregroundStyle(Color.black).offset(x: cos(a) * st.s(6), y: sin(a) * st.s(6))
            }
            word(s).foregroundStyle(fill)
            // a hard bevel highlight along the tops of the letters
            word(s).foregroundStyle(LinearGradient(stops: [.init(color: .white.opacity(0.85), location: 0), .init(color: .white.opacity(0), location: 0.28)], startPoint: .top, endPoint: .bottom))
                .mask(word(s).offset(y: st.s(4)))
        }
    }
    var body: some View {
        let chrome = LinearGradient(stops: [.init(color: Color(hex: "#f4f6fa"), location: 0), .init(color: Color(hex: "#a9b0bc"), location: 0.42), .init(color: Color(hex: "#4b525e"), location: 0.5),
                                            .init(color: Color(hex: "#c7ccd5"), location: 0.62), .init(color: Color(hex: "#7d8593"), location: 1)], startPoint: .top, endPoint: .bottom)
        let molten = LinearGradient(stops: [.init(color: Color(hex: "#fff2a8"), location: 0), .init(color: Color(hex: "#ffb02e"), location: 0.35), .init(color: Color(hex: "#ff5a1a"), location: 0.6), .init(color: Color(hex: "#b3200f"), location: 1)], startPoint: .top, endPoint: .bottom)
        HStack(spacing: -st.s(10)) {
            layers("Putt", fill: chrome, depth: Color(hex: "#1b1d24"))
            layers("X", fill: molten, depth: Color(hex: "#5a0d08"))
                .shadow(color: Color(hex: "#ff5a1a").opacity(0.55), radius: st.s(8))
                .scaleEffect(1.18, anchor: .bottomLeading)
        }
        // a glint sweeping across the metal now and then
        .overlay {
            GeometryReader { g in
                LinearGradient(colors: [.clear, .white.opacity(0.4), .clear], startPoint: .leading, endPoint: .trailing)
                    .frame(width: g.size.width * 0.08)
                    .rotationEffect(.degrees(18))
                    .offset(x: shine ? g.size.width * 1.2 : -g.size.width * 0.4)
                    .blendMode(.plusLighter)
            }
            .mask(HStack(spacing: -st.s(10)) { word("Putt"); word("X").scaleEffect(1.18, anchor: .bottomLeading) })
            .allowsHitTesting(false)
        }
        .rotationEffect(.degrees(-5))
        .shadow(color: .black.opacity(0.6), radius: st.s(18), y: st.s(14))
        .onAppear { if !reduceMotion { withAnimation(.easeInOut(duration: 1.4).delay(0.8).repeatForever(autoreverses: false).delay(2.6)) { shine = true } } }
        .accessibilityElement(children: .ignore).accessibilityLabel("PuttX")
    }
}

/// a riveted gunmetal plate that glows orange at the edges and slams down when pressed
struct MetalButtonStyle: ButtonStyle {
    var radius: CGFloat = 26
    var size: CGSize
    var hot = true
    @Environment(\.stage) private var st
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed, shape = RoundedRectangle(cornerRadius: st.s(radius), style: .continuous)
        let w = st.s(size.width), h = st.s(size.height), rv = st.s(7), inset = st.s(16)
        configuration.label
            .frame(width: w, height: h)
            .background {
                ZStack {
                    shape.fill(LinearGradient(colors: [Color(hex: "#6a707c"), Color(hex: "#3a3f49"), Color(hex: "#23262d")], startPoint: .top, endPoint: .bottom))
                    // brushed grain
                    shape.fill(LinearGradient(stops: (0..<14).map { .init(color: .white.opacity($0 % 2 == 0 ? 0.035 : 0), location: Double($0) / 13) }, startPoint: .top, endPoint: .bottom))
                    Gloss(shape: shape).padding(st.s(5)).opacity(0.55)
                    // rivets at the corners
                    ForEach(0..<4, id: \.self) { i in
                        Circle().fill(RadialGradient(colors: [Color(hex: "#e6e9ef"), Color(hex: "#5b616c")], center: .topLeading, startRadius: 0, endRadius: rv * 1.6))
                            .overlay(Circle().strokeBorder(.black.opacity(0.6), lineWidth: st.s(1.5)))
                            .frame(width: rv * 2, height: rv * 2)
                            .position(x: i % 2 == 0 ? inset : w - inset, y: i < 2 ? inset : h - inset)
                    }
                }
            }
            .overlay(shape.strokeBorder(LinearGradient(colors: hot ? [Color(hex: "#ffd36b"), Color(hex: "#ff5a1a")] : [Color(hex: "#c7ccd5"), Color(hex: "#5b616c")], startPoint: .top, endPoint: .bottom), lineWidth: st.s(5)))
            .overlay(shape.inset(by: st.s(5)).strokeBorder(.black.opacity(0.55), lineWidth: st.s(2)))
            .background(shape.fill(Color(hex: "#0d0e12")).offset(y: pressed ? st.s(2) : st.s(8)))
            .compositingGroup()
            .shadow(color: hot ? Color(hex: "#ff5a1a").opacity(pressed ? 0.35 : 0.6) : .black.opacity(0.4), radius: st.s(pressed ? 8 : 18))
            .scaleEffect(x: pressed && !reduceMotion ? 1.04 : 1, y: pressed && !reduceMotion ? 0.93 : 1, anchor: .bottom)
            .offset(y: pressed ? st.s(6) : 0)
            .animation(reduceMotion ? nil : .spring(response: 0.14, dampingFraction: 0.55), value: pressed)
            .contentShape(shape)
            .onChange(of: pressed) { _, down in if down { SFX.tap(); Haptics.tap() } }
    }
}

/// play: a molten triangle, cut out in black
struct MoltenPlay: View {
    @Environment(\.stage) private var st
    var body: some View {
        Image(systemName: "play.fill")
            .font(.system(size: st.s(64), weight: .black))
            .foregroundStyle(LinearGradient(colors: [Color(hex: "#fff2a8"), Color(hex: "#ffb02e"), Color(hex: "#ff5a1a")], startPoint: .top, endPoint: .bottom))
            .shadow(color: .black, radius: 0, x: st.s(3), y: st.s(4))
            .shadow(color: Color(hex: "#ff7a1a").opacity(0.8), radius: st.s(14))
    }
}
