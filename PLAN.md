# PartyDeck — Build Plan

> A Car Thing‑inspired, software‑first music appliance: Spotify controller, Now Playing screen, and a giant lyrics reader. PWA on Vercel.

## 1. Existing architecture

`ispa21/CarThing-ios` has one commit (`0dea7b5 Initial commit`) containing a one‑line `README.md` and a Next.js‑flavoured `.gitignore`. There's no application, no `package.json`, no Spotify code, no PWA, no UI, no assets. Nothing to migrate. We're starting fresh in place.

## 2. Existing reusable components

None. The `.gitignore` is kept and extended for Vite (`dist`, `.env*`, `.vercel` are covered).

## 3. Proposed architecture

Vite 8 + React 19 + TypeScript 6 (the current `create-vite` react‑ts template), with the template's `oxlint`.

| Concern | Choice | Why |
|---|---|---|
| State | Zustand | Required by spec; selector subscriptions keep rerenders local |
| Motion | `motion` (Framer Motion) | Spring/presence transitions; transforms + opacity only |
| Routing | ~40‑line History API router | 7 routes, no nested data loading, so a router library isn't needed |
| Icons | Hand‑drawn inline SVG set | ~14 glyphs; original look; no dependency |
| Fonts | Barlow + Barlow Semi Condensed (self‑hosted via `@fontsource`) | Grounded in road‑sign/dashboard type; self‑hosted so the offline shell works |
| PWA | `vite-plugin-pwa` (generateSW) | Manifest + precached app shell |
| Tests | Vitest (node env) | Logic is kept in pure modules so no DOM env is needed |

```
src/
  app/          App shell, router, keyboard shortcuts, dock, mini player
  spotify/      auth (PKCE), api client (401/429 handling), playbackService, normalize
  store/        Zustand stores: playback, session, settings, ui
  lyrics/       lrc parser, engine, resolver + providers, auto-follow reducer, demo clock
  rooms/        RoomService interface + in-memory mock (future TV mode)
  screens/      Home, Search, NowPlaying, Queue, Lyrics, Settings, Callback, Connect
  ui/           Icons, Artwork, ProgressBar, Sheet, primitives
  styles/       tokens.css, base.css
```

## 4. Spotify integration plan

Checked against the official docs and OpenAPI schema (downloaded 2026‑09‑25).

- **Auth:** Authorization Code with PKCE only. There is no implicit grant and no client secret. `authorize` → `/callback` → `POST https://accounts.spotify.com/api/token` (form‑encoded: `grant_type`, `code`, `redirect_uri`, `client_id`, `code_verifier`). Refresh uses `grant_type=refresh_token`. The response *may* omit a new refresh token, in which case we keep the old one.
- **Scopes (minimum):**
  - `user-read-playback-state`: `GET /me/player`, `GET /me/player/devices`
  - `user-modify-playback-state`: play/pause/next/previous/seek/queue add/transfer
  - `user-read-currently-playing`: needed by `GET /me/player/queue`
  - `playlist-read-private`: Home's "Your playlists" (`GET /me/playlists`)
  - Not requested:
    - `user-read-private`: its fields (`product`, `country`) were removed from `/me` in Feb 2026
    - `playlist-read-collaborative`: not listed by the spec for `/me/playlists`
- **Endpoints used:** `GET /me`, `GET /me/player`, `GET /me/player/devices`, `PUT /me/player` (transfer), `PUT /me/player/play|pause`, `POST /me/player/next|previous`, `PUT /me/player/seek`, `GET|POST /me/player/queue`, `GET /search` (type `track,artist,album,playlist`, **limit ≤ 10**, the Feb 2026 max), `GET /me/playlists` (reads `items.total`, the Feb 2026 rename of `tracks`).
- **API client** (`spotify/api.ts`): one `fetch` wrapper that attaches the token, refreshes on expiry and on 401 (once), honours `Retry-After` on 429 with a global cooldown (no tight retry loops), returns `null` on 204, and throws a typed `SpotifyError { status, reason, retryAfterMs }`.

## 5. Playback state architecture

```
Spotify API → playbackService (only module that talks to /me/player) → usePlayback (Zustand) → UI selectors
```

- `normalizePlayback(raw)` maps `CurrentlyPlayingContextObject` (track *or* episode) to the spec's `PlaybackState` plus `disallows` (so buttons Spotify rejects are disabled, not faked) and `uri`/`url` (for link‑back).
- **Polling:** every 5 s while playing, 15 s while paused/idle, stopped while the tab is hidden. It resyncs immediately on focus/visibility and ~600 ms after every command.
- **Progress interpolation:** the store records `syncedAt`. `interpolateProgress(state, syncedAt, now)` advances locally while `isPlaying` and clamps to duration. Only the progress bar reads it (via rAF on a ref), so the rest of the tree doesn't rerender per frame.
- **Commands are optimistic**, for example flipping `isPlaying` instantly. They roll back via the resync if Spotify rejects them.

## 6. Lyrics architecture

```
track metadata → resolver (providers[]) → LyricLine[] → engine (pure, no Spotify imports) → LyricsScreen
```

- `parseLRC()` handles `[mm:ss]`, `[mm:ss.xx]`, `[mm:ss.xxx]`, multiple stamps per line, `[offset:±ms]`, metadata tags, blank lines, and malformed stamps.
- `lyricsEngine({ lyrics, positionMs, isPlaying })` returns `{ currentIndex, previousLines, nextLines }` using a binary search.
- `autoFollow` reducer: `following ⇄ free`. User wheel/touch/keys set it to `free`. "Jump to current" sets it back to `following`.
- **Providers:** `MockLyricsProvider` (bundled, *original* demo lyrics; no copyrighted text) only. Phase 2 adds a licensed provider behind the same interface.
- **Policy gate (important):** Spotify's Developer Policy / Compliance Tips prohibit syncing Spotify sound recordings with lyrics. Therefore:
  - For **Spotify playback**, lyrics (when a provider has them) render as a **static reader**: manual scroll, no timed highlight.
  - **Timed follow** runs only against non‑Spotify clocks. Today that's the **Demo** clock, which proves the engine end‑to‑end; later it's local audio (Phase 5).
  - The gate is one function, `canTimeSync(source)`, and it has tests.

## 7. PWA architecture

`vite-plugin-pwa` with `registerType: 'autoUpdate'`, precache of the built shell and fonts, and `navigateFallback: /index.html`. Spotify API/images are *not* cached. The manifest has `display: standalone`, dark theme/background colours, 192/512/maskable icons, and an apple‑touch‑icon. `viewport-fit=cover` plus `env(safe-area-inset-*)` handle the notch and home indicator. Offline, the app shows a clear "You're offline" state. It never pretends to play.

## 8. Responsive design strategy

Mobile portrait is the source of truth.

- **Phone portrait:** stacked art → metadata → scrubber → transport.
- **Landscape / tablet / desktop (≥ 720px wide and landscape):** the Car Thing layout, with art left and metadata + controls right, inside a max‑width 1120px "appliance" frame. No sidebar. A bottom dock appears on browse screens.
- Lyrics type uses `clamp()` on `vw`/`vh` with a user scale multiplier. Keyboard shortcuts (Space, ←/→, N/P, L, Q, /) are active on desktop.

**Design tokens**, from the frontend‑design pass:

- **Palette:**
  - Graphite `#17141B`, the device plastic; the Black theme swaps it for `#000` for OLED/TV
  - Raised `#221E27`
  - Ink `#F3EFE8`
  - Ink‑2 `#A8A1AD`
  - Ink‑3 `#6B6571`
  - Signal amber `#FFA630`, borrowed from instrument‑cluster backlighting and used *only* for live state (progress fill, playing indicator, focus)
- **Type:** Barlow Semi Condensed (titles, lyrics) and Barlow (UI). Tabular numerals for time. Negative tracking at display sizes.
- **Motion:** critically damped springs by default, and nothing over ~300 ms. Now Playing enters and exits along the same vertical path. The artwork crossfades on track change. With `prefers-reduced-motion`, transitions become opacity fades.
- **Spend boldness once:** the lyrics typography and a single light "key" play button. Everything else stays quiet.

## 9. Deployment strategy

GitHub → Vercel (framework preset: Vite, output `dist`). `vercel.json` does two things:
- SPA rewrite so `/callback`, `/lyrics` etc. resolve to `index.html`
- Security headers: CSP limited to Spotify API/accounts/image CDNs, `frame-ancestors 'none'`, `Referrer-Policy`

Env: `VITE_SPOTIFY_CLIENT_ID` and `VITE_SPOTIFY_REDIRECT_URI` (public values; no secrets). No serverless functions.

## 10. Testing strategy

Vitest unit tests on pure modules:
- PKCE (verifier charset/length, S256 challenge against the RFC 7636 test vector)
- OAuth state validation
- `parseLRC`
- The engine (index/window/lead)
- `normalizePlayback` (track, episode, null/204)
- `interpolateProgress`
- The auto‑follow reducer
- `debounce`
- Queue transformation
- The 429 cooldown and error mapping
- `canTimeSync`

Manual checks happen in the browser (dev + production preview).

## 11. Security considerations

- No client secret anywhere.
- PKCE verifier and state live in `sessionStorage` and are deleted after exchange. State is compared in constant shape before any token request.
- Tokens live in `localStorage` (standard for a pure SPA). The risk is XSS, mitigated by a strict CSP, no `dangerouslySetInnerHTML`, and lyrics rendered as text nodes.
- Tokens are never logged.
- Only `https:` Spotify URLs are rendered as links.
- Logout clears tokens and all Spotify‑derived local data (a policy requirement).
- `npm audit` runs before shipping.

## 12. Spotify policy constraints

- No syncing Spotify audio with lyrics or visual media (see §6).
- Attribute Spotify content and link back: an "Open in Spotify" link on Now Playing, and row links in search.
- Don't crop or alter artwork (`object-fit: contain` on square art; no filters over the artwork itself).
- Don't play without showing art and metadata.
- No commercial use of a Streaming SDA.
- Provide a disconnect button (Settings → Disconnect).
- **Development Mode:** owner needs Premium, max 5 allow‑listed users, 1 Client ID per developer. Non‑allow‑listed users get 403, which is surfaced as a clear message.

## 13. Implementation phases

Each phase ends with its check. The riskiest part (auth + real API) comes first.

| # | Goal | Verify | Out of scope |
|---|---|---|---|
| 1 | Scaffold, tokens, CLAUDE.md, `.env.example`, Vercel config | `npm run dev` serves on `127.0.0.1:5173`; lint/typecheck pass | Features |
| 2 | PKCE auth + API client | PKCE/state/429 tests pass; Connect → Spotify authorize URL correct; callback error states render | Real login (needs your Client ID) |
| 3 | Playback engine + Now Playing | normalize/interpolate tests; UI renders every state (disconnected, no playback, no device, playing) | Shuffle/repeat/volume |
| 4 | Search + Queue + Devices | debounce/queue tests; search states render | Skip‑to‑queue‑item (no API for it) |
| 5 | Lyrics parser, engine, reader, demo | parser/engine/follow tests; demo scrolls, manual scroll pauses follow, Jump returns | Real lyrics provider |
| 6 | PWA + Settings + RoomService mock | `npm run build` emits SW + manifest; preview installable | Realtime rooms |
| 7 | Polish, security sweep, review, verification | lint/typecheck/test/build green; screenshots at phone/tablet/desktop | — |

**Not doing in the MVP:** backend, Supabase, WebSockets, rooms/QR, presets, local audio, DJ features, a real lyrics provider, and ambient album‑art backgrounds.

**Assumption most likely to be wrong:** that timed lyrics against Spotify playback should be off. That follows from Spotify's current policy text. If Spotify grants a specific licence (or a licensed provider's terms explicitly cover it), flip `canTimeSync`. The engine is already built for it.
