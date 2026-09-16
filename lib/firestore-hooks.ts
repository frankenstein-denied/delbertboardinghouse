'use client'

import { useEffect, useState } from 'react'
import {
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type Query,
} from 'firebase/firestore'

export function useCollection<T>(query: Query<DocumentData> | null) {
  const [data, setData] = useState<(T & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!query) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        // `serverTimestamps: 'estimate'` — a doc just written with
        // serverTimestamp() arrives in this very snapshot (latency
        // compensation) before the server has assigned a real value. The
        // default ('none') resolves that pending field to `null`, which
        // crashes any call site that immediately calls .toMillis()/.toDate()
        // on it (e.g. home-view's timeAgo, chats-view's timeLabel).
        // 'estimate' resolves it to the local clock instead, then
        // self-corrects to the server value once the write is acknowledged.
        setData(
          snapshot.docs.map(
            (docSnapshot) =>
              ({ id: docSnapshot.id, ...docSnapshot.data({ serverTimestamps: 'estimate' }) } as T & { id: string }),
          ),
        )
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return { data, loading }
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
