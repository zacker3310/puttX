// The menu scenes, after src/game.js section 7: the title, the three profiles, the ten worlds, a
// world's road of courses, and a course's snake of holes.
import SwiftUI
import PuttXCore

// MARK: title
struct TitleView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    var body: some View {
        let look = app.looks[1]
        ZStack {
            SkyBackground(colors: look.skyColors)
            // rolling hills and the green, as on the web's title art
            Canvas { ctx, size in
                let w = size.width, h = size.height
                var hill = Path(); hill.move(to: CGPoint(x: 0, y: h * 0.62))
                hill.addCurve(to: CGPoint(x: w, y: h * 0.58), control1: CGPoint(x: w * 0.3, y: h * 0.48), control2: CGPoint(x: w * 0.7, y: h * 0.7))
                hill.addLine(to: CGPoint(x: w, y: h)); hill.addLine(to: CGPoint(x: 0, y: h)); hill.closeSubpath()
                ctx.fill(hill, with: .linearGradient(Gradient(colors: [Color(hex: "#8fd16f"), Color(hex: "#3f6a5a")]), startPoint: .zero, endPoint: CGPoint(x: w, y: 0)))
                var green = Path(); green.move(to: CGPoint(x: 0, y: h * 0.8))
                green.addCurve(to: CGPoint(x: w, y: h * 0.76), control1: CGPoint(x: w * 0.35, y: h * 0.7), control2: CGPoint(x: w * 0.65, y: h * 0.86))
                green.addLine(to: CGPoint(x: w, y: h)); green.addLine(to: CGPoint(x: 0, y: h)); green.closeSubpath()
                ctx.fill(green, with: .color(Color(hex: "#4fae4a")))
            }
            .ignoresSafeArea()
            VStack(spacing: st.s(40)) {
                LogoSign().popIn()
                Button { app.go(.profiles) } label: {
                    Image(systemName: "play.fill").font(.system(size: st.s(64), weight: .black))
                }
                .buttonStyle(ToyButtonStyle(kind: .go, radius: Toy.rXl, size: CGSize(width: 220, height: 120)))
                .accessibilityLabel("play")
                .popIn(0.15)
            }
        }
    }
}

/// the title sign: the one place on screen with letters (the logo, `data-logo` on the web)
struct LogoSign: View {
    @Environment(\.stage) private var st
    var body: some View {
        Text(verbatim: "PuttX")
            .font(.system(size: st.s(132), weight: .black, design: .rounded))
            .foregroundStyle(Toy.surface)
            .shadow(color: Toy.woodDark, radius: 0, x: 0, y: st.s(6))
            .padding(.horizontal, st.s(56)).padding(.vertical, st.s(14))
            .background(RoundedRectangle(cornerRadius: st.s(Toy.rXl), style: .continuous).fill(LinearGradient(colors: [Color(hex: "#d79a55"), Color(hex: "#a8692f")], startPoint: .top, endPoint: .bottom)))
            .overlay(RoundedRectangle(cornerRadius: st.s(Toy.rXl), style: .continuous).strokeBorder(Toy.woodDark, lineWidth: st.s(6)))
            .background(RoundedRectangle(cornerRadius: st.s(Toy.rXl), style: .continuous).fill(Toy.shadow.opacity(0.3)).offset(y: st.s(10)))
            .accessibilityLabel("PuttX")
    }
}

// MARK: profiles
struct ProfilesView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    @State private var armed = 0
    @State private var disarm: Task<Void, Never>?

    var body: some View {
        ZStack(alignment: .top) {
            Toy.surface2.ignoresSafeArea()
            Dots().ignoresSafeArea()
            TopBar { BackButton { app.go(.title) } } right: { EmptyView() }
            HStack(alignment: .top, spacing: st.s(48)) {
                ForEach(1...AppModel.slots, id: \.self) { n in profile(n).popIn(Double(n - 1) * 0.07) }
            }
            .padding(.top, st.s(130))
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
    }

    @ViewBuilder private func profile(_ n: Int) -> some View {
        let p = app.load(n), used = !(p?.holes.isEmpty ?? true)
        // the card fills what the stage has under the top bar, above its buttons; the ball takes what is left
        let cardH = min(420, st.h - 130 - 88 - 22 - 30), ball = max(56, min(120, cardH - 230))
        VStack(spacing: st.s(22)) {
            Button {
                app.useSlot(n)
                if used { app.go(.worlds) } else { app.go(.hole(app.catalog.allCourses[0].description + "-1")) }
            } label: {
                VStack(spacing: st.s(14)) {
                    Text("\(n)").font(Toy.font(cardH < 300 ? 40 : 56, st)).foregroundStyle(Toy.inkSoft)
                    if let p, used {
                        BallIcon().frame(width: st.s(ball), height: st.s(ball))
                        HStack(spacing: st.s(10)) {
                            Tally(value: "\(p.holes.values.reduce(0) { $0 + $1.stars })") { StarView() }
                            Tally(value: "\(p.coins)") { Glyph.coin.image.resizable().scaledToFit() }
                        }
                        Tally(value: "\(p.worlds.filter { !app.catalog.isExtra($0) }.map(app.catalog.world(of:)).max() ?? 1)") { Glyph.flag.image.resizable().scaledToFit() }
                    } else {
                        Image(systemName: "plus").font(.system(size: st.s(90), weight: .black)).foregroundStyle(.white)
                            .frame(width: st.s(150), height: st.s(150)).background(Circle().fill(Toy.green))
                    }
                }
                .padding(.vertical, st.s(14))
                .frame(width: st.s(300), height: st.s(cardH))
                .toyCard(st, radius: Toy.rXl, fill: n == app.slot && used ? Toy.surface : Toy.surface.opacity(0.96))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("profile \(n)")
            if used {
                HStack(spacing: st.s(20)) {
                    Button { tapBin(n) } label: { Image(systemName: "trash.fill").font(.system(size: st.s(36), weight: .bold)) }
                        .buttonStyle(ToyButtonStyle(kind: armed == n ? .red : .plain))
                        .accessibilityLabel("erase profile \(n)")
                    if let p, let next = p.nextHole(catalog: app.catalog) {
                        Button { app.useSlot(n); app.go(.hole(next)) } label: {
                            HStack(spacing: st.s(6)) { Image(systemName: "play.fill"); Text("\(Catalog.number(of: next))") }
                        }
                        .buttonStyle(ToyButtonStyle(kind: .go, size: CGSize(width: 130, height: 88)))
                        .accessibilityLabel("carry on with profile \(n)")
                    }
                }
            }
        }
    }

    /// erasing takes two taps: the first arms the bin for three seconds
    private func tapBin(_ n: Int) {
        disarm?.cancel()
        if armed != n {
            armed = n
            disarm = Task { try? await Task.sleep(for: .seconds(3)); if !Task.isCancelled { armed = 0 } }
        } else { armed = 0; app.erase(n) }
    }
}

// MARK: worlds
struct WorldsView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    var body: some View {
        ZStack(alignment: .top) {
            Toy.surface2.ignoresSafeArea()
            Dots().ignoresSafeArea()
            TopBar { BackButton { app.go(.profiles) } } right: {
                Wallet()
                IconButton(symbol: app.progress.neon ? "moon.stars.fill" : "sun.max.fill", kind: app.progress.neon ? .blue : .plain, label: "neon night") { app.toggleNeon() }
                SoundButton()
            }
            let cols = Array(repeating: GridItem(.fixed(st.s(196)), spacing: st.s(20)), count: 5)
            VStack(spacing: st.s(26)) {
                LazyVGrid(columns: cols, spacing: st.s(20)) {
                    ForEach(Array(app.catalog.worldOrder.enumerated()), id: \.element) { i, w in worldCard(w).popIn(Double(i) * 0.03) }
                }
                HStack(spacing: st.s(24)) {
                    extra(Catalog.classic, .classic, label: "classic")
                    extra(Catalog.bonus, .bonus, label: "bonus nine")
                }
            }
            .padding(.top, st.s(130))
        }
    }

    private func worldCard(_ w: Int) -> some View {
        let open = app.open(course: w), look = app.looks[w]
        let stars = app.catalog.courses(ofWorld: w).reduce(0) { $0 + app.progress.stars(course: $1, catalog: app.catalog) }
        let cardH = st.s(min(200, (st.h - 330) / 2))
        return Button { if open { app.go(.world(w)) } } label: {
            ZStack {
                LinearGradient(colors: look.skyColors, startPoint: .top, endPoint: .bottom)
                look.iconImage?.resizable().scaledToFit().padding(st.s(34)).opacity(open ? 1 : 0.45)
                VStack {
                    HStack { Text("\(w)").font(Toy.font(34, st)).foregroundStyle(Toy.inkStrong).padding(.leading, st.s(16)).padding(.top, st.s(8)); Spacer() }
                    Spacer()
                    if open { Tally(value: "\(stars)") { StarView() }.padding(.bottom, st.s(10)) }
                    else { Glyph.lock.image.resizable().scaledToFit().frame(width: st.s(48)).padding(.bottom, st.s(10)) }
                }
            }
            .frame(width: st.s(196), height: cardH)
            .clipShape(RoundedRectangle(cornerRadius: st.s(Toy.rLg), style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: st.s(Toy.rLg), style: .continuous).strokeBorder(open ? Toy.surface : Toy.mute, lineWidth: st.s(6)))
            .background(RoundedRectangle(cornerRadius: st.s(Toy.rLg), style: .continuous).fill(Toy.shadow.opacity(0.18)).offset(y: st.s(6)))
            .saturation(open ? 1 : 0.35)
        }
        .buttonStyle(PressDown())
        .accessibilityLabel("world \(w)")
    }

    private func extra(_ c: Int, _ g: Glyph, label: String) -> some View {
        Button { if app.catalog.has(course: c) { app.go(.map(c)) } } label: { g.image.resizable().scaledToFit().frame(width: st.s(60)) }
            .buttonStyle(ToyButtonStyle(kind: app.catalog.has(course: c) ? .plain : .locked, size: CGSize(width: 120, height: 88)))
            .accessibilityLabel(label)
    }
}

/// a card that presses down a little when touched
struct PressDown: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.scaleEffect(configuration.isPressed && !reduceMotion ? 0.96 : 1)
            .animation(.spring(response: 0.18, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

// MARK: a world: its three courses along one road
struct WorldView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    let world: Int

    var body: some View {
        let look = app.look(world), cs = app.catalog.courses(ofWorld: world)
        // the web's WORLD_POS, with y as a share of a 700 px stage
        // (written as Doubles: CGPoint has an Int initializer, and 470 / 700 would be 0)
        let pos: [CGPoint] = [(230.0, 470.0), (600.0, 330.0), (970.0, 470.0)]
            .map { CGPoint(x: $0.0 / 1200 * st.w, y: $0.1 / 700 * st.h) }
        ZStack(alignment: .topLeading) {
            LinearGradient(stops: [.init(color: look.skyColors[0], location: 0), .init(color: look.skyColors[1], location: 0.62),
                                   .init(color: look.color(look.felt), location: 0.62), .init(color: look.color(look.felt), location: 1)],
                           startPoint: .top, endPoint: .bottom).ignoresSafeArea()
            Path { p in
                let pts = Array(pos.prefix(cs.count))
                p.move(to: st.pt(80, st.h * 0.8))
                for q in pts { p.addLine(to: st.pt(q.x, q.y)) }
                p.addLine(to: st.pt(st.w - 60, st.h * 0.8))
            }
            .stroke(Toy.wood.opacity(0.85), style: StrokeStyle(lineWidth: st.s(58), lineCap: .round, lineJoin: .round))
            ForEach(Array(cs.enumerated()), id: \.element) { k, c in
                courseNode(c, k).position(st.pt(pos[k].x, pos[k].y)).popIn(Double(k) * 0.08)
            }
            TopBar {
                BackButton { app.go(.worlds) }
                look.iconImage?.resizable().scaledToFit().frame(width: st.s(80), height: st.s(80))
                Text("\(world)").font(Toy.font(56, st)).foregroundStyle(Toy.surface)
            } right: { Wallet() }
        }
    }

    private func courseNode(_ c: Int, _ k: Int) -> some View {
        let open = app.open(course: c), hs = app.catalog.holes(course: c)
        let done = hs.allSatisfy { app.progress.holes[$0.key] != nil }
        let crazy = hs.filter { $0.data.crazy }.count
        return Button { if open { app.go(.map(c)) } } label: {
            VStack(spacing: st.s(4)) {
                Text("\(k + 1)").font(Toy.font(64, st))
                if open {
                    Tally(value: "\(app.progress.stars(course: c, catalog: app.catalog))/\(hs.count * 3)") { StarView() }
                    if crazy > 0 { Tally(value: "\(crazy)") { Glyph.crazy.image.resizable().scaledToFit() } }
                } else { Glyph.lock.image.resizable().scaledToFit().frame(width: st.s(56)) }
            }
            .padding(st.s(10))
        }
        .buttonStyle(ToyButtonStyle(kind: open ? (done ? .yellow : .go) : .locked, radius: Toy.rXl, size: CGSize(width: 220, height: 200)))
        .accessibilityLabel("course \(k + 1)")
    }
}

// MARK: a course: its holes in a snake, left to right along the top, back along the bottom
struct MapView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    let course: Int

    var body: some View {
        let look = app.look(course), holes = app.catalog.holes(course: course)
        let rowY = [st.h * 310 / 700, st.h * 550 / 700], dx = (st.w - 260) / 8
        let pts: [CGPoint] = holes.indices.map { i in i < 9 ? CGPoint(x: 130 + CGFloat(i) * dx, y: rowY[0]) : CGPoint(x: st.w - 130 - CGFloat(i - 9) * dx, y: rowY[1]) }
        ZStack(alignment: .topLeading) {
            SkyBackground(colors: look.skyColors)
            Path { p in p.addLines(pts.map { st.pt($0.x, $0.y) }) }
                .stroke(Toy.surfaceLine, style: StrokeStyle(lineWidth: st.s(22), lineCap: .round, lineJoin: .round, dash: [st.s(2), st.s(34)]))
            ForEach(Array(holes.enumerated()), id: \.offset) { i, h in
                node(h, i).position(st.pt(pts[i].x, pts[i].y)).popIn(Double(i) * 0.03)
            }
            TopBar {
                BackButton { app.go(app.catalog.isExtra(course) ? .worlds : .world(app.catalog.world(of: course))) }
                badge
            } right: { Wallet(); SoundButton() }
        }
    }

    private var badge: some View {
        let isExtra = app.catalog.isExtra(course)
        let n = isExtra ? app.catalog.holes(course: course).count : (app.catalog.courses(ofWorld: app.catalog.world(of: course)).firstIndex(of: course) ?? 0) + 1
        let icon: Image? = course == Catalog.bonus ? Glyph.bonus.image : course == Catalog.classic ? Glyph.classic.image : app.looks[course].iconImage
        return HStack(spacing: st.s(10)) {
            icon?.resizable().scaledToFit().frame(width: st.s(64), height: st.s(64))
            Text("\(n)").font(Toy.font(48, st)).foregroundStyle(Toy.inkStrong)
        }
        .padding(.horizontal, st.s(20)).frame(height: st.s(88)).toyCard(st, radius: Toy.rMd)
    }

    private func node(_ h: Hole, _ i: Int) -> some View {
        let rec = app.progress.holes[h.key], open = app.unlocked(h.key)
        return Button { if open { app.go(.hole(h.key)) } } label: {
            ZStack {
                Text("\(i + 1)").font(Toy.font(40, st)).offset(y: rec == nil ? 0 : -st.s(8))
                if let rec {
                    HStack(spacing: 0) { ForEach(0..<3) { k in StarView(on: k < rec.stars).frame(width: st.s(26)) } }.offset(y: st.s(26))
                    Text("\(rec.best)").font(Toy.font(22, st)).foregroundStyle(.white).frame(width: st.s(34), height: st.s(34))
                        .background(Circle().fill(Toy.blue)).offset(x: st.s(40), y: -st.s(40))
                }
                if h.data.crazy { Glyph.crazy.image.resizable().scaledToFit().frame(width: st.s(30)).offset(x: -st.s(40), y: -st.s(40)) }
                if !open { Glyph.lock.image.resizable().scaledToFit().frame(width: st.s(34)).offset(x: st.s(36), y: st.s(36)) }
            }
        }
        .buttonStyle(ToyButtonStyle(kind: open ? (rec == nil ? .go : .plain) : .locked, radius: Toy.rLg))
        .accessibilityLabel("hole \(i + 1)")
    }
}
