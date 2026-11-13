// Game controllers on a hole: the left stick (or the d-pad) turns the aim, finely; holding the right
// trigger draws the putter back as far as it is pressed, and letting it go strikes. A trigger cannot
// mis-hit the way a finger can, so its stroke is always dead on and its power is the backswing
// alone. B goes back to the map, Y toggles the overview.
import GameController
import PuttXCore

@MainActor
final class Controllers {
    private weak var play: HolePlay?
    private var back = 0.0
    private var peak = 0.0
    private var link: DisplayLink?
    var onBack: (() -> Void)?

    func attach(_ play: HolePlay) {
        self.play = play
        GCController.startWirelessControllerDiscovery {}
        link = DisplayLink { [weak self] dt in self?.poll(dt) }
    }
    func detach() { link?.invalidate(); link = nil; play = nil }

    private func poll(_ dt: Double) {
        guard let play, let pad = GCController.current?.extendedGamepad else { return }
        if pad.buttonB.isPressed { onBack?(); return }
        if pad.buttonY.isPressed, !yWasDown { play.overview.toggle() }
        yWasDown = pad.buttonY.isPressed
        guard play.phase == .aim else { back = 0; peak = 0; return }
        // aim: degrees a second, faster at full tilt
        let x = Double(pad.leftThumbstick.xAxis.value) + Double(pad.dpad.xAxis.value) * 0.25
        if abs(x) > 0.08 { play.aim -= x * abs(x) * 40 * dt }
        // the swing: the trigger is the backswing; letting go strikes at the deepest point reached
        let t = Double(pad.rightTrigger.value)
        if t > 0.02 {
            back = t * Swing.FULL
            peak = max(peak, back)
            play.swing = (back: back, side: 0)
        } else if peak > Swing.DEAD {
            let power = min(1, peak / Swing.FULL)
            play.swing = nil
            peak = 0; back = 0
            play.strike(.trigger(power: power))
        } else if peak > 0 {
            play.swing = nil; peak = 0
        }
    }
    private var yWasDown = false
}
