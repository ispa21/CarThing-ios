import { useShallow } from 'zustand/react/shallow'
import { cycleRepeat, setVolume, toggleShuffle } from '../spotify/playbackService'
import { usePlayback } from '../store/playback'
import { Icon } from '../ui/Icon'
import { Knob } from '../ui/Knob'
import { PressKey } from '../ui/PressKey'

const REPEAT_WORD = { off: 'off', context: '(all)', track: '(one)' } as const
const REPEAT_LABEL = { off: 'Repeat off', context: 'Repeat all', track: 'Repeat one' } as const

/**
 * The level knob with its readout. A real Spotify command; on devices that don't
 * allow remote volume (many phones) it reads "fixed" and doesn't turn.
 */
export function LevelKnob() {
  const s = usePlayback(useShallow((s) => ({ has: s.hasPlayback, volume: s.playback.volume })))
  const value = s.has ? s.volume : null
  return (
    <div className="level">
      <Knob value={value} onCommit={(v, o) => void setVolume(v, o)} label="Volume" />
      <p className="level-readout" aria-hidden="true">
        <span className="label">level</span>
        <span className="readout level-value">{value === null ? 'fixed' : String(value).padStart(3, '0')}</span>
      </p>
    </div>
  )
}

/**
 * Modes and level trim, as words on keys. A latched key sits down and inverts;
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
      <span className="modekeys-rule" aria-hidden="true" />
      <PressKey className="key key-trim" depth={1} disabled={fixed} onClick={() => void setVolume((s.volume ?? 0) - 4)} aria-label="Volume down">
        <Icon name="minus" size={20} />
      </PressKey>
      <PressKey className="key key-trim" depth={1} disabled={fixed} onClick={() => void setVolume((s.volume ?? 0) + 4)} aria-label="Volume up">
        <Icon name="add" size={20} />
      </PressKey>
    </div>
  )
}
