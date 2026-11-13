import SwiftUI
import PuttXCore

@main
struct PuttXApp: App {
    @State private var app = AppModel()
    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(app)
                .statusBarHidden()
                .persistentSystemOverlays(.hidden)
                .preferredColorScheme(.light)
        }
    }
}

/// one scene at a time, on one stage
struct RootView: View {
    @Environment(AppModel.self) private var app
    var body: some View {
        Stage { _ in
            ZStack {
                switch app.route {
                case .title: TitleView()
                case .profiles: ProfilesView()
                case .worlds: WorldsView()
                case .world(let w): WorldView(world: w)
                case .map(let c): MapView(course: c)
                case .hole: if let p = app.play { HoleView(play: p).id(p.hole.key + "\(ObjectIdentifier(p).hashValue)") }
                case .card(let c): CardView(course: c)
                }
            }
            .transition(.opacity)
        }
        .background(Toy.surface.ignoresSafeArea())
    }
}
