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
                if app.renderer == .top || (app.renderer == .exported && !SceneStore.shared.has(play.hole.key)) {
                    // from above, straight from the sim: for holes whose scenery is not exported yet
                    Canvas { ctx, _ in draw(ctx, view, now) }
                        .contentShape(Rectangle())
                        .gesture(aimDrag)
                } else {
                    // the web's lens shift: the picture's centre sits 60 stage px toward the aim buttons, clear
                    // of the swing pad. The same picture: a view 120 px wider, hung off the far edge.
                    GeometryReader { full in
                        let shift = st.s(120)
                        ZStack(alignment: .topLeading) {
                            CourseView(play: play, renderer: app.renderer == .hand ? .hand : .exported)
                                .frame(width: full.size.width + shift, height: full.size.height)
                                .offset(x: lefty ? 0 : -shift)
                            if let p = play.pinOnScreen {
                                let h = play.hole, b = play.ball
                                PinTag(metres: hypot(h.cup.x - b.x, h.cup.z - b.z), riseCm: Int(((h.groundH(h.cup.x, h.cup.z) - b.y) * 100).rounded()))
                                    .fixedSize()
                                    .position(x: p.x - (lefty ? 0 : shift), y: p.y - st.s(22))
                                    .allowsHitTesting(false)
                            }
                        }
                        .contentShape(Rectangle())
                        .gesture(aimDrag)
                    }
                    .ignoresSafeArea()
                }
                // what shows when (shell.html #hole[data-phase]): the pad and the shot readout go while the
                // hole introduces itself, under the done card and in the replay; the aim controls only
                // while the ball is the player's to aim or watch
                let padUp = play.phase != .done && play.phase != .replay && play.intro == nil
                let aimUp = (play.phase == .aim || play.phase == .roll || play.phase == .drift) && play.intro == nil
                // the swing pad on the player's side, the aim buttons and the overview on the other
                if padUp {
                    SwingPad(play: play, feel: app.feel)
                        .frame(width: st.s(120), height: st.s(360))
                        .position(x: lefty ? st.s(18 + 60) : geo.size.width - st.s(18 + 60), y: geo.size.height - st.s(18 + 180))
                        .transition(.opacity)
                }
                if aimUp {
                    HStack(spacing: st.s(16)) {
                        IconButton(symbol: "chevron.left", label: "aim left") { play.aim += Swing.NUDGE_DEG }
                        IconButton(symbol: "chevron.right", label: "aim right") { play.aim -= Swing.NUDGE_DEG }
                    }
                    .position(x: lefty ? geo.size.width - st.s(24 + 96) : st.s(24 + 96), y: geo.size.height - st.s(24 + 44))
                    .disabled(play.phase != .aim)
                    .opacity(play.phase == .aim ? 1 : 0.5)
                    Button { play.overview.toggle() } label: { HudIconView(icon: .eye).frame(width: st.s(52), height: st.s(52)) }
                        .buttonStyle(ToyButtonStyle(kind: play.overview ? .yellow : .plain))
                        .accessibilityLabel("overview")
                        .position(x: lefty ? geo.size.width - st.s(24 + 44) : st.s(24 + 44), y: geo.size.height - st.s(128 + 44))
                }
                if padUp, let shot = play.lastStroke {
                    ShotPanel(stroke: shot)
                        .fixedSize()
                        .position(x: geo.size.width / 2, y: geo.size.height - st.s(20 + 42))
                        .allowsHitTesting(false)
                }
                // the top: home, the hole, par; the strokes on the right
                Button { app.go(.map(Catalog.course(of: play.hole.key))) } label: { HudIconView(icon: .home).frame(width: st.s(48), height: st.s(48)) }
                    .buttonStyle(ToyButtonStyle())
                    .accessibilityLabel("map")
                    .position(x: st.s(24 + 44), y: st.s(24 + 44))
                HudChip(icon: .hole, value: "\(Catalog.number(of: play.hole.key))").fixedSize()
                    .position(x: st.s(132) + st.s(76), y: st.s(30 + 38))
                    .accessibilityLabel("hole \(Catalog.number(of: play.hole.key))")
                HudChip(icon: .par, value: "\(play.hole.par)").fixedSize()
                    .position(x: st.s(300) + st.s(66), y: st.s(30 + 38))
                    .accessibilityLabel("par \(play.hole.par)")
                HudChip(icon: .strokes, value: "\(min(play.round.strokes, Scoring.cap(play.hole)))").fixedSize()
                    .position(x: geo.size.width - st.s(24 + 66), y: st.s(30 + 38))
                    .accessibilityLabel("\(play.round.strokes) strokes")
                // the mode chip: practice (a target), the hole of the day (a calendar, with today's best)
                if app.party == nil && (play.practice || play.daily != nil) {
                    let best = play.daily != nil && app.progress.daily?.d == play.daily ? app.progress.daily?.best : nil
                    HStack(spacing: st.s(6)) {
                        ExtraIconView(icon: play.practice ? .target : .calendar).frame(width: st.s(46), height: st.s(46))
                        if let best { Text("\(best)").font(Toy.font(40, st)).foregroundStyle(Toy.inkStrong) }
                    }
                    .padding(.leading, st.s(12)).padding(.trailing, st.s(best == nil ? 12 : 18)).frame(height: st.s(76)).toyCard(st, radius: Toy.rLg)
                    .fixedSize()
                    .position(x: geo.size.width - st.s(200 + 44), y: st.s(30 + 38))
                    .accessibilityElement(children: .ignore).accessibilityLabel(play.practice ? "practice" : "hole of the day")
                }
                // the slope read, and in practice the guide
                if aimUp {
                    Button { play.reading.toggle() } label: { ReadGlyph().frame(width: st.s(56), height: st.s(56)) }
                        .buttonStyle(ToyButtonStyle(kind: play.reading ? .go : .plain))
                        .accessibilityLabel("read the slope").accessibilityAddTraits(play.reading ? .isSelected : [])
                        .position(x: lefty ? geo.size.width - st.s(24 + 44) : st.s(24 + 44), y: geo.size.height - st.s(232 + 44))
                }
                if play.canGuide {
                    Button { play.showGuide() } label: { GuideGlyph().frame(width: st.s(56), height: st.s(56)) }
                        .buttonStyle(ToyButtonStyle())
                        .accessibilityLabel("show me the line")
                        // on a short stage the column would reach the top bar: the guide sits beside the read
                        .position(x: lefty ? geo.size.width - st.s(24 + 44 + (st.h < 600 ? 104 : 0)) : st.s(24 + 44 + (st.h < 600 ? 104 : 0)),
                                  y: geo.size.height - st.s((st.h < 600 ? 232 : 336) + 44))
                }
                // the mulligan: the last putt back, for a token
                if play.canTakeBack && play.phase == .aim && play.intro == nil && (play.practice || app.progress.mulligans > 0) {
                    MulliganButton(tokens: play.practice ? nil : app.progress.mulligans) {
                        if play.practice { play.takeBack() } else if app.progress.spendMulligan() { play.takeBack(); app.save() }
                    }
                    .position(x: st.s(452 + 44), y: st.s(24 + 44))
                    .transition(.scale.combined(with: .opacity))
                }
                if play.lostPop { LostPop().fixedSize().position(x: geo.size.width / 2, y: st.s(120 + 38)).allowsHitTesting(false) }
                // the tee sign: the hole, its par and its layout, while the hole introduces itself
                if play.banner {
                    TeeSign(hole: play.hole, aim: play.aim)
                        .position(x: geo.size.width / 2, y: st.s(min(230 + 85, st.h * 0.45)))
                        .transition(play.reduceMotion ? .opacity : .scale.combined(with: .opacity))
                        .onTapGesture { withAnimation { play.skipIntro() } }
                }
                // the ace replay: a tag, and any tap skips it
                if play.phase == .replay {
                    Color.clear.contentShape(Rectangle()).onTapGesture { play.endReplay() }
                        .accessibilityAddTraits(.isButton).accessibilityLabel("skip replay")
                    ReplayTag().frame(width: st.s(120), height: st.s(76)).position(x: geo.size.width / 2, y: st.s(24 + 38)).allowsHitTesting(false)
                }
                if app.party != nil {
                    PartyChip(p: app.party!.player).position(x: st.s(452 + 50), y: st.s(30 + 38))
                    PartyOverlay(key: play.hole.key).frame(width: geo.size.width, height: geo.size.height)
                } else if play.phase == .done, let rec = play.record { DoneCard(play: play, rec: rec).frame(width: geo.size.width, height: geo.size.height) }
            }
        }
        .onAppear {
            play.onFinish = { [weak play] score in
                guard let play else { return }
                play.record = app.finished(play, score: score)
            }
            play.start()
            app.controllers.onBack = { app.go(.map(Catalog.course(of: play.hole.key))) }
            app.controllers.attach(play)
        }
        .onDisappear { play.stop(); app.controllers.detach() }
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
                if play.intro != nil { withAnimation { play.skipIntro() } }
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
                    .onAppear { for k in 0..<stars { DispatchQueue.main.asyncAfter(deadline: .now() + 0.1 + Double(k) * 0.12) { SFX.star(k) } } }
                HStack(spacing: st.s(18)) {
                    Text("\(score)").font(Toy.font(96, st)).foregroundStyle(Toy.inkStrong)
                    Tally(value: "\(play.hole.par)") { Glyph.flag.image.resizable().scaledToFit() }
                }
                if let g = play.goals { GoalsRow(all: g.all, fresh: g.fresh) }
                HStack(spacing: st.s(24)) {
                    Button { app.go(.map(Catalog.course(of: play.hole.key))) } label: { HudIconView(icon: .home).frame(width: st.s(48), height: st.s(48)) }
                        .buttonStyle(ToyButtonStyle()).accessibilityLabel("map")
                    IconButton(symbol: "arrow.counterclockwise", label: "play again") { app.retry(play) }
                    IconButton(symbol: "play.fill", kind: .go, label: "next") { app.go(play.daily != nil ? app.afterDaily(play.hole.key) : app.next(after: play.hole.key)) }
                }
            }
            .padding(st.s(40))
            .background(Dots())
            .toyCard(st, radius: Toy.rXl)
            // the bird this finish earned, on the card's left edge (src/game.js tallyHole)
            .overlay(alignment: .topLeading) {
                if let b = play.bird { BirdBadge(kind: b, diff: score - play.hole.par).offset(x: st.s(22), y: st.s(150)) }
            }
            // coins won: a gold sticker slapped on the card's corner
            .overlay(alignment: .topTrailing) {
                if play.coinsWon > 0 {
                    HStack(spacing: st.s(6)) {
                        Glyph.coin.image.resizable().scaledToFit().frame(width: st.s(44), height: st.s(44))
                        Text("+\(play.coinsWon)").font(Toy.font(34, st)).foregroundStyle(Toy.inkStrong)
                    }
                    .padding(.horizontal, st.s(14)).frame(height: st.s(64))
                    .background(Capsule().fill(Toy.yellow)).overlay(Capsule().strokeBorder(Toy.yellowLine, lineWidth: st.s(4)))
                    .rotationEffect(.degrees(8))
                    .offset(x: st.s(24), y: -st.s(20))
                    .popIn(0.7)
                    .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) { SFX.coin() } }
                    .accessibilityElement(children: .ignore).accessibilityLabel("\(play.coinsWon) coins won")
                }
            }
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
    @State private var voPower = 0.4

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
        // VoiceOver: swipe up or down to set the power, double-tap to putt (a dead-on stroke, as a
        // controller's trigger gives), so the hole is playable without the gesture
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("swing")
        .accessibilityValue("power \(Int((voPower * 100).rounded()))")
        .accessibilityAdjustableAction { d in
            switch d { case .increment: voPower = min(1, voPower + 0.05); case .decrement: voPower = max(0.05, voPower - 0.05); default: break }
        }
        .accessibilityAction { if play.phase == .aim { play.strike(.trigger(power: voPower)) } }
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
        let s0 = samples[0], now = samples[samples.count - 1]
        play.swing = (back: max(0, now.y - s0.y), side: now.x - s0.x)
        Haptics.windup(max(0, now.y - s0.y) / Swing.FULL)
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
        play.swing = nil
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

/// the sign on a real course's tee (src/game.js holeMapSvg): the hole's number and par over a little
/// drawing of its layout seen from the tee, the line of play pointing up
struct TeeSign: View {
    @Environment(\.stage) private var st
    let hole: Hole
    let aim: Double
    var body: some View {
        // the web's banner: the hole's layout, its number big, and its par, on a dark glass pill
        let shadow = Color(red: 74 / 255, green: 53 / 255, blue: 35 / 255).opacity(0.35)
        HStack(spacing: st.s(34)) {
            Canvas { ctx, size in draw(ctx, size) }.frame(width: st.s(120), height: st.s(120))
            Text("\(Catalog.number(of: hole.key))").font(.system(size: st.s(150), weight: .black, design: .rounded).monospacedDigit())
                .foregroundStyle(.white).shadow(color: shadow, radius: 0, x: 0, y: st.s(8))
            HStack(spacing: st.s(8)) {
                HudIconView(icon: .par).frame(width: st.s(96), height: st.s(96))
                Text("\(hole.par)").font(.system(size: st.s(92), weight: .black, design: .rounded).monospacedDigit())
                    .foregroundStyle(.white).shadow(color: shadow, radius: 0, x: 0, y: st.s(8))
            }
        }
        .padding(.horizontal, st.s(44)).padding(.top, st.s(4)).padding(.bottom, st.s(10))
        .background(Capsule().fill(Color(red: 47 / 255, green: 36 / 255, blue: 26 / 255).opacity(0.55)))
        .accessibilityLabel("hole \(Catalog.number(of: hole.key)), par \(hole.par)")
    }
    private func draw(_ ctx: GraphicsContext, _ size: CGSize) {
        let a = aim * .pi / 180, fx = sin(a), fz = cos(a), rx = -cos(a), rz = sin(a)
        func P(_ p: Vec2) -> CGPoint { CGPoint(x: p.x * rx + p.z * rz, y: -(p.x * fx + p.z * fz)) }
        let pts = hole.data.floors.flatMap { $0.pts.map(P) }
        guard let x0 = pts.map(\.x).min(), let x1 = pts.map(\.x).max(), let y0 = pts.map(\.y).min(), let y1 = pts.map(\.y).max() else { return }
        let k = size.width * 0.875 / max(x1 - x0, y1 - y0, 0.5), ox = size.width / 2 - (x0 + x1) / 2 * k, oy = size.height / 2 - (y0 + y1) / 2 * k
        func S(_ p: Vec2) -> CGPoint { let q = P(p); return CGPoint(x: q.x * k + ox, y: q.y * k + oy) }
        func poly(_ ring: [Vec2]) -> Path { Path { $0.addLines(ring.map(S)); $0.closeSubpath() } }
        let s = size.width / 96
        for f in hole.data.floors { ctx.fill(poly(f.pts), with: .color(Toy.green)); ctx.stroke(poly(f.pts), with: .color(Color(hex: "#fffdf7")), lineWidth: 3 * s) }
        let zf: [Surface: Color] = [.water: Toy.blue, .sand: Color(hex: "#e9cf9a"), .ice: Color(hex: "#cfeaf5"), .mud: Color(hex: "#8a6a4a"), .fast: Color(hex: "#5f8fc4")]
        for z in hole.data.zones { if let s = z.surf, let c = zf[s] { ctx.fill(poly(z.poly.pts), with: .color(c)) } }
        for w in hole.data.walls { ctx.stroke(Path { $0.addLines(w.map(S)) }, with: .color(Color(hex: "#fffdf7")), style: StrokeStyle(lineWidth: 2.5 * s, lineCap: .round, lineJoin: .round)) }
        let t = S(hole.tee), c = S(hole.cup)
        ctx.fill(Path(ellipseIn: CGRect(x: t.x - 4.5 * s, y: t.y - 4.5 * s, width: 9 * s, height: 9 * s)), with: .color(Color(hex: "#fffdf7")))
        ctx.stroke(Path { $0.move(to: c); $0.addLine(to: CGPoint(x: c.x, y: c.y - 14 * s)) }, with: .color(Color(hex: "#fffdf7")), lineWidth: 2 * s)
        ctx.fill(Path { $0.move(to: CGPoint(x: c.x, y: c.y - 14 * s)); $0.addLine(to: CGPoint(x: c.x + 9 * s, y: c.y - 10.5 * s)); $0.addLine(to: CGPoint(x: c.x, y: c.y - 7 * s)); $0.closeSubpath() }, with: .color(Toy.red))
        ctx.fill(Path(ellipseIn: CGRect(x: c.x - 3 * s, y: c.y - 3 * s, width: 6 * s, height: 6 * s)), with: .color(Color(hex: "#2f241a")))
    }
}
