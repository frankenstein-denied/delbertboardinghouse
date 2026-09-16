'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db, firebaseConfigured } from '@/lib/firebase'
import { useDocument } from '@/lib/firestore-hooks'
import type { UserProfile } from '@/lib/types'

interface SignUpDetails {
  name: string
  program: string
  room: string
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  profile: UserProfile | null
  loading: boolean
  signUp: (email: string, password: string, rememberMe: boolean, details: SignUpDetails) => Promise<void>
  logIn: (email: string, password: string, rememberMe: boolean) => Promise<void>
  logOut: () => Promise<void>
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

  async function signUp(email: string, password: string, rememberMe: boolean, details: SignUpDetails) {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await setDoc(doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      name: details.name,
      program: details.program,
      room: details.room,
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

  const loading = authLoading || (Boolean(firebaseUser) && profileLoading)

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, loading, signUp, logIn, logOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
