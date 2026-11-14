// The toybox UI: vroom's `--v-*` tokens (src/shell.html), flat 0-blur shadows, big radii. The 3D course
// is realistic; everything the player taps is a toy.
import SwiftUI

extension Color {
    /// #rrggbb
    init(hex: String) {
        let v = UInt64(hex.dropFirst(hex.hasPrefix("#") ? 1 : 0), radix: 16) ?? 0
        self.init(.sRGB, red: Double((v >> 16) & 0xff) / 255, green: Double((v >> 8) & 0xff) / 255, blue: Double(v & 0xff) / 255)
    }
}

enum Toy {
    // gunmetal plates with steel rims and white numerals, after the title (TitleMetal.swift)
    static let surface = Color(hex: "#2c3039"), surface2 = Color(hex: "#383d47"), surfaceLine = Color(hex: "#6b727e"), surfaceDown = Color(hex: "#101216")
    static let ink = Color(hex: "#d9dee6"), inkStrong = Color.white, inkSoft = Color(hex: "#9aa3b0")
    /// the dark numerals on a bright face (yellow)
    static let inkDark = Color(hex: "#2a2008")
    static let wood = Color(hex: "#c9a476"), woodDeep = Color(hex: "#a8804e"), woodDark = Color(hex: "#6e5233"), woodLine = Color(hex: "#8a6538")
    static let green = Color(hex: "#74c465"), greenLine = Color(hex: "#4e9a45"), greenDown = Color(hex: "#438a3b")
    static let red = Color(hex: "#ef7d6d"), redLine = Color(hex: "#c95a4c"), redDown = Color(hex: "#b34e41")
    static let blue = Color(hex: "#6fc0df"), blueLine = Color(hex: "#4a94b5"), blueDown = Color(hex: "#3f83a2")
    static let yellow = Color(hex: "#ffd66e"), yellowLine = Color(hex: "#dca63f"), yellowDown = Color(hex: "#c69334")
    static let mute = Color(hex: "#4a4f58"), muteLine = Color(hex: "#5e646e"), muteDown = Color(hex: "#1a1c21")
    static let shadow = Color.black
    static let scrim = Color(hex: "#05060a").opacity(0.62)
    static let rSm: CGFloat = 16, rMd: CGFloat = 22, rLg: CGFloat = 30, rXl: CGFloat = 38

    /// brushed gunmetal, lit from above
    static let metal = AnyShapeStyle(LinearGradient(colors: [Color(hex: "#555b66"), Color(hex: "#363a43"), Color(hex: "#24272e")], startPoint: .top, endPoint: .bottom))
    /// a steel rim, bright at the top edge
    static let steel = LinearGradient(colors: [Color(hex: "#c7ccd5"), Color(hex: "#6b727e"), Color(hex: "#4b515b")], startPoint: .top, endPoint: .bottom)
    static func font(_ size: CGFloat, _ st: StageMetrics) -> Font { .system(size: st.s(size), weight: .heavy, design: .rounded).monospacedDigit() }
}

/// A toy button's colours: face, rim, and the flat shadow under it.
enum ToyKind {
    case plain, go, red, blue, yellow, locked
    var face: Color { switch self { case .plain: Toy.surface; case .go: Toy.green; case .red: Toy.red; case .blue: Toy.blue; case .yellow: Toy.yellow; case .locked: Toy.mute } }
    /// the face as painted: brushed metal for the plain plates, the colour as enamel over it otherwise
    var fill: AnyShapeStyle { switch self { case .plain, .locked: Toy.metal; default: AnyShapeStyle(LinearGradient(colors: [face.opacity(1), face.mix(with: .black, by: 0.25)], startPoint: .top, endPoint: .bottom)) } }
    var rim: Color { switch self { case .plain: Toy.surfaceLine; case .go: Toy.greenLine; case .red: Toy.redLine; case .blue: Toy.blueLine; case .yellow: Toy.yellowLine; case .locked: Toy.muteLine } }
    var down: Color { switch self { case .plain: Toy.surfaceDown; case .go: Toy.greenDown; case .red: Toy.redDown; case .blue: Toy.blueDown; case .yellow: Toy.yellowDown; case .locked: Toy.muteDown } }
    var ink: Color { switch self { case .yellow: Toy.inkDark; case .locked: Toy.inkSoft; default: .white } }
}

/// A chunky toy button: it sits on a flat shadow and presses down into it.
struct ToyButtonStyle: ButtonStyle {
    var kind: ToyKind = .plain
    var radius: CGFloat = Toy.rMd
    var size: CGSize? = CGSize(width: 88, height: 88)
    @Environment(\.stage) private var st
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed, lift = st.s(6), shape = RoundedRectangle(cornerRadius: st.s(radius), style: .continuous)
        configuration.label
            .font(Toy.font(40, st))
            .foregroundStyle(kind.ink)
            .frame(minWidth: size.map { st.s($0.width) }, minHeight: size.map { st.s($0.height) })
            .background(ZStack { shape.fill(kind.fill); Gloss(shape: shape).padding(st.s(4)).opacity(0.6) })
            .overlay(shape.strokeBorder(kind.rim, lineWidth: st.s(4)))
            .background(shape.fill(kind.down).offset(y: pressed ? st.s(2) : lift))
            // lifted off the scenery behind it; squashes a touch as it goes down
            .compositingGroup()
            .shadow(color: Toy.shadow.opacity(pressed ? 0.12 : 0.28), radius: st.s(pressed ? 3 : 8), y: st.s(pressed ? 3 : 9))
            .scaleEffect(x: pressed && !reduceMotion ? 1.04 : 1, y: pressed && !reduceMotion ? 0.94 : 1, anchor: .bottom)
            .offset(y: pressed ? lift - st.s(2) : 0)
            .animation(reduceMotion ? nil : .spring(response: 0.16, dampingFraction: 0.6), value: pressed)
            .contentShape(shape)
            // every touch answers at once, with a sound and a tick
            .onChange(of: pressed) { _, down in if down { SFX.tap(); Haptics.tap() } }
    }
}

extension View {
    /// a cream card with a rim and a flat shadow
    func toyCard(_ st: StageMetrics, radius: CGFloat = Toy.rLg, fill: Color = Toy.surface) -> some View {
        let shape = RoundedRectangle(cornerRadius: st.s(radius), style: .continuous)
        return background(shape.fill(fill == Toy.surface ? Toy.metal : AnyShapeStyle(fill)))
            .overlay(shape.strokeBorder(Toy.steel, lineWidth: st.s(4)))
            .overlay(shape.inset(by: st.s(4)).strokeBorder(.black.opacity(0.5), lineWidth: st.s(1.5)))
            .background(shape.fill(Toy.surfaceDown).offset(y: st.s(6)))
            .compositingGroup().shadow(color: .black.opacity(0.35), radius: st.s(12), y: st.s(8))
    }
}

/// the faint polka dots on toybox panels
struct Dots: View {
    @Environment(\.stage) private var st
    var body: some View {
        Canvas { ctx, size in
            let step = st.s(26), r = st.s(2.4)
            var y = step / 2
            while y < size.height { var x = step / 2; while x < size.width { ctx.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r)), with: .color(Toy.ink.opacity(0.05))); x += step }; y += step }
        }
        .allowsHitTesting(false)
    }
}

/// a numeral chip: a pill holding an icon and a count
struct Tally<Icon: View>: View {
    @Environment(\.stage) private var st
    let value: String
    @ViewBuilder var icon: Icon
    var body: some View {
        HStack(spacing: st.s(6)) { icon.frame(width: st.s(34), height: st.s(34)); Text(value) }
            .font(Toy.font(30, st)).foregroundStyle(Toy.inkStrong)
            .padding(.horizontal, st.s(14)).padding(.vertical, st.s(4))
            .background(Capsule().fill(Toy.surface.opacity(0.92))).overlay(Capsule().strokeBorder(Toy.surfaceLine.opacity(0.8), lineWidth: st.s(2)))
    }
}

enum Glyph: String {
    case star, lock, coin, crown, flag, bin, crazy, classic, bonus
    var image: Image { Image("glyph-" + rawValue) }
}

/// a star, lit or not
struct StarView: View {
    var on = true
    var body: some View { Glyph.star.image.resizable().renderingMode(.template).scaledToFit().foregroundStyle(on ? Toy.yellow : Toy.mute) }
}
