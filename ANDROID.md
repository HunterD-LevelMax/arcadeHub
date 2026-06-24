# Android WebView integration

Arcade Hub is designed to run as a **single-page shell** inside an Android `WebView` with all assets bundled locally — no remote server required.

## Entry point

Load **only** the hub shell:

```
file:///android_asset/www/index.html
```

Copy the entire repository into `app/src/main/assets/www/` (or your project's assets folder). Games open inside an iframe via [`js/router.js`](js/router.js) — do **not** navigate the WebView to separate URLs for each game.

```
Splash Activity  →  WebView Activity  →  file:///android_asset/www/index.html
```

## Required WebView settings

```kotlin
webView.settings.apply {
    javaScriptEnabled = true
    domStorageEnabled = true
    allowFileAccess = true
    allowContentAccess = true
    // Required for iframe games/*.html on file://
    @Suppress("DEPRECATION")
    allowFileAccessFromFileURLs = true
    @Suppress("DEPRECATION")
    allowUniversalAccessFromFileURLs = true
}
```

Use a single `WebView` instance for the whole session. The BACK button in games calls `window.parent.ArcadeRouter.backToHub()` when same-origin allows it, or `postMessage({ type: 'arcade-hub-back' })` as fallback (required on `file://` where iframe and parent are often cross-origin).

## JavaScript bridge (haptics)

Existing games call `window.ArcadeAndroid.vibrate(kind)` via [`js/game.js`](js/game.js). Register the interface from Kotlin:

```kotlin
webView.addJavascriptInterface(ArcadeBridge(), "ArcadeAndroid")

class ArcadeBridge {
    @JavascriptInterface
    fun vibrate(kind: String) {
        // map kind: tick, light, medium, heavy, success, error
    }
}
```

## Audio

- SFX and BGM files live under `assets/www/audio/`.
- First user tap unlocks audio (`ArcadeAudio.unlock()`).
- Mute state is stored in `localStorage` key `arcadeHub_muted`.
- Hub background music (`audio/bgm/music_1.mp3`–`music_3.mp3`) plays in the parent shell and ducks while a game iframe is open.
- When the app is **minimized or hidden**, audio pauses automatically via `visibilitychange` / `pagehide` (implemented in `js/audio.js`). On return, BGM resumes if it was playing and mute is off.

Optional native hook if `visibilitychange` is unreliable on your WebView:

```kotlin
override fun onPause() {
    webView.evaluateJavascript("window.ArcadeAudio && ArcadeAudio.suspend()", null)
    super.onPause()
}

override fun onResume() {
    super.onResume()
    webView.evaluateJavascript("window.ArcadeAudio && ArcadeAudio.resume()", null)
}
```

## Offline

On `file://` assets, a service worker is **not** used — everything is already on disk. For HTTPS hosting, [`sw.js`](sw.js) precaches all game assets after the first visit.

## Updating assets

1. Replace contents of `assets/www/` with a fresh copy of this repo.
2. Bump `versionCode` / app release.
3. No server deployment needed.

## Hardware back button

When a game is open, **do not** call `webView.goBack()` — that navigates the iframe's internal history first (often leaving a blank iframe on screen). Instead, ask the hub router to close the game:

```kotlin
// Prefer OnBackPressedCallback (AndroidX) or Activity.onBackPressedDispatcher
override fun onBackPressed() {
    webView.evaluateJavascript(
        "(window.ArcadeRouter && ArcadeRouter.getCurrentGame()) ? 'game' : 'hub'"
    ) { result ->
        if (result == "\"game\"") {
            webView.evaluateJavascript("ArcadeRouter.backToHub()", null)
        } else {
            super.onBackPressed()
        }
    }
}
```

`ArcadeRouter.backToHub()` hides the game shell, recreates the iframe (clears iframe history), and syncs parent history via `replaceHubHistory()`. It does **not** call `history.back()` or navigate the iframe to `about:blank`.

On the hub, `super.onBackPressed()` (or `finish()`) exits the app as usual.
