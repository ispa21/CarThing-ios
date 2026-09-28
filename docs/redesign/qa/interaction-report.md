# Interaction, accessibility, policy and performance QA

Build: `main` @ `e68eb40`. All probes run headless (Chromium) against the mocked app; CSP checks against `vite preview`, which serves the production headers.

| Check | How | Result |
|---|---|---|
| Production CSP | Every scenario on the production build; console errors recorded | **0 violations, 0 errors** (85 shots, v2) |
| Sheet drag-to-close | Drag the grip 200px on phone-p (down) and phone-l / phone-l-small (right); then tap Close | Closes on drag and on tap at all three; centred panels (laptop) deliberately don't drag |
| Open in Spotify | Tap a playlist tile and a song row | Tile → `spotify:playlist:…`, row → `spotify:track:…`; with no app installed, "Spotify didn't open" toast after 2.5s |
| Channel strip | Drag the fader, press shuffle, press repeat | Exactly one `PUT /me/player/volume` per drag; `shuffle?state=false` (was on); `repeat?state=context` |
| Keyboard | Scrubber and fader: arrows/Page/Home/End | Cue on the key press, one silent request when the keys stop (unit-tested) |
| Targets | Bounding boxes of every interactive element, phone-l + laptop | All ≥44px after fixes (segments were 40, mini deck 42). The only exception is the developer-setup link on unconfigured builds |
| Names | Chromium accessibility tree | No unnamed controls |
| Contrast | Composited text vs background | Fixed: inactive rail labels (4.2 → 6.0:1), upcoming lyric lines (2.8 → 3.3:1 at display size). Disabled controls exempt. Sung (past) lyric lines are deliberately 0.3 opacity |
| Artwork policy | Computed styles of every cover | `object-fit: contain`; no filter, opacity, mask, clip or overlay |
| Amber budget | Every element painting `#ffa630` | Only live state: playing lens, lit ticks, needle, elapsed time, the active preset, focus, the tutorial coach. The dev-setup link was amber and is now ink |
| Reduced motion | Harness with `prefers-reduced-motion` | Renders correctly; movement becomes fades, latched keys still sit down (state), no loops |
| Haptics | See [../haptics/report.md](../haptics/report.md) | Verified in Chromium emulation and system WebKit by the haptics agent; real iPhone/Android checks remain |
| Performance | Per-frame painting | Progress paints by transform only, without React renders; the fader and meter move by transform/clip-path; the ambient colour cross-fades via a registered custom property |

## Remaining

- Real-device haptics and feel (iPhone iOS 18+, an Android phone).
- A formal layout-shift measurement per skip on a real device.

**What I found · changed · touched · remains · regressions:** found and fixed as listed; files are the styles and `ui/Fader.tsx`, `ui/SpotifyLink.tsx`, `ui/Sheet.tsx`; remaining above; regressions in [regression-report.md](regression-report.md).
