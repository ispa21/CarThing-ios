import { useShallow } from 'zustand/react/shallow'
import { skipNext, skipPrevious, togglePlay } from '../spotify/playbackService'
import { selectCanToggle, usePlayback } from '../store/playback'
import { Icon } from '../ui/Icon'
import { PressKey } from '../ui/PressKey'

export interface TransportKeysProps {
  isPlaying: boolean
  canToggle: boolean
  canPrevious: boolean
  canNext: boolean
  onToggle: () => void
  onPrevious: () => void
  onNext: () => void
  /** Tutorial: which control is being taught. */
  coach?: 'play' | 'skip'
}

/** Previous / Play-Pause / Next — the deck's three physical keys. Presentational. */
export function TransportKeys(p: TransportKeysProps) {
  return (
    <div className="transport">
      <PressKey className="key key-skip" onClick={p.onPrevious} disabled={!p.canPrevious} aria-label="Previous" data-coach={p.coach === 'skip' || undefined}>
        <Icon name="previous" size={30} />
      </PressKey>
      <PlayKey isPlaying={p.isPlaying} onPress={p.onToggle} disabled={!p.canToggle} coach={p.coach === 'play'} />
      <PressKey className="key key-skip" onClick={p.onNext} disabled={!p.canNext} aria-label="Next" data-coach={p.coach === 'skip' || undefined}>
        <Icon name="next" size={30} />
      </PressKey>
    </div>
  )
}

/** The transport bound to Spotify. Buttons Spotify says it will reject are disabled. */
export function Transport() {
  const s = usePlayback(
    useShallow((s) => ({ has: s.hasPlayback, isPlaying: s.playback.isPlaying, canToggle: selectCanToggle(s), d: s.playback.disallows })),
  )
  return (
    <TransportKeys
      isPlaying={s.isPlaying}
      canToggle={s.canToggle}
      canPrevious={s.has && !s.d.skippingPrev}
      canNext={s.has && !s.d.skippingNext}
      onToggle={togglePlay}
      onPrevious={skipPrevious}
      onNext={skipNext}
    />
  )
}

export function PlayKey({ isPlaying, onPress, disabled, small, coach }: { isPlaying: boolean; onPress: () => void; disabled?: boolean; small?: boolean; coach?: boolean }) {
  return (
    <PressKey
      className={`key key-play ${small ? 'key-play-sm' : ''}`}
      onClick={onPress}
      disabled={disabled}
      aria-label={isPlaying ? 'Pause' : 'Play'}
      depth={0.95}
      data-coach={coach || undefined}
      data-playing={isPlaying || undefined}
    >
      <span className="key-lamp" aria-hidden="true" />
      <Icon name={isPlaying ? 'pause' : 'play'} size={small ? 24 : 34} />
    </PressKey>
  )
}
