'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  BookOpen,
  ChevronDown,
  Heart,
  MessageCircle,
  MoreHorizontal,
  SmilePlus,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, Expiry } from '@/components/ui/avatar'
import { useCollection } from '@/lib/firestore-hooks'
import { db } from '@/lib/firebase'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { RESIDENT_TYPE_LABELS, type CommentDoc, type PostDoc, type UserProfile } from '@/lib/types'

const POST_TTL_MS = 24 * 60 * 60 * 1000
const REACTION_OPTIONS = [
  { label: 'Hala ka ni Nanay', emoji: '😂' },
  { label: 'Ang Panghe', emoji: '🤢' },
  { label: 'Sana all', emoji: '🥹' },
  { label: 'Keri yan', emoji: '💪' },
  { label: 'Pakisuyo', emoji: '🙏' },
]

function timeAgo(createdAt: Timestamp | null) {
  // Belt-and-braces null guard: useCollection resolves a pending
  // serverTimestamp() to a local estimate (see lib/firestore-hooks.ts), but
  // any future call site that reads a doc some other way could still hand
  // this a genuinely-null createdAt — fail soft instead of crashing.
  if (!createdAt) return 'just now'
  const minutes = Math.max(0, Math.round((Date.now() - createdAt.toMillis()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  return `${hours}h`
}

function expiresLabel(expiresAt: Timestamp) {
  const hours = Math.max(0, Math.ceil((expiresAt.toMillis() - Date.now()) / 3600000))
  return `Expires in ${hours}h`
}

function timeGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// Matches an "@" trigger that starts at a word boundary and runs to the
// cursor with no whitespace in between — the same shape Slack/Messenger use,
// so typing "@" mid-word (e.g. inside an email address) never falsely
// triggers the dropdown. The capture group deliberately excludes whitespace
// (including newlines from Shift+Enter) so the query token always closes at
// the next space instead of swallowing the rest of a sentence.
const MENTION_TRIGGER = /(?:^|\s)@([a-zA-Z0-9._']*)$/

function useMentionAutocomplete(users: UserProfile[]) {
  const [query, setQuery] = useState<string | null>(null)

  const suggestions = useMemo(() => {
    if (query === null) return []
    const q = query.toLowerCase()
    return users.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 5)
  }, [query, users])

  function handleChange(value: string, cursor: number) {
    const match = MENTION_TRIGGER.exec(value.slice(0, cursor))
    setQuery(match ? match[1] : null)
  }

  // Replaces the in-progress "@partial" at the cursor with "@Full Name " and
  // returns the new full value plus where the cursor should land — the
  // caller re-focuses the input and applies that cursor position, since
  // committing text via setState can't also move the caret in the same step.
  function applyMention(value: string, cursor: number, name: string) {
    const uptoCursor = value.slice(0, cursor)
    const match = MENTION_TRIGGER.exec(uptoCursor)
    if (!match) return null
    // match[0] includes one leading whitespace character (any \s, not just a
    // literal space — a Shift+Enter newline in the comment composer counts
    // too) whenever the trigger isn't at the very start of the string. Skip
    // exactly that many characters so the leading whitespace is preserved
    // instead of being swallowed by the replacement.
    const leadingWhitespaceLen = match[0].length - 1 - match[1].length
    const triggerStart = match.index + leadingWhitespaceLen
    const before = value.slice(0, triggerStart)
    const after = value.slice(cursor)
    const inserted = `@${name} `
    setQuery(null)
    return { value: before + inserted + after, cursor: (before + inserted).length }
  }

  function reset() {
    setQuery(null)
  }

  return { query, suggestions, handleChange, applyMention, reset }
}

// Wraps every "@Full Name" occurrence that matches a known user with a
// styled span, longest names first so "@Ana" can't shadow a match inside
// "@Ana Cruz".
function renderWithMentions(text: string, users: UserProfile[]): ReactNode[] {
  if (!users.length) return [text]
  const names = [...new Set(users.map((u) => u.name))].sort((a, b) => b.length - a.length)
  if (!names.length) return [text]
  const pattern = new RegExp(`@(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g')
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    parts.push(<span className="mention" key={key++}>@{match[1]}</span>)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

function MentionDropdown({ suggestions, onSelect }: { suggestions: UserProfile[]; onSelect: (name: string) => void }) {
  if (!suggestions.length) return null
  return <div className="mention-dropdown">
    {suggestions.map((u) => (
      <button type="button" key={u.uid} onMouseDown={(e) => { e.preventDefault(); onSelect(u.name) }}>
        <Avatar profile={u} size="sm" /><span>{u.name}</span>
      </button>
    ))}
  </div>
}

export function HomeView({ profile }: { profile: UserProfile }) {
  const [composer, setComposer] = useState('')
  const [activeReaction, setActiveReaction] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const composerRef = useRef<HTMLTextAreaElement>(null)

  const usersQuery = useMemo(() => query(collection(db, 'users')), [])
  const { data: allUsers } = useCollection<UserProfile>(usersQuery)
  const mentionCandidates = useMemo(() => allUsers.filter((u) => u.uid !== profile.uid), [allUsers, profile.uid])
  const mention = useMentionAutocomplete(mentionCandidates)

  // `expiresAt` is createdAt + a fixed 24h for every post, so ordering by it
  // is exactly equivalent to ordering by createdAt (constant offset) — one
  // orderBy does both "newest first" and "same field as the inequality
  // filter" (the latter is what keeps this off the composite-index list).
  //
  // The `>` bound is refreshed every 60s (not just captured once at mount):
  // Firestore's realtime listener does NOT re-evaluate an inequality against
  // a moving "now" — a post that crosses its expiresAt while this tab stays
  // open would otherwise keep matching the original snapshot's cutoff and
  // linger on screen until the (slow, "within 24h") TTL sweep actually
  // deletes it, which is exactly the stale-visibility problem the spec's R6
  // ruling says the client-side filter exists to prevent.
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const postsQuery = useMemo(
    () => query(collection(db, 'posts'), where('expiresAt', '>', Timestamp.fromMillis(nowTick)), orderBy('expiresAt', 'desc')),
    [nowTick],
  )
  const { data: posts, loading: postsLoading } = useCollection<PostDoc>(postsQuery)

  function handleComposerChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setComposer(e.target.value)
    mention.handleChange(e.target.value, e.target.selectionStart ?? e.target.value.length)
  }

  function selectComposerMention(name: string) {
    const el = composerRef.current
    if (!el) return
    const cursor = el.selectionStart ?? composer.length
    const result = mention.applyMention(composer, cursor, name)
    if (!result) return
    setComposer(result.value)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(result.cursor, result.cursor)
    })
  }

  async function submitPost() {
    const body = composer.trim()
    if (!body || posting) return
    setPosting(true)
    try {
      const now = Date.now()
      await addDoc(collection(db, 'posts'), {
        authorId: profile.uid,
        authorName: profile.name,
        authorProgram: profile.program,
        authorResidentType: profile.residentType,
        authorInitials: profile.initials,
        body,
        image: null,
        reactions: {},
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(now + POST_TTL_MS),
      })
      setComposer('')
      mention.reset()
    } finally {
      setPosting(false)
    }
  }

  return <div className="page-grid">
    <div className="feed-column">
      <div className="page-heading">
        <div><span className="eyebrow">THE FREEDOM WALL</span><h1>{timeGreeting()}, {profile.name.split(' ')[0]}.</h1><p>Here&apos;s what&apos;s happening around the house.</p></div>
        <div className="heading-sparkle">✦</div>
      </div>
      <div className="composer-card card">
        <div className="composer-top">
          <Avatar profile={profile} />
          <div className="mention-input-wrap">
            <textarea ref={composerRef} value={composer} onChange={handleComposerChange} placeholder={`What's happening, ${profile.name.split(' ')[0]}?`} />
            <MentionDropdown suggestions={mention.suggestions} onSelect={selectComposerMention} />
          </div>
        </div>
        <div className="composer-actions">
          <button type="button" disabled><SmilePlus /> Feeling</button>
          <Button size="sm" disabled={!composer.trim() || posting} onClick={submitPost}>{posting ? 'Posting…' : 'Post'}</Button>
        </div>
      </div>
      <div className="freedom-wall">
        <div className="wall-icon">✎</div>
        <div><strong>Freedom Wall</strong><p>Your casual corner for random thoughts, shoutouts, and house tea.</p></div>
        <Sparkles />
      </div>
      {postsLoading && <p className="load-more">Loading posts…</p>}
      {!postsLoading && posts.map((post) => (
        <PostCard key={post.id} post={post} profile={profile} allUsers={allUsers} nowTick={nowTick} activeReaction={activeReaction} setActiveReaction={setActiveReaction} />
      ))}
      {!postsLoading && posts.length === 0 && <p className="load-more">No posts yet — be the first to say something <ChevronDown /></p>}
    </div>
    <RightRail />
  </div>
}

function PostCard({ post, profile, allUsers, nowTick, activeReaction, setActiveReaction }: {
  post: PostDoc & { id: string }
  profile: UserProfile
  allUsers: UserProfile[]
  nowTick: number
  activeReaction: string | null
  setActiveReaction: (v: string | null) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const myUid = profile.uid
  const myReaction = post.reactions[myUid]
  const counts = new Map<string, { emoji: string; count: number }>()
  for (const reaction of Object.values(post.reactions)) {
    const existing = counts.get(reaction.label)
    counts.set(reaction.label, { emoji: reaction.emoji, count: (existing?.count ?? 0) + 1 })
  }

  async function react(option: { label: string; emoji: string }) {
    await updateDoc(doc(db, 'posts', post.id), { [`reactions.${myUid}`]: option })
    setActiveReaction(null)
  }

  async function handleDelete() {
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    await deleteDoc(doc(db, 'posts', post.id))
    setMenuOpen(false)
  }

  return <article className="post-card card">
    <div className="post-header">
      <Avatar profile={{ name: post.authorName, initials: post.authorInitials }} />
      <div className="post-byline"><strong>{post.authorName}</strong><span>{post.authorProgram} · {RESIDENT_TYPE_LABELS[post.authorResidentType]}</span><small>{timeAgo(post.createdAt)} · <span className="public-dot">●</span> Housemates</small></div>
      {post.authorId === myUid && (
        <div className="post-menu-wrap">
          <button className="more-button" type="button" onClick={() => setMenuOpen((v) => !v)}><MoreHorizontal /></button>
          {menuOpen && (
            <div className="post-menu">
              <button type="button" onClick={handleDelete}>Delete post</button>
            </div>
          )}
        </div>
      )}
    </div>
    <p className="post-body">{renderWithMentions(post.body, allUsers)}</p>
    <div className="post-footer-meta"><Expiry>{expiresLabel(post.expiresAt)}</Expiry></div>
    <div className="reaction-summary">
      {[...counts.entries()].map(([label, { emoji, count }]) => <span key={label}>{emoji} {count}</span>)}
    </div>
    <div className="post-actions">
      <div className="reaction-wrap">
        <button type="button" className={myReaction ? 'reacted' : ''} onClick={() => setActiveReaction(activeReaction === post.id ? null : post.id)}>
          <Heart /> {myReaction ? 'Reacted' : 'React'}
        </button>
        {activeReaction === post.id && (
          <div className="reaction-picker">
            {REACTION_OPTIONS.map((option) => (
              <button key={option.label} type="button" title={option.label} onClick={() => react(option)}>
                <span>{option.emoji}</span><small>{option.label}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button" className={commentsOpen ? 'reacted' : ''} onClick={() => setCommentsOpen((v) => !v)}><MessageCircle /> Comment</button>
    </div>
    {commentsOpen && <CommentsSection postId={post.id} profile={profile} allUsers={allUsers} nowTick={nowTick} />}
  </article>
}

function CommentsSection({ postId, profile, allUsers, nowTick }: {
  postId: string
  profile: UserProfile
  allUsers: UserProfile[]
  nowTick: number
}) {
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mentionCandidates = useMemo(() => allUsers.filter((u) => u.uid !== profile.uid), [allUsers, profile.uid])
  const mention = useMentionAutocomplete(mentionCandidates)

  // Comments share the post's 24h TTL window and the same "refresh the `>`
  // bound every 60s" reasoning as HomeView's own postsQuery above — an open
  // thread should drop an aged-out comment promptly rather than waiting on
  // the TTL sweep.
  const commentsQuery = useMemo(
    () => query(
      collection(db, 'posts', postId, 'comments'),
      where('expiresAt', '>', Timestamp.fromMillis(nowTick)),
      orderBy('expiresAt'),
    ),
    [postId, nowTick],
  )
  const { data: comments, loading } = useCollection<CommentDoc>(commentsQuery)

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    mention.handleChange(e.target.value, e.target.selectionStart ?? e.target.value.length)
  }

  function selectMention(name: string) {
    const el = inputRef.current
    if (!el) return
    const cursor = el.selectionStart ?? text.length
    const result = mention.applyMention(text, cursor, name)
    if (!result) return
    setText(result.value)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(result.cursor, result.cursor)
    })
  }

  async function submitComment() {
    const body = text.trim()
    if (!body || posting) return
    setPosting(true)
    try {
      const now = Date.now()
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        authorId: profile.uid,
        authorName: profile.name,
        authorInitials: profile.initials,
        body,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(now + POST_TTL_MS),
      })
      setText('')
      mention.reset()
    } finally {
      setPosting(false)
    }
  }

  return <div className="comments-thread">
    {loading && <p className="load-more">Loading comments…</p>}
    {!loading && comments.map((comment) => (
      <div className="comment-row" key={comment.id}>
        <Avatar profile={{ name: comment.authorName, initials: comment.authorInitials }} size="sm" />
        <div className="comment-bubble">
          <strong>{comment.authorName}</strong>
          <p>{renderWithMentions(comment.body, allUsers)}</p>
        </div>
      </div>
    ))}
    <div className="comment-composer-wrap">
      <Avatar profile={profile} size="sm" />
      <div className="comment-composer">
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
          placeholder="Write a comment… use @ to mention"
        />
        <MentionDropdown suggestions={mention.suggestions} onSelect={selectMention} />
        <Button size="sm" disabled={!text.trim() || posting} onClick={submitComment}>{posting ? '…' : 'Send'}</Button>
      </div>
    </div>
  </div>
}

function RightRail() {
  // Not per-user — "who's online" is a single global query, so the
  // dependency array is empty rather than keyed on anything per-render.
  const onlineQuery = useMemo(() => query(collection(db, 'users'), where('online', '==', true)), [])
  const { data: onlineUsers, loading: onlineLoading } = useCollection<UserProfile>(onlineQuery)

  return <aside className="right-rail">
    {!onlineLoading && (
      <div className="rail-card card">
        <div className="rail-title"><span>HOUSE PULSE</span><span className="live-dot">● LIVE</span></div>
        <div className="pulse-row">
          <span className="pulse-number">{onlineUsers.length}</span>
          <span>resident{onlineUsers.length === 1 ? '' : 's'} online<br /><small>Someone&apos;s always around</small></span>
        </div>
        <div className="online-avatars">
          {onlineUsers.slice(0, 6).map((u) => <Avatar key={u.uid} profile={u} size="sm" />)}
          {onlineUsers.length > 6 && <span>+{onlineUsers.length - 6}</span>}
        </div>
      </div>
    )}
    <div className="rail-card card">
      <div className="rail-title"><span>QUICK NOTES</span><BookOpen /></div>
      <div className="note-row"><span className="note-dot orange" /><p><strong>Quiet hours</strong><small>10:00 PM – 7:00 AM</small></p></div>
      <div className="note-row"><span className="note-dot blue" /><p><strong>House Rules</strong><small>Be kind, clean up after yourself</small></p></div>
      <div className="note-row"><span className="note-dot purple" /><p><strong>Wi-Fi password</strong><small>Ask a housemate</small></p></div>
    </div>
    <div className="rail-quote"><span>&ldquo;</span><p>Small house, big stories.</p><small>— The Delbert house rule</small></div>
  </aside>
}
