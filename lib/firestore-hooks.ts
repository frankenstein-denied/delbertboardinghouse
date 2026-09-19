'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import {
  onSnapshot,
  queryEqual,
  type DocumentData,
  type DocumentReference,
  type Query,
} from 'firebase/firestore'
import { auth } from '@/lib/firebase'

// ---------------------------------------------------------------------------
// App-wide collection cache.
//
// Each cacheKey owns ONE live onSnapshot listener plus its latest result, kept
// outside React. When a view unmounts, the listener stays open (so the cache
// keeps receiving new chats/posts/reports/residents), and when the view mounts
// again it renders the cached data instantly with no "Loading…" flash — the
// only thing that ever reaches the UI afterwards is a real update.
//
// - A changed query under the same cacheKey (e.g. the rolling `expiresAt > now`
//   bound) re-points the listener but KEEPS the cached data on screen.
// - Entries with `persist` live for the whole session; others (per-thread
//   messages/comments) are dropped after IDLE_EVICT_MS without a subscriber.
// - Everything is torn down when the signed-in user changes, so one resident's
//   cache (or dead permission-denied listeners) never leaks to the next.
// ---------------------------------------------------------------------------

const IDLE_EVICT_MS = 10 * 60 * 1000

interface CollectionState {
  data: (DocumentData & { id: string })[]
  loading: boolean
}

interface CacheEntry {
  query: Query<DocumentData>
  state: CollectionState
  listeners: Set<() => void>
  unsubscribe: (() => void) | null
  failed: boolean
  persist: boolean
  idleTimer: ReturnType<typeof setTimeout> | null
}

const LOADING_STATE: CollectionState = { data: [], loading: true }
const EMPTY_STATE: CollectionState = { data: [], loading: false }
const cache = new Map<string, CacheEntry>()
let authWatched = false
let cachedUid: string | null | undefined

function notify(entry: CacheEntry) {
  entry.listeners.forEach((listener) => listener())
}

function attach(entry: CacheEntry) {
  entry.unsubscribe?.()
  entry.failed = false
  entry.unsubscribe = onSnapshot(
    entry.query,
    (snapshot) => {
      // `serverTimestamps: 'estimate'` — a doc just written with
      // serverTimestamp() arrives in this very snapshot (latency
      // compensation) before the server has assigned a real value. The
      // default ('none') resolves that pending field to `null`, which
      // crashes any call site that immediately calls .toMillis()/.toDate()
      // on it (e.g. home-view's timeAgo, chats-view's timeLabel).
      // 'estimate' resolves it to the local clock instead, then
      // self-corrects to the server value once the write is acknowledged.
      entry.state = {
        loading: false,
        data: snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data({ serverTimestamps: 'estimate' }) })),
      }
      notify(entry)
    },
    () => {
      // Keep whatever was cached and retry shortly while anyone is still
      // watching, so a dropped connection heals without a page reload; an
      // unwatched entry re-attaches on its next subscriber instead.
      entry.failed = true
      entry.unsubscribe = null
      entry.state = { ...entry.state, loading: false }
      notify(entry)
      setTimeout(() => {
        if (entry.failed && entry.listeners.size > 0) attach(entry)
      }, 5000)
    },
  )
}

function dropEntry(key: string, entry: CacheEntry) {
  if (entry.idleTimer) clearTimeout(entry.idleTimer)
  entry.unsubscribe?.()
  if (cache.get(key) === entry) cache.delete(key)
}

function clearCache() {
  cache.forEach((entry, key) => dropEntry(key, entry))
}

function watchAuth() {
  if (authWatched || !auth) return
  authWatched = true
  onAuthStateChanged(auth, (user) => {
    const uid = user?.uid ?? null
    if (cachedUid !== undefined && cachedUid !== uid) clearCache()
    cachedUid = uid
  })
}

function acquire(key: string, query: Query<DocumentData>, persist: boolean, listener: () => void) {
  watchAuth()
  let entry = cache.get(key)
  if (!entry) {
    entry = { query, state: LOADING_STATE, listeners: new Set(), unsubscribe: null, failed: false, persist, idleTimer: null }
    cache.set(key, entry)
    attach(entry)
  } else if (!queryEqual(entry.query, query) || entry.failed) {
    entry.query = query
    attach(entry)
  }
  if (entry.idleTimer) {
    clearTimeout(entry.idleTimer)
    entry.idleTimer = null
  }
  entry.persist = entry.persist || persist
  entry.listeners.add(listener)
  const owned = entry

  return () => {
    owned.listeners.delete(listener)
    if (owned.listeners.size === 0 && !owned.persist && !owned.idleTimer) {
      owned.idleTimer = setTimeout(() => dropEntry(key, owned), IDLE_EVICT_MS)
    }
  }
}

/**
 * Cached live collection. `cacheKey` must uniquely identify the data slot
 * (include any uid / parent id the query depends on); the query itself may
 * change under a key without losing the cached data.
 */
export function useCollection<T>(
  query: Query<DocumentData> | null,
  cacheKey: string,
  options?: { persist?: boolean },
) {
  const persist = options?.persist ?? false
  const subscribe = useCallback(
    (listener: () => void) => (query ? acquire(cacheKey, query, persist, listener) : () => {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheKey, query, persist],
  )
  const getSnapshot = useCallback(() => (query ? cache.get(cacheKey)?.state ?? LOADING_STATE : EMPTY_STATE), [cacheKey, query])
  const state = useSyncExternalStore(subscribe, getSnapshot, () => LOADING_STATE)
  return { data: state.data as (T & { id: string })[], loading: state.loading }
}

export function useDocument<T>(ref: DocumentReference<DocumentData> | null) {
  const [data, setData] = useState<(T & { id: string }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ref) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        // Same pending-serverTimestamp reasoning as useCollection above.
        setData(
          snapshot.exists()
            ? ({ id: snapshot.id, ...snapshot.data({ serverTimestamps: 'estimate' }) } as T & { id: string })
            : null,
        )
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  return { data, loading }
}
