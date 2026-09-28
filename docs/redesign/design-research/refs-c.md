# Design research — references C (13–18)

Researcher: design-research-agent (C) · Captured 2026-09-28 · Playwright (chrome-headless-shell 1243 for the standard pass; full "Chrome for Testing" 1243 headless for the video/WebGL re-runs on 16, 17, 18)
Screenshots: `/private/tmp/claude-501/-Users-ishan-Data-partydeck/feceaba9-5e43-4a2f-a64e-4b5fd15ab349/scratchpad/research/<ref>/` (below, `research/` means this folder).
Per ref: desktop 1440×900 + iPhone 14 (390×844, touch, mobile UA); frames at 0 / 600 / 1500 / 3500 / 6000 ms after DOMContentLoaded; six wheel/scroll steps; hover before/mid/after; measurements from `getComputedStyle` + stylesheet walk (`desktop-data.json` / `mobile-data.json`), plus a scripted interaction pass per site (`c*.js`).

**Legend.** *Observed* = seen in a screenshot or measured. *Inference* = my reading, labelled as such.
**Overall finding.** None of refs 14–18 scrolls. Every one has `documentElement.scrollHeight == innerHeight` on both viewports. Each is a single fixed "stage" or "appliance": a scene, a spreadsheet, a globe, a 3D tour, an object field. They are useful as models of a *screen you operate*, which PartyDeck is. They are not useful as models of long-scroll choreography.

---

## 13 — fuck.investments — **BLOCKED**

- **What it is:** unknown. The site could not be reached.
- **Observation:** none. DNS resolves to `24.199.113.235`, but TCP connections to :443 and :80 time out (curl, 30 s) and are refused from Anthropic's fetcher (`ECONNREFUSED 24.199.113.235:443`). Both Playwright runs landed on `chrome-error://chromewebdata/`. The Wayback Machine CDX lookup returned nothing and `web.archive.org/web/2025/...` answered 403 from this network. Web search turned up no gallery listing.
- **Transferable / Do not transfer / matrix:** n/a. I reported nothing I didn't see. If the lead wants this ref, someone needs to retry it from a normal browser later.

---

## 14 — Axis Mundi (axis-mundi.co) — **complete (desktop + mobile)**. The nav *clicks* were blocked by overlay hit-targets (see Interaction).

**What it is:** a brand-strategy studio site built as one photographic tabletop *scene*. A projector throws the "about" copy onto a tripod screen, surrounded by props: a flour pile, a rock, dough on a yellow board, cut wood, a banana, a chrome ball, a red arcade button, a sticky note and two small "remotes".

- **Layout.** A single fixed 100vw×100vh stage with no scroll. The logo is top-left (the letters "AM" as two black glossy 3D prisms). A "get in touch" yellow sticky note bleeds off the top edge at the right. The projector screen is the content panel at the centre. Nav is centred at the bottom. Props are cropped by the viewport edges on purpose, which makes the scene feel bigger than the screen.
  **Mobile** is *re-composed*, not scaled. It uses separate components (`SkyMobile`, `BallMobile`, `FlourMobile`, `BeamerMobile`). The projector screen becomes a portrait card filling about 75% of the height, the nav moves *inside* the screen at the top, and the projector body sits below it like a base (`14/mobile-load-6000.png`).
- **Typography.** One self-hosted face, family name masked as `font` (next/font local, woff2 + woff, 400 only). Its fallback is metric-matched: `"font Fallback"` = `local(Arial)` with `size-adjust:101.07%`, `ascent-override:95.28%`, `descent-override:23.45%`.
  Nav: 18px / 22.5px, `letter-spacing:0.9px` (0.05em), lowercase.
  Projected copy: 26px / 32.5px (1.25) desktop, set in perspective to match the screen's skew.
  The --font-family token is `Arial,sans-serif`.
  **Observed on mobile:** the projected paragraph fades from black to grey line by line down the screen, like light falloff from the beam. I did not isolate the mechanism.
- **Navigation.** `about · inquiries · clients · team`, lowercase. The active item is black with an underline, inactive items are grey `rgb(81,81,81)`, and hover changes colour (`color 0.2s`). The items are `DIV`s with `cursor:pointer`, not links or buttons. "get in touch" is a sticky note: on hover it swaps its label for the email address (`:hover` toggles `display`).
- **Motion (measured).**
  - **Token scale:** `--motion:200ms`, `--motion-double:400ms`, `--motion-triple:600ms`, `--motion-quadruple:800ms`, `--motion-quintuple:1000ms`. Transitions use them: `opacity var(--motion)`, `clip-path var(--motion-triple)`, `transform/opacity/visibility var(--motion)`, `all var(--motion-triple)`.
  - **Boot keyframes:** `MainText_appear` 2s forwards shows the screen's "No Signal / Source: Computer (Auto)" blue test screen, then hides it. `MainText_delayed-appear` fires at 0.5s and 2s, `MainText_scale` at 4s (to `scale(1)`), and `Navigation_delayed-appear` at 2s.
  - **Ambient keyframes:** `Rock_slide-out` 5s ease-in-out (the rock falls out of frame to `translate3d(-30vw,200vh) scale(4)`, blinks off at 88–89%, and re-enters from `3vw,-15vh`). `Sun_pan` is **300s linear**: a sun glow drifts from `-40vw,40vh` to `100vw,0`. `Beamer_pulse` is **0.15s infinite, opacity 1 → 0.97**, a projector-beam flicker.
  - **What the frames show:**
    - 0 ms: bare sky gradient, logo, sticky note, nav.
    - 1500 ms: the props are in place and the screen shows the blue "No Signal" source screen (`14/desktop-load-1500.png`).
    - 3500 ms: blank white screen, as if warming up.
    - 6000 ms: the copy is projected (`14/desktop-load-6000.png`).
- **Interaction.**
  - Every prop is a hit target. Hovering a prop's `clickTarget` fades in a handwritten annotation with a drawn arrow, e.g. "Lateral ideas, beautifully rendered" on the flour pile and "Load symbols carry the spirit of the times" on the dough (`14/c-m-a.png`).
  - Pressing the **red arcade button** (embossed "CREDS") makes glossy spherical "cred" bubbles appear within about 120 ms: purple "Report 2 March 2025 — Exiting the friend zone", green "Report 1 July 2023 — Is the novel a bourgeois form?", white "New Info Sept 2025 — Hostile Semiotics", and black "Axis Mundi Creds".
  - The two "remotes" (a colour-swatch stick and an orange block with 15px green/purple buttons) define **both** `:hover{background-color:var(--hover-color)}` **and** `:active{background-color:var(--active-color)}`.
  - Full-viewport `clickTarget` divs (1440×1440) sit over the nav, so Playwright's accessible click on "inquiries/clients/team" failed. That is an a11y and hit-testing weakness.
- **Visual language.** Hyper-real photographic props (cut-out PNGs and alpha videos) on a flat gradient sky (`#469BFF` blue down to a pale grey floor), with soft contact shadows. Accent swatches: `#03003D`, `#B95BFF`, `#02412F`, `#6E3A2B`, `#FF8A00`, `#A0D195`, `#8381FF`. Text is pure black. There is no grain, and 22 elements use `clip-path`.
- **Spatial behaviour.** A fixed diorama. Depth comes from overlap, cast shadows and cropping, not from parallax (no scroll or pointer parallax observed).
- **Technique.** Next.js (app router, CSS Modules), three.js r149 with 4 WebGL canvases. The console shows "Updating pivot for object: Scene 1 / Directional Light 2 / Boolean…", which is *inference:* the Spline runtime. Six `<video>` props use `ball.mp4` (`hvc1`) plus `ball.webm` (*inference:* HEVC-alpha for Safari and VP9-alpha for Chrome). Images go through `next/image`. No GSAP, Lenis or smooth-scroll.

**The details that make it feel intentional**
1. **The boot is a device powering on.** The screen shows a *real* projector "No Signal / Source: Computer (Auto)" test screen, goes blank, then shows content. Load time becomes a believable hardware state instead of a spinner.
2. **The beam flickers with a 0.15s, 3% opacity pulse.** It is barely perceptible, but it is the one sign that the scene is "on". A 300s sun pan does the same job at a geological tempo.
3. **Durations come from one integer-multiple scale** (200 × 1–5). Everything feels related because it is.
4. **Every physical control has a separate *pressed* colour, not just a hover colour** (`--active-color`), and the responsive layout re-stages the scene for portrait instead of shrinking it.

**Transferable to PartyDeck**
- **Deck, disconnected or idle state:** make "no device" a device-honest *signal* state in the instrument panel. For example, show the device chip's own "No active device · Source: Spotify Connect" screen instead of an error toast, then let the title/artist "come on" when playback attaches. The panel is a screen and should behave like one.
- **Motion tokens:** adopt a 5-step integer scale (for example 120/240/360/480/600 ms for a touch tool, as multiples of one base) and use only those. Map press feedback to step 1, panel changes to 2–3, and the one-time boot to 4–5.
- **Transport keys:** give each key a distinct `:active` / pressed treatment (colour plus depth). Hover is irrelevant on touch; *pressed* is the whole feedback channel.
- **Staged cold launch, once per session:** art first, instrument panel second, rail last (Axis staggers 0.5s → 2s → 4s; PartyDeck should compress this to under 600 ms total). Hierarchy is conveyed by *arrival order*.
- **Practice tutorial:** handwritten-style annotations with a drawn arrow pointing at the real control, appearing on the control, instead of modal coach-mark cards.
- **Portrait / tablet / TV:** re-compose the Deck per form factor rather than scale it, the way Axis moved the nav *into* the screen on mobile.
- **"Live" cue:** at most one tiny ambient element (for example the device-chip LED) may pulse while playing, as CSS opacity only, paused when not playing and under `prefers-reduced-motion`.

**Do not transfer**
- Photographic props, Spline/three.js and alpha video: heavy on phones, and a portfolio device, not a tool.
- Infinite 150ms flicker on anything large: battery cost and visual noise over hundreds of daily sessions.
- Nav as `div`s and full-screen invisible hit-targets: they broke automated clicks, and PartyDeck's rail must be real buttons.
- Any perspective skew or "projected" treatment applied to album art: artwork must stay unaltered.

---

## 15 — Andrea Perato (andreaperato.com) — **complete (desktop + mobile)**. I could not measure computed type inside the cross-origin sheet.

**What it is:** a designer's CV and portfolio that is *literally a published Google Sheet*, embedded full-viewport in an `<iframe>` (1440×900, `border:0`) from `docs.google.com/spreadsheets/.../pubhtml`.

- **Layout.** Spreadsheet chrome is kept visible: a column-letter header (A…Q), row numbers down the left, gridlines and the sheet title "Andrea Perato" at the top.
  - *Personal* tab: column A is a merged cell holding a **dithered, halftoned grey portrait**. Columns B–F hold Name/Surname/Mail/Telephone (masked `***********36`)/Address, then About / Techniques / Skills, Clients (inline blue links), Links, Lecturing and Inspiration.
  - Row 21 is a black band with white "Schedule a meeting with me" and a red calendar link. Row 23 is a black band: **"MENU AT THE BOTTOM OF THE PAGE"**.
  - Columns G–Q are narrow and **painted with black-filled cells to form pixel letters** (a partial "OPEN FOR…").
  - *Professional* tab: Company / Time / Role / Description / Location.
  - *Portfolio* tab: NOME / SKILL / LINK / DESCRIPTION / GALLERY. The header of the last column is literally `→→→→→→→→→→→`, pointing into a horizontally scrolling image gallery.
- **Typography.** Visually Google Sheets' default Arial at about 13px, with bold headers and 16–18px bold project names on the Portfolio tab. I did not measure these: the frame query returned no styled `td`. The outer page links `style.css` with `a:hover{text-decoration:line-through;color:red}`, and has commented-out Google Fonts for UnifrakturCook / Vampiro One and a Typekit kit. The site's `h2` rule leaks into the iubenda cookie banner.
- **Navigation.** The native sheet tabs at the bottom (`Personal · Professional · Portfolio`) are the site nav. The in-sheet "MENU AT THE BOTTOM OF THE PAGE" row is a copy-based signpost to them.
- **Motion.** None of the site's own. The only transitions measured belong to the iubenda cookie banner (0.3–0.6s). Frames: 600 ms blank white with only the cookie banner fading in, then the sheet paints (`15/desktop-load-600.png` → `15/desktop-load-6000.png`).
- **Interaction.** Native spreadsheet behaviour: cell links, tab switching, and horizontal and vertical scrolling of the grid (`15/c-tab-Portfolio.png`, `15/c-tab-Professional.png`).
- **Visual language.** White ground, grey gridlines, black text and blue links, with black bands for emphasis. Imagery is the dithered portrait and full-colour product photography in the gallery column.
- **Spatial behaviour.** The grid is the space: rows and columns are the coordinate system, and the arrows in the header tell you the grid continues sideways.
- **Technique.** Static HTML shell, a Google Sheets "publish to web" iframe, iubenda cookie consent and GA. jQuery 1.6.3 is requested over http and blocked as mixed content. A `perri_glitch.png` og-image exists. The owner edits the site by editing a spreadsheet.

**The details that make it feel intentional**
1. **Honest medium.** It doesn't pretend to be a website. Row numbers and column letters become the grid system *and* the joke.
2. **Pixel type made from cells.** The display type is built from the same unit as the data grid, so there is no second typographic system.
3. **Signposting in the content itself** ("MENU AT THE BOTTOM OF THE PAGE", `→→→→` in a header) instead of UI affordances.

**Transferable to PartyDeck**
- **Queue:** treat it as a *table*, not cards. Use a fixed index column (tabular or monospaced figures), strict column alignment for title / artist / duration, and hairline row rules. The row number is real, useful information: "3 up next".
- **Search → playlist shelf:** when a row scrolls horizontally, put a direction glyph in the row header (Perato's `→→→`) so the overflow is announced, not discovered.
- **Welcome / Connect or the loading state:** if PartyDeck wants a display-type moment, build it from the UI's own grid unit, for example a dot-matrix wordmark from the same 4/8px module, echoing a hardware LED matrix. Treat this as *optional*.
- **Empty states and the tutorial:** plain declarative signposts in content ("Queue is empty — add from Search ↓") rather than extra chrome.

**Do not transfer**
- Iframing a third-party document: CSP (`frame-src` and style) and performance.
- Dithering or halftoning photos. It must **never** be applied to album art (Spotify policy), and a dithered non-art image beside the art would compete with it.
- Default blue underlined links and a cookie banner covering a quarter of the screen: a tool used many times a day can't afford either.

---

## 16 — United Fabric (unitedfabric.org, "CLOTHING OF THE WORLD") — **mostly complete**

**Observation notes.** Desktop in headless-shell stalled on the logo video (no H.264). The full-Chrome re-run saw the whole flow. On mobile the WebGL globe did not paint in headless-shell (blank stage), so the mobile globe was not seen.

**What it is:** a political apparel label's store. The storefront is a product grid over a rotating three.js globe of "places reached", with a live funding ticker and a "KILL SWITCH".

- **Layout.**
  - The top is a full-width red ticker bar.
  - Below it: `INFO` and `SPECIAL PROJECTS` stacked top-left, and `CART (0)` top-right.
  - The centre is the globe stage.
  - Bottom-centre is an inverted black block, `^ FULL COLLECTION ^`, which works as a drawer handle. `KILL SWITCH` is bottom-right.
  - After load, the collection opens *automatically* as a dimmed overlay: a 5-column grid of cut-out garments, name plus price under each, and a red square `X` close button (`16/c-full-load-9000.png`).
- **Typography.** `FontInaiMathi` (self-hosted via next/font; `.ttf` desktop decode warning: "OTS parsing error… cmap") plus Roboto and Arial Narrow variables on `body`. Measured:
  - nav: 700 26px / 36.4px, uppercase or all-caps copy
  - product name: 700 14px / 18.2px
  - price: 600 14px / 21px
  - ticker: 500 20px / 30px
  - (mobile) 700 20.6px / 28.84px nav and 500 10px / 15px product text
  - Body fallback: `Arial, Helvetica, sans-serif`.
- **Navigation.** Four words at the corners of the viewport (INFO, SPECIAL PROJECTS, CART (n), KILL SWITCH) plus the drawer handle. All are `button`s with 0 radius and 0 padding, except FULL COLLECTION (`padding:0 18px`, `bg #1a1a1a`, text `#f2f2f2`).
- **Motion.**
  - **Load (full Chrome):** 0 ms blank; 600 ms the arched "UNITED FABRIC · TISSU DE L'UNITÉ" wordmark and a red AK appear; 1500 ms a white dove flies in; 3500 ms the parts lock into the badge "THINGS FALL APART"; about 6000 ms the store UI appears with the collection overlay already open (`16/c-m-load.png`). The logo sequence is a video (`/logo_anim_v3.mp4`).
  - **Transitions:** `opacity 0.2s`, `opacity 0.18s`, `transform 0.25s, background-color 0.25s`, `background 0.2s, color 0.2s`, `max-height 0.3s`, `background 0.3s ease-in-out`. No custom cubic-beziers.
  - **Ticker:** the marquee container's inline `translateX` read −48 → −75 → −103.5 → −129 → −159 → −189 px across samples about 1.65 s apart. *Estimate:* about 17 px/s, JS-driven (CSS `animation:none`).
  - **Hover:** product card `translateY(-2px)` plus a 12% light wash. `allProductsButton:hover{opacity:.7}`.
- **Interaction.**
  - Close X → the globe is revealed. The globe is draggable: I dragged it and it rotated to Europe (`16/c2-m.png`). City pins are yellow dots inside magenta concentric rings, with small labels ("New York, US", "Paris, FR", "Berlin, DE"…). Curved text on the globe reads "CLICK ON CITY NAMES — A MESSAGE FROM".
  - **KILL SWITCH** opens a white box: "THIS SITE WILL SELF-DESTRUCT AND ERASE ALL DATA IN **1** / TO CANCEL, PRESS THE BUTTON BELOW / [CANCEL]". It is a live countdown (`16/c-click-KILL_SWITCH.png`), and the cancel button hovers to red `rgb(193,39,45)`.
- **Visual language.** Off-white `#f2f2f2` ground, near-black `#1a1a1a`, one red `#c1272d` (ticker, X, destructive hover). Square corners everywhere. Garments are cut out on transparent backgrounds. The globe is pale beige landmass on white, with pins in the only saturated colours.
- **Spatial behaviour.** Layered planes: the ticker is fixed; the collection overlay dims the globe (the globe keeps rendering behind it); modals sit centred.
- **Technique.** Next.js with Turbopack chunks and SCSS modules; three.js r183 with one canvas (1440×900); a video loader. No GSAP or Lenis.

**The details that make it feel intentional**
1. **Real numbers in the ticker** ("Development Funding: $34 300 | Places Reached: 21"). The ambient motion carries *state*, not decoration.
2. **A destructive action shown as a visible countdown with one CANCEL**, not "Are you sure?".
3. **A drawer handle that says what it is** (`^ FULL COLLECTION ^`, inverted block, chevrons both sides) and is always pinned in the same spot.

**Transferable to PartyDeck**
- **Deck:** one persistent status line fed by real state (device · volume · shuffle/repeat · "n in queue"). Keep it static by default, and marquee a field *only* when it overflows, as a long track title does on the Car Thing.
- **Settings → "Disconnect Spotify" / Queue → "Clear queue":** an in-place 3-2-1 countdown with a single large Cancel, instead of a confirm dialog. It is faster on touch, and the undo window is visible.
- **Deck ↔ Queue:** a pinned, self-describing drawer handle (for example `︿ QUEUE · 12 ︿`) as an alternative to or alongside the rail item, so the queue reads as "beneath" the Deck spatially.
- **Wordmark on Welcome:** the power key or wordmark could *assemble* from its parts once, on first run only. Budget under 1 s and do it with Motion, not video.
- **Color discipline:** neutral ground, one ink and one alarm colour reserved for destructive or error states.

**Do not transfer**
- Auto-opening an overlay on every load: hostile in a tool opened many times a day.
- The WebGL globe, and a constantly running marquee (perf and distraction).
- A video loader, which also failed in a codec-limited browser here: a loader that depends on a codec can block the whole app.

---

## 17 — überraum (uberraum.com, "UberWeb3D – v07") — **complete (desktop + mobile)**. Hotspot content after a click did not load in time; I saw a blank dark panel.

**What it is:** an architecture/design practice presented as a navigable grayscale 3D moonscape: two 3D-scanned busts, a huge moon, floating primitives and flying butterflies.

- **Layout.** A full-bleed 3D viewport. The "überraum" wordmark (a humanist sans with a macron, white) is top-left. On desktop a small mono nav row follows it: `more...   bkg_01  bkg_02  bkg_03  sound on`. The sound-choice panel sits mid-screen at first.
- **Typography.** `Roboto Mono` 400 14px, colour `#ccc` for the dialog body. `IBM Plex Mono SemiBold` 700 12px, white, for controls and nav. The loader is a mono typewriter. On mobile the audio prompt is `Tahoma` 300 20px ("Enable audio?") with `YES`/`NO` 18px buttons (3DVista's default skin).
- **Navigation.** Filename-style labels (`bkg_01…03`). The selected one is a solid grey chip; the others are bare text (`17/c2-crop-nav.png`). "sound on/off" is a persistent toggle label.
- **Motion.**
  - **Loader:** black screen, white mono **typewriter with a block cursor**: `loading▍` → `loading ...` → `click on us or` → `catch butterflies ...▍`. Measured from frames, about 60 characters in about 4.5 s (*estimate* ~13 chars/s). The wording tells you how to use the scene before it appears.
  - **Scene:** butterflies flap and fly paths, and primitives drift.
  - **CSS:** only `opacity 0.5s`.
- **Interaction.** Drag to look around (rotated about 90° in my test, `17/c2-m.png`). The cursor is a custom `url(https://uberraum.com/lib/cursors/grab.cur)`. Sound is **off by default** and must be opted into, via a translucent grey box ("by default the sound is turned off. we encourage you to turn on the sound for the full experience.") with `sound on` / `sound off` bars (`17/c-crop-dialog.png`). Clicking a scene hotspot opened a tall dark panel with a thin `×`.
- **Visual language.** Everything is monochrome grey (busts, terrain, primitives, moon) on black sky with a few star points. **The only chroma comes from four small butterflies** (blue, orange, yellow, black and white). Panels are flat translucent grey rectangles with no radius or shadow.
- **Spatial behaviour.** A first-person 3D space. The UI floats as flat 2D labels on top.
- **Technique.** A **3DVista** virtual-tour player (console: "3DVista Player v:2059"), three.js r151, dozens of small 2D canvases for text labels (`128x23`, `58x15`…) plus one WebGL canvas. A `preloadContainer` video poster sits behind the typewriter. No GSAP or Lenis.

**The details that make it feel intentional**
1. **Loading copy that onboards.** "click on us or catch butterflies" is typed while you wait, so the wait teaches the interaction.
2. **A colour budget.** The whole world is grey, so the butterflies (the interactive things) are the only colour and read as targets without any UI.
3. **A system voice in mono lowercase filenames** (`bkg_01`, `sound on`), separate from the brand voice (the wordmark).

**Transferable to PartyDeck**
- **Colour budget, the strongest one here:** keep all PartyDeck chrome neutral (greys on the dark UI) so the *only* saturated colour on the Deck is the album art, shown unaltered, plus at most one accent for the active or playing state. Colour then means "content" or "live".
- **Welcome / Connect, and "connecting…" states:** a one-line mono status with a caret that says what to do next ("connecting to spotify ▍" → "press the power key"). This is typed copy, not a spinner.
- **Second typographic voice:** a mono, lowercase "system" voice for meta values (device name in the chip, timecodes, settings values, queue index), distinct from the content face used for title and artist.
- **Settings:** show theme or background variants as a tiny segmented row with a solid chip for the selection (`bkg_01 bkg_02`). It is legible, dense and has no icons.
- **Defaults:** anything that makes noise (UI sounds, haptics if loud) defaults off, and PartyDeck asks once, in plain words.

**Do not transfer**
- 3D tour, drag-to-look, custom `.cur` cursor, flying butterflies: portfolio spectacle, heavy on phones, and irrelevant to touch.
- 3DVista's stock mobile dialog (Tahoma, generic YES/NO): an example of a third-party skin breaking the voice.

---

## 18 — Viso Haus (viso.haus) — **complete (desktop + mobile)**. The bottom-right toggle was not tested.

**What it is:** a WebGL development studio. The homepage is a black field of real-time 3D product objects (orange concept car, pink star-shaped stress ball, satellite, meteorite, a Lady Gaga figure, printer, brick phone, red tee, drink can), each one standing for a client project.

- **Layout.** A fixed full-viewport canvas. A fixed header holds the "viso haus" SVG wordmark (top-left, 103×18) and an `ABOUT` outline pill (top-right, 71×30). A two-line mono tagline sits centred ("Real-time 3D, motion, and interaction / engineered for the web"), and a small pill toggle is bottom-right. Objects are laid out in a loose grid and scroll *virtually* through the canvas; the document never scrolls.
- **Typography.**
  - `GT America` (500, self-hosted `__GTAmerica_36d514`): UI, 12px / 12px uppercase (`leading-none`).
  - `NT Bau Mono` (500, `__NTBauMono_6186eb`): tagline, 12px / 16px desktop and 10px / 15px mobile.
  - The wordmark is an inline SVG where **each letter is its own `<g>` with its own `transform-origin`** (`#v` 36px 50px, `#i` 88px 50px, `#s1` 139px 50px…).
  - A semantic DOM list of projects ("Lady Gaga website", "Tapestry Energy website"…, Arial 16px / 24px, `#171717` on `#000`, effectively invisible) mirrors the WebGL content.
- **Navigation.** `ABOUT` pill, logo button = home. Each object hover reveals the project label in the centre. Project routes are `/projects/<slug>`.
- **Motion.**
  - **Load:** 0 ms black; 600–1500 ms a large mint "viso haus" wordmark centred with the tagline under it; about 3500 ms the wordmark has **docked** into the header at 16px size, the ABOUT pill has appeared, and the stage is empty with the tagline kept centred as an anchor; about 6000 ms the objects arrive **out of focus** (large coloured bokeh blobs) and resolve to sharp (`18/c-m-load.png`, mobile shows the same in `18/c-m-mob.png`).
  - **Scroll:** objects travel with **directional motion-smear trails** (vertical streaks in `18/c-m-obj.png`), and settle to sharp when scrolling stops.
  - **ABOUT pill hover:** outline → filled mint (`#b0fb90`) with graphite text, `transition: color/background-color/border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)` (the Tailwind default). The label is split into per-letter `inline-block` spans with a duplicate row parked at `translateY(12px)` inside an `overflow:hidden` box, which is a **letter-by-letter vertical roll** on hover (`18/c-m-hover.png`). Header container: `opacity` with `will-change: opacity`.
- **Interaction.** Hovering an object puts a small outlined pill with its name ("LADY GAGA") and a one-line description ("A series of WebGL landing pages for Lady Gaga's MAYHEM era") in a **fixed central spot**, not at the cursor. Objects also react to the pointer (displacement and smear). The focus styles are real: `focus:ring-2 focus:ring-white`.
- **Visual language.** Pure black `#000` ground, a single accent `#B0FB90` (mint), text `#171717` in hover-inverted states, and `--scrollbar:#ffffff20`. The objects bring all the other colour. `backdrop-blur-lg` sits on the pill (lg breakpoint only).
- **Spatial behaviour.** A deep z-field. Depth of field (defocus) is used as a *loading* state and motion blur as a *velocity* state.
- **Technique.** Next.js on Vercel (`?dpl=` chunk query), Tailwind, three.js r169, one WebGL canvas. *Inference:* framer-motion, based on the inline `style="transform:none"` resting values on the per-letter spans and SVG groups and `will-change: opacity` on the header, which is the typical Motion signature. No GSAP or Lenis.

**The details that make it feel intentional**
1. **The wordmark docks.** It is introduced large and centred, then physically moves into its permanent header slot. The intro *becomes* the chrome.
2. **Blur is a state, not decoration.** Out of focus means loading, smear means moving, sharp means at rest.
3. **Labels appear in one fixed place**, the centre, whatever you hover. The eye never hunts.
4. **One accent colour on black**, plus a semantic DOM mirror of the WebGL content for accessibility and SEO (*inference* on intent).

**Transferable to PartyDeck**
- **Welcome → Deck:** the power key or wordmark on Welcome should *dock* into its permanent place (the rail's settings / home glyph) via a shared-element transition (Motion `layoutId`). The onboarding object becomes the chrome, so there is no hard cut.
- **Deck, track change:** a clipped vertical *roll* for the title/artist swap (old line out up, new line in from below, transform-only, 240–360 ms, `cubic-bezier(0.4,0,0.2,1)`). Per-letter stagger is optional and only on short strings.
- **Deck instrument panel as the "fixed label spot":** long-pressing a row in Search or Queue previews its details in the Deck's own title area (the same place every time) rather than in floating popovers.
- **State legibility through a single variable:** pick one property to mean "loading" (for example reduced opacity of the *panel*, never of the art), and use it everywhere.
- **Accent discipline:** one accent, used only for "active / on" (the playing key, the selected rail item, the power key lit).
- **Semantic mirror:** whatever is drawn decoratively (visualisers, dot-matrix type), the real controls and labels stay in the DOM as buttons.

**Do not transfer**
- Blur or defocus on album art, or smear trails over it: that alters the artwork (policy). `filter: blur` over large areas is also expensive on phones.
- Virtual-scroll WebGL fields: a portfolio device, not a tool.
- Hover-dependent reveals (letter roll, object labels) as the *only* feedback: PartyDeck is touch-first, so the equivalent must trigger on press or state change.

---

## Matrix

| Reference | Layout | Typography | Motion | Interaction | Visual Treatment | Technique | Useful for PartyDeck |
|---|---|---|---|---|---|---|---|
| 13 fuck.investments | — (unreachable) | — | — | — | — | Origin refuses connections | — |
| 14 Axis Mundi | Single fixed diorama; content on a projector screen; bottom text nav; re-composed for portrait | One masked custom face 400; nav 18px +0.05em lowercase; copy 26/32.5 | 200ms×1–5 token scale; boot "No Signal"→blank→content (0.5/2/4s); 0.15s 3% beam flicker; 300s sun pan | Props as buttons; handwritten hover annotations; red "CREDS" button; separate `--hover` / `--active` colours | Photo cut-outs on a blue-sky gradient; soft shadows; black text | Next.js, three r149 + Spline (inferred), alpha video, CSS keyframes | **High:** device-honest no-signal state, integer duration scale, pressed-state colours, arrival-order hierarchy, annotation tutorial |
| 15 Andrea Perato | Google Sheet as the site; row/column chrome kept; tabs as nav | Sheets default (~Arial 13px, not measured); pixel letters from black cells | None (site); banner only | Native cell links, tab switching, grid scroll | White grid, black bands, dithered portrait | Static shell + Sheets pubhtml iframe | **Medium:** Queue as a real table with index column; overflow glyph (`→→→`); in-content signposts |
| 16 United Fabric | Corner nav; centre globe; bottom drawer handle; auto-opened collection overlay | InaiMathi 700 26px nav / 700 14px names / 600 14px prices; caps | Video logo assembly (0.6→3.5s); 0.18–0.3s UI transitions; ~17px/s ticker (est.) | Drag globe; KILL SWITCH countdown + CANCEL; card lift −2px | `#f2f2f2` / `#1a1a1a` / red `#c1272d`; 0 radius | Next.js/Turbopack, three r183, SCSS modules | **High:** real-state status line, countdown-with-cancel for destructive actions, self-labelling drawer handle |
| 17 überraum | Full-bleed 3D tour; wordmark + mono nav row | Roboto Mono 14px, IBM Plex Mono SemiBold 12px; mobile Tahoma (stock) | Typewriter loader (~13 chars/s est.) with block caret; opacity .5s | Drag to look; sound opt-in; filename-style bg switches | Monochrome world; colour only on butterflies (targets) | 3DVista player, three r151, canvas labels | **High:** colour budget (art is the only colour), mono "system voice", typed status copy, sound off by default |
| 18 Viso Haus | Fixed WebGL object field; fixed header; centred tagline anchor | GT America 500 12px caps; NT Bau Mono 12px (tagline); per-letter SVG wordmark | Wordmark docks into header (~3.5s); bokeh→sharp load; motion smear; 300ms `cubic-bezier(.4,0,.2,1)` letter-roll pill | Object hover → centred label pill; outline→fill pill | `#000` + single mint `#b0fb90` | Next.js/Vercel, Tailwind, three r169, Motion (inferred) | **High:** onboarding-to-chrome docking, clipped title roll on track change, fixed info spot, one accent |

---

## Most representative screenshots (max 3 per ref)

All paths are under `/private/tmp/claude-501/-Users-ishan-Data-partydeck/feceaba9-5e43-4a2f-a64e-4b5fd15ab349/scratchpad/research/`.

- **13:** none (blocked).
- **14 Axis Mundi:**
  - `14/desktop-load-1500.png` (projector "No Signal" boot state)
  - `14/mobile-load-6000.png` (portrait re-composition; nav inside the screen)
  - `14/c-m-a.png` (montage: hover annotations + red-button "creds" bubbles)
- **15 Andrea Perato:**
  - `15/desktop-load-6000.png` (the sheet-as-site, pixel-cell lettering)
  - `15/c-tab-Portfolio.png` (`→→→` overflow header, gallery column)
  - `15/c-tab-Professional.png` (pure table)
- **16 United Fabric:**
  - `16/c-m-load.png` (logo assembly → auto-opened collection)
  - `16/c2-globe.png` (globe, ticker, drawer handle, KILL SWITCH)
  - `16/c-click-KILL_SWITCH.png` (self-destruct countdown + CANCEL)
- **17 überraum:**
  - `17/c-m-full.png` (typewriter loader → grayscale scene)
  - `17/c-crop-dialog.png` (sound opt-in panel, mono)
  - `17/c2-crop-nav.png` (`bkg_01` filename nav with selected chip)
- **18 Viso Haus:**
  - `18/c-m-load.png` (wordmark centred → docked → bokeh → sharp)
  - `18/c-m-obj.png` (object field, motion smear, centred "LADY GAGA" label)
  - `18/c-m-hover.png` (ABOUT pill outline → mint fill)
