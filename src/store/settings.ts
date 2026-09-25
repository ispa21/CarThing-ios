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
}

export const useSettings = create<Settings>()(
  persist((): Settings => ({ lyricSize: 1, autoScroll: true, theme: 'graphite' }), {
    name: 'partydeck.settings',
    storage: createJSONStorage(() => localStorage),
    version: 1,
  }),
)

export const THEME_COLORS: Record<Theme, string> = { graphite: '#17141B', black: '#000000' }
