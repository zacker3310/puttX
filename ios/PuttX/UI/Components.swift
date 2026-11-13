// Small toys every scene uses. No words anywhere: numerals, glyphs and SF Symbols only, with
// accessibility labels for VoiceOver (the web's aria-labels).
import SwiftUI
import PuttXCore

/// a square icon button on the stage
struct IconButton: View {
    @Environment(\.stage) private var st
    let symbol: String
    var kind: ToyKind = .plain
    var label: String
    let action: () -> Void
    var body: some View {
        Button(action: action) { Image(systemName: symbol).font(.system(size: st.s(38), weight: .black, design: .rounded)) }
            .buttonStyle(ToyButtonStyle(kind: kind))
            .accessibilityLabel(label)
    }
}

struct BackButton: View {
    let action: () -> Void
    var body: some View { IconButton(symbol: "arrow.uturn.backward", label: "back", action: action) }
}

struct SoundButton: View {
    @Environment(AppModel.self) private var app
    var body: some View {
        IconButton(symbol: app.progress.sound ? "speaker.wave.2.fill" : "speaker.slash.fill", kind: app.progress.sound ? .plain : .locked,
                   label: app.progress.sound ? "sound on" : "sound off") { app.toggleSound() }
    }
}

/// the player's coins
struct Wallet: View {
    @Environment(AppModel.self) private var app
    var body: some View { Tally(value: "\(app.progress.coins)") { Glyph.coin.image.resizable().scaledToFit() }.accessibilityLabel("\(app.progress.coins) coins") }
}

/// a golf ball as the web draws it on a profile card: a band, a mark, a shine
struct BallIcon: View {
    var base = Color(hex: "#fffdf7"), band = Toy.yellow, mark = Toy.red
    var body: some View {
        GeometryReader { g in
            let d = min(g.size.width, g.size.height), r = d * 26 / 64
            ZStack {
                Circle().fill(Toy.shadow.opacity(0.18)).frame(width: 2 * r * 27 / 26).offset(y: d * 2 / 64)
                ZStack {
                    Circle().fill(base)
                    Rectangle().fill(band).frame(height: d * 10 / 64).offset(y: d * 0 / 64)
                    Circle().fill(mark).frame(width: d * 8 / 64).offset(x: d * 12 / 64, y: -d * 12 / 64)
                }
                .frame(width: 2 * r, height: 2 * r).clipShape(Circle())
                Circle().strokeBorder(Toy.shadow.opacity(0.35), lineWidth: d * 3 / 64).frame(width: 2 * r)
                Ellipse().fill(.white.opacity(0.6)).frame(width: d * 14 / 64, height: d * 8 / 64).rotationEffect(.degrees(-30)).offset(x: -d * 9 / 64, y: -d * 12 / 64)
            }
            .frame(width: g.size.width, height: g.size.height)
        }
    }
}

/// a sky to stand a scene on
struct SkyBackground: View {
    var colors: [Color]
    var body: some View { LinearGradient(colors: colors, startPoint: .top, endPoint: .bottom).ignoresSafeArea() }
}

/// a top bar: back on the left, extras on the right, inside the safe area
struct TopBar<Left: View, Right: View>: View {
    @Environment(\.stage) private var st
    @ViewBuilder var left: Left
    @ViewBuilder var right: Right
    var body: some View {
        HStack(alignment: .top, spacing: st.s(18)) { left; Spacer(minLength: 0); right }
            .padding(.horizontal, st.s(28)).padding(.top, st.s(22))
    }
}

/// enters with a little pop; still when the player asks for reduced motion
struct PopIn: ViewModifier {
    var delay: Double = 0
    @State private var shown = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func body(content: Content) -> some View {
        content
            .scaleEffect(shown || reduceMotion ? 1 : 0.6)
            .opacity(shown || reduceMotion ? 1 : 0)
            .onAppear { withAnimation(.spring(response: 0.35, dampingFraction: 0.55).delay(delay)) { shown = true } }
    }
}
extension View { func popIn(_ delay: Double = 0) -> some View { modifier(PopIn(delay: delay)) } }
