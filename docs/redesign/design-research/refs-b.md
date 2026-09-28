# Design research, set B (refs 07–12)

Researcher: design-research-agent (B). Captured 2026-09-28 with Playwright at 1440×900 desktop and iPhone 14 (390×844, isMobile, hasTouch, mobile UA).
Screenshots live in `/private/tmp/claude-501/-Users-ishan-Data-partydeck/feceaba9-5e43-4a2f-a64e-4b5fd15ab349/scratchpad/research/<nn>/`, written `$R/<nn>/…` below.
Rules followed: everything here was seen in a screenshot or measured with `getComputedStyle`, stylesheet walks, `document.fonts` or DOM inspection. Anything inferred is marked **(inference)**.

Tooling note: the WebGL sites (07, 09, 11) stalled in the headless-shell SwiftShader renderer, with screenshots timing out. I re-ran them in the full "Chrome for Testing" build in headless mode with `--use-angle=metal`, which reports the renderer `ANGLE Metal Renderer: Apple M5`. They then rendered at full fidelity.

Coverage at a glance:

| # | Site | Observation |
|---|------|-------------|
| 07 | coloniazacamil.com | **Complete**: intro, Discover transition, 3D scene, HUD, hover. Desktop and mobile. |
| 08 | hobro.digital | **Complete**: loader, hero, scroll, nav hover, cursor. Desktop and mobile. |
| 09 | landonorris.com | **Complete**: loader, hero, scroll, button hovers, menu open. Desktop and mobile. |
| 10 | op.al | **Complete**: type-in reveal, video, scroll, footer canvas. Desktop and mobile. |
| 11 | igloo.inc | **Complete visually** (WebGL renders via Metal). All UI is drawn inside WebGL, so there is no DOM text to measure. |
| 12 | waterworksproject.nl/en | **Partial.** The live site is broken: an infinite `302 → /en` loop from Cloudflare (`ERR_TOO_MANY_REDIRECTS`, also confirmed with curl). I fell back to the Wayback snapshot `20250816040936`. CSS and fonts load, but the SvelteKit JS fails under the archive rewrite (`Unexpected token '{'`), so the intro overlay never dismisses and the Mapbox map never renders. I removed the `.intro` overlay by hand to see the server-rendered layout. Hover (pure CSS) works. JS motion was **not observed**. |

---

## 07 · Colonia Zacamil (coloniazacamil.com)

**What it is:** An interactive 3D documentary map of a housing estate in San Salvador, with an audio-first intro gate, a three.js neighbourhood model, story pins and a time-travel control. **Observation: complete.**

- **Layout:** The intro is one viewport (`scrollHeight` = 900). A single type line reads `FLY  TO  [rounded video window]  ZACAMIL`. The video window sits between the words with rounded corners (about 24px), and a tiny `[POWERED BY CMS]` mono tag is pinned above the Z. Below that are a centred `Discover ●` pill and two lines of serif copy ("Zacamil is more than just buildings. / Activate audio for the full experience."). On mobile the line wraps to `FLY TO / [video] / ZACAMIL`, stacked, with the button near the bottom (`$R/07/m-mob.png`). After Discover, a full-viewport WebGL scene has a HUD at top centre and bottom centre.
- **Typography (measured):** Display face `Heathergreen` 400, 187.2px, line-height 210px, uppercase, black (an ultra-condensed grotesk). Serif copy in `Reckless Neue` 400. The button is `Roboto Mono` 16px/21px in #EBE6E0 on black. HUD labels are uppercase mono in wide letterspacing. That these match Roboto Mono is **(inference)** from the glyph shapes.
- **Navigation:** No page nav. The HUD is the nav: `▶ WATCH SERIES | ROUTES` and `∿ | ◉` at the top; `‹ [thumbnail] [PRESENT] ›` plus a day/night contrast toggle at the bottom. Story pins sit in the 3D world.
- **Motion (observed frame by frame):**
  - **Load:** Desktop frame 0 (GPU) is full-bleed aerial footage with a white geometric "ZACAMIL" logotype. By 300ms the intro composition has resolved. Mobile frame 600ms shows the video full-bleed behind the black type. At 1500ms it has contracted into the rounded window between the words (`$R/07/m-mob.png`, frames 2→3). The CSS includes `clip-path 1.3s cubic-bezier(0.645,0.045,0.355,1)` and `max-width 0.8s cubic-bezier(0.645,0.045,0.355,1)`, which fits a clip or width contraction.
  - **Discover click** (`$R/07/m-exp-click.png`): at 0ms the button is still in its hover state. At 300ms the video window washes out. At 700ms the whole intro is about 50% faded and "TO" slides toward ZACAMIL as the window collapses. At 1200ms the screen is blank off-white. At 2000ms a grey instruction overlay appears ("click and drag to explore" | "scroll to zoom in & out", "click on the pins ● to learn more"). By 3000ms it fades by itself. At 4500ms the 3D scene appears washed-out grey. At 7000ms it is in full colour with the HUD. The scene **develops** from grey to colour over roughly 2.5s.
  - **Measured curves:** `cubic-bezier(0.25,1,0.5,1)` (easeOutQuart) is the dominant curve, 200 uses, for 1–1.5s transforms. `cubic-bezier(0.645,0.045,0.355,1)` (easeInOutCubic) is used for clip-path, height and max-width. `cubic-bezier(0.55,0.055,0.675,0.19)` (easeInCubic) is used for 0.4–0.7s exits. The stagger series is `opacity .6s ease-in-out` with delays of 0 / .05 / .1 / .15 / .2 / .25s. Transitions use `var(--delay)`. Keyframes `scaleScroll`, `scalePinch`, `pinchTranslate` and `translateY` run as 4s loops. These are the gesture-hint glyph animations **(inference from names and the instruction overlay)**.
- **Interaction:**
  - **Discover pill** (`$R/07/m-hover-discover.png`): on hover the label shifts right 20px (measured `matrix(1,0,0,1,20,0)`) and the ring-dot knob travels from the right end to the left end. It reads like a slide switch.
  - **Custom cursor** in the scene: about a 55px thin black ring with small ◂ ▸ ▾ arrow ticks, a "drag to look" affordance.
  - **Sound glyph:** a sine wave whose phase changes between frames (`$R/07/m-hud.png`), a live "audio on" indicator.
  - **◉ button:** its inner dot sits off-centre toward the bottom-right. That it tracks look direction is **(inference)**.
- **Visual language:** Warm off-white #EBE6E0 ground, pure black type and controls. Pin accents are #B48E46 (gold) and #8D7CAB (lavender). The HUD is solid black pills with #EBE6E0 text. The 3D render has visible fine grain in the sky.
- **Spatial:** The HUD pills are **joined by liquid necks**: "WATCH SERIES" and "ROUTES" are two pills fused by a concave bridge, and so are the ∿ and ◉ circles. The DOM shows these are SVG shapes (`svg.svg-navigation-bubble`, 17×33) with path states `arrow-snap-1/2` (visible) and `arrow-unsnap-1/2` (`display:none`). That the neck animates apart ("unsnaps") when a group separates is **(inference)**. The label markup holds two spans, "Watch series" and "Series". That it collapses to the short label in a compact state is **(inference)**.
- **Technique:** Nuxt (Vue) and three.js r162 on one full-viewport canvas. JS writes `--vh / --dvh / --svh` onto `<body>`. Console: "Sixtyfps app version 2.0.1". No GSAP or Lenis. Motion is CSS transitions plus WebGL.

**The details that make it feel intentional**
1. **Grouping by fused shape, not dividers.** Related controls share one black silhouette with a pinched waist. You read them as one instrument with two keys, not two buttons.
2. **The media settles into the headline.** The footage becomes a word-sized window in the sentence "FLY TO ▭ ZACAMIL".
3. **The tutorial retires itself.** The gesture glyphs play for about 1.5s, fade on their own, and the world takes over. There is no "Got it" button.
4. **An audio-state glyph that moves.** The ∿ icon is a living waveform, so "sound is on" is visible at a glance.

**Transferable to PartyDeck**
- **Rail (`app/Rail.tsx`):** Draw Home · Search · Queue · Lyrics as **one fused black shape with necks between segments** and settings as a separate blob, instead of four buttons plus separators. Static SVG necks (or CSS radial-gradient notches in a stylesheet) cost nothing at runtime. Animating the neck is optional.
- **Device chip (`app/DeviceSheet.tsx` trigger):** Add a small **live waveform glyph** that animates its phase only while playing and goes flat on pause. It is a cheap SVG `stroke-dashoffset` or transform loop, and it should pause on `prefers-reduced-motion`.
- **Practice tutorial (`onboarding/Tutorial.tsx`):** Use looped gesture glyphs (ring plus arrow ticks for swipe, a pulsing dot for tap) with one lowercase caption, and let each hint **fade by itself once the gesture is performed**.
- **Welcome / PowerKey (`onboarding/PowerKey.tsx`):** Borrow the Discover pill's **travelling knob**: the dot moving from one end to the other reads as a physical switch. Apply it to the power key's press or hold confirmation.
- **Deck entrance:** The "media settles into its slot" idea is allowed only as a **uniform scale or translate of the whole, uncropped art** into its frame. No clip-path or window crop on the art.

**Do not transfer**
- **Grey-to-colour "develop" effect:** that is a filter on imagery. On album art it would break the unaltered-artwork policy.
- **The 3D world and the drag cursor:** portfolio-grade weight, and the cursor means nothing on touch.
- **The audio-gate "Activate audio for the full experience" intro:** PartyDeck is a tool opened many times a day. One gate at first run is enough, which Welcome already is.

---

## 08 · HOBRO Digital (hobro.digital)

**What it is:** A Calgary agency site: loader, video hero, an animated services list, and case studies. **Observation: complete.**

- **Layout:** Hero: full-bleed blurred video (a face in warm red and orange), `HOBRO DIGITAL` edge to edge, a centred three-line mono sub-caption, and a top bar with the `HD●` logo left and `Projects / Services`, `Agency`, `Contact` spread across the right. A sticky "capabilities deck" toast sits bottom-right. The page is long (`scrollHeight` 15,803px desktop / 18,298 mobile) and alternates black and white sections (`$R/08/m-desk-scroll.png`).
- **Typography (measured):**
  - Hero: `Kamerik205` 700 in white. Its size is not captured in the typo dump **(inference: roughly 130px from the screenshot)**.
  - "WHAT" outline italic: `FreigBigProLigIta` 300 italic, 217.5px, line-height 191.4px, letter-spacing −2.175px (−0.01em), uppercase.
  - Body: `PPNeueMontreal` 400/500, 16/24. Paragraphs 18px/21.6px, −0.27px (−0.015em).
  - Buttons and captions: `AkkuratMonoLLWeb` 14px 500 uppercase.
  - Tokens: `--font-title` Kamerik, `--font-text` Neue Montreal, `--font-cursive` Freight Big italic, `--font-typewriter` Akkurat Mono.
- **Navigation:** Text links only. On scroll the header gains a white bar and the `HD` Lottie mark swaps to the `HOBRO` wordmark (`$R/08/m-desk-scroll.png`, frames 1–2). Mobile uses a hamburger.
- **Motion (observed):**
  - **Loader:** a white horizontal bar with `LOADING...` inside it grows from the left edge across the viewport over about 5.5s. Frames at 2.5s, 3.2s, 3.7s, 4.2s, 4.7s and 5.3s show about 11%, 13%, 13%, 15%, 36% and 39% of the width in the 0.4× montage. It is uneven, so it tracks real asset loads **(inference: 60 `<video>` and 210 `<img>`)**. The hero is up at 6s (`$R/08/m-reveal.png`).
  - **Services list:** as a row crosses the viewport centre it **inverts into a black rounded pill** with two tiny mono tags pinned left and right (`SPEED … Web & Development … SCALABILITY`; mobile `TONE … Branding … IDENTITY`, `REALISM … 3D / Motion … MOVEMENT`).
  - **"WHAT WE DO":** an outlined italic serif "WHAT" overlaps heavy "WE" and "DO", with a typing caret `|` (`span.wwd__text-cursor`). The paragraph types out, and mobile caught it mid-sentence: "…move our cl".
  - **Measured:** `--anim-default-time .75s`, `--anim-default-delay .27s`. `cubic-bezier(0.785,0.135,0.15,0.86)` (easeInOutCirc) for `clip-path 1s`, `transform 1.2s` and `opacity .6s`. UI transitions are 0.3s ease-out/ease-in-out.
- **Interaction:**
  - **Two-state custom cursor:** at rest a 6px #00FB96 green dot. Over any `.cursor__trigger` a thin white ring of about 36px appears around the dot (`$R/08/m-nav.png`). Over the dot grid the cursor carries a black pill label `HOVER • •`.
  - **Nav link hover:** the word rolls up out of its line box. The mid-roll frame shows "Contact" shifted up and clipped.
  - **Capabilities button hover:** text colour goes from white to rgb(76,76,76) with a `filter .3s` transition.
- **Visual language:** Pure black and white. The brand green #00FB96 appears only as the cursor dot. There are 13 `mix-blend-mode` rules and 15 `filter` rules. The toast is a grainy, frosted grey card with a circular outlined × (`$R/08/desktop-cursor-center.png`). Case filters show counts in parentheses in mono: `BRANDING (7) WEB (13) PRODUCT (5)`.
- **Spatial:** A strict 4-column grid for the capability list. The case grid is three equal cards with mono captions under them (`BRIDGE HEALTH`).
- **Technique:** GSAP 3.12.7 with ScrollTrigger, ScrollSmoother, SplitText, CustomEase, CustomBounce, Draggable, Inertia and MorphSVG. Also Lenis 1.3.4, dotLottie (logo), body-scroll-lock, flatpickr, Sortable and reCAPTCHA. Pages are server-rendered with a custom `main.js`.

**The details that make it feel intentional**
1. **The active item becomes an object.** The focused service isn't underlined, it turns into a solid pill carrying its own metadata tags. The list reads like a rotary selector.
2. **A loader that tells the truth.** The bar's growth is uneven, like real progress, and the label lives inside the bar.
3. **Brand colour as the smallest thing on the page.** #00FB96 exists only as a 6px cursor dot.
4. **Counts as typography:** `WEB (13)` in mono inside parentheses.

**Transferable to PartyDeck**
- **Queue (`screens/Queue.tsx`, `ui/MediaRow.tsx`):** Show the now-playing row as an **inverted pill with two mono tags flanking the title** (e.g. `NOW` left, remaining time right) rather than a highlight colour. The artwork thumbnail stays outside the pill's tint, unaltered.
- **Search filters and PlaylistShelf (`screens/Search.tsx`, `screens/PlaylistShelf.tsx`):** Put counts in mono parentheses, e.g. `PLAYLISTS (24)`.
- **Connect (`onboarding/PowerOn.tsx`):** Make the progress indicator honest, a bar that advances on real steps (token → SDK ready → device found) with the status word inside the bar, instead of an indeterminate spinner.
- **TV and desktop focus:** Use the two-state affordance idea without the custom cursor. Focus rings appear only on interactive targets and grow around the focused key.

**Do not transfer**
- **The 5.5s preloader, 60 videos, and ScrollSmoother/Lenis scroll-jacking:** all bad for a tool opened many times a day.
- **Custom cursors:** there is no pointer on touch, and they add JS work per frame.
- **Blend-mode headers over video:** anything similar over album art would alter it.

---

## 09 · Lando Norris (landonorris.com)

**What it is:** The F1 driver's official site by OFF+BRAND: a lime loader, an interactive 3D-helmet hero, and editorial scroll sections. **Observation: complete.**

- **Layout:** Hero: a centred portrait cut-out on off-white with faint topographic contour lines. The `LANDO / NORRIS` lockup sits top-left, the `LN` monogram top-centre, and a lime `🔒 STORE` button plus a square outlined menu button top-right. A `NEXT RACE` card with the circuit outline (Singapore GP) and a notched corner sits bottom-left. Scroll sections: a huge marquee statement behind a photo with a lime signature drawn over it; a centred manifesto mixing serif and sans; a floating photo collage with tiny captions (`QATAR, 2024`); "ON TRACK / OFF TRACK"; a helmet grid; a store promo (`$R/09/m-desk-scroll.png`, `$R/09/m-mob.png`).
- **Typography (measured):**
  - `Brier` 700: the serif display, used for emphasised words in lime ("REDEFINING", "WINS", "LEGACY").
  - `Mona Sans Variable` 200–900: heavy caps and all UI. Body 14px/20px.
  - Tokens: `--text--impact 7.9375rem`, `--text--h1 4rem`, `--text--h2 4.5rem`.
  - Fluid scaling: `--fluid-font = clamp(992px,100vw,1920px) / 1728 × 16`, re-based per breakpoint.
  - Buttons contain the label twice ("Store / STORE") for the roll effect.
- **Navigation:** Menu button → full-screen overlay: a 2×2 photo grid on the left, and on the right `HOME / ON TRACK / OFF TRACK / CALENDAR` in heavy caps, a laurel mark, and a social row (`$R/09/m-hero-menu.png`, frames 4–7).
- **Motion (observed):**
  - **Loader:** a flat lime (#D2FF00) field with a tiny `LOAD NORRIS` label bottom-centre. At about 1.5–3.5s the `LN` monogram draws in at centre. By 3.5s the hero is up and a sponsor-livery visor sweeps over the face (3D) (`$R/09/m-desk-load.png`).
  - **Scroll:** the **page background interpolates between sections**, dark green #282C20 → grey-green → off-white, while you scroll. The marquee type drifts. The collage photos parallax at different rates.
  - **Menu open:** at 100ms the dark-green curtain drops from the top with a **convex curved bottom edge**. At 400ms the photos reveal with curved bottom edges, and the nav words rise from masks line by line (the mid-frame shows `HOME` complete and `ON TRACK` half-risen). At 900–1600ms small lime dashes animate at the bottom. The menu icon morphs from its two-line glyph to ∿ to ×.
  - **Measured:** a single motion token, `--cubic-default: cubic-bezier(0.65, 0.05, 0, 1)` with `--duration-default: 0.75s`. It is applied to `fill`, `color`, `border-color`, `background-color`, `clip-path`, `transform` and `opacity`. There is essentially one curve for everything. Lenis `lerp: 0.1`, `smoothWheel: true`.
- **Interaction** (`$R/09/m-hover.png`):
  - **Store button:** the label **rolls**. The mid-frame shows the outgoing "STORE" sliding up with the duplicate following from below.
  - **Menu button:** a **lime fill enters from the top with a curved leading edge** and floods the square.
  - **Hero:** a 3D wireframe helmet around the head responds to the pointer. On mobile this becomes an explicit `TAP TO LOCK` button with a hand icon, which is a deliberate touch substitute for hover.
- **Visual language:** Dark green #282C20, off-white #F4F4ED, lime #D2FF00 (plus lime-off #B2C73A and orange #FF6B00). Radii tokens are 1rem, 3rem and 6.25rem. The topographic line texture is very low contrast. Photos are sometimes duotone-desaturated in the collage and menu. Cards have chamfered or notched corners; the helmet cards (mobile) have a notch tab cut into the top edge.
- **Spatial:** Heavy use of `clip-path` (96 elements with inline clip-path) for reveals. The current page in the menu is shown with a **lime strikethrough through "HOME"**.
- **Technique:** Webflow + jQuery + custom bundle (`lando-by-OFF+BRAND.05.js`). three.js r174 (hero helmet). Rive runtime (`window.rive`, 21 canvases, which drive the menu icon morph and small animated icons). Lenis.

**The details that make it feel intentional**
1. **One easing, one duration.** Every colour, fill, clip and transform uses the same `0.75s cubic-bezier(0.65,0.05,0,1)`. The whole site moves with one "breath".
2. **Curved leading edges.** Fills and curtains arrive with a bulging front, so they feel poured rather than slid.
3. **An explicit touch substitute for hover** (`TAP TO LOCK`) instead of silently losing the interaction on phones.
4. **"You are here" as a strikethrough.** The current page is crossed out because you don't need to go there.

**Transferable to PartyDeck**
- **Motion tokens (`ui/motion.ts`, `styles/tokens.css`):** PartyDeck already has 4 CSS easings plus 3 springs. Norris shows the payoff of collapsing non-spring motion to **one signature curve**. Consider making `--ease-expo` the single "PartyDeck breath" and retiring the others where they aren't doing distinct jobs.
- **Label changes on keys and chips (`ui/PressKey.tsx`, device chip):** Use a **text roll** (outgoing label slides up and out, incoming label rises in) for state changes, not hover. Examples: play⇄pause caption, device name on transfer, shuffle state. A clipped `overflow:hidden` line box plus Motion `y` is enough.
- **Hold-to-confirm (`PressKey`, `PowerKey`):** Show a **fill that rises with a curved leading edge** while holding (e.g. hold to transfer playback, hold to power on). It is an honest progress-of-hold indicator.
- **DeviceSheet (`app/DeviceSheet.tsx`, `ui/Sheet.tsx`):** A sheet or curtain edge with a slight convex curve while in motion, settling flat at rest.
- **Queue history:** Played tracks could get a thin strikethrough ("done"), echoing Norris's current-page strike.
- **Art-derived ground (`ui/useArtColor.ts`):** On track change, **interpolate** the ambient tint over the signature duration instead of snapping. That is Norris's section-colour interpolation applied to time instead of scroll.
- **Anything hover-only on desktop or TV gets an explicit touch toggle**, the Tap to Lock principle.

**Do not transfer**
- **The WebGL helmet hero and the Rive runtime:** a new dependency, and Motion + SVG already covers icon morphs.
- **Lenis smooth wheel:** it fights native touch scroll inertia on phones.
- **Duotone or desaturated photos:** that would alter album art.
- **Chamfered or notched card corners:** only acceptable on containers that don't clip the art (e.g. the device chip). Never on an artwork's own frame.

---

## 10 · Opal Electronics (op.al)

**What it is:** Opal's company-announcement page "the table": a single editorial letter over an overhead video of their workbench, ending in a dot-matrix wordmark footer. **Observation: complete.**

- **Layout:** A black page with a narrow centred text column (roughly 300px at desktop) over a full-viewport looping overhead video of objects on a table. Mobile: the video sits in the top half behind the title, and the text runs below. The `opal electronics` logo is fixed top-left. Footer: a giant dot-matrix "opal" (1400×666 canvas), then links (Support, Terms, Privacy, Jobs, Contact) (`$R/10/m-desk-scroll.png`, `$R/10/m-mob.png`). Document height is 3,656px.
- **Typography (measured):** `Die Grotesk C` 400/700 only. Title h2 48.93px / 53.83px, 700, letter-spacing 0.98px (+0.02em). Body 20.97px / 23.07px, +0.42px (+0.02em). The title and body are both lowercase-led and sentence-like ("the table"). The type is tightly leaded (line-height about 1.1) even for body copy.
- **Navigation:** None beyond the logo and footer links.
- **Motion (observed, `$R/10/m-type.png`):**
  - The title **types in character by character**: each char is a `<span style="opacity:…; white-space:pre">`. Frames: at 550ms `t` in dark grey; at 900ms `the t` with trailing chars dimmer; at 1200ms `the tabl`. The date follows the same way. Body lines then fade from grey to white. The **video fades in last**, behind the settled text, at about 1.6–2.2s.
  - On scroll to the footer, the fixed logo translates up −80px out of the footer's way (measured `translate(0,-80px)`).
  - The footer canvas shows lit patches of brighter dots that differ between frames (`$R/10/m-canvas.png`, `cursor-crosshair`). That it is pointer- or ambient-driven is **(inference)**.
  - The CSS has no transition curves of note (Tailwind defaults). The motion is JS-driven inline opacity.
- **Interaction:** Almost none: a quiet reading page. The footer canvas uses a crosshair cursor.
- **Visual language:**
  - Black and white. **One accent used once**: "See you soon." in #FFDB00 yellow at the end of the letter.
  - The header uses `mix-blend-difference`.
  - **Film grain**: `/images/noise.avif`, a 200×200 tile at `opacity: 0.04`, animated with `noise 0.4s steps(1) infinite` (a stepped background-position jump), over the whole page.
- **Spatial:** A single reading column. The video is ambient context, never framed.
- **Technique:** Tailwind (utility classes and CSS variables). Video via Media Chrome/Mux: the console warns "Media Chrome: No style sheet found" and there is no light-DOM `<video>`, which is **(inference)** for a shadow-DOM player. Per-char span reveal. Canvas 2D dot-matrix footer. No GSAP, Lenis or three.

**The details that make it feel intentional**
1. **Text before image.** The words arrive first, one character at a time, and the video only fades in once you're already reading. Content leads and media supports.
2. **A trailing-opacity typewriter.** The newest characters are dimmer than the settled ones, so the reveal has a soft comet tail rather than a hard cursor.
3. **Grain at 4%, stepped at 0.4s.** It looks like film, and at 2.5 fps it costs almost nothing.
4. **An accent with a budget of one.**

**Transferable to PartyDeck**
- **Deck and Lyrics ground (`styles/deck.css`, `styles/lyrics.css`):** Add a **self-hosted grain tile** (≈200px AVIF/PNG in `/public`, referenced from a stylesheet so it works with CSP `style-src 'self'`) at 3–5% opacity on the *background layer only*, masked away from the artwork box. Step it at 0.4s. Pause it on `prefers-reduced-motion`, in low-power mode, or when the tab is hidden.
- **Deck load order:** Controls, title and time render immediately. The artwork **fades in only once decoded** (`img.decode()`), with no half-painted image and no layout shift. This is Opal's text-then-media order applied to the art.
- **Welcome / PowerOn headline (`onboarding/Welcome.tsx`):** Type the one headline in with a **trailing-opacity per-character reveal**, once, at first run only. For Lyrics, the same technique could sweep the *current line* by timing, but only if the per-char spans stay limited to one line (perf).
- **Accent budget:** One accent element per screen: the live playhead or the active key, never both competing.

**Do not transfer**
- **`mix-blend-difference` over media:** over art it changes the art's appearance, which breaks policy.
- **The dot-matrix canvas footer:** a continuous canvas loop for decoration. A *static* dot-matrix SVG wordmark on Welcome would get the look without the loop.
- **Tight 1.1 body leading:** fine for a letter, but it hurts legibility for track lists read at a glance.

---

## 11 · Igloo Inc. (igloo.inc)

**What it is:** A holding-company landing page by abeto.co: a single WebGL scene (a snow igloo, fog, a floating ice crystal) driven by scroll. **Observation: complete visually.** No UI exists in the DOM, so there was nothing to measure beyond the loader.

- **Layout:** One viewport (`scrollHeight` 900). Scroll scrubs a camera. The overlay UI is drawn *inside* WebGL: `IGLOO` wordmark top-left; `// Copyright © 2026 / Igloo, Inc. All Rights Reserved.` under it; `////// Manifesto` top-right with a right-aligned mono paragraph; `Scroll down to discover.` and `🔈 Sound: Off` bottom-left (`$R/11/m-x-scroll.png`, `$R/11/m-mob.png`).
- **Typography (measured):** `IBMPlexMono-Medium` / `-Regular` are declared as font data for the WebGL text. The DOM has 0 text nodes, 0 links and 0 buttons. The loader uses `monospace` 17px bold white.
- **Navigation:** None in the DOM. Scroll is the only navigation.
- **Motion (observed):**
  - **Loader:** a flat #A0A5B1 blue-grey field with a centred ASCII string produced by CSS alone: a `.ascii::before` whose `content` is animated by `@keyframes head` (5s infinite). The characters cycle like `----===+++` → `==--==++==` → `++===---==` (`$R/11/m-x-load.png`).
  - **Scene build:** a white plexus of lines and points assembles the igloo as wireframe (about 6.5–8s), which then resolves to the textured model on snow.
  - **Scroll:** the igloo's blocks lift and glow with numbered annotations. The camera then dives into fog with **chromatic aberration (RGB fringing)** and emerges at a floating ice crystal with leader-line labels.
  - **Text decode:** labels arrive by **scrambling through random glyphs** before resolving ("All Rights R8tf…", "IPSUGINKIaFJY+5 LQHC_ M0").
  - "Scroll down to discover." disappears after the first scroll.
- **Interaction:** Scroll-scrub and a sound toggle (off by default, labelled in words).
- **Visual language:** Monochrome blue-grey. Every overlay element is small mono. Glow, bloom, fog and RGB split live in the render.
- **Technique:** A Vite bundle with three.js r165. Text is rendered in WebGL (SDF/MSDF is **(inference)**). The loader is pure CSS keyframes on `content`.

**The details that make it feel intentional**
1. **A loader with zero JS and zero images.** Pure CSS changing a pseudo-element's text reads as "machine thinking" and is on screen before any script runs.
2. **Decode-in text.** Labels "resolve" from noise, so information feels computed.
3. **A hint that retires on first use** ("Scroll down to discover.").
4. **State written as words:** `Sound: Off`, not just an icon.

**Transferable to PartyDeck**
- **Connecting / PowerOn state (`onboarding/PowerOn.tsx`):** A **CSS-only mono character loader** (e.g. `----===+++` cycling in Martian Mono) while the Spotify SDK and device come up. It lives in a stylesheet, so it is CSP-safe and needs no JS.
- **Device transfer (`app/DeviceSheet.tsx`, device chip):** When playback moves to another device, the **device name decodes in** (about 300ms, mono only), signalling "negotiating a connection". Keep it to this moment. Don't scramble track titles on every change.
- **Tutorial and first-run hints:** Every hint **retires after its first successful use** and never returns.
- **Settings and the device chip:** Write state in words next to icons where there is room (`Shuffle: On`, `Repeat: One`), mono and small.

**Do not transfer**
- **All-WebGL UI:** 0 focusable elements, invisible to screen readers and keyboard or TV-remote navigation.
- **Chromatic aberration, bloom and fog:** heavy GPU cost, and gimmicky in a daily tool.
- **Scroll-scrubbed camera:** PartyDeck screens aren't scroll stories.

---

## 12 · Waterworks (waterworksproject.nl/en), via Wayback 2025-08-16

**What it is:** An archive of 54 Japanese civil-engineering water sites on a Mapbox map, with a built-in "Waterworks Radio" audio player. **Observation: partial.** The live site loops `302 → /en` forever. In the archived copy the JS fails, so there is no intro motion and no map. What follows is the server-rendered layout, the CSS, and CSS-only hover.

- **Layout:** A full-viewport electric-blue field. The map would sit here, but it does not render in the archive. Top-left: `WATERWORKS  ( ABOUT )  EN / JP`. Top-right: `54 LOCATIONS` / `( SEE ALL )`. **Bottom-left: a radio transport** `PREV | PLAY | WATERWORKS RADIO | NEXT`. Bottom-right: map controls `N(compass) | + | − | ON`. On mobile the radio spans the bottom and the map controls stack above it (`$R/12/m-static.png`, `$R/12/m-static-mob.png`). The location list lives in an off-canvas drawer (measured at x=1440, width 0), opened by `( SEE ALL )`.
- **Typography (measured):** **One face at one size**: `IBM Plex Mono` 500 (with "IB Plex Sans JP" fallback for Japanese), 11.25px / 12.94px, uppercase everywhere, white.
- **Navigation:** Parenthesised text buttons: `( ABOUT )`, `( SEE ALL )`, `( ALL )`. Language switch `EN / JP`. The **active language, EN, is rendered nearly invisible** (dark blue on blue), while the available option JP is white.
- **Motion (measured from CSS; JS not observed):**
  - Expo-out `cubic-bezier(0.19,1,0.22,1)` at 0.35s and 0.5s for transform, width and left.
  - easeOutQuad `cubic-bezier(0.25,0.46,0.45,0.94)` at 0.1–0.5s for colour, opacity, box-shadow and background.
  - `opacity .75s ease-in-out 1s` (a delayed intro fade).
  - A `marquee` keyframe, 20s linear, `paused`. That it scrolls long track or station names when the radio plays is **(inference)**.
- **Interaction (observed, `$R/12/m-radio-hover.png`):**
  - **Bracket-on-hover.** Each key is `<span aria-hidden>(</span> Label <span aria-hidden>)</span>`. At rest the parens sit at `opacity:0`, translated inward by ±6.75px. On hover they fade in over 0.1s (easeOutQuad) and **slide outward** over 0.5s (expo-out) to bracket the word: `PREV` → `( PREV )`. The active item keeps its brackets (`( ABOUT )` shows them at rest).
  - **Location pin buttons:** built from **four `<i>` strokes** (1×6.75px and 6.75×1px) forming a crosshair, each with `transform .35s cubic-bezier(0.19,1,0.22,1)`. That they morph (plus → corner brackets or ×) on toggle is **(inference)**.
- **Visual language:** Ground `rgb(50,0,255)` (#3200FF). Key tiles are `rgba(0,0,0,0.2)`, **a darker tint of the ground, not a new colour**, with 4.5px radius, 40.94px height and 14.85/5.4px padding. There are no borders, shadows or icons in the transport. Pin tiles use `backdrop` styling with a 0.2 black tint.
- **Spatial:** Controls live only at the four corners. The centre belongs to the content (the map).
- **Technique:** SvelteKit (`_app/immutable`), Tailwind utilities, Mapbox GL (the `mapboxgl-*` keyframes are present). Motion is CSS transitions.

**The details that make it feel intentional**
1. **A radio built from words.** PREV / PLAY / NEXT are text keys of equal height, and the station name is itself a wide key in the same row. The transport is typography.
2. **Parentheses as the focus state.** Brackets appear and spread apart around what you're pointing at. The typographic device *is* the hover and active indicator.
3. **Tiles tinted from the ground** (black at 20%). The chrome is always the same hue family as whatever it sits on.
4. **Icons built from strokes that can move** (the four-tick pin), so they transform instead of swapping.

**Transferable to PartyDeck**
- **Rail focus and TV d-pad focus (`app/Rail.tsx`, `app/shortcuts.ts`):** Use **brackets that fade in and spread** as the focus or selected indicator, e.g. `( QUEUE )`. It needs no hover, so it works on touch, keyboard and TV remote. It is two pseudo-elements in a stylesheet (CSP-safe), with a 0.1s opacity and 0.35–0.5s `--ease-expo` spread.
- **Tinted-ground keys (`ui/PressKey.tsx`, `styles/controls.css`):** Derive key fills from the ground (`color-mix()` of the art-derived tint with black at about 20%) instead of a fixed grey. Keys then sit in the same colour family as the art-tinted Deck without touching the art.
- **Lyrics or TV compact transport:** A text-key row, `PREV | PLAY | [track title key] | NEXT`, where the title key can marquee when it overflows (pause the marquee when not playing).
- **Icons (`ui/Icon.tsx`):** Build play/pause and add/close from **a few strokes animated with transforms**, so state changes morph rather than cross-fade.

**Do not transfer**
- **One 11.25px size for everything:** below glanceable size for a Car Thing-style appliance used at arm's length or across a room. Keep the Deck's large type hierarchy.
- **"Active = dimmed" (EN):** it inverts a convention users rely on, and it would confuse the Rail. At most use it where the options are clearly toggles.
- **Mapbox or any map:** not relevant.

---

## Matrix

| Reference | Layout | Typography | Motion | Interaction | Visual Treatment | Technique | Useful for PartyDeck |
|---|---|---|---|---|---|---|---|
| 07 Colonia Zacamil | Type-line with inline video window, then full-screen 3D with a centred HUD | Heathergreen condensed caps 187px, Reckless Neue serif, Roboto Mono UI | Media contracts into its slot. Grey→colour scene develop. easeOutQuart 1–1.5s, easeInOutCubic clips, 0.05s staggers | Knob-travels pill hover, drag-ring cursor, live ∿ sound glyph, self-retiring gesture hints | Warm #EBE6E0 plus black. HUD pills fused by SVG liquid necks | Nuxt + three r162, CSS transitions | **High**: fused Rail shape, live waveform on device chip, self-retiring tutorial glyphs, travelling knob on PowerKey |
| 08 HOBRO | Full-bleed video hero, long alternating B/W sections, 4-col grid | Kamerik205, Freight Big Light Italic (outline), Neue Montreal, Akkurat Mono | Honest progress-bar loader (~5.5s), scroll-activated pill rows, typed caret text. easeInOutCirc 1–1.2s | Dot→dot+ring cursor, text-roll nav | Pure B/W, brand green only as 6px dot, grainy frosted toast | GSAP (+ScrollSmoother, SplitText, MorphSVG…), Lenis, dotLottie | **Med-high**: inverted now-playing pill with mono tags, honest connect progress, mono (count) chips |
| 09 Lando Norris | Centred portrait hero, editorial collage, full-screen menu | Brier serif 700 (accent words) + Mona Sans Variable 200–900, fluid scale token | **One curve for all: 0.75s cubic-bezier(.65,.05,0,1)**, curved-edge curtains, section-bg interpolation, line-mask menu | Text-roll buttons, curved lime fill, Tap-to-Lock touch substitute, strikethrough "you are here" | Dark green, off-white, lime. Topo lines, notched cards | Webflow, three r174, Rive, Lenis | **High**: single signature easing, text-roll for state labels, curved hold-to-confirm fill, tint interpolation on track change |
| 10 Opal | One reading column over an ambient video, dot-matrix footer | Die Grotesk C 400/700 only, +0.02em, tight 1.1 leading | Per-char trailing-opacity type-in, text first then video fades in | Almost none, crosshair canvas footer | Black/white, one yellow accent used once, 4% grain stepped 0.4s | Tailwind, Mux/Media Chrome, canvas 2D | **High**: background-only grain, art fades in after decode, one-accent budget, Welcome type-in |
| 11 Igloo | Single WebGL scene, corner overlay text | IBM Plex Mono in-canvas (no DOM text) | CSS-content ASCII loader, plexus build, scroll-scrub camera, decode-in text | Scroll plus sound toggle only | Monochrome blue-grey, bloom, fog, RGB split | three r165, Vite, WebGL text | **Medium**: CSS-only mono loader for Connect, decode-in device name on transfer, hints that retire, state-as-words |
| 12 Waterworks (archived) | Map field with controls only at the corners, radio bottom-left | IBM Plex Mono 500 11.25px uppercase, one size | Expo-out 0.35–0.5s transforms, easeOutQuad 0.1–0.25s fades (JS motion unseen) | Parentheses fade in and spread on hover/active, 4-stroke morphing pin | #3200FF ground, keys = 20% black tint of ground, 4.5px radius | SvelteKit, Tailwind, Mapbox GL | **High**: bracket focus state (touch/TV-safe), ground-tinted keys, text-key radio row, stroke-built icons |

## Most representative screenshots (for the lead designer)

`$R` = `/private/tmp/claude-501/-Users-ishan-Data-partydeck/feceaba9-5e43-4a2f-a64e-4b5fd15ab349/scratchpad/research`

- **07:** `$R/07/m-hud.png` (fused-pill HUD, live ∿ glyph) · `$R/07/m-exp-click.png` (Discover → tutorial → scene develop) · `$R/07/m-mob.png` (mobile load: full-bleed video contracts into the word-window)
- **08:** `$R/08/desktop-cursor-center.png` (hero, dot+ring cursor, toast) · `$R/08/m-desk-scroll.png` (services active-row pill with flanking tags) · `$R/08/m-mob.png`
- **09:** `$R/09/m-hover.png` (Store text roll, curved lime menu fill) · `$R/09/m-hero-menu.png` (curtain with curved edge, masked nav rise, strikethrough current page) · `$R/09/m-desk-scroll.png` (section background interpolation)
- **10:** `$R/10/m-type.png` (trailing-opacity type-in, then video) · `$R/10/m-desk-scroll.png` · `$R/10/m-canvas.png` (dot-matrix footer)
- **11:** `$R/11/m-mob.png` (ASCII loader → plexus → igloo, decode glitch) · `$R/11/m-x-scroll.png` (scroll-scrub, blocks, RGB fog) · `$R/11/m-x-load.png`
- **12:** `$R/12/m-radio-hover.png` (bracket-on-hover radio keys) · `$R/12/m-static-mob.png` (mobile radio plus map controls) · `$R/12/m-static.png`
