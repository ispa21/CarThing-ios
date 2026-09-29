# The instrument — PartyDeck's design language

A printed plate with black keys on it. The machine takes the colour of the record.

## Materials and colour
- **Plate** `--plate` #ECE6D8, **ink** `--ink` #151513, **print grey** `--ink-3` #5C574C. Night theme inverts the plate.
- **Record** `--record`: sampled from the current cover (registered `@property`, 900 ms linear). `--record-deep` is darkened until paper text on it passes 4.5:1. It is the only accent.
- Keys: ecru caps, 2px ink edge, hard ink drop (`0 5px 0`). A press travels onto the drop; a latched key stays down and inverts.
- Artwork is never cropped, filtered or overlaid. Colour blocks sit *behind* it.

## Type — three voices
- **Archivo** `.display` (62% width, 900, caps, 0.8 leading) for titles and big numbers; `.label` (125% width, tracked caps) for legends.
- **Martian Mono** `.readout`, lowercase and tabular, for anything the machine measures.
- **Instrument Serif** italic `.serif` for people, places and the one sentence each screen says.

## Composition
- The rail is one fused black shape (four keys joined by necks) plus printed mode words. Where you are is written in brackets: `( stories )`.
- Asymmetric, editorial: a huge headline, a single serif sentence, then the action. Every story, station and session ends in a key that does something real.
- Landscape-first. Phone landscape shrinks headlines by viewport height so the action stays on screen.

## Motion
- `transform` and `opacity` only; brief colour transitions on small controls.
- Transmission's needle slides by transform on a full-width track.
- Sanctioned loops: the coach halo (opacity) and VISUAL's disc spin (transform, paused with playback, off under reduced motion). The power ring's one-off dash sweep.

## Honesty
- No genre, BPM, key or audio features (withdrawn by Spotify for new apps). Stations are clusters of artists that share playlists and sessions.
- "Never played" means saved and never pressed. PartyDeck only picks from music you already have.
- A story without enough data is not told.
