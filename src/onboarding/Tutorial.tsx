import { AnimatePresence, m } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Deck } from '../app/Deck'
import { RailLamp } from '../app/Rail'
import { canOfferFullscreen, isStandalone, useIsFullscreen } from '../lib/fullscreen'
import { lyricsEngine } from '../lyrics/engine'
import { parseLRC } from '../lyrics/lrc'
import { canTimeSync } from '../lyrics/policy'
import { feedback } from '../sensory/feedback'
import { Artwork } from '../ui/Artwork'
import { useClockValue } from '../ui/clock'
import { FullscreenButton } from '../ui/FullscreenButton'
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
 * Learn by doing, on a silent practice deck with the real controls and the real
 * rail layout. Each step waits for you to perform it. ~25 seconds; Skip is always there.
 */
export function Tutorial({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0)
  const [panel, setPanel] = useState<Panel>(null)
  const deck = usePracticeDeck()
  const track = PRACTICE_TRACKS[deck.index]
  const step = TUTORIAL_STEPS[index]
  const complete = isTutorialComplete(index)
  const coach = complete ? null : step.id
  const fullscreenKey = canOfferFullscreen()
  const alreadyFullscreen = useIsFullscreen() || isStandalone()
  const coachRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    practice.reset()
    return practice.stop
  }, [])

  // Keep screen-reader and keyboard focus on the instruction as it changes.
  useEffect(() => {
    coachRef.current?.focus({ preventScroll: true })
  }, [index])

  const act = (action: TutorialAction) => setIndex((i) => advanceTutorial(i, action))

  const open = (p: Exclude<Panel, null>) => {
    feedback.play(p === 'lyrics' ? 'lyrics-open' : 'select')
    setPanel(p)
    act(p === 'lyrics' ? 'open-lyrics' : 'open-queue')
  }
  const home = () => {
    feedback.play('select')
    setPanel(null)
    act('go-home')
  }
  const close = () => {
    feedback.play('back')
    setPanel(null)
  }
  const acknowledge = () => {
    feedback.play('select')
    act('acknowledge')
  }
  const end = (cue: 'ready' | 'back') => {
    feedback.play(cue)
    practice.stop()
    onFinish()
  }

  // The fullscreen step's own action lives in the instruction line, so no panel can hide it.
  const fullscreenAction =
    coach !== 'fullscreen' ? null : (
      <button className={`btn btn-small ${alreadyFullscreen ? '' : 'btn-quiet'}`} onClick={acknowledge}>
        {alreadyFullscreen ? 'Continue' : fullscreenKey ? 'Not now' : 'Got it'}
      </button>
    )
  const fullscreenHint = alreadyFullscreen
    ? "You're already using the whole screen."
    : fullscreenKey
      ? 'Press the full-screen key in the corner of the rail.'
      : 'On iPhone, add PartyDeck to your Home Screen: Share, then Add to Home Screen.'

  return (
    <div className="tutorial">
      <header className="tutorial-top" inert={complete}>
        <span className="tutorial-tag label">
          <span className="led" aria-hidden="true" /> Practice deck · no audio
        </span>
        <ol className="tutorial-steps" aria-hidden="true">
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

      <div className="coach" inert={complete}>
        <p ref={coachRef} tabIndex={-1} aria-live="polite">
          {complete ? (
            <strong>You're all set.</strong>
          ) : (
            <>
              <span className="sr-only">
                Step {index + 1} of {TUTORIAL_STEPS.length}.{' '}
              </span>
              <strong>{step.title}</strong> <span>{coach === 'fullscreen' ? fullscreenHint : step.hint}</span>
            </>
          )}
        </p>
        {fullscreenAction}
      </div>

      <div className="np tutorial-deck" inert={complete}>
        <Deck
          trackKey={track.id}
          art={track.art}
          artAlt=""
          title={track.title}
          artist={track.artist}
          clock={practiceClock}
          durationMs={deck.durationMs}
          onSeek={practice.seek}
          transport={{
            isPlaying: deck.isPlaying,
            canToggle: true,
            canPrevious: true,
            canNext: true,
            onToggle: () => act(practice.toggle()),
            onPrevious: () => {
              practice.previous()
              act('previous')
            },
            onNext: () => {
              practice.next()
              act('next')
            },
            coach: coach === 'play' || coach === 'pause' ? 'play' : coach === 'skip' ? 'skip' : undefined,
          }}
          onSwipe={(d) => {
            if (d === 'next') practice.next()
            else practice.previous()
            act(d)
          }}
        />
      </div>

      {/* The real rail's layout, so you learn where things live. */}
      <nav className="rail" aria-label="Practice rail" inert={complete}>
        <div className="rail-deck" />
        <ul className="rail-tabs">
          <li>
            <button className="rail-tab" data-coach={coach === 'home' || undefined} onClick={home} aria-current={!panel ? 'page' : undefined}>
              {!panel && <RailLamp id="practice-lamp" />}
              <Icon name="deck" />
              <span>Deck</span>
            </button>
          </li>
          <li>
            {/* Search needs Spotify, so it isn't part of practice — shown so the layout matches. */}
            <span className="rail-tab" aria-disabled="true">
              <Icon name="search" />
              <span>Search</span>
              <span className="sr-only">, available after the tutorial</span>
            </span>
          </li>
          <li>
            <button className="rail-tab" data-coach={coach === 'queue' || undefined} onClick={() => open('queue')} aria-current={panel === 'queue' ? 'page' : undefined}>
              {panel === 'queue' && <RailLamp id="practice-lamp" />}
              <Icon name="queue" />
              <span>Queue</span>
            </button>
          </li>
          <li>
            <button className="rail-tab" data-coach={coach === 'lyrics' || undefined} onClick={() => open('lyrics')} aria-current={panel === 'lyrics' ? 'page' : undefined}>
              {panel === 'lyrics' && <RailLamp id="practice-lamp" />}
              <Icon name="lyrics" />
              <span>Lyrics</span>
            </button>
          </li>
        </ul>
        <div className="rail-tools">
          <FullscreenButton coach={coach === 'fullscreen'} onEntered={() => act('fullscreen')} />
        </div>
      </nav>

      <AnimatePresence>
        {panel === 'queue' && (
          <m.section key="queue" className="practice-panel" aria-label="Queue" inert={complete} {...panelMotion}>
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
          <m.section key="lyrics" className="practice-panel practice-lyrics" aria-label="Lyrics" inert={complete} {...panelMotion}>
            <PanelHead title={track.title} onClose={close} />
            <PracticeLyrics track={track} />
          </m.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {complete && (
          <m.div key="done" className="tutorial-done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
            <m.div
              className="coach-card coach-done"
              role="dialog"
              aria-modal="true"
              aria-labelledby="tutorial-done-title"
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            >
              <p className="coach-done-title" id="tutorial-done-title">
                Your deck is ready.
              </p>
              <p>Play, skip, the rail, queue, lyrics and full screen. Search lives in the rail too.</p>
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
