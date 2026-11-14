// Touch you can feel, on Core Haptics: the strike (a crisp tap scaled by the power when clean, a dull
// double when off the toe or heel), a click for every tenth of backswing as it loads, a soft rumble
// under the rolling ball that follows its speed, a knock off a rail or a bumper, the rattle and thunk
// of the drop into the cup, and a tick on every toy button. Devices without a haptic engine fall back
// to the system's feedback generators. Quiet mode keeps all of it off.
import UIKit
import CoreHaptics

@MainActor
enum Haptics {
    static var enabled = true { didSet { if !enabled { roll(0) } } }

    private static let supported = CHHapticEngine.capabilitiesForHardware().supportsHaptics
    private static var engine: CHHapticEngine?
    private static var rumble: CHHapticAdvancedPatternPlayer?
    private static var rumbling = false
    private static var loaded = 0

    // the fallback
    private static let light = UIImpactFeedbackGenerator(style: .light)
    private static let rigid = UIImpactFeedbackGenerator(style: .rigid)
    private static let soft = UIImpactFeedbackGenerator(style: .soft)
    private static let note = UINotificationFeedbackGenerator()

    private static func ready() -> CHHapticEngine? {
        guard supported, enabled else { return nil }
        if let e = engine { return e }
        guard let e = try? CHHapticEngine() else { return nil }
        e.isAutoShutdownEnabled = true
        e.playsHapticsOnly = true
        // after an interruption or a reset the engine starts again on the next touch
        e.resetHandler = { Task { @MainActor in try? engine?.start(); rumble = nil; rumbling = false } }
        e.stoppedHandler = { _ in Task { @MainActor in rumble = nil; rumbling = false } }
        try? e.start()
        engine = e
        return e
    }
    private static func play(_ events: [CHHapticEvent]) {
        guard let e = ready(), let p = try? CHHapticPattern(events: events, parameters: []), let pl = try? e.makePlayer(with: p) else { return }
        try? e.start()
        try? pl.start(atTime: CHHapticTimeImmediate)
    }
    private static func tap(_ intensity: Double, _ sharpness: Double, at t: Double = 0) -> CHHapticEvent {
        CHHapticEvent(eventType: .hapticTransient, parameters: [
            CHHapticEventParameter(parameterID: .hapticIntensity, value: Float(max(0, min(1, intensity)))),
            CHHapticEventParameter(parameterID: .hapticSharpness, value: Float(max(0, min(1, sharpness)))),
        ], relativeTime: t)
    }
    private static func hum(_ intensity: Double, _ sharpness: Double, at t: Double = 0, for d: Double) -> CHHapticEvent {
        CHHapticEvent(eventType: .hapticContinuous, parameters: [
            CHHapticEventParameter(parameterID: .hapticIntensity, value: Float(intensity)),
            CHHapticEventParameter(parameterID: .hapticSharpness, value: Float(sharpness)),
        ], relativeTime: t, duration: d)
    }

    /// the putter meets the ball
    static func strike(_ power: Double, clean: Bool) {
        guard enabled else { return }
        loaded = 0
        if supported {
            play(clean ? [tap(0.45 + 0.55 * power, 0.85)] : [tap(0.8, 0.25), tap(0.5, 0.15, at: 0.06)])
        } else if clean { rigid.impactOccurred(intensity: CGFloat(0.4 + 0.6 * power)) }
        else { soft.impactOccurred(intensity: 0.8); DispatchQueue.main.asyncAfter(deadline: .now() + 0.06) { soft.impactOccurred(intensity: 0.5) } }
    }
    /// the backswing loading: a light click at every tenth of power
    static func windup(_ power: Double) {
        guard enabled else { return }
        let step = Int(max(0, min(1, power)) * 10)
        if step == 0 { loaded = 0; return }
        guard step > loaded else { return }
        loaded = step
        if supported { play([tap(0.12 + 0.03 * Double(step), 0.6)]) } else { light.impactOccurred(intensity: 0.25) }
    }
    /// off a rail, a post, a bumper or a mover
    static func knock(_ v: Double) {
        guard enabled else { return }
        if supported { play([tap(0.25 + v * 0.25, 0.7)]) } else { light.impactOccurred(intensity: CGFloat(min(1, 0.25 + v * 0.25))) }
    }
    /// the drop: a quick rattle round the liner and the thunk on the bottom
    static func cup() {
        guard enabled else { return }
        roll(0)
        if supported { play([tap(0.5, 0.9), tap(0.35, 0.9, at: 0.07), tap(0.22, 0.9, at: 0.12), hum(0.9, 0.1, at: 0.2, for: 0.09), tap(1, 0.2, at: 0.2)]) }
        else { note.notificationOccurred(.success) }
    }
    /// a toy button pressed
    static func tap() {
        guard enabled else { return }
        if supported { play([tap(0.45, 0.5)]) } else { light.impactOccurred(intensity: 0.5) }
    }
    /// the ball rolling: a low rumble that follows its speed (0 stops it); rougher on sand and mud
    static func roll(_ speed: Double, rough: Bool = false) {
        guard supported else { return }
        let k = enabled ? min(0.32, speed * (rough ? 0.16 : 0.1)) : 0
        if k < 0.02 {
            if rumbling { try? rumble?.stop(atTime: CHHapticTimeImmediate); rumbling = false }
            return
        }
        guard let e = ready() else { return }
        if rumble == nil, let p = try? CHHapticPattern(events: [hum(1, 0.15, for: 60)], parameters: []) { rumble = try? e.makeAdvancedPlayer(with: p); rumble?.loopEnabled = true }
        if !rumbling { try? e.start(); try? rumble?.start(atTime: CHHapticTimeImmediate); rumbling = true }
        try? rumble?.sendParameters([
            CHHapticDynamicParameter(parameterID: .hapticIntensityControl, value: Float(k), relativeTime: 0),
            CHHapticDynamicParameter(parameterID: .hapticSharpnessControl, value: rough ? 0.35 : 0.1, relativeTime: 0),
        ], atTime: CHHapticTimeImmediate)
    }
}
