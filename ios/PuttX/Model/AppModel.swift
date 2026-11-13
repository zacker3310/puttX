// The app's state: where the player is, which profile is in use, and its progress. Saves are three
// profile slots, as on the web; phase 6 mirrors them to iCloud (PlayerProgress.merged makes that conflict-free).
import SwiftUI
import PuttXCore

enum Route: Equatable {
    case title, profiles, worlds
    /// a world's map: its three courses on one road
    case world(Int)
    /// a course's map: its holes in a snake
    case map(Int)
    case hole(String)
    /// a finished course's scorecard
    case card(Int)
}

@MainActor @Observable
final class AppModel {
    let catalog = Catalog.shared
    let looks = Looks.shared
    static let slots = 3

    private(set) var route: Route = .title
    private(set) var slot: Int
    var progress: PlayerProgress
    /// the hole being played
    private(set) var play: HolePlay?

    @ObservationIgnored private let store = UserDefaults.standard
    private static func key(_ n: Int) -> String { "puttx.save.\(n)" }

    init() {
        let n = UserDefaults.standard.integer(forKey: "puttx.slot")
        slot = (1...AppModel.slots).contains(n) ? n : 1
        progress = PlayerProgress(catalog: Catalog.shared)
        progress = load(slot) ?? PlayerProgress(catalog: catalog)
        applyLaunchArguments()
    }

    // MARK: saves
    func load(_ n: Int) -> PlayerProgress? {
        guard let d = store.data(forKey: AppModel.key(n)) else { return nil }
        return try? JSONDecoder().decode(PlayerProgress.self, from: d)
    }
    func save() { if let d = try? JSONEncoder().encode(progress) { store.set(d, forKey: AppModel.key(slot)) } }
    func slotUsed(_ n: Int) -> Bool { !(load(n)?.holes.isEmpty ?? true) }
    func useSlot(_ n: Int) {
        slot = n; store.set(n, forKey: "puttx.slot")
        progress = load(n) ?? PlayerProgress(catalog: catalog)
        save()
    }
    func erase(_ n: Int) {
        store.removeObject(forKey: AppModel.key(n))
        if n == slot { progress = PlayerProgress(catalog: catalog) }
    }

    // MARK: navigation
    func go(_ r: Route) {
        if case .hole(let key) = r, let h = catalog.hole(key) {
            play = HolePlay(hole: h, look: look(Catalog.course(of: key)))
        } else if case .hole = route { play?.stop(); play = nil }
        withAnimation(.easeInOut(duration: 0.25)) { route = r }
    }
    func look(_ course: Int) -> CourseLook { progress.neon ? looks[course].night() : looks[course] }

    /// a hole finished: bank it, and say where the player goes next
    func finished(_ h: Hole, score: Int) -> HoleRecord {
        let rec = progress.record(h.key, score: score, par: h.par, catalog: catalog)
        save()
        return rec
    }
    func next(after key: String) -> Route {
        if let n = catalog.nextKey(key) { return .hole(n) }
        let c = Catalog.course(of: key)
        return catalog.holes(course: c).allSatisfy { progress.holes[$0.key] != nil } ? .card(c) : .map(c)
    }
    func unlocked(_ key: String) -> Bool { progress.unlocked(key, catalog: catalog) }
    func open(course c: Int) -> Bool { catalog.isExtra(c) ? catalog.has(course: c) : progress.worlds.contains(c) && catalog.has(course: c) }
    func toggleSound() { progress.sound.toggle(); save() }
    func toggleNeon() { progress.neon.toggle(); save() }

    /// `-route map:5` / `-route hole:5-3` / `-route card:1`, and `-demo` for a profile with every course
    /// played: how CI takes a screenshot of every scene (the web's ?hole= and ?map)
    private func applyLaunchArguments() {
        let args = ProcessInfo.processInfo.arguments
        if args.contains("-demo") {
            var p = PlayerProgress(catalog: catalog)
            for c in catalog.allCourses where c != 30 {
                for h in catalog.holes(course: c) { p.record(h.key, score: max(1, h.par - [1, 0, 0, 1, -1][Catalog.number(of: h.key) % 5]), par: h.par, catalog: catalog) }
            }
            p.coins = 240
            progress = p
            save()
        }
        guard let i = args.firstIndex(of: "-route"), i + 1 < args.count else { return }
        let parts = args[i + 1].split(separator: ":", maxSplits: 1).map(String.init)
        let arg = parts.count > 1 ? parts[1] : ""
        switch parts[0] {
        case "profiles": go(.profiles)
        case "worlds": go(.worlds)
        case "world": go(.world(Int(arg) ?? 1))
        case "map": go(.map(Int(arg) ?? 1))
        case "hole": go(.hole(arg.isEmpty ? "1-1" : arg))
        case "card": go(.card(Int(arg) ?? 1))
        default: break
        }
    }
}
