# PartyDeck

A dedicated music appliance for your phone, tablet or TV: a Now Playing deck, queue and big lyrics reader that controls Spotify. It's inspired by the spirit of Car Thing and rebuilt as a software-first PWA.

PartyDeck is an independent project. It isn't made by or affiliated with Spotify.

## Features

PartyDeck is **landscape-first**. The phone held sideways is the primary canvas, then tablets, then desktop. Phones held upright get a compact fallback.

- **The deck** (home, `/`): artwork on the left, the instrument panel on the right, a control rail along the bottom. The panel holds title, artist, a drag-or-tap progress bar, three physical keys, and the device. **Swipe the artwork** sideways to skip. With nothing playing, the deck shows your playlists. Upright phones get a compact deck and a dismissible "Turn your phone sideways" hint.
- **Rail**: a mini deck (on other screens), then Home · Search · Queue · Lyrics, then full screen and Settings. Upright phones show the mini deck above the tabs.
- **Search**: songs, artists, albums and playlists, debounced as you type. When the field is empty it shows **your playlists** as a shelf, which scrolls sideways on landscape phones. Tap a row to play it, **+** adds a song to the queue, **↗** opens it in Spotify.
- **Queue**: what's playing now and what's up next, straight from Spotify's queue. Adding from Search confirms on the row. Spotify's Web API has no way to remove or reorder queue items, so PartyDeck doesn't pretend to.
- **Lyrics reader**: huge, high-contrast type sized for phones through TVs. Controls fade out while you read, and manual scrolling is never overridden. A demo at `/lyrics/demo` shows timed follow and "Jump to current". See [Lyrics](#lyrics-architecture) for why Spotify tracks get a static reader.
- **Devices**: pick which Spotify Connect device plays. If nothing is active, PartyDeck asks you to choose instead of failing silently.
- **Physical feel**: every control answers with a proportional mix of haptic, sound, motion and state change (see [Sensory system](#sensory-system)). Keys compress and spring back.
- **Power-on onboarding**, described in [Onboarding](#onboarding):
  1. Welcome
  2. Continue with Spotify
  3. Spotify connected, then Power on
  4. Turn sideways (upright phones only)
  5. A 20-second interactive tutorial on a silent practice deck
- **Full screen**: offered where the browser allows it. On iPhone, PartyDeck suggests Add to Home Screen instead. It's never required.
- **Settings**: disconnect, Sound, Haptics (touch devices), lyrics text size, follow current line, Graphite/Black theme, full screen, install, replay tutorial, and version.
- **PWA**: installable, standalone, safe-area aware, with an offline app shell. Playback itself needs a connection, and the app says so.
- **Keyboard** (desktop):

  | Key | Action |
  |---|---|
  | Space / K | Play/pause |
  | ← / → | Seek 10s |
  | N / P | Next / previous |
  | / | Search |
  | Q | Queue |
  | L | Lyrics |
  | Esc | Leave Lyrics |

## Architecture

```
Spotify Web API
      │  (only src/spotify/* talks to Spotify)
      ▼
spotify/api.ts ─ fetch wrapper: token refresh, 401 retry, 429 cooldown, typed errors
      ▼
spotify/playbackService.ts ─ polling, commands, queue, devices, catalog
      ▼
store/* (Zustand) ─ playback · session · settings · ui
      ▼
screens/* + ui/* ─ subscribe with selectors; progress painted per frame via refs
```

- **Stack**: Vite 8, React 19, TypeScript, Zustand, Motion, vite-plugin-pwa, Vitest, oxlint. No backend.
- **Playback sync**: `/me/player` is polled every 5s while playing and every 15s otherwise, and never while the tab is hidden. It resyncs about 1s after every command and right when a song should end. Between polls the progress bar is interpolated locally (`lib/progress.ts`) and painted with `requestAnimationFrame` straight to the DOM, so React doesn't re-render per frame.
- **Commands are optimistic**: play/pause flips instantly, and the change is rolled back if Spotify rejects it. Buttons Spotify reports as disallowed (`actions.disallows`) are disabled, not faked.
- **Routing** is a ~40-line History API router (`app/router.ts`): `/` is the deck, plus `/search`, `/queue`, `/lyrics`, `/lyrics/demo`, `/settings`, `/tutorial` and `/callback`. `vercel.json` rewrites every path to `index.html`.
- **Future second screen**: `rooms/RoomService.ts` defines the interface for `/controller` → `/screen/:roomId`, with an in-memory mock. It isn't wired into the UI yet.

```
src/
  app/         shell, router, rail + mini deck, deck, transport keys, device sheet, shortcuts, sources
  sensory/     feedback.play(event) over WebHaptics + Cuelume; the interaction vocabulary
  onboarding/  welcome, power key, power-on, orientation, tutorial + practice deck, flow machine
  spotify/     pkce, auth, api, normalize, playbackService, errors, types
  store/       zustand stores
  lyrics/      lrc parser, engine, follow reducer, resolver + providers, demo clock, policy
  screens/     Callback, NowPlaying (deck), Search, PlaylistShelf, Queue, Lyrics, Settings
  ui/          icons, artwork, scrubber, press key, sheet, rows, feedback, clock hooks
  lib/         progress, debounce, latest-request runner, gesture, orientation, fullscreen
  rooms/       RoomService interface (future)
  styles/      tokens.css, app.css
```

## Sensory system

```
UI handler / user command ──► feedback.play('next-track')
                                  │  Sound + Haptics settings · 60ms dedupe · capability checks
                                  ├─► sensory/haptics.ts ─► WebHaptics (touch devices only)
                                  └─► sensory/sounds.ts  ─► Cuelume (synthesized, no audio files)
```

- **Semantic events, not effects.** Components call `feedback.play('queue-add')` and never touch WebHaptics or Cuelume. `sensory/interactionMap.ts` maps about 35 events onto 7 haptic presets and 9 cues. Consistency beats variety, and response is proportional: navigation gets a selection tick, the primary key a medium tap and a "pulse", confirmations a success pattern.
- **User actions only.** Feedback fires from the command functions in `playbackService` and from UI handlers. It never fires from polling; a test runs a minute of polls and asserts silence. Calls run synchronously inside the gesture, because iOS only gives haptics that way.
- **Always optional.** No haptics (desktop), no Web Audio, muted in Settings, or reduced motion: everything still works, and every state is also shown on screen.
- **Plays nicely with music.**
  - Cue volume is modest.
  - iOS audio is set to the `ambient` session, so a tick never pauses Spotify on the same phone, and the silent switch is respected.
  - There's one lazily created `AudioContext`, and no sound before the first user gesture.
- **Future-ready.** Room events (`room-joined`, `reaction`, `listener-arrival`…) are already in the vocabulary. The layer doesn't depend on Spotify.

Libraries: [WebHaptics](https://haptics.lochie.me/) `0.0.6` and [Cuelume](https://cuelume.dev/) `0.2.2`, both pinned exactly because they're 0.x.

## Onboarding

`onboarding/flow.ts` is a pure, tested state machine:

```
not connected:      welcome ─Continue─► connect ─Continue with Spotify─► Spotify sign-in
back from Spotify:  connected ─Power on─► [turn sideways] ─► [tutorial] ─► the deck
```

- **Welcome** is PartyDeck in standby. The one bold control is a large key: it compresses and clicks, lights its LED ring, and wakes the wordmark.
- **Connect** has one button. Developer setup (Client ID, redirect URI) appears only in a collapsed **Developer setup** panel, and only on builds that aren't configured.
- **Power on**: the page is fresh after the Spotify redirect, and browsers block sound and iOS haptics until the user interacts. So the boot starts with the user's press instead of pretending.
- **Turn sideways** only appears for upright phones. It continues by itself when you rotate, and "Continue in portrait" is always there.
- **Tutorial** (`/tutorial`, replayable from Settings) has seven steps you perform:
  1. Play
  2. Pause
  3. Skip, by pressing or swiping
  4. Queue
  5. Home, which teaches the rail
  6. Lyrics
  7. Full screen

  It runs on a **silent practice deck** of three original demo tracks, so learning "next" can't skip your real music, and it works with no active device. The rail is the real layout. Skip is always available.

## Local development

Requires Node 22+ (tested on Node 24).

```bash
npm install
cp .env.example .env.local   # then fill in VITE_SPOTIFY_CLIENT_ID
npm run dev                  # → http://127.0.0.1:5173
```

Open **http://127.0.0.1:5173**, not `localhost`. Spotify rejects `localhost` redirect URIs, and PKCE state is stored per origin. PartyDeck redirects `localhost` to `127.0.0.1` automatically.

Without a Client ID the Connect screen shows a collapsed **Developer setup** panel, and the lyrics demo at `/lyrics/demo` still works.

## Spotify Developer setup

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and choose **Create app**.
2. Under **Which API/SDKs are you planning to use?**, tick **Web API**.
3. Add both **Redirect URIs** exactly (see below) and save.
4. Copy the **Client ID** into `.env.local`. PartyDeck uses Authorization Code with PKCE, so **there is no client secret**. Don't put one anywhere.
5. The app starts in **Development Mode**:
   - The app owner needs an active **Spotify Premium** subscription.
   - It supports up to **5 users**, each added under **User Management** by name and Spotify email. Anyone else gets a clear "isn't on the app's user list" message.
   - Controlling playback requires Premium for every user.

Docs: [Web API](https://developer.spotify.com/documentation/web-api) · [PKCE flow](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow) · [Redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri) · [Feb 2026 changes](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) · [OpenAPI schema](https://developer.spotify.com/reference/web-api/open-api-schema.yaml)

### Scopes

Each scope was checked against the OpenAPI schema.

| Scope | Why |
|---|---|
| `user-read-playback-state` | `GET /me/player`, `GET /me/player/devices` |
| `user-modify-playback-state` | play, pause, next, previous, seek, add to queue, transfer device |
| `user-read-currently-playing` | required by `GET /me/player/queue` |
| `playlist-read-private` | Home → Your playlists (`GET /me/playlists`) |

Not requested:
- `user-read-private`: the fields it unlocked (`product`, `country`) were removed from `/me` in the Feb 2026 changes; the schema marks them deprecated. `/me` is only used for "Connected as". Without this scope it returns the public profile.
- `playlist-read-collaborative`: not listed for `/me/playlists` in the schema.

## Environment variables

| Variable | Example | Notes |
|---|---|---|
| `VITE_SPOTIFY_CLIENT_ID` | `a1b2c3…` | Public. Ships in the browser bundle. |
| `VITE_SPOTIFY_REDIRECT_URI` | `http://127.0.0.1:5173/callback` | Must exactly match a registered Redirect URI. Defaults to `<origin>/callback`. |

`VITE_*` values are public. If a server-side secret is ever needed, it must use a non-`VITE_` name, be read only by a server function, and never be imported by `src/`.

## Redirect URIs

Register both in the Spotify app. Matching is exact: scheme, host, port and path.

```
http://127.0.0.1:5173/callback          # local dev (loopback IP; http allowed only for loopback)
https://<your-production-domain>/callback
```

Vercel preview URLs change per deploy, so connect from the production domain. Since state is per origin, the Connect screen tells you if you're on the wrong one.

## Running tests

```bash
npm run test        # Vitest unit tests
npm run typecheck   # tsc -b
npm run lint        # oxlint
```

The tests cover:
- PKCE: RFC 7636 test vector, charset and length
- OAuth state validation
- `parseLRC`
- The lyrics engine and current-line detection
- The auto-follow / manual-scroll reducer
- The Spotify policy gate
- Playback, queue and search normalisation
- Progress interpolation
- Search debounce
- Retry-After parsing and the 429 cooldown/backoff
- Error-to-message mapping
- The latest-request-wins search runner (abort, stale responses)
- Sensory:
  - the map uses only real WebHaptics and Cuelume names
  - proportionality
  - Sound and Haptics settings
  - dedupe
  - failing channels
  - no hardware
  - polling never plays feedback
  - commands cue synchronously
- The onboarding flow machine, tutorial steps, and the swipe-to-skip commit rule

## Building

```bash
npm run build     # typecheck + vite build + service worker → dist/
npm run preview   # serves dist/ on http://127.0.0.1:4173 with the same CSP headers as Vercel
```

## Deployment (Vercel)

1. Push this repo to GitHub.
2. On Vercel, choose **Add New → Project** and import the repo. The framework preset is detected as **Vite**, and build/output settings come from `vercel.json`.
3. Under **Settings → Environment Variables** (Production), add:
   - `VITE_SPOTIFY_CLIENT_ID`: your Client ID
   - `VITE_SPOTIFY_REDIRECT_URI`: `https://<your-production-domain>/callback`
4. Deploy. Add the same `https://<your-production-domain>/callback` in the Spotify app's Redirect URIs.
5. Every push to `main` deploys to production. Pull requests get preview deployments, but see the Redirect URIs note above.

`vercel.json` provides:
- The SPA rewrite
- A strict CSP: scripts, styles and fonts from self only; images from Spotify's CDNs only; `connect-src` limited to `api.spotify.com` and `accounts.spotify.com`
- `frame-ancestors 'none'`, `nosniff` and `no-referrer`
- Immutable caching for hashed assets

There are no serverless functions.

## Lyrics architecture

```
track metadata → resolver (providers[]) → LyricLine[] → lyricsEngine (pure) → Lyrics screen
```

- `lyrics/lrc.ts`: `parseLRC()` handles minutes, seconds, centiseconds and milliseconds, multiple stamps per line, `[offset]`, metadata tags, blank lines, gaps, enhanced-LRC word stamps, and malformed input.
- `lyrics/engine.ts`: `getCurrentLyricIndex()` (binary search) and `lyricsEngine({ lyrics, playbackPositionMs, isPlaying })` → `{ currentIndex, previousLines, nextLines }`. It imports nothing from Spotify.
- `lyrics/follow.ts`: follow ⇄ free. Scrolling yourself pauses follow and shows "Jump to current", which returns to the line and resumes following.
- `lyrics/resolver.ts`: a provider interface. The only provider today is a bundled mock library containing one **original** demo song. There's no scraping and no assumption that Spotify exposes lyrics. None of the text is copyrighted.
- **Policy gate** (`lyrics/policy.ts`): Spotify's policy prohibits syncing Spotify sound recordings with lyrics. So for Spotify playback the reader is **static**: readable, manually scrollable, and never timed. Timed follow only runs against clocks that aren't Spotify audio. Today that's the demo clock; later it'll be local audio.

**What this means today:**
- The only lyrics bundled are the original demo song. **Real Spotify tracks show "Lyrics unavailable"** until a licensed provider is added.
- The current-line highlight, auto-follow and "Jump to current" run only in the demo (`/lyrics/demo`, a silent clock labelled "Demo, no audio"). The **Follow the current line** setting has no effect on Spotify playback.

Adding a real provider (Phase 2): implement `LyricsProvider.find()`, add it to `resolveLyrics`, and show its attribution. Only do this after confirming its licence permits display in this app. Timed display against Spotify playback stays off unless Spotify explicitly permits it.

## Spotify policy considerations

- **No syncing** of Spotify audio with lyrics or visual media ([Developer Policy](https://developer.spotify.com/policy), [Compliance Tips](https://developer.spotify.com/compliance-tips)).
- **Attribution and link-back**: metadata and artwork link back to Spotify ("Open in Spotify" on Now Playing, ↗ on rows and tiles). Settings states that content comes from Spotify. **Before any public launch**, add the official Spotify logo attribution from the [Design Guidelines](https://developer.spotify.com/documentation/design). It isn't bundled here.
- **Artwork isn't cropped or altered**: it's shown with `object-fit: contain` and no overlays or filters.
- **No playback without artwork and metadata**.
- **No commercial use** of a Streaming SDA: no selling, ads or sponsorships.
- **Disconnect**: Settings → Disconnect removes tokens and all Spotify-derived state from the device.
- **Development Mode limits** apply (Premium owner, 5 users, 1 Client ID per developer). Extended quota needs Spotify's review.

## Future roadmap

These are deliberately not built yet:

- **Phase 2**:
  - A licensed lyrics provider, once its terms are verified
  - Better lyrics matching (duration, ISRC via `external_ids`)
  - Screen mode
- **Phase 3**:
  - QR pairing
  - A realtime TV display at `/screen/:roomId`, by swapping `MockRoomService` for a Supabase/WebSocket implementation
- **Phase 4**:
  - Presets
  - Richer device management (volume)
  - Visual themes
  - Album-art ambient backgrounds
- **Phase 5**:
  - Local audio mode
  - Experimental DJ features, for user-owned/local audio only
