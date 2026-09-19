'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import { app, db } from '@/lib/firebase'
import type { UserProfile } from '@/lib/types'

const SW_SCOPE = '/firebase-cloud-messaging-push-scope'

async function registerToken(uid: string) {
  if (!(await isSupported())) return
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey || !app) return
  const params = new URLSearchParams({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  })
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params}`, { scope: SW_SCOPE })
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration })
  if (!token) return
  // One doc per device token, private to its owner (see firestore.rules); the
  // /api/notify route reads these with the Admin SDK to fan a message out.
  await setDoc(doc(db, 'users', uid, 'fcmTokens', token), { token, updatedAt: serverTimestamp() })
}

/**
 * Asks for notification permission (a bell button, since browsers require a
 * user gesture) and registers this device for chat pushes. Once permission is
 * granted it silently refreshes the token on each load. Renders nothing when
 * push isn't supported/configured or is already on/blocked.
 */
export function PushNotifications({ profile }: { profile: UserProfile }) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')

  useEffect(() => {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return
    setPermission(Notification.permission)
    if (Notification.permission === 'granted') registerToken(profile.uid).catch(() => {})
  }, [profile.uid])

  const enable = useCallback(async () => {
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') await registerToken(profile.uid).catch((err) => console.error('Push setup failed:', err))
  }, [profile.uid])

  if (permission !== 'default') return null
  return <button className="icon-button" type="button" onClick={enable} aria-label="Turn on message notifications" title="Turn on message notifications"><Bell /></button>
}
