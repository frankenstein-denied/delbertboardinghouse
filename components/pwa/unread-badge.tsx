'use client'

import { useEffect, useMemo } from 'react'
import { collection, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useCollection } from '@/lib/firestore-hooks'
import type { ConversationDoc, UserProfile } from '@/lib/types'

// The Badging API (navigator.setAppBadge) puts a count on the installed
// PWA's icon (taskbar/dock on Windows+macOS, home screen on Android) —
// unlike a real push notification, it only updates while this component is
// mounted (the app open somewhere), since there's no push subscription to
// wake a closed app. Support is inconsistent on iOS Safari; both calls are
// optional-chained so an unsupported browser just silently no-ops.
export function UnreadBadge({ profile }: { profile: UserProfile }) {
  const conversationsQuery = useMemo(
    () => query(collection(db, 'conversations'), where('participantIds', 'array-contains', profile.uid)),
    [profile.uid],
  )
  const { data: conversations } = useCollection<ConversationDoc>(conversationsQuery, `conversations-unread:${profile.uid}`, { persist: true })

  const unreadCount = useMemo(() => {
    return conversations.reduce((count, conversation) => {
      // A freshly-created conversation (startConversationWith) has
      // lastMessageAt set but lastMessage still '' — that's the doc coming
      // into existence, not an actual message, so it must never count as
      // unread for the other participant (who has no lastReadAt entry yet).
      if (!conversation.lastMessage) return count
      const lastMessageAt = conversation.lastMessageAt?.toMillis() ?? 0
      const lastReadAt = conversation.lastReadAt?.[profile.uid]?.toMillis() ?? 0
      return lastMessageAt > lastReadAt ? count + 1 : count
    }, 0)
  }, [conversations, profile.uid])

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    if (unreadCount > 0) {
      navigator.setAppBadge?.(unreadCount)?.catch(() => {})
    } else {
      navigator.clearAppBadge?.()?.catch(() => {})
    }
    // Clears the OS badge when this unmounts (e.g. sign-out navigates away
    // from PageShell, which is where this is mounted) so a stale count
    // doesn't linger on the icon after logging out.
    return () => {
      navigator.clearAppBadge?.()?.catch(() => {})
    }
  }, [unreadCount])

  return null
}
