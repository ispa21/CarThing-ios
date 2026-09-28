import { useShallow } from 'zustand/react/shallow'
import { useLandscapeDeck } from '../lib/orientation'
import { cycleRepeat, setVolume, toggleShuffle } from '../spotify/playbackService'
import { usePlayback } from '../store/playback'
import { Fader } from '../ui/Fader'
import { Icon } from '../ui/Icon'
import { PressKey } from '../ui/PressKey'

const REPEAT_LABEL = { off: 'Repeat off', context: 'Repeat all', track: 'Repeat one' } as const

/**
 * The mixer channel beside the deck: mode latches (shuffle, repeat) and the level
 * fader. Every control here is a real Spotify command; each is disabled, not faked,
 * when Spotify or the device says no (e.g. phones that don't allow remote volume).
 */
export function ChannelStrip() {
  const vertical = useLandscapeDeck()
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

  return (
    <div className="channel" data-orientation={vertical ? 'vertical' : 'horizontal'}>
      <p className="channel-label label" aria-hidden="true">
        Mode
      </p>
      <div className="channel-modes">
        <PressKey className="latch" depth={1} onClick={toggleShuffle} disabled={!s.has || s.noShuffle} aria-pressed={s.shuffle} aria-label="Shuffle">
          <Icon name="shuffle" size={20} />
        </PressKey>
        <PressKey
          className="latch"
          depth={1}
          onClick={cycleRepeat}
          disabled={!s.has || s.noRepeat}
          aria-pressed={s.repeat !== 'off'}
          aria-label={`${REPEAT_LABEL[s.repeat]}. Change`}
        >
          <Icon name="repeat" size={20} />
          {s.repeat === 'track' && (
            <span className="latch-badge" aria-hidden="true">
              1
            </span>
          )}
        </PressKey>
      </div>
      <p className="channel-label label" aria-hidden="true">
        {s.has && s.volume === null ? 'Fixed' : 'Level'}
      </p>
      <Fader value={s.has ? s.volume : null} onCommit={(v, o) => void setVolume(v, o)} orientation={vertical ? 'vertical' : 'horizontal'} label="Volume" />
    </div>
  )
}
