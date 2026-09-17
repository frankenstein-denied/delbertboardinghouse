'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCheck, MoreHorizontal, Plus, Search, Send, X } from 'lucide-react'
import { Avatar, Expiry } from '@/components/ui/avatar'
import { useCollection } from '@/lib/firestore-hooks'
import { db } from '@/lib/firebase'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import type { ConversationDoc, MessageDoc, UserProfile } from '@/lib/types'

const MESSAGE_TTL_MS = 4 * 60 * 60 * 1000

function conversationId(uidA: string, uidB: string) {
  return [uidA, uidB].sort().join('_')
}

function timeLabel(ts: Timestamp | null) {
  // Belt-and-braces null guard: see lib/firestore-hooks.ts's
  // serverTimestamps: 'estimate' fix and lib/types.ts's MessageDoc.createdAt
  // nullability comment — a future non-hook read path could still hand this
  // a null timestamp.
  if (!ts) return ''
  return ts.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function expiresLabel(expiresAt: Timestamp) {
  const minutes = Math.max(0, Math.round((expiresAt.toMillis() - Date.now()) / 60000))
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `Message expires in ${hours}h ${mins}m`
}

export function ChatsView({ profile, pendingChatWith, onConsumePendingChat }: {
  profile: UserProfile
  pendingChatWith?: { uid: string; name: string } | null
  onConsumePendingChat?: () => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [starting, setStarting] = useState(false)

  const conversationsQuery = useMemo(
    () => query(collection(db, 'conversations'), where('participantIds', 'array-contains', profile.uid), orderBy('lastMessageAt', 'desc')),
    [profile.uid],
  )
  const { data: conversations } = useCollection<ConversationDoc>(conversationsQuery)
  const selected = conversations.find((c) => c.id === selectedId) ?? conversations[0] ?? null

  // Same reasoning as HomeView's `nowTick`: refresh the `>` bound every 60s
  // so a message that ages past 4h disappears from an open thread promptly,
  // instead of waiting on the TTL sweep.
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const messagesQuery = useMemo(
    () => selected
      ? query(collection(db, 'conversations', selected.id, 'messages'), where('expiresAt', '>', Timestamp.fromMillis(nowTick)), orderBy('expiresAt'))
      : null,
    [selected?.id, nowTick],
  )
  const { data: messages } = useCollection<MessageDoc>(messagesQuery)

  // Marks the currently-selected conversation as read whenever it's
  // selected OR new messages arrive while it stays selected — so actively
  // viewing a chat when a message comes in still counts as read immediately.
  useEffect(() => {
    if (!selected) return
    updateDoc(doc(db, 'conversations', selected.id), { [`lastReadAt.${profile.uid}`]: serverTimestamp() }).catch(() => {})
  }, [selected?.id, messages.length, profile.uid])

  useEffect(() => {
    if (!pendingChatWith) return
    startConversationWith(pendingChatWith)
    onConsumePendingChat?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChatWith])

  async function startConversationWith(other: { uid: string; name: string }) {
    const id = conversationId(profile.uid, other.uid)
    const ref = doc(db, 'conversations', id)
    try {
      const existing = await getDoc(ref)
      if (!existing.exists()) {
        await setDoc(ref, {
          participantIds: [profile.uid, other.uid],
          participantNames: { [profile.uid]: profile.name, [other.uid]: other.name },
          lastMessage: '',
          lastMessageAt: serverTimestamp(),
          lastReadAt: {},
        })
      }
      setSelectedId(id)
      setStarting(false)
    } catch (err) {
      // Requires firestore.rules' conversations read rule to allow
      // resource == null (a brand-new conversation id) — if this still
      // throws permission-denied, the deployed rules haven't picked up
      // that fix yet. Logged rather than silently swallowed so a stale
      // rules deploy is visible instead of looking like a dead button.
      console.error('Could not start conversation:', err)
    }
  }

  async function sendMessage() {
    const text = message.trim()
    if (!text || !selected) return
    setMessage('')
    const now = Date.now()
    await addDoc(collection(db, 'conversations', selected.id, 'messages'), {
      senderId: profile.uid,
      text,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now + MESSAGE_TTL_MS),
    })
    await updateDoc(doc(db, 'conversations', selected.id), {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      [`lastReadAt.${profile.uid}`]: serverTimestamp(),
    })
  }

  return <div className="chat-layout">
    <section className="conversation-list card">
      <div className="section-heading"><div><span className="eyebrow">YOUR INBOX</span><h1>Chats</h1></div>
        <button className="icon-button" type="button" onClick={() => setStarting(true)}><Plus /></button>
      </div>
      {conversations.map((chat) => {
        const otherUid = chat.participantIds.find((uid) => uid !== profile.uid) ?? chat.participantIds[0]
        const otherName = chat.participantNames[otherUid] ?? 'Housemate'
        return <button className={selected?.id === chat.id ? 'conversation active' : 'conversation'} key={chat.id} onClick={() => setSelectedId(chat.id)}>
          <Avatar profile={{ name: otherName, initials: otherName.slice(0, 2).toUpperCase() }} />
          <span><strong>{otherName}</strong><small>{chat.lastMessage || 'Say hi!'}</small></span>
        </button>
      })}
      {conversations.length === 0 && <p className="load-more">No conversations yet — tap + to start one.</p>}
      {starting && <StartConversationModal myUid={profile.uid} onPick={startConversationWith} onClose={() => setStarting(false)} />}
    </section>
    {selected ? (() => {
      const otherUid = selected.participantIds.find((uid) => uid !== profile.uid) ?? selected.participantIds[0]
      const otherName = selected.participantNames[otherUid] ?? 'Housemate'
      return <section className="chat-panel card">
        <div className="chat-header">
          <Avatar profile={{ name: otherName, initials: otherName.slice(0, 2).toUpperCase() }} />
          <div><strong>{otherName}</strong></div>
          <button className="icon-button" type="button"><MoreHorizontal /></button>
        </div>
        <div className="messages">
          <div className="chat-day">TODAY</div>
          {messages.map((msg) => {
            const seen = Boolean(
              msg.createdAt &&
              selected.lastReadAt?.[otherUid] &&
              selected.lastReadAt[otherUid].toMillis() >= msg.createdAt.toMillis(),
            )
            return (
              <div key={msg.id} className={`message-row ${msg.senderId === profile.uid ? 'mine' : ''}`}>
                <div className="message-bubble">
                  <p>{msg.text}</p>
                  <div className="message-meta">
                    <small>{timeLabel(msg.createdAt)}</small>
                    {msg.senderId === profile.uid && <CheckCheck className={`seen-check${seen ? ' seen' : ''}`} />}
                  </div>
                </div>
                <Expiry>{expiresLabel(msg.expiresAt)}</Expiry>
              </div>
            )
          })}
        </div>
        <div className="message-composer">
          <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }} placeholder="Type a message..." />
          <button className="send-button" type="button" onClick={sendMessage}><Send /></button>
        </div>
      </section>
    })() : <section className="chat-panel card"><p className="load-more">Pick a conversation, or start a new one.</p></section>}
  </div>
}

function StartConversationModal({ myUid, onPick, onClose }: {
  myUid: string
  onPick: (other: { uid: string; name: string }) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const usersQuery = useMemo(() => query(collection(db, 'users')), [])
  const { data: users } = useCollection<{ uid: string; name: string; program: string; room: string }>(usersQuery)
  const filtered = users.filter((u) => u.uid !== myUid && u.name.toLowerCase().includes(search.toLowerCase()))

  return <div className="notification-popover">
    <div className="popover-heading"><strong>Start a chat</strong><button type="button" onClick={onClose}><X /></button></div>
    <div className="search-box"><Search /><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search residents" /></div>
    {filtered.map((u) => (
      <button key={u.uid} type="button" className="notification-item" onClick={() => onPick({ uid: u.uid, name: u.name })}>
        <Avatar profile={{ name: u.name, initials: u.name.slice(0, 2).toUpperCase() }} size="sm" />
        <p><strong>{u.name}</strong><small>{u.program} · {u.room}</small></p>
      </button>
    ))}
    {filtered.length === 0 && <p className="load-more">No residents found.</p>}
  </div>
}
