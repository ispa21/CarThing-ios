# Tokens

Source of truth: [`src/styles/tokens.css`](../../../src/styles/tokens.css). Motion tokens are mirrored for Motion in [`src/ui/motion.ts`](../../../src/ui/motion.ts). This page explains the rules for using them; the values live in code.

## Colour (v2 "Flight Deck")

| Token | Use it for | Never |
|---|---|---|
| `--bg` | The void behind the console | — |
| `--metal` (+ `--bevel`) | Every panel: the deck console, tracklist panels, rack modules, sheets, toasts, the rail | Content you read at length |
| `--bay` (+ `--recess`) | Recessed glass: display bays, the dial channel, the search field, fader slots, empty states | Controls |
| `--surface-1/2/3` | Chassis flats, raised modules, dark keycaps | `--ink-3` text on keycaps (≈4.2:1) |
| `--outline` | The hard 1px edge and the hard drop under keys (`--drop`, `--drop-pressed`) | Soft shadows |
| `--hairline` / `-strong` | Printed rules on glass | Seams between rows (those are machined grooves: a dark cut + a highlight) |
| `--ink` / `-2` / `-3` / `-4` | Text, secondary, labels, non-text marks | `-4` as text |
| `--signal` (amber) | **Live**: playing lamp, lit ticks, needle, elapsed time, the active preset, focus | Anything decorative |
| `--mode` (cyan) | **Engaged mode**: shuffle, repeat, a latched setting, a switch that's on | Live state |
| `--success` (green) | **Linked**: the active output port, "added" | — |
| `--error` (red) | **Fault**: error lamps, the armed Disconnect | — |
| `--key` / `--key-shade` | The bone keycap: play, primary buttons, lever caps, the mini play key | Surfaces |
| `--ambient` | The glow behind the cover | Anything on the cover |

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
- **Radius (hard edges):** `--r-xs` 2 · `--r-s` 4 (art, LEDs, chips' inner parts) · `--r-m` 6 (keys, buttons, rows, bays) · `--r-l` 10 (modules, sheets) · `--r-key` 6.
- **Depth:** `--drop` (`0 4px 0 --outline`, the neo-brutal hard drop) and `--drop-pressed`; `--bevel` (light on a top edge, dark on the bottom); `--recess` (glass set into metal); `--ambient-shadow`; `--shadow-overlay`; `--glow` (amber lamps). Keys press by translating down onto their drop.
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
