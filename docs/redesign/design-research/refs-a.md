# Design research, set A (refs 01–06)

Researcher: design-research-agent (A) · captured 2026-09-28 with headless Chromium (Playwright), 1440×900 desktop and iPhone 14 (390×844, touch, mobile UA).
Screenshots: `/private/tmp/claude-501/-Users-ishan-Data-partydeck/feceaba9-5e43-4a2f-a64e-4b5fd15ab349/scratchpad/research/<nn>/` (called `$R/<nn>/…` below).
Rules followed: everything below was observed in a screenshot or measured with `getComputedStyle` / stylesheet walks. Anything I inferred is marked **(inference)**.

Coverage at a glance:

| # | Site | Observation |
|---|------|-------------|
| 01 | Mobbin → "[untitled]" iOS app | **Blocked** (Mobbin redirects to its login/marketing page). Substituted with public App Store screenshots and the public untitled.stream site. **Partial.** |
| 02 | columbia100.watson.la | **Complete** (desktop and mobile, load, wheel, hover) |
| 03 | meermohsin.me | **Complete** (desktop and mobile, preloader, audio gate, scroll) |
| 04 | thetiebreak.merci-michel.com | **Complete** for landing, onboarding and game start. Did not play a full game. |
| 05 | bleibtgleich.dev | **Complete** (desktop and mobile, loader, menu, scroll) |
| 06 | lisa.locomotive.ca | **Blocked**: HTTP 403 plus a Cloudflare "Verify you are human" challenge, on both desktop and mobile. I did not try to get around it. Substituted with the public Awwwards SOTD page and its 4 hosted screen-recordings. **Partial.** |

---

## 01 · [untitled] (iOS) — via Mobbin

**What it is:** [untitled] by Sin Titulo Inc. is an app for sharing, organising and editing work-in-progress music (iOS, Android and web).
**Observation: blocked, then partial.** The Mobbin URL redirected to `mobbin.com/?redirect_to=…` (login wall, `$R/01/d-load-6500.png`). I did not see any of Mobbin's flow screens. What follows comes from the 5 official App Store screenshots (`$R/01/appstore-strip.png`, `$R/01/as-1..5.jpg`) and the public marketing site untitled.stream (`$R/01/web/`). App Store screenshots are marketing composites, so I did not see real motion.

- **Layout:** The project screen stacks a large square artwork (roughly 80% of the width), then the title ("67 west EP", about 2× body size), a meta line ("itsmarcel · 10 tracks · 13 min") and a black square play button aligned right on the title's baseline row. Below that sit a full-width "+ Add tracks" gray pill and numbered track rows (number, title, date, "…"). The editor screen is a dark sheet: Cancel/Save at the top, title and meta centred, two mono "chips" (`D Maj`, `96.0 BPM`), a large waveform with a fixed yellow playhead, the time `0:00 / 1:31`, a transport row of three dark rounded keys (⏮, "Hold to loop", ▶), then a VARISPEED/GAIN tool area with tick-mark sliders (Speed 120%, Pitch 0 st), a mini-waveform overview with trim handles, and a segmented control (Adjust · Stems · EQ).
- **Typography (measured on untitled.stream):** "Untitled Sans" 500 and 400 is the only UI face. H1 26px/32px, letter-spacing −0.78px (−0.03em). H2 22/26, −0.66px. Body 15/20, −0.45px. Every size carries the same −0.03em tracking. `IBM Plex Mono 400` is declared but not loaded on the marketing page. The App Store editor screenshot uses a monospace for all technical values (`D Maj`, `96.0 BPM`, `0:00 / 1:31`, `VARISPEED`, `Speed`, `120%`, `0 st`); that the face is Plex Mono is **(inference)**. Labels use square brackets as a typographic device: `[untitled]`, `[membership]`.
- **Navigation:** Visible in the screenshots: sheets with a grabber (Share, Insights), a round back button, round icon buttons (link, search, "…"), and segmented tabs (By track / By listener; Adjust / Stems / EQ).
- **Motion:** Not observable from stills. The marketing site's CSS contains Tailwind default easings plus `cubic-bezier(0.87,0,0.13,1)`, `transform var(--peek-duration) ease-in-out`, and `opacity .15s, transform .1s` (a very short press/peek).
- **Interaction:** A "Hold to loop" key sits between prev and play, a press-and-hold verb given its own labelled key. Sliders are tick rails with one bright indicator tick (yellow for the active param, white for the neutral one) and the value printed at the right end in mono.
- **Visual language:** Light screens are white with #F2-ish gray fills. Dark editor: ~#1c1c1c ground, ~#2a2a2a raised keys, one accent (saturated yellow) used only for Save, the playhead, the active slider tick and the BPM value. Hairlines are nearly absent: grouping is done by fill tone. Artwork is shown square and full, with rounded corners only.
- **Spatial:** The transport keys are large, equal-height rounded rectangles. Controls are grouped into "trays" (a darker band behind the tool area).
- **Technique:** Native iOS app. Marketing site uses Tailwind, backdrop-filter blur(10–75px), and no GSAP/Lenis/three.

**Intentional details**
1. **A single accent colour with one job.** Yellow = "what is live/primary now" (playhead, active slider, Save, BPM). Everything else is grayscale.
2. **Mono for measurements, sans for names.** Track and person names are in the sans. Anything you could measure (key, tempo, time, %, semitones) is in mono inside a small dark chip.
3. **Tick-rail sliders** with the value at the rail's end. They read like a hardware fader bank, not a web range input.
4. **The verb is on the key.** "Hold to loop" is written on the button itself, so there is no hidden gesture.

**Transferable to PartyDeck**
- **Deck (`NowPlaying.tsx`, `Scrubber.tsx`):** Put elapsed/remaining time and the device chip in mono, keep title/artist in the display face. Allow one accent that marks only "live" things: the scrubber playhead, the active transport key, the active device dot.
- **Transport keys (`PressKey.tsx`):** Equal-size dark rounded keys on a slightly darker tray band behind the instrument panel. Where a key has a hold action, print it on the key (e.g. a small "hold" caption) instead of hiding it.
- **Settings (volume and similar):** Use a tick-rail slider with the value at the end in mono, instead of a generic range input.
- **Queue and Search rows (`MediaRow.tsx`):** Title on top, a quiet meta line (artist · duration) below, row number in a muted column. Group by fill tone instead of hairlines.

**Do not transfer**
- The waveform editor itself. We don't have audio/waveform data from Spotify, and faking it would misrepresent the track.
- The light theme. PartyDeck is dark.

---

## 02 · Columbia Pictures 100 (watson.la)

**What it is:** Sony's centenary microsite for Columbia Pictures: an intro logo reveal, then a 3-item hub (Take the quiz / Our history / Celebrate with us). **Observation: complete.**

- **Layout:** One viewport, no document scroll (`scrollHeight` 900 = viewport). The wheel is a trigger, not a scroll. Desktop hub: a small lockup at top centre; the "1" of "100" on the left as a tall image pillar with "TAKE THE QUIZ" beside it; the two "0"s become circular image portals with "OUR HISTORY" (upper middle) and "CELEBRATE WITH US" (lower right); a contextual quote bottom-left; 10px legal links bottom-centre. Mobile: the same intro, then the hub becomes three stacked cards with thin copper-tinted 1px borders and rounded corners, image on the left, label on the right (`$R/02/M-mobile.png`).
- **Typography (measured):** H1 `TradeGothicLTPro-Bold` 90px, line-height 80px, letter-spacing −4.5px (−0.05em), uppercase, colour #AB7A3E (copper). Legal links `TradeGothicLTPro-Cn18` 10px uppercase, copper at 70%. Also declared: `IvarText-Regular/Italic` (the italic serif in the quote, "*and love.*") and `Intro-SemiBold`. The type scale is entirely vw-based CSS variables (`--font-s-h1: 24vw`, `--font-lh-h1: 21.33vw`, `--font-ls-h1: −1.2vw`, with separate `-m` mobile tokens).
- **Navigation:** The logo becomes the nav. The three digits of "100" turn into the three destinations.
- **Motion (observed frame by frame, `$R/02/M-trans.png`):**
  1. 0–~1.5s: flat ecru (#F5EEDD) screen, with the image ghosting in at very low opacity.
  2. ~2–3s: a huge close-up of the Torch Lady painting, seen *through* the letterforms of "100" (the digits act as a mask; the right edge of a "0" ring is visible).
  3. ~3–5s: a continuous pull-back until the whole "100" sits small in the centre, with a warm radial glow at the torch.
  4. Then "100 YEARS / COLUMBIA PICTURES / a Sony Company" fades in below.
  5. On the first wheel event (~150ms → 2.5s): the "100" lifts, the digits separate, the "1" narrows into a pillar that moves left, the "0"s become circles that cross-fade to new photos, the lockup shrinks to the top, and labels appear.
  Measured tokens: `--ease-in-out-quart cubic-bezier(.77,0,.175,1)`, `--ease-out-quart (.165,.84,.44,1)`, `--ease-out-cubic (.215,.61,.355,1)` and friends. Transitions: `transform .5s/.75s var(--ease-in-out-quart)`, `opacity .5–.75s var(--ease-in-out-quart)`, `color 1s linear`, `background-color 1s linear`. No keyframe animations.
- **Interaction (`$R/02/M-hover.png`, `$R/02/C-hover-quiz.png`):** Hovering a hub item draws an underline left→right under each line of the label (already visible at 250ms, complete by ~1s). The **bottom-left quote changes per hovered item** ("100 years of drama, suspense, laughter, *and love.*" → "Explore a century of *cinematic legacy.*"). The image inside the "1" pillar re-frames slightly and the torch glow shifts. Cut-out figures break out of their circular frame (a hat pokes above the circle edge).
- **Visual language:** Warm paper ground (#F5EEDD), copper type (#AB7A3E), near-black #121616 for hub labels, a soft radial light bloom. No shadows or borders on desktop. `mix-blend-mode: overlay` is present, and there are 14 `clip-path` rules.
- **Spatial behavior:** One stage that re-arranges itself instead of scrolling. Elements keep their identity across states (a digit becomes a portal).
- **Technique:** Nuxt 3 (`_nuxt/entry.js`), CSS clip-path masks and CSS transitions with named easing tokens. No GSAP, no canvas/WebGL, no smooth-scroll library.

**Intentional details**
1. **The logo is the menu.** Each nav destination physically comes from a piece of the brand mark, so there is no separate "menu" object.
2. **A contextual caption follows focus.** The quiet quote in the corner re-writes itself for whatever you're pointing at.
3. **A named easing vocabulary** (`--ease-in-out-quart` etc.) used consistently. Long 0.5–0.75s in-out moves for layout; 1s *linear* for colour.
4. **Viewport-proportional type tokens**, with a separate mobile set, instead of breakpoint jumps.

**Transferable to PartyDeck**
- **Shared-element continuity (Motion `layoutId`):** When going Deck ⇄ Queue/Search, the album tile should *become* the smaller thumbnail in the rail or row, not cut away. Same idea at Welcome → Deck: the Power key should become the Play key. One object, many states.
- **A contextual caption slot on the Deck:** One quiet line (e.g. under the device chip) that reflects the focused control ("Hold to seek 10s", "Playing on Living Room"). It is a lighter form of the tutorial that stays after the practice tutorial ends (`Tutorial.tsx`, `tutorialSteps.ts`).
- **Named easing tokens in `tokens.css`:** We already have `(.77,0,.175,1)` and `(.23,1,.32,1)`. Make them an explicit, small vocabulary: in-out for layout moves, out for enter, linear for colour cross-fades (e.g. the ambient colour taken from the artwork changing between tracks, ~1s linear).
- **Mobile fallback pattern:** On narrow portrait, a composition that spreads across the screen collapses to bordered stacked cards. This fits PartyDeck's portrait/"rotate" fallback.

**Do not transfer**
- Masking or cropping imagery inside letterforms, circles, or with break-out cut-outs. **Spotify artwork must be shown unaltered.** Circle portals on album art are off-limits.
- A 4–5s intro. PartyDeck is opened many times a day, and the user wants the Deck at once.
- A wheel-to-advance stage. It hijacks input; our rail needs direct taps.

---

## 03 · Meer Mohsin — portfolio (meermohsin.me)

**What it is:** A front-end/3D developer portfolio: red/black, gothic-ornament aesthetic, WebGL hero, background music. **Observation: complete** (clicked the "activate" gate once to observe the post-gate state).

- **Layout:** Preloader, then a full-bleed hero: a portrait with a red WebGL "tribal" ornament over the eyes, and a giant white uppercase marquee ("IT WAS ALWAYS GOING TO BE THIS WAY") running across it. A two-column small nav sits top-right (HOME/ABOUT/SERVICES/WORK/BLOG/CONTACT US | TIKTOK/INSTAGRAM/BEHANCE); role list bottom-right; an "ONLINE ● Let's Connect" chip with an avatar; a fixed bottom bar "+ TENSION + IMMERSION + IMPACT +"; a 40-bar sound meter bottom-left. The document is long (28,172px at desktop) with alternating red and black sections: a word-scatter manifesto, "10+ / 25+" stats, flame silhouettes, "LEGACY" and "3D WEB" in script over line geometry. Mobile: the same content, with a two-line hamburger top-right and the same bottom bar (`$R/03/M-mobile.png`).
- **Typography (measured):** Three self-hosted faces (`@font-face`, woff2): `light-font` = **Stack Sans Headline ExtraLight**, `regular-font` = **Stack Sans Headline Regular**, and `ruthie` = **Ruthie** (a script). Hero marquee: 228px, line-height 1.0, uppercase. Section words: Ruthie 156px, lh 0.85. Body 12px. The bottom-bar labels are split into per-character `div.char` (SplitText-style) at 14.4px, weight 300.
- **Navigation:** Fixed bottom bar with three abstract section names separated by `+` glyphs (`.plus-rotate`, which rotate). Small text nav top-right.
- **Motion:**
  - **Preloader:** a red (#990000-ish) grainy field with a giant black Ruthie-script counter 000→100 (003, 010, 015, 032, 057, 091, 100 seen), with "CLICK ANYWHERE TO ACTIVATE THE EXPERIENCE" beneath in tiny caps, growing in contrast as the count rises.
  - **Gate:** after a click → black. The ornament "wings" slide in from the left and right edges and meet in the middle, then the hero appears.
  - **Scroll:** Lenis smooth scroll. The manifesto words start scattered at different heights and opacities and settle into lines (inference: tied to scroll progress).
  - Measured easings: `transform .45s cubic-bezier(.22,1,.36,1)`, `.45s cubic-bezier(.23,1,.32,1)`, `2s cubic-bezier(.075,.82,.165,1)`.
  - Keyframes: `noiseMovement .09s steps(6) infinite` (animated grain), `liveBlink 1.5s` (online dot), `ringRotate 12s linear`, `wave-lg .5s alternate` (sound bars), `regFluidGradient 12s`, `gradientMove 6s`.
- **Interaction:**
  - **Custom cursor:** a red glowing arrow sprite plus a separate white "+" crosshair, `pointer-events:none`, native cursor hidden (`cursor:none` on links). In one frame the "+" sat at the pointer and the red arrow ~60px behind it **(inference: a lerped follower)**.
  - **Audio gate:** after the click, an `<audio loop>` (bg-music.mp3) starts. The bottom-left **40-bar sound meter** switches from flat dim ticks to animated bars of varying height and opacity (`$R/03/C-bottom.png`). The meter doubles as the mute toggle (`.sound-wave.on`).
- **Visual language:** Blood red and black only, plus white for type. A fullscreen animated grain overlay. `mix-blend-mode: difference/screen`; `backdrop-filter: blur(10px/20px)`.
- **Spatial:** Sections alternate figure/ground (red on black, then black on red). Big type sits both in front of and behind the portrait.
- **Technique:** Vite bundle, **three.js r180** (3 full-viewport canvases), Lenis, split-character text, CSS keyframes for grain and meters.

**Intentional details**
1. **The sound meter is both the playback status and the mute control.** Flat ticks = silent; dancing bars = music is on. You read and toggle state in one element.
2. **A preloader counter set in the display script at huge size**, so the wait becomes a typographic event.
3. **Stepped grain** (`steps(6)` at 90ms), which is cheap and makes flat colour fields feel filmic.
4. **A two-part cursor** (precise crosshair plus a lagging, expressive sprite).

**Transferable to PartyDeck**
- **"Playing" indicator (Deck, rail Home icon, Queue now-playing row):** A small bar meter that animates only while playing and freezes/flattens when paused is a clear, glanceable status. Make it decorative, driven by play/pause state, and honour `prefers-reduced-motion`. It must not claim to show real audio levels.
- **A tap target that is also a status (device chip):** Let the device chip *show* state (a live dot that pulses gently when connected and playing, like `liveBlink`) and be the thing you tap to switch device.
- **Grain, only if cheap:** A static or `steps()`-animated noise layer on the *chrome* background, never over the artwork, could add material feel to the dark UI. Use a tiny tiled PNG and CSS only. Measure on a phone first.

**Do not transfer**
- The click-to-activate audio gate and any autoplay music. PartyDeck controls the user's Spotify; it must never make sound of its own.
- The custom cursor. Touch-first, and a lagging sprite on a controller would feel like input latency.
- Full-screen three.js canvases, Lenis on a long page, and 228px marquees: performance cost and portfolio theatre.
- Script display faces over UI. Legibility at arm's length on a phone in landscape matters more.

---

## 04 · The Tie-break! — Miu Miu × New Balance (Merci-Michel)

**What it is:** A branded browser mini-game (tennis Pong) with Coco Gauff, promoting a New Balance × Miu Miu collection. **Observation: complete** for load, landing, onboarding and countdown. I did not play full rallies.

- **Layout:** Everything sits inside **tennis-court lines** drawn as thin white 1px strokes over a full-bleed, heavily defocused WebGL photo. The court's centre service box is the content column: logo lockup, title, one sentence, the Start button. Game UI: scores ("00") at diagonal corners in italic serif, thin vertical pill paddles at the left and right edges, "OPPONENT"/"YOU" micro-labels on the court ends. Mobile portrait: the same court grid vertically, with the title at 2 lines (`$R/04/M-mobile.png`).
- **Typography (measured):** Title `Instrument` (Instrument Serif) 400, italic, 112.5px, line-height 1.0 ("The Tie-break!"). UI and body `WorkSans` 300/400/500 at 12–13.5px ("Start" 13px/300; "OPPONENT"/"YOU" 13.5px/300 uppercase). Tutorial copy is in the italic serif at display size. Base text is set as `--base-text: 10px` with everything in `em`.
- **Navigation:** Linear. Start → "You vs Opponent" → "You are about to play the Tie-break" → "Score 7 points to win" → "Press [↑] or [↓] on your keyboard" (inline keycap glyphs) → countdown "1" → play. Each step has a small underlined "Next →" text link (`$R/04/C-instruction.png`).
- **Motion:**
  - **Load:** a navy (#142A48) screen with the NB/miu miu lockup and a small tennis-ball glyph, which moves down slightly while loading. On mobile the navy panel **wipes upward** to reveal the photo (caught mid-wipe at 3.5s).
  - **Landing:** elements fade in with a stagger: `opacity 2s` at delays `.25s / .36s / .47s / .58s` (110ms steps).
  - **Tutorial:** one sentence at a time, cross-fading in the same box.
  - Measured easings: `cubic-bezier(.19,1,.22,1)` (expo-out, on border-colour .3s), `cubic-bezier(.25,.46,.45,.94)` (transform .3s), `cubic-bezier(.55,0,.1,1)` (transform .17s + opacity .15s: a fast "swift-out" for small UI).
  - Keyframes: `joystick-y`, `quick-flick`, `circular-spin 1.5s`, `diagonal-jitter .5s`, `bounceAnim/squishAnim/shadowAnim` (instructional glyph animations).
- **Interaction:** The Start button is a small white rounded rect (radius 3.57px) with a navy tennis-ball icon and a 1px transparent border that colours on hover (`border-color .3s expo-out`). No visible change in my hover capture at 620ms. Hover colour token `--ui-color-primary-hover: #fff302` (yellow). Keyboard-first controls, shown as keycaps inside the sentence.
- **Visual language:** The photo is defocused to pure colour fields (blue court, beige, red/navy accents) with film grain. White hairline geometry. Serif italic for voice, geometric sans for UI.
- **Spatial:** The court is the grid: every element aligns to a court line or service box.
- **Technique:** Custom WebGL canvas (`.webgl-canvas`, full viewport). No three/GSAP globals exposed. Vite build. Device classes on `<html>` ("desktop chrome macos ultra"), so quality tiers are probably picked per device **(inference)**.

**Intentional details**
1. **The domain object is the layout grid.** Court lines are both the decoration and the alignment system.
2. **The tutorial is one sentence per beat**, in the display serif, in the same spot, with inline keycap glyphs and a tiny "Next →". It teaches in 5 beats without a modal.
3. **A 110ms stagger over 2s fades** on the landing, which makes the arrival feel slow and luxurious while every element is available at once.
4. **A tiny primary button on a huge stage**, which reads as fashion restraint.

**Transferable to PartyDeck**
- **Practice tutorial (`Tutorial.tsx`, `tutorialSteps.ts`):** one short sentence per step, always in the same anchored slot, with the actual control glyph inline ("Tap [▶] to play", "Hold [⏭] to skip ahead"), a small "Next →" and no modal. The Deck stays live underneath so the user practises on the real keys.
- **The domain object as the grid:** For PartyDeck, the equivalent of the court is the *device*. Align the instrument panel to the physical-key metaphor (a key row, a display window, a dial), and let hairline panel seams (1px, low-contrast) define zones instead of cards.
- **Welcome/Connect (`Welcome.tsx`, `PowerOn.tsx`):** A staggered 100–120ms entry of the few Welcome elements, with the Power key last, is a cheap and calm arrival. Skip it on later launches.
- **Keycap hints on desktop/TV:** Show keyboard shortcuts as keycap glyphs (Space, ←/→) in the tooltip/caption slot when a keyboard is detected.

**Do not transfer**
- Defocused/blurred photography as a background derived from the album art: a blurred copy of the cover risks counting as an altered artwork. Only do it if policy review clears it; otherwise use a flat colour sampled from the art.
- 2s fades on everyday screens. Fine once on first-run Welcome, too slow for a tool.
- A full-screen WebGL background.

---

## 05 · bleibtgleich — Maksym Bleibtgleich portfolio

**What it is:** A Kyiv designer/Webflow developer's portfolio in strict Swiss typographic style, with a few WebGL moments. **Observation: complete.**

- **Layout:** White page. One **vertical hairline** acts as the spine (the page's central axis, slightly left of centre). Labels hang off the spine ("Based in Kyiv / Working w/ TFTL" to its right at top, "Designer & Developer" to its left). The display text is set in ragged, stepped indents ("Design / Digital / Products, / UX/UI / & Web- / flow / dev."). "bleibt" and "gleich" are pinned in the **bottom-left and bottom-right corners** in light gray at 90px, splitting the name across the viewport. A black "Menu" pill sits top-right. Sections: "Work 24-26" with a three.js ring of project thumbnails; "All Works"; an "Awards & Recog-nitions" table; the manifesto "Everything that exists had first existed as … nothing more than a sentence."; a **live clock** "(08 : [image] : 37)" matching the capture machine's local time; a footer with a huge "bleibtgleich" wordmark and "made w/ hate".
- **Typography (measured):** One family, one weight: **Akzidenz Grotesk Pro 500**, used 67/67 times. Display 90px, line-height 79.2px (0.88), letter-spacing −4.455px (≈ −0.05em). H2 token 40rem-scale, lh 80%, −0.1rem. Body 14px, lh 14.98px (1.07), −0.378px (−0.027em). Everything is scaled from `--global--scale-ratio: 14.4` (fluid rem system). Hierarchy comes only from size and position, never weight or colour.
- **Navigation:** The "Menu" pill opens **three panels that drop from the top edge in a staircase** (heights 360 / 280 / 216px, each 240px wide), with three different grays (`--nav bg-1/2/3` = gray 200/150/075), numbered ①②③ with the label at the panel's bottom-left (Home, Work, Contact), plus a smaller "Experiments" tab from the bottom. The pill text becomes "Close" (`$R/05/M-reveal.png`, last row).
- **Motion:**
  - **Loader:** a percent counter at display size bottom-left (17% → 90% → 99% → 100%) while the **spine hairline grows downward** from the top and the "Designer & Developer" label rides down it. The hairline itself is the progress bar.
  - At 100%, a black rectangle top-left **morphs into a head silhouette** (GSAP MorphSVGPlugin is loaded), and the headline **condenses out of blurred ink blobs** on a `.fluid-canvas` (WebGL fluid). Captured at 3.2s: blobs; at 3.8s: crisp text.
  - Scroll: Lenis. Measured: `width .2s cubic-bezier(.77,0,.175,1)`, `transform .6s var(--ease-in-out)`, `background-size .6s var(--ease-in-out)`, plus eases `(.76,0,.24,1)`, `(.25,1,.5,1)`, `(.5,0,.75,0)`.
- **Interaction:** The **Menu pill does a per-letter vertical text roll** on hover: each glyph slides up and is replaced by its duplicate from below, staggered left→right (caught mid-roll at 150ms: "M" low, "enu" high; settled by 650ms; `$R/05/C-menupill.png`). Awards table rows use hairline dividers. Social links are 1px-outline circles (mobile footer).
- **Visual language:** Black on white, with gray only for the corner wordmark and nav panels. Hairlines as structure (`--stroke` token). Images appear only as small black-framed rectangles.
- **Spatial:** Everything is anchored to either the spine or a viewport corner. Nothing floats freely.
- **Technique:** Webflow + GSAP 3.15 (ScrollTrigger, SplitText, MorphSVG, CustomEase, Draggable, Inertia) + Lenis 1.3.21 + Barba (page transitions) + three.js r128 + socket.io (multiplayer cursors or presence **(inference)**) + Slater.

**Intentional details**
1. **The progress indicator is structural.** The loader bar *is* the hairline that later organises the page, so nothing is thrown away after loading.
2. **One face, one weight.** Hierarchy is carried entirely by scale, indent and position.
3. **The per-letter text roll on a tiny pill.** It is the one playful micro-interaction, on the one persistent control.
4. **A staircase menu** with numbered panels in three grays shows order and depth without shadows.

**Transferable to PartyDeck**
- **Scrubber as structure (`Scrubber.tsx`):** Let the scrubber track be a first-class hairline that also defines the instrument panel's baseline. During Connect/loading (`PowerOn.tsx`), the same line can fill as the progress indicator, then become the scrubber. One line, two jobs.
- **Type discipline:** One display family in one or two weights for title and artist; hierarchy by size (title ≫ artist) and tight tracking (−0.03 to −0.05em at display sizes). Pair it with the mono for time. This fits the CSP plan (self-hosted @fontsource, 1–2 files).
- **Rail and settings micro-interaction:** A per-glyph roll on the active rail label, or on the settings button's "Settings ↔ Close", is cheap (transform only, Motion stagger ~20–30ms) and gives the one persistent control some character.
- **Queue (`Queue.tsx`):** Stepped/numbered depth like the staircase menu: now playing = tallest/brightest tile, then "next" slightly smaller, then the rest as plain rows.
- **Corner anchoring:** Pin tiny, fixed, low-contrast meta to viewport corners on the Deck (e.g. device bottom-left, clock/battery-free time bottom-right) instead of floating chips.

**Do not transfer**
- The WebGL fluid text reveal and MorphSVG silhouettes: heavy libraries (GSAP plugin set, three) for a one-time effect. We have Motion.
- The white/Swiss palette as-is (we're dark). Take the discipline, not the colours.
- Barba/Lenis page architecture: PartyDeck is an SPA with in-place screens.

---

## 06 · L.I.S.A. — Locomotive Interactive Super Assistant

**What it is:** Locomotive's (Montreal) conversational "AI assistant" site: a 3D character with a CRT-TV head guides visitors to projects, careers and contact. Awwwards SOTD on 16 Sep 2026, with Developer Award; credits Locomotive and 60fps; tags WebGL, GSAP, Blender; palette #000/#FFF.
**Observation: blocked, then partial.** `lisa.locomotive.ca/en` returned **HTTP 403** and a Cloudflare "Performing security verification → Verify you are human" challenge on desktop and mobile (`$R/06/M-load-d.png`). I did not try to bypass it. Everything below comes from the public Awwwards page and its 4 hosted screen-recordings (`$R/06/el-1..4.mp4`, contact sheets `el-*-sheet.png`). The recordings are in French. **I measured no CSS values. No fonts were measured.**

- **Layout (from recordings):** A cool gray gradient stage. The character is centred-right, cropped at the shoulders. The conversation column is on the left at about a third of the height, set in small sans. Header: "Locomotive®" and a glyph on the left, an inline comma-separated nav "Projets, Agence, Carrières, Store" in the centre, "Contact" underlined on the right. Bottom-left: a round restart/refresh icon. Bottom-right: a vertical capsule with two small round controls.
- **Typography:** A neutral grotesk for everything (face not measurable). The nav is a single sentence-like line of links separated by commas.
- **Navigation:** Conversation *is* navigation: L.I.S.A. asks, and white **pill-shaped reply chips** offer paths: "Commencer un projet", "Rejoindre l'équipe", "Laisser un mot", "Découvrir notre culture", "Nous écrire un courriel ↗" (read from a full-res frame, `$R/06/el-4-chips.png`). The chips appear only **after** the line finishes typing. The hovered/selected chip **inverts to a black fill with white text**. There is also a free-text input with a small send button.
- **Motion (observed in recordings):**
  - L.I.S.A.'s line **types out character by character with a solid block cursor ▮**.
  - When a new message arrives, the **previous message moves up, shrinks slightly, dims to gray and blurs** (`$R/06/el-4-f5-crop.png`: previous line clearly blurred above the crisp current line).
  - The TV screen reacts: glowing round eyes, glitching text ("…tive-" / "Design & Code" lists), scanline video montages, eye "blink" bars.
- **Interaction:** Chips for quick answers, typing for free answers. The screen content changes with the conversation topic.
- **Visual language:** Monochrome UI (black/white on gray). All colour comes from the TV's screen content (CRT glow, RGB scanlines, glitch).
- **Spatial:** Fixed stage, no scroll in what was recorded. Depth comes from the 3D character only.
- **Technique:** Per Awwwards: WebGL (3D character modelled in Blender), GSAP. The CRT screen shows video textures with scanline/glitch shaders **(inference from the look)**.

**Intentional details**
1. **Past text blurs instead of scrolling away.** Recency is shown with focus (sharp = now, blurred = before) while context stays on screen.
2. **Block-cursor typewriter** gives machine "voice" and pacing without an avatar speaking.
3. **Colour is quarantined to one "screen."** The UI chrome is monochrome and only the TV has colour, so the eye goes there.
4. **Nav written as a sentence** ("Projets, Agence, Carrières, Store"), which is calm, editorial and small.

**Transferable to PartyDeck**
- **Lyrics reader (`Lyrics.tsx`):** Sharp current line, previous lines dimmed and *slightly* reduced in scale/opacity (blur optional, very light, and only on non-artwork text). The same "focus = now" language L.I.S.A. uses for conversation, applied to synced lyrics. Keep the next line visible but quieter.
- **Colour only in the artwork:** PartyDeck's equivalent of the TV screen is the album art, which is unaltered and full-colour, with the entire instrument panel monochrome and one accent at most. That makes the artwork the only colourful "screen" on the Deck, and it follows the Spotify rule by design.
- **Empty and connection states in a typed voice:** Welcome/Connect copy, or "No active device" guidance, typed in with a block cursor (short, ≤1 line, skippable, reduced-motion = instant) gives the appliance a voice without illustration.
- **Reply-chip pattern in Search:** Recent/suggested queries as pill chips under the search field.

**Do not transfer**
- A 3D character or video textures: large payload and GPU cost; wrong for a daily tool.
- Blur (`filter: blur`) on large or many elements every frame. Keep any blur to a few text lines, test on low-end phones, or drop it for opacity only.
- Chat as navigation: a music remote needs direct manipulation, not dialogue.

---

## Matrix

| Reference | Layout | Typography | Motion | Interaction | Visual Treatment | Technique | Useful for PartyDeck |
|---|---|---|---|---|---|---|---|
| 01 [untitled] iOS (Mobbin blocked; App Store + site) | Big square art → title row with play key → rows. Editor: waveform, 3-key transport, tool tray | Untitled Sans 500/400, −0.03em everywhere; **mono for measurements** (BPM, time, %) | Not observable (stills). Short `.1–.15s` press | "Hold to loop" printed on key; tick-rail sliders with value at end | Grayscale + **one yellow accent for "live"**; grouping by fill, not lines | Native iOS; site = Tailwind | **High**: mono time, single live accent, tick-rail volume, verb-on-key transport |
| 02 Columbia 100 | Single stage, no scroll; logo digits → 3 hub items; mobile → bordered cards | Trade Gothic Bold 90/80, −0.05em caps, copper; Ivar italic accents; vw tokens | 5s mask pull-back intro; digits morph into nav; in-out-quart .5–.75s, colour 1s linear | Line-by-line underline draw; **contextual caption swaps on hover** | Ecru paper, copper, radial glow, clip-path masks | Nuxt 3, CSS clip-path + transitions | **Med**: shared-element continuity, contextual caption, named easing set. Not masks on art |
| 03 Meer Mohsin | Full-bleed hero, fixed bottom bar, long red/black sections | Stack Sans Headline (ExtraLight/Reg) + Ruthie script; 228px marquee | Script counter preloader; wings converge; grain `steps(6)` 90ms; Lenis | Click-to-activate audio; **40-bar meter = status + mute**; two-part cursor | Red/black only; animated grain; difference/screen blends | three.js r180 ×3 canvases, Lenis, split chars | **Low–Med**: play-state bar meter, live-dot device chip, cheap grain on chrome only |
| 04 The Tie-break! | Everything aligned to **tennis-court lines** over defocused photo | Instrument Serif italic 112px + Work Sans 300/400 12–13px | Navy wipe-up loader; 2s fades, **110ms stagger**; swift-out `.17s` UI | One-sentence tutorial beats w/ **inline keycaps**, "Next →"; tiny Start | Defocused photo + grain, white hairlines, yellow hover token | Custom WebGL canvas, device-tier classes | **High for tutorial/onboarding**: sentence-per-step, inline control glyphs, calm stagger |
| 05 bleibtgleich | **Hairline spine** + corner-pinned wordmark; stepped indents | Akzidenz Grotesk Pro **500 only**, 90/0.88, −0.05em; body 14/1.07 | Loader % + **spine grows as progress bar**; fluid-ink text reveal; staircase menu drop | **Per-letter text roll** on Menu pill; numbered stair panels | Black/white/gray, hairlines as structure | Webflow, GSAP 3.15 (+SplitText, MorphSVG), Lenis, Barba, three r128 | **High**: scrubber-as-progress-line, one-family discipline, rail label roll, corner anchoring |
| 06 L.I.S.A. (site blocked; Awwwards recordings) | Gray stage, 3D TV-head right, chat column left, sentence nav | Neutral grotesk (unmeasured); comma-separated nav | Typewriter + block cursor; **past lines blur/dim**; CRT glitch | Reply chips + free text; screen reacts to topic | Monochrome UI; **colour only inside the TV screen** | WebGL + GSAP + Blender (per Awwwards) | **Med–High**: lyrics focus/recency, colour-only-in-artwork, typed empty states |

## Most representative screenshots (lead designer)

`$R` = `/private/tmp/claude-501/-Users-ishan-Data-partydeck/feceaba9-5e43-4a2f-a64e-4b5fd15ab349/scratchpad/research`

- **01:** `$R/01/appstore-strip.png` · `$R/01/as-3.jpg` (dark editor, mono and accent) · `$R/01/d-load-6500.png` (Mobbin wall, evidence)
- **02:** `$R/02/M-trans.png` (intro → logo-becomes-nav) · `$R/02/C-hover-quiz.png` (underline draw) · `$R/02/M-mobile.png`
- **03:** `$R/03/M-load-d.png` (script counter preloader) · `$R/03/M-click.png` (post-gate hero) · `$R/03/C-bottom.png` (sound meter)
- **04:** `$R/04/M-load-d.png` (loader → court landing) · `$R/04/M-start.png` (tutorial beats + countdown) · `$R/04/C-instruction.png`
- **05:** `$R/05/M-reveal.png` (loader spine → ink reveal → staircase menu) · `$R/05/C-menupill.png` (letter roll) · `$R/05/M-scroll-d.png`
- **06:** `$R/06/el-4-sheet.png` (conversation sequence) · `$R/06/el-4-f5-crop.png` (blurred past line) · `$R/06/M-load-d.png` (Cloudflare block, evidence)

Sources for the public info used on the blocked refs: [App Store – [untitled]](https://apps.apple.com/us/app/untitled/id6445854828), [untitled.stream](https://untitled.stream/), [Awwwards – L.I.S.A.](https://www.awwwards.com/sites/l-i-s-a), [Awwwards – Locomotive](https://www.awwwards.com/locomotive/).
