import { useShallow } from 'zustand/react/shallow'
import { cycleRepeat, setVolume, toggleShuffle } from '../spotify/playbackService'
import { usePlayback } from '../store/playback'
import { Icon } from '../ui/Icon'
import { PressKey } from '../ui/PressKey'

const REPEAT_WORD = { off: 'off', context: '(all)', track: '(one)' } as const
const REPEAT_LABEL = { off: 'Repeat off', context: 'Repeat all', track: 'Repeat one' } as const

/**
 * Modes and level trim, as words on keys. (The level knob is gone: most speakers
 * Spotify reports are fixed-volume, so it was a dial that rarely turned.) A latched key sits down and inverts;
 * each is disabled, not faked, when Spotify or the device says no.
 */
export function ModeKeys() {
  const s = usePlayback(
    useShallow((s) => ({
      has: s.hasPlayback,
      shuffle: s.playback.shuffle,
      repeat: s.playback.repeat,
      volume: s.playback.volume,
      noShuffle: s.playback.disallows.shuffling,
      noRepeat: s.playback.disallows.repeatingContext && s.playback.disallows.repeatingTrack,
    })),
  )
  const fixed = !s.has || s.volume === null
  return (
    <div className="modekeys">
      <PressKey className="key key-word" depth={1} onClick={toggleShuffle} disabled={!s.has || s.noShuffle} aria-pressed={s.shuffle} aria-label="Shuffle">
        <span className="label">shuffle</span>
        <span className="readout">{s.shuffle ? '(on)' : 'off'}</span>
      </PressKey>
      <PressKey
        className="key key-word"
        depth={1}
        onClick={cycleRepeat}
        disabled={!s.has || s.noRepeat}
        aria-pressed={s.repeat !== 'off'}
        aria-label={`${REPEAT_LABEL[s.repeat]}. Change`}
      >
        <span className="label">repeat</span>
        <span className="readout">{REPEAT_WORD[s.repeat]}</span>
      </PressKey>
      {/* Level trims only where the speaker takes remote volume; many phones don't. */}
      {!fixed && (
        <>
          <span className="modekeys-rule" aria-hidden="true" />
          <PressKey className="key key-trim" depth={1} onClick={() => void setVolume((s.volume ?? 0) - 4)} aria-label={`Volume down, now ${s.volume}`}>
            <Icon name="minus" size={20} />
          </PressKey>
          <PressKey className="key key-trim" depth={1} onClick={() => void setVolume((s.volume ?? 0) + 4)} aria-label={`Volume up, now ${s.volume}`}>
            <Icon name="add" size={20} />
          </PressKey>
        </>
      )}
    </div>
  )
}
