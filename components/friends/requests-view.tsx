'use client'

import { useMemo } from 'react'
import { Check, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/app/page'
import { useCollection } from '@/lib/firestore-hooks'
import { db } from '@/lib/firebase'
import { collection, doc, query, updateDoc, where } from 'firebase/firestore'
import type { FriendRequestDoc, UserProfile } from '@/lib/types'

export function RequestsView({ profile }: { profile: UserProfile }) {
  const incomingQuery = useMemo(
    () => query(collection(db, 'friendRequests'), where('toUid', '==', profile.uid), where('status', '==', 'pending')),
    [profile.uid],
  )
  const { data: requests } = useCollection<FriendRequestDoc & { fromName?: string }>(incomingQuery)

  async function respond(requestId: string, status: 'accepted' | 'ignored') {
    await updateDoc(doc(db, 'friendRequests', requestId), { status })
  }

  return <div className="simple-page narrow-page">
    <div className="page-heading">
      <div><span className="eyebrow">PEOPLE WHO FOUND YOU</span><h1>Friend Requests <span className="heading-count">{requests.length}</span></h1><p>Say hello to a new housemate.</p></div>
    </div>
    {requests.length ? <div className="request-list">
      {requests.map((request) => (
        <div className="request-card card" key={request.id}>
          <Avatar profile={{ name: request.fromUid, initials: request.fromUid.slice(0, 2).toUpperCase() }} size="lg" />
          <div className="request-info"><strong>{request.fromUid}</strong><small>Sent {request.createdAt.toDate().toLocaleDateString()}</small></div>
          <div className="request-actions">
            <Button size="sm" onClick={() => respond(request.id, 'accepted')}><Check /> Accept</Button>
            <Button variant="outline" size="sm" onClick={() => respond(request.id, 'ignored')}>Ignore</Button>
          </div>
        </div>
      ))}
    </div> : <div className="empty-state card"><div><UserPlus /></div><h2>No new requests</h2><p>You&apos;re all caught up for now.</p></div>}
  </div>
}
