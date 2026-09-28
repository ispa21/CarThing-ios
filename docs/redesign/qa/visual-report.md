# Visual QA

Build: `main` @ `e68eb40` (v2 "Flight Deck"). Method: the Playwright harness (Spotify fully mocked, 30 scenarios) on phone-p 390×844, phone-l 844×390, phone-l-small 667×375, tablet-l 1024×768, tablet-p 768×1024, laptop 1440×900 and desktop 1920×1080, reviewed as contact sheets; plus the dev and production (CSP) builds. The dedicated QA agent was stopped twice by rate limits before writing its reports; its probe scripts were reused for the checks in [interaction-report.md](interaction-report.md).

## Found and fixed during the loop

| Sev | Where | Problem | Fix |
|---|---|---|---|
| P1 | Deck, laptop/desktop (v1) | Panel and artwork misaligned: portrait auto margins leaked into landscape (a specificity bug) | Margins reset with matching specificity |
| P1 | Deck, tablet-l (v2) | Console content taller than its fixed height: keys spilled below the metal | Console is `min-height` = art height; title capped by the console's width (`17cqi`) |
| P1 | Deck, portrait (v2) | Channel strip below the fold, order wrong | Panel/keys dissolve (`display: contents`) in portrait; order: display → keys → channel → output |
| P1 | Device/Options sheets, landscape phones (v1 audit) | Truncated centred modal | Full-height side drawer from the right, sticky header, drag to close |
| P1 | Toasts (v1 audit) | Covered the Play key | Drop from the top on every layout |
| P1 | Queue ≥760 landscape (v1 audit) | Horizontal overflow | `minmax(0, …)` columns, stepped-depth layout |
| P2 | Welcome, phone-l | Wordmark ran into the power key | Sized by its column (`15cqi`) |
| P2 | Welcome | Light patches where overlapping letters doubled up | Opaque colour mixes instead of opacity |
| P2 | Search | The "playing" lamp shifted its row's artwork | Lamp moved into the gutter |
| P2 | Rail, phone-l | Mini deck cut its title to one letter | Cover + play "puck" below 1000px |
| P2 | Deck, portrait | Fader ~90px long | Captions dropped, latches slimmed: ~165px |
| P2 | Deck, laptop | Dead band in the display | Up next shows the next three tracks where there's height |
| P3 | Loading | Skeleton didn't match the layout | Console-shaped skeleton (bay + three keys) |

## Verdict per viewport (v2)

- **phone-l (primary):** screen + console + channel strip fit in ~300px of height; everything reachable without scrolling.
- **phone-l-small:** fits; rail keys tighten; mini deck is a puck.
- **phone-p:** single column; the output plate sits just under the fold while the rotate hint is showing (it's dismissible and stays dismissed).
- **tablet-l:** console slightly taller than the cover (edges no longer align) because the output plate takes its own row; acceptable.
- **tablet-p:** stacked at tablet scale, rail tools present.
- **laptop / desktop:** marquee title, next three tracks, full channel strip.

## Remaining

- Real-device checks: iOS Safari safe areas and `dvh`, spring and key feel at 120Hz, Android Chrome.
- WebKit rendering wasn't screenshot-tested (Chromium only).

**What I found · changed · touched · remains · regressions:** see the tables above; fixes are in `src/styles/*` and the listed components; remaining items above; regressions are covered in [regression-report.md](regression-report.md).
