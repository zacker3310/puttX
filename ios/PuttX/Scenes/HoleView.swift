// A hole. Until the RealityKit course (phase 4) and the DS-style swing (phase 3) land, this draws the
// real sim from above and takes a slingshot drag as the stroke: drag back from the ball, let go. The
// round, scoring, unlocks and the putt itself are already the real ones.
import SwiftUI
import PuttXCore

struct HoleView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    @Bindable var play: HolePlay
    @State private var drag: CGSize?

    var body: some View {
        GeometryReader { geo in
            let view = TopView(hole: play.hole, size: geo.size)
            // read in body, so every sim step redraws the canvas
            let now = Snapshot(time: play.time, ball: play.ball, phase: play.phase, drag: drag)
            ZStack(alignment: .topLeading) {
                Color(hex: play.look.ground ?? play.look.skirt).ignoresSafeArea()
                Canvas { ctx, _ in draw(ctx, view, now) }
                    .contentShape(Rectangle())
                    .gesture(slingshot(view))
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
    private func slingshot(_ v: TopView) -> some Gesture {
        DragGesture(minimumDistance: 4)
            .onChanged { g in if play.phase == .aim { drag = g.translation } }
            .onEnded { g in
                defer { drag = nil }
                guard play.phase == .aim, let shot = aim(v, g.translation) else { return }
                play.putt(angle: shot.angle, power: shot.power)
            }
    }
    /// the shot a drag asks for: away from the drag, harder the further back (full at a third of the screen)
    private func aim(_ v: TopView, _ t: CGSize) -> (angle: Double, power: Double)? {
        let len = hypot(t.width, t.height)
        guard len > st.s(18) else { return nil }
        let d = v.worldDir(-t.width, -t.height)
        var a = atan2(d.x, d.z) * 180 / .pi
        if a < 0 { a += 360 }
        return (a, min(1, Double(len) / Double(v.size.height / 3)))
    }

    // MARK: drawing
    struct Snapshot { let time: Double, ball: Ball, phase: HolePlay.Phase, drag: CGSize? }

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
            if let t = now.drag, now.phase == .aim, let shot = aim(v, t) {
                let L = (0.6 + 2.4 * shot.power) * v.k, dl = hypot(t.width, t.height)
                let end = CGPoint(x: b.x - t.width / dl * L, y: b.y - t.height / dl * L)
                ctx.stroke(Path { $0.move(to: b); $0.addLine(to: end) }, with: .color(.white.opacity(0.9)), style: StrokeStyle(lineWidth: max(3, r * 0.6), lineCap: .round, dash: [r, r * 0.8]))
            }
        }
    }
}

/// From the hole to the screen, from above: the hole fitted to the view, turned so its long side runs
/// across a landscape screen.
struct TopView {
    let size: CGSize, k: CGFloat, rot: Bool, x0: Double, z0: Double, z1: Double, ox: CGFloat, oy: CGFloat

    init(hole: Hole, size: CGSize) {
        var xa = Double.infinity, xb = -Double.infinity, za = Double.infinity, zb = -Double.infinity
        for f in hole.data.floors { for p in f.pts { xa = min(xa, p.x); xb = max(xb, p.x); za = min(za, p.z); zb = max(zb, p.z) } }
        let pad = 0.35
        xa -= pad; xb += pad; za -= pad; zb += pad
        let top: CGFloat = 130, bottom: CGFloat = 24, side: CGFloat = 24
        let w = max(1, size.width - 2 * side), h = max(1, size.height - top - bottom)
        // across: z runs left to right (tee left, cup right), x down the screen
        let kUp = min(w / (xb - xa), h / (zb - za)), kAcross = min(w / (zb - za), h / (xb - xa))
        rot = kAcross > kUp
        k = rot ? kAcross : kUp
        x0 = xa; z0 = za; z1 = zb
        self.size = size
        let cw = (rot ? zb - za : xb - xa) * k, ch = (rot ? xb - xa : zb - za) * k
        ox = side + (w - cw) / 2; oy = top + (h - ch) / 2
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
