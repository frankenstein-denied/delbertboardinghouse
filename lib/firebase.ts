import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'

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
  // IndexedDB-backed cache: after the first visit, queries resolve from disk
  // instantly and the server only sends what changed. Browser-only (the
  // server render has no IndexedDB), and multi-tab so a second open tab
  // shares the cache instead of erroring on the exclusive lock.
  if (typeof window !== 'undefined') {
    try {
      db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })
    } catch {
      // Already initialized (hot reload) or persistence unavailable
      // (private mode): use the existing / in-memory instance.
      db = getFirestore(app)
    }
  } else {
    db = getFirestore(app)
  }
}

export { app, auth, db }
