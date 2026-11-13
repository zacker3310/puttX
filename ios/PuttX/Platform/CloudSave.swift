// iCloud saves: each profile slot mirrors to the iCloud key-value store. Saves merge without loss
// (PlayerProgress.merged: a best only goes down, stars only go up, open courses only grow), so a game
// played on the iPad and the iPhone ends up the same on both, with no "which one wins" question.
import Foundation
import PuttXCore

@MainActor
final class CloudSave {
    private let kv = NSUbiquitousKeyValueStore.default
    private var observer: NSObjectProtocol?
    /// told the slot numbers whose cloud copy changed
    var onChange: (([Int]) -> Void)?

    static func key(_ slot: Int) -> String { "puttx.save.\(slot)" }

    init() {
        observer = NotificationCenter.default.addObserver(forName: NSUbiquitousKeyValueStore.didChangeExternallyNotification, object: kv, queue: .main) { [weak self] note in
            let keys = (note.userInfo?[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String]) ?? []
            let slots = keys.compactMap { k in k.hasPrefix("puttx.save.") ? Int(k.dropFirst("puttx.save.".count)) : nil }
            MainActor.assumeIsolated { self?.onChange?(slots) }
        }
        kv.synchronize()
    }

    func read(_ slot: Int) -> PlayerProgress? {
        guard let d = kv.data(forKey: CloudSave.key(slot)) else { return nil }
        return try? JSONDecoder().decode(PlayerProgress.self, from: d)
    }
    func write(_ slot: Int, _ p: PlayerProgress) {
        guard let d = try? JSONEncoder().encode(p) else { return }
        kv.set(d, forKey: CloudSave.key(slot))
    }
    func erase(_ slot: Int) { kv.removeObject(forKey: CloudSave.key(slot)) }
}
