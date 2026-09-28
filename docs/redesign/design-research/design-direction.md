# Design direction: the hi-fi faceplate

## The product, and the one idea

PartyDeck is a music appliance: a Now Playing deck, search, queue and a big lyrics reader that controls Spotify from a phone held sideways, a tablet on a stand, or a TV. It's opened many times a day and glanced at from across a room.

**The idea:** the screen is the dark glass of a piece of hi-fi equipment. Everything on it is either *display* (what's playing, readouts, lyrics) or *hardware* (keys, the dial, switches). Amber is the VFD backlight: it lights only what is live right now. The album cover is the only colourful object, and its colour spills into the room as light behind it.

This comes straight from the research synthesis ([research.md](research.md)): a strict colour budget, mono for measurements, extreme scale contrast in one family, structure that is also function, honest device states, and motion that carries state on one rhythm.

## Signature: the dial

The scrubber is drawn as a tuning scale. Fine ticks are the song, taller ticks mark each minute (5 or 10 minutes for long episodes), the ticks you've heard are lit amber, and an amber needle is *now*. Elapsed and remaining time read out in mono underneath. It's the one element someone would describe after seeing PartyDeck, and it's true to the subject: finding your place in a song, like tuning a radio.

Technically it's cheap: two repeating-gradient tick layers, a counter-translated lit window, and a needle moved in container units. All of it moves by `transform` only, painted per frame without React renders.

## Typography

One variable family whose **width axis is the voice**, plus a mono.

| Role | Face | Setting | Used for |
|---|---|---|---|
| Marquee | Archivo, width 72% (condensed), weight 760 | −0.024em, line-height 0.92–0.98, balanced wrap | Deck title (sized by length: short titles get poster scale), page headlines, empty-state titles |
| Faceplate label | Archivo, width 125% (expanded), weight 600–650 | 11px caps, +0.14em | Zone labels ("NOW PLAYING", "UP NEXT"), rail tabs, status words |
| Body | Archivo, width 100%, 400–560 | 16px / 1.45 | Artist, rows, settings, copy |
| Readout | Martian Mono, 450 | 12px, tabular figures | Time, durations, counts, indices, version |
| Wordmark | Archivo, width 125%, weight 820 | −0.04em | "PartyDeck" on Welcome: each letter is a segment that warms up |

Why this pairing: a condensed grotesk reads as a gig poster or marquee (music), the expanded cut reads as lettering on a hi-fi faceplate (hardware), and the mono reads as an instrument display. One family keeps it coherent; the width axis gives range that weight alone can't. Both are self-hosted (`@fontsource-variable/*`) because the CSP allows fonts only from `'self'`. They replace six Barlow files at a similar byte cost.

## Colour

| Token | Value | Role |
|---|---|---|
| `--bg` | `#100f12` | The display glass. Static grain and a faint top-left sheen make it a material. Pure black on the OLED "Black" theme, with no grain. |
| `--surface-1/2/3` | `#18161b` / `#211e25` / `#2c2831` | Resting panels → elevated (sheets, toasts) → dark keys |
| `--ink` / `-2` / `-3` / `-4` | `#f2ede5` → `#5c5761` | Warm paper white → secondary → labels (5.3:1 on glass) → non-text only |
| `--signal` | `#ffa630` | **Live state only**: the needle and lit ticks, the play lamp, "Now playing", the active tab lamp, focus |
| `--success` / `--warning` / `--error` | `#7fd8a4` / `#f0cf6a` / `#ff7566` | Phosphor green (added to queue), warning, error lamps |
| `--key` / `--key-shade` | `#efe8dc` / `#d7cfc1` | The physical key material: the one light object |
| `--ambient` | sampled | The cover's own hue at glow brightness, behind the art, 900ms linear cross-fade |

All text pairs were checked: ink 16.4:1, ink-2 8.4:1, ink-3 5.3:1 on the glass. `--ink-3` is never used as text on `--surface-3` (3.98:1).

## Layout and spatial behaviour

- **Landscape phone (primary):** art left at full available height; the instrument panel on the right is *exactly the art's height*, so what's playing aligns with the cover's top edge and the keys with its bottom edge. The rail is the faceplate strip below.
- **Tablet and desktop:** the same composition scaled up, not stretched. The title grows to a true marquee (up to 8.5rem), "Up next" appears beside the next key when there's height for it, and the keys stay physical sizes. List pages use the width: Search splits into a songs column and a column for everything else; Queue shows what's playing at hero scale beside the tracklist; Settings becomes a spec sheet with labels in their own column.
- **Phone portrait (fallback):** a single stacked column that centres when there's room and top-aligns when there isn't (auto margins, so nothing overlaps the rotate hint).
- **Welcome:** corner-anchored. Status top-left, the way out top-right, the wordmark bottom-left at the size of its column, the one control on the right.
- **Sheets:** bottom sheets on portrait phones, full-height side sheets on landscape phones (so every device fits), centred panels on wide screens. Each leaves the way it came.

## Radius and depth

Tight hardware corners (4px artwork and rows, 8px chips, 12px buttons, 20px panels) and one soft family for keys (22px keycaps, a 28px play key, circles for the power key). Depth is spent where it means something: keys sit proud of the glass (top highlight, bottom shade, drop shadow) and visibly bottom out when pressed; overlays float on one shadow recipe; everything else is flat on the glass, separated by hairlines rather than cards.

## Motion system

See [../design-system/motion-spec.md](../design-system/motion-spec.md). In short: short, precise and physical. Critically damped springs for anything touched, expo-out for entrances, exits faster than entrances, transform and opacity only, every animation interruptible, and reduced motion swaps movement for fades. Motion always carries state: which way you travelled, which way you skipped, what just changed. There's no decoration and no loops beyond the tutorial's coach halo.

## Moments

| Moment | Idle | Hover (pointer only) | Press | Feedback | Result |
|---|---|---|---|---|---|
| **Play / pause** | Lit key; its lamp is amber while playing | Key face brightens | Key compresses (spring, 0.95) and travels 1px; shadow bottoms out | `play`/`pause`: medium haptic, "pulse"/"press" sound, same frame | Status word rolls "Now playing" ⇄ "Paused"; lamp, LED and the ambient glow dim or light; optimistic, rolled back if Spotify refuses |
| **Skip** | Dark keycaps either side | Keycap lightens | Compresses and travels | `next-track`: medium haptic, "page" sound | Old title dims while Spotify catches up; new cover arrives from the side you skipped toward, title rises through its mask |
| **Swipe the cover** | Cover sits in its slot | Grab cursor | Tracks the finger 1:1 with rubber-band resistance; a tick when the commit point is crossed | Same as skip, on release inside the gesture | Same as skip; a short flick is enough (velocity) |
| **Seek** | Dial with lit ticks and needle | Needle grows | Needle grows further; elapsed turns amber; drag tracks 1:1 | `seek` selection tick on release (keyboard: on the key press) | One seek request; lit ticks and time follow |
| **Change tab** | Faceplate labels in ink-3 | Label brightens | Glyph compresses | `select` tick | Amber lamp travels to the tab (spring); the screen enters from the side you travelled toward |
| **Add to queue** | `+` | Background | Compresses | `select` now; `queue-add` success after Spotify accepts | `+` pops into a green check for 1.8s |
| **Choose a device** | Output chip beside the keys | Chip outline brightens | Compresses | `select` | Side or bottom sheet enters from its edge; the active device's port glows amber |
| **Power on / Continue** | Standby: the wordmark is faintly lit, the lamp is off | Key face brightens | Big key travels 2px and compresses | `power-on` / `primary-press`: heavy/medium haptic, "arrival" sound | Amber ring sweeps around the key; the wordmark warms up letter by letter; "Standby" becomes "On" |
| **Disconnect** | Red-tinted button | Tint deepens | First press arms it: "Press again to disconnect" in solid red for 4s | `warning` | Second press disconnects; otherwise it disarms itself |
| **Error** | — | — | — | `playback-error` (after the round trip) | A red lamp, a plain title, and only the action that can work ("Try again", "Choose device", or nothing during a rate-limit pause). Toasts drop from the top, never over the keys |

## Haptics

Haptics are semantic (`feedback.play(event)` → level → mechanism) and never a dependency: every state is also visible and announced. Android gets feelable millisecond patterns; iPhone gets one real tick per tap on primary keys (the only mechanism iOS 26.5+ still allows); desktop, iPad, Firefox and older iOS get nothing, and Settings hides the switch there. Details and root causes: [../haptics/report.md](../haptics/report.md).

## What we deliberately didn't do

- **No WebGL, three.js or GSAP.** Nothing in a remote control needs a 3D scene, and Motion plus CSS cover every animation here. They'd cost battery on exactly the devices PartyDeck runs on.
- **No blurred or tinted copy of the artwork.** The ambient light is a colour sampled from the pixels, drawn behind the cover. The cover itself is untouched (`object-fit: contain`, no overlays, no filters).
- **No custom cursor, no magnetic buttons.** They add perceived latency to controls used dozens of times a day, and do nothing on touch.
- **No animated level meter.** Spotify gives us no audio data, so it would be a lie, and the codebase bans loops.
- **No preloader or long intro.** The arrival choreography plays on Welcome only, in about half a second.
