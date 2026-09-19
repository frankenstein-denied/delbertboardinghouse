'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import { app, db } from '@/lib/firebase'
import type { UserProfile } from '@/lib/types'

const SW_SCOPE = '/firebase-cloud-messaging-push-scope'

async function registerToken(uid: string) {
  if (!(await isSupported())) throw new Error('Push is not supported in this browser')
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey || !app) throw new Error('NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing from this build')
  const params = new URLSearchParams({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  })
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params}`, { scope: SW_SCOPE })
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration })
  if (!token) throw new Error('FCM returned no token')
  // One doc per device token, private to its owner (see firestore.rules); the
  // /api/notify route reads these with the Admin SDK to fan a message out.
  await setDoc(doc(db, 'users', uid, 'fcmTokens', token), { token, updatedAt: serverTimestamp() })
  console.info('Push: device registered for notifications')
}

/**
 * Asks for notification permission (a bell button, since browsers require a
 * user gesture) and registers this device for chat pushes. Once permission is
 * granted it silently refreshes the token on each load. Renders nothing when
 * push isn't supported/configured or is already on/blocked.
 */
export function PushNotifications({ profile }: { profile: UserProfile }) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported' | 'checking'>('checking')
  const [registered, setRegistered] = useState(false)

  useEffect(() => {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission)
    if (Notification.permission === 'granted') {
      registerToken(profile.uid).then(() => setRegistered(true)).catch((err) => console.error('Push setup failed:', err))
    }
  }, [profile.uid])

  const enable = useCallback(async () => {
    if (permission === 'unsupported') {
      window.alert('This browser cannot receive push notifications. Use Chrome or Edge, or on iPhone install the app to the home screen first.')
      return
    }
    if (permission === 'denied') {
      window.alert('Notifications are blocked for this app. Open the site/app settings (Chrome menu → Site settings → Notifications, or Android Settings → Apps → this app → Notifications), allow them, then reload and tap the bell again.')
      return
    }
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      try {
        await registerToken(profile.uid)
        setRegistered(true)
        window.alert('Notifications are on for this device.')
      } catch (err) {
        console.error('Push setup failed:', err)
        // No dev console on a phone, so surface the reason on screen.
        window.alert(`Could not turn on notifications: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }, [profile.uid, permission])

  // Show the bell until this device is actually registered (also covers
  // permission already granted but token registration having failed).
  if (permission === 'checking' || registered) return null
  return <button className="icon-button" type="button" onClick={enable} aria-label="Turn on message notifications" title="Turn on message notifications"><Bell /></button>
}
