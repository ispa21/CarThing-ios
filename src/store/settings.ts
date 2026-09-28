import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const LYRIC_SIZES = [
  { label: 'Small', scale: 0.8 },
  { label: 'Medium', scale: 1 },
  { label: 'Large', scale: 1.2 },
  { label: 'Extra large', scale: 1.45 },
] as const

export type Theme = 'graphite' | 'black'

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
      theme: 'graphite',
      sound: true,
      haptics: true,
      welcomed: false,
      onboarded: false,
      rotateHintDismissed: false,
    }),
    {
    name: 'partydeck.settings',
      storage: createJSONStorage(() => localStorage),
      version: 1, // new fields merge in with their defaults
    },
  ),
)

export const THEME_COLORS: Record<Theme, string> = { graphite: '#17141B', black: '#000000' }
