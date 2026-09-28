# Components

PartyDeck's primitives. Abstractions exist only where something repeats; a pattern used once lives in its screen. Styles: `src/styles/{base,controls,layout,lists,deck,sheet,lyrics,onboarding,settings}.css`.

## Primitives (`src/ui`)

| Component | What it is | Notes |
|---|---|---|
| `PressKey` | Any physical key: transport keys, power key, primary buttons, the mini play key | Motion spring press (`SPRING_KEY`), CSS adds 1px of travel and the shadow bottoming out; no scale under reduced motion. Carries `HapticSwitch` on iPhone — don't put `pointer-events: none` on its children or style it with `:only-child`/`:empty`. |
| `Fader` | The level fader | `role="slider"` with orientation; drag 1:1, one commit on release; arrows ±5, Page ±10, Home/End (cue on the key press, one silent commit when the keys stop). `value={null}` renders "FIX": the device won't take remote volume. |
| `Scrubber` | The dial | `role="slider"`, arrow/Page/Home/End keys (cue on the key press, one silent seek when the keys stop), drag tracks 1:1 and seeks once on release. Paints per frame via `useClockPainter`, transform only. Minute marks from `lib/progress.minuteMarks`. |
| `Artwork` | Spotify cover | Uncropped (`object-fit: contain`), no filters, no overlays. Fades in once decoded. Falls back to a glyph. |
| `useArtColor(src)` | The ambient colour | Samples a separate 24×24 CORS copy; the visible `<img>` never depends on CORS. Pure logic in `lib/ambient.ts` (tested). |
| `MediaRow` | A tracklist row | Optional play (whole row), `+` queue (✓ in green for 1.8s), `↗` Spotify link, mono duration, lead slot (index), `live` gutter lamp. |
| `Sheet` | Native `<dialog>` | Focus trap, Escape and inert background from the platform. Bottom sheet / side sheet (landscape phones) / centred panel. Sticky header. |
| `EmptyState` | A lamp, a title, a detail, a way forward | Lamp off for empty; `tone="error"` lights it red. |
| `ErrorState` | `EmptyState` for a `FriendlyError` | Renders only the action the error has: Try again / Choose device / nothing (rate-limited). |
| `SkeletonRows`, `.skel*` | Loading placeholders | Match the final layout (the deck skeleton includes the dial and keys). |
| `Toaster` | One toast at a time | Drops from the top; a lamp shows the tone. |
| `Icon` | The glyph set | 24px grid, 2px round strokes; filled transport glyphs. `deck`, `gear` added. |
| `FullscreenButton` | Fullscreen key | Rendered only where the browser can do it. |

## App pieces (`src/app`)

| Component | Notes |
|---|---|
| `Deck` | Shared by Now Playing and the tutorial. Props add `status` (the rolling state word + LED), `menu` (⋮ in the status row), `next` (the up-next line), `footer` (output chip). Tracks the direction of the last skip to animate the next cover; dims the title while a skip is in flight. Renders the ambient layer. |
| `UpNextLine` | The next track beside the next key; a link to Queue on the real deck, text in the tutorial. Only shown in landscape with ≥620px of height. |
| `TransportKeys`, `PlayKey` | Presentational keycaps (travel-only presses, `depth={1}`). The play key's lens is lit amber while playing. |
| `ChannelStrip` | The mixer channel: shuffle and repeat latch keys (`aria-pressed`, cyan lens; repeat cycles off → all → one) and the level fader, bound to Spotify via `toggleShuffle`, `cycleRepeat`, `setVolume`. Vertical beside the console in landscape, a row in portrait. |
| `UpNextList` | The next three on the display (CSS shows one or three by height); a link to Queue on the real deck. |
| `Rail` | The console's preset strip: mini deck (a display bay; a cover + play puck below 1000px), four latching preset keys (the current one stays down, amber lens lit), tools. |
| `DeviceSheet` | Devices as output ports; the active port glows amber. |

## Class-level patterns

| Pattern | Class | Rule |
|---|---|---|
| Faceplate label | `.label` | Encodes what a zone is ("NOW PLAYING", "UP NEXT"). Never decoration. |
| Readout | `.readout` | Anything you could measure: time, duration, count, index, version. |
| Lamp | `.led` (+ `data-tone="mode|ok|error"`, `data-off`, `.led-pulse`) | Rectangular lenses. Amber = live, cyan = mode, green = linked, red = fault, dark = off; pulse = connecting. |
| Latch | `.latch` (`aria-pressed`) | A key that stays down when engaged, with a cyan lens. |
| Buttons | `.btn`, `.btn-primary`, `.btn-quiet`, `.btn-danger` (`data-armed`), `.btn-small` | One primary per screen, made of the key material. |
| Icon buttons | `.icon-btn` (+ `-strong`, `-quiet`, `data-added`, `data-spin`) | 44px, `aria-label` always. |
| Chip | `.chip` | Pill with a hairline; the output selector. |
| Switch / segmented | `.switch`, `.seg` | The switch is a lever in a slot with a lens that lights cyan; segments are latching keys (the chosen one stays down, cyan lens). |
| Page head | `.page-head`, `.page-title`, `.page-meta` | Condensed headline, readout on the far side, hairline under both. |
| Tracklist | `.rows`, `.row` | Hairline seams, capped cascade on insert, gutter lamp for the live row. |
| Tiles | `.tiles`, `.tile` | Grid; a flickable shelf on landscape phones. Cover lifts on hover (never dims). |
