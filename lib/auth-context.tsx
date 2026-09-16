'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
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

function initialsFor(name: string) {
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

  const profileRef = firebaseUser ? doc(db, 'users', firebaseUser.uid) : null
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
      role: 'resident',
      online: true,
      createdAt: serverTimestamp(),
    })
  }

  async function logIn(email: string, password: string, rememberMe: boolean) {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
    const credential = await signInWithEmailAndPassword(auth, email, password)
    await updateDoc(doc(db, 'users', credential.user.uid), { online: true })
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
