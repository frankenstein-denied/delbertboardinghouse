'use client'

import { useMemo } from 'react'
import { X } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { useCollection } from '@/lib/firestore-hooks'
import { db } from '@/lib/firebase'
import { collection, query, where } from 'firebase/firestore'
import type { FriendRequestDoc, UserProfile } from '@/lib/types'

function timeAgo(createdAt: FriendRequestDoc['createdAt']) {
  if (!createdAt) return 'just now'
  const minutes = Math.max(0, Math.round((Date.now() - createdAt.toMillis()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function NotificationPopover({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const requestsQuery = useMemo(
    () => query(collection(db, 'friendRequests'), where('toUid', '==', profile.uid), where('status', '==', 'pending')),
    [profile.uid],
  )
  const { data: requests } = useCollection<FriendRequestDoc>(requestsQuery)

  const usersQuery = useMemo(() => query(collection(db, 'users')), [])
  const { data: users } = useCollection<UserProfile>(usersQuery)

  return <div className="notification-popover">
    <div className="popover-heading"><strong>Notifications</strong><button onClick={onClose}><X /></button></div>
    {requests.map((request) => {
      const sender = users.find((u) => u.uid === request.fromUid)
      const name = sender?.name ?? 'Someone'
      return <div className="notification-item" key={request.id}>
        <Avatar profile={{ name, initials: sender?.initials ?? name.slice(0, 2).toUpperCase() }} size="sm" />
        <p><strong>{name}</strong> sent you a friend request.<small>{timeAgo(request.createdAt)}</small></p>
      </div>
    })}
    {requests.length === 0 && <p className="load-more">You&apos;re all caught up for now.</p>}
  </div>
}
