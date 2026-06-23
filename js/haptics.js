/**
 * Lightweight haptic feedback via Android WebView bridge.
 * Kinds: tick, light, medium, heavy, success, error
 */
function haptic(kind) {
  try {
    if (window.ArcadeAndroid && typeof window.ArcadeAndroid.vibrate === "function") {
      window.ArcadeAndroid.vibrate(kind || "light");
    }
  } catch (_e) {
    // Ignore when bridge is unavailable.
  }
  if (window.ArcadeAudio && typeof window.ArcadeAudio.playForHaptic === "function") {
    window.ArcadeAudio.playForHaptic(kind || "light");
  }
}

function hapticTick() { haptic("tick"); }
function hapticLight() { haptic("light"); }
function hapticMedium() { haptic("medium"); }
function hapticHeavy() { haptic("heavy"); }
function hapticSuccess() { haptic("success"); }
function hapticError() { haptic("error"); }
