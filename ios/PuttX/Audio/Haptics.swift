// Touch you can feel: the strike (crisp when clean, a dull double when off), a knock off a rail or a
// bumper, the drop into the cup, and a tick on every toy button. Quiet mode keeps them off too.
import UIKit

@MainActor
enum Haptics {
    static var enabled = true
    private static let light = UIImpactFeedbackGenerator(style: .light)
    private static let rigid = UIImpactFeedbackGenerator(style: .rigid)
    private static let soft = UIImpactFeedbackGenerator(style: .soft)
    private static let note = UINotificationFeedbackGenerator()

    static func strike(_ power: Double, clean: Bool) {
        guard enabled else { return }
        if clean { rigid.impactOccurred(intensity: CGFloat(0.4 + 0.6 * power)) }
        else { soft.impactOccurred(intensity: 0.8); DispatchQueue.main.asyncAfter(deadline: .now() + 0.06) { soft.impactOccurred(intensity: 0.5) } }
    }
    static func knock(_ v: Double) { guard enabled else { return }; light.impactOccurred(intensity: CGFloat(min(1, 0.25 + v * 0.25))) }
    static func cup() { guard enabled else { return }; note.notificationOccurred(.success) }
    static func tap() { guard enabled else { return }; light.impactOccurred(intensity: 0.5) }
}
