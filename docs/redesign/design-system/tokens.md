# Tokens

Source of truth: [`src/styles/tokens.css`](../../../src/styles/tokens.css). Motion tokens are mirrored for Motion in [`src/ui/motion.ts`](../../../src/ui/motion.ts). This page explains the rules for using them; the values live in code.

## Colour

| Token | Use it for | Never |
|---|---|---|
| `--bg` | The display glass (body). Screens are transparent over it. | Cards. Surfaces go on top of the glass, not replace it. |
| `--surface-1` | Resting panels (settings groups, mini deck, search field), pressed rows | Stacking two translucent surfaces |
| `--surface-2` | Elevated: sheets, toasts, menus, skeletons | Large page areas |
| `--surface-3` | Dark keys, selected segment, pressed rows inside sheets | `--ink-3` text on it (3.98:1) |
| `--hairline` / `-strong` | Seams between rows and zones; outlines of chips | Borders around everything |
| `--ink` | Titles, primary text, glyphs of active controls | — |
| `--ink-2` | Secondary text (artist, details) | — |
| `--ink-3` | Faceplate labels, meta, inactive tabs | Text on `--surface-3` |
| `--ink-4` | Non-text: tick marks, disabled glyphs, off lamps | Any text |
| `--signal` | **Live state only**: needle and lit ticks, play lamp, "Now playing"/playing LEDs, the active tab lamp, focus ring, the playing row in search | Decoration, emphasis, brand colour, buttons |
| `--success` / `--warning` / `--error` | Their lamps and the "added" check; `--error-dim` for destructive buttons | Anything decorative |
| `--key` / `--key-shade` / `--key-ink` | The physical key material: play key, power key, primary button, switch thumb | Surfaces |
| `--ambient` (set per track) | The glow behind the cover | Anything drawn over the cover |

Themes: `graphite` (default) and `black` (OLED: `--bg: #000`, no grain, dimmer ambient). `prefers-contrast: more` lifts `--ink-2/3` and hairlines.

## Type

| Class / token | Setting |
|---|---|
| `.np-title`, `.page-title`, `.headline` | Archivo `--w-condensed` (72%), 760, −0.024em, line-height 0.9–0.98 |
| `.label` | Archivo `--w-expanded` (125%), 600, `--t-label` (11px), +0.14em, uppercase, `--ink-3` |
| `.readout` | Martian Mono 450, `--t-readout` (12px), tabular figures, `--ink-2` |
| body | Archivo 100%, 400, 16px/1.45 |
| `--t-headline` | `clamp(2.25rem, 1.4rem + 3.2vw, 4.75rem)`, capped by height where screens are short (`min(…, 13vh)`) |
| `--t-title`, `--t-lead`, `--t-small` | Section titles, artist line, details |

The deck title sets `--np-t` per layout and a length tier (`data-fit="m"` ×0.8, `"l"` ×0.64) so the words fit the marquee.

## Space, radius, depth, layers

- **Space:** 4pt scale `--s-1` (4) … `--s-9` (96). Gutters: `--gutter` = `clamp(16px, 3.6vw, 48px)`, merged with safe areas into `--pad-l` / `--pad-r`.
- **Radius:** `--r-xs` 4 (art thumbnails, skeleton lines) · `--r-s` 8 (large art, chips) · `--r-m` 12 (buttons, rows, icon buttons) · `--r-l` 20 (sheets, panels) · `--r-key` 22 (keycaps) · `--r-pill`.
- **Depth:** `--edge-light` (a top edge catching light), `--shadow-float`, `--shadow-overlay` (sheets, toasts, jump pill), `--glow` (amber lamps). Keys carry their own recipe in `controls.css`: top highlight, bottom shade, drop shadow, collapsing on press.
- **Layers:** `--z-rail` 2, `--z-float` 3, `--z-toast` 10; dialogs use the top layer.
- **Targets:** `--tap` 44px minimum; the rail is `--rail-h` 64px in landscape.

## Motion

| Token | Value | Use |
|---|---|---|
| `--dur-press` | 110ms | Press feedback |
| `--dur-fast` | 180ms | Hover, colour, small state |
| `--dur-base` | 240ms | Small entrances, exits of larger things |
| `--dur-slow` | 360ms | Sheets, screens, reveals |
| `--dur-deliberate` | 560ms | The power ring, Welcome arrival |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Default response |
| `--ease-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances and reveals |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | On-screen moves |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Sheets |
| `--stagger` | 28ms | List cascades (capped at 7 steps) |
| `SPRING` / `SPRING_KEY` / `SPRING_TRAVEL` | bounce 0 / 0 / 0.12 | Motion: default, keys, the travelling lamp |
