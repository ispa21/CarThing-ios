import { useShallow } from 'zustand/react/shallow'
import { skipNext, skipPrevious, togglePlay } from '../spotify/playbackService'
import { usePlayback } from '../store/playback'
import { Icon } from '../ui/Icon'

/** Previous / Play-Pause / Next. Buttons Spotify says it will reject are disabled. */
export function Transport() {
  const { has, isPlaying, d } = usePlayback(
    useShallow((s) => ({ has: s.hasPlayback, isPlaying: s.playback.isPlaying, d: s.playback.disallows })),
  )
  return (
    <div className="transport">
      <button className="key key-skip" onClick={skipPrevious} disabled={!has || d.skippingPrev} aria-label="Previous">
        <Icon name="previous" size={30} />
      </button>
      <PlayKey isPlaying={isPlaying} onPress={togglePlay} disabled={!has || (isPlaying ? d.pausing : d.resuming)} />
      <button className="key key-skip" onClick={skipNext} disabled={!has || d.skippingNext} aria-label="Next">
        <Icon name="next" size={30} />
      </button>
    </div>
  )
}

export function PlayKey({ isPlaying, onPress, disabled, small }: { isPlaying: boolean; onPress: () => void; disabled?: boolean; small?: boolean }) {
  return (
    <button className={`key key-play ${small ? 'key-play-sm' : ''}`} onClick={onPress} disabled={disabled} aria-label={isPlaying ? 'Pause' : 'Play'}>
      <Icon name={isPlaying ? 'pause' : 'play'} size={small ? 24 : 34} />
    </button>
  )
}
