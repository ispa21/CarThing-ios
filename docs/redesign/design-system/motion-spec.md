# Motion

The rule: motion carries state (which way you went, what changed, that the key heard you), on one rhythm, and never delays input. Tokens: [tokens.md](tokens.md#motion).

## Principles

1. **Respond on press, mechanically.** Keycaps travel 3px down onto their hard drop, which collapses (CSS `translate` + `box-shadow`, 90ms) — they don't shrink (`PressKey depth={1}`). Small icon buttons and rows still compress slightly (CSS `scale` 0.92–0.985).
2. **Interruptible.** Springs for anything touched; CSS transitions (not keyframes) for anything that can re-trigger quickly. Nothing locks input while it animates.
3. **Transform and opacity only.** The only other animated properties are small colour/shadow transitions on controls, the power ring's one-off `stroke-dashoffset` sweep, and the registered `--ambient` colour.
4. **Exits are faster than entrances.** Sheets arrive in 360ms and leave in 240ms; titles leave in 180ms and arrive in 500ms.
5. **Frequent things barely move.** Tab changes: 240ms, 20px. Keyboard actions: no animation beyond the state change itself.
6. **No loops**, except the tutorial's coach halo (opacity on a pseudo-element), the connecting lamp pulse, skeleton pulses, and the refresh spinner while loading.

## Catalogue

| What | How | Timing |
|---|---|---|
| Screen enter (rail routes) | From the side you travelled along the rail (`data-dir` forward/back), otherwise rise 10px | 240ms `--ease-expo`, entrance only |
| Immersive enter (lyrics, tutorial) | Fade + scale from 0.985 | 360ms `--ease-expo` |
| Preset / latch keys | Travel 3px onto the hard drop on press; a latched key stays 2px down with its lens lit (no travelling indicator — hardware lenses don't move) | 90ms |
| Track change: cover | Arrives from +56px on next, −56px on previous (the swipe direction), scale 0.985 → 1; the old cover leaves the other way | Enter 460ms expo, exit 200ms |
| Track change: title and artist | Line masks: the old line leaves upward, the new rises in; artist 45ms after the title | Enter 500ms expo, exit 180ms |
| Skip in flight | Title dims to 40% until the new track arrives (3s fallback) | 180ms |
| Status word | Rolls "Now playing" ⇄ "Paused" in a clipped line box | 320ms in, 160ms out |
| Ambient glow | Registered `--ambient` colour cross-fades; dims to 40% when paused | 900ms linear; opacity 560ms |
| Dial | Painted per frame while playing (no React renders); needle grows on hover/drag/focus | Scale 180ms |
| Artwork load | Fades in once decoded | 360ms |
| Rows and tiles | Capped cascade on insert: 8px rise + fade, 28ms steps, max 7 | 360ms expo |
| Empty/error states | Same rise as rows | 360ms expo |
| Queue add | `+` → ✓ pops in green | 360ms expo |
| Sheets | Bottom: from below. Side (landscape phone): from the right. Centred: 16px rise + 0.98 scale. Leave the way they came. | 360ms drawer in / 240ms out |
| Toast | Drops 12px from the top + fade | 240ms expo |
| Segmented / switch | Thumb travels | 240ms `--ease-out` |
| Welcome arrival (first run) | Status and link fade up, wordmark letters rise in turn, key last | 560ms expo, 32ms letter steps, key at +360ms |
| Power on / Continue | Ring sweeps; wordmark letters warm up left to right (colour); lamp lights | 560ms ring; 36ms letter steps |
| Rotate hint glyph | Turns sideways three times, then stops | 3.2s ×3 |

## Reduced motion

`MotionConfig reducedMotion="user"` drops Motion's transform animations (opacity remains, so titles and covers cross-fade). CSS: screens, rows, empty states and toasts fade instead of moving; press scales are removed; the rail lamp and segmented thumb snap; sheets fade; the power ring appears without a sweep; lyrics' past lines dim without shrinking; loops stop (coach halo, rotate glyph, lamp pulse, skeletons, spinner).

## Why not GSAP / ScrollTrigger / three.js

Every animation above is either a spring on something touched (Motion), a short CSS transition, or a per-frame DOM write driven by the playback clock. There are no scroll-linked timelines and no 3D, so GSAP and three.js would add weight without a job.
