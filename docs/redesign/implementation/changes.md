# Implementation log

Branch `redesign`, from `main` @ `9a78d4f`.

## How the work was split

| Role | Who | Isolation | Artifact |
|---|---|---|---|
| design-research (×3) | Subagents, 6 references each | Read-only; scratchpad screenshots | [refs-a](../design-research/refs-a.md), [refs-b](../design-research/refs-b.md), [refs-c](../design-research/refs-c.md) |
| ux-audit + QA harness | Subagent | Worktree of `main` | [ux/audit.md](../ux/audit.md), [ux/user-flows.md](../ux/user-flows.md), the Playwright harness (27+ scenarios × 7 viewports, Spotify mocked) |
| haptics | Subagent | Worktree, branch `redesign-haptics` (merged in `8a7637a`) | [haptics/report.md](../haptics/report.md) |
| design-system, frontend, motion, interaction | Lead | Branch `redesign` | [design-direction.md](../design-research/design-direction.md), [design-system/](../design-system/) |
| qa | Subagent | Read-only, against the production build under the real CSP | [qa/](../qa/) |

Implementation stayed with one author on purpose: a coherent design language is easier to hold in one head than to reconcile across parallel branches, and the CSS is shared by every screen. Only the haptics fix, which is self-contained in `src/sensory`, was built in parallel.

## What I found

The audit's verdict: functionally careful, visually generic. It used a borrowed "art left, text right, three buttons" composition, three near-identical greys, a type scale compressed into 13–20px, and layouts that stopped growing at about 1280px. It also had six P1 defects: queue overflow, the toast over the Play key, truncated sheets on landscape phones, a focus ring on load, a portrait title collision, and a failing "Try again" during rate limits. Haptics were silent on current iPhones and too short to feel on Android.

## What changed, and why

- **Design system:** `tokens.css` rewritten (display-glass surfaces, VFD amber for live state only, status colours, key material, 4pt space, radius, depth, motion, layers), mirrored for Motion in `ui/motion.ts`. The 2,700-line `app.css` is split into nine per-area sheets. Fonts: Archivo (variable width) + Martian Mono replace Barlow.
- **Deck:** panel at exactly the art's height; title sized by length; the dial scrubber; keycaps with a play lamp; status word roll; directional track changes that match the swipe; line-mask title changes; dimmed title while a skip is in flight; up next beside the next key; ambient glow sampled from the cover (tested pure function + hook), dimmed when paused; ⋮ joins the status row; skeleton matches the final layout.
- **Rail:** faceplate labels, a lamp that travels to the active tab, "Deck" instead of "Home" (specific beats generic), a gear for Settings, tools on upright tablets, a cover + play puck on phones.
- **Screens:** screens enter from the direction of travel. Search gets two columns on desktop, a gutter lamp for the playing song and a clear action on "Nothing found". Queue gets stepped depth (hero now-playing, numbered tracklist, total duration), which also fixes the overflow. Settings becomes a spec sheet with a two-step Disconnect. Lyrics adds "focus = now" for timed lyrics and keeps its controls when there's nothing to read.
- **Onboarding:** corner-anchored Welcome with a standby wordmark that warms up letter by letter, a redesigned and scalable power key, Connect and Power-on in the same composition.
- **States:** `EmptyState` with lamps; `ErrorState` shows only the action that can work; toasts drop from the top with a tone lamp.
- **Interaction:** sheets are side sheets on landscape phones and can be dragged shut; artwork fades in once decoded; the rotate hint stays dismissed; the dial's hit area is 44px; keyboard seek cues in the gesture.
- **Haptics:** see the report. web-haptics replaced by a small adapter plus `HapticSwitch`; honest capability detection.

## Files touched

- `src/styles/*` (all), `src/ui/{Artwork,Feedback,Icon,MediaRow,PressKey,Scrubber,Sheet,motion,useArtColor}.ts(x)`
- `src/app/{App,Deck,DeviceSheet,Rail,Transport,sources}.ts(x)`
- `src/screens/{Callback,Lyrics,NowPlaying,PlaylistShelf,Queue,Search,Settings}.tsx`
- `src/onboarding/{PowerKey,PowerOn,Tutorial,Welcome,practiceDeck,tutorialSteps}.ts(x)`
- `src/lib/{ambient,gesture,progress}.ts` (+ tests), `src/store/{settings,ui}.ts`, `src/spotify/playbackService.ts` (+ test), `src/sensory/*` (haptics agent), `src/main.tsx`
- `package.json` / lockfile: + `@fontsource-variable/archivo`, `@fontsource-variable/martian-mono`; − `@fontsource/barlow`, `@fontsource/barlow-semi-condensed`, `web-haptics`
- `CLAUDE.md`, `README.md`, `PLAN.md` (a note), `docs/redesign/**`

## What remains

- On-device checks that CI can't do: haptics on a real iPhone (iOS 18+) and Android, Safari layout (safe areas, `dvh`), and the feel of the springs at 120Hz.
- Android vibration patterns are tuned by reasoning; calibrate on real phones (`VIBRATION` in `src/sensory/haptics.ts`).
- Only `PressKey` controls tick on iPhone. Rows, tabs and sheet buttons are silent there by design (links can't carry `HapticSwitch`).

## Potential regressions

- The rail tab is now labelled "Deck" (accessible name "Deck" instead of "Home"). The tutorial copy was updated to match.
- `PressKey` renders an invisible label over the key on iPhone (see the haptics report for constraints on restyling keys).
- The deck fetches the queue once per song to show "Up next" (one extra request per track; silent on failure).
- The ambient colour loads each cover a second time as a CORS request (usually from cache). If a CDN stopped sending CORS headers, the glow would silently disappear; the visible artwork is unaffected.
- Toasts moved from the bottom to the top.
