# PartyDeck UX audit: current `main` (9a78d4f)

**Scope.** Every screen and state of the shipped app, rendered with Spotify mocked across 7 viewports (269 screenshots), plus interactive probes: tab order, touch-target measurement, press, hover and motion frames, and contrast maths on the tokens.

**Screenshots.** In `/private/tmp/claude-501/-Users-ishan-Data-partydeck/feceaba9-5e43-4a2f-a64e-4b5fd15ab349/scratchpad/qa/before/`. Filenames below (`deck-playing__laptop.png`) are relative to that folder, and contact sheets with all viewports per shot are in `../sheets/`. The harness is `../shots.cjs`; see its README.

**Severity.**
- **P0**: blocks the redesign goal. This is why it reads as "far too basic".
- **P1**: broken or misleading on a primary path or viewport.
- **P2**: degrades quality or accessibility.
- **P3**: polish.

---

## Top 10

| # | Sev | Finding | Where |
|---|---|---|---|
| 1 | P0 | **No focal point or identity.** The deck is the stock "art left, text right, three buttons" music-player layout. The only Car Thing / hardware reference is an 8px amber dot. Nothing on screen is ownable. | `deck-playing__*`, `tutorial__desktop` |
| 2 | P0 | **Grey-on-grey.** Three surface tokens sit within a few % lightness (`#17141b` / `#221e27` / `#2d2833`). Amber is limited to a 6px progress bar and 4–8px dots. The album art is the only colour on any screen, and nothing borrows from it. | all; `settings__phone-p`, `queue__laptop` |
| 3 | P0 | **Flat, uniform type scale.** About 90% of text sits between 13 and 20px in one family (Barlow), at weights 500/600. Page titles are 32px, section titles 20px, and the deck title caps at 48px from 1440px up. There are no display moments except the wordmark and lyrics. | `search-results__laptop`, `settings__desktop`, `deck-playing__desktop` |
| 4 | P0 | **Desktop and tablet are a stretched or shrunken phone.** Search and Settings are a 720px column on a 1920 canvas. The 1920×1080 deck art is 640px, about 20% of the screen. The rail is a thin footer with 13px labels. tablet-p is the phone column with 11px tab labels. | `search-idle__desktop`, `settings__desktop`, `deck-playing__desktop`, `deck-playing__tablet-p` |
| 5 | P1 | **Queue overflows horizontally at landscape ≥760px.** The `3fr` column has no `minmax(0,…)`, so a long title pushes the row off-screen. Every ↗ link in "Up next" ends up off-canvas. The Now-playing row is squeezed to "Midnig…" at 1440px. | `queue__laptop`, `queue__desktop`, `queue__tablet-l` |
| 6 | P1 | **Toast covers the Play key.** It is fixed at `bottom: 148px` regardless of layout. On phone-p and both landscape phones it lands on the control you just pressed, and on phone-l it floats mid-list over rows. Error and info toasts look identical: a 35%-alpha red inset line, no icon. | `toast__phone-l`, `toast__phone-p`, `search-queue-add__phone-p` |
| 7 | P1 | **Device and Options sheets are truncated on landscape phones**, the primary canvas. `max-height: 80dvh` gives about 300px, so 4 of 6 devices show, Refresh is hidden, the header scrolls away, and nothing hints at more. | `device-sheet__phone-l`, `device-sheet__phone-l-small`, `options-sheet__phone-l-small` |
| 8 | P1 | **The Power-on headline shows the amber focus ring on arrival.** Programmatic focus on a fresh page matches `:focus-visible`, so the first screen after connecting looks like a bug. | `power-on__*` |
| 9 | P1 | **A long title on phone-p makes the artwork overlap the rotate hint.** `justify-content: center` overflows both ends and the hint's text is clipped under the art. | `deck-long-title__phone-p` |
| 10 | P1 | **Weak state distinction and error treatment.** Paused differs from playing only by the glyph: the bar stays amber and the art stays lit. Errors look exactly like empty states (centred grey text plus a grey button). The 429 state offers "Try again", which is guaranteed to fail during the cooldown. | `deck-paused__phone-l` vs `deck-playing__phone-l`, `deck-error-429__phone-l`, `deck-error__*` |

---

## Why it looks like a generic template

1. **A borrowed composition.**
   - Deck: art | metadata + bar + ◀ ▶▌▌ ▶ + device chip. This is the layout of every streaming app's full-screen player.
   - Onboarding: wordmark left, CTA right, both centred vertically.
   - Pages: large left title plus a list.
   - Empty and error states: centred title, grey detail, grey pill.

   Nothing is designed for this product. There's no dial, no presets row, no bezel, no instrument cluster, even though the tokens file calls amber "the instrument-cluster backlight".
2. **Everything centred and symmetric.** Empty states, error states, onboarding clusters, the tutorial "done" card, the lyrics-unavailable message and the device chip on portrait are all centred blocks with equal space above and below. There's no asymmetry, no scale contrast and no edge-anchored element.
3. **No focal hierarchy on the deck.**
   - Title, artist, album and "Open in Spotify" are stacked at 48/22/15/13px, all grey except the title.
   - The progress bar, keys and device chip each get equal vertical gaps (`clamp(8px, 2vh, 18px)`).
   - The ⋮ button floats alone in the viewport corner, 350px+ from anything at laptop size.
4. **Default-looking controls.**
   - Buttons are `#2d2833` rounded rectangles with white 600 text.
   - The segmented control and switch are iOS clones.
   - "Open in Spotify" is an underlined web link.
   - Rail tabs are icon + 13px label.

   Only the Play key and the power key have any physicality: a 3px inset bottom shadow and a spring.
5. **Dead space instead of density at large sizes.**
   - Layout maxes out early: page 720px, queue 1000px, deck 1180px, onboarding 1100px.
   - Type maxes out early: title 48px, wordmark 88px.
   - Past 1280px the UI stops growing and floats in a graphite void (`welcome__desktop`, `connect__desktop`, `deck-error__desktop`).
6. **No ambient response to music.** The screen looks the same whether playing or paused and whatever the artwork. The README roadmap lists "album-art ambient backgrounds" for Phase 4. That's the cheapest identity win available.
7. **Thin control set.** The deck has 3 keys plus a device chip. There's no shuffle, repeat, volume or like, and the Web API supports the first three (volume via `supports_volume`). The deck feels like a demo. (Scope decision; noted, not prescribed.)

---

## Findings by area

### Visual hierarchy

| Sev | Where | Problem |
|---|---|---|
| P0 | Deck, all · `deck-playing__laptop` | The title is the only high-contrast element. Artist (ink-2), album (ink-3), attribution link and device chip compete at similar grey weights, and nothing groups "what's playing" against "controls" against "where". |
| P1 | Deck, laptop/desktop · `deck-playing__laptop` | The ⋮ button is pinned to the viewport corner (`position:absolute; right: pad`), stranded from the panel it belongs to. |
| P2 | Deck · `deck-playing__phone-l` | "Open in Spotify" is an underlined 13px link sitting between metadata and the scrubber. It reads as body copy and breaks the metadata → bar rhythm. |
| P2 | Queue, landscape · `queue__laptop` | "Now playing" is the smallest block on the page (a 220px column, one truncated row). The thing that's live gets the least emphasis. |
| P2 | Search results · `search-results__phone-p` | A flat list: 8 songs, then Artists, Albums, Playlists, all the same row design. There's no top result and no filter chips. The currently playing song isn't marked in results. The "Song" kind label repeats under a "Songs" header. |
| P3 | Settings · `settings__phone-p` | Group titles (13px ink-3 inside the card) are weaker than row labels, so the page reads as one long list. |

### Typography

| Sev | Where | Problem |
|---|---|---|
| P0 | Global (`app.css`) | The scale is effectively 11 / 13 / 14 / 15 / 16 / 17 / 20 / 22 / 32 / 48. Most UI lives at 13–17px. Headline sizes clamp too early: deck title max 3rem, page title a fixed 2rem, wordmark max 5.5rem. |
| P2 | Rail, phone-p/tablet-p · `deck-playing__tablet-p` | Tab labels are 11px (0.6875rem) at weight 600, ink-3. On a tablet this is tiny and grey. |
| P2 | Deck title · `deck-long-title__desktop` | Clamped to 2 lines inside a 460px panel even at 1920px wide. There's no tooltip or marquee, so the full title is unreachable from the deck. |
| P2 | Page headers · `settings__*` vs `search-idle__*` | Two header styles: Search and Queue use a left 32px title; Settings uses a centred 20px title with a back arrow. |
| P3 | Lyrics demo, phone-p · `lyrics-demo__phone-p` | The reader's "32–44px on phones" lands near 32px in portrait. For a "huge, high-contrast" reader it's modest, and the non-current lines are 2.7:1. |

### Colour, surfaces, visual consistency

| Sev | Where | Problem |
|---|---|---|
| P0 | Tokens | `--screen`, `--raised` and `--raised-2` are nearly indistinguishable. Cards, sheets, toasts, buttons, chips, skeletons and the mini deck all use them, so nothing separates by colour, only by radius. |
| P1 | Settings switches · `settings__phone-p` | The off-state track `#2d2833` on `#221e27` is 1.14:1. The track is invisible, leaving a floating white knob, which fails non-text contrast (3:1). |
| P2 | Scrubber · `deck-playing__*` | The unfilled track (12% white) is 1.4:1 against the screen. Paused and not-yet-loaded bars are hard to see. |
| P2 | Playlist tile hover · laptop | Hovering dims the artwork to 85% opacity, which reads as "disabled", not "pressable". |
| P3 | Rail "Home" icon | Uses the `nowPlaying` glyph (a square with a dot, reads as a speaker or camera). A `home` glyph exists in `Icon.tsx` but is unused. The Settings icon is sliders, which reads as "filters/EQ". |
| P3 | Radii | 6, 8, 10, 12, 13, 14, 16, 18, 20, 22 and 28px all in use. |

### Spacing and layout

| Sev | Where | Problem |
|---|---|---|
| P1 | Queue landscape ≥760 · `queue__laptop` | Grid overflow (Top 10 #5). |
| P1 | Deck phone-p long title · `deck-long-title__phone-p` | Art overlaps the rotate hint (Top 10 #9). |
| P2 | Welcome/Connect phone-l-small · `connect__phone-l-small` | The 88px wordmark ends about 18px from the Connect button. The `1.25fr / 1fr` grid doesn't reserve a gutter. |
| P2 | Deck skeleton · `deck-loading__*` | The skeleton has art plus 2 bars but no scrubber or keys, so the layout jumps when data lands. |
| P2 | Nothing-playing shelf, phone-l · `deck-nothing-playing__phone-l` | Tile subtitles truncate to "By Alex Ri…" beside a ↗ icon. The header's "Choose device" pill sits near the ⋮, making two unrelated top-right controls. |
| P3 | Tutorial, desktop · `tutorial__desktop` | The instruction is 20px text in the top-left corner, about 1000px from the key it describes. |

### Navigation

| Sev | Where | Problem |
|---|---|---|
| P2 | phone-p | The rail hides its tools in portrait. From Search or Queue there's no way to Settings or full screen except Home → ⋮ → Settings. |
| P2 | Settings | Three entry points (rail icon, ⋮ menu, Back button) plus a Back button on a tab-level page. Unclear whether Settings is a tab or a modal. |
| P2 | phone-l-small | The mini deck is hidden (`max-width:759px`), so off the deck there's no now-playing cue or play/pause at all. |
| P2 | Lyrics (unavailable) | The reader is immersive (no rail) and auto-hides its header after 3.2s while playing, even when there are no lyrics. The user is left on a static message with no visible Back until they tap. |
| P3 | Options sheet · `options-sheet__*` | Its 3 items (Open in Spotify, Choose device, Settings) all duplicate visible controls. The sheet adds a step, not options. |
| P3 | Queue | Rows are read-only (an API limitation, documented) but still look like the Search rows, which are tappable. |

### Interaction design and micro-interactions

| Sev | Where | Problem |
|---|---|---|
| P1 | Toast · `toast__phone-l` | Covers the Play key (Top 10 #6). It's also not dismissible, a fixed 3.6s regardless of length, and has no exit animation (it vanishes). |
| P2 | Skip | Progress resets to 0:00 immediately, but title and art keep the old track until the ~1s resync. A mismatched state flashes on every skip. |
| P2 | Play from Search / shelf | You stay on Search. The only feedback is a toast "Playing X" and a mini-deck update after the resync. No transition hints where the music went. |
| P2 | Deck error with playback | A sync error while something is loaded shows as a 13px ink-3 line at the top ("… Showing the last known state."), which is easy to miss. |
| P2 | Settings → Disconnect | Instant logout with no confirmation or undo. It's destructive: tokens and all Spotify state go. |
| P2 | Sheet grip | The grip suggests drag-to-dismiss, but there's no drag handler. Only the ✕, Esc or a backdrop tap closes the sheet. |
| P2 | Rotate hint · `deck-playing__phone-p` | Dismissal is in-memory (`useUi`), so it returns on every launch. |
| P2 | Welcome → Connect · `explore/welcome-strip.png` | The showcase round key sweeps its LED, then gets replaced by a flat full-width pill. The hardware vocabulary is dropped at the most important tap. |
| P3 | Play/Pause | The glyph swaps instantly with no morph. There's no hover style on the Play key (skip keys get one). |
| P3 | Scrubber | The thumb appears only on hover or drag. There's no time preview while dragging (elapsed updates, but there's no floating time). The hit height is 36px, under the 44px rule. |

### Motion

| Sev | Where | Problem |
|---|---|---|
| P2 | Route changes | Every screen uses the same 240ms fade plus 6px rise (immersive: 28px). There's no directional or spatial model. The mini-deck art and deck art aren't connected (no shared element). |
| P2 | Skip animation | The title slides 8px vertically and the art cross-fades whatever the direction. The gesture is horizontal (swipe), so the result contradicts it. |
| P3 | Toast | Enters (220ms) but has no exit. |
| OK | Reduced motion | Handled well: movement becomes fades, loops stop, and PressKey drops scale. Keep this. |

### Responsiveness, per viewport

| Viewport | Verdict | Specific issues |
|---|---|---|
| **phone-p** 390×844 | Compact fallback works; cramped | Rotate hint nags on every launch; long-title collision (#9); 11px tab labels; toast over Play; Settings only via ⋮. |
| **phone-l** 844×390 (primary) | The best-looking viewport | Sheets truncated (#7); lyrics show about 2 lines between the header and footer overlays (`lyrics-demo__phone-l`); mini deck title cut to "Midnig…"; tutorial panels cover the whole deck (`tutorial-lyrics-panel__phone-l`). |
| **phone-l-small** 667×375 | Tight | No mini deck off-deck; wordmark crowds the CTA; the device sheet shows 3.5 rows; the tutorial coach line wraps under the panel. |
| **tablet-p** 768×1024 | Phone column scaled up | 520px deck column, 11px rail labels, about 100px of empty space below the device chip. |
| **tablet-l** 1024×768 | OK deck; list pages are narrow | Queue overflow (#5); 720px Search/Settings column. |
| **laptop** 1440×900 | Stretched-phone feel | ⋮ stranded; 720px columns; rail is a thin footer with an empty left third on Home; queue overflow. |
| **desktop** 1920×1080 | Floats in a void | Deck title capped at 48px, art at 20% of the screen; onboarding is a small cluster in the upper middle; tutorial instruction far from the controls. Lyrics is the only screen that uses the canvas. |

### Accessibility

| Sev | Where | Problem |
|---|---|---|
| P1 | Power-on | Focus ring on load (#8). |
| P1 | Switch off state | 1.14:1 track contrast. |
| P2 | Small grey text on cards | `--ink-3` on `--raised` is **4.21:1** and on `--raised-2` **3.7:1**, both below AA for text under 18px. Used by Settings `group-detail` and `group-title`, and device meta in the sheet (3.7:1 on the active row, which is raised-2). |
| P2 | Lyrics scroller | `tabIndex=0` with `.lyrics-scroll:focus-visible { outline: none }`, so keyboard focus is invisible. |
| P2 | Scrubber track | 1.4:1 (non-text). |
| P2 | Haptics row on desktop | A Settings switch shows on laptop/desktop Chromium (`WebHaptics.isSupported`) where it does nothing, against the rule "Never render a button that doesn't work". |
| OK | Focus rings | A 2px amber ring everywhere else. Tab order is logical (deck: ⋮ → attribution → scrubber → keys → device → rail). |
| OK | Targets | All ≥44px except the scrubber hit area (36px tall) and the switch inputs (52×32, but the whole row is the label, so the effective target is fine). |
| OK | Labels | Every icon button has an `aria-label`; status and alert regions exist; route focus is managed. |

### Loading states

| Sev | Where | Problem |
|---|---|---|
| P2 | Deck · `deck-loading__*` | The skeleton omits the controls (layout shift). There's no timeout, so a hung `/me/player` leaves the skeleton up forever (`fetch` has no abort timer). |
| P3 | Device sheet | "Looking for devices…" is plain centred text. There's no row skeleton, unlike Search and Queue. |
| P3 | Lyrics | Loading is only `aria-busy`, so there's a blank reader until it resolves. |

### Empty states

| Sev | Where | Problem |
|---|---|---|
| P2 | Search empty · `search-empty__*` | A dead end: no suggestions, no playlist shelf fallback, no clear-query action beyond the tiny native ✕. |
| P2 | Queue "Nothing queued" · `queue-empty__*` | Says "Add songs from Search with the + button" with no button. The sibling "Nothing playing" state *does* have a Search button, so the two are inconsistent. |
| P2 | All empty states | Same template: centred Barlow Semi Condensed 22px title, grey detail, grey pill. No illustration, icon or tone, so empty, error and unavailable all look alike (`lyrics__*`, `deck-error__*`, `search-empty__*`). |
| OK | Nothing playing on the deck | Shows your playlists instead of a dead end. This is a good pattern to keep and elevate. |

### Error states

| Sev | Where | Problem |
|---|---|---|
| P1 | 429 · `deck-error-429__phone-l` | "Try again" during an active cooldown fails instantly (`api.ts` throws RATE_LIMITED before sending). The copy "pausing requests for 5s" doesn't count down. The Retry-After header isn't CORS-exposed, so the time shown is always the backoff guess. |
| P2 | Error vs info toast | Visually identical (#6). |
| P2 | Deck 500 · `deck-error__*` | Neutral grey empty-state styling with no icon, device context, or link to choose a device. |
| OK | Connect notice · `connect-notice__*` | An amber-edged card above the CTA explains *why*. Clear and well placed. |

### Haptics (observable only; the haptics bug belongs to the haptics agent)

- The Haptics switch appears on laptop and desktop Chromium, where it does nothing (see Accessibility).
- The swipe-threshold `tick` fires from Motion's `onDrag`, which isn't a gesture event on iOS, so it's best-effort by design.
- Network confirmations (`queue-add`, `device-connected`, `playback-error`) play their haptic outside the gesture, so they're Android-only.
- Settings toggles fire `toggle` *after* the change, so turning Haptics **on** is confirmed with a haptic, and turning it off is silent.
- The harness runs with `sound:false, haptics:false`, so none of this is visible in the screenshots.

---

## What works (keep)

- The landscape deck on phone-l: a clear two-column split and a large Play key (`deck-playing__phone-l`).
- The power and continue keys: the spring press plus LED ring sweep is the one moment with character (`explore/welcome-strip.png`).
- An optimistic ✓ on queue add, and optimistic play/pause with rollback.
- The lyrics reader's scale on tablet and desktop, the "Demo, no audio" honesty, and the reduced-motion handling.
- Nothing playing → playlists; the connect notices; tutorial-on-a-practice-deck.

---

## What I found

The current UI is functionally careful: good labels, focus handling and reduced motion, honest states. Visually, though, it's a generic dark streaming-player template. The four causes are a borrowed composition, three near-identical greys, a compressed type scale, and layout and type caps that stop growth at about 1280px. On top of that there are 6 concrete P1 defects:
- queue overflow
- toast over the Play key
- truncated landscape sheets
- the Power-on focus ring
- the phone-p long-title collision
- the 429 retry and error styling

## What I changed

Nothing in `src/`. I built a reusable Playwright screenshot harness (27 scenarios × 7 viewports) and rendered the current `main` with it.

## Files touched

- `docs/redesign/ux/audit.md` (this file)
- `docs/redesign/ux/user-flows.md`
- Scratchpad, outside the repo:
  - `qa/shots.cjs`
  - `qa/README.md`
  - `qa/sheet.py`
  - `qa/before/*.png` (269 screenshots)
  - `qa/sheets/*.png`
  - `qa/explore/*` (motion, press and hover probes)

## What remains

- Re-run the harness against the redesign (`--out ./after`) and diff it against `before/`.
- Findings are for a Chromium engine only. WebKit/iOS Safari (safe areas, `100dvh`, haptics) is untested.
- The real Spotify edge cases (episodes, local files, `disallows` combinations) aren't in the fixtures.
- Real audio and haptic feel weren't assessed. The haptics agent owns that.

## Potential regressions to watch in the redesign

- Keep these while restyling:
  - the `aria-label`s the harness and screen readers rely on ("Play"/"Pause", "Next", "Previous", "More options", "Playing on … Change device", "Add … to queue", "Search Spotify")
  - route focus management
  - reduced-motion fallbacks
  - the `inert` handling in the tutorial
- Widening layouts: guard every grid column with `minmax(0, …)` (the Queue bug) and keep long-title clamping.
- Ambient artwork colour must not tint or crop the artwork itself (Spotify guideline; `object-fit: contain`, no overlays).
- The CSP forbids injected `<style>`, so avoid `AnimatePresence mode="popLayout"`.
- Moving the toast must not cover the rail or the Play key at any viewport. Test phone-l.
- Amber must stay reserved for live state if the design system keeps that rule.
