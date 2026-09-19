import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

/** True once real env vars are present. AuthProvider checks this once, at
 * the root, before anything touches `auth`/`db` — that single gate is what
 * makes the definite-assignment assertions below safe: nothing calls into
 * an uninitialized SDK because nothing renders past the "not configured"
 * screen when this is false. */
export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

let app: FirebaseApp | undefined
let auth!: Auth
let db!: Firestore

if (firebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  auth = getAuth(app)
  // In-memory cache only. IndexedDB multi-tab persistence was tried and
  // removed: on Android the "leader" tab gets throttled in the background and
  // other tabs / the installed PWA stopped receiving live updates until a
  // reload. Live, reliable listeners matter more than a faster first load.
  db = getFirestore(app)
}

export { app, auth, db }
