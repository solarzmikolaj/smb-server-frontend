import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Wykryj tryb standalone i ukryj elementy przeglądarki
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://') ||
    window.matchMedia('(display-mode: fullscreen)').matches

if (isStandalone) {
  // Aplikacja działa w trybie standalone
  document.documentElement.classList.add('standalone-mode')
  document.body.classList.add('standalone-mode')
  
  // Ukryj pasek adresu (dla przeglądarek które to obsługują)
  if ('standalone' in window.navigator || window.navigator.standalone) {
    // iOS Safari
    document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)')
  }
  
  console.log('[PWA] Running in standalone mode')
} else {
  console.log('[PWA] Running in browser mode - install as PWA to get standalone mode')
  console.log('[PWA] Display mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser')
}

// Sprawdź czy service worker jest zarejestrowany
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    console.log('[PWA] Service Worker is ready:', registration.scope)
    console.log('[PWA] Service Worker state:', registration.active?.state)
  }).catch(err => {
    console.warn('[PWA] Service Worker not ready:', err)
  })
  
  // Sprawdź czy jest Chrome na Androidzie
  const isAndroidChrome = /Android/.test(navigator.userAgent) && /Chrome/.test(navigator.userAgent)
  if (isAndroidChrome) {
    console.log('[PWA] Detected Android Chrome - checking PWA support')
    // Wymuś aktualizację service workera dla Chrome na Androidzie
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.update()
      })
    })
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

