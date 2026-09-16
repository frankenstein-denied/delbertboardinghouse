'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline shell is a nice-to-have, not core functionality — a failed
      // registration (e.g. unsupported browser) should never block the app.
    })
  }, [])
  return null
}
