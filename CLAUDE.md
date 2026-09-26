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

- UI speaks semantic events: `feedback.play('queue-add')` (`src/sensory`). Never import `web-haptics` or `cuelume` anywhere else.
- Add new meanings to `sensory/interactionMap.ts` by reusing an existing cue. Don't invent a new sound per event.
- Only user commands and UI handlers call `feedback.play`, synchronously in the gesture (iOS haptics need it). Never from polling, store subscriptions or timers.
- Feedback is supplementary: every state must also be visible and announced. Primary keys use `ui/PressKey` (spring press, no scale under reduced motion).
- No injected `<style>` (CSP is `style-src 'self'`). Avoid Motion's `AnimatePresence mode="popLayout"`, which injects one; stack items in a grid cell instead.

## Conventions

- Pure logic lives in plain `.ts` modules with colocated `*.test.ts`. The Vitest environment is node, with no DOM.
- Styling: plain CSS in `src/styles/`, with tokens in `tokens.css`.
  - Signal amber (`--signal`) is only for live state: progress, active, focus.
  - Animate only `transform` and `opacity`.
  - Gate hover styles behind `(hover: hover) and (pointer: fine)`.
  - Respect `prefers-reduced-motion`.
- Touch targets ≥ 44px. Every icon-only button has an `aria-label`.
- Render lyrics and Spotify text only as text nodes. No `dangerouslySetInnerHTML`.
- Links to Spotify go through `safeSpotifyUrl`.

## Env and secrets

- `VITE_SPOTIFY_CLIENT_ID` and `VITE_SPOTIFY_REDIRECT_URI` are public, in `.env.local` (gitignored). `.env.example` documents the shape.
- **Never commit `.env*` files, tokens, or any client secret.** PKCE needs no secret. Never log tokens.

## Skill workflow (from ~/claude-skills-backup-20260918)

- Plan: build-planner.
- Design: apple-design, emil-design-eng, animate, frontend-design.
- Before deploy: security-sweep.
- After features: code-review (two axes: standards and spec).
- Always finish with verification before claiming anything works.
