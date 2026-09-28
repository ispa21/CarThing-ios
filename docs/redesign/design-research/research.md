# Design research: method and synthesis

Three research agents inspected the 18 references in a real browser (Playwright, desktop 1440×900 and mobile 390×844). For each site they captured the load sequence, several scroll depths and hover states, and measured computed type, colour, easing and library use. Per-reference findings live in:

- [refs-a.md](refs-a.md): 01 [untitled] (via App Store; Mobbin was login-walled), 02 Columbia 100, 03 Meer Mohsin, 04 The Tie-break!, 05 bleibtgleich, 06 L.I.S.A. (Cloudflare-blocked; Awwwards recordings)
- [refs-b.md](refs-b.md): 07 Colonia Zacamil, 08 HOBRO, 09 Lando Norris, 10 Opal, 11 Igloo, 12 Waterworks (via Wayback)
- [refs-c.md](refs-c.md): 13 fuck.investments (unreachable), 14 Axis Mundi, 15 Andrea Perato, 16 United Fabric, 17 überraum, 18 Viso Haus

The consolidated table is [reference-matrix.md](reference-matrix.md). The direction built from it is [design-direction.md](design-direction.md).

## What the references have in common

Almost none of these sites is a tool. They're portfolios, microsites and games, so most of their machinery (WebGL scenes, preloaders, smooth-scroll libraries, custom cursors) doesn't transfer. What does transfer is the discipline underneath them:

1. **Colour budget.** The strongest sites are monochrome plus one accent with one job (01's yellow, 09's lime, 18's mint, 17's butterflies). For PartyDeck, the album art is the only colourful object, and amber means "live" and nothing else. This is also the easiest way to stay inside Spotify's artwork rules.
2. **Mono for measurements, sans for names.** 01, 11, 12 and 17 set every measurable value (time, BPM, counts, filenames) in a mono, and names in the display face. It reads as an instrument.
3. **Scale contrast, one family.** 05 uses one face at one weight and gets hierarchy from size and position alone. 02 and 09 run display type far larger than body. The generic look comes from a compressed scale; the fix is a real marquee size next to tiny faceplate labels.
4. **Structure that is also function.** 05's loader hairline becomes the page spine. 04's tennis court is both decoration and grid. 01's sliders are tick rails. The equivalent for a music appliance is the dial: the scrubber drawn as a tuning scale.
5. **Honest, recoverable state.** 14 boots through a real "No Signal" screen. 16's destructive "kill switch" is a countdown with Cancel. 08's loader advances on real steps. PartyDeck should show standby, errors and waiting as states of the device, not generic empty boxes.
6. **Motion carries state, on one rhythm.** 09 runs everything on one curve; 14 on a 200 ms integer scale; 12 on expo-out. Their best micro-interactions are text rolls that change a label (05, 09, 18), not decoration. Long intros (02, 03, 05) are acceptable once for a portfolio and wrong for a tool opened many times a day.
7. **Continuity over cuts.** 02 turns its logo into its navigation; 18 docks the wordmark into the header. Things should keep their identity across states: the lamp that travels between tabs, a track arriving from the side you skipped toward.

## What doesn't transfer, and why

| Pattern | Seen in | Why not |
|---|---|---|
| Full-screen WebGL / three.js scenes | 03, 04, 07, 11, 14, 16, 17, 18 | GPU and battery cost on the phones PartyDeck lives on; nothing in a remote control needs 3D. |
| GSAP plugin stacks, Lenis, Barba | 05, 08, 03 | The app is short screens and in-place state, not long scroll pages. Motion (already installed) and CSS cover every animation we need. |
| Preloaders and multi-second intros | 02, 03, 05, 08 | The deck must be usable the instant it opens. Arrival choreography is allowed once, on first-run Welcome. |
| Custom cursors | 03, 07, 08 | Touch-first; a lagging cursor reads as input latency. |
| Blurred, masked, cropped or tinted artwork | 02, 04, 07 | Spotify requires artwork uncropped and unaltered. The ambient colour is sampled into a separate light *behind* the cover instead. |
| Looping meters and tickers | 03, 07, 16 | A fake audio meter would lie (no audio data from Spotify), and the codebase forbids looping animation beyond the coach halo. |
| Site-generated sound, audio gates | 03, 17 | PartyDeck controls the user's own music; its only sounds are the quiet interface cues. |
| Hover-only affordances | 07, 14, 18 | Touch devices have no hover. Every state must be reachable by tap and keyboard. |
