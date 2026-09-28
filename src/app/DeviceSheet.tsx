import { useEffect } from 'react'
import { refreshDevices, transferTo } from '../spotify/playbackService'
import { usePlayback } from '../store/playback'
import { closeDevices, useUi } from '../store/ui'
import { EmptyState } from '../ui/Feedback'
import { Icon, type IconName } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'

export function DeviceSheet() {
  const open = useUi((s) => s.devicesOpen)
  return (
    <Sheet open={open} onClose={closeDevices} title="Play on">
      <DeviceList />
    </Sheet>
  )
}

function DeviceList() {
  const { data, loading, error } = usePlayback((s) => s.devices)
  useEffect(() => {
    void refreshDevices()
  }, [])

  if (!data && loading)
    return (
      <p className="sheet-note">
        <span className="led led-pulse" aria-hidden="true" />
        Looking for devices…
      </p>
    )
  if (error && !data) {
    return (
      <EmptyState tone="error" title={error.title} detail={error.detail}>
        <button className="btn" onClick={refreshDevices}>
          Try again
        </button>
      </EmptyState>
    )
  }
  if (!data?.length) {
    return (
      <EmptyState title="No devices found" detail="Open Spotify on your phone, computer or speaker, then refresh.">
        <button className="btn" onClick={refreshDevices} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </EmptyState>
    )
  }
  return (
    <>
      <ul className="devices">
        {data.map((d) => (
          <li key={d.id ?? d.name}>
            <button
              className="device"
              disabled={!d.id || d.isRestricted || d.isActive}
              aria-current={d.isActive || undefined}
              onClick={() => d.id && transferTo(d.id, d.name)}
            >
              <span className="device-port">
                <Icon name={deviceIcon(d.type)} size={20} />
              </span>
              <span className="device-text">
                <span className="device-name">{d.name}</span>
                <span className="device-meta">{d.isActive ? 'Playing here' : d.isRestricted ? "Can't be controlled from here" : d.type}</span>
              </span>
              {d.isActive && <span className="led" aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
      <button className="btn btn-quiet btn-block" onClick={refreshDevices} disabled={loading}>
        {loading ? 'Refreshing…' : 'Refresh'}
      </button>
    </>
  )
}

function deviceIcon(type: string): IconName {
  const t = type.toLowerCase()
  if (t === 'computer') return 'computer'
  if (t === 'smartphone' || t === 'tablet') return 'phone'
  if (t === 'tv' || t === 'castvideo' || t === 'stb') return 'tv'
  return 'speaker'
}
