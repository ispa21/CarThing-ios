# PartyDeck

Car Thing–inspired Spotify controller PWA: Now Playing deck, search, queue, giant lyrics reader. Vite 8 + React 19 + TypeScript + Zustand + Motion + vite-plugin-pwa. Deployed on Vercel. No backend. See PLAN.md for the plan, README.md for setup.

## Commands

- `npm run dev`: http://127.0.0.1:5173. Use this, never `localhost`, because Spotify rejects localhost redirect URIs.
- `npm run test` (Vitest), `npm run typecheck`, `npm run lint` (oxlint), `npm run build`, `npm run preview` (serves with the Vercel CSP).
- All four (`lint`, `typecheck`, `test`, `build`) must pass before a change is done. For UI changes, also check the result in a browser at phone width (390px) and desktop width.

## Architecture rules

- **Only `src/spotify/*` talks to Spotify.** UI calls `playbackService` functions and reads Zustand stores with selectors. There is no `fetch` in screens.
- Normalize raw Spotify JSON in `spotify/normalize.ts`. UI never sees raw shapes.
- Progress is interpolated (`lib/progress.ts`) and painted via `ui/clock.ts` hooks. Don't add per-frame React state.
- `src/lyrics/*` must never import from `src/spotify/*`.
- **Timed lyrics are off for Spotify playback** (`lyrics/policy.ts`, required by Spotify policy). Don't change `canTimeSync` without written permission from Spotify.
- Verify every Spotify endpoint, field and scope against the OpenAPI schema (https://developer.spotify.com/reference/web-api/open-api-schema.yaml) before using it. Feb 2026 changes matter:
  - search `limit` ≤ 10
  - `/me` has no `product`
  - playlist `tracks` became `items`
- Never render a button that doesn't work. Show a real state instead ("Nothing playing", "Lyrics unavailable"…).
- **Landscape-first.** Design for phone landscape, then tablet, then desktop. Phone portrait is a compact fallback (`lib/orientation.ts`). The deck is `/`.

## Sensory rules

- UI speaks semantic events: `feedback.play('queue-add')` (`src/sensory`). Never import `cuelume` or call `navigator.vibrate` anywhere else.
- iPhone haptics exist only for controls carrying `<HapticSwitch>` (every `PressKey` does), and only when `feedback.play` runs synchronously in that control's `onClick`. iOS 26.5+ ignores scripted haptics. Never put `HapticSwitch` in links, submit buttons or drag surfaces. See `docs/redesign/haptics/report.md`.
- Add new meanings to `sensory/interactionMap.ts` by reusing an existing cue. Don't invent a new sound per event.
- Only user commands and UI handlers call `feedback.play`, synchronously in the gesture (iOS haptics need it). Never from polling, store or media-query subscriptions, or timers.
- Confirmations that follow a network round trip (`queue-add`, `device-connected`, `playback-error`) are outside the gesture. Their sound plays, but their haptic is best-effort (Android only). The press itself always gets an in-gesture cue.
- Command layers own their feedback: `playbackService` (Spotify), `onboarding/practiceDeck` (tutorial), and `SOURCES.demo` (lyrics demo).
- Feedback is supplementary: every state must also be visible and announced. Primary keys use `ui/PressKey` (spring press, no scale under reduced motion).
- No injected `<style>` (CSP is `style-src 'self'`). Avoid Motion's `AnimatePresence mode="popLayout"`, which injects one; stack items in a grid cell instead.

## Conventions

- Pure logic lives in plain `.ts` modules with colocated `*.test.ts`. The Vitest environment is node, with no DOM.
- Styling: plain CSS in `src/styles/`, one file per area (`base`, `controls`, `layout`, `lists`, `deck`, `sheet`, `lyrics`, `onboarding`, `settings`), tokens in `tokens.css`, motion tokens mirrored for Motion in `ui/motion.ts`. Design system: `docs/redesign/` (direction, tokens, components, motion).
  - Indicator lights have one meaning each: amber `--signal` = live (progress, playing, the active preset, focus), cyan `--mode` = an engaged mode, green `--success` = linked, red `--error` = fault.
  - Materials: metal (`--metal` + `--bevel`) for anything you touch or that holds controls, recessed glass (`--bay` + `--recess`) for anything you read. Keys sit on hard drops (`--drop`) and press by travelling onto them. Every knob, fader, latch or lamp must control or report something real — no decorative hardware.
  - Type: four voices, self-hosted from `src/assets/fonts` (CSP; licences in `OFL.txt`, declared in `styles/fonts.css`): Geist Pixel (`--font-display`) for titles and big numbers, Stack Sans Text (`--font-ui`) for labels, keys and body, Departure Mono (`--font-mono`, `.readout`) for anything measurable, Junicode italic (`--font-serif`, `.serif`) for people. Geist Pixel is wide (~0.62em a letter): size titles by their longest word (`Deck.tsx` `titleScale`).
  - Artwork is never cropped, filtered or overlaid. The ambient glow is a colour sampled into a separate layer behind it (`ui/useArtColor.ts`).
  - Move things with `transform` and `opacity` only. Brief colour or shadow transitions on small controls are fine. No looping animation of anything else (the coach halo loops opacity on a pseudo-element). The power ring's one-off `stroke-dashoffset` sweep is the single sanctioned exception.
  - Gate hover styles behind `(hover: hover) and (pointer: fine)`.
  - Respect `prefers-reduced-motion`.
- Touch targets ≥ 44px. Every icon-only button has an `aria-label`.
- Render lyrics and Spotify text only as text nodes. No `dangerouslySetInnerHTML`.
- Links to Spotify use `ui/SpotifyLink`: the validated `spotify:` URI (`safeSpotifyUri`) opens the Spotify app; without one it falls back to the `safeSpotifyUrl` https page. Never hand-roll a Spotify `<a>`.

## Instrument language (2026 redesign)

- See `docs/redesign/instrument/language.md`. Plate `--plate`, ink `--ink`, print grey `--ink-3`; `--record` / `--record-deep` are sampled from the cover at runtime (`ui/useRecordColours.ts`) and are the only accent.
- Four voices: Geist Pixel `.display` for titles, Stack Sans Text `.label` for legends, Departure Mono `.readout` lowercase for machine state, Junicode italic `.serif` for people and sentences.
- Focus and the current route are brackets: `( deck )`.
- VISUAL's slow disc spin is a sanctioned looping exception (transform only, stops under reduced motion).
- Local data: `src/history/*` (IndexedDB: plays, crate, library, capsules). Stories logic is pure in `src/stories/*` and must not import `src/spotify/*`. Only `spotify/playbackService` fetches; `history/service` keeps.
- Stories is the intelligence layer: `stories/model.ts` (rooms, core, risk buckets) → `session.ts` (risk dial, arc) → story makers (`discover.ts`, `signals.ts`, `archive.ts`) → `feed.ts` (drop, rooms). It runs in a Web Worker (`brain.worker.ts` via `ui/brainClient.ts`); never compute the feed on the main thread. Every story must end in an action and needs enough evidence to be told — otherwise return null.
- No genre, BPM, key or audio features: Spotify withdrew them for new apps. Stations are behavioural clusters; never claim otherwise in copy.

## Env and secrets

- `VITE_SPOTIFY_CLIENT_ID` and `VITE_SPOTIFY_REDIRECT_URI` are public, in `.env.local` (gitignored). `.env.example` documents the shape.
- **Never commit `.env*` files, tokens, or any client secret.** PKCE needs no secret. Never log tokens.

## Skill workflow (from ~/claude-skills-backup-20260918)

- Plan: build-planner.
- Design: apple-design, emil-design-eng, animate, frontend-design.
- Before deploy: security-sweep.
- After features: code-review (two axes: standards and spec).
- Always finish with verification before claiming anything works.
