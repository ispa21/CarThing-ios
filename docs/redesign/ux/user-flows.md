# PartyDeck user flows: current `main` (9a78d4f)

These are the main journeys as they behave today. Each step lists the screen, what the user is trying to do, and every channel of feedback they get:
- **V**: visual
- **M**: motion
- **S**: sound (Cuelume cue)
- **H**: haptic (WebHaptics preset)

Cue names come from `src/sensory/interactionMap.ts`. **Gaps** are what's missing or wrong at that step. Screenshot names refer to `scratchpad/qa/before/` (see `audit.md`).

Cue shorthand:

| Event | Sound | Haptic |
|---|---|---|
| `select` / `tick` | tick | selection |
| `primary-press`, `play` | pulse | medium |
| `pause` | press | medium |
| `next-track`, `previous-track` | page | rigid |
| `seek` | tick | selection |
| `back` | droplet | light |
| `queue-add`, `device-connected` | success | success (Android only, since it follows a network round trip) |
| `playback-error` | error | error (best-effort) |
| `power-on` | arrival | heavy |
| `ready` | ready | success |
| `toggle` | toggle | selection |
| `spotify-disconnected` | none | warning |

---

## 1. First run → connect

| # | Screen | Intent | Feedback | Gaps |
|---|---|---|---|---|
| 1 | Welcome `/` (`welcome__*`) | "What is this?" | **V** "PartyDeck" wordmark at 60% opacity with a grey lamp, "Your music. Your deck.", one round Continue key, and a "Try the lyrics reader" link. **M** The action area rises 6px over 260ms. | It never says *Spotify remote* until the next screen. On desktop it's a small cluster floating high in a void. |
| 2 | Welcome: press Continue | Get started | **M** The key springs to 0.92, the amber ring sweeps over 540ms, and the wordmark and lamp light up. After 420ms the Connect panel replaces the key. **S** pulse **H** medium. `welcomed=true` is saved. | The tactile round key is replaced by a flat full-width pill. Two taps before sign-in. |
| 3 | Connect (`connect__*`) | Sign in | **V** "Continue with Spotify" pill and a Premium note. Pressing it: **M** scale 0.97, **V** label "Opening Spotify…" and disabled. **S** pulse **H** medium. Then navigates to accounts.spotify.com. | If `VITE_SPOTIFY_CLIENT_ID` is missing, the button is disabled and a "Developer setup" panel shows. **The main checkout's `.env.local` currently has no client ID.** |
| 4 | `/callback` | Wait | **V** "Connecting to Spotify…" with a pulsing lamp (1.6s loop). No S/H (no gesture). | Fine. |
| 5a | Success → Power on | n/a | See journey 2. | n/a |
| 5b | Declined or failed → Connect with notice (`connect-notice__*`) | Understand what went wrong | **V** Amber-edged card above the button: "Spotify access was declined" plus a reason (`role=alert`). No S/H. | Good. No motion draws the eye, but placement does. |
| alt | "Try the lyrics reader" | Try without an account | **S/H** select → `/lyrics/demo` | Only the lyrics can be tried. There's no demo deck. |

## 2. Power on → turn sideways → tutorial → deck

| # | Screen | Intent | Feedback | Gaps |
|---|---|---|---|---|
| 1 | Power on (`power-on__*`) | Confirm it worked | **V** "✓ Spotify connected", "Ready when you are.", "Signed in as Alex Rivera.", and the Power key. Playback sync starts in the background. | **The headline shows an amber focus ring on load** (programmatic focus matches `:focus-visible`). |
| 2 | Press Power on | Turn it on | **M** Key spring, ring sweep, then the next step after 640ms. **S** arrival **H** heavy. | The payoff is the ring sweep only. The deck never "boots" (no staged reveal on arrival). |
| 3 | Turn sideways (phone-p only, `power-on-next__phone-p`) | Rotate | **V/M** A looping phone glyph rotates; "Turn your phone sideways." It continues by itself on rotate (no cue, by rule). "Continue in portrait" gives **S/H** select. | Fine. |
| 4 | Tutorial, 7 steps (`tutorial__*`, `tutorial-step4__*`) | Learn by doing | **V** Coach line at the top ("**Press play.** The big key starts the music."), 7 step dots (done = amber, current = white), and an amber ring plus breathing halo on the taught control. Each action gives its own real cue (play pulse, pause press, skip page/rigid, queue/lyrics select). The coach text is `aria-live`. | A completed step has no confirmation of its own; only the dots change. On desktop the instruction is about 1000px from the key (`tutorial__desktop`). On phone-l the Queue and Lyrics panels cover the whole deck (`tutorial-lyrics-panel__phone-l`). |
| 5 | Step 7, full screen | Optional | **V** A "Not now" / "Got it" / "Continue" button sits in the coach line, and the rail's full-screen key has the ring. | On iPhone the hint is text only ("Share, then Add to Home Screen"). |
| 6 | Done (`tutorial-done__*`) | Finish | **V** Dimmed deck, card "Your deck is ready." and "Start listening" (autofocused). **M** Card rises 12px and scales from 0.97. Pressing Start: **S** ready **H** success. Then a plain route change to the deck. | The arrival at the real deck is the generic 240ms fade. There's no "your music wakes up" moment. |
| alt | Skip (any step) | Get out | **S** droplet **H** light, then the deck. | Fine. |

## 3. Play, pause, skip, seek (the deck)

| # | Control | Intent | Feedback | Gaps |
|---|---|---|---|---|
| 1 | Play/Pause key (80px; 64px on short landscape) | Toggle | **M** Spring to 0.95 and the bottom shadow flattens. **V** The glyph swaps instantly, optimistically. **S** pulse (play) / press (pause), **H** medium. It resyncs about 1s later. | Paused state is nearly invisible: the bar stays amber and the art unchanged (`deck-paused__phone-l`). No hover state on desktop. No glyph morph. |
| 2 | Next/Previous keys | Skip | **M** Spring. **V** Progress jumps to 0:00 immediately. The title slides up 8px and the art cross-fades once Spotify reports the new track (about 0.9–1s). **S** page **H** rigid. | For about 1s the old title shows with 0:00. The vertical animation ignores direction. |
| 3 | Swipe the artwork | Skip by gesture | **M** The art follows the finger with rubber-band resistance. **S/H** tick when the commit threshold is crossed (best-effort haptic on iOS). On release: **S** page **H** rigid, then the art snaps back to centre and cross-fades. | The snap-back reads like "cancelled". There's no peek at the next track. |
| 4 | Scrubber | Seek | **V** On hover or drag the thumb appears, the track thickens (scaleY 1.7) and the elapsed time follows the finger. On release: **S** tick **H** selection. The keyboard gives ±5s on the slider and ±10s globally, sending once after 350ms. | 36px hit height. No floating time bubble. The unfilled track is 1.4:1 contrast. |
| 5 | Keyboard (Space/K, N/P, ←/→) | Desktop control | The same cues as the buttons. | Nothing on screen echoes which key acted (no key press shown). |
| 6 | Mini deck (on other screens) | Control without leaving | **V** 44px art, title and artist, a 44px play key, and a 2px amber progress line. Tapping the text returns to the deck (select). | Hidden entirely on phone-l-small. The title is cut to about 6 characters on phone-l. |
| 7 | Command fails | Know why | **V** Optimistic state rolls back and an error toast appears (for example "Spotify is having trouble. Try again in a moment."). **S** error **H** error (best-effort). No active device opens the device sheet automatically. | **The toast sits on top of the Play key** on phones (`toast__phone-l`). Error and info toasts look the same. |
| 8 | Spotify disallows an action | n/a | **V** The key is disabled at 30% opacity. | No reason is given. |

## 4. Find and play, or queue, a song

| # | Screen | Intent | Feedback | Gaps |
|---|---|---|---|---|
| 1 | Rail → Search (or `/`) | Look for music | **S/H** select. **M** Screen fade plus a 6px rise. The input is autofocused on fine pointers only. **V** The "Your playlists" shelf shows while the input is empty. | The heading is hidden on landscape phones (fine). |
| 2 | Type (`search-results__*`) | Narrow down | 250ms debounce. The search icon pulses while busy. Earlier results dim to 60% after 150ms. There's a skeleton on the first search, and screen readers hear "Searching" / "Results updated". | Nothing marks the currently playing song. "Song" kind labels repeat under the "Songs" header. |
| 3 | Tap a row | Play it now | **S** pulse **H** medium. On success, a toast "Playing Midnight City". The mini deck updates after the resync. | You stay on Search. The row itself gives no "playing" confirmation. |
| 4 | Tap + (`search-queue-add__*`) | Queue it | Press: **S/H** select. On success the + becomes an amber ✓ for 1.8s. **S** success, **H** success (Android only). Toast "Added Dreams to the queue". | The toast overlaps rows (on phone-p it covers another row's +). After 1.8s the ✓ reverts, so double-adds are easy. |
| 5 | ↗ | Open in Spotify | New tab. No cue. | n/a |
| 6 | No results (`search-empty__*`) | Recover | **V** "Nothing found for “zzqxv blorp”", "Check the spelling or try fewer words." | Dead end: no suggestions and no playlist fallback. |

## 5. Start a playlist when nothing is playing

| # | Screen | Intent | Feedback | Gaps |
|---|---|---|---|---|
| 1 | Deck with nothing playing (`deck-nothing-playing__*`) | Get music going | **V** "Nothing playing", "Pick a playlist, or choose where to play.", a "Choose device" pill, and a playlist grid (a sideways shelf on landscape phones). | On phone-l the subtitles truncate to "By Alex Ri…". |
| 2 | Tap a tile | Play it | **M** Scale 0.97. **S** pulse **H** medium. Toast "Playing Friday Night Warm-Up", then the deck swaps to the player after the resync. With no active device: error toast, error cue, device sheet. | Nothing hints at *where* it will play before you tap. The deck appears with no transition. |

## 6. Read lyrics

| # | Screen | Intent | Feedback | Gaps |
|---|---|---|---|---|
| 1 | Rail → Lyrics (or `L`) | Read along | **S/H** select (`lyrics-open`). **M** Immersive rise, 28px over 320ms. | n/a |
| 2 | Spotify track (`lyrics__*`) | n/a | **V** "Lyrics unavailable", the licensing explanation, and "See the demo". A footer has the Play key and scrubber. | **Controls auto-hide after 3.2s while playing, even here.** Back disappears until you tap. |
| 3 | Demo `/lyrics/demo` (`lyrics-demo__*`) | See the reader | **V** Current line at full opacity, others 32%, smooth auto-scroll. Scrolling yourself pauses follow and shows "Jump to current" (**S** release **H** light). Aa cycles the size (select). "Demo, no audio" label. | On phone-l about 2 lines show between the header and footer gradients. The scroller's keyboard focus is invisible. |
| 4 | Back / Esc | Leave | **S** droplet **H** light, then history back. | n/a |

## 7. Switch device

| # | Screen | Intent | Feedback | Gaps |
|---|---|---|---|---|
| 1 | Tap the device chip (or ⋮ → Choose device) | See where it's playing | **S/H** select. **M** Bottom sheet slides up (320ms drawer ease); centred fade and rise at ≥720px. **V** "Looking for devices…", then the list: the active row is raised with an amber lamp and "Playing here"; a restricted device shows at 45% with "Can't be controlled from here". | **On landscape phones the sheet shows about 4 rows.** Refresh is hidden and the header scrolls away (`device-sheet__phone-l`). The grip suggests drag-to-dismiss, which doesn't exist. |
| 2 | Tap a device | Move playback | **S/H** select. On success: **S** success **H** success (Android only), the sheet closes, toast "Playing on Living Room". | The tapped row shows no pending state while the transfer runs. No volume control. |
| 3 | ✕ / Esc / tap the backdrop | Dismiss | **S** droplet **H** light. | n/a |

## 8. Settings

| # | Control | Intent | Feedback | Gaps |
|---|---|---|---|---|
| 1 | Rail sliders icon, or ⋮ → Settings | Adjust | **S/H** select. A Back button is at the top. | Three entry points. Hidden on phone-p except through ⋮ on the deck. |
| 2 | Sound / Haptics / Follow switches | Toggle | **M** Knob slides over 220ms; the track turns amber when on. **S/H** `toggle` plays *after* the change (turning sound off is silent). | Off track contrast is 1.14:1. The Haptics switch shows on desktop Chrome, where it does nothing. |
| 3 | Text size / Screen segmented | Choose | **S/H** select. The theme changes the background with a 300ms fade. | n/a |
| 4 | Replay tutorial | Relearn | **S/H** select, then `/tutorial`. | n/a |
| 5 | Disconnect | Sign out | **H** warning (no sound), then straight back to Connect. | **No confirmation or undo** for a destructive action. |

---

## Cross-flow gaps (summary)

1. **No arrival moments.** Power on, tutorial completion and "Playing X" all end in a generic fade or a toast. The deck never visibly wakes.
2. **The toast is the only confirmation channel** for play, queue and device changes. It sits at a fixed 148px from the bottom and covers primary controls on phones.
3. **Network confirmations have no haptic on iOS.** The press cue is the only tactile response there (documented rule). Visual confirmations need to carry more weight.
4. **State changes are glyph-only.** Play versus pause, the active tab (a 4px dot), and a disabled key (30% opacity) all lack a secondary cue in colour, scale or light.
5. **Landscape phone** (the primary canvas) is where sheets truncate, lyrics get about 2 lines, and tutorial panels hide the deck.

---

## What I found

The journeys are complete and honest: every state is shown, there are no fake buttons, and the practice deck protects real playback. But feedback is quiet and generic.
- Confirmations rely on a toast that covers controls.
- Arrivals are plain route fades.
- Paused and disabled states are hard to read.
- Landscape phones truncate the device sheet.

Three flow-level problems:
- Disconnect has no confirmation.
- Lyrics auto-hides Back on the "unavailable" state.
- 429 "Try again" can't succeed during the cooldown.

## What I changed

Nothing in `src/`. Documentation only, plus the scratchpad screenshot harness (`qa/shots.cjs`).

## Files touched

- `docs/redesign/ux/user-flows.md` (this file)
- `docs/redesign/ux/audit.md`

## What remains

- Validate the sound and haptic columns on real hardware (iOS Safari 18+, Android Chrome). This doc derives them from code and the interaction map; the harness runs muted.
- Add episode (podcast) playback and "no active device on first play" flows to the harness fixtures if the redesign touches them.

## Potential regressions

- If the redesign moves confirmations off the toast, keep them announced: `role=status` / `aria-live`.
- Commands must keep calling `feedback.play` synchronously in the gesture (iOS haptics).
- Keep the tutorial's `inert` handling and focus-on-instruction behaviour.
- Keep auto-open of the device sheet on NO_ACTIVE_DEVICE.
- Keep the "Nothing playing → playlists" path; it's the best recovery flow in the app.
