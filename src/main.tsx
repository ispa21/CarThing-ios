import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/barlow-semi-condensed/latin-500.css'
import '@fontsource/barlow-semi-condensed/latin-600.css'
import '@fontsource/barlow-semi-condensed/latin-700.css'
import './styles/tokens.css'
import './styles/app.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { feedback } from './sensory/feedback'
import { useSettings } from './store/settings'
import { useUi, type InstallPromptEvent } from './store/ui'

// The sensory layer knows nothing about stores; settings are pushed into it.
const applyFeedbackPrefs = () => {
  const { sound, haptics } = useSettings.getState()
  feedback.configure({ sound, haptics })
}
applyFeedbackPrefs()
useSettings.subscribe(applyFeedbackPrefs)

// Spotify rejects `localhost` redirect URIs, and PKCE state is per-origin:
// always run on the loopback IP in development.
if (window.location.hostname === 'localhost') {
  window.location.replace(window.location.href.replace('//localhost', '//127.0.0.1'))
} else {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    useUi.setState({ installPrompt: e as InstallPromptEvent })
  })

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
