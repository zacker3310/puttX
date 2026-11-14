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
    static let surface = Color(hex: "#fff8ec"), surface2 = Color(hex: "#f6e9d2"), surfaceLine = Color(hex: "#e6d2ab"), surfaceDown = Color(hex: "#d9c193")
    static let ink = Color(hex: "#5a4634"), inkStrong = Color(hex: "#4a3826"), inkSoft = Color(hex: "#8a7360")
    static let wood = Color(hex: "#c9a476"), woodDeep = Color(hex: "#a8804e"), woodDark = Color(hex: "#6e5233"), woodLine = Color(hex: "#8a6538")
    static let green = Color(hex: "#74c465"), greenLine = Color(hex: "#4e9a45"), greenDown = Color(hex: "#438a3b")
    static let red = Color(hex: "#ef7d6d"), redLine = Color(hex: "#c95a4c"), redDown = Color(hex: "#b34e41")
    static let blue = Color(hex: "#6fc0df"), blueLine = Color(hex: "#4a94b5"), blueDown = Color(hex: "#3f83a2")
    static let yellow = Color(hex: "#ffd66e"), yellowLine = Color(hex: "#dca63f"), yellowDown = Color(hex: "#c69334")
    static let mute = Color(hex: "#cfc0a6"), muteLine = Color(hex: "#b1a082"), muteDown = Color(hex: "#a3916d")
    static let shadow = Color(red: 74 / 255, green: 53 / 255, blue: 35 / 255)
    static let scrim = Color(red: 64 / 255, green: 44 / 255, blue: 28 / 255).opacity(0.55)
    static let rSm: CGFloat = 16, rMd: CGFloat = 22, rLg: CGFloat = 30, rXl: CGFloat = 38

    static func font(_ size: CGFloat, _ st: StageMetrics) -> Font { .system(size: st.s(size), weight: .heavy, design: .rounded).monospacedDigit() }
}

/// A toy button's colours: face, rim, and the flat shadow under it.
enum ToyKind {
    case plain, go, red, blue, yellow, locked
    var face: Color { switch self { case .plain: Toy.surface; case .go: Toy.green; case .red: Toy.red; case .blue: Toy.blue; case .yellow: Toy.yellow; case .locked: Toy.mute } }
    var rim: Color { switch self { case .plain: Toy.surfaceLine; case .go: Toy.greenLine; case .red: Toy.redLine; case .blue: Toy.blueLine; case .yellow: Toy.yellowLine; case .locked: Toy.muteLine } }
    var down: Color { switch self { case .plain: Toy.surfaceDown; case .go: Toy.greenDown; case .red: Toy.redDown; case .blue: Toy.blueDown; case .yellow: Toy.yellowDown; case .locked: Toy.muteDown } }
    var ink: Color { switch self { case .plain, .locked, .yellow: Toy.inkStrong; default: .white } }
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
            .background(ZStack { shape.fill(kind.face); Gloss(shape: shape).padding(st.s(4)) })
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
        return background(shape.fill(fill))
            .overlay(shape.strokeBorder(Toy.surfaceLine, lineWidth: st.s(4)))
            .background(shape.fill(Toy.shadow.opacity(0.14)).offset(y: st.s(6)))
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
            .background(Capsule().fill(Toy.surface.opacity(0.92)))
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
