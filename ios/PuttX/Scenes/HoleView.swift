// A hole. The stroke is the web's: the DS-style swing pad on the player's side (touch, pull down, push
// back up through the touch), aim by dragging the course sideways or tapping the aim buttons. Until the
// RealityKit course lands (phase 4) the hole is drawn from above, from the real sim.
import SwiftUI
import PuttXCore

struct HoleView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    @Bindable var play: HolePlay
    /// the course drag that turns the aim: the aim when it started
    @State private var aimFrom: Double?

    var body: some View {
        GeometryReader { geo in
            let lefty = app.progress.hand == "L"
            // the course fits the room the controls leave: the top bar above, the pad's column on the
            // player's side, the aim buttons below
            let pad = st.s(18 + 120 + 22), view = TopView(hole: play.hole, size: geo.size, top: st.s(130), bottom: st.s(124),
                                                         left: lefty ? pad : st.s(24), right: lefty ? st.s(24) : pad)
            // read in body, so every sim step redraws the canvas
            let now = Snapshot(time: play.time, ball: play.ball, phase: play.phase, aim: play.aim)
            ZStack(alignment: .topLeading) {
                Color(hex: play.look.ground ?? play.look.skirt).ignoresSafeArea()
                Canvas { ctx, _ in draw(ctx, view, now) }
                    .contentShape(Rectangle())
                    .gesture(aimDrag)
                // the swing pad on the player's side, the aim buttons on the other
                SwingPad(play: play, feel: Feel())
                    .frame(width: st.s(120), height: st.s(360))
                    .position(x: lefty ? st.s(18 + 60) : geo.size.width - st.s(18 + 60), y: geo.size.height - st.s(18 + 180))
                HStack(spacing: st.s(16)) {
                    IconButton(symbol: "chevron.left", label: "aim left") { play.aim += Swing.NUDGE_DEG }
                    IconButton(symbol: "chevron.right", label: "aim right") { play.aim -= Swing.NUDGE_DEG }
                }
                .position(x: lefty ? geo.size.width - st.s(24 + 96) : st.s(24 + 96), y: geo.size.height - st.s(24 + 44))
                .disabled(play.phase != .aim)
                if let shot = play.lastStroke {
                    ShotReadout(stroke: shot)
                        .position(x: lefty ? st.s(18 + 120 + 90) : geo.size.width - st.s(18 + 120 + 90), y: geo.size.height - st.s(18 + 30))
                }
                TopBar {
                    BackButton { app.go(.map(Catalog.course(of: play.hole.key))) }
                    hud
                } right: { SoundButton() }
                if play.phase == .done, let rec = play.record { DoneCard(play: play, rec: rec).frame(width: geo.size.width, height: geo.size.height) }
            }
        }
        .onAppear {
            play.onFinish = { [weak play] score in
                guard let play else { return }
                play.record = app.finished(play.hole, score: score)
            }
            play.start()
        }
        .onDisappear { play.stop() }
    }

    private var hud: some View {
        HStack(spacing: st.s(14)) {
            Text("\(Catalog.number(of: play.hole.key))").font(Toy.font(48, st)).foregroundStyle(Toy.inkStrong)
                .frame(minWidth: st.s(88), minHeight: st.s(88)).toyCard(st, radius: Toy.rMd)
                .accessibilityLabel("hole \(Catalog.number(of: play.hole.key))")
            Tally(value: "\(play.hole.par)") { Glyph.flag.image.resizable().scaledToFit() }.accessibilityLabel("par \(play.hole.par)")
            Tally(value: "\(play.round.strokes)") { Image(systemName: "figure.golf").resizable().scaledToFit().foregroundStyle(Toy.inkStrong) }
                .accessibilityLabel("\(play.round.strokes) strokes")
        }
    }

    // MARK: input
    /// drag the course sideways to turn the aim, as on the web (0.12 degrees per stage px)
    private var aimDrag: some Gesture {
        DragGesture(minimumDistance: 6)
            .onChanged { g in
                guard play.phase == .aim else { return }
                let from = aimFrom ?? play.aim
                aimFrom = from
                play.aim = from - Double(g.translation.width / st.scale) * Swing.AIM_DEG_PX
            }
            .onEnded { _ in aimFrom = nil }
    }

    // MARK: drawing
    struct Snapshot { let time: Double, ball: Ball, phase: HolePlay.Phase, aim: Double }

    private func draw(_ ctx: GraphicsContext, _ v: TopView, _ now: Snapshot) {
        let h = play.hole, d = h.data, look = play.look
        func poly(_ p: Poly) -> Path { Path { $0.addLines(p.pts.map(v.pt)); $0.closeSubpath() } }
        func color(_ s: Surface?) -> Color {
            switch s { case .sand: look.color(look.sand); case .ice: look.color(look.ice); case .mud: look.color(look.mud)
            case .fast: look.color(look.fast); case .water: look.color(look.water); default: look.color(look.push) }
        }
        let felt = look.color(look.felt)
        for f in d.floors { ctx.fill(poly(f), with: .color(felt)) }
        // tiers read lighter the higher they stand
        for t in d.tiers { ctx.fill(poly(t.poly), with: .color(.white.opacity(min(0.25, max(0, t.h) * 0.4)))) }
        for r in d.ramps {
            let rect = Path { $0.addLines([v.pt(Vec2(r.x0, r.z0)), v.pt(Vec2(r.x1, r.z0)), v.pt(Vec2(r.x1, r.z1)), v.pt(Vec2(r.x0, r.z1))]); $0.closeSubpath() }
            ctx.fill(rect, with: .color(.white.opacity(0.08)))
        }
        for z in d.zones { ctx.fill(poly(z.poly), with: .color(color(z.surf).opacity(z.surf == nil ? 0.55 : 1))) }
        for b in d.bumps {
            let c = v.pt(Vec2(b.x, b.z)), r = v.k * b.r * 1.4
            ctx.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r)),
                     with: .radialGradient(Gradient(colors: [(b.h > 0 ? Color.white : .black).opacity(min(0.3, abs(b.h) * 2)), .clear]), center: c, startRadius: 0, endRadius: r))
        }
        // the cup, its dish and the flag
        let cup = v.pt(h.cup), cr = v.k * Sim.CUP_R
        ctx.fill(Path(ellipseIn: CGRect(x: cup.x - cr, y: cup.y - cr, width: 2 * cr, height: 2 * cr)), with: .color(Color(hex: "#1d150e")))
        // tee mat
        let tee = v.pt(h.tee), tm = v.k * 0.14
        ctx.fill(Path(roundedRect: CGRect(x: tee.x - tm, y: tee.y - tm, width: 2 * tm, height: 2 * tm), cornerRadius: tm * 0.3), with: .color(Toy.shadow.opacity(0.25)))
        for tb in d.tubes {
            for (p, a) in [(tb.a, 1.0), (tb.b, 0.6)] {
                let c = v.pt(p), r = v.k * Sim.TUBE_R
                ctx.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r)), with: .color(look.color(look.tube).opacity(a)))
            }
        }
        // walls
        let wall = look.color(look.wall), ww = max(2, v.k * 2 * Sim.WALL_HALF)
        for s in h.segs {
            ctx.stroke(Path { $0.move(to: v.pt(Vec2(s.ax, s.az))); $0.addLine(to: v.pt(Vec2(s.bx, s.bz))) }, with: .color(wall), style: StrokeStyle(lineWidth: ww, lineCap: .round))
        }
        for p in d.posts {
            let c = v.pt(Vec2(p.x, p.z)), r = v.k * p.r
            ctx.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r)), with: .color(p.e > 1 ? Toy.red : wall))
        }
        for m in d.movers {
            let s = m.state(at: now.time)
            for b in s.bars {
                ctx.stroke(Path { $0.move(to: v.pt(Vec2(b.ax, b.az))); $0.addLine(to: v.pt(Vec2(b.bx, b.bz))) }, with: .color(Toy.red), style: StrokeStyle(lineWidth: ww, lineCap: .round))
            }
            if s.bars.isEmpty, let r = m.r {
                let c = v.pt(Vec2(s.x, s.z)), rr = v.k * r
                ctx.fill(Path(ellipseIn: CGRect(x: c.x - rr, y: c.y - rr, width: 2 * rr, height: 2 * rr)), with: .color(Toy.woodDark))
            }
            if m.kind == .spin, let x = m.x, let z = m.z {
                let c = v.pt(Vec2(x, z)), r = ww
                ctx.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r)), with: .color(Toy.inkStrong))
            }
        }
        // the flag over the cup
        ctx.stroke(Path { $0.move(to: cup); $0.addLine(to: CGPoint(x: cup.x, y: cup.y - v.k * 0.5)) }, with: .color(.white), lineWidth: max(2, v.k * 0.012))
        ctx.fill(Path { $0.move(to: CGPoint(x: cup.x, y: cup.y - v.k * 0.5)); $0.addLine(to: CGPoint(x: cup.x + v.k * 0.22, y: cup.y - v.k * 0.42)); $0.addLine(to: CGPoint(x: cup.x, y: cup.y - v.k * 0.34)); $0.closeSubpath() }, with: .color(look.color(look.flag)))
        // the ball, lifted by its height (a shadow stays on the ground)
        let ball = now.ball
        if ball.tube == nil && now.phase != .done {
            let b = v.pt(Vec2(ball.x, ball.z)), r = max(5, v.k * Sim.BALL_R), lift = CGFloat(max(0, ball.y - h.groundH(ball.x, ball.z))) * v.k
            ctx.fill(Path(ellipseIn: CGRect(x: b.x - r, y: b.y - r * 0.6, width: 2 * r, height: 1.4 * r)), with: .color(.black.opacity(0.25)))
            ctx.fill(Path(ellipseIn: CGRect(x: b.x - r, y: b.y - r - lift, width: 2 * r, height: 2 * r)), with: .color(Color(hex: "#fffdf7")))
            // the aim line: 1.8 m along the aim (the web's AIM_LEN)
            if now.phase == .aim {
                let a = now.aim * .pi / 180, end = v.pt(Vec2(ball.x + sin(a) * 1.8, ball.z + cos(a) * 1.8))
                ctx.stroke(Path { $0.move(to: b); $0.addLine(to: end) }, with: .color(.white.opacity(0.9)), style: StrokeStyle(lineWidth: max(3, r * 0.6), lineCap: .round, dash: [r, r * 0.8]))
            }
        }
    }
}

/// From the hole to the screen, from above: the hole fitted to the view, turned so its long side runs
/// across a landscape screen.
struct TopView {
    let size: CGSize, k: CGFloat, rot: Bool, x0: Double, z0: Double, z1: Double, ox: CGFloat, oy: CGFloat

    init(hole: Hole, size: CGSize, top: CGFloat, bottom: CGFloat, left: CGFloat, right: CGFloat) {
        var xa = Double.infinity, xb = -Double.infinity, za = Double.infinity, zb = -Double.infinity
        for f in hole.data.floors { for p in f.pts { xa = min(xa, p.x); xb = max(xb, p.x); za = min(za, p.z); zb = max(zb, p.z) } }
        let pad = 0.35
        xa -= pad; xb += pad; za -= pad; zb += pad
        let w = max(1, size.width - left - right), h = max(1, size.height - top - bottom)
        // across: z runs left to right (tee left, cup right), x down the screen
        let kUp = min(w / (xb - xa), h / (zb - za)), kAcross = min(w / (zb - za), h / (xb - xa))
        rot = kAcross > kUp
        k = rot ? kAcross : kUp
        x0 = xa; z0 = za; z1 = zb
        self.size = size
        let cw = (rot ? zb - za : xb - xa) * k, ch = (rot ? xb - xa : zb - za) * k
        ox = left + (w - cw) / 2; oy = top + (h - ch) / 2
    }
    func pt(_ p: Vec2) -> CGPoint {
        rot ? CGPoint(x: ox + (p.z - z0) * k, y: oy + (p.x - x0) * k) : CGPoint(x: ox + (p.x - x0) * k, y: oy + (z1 - p.z) * k)
    }
    /// a screen direction as a world direction
    func worldDir(_ dx: CGFloat, _ dy: CGFloat) -> Vec2 { rot ? Vec2(Double(dy), Double(dx)) : Vec2(Double(dx), Double(-dy)) }
}

/// the hole is in: stars, the score, and on to the next
struct DoneCard: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    let play: HolePlay
    let rec: HoleRecord

    var body: some View {
        let score = play.round.score ?? 0, stars = Scoring.stars(score, play.hole.par)
        ZStack {
            Toy.scrim.ignoresSafeArea()
            VStack(spacing: st.s(22)) {
                HStack(spacing: st.s(8)) { ForEach(0..<3) { k in StarView(on: k < stars).frame(width: st.s(96)).popIn(0.1 + Double(k) * 0.12) } }
                HStack(spacing: st.s(18)) {
                    Text("\(score)").font(Toy.font(96, st)).foregroundStyle(Toy.inkStrong)
                    Tally(value: "\(play.hole.par)") { Glyph.flag.image.resizable().scaledToFit() }
                }
                HStack(spacing: st.s(24)) {
                    IconButton(symbol: "arrow.counterclockwise", label: "play again") { app.go(.hole(play.hole.key)) }
                    IconButton(symbol: "play.fill", kind: .go, label: "next") { app.go(app.next(after: play.hole.key)) }
                }
            }
            .padding(st.s(40))
            .background(Dots())
            .toyCard(st, radius: Toy.rXl)
            .popIn()
        }
        .accessibilityElement(children: .contain)
    }
}

/// The swing pad: touch anywhere on it, pull down for the backswing, push back up through where you
/// touched. It shows only the path your finger drew: the touch (dot and dashed line), the pull back
/// (yellow) and the push through (green, red when the stroke was off). The last one stays until the
/// next touch; before the first, an up-down hint.
struct SwingPad: View {
    @Environment(\.stage) private var st
    let play: HolePlay
    let feel: Feel
    @State private var samples: [PadSample] = []
    @State private var last: (samples: [PadSample], clean: Bool)?
    @State private var struck = false

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: st.s(Toy.rXl), style: .continuous), swinging = !samples.isEmpty
        GeometryReader { g in
            Canvas { ctx, size in drawPath(ctx, size) }
                .background(shape.fill(Toy.surface.opacity(0.94)))
                .overlay(shape.strokeBorder(swinging ? Toy.yellowLine : Toy.surfaceLine, lineWidth: st.s(4)))
                .background(shape.fill(Toy.shadow.opacity(0.14)).offset(y: st.s(6)))
                .contentShape(shape)
                .gesture(DragGesture(minimumDistance: 0, coordinateSpace: .local)
                    .onChanged { v in touch(v) }
                    .onEnded { _ in letGo() })
                .frame(width: g.size.width, height: g.size.height)
        }
        .opacity(play.phase == .aim ? 1 : 0.6)
        .accessibilityLabel("swing")
    }

    /// pad points to stage px: the stroke is measured in stage px, as on the web
    private func sample(_ v: DragGesture.Value, at p: CGPoint) -> PadSample {
        PadSample(t: v.time.timeIntervalSinceReferenceDate, x: Double(p.x / st.scale), y: Double(p.y / st.scale))
    }
    private func touch(_ v: DragGesture.Value) {
        if samples.isEmpty {
            guard play.phase == .aim else { return }
            struck = false
            samples = [sample(v, at: v.startLocation)]
            if v.location == v.startLocation { return }
        }
        guard !struck else { return }
        samples.append(sample(v, at: v.location))
        if let s = Stroke.from(samples, feel: feel) {
            struck = true
            last = (samples, s.clean)
            play.strike(s)
        }
    }
    private func letGo() {
        // let go before the ball: no stroke, and the pull back still shows
        if !struck && samples.count > 1 { last = (samples, true) }
        samples = []
    }

    private func drawPath(_ ctx: GraphicsContext, _ size: CGSize) {
        let path: (samples: [PadSample], clean: Bool)? = samples.isEmpty ? last : (samples, true)
        let lw = st.s(6)
        guard let path, let s0 = path.samples.first else {
            // the hint: down, then up
            let x = size.width / 2, y0 = size.height * 0.3, y1 = size.height * 0.75
            var p = Path(); p.move(to: CGPoint(x: x, y: y0)); p.addLine(to: CGPoint(x: x, y: y1))
            p.move(to: CGPoint(x: x - st.s(16), y: y1 - st.s(16))); p.addLine(to: CGPoint(x: x, y: y1)); p.addLine(to: CGPoint(x: x + st.s(16), y: y1 - st.s(16)))
            p.move(to: CGPoint(x: x - st.s(16), y: y0 + st.s(16))); p.addLine(to: CGPoint(x: x, y: y0)); p.addLine(to: CGPoint(x: x + st.s(16), y: y0 + st.s(16)))
            ctx.stroke(p, with: .color(Toy.surfaceDown), style: StrokeStyle(lineWidth: st.s(5), lineCap: .round, lineJoin: .round))
            return
        }
        let sm = path.samples, clean = path.clean
        let pt = { (q: PadSample) in CGPoint(x: q.x * st.scale, y: q.y * st.scale) }
        let y = s0.y * st.scale
        ctx.stroke(Path { $0.move(to: CGPoint(x: 0, y: y)); $0.addLine(to: CGPoint(x: size.width, y: y)) }, with: .color(Toy.surfaceDown), style: StrokeStyle(lineWidth: st.s(3), dash: [st.s(6), st.s(8)]))
        let k = sm.indices.max { sm[$0].y < sm[$1].y } ?? 0
        ctx.stroke(Path { $0.addLines(sm[...k].map(pt)) }, with: .color(Toy.yellowDown), style: StrokeStyle(lineWidth: lw, lineCap: .round, lineJoin: .round))
        if k < sm.count - 1 {
            ctx.stroke(Path { $0.addLines(sm[k...].map(pt)) }, with: .color(clean ? Toy.greenLine : Toy.redLine), style: StrokeStyle(lineWidth: lw, lineCap: .round, lineJoin: .round))
        }
        let c = pt(s0), r = st.s(9)
        ctx.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r)), with: .color(Color(hex: "#fffdf7")))
        ctx.stroke(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r)), with: .color(Toy.inkSoft), lineWidth: st.s(4))
    }
}

/// the shot readout: the power, and a dot for the start line (green dead on, yellow a little off, red off)
struct ShotReadout: View {
    @Environment(\.stage) private var st
    let stroke: Stroke
    var body: some View {
        let t = abs(stroke.turn), dot = t < 0.75 ? Toy.green : t < 2.5 ? Toy.yellow : Toy.red
        Tally(value: "\(Int((stroke.power * 100).rounded()))") { Circle().fill(dot).overlay(Circle().strokeBorder(Toy.shadow.opacity(0.3), lineWidth: st.s(3))) }
            .accessibilityLabel("power \(Int((stroke.power * 100).rounded()))")
    }
}
