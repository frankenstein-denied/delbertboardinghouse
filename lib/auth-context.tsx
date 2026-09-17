'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db, firebaseConfigured } from '@/lib/firebase'
import { useDocument } from '@/lib/firestore-hooks'
import type { ResidentType, UserProfile } from '@/lib/types'

interface SignUpDetails {
  name: string
  program: string
  residentType: ResidentType
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  profile: UserProfile | null
  loading: boolean
  signUp: (email: string, password: string, rememberMe: boolean, details: SignUpDetails) => Promise<void>
  logIn: (email: string, password: string, rememberMe: boolean) => Promise<void>
  logOut: () => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Exported so profile-view.tsx can recompute initials when a resident
// renames themselves (every Avatar renders `initials`, not `name`).
export function initialsFor(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return initials || '??'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    if (!firebaseConfigured) {
      setAuthLoading(false)
      return
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setFirebaseUser(nextUser)
      setAuthLoading(false)
    })
  }, [])

  // Firestore's doc() returns a fresh object every call — no stable identity
  // across renders, same instability as the Query stability Global Constraint.
  // Without useMemo, useDocument's `[ref]`-keyed effect sees a "changed" ref
  // on every render, including the ones ITS OWN onSnapshot callback causes
  // (setData receives a freshly-constructed object too) — an infinite
  // unsubscribe/resubscribe loop for as long as anyone is logged in.
  const profileRef = useMemo(() => (firebaseUser ? doc(db, 'users', firebaseUser.uid) : null), [firebaseUser?.uid])
  const { data: profile, loading: profileLoading } = useDocument<UserProfile>(profileRef)

  // Self-heal accounts created before `residentType` replaced the old room
  // number field (see commit 391c639): logIn() only ever merges
  // {uid, online} into the profile doc, so an account that signed up before
  // that migration keeps loading with residentType permanently undefined.
  // Firestore's client SDK rejects writing `undefined` outright (e.g.
  // addDoc for a wall post's authorResidentType), which crashed posting
  // entirely for those accounts. Defaulting to 'housemate' here is a
  // one-time background patch — the resident can still correct it via the
  // existing profile-edit resident-type select.
  useEffect(() => {
    if (!profile || profile.residentType || !firebaseUser) return
    setDoc(doc(db, 'users', firebaseUser.uid), { residentType: 'housemate' }, { merge: true }).catch(() => {})
  }, [profile, firebaseUser])

  async function signUp(email: string, password: string, rememberMe: boolean, details: SignUpDetails) {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await setDoc(doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      name: details.name,
      program: details.program,
      residentType: details.residentType,
      initials: initialsFor(details.name),
      online: true,
      createdAt: serverTimestamp(),
    })
  }

  async function logIn(email: string, password: string, rememberMe: boolean) {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
    const credential = await signInWithEmailAndPassword(auth, email, password)
    // setDoc(..., { merge: true }) instead of updateDoc: updateDoc throws
    // 'not-found' if users/{uid} doesn't exist (e.g. signUp's setDoc failed
    // partway through after auth succeeded, or the account was created
    // directly in the Firebase console). The user IS signed in at the Auth
    // layer at this point — a missing presence-flag doc shouldn't make
    // logIn itself throw and strand them on a confusing error. setDoc with
    // merge succeeds whether or not the doc already exists; AuthProvider's
    // existing loading/profile gate already falls back to LoginView for a
    // genuinely-missing profile, which is the correct behavior for that
    // rarer case.
    // `uid` is included even though it never changes: Firestore evaluates
    // set(..., {merge:true}) against a nonexistent doc as a *create*, not an
    // update, so the missing-profile case above must satisfy the create
    // rule's `request.resource.data.uid == uid` check too.
    await setDoc(doc(db, 'users', credential.user.uid), { uid: credential.user.uid, online: true }, { merge: true })
  }

  async function logOut() {
    if (auth.currentUser) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { online: false })
    }
    await signOut(auth)
  }

  async function deleteAccount() {
    if (!auth.currentUser) return
    // Auth user first, then the Firestore profile doc: deleteUser() is the
    // step that commonly throws (auth/requires-recent-login whenever the
    // session is more than ~5 minutes old, which is the typical case for
    // anyone reaching this button) — if it throws, both the Auth account
    // and the Firestore doc stay fully intact, so profile-view.tsx's
    // existing error message + retry is a real recovery path. Deleting the
    // Firestore doc first would instead let a `requires-recent-login`
    // failure permanently strand the resident: profile gone, Auth account
    // still alive and blocking re-signup with the same email, with no way
    // to retry the delete. uid captured before deleteUser() since Firebase
    // clears auth.currentUser once the Auth account is gone.
    const uid = auth.currentUser.uid
    await deleteUser(auth.currentUser)
    await deleteDoc(doc(db, 'users', uid))
  }

  const loading = authLoading || (Boolean(firebaseUser) && profileLoading)

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, loading, signUp, logIn, logOut, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
