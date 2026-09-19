'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CheckCheck, MoreHorizontal, Send } from 'lucide-react'
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

  const conversationsQuery = useMemo(
    () => query(collection(db, 'conversations'), where('participantIds', 'array-contains', profile.uid), orderBy('lastMessageAt', 'desc')),
    [profile.uid],
  )
  const { data: allConversations, loading: conversationsLoading } = useCollection<ConversationDoc>(conversationsQuery)

  // Same reasoning as HomeView's `nowTick`: refresh the `>` bound every 60s
  // so a message that ages past 4h disappears from an open thread promptly,
  // instead of waiting on the TTL sweep.
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Conversation docs have no TTL of their own, only their messages do, so a
  // chat whose last activity is older than the message TTL would linger in
  // the list (with a stale lastMessage preview) over an empty thread. A null
  // lastMessageAt is a just-written local serverTimestamp, i.e. fresh.
  const conversations = useMemo(
    () => allConversations.filter((c) => !c.lastMessageAt || c.lastMessageAt.toMillis() + MESSAGE_TTL_MS > nowTick),
    [allConversations, nowTick],
  )
  // Only fall back to the first conversation when nothing was explicitly
  // requested. A requested chat that isn't in the snapshot yet (a
  // just-created conversation) must NOT fall back to another person's chat.
  // `opened` is the doc we just read/created in startConversationWith. It
  // backs the panel when the live list hasn't (or won't) surface that chat,
  // so the thread never hangs on "Opening chat…".
  const [opened, setOpened] = useState<(ConversationDoc & { id: string }) | null>(null)
  const selected = selectedId
    ? conversations.find((c) => c.id === selectedId) ?? (opened?.id === selectedId ? opened : null)
    : conversations[0] ?? null

  const messagesQuery = useMemo(
    () => selected
      ? query(collection(db, 'conversations', selected.id, 'messages'), where('expiresAt', '>', Timestamp.fromMillis(nowTick)), orderBy('expiresAt'))
      : null,
    [selected?.id, nowTick],
  )
  const { data: messages, loading: messagesLoading } = useCollection<MessageDoc>(messagesQuery)

  // Without this, switching conversations briefly shows the PREVIOUS
  // conversation's messages — useCollection's `data` only updates once the
  // new onSnapshot fires, so stale (wrong-conversation) content lingers on
  // screen with no visual feedback, which reads as laggy/unresponsive.
  // Tracks which conversation's messages are actually ready, so a genuine
  // switch can show a loading state while the nowTick-driven periodic
  // requery of the SAME open conversation (every 60s) never re-triggers it.
  const [readyForId, setReadyForId] = useState<string | null>(null)
  useEffect(() => {
    if (!messagesLoading && selected?.id) setReadyForId(selected.id)
  }, [messagesLoading, selected?.id])
  const messagesReady = selected != null && readyForId === selected.id

  // Jumps to the newest message whenever a thread finishes loading (opening
  // a chat, or switching to a different one) and whenever the message count
  // changes thereafter — matches every messaging app's expectation that you
  // land at the bottom, not wherever the scroll position happened to be.
  const messagesRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!messagesReady) return
    const el = messagesRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messagesReady, selected?.id, messages.length])

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
      } else {
        const last = existing.data().lastMessageAt as Timestamp | null
        if (last && last.toMillis() + MESSAGE_TTL_MS <= Date.now()) {
          // Expired chat being reopened: reset it so it reappears in the list.
          await updateDoc(ref, { lastMessage: '', lastMessageAt: serverTimestamp() })
        }
      }
      const fresh = await getDoc(ref)
      if (fresh.exists()) setOpened({ id, ...(fresh.data({ serverTimestamps: 'estimate' }) as ConversationDoc) })
      setSelectedId(id)
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

  return <div className={`chat-layout${selectedId ? ' chat-thread-open' : ''}`}>
    <section className="conversation-list card">
      <div className="section-heading"><div><span className="eyebrow">YOUR INBOX</span><h1>Chats</h1></div>
      </div>
      {conversationsLoading && <p className="load-more">Loading chats…</p>}
      {!conversationsLoading && conversations.map((chat) => {
        const otherUid = chat.participantIds.find((uid) => uid !== profile.uid) ?? chat.participantIds[0]
        const otherName = chat.participantNames[otherUid] ?? 'Housemate'
        return <button className={selected?.id === chat.id ? 'conversation active' : 'conversation'} key={chat.id} onClick={() => setSelectedId(chat.id)}>
          <Avatar profile={{ name: otherName, initials: otherName.slice(0, 2).toUpperCase() }} />
          <span><strong>{otherName}</strong><small>{chat.lastMessage || 'Say hi!'}</small></span>
        </button>
      })}
      {!conversationsLoading && conversations.length === 0 && <p className="load-more">Go to Residents to message someone.</p>}
    </section>
    {selected ? (() => {
      const otherUid = selected.participantIds.find((uid) => uid !== profile.uid) ?? selected.participantIds[0]
      const otherName = selected.participantNames[otherUid] ?? 'Housemate'
      return <section className="chat-panel card">
        <div className="chat-header">
          <button className="icon-button back-button" type="button" onClick={() => setSelectedId(null)} aria-label="Back to chats"><ArrowLeft /></button>
          <Avatar profile={{ name: otherName, initials: otherName.slice(0, 2).toUpperCase() }} />
          <div><strong>{otherName}</strong></div>
          <button className="icon-button" type="button"><MoreHorizontal /></button>
        </div>
        <div className="messages" ref={messagesRef}>
          <div className="chat-day">TODAY</div>
          {!messagesReady && <p className="load-more">Loading messages…</p>}
          {messagesReady && messages.map((msg) => {
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
    })() : <section className="chat-panel card"><p className="load-more">{selectedId ? 'Opening chat…' : 'Pick a conversation, or start a new one.'}</p></section>}
  </div>
}
