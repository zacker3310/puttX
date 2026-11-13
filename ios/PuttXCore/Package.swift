// swift-tools-version: 6.0
// PuttXCore: the deterministic sim, rounds, progress and the course catalog. No UIKit, no
// RealityKit, so it builds and tests on Linux and macOS as well as in the app. The hole data and
// the golden putts it is tested against are exported from the JS sources by scripts/export-ios.cjs.
import PackageDescription

let package = Package(
    name: "PuttXCore",
    platforms: [.iOS(.v18), .macOS(.v15)],
    products: [.library(name: "PuttXCore", targets: ["PuttXCore"])],
    targets: [
        .target(name: "PuttXCore", resources: [.copy("Resources/holes.json")]),
        .testTarget(name: "PuttXCoreTests", dependencies: ["PuttXCore"], resources: [.copy("Resources/golden.json"), .copy("Resources/play.json")]),
    ]
)
