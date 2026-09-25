// PartyDeck's own glyph set: 24px grid, 2px rounded strokes, filled transport keys.

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
  lyrics: (
    <>
      <path d="M5 6.5h14M5 11.5h14M5 16.5h8" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" />
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
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  )
}
