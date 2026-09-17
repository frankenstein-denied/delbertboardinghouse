'use client'

import { useMemo, useState } from 'react'
import { MessageCircle, Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { useCollection } from '@/lib/firestore-hooks'
import { db } from '@/lib/firebase'
import { collection, deleteDoc, doc, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { RESIDENT_TYPE_LABELS, type FriendRequestDoc, type UserProfile } from '@/lib/types'

export function FriendsView({ profile, onMessage }: { profile: UserProfile; onMessage: (uid: string, name: string) => void }) {
  const [search, setSearch] = useState('')

  const usersQuery = useMemo(() => query(collection(db, 'users')), [])
  const { data: users, loading: usersLoading } = useCollection<UserProfile>(usersQuery)

  const outgoingQuery = useMemo(() => query(collection(db, 'friendRequests'), where('fromUid', '==', profile.uid)), [profile.uid])
  const incomingQuery = useMemo(() => query(collection(db, 'friendRequests'), where('toUid', '==', profile.uid)), [profile.uid])
  const { data: outgoing, loading: outgoingLoading } = useCollection<FriendRequestDoc>(outgoingQuery)
  const { data: incoming, loading: incomingLoading } = useCollection<FriendRequestDoc>(incomingQuery)
  const loading = usersLoading || outgoingLoading || incomingLoading

  function requestWith(otherUid: string) {
    return [...outgoing, ...incoming].find(
      (r) => (r.fromUid === profile.uid && r.toUid === otherUid) || (r.fromUid === otherUid && r.toUid === profile.uid),
    )
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

  async function removeFriend(requestId: string) {
    if (!window.confirm('Remove this friend?')) return
    await deleteDoc(doc(db, 'friendRequests', requestId))
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
      {loading && <p className="load-more">Loading residents…</p>}
      {!loading && filtered.map((friend) => {
        const request = requestWith(friend.uid)
        const status: 'none' | 'pending' | 'friends' = !request ? 'none' : request.status === 'accepted' ? 'friends' : 'pending'
        return <div className="friend-card card" key={friend.uid}>
          <div className="friend-card-top"><Avatar profile={friend} size="lg" />{friend.online && <span className="profile-online" />}</div>
          <div className="friend-card-info">
            <strong>{friend.name}</strong><span>{friend.program}</span><small>{RESIDENT_TYPE_LABELS[friend.residentType]}</small>
          </div>
          <div className="friend-card-actions">
            <Button variant="outline" size="sm" onClick={() => onMessage(friend.uid, friend.name)}>
              <MessageCircle /> Message
            </Button>
            {status === 'friends' ? (
              <Button variant="outline" size="sm" onClick={() => removeFriend(request!.id)}>Remove Friend</Button>
            ) : (
              <Button variant="outline" size="sm" disabled={status === 'pending'} onClick={() => sendRequest(friend.uid)}>
                <UserPlus /> {status === 'pending' ? 'Requested' : 'Add Friend'}
              </Button>
            )}
          </div>
        </div>
      })}
      {!loading && filtered.length === 0 && <p className="load-more">No residents match your search.</p>}
    </div>
  </div>
}
