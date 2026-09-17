'use client'

import { useMemo, useState } from 'react'
import { MessageCircle, Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { useCollection } from '@/lib/firestore-hooks'
import { db } from '@/lib/firebase'
import { collection, doc, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { RESIDENT_TYPE_LABELS, type FriendRequestDoc, type UserProfile } from '@/lib/types'

export function FriendsView({ profile, onMessage }: { profile: UserProfile; onMessage: (uid: string, name: string) => void }) {
  const [search, setSearch] = useState('')

  const usersQuery = useMemo(() => query(collection(db, 'users')), [])
  const { data: users } = useCollection<UserProfile>(usersQuery)

  const outgoingQuery = useMemo(() => query(collection(db, 'friendRequests'), where('fromUid', '==', profile.uid)), [profile.uid])
  const incomingQuery = useMemo(() => query(collection(db, 'friendRequests'), where('toUid', '==', profile.uid)), [profile.uid])
  const { data: outgoing } = useCollection<FriendRequestDoc>(outgoingQuery)
  const { data: incoming } = useCollection<FriendRequestDoc>(incomingQuery)

  function statusWith(otherUid: string): 'none' | 'pending' | 'friends' {
    const request = [...outgoing, ...incoming].find(
      (r) => (r.fromUid === profile.uid && r.toUid === otherUid) || (r.fromUid === otherUid && r.toUid === profile.uid),
    )
    if (!request) return 'none'
    return request.status === 'accepted' ? 'friends' : 'pending'
  }

  async function sendRequest(otherUid: string) {
    const id = `${profile.uid}_${otherUid}`
    await setDoc(doc(db, 'friendRequests', id), {
      fromUid: profile.uid,
      toUid: otherUid,
      status: 'pending',
      createdAt: serverTimestamp(),
    })
  }

  const filtered = users.filter(
    (u) => u.uid !== profile.uid && (u.name.toLowerCase().includes(search.toLowerCase()) || u.program.toLowerCase().includes(search.toLowerCase())),
  )

  return <div className="simple-page">
    <div className="page-heading">
      <div><span className="eyebrow">THE HOUSE ROLL CALL</span><h1>Friends</h1><p>Connect with the people who make this place feel like home.</p></div>
    </div>
    <div className="friends-toolbar">
      <div className="search-box"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or program" /></div>
      <span>{filtered.length} residents</span>
    </div>
    <div className="friends-grid">
      {filtered.map((friend) => {
        const status = statusWith(friend.uid)
        return <div className="friend-card card" key={friend.uid}>
          <div className="friend-card-top"><Avatar profile={friend} size="lg" />{friend.online && <span className="profile-online" />}</div>
          <strong>{friend.name}</strong><span>{friend.program}</span><small>{RESIDENT_TYPE_LABELS[friend.residentType]}</small>
          <div className="friend-card-actions">
            <Button variant="outline" size="sm" onClick={() => onMessage(friend.uid, friend.name)}>
              <MessageCircle /> Message
            </Button>
            <Button variant="outline" size="sm" disabled={status !== 'none'} onClick={() => sendRequest(friend.uid)}>
              <UserPlus /> {status === 'friends' ? 'Friends' : status === 'pending' ? 'Requested' : 'Add Friend'}
            </Button>
          </div>
        </div>
      })}
      {filtered.length === 0 && <p className="load-more">No residents match your search.</p>}
    </div>
  </div>
}
