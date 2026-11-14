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
    /// the pro shop
    case shop
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
    /// how a hole is drawn: the exported course (the default), the hand-built 1-1, or the sim from above
    enum Renderer: String { case exported, hand, top }
    private(set) var renderer: Renderer = .exported

    @ObservationIgnored private let store = UserDefaults.standard
    @ObservationIgnored private let cloud = CloudSave()
    @ObservationIgnored let controllers = Controllers()
    private static func key(_ n: Int) -> String { "puttx.save.\(n)" }

    init() {
        let n = UserDefaults.standard.integer(forKey: "puttx.slot")
        slot = (1...AppModel.slots).contains(n) ? n : 1
        progress = PlayerProgress(catalog: Catalog.shared)
        progress = load(slot) ?? PlayerProgress(catalog: catalog)
        applyLaunchArguments()
        applySound()
        // another device played: fold its progress into ours, nothing lost either way
        cloud.onChange = { [weak self] slots in
            guard let self else { return }
            for n in slots { self.pullCloud(n) }
        }
        pullCloud(slot)
        GameCenter.signIn()
    }

    /// merges a slot's iCloud copy into the local one and writes the union both ways
    func pullCloud(_ n: Int) {
        guard let remote = cloud.read(n) else { if let local = load(n) { cloud.write(n, local) }; return }
        let merged = (load(n) ?? remote).merged(with: remote)
        if let d = try? JSONEncoder().encode(merged) { store.set(d, forKey: AppModel.key(n)) }
        cloud.write(n, merged)
        if n == slot { progress = merged }
    }

    // MARK: saves
    func load(_ n: Int) -> PlayerProgress? {
        guard let d = store.data(forKey: AppModel.key(n)) else { return nil }
        var p = try? JSONDecoder().decode(PlayerProgress.self, from: d)
        p?.repairGear(Shop.shared)
        return p
    }
    func save() {
        if let d = try? JSONEncoder().encode(progress) { store.set(d, forKey: AppModel.key(slot)) }
        cloud.write(slot, progress)
    }
    func slotUsed(_ n: Int) -> Bool { !(load(n)?.holes.isEmpty ?? true) }
    func useSlot(_ n: Int) {
        slot = n; store.set(n, forKey: "puttx.slot")
        progress = load(n) ?? PlayerProgress(catalog: catalog)
        save()
        applySound()
    }
    func erase(_ n: Int) {
        store.removeObject(forKey: AppModel.key(n))
        cloud.erase(n)
        if n == slot { progress = PlayerProgress(catalog: catalog) }
    }

    // MARK: navigation
    func go(_ r: Route) {
        // a ball already dropping (or rolling itself in) keeps its result when the player leaves,
        // banked as the round it was (so before a party or practice ends)
        play?.finishNow()
        // leaving the holes and the card ends a party
        switch r { case .hole, .card: break; default: party = nil }
        switch r { case .hole, .map, .card: break; default: practice = false }
        if case .hole(let key) = r, let h = catalog.hole(key) {
            let c = Catalog.course(of: key), lk = look(c), p = HolePlay(hole: h, look: lk)
            // the hole's sound: its borders, its world's birds and crickets, water or wind, the bell at the end
            let w = catalog.world(of: c), night = progress.neon
            p.wallKind = night ? "paint" : (try? SceneStore.shared.hole(key).env.wallKind) ?? AppModel.wallKind[w] ?? "wood"
            p.lastOfCourse = catalog.nextKey(key) == nil
            p.birds = night || w == 8 ? 0 : w == 3 ? 1.6 : 0.6
            p.crickets = night || w == 7 ? 1 : 0
            p.reduceMotion = UIAccessibility.isReduceMotionEnabled
            // the extras: its lost ball, if not found yet, pays a token and 15 coins when rolled over
            p.lostGot = progress.lost[key] != nil
            p.setGhost(progress.ghosts[key])
            p.gear = (progress.equipped["putter"] ?? "p1", progress.equipped["ball"] ?? "b1")
            p.night = progress.neon; p.beatOn = progress.sound
            p.practice = practice && party == nil
            if p.practice { p.lostGot = true }
            if let party {
                // a plain ball in the player's colour, no ghost, no lost ball, no mulligans
                p.party = true; p.lostGot = true; p.setGhost(nil)
                p.gear.ball = "b1"; p.ballTint = party.player == 0 ? nil : Party.balls[party.player]
            }
            p.onLost = { [weak self] in guard let self else { return }; _ = self.progress.findLost(key); self.save() }
            Synth.shared.bed(water: h.data.zones.contains { $0.surf == .water }, wind: [2, 4, 10].contains(w))
            SFX.jingle(lk.jingle)
            play = p
        } else if case .hole = route { play?.stop(); play = nil; Synth.shared.bed(water: false, wind: false); Synth.shared.roll(speed: 0, surface: "felt") }
        withAnimation(.easeInOut(duration: 0.25)) { route = r }
    }
    /// how the equipped putter turns a gesture into a putt
    var feel: Feel { Shop.shared.feel(progress.equipped["putter"] ?? "p1") }
    func look(_ course: Int) -> CourseLook { progress.neon ? looks[course].night() : looks[course] }

    // MARK: pass and play
    /// practice mode, chosen on a course's map: nothing counts, every open course's holes are open
    var practice = false
    /// the party on this device, if one is playing
    var party: Party?
    func startParty(_ n: Int, course c: Int) {
        party = Party(n: n, course: c)
        go(.hole("\(c)-1"))
    }
    /// the next player takes the same hole
    func partyGo() {
        guard party?.passing != nil, case .hole(let key) = route else { return }
        party?.passing = nil
        go(.hole(key))
        play?.skipIntroFlight = true
    }
    /// play the hole again, as the same kind of round (the hole of the day stays the hole of the day)
    func retry(_ p: HolePlay) {
        let day = p.daily
        go(.hole(p.hole.key))
        play?.daily = day
    }
    /// after the hole of the day: its course's map when that course is open, else the title
    func afterDaily(_ key: String) -> Route { open(course: Catalog.course(of: key)) ? .map(Catalog.course(of: key)) : .title }
    func partyNext(after key: String) {
        party?.board = nil
        if let n = catalog.nextKey(key) { go(.hole(n)) } else if let p = party { go(.card(p.course)) }
    }
    func endParty() { party = nil }

    /// the hole of the day: the same hole for everyone on a date, from any course
    func playDaily() {
        let day = Daily.day()
        go(.hole(Daily.key(day, catalog: catalog)))
        play?.daily = day
    }
    /// how the daily hole stands today: its key, today's best (nil before a finish) and the live streak
    var dailyToday: (key: String, best: Int?, streak: Int?) {
        let day = Daily.day(), yesterday = Daily.yesterday(), d = progress.daily
        let live = d.map { $0.d == day || $0.d == yesterday } ?? false
        return (Daily.key(day, catalog: catalog), d?.d == day ? d?.best : nil, live ? d?.streak : nil)
    }

    /// a hole finished: bank it with its goals (and the daily hole), and say where the player goes next
    func finished(_ play: HolePlay, score: Int) -> HoleRecord {
        let h = play.hole, prevBest = progress.holes[h.key]?.best
        if party != nil || play.practice {
            if play.practice { return HoleRecord(best: score, stars: Scoring.stars(score, h.par)) }
            // nothing is saved in a party
            withAnimation(.spring(response: 0.3)) { party!.finish(h.key, score: score) }
            return HoleRecord(best: score, stars: 0)
        }
        // a daily hole on a course not reached yet counts only for itself: no record, ghost or first clear
        let counts = progress.unlocked(h.key, catalog: catalog)
        var rec = HoleRecord(best: score, stars: Scoring.stars(score, h.par)), won = 0
        if counts {
            progress.keepGhost(h.key, log: play.log, score: score, previousBest: prevBest, auto: play.round.auto)
            rec = progress.record(h.key, score: score, par: h.par, catalog: catalog)
            won = progress.payFinish(h.key, score: score, par: h.par, shop: Shop.shared)
        }
        let bits = Goals.bits(score: score, par: h.par, touched: play.touched, auto: play.round.auto, lostFound: progress.lost[h.key] != nil || play.lostDone())
        let g = progress.finishGoals(h.key, bits: bits)
        play.goals = (g.all, g.fresh)
        won += g.coins
        // the daily is credited to the day it was started on, even past midnight
        if let day = play.daily {
            won += progress.finishDaily(day: day, yesterday: Daily.dayBefore(day), score: score)
        }
        play.coinsWon = won
        save()
        if counts { GameCenter.holeBanked(h.key, score: score, progress: progress, catalog: catalog) }
        return rec
    }
    func next(after key: String) -> Route {
        if let n = catalog.nextKey(key) { return .hole(n) }
        let c = Catalog.course(of: key)
        return catalog.holes(course: c).allSatisfy { progress.holes[$0.key] != nil } ? .card(c) : .map(c)
    }
    func unlocked(_ key: String) -> Bool { progress.unlocked(key, catalog: catalog) }
    func open(course c: Int) -> Bool { catalog.isExtra(c) ? catalog.has(course: c) : progress.worlds.contains(c) && catalog.has(course: c) }
    func toggleSound() { progress.sound.toggle(); save(); applySound() }
    /// quiet mode silences the synth and the haptics alike
    func applySound() { Synth.shared.enabled = progress.sound; Haptics.enabled = progress.sound }
    /// each world's border material, as the web's WALL_KIND_OF
    static let wallKind: [Int: String] = [1: "steel", 2: "stone", 3: "stone", 4: "wood", 5: "wood", 6: "stone", 7: "brick", 8: "steel", 9: "paint", 10: "marble"]
    func toggleNeon() { progress.neon.toggle(); save() }
    /// which hand putts: the swing pad and the aim buttons swap sides
    func setHand(_ h: String) { progress.hand = h == "L" ? "L" : "R"; save() }

    /// `-route map:5` / `-route hole:5-3` / `-route card:1`, and `-demo` for a profile with every course
    /// played: how CI takes a screenshot of every scene (the web's ?hole= and ?map)
    private func applyLaunchArguments() {
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "-render"), i + 1 < args.count, let r = Renderer(rawValue: args[i + 1]) { renderer = r }
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
        case "shop": go(.shop)
        default: break
        }
    }
}
