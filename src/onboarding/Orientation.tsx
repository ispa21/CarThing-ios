import { useEffect } from 'react'
import { usePhonePortrait } from '../lib/orientation'
import { feedback } from '../sensory/feedback'

/** "Turn your phone sideways." Advances by itself when you do; never blocks. */
export function Orientation({ onDone }: { onDone: (how: 'rotated' | 'stay-portrait') => void }) {
  const portrait = usePhonePortrait()

  useEffect(() => {
    if (portrait) return
    feedback.play('tick') // the device noticed
    onDone('rotated')
  }, [portrait, onDone])

  return (
    <main className="onboard onboard-rotate">
      <div className="rotate-demo" aria-hidden="true">
        <span className="rotate-phone" />
      </div>
      <div className="onboard-mark">
        <h1 className="onboard-title">Turn your phone sideways.</h1>
        <p className="onboard-sub">PartyDeck is built for landscape.</p>
      </div>
      <button
        className="btn btn-quiet"
        onClick={() => {
          feedback.play('select')
          onDone('stay-portrait')
        }}
      >
        Continue in portrait
      </button>
    </main>
  )
}
