// PartyDeck's own glyph set: 24px grid, 2px square-cut strokes, filled transport keys.

const paths = {
  play: <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  next: (
    <>
      <path d="M5 6.2v11.6a.8.8 0 0 0 1.2.7l8.6-5.8a.8.8 0 0 0 0-1.4L6.2 5.5a.8.8 0 0 0-1.2.7Z" fill="currentColor" stroke="none" />
      <rect x="16.5" y="5.5" width="2.6" height="13" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  previous: (
    <>
      <path d="M19 6.2v11.6a.8.8 0 0 1-1.2.7l-8.6-5.8a.8.8 0 0 1 0-1.4l8.6-5.8a.8.8 0 0 1 1.2.7Z" fill="currentColor" stroke="none" />
      <rect x="4.9" y="5.5" width="2.6" height="13" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  home: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  queue: (
    <>
      <path d="M4 6h11M4 12h11M4 18h7" />
      <path d="M17 15.5v5l3.8-2.5-3.8-2.5Z" fill="currentColor" />
    </>
  ),
  nowPlaying: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="12" cy="12" r="3.2" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </>
  ),
  shuffle: (
    <>
      <path d="m18 14 4 4-4 4" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 18h1.97a4 4 0 0 0 3.3-1.7l5.46-8.6a4 4 0 0 1 3.3-1.7H22" />
      <path d="M2 6h1.97a4 4 0 0 1 3.6 2.2" />
      <path d="M22 18h-6.04a4 4 0 0 1-3.3-1.8l-.36-.45" />
    </>
  ),
  repeat: (
    <>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </>
  ),
  deck: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <rect x="5.5" y="8" width="7" height="8" rx="1.2" fill="currentColor" stroke="none" />
      <path d="M15.5 10h3M15.5 14h3" />
    </>
  ),
  gear: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  lyrics: (
    <>
      <path d="M5 6.5h14M5 11.5h14M5 16.5h8" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </>
  ),
  back: <path d="M15 5 8 12l7 7" />,
  down: <path d="m6 9 6 6 6-6" />,
  more: (
    <>
      <circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  add: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  /** A crate with records standing in it. */
  crate: (
    <>
      <path d="M3 12h18v8H3z" />
      <path d="M6 12V5h4v7M11 12V3h4v9M16 12V6h3v6" />
    </>
  ),
  /** Trim: three faders — settings. */
  trim: (
    <>
      <path d="M6 3v18M12 3v18M18 3v18" />
      <rect x="3.5" y="13" width="5" height="4" fill="currentColor" />
      <rect x="9.5" y="6" width="5" height="4" fill="currentColor" />
      <rect x="15.5" y="10" width="5" height="4" fill="currentColor" />
    </>
  ),
  external: (
    <>
      <path d="M14 5h5v5M19 5l-8 8" />
      <path d="M17 13.5V18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4.5" />
    </>
  ),
  speaker: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2.5" />
      <circle cx="12" cy="14" r="3" />
      <circle cx="12" cy="7" r="0.8" fill="currentColor" />
    </>
  ),
  computer: (
    <>
      <rect x="3" y="5" width="18" height="11" rx="1.5" />
      <path d="M2 19h20" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2.2" />
      <path d="M11 18h2" />
    </>
  ),
  tv: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="1.5" />
      <path d="M8 20h8" />
    </>
  ),
  textSize: (
    <>
      <path d="M3 18 8 6l5 12M4.8 14h6.4" />
      <path d="m14 18 3.5-8 3.5 8M15.2 15.5h4.6" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5v4h-4" />
    </>
  ),
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  collapse: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
  power: (
    <>
      <path d="M12 3.5v8" />
      <path d="M7.1 6.6a7 7 0 1 0 9.8 0" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  forward: <path d="M5 12h13M13 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  target: (
    <>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </>
  ),
} as const

export type IconName = keyof typeof paths

export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  )
}
