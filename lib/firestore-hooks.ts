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
        setData(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() } as T & { id: string })))
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
        setData(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as T & { id: string }) : null)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  return { data, loading }
}
