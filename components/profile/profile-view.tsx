'use client'

import { useState } from 'react'
import { Settings, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/app/page'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import type { UserProfile } from '@/lib/types'

export function ProfileView({ profile }: { profile: UserProfile }) {
  const { logOut } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile.name)
  const [program, setProgram] = useState(profile.program)
  const [room, setRoom] = useState(profile.room)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', profile.uid), { name: name.trim(), program: program.trim(), room: room.trim() })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return <div className="simple-page profile-page">
    <div className="profile-cover">
      <div className="profile-pattern" />
      <Avatar profile={profile} size="lg" />
      <div className="request-actions">
        <Button variant="outline" onClick={() => setEditing((v) => !v)}><Settings /> {editing ? 'Cancel' : 'Edit Profile'}</Button>
        <Button variant="outline" onClick={logOut}>Sign out</Button>
      </div>
    </div>
    {editing ? (
      <div className="report-card card">
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Program<input value={program} onChange={(e) => setProgram(e.target.value)} /></label>
        <label>Room<input value={room} onChange={(e) => setRoom(e.target.value)} /></label>
        <Button onClick={save} disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Save changes'}</Button>
      </div>
    ) : (
      <div className="profile-details card">
        <div><span className="eyebrow">ABOUT THIS RESIDENT</span><h1>{profile.name}</h1><p>{profile.program} · {profile.room}</p></div>
      </div>
    )}
    <div className="profile-note card">
      <Sparkles />
      <div><strong>Welcome to your Delbert profile.</strong><p>Your profile is visible to fellow residents so housemates can find and connect with you.</p></div>
    </div>
  </div>
}
