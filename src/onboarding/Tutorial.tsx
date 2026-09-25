import { AnimatePresence, m } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Deck } from '../app/Deck'
import { FullscreenButton } from '../app/Rail'
import { fullscreenSupported, isStandalone } from '../lib/fullscreen'
import { lyricsEngine } from '../lyrics/engine'
import { parseLRC } from '../lyrics/lrc'
import { canTimeSync } from '../lyrics/policy'
import { feedback } from '../sensory/feedback'
import { Artwork } from '../ui/Artwork'
import { useClockValue } from '../ui/clock'
import { Icon } from '../ui/Icon'
import { PressKey } from '../ui/PressKey'
import { practice, practiceClock, PRACTICE_TRACKS, usePracticeDeck, type PracticeTrack } from './practiceDeck'
import { advanceTutorial, isTutorialComplete, TUTORIAL_STEPS, type TutorialAction } from './tutorialSteps'

type Panel = 'queue' | 'lyrics' | null

const panelMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
  transition: { type: 'spring', bounce: 0, duration: 0.3 },
} as const

/**
 * Learn by doing, on a silent practice deck with the real controls.
 * Each step waits for you to perform it. ~20 seconds; Skip is always there.
 */
export function Tutorial({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0)
  const [panel, setPanel] = useState<Panel>(null)
  const deck = usePracticeDeck()
  const track = PRACTICE_TRACKS[deck.index]
  const step = TUTORIAL_STEPS[index]
  const complete = isTutorialComplete(index)
  const canFullscreen = fullscreenSupported() && !isStandalone()

  useEffect(() => {
    practice.reset()
    return practice.pause
  }, [])

  const act = (action: TutorialAction) => setIndex((i) => advanceTutorial(i, action))

  const toggle = () => {
    const playing = usePracticeDeck.getState().isPlaying
    feedback.play(playing ? 'pause' : 'play')
    practice.toggle()
    act(playing ? 'pause' : 'play')
  }
  const next = () => {
    feedback.play('next-track')
    practice.next()
    act('next')
  }
  const previous = () => {
    feedback.play('previous-track')
    practice.previous()
    act('previous')
  }
  const open = (p: Exclude<Panel, null>) => {
    feedback.play(p === 'lyrics' ? 'lyrics-open' : 'select')
    setPanel(p)
    act(p === 'lyrics' ? 'open-lyrics' : 'open-queue')
  }
  const close = () => {
    feedback.play('back')
    setPanel(null)
  }
  const end = (cue: 'ready' | 'back') => {
    feedback.play(cue)
    practice.pause()
    onFinish()
  }

  const coach = complete ? null : step.id

  return (
    <div className="tutorial">
      <header className="tutorial-top">
        <span className="tutorial-tag">
          <span className="led" aria-hidden="true" /> Practice deck, no audio
        </span>
        <ol className="tutorial-steps" aria-label={`Step ${Math.min(index + 1, TUTORIAL_STEPS.length)} of ${TUTORIAL_STEPS.length}`}>
          {TUTORIAL_STEPS.map((s, i) => (
            <li key={s.id} data-state={i < index ? 'done' : i === index ? 'current' : undefined} />
          ))}
        </ol>
        {!complete && (
          <button className="btn btn-quiet btn-small" onClick={() => end('back')}>
            Skip
          </button>
        )}
      </header>

      <p className="coach" aria-live="polite">
        {complete ? (
          <strong>You're all set.</strong>
        ) : (
          <>
            <strong>{step.title}</strong> <span>{step.hint}</span>
          </>
        )}
      </p>

      <div className="np tutorial-deck">
        <Deck
          trackKey={track.id}
          art={track.art}
          artAlt=""
          title={track.title}
          artist={track.artist}
          clock={practiceClock}
          durationMs={deck.durationMs}
          onSeek={(ms) => {
            feedback.play('seek')
            practice.seek(ms)
          }}
          transport={{
            isPlaying: deck.isPlaying,
            canToggle: true,
            canPrevious: true,
            canNext: true,
            onToggle: toggle,
            onPrevious: previous,
            onNext: next,
            coach: coach === 'play' ? 'play' : coach === 'skip' ? 'skip' : undefined,
          }}
          onSwipe={(d) => (d === 'next' ? next() : previous())}
        />
      </div>

      <nav className="rail" aria-label="Practice controls">
        <div className="rail-deck" />
        <ul className="rail-tabs">
          <li>
            <span className="rail-tab" aria-current="page">
              <Icon name="nowPlaying" />
              <span>Home</span>
            </span>
          </li>
          <li>
            <button className="rail-tab" data-coach={coach === 'queue' || undefined} onClick={() => open('queue')}>
              <Icon name="queue" />
              <span>Queue</span>
            </button>
          </li>
          <li>
            <button className="rail-tab" data-coach={coach === 'lyrics' || undefined} onClick={() => open('lyrics')}>
              <Icon name="lyrics" />
              <span>Lyrics</span>
            </button>
          </li>
        </ul>
        <div className="rail-tools">
          {canFullscreen && <FullscreenButton coach={coach === 'fullscreen'} onEntered={() => act('fullscreen')} />}
        </div>
      </nav>

      <AnimatePresence>
        {panel === 'queue' && (
          <m.section key="queue" className="practice-panel" aria-label="Queue" {...panelMotion}>
            <PanelHead title="Up next" onClose={close} />
            <ol className="rows">
              {[1, 2].map((k) => {
                const t = PRACTICE_TRACKS[(deck.index + k) % PRACTICE_TRACKS.length]
                return (
                  <li key={t.id} className="row">
                    <div className="row-main">
                      <span className="row-num">{String(k).padStart(2, '0')}</span>
                      <Artwork src={t.art} className="art-row" />
                      <span className="row-text">
                        <span className="row-title">{t.title}</span>
                        <span className="row-sub">{t.artist}</span>
                      </span>
                    </div>
                  </li>
                )
              })}
            </ol>
          </m.section>
        )}
        {panel === 'lyrics' && (
          <m.section key="lyrics" className="practice-panel practice-lyrics" aria-label="Lyrics" {...panelMotion}>
            <PanelHead title={track.title} onClose={close} />
            <PracticeLyrics track={track} />
          </m.section>
        )}
      </AnimatePresence>

      {/* One card at a time: the next waits for the previous to leave. */}
      <AnimatePresence mode="wait">
        {coach === 'fullscreen' && !panel && (
          <m.div key="fs" className="coach-card" {...panelMotion}>
            {canFullscreen ? (
              <p>Press the full-screen key in the corner, or do it later from Settings.</p>
            ) : (
              <p>
                {isStandalone() ? "You're already running full screen." : 'On iPhone, add PartyDeck to your Home Screen for full screen: Share, then Add to Home Screen.'}
              </p>
            )}
            <button
              className="btn btn-small"
              onClick={() => {
                feedback.play('select')
                act('acknowledge')
              }}
            >
              {canFullscreen ? 'Not now' : 'Got it'}
            </button>
          </m.div>
        )}
        {complete && (
          <m.div key="done" className="tutorial-done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
            <m.div className="coach-card coach-done" initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', bounce: 0, duration: 0.35 }}>
              <p className="coach-done-title">Your deck is ready.</p>
              <p>Play, skip, queue, lyrics, full screen. That's the whole deck.</p>
              <PressKey className="btn btn-primary" onClick={() => end('ready')} depth={0.97} autoFocus>
                Start listening
              </PressKey>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PanelHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <header className="practice-panel-head">
      <h2>{title}</h2>
      <button className="icon-btn" onClick={onClose} aria-label="Close">
        <Icon name="close" />
      </button>
    </header>
  )
}

/** Timed lyrics are allowed here: the practice clock isn't Spotify audio (lyrics/policy.ts). */
function PracticeLyrics({ track }: { track: PracticeTrack }) {
  const lines = useMemo(() => parseLRC(track.lyrics).filter((l) => l.text), [track.lyrics])
  const timed = canTimeSync('demo')
  const derive = useCallback(
    (ms: number, isPlaying: boolean) => lyricsEngine({ lyrics: lines, playbackPositionMs: ms, isPlaying }).currentIndex,
    [lines],
  )
  const current = useClockValue(practiceClock, derive, timed)
  const from = Math.max(0, current - 1)
  return (
    <ol className="practice-lyrics-lines">
      {lines.slice(from, from + 3).map((l, i) => (
        <li key={from + i} data-state={from + i === current ? 'current' : undefined}>
          {l.text}
        </li>
      ))}
    </ol>
  )
}
