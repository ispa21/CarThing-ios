import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const LYRIC_SIZES = [
  { label: 'Small', scale: 0.8 },
  { label: 'Medium', scale: 1 },
  { label: 'Large', scale: 1.2 },
  { label: 'Extra large', scale: 1.45 },
] as const

/** plate: the ecru faceplate. night: the same machine, inverted, for dark rooms. */
export type Theme = 'plate' | 'night'

interface Settings {
  lyricSize: number // index into LYRIC_SIZES
  autoScroll: boolean
  theme: Theme
  sound: boolean
  haptics: boolean
  /** Saw the welcome screen once; later visits go straight to Connect. */
  welcomed: boolean
  /** Finished or skipped the interactive tutorial. */
  onboarded: boolean
  /** Dismissed the "turn your phone sideways" hint (stays dismissed across launches). */
  rotateHintDismissed: boolean
}

export const useSettings = create<Settings>()(
  persist(
    (): Settings => ({
      lyricSize: 1,
      autoScroll: true,
      theme: 'plate',
      sound: true,
      haptics: true,
      welcomed: false,
      onboarded: false,
      rotateHintDismissed: false,
    }),
    {
      name: 'partydeck.settings',
      storage: createJSONStorage(() => localStorage),
      version: 2, // new fields merge in with their defaults
      // v2: the Flight Deck themes became the plate and its night inversion.
      migrate: (persisted, version) => {
        const s = { ...(persisted as object) } as Omit<Settings, 'theme'> & { theme?: string }
        if (version < 2) s.theme = s.theme === 'black' ? 'night' : 'plate'
        return s as Settings
      },
    },
  ),
)

export const THEME_COLORS: Record<Theme, string> = { plate: '#ECE6D8', night: '#151513' }
