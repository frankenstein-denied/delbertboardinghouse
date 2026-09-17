'use client'

import { useMemo } from 'react'
import { collection, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useCollection } from '@/lib/firestore-hooks'
import type { FriendRequestDoc, UserProfile } from '@/lib/types'

export function NotificationDot({ profile }: { profile: UserProfile }) {
  const requestsQuery = useMemo(
    () => query(collection(db, 'friendRequests'), where('toUid', '==', profile.uid), where('status', '==', 'pending')),
    [profile.uid],
  )
  const { data: requests } = useCollection<FriendRequestDoc>(requestsQuery)
  if (requests.length === 0) return null
  return <span className="notification-dot" />
}
