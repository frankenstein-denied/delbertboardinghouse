'use client'

import { useMemo, useState } from 'react'
import { MessageCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { useCollection } from '@/lib/firestore-hooks'
import { db } from '@/lib/firebase'
import { collection, query } from 'firebase/firestore'
import { RESIDENT_TYPE_LABELS, type UserProfile } from '@/lib/types'

export function FriendsView({ profile, onMessage }: { profile: UserProfile; onMessage: (uid: string, name: string) => void }) {
  const [search, setSearch] = useState('')

  const usersQuery = useMemo(() => query(collection(db, 'users')), [])
  const { data: users, loading } = useCollection<UserProfile>(usersQuery)

  const filtered = users.filter(
    (u) => u.uid !== profile.uid && (u.name.toLowerCase().includes(search.toLowerCase()) || u.program.toLowerCase().includes(search.toLowerCase())),
  )

  return <div className="simple-page">
    <div className="page-heading">
      <div><span className="eyebrow">THE HOUSE ROLL CALL</span><h1>Residents</h1><p>Say hello to anyone in the house.</p></div>
    </div>
    <div className="friends-toolbar">
      <div className="search-box"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or program" /></div>
      <span>{filtered.length} residents</span>
    </div>
    <div className="friends-grid">
      {loading && <p className="load-more">Loading residents…</p>}
      {!loading && filtered.map((friend) => {
        return <div className="friend-card card" key={friend.uid}>
          <div className="friend-card-top"><Avatar profile={friend} size="lg" />{friend.online && <span className="profile-online" />}</div>
          <div className="friend-card-info">
            <strong>{friend.name}</strong><span>{friend.program}</span><small>{RESIDENT_TYPE_LABELS[friend.residentType]}</small>
          </div>
          <div className="friend-card-actions">
            <Button variant="outline" size="sm" onClick={() => onMessage(friend.uid, friend.name)}>
              <MessageCircle /> Message
            </Button>
          </div>
        </div>
      })}
      {!loading && filtered.length === 0 && <p className="load-more">No residents match your search.</p>}
    </div>
  </div>
}
