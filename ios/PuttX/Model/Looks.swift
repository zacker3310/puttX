// Each course's palette, exported from courses/cNN.look.js by scripts/export-ios.cjs (resolved the way
// the web's lookOf resolves it by day). Neon night swaps in the cosmic-bowling palette.
import SwiftUI

struct CourseLook: Decodable {
    let course: Int
    let felt: String, wall: String
    let ground: String?
    let sky: [String]
    let sand: String, ice: String, mud: String, fast: String, water: String, push: String
    let skirt: String, tube: String, flag: String
    let jingle: [Double]
    let icon: String?

    var skyColors: [Color] { sky.map(Color.init(hex:)) }
    var iconImage: Image? { icon.map { Image($0) } }
    func color(_ s: String) -> Color { Color(hex: s) }

    /// the night remix: black-light carpet, neon walls, a glowing ball (src/game.js lookOf)
    func night() -> CourseLook {
        CourseLook(course: course, felt: "#120b2e", wall: "#1d1240", ground: "#06030f", sky: ["#05020f", "#2a0b4d"],
                   sand: "#5b2a8f", ice: "#1fd4ff", mud: "#3b1d55", fast: "#d13bff", water: "#2a4dff", push: "#ffb02e",
                   skirt: "#1a0f3d", tube: "#b6ff2e", flag: "#ff3df2", jingle: jingle, icon: icon)
    }
}

struct Looks {
    private let byCourse: [Int: CourseLook]
    static let shared = Looks()

    private init() {
        struct File: Decodable { let looks: [CourseLook] }
        let url = Bundle.main.url(forResource: "looks", withExtension: "json")!
        let f = try! JSONDecoder().decode(File.self, from: Data(contentsOf: url))
        byCourse = Dictionary(uniqueKeysWithValues: f.looks.map { ($0.course, $0) })
    }
    subscript(course: Int) -> CourseLook { byCourse[course] ?? byCourse[1]! }
}
