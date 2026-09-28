# Haptics: why they didn't work, and the fix

_Author: haptics-agent. Branch `redesign-haptics`, commit `0a2f5ed` (from `main` @ `9a78d4f`), merged into `redesign` in `8a7637a`._

## In one paragraph

Haptics were broken on both platforms that can have them, for different reasons.

- **Current iPhones (iOS 26.5 and later, including iOS 27):** every haptic was silent. The web-haptics trick is to call `label.click()` on a hidden `<input switch>`. Apple closed it as a security bug in WebKit fc1ef83: a scripted label click now reaches the switch as an *untrusted* click, and untrusted clicks don't tick.
- **Android:** web-haptics fakes "intensity" by chopping each pulse into 20 ms PWM slices. So the most common cues became 2 ms and 6 ms buzzes (`vibrate([2,6])`, `vibrate([6,9])`), which phone vibrators can't render.
- **The Settings switch:** it offered Haptics where nothing can be felt: desktop Chrome and Edge, Firefox for Android, iPad, and iOS 17 and earlier.

**The fix** replaces web-haptics with a small in-house adapter. Android gets plain millisecond patterns that can be felt. On iPhone, the only mechanism left is a real finger on a label wired to a switch, so primary keys (`PressKey`) now carry an invisible `HapticSwitch`. `feedback.play` still decides whether each tap ticks. Capability detection is now honest.

**Web haptics cannot work on desktop or macOS (any browser), on iPad, or on iOS 17 and earlier.** None of them has a Vibration API or a switch haptic a web page can reach. The app now hides the Haptics setting there and does nothing.

## The 7 questions

### 1. What library or API is used?

**Before:** `web-haptics@0.0.6`, abandoned (last release 2026-03-02). The call path was `feedback.play(event)` → `interactionMap` → one of 8 presets → `haptics.ts` → `new WebHaptics().trigger(name)`. The library has two modes:

- **Vibration API present:** `navigator.vibrate(pattern)`, after converting each `{duration, intensity}` into 20 ms on/off PWM slices.
- **No Vibration API (iOS):** it lazily appends `<label style="display:none"><input type=checkbox switch style="display:none"></label>` to `document.body` and calls `label.click()` synchronously. Any further pulses are clicked later from `requestAnimationFrame`.

**After:** no dependency. `src/sensory/haptics.ts` (about 75 lines) plus `src/sensory/HapticSwitch.tsx` (about 40 lines). Platform APIs used: `navigator.vibrate` on Android; Safari's built-in haptic for a finger toggling `<input type=checkbox switch>` on iPhone (iOS 18+).

**What web-haptics actually sent to `vibrate()`** (its own conversion code, run in node):

| Preset | Sent to `vibrate()` | Longest pulse |
|---|---|---|
| selection | `[2,6]` | 2 ms |
| light | `[6,9]` | 6 ms |
| medium | `[14,6,4,1]` | 14 ms |
| heavy | `[35]` | 35 ms |
| rigid | `[10]` | 10 ms |
| success | `[10,10,5,65,40]` | 40 ms |
| warning | `[16,4,16,104,12,8,12,8]` | 16 ms |
| error | `[18,2,18,42,18,2,18,42,18,2,18,2]` | 18 ms |

### 2. Does it support the target browsers and devices?

| Platform | Before (web-haptics 0.0.6) | After |
|---|---|---|
| iOS Safari ≤ 17.3 | No switch, no haptic. Settings still showed Haptics (because of `pointer: coarse`) | Silent. Haptics row hidden |
| iOS 17.4–17.7 | The switch exists but has no haptic (added in iOS 18). Dead Haptics row | Silent. Row hidden (the check requires Safari 18's `content-visibility`) |
| iOS 18.0–26.4 | The first tick of each call worked. Later pulses came from rAF, outside the gesture, and were dropped once WebKit required user activation (bug 285120, Jan 2025) | One tick per tap on `PressKey` controls. Other controls silent (see Regressions) |
| **iOS 26.5+ / 27** | **Everything silent** (WebKit fc1ef83) | One tick per tap on `PressKey` controls |
| iOS Home Screen web app | Same as the iOS version above | Same. Detection doesn't need `Version/` in the UA, which standalone mode lacks |
| Android Chrome | selection 2 ms, light 6 ms (not felt); medium 14+4 ms; heavy and rigid fine; success/warning/error chopped into fragments | Every level felt: 12–40 ms taps, distinct rhythms |
| Android Firefox | `vibrate` exists but is a no-op since v79. Nothing felt, dead Haptics row | Silent. Row hidden |
| Samsung Internet | As Android Chrome | As Android Chrome |
| Desktop Chrome / Edge | `vibrate` exists (no hardware), so a **dead Haptics row showed** | Silent. Row hidden |
| Desktop Safari (macOS) / Firefox | Silent. Row hidden | Same |
| iPad | Silent (no Taptic Engine). Dead row (coarse pointer) | Silent. Row hidden (iPadOS reports a Mac UA) |

### 3. Are calls triggered from valid user gestures?

Almost all `feedback.play` calls are synchronous in a click, pointerup or keydown handler, or in a command called from one: playbackService `togglePlay`/`skip*`/`seekTo`/`playItem`, practiceDeck, `SOURCES.demo`, Sheet, Settings, Rail, Tutorial, Welcome, PowerOn, FullscreenButton, InstallRow, `tickLink` and Lyrics.

Outside the gesture:

| Where | Event | When it runs | Effect now |
|---|---|---|---|
| `playbackService.queueItem` | `queue-add` | After `await` | Android plays it (sticky activation). iPhone doesn't (the press already ticked). Best-effort by design |
| `playbackService.transferTo` | `device-connected` | After `await` | Same |
| `playbackService.reportCommandError` | `playback-error` | After `await` | Same |
| `Deck.tsx` SwipeArt `onDrag` | `tick` | Motion drag callback (frame loop) | Android only. Commented as best-effort |
| `ui/Scrubber.tsx` keyboard seek | `seek` (through `seekTo`) | `setTimeout(350)` | Broke the "never from timers" rule — fixed on `redesign` (see "What remains") |
| `Sheet.tsx` `onCancel` | `back` | Escape or Android back gesture | Escape grants no activation; Android vibrates (sticky activation). Fine |
| web-haptics internals | Pulses 2+ of success/warning/error | rAF | Gone with the library |

New rule on iPhone: a tick happens only if `feedback.play` runs **synchronously inside the `onClick` of a control carrying `HapticSwitch`**.

### 4. Does the device support the mechanism?

- **iPhone:** has a Taptic Engine. WebKit plays the switch haptic on iPhone only (Safari 18.0 notes).
- **iPad:** no Taptic Engine.
- **Android phones:** have a vibrator. Chrome still exposes `vibrate` on tablets without one; it's a silent no-op there and can't be detected.
- **Short pulses:** Blink plays a pattern as one `Vibrate()` IPC per on-segment, with timers for the gaps, so PWM slices become separate 2–6 ms vibrator calls with jitter. By reasoning (not measured), most phone vibrators need about 10 ms or more to be felt.
- **Silent mode:** Chrome's Android `VibrationManagerImpl` skipped vibration in `RINGER_MODE_SILENT` (verified in the Chrome 53 source; **unverified for current Chrome**).
- **Desktop and macOS:** nothing a web page can drive.

### 5. Initialization correctness

web-haptics initialization itself was fine (one lazy instance, a static `isSupported`, one hidden label on `<body>`, the first click synchronous). The bugs were in the mechanisms and in `hapticsAvailable()`: `isSupported || (pointer: coarse)` is true on desktop Chrome, Firefox Android, iPad and iOS ≤ 17.

**Hypothesis checked and rejected: inert modal dialogs.** A scripted `label.click()` on a label that is inert behind `showModal()` still toggles the switch, in headless Chromium and in system WebKit (Safari 26.6.2 engine, via `WKWebView`). WebKit's haptic gate checks user gesture and trusted event, not inertness.

**After:** the mechanism is detected once at module load; no DOM is created up front. `HapticSwitch` renders only on iPhone.

### 6. Calls swallowed by browser restrictions

- **iOS 26.5+:** every `label.click()` is untrusted, so silent. **Reproduced:** web-haptics 0.0.6 in system WebKit, `trigger('selection')` inside a real NSEvent click with `navigator.userActivation.isActive === true`; the switch received `isTrusted: false`.
- **iOS 18.x after bug 285120:** rAF-driven extra pulses are not in a gesture, so silent. The shipping release is unverified.
- **Chrome Android:** `vibrate` returns false until the frame has had a user activation (sticky, Chrome 60+), when the page is hidden, and in cross-origin iframes. Possibly also in silent ringer mode.
- **Firefox Android:** `vibrate` returns true and does nothing.
- **Desktop Chrome:** `vibrate` returns true with no hardware.

### 7. Abstraction wiring

Unchanged and correct: UI → `feedback.play(event)` → `INTERACTIONS` → a haptic level → `haptics.ts`. Settings are pushed in by `main.tsx` (`useSettings.subscribe` → `configure`). 60 ms dedupe. A failing channel is caught. Only `ui/PressKey.tsx` renders the sensory-owned `<HapticSwitch>`; whether it ticks is still decided by `feedback.play` in the same tap, so the Haptics setting, the dedupe and events with no haptic behave the same on iPhone as on Android.

## Semantic level → mechanism

| Level | Events | Android `vibrate` (ms) | iPhone (`HapticSwitch`) | Unsupported |
|---|---|---|---|---|
| selection | select, tick, toggle, seek, queue-reorder, lyrics-open | `[12]` | 1 tick* | nothing |
| light | back, queue-remove, room-left, jump-to-current | `[18]` | 1 tick* | nothing |
| medium | primary-press, play, pause, next-track, previous-track | `[26]` | 1 tick* | nothing |
| heavy | power-on | `[40]` | 1 tick* | nothing |
| success | queue-add, success, device-connected, room-joined, ready, spotify-connected | `[18,70,30]` | 1 tick* | nothing |
| warning | warning, spotify-disconnected, device-lost | `[30,110,30]` | 1 tick* | nothing |
| error | playback-error, error | `[30,50,30,50,30]` | 1 tick* | nothing |
| none | focus, reaction, listener-*, loading, lyrics-follow, lyrics-manual-scroll | nothing | nothing | nothing |

\* Only when the finger lands on a control carrying `HapticSwitch` and its `onClick` plays the event synchronously. iOS gives a web page one fixed tick per real tap, with no intensity or patterns, so a multi-pulse level is honestly a single tick. After an `await` there is no tick on iPhone.

`rigid` was dropped: on Android it could only be a slightly different duration (no amplitude control), and on iPhone it was the same tick.

## What changed and why

- **`src/sensory/haptics.ts` (rewritten):** `VIBRATION` table of plain patterns (no PWM). `detectHaptics(env)` returns `'vibrate'`, `'ios-switch'` or `null` (coarse pointer required; `vibrate` counts only if the UA isn't Firefox; `ios-switch` needs `/iPhone/` in the UA and `CSS.supports('content-visibility','auto')`, i.e. Safari 18). `hapticsAvailable()` = `mechanism !== null`. `triggerHaptic(level)`: Android calls `vibrate(pattern)`; iPhone records "this tap wants a tick". `onSwitchTap(tap)` queues a microtask that calls `tap.preventDefault()` unless a tick was wanted — it runs after React's root click listener returns (after the button's `onClick`) and before the label forwards the click to the switch.
- **`src/sensory/HapticSwitch.tsx` (new):** renders only on iPhone and when not `disabled`. An `aria-hidden` label covering the host (`position:absolute; inset:0; touch-action:manipulation`) containing a `visibility:hidden` `<input type=checkbox switch tabindex=-1>`. The switch stops its own click so the forwarded click doesn't run the button's `onClick` twice. A ref sets `position: relative` on the host if it's static. Styles go through the CSSOM (CSP-safe). Same design as ios-haptics PR #13, confirmed working on iOS 27.
- **`src/ui/PressKey.tsx`:** renders `<HapticSwitch disabled={disabled} />` as its last child.
- **`types.ts` / `interactionMap.ts`:** removed `rigid`; skip uses `medium`. **`feedback.ts`:** comment only.
- **Tests:** `feedback.test.ts` checks against `VIBRATION`; new `haptics.test.ts` (12 tests): every pattern feelable (pulses ≥ 12 ms, gaps ≥ 40 ms, total ≤ 250 ms), taps ordered, distinct rhythms, `detectHaptics` for Android / iPhone Safari / Home Screen / desktop-with-vibrate / iPad / iOS 17 / Firefox Android / no window, vibrate once, iPhone and unsupported never vibrate, the switch tap ticks only when asked and each tap decides afresh.
- **`package.json` / `package-lock.json`:** removed `web-haptics`.

## Verification done

- Worktree: oxlint, `tsc` (both tsconfigs), vitest 173/173, `vite build`; web-haptics absent from the bundle. After merging into `redesign`: lint, typecheck and 181/181 tests pass.
- **Headless Chromium, harness around the real `PressKey` and sensory code, production CSP: 18/18.** iPhone emulation: the label covers the key and is what the finger hits; `onClick` runs exactly once; the switch gets a trusted click when a haptic is wanted; the switch is untouched with Haptics off, for an event with no haptic, for a disabled key, and under a parent `stopPropagation()`; `whileTap` still scales; Enter still activates; no CSP or React errors. Android emulation: no overlay; play calls `vibrate([26])` once. Desktop Chrome: `vibrate` exists and the mechanism is still null.
- **System WebKit (macOS `WKWebView`, Safari 26.6.2 engine, includes fc1ef83), real NSEvent clicks:** the switch receives `isTrusted:true` exactly once when wanted, and nothing for no-haptic, Haptics-off and `stopPropagation`. The old library on the same engine: `isTrusted:false` — the owner's bug.

## How to verify on real phones

**iPhone (iOS 18 or later, ideally 26.5+ or 27):**
1. Open a Vercel preview of the merged branch. The welcome power key works without Spotify.
2. iOS Settings → Sounds & Haptics → **System Haptics** on (likely governs this haptic; unverified).
3. PartyDeck Settings → Feel: the Haptics row is present and on.
4. Press **Continue** (power key) and **Continue with Spotify**. After connecting, press **play/pause, previous, next**, the rail play key, and **+ (add to queue)** in Search. Expect one crisp tick each.
5. Tabs, Back, sheets, rows, swipe and scrubber: **no tick** (by design for now).
6. Haptics off: keys silent. On: ticks return.
7. Nothing playing (keys disabled): no tick.
8. Start a vertical drag on a **+** button in Search results: the list scrolls, no tick.
9. Add to Home Screen and repeat 4–6.
10. Optional: Web Inspector, `document.querySelectorAll('input[switch]').length > 0` on the deck.

**Android (Chrome or Samsung Internet):**
1. Not in silent ringer mode; Vibration & haptics on.
2. The Haptics row is present in Settings.
3. Compare: tab or row = selection 12 ms; Back = light 18 ms; play/next = medium 26 ms; power key = heavy 40 ms; add to queue = success double pulse (after Spotify responds); airplane mode then next = error triple pulse.
4. Each should be clearly felt and different. If selection is too faint, raise it in `VIBRATION` (`src/sensory/haptics.ts`).
5. Firefox Android: no Haptics row.

**Desktop and iPad:** no Haptics row.

## What remains

- **Only `PressKey` controls tick on iPhone.** Other buttons can opt in with `<HapticSwitch/>` — never links, submit/popover buttons, or drag surfaces.
- **Swipe and scrub have no iPhone haptic.** No web mechanism exists for gestures.
- **Android patterns are tuned by reasoning.** Calibrate on a Pixel (LRA) and a Samsung A-series.
- **Unverified:** whether iOS ticks on the switch's *off* toggle as well as *on* (ios-haptics alternates and works on iOS 27); whether System Haptics gates it; iOS in-app browsers; Chrome's current silent-mode behaviour; the Safari release that shipped bug 285120.

## Potential regressions

- **iOS 18.0–26.4:** controls other than `PressKey` used to tick through the scripted path; now they're silent, so every iOS version behaves the same (the scripted path is dead on 26.5+, and keeping both would double-tick keys on older iOS).
- **Skip on Android** is 26 ms instead of 10 ms. Selection and light are longer, so they're felt now, but may seem "buzzier".
- **`PressKey` DOM on iPhone:** a `<label>` child sits over the key; the key gets inline `position: relative` if static; `event.target` in key handlers is the label (none read it); `<label>` inside `<button>` is an invalid content model but harmless (aria-hidden, no React warning). Restyles must not put `pointer-events: none` on key descendants, use `display: contents` on keys, or rely on `:only-child`/`:empty`.
- **Android and desktop:** no DOM change.

## Sources

- WebKit fc1ef83 (bug 309082): https://github.com/WebKit/WebKit/commit/fc1ef83
- WebKit 285120 (switch haptic requires user activation): https://www.mail-archive.com/webkit-changes@lists.webkit.org/msg224366.html
- WebKit 271711 (switch haptic on click): https://www.mail-archive.com/webkit-changes@lists.webkit.org/msg212357.html
- Safari 18.0 features: https://webkit.org/blog/15865/webkit-features-in-safari-18-0/
- ios-haptics PR #13 (confirmed on iOS 27): https://github.com/tijnjh/ios-haptics/pull/13
- tappt PR #5 (iOS 26.5 break; `isTrusted:false` on Safari 26.6.1): https://github.com/mxerf/tappt/pull/5
- MDN compat data: https://github.com/mdn/browser-compat-data/blob/main/api/Navigator.json · https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate
- Mozilla bug 1653318: https://bugzilla.mozilla.org/show_bug.cgi?id=1653318
- Blink `vibration_controller.cc`: https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/vibration/vibration_controller.cc
- Chromium user-activation requirement: https://issues.chromium.org/issues/40512244
