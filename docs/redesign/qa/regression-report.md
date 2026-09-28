# Regression report

Against the pre-redesign audit ([../ux/audit.md](../ux/audit.md), `main` @ `9a78d4f`).

## Audit findings

| # | Finding | Status |
|---|---|---|
| 1 | No focal point or identity | **Fixed**: the Flight Deck console, the dial, the fader |
| 2 | Grey-on-grey | **Fixed**: metal vs glass hierarchy, one meaning per light, sampled ambient colour |
| 3 | Flat type scale | **Fixed**: condensed marquee up to 7.5rem, stencil labels, mono telemetry |
| 4 | Desktop and tablet as stretched phone | **Fixed**: two-column search, stepped queue, spec-sheet settings, desktop display with three up-next tracks |
| 5 | Queue horizontal overflow | **Fixed** |
| 6 | Toast over the Play key | **Fixed** (top) |
| 7 | Sheets truncated on landscape phones | **Fixed** (side drawer) |
| 8 | Focus ring on Power-on load | **Fixed** (`[tabindex='-1']:focus` has no ring) |
| 9 | Portrait long title vs rotate hint | **Fixed** (auto margins; brackets clear the hint) |
| 10 | Weak states; 429 "Try again" always fails | **Fixed**: status words, lamps, dimming; `ErrorState` offers only a working action |
| — | Switch off-state contrast | **Fixed**: lever in a recessed slot |
| — | Haptics row on desktop | **Fixed** (honest detection) |
| — | Lyrics hides Back when unavailable | **Fixed** |
| — | Disconnect with no confirmation | **Fixed** (two-step) |
| — | Rotate hint returns every launch | **Fixed** (persisted) |
| — | Grip suggests drag, no drag | **Fixed** (drag to close) |
| — | Queue-empty has no Search button; search-empty dead end | **Fixed** |
| — | Search: currently playing not marked; redundant kind labels | **Fixed** |
| — | Skip shows mismatched state | **Improved**: the old title dims until the new track arrives |
| — | "Play from Search, you stay on Search" | **Changed by request**: tapping an item now opens it in the Spotify app; ▶ plays it here |

## Behaviour changes to know about

- Tapping a row or playlist tile opens the item in the Spotify app (owner's request). Playing it on the current device is the ▶ key.
- "Home" is now "Deck"; the Settings glyph is a gear.
- Toasts appear at the top.
- The rail's active tab is a latched key with a lit lens (no travelling indicator).
- New controls: shuffle, repeat, volume (existing permission scope; no re-consent).
- iPhone: only primary keys (`PressKey`) produce haptics; see the haptics report.

## Nothing got worse

Every scenario and viewport was re-shot after each round; no new overflow, clipping or collision remains in the final pass, and all 194 unit tests, lint, typecheck and build pass.
