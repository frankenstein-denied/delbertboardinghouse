'use client'

import { useState } from 'react'
import { Settings, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { initialsFor, useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { RESIDENT_TYPE_LABELS, type ResidentType, type UserProfile } from '@/lib/types'

export function ProfileView({ profile }: { profile: UserProfile }) {
  const { logOut, deleteAccount } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile.name)
  const [program, setProgram] = useState(profile.program)
  const [residentType, setResidentType] = useState<ResidentType>(profile.residentType)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    try {
      // Recompute initials alongside name — every Avatar renders `initials`,
      // not `name`, so leaving it stale means renaming yourself never
      // updates your avatar.
      await updateDoc(doc(db, 'users', profile.uid), {
        name: name.trim(),
        program: program.trim(),
        residentType,
        initials: initialsFor(name.trim()),
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm('Delete your account? This permanently removes your profile and cannot be undone.')) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteAccount()
    } catch (err) {
      setDeleteError(
        err instanceof Error && err.message.includes('requires-recent-login')
          ? 'For security, please sign out and sign back in, then try deleting your account again.'
          : 'Something went wrong deleting your account. Please try again.',
      )
      setDeleting(false)
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
        <label>Resident Type
          <select value={residentType} onChange={(e) => setResidentType(e.target.value as ResidentType)}>
            <option value="housemate">Housemate</option>
            <option value="outsider">Outsider</option>
            <option value="owner">Owner</option>
          </select>
        </label>
        <Button onClick={save} disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Save changes'}</Button>
      </div>
    ) : (
      <div className="profile-details card">
        <div><span className="eyebrow">ABOUT THIS RESIDENT</span><h1>{profile.name}</h1><p>{profile.program} · {RESIDENT_TYPE_LABELS[profile.residentType]}</p></div>
      </div>
    )}
    <div className="profile-note card">
      <Sparkles />
      <div><strong>Welcome to your Delbert profile.</strong><p>Your profile is visible to fellow residents so housemates can find and connect with you.</p></div>
    </div>
    <div className="profile-note card danger-zone">
      <div><strong>Danger zone</strong><p>Deleting your account permanently removes your profile. This cannot be undone.</p></div>
      <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete Account'}</Button>
      {deleteError && <p className="auth-error" role="alert">{deleteError}</p>}
    </div>
  </div>
}
