import { create } from 'zustand'

interface Toast {
  id: number
  text: string
  tone: 'info' | 'error'
}

/** Chromium's install prompt event (not in lib.dom). */
export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface UiStore {
  devicesOpen: boolean
  toast: Toast | null
  installPrompt: InstallPromptEvent | null
}

export const useUi = create<UiStore>(() => ({ devicesOpen: false, toast: null, installPrompt: null }))

let toastId = 0
export function notify(text: string, tone: Toast['tone'] = 'info') {
  useUi.setState({ toast: { id: ++toastId, text, tone } })
}

export const openDevices = () => useUi.setState({ devicesOpen: true })
export const closeDevices = () => useUi.setState({ devicesOpen: false })
