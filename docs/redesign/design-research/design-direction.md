# Design direction: Flight Deck

> v2 (2026-09-28), from the owner's brief: *neo-brutalism + skeuomorphism, blended with a futuristic space-tech DJ booth — bold geometric forms, tactile physical-looking controls, chunky surfaces, hard edges, subtle depth, metallic/dark materials, knobs, sliders, panels, indicator lights, purposeful mechanical details; strong typography, controlled contrast, clean spacing, restrained motion.* v1 ("the hi-fi faceplate") established the type, the dial and the rules below; v2 keeps them and rebuilds the materials.

## The product, and the one idea

PartyDeck is a music appliance: a Now Playing deck, search, queue and a big lyrics reader that controls Spotify from a phone held sideways, a tablet on a stand, or a TV.

**The idea:** a DJ console built for a spacecraft. The screen is a machined gunmetal console. What you read sits in recessed display bays of dark glass; what you touch is hardware — chunky keycaps on hard drops, latching keys, a fader, lever switches. Indicator lights each mean one thing. The album cover is a screen in a bezel, and the only colourful object; its colour spills into the room behind it.

## The rules that make it feel designed rather than decorated

1. **Every mechanical detail does a job.** The fader sets volume, the latches set shuffle and repeat, the lenses report state, the seams group controls, the brackets frame the one screen. Nothing on the console is a prop. (This is why the new console added real Spotify commands: a knob that did nothing would betray the brief.)
2. **Indicator lights have a vocabulary.** Amber = live (playing, progress, the active preset, focus). Cyan = an engaged mode (shuffle, repeat, a chosen setting). Green = linked (the output device). Red = fault. A light that's off is still visible: a dark lens.
3. **Depth is neo-brutal, then machined.** Keys sit proud on a hard, blur-free drop (`0 4px 0 #030405`) under a 1px outline — the neo-brutalist move — and have a bevelled top and a soft ambient shadow — the skeuomorphic one. Pressing a key moves it down onto its drop. Latched keys stay down.
4. **Chrome is metal, content is glass.** Panels are gunmetal with a brushed texture and bevel (`--metal`, `--bevel`); anything you read lives in a recessed bay (`--bay`, `--recess`). This is the whole hierarchy: touch the metal, read the glass.
5. **Hard edges.** Radii of 2–10px; keys 6–8px. The only circles are the power key and LED segments.
6. **Colour lives in the artwork.** The console is monochrome steel; the cover is untouched (`object-fit: contain`, no overlay, filter, mask or crop) and its sampled colour is a light *behind* it.
7. **Motion is mechanical and restrained.** Keys travel 3px and bottom out in 90ms; nothing bounces, nothing loops (except the tutorial's coach halo). Motion only says what changed: which way you skipped, which screen you went to, which word the status became.

## Signature elements

- **The console deck.** Landscape: the cover in its bezel on the left with HUD corner brackets; on the right a metal module with a display bay (status lamp, marquee title, artist, up-next, the dial), transport keys on the metal below, and a channel strip bolted on the side (mode latches + level fader), separated by a machined seam. The module is at least the cover's height, so their edges align.
- **The dial.** The scrubber is a tuning scale in a recessed channel: fine ticks, minute ticks, lit amber ticks for what's played, an amber needle for now, elapsed and remaining as telemetry on the same line.
- **The level fader.** A slot, a printed scale, a chunky knurled cap on a hard drop, and a segmented level meter (a state readout, not an audio meter — Spotify gives us no audio). One request per drag. "FIX" on devices that don't allow remote volume (many phones).
- **Latching presets.** The rail's tabs are preset keys: the current screen's key stays down with its amber lens lit. Settings' segmented choices are the same latching keys with cyan lenses.

## Typography

Unchanged from v1 — it already reads as industrial:

| Role | Face | Setting |
|---|---|---|
| Marquee | Archivo 72% width, 800 | −0.022em, 0.98 line-height, balanced; sized by viewport, capped by the console's width (`17cqi`), then by title length |
| Stencil label | Archivo 125% width, 700 | 11px caps, +0.15em |
| Body | Archivo 100%, 400–650 | 16px/1.45 |
| Telemetry | Martian Mono 450 | 12px, tabular; elapsed time in amber |
| Wordmark | Archivo 125%, 820 | Letters warm up from unlit segments |

## Colour

| Token | Value | Role |
|---|---|---|
| `--bg` | `#0a0b0d` | The void behind the console |
| `--surface-1/2/3` | `#14171a` / `#1b1f23` / `#262b30` | Chassis → raised module → dark keycap |
| `--metal` | brushed + `#22262b → #15181b` | Every panel and module |
| `--bay` | `#07080a` | Recessed display glass |
| `--outline` | `#030405` | The hard edge and the hard drop |
| `--ink` / `-2` / `-3` / `-4` | `#eceff1` → `#4b525a` | Text; `-3` is ≥4.5:1 on every panel surface and never used on keycaps |
| `--signal` | `#ffa630` | Amber: live |
| `--mode` | `#4fd6e6` | Cyan: engaged mode |
| `--success` | `#6ee491` | Green: linked |
| `--error` | `#ff5b4f` | Red: fault |
| `--key` | `#e7e3d9` | The bone keycap (play, primary, lever caps) |

## Layout by size

- **Landscape phone (primary):** cover left at full height; console right with the channel strip as a narrow column (latches + fader, no captions). Title two lines max; album name hidden. Everything fits in ~300px of height.
- **Tablet landscape:** the same, with captions (MODE / LEVEL), one up-next track, and the output plate on its own row when the console is narrow.
- **Desktop:** marquee up to 7.5rem, the next three tracks numbered on the display.
- **Portrait (fallback):** one column — cover (30% of the height), display bay, centred transport, channel row (latches + a long horizontal fader), output plate.
- **Lists, Settings, sheets:** tracklists on metal panels with machined grooves; settings as rack modules; sheets as metal drawers with grip ridges (side drawers on landscape phones); toasts as annunciator plates.

## Moments

| Moment | Idle | Press | Feedback | Result |
|---|---|---|---|---|
| Play / pause | Bone key, amber lens lit while playing | Travels 3px onto its drop | medium haptic + pulse, same frame | Lens, status lamp and ambient light change; status word rolls |
| Skip | Dark keycaps | Travel | medium + page | Title dims until the new track arrives from the side you skipped toward |
| Shuffle / repeat | Latch key, dark lens | Travels down and stays down | selection + toggle | Lens lights cyan; repeat cycles off → all → one ("1" on the cap) |
| Volume | Fader cap at the level; meter lit to it | Cap follows the finger 1:1 | tick on release | One request; meter and readout follow |
| Change screen | Preset keys | The pressed key latches | selection | Its amber lens lights; the screen enters from the side you travelled |
| Choose output | Plate beside the keys | Travels 2px | selection | Drawer slides in; the linked port glows green |
| Power on | Guard plate, dark LED ring | Key sinks 5px | heavy + arrival | Ring sweeps amber, wordmark warms up |
| Fault | — | — | error | Red lamp; an annunciator plate drops from the top |

## What we deliberately didn't do

- **No fake controls.** No knob without a job, no crossfader (Spotify has no crossfade API), no animated level meter (no audio data).
- **No WebGL / three.js / GSAP.** The console is CSS: gradients, hard shadows and transforms. Nothing in a remote needs a 3D scene, and it would cost battery on exactly the devices PartyDeck runs on.
- **No rotating "vinyl" artwork, no blurred copies, no overlays.** The cover stays unaltered.
- **No chamfered clip-paths.** They'd clip the hard drops and focus rings; corners stay hard with small radii instead.
- **Not Spotify's look.** PartyDeck borrows Spotify's *functions* (shuffle, repeat, volume, open in the app), not its visual identity — it's an independent app.
