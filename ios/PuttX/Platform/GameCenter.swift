// Game Center: a leaderboard per course (the course's total, lower is better) and a handful of
// achievements. Signing in is Game Center's own quiet banner; a player who is not signed in plays on
// exactly the same. The ids below are what App Store Connect must be set up with.
import GameKit
import PuttXCore

@MainActor
enum GameCenter {
    private(set) static var ready = false

    static func signIn() {
        GKLocalPlayer.local.authenticateHandler = { vc, _ in
            // the system's own sign-in sheet only when it asks to show one; never a word of ours
            if let vc, let root = UIApplication.shared.connectedScenes.compactMap({ ($0 as? UIWindowScene)?.keyWindow }).first?.rootViewController {
                root.present(vc, animated: true)
            }
            ready = GKLocalPlayer.local.isAuthenticated
        }
    }

    /// leaderboard id for a course: puttx.course.<n>
    static func board(_ course: Int) -> String { "puttx.course.\(course)" }

    /// a course finished: its best total (the sum of each hole's best) goes on its board
    static func courseFinished(_ course: Int, total: Int) {
        guard ready else { return }
        Task { try? await GKLeaderboard.submitScore(total, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [board(course)]) }
    }

    enum Achievement: String {
        case firstAce = "puttx.ace.first"
        case tenAces = "puttx.ace.ten"
        case allStarsCourse = "puttx.stars.course"
        case worldDone = "puttx.world.done"
        case everyWorld = "puttx.world.all"
    }
    static func unlock(_ a: Achievement, percent: Double = 100) {
        guard ready else { return }
        let g = GKAchievement(identifier: a.rawValue)
        g.percentComplete = percent
        g.showsCompletionBanner = true
        Task { try? await GKAchievement.report([g]) }
    }

    /// after a hole is banked: what it earned
    static func holeBanked(_ key: String, score: Int, progress: PlayerProgress, catalog: Catalog) {
        guard ready else { return }
        let aces = progress.holes.values.filter { $0.best == 1 }.count
        if score == 1 { unlock(.firstAce); unlock(.tenAces, percent: min(100, Double(aces) * 10)) }
        let c = Catalog.course(of: key), holes = catalog.holes(course: c)
        if holes.allSatisfy({ progress.holes[$0.key] != nil }) {
            courseFinished(c, total: holes.reduce(0) { $0 + (progress.holes[$1.key]?.best ?? $1.par * 2) })
            if holes.allSatisfy({ (progress.holes[$0.key]?.stars ?? 0) == 3 }) { unlock(.allStarsCourse) }
            let w = catalog.world(of: c)
            if !catalog.isExtra(c) && catalog.courses(ofWorld: w).allSatisfy({ cc in catalog.holes(course: cc).allSatisfy { progress.holes[$0.key] != nil } }) { unlock(.worldDone) }
            let worldsDone = catalog.playableWorlds.filter { w in catalog.courses(ofWorld: w).allSatisfy { cc in catalog.holes(course: cc).allSatisfy { progress.holes[$0.key] != nil } } }.count
            unlock(.everyWorld, percent: Double(worldsDone) / Double(max(1, catalog.playableWorlds.count)) * 100)
        }
    }
}
