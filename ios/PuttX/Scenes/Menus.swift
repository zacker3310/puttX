// The menu scenes, after src/game.js section 7: the title, the three profiles, the ten worlds, a
// world's road of courses, and a course's snake of holes.
import SwiftUI
import PuttXCore

// MARK: title
/// the web's title: its illustration, alive, and the big green play pill on the green (src/shell.html #titleGo)
struct TitleView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pulse = false
    var body: some View {
        GeometryReader { g in
            let u = g.size.height / 700, world = TitleWorld.today, accent = TitleWorld.accent(world)
            ZStack {
                WorldTitleScene(world: world)
                MetalLogo(accent: accent)
                    .position(x: g.size.width / 2, y: g.size.height * 0.25)
                    .popIn(0.1)
                Button { app.go(.profiles) } label: { MoltenPlay(accent: accent) }
                    .buttonStyle(MetalButtonStyle(radius: 34, size: CGSize(width: 300, height: 128), accent: accent))
                    .scaleEffect(pulse ? 1.04 : 1)
                    .position(x: g.size.width / 2, y: g.size.height / 2 + 170 * u)
                    .accessibilityLabel("play")
                    .popIn(0.3)
                    .onAppear { if !reduceMotion { withAnimation(.easeInOut(duration: 0.9).repeatForever().delay(1.2)) { pulse = true } } }
                // the hole of the day, bottom right
                DailyButton()
                    .position(x: g.size.width - st.s(26 + 118) - g.safeAreaInsets.trailing, y: g.size.height - st.s(24 + 56) - g.safeAreaInsets.bottom)
                    .popIn(0.5)
            }
        }
        .ignoresSafeArea()
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
    @State private var shakes = 0
    @State private var disarm: Task<Void, Never>?

    var body: some View {
        ZStack(alignment: .top) {
            WorldScene(look: app.look(app.catalog.allCourses[0])).ignoresSafeArea()
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
                .modifier(ProfileCard(state: !used ? .empty : n == app.slot ? .last : .plain))
            }
            .buttonStyle(PressDown())
            .accessibilityLabel("profile \(n)")
            if used {
                HStack(spacing: st.s(20)) {
                    Button { tapBin(n) } label: { Image(systemName: "trash.fill").font(.system(size: st.s(36), weight: .bold)) }
                        .buttonStyle(ToyButtonStyle(kind: armed == n ? .red : .plain))
                        // armed: a little shake (still under reduced motion)
                        .modifier(Shake(n: armed == n ? shakes : 0))
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
            withAnimation(.linear(duration: 0.8)) { shakes += 1 }
            disarm = Task { try? await Task.sleep(for: .seconds(3)); if !Task.isCancelled { armed = 0 } }
        } else { armed = 0; app.erase(n) }
    }
}

// MARK: worlds
/// the ten worlds as big cards (src/game.js showWorlds; src/shell.html #worldGrid)
struct WorldsView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    @State private var settings = false
    var body: some View {
        // two rows of 248 px cards under the top bar; a short phone stage scales the grid to fit
        let f = min(1, (st.h - 136 - 24) / (248 * 2 + 24))
        ZStack(alignment: .topLeading) {
            WorldScene(look: app.look(app.catalog.allCourses[0]), horizon: 0.86).ignoresSafeArea()
            let cols = Array(repeating: GridItem(.fixed(st.s(200 * f)), spacing: st.s(24 * f)), count: 5)
            LazyVGrid(columns: cols, spacing: st.s(24 * f)) {
                ForEach(Array(app.catalog.worldOrder.enumerated()), id: \.element) { i, w in worldCard(w, f).popIn(Double(i) * 0.03) }
            }
            .frame(width: st.w * st.scale)
            .padding(.top, st.s(136))
            // the top: home, the bonus nine, the classic; coins and sound on the right
            HStack(spacing: st.s(16)) {
                Button { app.go(.title) } label: { HudIconView(icon: .home).frame(width: st.s(48), height: st.s(48)) }
                    .buttonStyle(ToyButtonStyle()).accessibilityLabel("home")
                extraChip(Catalog.bonus, .bonus, face: Color(hex: "#1d1240"), rim: Color(hex: "#ff3df2"), down: Color(hex: "#0b0620"), ink: Color(hex: "#2ef2ff"), glow: true, label: "bonus nine")
                extraChip(Catalog.classic, .classic, face: Color(hex: "#e9efe6"), rim: Color(hex: "#9aa3ad"), down: Color(hex: "#6f7881"), ink: Color(hex: "#2e5a3a"), glow: false, label: "classic")
                Spacer()
                Wallet()
                // the pro shop
                Button { app.go(.shop) } label: { ShopGlyph().frame(width: st.s(62), height: st.s(62)) }
                    .buttonStyle(ToyButtonStyle(kind: .yellow)).accessibilityLabel("pro shop")
                IconButton(symbol: "gearshape.fill", label: "settings") { withAnimation(.spring(response: 0.3)) { settings = true } }
            }
            .padding(.horizontal, st.s(24)).padding(.top, st.s(24))
            if settings { SettingsPanel { withAnimation(.spring(response: 0.3)) { settings = false } }.transition(.opacity) }
        }
    }

    private func worldCard(_ w: Int, _ f: Double) -> some View {
        let open = app.open(course: w), look = app.looks[w]
        let stars = app.catalog.courses(ofWorld: w).reduce(0) { $0 + app.progress.stars(course: $1, catalog: app.catalog) }
        let shape = RoundedRectangle(cornerRadius: st.s(Toy.rXl * f), style: .continuous)
        return Button { if open { app.go(.world(w)) } } label: {
            ZStack(alignment: .topLeading) {
                // a little window into the world, alive; a locked one stands grey and still
                WorldScene(look: look, horizon: 0.74, compact: true)
                    .saturation(open ? 1 : 0).opacity(open ? 1 : 0.55)
                    .background(Toy.mute)
                VStack(spacing: st.s(10 * f)) {
                    look.iconImage?.resizable().scaledToFit().frame(width: st.s(84 * f), height: st.s(84 * f))
                        .frame(width: st.s(116 * f), height: st.s(116 * f))
                        .background(Circle().fill(Color(hex: "#fffdf7").opacity(0.85)))
                        .opacity(open ? 1 : 0.45)
                    if open {
                        HStack(spacing: st.s(4)) { StarView().frame(width: st.s(26 * f)); Text("\(stars)") }
                            .font(Toy.font(26 * f, st)).foregroundStyle(Toy.inkStrong)
                            .padding(.horizontal, st.s(12)).padding(.vertical, st.s(2))
                            .background(Capsule().fill(Color(hex: "#fffdf7").opacity(0.9)))
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                Text("\(w)").font(Toy.font(30 * f, st)).foregroundStyle(Toy.inkStrong).padding(.leading, st.s(12)).padding(.top, st.s(6))
                if !open { Glyph.lock.image.resizable().scaledToFit().frame(width: st.s(40 * f)).frame(maxWidth: .infinity, alignment: .topTrailing).padding(st.s(12)) }
            }
            .frame(width: st.s(200 * f), height: st.s(248 * f))
            .clipShape(shape)
            .overlay(Gloss(shape: shape).opacity(0.6))
            .overlay(shape.strokeBorder(open ? Toy.surfaceLine : Toy.muteLine, lineWidth: st.s(6)))
            .shadow(color: Toy.shadow.opacity(0.3), radius: st.s(10), y: st.s(10))
        }
        .buttonStyle(PressDown(locked: !open))
        .accessibilityLabel("world \(w)")
    }

    /// a chip into an extra course: the bonus nine glows neon, the classic is a silver rail
    private func extraChip(_ c: Int, _ g: Glyph, face: Color, rim: Color, down: Color, ink: Color, glow: Bool, label: String) -> some View {
        let has = app.catalog.has(course: c), shape = RoundedRectangle(cornerRadius: st.s(Toy.rMd), style: .continuous)
        return Button { if has { app.go(.map(c)) } } label: {
            HStack(spacing: st.s(8)) {
                g.image.resizable().scaledToFit().frame(width: st.s(54), height: st.s(54))
                Text("\(app.catalog.holes(course: c).count)").font(.system(size: st.s(44), weight: .black, design: .rounded)).foregroundStyle(ink)
            }
            .frame(width: st.s(160), height: st.s(88))
            .background(shape.fill(face))
            .overlay(shape.strokeBorder(rim, lineWidth: st.s(4)))
            .background(shape.fill(down).offset(y: st.s(6)))
            .shadow(color: glow ? rim.opacity(0.8) : .clear, radius: glow ? st.s(8) : 0)
        }
        .buttonStyle(PressDown(locked: !has))
        .opacity(has ? 1 : 0)
        .allowsHitTesting(has)
        .accessibilityHidden(!has)
        .accessibilityLabel(label)
    }
}

/// a card that presses down a little when touched
struct PressDown: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    /// a locked thing boinks and stays put, as on the web
    var locked = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(x: configuration.isPressed && !reduceMotion && !locked ? 0.97 : 1, y: configuration.isPressed && !reduceMotion && !locked ? 0.93 : 1, anchor: .bottom)
            .offset(y: configuration.isPressed && !locked ? 4 : 0)
            .animation(.spring(response: 0.18, dampingFraction: 0.6), value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, down in
                guard down else { return }
                if locked { SFX.boink() } else { SFX.tap(); Haptics.tap() }
            }
    }
}

// MARK: a world: its three courses along one road (src/game.js showWorld)
struct WorldView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let world: Int
    @State private var hop = false
    @State private var tracking = false

    var body: some View {
        let look = app.look(world), cs = app.catalog.courses(ofWorld: world)
        // the web's WORLD_POS on a 1200 x 700 stage, y as a share of the height (written as Doubles:
        // CGPoint has an Int initializer, and 470 / 700 would be 0)
        let pos: [CGPoint] = [(230.0, 470.0), (600.0, 330.0), (970.0, 470.0)].map { CGPoint(x: $0.0 / 1200 * st.w, y: $0.1 / 700 * st.h) }
        let P = Array(pos.prefix(cs.count))
        let next = cs.firstIndex { c in app.open(course: c) && !app.catalog.holes(course: c).allSatisfy { app.progress.holes[$0.key] != nil } }
        ZStack(alignment: .topLeading) {
            WorldScene(look: look, horizon: 0.62).ignoresSafeArea()
            // the road: a wide tan band with a white dotted line down its middle
            let road = Path { p in
                p.move(to: st.pt(80, st.h * 0.8))
                var prev = CGPoint(x: 80, y: st.h * 0.8)
                for (i, q) in P.enumerated() {
                    let c1 = CGPoint(x: i == 0 ? 160 : (prev.x + q.x) / 2, y: i == 0 ? st.h * 0.8 : (i % 2 == 1 ? q.y - 40 : q.y + 120))
                    p.addQuadCurve(to: st.pt(q.x, q.y), control: st.pt(c1.x, c1.y)); prev = q
                }
                p.addQuadCurve(to: st.pt(st.w - 60, st.h * 0.8), control: st.pt(st.w - 100, st.h * 0.8))
            }
            road.stroke(Toy.wood.opacity(0.85), style: StrokeStyle(lineWidth: st.s(58), lineCap: .round, lineJoin: .round))
            road.stroke(Color(hex: "#fffdf7"), style: StrokeStyle(lineWidth: st.s(10), lineCap: .round, dash: [st.s(2), st.s(30)]))
            ForEach(Array(cs.enumerated()), id: \.element) { k, c in
                courseNode(c, k).position(st.pt(P[k].x, P[k].y)).popIn(Double(k) * 0.08)
            }
            // a ball hops over the course to play next
            if let n = next {
                Circle().fill(RadialGradient(colors: [.white, Toy.surfaceLine], center: UnitPoint(x: 0.35, y: 0.35), startRadius: 0, endRadius: st.s(30)))
                    .overlay(Circle().strokeBorder(Toy.inkSoft.opacity(0.4), lineWidth: st.s(2)))
                    .frame(width: st.s(44), height: st.s(44))
                    .position(st.pt(P[n].x, P[n].y - 118 - (hop ? 14 : 0)))
                    .onAppear { if !reduceMotion { withAnimation(.easeInOut(duration: 0.45).repeatForever()) { hop = true } } }
            }
            HStack(spacing: st.s(16)) {
                BackButton { app.go(.worlds) }
                HStack(spacing: st.s(6)) {
                    look.iconImage?.resizable().scaledToFit().frame(width: st.s(54), height: st.s(54))
                    Text("\(world)").font(Toy.font(40, st)).foregroundStyle(Toy.inkStrong)
                }
                .padding(.horizontal, st.s(18)).frame(height: st.s(76)).toyCard(st, radius: Toy.rLg)
                Spacer()
                IconButton(symbol: app.progress.neon ? "moon.stars.fill" : "moon", kind: app.progress.neon ? .blue : .plain, label: "neon night") { app.toggleNeon() }
                // the birdie tracker
                Button { withAnimation(.spring(response: 0.3)) { tracking = true } } label: { TrophyGlyph().frame(width: st.s(60), height: st.s(60)) }
                    .buttonStyle(ToyButtonStyle()).accessibilityLabel("birdie tracker")
            }
            .padding(.horizontal, st.s(24)).padding(.top, st.s(24))
            if tracking { TrackerPanel(world: world) { withAnimation { tracking = false } }.transition(.opacity) }
        }
    }

    private func courseNode(_ c: Int, _ k: Int) -> some View {
        let open = app.open(course: c), hs = app.catalog.holes(course: c)
        let done = hs.allSatisfy { app.progress.holes[$0.key] != nil }
        let crazy = hs.filter { $0.data.crazy }.count
        let kind: ToyKind = open ? (done ? .yellow : .go) : .locked
        return Button { if open { app.go(.map(c)) } } label: {
            Text("\(k + 1)").font(.system(size: st.s(80), weight: .black, design: .rounded))
                .foregroundStyle(open && !done ? .white : (open ? Toy.inkStrong : Toy.inkSoft))
                .frame(width: st.s(168), height: st.s(168))
                .background(ZStack { Circle().fill(kind.face); Gloss(shape: Circle()).padding(st.s(8)) })
                .overlay(Circle().strokeBorder(kind.rim, lineWidth: st.s(6)))
                .background(Circle().fill(kind.down).offset(y: st.s(8)))
                .shadow(color: Toy.shadow.opacity(0.3), radius: st.s(10), y: st.s(12))
                .overlay(alignment: .topTrailing) { if !open { Glyph.lock.image.resizable().scaledToFit().frame(width: st.s(44)).offset(x: st.s(6), y: -st.s(6)) } }
                .overlay(alignment: .bottomLeading) {
                    if open && crazy > 0 {
                        HStack(spacing: 0) { Glyph.crazy.image.resizable().scaledToFit().frame(width: st.s(34)); Text("\(crazy)").font(Toy.font(20, st)).foregroundStyle(Toy.inkStrong) }
                            .offset(x: -st.s(14), y: st.s(6))
                    }
                }
                .overlay(alignment: .bottom) {
                    if open {
                        HStack(spacing: st.s(4)) { StarView().frame(width: st.s(24)); Text("\(app.progress.stars(course: c, catalog: app.catalog))/\(hs.count * 3)") }
                            .font(Toy.font(22, st)).foregroundStyle(Toy.inkStrong)
                            .padding(.horizontal, st.s(10)).padding(.vertical, st.s(2))
                            .background(Capsule().fill(Color(hex: "#fffdf7").opacity(0.92)))
                            .fixedSize().offset(y: st.s(44))
                    }
                }
        }
        .buttonStyle(PressDown(locked: !open))
        .accessibilityLabel("course \(k + 1)")
    }
}

// MARK: a course: its holes in a snake, left to right along the top, back along the bottom (src/game.js showMap)
struct MapView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    let course: Int
    @State private var picking = false

    var body: some View {
        let look = app.look(course), holes = app.catalog.holes(course: course)
        let rowY = [st.h * 310 / 700, st.h * 550 / 700], dx = (st.w - 260) / 8
        let pts: [CGPoint] = holes.indices.map { i in i < 9 ? CGPoint(x: 130 + CGFloat(i) * dx, y: rowY[0]) : CGPoint(x: st.w - 130 - CGFloat(i - 9) * dx, y: rowY[1]) }
        ZStack(alignment: .topLeading) {
            WorldScene(look: look, horizon: 0.6).ignoresSafeArea()
            Path { p in p.addLines(pts.map { st.pt($0.x, $0.y) }) }
                .stroke(Toy.surfaceLine, style: StrokeStyle(lineWidth: st.s(22), lineCap: .round, lineJoin: .round, dash: [st.s(2), st.s(34)]))
            ForEach(Array(holes.enumerated()), id: \.offset) { i, h in
                node(h, i).position(st.pt(pts[i].x, pts[i].y)).popIn(Double(i) * 0.03)
            }
            HStack(spacing: st.s(16)) {
                BackButton { app.go(app.catalog.isExtra(course) ? .worlds : .world(app.catalog.world(of: course))) }
                badge
                // lost balls found on this course
                HStack(spacing: st.s(8)) {
                    ExtraIconView(icon: .goldBall).frame(width: st.s(48), height: st.s(48))
                    Text("\(holes.filter { app.progress.lost[$0.key] != nil }.count)/\(holes.count)").font(Toy.font(34, st)).foregroundStyle(Toy.inkStrong)
                }
                .padding(.leading, st.s(12)).padding(.trailing, st.s(20)).frame(height: st.s(76)).toyCard(st, radius: Toy.rLg)
                .accessibilityElement(children: .ignore).accessibilityLabel("lost balls found, \(holes.filter { app.progress.lost[$0.key] != nil }.count) of \(holes.count)")
                Spacer()
                if app.open(course: course) {
                    // pass and play, then practice (a target: nothing counts, every hole open), as on the web
                    Button { withAnimation(.spring(response: 0.3)) { picking = true } } label: { PartyGlyph().frame(width: st.s(64), height: st.s(64)) }
                        .buttonStyle(ToyButtonStyle()).accessibilityLabel("pass and play")
                    Button { withAnimation { app.practice.toggle() } } label: { ExtraIconView(icon: .target).frame(width: st.s(56), height: st.s(56)) }
                        .buttonStyle(ToyButtonStyle(kind: app.practice ? .yellow : .plain))
                        .accessibilityLabel("practice").accessibilityAddTraits(app.practice ? .isSelected : [])
                }
            }
            .padding(.horizontal, st.s(24)).padding(.top, st.s(24))
            if picking { PartyPick(course: course) { withAnimation { picking = false } }.transition(.opacity) }
        }
    }

    private var badge: some View {
        let isExtra = app.catalog.isExtra(course), night = app.progress.neon
        let n = isExtra ? app.catalog.holes(course: course).count : (app.catalog.courses(ofWorld: app.catalog.world(of: course)).firstIndex(of: course) ?? 0) + 1
        let icon: Image? = course == Catalog.bonus ? Glyph.bonus.image : course == Catalog.classic ? Glyph.classic.image : app.looks[course].iconImage
        return HStack(spacing: st.s(6)) {
            icon?.resizable().scaledToFit().frame(width: st.s(54), height: st.s(54))
            Text("\(n)").font(Toy.font(40, st)).foregroundStyle(night ? Color(hex: "#2ef2ff") : Toy.inkStrong)
        }
        .padding(.horizontal, st.s(18)).frame(height: st.s(76))
        .toyCard(st, radius: Toy.rLg, fill: night ? Color(hex: "#1d1240") : Toy.surface)
    }

    private func node(_ h: Hole, _ i: Int) -> some View {
        let rec = app.progress.holes[h.key], crazy = h.data.crazy
        let open = app.unlocked(h.key) || (app.practice && app.open(course: course))
        let kind: ToyKind = open ? (rec == nil ? .go : .plain) : .locked
        return Button { if open { app.go(.hole(h.key)) } } label: {
            Text("\(i + 1)").font(Toy.font(40, st)).foregroundStyle(open ? (rec == nil ? .white : Toy.inkStrong) : Toy.inkSoft)
                .frame(width: st.s(88), height: st.s(88))
                .background(ZStack { Circle().fill(kind.face); Gloss(shape: Circle()).padding(st.s(5)) })
                .overlay(Circle().strokeBorder(crazy && open ? Toy.redLine : kind.rim, lineWidth: st.s(4)))
                .background(Circle().fill(kind.down).offset(y: st.s(6)))
                .shadow(color: Toy.shadow.opacity(0.28), radius: st.s(6), y: st.s(8))
                .overlay(alignment: .top) {
                    if let rec { HStack(spacing: st.s(2)) { ForEach(0..<3) { k in StarView(on: k < rec.stars).frame(width: st.s(22)) } }.offset(y: -st.s(28)) }
                }
                .overlay(alignment: .bottom) {
                    if let rec { Text("\(rec.best)").font(Toy.font(24, st)).foregroundStyle(app.progress.neon ? Color(hex: "#e8e2ff") : Toy.inkSoft).offset(y: st.s(32)) }
                }
                .overlay(alignment: .bottomLeading) { if crazy { Glyph.crazy.image.resizable().scaledToFit().frame(width: st.s(34)).offset(x: -st.s(12), y: st.s(10)) } }
                .overlay(alignment: .topTrailing) { if !open { Glyph.lock.image.resizable().scaledToFit().frame(width: st.s(34)).offset(x: st.s(10), y: -st.s(10)) } }
        }
        .buttonStyle(PressDown(locked: !open))
        .accessibilityLabel("hole \(i + 1)")
    }
}

/// settings (src/shell.html #settings): sound, neon night, and which hand putts, over a scrim
struct SettingsPanel: View {
    @Environment(AppModel.self) private var app
    @Environment(\.stage) private var st
    let close: () -> Void
    var body: some View {
        ZStack {
            Toy.scrim.ignoresSafeArea().onTapGesture(perform: close)
            HStack(spacing: st.s(24)) {
                SoundButton()
                IconButton(symbol: "moon.stars.fill", kind: app.progress.neon ? .blue : .plain, label: "neon night") { app.toggleNeon() }
                IconButton(symbol: "hand.raised.fill", kind: app.progress.hand == "R" ? .yellow : .plain, label: "right handed") { app.setHand("R") }
                Button { app.setHand("L") } label: { Image(systemName: "hand.raised.fill").font(.system(size: st.s(38), weight: .black)).scaleEffect(x: -1, y: 1) }
                    .buttonStyle(ToyButtonStyle(kind: app.progress.hand == "L" ? .yellow : .plain))
                    .accessibilityLabel("left handed")
                IconButton(symbol: "xmark", kind: .go, label: "close", action: close)
            }
            .padding(st.s(36))
            .background(Dots())
            .toyCard(st, radius: Toy.rXl)
            .popIn()
        }
    }
}

/// a profile card (src/shell.html #profileRow .pcard): cream on a flat shadow; the profile played last
/// has a yellow rim; an empty slot is just a dashed outline
struct ProfileCard: ViewModifier {
    enum State { case plain, last, empty }
    @Environment(\.stage) private var st
    let state: State
    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: st.s(Toy.rXl), style: .continuous)
        switch state {
        case .empty:
            content.overlay(shape.strokeBorder(Toy.surfaceLine, style: StrokeStyle(lineWidth: st.s(4), dash: [st.s(14), st.s(10)])))
        case .plain, .last:
            content
                .background(shape.fill(Toy.surface))
                .overlay(shape.strokeBorder(state == .last ? Toy.yellowLine : Toy.surfaceLine, lineWidth: st.s(4)))
                .background(shape.fill(state == .last ? Toy.yellowDown : Toy.surfaceDown).offset(y: st.s(6)))
        }
    }
}
